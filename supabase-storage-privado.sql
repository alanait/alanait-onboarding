-- ============================================================================
-- Cerrar el bucket de capturas
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================================
--
-- PROBLEMA. El bucket `client-images` es publico y permite listar objetos sin
-- iniciar sesion. Se verifico con la anon key —que va incrustada en el bundle
-- publico de Vercel, por diseno— y devolvia las carpetas de los clientes. Como
-- ademas era publico, cualquiera con una ruta podia descargar la captura.
--
-- Esas capturas contienen credenciales de administrador, contrasenas en claro y
-- datos bancarios de los clientes: es lo unico de este proyecto con exposicion
-- real hacia fuera.
--
-- ORDEN. Desplegar primero el codigo que usa URLs firmadas (ya en produccion) y
-- ejecutar esto despues. Las URLs firmadas funcionan igual sobre un bucket
-- publico, asi que en ese orden no hay ningun momento con las imagenes rotas.
-- Al reves si: el bucket quedaria privado mientras la aplicacion todavia pide
-- URLs publicas.
--
-- Despues de ejecutarlo, las capturas solo se ven desde la aplicacion con
-- sesion iniciada, y a traves de enlaces que caducan a las 8 horas.
-- ============================================================================

-- 1. El bucket deja de ser publico
update storage.buckets
   set public = false
 where id = 'client-images';

-- 2. Politicas: solo usuarios autenticados, y solo sobre este bucket.
--    Se borran antes las que hubiera, para que ejecutar esto dos veces no falle.
drop policy if exists "Authenticated read client-images"   on storage.objects;
drop policy if exists "Authenticated write client-images"  on storage.objects;
drop policy if exists "Authenticated update client-images" on storage.objects;
drop policy if exists "Authenticated delete client-images" on storage.objects;

create policy "Authenticated read client-images"
  on storage.objects for select to authenticated
  using (bucket_id = 'client-images');

create policy "Authenticated write client-images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'client-images');

create policy "Authenticated update client-images"
  on storage.objects for update to authenticated
  using (bucket_id = 'client-images')
  with check (bucket_id = 'client-images');

create policy "Authenticated delete client-images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'client-images');

-- 3. Quitar cualquier politica heredada que diera acceso al rol anonimo.
--    Revisar el resultado: si aparece alguna con roles {anon} o {public}
--    sobre storage.objects, hay que borrarla a mano.
select polname as politica, polroles::regrole[] as roles
  from pg_policy
 where polrelid = 'storage.objects'::regclass;

-- ============================================================================
-- COMPROBACION
--
-- Desde una ventana de incognito, sin iniciar sesion, con la anon key del
-- bundle. Antes devolvia las carpetas de los clientes; ahora debe devolver
-- una lista vacia o un error de permisos:
--
--   curl -s -X POST \
--     'https://zqdogsxqkmjjnbzkuxwq.supabase.co/storage/v1/object/list/client-images' \
--     -H 'apikey: <ANON_KEY>' -H 'Content-Type: application/json' \
--     -d '{"prefix":"","limit":5}'
--
-- Y dentro de la aplicacion, con sesion iniciada, las capturas de un cliente
-- que ya las tenga deben seguir viendose y saliendo en el PDF.
-- ============================================================================
