import {
  AddressGenerator,
  kreivoPassDefaultAddressGenerator,
} from "../src/address-generator.ts";
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
  constructor(
    public readonly hashedUserId: Uint8Array,
    public deviceId: Uint8Array,
    public getChallenge = (ctx: number, xtc: Uint8Array) =>
      Promise.resolve(Blake2256(mergeUint8([Blake2256(u32.enc(ctx)), xtc]))),
    public addressGenerator: AddressGenerator = kreivoPassDefaultAddressGenerator,
  ) {}

  async authenticate(ctx: number, xtc: Uint8Array): Promise<TPassAuthenticate> {
    const challenge = await this.getChallenge(ctx, xtc);
    return {
      deviceId: Binary.fromBytes(this.deviceId),
      credentials: {
        tag: "WebAuthn",
        value: dummyCodec.enc({
          hashedUserId: Binary.fromBytes(this.hashedUserId),
          context: ctx,
          signature: Binary.fromBytes(
            Blake2256(
              mergeUint8([this.hashedUserId, this.deviceId, challenge]),
            ),
          ),
        }),
      },
    };
  }
}
