import {} from "polkadot-api/utils";

export interface Authenticator {
  readonly deviceId: Uint8Array;
  readonly hashedUserId: Uint8Array;

  assertion(challenge: Uint8Array): Promise<Uint8Array>;
}
