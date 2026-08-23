---
title: "ArcoTime – Projektdokumentation"
subtitle: "Smart planen. Besser arbeiten."
date: "Stand: 23. August 2026"
author: "Arcos Informatik GmbH · für die Arcos Group"
lang: de-CH
toc: true
toc-title: "Inhalt"
---

![](bilder/arcotime-logo.png){width=1.2in}

## 1. Überblick

ArcoTime ist eine Zeiterfassungs- und Auftragsanwendung für Handwerk, Dienstleistung und KMU. Sie deckt den Arbeitsalltag von der Anfrage über den Auftrag und den Arbeitsrapport bis zum Buchhaltungsexport ab – für Betriebe, die unterwegs arbeiten.

Die Anwendung ist als Software-as-a-Service mit echter Mandantenfähigkeit aufgebaut: mehrere Organisationen nutzen dieselbe Installation, ohne gegenseitigen Datenzugriff. **Seit dem 17. August 2026 ist ArcoTime im Verkauf** – mit Selbstregistrierung, Zahlungsabwicklung über Stripe und einem Schaufenster auf arcocloud.ch. Es gibt kein „vor dem Livegang" mehr; jede Änderung passiert im Betrieb. Betrieben werden zurzeit zwei Mandanten: die Arcos Group selbst und ein Demo-Mandant für Vorführung und Schulung.

**Kernnutzen**

- **Ein System statt drei:** Zeiterfassung, Kundenverwaltung und Anfragen-Pipeline in einer Anwendung statt in separaten Excel-Listen oder Tools.

- **Belegbar & exportierbar:** jede erfasste Stunde ist einem Auftrag, einem Artikel und einem Preis-Schnappschuss zugeordnet und lässt sich direkt fürs Buchhaltungssystem (Comatic) exportieren.

- **Durchgängige Usability:** wiederkehrende Abläufe (neuer Kunde, neues Projekt) lassen sich aus jedem betroffenen Formular heraus erledigen, ohne die Seite zu verlassen.

- **Aktive statt passive Erinnerungen:** fällige Wiedervorlagen melden sich per Badge in der Navigation und per täglicher E-Mail, nicht nur auf einer Übersichtsseite, die man aktiv öffnen müsste.

## 2. Technologie & Architektur

ArcoTime setzt bewusst auf einen schlanken, modernen Stack ohne unnötige Abhängigkeiten -- wartbar durch eine Einzelperson, aber produktionstauglich.

**Stack im Überblick**

  ---------------------- --------------------------------------------------------------
  **Frontend/Backend**   Next.js 16 (App Router), React 19, TypeScript

  **Styling**            Tailwind CSS v4

  **Datenbank & Auth**   Supabase (PostgreSQL, Row-Level-Security, Auth, Storage)

  **Hosting**            Vercel -- automatisches Deployment bei jedem Push auf GitHub

  **Excel-Export**       exceljs

  **Drag & Drop**        \@dnd-kit/core (Anfragen-Kanban-Board)

  **E-Mail-Versand**     nodemailer über Hostpoint-SMTP
  ---------------------- --------------------------------------------------------------

**Architekturprinzipien**

- **Server Actions statt klassischer REST-API:** Formulare rufen direkt asynchrone Server-Funktionen auf, die serverseitig laufen und typsicher mit dem Frontend verbunden sind.

- **Server- und Client-Komponenten getrennt:** Datenabfragen laufen serverseitig (schnell, sicher); nur wo Interaktivität nötig ist (Formulare, Timer, Kanban-Board), kommt eine Client-Komponente zum Einsatz.

- **Row-Level-Security als zentrale Schutzschicht:** jede Tabelle ist per Datenbank-Policy auf die eigene Organisation begrenzt -- ein Programmierfehler im Anwendungscode kann keine fremden Daten offenlegen, weil die Datenbank selbst die Grenze zieht.

- **Service-Role-Client nur dort, wo nötig:** ein separater, klar gekennzeichneter Client mit vollem Datenbankzugriff (unter Umgehung von RLS) kommt ausschliesslich in serverseitigen Funktionen zum Einsatz, die das brauchen -- Mitarbeitenden-Einladung und der Wiedervorlagen-Reminder, der ohne Nutzer-Login läuft.

## 3. Mandantenfähigkeit & Sicherheit

**Organisationen**

Jede Mitarbeitende gehört zu genau einer Organisation. Sämtliche fachlichen Tabellen (Kunden, Projekte, Zeiteinträge, Anfragen, Dokumente, Einstellungen) tragen eine Organisations-Referenz und sind per Row-Level-Security so abgesichert, dass ein Datenbank-Query grundsätzlich nur die eigenen Daten zurückgeben kann -- unabhängig davon, was die Anwendung anfragt.

Die Isolation wurde mit einer eigenen zweiten Test-Organisation gezielt geprüft, bevor produktive Daten erfasst wurden.

**Authentifizierung & Einladung**

- **Login:** Supabase Auth mit E-Mail/Passwort.

- **Passwort-Reset:** regulärer Supabase-Flow über eine eigene Bestätigungsseite.

- **Mitarbeitende einladen:** Admins laden neue Mitarbeitende per E-Mail-Adresse ein; das Konto entsteht automatisch beim ersten Klick auf den Einladungslink.

**Sicherheitsfix: Einladungslinks & E-Mail-Sicherheitsscanner**

In der Praxis zeigte sich, dass Einladungs- und Reset-Links bei Empfang über Microsoft 365 als „ungültig" gemeldet wurden, obwohl sie nie angeklickt worden waren. Ursache: Microsofts Sicherheitsfunktion „Safe Links" ruft E-Mail-Links automatisch im Hintergrund auf, um sie auf Schadsoftware zu prüfen -- dabei wird der einmalig gültige Supabase-Token verbraucht, bevor die Person selbst klickt.

Behoben durch eine eigene Zwischenseite (/link-bestaetigen): Der Link führt zunächst auf eine Seite mit einem Bestätigungs-Button; der eigentliche Token-Austausch passiert erst beim expliziten Klick der Person, nicht automatisch beim Laden der Seite. Automatisierte Scanner rufen Seiten ab, simulieren aber keine Klicks -- der Token bleibt dadurch bis zum echten Klick gültig.

**Backup-Strategie**

ArcoTime läuft aktuell auf dem Supabase Free-Plan (kein automatisches Backup durch den Anbieter). Als Ausgleich existiert ein eigenes Backup-Skript (scripts/backup-datenbank.js), das sämtliche fachlichen Tabellen als JSON sowie alle Dateien aus der Dokumentenablage lokal sichert. Bewusst ausgenommen sind Login-Daten (auth.users) -- hierfür wird stattdessen Zwei-Faktor-Authentifizierung auf dem Supabase-Konto selbst empfohlen. Ein Wechsel auf den Supabase-Pro-Plan (mit automatischem tägl. Backup) ist vorgesehen, sobald produktive Kundenorganisationen hinzukommen.

## 4. Module im Detail

### 4.1 Zeiterfassung

Herzstück der Anwendung. Mitarbeitende erfassen Zeit entweder nachträglich (Datum, Dauer) oder live per Timer.

- **Timer ist persistent:** läuft serverseitig weiter, auch wenn der Browser geschlossen wird -- kein Verlust der laufenden Zeit.

- **Preis-Snapshot:** der zum Zeitpunkt der Erfassung gültige Preis des Artikels wird im Zeiteintrag festgeschrieben; spätere Preisänderungen wirken sich nicht auf bereits erfasste Einträge aus.

- **Automatischer Beschreibungs-Präfix:** abhängig vom erfassenden Mitarbeitenden.

- **Eigene Einträge-Liste:** mit Zeitraum-Filter direkt auf der Zeiterfassungsseite.

### 4.2 Adressen, Standorte und Aufträge

Die Kette ist dreistufig: **Adresse → Standort → Auftrag → Rapport.**

**Adressen** sind das Adressbuch. Es hält Kunden *und* Adressen, an die kein Auftrag geht – Eigentümer, Verwaltungen, Architekten, Behörden. Das Häkchen „ist Kunde" entscheidet, ob ein Eintrag in der Auswahl eines Auftrags erscheint. Die Liste bietet drei Sichten: Alle, nur Kunden, nur Adressen. Adress-Autofill über ein PLZ-Verzeichnis.

**Standorte** sind die Adressen eines Kunden – die Liegenschaft, die Filiale, die Baustelle. Ein Standort ist eine **Postadresse und nichts weiter**: sieben Felder, dazu die Markierung „wird beim Auftrag vorgeschlagen" und das Häkchen „aktiv" für die Stilllegung. Er trägt seinen Kunden als Spalte; ein Verkauf innerhalb der Organisation ist ein Wechsel dieser Spalte, und die Historie zieht mit, weil Aufträge und Rapporte am Standort hängen.

Die Ebene lässt sich je Betrieb ein- und ausschalten. Ausgeschaltet ist sie unsichtbar, die Daten stimmen trotzdem: Jeder Kunde hat still eine Adresse aus seinem Kundenstamm, und jeder Auftrag hängt daran. Der Satz, an dem sich jede Maske messen lässt: **Die Ortsebene gibt einem Betrieb genau zwei Dinge – mehrere Adressen je Kunde und Auswertungen je Adresse. Alles andere ist mit und ohne sie identisch.**

**Aufträge** tragen alles, was ein Einsatz braucht: Kunde (wer bestellt und schuldet), Einsatzort (wo gearbeitet wird), Anfahrt, Zugang, Projektleitung, Team, Kostenstelle, Belegnummer und die **zusätzlichen Adressen mit Rolle** – Eigentümer, Verwaltung, Mieter, Hauswart, Architekt, Bauleitung, Subunternehmer, Behörde.

Ein Auftrag hat damit **zwei Eltern**, und das ist Absicht: Dieselbe Liegenschaft kann einen Auftrag mit der Verwaltung und einen mit dem Eigentümer tragen. Kunden- und Standortauswertung können deshalb auseinanderfallen, ohne dass eine falsch ist.

Dass die zusätzlichen Adressen am Auftrag hängen und nicht am Standort, hat zwei Gründe. Ein Betrieb ohne Ortsebene käme sonst nie an sie heran – und der Rapport müsste zwei Listen zusammenführen, was über kurz oder lang zwei Wahrheiten wären.

**Die Masken** von Adressen und Aufträgen folgen einem gemeinsamen Muster: Liste links, Detail rechts, alles Nebensächliche in Reitern, und die Seite selbst scrollt nicht. Gescrollt wird nur in Liste und Detailfläche. Der Grund ist praktisch: Wer beim Arbeiten unterbrochen wird, schaut danach nicht auf einen Bildschirm voller Historie, sondern sieht ohne Scrollen, wo er ist.

### 4.3 Artikelstamm

Zentrale Liste alles dessen, was in einer Rapportposition stehen kann – **Arbeit, Material, Spesen, Anfahrt** – mit Einheit, Preis, Konto, MWSt-Code und den Häkchen „zählt als Arbeitszeit", „Rabatt zulässig" und „Anreise zum Kunden". Basis für den Preis-Schnappschuss in der Zeiterfassung.

Die Liste hiess bis August 2026 „Dienstleistungen". Der Name war falsch, seit sie auch Mengenartikel hält: Eine Dose Farbe ist keine Dienstleistung. „Artikel" ist im ERP-Bereich das übliche Wort und deckt beides.

**Artikelklassen** gruppieren die Artikel und tragen zwei Aufgaben: den Rabatt je Klasse und die Gruppierung der Auswertungen. Dazu den Schalter **„Menge summieren"**: Bei „Arbeit" ja, dort sind es immer Stunden. Bei „Material" in der Regel nein – Farbe in Liter, Pinsel in Stück, Vlies in m²; eine Summe darüber wäre bedeutungslos, und man sieht es der Zahl nicht an. Der Widerspruch wird in beide Richtungen abgelehnt: Ein Artikel mit abweichender Einheit passt nicht in eine summierende Klasse, und der Schalter lässt sich nicht einschalten, solange die Klasse gemischte Einheiten führt.

### 4.4 Anfragenverwaltung (Kanban)

Bildet den Vertriebsprozess ab: von der eingehenden Kundenanfrage bis zum erledigten Auftrag.

- **Kanban-Board:** Anfragen als Karten, per Drag & Drop zwischen Status-Spalten verschiebbar.

- **Zuweisung:** jede Anfrage kann einer bestimmten Person zugewiesen werden.

- **Wiedervorlagen:** optionales Datum, ab dem sich die Anfrage aktiv meldet (siehe Kapitel 6). Das Datumsfeld erscheint erst nach Klick auf „+ Datum setzen" -- bewusst so gelöst, damit nie versehentlich ein Datum gesetzt wird.

- **Kanäle & Prioritäten:** frei konfigurierbar unter Einstellungen, nicht hart codiert.

### 4.5 Auswertungen & Kalender

Auswertung erfasster Zeit nach Tag, Woche oder Monat mit Filtern. Die Kalenderansicht (Monatsübersicht) zeigt pro Tag nicht mehr nur eine Stunden-/CHF-Summe, sondern eine farbige Mini-Liste -- analog einem klassischen Kalendertool:

- **Zeiteinträge:** eine Zeile pro Mitarbeiter:in mit Aktivität an diesem Tag, in der jeweils eigenen Farbe, mit Stundensumme.

- **Anfragen:** eine Zeile pro fälliger Wiedervorlage (nicht erledigte Anfragen), farbig nach zugewiesener Person, mit Direktlink auf die Anfrage.

- **Legende:** zeigt alle im aktuellen Monat sichtbaren Personen mit ihrer Farbe.

Admins können zusätzlich nach Mitarbeitenden filtern und sehen alle Einträge; alle anderen sehen bei Zeiteinträgen nur die eigenen (Anfragen sind wie im Kanban-Board für alle sichtbar).

### 4.6 Export

Admin-Funktion: Auswahl offener (nicht exportierter) Zeiteinträge und Export als Excel-Datei im für das Buchhaltungssystem Comatic passenden Format. Jeder Export erhält eine Belegnummer je Projekt, die danach automatisch weiterläuft.

### 4.7 Dokumentenablage

Datei-Uploads (Storage über Supabase) lassen sich an Kunden, Projekte, Anfragen, Zeiteinträge und Mitarbeitende hängen, kategorisiert über frei konfigurierbare Dokument-Kategorien.

### 4.8 Mitarbeitende

Stammdaten inkl. E-Mail-Adresse (Grundlage für Einladung und den Wiedervorlagen-Reminder), Rollen (Admin/Mitarbeitende) und eigene Dokumentenablage je Person.

- **Farbe:** jede Person hat eine eigene Farbe (automatisch aus einer festen Palette vergeben, von Admins frei überschreibbar) -- Grundlage für die Farbcodierung im Kalender (siehe 4.5).

### 4.9 Einstellungen (Admin)

Zentrale Konfiguration statt hart codierter Werte im Programmcode: Rabattsätze, Anfrage-Kanäle, Anfrage-Prioritäten und Dokument-Kategorien lassen sich hier verwalten, ohne dass eine Codeänderung nötig wäre.

### 4.10 Hilfe / Benutzeranleitung

Eine vollständige Benutzeranleitung ist direkt in der Anwendung integriert -- kein separates PDF, das schnell veraltet. Wichtig für den Verkauf an Kunden: neue Benutzer finden sich selbstständig zurecht, ohne dass für jede Frage ein Support-Kontakt nötig wäre.

- **Stichwortsuche:** durchsucht Titel, Kategorie, Stichworte und den vollständigen Artikeltext.

- **Kontextsensitiv:** ein \"❓ Hilfe\"-Link in der Navigation öffnet je nach aktueller Seite automatisch den passenden Artikel -- auf der Zeiterfassung landet man direkt bei der Zeiterfassungs-Hilfe, ohne suchen zu müssen.

- **Druckfunktion:** jeder Artikel einzeln sowie die komplette Anleitung als ein zusammenhängendes, druckfreundliches Dokument (ein Artikel je Seite).

- **13 Artikel:** alle Module abdeckend, mit Screenshots aus der echten Anwendung an den wichtigsten Stellen.

## 5. Durchgängige Schnellerfassung & Dubletten-Schutz

Damit die tägliche Arbeit nicht durch Seitenwechsel unterbrochen wird, lässt sich aus jedem betroffenen Formular heraus ein fehlender Kunde oder ein fehlendes Projekt direkt angelegt werden -- als durchgängiges Prinzip, nicht als Einzelfall-Lösung für eine bestimmte Maske.

  --------------------------------------------------------------------------------------------
  **Formular**                **Kann direkt neu anlegen**
  --------------------------- ----------------------------------------------------------------
  Neue Anfrage                Kunde, Projekt (inkl. verschachtelt: Kunde für dieses Projekt)

  Neues/bestehendes Projekt   Kunde

  Zeiterfassung               Projekt (inkl. verschachtelt: Kunde für dieses Projekt)
  --------------------------------------------------------------------------------------------

**Technische Umsetzung**

Die Schnellerfassung ist als wiederverwendbarer React-Hook umgesetzt (useKundeSchnellErstellen, useProjektSchnellErstellen), der ein Formular als Modal-Dialog liefert. Ein Formular kann so mehrfach im selben Formular verschachtelt werden -- etwa „neues Projekt" innerhalb von „neue Anfrage", das seinerseits wieder „neuer Kunde" enthalten kann, falls auch der Kunde noch fehlt.

**Dubletten-Warnung**

Damit die Schnellerfassung nicht zu versehentlichen doppelten Kunden oder Projekten führt -- insbesondere wenn mehrere Mitarbeitende gleichzeitig arbeiten -- prüft die Anwendung beim Anlegen serverseitig gegen den aktuellen Datenbankstand, ob bereits ein Eintrag mit demselben Namen existiert.

- **Prüfung läuft gegen die Datenbank, nicht den Browser:** greift dadurch auch, wenn zwei Personen zur selben Zeit an unterschiedlichen Rechnern arbeiten.

- **Bei einem Treffer:** Auswahl zwischen „Bestehenden verwenden" (übernimmt den gefundenen Datensatz) oder „Trotzdem neu anlegen" (bewusste Dublette, z.B. gleicher Name, anderer Kunde).

## 6. Aktive Benachrichtigungen

Zwei Ereignisse lösen aktiv eine Benachrichtigung aus, statt sich nur passiv auf einer Seite zu zeigen, die man ohnehin öffnen müsste: eine fällige Wiedervorlage und eine neue Zuweisung.

### 6.1 Wiedervorlagen

Ursprünglich meldete sich eine fällige Wiedervorlage nur passiv über ein Widget auf der Übersichtsseite -- wer diese nicht aktiv öffnete, verpasste den Termin. Ergänzt wurden deshalb drei aktive Bausteine.

- **Badge in der Navigation:** ein roter Zähler neben dem Menüpunkt „Anfragen" zeigt die Anzahl fälliger, der eigenen Person zugewiesener Wiedervorlagen -- sichtbar, sobald man irgendwo in der Anwendung eingeloggt ist.

- **Täglicher E-Mail-Reminder:** eine automatische Zusammenfassung per E-Mail, versendet um 07:30 Uhr Schweizer Zeit an jede Person mit mindestens einer fälligen Wiedervorlage, mit Direktlinks zur jeweiligen Anfrage.

- **Automatischer Spaltenwechsel im Kanban-Board:** eine fällige, noch nicht erledigte Anfrage wechselt zeitgleich mit dem Mailversand automatisch in die Spalte „Wiedervorlage" -- unabhängig davon, ob sie zugewiesen ist. Bereits dort liegende Anfragen werden nicht nochmals angefasst, damit eine manuelle Rückverschiebung durch Mitarbeitende nicht beim nächsten Lauf wieder überschrieben wird.

  ----------------------- -------------------------------------------------------------------------------------
  **Auslöser**            Vercel Cron Job (serverlose, zeitgesteuerte Funktion)

  **Versandzeit**         07:30 Uhr Schweizer Ortszeit, ganzjährig (Sommer-/Winterzeit-Umschaltung eingebaut)

  **Versandweg**          Hostpoint-SMTP über nodemailer

  **Absender**            reminder@arcocloud.ch

  **Empfänger je Mail**   eine Person -- nur eigene, zugewiesene, noch nicht erledigte Wiedervorlagen

  **Absicherung**         eigener Geheimschlüssel (CRON_SECRET); Route läuft ohne Login-Session
  ----------------------- -------------------------------------------------------------------------------------

> *Vercel Cron Jobs kennen nur feste UTC-Zeiten ohne automatische Sommerzeit-Anpassung. Damit der Versand ganzjährig exakt um 07:30 Uhr Schweizer Zeit bleibt, sind zwei Cron-Zeitpunkte konfiguriert (für Winter- und Sommerzeit); die Route selbst prüft die aktuelle Zürcher Ortszeit und überspringt den jeweils falschen Aufruf ohne Versand.*

### 6.2 Zuweisung einer Anfrage

Wird eine Anfrage bei der Erfassung direkt zugewiesen oder die Zuweisung im Bearbeiten-Formular geändert, erhält die neu zugewiesene Person automatisch eine E-Mail -- mit Titel der Anfrage, direktem Link darauf und dem Namen der Person, die zugewiesen hat.

- **Selbstzuweisung löst keine Mail aus:** übernimmt sich jemand eine noch nicht zugewiesene Anfrage selbst (Button „Übernehmen"), wäre eine Benachrichtigung an sich selbst über die eigene Aktion nutzlos.

- **Fehlertolerant:** ein SMTP-Ausfall verhindert nie das Speichern der Anfrage selbst -- ein Versandfehler wird nur geloggt.

### 6.3 Offene Rapporte vom Vortag

Ein Arbeitsrapport, der offen bleibt, zählt nirgends: weder in den Auswertungen noch im Export noch in der Zeiterfassung (siehe 10.11). Er ist damit nicht bloss unordentlich, sondern unverrechnete Arbeit -- und genau das fällt niemandem auf, weil an der Stelle schlicht nichts steht. Ein vergessener Rapport ist stiller als ein vergessener Zeiteintrag.

Deshalb geht im selben täglichen Lauf eine Erinnerung an die Person, die am Rapport als ausführend eingetragen ist. Sie darf ihn abschliessen und weiss als Einzige, ob noch etwas fehlt. Die Mail listet die betroffenen Rapporte mit Kunde, Projekt und Datum; was länger als einen Tag liegt, ist hervorgehoben und nennt die Zahl der Tage. Ein roter Zähler neben „Rapporte" zeigt dieselbe Zahl dauerhaft in der Navigation.

Erinnert wird nur an Rapporte mit einem Datum vor heute. Ein Einsatz von heute läuft möglicherweise noch, und eine Mahnung dafür wäre Lärm -- Lärm hört man nach zwei Wochen nicht mehr. Deaktivierte Konten bekommen keine Post; ihre offenen Rapporte bleiben stehen, denn dort hilft nur ein Wechsel der verantwortlichen Person, und das ist eine Entscheidung des Büros.

Beide Tagesmeldungen teilen sich bewusst einen Lauf und dieselbe Adresse. Ein zweiter Cron-Eintrag hätte das Kontingent des Hosting-Tarifs beansprucht und den Sommer-/Winterzeit-Abgleich ein zweites Mal gebraucht; eine Meldung am Morgen ist ohnehin genug. Der frühe Ausstieg bei null Wiedervorlagen musste dafür weichen -- sonst wäre die Rapport-Erinnerung an den meisten Tagen nie gelaufen.

## 7. Betrieb & Wartung

**Deployment**

Jeder Push auf den main-Branch des GitHub-Repositories löst automatisch ein neues Deployment auf Vercel aus. Es gibt keinen manuellen Deployment-Schritt.

**Umgebungsvariablen**

Zwei getrennte Sätze: lokal in .env.local (nie ins Repository committet) und produktiv in den Vercel-Projekteinstellungen. Eine Vorlage ohne echte Werte liegt als .env.local.example im Repository.

  ----------------------------------------------------------------------------------------------------------------------------------
  **Variable**                                             **Zweck**
  -------------------------------------------------------- -------------------------------------------------------------------------
  NEXT_PUBLIC_SUPABASE_URL / \_ANON_KEY                    Verbindung zur Datenbank (öffentlich, RLS-geschützt)

  SUPABASE_SERVICE_ROLE_KEY                                Voller Datenbankzugriff für Mitarbeitenden-Einladung & Reminder-Cron

  SMTP_HOST / \_PORT / \_USER / \_PASSWORD / \_FROM        E-Mail-Versand des Wiedervorlagen-Reminders

  APP_URL                                                  Basis-URL für Links in System-Mails

  CRON_SECRET                                              Schützt die Reminder-Route gegen fremde Aufrufe

  STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY   Stripe-API-Zugang für Checkout (Sandbox, solange nicht live geschaltet)

  STRIPE_PRICE_MONATLICH / STRIPE_PRICE_JAEHRLICH          Die zwei Stripe-Price-IDs (Stufenpreise) für Monats-/Jahresabo

  STRIPE_WEBHOOK_SECRET                                    Signaturprüfung für eingehende Stripe-Webhook-Events
  ----------------------------------------------------------------------------------------------------------------------------------

**Backup**

Manuell auslösbar per npm run backup -- exportiert alle fachlichen Tabellen sowie die Dokumentenablage. Empfehlung: regelmässig ausführen und das Zielverzeichnis auf ein synchronisiertes Laufwerk (z.B. OneDrive) zeigen lassen, bis ein automatisches Backup (Supabase Pro) aktiv ist.

## 8. Lizenzmodul, Selbstregistrierung & Zahlungsabwicklung

Mit dem Verkaufsstart an externe Kunden kam ein vollständiges Lizenz- und Abrechnungsmodul hinzu: Interessenten können sich selbst online registrieren, Lizenzen wählen, bezahlen und sofort losstarten -- ohne dass Arcos manuell eingreifen muss. Für Ausnahmefälle (Rechnung/QR-Rechnung, Korrekturen) steht zusätzlich ein interner Plattform-Admin-Bereich zur Verfügung.

### 8.1 Preismodell

  -----------------------------------------------------------------------
  **Anzahl Benutzer**      **Preis pro Benutzer**
  ------------------------ ----------------------------------------------
  1--9                     CHF 15.00 / Monat · CHF 150.00 / Jahr

  10--19                   CHF 13.00 / Monat · CHF 130.00 / Jahr

  20 und mehr              CHF 11.00 / Monat · CHF 110.00 / Jahr
  -----------------------------------------------------------------------

Alle Preise exkl. MWST (Arcos Group ist MWST-pflichtig, MWST-Nr. CHE-116.097.916). Es gilt Volume-Pricing: die für die gewählte Gesamtanzahl erreichte Stufe gilt für alle Benutzer, nicht nur für die zusätzlichen (kein „Graduated Pricing"). Als „Benutzer" zählt jedes eingeladene Konto unabhängig von der tatsächlichen Nutzung, Admin-Konten eingeschlossen (maximal zwei Admin-Konten je Organisation).

Bestpreis-Garantie: Weil bei Volume-Pricing der Satz der erreichten Stufe für alle Lizenzen gilt, wäre eine kleinere Menge stellenweise teurer als eine grössere -- 9 Benutzer kosteten 135.00, 10 Benutzer nur 130.00. Die Registrierung rundet deshalb automatisch auf die günstigere Menge auf: Wer 9 Benutzer bestellt, erhält 10 Lizenzen zum tieferen Preis. Betroffen sind die Bestellmengen 9, 18 und 19. Niemand zahlt je mehr, als eine grössere Anzahl kosten würde.

#### 8.1.1 Zusatzmodule und Einführungspreis

Disposition: CHF 49.00 je Monat und Organisation, CHF 490.00 im Jahr -- unabhängig von der Anzahl Lizenzen. Zeitkonto: CHF 4.00 je Lizenz und Monat, CHF 40.00 im Jahr.

Die beiden Bezugsgrössen sind mit Absicht verschieden. Die Disposition bedient das Büro: Ein oder zwei Personen planen für alle, ihr Nutzen wächst nicht mit der Kopfzahl. Ein Zuschlag je Lizenz wäre bei einem Betrieb mit zwanzig Mitarbeitenden kaum zu begründen und ist der häufigste Grund, ein Modul abzulehnen. Das Zeitkonto dagegen führt für jede Person ein eigenes Konto mit Soll, Ist, Saldo und Ferien -- dort wächst der Nutzen mit der Kopfzahl, und der Zuschlag je Lizenz ist die ehrlichere Rechnung.

Wie bei der Basis kostet ein Jahresabo zehn Monatspreise; zwei Monate sind geschenkt. Eine Ausnahme für die Module wäre auf der Rechnung nicht zu erklären.

Einführungspreis: 15 Prozent Rabatt im ersten Jahr für alle Organisationen, die bis zum 31. Dezember 2026 buchen. Bewusst zeitlich begrenzt und nicht auf die ersten X Organisationen -- eine Frist ist überprüfbar und endet von selbst, während ein öffentlicher Zähler niemandem glaubwürdig ist. Abgerechnet wird der Rabatt über einen Stripe-Gutschein mit zwölf Monaten Laufzeit; in ArcoTime selbst ist dafür nichts hinterlegt.

Die Preise wurden am 16. August 2026 festgelegt. Grundlage war eine Kostenrechnung: Die feste Infrastruktur kostet rund 41 Franken im Monat (Vercel, Supabase, Domain), Stripe rund 3,4 Prozent des Umsatzes. Schon eine einzige zahlende Organisation deckt diese Kosten. Massgebend für die Höhe war deshalb nicht der Aufwand des Betriebs, sondern der Umfang der Anwendung und der Aufwand für Einführung, Support und Weiterentwicklung.

### 8.2 Selbstregistrierung (/registrieren)

Öffentlich erreichbare Seite, kein Login nötig. Der Ablauf: Anzahl Benutzer wählen (Preis pro Monat/Jahr wird live berechnet) → Abrechnungszyklus wählen → optional 30 Tage kostenlose Testphase aktivieren → Firmen- und Kontaktdaten eingeben → Weiterleitung zu Stripe Checkout.

- **Testphase:** 30 Tage, unabhängig von der Anzahl Lizenzen; das Zahlungsmittel wird bereits jetzt hinterlegt und nach Ablauf automatisch belastet -- 2 Tage vor Ablauf erhält die Organisation eine Erinnerungsmail.

- **Bezahlvorgang:** Stripe Checkout (gehostete, vorgefertigte Zahlungsseite), Zahlung per Karte oder TWINT. Klassische Rechnung/QR-Rechnung läuft ausserhalb von Stripe und wird von Arcos manuell im Plattform-Admin-Bereich freigeschaltet, sobald der Zahlungseingang geprüft ist.

- **Nach erfolgreicher Zahlung:** die Organisation sowie das erste Admin-Konto entstehen automatisch (siehe 8.3), die Person erhält eine Einladungs-Mail zur Passwortvergabe -- identisch zum normalen Einladungs-Flow.

### 8.3 Technischer Ablauf (Stripe Checkout + Webhook)

Die Organisation wird bewusst nicht bereits beim Absenden des Formulars angelegt, sondern erst, wenn Stripe die Zahlung tatsächlich bestätigt hat -- über einen Webhook, der unabhängig vom Browser der registrierenden Person läuft.

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Stripe-Ereignis**             **Auswirkung in ArcoTime**
  ------------------------------- ---------------------------------------------------------------------------------------------------------------------------------------------------
  checkout.session.completed      Legt Organisation + erstes Admin-Konto an (Einladungs-Mail wird versendet)

  invoice.paid                    Aktualisiert den nächsten Zahltermin, hebt eine evtl. Zahlungs-Sperre wieder auf

  invoice.payment_failed          Sperrt die Organisation erst, wenn Stripe alle automatischen Wiederholungsversuche aufgegeben hat -- informiert dann alle Admin-Konten per E-Mail

  customer.subscription.deleted   Setzt den Status auf „gekündigt"
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

- **Skalierung:** eine Aufstockung der Lizenzen ist sofort aktiv, Stripe berechnet und belastet die Differenz automatisch bis zum nächsten Zahltermin. Eine Reduktion wird erst zum nächsten Zahltermin wirksam, ohne Rückerstattung.

- **Kündigung:** beim Monatsabo jederzeit möglich, Zugriff bleibt bis zum Ende der bezahlten Periode; beim Jahresabo keine Rückerstattung bei vorzeitiger Kündigung.

### 8.4 Zugriffssperre

Ist der Status einer Organisation weder „aktiv" noch „test" (z.B. abgelaufene Testphase, fehlgeschlagene Zahlung, manuell pausiert oder gekündigt), werden alle Mitarbeitenden dieser Organisation automatisch auf eine eigene Sperrseite (/gesperrt) umgeleitet -- mit einer zum jeweiligen Grund passenden Nachricht und dem Kontakt zu Arcos. Platform-Admins sind von dieser Sperre ausgenommen, damit sie sich beim Beheben eines Problems nie selbst aussperren.

### 8.5 Plattform-Administration (nur Arcos)

Ein eigener, per Datenbank-Flag geschützter Bereich (/plattform), sichtbar nur für Arcos-Mitarbeitende mit Platform-Admin-Rechten -- unabhängig davon, welcher Kundenorganisation sie sonst zugeordnet sind. Ermöglicht das manuelle Anlegen von Organisationen, das Bearbeiten aller Abrechnungsfelder (Status, Lizenzen, Zyklus, Preis, Testphase, Zahltermin, Sperrgrund) für Korrekturen oder Kulanzfälle (z.B. Testphase manuell verlängern), das manuelle Freischalten bei Rechnungszahlung, sowie das organisationsübergreifende Bearbeiten von Personendaten und Reaktivieren deaktivierter Mitarbeitenden-Konten.

### 8.6 Demo-Mandant

Für Verkaufsdemos bei Interessenten existiert ein eigener, vollständig isolierter zweiter Mandant („Demo AG") mit realistischen Beispieldaten (Kunden, Projekte, Anfragen in allen Kanban-Status, Zeiteinträge) -- so lassen sich Demos zeigen, ohne produktive Arcos-Daten offenzulegen.

### 8.7 Domains, Absenderadressen und der Weg zum zweiten Produkt

Entscheid vom 16.08.2026. Die Arcos Group GmbH trennt drei Rollen auf drei Domains: arcos.ch ist die Firmenwebseite und verweist unter „Produkte" auf arcocloud.ch. arcocloud.ch ist das Schaufenster der Cloudprodukte -- je Produkt eine Seite mit Beschreibung, Preisen und einem Knopf, der in die Registrierung führt. arcotime.ch trägt das Produkt selbst: öffentliche Produktseite, Registrierung und Anwendung.

Der Kunde kauft gefühlt auf arcocloud.ch, abgeschlossen wird der Kauf aber in ArcoTime. Ein eigener Checkout auf Plattformebene lohnt sich erst, wenn eine Organisation zwei Produkte in einem Vorgang bucht; vorher verdoppelt er nur die Stellen, an denen eine Bestellung hängenbleiben kann.

Systemmails kommen von noreply@arcotime.ch, mit dem Anzeigenamen „ArcoTime" -- der Empfänger erkennt den Absender, ohne den Plattformnamen zu kennen. Bewusst nicht von arcos.ch: Dort läuft die persönliche Geschäftskorrespondenz über Microsoft 365, deren Zustellbarkeit soll nicht an der Reputation von Massen-Systemmails hängen. Jedes künftige Produkt sendet entsprechend von seiner eigenen Domain.

Die beiden Antwortwege sind getrennt: Mails, die von ArcoTime selbst kommen (Erinnerungen, Lizenzhinweise), tragen support@arcotime.ch als Antwortadresse. Mails, die eine Organisation an ihren Kunden schickt (Arbeitsrapport), tragen die Absenderadresse dieser Organisation. Hat sie keine hinterlegt, gibt es bewusst gar kein Reply-To -- ein Fallback auf den ArcoTime-Support würde die Antwort eines fremden Kunden bei Arcos abliefern statt beim Dienstleister, der den Rapport geschickt hat.

Ein zweites Produkt (geplant: ArcoFakt, ArcoImmo) braucht kein neues Konto. Bei Vercel entsteht im selben Team ein weiteres Projekt mit eigener Domain; abgerechnet wird nach Team-Mitgliedern, nicht nach Projekten. Bei Supabase entsteht im selben Konto ein weiteres Projekt mit eigener Datenbank; hier fallen die Fixkosten ein zweites Mal an, weil pro Projekt abgerechnet wird.

Offen und vor der ersten Zeile des zweiten Produkts zu entscheiden: ob die Produkte eine gemeinsame Identität teilen (ein Login, eine Organisation, ein Abo-Portal auf Plattformebene) oder je eine eigene Benutzerverwaltung führen. Nachrüsten hiesse, Konten produktiver Kunden zu migrieren. Was heute in die richtige Richtung zeigt: Organisation und Person haben stabile Kennungen, und jede Stripe-Zahlung trägt die Organisations-ID als Metadatum.

## 9. Erweiterungen aus der Testphase

Die folgenden Erweiterungen entstanden im August 2026 während der intensiven Testphase nach Fertigstellung von Version 1.0. Sie bilden Anforderungen ab, die sich erst im praktischen Einsatz zeigten.

### 9.1 Mengenartikel: Kilometer, Spesen und Material

Ursprünglich kannte das System nur eine Mengengrösse: die Dauer. Aus ihr entstanden Rechnungsbetrag, Auswertung und Exportmenge zugleich. Ein Kilometer oder eine Packung Kleinmaterial hat aber keine Dauer -- und darf vor allem nicht als Arbeitszeit zählen.

Jeder Artikel trägt das Kennzeichen „Zählt als Arbeitszeit":

- **Angehakt:** Erfassung über Von/Bis bzw. Dauer, fliesst in Stundenauswertungen ein.

- **Nicht angehakt:** Erfassung über eine Menge in der Einheit des Artikels (km, Stück, Pauschale). Die Position wird normal verrechnet und exportiert, erscheint aber in keiner Stundenauswertung.

Das Erfassungsformular schaltet automatisch um: Bei einem Mengenartikel verschwinden Von, Bis und der Timer, stattdessen erscheint ein Mengenfeld. Eine Datenbankregel stellt sicher, dass jeder Eintrag genau eine der beiden Grössen trägt.

### 9.2 Kundenpreise und Rabatte

Auf der Kundendetailseite gibt es einen eigenen Block „Preise & Rabatte" mit zwei Listen, sichtbar nur für Admins:

- **Abweichende Preise:** überschreiben den Katalogpreis eines Artikels für diesen Kunden.

- **Rabatt je Artikelklasse:** gilt für alle Artikel der Klasse -- auch für später neu angelegte. Deutlich pflegeleichter als ein Rabatt pro Artikel.

Zusätzlich lässt sich in den Stammdaten des Kunden ein Standardrabatt hinterlegen. Welcher Wert beim Erfassen vorgeschlagen wird, entscheidet sich in dieser Reihenfolge: Rabattsperre des Artikels, dann Klassenrabatt, dann Standardrabatt.

Manche Positionen sollen grundsätzlich rabattfrei bleiben, etwa Reisespesen. Dafür trägt jeder Artikel das Kennzeichen „Rabatt zulässig". Ist es nicht gesetzt, sind Teilrabatte gesperrt; 100 % bleibt möglich, damit die Position weiterhin als nicht verrechnet gebucht werden kann. Die Sperre wird serverseitig geprüft, auch beim Erledigen einer Anfrage.

### 9.3 Eingefrorene Werte statt rückwirkender Änderungen

Der Preis wurde schon immer beim Erfassen eingefroren. Der MWSt-Satz dagegen war nur über den Artikel referenziert: Eine Anpassung in den Stammdaten veränderte rückwirkend auch längst erfasste Einträge und bereits erzeugte Exporte vergangener Perioden -- buchhalterisch nicht haltbar.

Neu speichert jeder Zeiteintrag den beim Erfassen gültigen MWSt-Code samt Satz. Eine Änderung wirkt damit ausschliesslich auf künftige Einträge. Dasselbe Prinzip gilt für Preis, Rabatt und Kundenkonditionen: Stammdaten steuern die Erfassung, nicht die Vergangenheit. Ein einmal erzeugter Export bleibt dadurch reproduzierbar.

### 9.4 Kontrolle der Tagesarbeitszeit

Bisher liessen sich pro Person und Tag beliebig viele -- auch zeitlich überschneidende -- Stunden erfassen. Für die Fakturierung ist eine Überschneidung gelegentlich gewollt, etwa wenn zwei Kunden gleichzeitig betreut werden. Für Soll-Ist-Auswertungen je Mitarbeitendem machte es die Zahlen jedoch wertlos.

Zwei Stufen, beide pro Organisation unter Einstellungen konfigurierbar:

- **Hinweis beim Erfassen:** erscheint live im Formular, benennt die konkrete Überschneidung und zeigt die Tagessumme. Speichern bleibt ohne Zusatzklick möglich -- gewollte Doppelbelegungen sollen nicht bestraft werden. Standard: ab 10 Stunden.

- **Sperre beim Speichern:** verweigert den Eintrag serverseitig, auch beim Erledigen einer Anfrage. Standard: ab 24 Stunden, was physikalisch unmöglich und praktisch immer ein Tippfehler ist.

Mengenartikel und laufende Timer zählen dabei nicht mit.

### 9.5 Frei pflegbare Auswahllisten

Alle Auswahllisten unter Einstellungen -- Artikelklassen, Einheiten, MWSt-Codes, Rabattsätze, Anfrage-Kanäle, Prioritäten und Dokument-Kategorien -- lassen sich neu direkt in der Zeile bearbeiten, nicht mehr nur anlegen und deaktivieren. Auch die Sortierreihenfolge ist einstellbar; neue Einträge werden hinten angehängt.

Einheiten sind dabei neu hinzugekommen: Bis dahin waren nur Stunde und Pauschale fest im Code hinterlegt. Nicht mehr benötigte Werte werden weiterhin deaktiviert statt gelöscht, damit bestehende Datensätze lesbar bleiben.

## 10. Arbeitsrapporte, Disposition und Abwesenheiten

Mit der Testphase kam ein Bedarf dazu, den die reine Zeiterfassung nicht abdeckt: Ein Servicemonteur arbeitet beim Kunden vor Ort, erbringt dort mehrere Leistungen und braucht dafür einen zusammenhängenden Nachweis. Daraus sind der Arbeitsrapport und -- darauf aufbauend -- die Disposition entstanden.

### 10.1 Der Arbeitsrapport als Leistungsnachweis

Ein Rapport ist die Klammer um mehrere Zeiteinträge desselben Einsatzes. Er hat einen Kopf (Kunde, Projekt, Mitarbeitende Person, Datum, Bemerkung) und beliebig viele Positionen. Jede Position ist ein ganz normaler Zeiteintrag: sie wird verrechnet, exportiert und erscheint in den Auswertungen wie jeder andere Eintrag. Der Rapport erzeugt also keine Parallelwelt, sondern nur eine zusätzliche Sicht auf bestehende Daten.

Rapporte sind bewusst optional. Fernwartung, Büroarbeit oder eine telefonisch erledigte Anfrage werden weiterhin direkt in der Zeiterfassung erfasst.

Eine gestalterische Entscheidung mit Konsequenzen: Auf dem Rapport stehen keine Preise. Er ist ein Leistungsnachweis, keine Rechnung. Im B2B-Umfeld unterschreibt vor Ort in aller Regel eine Person ohne Zahlungskompetenz -- eine Unterschrift unter einen Betrag hätte dort eine Verbindlichkeit suggeriert, die sie nicht hat. Verrechnet wird über den bestehenden Export.

### 10.2 Nummernkreis und Statuslogik

Rapportnummern laufen je Organisation und Jahr im Format 2026-0001. Der Zähler liegt in einer eigenen Tabelle und wird beim Anlegen atomar hochgezählt, damit zwei gleichzeitig erstellte Rapporte nie dieselbe Nummer erhalten.

Ein Rapport ist entweder offen oder abgeschlossen. Solange er offen ist, lassen sich Kopf und Positionen ändern; ein Datenbank-Trigger sperrt beides, sobald er abgeschlossen ist -- nicht nur die Oberfläche, sondern die Datenbank selbst. Wird ein offener Rapport gelöscht, gehen seine Positionen mit. Wer einen Rapport verwirft, tut das, weil der Einsatz nicht stattfindet oder etwas schiefgelaufen ist -- dann wurde die Leistung nicht erbracht und darf nicht als verrechenbarer Zeiteintrag zurückbleiben. Anfangs war es umgekehrt gelöst; das hat Arbeit erfunden, die es nie gab. Ausgenommen sind bereits exportierte Positionen: Sie liegen in der Buchhaltung, und ein Rapport mit solchen Positionen lässt sich nicht mehr löschen, sondern nur stornieren.

Ein Abschluss ohne Unterschrift ist möglich, verlangt aber eine Begründung. Der häufigste Praxisfall -- niemand Unterschriftsberechtigtes mehr vor Ort -- darf nicht dazu führen, dass der Rapport tagelang offen bleibt.

### 10.3 Arbeitstag, Schliesstage und Abwesenheiten

Damit sich Einsätze überhaupt sinnvoll planen lassen, braucht die Anwendung ein Bild davon, wann gearbeitet wird. Drei neue Stammdaten liefern es:

- **Arbeitstag:** ein Von-Bis-Rahmen je Organisation (Standard 07:00--18:00). Er begrenzt nur die Vorschläge der Disposition; ausserhalb bleibt alles von Hand planbar.

- **Schliesstage:** Feiertage und Betriebsferien als Datumsbereich mit Bezeichnung. Sie gelten für die ganze Organisation und sperren die Planung, nicht aber die Zeiterfassung -- wer am Feiertag arbeitet, erfasst seine Zeit normal.

- **Abwesenheiten:** Ferien, Krankheit, Militär und weitere frei definierbare Arten, je Person als Datumsbereich mit optionaler Zeitangabe für halbe Tage.

Die Abwesenheitsarten sind konfigurierbar und tragen ein Merkmal „blockiert die Planung". Nur damit fällt der Zeitraum aus den freien Zeiten heraus. Arten ohne dieses Merkmal -- etwa Homeoffice -- sind reine Information, die Person bleibt einplanbar. Erfasst werden Abwesenheiten von Admins, gelesen von allen: die Disposition braucht diese Information organisationsweit.

### 10.4 Disposition als kostenpflichtiges Zusatzmodul

Die Disposition ist der erste Funktionsbereich, der nicht im Grundpreis enthalten ist. Jede Organisation trägt ein Merkmal, ob das Modul gebucht ist; ist es nicht gesetzt, erscheint der Menüpunkt nicht und der direkte Aufruf der Seite führt zurück auf die Startseite. Die Prüfung liegt zusätzlich in der Datenbank, nicht nur in der Oberfläche.

Fachlich arbeitet die Disposition mit drei Planfeldern am Rapport: geplant für, geplant von und geplant bis. Sie beschreiben die Absicht, die Positionen die tatsächliche Leistung. Beides darf auseinanderlaufen, ohne dass etwas nachkorrigiert werden müsste -- genau darin liegt der Nutzen für die spätere Auswertung.

Die Übersicht zeigt die Einsätze als Tag, Woche oder Monat, wahlweise auf eine Person gefiltert. Überschneidungen derselben Person werden als „Doppelt belegt" markiert, aber nicht verhindert: Eine Übergabe oder ein kurzer Zwischenhalt sind legitime Überschneidungen, und die Planung soll nicht daran scheitern.

Beim Erfassen eines Rapports blendet ein Tagesplan neben dem Formular ein, was für die gewählte Person an diesem Tag belegt und was noch frei ist, mit Blätterfunktion über die Tage. Gesperrte Tage nennen ihren Grund („Betriebsferien", „Ferien"), statt einfach keine Vorschläge zu liefern. Ein Klick auf eine freie Zeit übernimmt sie in die Planfelder.

Die Abrechnung des Moduls über Stripe folgt später; vorerst schaltet Arcos es je Organisation frei. Vorgesehen ist ein organisationsweiter Pauschalbetrag, nicht ein Preis pro Lizenz.

### 10.5 Durchgängige Bedienregeln

Drei Eigenheiten der Testphase haben zu Regeln geführt, die inzwischen für die ganze Anwendung gelten und bei jeder neuen Funktion einzuhalten sind.

- **Fokus nach dem Speichern:** Wer mehrere Einträge hintereinander erfasst, darf nicht nach jedem Eintrag scrollen müssen. Die Seite springt zurück zum leeren Formular und setzt den Cursor ins erste Feld. Technisch über einen Parameter an der Weiterleitungs-Adresse und eine einzige Komponente im Layout gelöst -- ohne Zusatzcode je Formular.

- **Zeitfelder:** Statt des nativen Zeitfelds, das in Safari Teileingaben verwirft, gibt es ein eigenes Textfeld. Es nimmt 1030, 10.30 oder 10:30 entgegen und normalisiert erst beim Verlassen des Felds.

- **Datumsfelder:** Alle Datumsfelder schliessen ihren Kalender nach der Auswahl selbst. Safari liess ihn sonst offen, bis man daneben klickte.

### 10.6 Rollen: was Mitarbeitende dürfen

Die Testphase hat eine Lücke aufgedeckt, die seit der ersten Migration bestand und nur deshalb nie auffiel, weil bis dahin ausschliesslich Admin-Konten im Einsatz waren: Das Schreiben auf Adressen, Aufträge und Artikel war per Row Level Security auf Admins beschränkt, während die Oberfläche den Weg allen anbot -- einschliesslich der beworbenen Schnellerfassung „+ Neuer Kunde", die mitten im Zeiterfassungs- und Anfrageformular sitzt. Ein Mitarbeitender bekam beim Anlegen eines Kunden nur eine technische Meldung über eine verletzte Sicherheitsregel.

Die Regel dahinter ist jetzt festgeschrieben und gilt für jede künftige Funktion:

- **Erfassen und Bearbeiten:** Mitarbeitende dürfen alles, was ihnen die Anwendung zeigt. Ist etwas sichtbar, muss es auch schreibbar sein.

- **Löschen:** Adressen, Aufträge, Artikel und bereits exportierte Zeiteinträge nur als Admin. Diese Datensätze hängen an bestehenden Zeiteinträgen und Rapporten -- ein Löschen wirkt rückwärts und ist nicht zurückzuholen.

- **Umgekehrt:** Was nur Admins sehen -- Einstellungen, Mitarbeitende und Export -- bleibt auch in der Datenbank admin-only. Preise und Rabatte auf der Kundenseite waren zunächst ebenfalls dort eingeordnet, sind auf Wunsch aber für alle geöffnet: Sie steuern nur die Erfassung und wirken nie rückwärts.

Die Prüfung liegt dabei nicht in der Oberfläche, sondern in der Datenbank. Löschknöpfe verschwinden für Mitarbeitende zusätzlich aus der Ansicht, damit niemand erst nach dem Klick erfährt, dass es nicht geht.

Zwei Nebenbefunde wurden gleich mit erledigt. Die drei Funktionen, auf denen jede Sicherheitsregel steht, hatten kein festes search_path -- dieselbe Konstellation, die in der Testphase die Registrierung lahmgelegt hatte; sie sind jetzt gehärtet. Und die Löschaktionen werteten ihr Ergebnis überhaupt nicht aus: Ein durch einen Fremdschlüssel verhindertes Löschen wurde als „gelöscht" gemeldet, obwohl nichts geschah. Beide Fälle nennen jetzt den Grund im Klartext.

Mittelfristig soll an die Stelle dieser festen Regel ein Berechtigungssystem treten, das der Admin unter Einstellungen selbst konfiguriert.

### 10.7 Strukturierte Adresse

Die Strassenangabe eines Kunden stand bisher in einem einzigen Feld. Getrennte Felder für Strasse und Hausnummer halten die Adresse auswertbar und sortierbar und entsprechen dem, was Adressdienste und Buchhaltungen erwarten. Postleitzahl und Ort waren von Anfang an getrennt.

Bestehende Adressen wurden bei der Umstellung automatisch aufgeteilt. Als Hausnummer gilt der hintere Teil, wenn er mit einer Ziffer beginnt -- damit werden „Bahnhofstrasse 12", „Bahnhofstrasse 12a", „Bahnhofstrasse 12-14" und „Route de Berne 4bis" richtig getrennt, während „Im Winkel" vollständig im Strassenfeld bleibt. Eine Hausnummer vor dem Strassennamen wird bewusst nicht angetastet: Diese Schreibweise ist in der Schweiz unüblich, und ein falsch geratener Wert wäre schlimmer als ein unveränderter.

Im Excel-Export bleibt es bei einer einzigen Spalte „Strasse", in der beides wieder zusammengesetzt erscheint. Das Comatic-Format ist fest vorgegeben; eine zusätzliche Spalte würde den Import brechen. Zusammengesetzt wird das in der Datenbank-View, der Export-Code selbst kennt den Unterschied gar nicht.

### 10.8 Projektteam

Ein Projekt kann von der allgemeinen Sichtbarkeit ausgenommen werden. Die zugehörige Zuordnungstabelle gab es seit der ersten Fassung, sie wurde von der Anwendung aber nie beschrieben -- es fehlte schlicht die Oberfläche dazu. Die Sichtbarkeitsregel lautet „Admin oder für alle sichtbar oder dem Projekt zugewiesen", und weil der dritte Zweig immer leer war, blieb ein abgeschottetes Projekt allein den Admins vorbehalten. Sogar die Person, die es angelegt hatte, verlor es aus den Augen. Die Hilfe behauptete das Gegenteil.

Auf der Projektdetailseite lässt sich das Team jetzt pflegen, und wer ein Projekt anlegt, wird automatisch aufgenommen -- auch bei der Schnellerfassung aus einem anderen Formular heraus. Der Teameintrag wird bewusst nach dem Anlegen gesetzt und ohne Fehlerabbruch: Das Projekt existiert zu diesem Zeitpunkt bereits, und ein misslungener Teameintrag darf es nicht wieder verwerfen.

Solange ein Projekt für alle sichtbar ist, hat das Team keine Wirkung; die Oberfläche sagt das an dieser Stelle auch. Wird jemand entfernt, bleiben die bereits erfassten Zeiten bestehen -- es geht ausschliesslich um den Zugriff von diesem Zeitpunkt an.

Bestehende Projekte, die vor dieser Änderung abgeschottet wurden, haben ein leeres Team. Wer sie wieder für die zuständigen Personen öffnen will, trägt sie dort einmalig ein.

### 10.9 Drei Wege, eine Anfrage abzuschliessen

Mit der Einführung der Rapporte war der Ablauf nicht mehr durchgängig: Eine Anfrage liess sich ausschliesslich über einen Zeiteintrag abschliessen. Wer den Einsatz als Rapport dokumentierte, musste die zugehörige Anfrage von Hand nachziehen. Und für Anfragen, aus denen gar keine Leistung entsteht, fehlte überhaupt ein sauberer Abschluss.

Die Detailseite bietet deshalb jetzt drei Wege an. Alle drei speichern Änderungen an Titel, Beschreibung und Zuweisung mit, die unmittelbar davor gemacht wurden -- die Knöpfe liegen im selben Formular und schicken dessen Inhalt mit.

- **Mit Zeiteintrag:** der bisherige und übliche Weg. Auch nicht verrechnete Arbeit läuft hier durch, mit Rabatt 100%, damit die aufgewendete Zeit vollständig erfasst bleibt.

- **Mit Rapport:** legt einen Rapport-Entwurf für denselben Kunden an und übernimmt Titel und Beschreibung als Bemerkung. Die Namenszeile wird dabei entfernt -- der Rapport führt die ausführende Person als eigenes Feld, sie stünde sonst doppelt. Anschliessend führt die Anwendung direkt in den Rapport, weil dort als Nächstes die Positionen entstehen.

- **Ohne Nachweis:** schliesst die Anfrage, ohne etwas zu erzeugen. Für Rückfragen, Irrläufer und alles, was sich von selbst erledigt.

Alle drei stehen jedem Benutzer offen. Das Löschen einer Anfrage bleibt dem Admin vorbehalten und ist bewusst etwas anderes: Erledigtes bleibt nachvollziehbar, Gelöschtes ist weg.

Beide Wege halten fest, aus welcher Anfrage sie entstanden sind -- nachgereicht unmittelbar danach, siehe 10.10.

### 10.10 Durchgängige Nachverfolgung und Dokumente am Rapport

Der Weg von der Kundenanfrage bis zur verrechneten Leistung ist jetzt in beide Richtungen sichtbar. Zeiteintrag und Rapport zeigen an, aus welcher Anfrage sie entstanden sind; die Anfrage verweist umgekehrt auf beides.

Technisch bleibt der Verweis bewusst an einer einzigen Stelle: Die Anfrage hält die Verknüpfung, neu auch zum Rapport. Die Rückrichtung wird über eine Abfrage auf diese Spalte aufgelöst, statt sie zusätzlich am Rapport und am Zeiteintrag zu speichern. Zwei Spalten, die dasselbe behaupten, laufen früher oder später auseinander -- und ein Index auf der einen Spalte kostet weniger als die Pflicht, beide synchron zu halten.

Zweitens hat der Rapport eine eigene Dokumentenablage bekommen. Was der Monteur vor Ort braucht -- eine Anweisung, ein Plan, ein Foto der Anlage -- gehört an den Einsatz und nicht nur an die Anfrage im Büro. Die Ablage ist dieselbe Funktion wie bei Kunden, Projekten und Anfragen; erweitert werden musste lediglich die Prüfregel, die die erlaubten Bereiche einzeln aufzählt.

Wird eine Anfrage über einen Rapport abgeschlossen, lassen sich ihre Dokumente ankreuzen und mitgeben. Sie werden dabei kopiert, nicht geteilt. Der Grund ist handfest: Das Löschen eines Dokuments entfernt immer auch die Datei aus dem Speicher -- zwei Einträge auf dieselbe Datei hätten bedeutet, dass das Aufräumen in der Anfrage dem Monteur den Plan aus dem Rapport zieht. Fachlich passt die Kopie ohnehin besser, denn der Rapport hält fest, was tatsächlich mitgegeben wurde, auch wenn die Anfrage später überarbeitet wird.

Schlägt das Kopieren fehl, wird der leere Eintrag wieder entfernt und der Abschluss läuft trotzdem durch. Der Rapport steht zu diesem Zeitpunkt bereits, und ein nicht kopierter Plan lässt sich von Hand nachladen -- ihn deswegen zu verwerfen wäre der schlechtere Tausch.

### 10.11 Vorläufige Positionen: Absicht und Nachweis trennen

Ein Rapport wird in der Praxis vorbereitet, nicht nachgeschrieben. Die Disposition legt die Aufträge der kommenden Woche an -- mit bereits bekannten Positionen wie Reisespesen oder angenommenen Stunden und mit einer Beschreibung dessen, was der Monteur umsetzen soll. Vor Ort passt er die Werte an, ergänzt allenfalls eine ungeplante Position und schliesst ab.

Bis dahin ist eine Position eine Absicht, kein Nachweis. Sie stand aber schon als vollwertiger Zeiteintrag in Auswertungen und im Export -- und weil ein vorbereiteter Rapport in der Zukunft liegt, standen dort Zeiten, die noch gar nicht geleistet sein konnten. Das verfälschte jede Stundenauswertung.

Naheliegend wäre eine Zwischentabelle: Positionen liegen dort, bis der Rapport abgeschlossen ist, und werden dann in die Zeiterfassung übernommen. Dagegen sprach die Erfahrung dieses Projekts mit doppelt geführten Wahrheiten: Preis-, Mehrwertsteuer- und Rabattlogik müssten zweimal existieren, die Tagesarbeitszeit-Prüfung müsste beide Tabellen kennen, und der Kopierschritt beim Abschliessen könnte halb durchlaufen.

Gelöst ist es deshalb über den Zustand statt über den Ort. Die Position bleibt ein Zeiteintrag und gilt als vorläufig, solange ihr Rapport weder signiert noch abgeschlossen ist; ein stornierter Rapport gilt dauerhaft als nie geleistet. Auswertungen, Export und die Zeiterfassungsliste übergehen vorläufige Positionen, im Kalender erscheint der Einsatz als Planung. Mit dem Abschluss zählt alles auf einmal -- es wird nichts kopiert und nichts verschoben, der Rapport wechselt lediglich seinen Status.

Technisch trägt die Datenbank-View eine Spalte, die den Status des zugehörigen Rapports auswertet. Damit gibt es nichts nachzuführen: Der Statuswechsel ist die Änderung. Die Export-Funktion arbeitet direkt auf der Tabelle und musste die Bedingung eigens erhalten -- ohne das hätte ein vorbereiteter Rapport eine Belegnummer bekommen, bevor die Arbeit getan ist.

Eine Ausnahme mit Absicht: Die Prüfung der Tagesarbeitszeit zählt vorläufige Positionen mit. Sie fragt, ob ein Tag physisch plausibel ist, und nicht, ob etwas verrechenbar ist. Für die Planung ist das sogar ein Gewinn -- sie schlägt an, wenn jemandem vierzehn Stunden auf einen Tag gelegt werden.

Daraus folgt die Regel für die Zukunft: Ein Zeiteintrag lässt sich nicht mit einem Datum nach heute erfassen, denn die Arbeit muss zuerst getan sein. Positionen eines offenen Rapports dürfen dagegen in der Zukunft liegen -- sie sind Auftragsinhalt. Geprüft wird beim Abschliessen, denn genau dort wird aus Absicht ein Nachweis. Geprüft wird jeweils nur der Datumsteil, nicht die Uhrzeit: Wer um 16:55 einen Einsatz bis 17:00 abschliesst, tut nichts Falsches.

### 10.12 Abschluss, Unterschrift und das Dokument für den Kunden

Solange ein Rapport offen ist, zählen seine Positionen nirgends (10.11). Der Abschluss ist damit kein Formalismus, sondern der Moment, in dem aus Absicht ein Nachweis wird. Er steht deshalb sichtbar unten auf der Rapportseite und nicht in einem Menü.

Der gemeinte Weg ist „Signieren und abschliessen": Der Name der unterzeichnenden Person wird eingetragen, der Kunde unterschreibt im Feld darunter -- mit Finger oder Stift auf dem Tablet, mit der Maus am Rechner -- und der Rapport wird geschlossen. Die Unterschrift wird als Bild am Rapport gespeichert und erscheint auf dem Dokument.

Daneben steht „Ohne Unterschrift abschliessen". Der Fall kommt in der Praxis häufig vor -- niemand Unterschriftsberechtigtes ist am Nachmittag noch vor Ort --, und ein Rapport, der deswegen offen bleibt, ist schlimmer als einer ohne Unterschrift. Dieser Weg verlangt dafür einen kurzen Vermerk, der am Rapport bleibt, und liegt eine Ebene tiefer, damit er nicht zur bequemen Gewohnheit wird.

Mit dem Abschluss erhält der Rapport seine Nummer aus dem Nummernkreis (10.2) und wird unveränderlich. Zwei Fälle lässt die Datenbank nicht zu: einen Rapport ohne Positionen und einen mit Datum in der Zukunft. Beide Bedingungen nimmt die Oberfläche vorweg und nennt den Grund, statt den Klick ins Leere laufen zu lassen.

Abschliessen darf die verantwortliche Person des Rapports -- bei einem Einsatz mit mehreren Beteiligten also die Projektleitung (10.14). Sie war dabei, sie steht mit ihrem Namen auf dem Dokument, und sie beurteilt, ob alle Positionen erfasst sind. Ein Administrator darf ebenfalls abschliessen, sonst steckt ein Einsatz fest, wenn die verantwortliche Person krank ist oder den Betrieb verlässt. Geprüft wird in der Datenbankfunktion und nicht nur in der Oberfläche: Ein Aufruf lässt sich nachbauen.

Das Dokument für den Kunden gibt es zweimal -- als Druckansicht im Browser und als PDF-Datei. Beide ziehen ihre Daten aus derselben Funktion; zwei getrennte Aufbereitungen wären nach der ersten Änderung auseinandergelaufen. Der Aufbau folgt dem Schweizer Fenstercouvert: Absenderblock und Logo oben rechts, darunter die einzeilige unterstrichene Absenderangabe in 7 Punkt, die Kundenadresse 2 cm unter der Oberkante, der Titel „Arbeitsrapport" zentriert bei 3 cm. Preise stehen bewusst nicht darauf -- der Rapport ist ein Leistungsnachweis, keine Rechnung.

Absenderangaben und Logo gehören der Organisation und werden unter Einstellungen gepflegt; das Logo liegt in einem öffentlichen Storage-Bucket, damit es sowohl die Druckansicht als auch der PDF-Erzeuger laden kann. Für das PDF kam \@react-pdf/renderer dazu -- eine reine Programmbibliothek ohne laufende Kosten und ohne externen Dienst, an den Kundendaten gingen. Sie rendert allerdings kein HTML, sondern ein eigenes Flexbox-Modell: Blöcke ohne ausdrückliche Breite ziehen sich über die ganze Seite, und eine Bildhöhe begrenzt kein Bild. Beides musste die Vorlage lernen.

Fertige Rapporte lassen sich direkt aus ArcoTime versenden. Der Empfänger wird aus der Kundenadresse vorgeschlagen und ist überschreibbar, das PDF hängt an, und Zeitpunkt und Adresse bleiben am Rapport vermerkt -- auch, damit ein zweiter Versand als solcher erkennbar ist. Ein Entwurf lässt sich nicht versenden: Erst mit dem Abschluss steht fest, was der Kunde bekommt.

### 10.13 Stornieren statt korrigieren

Ein abgeschlossener Rapport ist unveränderlich. Der Weg für Korrekturen ist deshalb das Storno: Der Rapport wird mit einem Grund ungültig gestellt und neu erstellt. Löschen wäre falsch -- die Nummer ist vergeben, der Kunde hat womöglich ein PDF in der Hand, und beides muss nachvollziehbar bleiben.

Ein stornierter Rapport gilt dauerhaft als nie geleistet: Seine Positionen bleiben stehen, zählen aber nirgends mehr. Man muss sehen können, was ursprünglich verrechnet werden sollte. Sind Positionen bereits exportiert, wird das Storno abgelehnt -- sie liegen in der Buchhaltung, und sie stillschweigend aus jeder Auswertung zu nehmen hiesse, eine Rechnung um ihre Grundlage zu bringen.

Umgesetzt ist das Storno als Datenbankfunktion mit erweiterten Rechten, aus demselben Grund wie der Abschluss: Die Sicherheitsregel lässt Änderungen nur zu, solange ein Rapport offen ist. Genau das soll sie auch -- das Storno ist die eng umrissene Ausnahme, und sie gehört dorthin, wo die Regel steht, nicht in die Anwendung.

Anders als der Abschluss ist das Storno bewusst nicht auf die verantwortliche Person eingeschränkt. Es ist eine Korrektur des Büros und wird oft gerade dann gebraucht, wenn die verantwortliche Person nicht erreichbar ist.

### 10.14 Einsätze im Team

Ein Auftrag wird oft von mehreren Personen zusammen erledigt -- eine Projektleiterin mit zwei Monteuren. Bis dahin kannte ein Rapport genau eine Person, und zwar zweimal: eine für die Ausführung und eine für die Planung. Zwei Quellen für dieselbe Aussage laufen auseinander, was in diesem Projekt bereits mehrfach passiert ist.

Neu hält eine eigene Tabelle alle Beteiligten, und das Feld im Rapportkopf behält eine klare Bedeutung: die verantwortliche Person. Projekte tragen dazu eine Projektleitung, die beim Anlegen eines Rapports vorgeschlagen wird -- bei einem bestehenden Rapport dagegen nie nachgeführt, denn dort hat jemand bewusst gewählt.

Die Beteiligten sind reine Planung und keine Berechtigung. Wer nicht dazugehört, darf trotzdem Positionen erfassen; die Disposition etwa stellt Einsätze zusammen und fährt nie selbst mit. In der Tagesansicht der Disposition erscheint ein Einsatz dadurch in jeder Spalte seiner Beteiligten, bleibt aber ein einziger Balken: Verschieben bewegt ihn für alle.

Sind mehrere Personen beteiligt, trägt jede Stundenposition die Person, die sie geleistet hat; Material und Reisespesen brauchen das nicht, sie gehören zum Auftrag. Der Name steht zusätzlich in der ersten Zeile der Beschreibung, denn im Export ist das die einzige Spur, wem die Stunde gehört. Die Regel, welche Position wer ändern darf, musste dafür weichen: Bisher durfte das nur, wer sie erfasst hatte oder auf wen sie gebucht war -- bei einem vom Büro vorbereiteten Rapport traf das auf keinen Monteur zu, und die Ablehnung kam lautlos.

Fällt jemand aus, übernimmt „Person ersetzen" die neue Person samt allen noch nicht exportierten Stundenpositionen der bisherigen. Ohne diese Funktion müsste man die Teamzeile tauschen und danach jede Position einzeln umhängen und würde dabei welche vergessen. Exportierte Positionen bleiben unberührt: Wessen Stunden verrechnet wurden, ändert man nicht nachträglich.

### 10.15 Terminkonflikte sichtbar halten

Die Disposition warnt, statt zu sperren. Wird ein Einsatz auf einen Tag gezogen, an dem eine beteiligte Person nicht kann, erscheint eine Rückfrage mit Namen und Grund und daneben „Trotzdem verschieben". Sperren wäre falsch: Bei einem Team würde eine einzige Abwesenheit den ganzen Einsatz festsetzen, und die Person wird ohnehin ersetzt.

Eine Rückfrage ist allerdings vergessen, sobald sie bestätigt ist -- zwei Telefone und eine Mittagspause später weiss niemand mehr, dass an diesem Donnerstag jemand fehlt. Ein Plan, der nicht aufgeht, muss deshalb dauerhaft zu sehen sein: Der Balken im Zeitraster wird rot und trägt zuoberst „Achtung Terminkonflikt" mit dem Grund im Klartext. Drei Fälle führen dazu -- dieselbe Person doppelt eingeplant, eine beteiligte Person abwesend, oder ein Schliesstag der Organisation. Die Markierung verschwindet von selbst, sobald der Konflikt gelöst ist.

Die Testphase hat an dieser Stelle zwei Fehler zutage gefördert, die beide dieselbe Ursache hatten: eine Prüfung, die stillschweigend nichts fand. Die Abfrage der Abwesenheiten holte die Abwesenheitsart über einen Verbund, den es gar nicht gibt -- der Schlüssel steht in der Abwesenheit, ein Fremdschlüssel darauf existiert nicht, weil die Art nur je Organisation eindeutig ist. Die Datenbank gab einen Fehler zurück, gelesen wurde aber nur das Ergebnis, und damit sah jeder Tag abwesenheitsfrei aus. Seither gilt: Eine gescheiterte Prüfung meldet sich, statt als „nichts gefunden" durchzugehen.

Der zweite Fehler betraf halbtägige Abwesenheiten. Ein Kommentar im Quelltext behauptete seit jeher, sie zählten wie ein belegter Block; der Code prüfte nur ganztägige Einträge. Eine Weiterbildung von 08:00 bis 12:00 war für die Planung schlicht nicht vorhanden. Aufgefallen ist das erst durch die neue Konfliktmarkierung, die Halbtage von Anfang an mitrechnete und dem Disponenten einen Widerspruch zeigte, den keine Rückfrage je gemeldet hätte -- ein gutes Argument dafür, denselben Sachverhalt an zwei Stellen unabhängig zu prüfen.

Verschoben wird mit der Maus, in Viertelstunden und in der Wochenansicht auch auf einen anderen Tag. Dass der Balken beim Loslassen dem Zeiger folgt, hatte eine unangenehme Nebenwirkung: Der Browser löste den Link darunter aus und wechselte auf die Rapportseite, während die Aktion noch lief -- jede Rückfrage erschien damit auf einer Seite, die es nicht mehr gab. Der Balken merkt sich jetzt, ob er gezogen wurde, und unterdrückt in dem Fall den Klick; unterhalb von sechs Pixeln Bewegung beginnt gar kein Ziehen, ein gewöhnlicher Klick öffnet den Rapport also weiterhin.

## 11. Gleichzeitige Bearbeitung

Ein Teamrapport wird typischerweise von mehreren Seiten gleichzeitig angefasst: Die Disposition bereitet ihn vor, während der Monteur vor Ort seine Stunden einträgt. Ohne Vorkehrung überschreibt der zweite Speichervorgang die Arbeit des ersten, ohne dass jemand etwas merkt.

Die erste Vorkehrung ist eine Konfliktprüfung beim Speichern. Jedes Formular schickt den Stand mit, den es beim Öffnen vorgefunden hat; die Änderung greift nur, wenn der Datensatz seither unverändert ist. Andernfalls kommt die Eingabe zurück -- mit dem Hinweis, wer inzwischen gespeichert hat, und der Aufforderung, die Änderungen zuerst anzusehen. Die Eingabe geht dabei nicht verloren, denn die Aktionen leiten im Fehlerfall nicht weiter, sondern geben das Formular mit seinem Inhalt zurück.

Die zweite Vorkehrung ist ein Präsenzhinweis: Wer einen Datensatz geöffnet hat, meldet das in kurzen Abständen, und die anderen sehen, dass jemand daran arbeitet. Der erste Entwurf hat dabei eine Lehre erzwungen. Er sperrte beide Seiten gegenseitig -- beide sahen die Meldung, beide konnten nicht mehr speichern. Eine symmetrische Regel kann das gar nicht anders auflösen; seither zählt, wer zuerst da war. Diese Person behält das Recht zu speichern, die später hinzugekommene wird gewarnt.

Beide Vorkehrungen zusammen ergeben den Ablauf, der sich im Test bewährt hat: Das zweite Gerät meldet, dass jemand anders am selben Rapport arbeitet, und wenn dort trotzdem gespeichert wird, meldet die Konfliktprüfung, dass sich der Datensatz inzwischen geändert hat.

Zur selben Familie gehört eine Falle, die dieses Projekt mehrfach getroffen hat: Eine von der Sicherheitsregel abgelehnte Änderung kommt ohne Fehler zurück, nur mit null betroffenen Zeilen. Die Anwendung meldete „gespeichert", und die Korrektur war weg. Jede ändernde Aktion prüft deshalb die Zahl der betroffenen Zeilen und nennt den Grund -- fehlende Rechte, bereits exportiert, oder inzwischen gelöscht.

## 12. Persönliche Ansichten und Gruppen

Alle Listen lassen sich über einen Klick auf den Spaltenkopf sortieren; ein zweiter Klick dreht die Richtung. Die Sortierung steht in der Adresse und nicht im Browser: Die Seiten werden auf dem Server gerendert, und so überlebt die Ansicht ein Neuladen, lässt sich als Lesezeichen ablegen und weitergeben. Filter und Suchbegriffe bleiben dabei erhalten.

Welche Spalten eine Liste zeigt, entscheidet jede Person für sich. Der Bedarf ist verschieden: Die Buchhaltung will den Adress-Schlüssel und den Betrag sehen, die Disposition Telefonnummer und Ort, der Monteur möglichst wenig. Wer die Spalten für alle festlegt, hat immer für die Hälfte die falschen. Die Auswahl gehört zur Person und nicht zum Gerät und steht deshalb in der Datenbank -- sonst wäre sie am Tablet wieder weg.

Damit die Auswahl etwas wert ist, bietet der Spaltenkatalog mehr an, als die Liste ungefragt zeigt: bei den Kunden zusätzlich Strasse, PLZ, Telefon und Rabatt, in der Zeiterfassung Von--bis, Kostenstelle, Beschreibung und Rabatt, bei den Rapporten die geplante Zeit, die Bemerkung, den Unterzeichner und das Versanddatum. Nicht abwählbar ist, was den Datensatz öffnet, sowie in der Mitarbeitendenliste die Spalten, an denen das Bearbeitungsformular und seine Knöpfe hängen.

Technisch hat das die Listen vereinfacht statt verkompliziert. Kopfzeile, Zelleninhalt und Sortierwert standen zuvor an drei Stellen jeder Seite, fünfmal fast gleich; wer eine Spalte hinzufügte, musste alle drei treffen. Jetzt beschreibt ein Katalog je Liste alle drei an einem Ort, und eine gemeinsame Komponente rendert daraus. Die Spaltenzahl der Leerzeile und die Summen der Zeiterfassung folgen den sichtbaren Spalten von selbst.

Gruppen fassen Mitarbeitende zusammen -- „Team Ost", „Sanitär", „Lernende". Bei drei Mitarbeitenden ist die Tagesansicht der Disposition übersichtlich, bei zwanzig nicht mehr: zwanzig Spalten, von denen ein Disponent morgens vielleicht sechs braucht. Der Gruppenfilter schränkt die Spalten ein -- nicht die Einsätze: Ein Auftrag, an dem jemand aus der Gruppe beteiligt ist, bleibt sichtbar, auch wenn die übrigen Beteiligten anderswo hingehören. Sonst verschwände genau die Zusammenarbeit über Teamgrenzen hinweg, die man sehen will.

Am Rapport nimmt „Ganze Gruppe hinzufügen" ein Team in einem Zug auf; der Regelfall in der Disposition ist „Team Ost fährt hin" und nicht drei einzeln gewählte Namen. Eine Gruppe ist dabei ausdrücklich eine Sicht und keine Berechtigung: Wer in keiner Gruppe ist, sieht und darf genau gleich viel. Mehrfache Zugehörigkeit ist gewollt -- der Springer gehört zu beiden Teams, und ihn zwingend einem zuzuordnen wäre eine Aussage, die im Betrieb niemand treffen kann.

## 13. Der Einsatz im Fahrzeug

Die Arbeit mit einem Rapport beginnt nicht am Schreibtisch, sondern im Fahrzeug. Der Monteur öffnet den Rapport des Kunden, den er besuchen will, startet die Navigation, misst die Fahrzeit und findet die Anfahrt bereits erfasst vor. Dieses Kapitel beschreibt die vier Teile, die zusammen diesen Ablauf tragen -- und eine Annahme, die dabei aufgegeben wurde.

### 13.1 Anfahrt-Kilometer am Auftrag

Die Anfahrt bei jedem Einsatz aus dem Kopf einzutippen ist die Sorte Arbeit, die eine Anwendung abnehmen soll – und jedes Mal eine Gelegenheit für einen Zahlendreher.

Der Auftrag trägt deshalb ein Feld „Anfahrt km (verrechnet je Einsatz)". Es heisst bewusst so und nicht „Distanz": Sonst trägt die eine Person die einfache Strecke ein und die andere Hin und Zurück, und niemand merkt es, weil beides plausibel aussieht.

Der Wert stand ursprünglich am **Kunden**. Das hielt der Praxis nicht stand: Eine Liegenschaftsverwaltung mit vierzig Häusern hat vierzig verschiedene Distanzen, und ein Unterhaltsvertrag kann am selben Ort andere Ansätze haben als eine Sanierung. Der Zwischenschritt, ihn am **Standort** zu führen, war einer zu weit – dort hätte ein Betrieb ohne Ortsebene keinen Zugang dazu. Seit August 2026 steht er am Auftrag, wo alles Betriebswissen zusammenkommt.

Damit niemand ihn zweimal tippt, wird er beim Anlegen eines Auftrags **vom letzten Auftrag an derselben Adresse vorgeschlagen**, und das Formular sagt, woher der Wert kommt. Beim **ersten** Auftrag an einer Adresse bleibt das Feld leer: Eine vorgetragene Distanz von einer anderen Liegenschaft wäre plausibel und falsch, und stille falsche Zahlen sind schlimmer als leere Felder. Was übernommen wird – Anfahrt, Zugang, zusätzliche Adressen, Projektleitung, Team, Kostenstelle, Notizen – stellt jeder Betrieb selbst ein.

Naheliegend wäre eine fest eingebaute Leistung „Reise-km" gewesen, die es in jeder Organisation geben muss. Dagegen sprach das Prinzip, auf dem ArcoTime aufgebaut ist – nichts an den Auswahllisten ist fix im Code – und drei Fälle aus der Praxis: Die eine Organisation nennt es Wegpauschale, die andere Kilometergeld; manche haben mehrere Sätze für verschiedene Fahrzeuge; und wer keine Kilometer verrechnet, hätte eine Position, die er nicht löschen darf.

Stattdessen trägt ein Häkchen am Artikel die Aussage: „Anreise zum Kunden". Beliebig viele Artikel dürfen es haben, jeder heisst, wie die Organisation will. Wird ein solcher Artikel gewählt, erscheint die Kilometerzahl des Auftrags als Menge – in der Zeiterfassung wie im Rapport, überschreibbar und danach am Eintrag eingefroren wie Preis, Rabatt und Mehrwertsteuersatz.

Ein drittes Abrechnungsmodell fällt damit ohne Zusatzaufwand an: Wer eine Anfahrtspauschale verrechnet, nimmt einen gewöhnlichen Artikel mit Menge eins, ohne dass ArcoTime davon wissen muss.

Der Vorschlag gilt dem Auftrag und nicht der Person. Fahren drei Leute im selben Auto, fällt einmal Kilometergeld an, aber dreimal Fahrzeit – das Modell trifft das bereits, weil Mengenartikel keine Person tragen und Stundenpositionen eine (10.14). Die naheliegende Umsetzung „jeder trägt seine Anreise ein" würde die Kilometer verdreifachen.

### 13.2 Standardpositionen

Ein Einsatz beginnt in vielen Betrieben immer gleich: Anfahrt und Fahrzeit, in manchen Branchen zusätzlich eine Kleinmaterialpauschale. Bisher tippte das jemand bei jedem Rapport von Hand -- und wenn es eilte, vergass er es.

Unter Einstellungen legt die Organisation deshalb fest, womit ein neuer Rapport beginnt. Wer nichts pflegt, merkt keinen Unterschied: Der Rapport entsteht wie bisher leer. Trägt eine Standardposition das Anreise-Häkchen, schlägt die Kilometerzahl des Kunden die hinterlegte Vorgabe -- der Rapport für einen Kunden mit 24 hinterlegten Kilometern beginnt also mit genau diesen 24, ohne dass jemand etwas eintippt.

Die Vorgabe ist zwingend und grösser als null. Der ursprüngliche Entwurf sah ein leeres Feld für die Fahrzeit vor, die der Timer später füllt; die Datenbank lässt das nicht zu, denn eine Position ohne Menge und ohne Dauer gibt es nicht. Für die Fahrzeit trägt das Büro also eine Annahme ein, die der Monteur korrigiert oder der Timer überschreibt -- was zum vorbereiteten Rapport ohnehin besser passt.

Der Rabatt folgt derselben Reihenfolge wie im Erfassungsformular: gesperrte Leistung, dann Klassenrabatt des Kunden, dann sein Standardsatz. Eine automatisch angelegte Position muss denselben Preis ergeben wie eine von Hand erfasste, sonst hinge der Rabatt davon ab, auf welchem Weg die Zeile entstanden ist.

Angelegt werden die Positionen nur, wenn der Rapport ein Projekt hat. Damit hängt eine Änderung zusammen, die im Test auffiel: Ein Rapport verlangt seither zwingend ein Projekt. Ohne Projekt lässt sich weder eine Position erfassen noch eine Standardposition übernehmen -- der Rapport konnte also nichts und sah trotzdem aus wie einer. Genau diese Hülle hat im Test die Frage ausgelöst, warum die Standardpositionen fehlen.

### 13.3 Der Timer an der Position

Bis dahin galt: „Einen Timer gibt es im Rapport bewusst nicht -- wer einen Rapport schreibt, ist mit der Arbeit fertig." Die Annahme war falsch. Der Rapport wird auch während des Einsatzes benutzt, aus dem Fahrzeug heraus. Der geschilderte Ablauf ist der Massstab: Der Monteur öffnet den Rapport, startet an der Fahrzeit den Timer, fährt los und stoppt bei der Ankunft.

Technisch war das fast geschenkt, weil eine Rapportposition ein gewöhnlicher Zeiteintrag ist und der Timer dort seit langem existiert. Die Arbeit lag in der Bedienung. Zwei Berührungen insgesamt, ein Knopf von mindestens 44 Pixel Höhe -- das ist die Grösse, die sich mit dem Daumen sicher treffen lässt. Läuft der Timer, steht ein breiter Stoppknopf mit der laufenden Zeit zuoberst über den Positionen: Wer bei der Ankunft erst die richtige Zeile in einer Tabelle suchen muss, tut es während der Fahrt.

Gerechnet wird ab dem gespeicherten Startzeitpunkt und nicht ab dem Öffnen der Seite. So stimmt die Zeit auch, wenn das Telefon zwischendurch im Ruhezustand war oder der Rapport auf einem anderen Gerät geöffnet wird. Es läuft ein Timer je Person; ein zweiter wäre eine Zeit, die es nicht gibt, und beim Stoppen wüsste niemand, welche gemeint ist.

Ein laufender Timer erscheint zusätzlich als Zeichen in der Navigation -- dort, wo er läuft: am Rapport oder in der Zeiterfassung. Der vergessene Timer vom Freitagabend wäre sonst der erste Supportfall. Eine automatische Beendigung nach einigen Stunden ist bewusst nicht eingebaut: Ein Timer, der sich selbst beendet, erfindet eine Zeit, die niemand geleistet hat, und das ist nicht offensichtlich besser als einer, der sichtbar weiterläuft.

### 13.4 Navigation und Anruf

Der Moment vor der Abfahrt ist der, in dem eine Anwendung nützt oder nicht. Am offenen Rapport stehen deshalb zwei grosse Knöpfe: **Navigation** und **Anrufen**. Auf dem Telefon kleben sie am unteren Bildschirmrand, in Reichweite des Daumens; am Arbeitsplatz stehen sie oben, wo geplant wird.

Bewusst nur Verweise und keine Programmschnittstelle: kein Schlüssel, keine laufenden Kosten, kein fremder Code auf der Seite. Die Adresse verlässt ArcoTime erst, wenn jemand tippt. Auf dem Telefon öffnet der Verweis die installierte Karten-App, sonst den Browser; wird die Navigation dort gestartet, läuft sie auf CarPlay weiter, ohne dass ArcoTime etwas davon wissen muss.

**Die Navigation zielt auf den Einsatzort**, nicht auf die Anschrift des Kunden. Für einen Betrieb mit mehreren Adressen je Kunde war das ursprüngliche Verhalten der Weg zum falschen Haus – ein Fehler, der die ganze Ortsebene wirkungslos gemacht hätte: Die Daten wären richtig gewesen und der Monteur trotzdem falsch gefahren. Gefunden wurde er nicht am Schreibtisch, sondern beim ersten Versuch auf einem Telefon.

Daneben steht **„Erreichbar vor Ort"**: die Ansprechperson beim Kunden und die zusätzlichen Adressen des Auftrags, je mit Rolle, Name, Nummer und Mailadresse – alles anklickbar. Dazu der **Zugang** („Schlüssel Nr. 4 im Kasten links, Code 4711, sonst beim Hauswart klingeln"), der neben der Navigation steht und nicht in einer Notiz weiter unten: Er wird in der Minute gebraucht, in der man ankommt.

Beides steht auch auf dem Ausdruck und im PDF. Die zusätzlichen Adressen werden dabei auf den **Tag des Einsatzes** gefiltert: Wer bis gestern Eigentümer war, steht weiterhin auf dem Rapport von damals, aber nicht auf dem von heute. Ein Eigentümerwechsel verändert alte Rapporte also nicht.

## 14. Datenpflege und Nachvollziehbarkeit

Migration 0033 hat per Datenbankbefehl in die Inhalte aller Organisationen eingegriffen, um Strasse und Hausnummer zu trennen. Solange alle Mandanten derselben Person gehören, ist das unkritisch. Sobald ArcoTime an fremde Betriebe verkauft wird, ist es ein Vertrauensthema -- und zwar eines, das sich nicht durch weniger Zugriff lösen lässt: Als Auftragsbearbeiter braucht Arcos vollen Zugriff auf die Datenbank, für Sicherungen, Fehlerkorrekturen und Migrationen. Das zu verschleiern wäre schlechter, als es zu benennen.

Die Antwort besteht deshalb aus zwei Teilen: Änderungen an Altdaten laufen je Organisation und mit einem Rückweg, und jede Änderung ist im Nachhinein einsehbar.

### 14.1 Drei Klassen von Änderungen

Nicht jede Anpassung ist gleich. Unterschieden werden drei Klassen. Änderungen am Schema -- neue Spalten, Regeln, Views -- laufen sofort für alle Organisationen; hier ist nichts zu tun und nichts zu entscheiden. Änderungen an der Datenqualität -- bestehende Werte umformen -- löst jede Organisation selbst aus, wenn es ihr passt. Korrektheit und Sicherheit schliesslich laufen wieder sofort für alle, mit Information danach statt Zustimmung davor: Ein Prozess, der Arcos im Ernstfall blockiert, wäre ein schlechter Prozess.

Die wichtigste Regel dabei lautet: Das Schema wird niemals je Organisation freigeschaltet, nur die Bereinigung der Altdaten. Andernfalls liefen mehrere Datenmodelle gleichzeitig in Produktion, jeder Lesepfad bräuchte dauerhaft beide Varianten -- und ein Teil der Kunden drückt nie auf den Knopf. Richtig ist: Die Spalte entsteht für alle sofort, der Code kommt mit einem leeren Wert zurecht, und das Umformen der Altwerte geschieht je Mandant im eigenen Tempo.

Geschützt wird dabei nicht über Einwilligung, sondern über Rückholbarkeit. Ein Kunde kann nicht beurteilen, ob eine Heuristik für seine achthundert Adressen passt; seine Zustimmung wäre eine Unterschrift ins Blaue. Ein „rückgängig" ist der echte Schutz. Deshalb zeigt jede Sammelaktion vorher Zeile für Zeile, was sie täte, bewahrt beim Ausführen die alten Werte auf und lässt sich danach zurücknehmen. Eine Frist mit Pflicht-Mail an alle Administratoren war ursprünglich angedacht und wurde verworfen: Eine Frist, die sich nicht durchsetzen lässt, erzeugt nur Supportaufwand. Der Hinweis im Adminbereich darf liegen bleiben.

Der Bereich enthält daneben Prüfungen, die nichts anfassen: Kunden ohne Ort, ohne E-Mail-Adresse, ohne Anfahrt-Kilometer, aktive Projekte ohne Projektleitung. Sie zählen und verlinken auf die Liste, in der sich die Lücke schliessen lässt. Was fehlt, merkt man sonst erst, wenn es fehlt -- beim Versand ohne Adresse, im Brief ohne Ort.

Ausgeführte Läufe bleiben stehen, auch zurückgenommene. Sie zu löschen hiesse, die Spur zu verwischen, und genau die ist der Zweck.

### 14.2 Das Änderungsprotokoll

Entscheidend ist, an welcher Stelle protokolliert wird. In der Anwendung mitzuschreiben wäre einfacher gewesen, hätte aber genau den Fall verfehlt, der den Anlass gab: einen Eingriff über den Datenbank-Editor. Ein Trigger in der Datenbank sieht jede Änderung, gleich über welchen Weg sie kommt.

Daran ist zugleich zu erkennen, wer gehandelt hat. Bei einer Änderung aus der Anwendung steht die angemeldete Person zur Verfügung, bei einem direkten Datenbankzugriff nicht. Ein leeres Feld bedeutet hier also nicht „unbekannt", sondern „am Anmeldeweg vorbei" -- und wird in der Anzeige ausdrücklich als Zugriff durch Arcos benannt, hervorgehoben statt versteckt.

Aufgezeichnet werden Stammdaten, Belege, Konten und Auswahllisten -- gespeichert wird jeweils nur, was sich tatsächlich geändert hat, mit altem und neuem Wert. Ein Speichern ohne Änderung erzeugt keinen Eintrag. Nicht erfasst sind Tabellen, die den Betrieb der Anwendung selbst betreffen: Präsenzmeldungen, Spaltenauswahl, das Protokoll selbst; dort entstünde Rauschen ohne Aussage über die Daten der Organisation.

Das Protokoll kennt bewusst keine Regel zum Einfügen, Ändern oder Löschen. Niemand kann Einträge entfernen -- auch der Administrator der Organisation nicht, und über die Anwendung auch Arcos nicht. Geschrieben wird ausschliesslich vom Trigger, der mit erweiterten Rechten läuft. Ein Protokoll, das sich ändern lässt, wäre keines.

Offen bleibt der dritte Teil des Vorhabens: ein Auftragsbearbeitungsvertrag als Bestandteil der Nutzungsbedingungen. Er wird fällig, sobald die erste fremde Organisation dazukommt, und ist ein Vertragstext und keine Funktion.

## 15. Der Umbau vom August 2026: Adressen, Standorte, Artikel

Anlass war ein Gespräch über ein Modul für Angebote, das zurückgestellt wurde. Die Erkenntnis daraus wog mehr als das Modul: **Das Datenmodell muss offen bleiben** – für neue Module wie für Erweiterungen im Bestehenden. Was danach in zwei Wochen entstand, ist keine Funktionsliste, sondern eine Struktur.

### 15.1 Die Frage, die alles entschied

Zwischen Kunde und Auftrag fehlte eine Stufe. Eine Liegenschaftsverwaltung mit vierzig Häusern ist **ein** Kunde mit **einer** Rechnungsadresse – und vierzig Orten mit vierzig Anfahrten, vierzig Hauswarten, vierzig Eigentümern. Ein IT-Dienstleister hat die Migros Region Basel als Kunden und arbeitet in ihren Filialen. Bis dahin druckte der Rapport die Adresse des Kunden, und der Monteur fuhr zur Verwaltung statt zur Liegenschaft.

Die naheliegende Antwort – eine zweite Ebene, die alles trägt, was zum Ort gehört – hat sich als falsch erwiesen, und zwar an einer einzigen Frage: **Was kann ein Betrieb, der diese Ebene nicht führt?** Wäre der Eigentümer am Standort erfasst, käme er nie an ihn heran. Aus dieser Frage wurde der Satz, an dem sich seither jede Maske messen lässt:

> Die Ortsebene gibt einem Betrieb genau zwei Dinge: mehrere Adressen je Kunde erfassen und wählen, und Auswertungen je Adresse. Alles andere ist mit und ohne sie identisch.

Der Standort trägt deshalb **nur die Postadresse**. Alles Betriebswissen – Anfahrt, Zugang, Notizen, die zusätzlichen Adressen – hängt am Auftrag. Zwei Entscheidungen mussten dafür zurückgenommen werden, beide erst wenige Tage alt: die Beteiligten am Standort, und der bewusste Verzicht auf ein `kunde_id` am Standort. Die zweite Begründung war nicht falsch, ihre Voraussetzung war entfallen – wenn die Parteien am Auftrag hängen, hat ein Standort zu jedem Zeitpunkt genau einen Kunden.

### 15.2 Verknüpfung oder Kopie

Ein Unterschied, der das Schema bestimmt und der in der Bedienung sichtbar wird:

Die **zusätzlichen Adressen** sind eine echte Verknüpfung. Der Architekt steht genau einmal im Adressbuch und ist an zehn Aufträgen beteiligt. Zieht sein Büro um, wird eine Adresse geändert und es stimmt überall. Ohne diese Trennung hätte dieselbe Anschrift zehnmal dagestanden und wäre nach dem Umzug neunmal falsch geblieben – die ursprüngliche Anforderung aus einem Kundengespräch.

**Anfahrt und Zugang** sind Werte und damit zwingend Kopien: Es gibt keine Zeile mehr, auf die man zeigen könnte. Der Vortrag ins nächste Projekt schreibt einen Wert, und danach sind es zwei unabhängige. Der Preis dafür ist benannt: Ändert der Hauswart den Code am Schlüsselkasten, ist er in jedem **laufenden** Auftrag an diesem Ort nachzutragen. Bei abgeschlossenen ist der alte Code richtig – der Rapport von damals soll zeigen, was damals galt, wie beim eingefrorenen Preis an der Position.

### 15.3 Beschriftung statt Struktur

Die Struktur ist für alle Betriebe dieselbe, nur die Wörter sind verschieden: Ein Malergeschäft arbeitet an einer **Liegenschaft** und hat **Aufträge**, ein IT-Dienstleister betreut **Standorte** mit **Projekten** und nennt die Anfrage ein **Ticket**. Deshalb gibt es kein zweites Datenmodell je Branche, sondern eine Tabelle mit Beschriftungen: Einzahl, Mehrzahl und Genus je Begriff, dazu Branchenvorlagen, die Arcos zentral pflegt.

Alle drei Angaben sind nötig. Die Mehrzahl lässt sich im Deutschen nicht ableiten (Objekt/Objekte, aber Auftrag/Aufträge), und ohne Genus stünde auf dem Knopf „Neues Auftrag". **Zusammengesetzte Wörter bleiben fest** – aus „Auftrag" würde sonst „Auftragleitung"; wo ein Satz ein zusammengesetztes Wort bräuchte, wird der Satz umformuliert.

Zwei Begriffe waren dabei zu trennen, was vorher einer war: **Adresse** ist die Liste, die alles hält – Kunden, Eigentümer, Architekten, Ämter. **Kunde** ist die Rolle am Auftrag: wer bestellt und schuldet. Deshalb heisst das Register „Adressen" und das Feld am Auftrag weiterhin „Kunde".

### 15.4 Aus Dienstleistungen werden Artikel

Der Name war falsch und wurde mit jeder Erweiterung falscher: Die Tabelle hielt längst auch Mengenartikel – Material, Spesen, Anfahrt. Eine Dose Farbe ist keine Dienstleistung. Im ERP-Bereich heisst das Ding **Artikel**, und ein Artikel kann eine Dienstleistung oder ein Material sein.

Umbenannt wurde nicht nur die Beschriftung, sondern auch die Tabelle – nach einer Regel, die an diesem Tag entstand: **Ein erkannter Fehler wird ganz behoben, nicht dokumentiert.** Der Umfang ist kein Argument dagegen; ein Kommentar, der einen falschen Namen erklärt, konserviert ihn.

Ein `alter table … rename` kostet in PostgreSQL keine Daten – Fremdschlüssel, Indizes und Zugriffsregeln ziehen mit. Nicht mit ziehen: alles, was den alten Namen als **Text** trägt. Bedingungen, Indizes und Regeln wurden deshalb einzeln umbenannt, die Tabellenliste des Änderungsprotokolls und die Spaltenwahl je Anwender nachgeführt. Eine Stelle blieb trotzdem stehen und fiel erst beim Anwender auf: der Preis-Trigger. **Funktionskörper sind Zeichenketten**, und die Prüfung hatte an der falschen Stelle nachgezählt und dabei Zutrauen erzeugt. Seither gehört ein Abgleich über `pg_proc` und die Sichtdefinitionen in jede Umbenennung.

### 15.5 Masken, die ohne Scrollen auskommen

Anlass war eine Beobachtung des Nutzers an der Kundenmaske: Sie war durch laufende Erweiterungen so lang geworden, dass man beim Arbeiten dauernd scrollte. Wer dabei unterbrochen wird – Telefon, Besuch – schaut danach auf einen Bildschirm voller Historie und weiss nicht mehr, wo er ist. Dazu drei Wörter für dieselbe Handlung: „Speichern", „Übernehmen" und „speichern".

Daraus wurde eine verbindliche Leitlinie (`docs/masken-leitlinie.md`) mit einer Unterscheidung als Kern: **Arbeitsmasken** – was jemand täglich benutzt – kommen ohne Scrollen aus, haben Liste links und Detail rechts, und alles Nebensächliche steht in Reitern. **Einstellungsmasken** dürfen lang sein; wer die Kontaktarten zweimal im Jahr pflegt, darf dabei scrollen.

Jeder Knopf nennt sein Objekt: „Adresse speichern", „Person speichern", „Standort speichern". „Übernehmen" ist abgeschafft – es speicherte sofort und sagte es nicht. Umgebaut wird **beim Anfassen**, nicht in einem Rundumschlag; die Leitlinie führt eine ehrliche Tabelle darüber, welche Maske die Prüfliste erfüllt und welche nicht.

### 15.6 Das Telefon: Reihenfolge statt Umfang

Auf dem Telefon ist der Funktionsumfang **derselbe** wie am Arbeitsplatz; nur die Anordnung ändert sich. Kein Knopf verschwindet, weil das Gerät klein ist.

Die Begründung, kurz: Etwas zu verstecken kostet Arbeit statt sie zu sparen – der Code ist derselbe, und es käme eine zweite Entscheidungsebene dazu. Auf dem Telefon sitzt nicht nur der Monteur, sondern auch die Geschäftsleitung im Auto. Und es erzeugt genau eine Sorte Supportfall, auf die es keine gute Antwort gibt: „Warum kann ich das am Handy nicht?" Was einzelne Personen nicht sehen sollen, ist eine **Rollenfrage** und gehört ins Berechtigungssystem, wo es auf beiden Geräten gilt – sonst ist es keine Regel, sondern eine Sichtblende, die ein grösserer Bildschirm umgeht.

Umgesetzt ist: die Startseite „Mein Tag" mit laufendem Timer, den Einsätzen von heute und den offenen Rapporten vergangener Tage; das Nacheinander statt Nebeneinander in den Masken; die Aktionsleiste am unteren Rand; Positionen als Karten statt als Tabelle.

Der letzte Punkt ist eine Lehre, die am Schreibtisch nicht zu haben war. Der erste Versuch blendete auf dem Telefon nur eine Spalte aus. Das genügte nicht: Bei fünf Spalten wischte man weiter waagrecht, und dann stand der Timer-Knopf neben einer Zeile, deren Artikel man nicht mehr sah. **Eine Tabelle wird auf einem Telefon nicht durch weniger Spalten brauchbar, sondern indem sie keine Tabelle mehr ist.**

### 15.7 Auswertungen: keine Zahl ohne Bedeutung

Auswertungen lassen sich nach **Auftrag**, nach **Artikelklasse** und – bei eingeschalteter Ortsebene – nach **Einsatzort** gruppieren.

Bei Auftrag und Einsatzort steht die Dauer in Stunden, über alle Zeilen dieselbe Einheit. Bei der Artikelklasse stellt sich die Mengenfrage: Eine Klasse kann Farbe in Liter und Pinsel in Stück enthalten, und „60" darüber wäre bedeutungslos, ohne dass man es der Zahl ansieht.

Die Antwort ist ein Schalter an der Klasse: **Menge summieren, ja oder nein.** Damit bleibt die Klassenstruktur nach Sachlogik gebaut – was die Rabattregel braucht – und die Auswertung zeigt nie eine sinnlose Zahl. Der Widerspruch wird in beide Richtungen abgelehnt, in der Datenbank und nicht nur im Formular, damit die Regel auch für Import und künftige Erfassungswege gilt. Über alle Klassen wird die Menge gar nicht summiert.

### 15.8 Was der Umbau über das Prüfen gelehrt hat

Drei Sätze, die in diesem Zeitraum Fehler gefunden oder verhindert haben und deshalb als Arbeitsregeln festgehalten sind:

**Eine Prüfung, die still nichts findet, ist schlimmer als keine.** Werkzeuge brechen ab, statt eine unvollständige Vorschau zu zeigen. Und ein neuer Prüfer wird gegen einen Stand geprüft, in dem der Fehler noch drinsteckt – sonst weiss niemand, ob „keine Beanstandungen" etwas bedeutet.

**Was kein Fremdschlüssel erzwingen kann, muss von aussen nachgezählt werden.** „Der Einsatzort eines Auftrags muss ein Standort seines Kunden sein" lässt sich in keiner Bedingung ausdrücken. `scripts/standorte-pruefen.mjs` zählt es nach; `scripts/formulare-pruefen.mjs` sucht verschachtelte Formulare, die in HTML verboten sind und deren Knöpfe schweigend etwas anderes tun.

**Am Gerät prüfen, nicht am Schreibtisch.** Drei der schwierigsten Fehler dieses Umbaus – die überschriebene Kopfleiste, die unbrauchbare Positionstabelle, die falsche Navigationsadresse – waren am Bildschirm nicht zu sehen.
