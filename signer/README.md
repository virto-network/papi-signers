# Virto Signer

[**📚 Documentation**](https://virtonetwork.github.io/papi-signers/guide/signer)

An implementation of [Polkadot API](https://github.com/polkadot-api/polkadot-api)'s `PolkadotSigner`, that constructs a signed extrinsic which
uses an implementation of `Authenticator` to retrieve the required `deviceId` and `credentials`.

## Usage

```ts
import { KreivoPassSigner } from "@virtonetwork/signer";
import { Binary } from "polkadot-api";

// Assuming you have an initialized authenticator (e.g. SubstrateKey or WebAuthn)
const kreivoPassSigner = new KreivoPassSigner(authenticator);

// You can get the address of the signer
const accountId = kreivoPassSigner.address;

// Sign transactions
const remark = Binary.fromText('Hello, Kreivo!');
const tx = api.tx.System.remark_with_event({ remark });

const txHash = await tx.signAndSubmit(kreivoPassSigner);
```
