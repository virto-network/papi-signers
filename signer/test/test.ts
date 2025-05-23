import {
  EXTRINSIC_FORMAT_GENERAL,
  EXTRINSIC_V5,
  KREIVO_EXTENSION_VERSION,
  UncheckedExtrinsic,
} from "../src/types.ts";
import { describe, it } from "node:test";
import { fromHex, mergeUint8, toHex } from "polkadot-api/utils";

import { Blake2256 } from "@polkadot-api/substrate-bindings";
import { DummyAuthenticator } from "./dummy-authenticator.ts";
import { PassAuthenticate } from "../src/types.ts";
import assert from "node:assert";
import esmock from "esmock";

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

    assert.equal(
      toHex(signer.publicKey),
      toHex(
        Blake2256(
          mergeUint8(authenticator.hashedUserId, authenticator.hashedUserId)
        )
      )
    );
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
      mergeUint8(KREIVO_EXTENSION_VERSION, call)
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
          await authenticator.authenticate(blockNumber, extrinsicContext)
        ),
      },
      call,
    });

    assert.equal(toHex(signedTransaction), toHex(craftedSignedTransaction));
  });
});
