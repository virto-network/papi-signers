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
import {
  Authenticator,
  DeviceId,
  KreivoBlockChallenger,
} from "@virtonetwork/signer";
import { Binary, Blake2256 } from "@polkadot-api/substrate-bindings";
import type { BlockHash, TAssertion, TAttestation } from "./types.ts";

import { Assertion } from "./types.ts";
import type { TPassAuthenticate } from "@virtonetwork/signer";
import { fromHex } from "polkadot-api/utils";

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

  /**
   * Creates a new WebAuthn helper.
   *
   * @param userId - Logical user identifier (e‑mail, DID, etc.).
   * @param [credentialId] - Raw credential id obtained from a previous
   *   registration flow; omit it if the user must enrol a new pass‑key.
   */
  constructor(
    public readonly userId: string,
    public credentialId?: Uint8Array
  ) {}

  /**
   * Deterministic identifier of the hardware/software authenticator
   * (`deviceId = Blake2‑256(credentialId)`).
   *
   * @returns DeviceId suitable for on‑chain storage.
   * @throws Error If this instance does not yet know a credential id.
   */
  public static async getDeviceId(wa: WebAuthn): Promise<DeviceId> {
    if (!wa.credentialId) {
      throw new Error(
        "credentialId unknown – call register() first or inject it via constructor/setCredentialId()"
      );
    }
    return Binary.fromBytes(Blake2256(wa.credentialId));
  }

  /**
   * Injects a credential id discovered by the caller after construction.
   *
   * @param id - Raw credential id obtained from storage or backend.
   */
  public setCredentialId(id: Uint8Array): void {
    this.credentialId = id;
  }

  /**
   * Pre‑computes {@link hashedUserId}.
   *
   * Must be awaited **once** before any other interaction.
   * Returns `this` for fluent chaining.
   */
  public async setup(): Promise<this> {
    this.hashedUserId = new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(this.userId)
      )
    );

    return this;
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
    blockHash: BlockHash,
    displayName: string = this.userId
  ): Promise<TAttestation<number>> {
    if (this.credentialId) {
      throw new Error("Already have a credentialId; no need to register");
    }

    const challenger = new KreivoBlockChallenger();
    const challenge = challenger.generate(fromHex(blockHash), new Uint8Array());

    const credentials = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Virto Passkeys" },
        user: {
          id: this.hashedUserId,
          name: this.userId,
          displayName,
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 /* ES256 */ }],
        authenticatorSelection: { userVerification: "preferred" },
        attestation: "none",
        timeout: 60_000,
      } as PublicKeyCredentialCreationOptions,
    })) as PublicKeyCredential;

    const { attestationObject, clientDataJSON, getPublicKey } =
      credentials.response as AuthenticatorAttestationResponse;

    // Save raw credential id for future auth calls
    this.credentialId = new Uint8Array(credentials.rawId);

    // Ensure publicKey is obtained in the registration process.
    const publicKey = getPublicKey();
    if (!publicKey) {
      throw new Error(
        "The credentials don't expose a public key. Please use another authenticator device."
      );
    }

    return {
      meta: {
        authorityId: KREIVO_AUTHORITY_ID,
        deviceId: await WebAuthn.getDeviceId(this),
        context: blockNumber,
      },
      authenticatorData: Binary.fromBytes(new Uint8Array(attestationObject)),
      clientData: Binary.fromBytes(new Uint8Array(clientDataJSON)),
      publicKey: Binary.fromBytes(new Uint8Array(publicKey)),
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
    challenge: Uint8Array,
    context: number
  ): Promise<TPassAuthenticate> {
    if (!this.credentialId) {
      throw new Error(
        "credentialId unknown – call register() first or inject it via constructor/setCredentialId()"
      );
    }

    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [
        {
          id: this.credentialId.buffer,
          type: "public-key",
          transports: ["usb", "ble", "nfc", "internal"],
        },
      ],
      userVerification: "preferred",
      timeout: 60_000,
    };

    const cred = (await navigator.credentials.get({
      publicKey,
    })) as PublicKeyCredential;

    const { authenticatorData, clientDataJSON, signature } =
      cred.response as AuthenticatorAssertionResponse;

    const assertion: TAssertion<number> = {
      meta: {
        authorityId: KREIVO_AUTHORITY_ID,
        userId: Binary.fromBytes(this.hashedUserId),
        context,
      },
      authenticatorData: Binary.fromBytes(new Uint8Array(authenticatorData)),
      clientData: Binary.fromBytes(new Uint8Array(clientDataJSON)),
      signature: Binary.fromBytes(new Uint8Array(signature)),
    };

    return {
      deviceId: await WebAuthn.getDeviceId(this),
      credentials: {
        tag: "WebAuthn",
        value: Assertion.enc(assertion),
      },
    };
  }
}
