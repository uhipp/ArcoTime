"use client";

import { useState } from "react";
import { starteRegistrierung } from "@/app/actions/registrierung";
import {
  preisProBenutzer,
  gesamtpreis,
  abgerechneteMenge,
  staffelBeschreibung,
} from "@/lib/lizenzpreise";

export function RegistrierungFormular() {
  const [anzahl, setAnzahl] = useState(5);
  const [zyklus, setZyklus] = useState<"monatlich" | "jaehrlich">("monatlich");
  const [testphase, setTestphase] = useState(true);
  const [wirdGesendet, setWirdGesendet] = useState(false);
  const [agbAkzeptiert, setAgbAkzeptiert] = useState(false);

  const anzahlGueltig = Math.max(1, Math.floor(anzahl) || 1);

  // Bestpreis-Garantie: An den Stufengrenzen wird auf die günstigere Menge
  // aufgerundet. Der Satz "pro Benutzer" muss sich deshalb auf die
  // abgerechnete Menge beziehen, sonst stünde neben einem Total von 130.–
  // ein Satz von 15.– (siehe lizenzpreise.ts).
  const mengeMonat = abgerechneteMenge(anzahlGueltig, "monatlich");
  const mengeJahr = abgerechneteMenge(anzahlGueltig, "jaehrlich");
  const proBenutzerMonat = preisProBenutzer(mengeMonat, "monatlich");
  const proBenutzerJahr = preisProBenutzer(mengeJahr, "jaehrlich");
  const totalMonat = gesamtpreis(anzahlGueltig, "monatlich");
  const totalJahr = gesamtpreis(anzahlGueltig, "jaehrlich");

  const abgerechneteAnzahl = zyklus === "monatlich" ? mengeMonat : mengeJahr;
  const aufgerundet = abgerechneteAnzahl > anzahlGueltig;

  return (
    <form
      action={starteRegistrierung}
      onSubmit={() => setWirdGesendet(true)}
      className="space-y-8"
    >
      {/* --------------------------------------------------------------- */}
      {/* Schritt 1: Anzahl Benutzer                                      */}
      {/* --------------------------------------------------------------- */}
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="anzahl_benutzer">
          Wie viele Benutzer brauchst du?
        </label>
        <input
          id="anzahl_benutzer"
          name="anzahl_benutzer"
          type="number"
          min={1}
          value={anzahl}
          onChange={(e) => setAnzahl(Number(e.target.value))}
          className="w-32 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
        />
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Schritt 2: Zyklus wählen, Preis live berechnet                  */}
      {/* --------------------------------------------------------------- */}
      <div>
        <span className="block text-sm font-medium mb-2">Abrechnung</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label
            className={`rounded-lg border-2 p-4 cursor-pointer transition ${
              zyklus === "monatlich" ? "border-arcos-steel bg-arcos-steel/5" : "border-gray-200"
            }`}
          >
            <input
              type="radio"
              name="zyklus"
              value="monatlich"
              checked={zyklus === "monatlich"}
              onChange={() => setZyklus("monatlich")}
              className="sr-only"
            />
            <div className="text-sm text-gray-500 mb-1">Monatlich</div>
            <div className="text-2xl font-semibold text-arcos-navy">
              CHF {totalMonat.toFixed(2)}
              <span className="text-sm font-normal text-gray-500"> / Monat</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              CHF {proBenutzerMonat.toFixed(2)} pro Benutzer, exkl. MWST
            </div>
          </label>

          <label
            className={`rounded-lg border-2 p-4 cursor-pointer transition ${
              zyklus === "jaehrlich" ? "border-arcos-steel bg-arcos-steel/5" : "border-gray-200"
            }`}
          >
            <input
              type="radio"
              name="zyklus"
              value="jaehrlich"
              checked={zyklus === "jaehrlich"}
              onChange={() => setZyklus("jaehrlich")}
              className="sr-only"
            />
            <div className="text-sm text-gray-500 mb-1">Jährlich</div>
            <div className="text-2xl font-semibold text-arcos-navy">
              CHF {totalJahr.toFixed(2)}
              <span className="text-sm font-normal text-gray-500"> / Jahr</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              CHF {proBenutzerJahr.toFixed(2)} pro Benutzer, exkl. MWST
            </div>
          </label>
        </div>
        {aufgerundet && (
          <p className="rounded bg-green-50 text-green-800 text-xs px-3 py-2 mt-2">
            Gut zu wissen: <strong>{abgerechneteAnzahl} Lizenzen</strong> sind
            günstiger als {anzahlGueltig}. Wir buchen dir deshalb{" "}
            {abgerechneteAnzahl} – du zahlst weniger und kannst die zusätzlichen
            Lizenzen sofort nutzen.
          </p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          {staffelBeschreibung()} Du zahlst nie mehr, als eine grössere Anzahl
          kosten würde.
        </p>
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Schritt 3: Testphase                                            */}
      {/* --------------------------------------------------------------- */}
      <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer">
        <input
          type="checkbox"
          name="testphase"
          checked={testphase}
          onChange={(e) => setTestphase(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="block text-sm font-medium">30 Tage kostenlos testen</span>
          <span className="block text-xs text-gray-500 mt-0.5">
            Zahlungsmittel wird jetzt hinterlegt, aber erst nach 30 Tagen
            automatisch belastet. Du erhältst 2 Tage vorher eine Erinnerung.
          </span>
        </span>
      </label>

      {/* --------------------------------------------------------------- */}
      {/* Schritt 4: Firmendaten                                          */}
      {/* --------------------------------------------------------------- */}
      <div className="space-y-4 border-t pt-6">
        <h2 className="text-sm font-semibold text-gray-700">Deine Angaben</h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1" htmlFor="firmenname">
            Firmenname
          </label>
          <input
            id="firmenname"
            name="firmenname"
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1" htmlFor="admin_vorname">
              Vorname
            </label>
            <input
              id="admin_vorname"
              name="admin_vorname"
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1" htmlFor="admin_nachname">
              Nachname
            </label>
            <input
              id="admin_nachname"
              name="admin_nachname"
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1" htmlFor="admin_email">
            E-Mail (wird dein Login)
          </label>
          <input
            id="admin_email"
            name="admin_email"
            type="email"
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-arcos-steel"
          />
        </div>
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Schritt 5: Zustimmung                                            */}
      {/* --------------------------------------------------------------- */}
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          name="agb_akzeptiert"
          required
          checked={agbAkzeptiert}
          onChange={(e) => setAgbAkzeptiert(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-xs text-gray-600">
          Ich habe die{" "}
          <a href="/agb" target="_blank" className="text-arcos-steel hover:underline">
            Allgemeinen Geschäftsbedingungen
          </a>{" "}
          und den{" "}
          <a href="/avv" target="_blank" className="text-arcos-steel hover:underline">
            Auftragsbearbeitungsvertrag
          </a>{" "}
          gelesen und verstanden und erkläre mich damit einverstanden. Von der{" "}
          <a href="/datenschutz" target="_blank" className="text-arcos-steel hover:underline">
            Datenschutzerklärung
          </a>{" "}
          habe ich Kenntnis genommen. Ich bin berechtigt, diesen Vertrag für
          meine Organisation abzuschliessen.
        </span>
      </label>

      <button
        type="submit"
        disabled={wirdGesendet || !agbAkzeptiert}
        className="w-full rounded-full bg-arcos-steel text-white text-sm font-semibold py-3 hover:bg-arcos-navy disabled:opacity-60"
      >
        {wirdGesendet
          ? "Weiterleitung zur Zahlung…"
          : testphase
            ? "Weiter zur Zahlungsmethode (30 Tage kostenlos testen)"
            : "Weiter zur Zahlung"}
      </button>
      <p className="text-xs text-gray-400 text-center">
        Du wirst zu unserem Zahlungsanbieter Stripe weitergeleitet (Karte oder
        TWINT).
      </p>
    </form>
  );
}
