-- =========================================================
-- Einmalig: Zeiteinträge eines Test-Nutzers löschen, damit der Login
-- danach über Supabase-Dashboard -> Authentication -> Users -> Delete
-- entfernt werden kann (zeiteintraege.user_id/mitarbeiter_id blockieren
-- das Löschen sonst bewusst, um echte Historie zu schützen).
-- =========================================================

delete from zeiteintraege
where user_id = 'bad78077-53e9-4a37-bf40-acce3a7e49d8'
   or mitarbeiter_id = 'bad78077-53e9-4a37-bf40-acce3a7e49d8';
