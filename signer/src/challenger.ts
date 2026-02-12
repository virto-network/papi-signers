import { Binary, Blake2256 } from "@polkadot-api/substrate-bindings";

import { PolkadotClient } from "polkadot-api";
import { mergeUint8 } from "polkadot-api/utils";

export type Challenger<T> = (
  ctx: T,
  xtc: Uint8Array,
) => Promise<Uint8Array> | Uint8Array;

export function blockHashChallenger(
  client: PolkadotClient,
): Challenger<number> {
  return async (ctx: number, xtc: Uint8Array) => {
    const blockHash = Binary.fromHex(
      await client._request("chain_getBlockHash", [ctx]),
    );
    return Blake2256(mergeUint8([blockHash.asBytes(), xtc]));
  };
}
