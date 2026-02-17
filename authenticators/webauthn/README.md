# WebAuthn Authenticator

[**📚 Documentation**](https://virtonetwork.github.io/papi-signers/guide/webauthn)

A TypeScript helper that wires **passkeys** (WebAuthn resident credentials) to the [@virtonetwork/signer](https://github.com/virto-network/papi-signers) stack. It exposes a single class, `WebAuthn`, that fulfils the `Authenticator<number>` interface used by `PassSigner`.
The implementation is **browser‑only** and keeps all credential mapping in the caller’s hands — perfect for SPAs or wallet extensions that already manage users.

## ✨ Features

* **One‑line setup** → `await new WebAuthn(user).setup()`
* **Kreivo‑compatible challenges** for secure on‑chain attestations
* Deterministic `deviceId = Blake2‑256(credentialId)`
* Produces SCALE‑encoded `Attestation` / `PassAuthenticate` objects
* Zero persistence: inject or register credentials as you see fit

## 📦 Installation

```bash
npm i @virtonetwork/authenticators-webauthn
```

## Setup

First, initialize the `WebAuthn` authenticator with the user's identifier and a challenger.

```ts
wa = await new WebAuthn(USERNAME, blockHashChallenger(client)).setup();
```

## Registration

To register a new credential, call the `register` method. This will trigger the browser's WebAuthn prompt.
The returned attestation must be submitted to the chain using the `Pass.register` extrinsic.

```ts
const finalizedBlock = await client.getFinalizedBlock();
const attestation = await wa.register(finalizedBlock.number);

const tx = api.tx.Pass.register({
  user: Binary.fromBytes(wa.hashedUserId),
  attestation: {
    type: 'WebAuthn',
    value: {
      meta: attestation.meta,
      authenticator_data: attestation.authenticator_data,
      client_data: attestation.client_data,
      public_key: attestation.public_key,
    },
  },
});

await new Promise<void>((resolve, error) => {
  tx.signSubmitAndWatch(ALICE).subscribe({
    next: (event) => {
      if (event.type === 'finalized') {
        resolve();
      }
    },
    error,
  });
});
```

## Authentication

Once registered, you can use the `WebAuthn` instance to create a `KreivoPassSigner`.
This signer can then be used to sign transactions, which will trigger the browser's WebAuthn prompt for authentication.

```ts
const kreivoPassSigner = new KreivoPassSigner(wa);
const accountId = ss58Encode(kreivoPassSigner.publicKey, 2);

// Transfer tokens
{
  const tx = api.tx.Balances.transfer_keep_alive({
    dest: { type: 'Id', value: accountId },
    value: 1_0000000000n,
  });

  await new Promise<void>((resolve, error) =>
    tx.signSubmitAndWatch(ALICE).subscribe({
      next: (event) => {
        if (event.type === 'finalized') {
          resolve();
        }
      },
      error,
    }),
  );
}

// Sign remark
{
  const remark = Binary.fromText('Hello, Kreivo!');
  const tx = api.tx.System.remark_with_event({ remark });

  const signedTx = await tx.sign(kreivoPassSigner, {
    mortality: { mortal: false },
  });
  const txBytes = Vector(u8).dec(signedTx);

  const txResult = await api.apis.BlockBuilder.apply_extrinsic(
    Binary.fromBytes(new Uint8Array(txBytes)),
  );

  assert(txResult.success);
  assert(txResult.value.success);
}
```

## 🛠️ API

| Method                                        | Returns                         | Notes                                                                                  |
| --------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| `setup()`                                     | `Promise< this >`               | Computes `hashedUserId`. Call once.                                                    |
| `register(blockNo, blockHash, [displayName])` | `Promise<TAttestation<number>>` | Generates a WebAuthn credential and attestation. Throws if `credentialId` already set. |
| `authenticate(challenge, context)`            | `Promise<TPassAuthenticate>`    | Signs an arbitrary 32‑byte challenge. Requires `credentialId`.                         |
| `getDeviceId(webAuthn)                        | `Promise<DeviceId>`             | `Blake2‑256(credentialId)` wrapped in `Binary`.                                        |
| `setCredentialId(id)`                         | `void`                          | Inject credential id after construction.                                               |

> **Type parameter** `<number>` → `context` inside attestations/assertions is the **block number**.

## 📝 Persistence Strategy

This package **does not** store credential ids. A typical strategy is:

1. During **registration**, persist `attestation.publicKey.bytes` keyed by `userId`.
2. On next load, feed that id into the `WebAuthn` constructor.
3. For multiple devices per account, maintain an *array* of ids and pick one UI‑side.

## ⚠️ Error Handling

| Error message                  | Cause                                                    | Fix                                           |
| ------------------------------ | -------------------------------------------------------- | --------------------------------------------- |
| `Already have a credentialId…` | Called `register()` when id already present              | Skip registration or call with a new instance |
| `credentialId unknown…`        | Tried to authenticate/get device id without a credential | Inject stored id or call `register()`         |
| `DOMException: …`              | User dismissed the WebAuthn prompt                       | Ask user to retry                             |

## 🧳 Dependencies

* **@virtonetwork/signer** ≥ 0.10  — interfaces, `KreivoBlockChallenger`, `PassSigner`
* **@polkadot-api/substrate-bindings**  — `Binary`, `Blake2256`
* Browser with WebAuthn (Chrome ≥ 109, Firefox ≥ 106, Safari ≥ 16)

## 🩹 Development

```bash
# lint & type‑check
npm run lint && npm run typecheck
```

### Tests

Go to `tests/test.ts` to check out our tests.

## 📄 License

MIT © Virto Network contributors
