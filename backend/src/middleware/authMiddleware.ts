
import type { Request, Response, NextFunction } from "express";
import { createHmac } from "node:crypto";
import { prisma } from "../db.js";

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error("Nav konfigurēts SESSION_SECRET.");
}

const sessionSecretKey: string = sessionSecret;
const sessionCookieName = "dil_session";

function hashSessionToken(token: string): string {
  return createHmac("sha256", sessionSecretKey)
    .update(token)
    .digest("hex");
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.[sessionCookieName];

    if (typeof token !== "string") {
      res.status(401).json({ message: "Jāielogojas." });
      return;
    }

    const session = await prisma.session.findUnique({
      where: {
        tokenHash: hashSessionToken(token),
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await prisma.session.delete({
          where: { id: session.id },
        });
      }

      res.clearCookie(sessionCookieName, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      res.status(401).json({ message: "Sesija nav derīga." });
      return;
    }

    req.userId = session.userId;
    next();
  } catch (error) {
    console.error("Autentifikācijas pārbaudes kļūda:", error);
    res.status(500).json({
      message: "Neizdevās pārbaudīt lietotāja sesiju.",
    });
  }
}
