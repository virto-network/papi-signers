import { Authenticator } from "@virtonetwork/signer";
import { Blake2256 } from "@polkadot-api/substrate-bindings";
import { mergeUint8 } from "polkadot-api/utils";

export class DummyAuthenticator implements Authenticator {
  readonly deviceId: Uint8Array;
  readonly hashedUserId: Uint8Array;

  constructor(deviceId: Uint8Array, hashedUserId: Uint8Array) {
    this.deviceId = deviceId;
    this.hashedUserId = hashedUserId;
  }

  async credentials(challenge: Uint8Array): Promise<Uint8Array> {
    return mergeUint8(
      this.hashedUserId,
      this.deviceId,
      // Dummy signature is blake2b_256(hashed_user_id ++ device_id ++ challenge)
      Blake2256(mergeUint8(this.hashedUserId, this.deviceId, challenge))
    );
  }
}
