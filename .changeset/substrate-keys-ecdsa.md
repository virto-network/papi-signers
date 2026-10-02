---
"@virtonetwork/authenticators-substrate": minor
---

Support `Ecdsa` keys. For an `Ecdsa` signer, `publicKey` is the 33-byte compressed key. `register()` returns `blake2_256(publicKey)` as `public`, and `authenticate()` returns it as `deviceId`, which is the account the runtime's `MultiSignature::verify` recovers to. Before, the 33-byte key was truncated into a 32-byte field and could never verify. The recovery id of the signature is recomputed after signing, so signers returning `27`/`28` work, and so does `@polkadot-labs/hdkd-helpers` 0.0.27, which always returns `0`. Adds `SubstrateKey.accountId`. The constructor now throws on a `publicKey` of the wrong length for its `signingType`, and signing throws on a signature of the wrong length or one that doesn't recover to the key.
