import assert from "node:assert";
import { describe, it } from "node:test";
import { ed25519 } from "@noble/curves/ed25519.js";
import { secp256k1 } from "@noble/curves/secp256k1.js";
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
   * Vector produced in Rust with `sp_core::ecdsa::Pair::from_seed(&[7; 32])`
   * through `pass-authenticators-substrate-keys` 1.2.0, which Kreivo runtime
   * 133 runs. `KeyRegistration::is_valid` and `VerifyCredential` accept it.
   * The key's account (and device id) is `blake2_256(compressed public key)`.
   */
  describe("Ecdsa", () => {
    const SECRET = new Uint8Array(32).fill(7);
    const CONTEXT = 777;
    const CHALLENGE = new Uint8Array(32).fill(0xab);

    const COMPRESSED_PUBLIC =
      "0x02989c0b76cb563971fdc9bef31ec06c3560f3249d6ee9e5d83c57625596e05f6f";
    const ACCOUNT_ID =
      "0x4b9feced8f3a8ca1610230cf330053ea8119bacaab5736f336717c7d48366749";
    const SIGNED_BYTES =
      "09030000abababababababababababababababababababababababababababababababab6b726569766f5f70000000000000000000000000000000000000000000000000";
    const MULTI_SIGNATURE =
      "024e2c1b046070fcd4e2e156ab2c8f49687faaf8548d73de09a3f38506c4533cec08079212a5453a7015c13d0bbb5b08d4f1c724adbfe470543dfc174dd1da32b701";
    const KEY_REGISTRATION = `${ACCOUNT_ID}${SIGNED_BYTES}${MULTI_SIGNATURE}`;
    const KEY_SIGNATURE = `0x${"22".repeat(32)}${SIGNED_BYTES}${MULTI_SIGNATURE}`;

    /** Signs like `sp-core`: blake2-256 prehash, then `r ‖ s ‖ v`. */
    function ecdsaSigner(
      mapV: (v: number) => number = (v) => v,
      prehash: (bytes: Uint8Array) => Uint8Array = Blake2256
    ): SubstrateSigner {
      return {
        publicKey: secp256k1.getPublicKey(SECRET),
        signingType: "Ecdsa",
        sign: (bytes) => {
          const recovered = secp256k1.sign(prehash(bytes), SECRET, {
            prehash: false,
            format: "recovered",
          });
          const signature = new Uint8Array(65);
          signature.set(recovered.subarray(1));
          signature[64] = mapV(recovered[0]);
          return signature;
        },
      };
    }

    function ecdsaKey(signer = ecdsaSigner()) {
      const sk = new SubstrateKey("vector", signer, () => CHALLENGE);
      sk.hashedUserId = new Uint8Array(32).fill(0x22);
      return sk;
    }

    it("uses blake2_256(compressed public key) as account and device id", async () => {
      const sk = ecdsaKey();
      assert.equal(
        Binary.fromBytes(ecdsaSigner().publicKey).asHex(),
        COMPRESSED_PUBLIC
      );
      assert.equal(Binary.fromBytes(sk.accountId).asHex(), ACCOUNT_ID);

      const registration = await sk.register(CONTEXT);
      assert.equal(registration.public.asHex(), ACCOUNT_ID);

      const authentication = await sk.authenticate(
        CONTEXT,
        new Uint8Array([1])
      );
      assert.equal(authentication?.deviceId.asHex(), ACCOUNT_ID);
    });

    it("encodes KeyRegistration and KeySignature as the runtime verifies them", async () => {
      const sk = ecdsaKey();
      const registration = await sk.register(CONTEXT);
      assert.equal(
        Binary.fromBytes(KeyRegistration.enc(registration)).asHex(),
        KEY_REGISTRATION
      );

      const authentication = await sk.authenticate(
        CONTEXT,
        new Uint8Array([1])
      );
      assert.ok(authentication);
      assert.equal(
        Binary.fromBytes(authentication.credentials.value).asHex(),
        KEY_SIGNATURE
      );
    });

    it("normalises the recovery id, whatever form the signer returns", async () => {
      for (const mapV of [
        (v: number) => v + 27,
        // `@polkadot-labs/hdkd-helpers` 0.0.27 always returns `v = 0`.
        () => 0,
      ]) {
        const registration = await ecdsaKey(ecdsaSigner(mapV)).register(
          CONTEXT
        );
        assert.equal(
          Binary.fromBytes(KeyRegistration.enc(registration)).asHex(),
          KEY_REGISTRATION
        );
      }
    });

    it("rejects a signer that does not prehash with blake2-256", async () => {
      const sk = ecdsaKey(
        ecdsaSigner(undefined, (bytes) => bytes.slice(0, 32))
      );
      await assert.rejects(sk.register(CONTEXT), /blake2-256/);
    });

    it("rejects a public key that is not 33 bytes", () => {
      const signer = {
        ...ecdsaSigner(),
        publicKey: secp256k1.getPublicKey(SECRET, false),
      };
      assert.throws(
        () => new SubstrateKey("vector", signer, () => CHALLENGE),
        /33-byte publicKey \(compressed\), got 65 bytes/
      );
    });
  });
});
