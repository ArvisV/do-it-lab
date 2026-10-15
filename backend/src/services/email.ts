
import "dotenv/config";
import nodemailer from "nodemailer";

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const emailFrom = process.env.EMAIL_FROM;

if (!smtpUser || !smtpPass || !emailFrom) {
  throw new Error(
    "Trūkst SMTP_USER, SMTP_PASS vai EMAIL_FROM konfigurācijas."
  );
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: true,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export async function sendVerificationEmail(
  recipient: string,
  code: string
): Promise<void> {
  await transporter.sendMail({
    from: emailFrom,
    to: recipient,
    subject: "Do It Lab — e-pasta apstiprināšanas kods",
    text: `Tavs Do It Lab e-pasta apstiprināšanas kods ir: ${code}\n\nJa šo reģistrāciju neveici tu, vari šo e-pastu ignorēt.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Laipni lūdzam Do It Lab!</h2>
        <p>Lai apstiprinātu savu e-pasta adresi, ievadi šo kodu:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">
          ${code}
        </p>
        <p>Ja šo reģistrāciju neveici tu, vari šo e-pastu ignorēt.</p>
      </div>
    `,
  });
}
