# Substrate Authenticator

[**📚 Documentation**](https://virtonetwork.github.io/papi-signers/guide/examples)

A TypeScript helper that wires **substrate**-style signatures to the [@virtonetwork/signer](https://github.com/virto-network/papi-signers) stack. It exposes a single class, `Substrate`, that fulfils the `Authenticator<number>` interface used by `PassSigner`.

## ✨ Features

* **One‑line setup** → `await new Substrate(user, { sign }).setup()`
* Deterministic `deviceId = Blake2‑256(credentialId)`
* Produces SCALE‑encoded `PassAuthenticate` objects
