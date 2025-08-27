import { CredentialsHandler } from "./types.ts";

export class InMemoryCredentialsHandler implements CredentialsHandler {
  private static userCredentials: Record<
    string,
    Record<string, PublicKeyCredential>
  > = {};

  private static tryMutate(
    userId: string,
    f: (map: Record<string, PublicKeyCredential>) => void
  ) {
    try {
      let map = this.userCredentials[userId] ?? {};
      f(map);
      this.userCredentials[userId] = map;
    } catch {
      /* on error, no-op */
    }
  }

  static credentialIds(userId: string): ArrayBufferLike[] {
    const credentials = this.userCredentials[userId] ?? {};
    return Object.entries(credentials).map(
      ([, credential]) => new Uint8Array(credential.rawId).buffer
    );
  }

  async onCreatedCredentials(
    userId: string,
    credential: PublicKeyCredential
  ): Promise<void> {
    InMemoryCredentialsHandler.tryMutate(userId, (credentials) => {
      credentials[credential.id] = credential;
    });
  }

  async publicKeyCreateOptions(
    challenge: Uint8Array,
    user: PublicKeyCredentialUserEntity
  ) {
    return {
      challenge,
      rp: { name: "Virto Passkeys" },
      user,
      pubKeyCredParams: [{ type: "public-key", alg: -7 /* ES256 */ }],
      authenticatorSelection: { userVerification: "preferred" },
      attestation: "none",
      timeout: 60_000,
    } as PublicKeyCredentialCreationOptions;
  }
  async publicKeyRequestOptions(
    userId: string,
    challenge: Uint8Array
  ): Promise<CredentialRequestOptions["publicKey"]> {
    return {
      challenge,
      allowCredentials: InMemoryCredentialsHandler.credentialIds(userId).map(
        (id) => ({
          id,
          type: "public-key",
          transports: ["usb", "ble", "nfc", "internal"],
        })
      ),
      userVerification: "preferred",
      timeout: 60_000,
    } as PublicKeyCredentialRequestOptions;
  }
}
