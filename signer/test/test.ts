import assert from "node:assert";
import { describe, it } from "node:test";
import { Blake2256, compactNumber } from "@polkadot-api/substrate-bindings";
import esmock from "esmock";
import { fromHex, mergeUint8, toHex } from "polkadot-api/utils";
import {
  EXTRINSIC_FORMAT_GENERAL,
  EXTRINSIC_V5,
  KREIVO_EXTENSION_VERSION,
  PassAuthenticate,
  UncheckedExtrinsic,
} from "../src/types.ts";
import { DummyAuthenticator } from "./dummy-authenticator.ts";

describe("KreivoPassSigner", async () => {
  const { KreivoPassSigner } = await esmock<typeof import("../src/signer.ts")>(
    "../src/signer.js",
    {
      "@polkadot-api/substrate-bindings": {
        decAnyMetadata() {
          return {
            extrinsic: {
              signedExtensions: [{ identifier: "PassAuthenticate" }],
              signedExtensionsByVersion: 0,
            },
          };
        },
      },
    }
  );

  it("returning the public key works", () => {
    const authenticator = new DummyAuthenticator(
      new Uint8Array(32).fill(1),
      new Uint8Array(32)
    );
    const signer = new KreivoPassSigner(authenticator);
    const addressFromHashedUserId = Blake2256(
      mergeUint8([new Uint8Array(32).fill(0), authenticator.hashedUserId])
    );

    assert.equal(toHex(signer.publicKey), toHex(addressFromHashedUserId));
  });

  it("constructing the extrinsic works", async () => {
    const authenticator = new DummyAuthenticator(
      new Uint8Array(32).fill(1),
      new Uint8Array(32)
    );
    const signer = new KreivoPassSigner(authenticator);

    const blockNumber = 0;
    const call = fromHex("0x0123456789ab");
    const extrinsicContext = Blake2256(
      mergeUint8([KREIVO_EXTENSION_VERSION, call])
    );

    const signedTransaction = await signer.signTx(
      call,
      {
        PassAuthenticate: {
          identifier: "PassAuthenticate",
          value: Uint8Array.from([0]),
          additionalSigned: Uint8Array.from([]),
        },
      },
      fromHex("0x00"), // We're still mocking the metadata,
      blockNumber
    );

    const craftedSignedTransaction = UncheckedExtrinsic.enc({
      version: EXTRINSIC_FORMAT_GENERAL | EXTRINSIC_V5,
      prelude: {
        extensionVersion: 0,
        extensions: PassAuthenticate.enc(
          await authenticator.authenticate(blockNumber - 1, extrinsicContext)
        ),
      },
      call,
    });

    assert.equal(
      toHex(signedTransaction),
      toHex(
        mergeUint8([
          compactNumber.enc(craftedSignedTransaction.length),
          craftedSignedTransaction,
        ])
      )
    );
  });
});
