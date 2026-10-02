---
"@virtonetwork/authenticators-substrate": patch
---

Document which runtime each version signs for. Kreivo runtime 133 (release 0.17.0) verifies `context ++ challenge ++ authority_id`, which `1.3.0` signs; `1.2.3` and earlier sign `context ++ authority_id ++ challenge`, so their registrations fail with `DeviceAttestationInvalid` and their transactions with `BadSigner`. Adds a test that pins the signed bytes, `KeyRegistration` and `KeySignature` to a vector produced by `pass-authenticators-substrate-keys` 1.2.0.
