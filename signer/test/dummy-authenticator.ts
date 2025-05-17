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
import { Codec, Struct, u32 } from "scale-ts";

import { mergeUint8 } from "polkadot-api/utils";

export type Dummy = {
  hashedUserId: HashedUserId;
  context: number;
  signature: FixedSizeBinary<32>;
};
export const dummyCodec: Codec<Dummy> = Struct({
  hashedUserId: Bin(32),
  context: u32,
  signature: Bin(32),
});

export class DummyAuthenticator implements Authenticator<number> {
  readonly hashedUserId: Uint8Array;

  constructor(hashedUserId: Uint8Array, private deviceId: Uint8Array) {
    this.deviceId = deviceId;
    this.hashedUserId = hashedUserId;
  }

  async authenticate(
    challenge: Uint8Array,
    context: number
  ): Promise<TPassAuthenticate> {
    return {
      deviceId: Binary.fromBytes(this.deviceId),
      credentials: {
        tag: "WebAuthn",
        value: dummyCodec.enc({
          hashedUserId: Binary.fromBytes(this.hashedUserId),
          context,
          signature: Binary.fromBytes(
            Blake2256(mergeUint8(this.hashedUserId, this.deviceId, challenge))
          ),
        }),
      },
    };
  }
}
