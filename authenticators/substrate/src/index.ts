import {
  type AddressGenerator,
  type Authenticator,
  type Challenger,
  kreivoPassDefaultAddressGenerator,
  type TPassAuthenticate,
} from "@virtonetwork/signer";
import { Binary } from "polkadot-api";
import {
  EncodedSignedMessage,
  KeyRegistration,
  KeyRegistrationSignedMessage,
  KeySignature,
  KeySignatureSignedMessage,
  type SubstrateSigner,
  type TKeyRegistration,
  type TKeySignature,
  type TSignedMessage,
} from "./types.ts";

export type {
  SubstrateSigner,
  TKeyRegistration,
  TKeySignature,
  TSignedMessage,
};
export {
  KeyRegistrationSignedMessage,
  KeySignatureSignedMessage,
  KeySignature,
  KeyRegistration,
};

export const KREIVO_AUTHORITY_ID = Binary.fromText("kreivo_p".padEnd(32, "\0"));

export class SubstrateKey implements Authenticator<number> {
  /**
   * SHA‑256 hash of {@link userId}. Filled once by {@link setup} and reused
   * for all WebAuthn operations.
   */
  public hashedUserId: Uint8Array = new Uint8Array(32);

  constructor(
    public readonly userId: string,
    private signer: SubstrateSigner,
    public readonly getChallenge: Challenger<number>,
    public readonly addressGenerator: AddressGenerator = kreivoPassDefaultAddressGenerator
  ) {}

  /**
   * Pre‑computes {@link hashedUserId}.
   *
   * Must be awaited **once** before any other interaction.
   * Returns `this` for fluent chaining.
   */
  public async setup(): Promise<this> {
    this.hashedUserId = await SubstrateKey.getHashedUserId(this.userId);
    return this;
  }

  private static async getHashedUserId(userId: string) {
    return new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId))
    );
  }

  async register(context: number): Promise<TKeyRegistration<number>> {
    const challenge = await this.getChallenge(
      context,
      this.addressGenerator(this.hashedUserId)
    );
    const message: TSignedMessage<number> = {
      context,
      challenge: Binary.fromBytes(challenge),
      authority_id: KREIVO_AUTHORITY_ID,
    };
    const encodedMessage = EncodedSignedMessage.enc(message);
    const signature = await this.signer.sign(encodedMessage);

    return {
      message,
      public: Binary.fromBytes(this.signer.publicKey),
      signature: {
        type: this.signer.signingType,
        value: Binary.fromBytes(signature),
      },
    };
  }

  /**
   * Signs an arbitrary challenge with the substrate key and produces a
   * {@link TPassAuthenticate} payload understood by `PassSigner`.
   *
   * @param challenge - 32‑byte buffer supplied by the runtime.
   * @param context   - Block number (or any numeric context expected by the pallet).
   *
   * @returns SCALE‑encoded authentication payload.
   * @throws Error If no credential id is available.
   */
  async authenticate(
    context: number,
    xtc: Uint8Array
  ): Promise<TPassAuthenticate> {
    const challenge = await this.getChallenge(context, xtc);
    const message: TSignedMessage<number> = {
      context,
      authority_id: KREIVO_AUTHORITY_ID,
      challenge: Binary.fromBytes(challenge),
    };
    const encodedMessage = EncodedSignedMessage.enc(message);
    const sig = await this.signer.sign(encodedMessage);

    return {
      deviceId: Binary.fromBytes(this.signer.publicKey),
      credentials: {
        tag: "SubstrateKey",
        value: KeySignature.enc({
          user_id: Binary.fromBytes(this.hashedUserId),
          message,
          signature: {
            type: this.signer.signingType,
            value: Binary.fromBytes(sig),
          },
        }),
      },
    };
  }
}
