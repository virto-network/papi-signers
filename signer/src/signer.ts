import {
  Blake2256,
  SS58String,
  compact,
  decAnyMetadata,
  unifyMetadata,
} from "@polkadot-api/substrate-bindings";
import {
  EXTRINSIC_FORMAT_GENERAL,
  EXTRINSIC_V5,
  KREIVO_EXTENSION_VERSION,
  PassAuthenticate,
  TransactionExtensionMetadata,
  UncheckedExtrinsic,
} from "./types.ts";
import { SignFn, createSessionKeySigner } from "./sr25519.ts";

import type { Authenticator } from "./authenticator.ts";
import { PolkadotSigner } from "polkadot-api/signer";
import { mergeUint8 } from "@polkadot-api/utils";

export class KreivoPassSigner implements PolkadotSigner {
  publicKey: Uint8Array<ArrayBufferLike>;

  constructor(private authenticator: Authenticator<number>) {
    // Calcualte the pass account's "public key" (map to address is 1:1, so it's safe
    // to say this is a public key) based on
    this.publicKey = authenticator.addressGenerator(authenticator.hashedUserId);
  }

  /**
   * Creates a sr25519 signer, and injects the {@link publicKey} to
   * make the transaction maker use the Pass Account nonce.
   *
   * @returns A tuple with the signer and the address of the session key
   * to be added.
   */
  makeSessionKeySigner(): [
    PolkadotSigner & {
      sign: SignFn;
    },
    SS58String,
  ] {
    const { signer, address } = createSessionKeySigner();
    signer.publicKey = this.publicKey;
    return [signer, address];
  }

  async signTx(
    call: Uint8Array,
    signedExtensions: Record<string, TransactionExtensionMetadata>,
    encodedMetadata: Uint8Array,
    atBlockNumber: number,
    hasher = Blake2256,
  ): Promise<Uint8Array> {
    const metadata = unifyMetadata(decAnyMetadata(encodedMetadata));

    const txExtensions = Object.values(metadata.extrinsic.signedExtensions)
      .flatMap((x) => x)
      .map(({ identifier }) => {
        const signedExtension = signedExtensions[identifier];

        if (!signedExtension)
          throw new Error(`Missing ${identifier} signed extension`);

        return signedExtension;
      });

    const extensions = await this.extensionsWithAuthentication(
      call,
      txExtensions,
      atBlockNumber - 1,
      hasher,
    ).then((xts) => xts.map((x) => x.value));

    const xt = UncheckedExtrinsic.enc({
      version: EXTRINSIC_V5 | EXTRINSIC_FORMAT_GENERAL,
      prelude: {
        extensionVersion: 0,
        extensions: mergeUint8(extensions),
      },
      call,
    });
    return mergeUint8([compact.enc(xt.length), xt]);
  }

  private async extensionsWithAuthentication(
    call: Uint8Array,
    txExtensions: TransactionExtensionMetadata[],
    blockNumber: number,
    hasher = Blake2256,
  ): Promise<TransactionExtensionMetadata[]> {
    const ix = txExtensions.findIndex(
      (ext) => ext.identifier === "PassAuthenticate",
    );
    if (ix === -1) {
      throw new Error("PassAuthenticate extension not found in txExtensions");
    }

    // Handle Items strictly after “PassAuthenticate”
    const following = txExtensions.slice(ix + 1);

    // `extensions` → the raw values that go on-chain
    const extensions = mergeUint8(following.map((e) => e.value));
    // `implicit` → the additional-signed pieces
    const implicit = mergeUint8(following.map((e) => e.additionalSigned));

    // From https://github.com/virto-network/frame-contrib/pull/47
    const extrinsicContext = hasher(
      mergeUint8([KREIVO_EXTENSION_VERSION, call, extensions, implicit]),
    );

    txExtensions[ix].value = PassAuthenticate.enc(
      await this.authenticator.authenticate(blockNumber, extrinsicContext),
    );

    return txExtensions;
  }

  async signBytes(_: Uint8Array): Promise<Uint8Array> {
    throw new Error("signBytes not implemented");
  }
}
