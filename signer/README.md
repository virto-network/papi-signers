# Virto Signer

An implementation of [Polkadot API](https://github.com/polkadot-api/polkadot-api)'s `PolkadotSigner`, that constructs a signed extrinsic which
uses an implementation of `Authenticator` to retrieve the required `deviceId` and `credentials`.

## Usage

```ts
import blake2b from "blake2b";
import { Authenticator } from '@virtonetwork/signer';

class DummyAuthenticator implements Authenticator {
  readonly deviceId: Uint8Array;
  readonly hashedUserId: Uint8Array;

  constructor(deviceId: Uint8Array, hashedUserId: Uint8Array) {
    this.deviceId = deviceId;
    this.hashedUserId = deviceId;
  }
  
  async credentials(challenge: Uint8Array): Promise<Uint8Array> {
    return mergeUint8(
      this.address,
      this.deviceId,
      // Dummy signature is blake2b_256(address ++ deviceId ++ challenge)
      blake2b(32).update(
        mergeUint8(this.address, this.deviceId, challenge)
      ).digest(),
    );
  }
}

// Then, signing a transaction
import { Binary, createClient } from "polkadot-api";
import { kreivo } from "@polkadot-api/descriptors";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat";

import { VirtoSigner } from '@virtonetwork/signer';

const client = createClient(
  withPolkadotSdkCompat(getWsProvider("wss://kreivo.io"))
);
const api = client.getTypedApi(kreivo);

const authenticator = new DummyAuthenticator(
  new Uint8Array(32).fill(0), // Device 0
  new Uint8Array(32).fill(0), // User 0
);

const tx = kreivoApi.tx.System.remark({
  remark: Binary.fromText("Hello, world!"),
});

await tx.signAndSubmit(new VirtoSigner(authenticator));
```
