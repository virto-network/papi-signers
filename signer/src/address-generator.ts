import { Blake2256 } from "@polkadot-api/substrate-bindings";
import { mergeUint8 } from "polkadot-api/utils";

export type AddressGenerator = (hashedUserId: Uint8Array) => Uint8Array;

export const kreivoPassDefaultAddressGenerator: AddressGenerator = (
  hashedUserId: Uint8Array,
) => Blake2256(mergeUint8([new Uint8Array(32).fill(0), hashedUserId]));
