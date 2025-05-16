import { TPassAuthenticate } from "./types.ts";

export interface Authenticator {
  readonly hashedUserId: Uint8Array;

  authenticate(challenge: Uint8Array): Promise<TPassAuthenticate>;
}
