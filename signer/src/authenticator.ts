import { TPassAuthenticate } from "./types.ts";

export interface Authenticator<Ctx> {
  readonly hashedUserId: Uint8Array;

  getChallenge(ctx: Ctx, xtc: Uint8Array): Promise<Uint8Array>;
  authenticate(context: Ctx, xtc: Uint8Array): Promise<TPassAuthenticate>;
}
