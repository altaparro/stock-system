-- ============================================================
-- Migración: imágenes de productos en Supabase Storage
-- Subida desde la PC (sin URL) con un bucket público.
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do update set public = true;

drop policy if exists "productos_insert" on storage.objects;
create policy "productos_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'productos');

drop policy if exists "productos_select" on storage.objects;
create policy "productos_select" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'productos');

drop policy if exists "productos_delete" on storage.objects;
create policy "productos_delete" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'productos');
