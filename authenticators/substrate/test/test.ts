import assert from "node:assert";
import { describe, it } from "node:test";
import { ed25519 } from "@noble/curves/ed25519";
import { Binary, Blake2256, u32 } from "@polkadot-api/substrate-bindings";
import { mergeUint8 } from "@polkadot-api/utils";
import { kreivoPassDefaultAddressGenerator } from "@virtonetwork/signer";
import { KREIVO_AUTHORITY_ID, SubstrateKey } from "../src/index.ts";
import {
  KeySignature,
  EncodedSignedMessage,
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
        kreivoPassDefaultAddressGenerator(sk.hashedUserId),
      );
      const signedMessage = EncodedSignedMessage.enc({
        context: BLOCK_NO,
        challenge: Binary.fromBytes(challenge),
        authority_id: KREIVO_AUTHORITY_ID,
      });

      assert.deepEqual(
        keyRegistration.signature.value.asBytes(),
        signer.sign(signedMessage),
      );

      assert.ok(
        ed25519.verify(
          keyRegistration.signature.value.asBytes(),
          signedMessage,
          signer.publicKey,
        ),
        "Signature must be valid",
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
              await signer.sign(EncodedSignedMessage.enc(message)),
            ),
          },
        }),
      );

      assert.ok(keySignature);
      const decodedCredentials = KeySignature.dec(
        keySignature.credentials.value,
      );
      assert.ok(
        ed25519.verify(
          decodedCredentials.signature.value.asBytes(),
          EncodedSignedMessage.enc(message),
          signer.publicKey,
        ),
        "Signature must be valid",
      );
    });
  });
});
