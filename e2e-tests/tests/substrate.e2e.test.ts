import assert from "node:assert";
import { before, it } from "node:test";
import type { Blockchain } from "@acala-network/chopsticks-core";
import { type Kreivo, kreivo } from "@polkadot-api/descriptors";
import { u8, Vector } from "@polkadot-api/substrate-bindings";
import { ss58Encode } from "@polkadot-labs/hdkd-helpers";
import { SubstrateKey } from "@virtonetwork/authenticators-substrate";
import { blockHashChallenger } from "@virtonetwork/signer";
import type { PolkadotClient, TypedApi } from "polkadot-api";
import { Binary } from "polkadot-api";
import { withChopsticks } from "../utils/chopsticks.ts";
import { registeredTypes } from "../utils/fixtures/kreivo.ts";
import {
  createEd25519Signer,
  createTestSr25519Signer,
} from "../utils/fixtures/signers.ts";
import { topupAccount } from "../utils/fixtures/topup-account.ts";

withChopsticks(
  "SubstrateKey",
  {
    chopsticksOptions: {
      endpoint: "wss://testnet.kreivo.kippu.rocks",
      registeredTypes,
      runtimeLogLevel: 5,
    },
  },
  async (s) => {
    let chain: Blockchain;
    let client: PolkadotClient;
    let api: TypedApi<Kreivo>;
    const ALICE = createTestSr25519Signer("//Alice");

    before(async () => {
      ({ chain, client } = s);
      api = client.getTypedApi(kreivo);

      const balance = 1_000_0000000000n;
      await topupAccount(s.chain, ALICE.publicKey, balance);
      const account = await api.query.System.Account.getValue(
        ss58Encode(ALICE.publicKey)
      );
      assert.deepEqual(account.data.free, balance);
    });

    it("should be able to register an account, signing with a Substrate Key as device", async () => {
      const signer = createEd25519Signer();
      const sk = await new SubstrateKey(
        "user@example.org",
        signer,
        blockHashChallenger(client)
      ).setup();

      const keyRegistration = await sk.register(chain.head.number - 6);

      const tx = api.tx.Pass.register({
        user: Binary.fromBytes(sk.hashedUserId),
        attestation: {
          type: "SubstrateKey",
          value: {
            message: {
              context: keyRegistration.message.context,
              authority_id: keyRegistration.message.authority_id,
              challenge: keyRegistration.message.challenge,
            },
            public: ss58Encode(keyRegistration.public.asHex()),
            signature: keyRegistration.signature,
          },
        },
      });

      const opaque = await tx.sign(ALICE, { mortality: { mortal: false } });
      const extrinsicBytes = Vector(u8).dec(opaque);

      const txRes = await api.apis.BlockBuilder.apply_extrinsic(
        Binary.fromBytes(new Uint8Array(extrinsicBytes))
      );
      assert(txRes.success);
      assert(txRes.value.success);
    });
  }
);
