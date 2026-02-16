# @virtonetwork/signer

## 1.3.0

### Minor Changes

- 0d34756: - **@virtonetwork/signer**: Added `KreivoPassSigner` e2e tests and refined types for key registration.
  - **@virtonetwork/authenticators-substrate**: Refined types for encoded/decoded messages in `SubstrateKey`.
  - **@virtonetwork/authenticators-webauthn**: Documentation updates and minor internal fixes.

## 1.2.3

### Patch Changes

- 99d4972: - Update dependencies.
  - Fix an issue in `SubstrateKey` authentication, where the order of the `SignedMessage` was incorrect.
