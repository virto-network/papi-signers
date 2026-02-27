import assert from "node:assert";
import { before, it } from "node:test";
import type { Blockchain } from "@acala-network/chopsticks-core";
import { type Kreivo, kreivo } from "@polkadot-api/descriptors";
import { u8, Vector } from "@polkadot-api/substrate-bindings";
import { ss58Encode } from "@polkadot-labs/hdkd-helpers";
// #docregion substrate/setup
import { SubstrateKey } from "@virtonetwork/authenticators-substrate";
import { blockHashChallenger, KreivoPassSigner } from "@virtonetwork/signer";
// #uncomment
// import { createClient } from "polkadot-api";
// import { getWsProvider } from "polkadot-api/ws-provider";
// #enduncomment
// #enddocregion substrate/setup
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
    },
  },
  (suite) => {
    let chain: Blockchain;
    let client: PolkadotClient;
    let api: TypedApi<Kreivo>;
    let sk: SubstrateKey;
    const ALICE = createTestSr25519Signer("//Alice");

    // #docregion substrate/setup

    const SIGNER = createEd25519Signer();
    const USERNAME = "user@example.org";

    // #enddocregion substrate/setup

    before(async () => {
      ({ chain, client } = suite);
      api = client.getTypedApi(kreivo);

      const balance = 1_000_0000000000n;
      await topupAccount(suite.chain, ALICE.publicKey, balance);
      const account = await api.query.System.Account.getValue(
        ss58Encode(ALICE.publicKey)
      );
      assert.deepEqual(account.data.free, balance);

      // #docregion substrate/setup
      // #uncomment
      // const client = createClient(
      //   getWsProvider("wss://kreivo.io")
      // );
      // const sk = await new SubstrateKey(
      // #enduncomment
      // #remove
      sk = await new SubstrateKey(
        // #endremove
        USERNAME,
        SIGNER,
        blockHashChallenger(client)
      ).setup();
      // #enddocregion substrate/setup
    });

    it("should be able to register an account, signing with a Substrate Key as device", async () => {
      const keyRegistration = await sk.register(chain.head.number - 6);

      // #docregion substrate/register-client
      // #uncomment
      // const finalized = await client.getFinalizedBlock();
      // const keyRegistration = await sk.register(finalized.number);

      // // We send the keyRegistration to the server
      // fetch("/api/register", {
      //   method: "POST",
      //   body: JSON.stringify(keyRegistration)
      // })
      // #enduncomment
      // #enddocregion substrate/register-client

      // #docregion substrate/register-server
      // #uncomment
      // import { kreivo } from "@polkadot-api/descriptors"
      // const api = client.getTypedApi(kreivo)
      // #enduncomment

      const tx = api.tx.Pass.register({
        user: Binary.fromBytes(sk.hashedUserId),
        attestation: {
          type: "SubstrateKey",
          value: {
            message: {
              context: keyRegistration.message.context,
              challenge: keyRegistration.message.challenge,
              authority_id: keyRegistration.message.authority_id,
            },
            public: ss58Encode(keyRegistration.public.asHex()),
            signature: keyRegistration.signature,
          },
        },
      });

      // const txHash = await tx.signAndSubmit(SERVICE); // #uncomment
      // #enddocregion substrate/register-server

      await new Promise<void>((resolve, error) => {
        tx.signSubmitAndWatch(ALICE).subscribe({
          next: (event) => {
            if (event.type === "finalized") {
              const newAccount = ss58Encode(
                sk.addressGenerator(sk.hashedUserId),
                2
              );
              const [created] = api.event.System.NewAccount.filter(
                event.events
              );
              try {
                assert(created);
                assert.equal(created.account, newAccount);
                return resolve();
              } catch (e) {
                return error(e);
              }
            }
          },
          error,
        });
      });
    });

    it("should be able to sign transactions with the registered signer", async () => {
      // #docregion substrate/authenticate
      const kreivoPassSigner = new KreivoPassSigner(sk);
      const accountId = ss58Encode(kreivoPassSigner.publicKey, 2);
      // #enddocregion substrate/authenticate

      // 1. Transfer some tokens to the signer
      console.log(`Submitting transfer to ${accountId}...`);
      {
        const tx = api.tx.Balances.transfer_keep_alive({
          dest: { type: "Id", value: accountId },
          value: 1_0000000000n,
        });

        await new Promise<void>((resolve, error) =>
          tx.signSubmitAndWatch(ALICE).subscribe({
            next: (event) => {
              if (event.type === "finalized") {
                return resolve();
              }
            },
            error,
          })
        );
      }

      // 2. Sign a remark with the signer
      console.log(`Submitting remark from ${accountId}...`);
      {
        // #docregion substrate/authenticate
        const remark = Binary.fromText("Hello, Kreivo!");
        const tx = api.tx.System.remark_with_event({ remark });

        // const txHash = await tx.signAndSubmit(kreivoPassSigner); // #uncomment
        // #enddocregion substrate/authenticate

        const signedTx = await tx.sign(kreivoPassSigner, {
          mortality: { mortal: false },
        });

        const txBytes = Vector(u8).dec(signedTx);
        const txResult = await api.apis.BlockBuilder.apply_extrinsic(
          Binary.fromBytes(new Uint8Array(txBytes))
        );

        assert(txResult.success);
        assert(txResult.value.success);
      }
    });
  }
);
