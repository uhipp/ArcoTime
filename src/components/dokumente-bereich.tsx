"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  bereiteDokumentUploadVor,
  bestaetigeDokumentUpload,
  verwerfeDokument,
  loescheDokument,
} from "@/app/actions/dokumente";
import type { Dokument, DokumentBereich } from "@/lib/types";

function formatGroesse(bytes: number | null) {
  if (!bytes) return "–";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function iconFuer(dateiname: string) {
  const endung = dateiname.split(".").pop()?.toLowerCase() ?? "";
  if (endung === "pdf") return "📄";
  if (["jpg", "jpeg", "png", "heic", "heif"].includes(endung)) return "🖼️";
  if (["xls", "xlsx"].includes(endung)) return "📊";
  if (["doc", "docx", "ppt", "pptx"].includes(endung)) return "📝";
  if (["eml", "msg"].includes(endung)) return "✉️";
  return "📎";
}

// Wiederverwendbare Dokumente-Sektion für Kunde/Projekt/Mitarbeitende/
// Anfrage/Zeiteintrag – Upload läuft direkt vom Browser zu Supabase
// Storage (signierte URL von der Server Action), damit auch grössere
// Dateien nicht am Body-Limit einer Vercel-Funktion scheitern.
export function DokumenteBereich({
  bereich,
  bezugId,
  initialDokumente,
  kategorien,
  aktuellerUserId,
  istAdmin,
}: {
  bereich: DokumentBereich;
  bezugId: string;
  initialDokumente: Dokument[];
  kategorien: { id: string; bezeichnung: string; aktiv: boolean }[];
  aktuellerUserId: string;
  istAdmin: boolean;
}) {
  const [dokumente, setDokumente] = useState(initialDokumente);
  const [hochladenAktiv, setHochladenAktiv] = useState(0);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ziehtDatei, setZiehtDatei] = useState(false);
  const [kategorieId, setKategorieId] = useState("");
  const [notiz, setNotiz] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const kannHochladen = bereich !== "mitarbeitende" || istAdmin;

  async function ladeDateiHoch(datei: File) {
    setFehler(null);
    setHochladenAktiv((n) => n + 1);

    const formData = new FormData();
    formData.set("dateiname", datei.name);
    formData.set("groesse", String(datei.size));
    formData.set("mime_type", datei.type);
    if (kategorieId) formData.set("kategorie_id", kategorieId);
    if (notiz) formData.set("notiz", notiz);

    const vorbereitet = await bereiteDokumentUploadVor(bereich, bezugId, formData);
    if (vorbereitet.error !== null) {
      setFehler(vorbereitet.error);
      setHochladenAktiv((n) => n - 1);
      return;
    }

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("dokumente")
      .uploadToSignedUrl(vorbereitet.pfad, vorbereitet.token, datei);

    if (uploadError) {
      await verwerfeDokument(vorbereitet.dokumentId);
      setFehler(`Hochladen fehlgeschlagen: ${uploadError.message}`);
      setHochladenAktiv((n) => n - 1);
      return;
    }

    const { data, error } = await bestaetigeDokumentUpload(vorbereitet.dokumentId, vorbereitet.pfad);
    if (data) {
      setDokumente((liste) => [data, ...liste]);
    } else if (error) {
      setFehler(error);
    }
    setHochladenAktiv((n) => n - 1);
  }

  function handleDateien(dateien: FileList | null) {
    if (!dateien || dateien.length === 0) return;
    Array.from(dateien).forEach((datei) => {
      void ladeDateiHoch(datei);
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleLoeschen(dokument: Dokument) {
    if (!confirm(`"${dokument.dateiname}" wirklich löschen?`)) return;
    const { error } = await loescheDokument(dokument.id, dokument.speicherpfad);
    if (error) {
      setFehler(error);
      return;
    }
    setDokumente((liste) => liste.filter((d) => d.id !== dokument.id));
  }

  return (
    <div>
      {fehler && (
        <div className="rounded bg-red-50 text-red-700 text-sm px-3 py-2 mb-3">{fehler}</div>
      )}

      {kannHochladen && (
        <div className="mb-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setZiehtDatei(true);
            }}
            onDragLeave={() => setZiehtDatei(false)}
            onDrop={(e) => {
              e.preventDefault();
              setZiehtDatei(false);
              handleDateien(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`rounded-lg border-2 border-dashed p-4 text-center text-sm cursor-pointer transition-colors ${
              ziehtDatei
                ? "border-arcos-steel bg-arcos-steel/5"
                : "border-gray-300 hover:border-arcos-steel text-gray-500"
            }`}
          >
            {hochladenAktiv > 0 ? "Wird hochgeladen…" : "Datei hierher ziehen oder klicken zum Auswählen"}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleDateien(e.target.files)}
            />
          </div>
          {kategorien.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <select
                value={kategorieId}
                onChange={(e) => setKategorieId(e.target.value)}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">Kategorie (optional)</option>
                {kategorien.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.bezeichnung}
                    {!k.aktiv ? " (inaktiv)" : ""}
                  </option>
                ))}
              </select>
              <input
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                placeholder="Notiz (optional)"
                className="rounded border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          )}
        </div>
      )}

      {dokumente.length === 0 ? (
        <p className="text-sm text-gray-400">Keine Dokumente.</p>
      ) : (
        <ul className="bg-white rounded-lg border divide-y">
          {dokumente.map((d) => {
            const darfLoeschen = istAdmin || d.hochgeladen_von === aktuellerUserId;
            return (
              <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="text-lg shrink-0">{iconFuer(d.dateiname)}</span>
                <div className="flex-1 min-w-0">
                  <a
                    href={`/api/dokumente/${d.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-arcos-steel hover:underline font-medium truncate block"
                  >
                    {d.dateiname}
                  </a>
                  <p className="text-xs text-gray-400 truncate">
                    {d.dokument_kategorien?.bezeichnung && `${d.dokument_kategorien.bezeichnung} · `}
                    {formatGroesse(d.groesse_bytes)} · {d.hochgeladen?.name ?? "?"} ·{" "}
                    {new Date(d.created_at).toLocaleDateString("de-CH")}
                    {d.notiz && ` · ${d.notiz}`}
                  </p>
                </div>
                {darfLoeschen && (
                  <button
                    type="button"
                    onClick={() => handleLoeschen(d)}
                    className="text-xs text-red-600 hover:underline shrink-0"
                  >
                    Löschen
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
