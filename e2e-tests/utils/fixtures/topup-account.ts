import { type Blockchain, setStorage } from "@acala-network/chopsticks-core";
import { ss58Encode } from "@polkadot-labs/hdkd-helpers";

export function topupAccount(
  chain: Blockchain,
  address: string | Uint8Array,
  amount: bigint
) {
  return setStorage(chain, {
    System: {
      Account: [
        [
          [typeof address === "object" ? ss58Encode(address) : address],
          {
            nonce: 0,
            consumers: 0,
            providers: 1,
            sufficients: 0,
            data: {
              free: amount,
              reserved: 0,
              miscFrozen: 0,
              feeFrozen: 0,
            },
          },
        ],
      ],
    },
  });
}
