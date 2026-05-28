import crypto from "crypto";
import prisma from "./prisma.js";

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildSessionTokens(): AuthTokens {
  const accessToken = crypto.randomBytes(32).toString("hex");
  const refreshToken = crypto.randomBytes(48).toString("hex");

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
    refreshTokenExpiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  };
}

export async function persistTokens(userId: string, tokens: AuthTokens) {
  const updated = await prisma.account.updateMany({
    where: {
      userId,
      providerId: "credential",
    },
    data: {
      accessToken: tokens.accessToken,
      refreshToken: hashToken(tokens.refreshToken),
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
    },
  });

  if (updated.count === 0) {
    throw new Error("Unable to persist session tokens");
  }
}

export async function revokeCustomSession(userId: string) {
  await prisma.account.updateMany({
    where: {
      userId,
      providerId: "credential",
    },
    data: {
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
    },
  });
}

export function getCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeMs,
  };
}
