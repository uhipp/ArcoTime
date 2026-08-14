// Öffentliche Adresse des Organisationslogos.
//
// Der Ablageort ist bewusst öffentlich lesbar (siehe 0042): Ein Firmenlogo
// steht auf jeder Webseite, und eine dauerhafte Adresse funktioniert
// später im PDF und im Mailanhang ohne signierte Verweise, die nach einer
// Stunde ablaufen und dann ein kaputtes Bild hinterlassen.
export function logoAdresseVon(pfad: string | null | undefined): string | null {
  if (!pfad) return null;
  const basis = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!basis) return null;
  return `${basis.replace(/\/$/, "")}/storage/v1/object/public/logos/${pfad}`;
}
