-- =========================================================
-- 0038  Abgeschlossene Rapporte exportierbar machen
-- =========================================================
--
-- Zwei Fehler, aufgefallen am ersten abgeschlossenen Rapport (2026-0001):
-- Er erschien nicht im Export.
--
-- ---------------------------------------------------------
-- 1) Die Sperre verhinderte auch den Export selbst
-- ---------------------------------------------------------
-- pruefe_rapport_offen() aus 0026 lehnt jede Änderung an einer Position
-- ab, sobald ihr Rapport nicht mehr offen ist. Das schützt die
-- Unterschrift – trifft aber auch erstelle_export(), das den Positionen
-- ihre Belegnummer einträgt. Ein abgeschlossener Rapport hätte sich damit
-- NIE verrechnen lassen: Der Abschluss machte ihn exportierbar und im
-- selben Zug unexportierbar.
--
-- Aufgefallen ist das erst jetzt, weil vor dem Abschluss-Knopf nie ein
-- Rapport diesen Zustand erreicht hat.
--
-- Die Sperre schützt den INHALT einer Position. Die Belegnummer ist kein
-- Inhalt, sondern ein Vermerk der Buchhaltung darüber, dass die Position
-- verrechnet wurde. Genau diese eine Änderung wird deshalb erlaubt – und
-- nur sie: Verglichen wird die ganze Zeile, nachdem beleg_id und
-- updated_at gleichgesetzt wurden. Weicht sonst irgendetwas ab, greift die
-- Sperre wie bisher.

create or replace function pruefe_rapport_offen()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  betroffener uuid;
  aktueller_status text;
  vergleich public.zeiteintraege%rowtype;
begin
  betroffener := coalesce(new.rapport_id, old.rapport_id);
  if betroffener is null then
    return coalesce(new, old);
  end if;

  select r.status into aktueller_status from public.rapporte r where r.id = betroffener;

  if aktueller_status is not null and aktueller_status <> 'offen' then
    -- Ausnahme: Es wird ausschliesslich die Belegnummer gesetzt.
    if tg_op = 'UPDATE' and old.beleg_id is null and new.beleg_id is not null then
      vergleich := new;
      vergleich.beleg_id := old.beleg_id;
      vergleich.updated_at := old.updated_at;
      if vergleich is not distinct from old then
        return new;
      end if;
    end if;

    raise exception
      'Positionen eines % Rapports lassen sich nicht mehr ändern. Bitte den Rapport stornieren und neu erstellen.',
      aktueller_status;
  end if;

  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------
-- 2) Positionen folgen dem Datum ihres Rapports
-- ---------------------------------------------------------
-- Datum und ausführende Person einer Position kommen vom Rapport – sie
-- gelten für den ganzen Einsatz und stehen deshalb gar nicht im
-- Positionsformular. Wurde der Rapportkopf später geändert, blieben die
-- Positionen aber auf dem alten Stand.
--
-- Konkret beim Rapport 2026-0001: angelegt für den 21.08., Positionen
-- erfasst, Kopfdatum auf den 14.08. korrigiert – und die Positionen
-- blieben auf dem 21.08. Damit fielen sie aus dem Exportzeitraum, und die
-- Prüfung "kein Abschluss mit Datum in der Zukunft" lief ins Leere, weil
-- sie das Kopfdatum ansieht.
--
-- Ein Trigger statt einer Lösung in der Anwendung: Die Zusicherung gilt
-- unabhängig davon, wer den Rapport ändert – auch bei einem Eingriff von
-- Hand. Eine Zusicherung, die nur der Anwendungscode kennt, ist keine.

create or replace function rapport_positionen_nachfuehren()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.datum is distinct from old.datum
     or new.mitarbeiter_id is distinct from old.mitarbeiter_id then
    update public.zeiteintraege z
    set datum = new.datum,
        mitarbeiter_id = new.mitarbeiter_id
    where z.rapport_id = new.id
      and (z.datum is distinct from new.datum
           or z.mitarbeiter_id is distinct from new.mitarbeiter_id);
  end if;
  return new;
end;
$$;

drop trigger if exists rapporte_positionen_nachfuehren on rapporte;
create trigger rapporte_positionen_nachfuehren
  after update of datum, mitarbeiter_id on rapporte
  for each row execute function rapport_positionen_nachfuehren();

-- ---------------------------------------------------------
-- 3) Bestehende Abweichungen begradigen
-- ---------------------------------------------------------
-- Einmalig, für die Rapporte, die vor dieser Migration entstanden sind.
-- Die Sperre aus Teil 1 greift dabei nicht, weil dieser Lauf zum
-- Migrationszeitpunkt als Eigentümer läuft – der Trigger ist trotzdem
-- aktiv, deshalb bleiben abgeschlossene Rapporte bewusst aussen vor: Ihr
-- Inhalt gilt als unveränderlich, und ein stiller Eingriff wäre genau
-- das, wovor die Sperre schützt. Sie müssen von Hand über eine
-- Stornierung korrigiert werden.

update zeiteintraege z
set datum = r.datum,
    mitarbeiter_id = r.mitarbeiter_id
from rapporte r
where r.id = z.rapport_id
  and r.status = 'offen'
  and (z.datum is distinct from r.datum
       or z.mitarbeiter_id is distinct from r.mitarbeiter_id);
