#!/usr/bin/env python3
"""
Erzeugt die Excel-Datei für einen Testtag.

Aufruf:
    python3 scripts/testprotokoll.py [zieldatei.xlsx]

Warum als Skript und nicht als einmalig gebaute Datei: Nach jedem grösseren
Umbau ändert sich, was zu testen ist. Ein Testkatalog, den man nicht neu
erzeugen kann, prüft nach der dritten Migration das Falsche – und ein
Testkatalog, der Dinge abfragt, die es nicht mehr gibt, kostet den Tester
Vertrauen.

Ohne Fremdbibliothek: Eine xlsx ist ein ZIP mit XML, und zipfile ist in
Python eingebaut. Die Texte stehen als inline strings in den Blättern
(kein sharedStrings) – etwas grössere Datei, dafür ein Bruchteil des Codes
und beim Nachlesen im Klartext auffindbar.

Stand des Katalogs: 23.08.2026, nach den Migrationen 0071 bis 0084
(Adressen, Standorte, Artikel, Auswertungen, Handy-Ansicht).
"""
import sys
import zipfile
from datetime import date

ZIEL = sys.argv[1] if len(sys.argv) > 1 else "ArcoTime-Testprotokoll.xlsx"
HEUTE = date.today().strftime("%d.%m.%Y")

# ---------------------------------------------------------------------------
# Bereiche
# ---------------------------------------------------------------------------
BEREICHE = [
    ("ANM", "Anmeldung, Registrierung, Passwort"),
    ("ALG", "Navigation, Übersicht, Rückwege, Darstellung"),
    ("TAG", "Startseite „Mein Tag“"),
    ("ADR", "Adressen (Adressbuch, Filter, Maske, Ansprechpersonen, Kontakte)"),
    ("STO", "Standorte (Adressen eines Kunden, Standardadresse, Stilllegung)"),
    ("PRO", "Aufträge (Einsatzort, Anfahrt, Zugang, zusätzliche Adressen, Team)"),
    ("RAP", "Arbeitsrapporte (Kopf, Positionen, Erreichbar vor Ort, Abschluss, PDF)"),
    ("ZE", "Zeiterfassung (Erfassen, Timer, Liste, Bearbeiten)"),
    ("ART", "Artikel und Artikelklassen (Stamm, Einheiten, Menge summieren)"),
    ("ANF", "Anfragen und Board"),
    ("DIS", "Disposition"),
    ("KAL", "Kalender"),
    ("AUS", "Auswertungen (Gruppierung nach Auftrag, Klasse, Einsatzort)"),
    ("EXP", "Export nach Comatic"),
    ("MA", "Mitarbeitende (Einladen, Rollen, Abwesenheiten)"),
    ("ZK", "Zeitkonto (Sollstunden, Pensum, Ferien, Monatsabschluss)"),
    ("EIN", "Einstellungen (Auswahllisten, Bezeichnungen, Standorte führen, Vortrag)"),
    ("DOK", "Dokumentenablagen (Adresse, Auftrag, Anfrage, Rapport, Mitarbeitende)"),
    ("BEN", "Benachrichtigungen und Mailversand"),
    ("HIL", "Hilfe, Neuigkeiten, Rechtstexte"),
    ("MOB", "Handy: Nacheinander, Aktionsleiste, Karten, Berührungsflächen"),
]

# ---------------------------------------------------------------------------
# Testkatalog: (Bereich, Ablauf, Erwartet)
# ---------------------------------------------------------------------------
K = [
    # ---- Anmeldung -------------------------------------------------------
    ("ANM", "Abmelden. Danach mit falschem Passwort anmelden.",
     "Verständliche Meldung, keine technische Fehlermeldung. Kein Hinweis darauf, ob die E-Mail existiert."),
    ("ANM", "Mit dem richtigen Passwort anmelden.",
     "Du landest auf der Übersicht. Oben links das Logo, daneben die Organisation, rechts dein Name."),
    ("ANM", "„Passwort vergessen“ durchspielen bis zur E-Mail.",
     "Die Mail kommt an, der Link führt auf die Seite zum Setzen eines neuen Passworts."),

    # ---- Allgemein -------------------------------------------------------
    ("ALG", "Jeden Eintrag in der Navigationsleiste anklicken.",
     "Jeder führt auf eine Seite, keine Fehlermeldung, keine leere Seite. Der Eintrag für das Adressbuch heisst „Adressen“."),
    ("ALG", "Fenster auf halbe Breite ziehen und die Navigation ansehen.",
     "Die Leiste bleibt eine Zeile hoch und lässt sich seitlich wischen. Das Logo wird nicht überschrieben."),
    ("ALG", "Auf einer beliebigen Seite versuchen, den Inhalt seitwärts zu schieben.",
     "Es lässt sich nichts seitwärts schieben. Breite Tabellen scrollen in ihrem eigenen Rahmen."),
    ("ALG", "In der Adresszeile des Browsers /dienstleistungen aufrufen.",
     "Seite nicht gefunden – der Bereich heisst jetzt /artikel. Das ist erwartet."),

    # ---- Mein Tag --------------------------------------------------------
    ("TAG", "Übersicht öffnen, ohne dass ein Timer läuft und ohne Einsatz für heute.",
     "„Mein Tag“ steht zuoberst mit dem heutigen Datum und dem Hinweis, dass für heute kein Einsatz erfasst ist, samt zwei Wegen (Rapport anlegen, Zeit erfassen)."),
    ("TAG", "Einen Rapport mit heutigem Datum auf dich selbst anlegen, dann die Übersicht öffnen.",
     "Der Einsatz steht unter „Mein Tag“ mit Kunde, Auftrag und Ort. Ein Tipp darauf öffnet den Rapport."),
    ("TAG", "Dich in einem Teamrapport von jemand anderem als Mitarbeitende eintragen lassen, Datum heute. Übersicht öffnen.",
     "Der Einsatz erscheint ebenfalls – und nur einmal, auch wenn du zusätzlich die ausführende Person bist."),
    ("TAG", "Einen Timer starten und die Übersicht öffnen.",
     "Zuoberst eine rote Zeile „Ein Timer läuft“. Ein Tipp führt direkt zum Rapport oder Zeiteintrag, an dem er läuft."),
    ("TAG", "Einen Rapport von gestern offen lassen und die Übersicht öffnen.",
     "Eine gelbe Zeile nennt die Anzahl offener Rapporte aus vergangenen Tagen und führt in die Liste."),

    # ---- Adressen --------------------------------------------------------
    ("ADR", "Adressen öffnen. Die drei Sichten „Alle“, „nur Kunden“, „nur Adressen“ durchklicken.",
     "Die Liste wechselt. „nur Adressen“ zeigt genau die Einträge ohne Häkchen „ist Kunde“ – mit dem Vermerk „nur Adresse“."),
    ("ADR", "Bei aktivem Filter zusätzlich im Suchfeld etwas eingeben und suchen.",
     "Filter und Suche gelten gemeinsam; der Filter geht durch die Suche nicht verloren."),
    ("ADR", "Eine neue Adresse ohne Häkchen „ist Kunde“ anlegen (z.B. ein Architekturbüro).",
     "Sie erscheint in „Alle“ und „nur Adressen“, nicht in „nur Kunden“ – und nicht in der Kundenauswahl eines Auftrags."),
    ("ADR", "Eine Adresse öffnen. Alle Reiter durchklicken.",
     "Adresse, Ansprechpersonen, Standorte, Aufträge, Preise und Rabatte, Dokumente, Historie. Die Seite selbst scrollt nicht; gescrollt wird in Liste und Detail."),
    ("ADR", "Im Reiter Adresse etwas ändern und „Adresse speichern“ drücken.",
     "Du bleibst beim Kunden und im Reiter Adresse. Erfolgsmeldung erscheint."),
    ("ADR", "Im Reiter Adresse einen weiteren Kontaktkanal erfassen (z.B. Mobil).",
     "Er erscheint in der Liste des Betriebs. Nach dem Speichern bleibt der Reiter Adresse offen."),
    ("ADR", "Im Reiter Ansprechpersonen eine Person erfassen, dann „Person speichern“.",
     "Die Person erscheint, und der Reiter Ansprechpersonen bleibt offen. Der Knopf heisst nicht „+ Person“."),
    ("ADR", "Bei einer Person eine Mailadresse und eine Nummer erfassen.",
     "Beide sind anklickbar. Auf dem Telefon führt der Tipp in Mailprogramm bzw. Anruf."),
    ("ADR", "Als Admin bei einer Person „Person entfernen“ drücken.",
     "Eine Rückfrage kommt. Nach dem Bestätigen ist die Person weg, samt ihren Kontaktangaben."),
    ("ADR", "Eine Adresse löschen, an der ein Auftrag mit Zeiteinträgen hängt.",
     "Es wird abgelehnt, mit einer verständlichen Meldung – keine technische Fehlermeldung."),
    ("ADR", "In der Liste über „Ganze Liste“ und zurück in die Maske wechseln.",
     "Der gewählte Eintrag bleibt links markiert, der Reiter bleibt erhalten."),

    # ---- Standorte -------------------------------------------------------
    ("STO", "Einstellungen → „Standorte führen“ AUSschalten. Danach eine Adresse öffnen.",
     "Kein Reiter „Standorte“. Im Auftrag kein Feld „Einsatzort“. Alles andere unverändert."),
    ("STO", "„Standorte führen“ EINschalten. Dieselbe Adresse öffnen.",
     "Der Reiter Standorte erscheint und enthält bereits eine Adresse – die aus dem Kundenstamm, markiert als vorgeschlagen."),
    ("STO", "Im Reiter Standorte eine zweite Adresse erfassen (Liegenschaft mit eigener Strasse).",
     "Sieben Felder, nicht mehr: Bezeichnung, Adresszusatz, Strasse, Nummer, PLZ, Ort, Land. Dazu die Häkchen „wird vorgeschlagen“ und „aktiv“. KEINE Anfahrt, kein Zugang, keine Notiz."),
    ("STO", "Bei der zweiten Adresse „wird beim Auftrag vorgeschlagen“ ankreuzen und speichern.",
     "Die erste verliert die Markierung. Es gibt immer genau eine vorgeschlagene Adresse."),
    ("STO", "Eine Adresse auf „aktiv“ = aus setzen. Danach einen neuen Auftrag für diesen Kunden anlegen.",
     "Die stillgelegte Adresse erscheint nicht mehr in der Auswahl des Einsatzorts, bleibt aber in der Liste lesbar."),
    ("STO", "Eine neue Adresse anlegen und einen Kunden erfassen. Danach den Reiter Standorte öffnen.",
     "Für den neuen Kunden ist automatisch eine Adresse da, mit seinem Namen und seiner Anschrift."),
    ("STO", "Eine Liegenschaft löschen, an der ein Auftrag hängt.",
     "Es wird abgelehnt mit dem Hinweis, dass Aufträge daran hängen und man sie sonst auf inaktiv setzt."),

    # ---- Aufträge --------------------------------------------------------
    ("PRO", "Einen neuen Auftrag anlegen. Kunden wählen und die Auswahl „Einsatzort“ ansehen.",
     "Nur Adressen dieses Kunden stehen zur Wahl, die vorgeschlagene ist vorbelegt. Beim Wechsel des Kunden wechselt die Liste."),
    ("PRO", "Beim ERSTEN Auftrag an einer Adresse: Anfahrt und Zugang ansehen.",
     "Beide Felder sind LEER. Kein vorgetragener Wert von einer anderen Liegenschaft."),
    ("PRO", "Anfahrt 25 km und einen Zugangstext erfassen, speichern. Dann einen ZWEITEN Auftrag an derselben Adresse anlegen.",
     "Anfahrt und Zugang sind vorgeschlagen, und ein Hinweis nennt den Auftrag, aus dem sie kommen. Überschreiben ist möglich."),
    ("PRO", "Einstellungen → „Beim neuen Auftrag übernehmen“: Zugang abwählen. Dann noch einen Auftrag an derselben Adresse anlegen.",
     "Die Anfahrt wird übernommen, der Zugang nicht."),
    ("PRO", "Im Auftrag den Reiter Adressen öffnen und eine zusätzliche Adresse mit Rolle Eigentümer erfassen.",
     "Sie erscheint mit Rolle, Name und – wenn erfasst – Nummer und Mailadresse, beide anklickbar."),
    ("PRO", "Eine zusätzliche Adresse mit „ab“ = morgen erfassen.",
     "Sie steht in der Liste, erscheint aber auf einem Rapport von heute NICHT (siehe RAP)."),
    ("PRO", "Bei der Rollenauswahl prüfen, welche Rollen angeboten werden.",
     "Acht: Eigentümer, Verwaltung, Mieter, Hauswart, Architekt, Bauleitung, Subunternehmer, Behörde. KEINE Rolle „Kunde“."),
    ("PRO", "Eine zusätzliche Adresse entfernen.",
     "Rückfrage, danach ist die Verknüpfung weg – die Adresse selbst bleibt im Adressbuch."),
    ("PRO", "Die Auftragsmaske durchklicken: alle fünf Reiter.",
     "Auftrag, Adressen, Team, Rapporte, Dokumente. Liste links, Detail rechts, die Seite scrollt nicht."),
    ("PRO", "Im Reiter Rapporte eines Auftrags einen Rapport öffnen und zurückkehren.",
     "Der Auftrag bleibt links markiert."),
    ("PRO", "Das Adressbuch nach dem Umzug prüfen: eine beteiligte Adresse ändern (Strasse) und einen zweiten Auftrag mit derselben Adresse ansehen.",
     "Die geänderte Anschrift erscheint in ALLEN Aufträgen – es ist eine Verknüpfung und keine Kopie."),

    # ---- Rapporte --------------------------------------------------------
    ("RAP", "Einen Rapport zu einem Auftrag mit Einsatzort und Zugang öffnen.",
     "Oben Navigation und Anrufen. Darunter die Bezeichnung des Einsatzorts und der Zugang."),
    ("RAP", "Auf „Navigation“ tippen.",
     "Das Kartenprogramm öffnet die Adresse des EINSATZORTS, nicht die Anschrift des Kunden."),
    ("RAP", "Den Block „Erreichbar vor Ort“ ansehen.",
     "Die Ansprechperson des Kunden und die zusätzlichen Adressen des Auftrags, je mit Rolle, Name und Nummer. Nummern und Mailadressen sind anklickbar."),
    ("RAP", "Eine zusätzliche Adresse mit „bis“ = gestern versehen und den Rapport von heute neu laden.",
     "Sie erscheint NICHT mehr. Auf einem Rapport mit Datum von vorgestern steht sie weiterhin."),
    ("RAP", "Eine Position hinzufügen: Feldbeschriftung über der Auswahl ansehen.",
     "Sie heisst „Artikel“ – oder so, wie der Betrieb den Artikel nennt. Nicht „Leistung“."),
    ("RAP", "Eine Position mit einem Stundenartikel erfassen und speichern.",
     "Sie wird gespeichert, ohne Fehlermeldung. Preis und MWSt sind gefüllt."),
    ("RAP", "Bei einer Stundenposition den Timer starten.",
     "Der Knopf heisst „Timer starten“. Oben erscheint eine rote Karte mit „Timer läuft“ und dem Artikel."),
    ("RAP", "Während der Timer läuft, bei einer ANDEREN Position im GLEICHEN Rapport den Timer starten.",
     "Es wird abgelehnt mit der Meldung, dass an DIESEM Rapport schon ein Timer läuft – mit Nennung des Artikels."),
    ("RAP", "Während der Timer läuft, in einem ANDEREN Rapport einen Timer starten.",
     "Es wird abgelehnt mit dem Hinweis auf den anderen Rapport."),
    ("RAP", "Den Timer stoppen.",
     "Der Knopf heisst „Timer stoppen“ – nicht „Ankunft“. Die gemessene Zeit ersetzt die Dauer der Position."),
    ("RAP", "Eine Position mit einem Anreise-Artikel erfassen.",
     "Die Menge ist mit der Anfahrt des AUFTRAGS vorbelegt, nicht mit einem Wert vom Kunden."),
    ("RAP", "Rapport abschliessen und unterschreiben lassen.",
     "Nummer wird vergeben, Positionen sind gesperrt, Unterschrift bleibt gespeichert."),
    ("RAP", "PDF herunterladen.",
     "Einsatzort, Zugang und „Erreichbar vor Ort“ stehen darauf. Die Spalte der Positionen heisst „Artikel“."),
    ("RAP", "Druckansicht öffnen und ausdrucken (oder Druckvorschau).",
     "Gleicher Inhalt wie im PDF, ohne Navigation und ohne Menü."),
    ("RAP", "Rapport per Mail versenden.",
     "Die Mail kommt an, das PDF hängt an, der Empfänger ist vorbelegt."),

    # ---- Zeiterfassung ---------------------------------------------------
    ("ZE", "Einen Zeiteintrag ohne Rapport erfassen (Auftrag, Artikel, Von/Bis).",
     "Wird gespeichert, Betrag wird berechnet."),
    ("ZE", "Einen Anreise-Artikel wählen.",
     "Die Menge wird aus der Anfahrt des Auftrags vorgeschlagen."),
    ("ZE", "Zwei Einträge mit überlappenden Zeiten für dieselbe Person erfassen.",
     "Der zweite wird abgelehnt mit einer verständlichen Meldung."),
    ("ZE", "Timer in der Zeiterfassung starten, dann im Rapport einen Timer starten.",
     "Abgelehnt mit dem Hinweis auf den laufenden Timer in der Zeiterfassung."),
    ("ZE", "Spaltenwahl öffnen, Spalten ändern, speichern und neu laden.",
     "Die Auswahl bleibt. Der Knopf für die Spaltenwahl steht neben dem Filter, nicht darin."),

    # ---- Artikel ---------------------------------------------------------
    ("ART", "Den Bereich „Artikel“ in der Navigation öffnen.",
     "Der Artikelstamm erscheint. Titel und Knöpfe sprechen von Artikeln."),
    ("ART", "Einen neuen Artikel anlegen.",
     "Der Titel heisst „Neuer Artikel“ (nicht „Neue Artikel“). Speichern funktioniert."),
    ("ART", "Einstellungen → Artikelklassen ansehen.",
     "Je Klasse ein Häkchen „Menge summieren“ mit Erklärung darüber."),
    ("ART", "Bei einer Klasse mit nur einer Einheit (z.B. Arbeit, alles Stunden) „Menge summieren“ einschalten.",
     "Wird gespeichert."),
    ("ART", "Bei einer Klasse mit gemischten Einheiten „Menge summieren“ einschalten.",
     "Abgelehnt mit einer Meldung, die die gefundenen Einheiten nennt."),
    ("ART", "Einer summierenden Klasse einen Artikel mit abweichender Einheit zuordnen.",
     "Abgelehnt mit einer Meldung, die Klasse, vorhandene Einheit und die neue nennt."),
    ("ART", "Einen Artikel deaktivieren und einen neuen Zeiteintrag erfassen.",
     "Der deaktivierte Artikel erscheint nicht in der Auswahl; bestehende Einträge bleiben unverändert."),

    # ---- Auswertungen ----------------------------------------------------
    ("AUS", "Auswertungen öffnen, Zeitraum wählen, „Alle Positionen“ ansehen.",
     "Jede Position mit Datum, Kunde/Auftrag, Artikel, Klasse, Dauer, Betrag."),
    ("AUS", "Auf „Nach Auftrag“ umschalten.",
     "Eine Zeile je Auftrag mit Kunde, Anzahl Positionen, Dauer in Stunden und Betrag."),
    ("AUS", "Auf „Nach Artikelklasse“ umschalten.",
     "Eine Zeile je Klasse. Wo die Klasse summiert, steht die Menge mit Einheit; sonst ein Strich. Die Summenzeile zeigt bei der Menge einen Strich."),
    ("AUS", "Mit der Maus über einen Strich in der Mengenspalte fahren.",
     "Ein Hinweis erklärt, dass die Klasse verschiedene Einheiten führt."),
    ("AUS", "Bei eingeschalteter Ortsebene auf „Nach Standort“ umschalten.",
     "Eine Zeile je Einsatzort mit Ort, Anzahl, Dauer und Betrag."),
    ("AUS", "Ortsebene ausschalten und die Auswertungen erneut öffnen.",
     "Die Gruppierung nach Standort wird nicht mehr angeboten."),
    ("AUS", "Nach Klasse filtern und gleichzeitig nach Auftrag gruppieren.",
     "Filter und Gruppierung gelten gemeinsam; die Summe passt zur gefilterten Menge."),

    # ---- Anfragen, Disposition, Kalender ---------------------------------
    ("ANF", "Eine Anfrage erfassen, einer Person zuweisen, Wiedervorlage auf heute setzen.",
     "Sie erscheint auf der Übersicht dieser Person unter „Meine Wiedervorlagen“."),
    ("ANF", "Eine Anfrage über das Board von Spalte zu Spalte ziehen.",
     "Der Status wechselt und bleibt nach dem Neuladen."),
    ("ANF", "Aus einer Anfrage einen Rapport erzeugen.",
     "Der Rapport entsteht mit Kunde und Auftrag der Anfrage."),
    ("DIS", "Disposition öffnen, einen Rapport auf einen anderen Tag ziehen.",
     "Das Datum wechselt, keine Fehlermeldung, der Rapport erscheint am neuen Tag."),
    ("DIS", "Zwei Einsätze für dieselbe Person zur gleichen Zeit planen.",
     "Der Konflikt wird angezeigt."),
    ("KAL", "Kalender öffnen, Monat wechseln, nach Auftrag filtern.",
     "Die Einträge passen zum Filter, der Monatswechsel behält den Filter."),

    # ---- Export, Mitarbeitende, Zeitkonto --------------------------------
    ("EXP", "Für einen Auftrag mit abgeschlossenen Rapporten einen Export erzeugen.",
     "Belegnummer wird vergeben, die Datei lädt herunter, die Positionen sind als exportiert markiert."),
    ("EXP", "Einen Export mit einem OFFENEN Rapport im Zeitraum erzeugen.",
     "Die Positionen des offenen Rapports sind NICHT dabei."),
    ("EXP", "Die Exportdatei in einem Tabellenprogramm öffnen.",
     "Spalten und Umlaute stimmen, die Adresse steht in einer Spalte (Strasse mit Hausnummer)."),
    ("MA", "Eine Person einladen und den Link auf einem zweiten Gerät öffnen.",
     "Passwort setzen funktioniert, danach Anmeldung möglich."),
    ("MA", "Eine Person deaktivieren.",
     "Sie erscheint nicht mehr in Auswahllisten; ihre Einträge bleiben erhalten."),
    ("ZK", "Bei gebuchtem Zeitkonto: Pensum und Sollstunden erfassen, Saldo prüfen.",
     "Der Saldo rechnet mit den erfassten Zeiten und dem Pensum."),
    ("ZK", "Einen Monat abschliessen und danach eine Zeit in diesem Monat ändern.",
     "Die Änderung wird abgelehnt, mit Hinweis auf den Abschluss."),

    # ---- Einstellungen, Dokumente, Benachrichtigungen --------------------
    ("EIN", "Bezeichnungen: „Adresse“ auf „Kontakt“ ändern und speichern.",
     "Navigation, Titel und Knöpfe sagen „Kontakte“. Das Feld am Auftrag heisst weiterhin „Kunde“."),
    ("EIN", "Bezeichnungen: eine Branchenvorlage übernehmen.",
     "Alle Wörter wechseln auf einmal, inklusive Adresse und Artikel."),
    ("EIN", "„Beim neuen Auftrag übernehmen“: alle Häkchen entfernen und einen Auftrag anlegen.",
     "Nichts wird vorgetragen, alle Felder sind leer."),
    ("EIN", "Eine Kontaktart und eine Adressrolle ergänzen.",
     "Beide erscheinen sofort in den jeweiligen Auswahllisten."),
    ("EIN", "Datenpflege: „Anfahrt aus Positionen übernehmen“ als Vorschau ansehen.",
     "Die Vorschau nennt AUFTRÄGE (nicht Kunden) mit dem zuletzt verrechneten Wert."),
    ("EIN", "Änderungsprotokoll öffnen und nach Bereichen filtern.",
     "Die neuen Bereiche stehen mit sprechendem Namen da: Adresse (Einsatzort), Auftrag – zusätzliche Adresse, Adressrolle."),
    ("DOK", "Bei einer Adresse, einem Auftrag und einem Rapport je eine Datei hochladen und wieder herunterladen.",
     "Upload, Anzeige und Download funktionieren; die Kategorie lässt sich setzen."),
    ("DOK", "Im Reiter Standorte nach einer Dokumentenablage suchen.",
     "Es gibt keine – Dokumente hängen an der Adresse (dem Kunden) oder am Auftrag. Das ist erwartet."),
    ("BEN", "Tägliche Erinnerung an offene Rapporte auslösen bzw. abwarten.",
     "Die Mail nennt die offenen Rapporte der Person."),
    ("HIL", "Hilfe öffnen und nach „Dienstleistung“ suchen.",
     "Die Seite „Artikel“ wird gefunden – der alte Begriff bleibt suchbar."),
    ("HIL", "Hilfe zu Adressen, Aufträgen und Einstellungen lesen und mit dem Bildschirm vergleichen.",
     "Was dort steht, stimmt mit der Anwendung überein – auch die neuen Abschnitte zu Standorten, Anfahrt, Zugang und „Menge summieren“."),
    ("HIL", "Neuigkeiten öffnen.",
     "Die Einträge zu Adressen, Standorten, Artikeln, Auswertungen und Handy sind vorhanden und verständlich."),

    # ---- Handy -----------------------------------------------------------
    ("MOB", "Auf dem Telefon die Übersicht öffnen.",
     "„Mein Tag“ steht zuoberst, die Flächen sind mit dem Daumen gut zu treffen."),
    ("MOB", "Auf dem Telefon eine Adresse öffnen.",
     "Nur das Detail ist zu sehen, keine schmale Liste daneben. Zurück geht über „Ganze Liste“."),
    ("MOB", "Auf dem Telefon die Reiter einer Adresse durchwischen.",
     "Die Reiterleiste lässt sich seitlich wischen, die Flächen sind gross genug."),
    ("MOB", "Auf dem Telefon einen offenen Rapport öffnen.",
     "Unten kleben Navigation und Anrufen. Die Positionen stehen VOR dem Rapportkopf."),
    ("MOB", "Auf dem Telefon die Positionen ansehen.",
     "Karten statt Tabelle: Artikel, Beschreibung, Menge, Betrag und die Knöpfe untereinander. Kein seitliches Wischen."),
    ("MOB", "Auf dem Telefon bei einer Position den Timer starten und stoppen.",
     "Der Knopf ist ohne Zielen zu treffen, und man sieht, zu welcher Position er gehört."),
    ("MOB", "Auf dem Telefon einen Rapport abschliessen und unterschreiben.",
     "Die Unterschrift lässt sich mit dem Finger zeichnen, die Seite scrollt dabei nicht weg."),
    ("MOB", "Auf dem Telefon die Kopfleiste ansehen.",
     "Das Logo wird nicht überschrieben. Bricht die Zeile um, sitzt die rechte Gruppe rechts."),
]

# ---------------------------------------------------------------------------
# Anleitung
# ---------------------------------------------------------------------------
ANLEITUNG = [
    ("ArcoTime – Testprotokoll", "titel"),
    (f"Vorlage für den Testtag. Stand des Katalogs: {HEUTE}.", "text"),
    ("", "text"),
    ("Was neu ist und deshalb besonders geprüft werden sollte", "kopf"),
    ("Seit dem letzten Testtag ist viel umgebaut worden. Diese Bereiche sind neu oder anders:", "text"),
    ("• Adressen statt Kunden – dieselbe Liste, drei Sichten (Alle / nur Kunden / nur Adressen).", "text"),
    ("• Standorte – die Adressen eines Kunden. Ein Standort ist eine Postadresse und nichts weiter.", "text"),
    ("• Der Auftrag trägt jetzt Einsatzort, Anfahrt, Zugang und die zusätzlichen Adressen (Eigentümer, Architekt, Hauswart).", "text"),
    ("• Aus Dienstleistungen wurden Artikel, aus Dienstleistungsklassen Artikelklassen – mit dem Schalter „Menge summieren“.", "text"),
    ("• Auswertungen lassen sich nach Auftrag, Artikelklasse und Einsatzort gruppieren.", "text"),
    ("• Der Rapport zeigt „Erreichbar vor Ort“ mit Nummern, und die Navigation zielt auf den Einsatzort.", "text"),
    ("• Kunden- und Auftragsmaske sind neu gebaut: Liste links, Reiter rechts, keine scrollende Seite.", "text"),
    ("• Auf dem Telefon: „Mein Tag“, Nacheinander statt Nebeneinander, Aktionsleiste unten, Positionen als Karten.", "text"),
    ("", "text"),
    ("So wird es ausgefüllt", "kopf"),
    ("1. Im Blatt „Testkatalog“ jeden Ablauf durchspielen und in Spalte E das Ergebnis wählen (ok / Befund / übersprungen).", "text"),
    ("2. Bei einem Befund: im Blatt „Protokoll“ die nächste freie Zeile nehmen. Die Nummer in Spalte A steht schon da – sie ist die Referenz, über die wir uns später verständigen („Punkt 37“).", "text"),
    ("3. Die Testfall-Nummer (z.B. RAP-08) im Protokoll in Spalte C eintragen und die Protokollnummer im Testkatalog in „Befund-Nr.“ – so gehören die beiden zusammen.", "text"),
    ("4. „Was getan“ so beschreiben, dass es jemand nachstellen kann: Wer war angemeldet, welche Seite, welche Eingaben.", "text"),
    ("5. „Erwartet“ und „Beobachtet“ getrennt festhalten. Der Unterschied ist der eigentliche Befund.", "text"),
    ("6. Bewertung und Schweregrad setzen. Auch „Gefällt“ eintragen – es hilft zu wissen, was funktioniert.", "text"),
    ("7. Gerät und Browser angeben, besonders bei Darstellungsfragen. Safari verhält sich bei Datumsfeldern anders als Chrome.", "text"),
    ("", "text"),
    ("Bitte nicht", "kopf"),
    ("• Zeilen sortieren, einfügen oder löschen – die Nummern müssen stabil bleiben.", "text"),
    ("• Mehrere Befunde in eine Zeile schreiben. Lieber drei Zeilen; jede wird einzeln abgearbeitet.", "text"),
    ("• Die Spalten L bis N ausfüllen – die sind für die Bearbeitung reserviert.", "text"),
    ("", "text"),
    ("Schweregrad", "kopf"),
    ("blockierend = Arbeit ist unmöglich oder es entstehen falsche Daten · hoch = wichtige Funktion unbrauchbar, Umweg nötig", "text"),
    ("mittel = stört, aber es gibt einen Weg · gering = Schönheitsfehler, Text, Beschriftung", "text"),
    ("", "text"),
    ("Wenn ihr fertig seid", "kopf"),
    ("Datei speichern und Urs geben. Die Bearbeitung trägt Status und Bemerkung in Spalte L bis N nach; das Protokoll bleibt sonst unverändert.", "text"),
]

# ---------------------------------------------------------------------------
# XML-Handwerk
# ---------------------------------------------------------------------------
def esc(t):
    return (
        str(t)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def zelle(ref, wert, stil=0, formel=False):
    if wert is None or wert == "":
        return f'<c r="{ref}" s="{stil}"/>'
    if formel:
        return f'<c r="{ref}" s="{stil}"><f>{esc(wert)}</f></c>'
    if isinstance(wert, (int, float)):
        return f'<c r="{ref}" s="{stil}"><v>{wert}</v></c>'
    return f'<c r="{ref}" s="{stil}" t="inlineStr"><is><t xml:space="preserve">{esc(wert)}</t></is></c>'


def spaltenname(i):
    name = ""
    while True:
        name = chr(ord("A") + i % 26) + name
        i = i // 26 - 1
        if i < 0:
            return name


def blatt(zeilen, breiten=None, gefroren=None, validierungen=None, autofilter=None):
    teile = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
             '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">']
    if breiten:
        teile.append("<cols>")
        for i, b in enumerate(breiten):
            teile.append(f'<col min="{i+1}" max="{i+1}" width="{b}" customWidth="1"/>')
        teile.append("</cols>")
    teile.append("<sheetData>")
    for nr, inhalt in enumerate(zeilen, start=1):
        hoehe = ' ht="30" customHeight="1"' if inhalt.get("hoch") else ""
        teile.append(f'<row r="{nr}"{hoehe}>')
        for sp, (wert, stil, formel) in enumerate(inhalt["zellen"]):
            teile.append(zelle(f"{spaltenname(sp)}{nr}", wert, stil, formel))
        teile.append("</row>")
    teile.append("</sheetData>")
    if autofilter:
        teile.append(f'<autoFilter ref="{autofilter}"/>')
    if validierungen:
        teile.append(f'<dataValidations count="{len(validierungen)}">')
        for bereich, werte, titel, hinweis in validierungen:
            teile.append(
                f'<dataValidation type="list" sqref="{bereich}" allowBlank="1" '
                f'showInputMessage="1" showErrorMessage="0" promptTitle="{esc(titel)}" '
                f'prompt="{esc(hinweis)}">'
                f'<formula1>&quot;{esc(werte)}&quot;</formula1></dataValidation>'
            )
        teile.append("</dataValidations>")
    teile.append("</worksheet>")
    # Der eingefrorene Bereich muss VOR sheetData stehen.
    if gefroren:
        kopf = (
            '<sheetViews><sheetView workbookViewId="0">'
            f'<pane ySplit="{gefroren}" topLeftCell="A{gefroren+1}" activePane="bottomLeft" state="frozen"/>'
            "</sheetView></sheetViews>"
        )
        teile.insert(2, kopf)
    return "".join(teile)


# Stile: 0 normal · 1 Kopfzeile · 2 Titel · 3 Zwischentitel · 4 umbrechend
STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="5">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="16"/><color rgb="FF1D3557"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FF1D3557"/><name val="Calibri"/></font>
<font><sz val="11"/><color rgb="FF6B7280"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1D3557"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2"><border/><border><bottom style="thin"><color rgb="FFB9BFC9"/></bottom></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
</styleSheet>"""

# --- Blatt 1: Anleitung ----------------------------------------------------
zeilen1 = []
for text, art in ANLEITUNG:
    stil = {"titel": 2, "kopf": 3, "text": 0}[art]
    zeilen1.append({"zellen": [("", 0, False), (text, stil, False)]})

# --- Blatt 2: Testkatalog --------------------------------------------------
zaehler = {}
katalog = []
for bereich, ablauf, erwartet in K:
    zaehler[bereich] = zaehler.get(bereich, 0) + 1
    katalog.append((f"{bereich}-{zaehler[bereich]:02d}", bereich, ablauf, erwartet))

zeilen2 = [{"zellen": [(t, 1, False) for t in
            ["Nr", "Bereich", "Ablauf", "Erwartet", "Ergebnis", "Befund-Nr.", "Bemerkung"]]}]
for nr, bereich, ablauf, erwartet in katalog:
    zeilen2.append({"hoch": True, "zellen": [
        (nr, 0, False), (bereich, 0, False), (ablauf, 0, False), (erwartet, 0, False),
        ("", 0, False), ("", 0, False), ("", 0, False)]})

# --- Blatt 3: Protokoll ----------------------------------------------------
KOPF3 = ["Nr", "Bereich", "Testfall-Nr. / Seite", "Was getan (nachstellbar)", "Erwartet",
         "Beobachtet", "Bewertung", "Schwere", "Gerät / Browser", "Tester", "Datum",
         "Status", "Bearbeitung / Antwort", "Commit"]
zeilen3 = [{"zellen": [(t, 1, False) for t in KOPF3]}]
zeilen3.append({"hoch": True, "zellen": [
    (1, 0, False), ("RAP", 0, False), ("RAP-08", 0, False),
    ("Beispielzeile: Als Peter im Rapport 2026-0004 bei der Position „Beratung“ den Timer gestartet, dann bei „Reisezeit“ ebenfalls.", 0, False),
    ("Meldung, dass an diesem Rapport schon ein Timer läuft.", 0, False),
    ("Meldung sprach von einem anderen Rapport.", 0, False),
    ("Fehler", 0, False), ("mittel", 0, False), ("iPhone 17 / Safari", 0, False),
    ("Peter", 0, False), (HEUTE, 0, False), ("", 0, False),
    ("← Beispielzeile: bitte überschreiben oder löschen", 5, False), ("", 0, False)]})
for i in range(2, 301):
    zeilen3.append({"zellen": [(i, 0, False)] + [("", 0, False)] * 13})

# --- Blatt 4: Bereiche -----------------------------------------------------
zeilen4 = [{"zellen": [("Kürzel", 1, False), ("Was dazugehört", 1, False)]}]
for kuerzel, was in BEREICHE:
    zeilen4.append({"zellen": [(kuerzel, 0, False), (was, 0, False)]})

# --- Blatt 5: Übersicht ----------------------------------------------------
def f(formel):
    return (formel, 0, True)

zeilen5 = [
    {"zellen": [("Stand der Bearbeitung", 2, False)]},
    {"zellen": [("Zählt automatisch aus den Blättern „Protokoll“ und „Testkatalog“.", 5, False)]},
    {"zellen": [("", 0, False)]},
    {"zellen": [("Testkatalog", 3, False), ("", 0, False)]},
    {"zellen": [("Abläufe total", 0, False), (len(katalog), 0, False)]},
    {"zellen": [("ok", 0, False), f('COUNTIF(Testkatalog!$E$2:$E$400,"ok")')]},
    {"zellen": [("Befund", 0, False), f('COUNTIF(Testkatalog!$E$2:$E$400,"Befund")')]},
    {"zellen": [("übersprungen", 0, False), f('COUNTIF(Testkatalog!$E$2:$E$400,"übersprungen")')]},
    {"zellen": [("noch offen", 0, False), f('B5-B6-B7-B8')]},
    {"zellen": [("", 0, False)]},
    {"zellen": [("Befunde", 3, False), ("", 0, False)]},
    {"zellen": [("total", 0, False), f("COUNTA(Protokoll!$D$3:$D$302)")]},
    {"zellen": [("", 0, False)]},
    {"zellen": [("Nach Bewertung", 3, False), ("", 0, False)]},
]
for wert in ["Fehler", "Verbesserung", "Frage", "Gefällt"]:
    zeilen5.append({"zellen": [(wert, 0, False), f(f'COUNTIF(Protokoll!$G$3:$G$302,"{wert}")')]})
zeilen5.append({"zellen": [("", 0, False)]})
zeilen5.append({"zellen": [("Nach Schweregrad", 3, False), ("", 0, False)]})
for wert in ["blockierend", "hoch", "mittel", "gering"]:
    zeilen5.append({"zellen": [(wert, 0, False), f(f'COUNTIF(Protokoll!$H$3:$H$302,"{wert}")')]})
zeilen5.append({"zellen": [("", 0, False)]})
zeilen5.append({"zellen": [("Nach Status", 3, False), ("", 0, False)]})
for wert in ["offen", "in Arbeit", "behoben", "verworfen", "Rückfrage"]:
    zeilen5.append({"zellen": [(wert, 0, False), f(f'COUNTIF(Protokoll!$L$3:$L$302,"{wert}")')]})
zeilen5.append({"zellen": [("", 0, False)]})
zeilen5.append({"zellen": [
    ("Noch offen und blockierend", 3, False),
    f('COUNTIFS(Protokoll!$H$3:$H$302,"blockierend",Protokoll!$L$3:$L$302,"offen")')]})

KUERZEL = ",".join(k for k, _ in BEREICHE)

BLAETTER = [
    ("Anleitung", blatt(zeilen1, breiten=[3, 118])),
    ("Testkatalog", blatt(
        zeilen2, breiten=[10, 9, 62, 62, 14, 11, 34], gefroren=1,
        autofilter="A1:G1",
        validierungen=[
            ("E2:E400", "ok,Befund,übersprungen", "Ergebnis",
             "ok = wie erwartet · Befund = weicht ab · übersprungen = nicht getestet"),
            ("B2:B400", KUERZEL, "Bereich", "Kürzel aus dem Blatt „Bereiche“"),
        ])),
    ("Protokoll", blatt(
        zeilen3,
        breiten=[5, 9, 18, 58, 40, 40, 14, 13, 18, 10, 11, 12, 40, 12],
        gefroren=1,
        validierungen=[
            ("B2:B302", KUERZEL, "Bereich", "Kürzel aus dem Blatt „Bereiche“"),
            ("G2:G302", "Fehler,Verbesserung,Frage,Gefällt", "Bewertung",
             "Fehler, Verbesserung, Frage oder Gefällt"),
            ("H2:H302", "blockierend,hoch,mittel,gering", "Schweregrad",
             "blockierend, hoch, mittel oder gering"),
            ("L2:L302", "offen,in Arbeit,behoben,verworfen,Rückfrage", "Status",
             "Wird bei der Bearbeitung gesetzt – bitte leer lassen"),
        ])),
    ("Bereiche", blatt(zeilen4, breiten=[10, 78], gefroren=1)),
    ("Übersicht", blatt(zeilen5, breiten=[34, 14])),
]

# ---------------------------------------------------------------------------
# Datei schreiben
# ---------------------------------------------------------------------------
sheets = "".join(
    f'<sheet name="{esc(name)}" sheetId="{i+1}" r:id="rId{i+1}"/>'
    for i, (name, _) in enumerate(BLAETTER)
)
workbook = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    f"<sheets>{sheets}</sheets></workbook>"
)
rels = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + "".join(
        f'<Relationship Id="rId{i+1}" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
        f'Target="worksheets/sheet{i+1}.xml"/>'
        for i in range(len(BLAETTER))
    )
    + f'<Relationship Id="rId{len(BLAETTER)+1}" '
    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" '
    'Target="styles.xml"/></Relationships>'
)
inhalte = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + "".join(
        f'<Override PartName="/xl/worksheets/sheet{i+1}.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        for i in range(len(BLAETTER))
    )
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    "</Types>"
)
wurzel_rels = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" '
    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
    'Target="xl/workbook.xml"/></Relationships>'
)

with zipfile.ZipFile(ZIEL, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", inhalte)
    z.writestr("_rels/.rels", wurzel_rels)
    z.writestr("xl/workbook.xml", workbook)
    z.writestr("xl/_rels/workbook.xml.rels", rels)
    z.writestr("xl/styles.xml", STYLES)
    for i, (_, xml) in enumerate(BLAETTER):
        z.writestr(f"xl/worksheets/sheet{i+1}.xml", xml)

je_bereich = {}
for b, _, _ in K:
    je_bereich[b] = je_bereich.get(b, 0) + 1
print(f"geschrieben: {ZIEL}")
print(f"{len(K)} Abläufe in {len(je_bereich)} Bereichen")
print("  " + " · ".join(f"{b} {n}" for b, n in sorted(je_bereich.items())))
