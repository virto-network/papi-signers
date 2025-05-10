import { decAnyMetadata } from "@polkadot-api/substrate-bindings";

export function getTypedMetadata(metadata: Uint8Array) {
  try {
    const tmpMeta = decAnyMetadata(metadata);

    if (tmpMeta.metadata.tag !== "v14" && tmpMeta.metadata.tag !== "v15")
      throw null;

    return tmpMeta.metadata.value;
  } catch {
    throw new Error("Unsupported metadata version");
  }
}
