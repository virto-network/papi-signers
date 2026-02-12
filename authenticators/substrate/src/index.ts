import {
  AddressGenerator,
  Authenticator,
  Challenger,
  TPassAuthenticate,
  kreivoPassDefaultAddressGenerator,
} from "@virtonetwork/signer";
import {
  KeyRegistration,
  KeySignature,
  SignedMessage,
  SubstrateSigner,
  TKeyRegistration,
  TKeySignature,
  TSignedMessage,
} from "./types.ts";

import { Binary } from "polkadot-api";

export type {
  SubstrateSigner,
  TKeyRegistration,
  TKeySignature,
  TSignedMessage,
};
export { SignedMessage, KeySignature, KeyRegistration };

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
    public readonly addressGenerator: AddressGenerator = kreivoPassDefaultAddressGenerator,
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
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId)),
    );
  }

  async register(context: number): Promise<TKeyRegistration<number>> {
    const challenge = await this.getChallenge(
      context,
      this.addressGenerator(this.hashedUserId),
    );
    const message = SignedMessage.enc({
      context,
      authority_id: KREIVO_AUTHORITY_ID,
      challenge: Binary.fromBytes(challenge),
    });

    return {
      message: SignedMessage.dec(message),
      public: Binary.fromBytes(this.signer.publicKey),
      signature: {
        type: this.signer.signingType,
        value: Binary.fromBytes(await this.signer.sign(message)),
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
    xtc: Uint8Array,
  ): Promise<TPassAuthenticate> {
    const challenge = await this.getChallenge(context, xtc);
    const message: TSignedMessage<number> = {
      context,
      authority_id: KREIVO_AUTHORITY_ID,
      challenge: Binary.fromBytes(challenge),
    };

    return {
      deviceId: Binary.fromBytes(this.signer.publicKey),
      credentials: {
        tag: "SubstrateKey",
        value: KeySignature.enc({
          message: message,
          signature: {
            type: this.signer.signingType,
            value: Binary.fromBytes(
              await this.signer.sign(SignedMessage.enc(message)),
            ),
          },
        }),
      },
    };
  }
}
