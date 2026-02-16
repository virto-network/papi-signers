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

## 🚀 Quick start

```ts
import { WebAuthn } from "@virtonetwork/authenticators-webauthn";
import { PassSigner } from "@virtonetwork/signer";

// 1️⃣  Restore user → credential mapping (from DB, localStorage…)
const savedId = await db.getCredentialId("alice@example.com");

// 2️⃣  Bootstrap helper
const wa = await new WebAuthn("alice@example.com", savedId).setup();

// 3️⃣  Enrol a new pass‑key if needed
if (!savedId) {
  const att = await wa.register(blockNumber, blockHash);
  await db.saveCredentialId("alice@example.com", att.credentialId);
}

// 4️⃣  Sign any runtime challenge
await passSigner.credentials(
  await wa.authenticate(challenge, blockNumber),
);
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
