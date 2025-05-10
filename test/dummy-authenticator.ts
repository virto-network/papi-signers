import { Authenticator } from "@virtonetwork/signer";
import blake2b from "blake2b";
import { mergeUint8 } from "polkadot-api/utils";

export class DummyAuthenticator implements Authenticator {
  readonly deviceId: Uint8Array;
  readonly hashedUserId: Uint8Array;

  constructor(deviceId: Uint8Array, hashedUserId: Uint8Array) {
    this.deviceId = deviceId;
    this.hashedUserId = deviceId;
  }

  async credentials(challenge: Uint8Array): Promise<Uint8Array> {
    return mergeUint8(
      this.hashedUserId,
      this.deviceId,
      // Dummy signature is blake2b_256(hashed_user_id ++ device_id ++ challenge)
      blake2b(32)
        .update(mergeUint8(this.hashedUserId, this.deviceId, challenge))
        .digest()
    );
  }
}
