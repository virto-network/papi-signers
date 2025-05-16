# Virto Signer

An implementation of [Polkadot API](https://github.com/polkadot-api/polkadot-api)'s `PolkadotSigner`, that constructs a signed extrinsic which
uses an implementation of `Authenticator` to retrieve the required `deviceId` and `credentials`.

## Usage

```ts
import {
  Authenticator,
  HashedUserId,
  TPassAuthenticate,
} from "@virtonetwork/signer";
import {
  Bin,
  Binary,
  Blake2256,
  FixedSizeBinary,
} from "@polkadot-api/substrate-bindings";
import { Codec, Struct } from "scale-ts";

import { mergeUint8 } from "polkadot-api/utils";

export type Dummy = {
  hashedUserId: HashedUserId;
  signature: FixedSizeBinary<32>;
};
export const dummyCodec: Codec<Dummy> = Struct({
  hashedUserId: Bin(32),
  signature: Bin(32),
});

export class DummyAuthenticator implements Authenticator {
  readonly deviceId: Uint8Array;
  readonly hashedUserId: Uint8Array;

  constructor(deviceId: Uint8Array, hashedUserId: Uint8Array) {
    this.deviceId = deviceId;
    this.hashedUserId = hashedUserId;
  }

  async authenticate(challenge: Uint8Array): Promise<TPassAuthenticate> {
    return {
      deviceId: Binary.fromBytes(this.deviceId),
      credentials: {
        tag: "WebAuthn",
        value: dummyCodec.enc({
          hashedUserId: Binary.fromBytes(this.hashedUserId),
          signature: Binary.fromBytes(
            Blake2256(mergeUint8(this.hashedUserId, this.deviceId, challenge))
          ),
        }),
      },
    };
  }
}
```

Then, when signing a transaction, use the authenticator:

```ts
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
  new Uint8Array(32),
  new Uint8Array(32).fill(1)
);
const signer = new KreivoPassSigner(
  authenticator, 
  kreivoApi.query.System.BlockHash.getValue
);

const tx = kreivoApi.tx.System.remark({
  remark: Binary.fromText("Hello, world!"),
});

await tx.signAndSubmit(signer);
```
