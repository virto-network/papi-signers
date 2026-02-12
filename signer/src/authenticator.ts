import type { AddressGenerator } from "./address-generator.ts";
import type { Challenger } from "./challenger.ts";
import type { TPassAuthenticate } from "./types.ts";

export interface Authenticator<Ctx> {
  readonly hashedUserId: Uint8Array;
  readonly getChallenge: Challenger<Ctx>;
  readonly addressGenerator: AddressGenerator;

  authenticate(context: Ctx, xtc: Uint8Array): Promise<TPassAuthenticate>;
}
