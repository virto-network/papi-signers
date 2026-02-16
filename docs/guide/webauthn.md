# WebAuthn Authenticator

The WebAuthn authenticator allows using Passkeys (TouchID, FaceID, YubiKey) to sign transactions.

## Setup

First, initialize the `WebAuthn` authenticator with the user's identifier and a challenger.

::: code-group
<<< ./snippets/webauthn/setup.ts [setup.ts]
:::

## Registration

To register a new credential, call the `register` method. This will trigger the browser's WebAuthn prompt.
The returned attestation must be submitted to the chain using the `Pass.register` extrinsic.

::: code-group
<<< ./snippets/webauthn/register.ts [register.ts]
:::

## Authentication

Once registered, you can use the `WebAuthn` instance to create a `KreivoPassSigner`.
This signer can then be used to sign transactions, which will trigger the browser's WebAuthn prompt for authentication.

::: code-group
<<< ./snippets/webauthn/authenticate.ts [authenticate.ts]
:::
