import { Bin, Bytes } from "@polkadot-api/substrate-bindings";
import { Codec, Enum, Option, Struct, createCodec, u8 } from "scale-ts";

import { FixedSizeBinary } from "polkadot-api";

export type AuthorityId = FixedSizeBinary<32>;
export type DeviceId = FixedSizeBinary<32>;
export type HashedUserId = FixedSizeBinary<32>;

export type TPassAuthenticateCredentials = {
  tag: "WebAuthn";
  value: Uint8Array;
};

export type TPassAuthenticate =
  | {
      deviceId: DeviceId;
      credentials: TPassAuthenticateCredentials;
    }
  | undefined;

const identityCodec: Codec<Uint8Array> = createCodec(
  (v: Uint8Array) => v,
  Bytes().dec
);

export const PassAuthenticate: Codec<TPassAuthenticate> = Option(
  Struct({
    deviceId: Bin(32),
    credentials: Enum({
      WebAuthn: identityCodec,
    }),
  })
);
export const UncheckedExtrinsic = Struct({
  version: u8,
  prelude: Struct({
    extensionVersion: u8,
    extensions: identityCodec,
  }),
  call: identityCodec,
});
export type TransactionExtensionMetadata = {
  identifier: string;
  value: Uint8Array;
  additionalSigned: Uint8Array;
};
export const EXTRINSIC_V5 = 5;
export const EXTRINSIC_FORMAT_GENERAL = 64;
export const KREIVO_EXTENSION_VERSION = u8.enc(0);
