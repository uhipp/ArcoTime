// Prüfung von E-Mail-Adressen vor dem Versand.
//
// Anlass: Eine Einladung an "christian.hipp@hipptec" (ohne .ch) ist durch
// alle Prüfungen gerutscht und erst bei Hostpoint aufgeschlagen – mit der
// Meldung "Could not find any mailserver for recipient domain hipptec".
// Supabase reicht davon nur ein generisches "Error sending invite email"
// zurück, und das Konto wird dabei wieder verworfen. Für den Anwender sah
// das aus wie ein Fehler der Anwendung.
//
// Warum <input type="email"> das nicht abfängt: Der HTML-Standard erlaubt
// dort ausdrücklich Adressen ohne Top-Level-Domain ("user@intranet"), weil
// sie in Firmennetzen vorkommen. Für eine Anwendung, die über einen
// öffentlichen Mailserver verschickt, ist das die falsche Regel – eine
// solche Adresse ist von aussen nicht zustellbar.
//
// Bewusst keine vollständige RFC-5322-Prüfung: Die ist berüchtigt lang und
// fängt trotzdem nicht ab, ob es das Postfach gibt. Geprüft wird nur, was
// zuverlässig falsch ist.
export function emailFehler(email: string): string | null {
  const wert = email.trim();

  if (wert === "") return "Bitte eine E-Mail-Adresse angeben.";
  if (/\s/.test(wert)) return "Die E-Mail-Adresse darf keine Leerzeichen enthalten.";

  const teile = wert.split("@");
  if (teile.length !== 2) {
    return "Die E-Mail-Adresse braucht genau ein @-Zeichen.";
  }

  const [lokal, domain] = teile;
  if (lokal === "") return "Vor dem @-Zeichen fehlt etwas.";
  if (domain === "") return "Nach dem @-Zeichen fehlt die Domain.";

  // Der eigentliche Fang: Domain ohne Punkt, also ohne Top-Level-Domain.
  if (!domain.includes(".")) {
    return `„${wert}“ ist nicht zustellbar: Nach „${domain}“ fehlt die Endung, zum Beispiel „${domain}.ch“.`;
  }

  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) {
    return `„${wert}“ ist keine gültige Adresse – die Domain „${domain}“ ist fehlerhaft.`;
  }

  const endung = domain.split(".").pop() ?? "";
  if (!/^[a-z]{2,}$/i.test(endung)) {
    return `„${wert}“ ist nicht zustellbar: „.${endung}“ ist keine gültige Endung.`;
  }

  return null;
}

// Übersetzt die generische Meldung von Supabase Auth in etwas, mit dem ein
// Anwender etwas anfangen kann. Der echte Grund steht nur im Auth-Log des
// Projekts und kommt über die Schnittstelle nicht zurück – deshalb nennen
// wir die Möglichkeiten, statt zu raten.
export function versandFehlerText(meldung: string, email: string): string {
  if (/sending.*email|smtp/i.test(meldung)) {
    return (
      `Die Einladung an ${email} konnte nicht versendet werden. ` +
      "Meist stimmt die Adresse nicht (Tippfehler in der Domain) oder der " +
      "Mailserver hat sie abgewiesen. Bitte die Adresse prüfen und erneut " +
      "versuchen. Der genaue Grund steht im Auth-Log von Supabase."
    );
  }
  return meldung;
}
