import { Bin, Bytes } from "@polkadot-api/substrate-bindings";
import { Codec, Enum, Option, Struct, createCodec } from "scale-ts";

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
