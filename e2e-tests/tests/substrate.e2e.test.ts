import { Binary, PolkadotClient, TypedApi } from "polkadot-api";
import { type Kreivo, kreivo } from "@polkadot-api/descriptors";
import { Vector, u8 } from "@polkadot-api/substrate-bindings";
import { before, it } from "node:test";
import {
  createEd25519Signer,
  createTestSr25519Signer,
} from "../utils/fixtures/signers.ts";

import type { Blockchain } from "@acala-network/chopsticks-core";
import { SubstrateKey } from "../../authenticators/substrate/src/index.ts";
import assert from "node:assert";
import { blockHashChallenger } from "@virtonetwork/signer";
import { registeredTypes } from "../utils/fixtures/kreivo.ts";
import { ss58Address } from "@polkadot-labs/hdkd-helpers";
import { topupAccount } from "../utils/fixtures/topup-account.ts";
import { withChopsticks } from "../utils/chopsticks.ts";

withChopsticks(
  "SubstrateKey",
  {
    chopsticksOptions: { endpoint: "wss://testnet.kreivo.io", registeredTypes },
  },
  async (s) => {
    let chain: Blockchain;
    let client: PolkadotClient;
    let api: TypedApi<Kreivo>;
    const ALICE = createTestSr25519Signer();

    before(async () => {
      ({ chain, client } = s);
      api = client.getTypedApi(kreivo);

      const balance = 1_000_0000000000n;
      await topupAccount(s.chain, ALICE.publicKey, balance);
      const account = await api.query.System.Account.getValue(
        ss58Address(ALICE.publicKey),
      );
      assert.deepEqual(account.data.free, balance);
    });

    it("should be able to register an account, signing with a Substrate Key as device", async () => {
      const signer = createEd25519Signer();
      const sk = await new SubstrateKey(
        "user@example.org",
        signer,
        blockHashChallenger(client),
      ).setup();

      const keyRegistration = await sk.register(chain.head.number);

      const tx = api.tx.Pass.register({
        user: Binary.fromBytes(sk.hashedUserId),
        attestation: {
          type: "SubstrateKey",
          value: {
            message: {
              authority_id: keyRegistration.message.authority_id,
              context: keyRegistration.message.context,
              challenge: keyRegistration.message.challenge,
            },
            public: ss58Address(keyRegistration.public.asHex()),
            signature: keyRegistration.signature,
          },
        },
      });

      console.log("BARE TX:", await tx.getBareTx());

      const opaque = await tx.sign(ALICE, { mortality: { mortal: false } });
      const extrinsicBytes = Vector(u8).dec(opaque);

      const balance = 1_000_0000000000n;
      const account = await api.query.System.Account.getValue(
        ss58Address(ALICE.publicKey),
      );
      assert.deepEqual(account.data.free, balance);

      const txValidity =
        await api.apis.TaggedTransactionQueue.validate_transaction(
          { type: "External", value: undefined },
          Binary.fromBytes(new Uint8Array(extrinsicBytes)),
          Binary.fromHex(chain.head.hash),
        );

      assert(txValidity.success);
    });
  },
);
