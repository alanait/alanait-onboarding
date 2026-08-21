-- ============================================================================
-- Cerrar el alta de cuentas al dominio @alanait.com
-- Ejecutar en: Supabase Dashboard > SQL Editor, y despues ACTIVAR el hook
-- (paso aparte, ver mas abajo: esto no se activa solo al ejecutar el SQL).
-- ============================================================================
--
-- PROBLEMA. El registro de cuentas esta abierto a cualquiera en internet:
-- Authentication > Providers > Email > "Enable signups" esta en ON. La
-- restriccion a @alanait.com de src/lib/auth.js (funcion validateDomain) es
-- SOLO del lado del navegador: filtra la pantalla de login, pero no filtra
-- una llamada directa a /auth/v1/signup con la anon key, que va incrustada
-- en el bundle publico de Vercel por diseno (necesaria para que la app
-- funcione). Verificado contra produccion: GET /auth/v1/settings devuelve
-- "disable_signup": false.
--
-- Con RLS dando a cualquier cuenta authenticated acceso total a clients,
-- client_versions y client_images, una cuenta creada por fuera de ALANA IT
-- tiene acceso completo a la cartera de clientes: sus datos, su historial y
-- sus capturas, que segun supabase-storage-privado.sql contienen credenciales
-- y datos bancarios.
--
-- ARREGLO INMEDIATO (hazlo YA, no depende de este fichero):
--   Supabase Dashboard > Authentication > Providers > Email >
--   desactivar "Enable signups". Da de alta a mano las cuentas del equipo
--   desde el propio dashboard mientras tanto.
--
-- ESTE FICHERO es el arreglo de fondo, para cuando SI haga falta abrir el
-- alta otra vez (una baja de personal, un cambio de dispositivo, etc.) sin
-- reabrirlo a cualquiera: un "Auth Hook" de Postgres que Supabase llama antes
-- de crear cada usuario y que puede rechazar el alta. La comprobacion vive en
-- la base de datos, no en el navegador, asi que sigue en pie aunque alguien
-- llame a la API directamente.
-- ============================================================================

-- 1. La funcion que decide si un alta se permite.
--    Firma y forma del evento tomadas de la documentacion oficial de
--    Supabase (Before User Created Hook). Simplificada a un unico dominio
--    fijo porque ALANA IT no necesita una tabla de dominios permitidos.
create or replace function public.restringir_alta_a_alanait(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  email text := event->'user'->>'email';
begin
  if email is null or lower(email) not like '%@alanait.com' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'El alta de cuentas esta restringida a direcciones @alanait.com.'
      )
    );
  end if;

  -- Sin objecion: el alta continua con normalidad.
  return jsonb_build_object();
end;
$$;

-- 2. Solo el propio sistema de auth puede ejecutar la funcion. Sin esto,
--    cualquier usuario autenticado podria llamarla directamente y no serviria
--    de nada como filtro de alta.
grant execute
  on function public.restringir_alta_a_alanait
  to supabase_auth_admin;

revoke execute
  on function public.restringir_alta_a_alanait
  from authenticated, anon, public;

-- ============================================================================
-- 3. ACTIVAR EL HOOK (paso manual, no es SQL):
--
--    Supabase Dashboard > Authentication > Hooks > "Before User Created"
--    > seleccionar la funcion "restringir_alta_a_alanait" > Activar.
--
--    Sin este paso, la funcion existe en la base de datos pero Supabase
--    nunca la llama: el alta sigue tan abierta como antes.
-- ============================================================================

-- ============================================================================
-- COMPROBACION
--
-- Con el hook activado, un alta con un correo que no sea @alanait.com debe
-- rechazarse. Desde una ventana de incognito, con la anon key del bundle:
--
--   curl -s -X POST \
--     'https://zqdogsxqkmjjnbzkuxwq.supabase.co/auth/v1/signup' \
--     -H 'apikey: <ANON_KEY>' -H 'Content-Type: application/json' \
--     -d '{"email":"cualquiera@gmail.com","password":"loquesea12345"}'
--
-- Antes del hook: crea la cuenta (o pide confirmar el correo). Despues del
-- hook: debe devolver un error 403 con el mensaje de arriba.
--
-- Y una alta real con @alanait.com debe seguir funcionando exactamente igual
-- que hasta ahora.
-- ============================================================================
