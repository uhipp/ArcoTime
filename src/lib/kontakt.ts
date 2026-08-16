// Kontaktadresse, die Kunden zu sehen bekommen (Sperrseite, Zahlungsmails).
//
// Bewusst über eine Variable: Solange das Postfach support@arcotime.ch nicht
// eingerichtet ist, bleibt die persönliche Adresse stehen. Eine Adresse, die
// niemand liest, ist schlimmer als eine unpersönliche – der Kunde schreibt
// genau dann, wenn er nicht mehr weiterkommt.
export const SUPPORT_MAIL = process.env.SUPPORT_MAIL ?? "uhipp@arcos.ch";
