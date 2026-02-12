import {
  Bin,
  type FixedSizeBinary,
  Variant,
} from "@polkadot-api/substrate-bindings";
import type { AuthorityId } from "@virtonetwork/signer";
import { type Codec, Struct, u32 } from "scale-ts";

export type SubstrateSigner = {
  publicKey: Uint8Array;
  signingType: "Ed25519" | "Sr25519" | "Ecdsa" | "Eth";
  sign: (bytes: Uint8Array) => Promise<Uint8Array> | Uint8Array;
};

export type TSignedMessage<Cx> = {
  context: Cx;
  challenge: FixedSizeBinary<32>;
  authority_id: AuthorityId;
};

export type TMutiSignature =
  | {
      type: "Ed25519";
      value: FixedSizeBinary<64>;
    }
  | {
      type: "Sr25519";
      value: FixedSizeBinary<64>;
    }
  | {
      type: "Ecdsa";
      value: FixedSizeBinary<65>;
    }
  | {
      type: "Eth";
      value: FixedSizeBinary<65>;
    };

export const MultiSignature: Codec<TMutiSignature> = Variant({
  Ed25519: Bin(64),
  Sr25519: Bin(64),
  Ecdsa: Bin(65),
  Eth: Bin(65),
});

export const SignedMessage: Codec<TSignedMessage<number>> = Struct({
  context: u32,
  challenge: Bin(32),
  authority_id: Bin(32),
});

export type TKeyRegistration<Cx> = {
  message: TSignedMessage<Cx>;
  public: FixedSizeBinary<32>;
  signature: TMutiSignature;
};

export const KeyRegistration: Codec<TKeyRegistration<number>> = Struct({
  message: SignedMessage,
  public: Bin(32),
  signature: MultiSignature,
});

export type TKeySignature<Cx> = {
  message: TSignedMessage<Cx>;
  signature: TMutiSignature;
};

export const KeySignature: Codec<TKeySignature<number>> = Struct({
  message: SignedMessage,
  signature: MultiSignature,
});
