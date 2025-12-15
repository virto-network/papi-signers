import { Bin, Binary, FixedSizeBinary } from "@polkadot-api/substrate-bindings";
import { Codec, Struct, u32 } from "scale-ts";

import { AuthorityId } from "@virtonetwork/signer";

export type SubstrateSigner = {
  publicKey: Uint8Array;
  sign: (bytes: Uint8Array) => Promise<Uint8Array> | Uint8Array;
};

export type TSignedMessage<Cx> = {
  context: Cx;
  challenge: Binary;
  authority_id: AuthorityId;
};

export const SignedMessage: Codec<TSignedMessage<number>> = Struct({
  context: u32,
  challenge: Bin(),
  authority_id: Bin(32),
});

export type TKeyRegistration<Cx> = {
  message: TSignedMessage<Cx>;
  public: FixedSizeBinary<32>;
  signature: AuthorityId;
};

export type TKeySignature<Cx> = {
  message: TSignedMessage<Cx>;
  signature: Binary;
};

export const KeySignature: Codec<TKeySignature<number>> = Struct({
  message: SignedMessage,
  signature: Bin(),
});
