
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

// Vienota sesijas sīkdatnes dzēšana.
function clearSessionCookie(res: Response): void {
  res.clearCookie(sessionCookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

// Pārbauda sesiju un atgriež lietotāja ID.
// Ja sesija nav derīga, atgriež null.
async function getValidSessionUserId(
  token: string,
  res: Response,
): Promise<string | null> {
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

    clearSessionCookie(res);
    return null;
  }

  return session.userId;
}

// Obligāta autentifikācija.
// Izmanto maršrutiem, kuriem piekļūst tikai ielogojies lietotājs.
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[sessionCookieName];

    if (typeof token !== "string") {
      res.status(401).json({
        message: "Jāielogojas.",
      });
      return;
    }

    const userId = await getValidSessionUserId(token, res);

    if (!userId) {
      res.status(401).json({
        message: "Sesija nav derīga.",
      });
      return;
    }

    req.userId = userId;
    next();
  } catch (error) {
    console.error("Autentifikācijas pārbaudes kļūda:", error);

    res.status(500).json({
      message: "Neizdevās pārbaudīt lietotāja sesiju.",
    });
  }
}

// Neobligāta autentifikācija.
// Ja lietotājs ir ielogojies, pievieno viņa ID pieprasījumam.
// Ja nav ielogojies, pieprasījums tik un tā var turpināties.
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[sessionCookieName];

    if (typeof token !== "string") {
      next();
      return;
    }

    const userId = await getValidSessionUserId(token, res);

    if (userId) {
      req.userId = userId;
    }

    next();
  } catch (error) {
    console.error(
      "Neobligātās autentifikācijas pārbaudes kļūda:",
      error,
    );

    res.status(500).json({
      message: "Neizdevās pārbaudīt lietotāja sesiju.",
    });
  }
}
