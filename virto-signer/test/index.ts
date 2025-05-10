import {
  EXTRINSIC_FORMAT_GENERAL,
  EXTRINSIC_V5,
  PassAuthenticate,
  UncheckedExtrinsic,
} from "../src/signer.ts";
import { describe, it } from "node:test";
import { fromHex, mergeUint8, toHex } from "polkadot-api/utils";

import { DummyAuthenticator } from "./dummy-authenticator.ts";
import assert from "node:assert";
import { blake2b256 } from "../src/utils.ts";
import esmock from "esmock";
import { u64 } from "scale-ts";

describe("PassSigner", async () => {
  const { PassSigner } = await esmock<typeof import("../src/signer")>(
    "../src/signer.js",
    {
      "../src/utils.js": {
        getTypedMetadata() {
          return {
            extrinsic: {
              signedExtensions: [{ identifier: "PassAuthenticate" }],
            },
          };
        },
        blake2b256,
      },
    }
  );

  it("returning the public key works", () => {
    const authenticator = new DummyAuthenticator(
      new Uint8Array(32),
      new Uint8Array(32)
    );
    const signer = new PassSigner(authenticator);
    assert.equal(
      toHex(signer.publicKey),
      toHex(
        blake2b256(
          mergeUint8(authenticator.hashedUserId, authenticator.hashedUserId)
        )
      )
    );
  });

  it("constructing the extrinsic works", async () => {
    const authenticator = new DummyAuthenticator(
      new Uint8Array(32),
      new Uint8Array(32)
    );
    const signer = new PassSigner(authenticator);

    const blockNumber = 0;
    const call = fromHex("0x0123456789ab");

    assert.equal(
      toHex(
        await signer.signTx(
          call,
          {
            PassAuthenticate: {
              identifier: "PassAuthenticate",
              value: fromHex("0x00"),
              additionalSigned: fromHex("0x"),
            },
          },
          fromHex("0x00"), // We're still mocking the metadata,
          blockNumber
        )
      ),
      toHex(
        UncheckedExtrinsic.enc({
          version: EXTRINSIC_FORMAT_GENERAL | EXTRINSIC_V5,
          prelude: {
            extensionVersion: 0,
            extensions: mergeUint8(
              PassAuthenticate.enc({
                deviceId: authenticator.deviceId,
                credentials: await authenticator.credentials(
                  blake2b256(u64.enc(BigInt(blockNumber)))
                ),
              })
            ),
          },
          call,
        })
      )
    );
  });
});
