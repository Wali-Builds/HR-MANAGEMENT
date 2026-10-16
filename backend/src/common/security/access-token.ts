import { randomUUID } from "node:crypto";

import jwt, {
  type JwtPayload
} from "jsonwebtoken";

import { env } from "../../config/env.js";

export interface AccessTokenUser {
  userId: string;
  sessionId: string;
  companyId: string | null;
  employeeId: string | null;
  isPlatformAdmin: boolean;
  roleCodes: string[];
}

export interface VerifiedAccessToken
  extends JwtPayload {
  sub: string;
  sid: string;
  companyId: string | null;
  employeeId: string | null;
  isPlatformAdmin: boolean;
  roleCodes: string[];
}

export function createAccessToken(
  user: AccessTokenUser
): string {
  const payload = {
    sid: user.sessionId,
    companyId: user.companyId,
    employeeId: user.employeeId,
    isPlatformAdmin:
      user.isPlatformAdmin,
    roleCodes: user.roleCodes
  };

  return jwt.sign(
    payload,
    env.JWT_ACCESS_SECRET,
    {
      algorithm: "HS256",
      subject: user.userId,
      jwtid: randomUUID(),
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      expiresIn:
        env.JWT_ACCESS_EXPIRES_SECONDS
    }
  );
}

export function verifyAccessToken(
  token: string
): VerifiedAccessToken {
  const decodedToken = jwt.verify(
    token,
    env.JWT_ACCESS_SECRET,
    {
      algorithms: ["HS256"],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE
    }
  );

  if (
    typeof decodedToken === "string" ||
    typeof decodedToken.sub !== "string" ||
    typeof decodedToken.sid !== "string"
  ) {
    throw new Error(
      "Invalid access-token payload"
    );
  }

  return decodedToken as VerifiedAccessToken;
}