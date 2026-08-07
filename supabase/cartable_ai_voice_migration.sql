-- ─── Mon Cartable — voix IA (Pro / Autodidacte), audio mis en cache ───────────
-- Colle dans Supabase → SQL Editor → Run

alter table cartable_uas
  add column if not exists audio_path text,
  add column if not exists audio_language text,
  add column if not exists audio_voice text,
  add column if not exists audio_markers jsonb;

-- Bucket de stockage privé pour l'audio généré (un seul fichier par UA + langue,
-- régénéré seulement si la langue change — jamais à chaque lecture).
insert into storage.buckets (id, name, public)
values ('cartable-audio', 'cartable-audio', false)
on conflict (id) do nothing;

drop policy if exists "own cartable audio select" on storage.objects;
drop policy if exists "own cartable audio insert" on storage.objects;
drop policy if exists "own cartable audio update" on storage.objects;
drop policy if exists "own cartable audio delete" on storage.objects;

create policy "own cartable audio select" on storage.objects
  for select using (bucket_id = 'cartable-audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own cartable audio insert" on storage.objects
  for insert with check (bucket_id = 'cartable-audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own cartable audio update" on storage.objects
  for update using (bucket_id = 'cartable-audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own cartable audio delete" on storage.objects
  for delete using (bucket_id = 'cartable-audio' and (storage.foldername(name))[1] = auth.uid()::text);
