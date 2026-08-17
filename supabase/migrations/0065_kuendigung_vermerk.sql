-- Wer hat wann gekündigt?
--
-- Die Kündigung selbst wird bei Stripe ausgelöst und ist dort auch die
-- massgebliche Tatsache. Stripe weiss aber nur, DASS gekündigt wurde – nicht,
-- welche Person in der Organisation den Knopf gedrückt hat. Genau danach
-- wird gefragt, wenn eine Kundin später sagt, sie habe nie gekündigt.
--
-- Deshalb ein eigener Vermerk. Er ersetzt die Angabe bei Stripe nicht, er
-- ergänzt sie um das, was nur ArcoTime wissen kann.
--
-- gekuendigt_von zeigt bewusst mit "on delete set null" auf profiles: Wenn
-- die Person die Organisation später verlässt, bleibt der Vorgang mit Datum
-- bestehen, nur ohne Namen. Ein Vermerk, der beim Löschen eines Kontos
-- verschwindet, wäre als Nachweis wertlos.

alter table organisationen
  add column if not exists gekuendigt_am timestamptz,
  add column if not exists gekuendigt_von uuid references profiles(id) on delete set null;

comment on column organisationen.gekuendigt_am is
  'Zeitpunkt, zu dem die Kündigung in ArcoTime ausgelöst wurde. Massgeblich für das Vertragsende ist das Periodenende bei Stripe.';
