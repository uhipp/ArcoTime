// Öffentliche Adresse der Anwendung – eine einzige Quelle.
//
// Die Adresse steckt in den Stripe-Rückkehr-URLs und in jedem Link, der in
// einer Mail landet. Vorher stand der Fallback dreimal im Code; wird eine
// Stelle vergessen, landen Kunden auf der alten Vercel-Adresse, ohne dass
// etwas fehlschlägt – genau die Art Fehler, die niemand meldet.
//
// In Produktion setzt Vercel APP_URL; der Fallback gilt für lokale Läufe und
// für den Fall, dass die Variable vergessen geht.
export const APP_URL = process.env.APP_URL ?? "https://arcotime.ch";
