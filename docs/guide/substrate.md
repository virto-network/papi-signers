# Substrate Authenticator

This guide demonstrates how to use the `SubstrateKey` authenticator. This library is intended for client, service, and SDK implementors that want to use Substrate Keys as a device for registering users using the Kreivo Pass service (similar to how applications and SDKs integrate with Auth0's authentication services).

## Setup

First, ensure you have the necessary packages installed:

```bash
npm install @virtonetwork/authenticators-substrate @virtonetwork/signer
```

To initialize a `SubstrateKey` authenticator, you need a **username**, a **signer** (e.g., from a browser extension or keyring), and a **block hash challenger**.

::: code-group
<<< ./snippets/substrate/setup.ts [setup.ts]
:::

## Registration

The registration process involves two steps:

1. **Client-side**: Generate the attestation payload using `sk.register()`.
2. **Server-side**: Submit the transaction to `api.tx.Pass.register` with the generated payload.

> [!NOTE]
> Registration usually happens server-side. A federated registration service receives the attestation payload from the client and submits the transaction, paying the fees to register the Pass user.

::: code-group
<<< ./snippets/substrate/register.ts [register.ts]
:::

## Authentication

Once registered, the `SubstrateKey` can be used to sign transactions on behalf of the user using `KreivoPassSigner`. The signer's address is a sub-account derived from the collection and device.

> [!TIP]
> **Device Permissions & Delegation**: `SubstrateKey` authenticators can also authorize a server to perform actions on the user's behalf (such as adding devices, recovering access, or performing background tasks) through the device permissions model.

::: code-group
<<< ./snippets/substrate/authenticate.ts [authenticate.ts]
:::
