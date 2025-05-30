import { Challenger } from "./challenger.ts";
import { TPassAuthenticate } from "./types.ts";

export interface Authenticator<Ctx> {
  readonly hashedUserId: Uint8Array;
  readonly getChallenge: Challenger<Ctx>;

  authenticate(context: Ctx, xtc: Uint8Array): Promise<TPassAuthenticate>;
}
