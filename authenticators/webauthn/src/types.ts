import { AuthorityId, DeviceId, HashedUserId } from "@virtonetwork/signer";
import { Bin, Binary, HexString } from "@polkadot-api/substrate-bindings";
import { Codec, Struct, u32 } from "scale-ts";

export type BlockHash = HexString;

export type TAttestationMeta<Cx> = {
  authorityId: AuthorityId;
  deviceId: DeviceId;
  context: Cx;
};

const AttestationMeta: Codec<TAttestationMeta<number>> = Struct({
  authorityId: Bin(32),
  deviceId: Bin(32),
  context: u32,
});

export type TAttestation<Cx> = {
  meta: TAttestationMeta<Cx>;
  authenticatorData: Binary;
  clientData: Binary;
  publicKey: Binary;
};

export const Attestation: Codec<TAttestation<number>> = Struct({
  meta: AttestationMeta,
  authenticatorData: Bin(),
  clientData: Bin(),
  publicKey: Bin(),
});

export type TAssertionMeta<Cx> = {
  authorityId: AuthorityId;
  userId: HashedUserId;
  context: Cx;
};

const AssertionMeta: Codec<TAssertionMeta<number>> = Struct({
  authorityId: Bin(32),
  userId: Bin(32),
  context: u32,
});

export type TAssertion<Cx> = {
  meta: TAssertionMeta<Cx>;
  authenticatorData: Binary;
  clientData: Binary;
  signature: Binary;
};

export const Assertion: Codec<TAssertion<number>> = Struct({
  meta: AssertionMeta,
  authenticatorData: Bin(),
  clientData: Bin(),
  signature: Bin(),
});
