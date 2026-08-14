import nodemailer from "nodemailer";

// Gemeinsamer SMTP-Versand für Systemmails (z.B. Wiedervorlagen-Reminder).
// Bewusst getrennt von Supabase Auth: Auth-Mails (Einladung, Passwort
// zurücksetzen) laufen über das in Supabase konfigurierte SMTP und deren
// eigene Vorlagen – dieser Helper ist für frei formulierte, fachliche Mails
// aus der Anwendung selbst.
function transporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP ist nicht konfiguriert (SMTP_HOST/SMTP_USER/SMTP_PASSWORD in .env.local setzen)."
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // SSL/TLS bei 465, STARTTLS bei 587
    auth: { user, pass },
  });
}

export async function sendeMail({
  an,
  betreff,
  html,
  antwortAn,
  anhaenge,
}: {
  an: string;
  betreff: string;
  html: string;
  // Antwortadresse der Organisation: Der Absender ist technisch immer
  // dasselbe Postfach, aber antworten soll der Kunde der Firma, die den
  // Rapport geschickt hat – nicht einem Systempostfach.
  antwortAn?: string | null;
  anhaenge?: { dateiname: string; inhalt: Buffer; typ?: string }[];
}) {
  const absender = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  await transporter().sendMail({
    from: absender,
    to: an,
    replyTo: antwortAn ?? undefined,
    subject: betreff,
    html,
    attachments: anhaenge?.map((a) => ({
      filename: a.dateiname,
      content: a.inhalt,
      contentType: a.typ,
    })),
  });
}
