import { Blake2256 } from "@polkadot-api/substrate-bindings";
import {
  type AddressGenerator,
  type Authenticator,
  type Challenger,
  kreivoPassDefaultAddressGenerator,
  type TPassAuthenticate,
} from "@virtonetwork/signer";
import { Binary } from "polkadot-api";
import {
  ECDSA_PUBLIC_KEY_LENGTH,
  ECDSA_SIGNATURE_LENGTH,
  normalizeEcdsaSignature,
} from "./ecdsa.ts";
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

  /**
   * The key's on-chain account id, which is also its Pass device id: the
   * public key itself for Ed25519 and Sr25519, and `blake2_256` of the
   * compressed public key for Ecdsa (as `MultiSigner::Ecdsa` derives it).
   */
  public readonly accountId: Uint8Array;

  /**
   * @throws Error If `signer.publicKey` has the wrong length for its
   * `signingType`: 32 bytes for Ed25519 and Sr25519, 33 bytes (compressed)
   * for Ecdsa.
   */
  constructor(
    public readonly userId: string,
    private signer: SubstrateSigner,
    public readonly getChallenge: Challenger<number>,
    public readonly addressGenerator: AddressGenerator = kreivoPassDefaultAddressGenerator
  ) {
    const expected =
      signer.signingType === "Ecdsa" ? ECDSA_PUBLIC_KEY_LENGTH : 32;
    if (signer.publicKey.length !== expected) {
      throw new Error(
        `A ${signer.signingType} SubstrateSigner must have a ${expected}-byte publicKey` +
          (signer.signingType === "Ecdsa" ? " (compressed)" : "") +
          `, got ${signer.publicKey.length} bytes`
      );
    }
    this.accountId =
      signer.signingType === "Ecdsa"
        ? Blake2256(signer.publicKey)
        : signer.publicKey;
  }

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

  /**
   * Signs `message` and checks the result has the shape the runtime expects.
   * Ecdsa signatures also get their recovery id normalised; see
   * {@link normalizeEcdsaSignature}.
   */
  private async sign(message: Uint8Array): Promise<Uint8Array> {
    const signature = await this.signer.sign(message);
    const isEcdsa = this.signer.signingType === "Ecdsa";
    const expected = isEcdsa ? ECDSA_SIGNATURE_LENGTH : 64;
    if (signature.length !== expected) {
      throw new Error(
        `A ${this.signer.signingType} signature must be ${expected} bytes, got ${signature.length}`
      );
    }
    return isEcdsa
      ? normalizeEcdsaSignature(message, signature, this.signer.publicKey)
      : signature;
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
    const signature = await this.sign(encodedMessage);

    return {
      message,
      public: Binary.fromBytes(this.accountId),
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
    const sig = await this.sign(encodedMessage);

    return {
      deviceId: Binary.fromBytes(this.accountId),
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
