import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { Blake2256, u32 } from "@polkadot-api/substrate-bindings";
import { mergeUint8 } from "@polkadot-api/utils";
import { encodeCBOR } from "@levischuck/tiny-cbor";
import {
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { parseAuthenticatorData } from "@simplewebauthn/server/helpers";
import {
  type CollectedClientData,
  encodeBase64Url,
  WebAuthnEmulator,
} from "nid-webauthn-emulator";
import {
  InMemoryCredentialsHandler,
  KREIVO_AUTHORITY_ID,
  WebAuthn,
} from "../src/index.ts";
import { Assertion } from "../src/types.ts";

// Origin that will be attached to the emulator (only affects RP id handling)
const ORIGIN = "https://example.com";

const emulator = new WebAuthnEmulator();

Object.defineProperty(globalThis.navigator, "credentials", {
  configurable: false,
  value: {
    /** Polyfill for `navigator.credentials.create` */
    create: async (options: CredentialCreationOptions) =>
      emulator.create(ORIGIN, options),
    /** Polyfill for `navigator.credentials.get` */
    get: async (options: CredentialRequestOptions) =>
      emulator.get(ORIGIN, options),
  },
});

describe("WebAuthn", async () => {
  const BLOCK_NO = 777;

  async function getChallenge(ctx: number, xtc: Uint8Array) {
    return Blake2256(mergeUint8([Blake2256(u32.enc(ctx)), xtc]));
  }

  class TestAuthenticatiorOptions extends InMemoryCredentialsHandler {
    static deviceId(userId: string) {
      const id = TestAuthenticatiorOptions.credentialIds(userId)[0];
      return id !== undefined ? Blake2256(new Uint8Array(id)) : undefined;
    }
  }

  it("setup() hashes userId", async () => {
    const wa = await new WebAuthn("alice@example.com", getChallenge).setup();
    assert.equal(wa.hashedUserId.length, 32);
  });

  it("register() flows through emulator and returns TAttestation", async () => {
    const userId = "bob@example.com";
    const wa = await new WebAuthn(
      userId,
      getChallenge,
      new TestAuthenticatiorOptions(),
    ).setup();
    const attestation = await wa.register(BLOCK_NO);

    // Ensure meta
    assert.deepEqual(
      attestation.meta.authority_id.asBytes(),
      KREIVO_AUTHORITY_ID.asBytes(),
    );
    assert.deepEqual(
      attestation.meta.device_id.asBytes(),
      TestAuthenticatiorOptions.deviceId(userId),
    );
    assert.equal(attestation.meta.context, BLOCK_NO);

    // Ensure authenticatorData
    const authenticatorData = parseAuthenticatorData(
      new Uint8Array(attestation.authenticator_data.asBytes()),
    );

    assert.deepEqual(
      authenticatorData.rpIdHash,
      new Uint8Array(createHash("sha256").update("example.com").digest()),
    );
    assert.deepEqual(
      authenticatorData.credentialID,
      new Uint8Array(TestAuthenticatiorOptions.credentialIds(userId)[0]),
    ); // Fix credentialID type mismatch

    // Ensure clientData
    const challenge = encodeBase64Url(
      new Uint8Array(
        await getChallenge(BLOCK_NO, wa.addressGenerator(wa.hashedUserId)),
      ),
    );
    assert.deepEqual(JSON.parse(attestation.client_data.asText()), {
      type: "webauthn.create",
      challenge,
      origin: ORIGIN,
      crossOrigin: false,
    } as CollectedClientData);

    // Reconstruct the attestation object for verification
    // Since Virto authenticator returns raw authData, we wrap it in a "none" attestation
    // to satisfy the standard WebAuthn verification procedure.
    const reconstructedAttestationObject = encodeCBOR(
      new Map<string, any>([
        ["authData", new Uint8Array(attestation.authenticator_data.asBytes())],
        ["fmt", "none"],
        ["attStmt", new Map()],
      ]),
    );

    await verifyRegistrationResponse({
      response: {
        id: encodeBase64Url(authenticatorData.credentialID!),
        rawId: encodeBase64Url(authenticatorData.credentialID!),
        type: "public-key",
        response: {
          attestationObject: encodeBase64Url(
            new Uint8Array(reconstructedAttestationObject),
          ),
          clientDataJSON: encodeBase64Url(
            new Uint8Array(attestation.client_data.asBytes()),
          ),
        },
        clientExtensionResults: {},
      },
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: "example.com",
    });
  });

  it("authenticate() produces a coherent TPassAuthenticate", async () => {
    // First register to get a credential id
    const userId = "carol@example.com";
    const wa = await new WebAuthn(
      userId,
      getChallenge,
      new TestAuthenticatiorOptions(),
    ).setup();
    const att = await wa.register(BLOCK_NO);

    const attAuthenticatorData = parseAuthenticatorData(
      new Uint8Array(att.authenticator_data.asBytes()),
    );

    // Generate arbitrary challenge
    const extrinsicContext = new Uint8Array([1, 2, 3]);
    const challenge = await getChallenge(BLOCK_NO, extrinsicContext);
    const passAuthenticate = await wa.authenticate(BLOCK_NO, extrinsicContext);

    // deviceId should equal Blake2256(credentialId)
    assert.deepEqual(
      passAuthenticate?.deviceId.asBytes(),
      TestAuthenticatiorOptions.deviceId(userId),
    );

    // This authenticator resolves to PassCredentials::WebAuithn(credentials)
    assert.equal(passAuthenticate?.credentials.tag, "WebAuthn");

    // Decode and validate the assertion context
    const decodedAssertion = Assertion.dec(passAuthenticate?.credentials.value);

    // Validate metadata
    assert.deepEqual(
      decodedAssertion.meta.authority_id.asText(),
      KREIVO_AUTHORITY_ID.asText(),
    );
    assert.deepEqual(decodedAssertion.meta.user_id.asBytes(), wa.hashedUserId);
    assert.equal(decodedAssertion.meta.context, BLOCK_NO);

    // Verify authenticatorData and client-collected data
    assert.deepEqual(JSON.parse(decodedAssertion.client_data.asText()), {
      type: "webauthn.get",
      challenge: encodeBase64Url(new Uint8Array(challenge)),
      origin: ORIGIN,
      crossOrigin: false,
    } as CollectedClientData);

    await verifyAuthenticationResponse({
      response: {
        clientExtensionResults: {},
        id: encodeBase64Url(attAuthenticatorData.credentialID!),
        rawId: encodeBase64Url(attAuthenticatorData.credentialID!),
        response: {
          authenticatorData: encodeBase64Url(
            new Uint8Array(decodedAssertion.authenticator_data.asBytes()),
          ),
          clientDataJSON: encodeBase64Url(
            new Uint8Array(decodedAssertion.client_data.asBytes()),
          ),
          signature: encodeBase64Url(
            new Uint8Array(decodedAssertion.signature.asBytes()),
          ),
        },
        type: "public-key",
      },
      expectedChallenge: encodeBase64Url(new Uint8Array(challenge)),
      expectedOrigin: ORIGIN,
      expectedRPID: "example.com",
      credential: {
        id: encodeBase64Url(attAuthenticatorData.credentialID!),
        publicKey: attAuthenticatorData.credentialPublicKey!,
        counter: attAuthenticatorData.counter,
      },
    });
  });
});
