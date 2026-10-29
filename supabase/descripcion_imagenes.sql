-- ============================================================
-- Migración: descripción y galería de imágenes por producto
-- imagenes: text[] (la primera posición es la portada)
-- imagen se mantiene sincronizada como portada (compatibilidad)
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

alter table public.productos add column if not exists descripcion text;
alter table public.productos add column if not exists imagenes text[];

update public.productos
set imagenes = array[imagen]
where imagen is not null
  and (imagenes is null or coalesce(array_length(imagenes, 1), 0) = 0);
