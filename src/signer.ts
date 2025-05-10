import { Bytes, Option, Struct, u64, u8 } from "scale-ts";
import { blake2b256, getTypedMetadata } from "./utils.ts";

import type { Authenticator } from "./authenticator.ts";
import { PolkadotSigner } from "polkadot-api/signer";
import { mergeUint8 } from "@polkadot-api/utils";

export const UncheckedExtrinsic = Struct({
  version: u8,
  prelude: Struct({
    extensionVersion: u8,
    extensions: Bytes(),
  }),
  call: Bytes(),
});

export const PassAuthenticate = Option(
  Struct({
    deviceId: Bytes(),
    credentials: Bytes(),
  })
);

export const EXTRINSIC_V5 = 0b0000_0101;
export const EXTRINSIC_FORMAT_GENERAL = 0b0100_0000;

export class PassSigner implements PolkadotSigner {
  publicKey: Uint8Array<ArrayBufferLike>;

  constructor(private authenticator: Authenticator) {
    this.publicKey = blake2b256(
      mergeUint8(authenticator.hashedUserId, authenticator.hashedUserId)
    );
  }

  async signTx(
    call: Uint8Array,
    signedExtensions: Record<
      string,
      { identifier: string; value: Uint8Array; additionalSigned: Uint8Array }
    >,
    encodedMetadata: Uint8Array,
    atBlockNumber: number,
    hasher: (data: Uint8Array) => Uint8Array = blake2b256
  ): Promise<Uint8Array> {
    const metadata = getTypedMetadata(encodedMetadata);
    const context = u64.enc(BigInt(atBlockNumber));

    const extensions: Uint8Array[] = await Promise.all(
      metadata.extrinsic.signedExtensions.map(async ({ identifier }) => {
        const signedExtension = signedExtensions[identifier];

        if (!signedExtension)
          throw new Error(`Missing ${identifier} signed extension`);

        if (identifier === "PassAuthenticate") {
          signedExtensions[identifier].value = PassAuthenticate.enc({
            deviceId: this.authenticator.deviceId,
            credentials: await this.authenticator.credentials(hasher(context)),
          });
        }

        return signedExtension.value;
      })
    );

    return UncheckedExtrinsic.enc({
      version: EXTRINSIC_V5 | EXTRINSIC_FORMAT_GENERAL,
      prelude: {
        extensionVersion: 0,
        extensions: mergeUint8(...extensions),
      },
      call,
    });
  }

  async signBytes(_: Uint8Array): Promise<Uint8Array> {
    throw new Error("signBytes not implemented");
  }
}
