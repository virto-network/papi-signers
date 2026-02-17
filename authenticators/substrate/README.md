# Substrate Authenticator

[**📚 Documentation**](https://virtonetwork.github.io/papi-signers/guide/substrate)

A TypeScript helper that wires **substrate**-style signatures to the [@virtonetwork/signer](https://github.com/virto-network/papi-signers) stack. It exposes a single class, `Substrate`, that fulfils the `Authenticator<number>` interface used by `PassSigner`.

## Setup

First, ensure you have the necessary packages installed:

```bash
npm install @virtonetwork/authenticators-substrate @virtonetwork/signer
```

To initialize a `SubstrateKey` authenticator, you need a **username**, a **signer** (e.g., from a browser extension or keyring), and a **block hash challenger**.

```ts
import { SubstrateKey } from '@virtonetwork/authenticators-substrate';
import { blockHashChallenger, KreivoPassSigner } from '@virtonetwork/signer';
import { createClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider';

const SIGNER = createEd25519Signer();
const USERNAME = 'user@example.org';

const client = createClient(getWsProvider('wss://kreivo.io'));
const sk = await new SubstrateKey(
  USERNAME,
  SIGNER,
  blockHashChallenger(client),
).setup();
```

## Registration

The registration process involves two steps:

> [!NOTE]
> Registration usually happens server-side. A federated registration service receives the attestation payload from the client and submits the transaction, paying the fees to register the Pass user.

Generating the attestation payload using `SubstrateKey.register(blockNumber)`.

```ts
const finalized = await client.getFinalizedBlock();
const keyRegistration = await sk.register(finalized.number);

// We send the keyRegistration to the server
fetch('/api/register', {
  method: 'POST',
  body: JSON.stringify(keyRegistration),
});
```

Then, submitting the transaction onchain, via `api.tx.Pass.register` with the generated payload.

```ts
import { kreivo } from '@polkadot-api/descriptors';
const api = client.getTypedApi(kreivo);

const tx = api.tx.Pass.register({
  user: Binary.fromBytes(sk.hashedUserId),
  attestation: {
    type: 'SubstrateKey',
    value: {
      message: {
        context: keyRegistration.message.context,
        challenge: keyRegistration.message.challenge,
        authority_id: keyRegistration.message.authority_id,
      },
      public: ss58Encode(keyRegistration.public.asHex()),
      signature: keyRegistration.signature,
    },
  },
});

const txHash = await tx.signAndSubmit(SERVICE);
```

## Authentication

Once registered, the `SubstrateKey` can be used to sign transactions on behalf of the user using `KreivoPassSigner`. The signer's address is a sub-account derived from the collection and device.

> [!TIP]
> **Device Permissions & Delegation**: `SubstrateKey` authenticators can also authorize a server to perform actions on the user's behalf (such as adding devices, recovering access, or performing background tasks) through the device permissions model.

```ts
const kreivoPassSigner = new KreivoPassSigner(sk);
const accountId = ss58Encode(kreivoPassSigner.publicKey, 2);
const remark = Binary.fromText('Hello, Kreivo!');
const tx = api.tx.System.remark_with_event({ remark });

const txHash = await tx.signAndSubmit(kreivoPassSigner);
```
