import {
  Bin,
  type FixedSizeBinary,
  Variant,
} from "@polkadot-api/substrate-bindings";
import type { AuthorityId, HashedUserId } from "@virtonetwork/signer";
import { type Codec, Struct, u32 } from "scale-ts";

export type SigningType = "Ed25519" | "Sr25519" | "Ecdsa";

export type SubstrateSigner = {
  publicKey: Uint8Array;
  signingType: SigningType;
  sign: (bytes: Uint8Array) => Promise<Uint8Array> | Uint8Array;
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
    };

export type TSignedMessage<Cx> = {
  context: Cx;
  challenge: FixedSizeBinary<32>;
  authority_id: AuthorityId;
};

export type TKeyRegistration<Cx> = {
  message: TSignedMessage<Cx>;
  public: FixedSizeBinary<32>;
  signature: TMutiSignature;
};

export type TKeySignature<Cx> = {
  user_id: HashedUserId;
  message: TSignedMessage<Cx>;
  signature: TMutiSignature;
};

export const MultiSignature: Codec<TMutiSignature> = Variant({
  Ed25519: Bin(64),
  Sr25519: Bin(64),
  Ecdsa: Bin(65),
});

export const EncodedSignedMessage: Codec<TSignedMessage<number>> = Struct({
  context: u32,
  authority_id: Bin(32),
  challenge: Bin(32),
});

export const KeyRegistrationSignedMessage: Codec<TSignedMessage<number>> =
  Struct({
    context: u32,
    challenge: Bin(32),
    authority_id: Bin(32),
  });

export const KeySignatureSignedMessage: Codec<TSignedMessage<number>> = Struct({
  context: u32,
  challenge: Bin(32),
  authority_id: Bin(32),
});

export const KeyRegistration: Codec<TKeyRegistration<number>> = Struct({
  message: KeyRegistrationSignedMessage,
  public: Bin(32),
  signature: MultiSignature,
});

export const KeySignature: Codec<TKeySignature<number>> = Struct({
  user_id: Bin(32),
  message: KeySignatureSignedMessage,
  signature: MultiSignature,
});
