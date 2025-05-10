import { V14, V15, decAnyMetadata } from "@polkadot-api/substrate-bindings";

import blake2b from "blake2b";

export function getTypedMetadata(metadata: Uint8Array): V14 | V15 {
  try {
    const tmpMeta = decAnyMetadata(metadata);

    if (tmpMeta.metadata.tag !== "v14" && tmpMeta.metadata.tag !== "v15")
      throw null;

    return tmpMeta.metadata.value;
  } catch {
    throw new Error("Unsupported metadata version");
  }
}

export const blake2b256 = (data: Uint8Array) =>
  blake2b(32).update(data).digest();
