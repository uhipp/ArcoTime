// Rückmeldung eines Formulars, dessen Prüfung serverseitig läuft.
//
// Warum nicht wie bisher per Weiterleitung mit ?error= : Eine Weiterleitung
// baut die Seite neu auf, das Formular startet leer – und alles Getippte
// ist weg. Bei einem Kundenformular mit zwanzig Feldern oder einer
// Rapport-Position mit langer Beschreibung ist das der schlimmste Fehler,
// den eine Anwendung machen kann: Sie wirft Arbeit weg.
//
// Wird der Fehler stattdessen zurückgegeben, findet keine Navigation
// statt. Die Eingabe bleibt von selbst stehen – es braucht kein
// Zurückschicken der Werte, weil die Komponente nicht neu aufgebaut wird.
//
// Der Erfolgsfall leitet weiterhin weiter: Dort ist das Formular fertig
// und soll leer neu beginnen.
//
// Bewusst in einer eigenen Datei: In einer "use server"-Datei wird jeder
// Export zur Server Action, ein Typ-Export hat dort nichts zu suchen.
export type FormularErgebnis = { fehler: string } | null;
