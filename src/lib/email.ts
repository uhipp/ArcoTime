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

// Absender mit Anzeigename: Die Systemmails laufen über die Plattformdomain
// (arcocloud.ch), die künftig alle Arco-Produkte bedient. Der Empfänger soll
// trotzdem das Produkt sehen, das er benutzt – deshalb "ArcoTime <…>".
function absenderMitNamen(): string | undefined {
  const adresse = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  const name = process.env.SMTP_ABSENDER_NAME ?? "ArcoTime";
  if (!adresse) return undefined;
  if (adresse.includes("<")) return adresse; // Name steckt schon in der Variable
  return `"${name}" <${adresse}>`;
}

export async function sendeMail({
  an,
  betreff,
  html,
  antwortAn,
  systemAntwort,
  anhaenge,
}: {
  an: string;
  betreff: string;
  html: string;
  // Antwortadresse der Organisation: Der Absender ist technisch immer
  // dasselbe Postfach, aber antworten soll der Kunde der Firma, die den
  // Rapport geschickt hat – nicht einem Systempostfach.
  antwortAn?: string | null;
  // Nur für Mails, die von ArcoTime selbst kommen (Erinnerungen, Hinweise an
  // die Organisation). Dann darf die Antwort im Support-Postfach landen.
  // Bewusst nicht als Fallback für antwortAn: Hat eine Organisation keine
  // Absenderadresse hinterlegt, würde die Antwort ihres Kunden sonst bei
  // Arcos landen statt bei ihr.
  systemAntwort?: boolean;
  anhaenge?: { dateiname: string; inhalt: Buffer; typ?: string }[];
}) {
  const support = process.env.SMTP_ANTWORT_AN;
  await transporter().sendMail({
    from: absenderMitNamen(),
    to: an,
    replyTo: antwortAn ?? (systemAntwort ? support : undefined),
    subject: betreff,
    html,
    attachments: anhaenge?.map((a) => ({
      filename: a.dateiname,
      content: a.inhalt,
      contentType: a.typ,
    })),
  });
}
