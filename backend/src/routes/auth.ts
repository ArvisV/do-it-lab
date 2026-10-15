
import "dotenv/config";
import { Router } from "express";
import argon2 from "argon2";
import { createHmac, randomBytes, randomInt } from "node:crypto";
import { prisma } from "../db.js";
import { sendVerificationEmail } from "../services/email.js";

const router = Router();

// E-pasta apstiprināšanas noslēpums
const verificationSecret = process.env.EMAIL_VERIFICATION_SECRET;

if (!verificationSecret) {
  throw new Error("Nav konfigurēts EMAIL_VERIFICATION_SECRET.");
}

const verificationSecretKey: string = verificationSecret;

// Sesiju noslēpums
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error("Nav konfigurēts SESSION_SECRET.");
}

const sessionSecretKey: string = sessionSecret;

// Apstiprināšanas koda jaucējvērtība
function hashVerificationCode(code: string): string {
  return createHmac("sha256", verificationSecretKey)
    .update(code)
    .digest("hex");
}

// Sesijas tokena jaucējvērtība
function hashSessionToken(token: string): string {
  return createHmac("sha256", sessionSecretKey)
    .update(token)
    .digest("hex");
}

// Kopīga e-pasta adreses normalizēšana un pārbaude
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

// Sesijas iestatījumi
const sessionCookieName = "dil_session";
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

// =====================================================
// REĢISTRĀCIJA
// POST /api/auth/register
// =====================================================

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      res.status(400).json({
        message: "Norādi e-pastu un paroli.",
      });
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      res.status(400).json({
        message: "E-pasta adrese nav derīga.",
      });
      return;
    }

    if (
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 128
    ) {
      res.status(400).json({
        message:
          "Parolei jābūt vismaz 8 rakstzīmes garai un ne vairāk kā 128 baitu lielai.",
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(409).json({
        message: "Lietotājs ar šo e-pasta adresi jau eksistē.",
      });
      return;
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    const code = randomInt(100000, 1000000).toString();
    const tokenHash = hashVerificationCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        emailVerifications: {
          create: {
            tokenHash,
            expiresAt,
          },
        },
      },
    });

    try {
      await sendVerificationEmail(normalizedEmail, code);
    } catch (emailError) {
      // Ja e-pastu neizdodas nosūtīt, dzēšam nepabeigto kontu.
      await prisma.user.delete({
        where: { id: user.id },
      });

      throw emailError;
    }

    res.status(201).json({
      message:
        "Reģistrācija sākta. Pārbaudi e-pastu un ievadi saņemto kodu.",
    });
  } catch (error) {
    console.error("Reģistrācijas kļūda:", error);

    res.status(500).json({
      message: "Reģistrāciju pašlaik neizdevās pabeigt.",
    });
  }
});

// =====================================================
// E-PASTA APSTIPRINĀŠANA
// POST /api/auth/verify-email
// =====================================================

router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (
      typeof email !== "string" ||
      typeof code !== "string" ||
      !email.trim() ||
      !/^\d{6}$/.test(code)
    ) {
      res.status(400).json({
        message:
          "Norādi derīgu e-pasta adresi un sešu ciparu apstiprināšanas kodu.",
      });
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      res.status(400).json({
        message: "E-pasta adrese nav derīga.",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      res.status(400).json({
        message: "E-pasts vai apstiprināšanas kods nav derīgs.",
      });
      return;
    }

    if (user.emailVerifiedAt) {
      res.status(409).json({
        message: "E-pasts jau ir apstiprināts.",
      });
      return;
    }

    const verification = await prisma.emailVerification.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    if (!verification || verification.usedAt) {
      res.status(400).json({
        message:
          "Apstiprināšanas kods nav derīgs. Pieprasi jaunu kodu.",
      });
      return;
    }

    if (verification.expiresAt <= new Date()) {
      res.status(400).json({
        message:
          "Apstiprināšanas koda derīguma termiņš ir beidzies.",
      });
      return;
    }

    if (verification.attempts >= 5) {
      res.status(429).json({
        message:
          "Pārsniegts mēģinājumu skaits. Pieprasi jaunu kodu.",
      });
      return;
    }

    const submittedHash = hashVerificationCode(code);

    if (submittedHash !== verification.tokenHash) {
      // Palielinām nepareizo mēģinājumu skaitu tikai tad,
      // ja kods vēl nav izmantots un mēģinājumu limits nav sasniegts.
      await prisma.emailVerification.updateMany({
        where: {
          id: verification.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: 5 },
        },
        data: {
          attempts: { increment: 1 },
        },
      });

      res.status(400).json({
        message: "Apstiprināšanas kods nav pareizs.",
      });
      return;
    }

    // Koda izmantošanu un e-pasta apstiprināšanu
    // veicam vienā datubāzes transakcijā.
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.emailVerification.updateMany({
        where: {
          id: verification.id,
          usedAt: null,
          expiresAt: { gt: now },
          attempts: { lt: 5 },
        },
        data: {
          usedAt: now,
        },
      });

      if (updated.count !== 1) {
        return false;
      }

      await tx.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: now },
      });

      return true;
    });

    if (!result) {
      res.status(400).json({
        message: "Kods vairs nav derīgs. Pieprasi jaunu kodu.",
      });
      return;
    }

    res.json({
      message: "E-pasta adrese veiksmīgi apstiprināta!",
    });
  } catch (error) {
    console.error("E-pasta apstiprināšanas kļūda:", error);

    res.status(500).json({
      message:
        "E-pasta apstiprināšanu pašlaik neizdevās pabeigt.",
    });
  }
});

// =====================================================
// PIETEIKŠANĀS
// POST /api/auth/login
// =====================================================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      res.status(400).json({
        message: "Norādi e-pastu un paroli.",
      });
      return;
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      res.status(400).json({
        message: "E-pasts vai parole nav pareiza.",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      res.status(401).json({
        message: "E-pasts vai parole nav pareiza.",
      });
      return;
    }

    const passwordIsValid = await argon2.verify(
      user.passwordHash,
      password
    );

    if (!passwordIsValid) {
      res.status(401).json({
        message: "E-pasts vai parole nav pareiza.",
      });
      return;
    }

    if (!user.emailVerifiedAt) {
      res.status(403).json({
        message: "Pirms pieteikšanās apstiprini savu e-pastu.",
      });
      return;
    }

    const sessionToken = randomBytes(32).toString("hex");
    const tokenHash = hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + sessionLifetimeMs);

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    res.cookie(sessionCookieName, sessionToken, {
      ...sessionCookieOptions,
      maxAge: sessionLifetimeMs,
    });

    res.json({
      message: "Pieteikšanās veiksmīga.",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Pieteikšanās kļūda:", error);

    res.status(500).json({
      message: "Pieteikšanos pašlaik neizdevās pabeigt.",
    });
  }
});

// =====================================================
// PAŠREIZĒJAIS LIETOTĀJS
// GET /api/auth/me
// =====================================================

router.get("/me", async (req, res) => {
  try {
    const token = req.cookies?.[sessionCookieName];

    if (typeof token !== "string") {
      res.status(401).json({
        message: "Jāielogojas.",
      });
      return;
    }

    const session = await prisma.session.findUnique({
      where: {
        tokenHash: hashSessionToken(token),
      },
      include: {
        user: true,
      },
    });

    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await prisma.session.delete({
          where: { id: session.id },
        });
      }

      res.clearCookie(sessionCookieName, sessionCookieOptions);
      res.status(401).json({
        message: "Sesija nav derīga.",
      });
      return;
    }

    res.json({
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    });
  } catch (error) {
    console.error("Sesijas pārbaudes kļūda:", error);

    res.status(500).json({
      message: "Neizdevās pārbaudīt sesiju.",
    });
  }
});

// =====================================================
// IZRAKSTĪŠANĀS
// POST /api/auth/logout
// =====================================================

router.post("/logout", async (req, res) => {
  try {
    const token = req.cookies?.[sessionCookieName];

    if (typeof token === "string") {
      await prisma.session.deleteMany({
        where: {
          tokenHash: hashSessionToken(token),
        },
      });
    }

    res.clearCookie(sessionCookieName, sessionCookieOptions);

    res.json({
      message: "Izrakstīšanās veiksmīga.",
    });
  } catch (error) {
    console.error("Izrakstīšanās kļūda:", error);

    res.status(500).json({
      message: "Neizdevās izrakstīties.",
    });
  }
});

export default router;
