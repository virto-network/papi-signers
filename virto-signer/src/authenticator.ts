import { TPassAuthenticate } from "./types.ts";

export interface Authenticator {
  readonly deviceId: Uint8Array;
  readonly hashedUserId: Uint8Array;

  authenticate(challenge: Uint8Array): Promise<TPassAuthenticate>;
}
