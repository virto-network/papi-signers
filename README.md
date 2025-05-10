# Polkadot-API Signers and Authenticators

This repository contains the `virto-signer` library which implements the `PolkadotSigner` type, as well
as some authenticators that are implemented in Kreivo.

## Directory Structure

This repository contains two directories: The first one (`virto-signer`) is a package that exports the `PassSigner`,
a `PAPI`-based signer that completes the extension information for `pallet-pass`.

The second directory (`authenticators`) contains several implementations of the `Authenticator` type coming from
`virto-signer`. Among them, there's authenticators for WebAuthn and JWT.

```
papi-signers/
├─ signers/
│  ├─ webauthn/
│  ├─ jwt/
│  ├─ test/
│  ├─ README.json
├─ virto-signer/
│  ├─ src/
│  ├─ test/
│  ├─ package.json
│  ├─ README.json
├─ .gitignore
├─ package.json
├─ README.md
```
