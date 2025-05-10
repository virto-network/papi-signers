import {} from "polkadot-api/utils";

import blake2b from "blake2b";

export interface Authenticator {
  readonly deviceId: Uint8Array;
  readonly hashedUserId: Uint8Array;

  credentials(challenge: Uint8Array): Promise<Uint8Array>;
}
