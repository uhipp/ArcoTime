"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { setzeStatus, uebernehmeAnfrage } from "@/app/actions/anfragen";
import type { Anfrage, AnfrageStatus } from "@/lib/types";

type AnfrageKanal = { wert: string; symbol: string };
type AnfragePrioritaet = { wert: string; farbe: string };

const SPALTEN: { key: AnfrageStatus; titel: string }[] = [
  { key: "neu", titel: "Neu" },
  { key: "in_bearbeitung", titel: "In Bearbeitung" },
  { key: "wiedervorlage", titel: "Wiedervorlage" },
  { key: "erledigt", titel: "Erledigt" },
];

function heuteIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function AnfrageKarte({
  anfrage,
  aktuellerUserId,
  kanaele,
  prioritaeten,
}: {
  anfrage: Anfrage;
  aktuellerUserId: string;
  kanaele: AnfrageKanal[];
  prioritaeten: AnfragePrioritaet[];
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: anfrage.id,
  });

  // Bewusst "<=" statt "<": eine HEUTE fällige Wiedervorlage soll sich genauso
  // melden wie eine bereits überfällige – sonst zeigt der Badge in der
  // Navigation "2 fällig", aber im Board sieht man nicht, welche Karten das
  // sind, weil die Markierung erst am Tag danach greift.
  const ueberfaellig =
    anfrage.wiedervorlage_am && anfrage.wiedervorlage_am <= heuteIso() && anfrage.status !== "erledigt";
  const symbol = kanaele.find((k) => k.wert === anfrage.kanal)?.symbol ?? "•";
  const farbe = prioritaeten.find((p) => p.wert === anfrage.prioritaet)?.farbe ?? "bg-gray-300";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-white rounded border p-3 mb-2 shadow-sm cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      } ${ueberfaellig ? "border-red-300" : "border-gray-200"}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs text-gray-400">{symbol}</span>
        <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${farbe}`} />
      </div>
      <Link
        href={`/anfragen/${anfrage.id}`}
        className="text-sm font-medium text-arcos-navy hover:underline block mb-1"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {anfrage.titel}
      </Link>
      <p className="text-xs text-gray-500 mb-2">
        {anfrage.kunden?.vorname ? `${anfrage.kunden.vorname} ` : ""}
        {anfrage.kunden?.name}
        {anfrage.projekte?.bezeichnung ? ` – ${anfrage.projekte.bezeichnung}` : ""}
      </p>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {anfrage.zugewiesen?.name ?? "Nicht zugewiesen"}
        </span>
        {anfrage.wiedervorlage_am && (
          <span className={ueberfaellig ? "text-red-600 font-medium" : "text-gray-400"}>
            {new Date(anfrage.wiedervorlage_am).toLocaleDateString("de-CH")}
          </span>
        )}
      </div>
      {!anfrage.zugewiesen_an && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => uebernehmeAnfrage(anfrage.id)}
          className="mt-2 text-xs text-arcos-steel hover:underline"
        >
          Übernehmen
        </button>
      )}
    </div>
  );
}

function Spalte({
  status,
  titel,
  anfragen,
  aktuellerUserId,
  kanaele,
  prioritaeten,
}: {
  status: AnfrageStatus;
  titel: string;
  anfragen: Anfrage[];
  aktuellerUserId: string;
  kanaele: AnfrageKanal[];
  prioritaeten: AnfragePrioritaet[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border bg-gray-50 p-3 min-h-[20rem] flex-1 min-w-[13rem] ${
        isOver ? "ring-2 ring-arcos-steel" : ""
      }`}
    >
      <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center justify-between">
        {titel}
        <span className="text-xs text-gray-400 font-normal">{anfragen.length}</span>
      </h3>
      {anfragen.map((a) => (
        <AnfrageKarte
          key={a.id}
          anfrage={a}
          aktuellerUserId={aktuellerUserId}
          kanaele={kanaele}
          prioritaeten={prioritaeten}
        />
      ))}
      {anfragen.length === 0 && (
        <p className="text-xs text-gray-400 text-center mt-6">Keine Anfragen</p>
      )}
    </div>
  );
}

export function AnfragenBoard({
  initialAnfragen,
  aktuellerUserId,
  kanaele,
  prioritaeten,
}: {
  initialAnfragen: Anfrage[];
  aktuellerUserId: string;
  kanaele: AnfrageKanal[];
  prioritaeten: AnfragePrioritaet[];
}) {
  const [anfragen, setAnfragen] = useState(initialAnfragen);

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const neuerStatus = over.id as AnfrageStatus;
    const id = active.id as string;
    const bisherige = anfragen.find((a) => a.id === id);
    if (!bisherige || bisherige.status === neuerStatus) return;

    // Optimistisch aktualisieren, bei Fehler zurücksetzen.
    setAnfragen((liste) =>
      liste.map((a) => (a.id === id ? { ...a, status: neuerStatus } : a))
    );

    try {
      await setzeStatus(id, neuerStatus);
    } catch {
      setAnfragen((liste) =>
        liste.map((a) => (a.id === id ? { ...a, status: bisherige.status } : a))
      );
    }
  }

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {SPALTEN.map((spalte) => (
          <Spalte
            key={spalte.key}
            status={spalte.key}
            titel={spalte.titel}
            anfragen={anfragen.filter((a) => a.status === spalte.key)}
            aktuellerUserId={aktuellerUserId}
            kanaele={kanaele}
            prioritaeten={prioritaeten}
          />
        ))}
      </div>
    </DndContext>
  );
}
