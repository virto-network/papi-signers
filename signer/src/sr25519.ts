import { PolkadotSigner, SS58String } from "polkadot-api";
import {
  entropyToMiniSecret,
  generateMnemonic,
  mnemonicToEntropy,
  ss58Encode,
} from "@polkadot-labs/hdkd-helpers";

import { getPolkadotSigner } from "polkadot-api/signer";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";

/** A function that signs */
export type SignFn = (input: Uint8Array) => Promise<Uint8Array> | Uint8Array;

export type Sr25519Signer = {
  /** PAPI-compatible signer object, with the `sign` function exposed (for testing purposes) */
  signer: ReturnType<typeof getPolkadotSigner> & { sign: SignFn };
  /** MultiAddress-wrapped SS58 address (prefix 0 = Polkadot) */
  address: SS58String;
};

/**
 * Makes a random sr25519 signer.
 * @param prefix SS58 network prefix – 0 = Polkadot, 2 = Kusama, 42 = generic …
 */
export function createSessionKeySigner(prefix: number = 0): Sr25519Signer {
  const miniSecret = entropyToMiniSecret(
    mnemonicToEntropy(generateMnemonic(256))
  );
  const derive = sr25519CreateDerive(miniSecret);

  const keypair = derive(`//${Date.now()}`);

  const signer = getPolkadotSigner(keypair.publicKey, "Sr25519", keypair.sign);
  Object.defineProperty(signer, "sign", {
    value: keypair.sign,
    configurable: false,
  });

  return {
    signer: signer as PolkadotSigner & { sign: SignFn },
    address: ss58Encode(keypair.publicKey, prefix),
  };
}
