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

// Absender mit Anzeigename: Systemmails laufen über die Produktdomain
// (arcotime.ch), damit der Empfänger den Absender wiedererkennt. Der
// Anzeigename steht in einer Variable, weil ein weiteres Arco-Produkt
// dieselbe Funktion mit anderem Namen benutzt.
function absenderMitNamen(): string | undefined {
  const adresse = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  const name = process.env.SMTP_ABSENDER_NAME ?? "ArcoTime";
  if (!adresse) return undefined;
  if (adresse.includes("<")) return adresse; // Name steckt schon in der Variable
  return `"${name}" <${adresse}>`;
}

const ZEICHEN: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  ndash: "\u2013", mdash: "\u2014", hellip: "…", laquo: "«", raquo: "»",
  rarr: "\u2192", euro: "€", szlig: "ß",
  auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü",
};

// HTML in eine lesbare Textfassung übersetzen.
//
// Eine Mail, die NUR aus HTML besteht, ist ein bekanntes Spam-Merkmal:
// Werbeversender schicken HTML-only, ordentliche Absender liefern beides.
// Der Aufwand ist gering, die Wirkung auf die Zustellbarkeit nicht – und
// nebenbei bleibt die Mail in Textansichten und Vorlesesoftware lesbar.
//
// Bewusst ein kleiner eigener Umwandler statt einer Bibliothek: Unsere Mails
// verwenden eine Handvoll Elemente, und eine Abhängigkeit mehr will gepflegt
// sein. Wichtig ist vor allem, dass Verweise ihre Adresse behalten – ein
// "hier klicken" ohne Adresse ist in der Textfassung wertlos.
function alsText(html: string): string {
  return html
    // Verweise: Text und Adresse behalten. Ausgenommen, wenn beide gleich
    // sind – dann stünde die Adresse zweimal da.
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, adresse, text) => {
      const beschriftung = text.replace(/<[^>]+>/g, "").trim();
      const ziel = String(adresse).replace(/^mailto:/, "");
      return beschriftung && beschriftung !== ziel ? `${beschriftung} (${ziel})` : ziel;
    })
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<br\s*\/?>/gi, "\n")
    // Absätze durch eine LEERZEILE trennen, Aufzählungspunkte nicht: Der
    // Punkt bricht die Zeile schon um, sonst klaffte zwischen den
    // Stichworten je eine Leerzeile. </li> erzeugt deshalb nichts.
    .replace(/<\/(p|div|h[1-6]|tr|ul|ol)>/gi, "\n\n")
    .replace(/<\/li>/gi, "")
    .replace(/<[^>]+>/g, "")
    // Zeichenverweise auflösen. Ein stehengebliebenes "&ndash;" oder
    // "&uuml;" im Text ist genau die Schlamperei, die eine Textfassung
    // unglaubwürdig macht. Gross- und Kleinschreibung ist bedeutungstragend
    // (&Uuml; ist nicht &uuml;), deshalb ohne i-Schalter.
    .replace(
      /&(nbsp|amp|lt|gt|quot|apos|ndash|mdash|hellip|laquo|raquo|rarr|euro|szlig|auml|ouml|uuml|Auml|Ouml|Uuml);/g,
      (_, name) => ZEICHEN[name] ?? ""
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, zahl) => String.fromCodePoint(Number(zahl)))
    // Zeilen einzeln säubern, dann höchstens eine Leerzeile am Stück.
    .split("\n")
    .map((zeile) => zeile.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendeMail({
  an,
  betreff,
  html,
  antwortAn,
  systemAntwort,
  text,
  kopieAn,
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
  /** Eigene Textfassung. Ohne Angabe wird sie aus dem HTML abgeleitet. */
  text?: string;
  // Stille Kopie an Arcos. Bewusst blind: Die Empfängerin einer Rechnung
  // muss nicht sehen, an welches interne Postfach der Beleg zusätzlich
  // geht – sichtbar wäre es eine Adresse, an die sie irrtümlich antwortet.
  kopieAn?: string | null;
  anhaenge?: { dateiname: string; inhalt: Buffer; typ?: string }[];
}) {
  const support = process.env.SMTP_ANTWORT_AN;
  await transporter().sendMail({
    from: absenderMitNamen(),
    to: an,
    replyTo: antwortAn ?? (systemAntwort ? support : undefined),
    bcc: kopieAn ?? undefined,
    subject: betreff,
    html,
    text: text ?? alsText(html),
    attachments: anhaenge?.map((a) => ({
      filename: a.dateiname,
      content: a.inhalt,
      contentType: a.typ,
    })),
  });
}
