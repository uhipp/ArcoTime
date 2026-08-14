// Rückmeldung der Positionsaktionen eines Rapports.
//
// Fehler werden ZURÜCKGEGEBEN statt per Weiterleitung gemeldet. Der Grund
// ist handfest: Eine Weiterleitung baut die Seite neu auf, das Formular
// startet leer – und eine abgelehnte Position war samt Beschreibung weg.
// Bei zwanzig Zeilen Text ist das der schlimmste Fehler, den eine
// Anwendung machen kann. Ohne Navigation bleibt die Eingabe von selbst
// stehen, es braucht kein Zurückschicken der Werte.
//
// Der Erfolgsfall leitet weiterhin weiter – dort ist das Formular fertig
// und soll leer neu beginnen.
//
// Bewusst in einer eigenen Datei und nicht bei den Aktionen: In einer
// "use server"-Datei wird jeder Export zur Server Action, und ein
// Typ-Export hat dort nichts zu suchen.
export type PositionsErgebnis = { fehler: string } | null;
