import { Blake2256, u32 } from "@polkadot-api/substrate-bindings";
import {
  CollectedClientData,
  WebAuthnEmulator,
  encodeBase64Url,
} from "nid-webauthn-emulator";
import { KREIVO_AUTHORITY_ID, WebAuthn } from "../src/index.ts";
import {
  decodeAttestationObject,
  parseAuthenticatorData,
} from "@simplewebauthn/server/helpers";
import { describe, it } from "node:test";
import { fromHex, toHex } from "@polkadot-api/utils";
import {
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";

import { Assertion } from "../src/types.ts";
import { KreivoBlockChallenger } from "@virtonetwork/signer";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Origin that will be attached to the emulator (only affects RP id handling)
const ORIGIN = "https://example.com";

const emulator = new WebAuthnEmulator();

Object.defineProperty((globalThis as any).navigator, "credentials", {
  configurable: true,
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
  const BLOCK_HASH = toHex(Blake2256(u32.enc(BLOCK_NO)));

  it("setup() hashes userId", async () => {
    const wa = await new WebAuthn("alice@example.com").setup();
    assert.equal(wa.hashedUserId.length, 32);
  });

  it.skip("register() flows through emulator and returns TAttestation", async () => {
    const wa = await new WebAuthn("bob@example.com").setup();
    const attestation = await wa.register(BLOCK_NO, BLOCK_HASH);

    // Ensure meta
    assert.deepEqual(
      attestation.meta.authority_id.asBytes(),
      KREIVO_AUTHORITY_ID.asBytes()
    );
    assert.deepEqual(
      attestation.meta.device_id.asBytes(),
      (await WebAuthn.getDeviceId(wa)).asBytes()
    );
    assert.equal(attestation.meta.context, BLOCK_NO);

    // Ensure authenticatorData
    const attestationObject = decodeAttestationObject(
      attestation.authenticator_data.asBytes()
    );
    const authenticatorData = parseAuthenticatorData(
      attestationObject.get("authData")
    );

    assert.deepEqual(
      authenticatorData.rpIdHash,
      new Uint8Array(createHash("sha256").update("example.com").digest())
    );
    assert.deepEqual(authenticatorData.credentialID, wa.credentialId);

    // Ensure clientData
    const challenge = encodeBase64Url(
      new KreivoBlockChallenger().generate(
        fromHex(BLOCK_HASH),
        new Uint8Array([])
      )
    );
    assert.deepEqual(JSON.parse(attestation.client_data.asText()), {
      type: "webauthn.create",
      challenge,
      origin: ORIGIN,
      crossOrigin: false,
    } as CollectedClientData);

    // Ensure authn registration from provided attestation
    //
    // This is what you should do on the server side (i.e. on the corresponding
    // `DeviceChallengeResponse::is_valid` implementation)
    await verifyRegistrationResponse({
      response: {
        id: encodeBase64Url(authenticatorData.credentialID!),
        rawId: encodeBase64Url(authenticatorData.credentialID!),
        type: "public-key",
        response: {
          attestationObject: encodeBase64Url(
            attestation.authenticator_data.asBytes()
          ),
          clientDataJSON: encodeBase64Url(attestation.client_data.asBytes()),
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
    const wa = await new WebAuthn("carol@example.com").setup();
    const att = await wa.register(BLOCK_NO, BLOCK_HASH);

    const attestationObject = decodeAttestationObject(
      att.authenticator_data.asBytes()
    );
    const attAuthenticatorData = parseAuthenticatorData(
      attestationObject.get("authData")
    );

    // Generate arbitrary challenge
    const challenge = new KreivoBlockChallenger().generate(
      fromHex(BLOCK_HASH),
      new Uint8Array([1, 2, 3])
    );
    const passAuthenticate = await wa.authenticate(challenge, BLOCK_NO);

    // deviceId should equal Blake2256(credentialId)
    assert.deepEqual(
      passAuthenticate?.deviceId.asBytes(),
      (await WebAuthn.getDeviceId(wa)).asBytes()
    );

    // This authenticator resolves to PassCredentials::WebAuithn(credentials)
    assert.equal(passAuthenticate.credentials.tag, "WebAuthn");

    // Obtain assertion value:
    const encodedAssertion = passAuthenticate.credentials.value;

    // Decode and validate the assertion context
    const decodedAssertion = Assertion.dec(encodedAssertion);

    // Validate metadata
    assert.deepEqual(
      decodedAssertion.meta.authority_id.asText(),
      KREIVO_AUTHORITY_ID.asText()
    );
    assert.deepEqual(decodedAssertion.meta.user_id.asBytes(), wa.hashedUserId);
    assert.equal(decodedAssertion.meta.context, BLOCK_NO);

    // Verify authenticatorData and client-collected data
    assert.deepEqual(JSON.parse(decodedAssertion.client_data.asText()), {
      type: "webauthn.get",
      challenge: encodeBase64Url(challenge),
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
            decodedAssertion.authenticator_data.asBytes()
          ),
          clientDataJSON: encodeBase64Url(
            decodedAssertion.client_data.asBytes()
          ),
          signature: encodeBase64Url(decodedAssertion.signature.asBytes()),
        },
        type: "public-key",
      },
      expectedChallenge: encodeBase64Url(challenge),
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
