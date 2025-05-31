/**
 * WebAuthn pass‑key authenticator for Virto Network.
 *
 * Exposes a browser‑side implementation of {@link Authenticator} that creates,
 * stores, and uses WebAuthn resident credentials ("passkeys") while producing
 * SCALE‑encoded data structures understood by the Kreivo signer pallet.
 *
 * Responsibilities
 * ─────────────────────────────────────────────────────────
 * • Derive a deterministic `deviceId` from the raw credential id
 * • Emit `TAttestation<number>` during registration
 * • Emit `TPassAuthenticate` during authentication
 * • Never persist the credential mapping; that is delegated to the caller
 *
 * @module WebAuthn
 */
import { Authenticator, DeviceId } from "@virtonetwork/signer";
import { Binary, Blake2256 } from "@polkadot-api/substrate-bindings";
import type { Challenger, TPassAuthenticate } from "@virtonetwork/signer";
import type { CredentialsHandler, TAttestation } from "./types.ts";

import { Assertion } from "./types.ts";
import { InMemoryCredentialsHandler } from "./in-memory-credentials-handler.ts";

export { InMemoryCredentialsHandler, CredentialsHandler };

/** Fixed authority id for Kreivo pass‑key attestors. */
export const KREIVO_AUTHORITY_ID = Binary.fromText("kreivo_p".padEnd(32, "\0"));

/**
 * Browser‑side Authenticator that wraps the WebAuthn API.
 *
 * The generic type parameter `<number>` indicates that the **context**
 * carried inside attestations and assertions is the block number that
 * originated the challenge.
 *
 * @implements {Authenticator<number>}
 */
export class WebAuthn implements Authenticator<number> {
  /**
   * SHA‑256 hash of {@link userId}. Filled once by {@link setup} and reused
   * for all WebAuthn operations.
   */
  public hashedUserId: Uint8Array = new Uint8Array(32);
  private credentialId?: Uint8Array;

  private getPublicKeyCreateOptions: CredentialsHandler["publicKeyCreateOptions"];
  private getPublicKeyRequestOptions: CredentialsHandler["publicKeyRequestOptions"];
  private onCreatedCredentials: CredentialsHandler["onCreatedCredentials"];

  /**
   * Creates a new WebAuthn helper.
   *
   * @param userId - Logical user identifier (e‑mail, DID, etc.).
   * @param [credentialId] - Raw credential id obtained from a previous
   *   registration flow; omit it if the user must enrol a new pass‑key.
   */
  constructor(
    public readonly userId: string,
    public readonly getChallenge: Challenger<number>,
    {
      publicKeyCreateOptions,
      publicKeyRequestOptions,
      onCreatedCredentials,
    }: CredentialsHandler = new InMemoryCredentialsHandler()
  ) {
    this.getPublicKeyCreateOptions = publicKeyCreateOptions;
    this.getPublicKeyRequestOptions = publicKeyRequestOptions;
    this.onCreatedCredentials = onCreatedCredentials;
  }

  /**
   * Pre‑computes {@link hashedUserId}.
   *
   * Must be awaited **once** before any other interaction.
   * Returns `this` for fluent chaining.
   */
  public async setup(): Promise<this> {
    this.hashedUserId = await WebAuthn.getHashedUserId(this.userId);
    return this;
  }

  private static async getHashedUserId(userId: string) {
    return new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId))
    );
  }

  /**
   * Deterministic identifier of the hardware/software authenticator
   * (`deviceId = Blake2‑256(credentialId)`).
   *
   * @returns DeviceId suitable for on‑chain storage.
   * @throws Error If this instance does not yet know a credential id.
   */
  private async getDeviceId(): Promise<DeviceId> {
    if (!this.credentialId) {
      throw new Error(
        "credentialId unknown – call register() first or inject it via constructor/setCredentialId()"
      );
    }
    return Binary.fromBytes(Blake2256(this.credentialId));
  }

  /**
   * Registers a **new** resident credential (pass‑key) with the user’s
   * authenticator and returns a SCALE‑ready attestation.
   *
   * @param blockNumber - The number of the block whose hash seeds the challenge.
   * @param blockHash   - The block hash used to derive a deterministic challenge.
   * @param [displayName=this.userId] - Friendly name shown by the authenticator.
   *
   * @throws Error If this instance already has a credential id.
   * @returns {Promise<TAttestation<number>>} SCALE‑encoded attestation object.
   */
  public async register(
    blockNumber: number,
    displayName: string = this.userId
  ): Promise<TAttestation<number>> {
    if (this.credentialId) {
      throw new Error("Already have a credentialId; no need to register");
    }

    const challenge = await this.getChallenge(blockNumber, new Uint8Array([]));

    const credentials = (await navigator.credentials.create({
      publicKey: await this.getPublicKeyCreateOptions(challenge, {
        id: this.hashedUserId,
        name: this.userId,
        displayName,
      }),
    })) as PublicKeyCredential;

    const response = credentials.response as AuthenticatorAttestationResponse;
    const { attestationObject, clientDataJSON } = response;

    // Save raw credential id for future auth calls
    this.credentialId = new Uint8Array(credentials.rawId);

    // Ensure publicKey is obtained in the registration process.
    const publicKey = response.getPublicKey();
    if (!publicKey) {
      throw new Error(
        "The credentials don't expose a public key. Please use another authenticator device."
      );
    }

    await this.onCreatedCredentials(this.userId, credentials);

    return {
      meta: {
        authority_id: KREIVO_AUTHORITY_ID,
        device_id: await this.getDeviceId(),
        context: blockNumber,
      },
      authenticator_data: Binary.fromBytes(new Uint8Array(attestationObject)),
      client_data: Binary.fromBytes(new Uint8Array(clientDataJSON)),
      public_key: Binary.fromBytes(new Uint8Array(publicKey)),
    };
  }

  /**
   * Signs an arbitrary challenge with the pass‑key and produces a
   * {@link TPassAuthenticate} payload understood by `PassSigner`.
   *
   * @param challenge - 32‑byte buffer supplied by the runtime.
   * @param context   - Block number (or any numeric context expected by the pallet).
   *
   * @returns SCALE‑encoded authentication payload.
   * @throws Error If no credential id is available.
   */
  public async authenticate(
    context: number,
    xtc: Uint8Array
  ): Promise<TPassAuthenticate> {
    const challenge = await this.getChallenge(context, xtc);

    const cred = (await navigator.credentials.get({
      publicKey: await this.getPublicKeyRequestOptions(this.userId, challenge),
    })) as PublicKeyCredential;

    const { authenticatorData, clientDataJSON, signature } =
      cred.response as AuthenticatorAssertionResponse;

    return {
      deviceId: await this.getDeviceId(),
      credentials: {
        tag: "WebAuthn",
        value: Assertion.enc({
          meta: {
            authority_id: KREIVO_AUTHORITY_ID,
            user_id: Binary.fromBytes(this.hashedUserId),
            context,
          },
          authenticator_data: Binary.fromBytes(
            new Uint8Array(authenticatorData)
          ),
          client_data: Binary.fromBytes(new Uint8Array(clientDataJSON)),
          signature: Binary.fromBytes(new Uint8Array(signature)),
        }),
      },
    };
  }
}
