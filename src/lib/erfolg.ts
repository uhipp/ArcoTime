// Kleiner Helfer, um Erfolgsmeldungen konsistent an eine Redirect-URL
// anzuhängen. Wird von der globalen <Toast /> im App-Layout ausgelesen.
export function mitErfolg(pfad: string, nachricht: string) {
  const trenner = pfad.includes("?") ? "&" : "?";
  return `${pfad}${trenner}erfolg=${encodeURIComponent(nachricht)}`;
}
