import {
  Blake2256,
  decAnyMetadata,
  unifyMetadata,
} from "@polkadot-api/substrate-bindings";
import { Bytes, Option, Struct, u128, u8 } from "scale-ts";
import { Challenger, KreivoBlockChallenger } from "./challenger.ts";

import type { Authenticator } from "./authenticator.ts";
import { PolkadotSigner } from "polkadot-api/signer";
import { mergeUint8 } from "@polkadot-api/utils";

export const UncheckedExtrinsic = Struct({
  version: u8,
  prelude: Struct({
    extensionVersion: u8,
    extensions: Bytes(),
  }),
  call: Bytes(),
});

export const PassAuthenticate = Option(
  Struct({
    deviceId: Bytes(),
    credentials: Bytes(),
  })
);

type TransactionExtensionMetadata = {
  identifier: string;
  value: Uint8Array;
  additionalSigned: Uint8Array;
};

export const EXTRINSIC_V5 = 0b0000_0101;
export const EXTRINSIC_FORMAT_GENERAL = 0b0100_0000;
export const KREIVO_EXTENSION_VERSION = u8.enc(0);

export class KreivoPassSigner implements PolkadotSigner {
  publicKey: Uint8Array<ArrayBufferLike>;

  constructor(
    private authenticator: Authenticator,
    private getBlockHash: (n: bigint) => Promise<Uint8Array>,
    private challenger: Challenger = new KreivoBlockChallenger()
  ) {
    // Calcualte the pass account's "public key" (map to address is 1:1, so it's safe
    // to say this is a public key) based on
    this.publicKey = Blake2256(
      mergeUint8(authenticator.hashedUserId, authenticator.hashedUserId)
    );
  }

  async signTx(
    call: Uint8Array,
    signedExtensions: Record<string, TransactionExtensionMetadata>,
    encodedMetadata: Uint8Array,
    atBlockNumber: number,
    hasher = Blake2256
  ): Promise<Uint8Array> {
    const metadata = unifyMetadata(decAnyMetadata(encodedMetadata));

    const txExtensions = metadata.extrinsic.signedExtensions.map(
      ({ identifier }) => {
        const signedExtension = signedExtensions[identifier];

        if (!signedExtension)
          throw new Error(`Missing ${identifier} signed extension`);

        return signedExtension;
      }
    );

    const blockHash = await this.getBlockHash(BigInt(atBlockNumber));
    const extensions = await this.extensionsWithAuthentication(
      call,
      txExtensions,
      blockHash,
      hasher
    ).then((xts) => xts.map((x) => x.value));

    return UncheckedExtrinsic.enc({
      version: EXTRINSIC_V5 | EXTRINSIC_FORMAT_GENERAL,
      prelude: {
        extensionVersion: 0,
        extensions: mergeUint8(...extensions),
      },
      call,
    });
  }

  private async extensionsWithAuthentication(
    call: Uint8Array,
    txExtensions: TransactionExtensionMetadata[],
    blockHash: Uint8Array,
    hasher = Blake2256
  ): Promise<TransactionExtensionMetadata[]> {
    const ix = txExtensions.findIndex(
      (ext) => ext.identifier === "PassAuthenticate"
    );
    if (ix === -1) {
      throw new Error("PassAuthenticate extension not found in txExtensions");
    }

    // Handle Items strictly after “PassAuthenticate”
    const following = txExtensions.slice(ix + 1);

    // `extensions` → the raw values that go on-chain
    const extensions = mergeUint8(...following.map((e) => e.value));
    // `implicit` → the additional-signed pieces
    const implicit = mergeUint8(...following.map((e) => e.additionalSigned));

    // From https://github.com/virto-network/frame-contrib/pull/47
    const extrinsicContext = hasher(
      mergeUint8(KREIVO_EXTENSION_VERSION, call, extensions, implicit)
    );

    const challenge = this.challenger.generate(blockHash, extrinsicContext);
    txExtensions[ix].value = PassAuthenticate.enc({
      deviceId: this.authenticator.deviceId,
      credentials: await this.authenticator.assertion(challenge),
    });

    return txExtensions;
  }

  async signBytes(_: Uint8Array): Promise<Uint8Array> {
    throw new Error("signBytes not implemented");
  }
}
