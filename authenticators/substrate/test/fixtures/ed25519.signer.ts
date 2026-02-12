import {
  entropyToMiniSecret,
  generateMnemonic,
  mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers";

import { Binary } from "polkadot-api";
import { SubstrateSigner } from "../../src/types.ts";
import { ed25519CreateDerive } from "@polkadot-labs/hdkd";

/**
 * Makes a random ed25519 signer.
 *
 * Using this signer in the context of this testing, since signatures are
 * deterministic, as opposed to the sr25519 curve.
 *
 * @param prefix SS58 network prefix – 0 = Polkadot, 2 = Kusama, 42 = generic
 */
export function createEd25519Signer(): SubstrateSigner {
  const miniSecret = entropyToMiniSecret(
    mnemonicToEntropy(generateMnemonic(256)),
  );
  const derive = ed25519CreateDerive(miniSecret);

  const keypair = derive(`//${Date.now()}`);

  return {
    sign: (bytes: Uint8Array) => keypair.sign(Binary.fromBytes(bytes).asHex()),
    signingType: "Ed25519",
    publicKey: keypair.publicKey,
  };
}
