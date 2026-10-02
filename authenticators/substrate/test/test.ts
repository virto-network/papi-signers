import assert from "node:assert";
import { describe, it } from "node:test";
import { ed25519 } from "@noble/curves/ed25519";
import { Binary, Blake2256, u32 } from "@polkadot-api/substrate-bindings";
import { mergeUint8 } from "@polkadot-api/utils";
import { kreivoPassDefaultAddressGenerator } from "@virtonetwork/signer";
import { KREIVO_AUTHORITY_ID, SubstrateKey } from "../src/index.ts";
import {
  EncodedSignedMessage,
  KeyRegistration,
  KeySignature,
  type SubstrateSigner,
  type TSignedMessage,
} from "../src/types.ts";
import { createEd25519Signer } from "./fixtures/ed25519.signer.ts";

describe("SubstrateKeys", () => {
  const BLOCK_NO = 777;

  async function getChallenge(ctx: number, xtc: Uint8Array) {
    return Blake2256(mergeUint8([Blake2256(u32.enc(ctx)), xtc]));
  }

  describe("#register", () => {
    it("returns a key registration message with the required parameters", async () => {
      const signer = createEd25519Signer();
      const sk = new SubstrateKey("test@example.com", signer, getChallenge);

      const keyRegistration = await sk.register(BLOCK_NO);

      const challenge = await getChallenge(
        BLOCK_NO,
        kreivoPassDefaultAddressGenerator(sk.hashedUserId)
      );
      const signedMessage = EncodedSignedMessage.enc({
        context: BLOCK_NO,
        challenge: Binary.fromBytes(challenge),
        authority_id: KREIVO_AUTHORITY_ID,
      });

      assert.deepEqual(
        keyRegistration.signature.value.asBytes(),
        signer.sign(signedMessage)
      );

      assert.ok(
        ed25519.verify(
          keyRegistration.signature.value.asBytes(),
          signedMessage,
          signer.publicKey
        ),
        "Signature must be valid"
      );
    });
  });

  describe("#authenticate", () => {
    it("returns a key signature with the required parameters", async () => {
      const signer = createEd25519Signer();
      const sk = new SubstrateKey("test@example.com", signer, getChallenge);

      const extrinsicContext = new Uint8Array([1, 2, 3]);
      const keySignature = await sk.authenticate(BLOCK_NO, extrinsicContext);

      const challenge = await getChallenge(BLOCK_NO, extrinsicContext);
      const message: TSignedMessage<number> = {
        context: BLOCK_NO,
        challenge: Binary.fromBytes(challenge),
        authority_id: KREIVO_AUTHORITY_ID,
      };

      assert.deepEqual(keySignature?.deviceId.asBytes(), signer.publicKey);
      assert.deepEqual(
        keySignature?.credentials.value,
        KeySignature.enc({
          user_id: Binary.fromBytes(sk.hashedUserId),
          message,
          signature: {
            type: "Ed25519",
            value: Binary.fromBytes(
              await signer.sign(EncodedSignedMessage.enc(message))
            ),
          },
        })
      );

      assert.ok(keySignature);
      const decodedCredentials = KeySignature.dec(
        keySignature.credentials.value
      );
      assert.ok(
        ed25519.verify(
          decodedCredentials.signature.value.asBytes(),
          EncodedSignedMessage.enc(message),
          signer.publicKey
        ),
        "Signature must be valid"
      );
    });
  });

  /**
   * Byte-for-byte vector produced in Rust by `pass-authenticators-substrate-keys`
   * 1.2.0 (the version Kreivo runtime 133 / release 0.17.0 runs): an ed25519
   * key from the seed `[7; 32]` signs `SignedMessage { context: 777,
   * challenge: [0xab; 32], authority_id: "kreivo_p" }`, and
   * `KeyRegistration::is_valid` / `VerifyCredential` accept the result.
   *
   * The tests above verify signatures against `EncodedSignedMessage` itself,
   * so they pass whatever order it encodes in. This one pins the order the
   * runtime verifies: `context ++ challenge ++ authority_id`. Clients on
   * 1.2.3 or earlier sign `context ++ authority_id ++ challenge` and get
   * `DeviceAttestationInvalid` / `BadSigner` from runtime 133 onwards.
   */
  describe("runtime compatibility (pass-authenticators-substrate-keys 1.2.0)", () => {
    const SEED = new Uint8Array(32).fill(7);
    const CONTEXT = 777;
    const CHALLENGE = new Uint8Array(32).fill(0xab);
    const USER_ID = new Uint8Array(32).fill(0x22);

    const PUBLIC =
      "0xea4a6c63e29c520abef5507b132ec5f9954776aebebe7b92421eea691446d22c";
    const SIGNED_BYTES =
      "0x09030000abababababababababababababababababababababababababababababababab6b726569766f5f70000000000000000000000000000000000000000000000000";
    const SIGNATURE =
      "0x007c9bd3fa1005c757df87322cf68deced0754378a4335c5aece3bd8dd8e48dddfb367b593f5696fa9570ae8b6bcbccc6eb3c612d0056f757deb044be52516f603";
    const KEY_REGISTRATION = `${PUBLIC}${SIGNED_BYTES.slice(2)}${SIGNATURE.slice(2)}`;
    const KEY_SIGNATURE = `0x${"22".repeat(32)}${SIGNED_BYTES.slice(2)}${SIGNATURE.slice(2)}`;

    function vectorKey() {
      const signed: Uint8Array[] = [];
      const signer: SubstrateSigner = {
        publicKey: ed25519.getPublicKey(SEED),
        signingType: "Ed25519",
        sign: (bytes) => {
          signed.push(bytes);
          return ed25519.sign(bytes, SEED);
        },
      };
      const sk = new SubstrateKey("vector", signer, () => CHALLENGE);
      sk.hashedUserId = USER_ID;
      return { sk, signed };
    }

    it("signs the bytes the runtime verifies", async () => {
      const { sk, signed } = vectorKey();
      await sk.register(CONTEXT);
      await sk.authenticate(CONTEXT, new Uint8Array([1]));

      assert.equal(signed.length, 2);
      for (const bytes of signed) {
        assert.equal(Binary.fromBytes(bytes).asHex(), SIGNED_BYTES);
      }
    });

    it("encodes KeyRegistration as the runtime decodes it", async () => {
      const { sk } = vectorKey();
      const registration = await sk.register(CONTEXT);

      assert.equal(registration.public.asHex(), PUBLIC);
      assert.equal(
        Binary.fromBytes(KeyRegistration.enc(registration)).asHex(),
        KEY_REGISTRATION
      );
    });

    it("encodes KeySignature as the runtime decodes it", async () => {
      const { sk } = vectorKey();
      const authentication = await sk.authenticate(
        CONTEXT,
        new Uint8Array([1])
      );

      assert.ok(authentication);
      assert.equal(authentication.deviceId.asHex(), PUBLIC);
      assert.equal(
        Binary.fromBytes(authentication.credentials.value).asHex(),
        KEY_SIGNATURE
      );
    });
  });
});
