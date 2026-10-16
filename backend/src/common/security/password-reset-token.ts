import {
  createHash,
  randomBytes
} from "node:crypto";

import { env } from "../../config/env.js";

export interface PasswordResetTokenResult {
  plainToken: string;
  tokenHash: string;
  expiresAt: Date;
}

export function hashPasswordResetToken(
  plainToken: string
): string {
  return createHash("sha256")
    .update(plainToken, "utf8")
    .digest("hex");
}

export function generatePasswordResetToken():
PasswordResetTokenResult {
  const plainToken = randomBytes(32)
    .toString("base64url");

  const tokenHash =
    hashPasswordResetToken(plainToken);

  const expiresAt = new Date(
    Date.now() +
      env.PASSWORD_RESET_EXPIRES_MINUTES *
        60 *
        1000
  );

  return {
    plainToken,
    tokenHash,
    expiresAt
  };
}