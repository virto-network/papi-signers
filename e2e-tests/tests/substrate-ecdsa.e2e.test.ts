import assert from "node:assert";
import { before, it } from "node:test";
import type { Blockchain } from "@acala-network/chopsticks-core";
import { type Kreivo, kreivo } from "@polkadot-api/descriptors";
import { u8, Vector } from "@polkadot-api/substrate-bindings";
import { ss58Encode } from "@polkadot-labs/hdkd-helpers";
import { SubstrateKey } from "@virtonetwork/authenticators-substrate";
import { blockHashChallenger, KreivoPassSigner } from "@virtonetwork/signer";
import type { PolkadotClient, TypedApi } from "polkadot-api";
import { Binary } from "polkadot-api";
import { withChopsticks } from "../utils/chopsticks.ts";
import { registeredTypes } from "../utils/fixtures/kreivo.ts";
import {
  createEcdsaSigner,
  createTestSr25519Signer,
} from "../utils/fixtures/signers.ts";
import { topupAccount } from "../utils/fixtures/topup-account.ts";

withChopsticks(
  "SubstrateKey (Ecdsa)",
  {
    chopsticksOptions: {
      endpoint:
        process.env.KREIVO_ENDPOINT ?? "wss://testnet.kreivo.kippu.rocks",
      registeredTypes,
    },
  },
  (suite) => {
    let chain: Blockchain;
    let client: PolkadotClient;
    let api: TypedApi<Kreivo>;
    let sk: SubstrateKey;
    const ALICE = createTestSr25519Signer("//Alice");
    const SIGNER = createEcdsaSigner();

    before(async () => {
      ({ chain, client } = suite);
      api = client.getTypedApi(kreivo);
      await topupAccount(suite.chain, ALICE.publicKey, 1_000_0000000000n);
      sk = await new SubstrateKey(
        "ecdsa@example.org",
        SIGNER,
        blockHashChallenger(client)
      ).setup();
    });

    it("registers an account with an Ecdsa key as device", async () => {
      const keyRegistration = await sk.register(chain.head.number - 6);
      const tx = api.tx.Pass.register({
        user: Binary.fromBytes(sk.hashedUserId),
        attestation: {
          type: "SubstrateKey",
          value: {
            message: keyRegistration.message,
            public: ss58Encode(keyRegistration.public.asHex()),
            signature: keyRegistration.signature,
          },
        },
      });

      await new Promise<void>((resolve, reject) => {
        tx.signSubmitAndWatch(ALICE).subscribe({
          next: (event) => {
            if (event.type !== "finalized") return;
            try {
              assert(event.ok, JSON.stringify(event.dispatchError));
              const [created] = api.event.System.NewAccount.filter(
                event.events
              );
              assert.equal(
                created?.account,
                ss58Encode(sk.addressGenerator(sk.hashedUserId), 2)
              );
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          error: reject,
        });
      });
    });

    it("signs transactions with the registered Ecdsa device", async () => {
      const kreivoPassSigner = new KreivoPassSigner(sk);
      const accountId = ss58Encode(kreivoPassSigner.publicKey, 2);

      await new Promise<void>((resolve, reject) =>
        api.tx.Balances.transfer_keep_alive({
          dest: { type: "Id", value: accountId },
          value: 1_0000000000n,
        })
          .signSubmitAndWatch(ALICE)
          .subscribe({
            next: (event) => event.type === "finalized" && resolve(),
            error: reject,
          })
      );

      const signedTx = await api.tx.System.remark_with_event({
        remark: Binary.fromText("Hello, Kreivo!"),
      }).sign(kreivoPassSigner, { mortality: { mortal: false } });

      const txResult = await api.apis.BlockBuilder.apply_extrinsic(
        Binary.fromBytes(new Uint8Array(Vector(u8).dec(signedTx)))
      );
      assert(txResult.success, JSON.stringify(txResult.value));
      assert(txResult.value.success);
    });
  }
);
