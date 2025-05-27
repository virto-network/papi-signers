import { AuthorityId, DeviceId, HashedUserId } from "@virtonetwork/signer";
import { Bin, Binary, HexString } from "@polkadot-api/substrate-bindings";
import { Codec, Struct, u32 } from "scale-ts";

export type BlockHash = HexString;

export type GetChallenge<Cx> = (
  ctx: Cx,
  xtc: Uint8Array
) => Promise<Uint8Array>;

export type hashedUserId = (userId: string) => Promise<Uint8Array>;

export interface CredentialsHandler {
  publicKeyCreateOptions(
    challenge: Uint8Array,
    user: PublicKeyCredentialUserEntity
  ): Promise<CredentialCreationOptions["publicKey"]>;
  onCreatedCredentials(
    userId: string,
    credentials: PublicKeyCredential
  ): Promise<void>;
  publicKeyRequestOptions(
    userId: string,
    challenge: Uint8Array
  ): Promise<CredentialRequestOptions["publicKey"]>;
}

export type TAttestationMeta<Cx> = {
  authority_id: AuthorityId;
  device_id: DeviceId;
  context: Cx;
};

const AttestationMeta: Codec<TAttestationMeta<number>> = Struct({
  authority_id: Bin(32),
  device_id: Bin(32),
  context: u32,
});

export type TAttestation<Cx> = {
  meta: TAttestationMeta<Cx>;
  authenticator_data: Binary;
  client_data: Binary;
  public_key: Binary;
};

export const Attestation: Codec<TAttestation<number>> = Struct({
  meta: AttestationMeta,
  authenticator_data: Bin(),
  client_data: Bin(),
  public_key: Bin(),
});

export type TAssertionMeta<Cx> = {
  authority_id: AuthorityId;
  user_id: HashedUserId;
  context: Cx;
};

const AssertionMeta: Codec<TAssertionMeta<number>> = Struct({
  authority_id: Bin(32),
  user_id: Bin(32),
  context: u32,
});

export type TAssertion<Cx> = {
  meta: TAssertionMeta<Cx>;
  authenticator_data: Binary;
  client_data: Binary;
  signature: Binary;
};

export const Assertion: Codec<TAssertion<number>> = Struct({
  meta: AssertionMeta,
  authenticator_data: Bin(),
  client_data: Bin(),
  signature: Bin(),
});
