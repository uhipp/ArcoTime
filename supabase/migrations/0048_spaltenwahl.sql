-- =========================================================
-- 0048  Spaltenauswahl je Person
-- =========================================================
--
-- Die Listen zeigen bisher für alle dieselben Spalten. Was gebraucht
-- wird, ist aber verschieden: Die Buchhaltung will den Adress-Schlüssel
-- und den Betrag sehen, die Disposition Telefonnummer und Ort, der
-- Monteur möglichst wenig. Wer die Spalten für alle festlegt, hat immer
-- für die Hälfte die falschen.
--
-- Deshalb wählt jede Person ihre Spalten selbst. Die Auswahl gehört zur
-- Person und nicht zum Gerät – sonst müsste sie am Tablet neu getroffen
-- werden. Das ist der Grund, weshalb sie in der Datenbank steht und
-- nicht in einem Cookie.

create table if not exists spaltenwahl (
  user_id uuid not null references profiles(id) on delete cascade,
  -- Schlüssel der Liste, z.B. 'rapporte'. Bewusst Text und keine
  -- Aufzählung: Eine neue Liste soll keine Migration brauchen.
  liste text not null,
  -- Die gewünschten Spalten in der Reihenfolge des Katalogs. Eine
  -- Spalte, die es nicht mehr gibt, wird beim Lesen still übergangen –
  -- so kostet das Umbenennen einer Spalte niemanden seine Einstellung.
  spalten text[] not null,
  geaendert_am timestamptz not null default now(),
  primary key (user_id, liste)
);

alter table spaltenwahl enable row level security;

-- Keine organisation_id: Die Zeile gehört einer Person, und die Regel
-- unten lässt nur die eigene zu. Damit kann auch niemand aus einer
-- anderen Organisation etwas sehen – ohne Unterabfrage auf profiles,
-- die wieder eine Rekursion einbringen könnte (vgl. 0032).
drop policy if exists "spaltenwahl_eigene" on spaltenwahl;
create policy "spaltenwahl_eigene" on spaltenwahl for all using (
  user_id = auth.uid()
) with check (
  user_id = auth.uid()
);
