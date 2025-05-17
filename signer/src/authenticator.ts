import { TPassAuthenticate } from "./types.ts";

export interface Authenticator<Ctx> {
  readonly hashedUserId: Uint8Array;

  authenticate(challenge: Uint8Array, context: Ctx): Promise<TPassAuthenticate>;
}
