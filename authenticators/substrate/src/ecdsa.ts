import { secp256k1 } from "@noble/curves/secp256k1.js";
import { Blake2256 } from "@polkadot-api/substrate-bindings";

/** Length of a compressed secp256k1 public key. */
export const ECDSA_PUBLIC_KEY_LENGTH = 33;
/** Length of a recoverable secp256k1 signature: `r ‖ s ‖ v`. */
export const ECDSA_SIGNATURE_LENGTH = 65;

/**
 * Returns the recoverable signature `r ‖ s ‖ v` (with `v` in `0..=3`) that
 * the runtime accepts for `message`, signed by `publicKey`.
 *
 * The runtime checks an ECDSA `MultiSignature` by recovering a public key from
 * `blake2_256(message)` and comparing `blake2_256(recovered)` with the
 * account. So the signer must prehash with blake2-256 (as `sp-core` and
 * `@polkadot-labs/hdkd` do) and `v` must be the key's recovery id.
 *
 * Recovery ids are not reliable across signers: some return `27`/`28`, and
 * `@polkadot-labs/hdkd-helpers` 0.0.27 always returns `0`. So the recovery id
 * is recomputed here, which also checks the signer prehashed the right message
 * with the right key.
 *
 * @throws Error If no recovery id yields `publicKey` for `blake2_256(message)`.
 */
export function normalizeEcdsaSignature(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array
): Uint8Array {
  const digest = Blake2256(message);
  const compact = secp256k1.Signature.fromBytes(
    signature.subarray(0, 64),
    "compact"
  );
  const expected = secp256k1.Point.fromBytes(publicKey);

  for (let recovery = 0; recovery < 4; recovery++) {
    let recovered: typeof expected;
    try {
      recovered = compact.addRecoveryBit(recovery).recoverPublicKey(digest);
    } catch {
      continue;
    }
    if (recovered.equals(expected)) {
      const normalized = new Uint8Array(ECDSA_SIGNATURE_LENGTH);
      normalized.set(signature.subarray(0, 64));
      normalized[64] = recovery;
      return normalized;
    }
  }

  throw new Error(
    "ECDSA signature does not verify against blake2_256(message) for the signer's public key. " +
      "The signer must sign the blake2-256 hash of the message it is given."
  );
}
