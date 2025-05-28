import { PolkadotSigner, SS58String } from "polkadot-api";
import { sr25519, ss58Encode } from "@polkadot-labs/hdkd-helpers";

import { getPolkadotSigner } from "polkadot-api/signer";
import { randomBytes } from "@noble/hashes/utils";

/** A function that signs */
export type SignFn = (input: Uint8Array) => Promise<Uint8Array> | Uint8Array;

export type Sr25519Signer = {
  /** keep it safe – this is your raw 32-byte secret */
  secret: Uint8Array;
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
  const secret = randomBytes(32);

  const publicKey = sr25519.getPublicKey(secret);
  const sign = (input: Uint8Array) => sr25519.sign(input, secret);
  const signer = getPolkadotSigner(publicKey, "Sr25519", sign);
  Object.defineProperty(signer, "sign", { value: sign, configurable: false });

  return {
    secret,
    signer: signer as PolkadotSigner & { sign: SignFn },
    address: ss58Encode(publicKey, prefix),
  };
}
