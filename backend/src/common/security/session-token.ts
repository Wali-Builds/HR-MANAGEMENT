import {
  createHash,
  randomBytes
} from "node:crypto";

import { env } from "../../config/env.js";

export interface RefreshTokenResult {
  plainToken: string;
  tokenHash: string;
  expiresAt: Date;
}

export function hashRefreshToken(
  plainToken: string
): string {
  return createHash("sha256")
    .update(plainToken, "utf8")
    .digest("hex");
}

export function generateRefreshToken():
RefreshTokenResult {
  const plainToken = randomBytes(48)
    .toString("base64url");

  const tokenHash =
    hashRefreshToken(plainToken);

  const expiresAt = new Date();

  expiresAt.setUTCDate(
    expiresAt.getUTCDate() +
      env.REFRESH_TOKEN_EXPIRES_DAYS
  );

  return {
    plainToken,
    tokenHash,
    expiresAt
  };
}