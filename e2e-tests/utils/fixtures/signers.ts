import {
  ecdsaCreateDerive,
  ed25519CreateDerive,
  sr25519CreateDerive,
} from "@polkadot-labs/hdkd";
import {
  DEV_PHRASE,
  entropyToMiniSecret,
  generateMnemonic,
  mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers";

import type { SubstrateSigner } from "@virtonetwork/authenticators-substrate";
import { getPolkadotSigner } from "polkadot-api/signer";

/**
 * Makes a random ed25519 signer.
 *
 * Using this signer in the context of this testing, since signatures are
 * deterministic, as opposed to the sr25519 curve.
 */
export function createEd25519Signer(): SubstrateSigner {
  const miniSecret = entropyToMiniSecret(
    mnemonicToEntropy(generateMnemonic(256))
  );
  const derive = ed25519CreateDerive(miniSecret);

  const keypair = derive(`//${Date.now()}`);
  return {
    publicKey: keypair.publicKey,
    sign: keypair.sign,
    signingType: "Ed25519",
  };
}

/**
 * Makes a random ecdsa (secp256k1) signer: a 33-byte compressed public key,
 * signing `blake2_256(bytes)` into a 65-byte `r ‖ s ‖ v` signature.
 */
export function createEcdsaSigner(): SubstrateSigner {
  const miniSecret = entropyToMiniSecret(
    mnemonicToEntropy(generateMnemonic(256))
  );
  const keypair = ecdsaCreateDerive(miniSecret)(`//${Date.now()}`);
  return {
    publicKey: keypair.publicKey,
    sign: keypair.sign,
    signingType: "Ecdsa",
  };
}

/**
 * Makes a test sr25519 signer.
 * @param prefix SS58 network prefix – 0 = Polkadot, 2 = Kusama, 42 = generic
 */
export function createTestSr25519Signer(path: string) {
  const miniSecret = entropyToMiniSecret(mnemonicToEntropy(DEV_PHRASE));
  const derive = sr25519CreateDerive(miniSecret);

  const keypair = derive(path);
  return getPolkadotSigner(keypair.publicKey, "Sr25519", keypair.sign);
}
