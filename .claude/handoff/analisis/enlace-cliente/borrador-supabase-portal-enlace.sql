-- ============================================================================
-- Enlace para que un externo rellene parte de la ficha (BORRADOR, SIN EJECUTAR)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================================
--
-- Modelo: el externo NO tiene identidad en Supabase Auth. Entra como `anon`
-- (la anon key del bundle) y solo puede llamar a DOS funciones. Todo lo demas
-- sigue cerrado para anon. El client_id nunca lo pasa el llamante: se deduce
-- del token. Lo que manda el externo cae en una bandeja aparte; nunca toca
-- clients.form_data. El tecnico acepta campo a campo y guarda por saveClient.
--
-- No depende de supabase-auditoria.sql: no llama a auditar(). Las dos tablas
-- son su propio rastro (quien creo el enlace, lecturas, guardados, quien
-- decidio cada respuesta).
--
-- GRANTS EXPLICITOS a proposito: hasta el 30/10/2026 Supabase concede por
-- defecto ALL a anon y authenticated sobre toda tabla nueva de public; desde
-- esa fecha no concede nada. Escritos asi, funciona igual antes y despues.
-- ============================================================================

-- 1. TABLAS ------------------------------------------------------------------

create table if not exists public.portal_enlaces (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients(id) on delete cascade,
  -- sha256 hex del token. El token en claro solo existe en el navegador del
  -- tecnico al crearlo y en la URL que se envia. Un hash de 256 bits
  -- aleatorios no se puede invertir, por eso no hace falta esconder la
  -- columna a authenticated.
  token_hash         text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  -- Alcance congelado al crear: {"erp":{"0":["nombre","proveedor"]}, ...}
  -- Lo calcula la app (lista blanca x instancias x dep abierto x seccion no
  -- negada). La funcion de guardado rechaza cualquier clave fuera de aqui.
  alcance            jsonb not null check (jsonb_typeof(alcance) = 'object'),
  creado_por         uuid default auth.uid(),
  creado_por_email   text default (auth.jwt() ->> 'email'),
  created_at         timestamptz not null default now(),
  expires_at         timestamptz not null,
  revocado_at        timestamptz,
  terminado_at       timestamptz,          -- el externo pulso "He terminado"
  ultimo_uso_at      timestamptz,
  ultimo_guardado_at timestamptz,
  lecturas           integer not null default 0,
  guardados          integer not null default 0,
  constraint portal_caducidad_maxima check (expires_at <= created_at + interval '30 days')
);
create index if not exists idx_portal_enlaces_client on public.portal_enlaces (client_id);

create table if not exists public.portal_respuestas (
  id                 bigint generated always as identity primary key,
  enlace_id          uuid not null references public.portal_enlaces(id) on delete cascade,
  client_id          uuid not null references public.clients(id) on delete cascade,
  seccion            text not null,
  instancia          text not null,        -- "0", "1"... como en form_data
  campo              text not null,        -- id del campo, o '__comentario__'
  valor              jsonb not null,       -- lo que propone el externo (texto o lista)
  valor_visto        jsonb,                -- lo que habia en la ficha al guardarlo (conflictos)
  remitente          text,                 -- nombre declarado, sin verificar
  estado             text not null default 'pendiente'
                     check (estado in ('pendiente', 'aceptado', 'rechazado')),
  motivo             text,
  decidido_por_email text,
  decidido_at        timestamptz,
  actualizado_at     timestamptz not null default now(),
  unique (enlace_id, seccion, instancia, campo),
  -- Rechazar pide motivo, igual que negar una seccion (D21): esconder deja rastro.
  constraint portal_rechazo_con_motivo
    check (estado <> 'rechazado' or length(btrim(coalesce(motivo, ''))) > 0)
);
create index if not exists idx_portal_resp_pendientes
  on public.portal_respuestas (client_id) where estado = 'pendiente';

-- 2. PRIVILEGIOS Y RLS -------------------------------------------------------

alter table public.portal_enlaces    enable row level security;
alter table public.portal_respuestas enable row level security;

-- anon: nada directo. Solo las dos funciones de abajo.
revoke all on public.portal_enlaces, public.portal_respuestas from anon, public;
revoke all on public.portal_enlaces, public.portal_respuestas from authenticated;

-- authenticated: crea y revoca enlaces, lee y decide respuestas. Por columnas,
-- para que ni con sesion se pueda falsear quien creo el enlace ni reescribir
-- lo que dijo el externo.
grant select on public.portal_enlaces to authenticated;
grant insert (client_id, token_hash, alcance, expires_at) on public.portal_enlaces to authenticated;
grant update (revocado_at) on public.portal_enlaces to authenticated;

-- Sin DELETE: borrar una respuesta rechazada seria esconderla. Se van solas con
-- la ficha (on delete cascade) o con una purga programada.
grant select on public.portal_respuestas to authenticated;
grant update (estado, motivo, decidido_por_email, decidido_at) on public.portal_respuestas to authenticated;

-- Mismo modelo que el resto de tablas (AS1): todo el equipo ve todo.
create policy "portal_enlaces: equipo" on public.portal_enlaces
  for all to authenticated using (true) with check (true);
create policy "portal_respuestas: equipo" on public.portal_respuestas
  for all to authenticated using (true) with check (true);

-- 3. FUNCIONES PARA ANON -----------------------------------------------------
-- SECURITY DEFINER + search_path vacio (pg_catalog se busca siempre igual).
-- Mismo resultado (NULL) para token inexistente, caducado o revocado.

create or replace function public.portal_leer(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.portal_enlaces;
  c public.clients;
  v_valores jsonb;
  v_guardado jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;

  select * into e from public.portal_enlaces
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and revocado_at is null
     and expires_at > now();
  if not found then
    return null;
  end if;

  update public.portal_enlaces
     set lecturas = lecturas + 1, ultimo_uso_at = now()
   where id = e.id;

  select * into c from public.clients where id = e.client_id;

  -- Solo las claves del alcance. Nada de notas, __hints__, section_enabled,
  -- motivos del no ni otros campos.
  select coalesce(jsonb_object_agg(s.key || '|' || i.key || '|' || f.value,
                                   c.form_data -> s.key -> i.key -> f.value), '{}'::jsonb)
    into v_valores
    from jsonb_each(e.alcance) s
    cross join lateral jsonb_each(s.value) i
    cross join lateral jsonb_array_elements_text(i.value) f
   where c.form_data -> s.key -> i.key -> f.value is not null;

  select coalesce(jsonb_object_agg(r.seccion || '|' || r.instancia || '|' || r.campo, r.valor), '{}'::jsonb)
    into v_guardado
    from public.portal_respuestas r
   where r.enlace_id = e.id;

  return jsonb_build_object(
    'empresa',   c.empresa,
    'caduca',    e.expires_at,
    'terminado', e.terminado_at is not null,
    'alcance',   e.alcance,
    'valores',   v_valores,
    'guardado',  v_guardado
  );
end;
$$;

-- p_cambios: [{"s":"erp","i":"0","f":"nombre","v":"Sage 200"}, ...]
create or replace function public.portal_guardar(
  p_token     text,
  p_cambios   jsonb,
  p_remitente text default null,
  p_terminar  boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.portal_enlaces;
  c public.clients;
  x jsonb;
  v_n integer := 0;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'enlace');
  end if;

  -- FOR UPDATE: dos guardados simultaneos del mismo enlace se serializan.
  select * into e from public.portal_enlaces
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and revocado_at is null
     and terminado_at is null
     and expires_at > now()
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'enlace');
  end if;

  if e.ultimo_guardado_at is not null and e.ultimo_guardado_at > now() - interval '2 seconds' then
    return jsonb_build_object('ok', false, 'error', 'espera');
  end if;

  if p_cambios is null or jsonb_typeof(p_cambios) <> 'array'
     or jsonb_array_length(p_cambios) > 400
     or length(p_cambios::text) > 200000
     or length(coalesce(p_remitente, '')) > 120 then
    return jsonb_build_object('ok', false, 'error', 'tamano');
  end if;

  select * into c from public.clients where id = e.client_id;

  for x in select * from jsonb_array_elements(p_cambios) loop
    -- Validacion de forma y de alcance. Cualquier fallo anula el envio entero
    -- (RAISE deshace la transaccion): o entra todo o no entra nada.
    -- coalesce: jsonb_typeof de una clave ausente es NULL, y un IF con NULL
    -- se trata como falso, asi que sin el una clave que falta pasaria.
    if jsonb_typeof(x) <> 'object'
       or coalesce(jsonb_typeof(x -> 's'), '') <> 'string'
       or coalesce(jsonb_typeof(x -> 'i'), '') <> 'string'
       or coalesce(jsonb_typeof(x -> 'f'), '') <> 'string'
       or coalesce(jsonb_typeof(x -> 'v'), '') not in ('string', 'array')
       or length((x -> 'v')::text) > 1000 then
      raise exception 'portal: cambio mal formado';
    end if;
    if jsonb_typeof(x -> 'v') = 'array' and exists (
         select 1 from jsonb_array_elements(x -> 'v') a where jsonb_typeof(a) <> 'string') then
      raise exception 'portal: lista mal formada';
    end if;

    if x ->> 'f' = '__comentario__' then
      if not (e.alcance ? (x ->> 's')) or x ->> 'i' <> '0' or jsonb_typeof(x -> 'v') <> 'string' then
        raise exception 'portal: comentario fuera de alcance';
      end if;
    elsif not coalesce((e.alcance -> (x ->> 's') -> (x ->> 'i')) ? (x ->> 'f'), false) then
      raise exception 'portal: campo fuera de alcance';
    end if;

    insert into public.portal_respuestas
      (enlace_id, client_id, seccion, instancia, campo, valor, valor_visto, remitente)
    values
      (e.id, e.client_id, x ->> 's', x ->> 'i', x ->> 'f', x -> 'v',
       c.form_data -> (x ->> 's') -> (x ->> 'i') -> (x ->> 'f'),
       nullif(btrim(p_remitente), ''))
    on conflict (enlace_id, seccion, instancia, campo) do update
      set valor = excluded.valor,
          valor_visto = excluded.valor_visto,
          remitente = excluded.remitente,
          -- Si el externo cambia algo ya decidido, vuelve a la bandeja.
          estado = 'pendiente', motivo = null,
          decidido_por_email = null, decidido_at = null,
          actualizado_at = now()
      where public.portal_respuestas.valor is distinct from excluded.valor;

    v_n := v_n + 1;
  end loop;

  update public.portal_enlaces
     set guardados = guardados + 1,
         ultimo_guardado_at = now(),
         ultimo_uso_at = now(),
         terminado_at = case when p_terminar then now() else null end
   where id = e.id;

  return jsonb_build_object('ok', true, 'campos', v_n);
end;
$$;

-- EXECUTE: Postgres lo da a PUBLIC al crear la funcion, y Supabase ademas lo
-- concede EXPLICITAMENTE a anon y authenticated. Revocar solo de public NO
-- basta. Se quita a todos y se da solo a anon.
revoke execute on function public.portal_leer(text) from public, anon, authenticated;
revoke execute on function public.portal_guardar(text, jsonb, text, boolean) from public, anon, authenticated;
grant  execute on function public.portal_leer(text) to anon;
grant  execute on function public.portal_guardar(text, jsonb, text, boolean) to anon;

-- 4. (RECOMENDADO) Que ninguna funcion FUTURA de public nazca ejecutable por
--    anon. Hoy ninguna funcion del repo la necesita salvo las dos de arriba,
--    que llevan su grant explicito.
-- alter default privileges for role postgres in schema public
--   revoke execute on functions from public, anon, authenticated;

-- ============================================================================
-- COMPROBACION PREVIA (solo lectura): que puede ejecutar anon hoy en public.
--   select p.oid::regprocedure as funcion, p.prosecdef as definer,
--          has_function_privilege('anon', p.oid, 'execute') as anon_ejecuta
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' order by 1;
--
-- PRUEBA SIN DEJAR RASTRO (no hay base de pruebas: AS5). Cada bloque en su
-- propia transaccion deshecha. Ojo: dentro de una transaccion now() no avanza,
-- asi que un segundo portal_guardar en el mismo bloque devuelve 'espera'; y un
-- error aborta el bloque, por eso cada caso que debe fallar va aparte.
--   begin;
--   insert into public.portal_enlaces (client_id, token_hash, alcance, expires_at)
--     select id, encode(sha256(convert_to(repeat('a',64),'UTF8')),'hex'),
--            '{"erp":{"0":["nombre"]}}', now() + interval '1 day'
--       from public.clients limit 1;
--   set local role anon;
--   select public.portal_leer(repeat('a',64));   -- solo erp|0|nombre
--   select public.portal_leer(repeat('b',64));   -- NULL
--   select count(*) from public.clients;         -- 0 (RLS)
--   select public.portal_guardar(repeat('a',64), '[{"s":"erp","i":"0","f":"nombre","v":"X"}]');  -- ok
--   rollback;
-- Repetir el bloque cambiando la ultima llamada por:
--   '[{"s":"pcs","i":"0","f":"so","v":"X"}]'     -> ERROR campo fuera de alcance
--   '[{"s":"erp","i":"1","f":"nombre","v":"X"}]' -> ERROR (instancia fuera de alcance)
--   select * from public.portal_respuestas;      -> ERROR permiso denegado
--   select * from public.portal_enlaces;         -> ERROR permiso denegado
-- ============================================================================
