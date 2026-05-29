import type { Request, Response } from 'express';
import { auth } from './auth.js';
import prisma from './prisma.js';

export type AuthUser = {
  id: string;
  role: "OWNER" | "DRIVER" | "ADMIN";
};

export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }

  const session = await auth.api.getSession({
    headers,
  });

  if (session?.user) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, isActive: true },
    });
    if (user && user.isActive) {
      return user as AuthUser;
    }
  }

  // Fallback to custom session cookies
  const accessToken = req.cookies?.accessToken || req.cookies?.session;
  if (accessToken) {
    const account = await prisma.account.findFirst({
      where: {
        accessToken,
        accessTokenExpiresAt: { gt: new Date() },
      },
      select: {
        userId: true,
      },
    });

    if (account) {
      const user = await prisma.user.findUnique({
        where: { id: account.userId },
        select: { id: true, role: true, isActive: true },
      });
      if (user && user.isActive) {
        return user as AuthUser;
      }
    }
  }

  return null;
}

export async function requireUser(req: Request, res: Response, roles?: AuthUser["role"][]) {
  const user = await getAuthUser(req);

  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  if (roles && !roles.includes(user.role)) {
    res.status(403).json({ error: "You do not have permission to access this resource" });
    return null;
  }

  return user;
}
