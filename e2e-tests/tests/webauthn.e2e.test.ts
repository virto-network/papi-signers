import assert from "node:assert";
import { before, it } from "node:test";
import { type Kreivo, kreivo } from "@polkadot-api/descriptors";
import { u8, Vector } from "@polkadot-api/substrate-bindings";
import { ss58Encode } from "@polkadot-labs/hdkd-helpers";
// #docregion webauthn/setup
import { WebAuthn } from "@virtonetwork/authenticators-webauthn";
import { blockHashChallenger, KreivoPassSigner } from "@virtonetwork/signer";
// #enddocregion webauthn/setup
import { WebAuthnEmulator } from "nid-webauthn-emulator";
import type { PolkadotClient, TypedApi } from "polkadot-api";
import { Binary } from "polkadot-api";
import { withChopsticks } from "../utils/chopsticks.ts";
import { registeredTypes } from "../utils/fixtures/kreivo.ts";
import { createTestSr25519Signer } from "../utils/fixtures/signers.ts";
import { topupAccount } from "../utils/fixtures/topup-account.ts";

// Mock WebAuthn environment
const ORIGIN = "https://example.com";
const emulator = new WebAuthnEmulator();

Object.defineProperty(globalThis, "navigator", {
  value: {
    credentials: {
      create: async (options: CredentialCreationOptions) =>
        emulator.create(ORIGIN, options),
      get: async (options: CredentialRequestOptions) =>
        emulator.get(ORIGIN, options),
    },
  },
  writable: true,
});

withChopsticks.skip(
  "WebAuthn",
  {
    chopsticksOptions: {
      endpoint: "wss://testnet.kreivo.kippu.rocks",
      registeredTypes,
    },
  },
  async (suite) => {
    const client: PolkadotClient = suite.client;
    const api: TypedApi<Kreivo> = client.getTypedApi(kreivo);
    const ALICE = createTestSr25519Signer("//Alice");

    // #docregion webauthn/setup
    // #uncomment
    // const client = createClient(
    //   getWsProvider("wss://testnet.kreivo.kippu.rocks")
    // );
    // #enduncomment

    const USERNAME = "user@example.org";
    const wa = await new WebAuthn(
      USERNAME,
      blockHashChallenger(client)
    ).setup();
    // #enddocregion webauthn/setup

    before(async () => {
      const balance = 1_000_0000000000n;
      await topupAccount(suite.chain, ALICE.publicKey, balance);
    });

    it("should be able to register and authenticate", async () => {
      // #docregion webauthn/register
      const finalizedBlock = await client.getFinalizedBlock();
      const attestation = await wa.register(finalizedBlock.number);

      const tx = api.tx.Pass.register({
        user: Binary.fromBytes(wa.hashedUserId),
        attestation: {
          type: "WebAuthn",
          value: {
            meta: attestation.meta,
            authenticator_data: attestation.authenticator_data,
            client_data: attestation.client_data,
            public_key: attestation.public_key,
          },
        },
      });

      await new Promise<void>((resolve, error) => {
        tx.signSubmitAndWatch(ALICE).subscribe({
          next: (event) => {
            if (event.type === "finalized") {
              resolve();
            }
          },
          error,
        });
      });
      // #enddocregion webauthn/register

      // #docregion webauthn/authenticate
      const kreivoPassSigner = new KreivoPassSigner(wa);
      const accountId = ss58Encode(kreivoPassSigner.publicKey, 2);

      // Transfer tokens
      {
        const tx = api.tx.Balances.transfer_keep_alive({
          dest: { type: "Id", value: accountId },
          value: 1_0000000000n,
        });

        await new Promise<void>((resolve, error) =>
          tx.signSubmitAndWatch(ALICE).subscribe({
            next: (event) => {
              if (event.type === "finalized") {
                resolve();
              }
            },
            error,
          })
        );
      }

      // Sign remark
      {
        const remark = Binary.fromText("Hello, Kreivo!");
        const tx = api.tx.System.remark_with_event({ remark });

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
      // #enddocregion webauthn/authenticate
    });
  }
);
