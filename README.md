# Polkadot-API Signers and Authenticators

# Virto Signer

[**📚 Documentation**](https://virtonetwork.github.io/papi-signers/)

This repository contains the `virto-signer` library which implements the `PolkadotSigner` type, as well
as some authenticators that are implemented in Kreivo.

## Packages

- [**`@virtonetwork/signer`**](./signer/README.md): The core signer package that implements `PolkadotSigner`.
- [**`@virtonetwork/authenticators-substrate`**](./authenticators/substrate/README.md): Authenticator using Substrate keys (e.g., from Polkadot extensions).
- [**`@virtonetwork/authenticators-webauthn`**](./authenticators/webauthn/README.md): Authenticator using WebAuthn (Passkeys).

## Directory Structure

```
papi-signers/
├─ authenticators/       # Authenticator implementations
│  ├─ webauthn/          # @virtonetwork/authenticators-webauthn
│  └─ substrate/         # @virtonetwork/authenticators-substrate
├─ signer/               # @virtonetwork/signer (Core package)
├─ docs/                 # Documentation & Guides
└─ package.json
```
