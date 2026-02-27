---
"@virtonetwork/authenticators-substrate": "minor"
---

# Change the order of the fields in the KeyRegistration and KeySignature structs

## Explanation

This change modifies the order of the fields in the `KeyRegistration` and `KeySignature` structs to match the order of the fields in the Kreivo runtime. This is a breaking change (before a stable API), so it is a minor release.

## Changes

- `KeyRegistration` struct has been updated to match the order of the fields in the Kreivo runtime.
- `KeySignature` struct has been updated to match the order of the fields in the Kreivo runtime.
