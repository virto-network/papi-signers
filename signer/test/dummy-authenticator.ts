import {
  Authenticator,
  HashedUserId,
  TPassAuthenticate,
} from "../src/index.ts";
import {
  Bin,
  Binary,
  Blake2256,
  FixedSizeBinary,
} from "@polkadot-api/substrate-bindings";
import { Codec, Struct } from "scale-ts";

import { mergeUint8 } from "polkadot-api/utils";

export type Dummy = {
  hashedUserId: HashedUserId;
  signature: FixedSizeBinary<32>;
};
export const dummyCodec: Codec<Dummy> = Struct({
  hashedUserId: Bin(32),
  signature: Bin(32),
});

export class DummyAuthenticator implements Authenticator {
  readonly deviceId: Uint8Array;
  readonly hashedUserId: Uint8Array;

  constructor(deviceId: Uint8Array, hashedUserId: Uint8Array) {
    this.deviceId = deviceId;
    this.hashedUserId = hashedUserId;
  }

  async authenticate(challenge: Uint8Array): Promise<TPassAuthenticate> {
    return {
      deviceId: Binary.fromBytes(this.deviceId),
      credentials: {
        tag: "WebAuthn",
        value: dummyCodec.enc({
          hashedUserId: Binary.fromBytes(this.hashedUserId),
          signature: Binary.fromBytes(
            Blake2256(mergeUint8(this.hashedUserId, this.deviceId, challenge))
          ),
        }),
      },
    };
  }
}
