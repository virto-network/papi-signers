import { Blake2256 } from "@polkadot-api/substrate-bindings";
import { mergeUint8 } from "polkadot-api/utils";

export interface Challenger {
  generate(context: Uint8Array, extrinsicContext: Uint8Array): Uint8Array;
}

export class KreivoBlockChallenger implements Challenger {
  generate(blockHash: Uint8Array, extrinsicContext: Uint8Array): Uint8Array {
    return Blake2256(mergeUint8(blockHash, extrinsicContext));
  }
}
