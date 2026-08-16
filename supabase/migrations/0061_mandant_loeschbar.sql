-- Eine Organisation muss löschbar sein
--
-- Aufgefallen beim Aufräumen der ersten echten Testbuchung: Das Löschen
-- einer Organisation scheitert immer.
--
-- Ursache: aenderungsprotokoll.organisation_id trägt einen Fremdschlüssel
-- auf organisationen(id), und der Protokoll-Trigger aus 0053 liegt auch auf
-- der Tabelle organisationen selbst. Beim Löschen schreibt der Trigger NACH
-- dem Entfernen der Zeile einen Protokolleintrag mit genau dieser
-- Organisations-ID – der Fremdschlüssel zeigt dann ins Leere und die
-- gesamte Löschung bricht ab. Ein "on delete cascade" hilft nicht: Der
-- Einfügeversuch erfolgt, wenn die Elternzeile bereits weg ist.
--
-- Das ist keine Kleinigkeit: AGB Ziffer 10 und AVV Ziffer 9 sagen zu, dass
-- die Daten einer Kundin 30 Tage nach Vertragsende gelöscht werden. Mit dem
-- bestehenden Fremdschlüssel wäre diese Zusage technisch nicht einlösbar.
--
-- Lösung: Der Fremdschlüssel fällt weg, die Spalte bleibt. Ein Protokoll
-- ist ein eigenständiger, nur schreibend geführter Nachweis – es darf einen
-- Vorgang festhalten, dessen Gegenstand es nicht mehr gibt. Genau das ist
-- bei einer Löschung der Fall. Die Spalte bleibt "not null", damit jeder
-- Eintrag weiterhin einer Organisation zugeordnet ist, und der Index für
-- die Abfrage bleibt bestehen.

alter table aenderungsprotokoll
  drop constraint if exists aenderungsprotokoll_organisation_id_fkey;

comment on column aenderungsprotokoll.organisation_id is
  'Organisation, zu der der Vorgang gehört. Bewusst OHNE Fremdschlüssel: Das Protokoll überlebt die Löschung einer Organisation und hält sie damit auch fest.';

-- Löschen eines Mandanten in der richtigen Reihenfolge.
--
-- Bewusst als Funktion und nicht als Handarbeit: Beim Löschen von Hand
-- vergisst man eine Tabelle, und übrig bleiben verwaiste Zeilen, die
-- niemand mehr einer Organisation zuordnen kann. Die Funktion räumt
-- zuerst das Protokoll ab (es enthält Personendaten und gehört zur
-- Löschung dazu) und entfernt dann die Organisation; alle fachlichen
-- Tabellen hängen über "on delete cascade" daran.
--
-- Die Benutzerkonten in auth.users werden NICHT hier gelöscht – dafür
-- fehlen der Datenbankfunktion die Rechte. Das übernimmt das Skript
-- scripts/mandant-loeschen.mjs, das zuerst die Konten und danach diese
-- Funktion aufruft.
create or replace function loesche_organisation(p_organisation uuid)
returns table (tabelle text, anzahl bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_protokoll bigint;
begin
  if not exists (select 1 from organisationen where id = p_organisation) then
    raise exception 'Organisation % existiert nicht', p_organisation;
  end if;

  delete from aenderungsprotokoll where organisation_id = p_organisation;
  get diagnostics v_protokoll = row_count;

  delete from organisationen where id = p_organisation;

  return query
    select 'aenderungsprotokoll'::text, v_protokoll
    union all
    select 'organisationen'::text, 1::bigint;
end;
$$;

revoke all on function loesche_organisation(uuid) from public, anon, authenticated;
