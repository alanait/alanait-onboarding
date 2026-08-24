-- ============================================================================
-- Historial de auditoria: quien hizo que y cuando
-- Ejecutar en: Supabase Dashboard > SQL Editor, sobre la base EXISTENTE.
-- Es seguro con el bundle actual ya desplegado (ver "ORDEN Y COMPATIBILIDAD").
-- ============================================================================
--
-- PROBLEMA (KNOWN_ISSUES.md AS3). No hay registro de quien abre o modifica
-- que. `created_by` y `changed_by` son TEXT que elige el navegador, y el
-- historial atribuye cada version a QUIEN LA SOBRESCRIBIO, no a quien la
-- escribio. Medido ejecutando el codigo real de clientService.js con una
-- cronologia ana/ana/bruno/carla: 2 de 3 versiones mal atribuidas, y la
-- edicion viva sin autor de ninguna clase.
--
-- Ante una brecha eso obliga a asumir el peor caso -toda la cartera- porque no
-- hay forma de acotar que fichas toco una cuenta concreta. Es exactamente lo
-- que agrava la posicion frente a la AEPD.
--
-- POR QUE TRIGGERS Y NO ESCRITURA DESDE EL NAVEGADOR. Las politicas RLS de
-- supabase-setup.sql son `FOR ALL TO authenticated USING (true)`: cualquier
-- cuenta autenticada puede leer y BORRAR la cartera entera. Un log escrito por
-- el cliente bajo esas mismas politicas seria borrable y falsificable por quien
-- lo genera. Un log que el propio actor puede borrar no es una prueba, es un
-- adorno. Aqui:
--   - las mutaciones las registra la BASE (trigger SECURITY DEFINER), no se
--     pueden omitir ni saltar llamando a la API a pelo;
--   - la identidad sale de auth.uid()/auth.jwt(), nunca de un campo del
--     formulario;
--   - `authenticated` NO tiene UPDATE ni DELETE sobre el log, ni por privilegio
--     ni por politica;
--   - lo que la app SI declara (abrir, PDF, exportar) queda marcado como
--     declarado, no como certificado. No se mezcla lo comprobado con lo dicho.
--
-- LO QUE ESTO NO ARREGLA, dicho aqui para que no se venda de mas: AS1 sigue
-- abierto. Cualquier cuenta autenticada sigue pudiendo leer y borrar la cartera.
-- Esto es una medida DETECTIVA, no preventiva: a partir de ahora se sabra, no
-- se evitara.
-- ============================================================================


-- ============================================================================
-- 1. LA TABLA
-- ============================================================================
--
-- SIN CLAVE AJENA a clients(id) A PROPOSITO. Medido: con
-- `REFERENCES clients(id) ON DELETE CASCADE`, borrar una ficha borro sus 3
-- versiones. Un log encadenado asi se autodestruiria justo en el evento que
-- mas importa registrar. Por eso `client_id` es un UUID suelto y `client_empresa`
-- va desnormalizada: cuando la ficha ya no existe, el log tiene que seguir
-- pudiendo decir de QUE cliente se hablaba.
--
-- Clave BIGINT y no UUID: en un registro que solo crece, una secuencia es mas
-- barata y ademas un salto en la numeracion es en si mismo una senal. Un UUID
-- esconde que falta una fila.

create table if not exists public.audit_log (
  id             bigint generated always as identity primary key,

  -- Cuando. Lo pone el servidor; el navegador no tiene privilegio de INSERT
  -- sobre esta columna (ver GRANT por columnas mas abajo), asi que no puede
  -- antedatar un evento ni aunque tenga el reloj mal.
  occurred_at    timestamptz not null default now(),

  -- Quien. auth.uid() es NULL cuando la accion se hizo FUERA de la aplicacion
  -- (SQL Editor del dashboard, service_role). Ese NULL no es un fallo: es
  -- informacion, y por eso se guarda tambien el rol.
  actor_id       uuid        default auth.uid(),
  actor_email    text        default (auth.jwt() ->> 'email'),
  actor_role     text        default coalesce(auth.jwt() ->> 'role', current_user),

  -- Que.
  action         text not null,

  -- De donde sale el asiento. 'base' = lo escribio un trigger, no se pudo
  -- omitir ni falsear. 'app' = lo declaro el navegador; es cierto salvo que
  -- alguien use la API por su cuenta, y por eso se etiqueta distinto en vez de
  -- presentarlo como equivalente.
  origin         text not null default 'app',

  -- Sobre que.
  client_id      uuid,
  client_empresa text default '',

  -- Detalle CORTO. NUNCA contenido del formulario: las capturas y los campos
  -- guardan credenciales y datos bancarios de clientes, y un log que los copia
  -- multiplica el problema que pretende vigilar. Aqui solo caben ids de seccion,
  -- numero de version y contadores.
  details        jsonb not null default '{}',

  -- IP de origen, util para acotar una brecha. Es dato personal del empleado:
  -- si se prefiere no monitorizar a ese nivel, basta con borrar esta columna
  -- (nada del resto depende de ella).
  ip             text default (current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for'),

  constraint audit_log_action_valida check (action in (
    -- certificados por la base (triggers)
    'ficha_creada', 'ficha_modificada', 'ficha_borrada',
    'captura_subida', 'captura_borrada',
    -- declarados por la aplicacion
    'ficha_abierta', 'pdf_generado', 'fichero_exportado', 'version_restaurada',
    -- mantenimiento del propio log
    'log_purgado'
  )),
  constraint audit_log_origin_valido check (origin in ('base', 'app'))
);

comment on table public.audit_log is
  'Registro de auditoria de solo insercion. `authenticated` puede insertar y leer; NO puede modificar ni borrar. Ver origin: base=trigger, app=declarado por el navegador.';

-- Indices: uno por cada pregunta que se hace de verdad.
--   (a) "que le ha pasado a esta ficha"        -> pantalla de actividad
--   (b) "que toco esta persona entre X e Y"    -> LA consulta de una brecha
--   (c) "que ha pasado hoy" y la purga por fecha
create index if not exists idx_audit_client on public.audit_log (client_id, occurred_at desc);
create index if not exists idx_audit_actor  on public.audit_log (actor_id,  occurred_at desc);
create index if not exists idx_audit_fecha  on public.audit_log (occurred_at desc);


-- ============================================================================
-- 2. PRIVILEGIOS Y RLS
-- ============================================================================
--
-- Dos capas distintas, a proposito:
--   - PRIVILEGIOS (GRANT/REVOKE): el navegador solo puede insertar CUATRO
--     columnas. La identidad y la fecha las pone el DEFAULT del servidor, y
--     `origin` tambien. Falsificar autoria no es algo que se compruebe y se
--     rechace: es que no hay privilegio para intentarlo.
--   - RLS: ademas, el asiento tiene que ser suyo y de un tipo que la app pueda
--     declarar honestamente.
-- Con una sola capa bastaria casi siempre; con las dos, un fallo de la otra no
-- abre el log.

alter table public.audit_log enable row level security;

-- OJO: NO se usa FORCE ROW LEVEL SECURITY. El propietario (postgres) tiene que
-- poder saltarse las politicas, porque es quien ejecuta los triggers
-- SECURITY DEFINER que escriben las filas `origin='base'`. Con FORCE, los
-- triggers no podrian escribir y el log quedaria solo con lo que declare la app,
-- que es justo lo que no queremos.

revoke all on public.audit_log from anon, authenticated;

grant select on public.audit_log to authenticated;

-- INSERT POR COLUMNAS. Todo lo que no esta en esta lista lo pone el servidor.
grant insert (action, client_id, client_empresa, details)
  on public.audit_log to authenticated;

-- Sin GRANT de UPDATE ni DELETE, y sin politica para ellos: doble negativa.
-- Nadie que entre por la anon key puede tocar una fila ya escrita.

-- Lectura. DECISION EXPLICITA: todo el equipo ve el log entero. En un equipo de
-- pocas personas un registro visible disuade, y esconderselo a los companeros
-- solo lo convierte en vigilancia unilateral. A cambio hay que INFORMAR al
-- personal de que existe (RGPD art. 13 y LOPDGDD arts. 87-90): eso no es
-- opcional, es la condicion para que esto sea licito.
--
-- Si se prefiere restringirlo, sustituir esta politica por la variante
-- comentada al final del fichero.
create policy "audit_log: lectura para el equipo"
  on public.audit_log for select to authenticated
  using (true);

-- Insercion. El navegador solo puede anotar eventos SUYOS, del tipo que de
-- verdad puede conocer, y siempre marcados como declarados.
create policy "audit_log: solo eventos propios y declarados"
  on public.audit_log for insert to authenticated
  with check (
    actor_id = auth.uid()
    and origin = 'app'
    and action in ('ficha_abierta', 'pdf_generado', 'fichero_exportado', 'version_restaurada')
  );


-- ============================================================================
-- 3. EL ESCRIBANO (lo usan los triggers)
-- ============================================================================
--
-- SECURITY DEFINER para que corra como propietario de la tabla y por tanto
-- pueda escribir `origin='base'`, que es justo lo que la app tiene prohibido.
-- search_path fijado: sin esto, un objeto creado en otro esquema podria
-- secuestrar la funcion.

create or replace function public.auditar(
  p_action   text,
  p_client   uuid,
  p_empresa  text,
  p_details  jsonb default '{}'
) returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.audit_log (actor_id, actor_email, actor_role, action, origin,
                                client_id, client_empresa, details)
  values (auth.uid(),
          auth.jwt() ->> 'email',
          coalesce(auth.jwt() ->> 'role', current_user),
          p_action,
          'base',
          p_client,
          coalesce(p_empresa, ''),
          coalesce(p_details, '{}'::jsonb));
end;
$$;

revoke execute on function public.auditar(text, uuid, text, jsonb) from anon, authenticated, public;


-- ============================================================================
-- 4. AUTORIA DE VERDAD: columnas nuevas
-- ============================================================================
--
-- Solo cambios ADITIVOS. No se renombra ni se borra nada: `changed_by` y
-- `created_by` se quedan donde estan con el valor que ya tenian.

-- 4.1 Quien escribio lo que hay AHORA en la ficha. Hoy no consta en ningun
--     sitio: medido, 4 guardados producen 3 versiones y la ultima edicion no
--     deja rastro de autor.
alter table public.clients
  add column if not exists updated_by_id    uuid,
  add column if not exists updated_by_email text;

-- 4.2 Autoria de cada version, separada de `changed_by` para no reinterpretar
--     lo ya guardado. El DEFAULT 'legacy' marca automaticamente TODAS las filas
--     existentes con su semantica vieja, sin tocarlas.
alter table public.client_versions
  add column if not exists author_id     uuid,
  add column if not exists author_email  text,
  add column if not exists author_origin text not null default 'legacy';

alter table public.client_versions
  drop constraint if exists client_versions_author_origin_valido;
alter table public.client_versions
  add constraint client_versions_author_origin_valido
  check (author_origin in ('legacy', 'derivada', 'indeterminada', 'directa'));

comment on column public.client_versions.changed_by is
  'OBSOLETA. En filas author_origin=legacy significa QUIEN SOBRESCRIBIO esta version, no quien la escribio. No usar para atribuir autoria: usar author_email + author_origin.';
comment on column public.client_versions.author_origin is
  'directa=la escribio el trigger, el autor es el de verdad. derivada=reconstruida por desplazamiento sobre datos historicos. indeterminada=historica y no reconstruible. legacy=historica sin tocar.';


-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- 5.1 Sellar autoria. El navegador manda `created_by` en el alta; a partir de
--     aqui da igual lo que mande: se sobrescribe con la identidad del token.
--     Deja de ser TEXT libre.
create or replace function public.clients_sellar_autor()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  new.updated_by_id    := auth.uid();
  new.updated_by_email := auth.jwt() ->> 'email';
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.jwt() ->> 'email', '');
  end if;
  return new;
end;
$$;

drop trigger if exists clients_sellar_autor on public.clients;
create trigger clients_sellar_autor
  before insert or update on public.clients
  for each row execute function public.clients_sellar_autor();


-- 5.2 Alta de ficha.
create or replace function public.clients_al_crear()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.auditar('ficha_creada', new.id, new.empresa, '{}'::jsonb);
  return null;
end;
$$;

drop trigger if exists clients_al_crear on public.clients;
create trigger clients_al_crear
  after insert on public.clients
  for each row execute function public.clients_al_crear();


-- 5.3 Modificacion: registra el evento Y crea la version. Las dos cosas juntas
--     y en el mismo sitio, por tres razones medidas:
--       (a) hoy createVersionSnapshot() escribe la version ANTES del UPDATE
--           (clientService.js:87-89): si el UPDATE falla, queda una version
--           fantasma. En el trigger la version y el cambio son atomicos.
--       (b) hoy un Guardar sin cambios crea una version entera de 5.581 bytes
--           identica a la anterior. La condicion WHEN de abajo lo corta.
--       (c) la autoria deja de poder equivocarse: la version archiva el estado
--           ANTERIOR, y su autor es el que la base tenia sellado en ese estado
--           anterior. No es "el usuario de ahora", que es exactamente el bug.
create or replace function public.clients_al_modificar()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_version   integer;
  v_secciones text[];
begin
  select coalesce(max(version), 0) + 1 into v_version
    from public.client_versions where client_id = old.id;

  insert into public.client_versions (
    client_id, version, snapshot, changed_by, author_id, author_email, author_origin
  ) values (
    old.id,
    v_version,
    jsonb_build_object(
      'clientData', jsonb_build_object(
        'empresa', old.empresa, 'sector', old.sector, 'trabajadores', old.trabajadores,
        'sedes', old.sedes, 'contacto', old.contacto, 'telefono', old.telefono,
        'email', old.email, 'web', old.web, 'direccion', old.direccion,
        'fecha', old.fecha, 'responsable', old.responsable),
      'sectionEnabled',  old.section_enabled,
      'formData',        old.form_data,
      'instanceCounts',  old.instance_counts
    ),
    -- Se rellena `changed_by` con el autor CORRECTO solo en las filas nuevas.
    -- Asi, durante la ventana en que el bundle antiguo siga desplegado, la
    -- pantalla vieja muestra ya el nombre bueno. Las filas legacy no se tocan;
    -- lo que distingue una semantica de la otra es author_origin, no esta
    -- columna, que queda obsoleta.
    coalesce(old.updated_by_email, ''),
    old.updated_by_id,
    old.updated_by_email,
    'directa'
  );

  -- Que secciones cambiaron. Solo IDS DE SECCION: ni un valor del formulario
  -- entra en el log.
  select coalesce(array_agg(k order by k), '{}')
    into v_secciones
    from jsonb_object_keys(coalesce(new.form_data, '{}'::jsonb) || coalesce(old.form_data, '{}'::jsonb)) k
   where (new.form_data -> k) is distinct from (old.form_data -> k)
      or (new.section_enabled -> k) is distinct from (old.section_enabled -> k);

  perform public.auditar('ficha_modificada', old.id, new.empresa,
    jsonb_build_object('version', v_version, 'secciones', to_jsonb(v_secciones)));

  return null;
end;
$$;

drop trigger if exists clients_al_modificar on public.clients;
create trigger clients_al_modificar
  after update on public.clients
  for each row
  -- Guardar dos veces seguidas sin tocar nada no es un cambio: ni version ni
  -- asiento. Se excluyen las columnas que se mueven solas en cada UPDATE.
  when (
    (to_jsonb(old) - array['updated_at','updated_by_id','updated_by_email'])
    is distinct from
    (to_jsonb(new) - array['updated_at','updated_by_id','updated_by_email'])
  )
  execute function public.clients_al_modificar();


-- 5.4 Borrado. En BEFORE se marca la transaccion para que el borrado en cascada
--     de client_images no genere una fila por captura: un borrado tiene que
--     leerse como UN asiento, no como trece.
create or replace function public.clients_antes_de_borrar()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_capturas  integer;
  v_versiones integer;
begin
  -- Marca la transaccion para que el borrado en cascada de client_images no
  -- genere un asiento por captura: un borrado se lee como UNO, no como trece.
  perform set_config('alana.borrando_ficha', old.id::text, true); -- true = solo esta transaccion

  -- SE CUENTA Y SE ANOTA EN EL "BEFORE", NO EN EL "AFTER", y esto importa:
  -- el ON DELETE CASCADE de client_images y client_versions es en Postgres un
  -- trigger AFTER igual que lo seria el nuestro, y cual corre primero depende
  -- del orden alfabetico de los nombres de trigger y de la intercalacion de la
  -- base. Si gana la cascada, los dos contadores salen 0 y el asiento del
  -- borrado -el evento que mas importa registrar- afirmaria que no habia
  -- ninguna captura. En el BEFORE los hijos existen con seguridad.
  --
  -- Va en la misma transaccion que el borrado: si el DELETE se revierte, el
  -- asiento se revierte con el y no queda un borrado fantasma en el log.
  select count(*) into v_capturas  from public.client_images   where client_id = old.id;
  select count(*) into v_versiones from public.client_versions where client_id = old.id;

  perform public.auditar('ficha_borrada', old.id, old.empresa,
    jsonb_build_object('capturas', v_capturas, 'versiones', v_versiones,
                       'creada_por', old.created_by));
  return old;
end;
$$;

drop trigger if exists clients_antes_de_borrar on public.clients;
create trigger clients_antes_de_borrar
  before delete on public.clients
  for each row execute function public.clients_antes_de_borrar();

-- El AFTER DELETE que habia aqui se ha eliminado a proposito: hacia el recuento
-- despues de la cascada. Se deja el DROP para que una base donde ya se hubiera
-- creado quede limpia y no anote el borrado dos veces.
drop trigger if exists clients_al_borrar on public.clients;
drop function if exists public.clients_al_borrar();


-- 5.5 Capturas. SOLO insert y delete.
--     Medido: un guardado corriente con 3 capturas ya subidas dispara 3
--     client_images.UPDATE sin que cambie ninguna imagen, porque syncImages
--     reescribe caption y sort_order siempre (clientService.js:268-270). Un
--     trigger sobre UPDATE serian 3 filas de basura por guardado.
create or replace function public.client_images_al_cambiar()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_fila   record;
  v_empresa text;
begin
  v_fila := coalesce(new, old);

  -- Si venimos del borrado en cascada de una ficha, callar: ya hay un asiento.
  if tg_op = 'DELETE'
     and coalesce(current_setting('alana.borrando_ficha', true), '') = v_fila.client_id::text then
    return null;
  end if;

  select empresa into v_empresa from public.clients where id = v_fila.client_id;

  perform public.auditar(
    case tg_op when 'INSERT' then 'captura_subida' else 'captura_borrada' end,
    v_fila.client_id, coalesce(v_empresa, ''),
    jsonb_build_object('seccion', v_fila.section_id, 'fichero', v_fila.file_name));
  return null;
end;
$$;

drop trigger if exists client_images_al_cambiar on public.client_images;
create trigger client_images_al_cambiar
  after insert or delete on public.client_images
  for each row execute function public.client_images_al_cambiar();


-- ============================================================================
-- 6. CERRAR LA ESCRITURA DIRECTA DE VERSIONES
-- ============================================================================
--
-- A partir de aqui la unica cosa que escribe en client_versions es el trigger.
-- Si no se cierra, el bundle antiguo seguiria creando SU version (con el autor
-- equivocado) ademas de la del trigger: dos filas por guardado.
--
-- ES SEGURO CON LA APP DESPLEGADA: en clientService.js:216 el insert es
--   `await supabase.from('client_versions').insert({...});`
-- sin comprobar el error. Al revocar el privilegio, esa llamada falla en
-- silencio y saveClient sigue exactamente igual. Comprobado leyendo el codigo:
-- no hay destructuring de `error` en esa linea.

drop policy if exists "Authenticated full access on client_versions" on public.client_versions;

create policy "client_versions: solo lectura desde la app"
  on public.client_versions for select to authenticated using (true);

revoke insert, update, delete on public.client_versions from authenticated, anon;
-- SELECT se mantiene: getVersions() y loadVersion() lo necesitan.


-- ============================================================================
-- 7. RECONSTRUIR LA AUTORIA HISTORICA
-- ============================================================================
--
-- Los datos viejos NO se reinterpretan a lo bruto. Se derivan, con una regla
-- que he verificado ejecutando el codigo real:
--
--   autor(v1)          = clients.created_by
--   autor(v_n), n>=2   = changed_by de v_(n-1)
--   autor(estado vivo) = changed_by de la version mas alta
--
-- Es un desplazamiento de UNO exacto, porque createVersionSnapshot archiva el
-- estado anterior etiquetandolo con el usuario de la edicion en curso.
-- Escenario ana/ana/bruno/carla: recupera 3 de 3.
--
-- DONDE NO SE PUEDE, Y NO SE INVENTA: cuando getUserEmail() devolvia '' la
-- llamada caia al fallback `clientData.responsable`, que es texto libre
-- (clientService.js:87). Esos valores no son una identidad. Se detectan porque
-- no llevan '@' y porque no existen en auth.users: esas filas quedan
-- author_email NULL y author_origin='indeterminada'. Preferimos un hueco
-- declarado a una atribucion inventada.

-- 7.1 Autoria del estado vivo de cada ficha.
with ultima as (
  select distinct on (client_id) client_id, changed_by
    from public.client_versions
   order by client_id, version desc
)
update public.clients c
   set updated_by_email = nullif(coalesce(u.changed_by, c.created_by), ''),
       updated_by_id    = (select a.id from auth.users a
                            where lower(a.email) = lower(coalesce(u.changed_by, c.created_by)))
  from ultima u
 where u.client_id = c.id
   and c.updated_by_email is null;

update public.clients c
   set updated_by_email = nullif(c.created_by, ''),
       updated_by_id    = (select a.id from auth.users a where lower(a.email) = lower(c.created_by))
 where c.updated_by_email is null;

-- 7.2 Autoria de cada version historica, por desplazamiento.
with derivada as (
  select v.id,
         coalesce(
           lag(v.changed_by) over (partition by v.client_id order by v.version),
           c.created_by
         ) as autor
    from public.client_versions v
    join public.clients c on c.id = v.client_id
   where v.author_origin = 'legacy'
)
update public.client_versions v
   set author_email  = case when d.autor like '%@%' then d.autor end,
       author_id     = (select a.id from auth.users a where lower(a.email) = lower(d.autor)),
       author_origin = case when d.autor like '%@%' then 'derivada' else 'indeterminada' end
  from derivada d
 where d.id = v.id;

-- 7.3 Version huerfana: si una ficha se importo y nunca se guardo, no hay nada
--     de donde derivar. Queda marcada, no adivinada.
update public.client_versions
   set author_origin = 'indeterminada'
 where author_origin = 'legacy';

-- 7.4 Integridad del numero de version. La numeracion se calculaba en el
--     navegador (max+1), asi que dos guardados simultaneos podian duplicarla.
--     Se anade la restriccion SOLO si la base esta limpia; si no, la consulta
--     de abajo dice donde mirar antes de forzar nada.
select client_id, version, count(*) as repetidas
  from public.client_versions
 group by client_id, version having count(*) > 1;
-- Si la consulta anterior no devuelve filas, ejecutar:
--   alter table public.client_versions
--     add constraint client_versions_unica unique (client_id, version);


-- ============================================================================
-- 8. RETENCION
-- ============================================================================
--
-- 24 meses. No hay un plazo que el RGPD fije para logs de acceso: el criterio
-- es minimizacion (art. 5.1.e), asi que el plazo hay que justificarlo. 24 meses
-- cubre el de prescripcion de las infracciones graves de la LOPDGDD (art. 78) y
-- deja margen para investigar una brecha detectada tarde. CONFIRMARLO con quien
-- lleve el cumplimiento antes de darlo por bueno; es el unico numero de este
-- fichero que no sale de una medida.
--
-- La purga NO la puede hacer la aplicacion: `authenticated` no tiene DELETE, que
-- es justo el punto. La hace esta funcion, y SE REGISTRA A SI MISMA: un log que
-- se poda sin dejar constancia tiene un agujero del tamano de la poda.

create or replace function public.purgar_audit_log(p_meses integer default 24)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_borradas integer;
  v_corte    timestamptz := now() - make_interval(months => p_meses);
begin
  delete from public.audit_log where occurred_at < v_corte;
  get diagnostics v_borradas = row_count;

  if v_borradas > 0 then
    insert into public.audit_log (action, origin, actor_role, details)
    values ('log_purgado', 'base', 'mantenimiento',
            jsonb_build_object('borradas', v_borradas, 'anteriores_a', v_corte));
  end if;

  return v_borradas;
end;
$$;

revoke execute on function public.purgar_audit_log(integer) from anon, authenticated, public;

-- ============================================================================
-- PASOS MANUALES DEL DASHBOARD (esto NO se activa solo al ejecutar el SQL):
--
--   a) Database > Extensions > activar `pg_cron`.
--   b) Volver aqui y ejecutar:
--        select cron.schedule('purgar-audit-log', '0 4 1 * *',
--                             $$select public.purgar_audit_log(24)$$);
--      (dia 1 de cada mes a las 04:00)
--   c) Si no se quiere pg_cron: ejecutar `select public.purgar_audit_log(24);`
--      a mano una vez al ano. Es igual de valido; lo que no vale es no hacerlo
--      nunca y guardar accesos para siempre.
--
--   d) INFORMAR AL EQUIPO de que este registro existe, que guarda, cuanto
--      tiempo y quien lo consulta. No es cortesia: sin ello, monitorizar la
--      actividad del personal no es licito.
-- ============================================================================


-- ============================================================================
-- 9. CONSULTAS QUE SE VAN A USAR DE VERDAD
-- ============================================================================
--
-- Deliberadamente NO se construye una pantalla de "consola de auditoria" en la
-- app (razon en el analisis: no hay modelo de roles, y la pregunta que importa
-- se hace dos veces al ano). Estas tres consultas son la herramienta.

-- 9.1 ALCANCE DE UNA BRECHA: que toco esta cuenta, y a que clientes afecto.
--     Es LA consulta. Sin ella hay que notificar asumiendo la cartera entera.
--     Sustituir el correo y las fechas.
--   select occurred_at, action, origin, client_empresa, details, ip
--     from public.audit_log
--    where actor_email = 'cuenta@alanait.com'
--      and occurred_at between '2026-08-01' and '2026-08-31'
--    order by occurred_at;
--
--   select distinct client_id, client_empresa
--     from public.audit_log
--    where actor_email = 'cuenta@alanait.com'
--      and action in ('ficha_abierta','pdf_generado','fichero_exportado')
--      and occurred_at between '2026-08-01' and '2026-08-31';

-- 9.2 Vista corta para la pantalla de actividad de una ficha.
create or replace view public.v_actividad_ficha as
  select id, occurred_at, coalesce(actor_email, '(fuera de la aplicacion)') as quien,
         action, origin, client_id, client_empresa, details
    from public.audit_log
   where action <> 'log_purgado';

grant select on public.v_actividad_ficha to authenticated;

-- 9.3 Lo que sale del sistema. Un PDF o un .alanait en un portatil ya no lo
--     controla nadie: esta es la lista que conviene mirar de vez en cuando.
--   select occurred_at, actor_email, action, client_empresa
--     from public.audit_log
--    where action in ('pdf_generado','fichero_exportado')
--    order by occurred_at desc limit 50;


-- ============================================================================
-- COMPROBACION
-- ============================================================================
--
-- 1) Nada se ha perdido. Antes y despues tienen que coincidir:
--      select (select count(*) from public.clients)          as fichas,
--             (select count(*) from public.client_versions)  as versiones,
--             (select count(*) from public.client_images)    as capturas;
--
-- 2) La autoria historica se reconstruyo, y los huecos estan declarados:
--      select author_origin, count(*) from public.client_versions group by 1;
--    Esperado: 'derivada' la mayoria, 'indeterminada' las que caian al fallback
--    de texto libre, 0 filas en 'legacy'. Ninguna 'directa' todavia.
--
-- 3) Ninguna ficha se queda sin autor del estado vivo:
--      select count(*) from public.clients where updated_by_email is null;
--    Solo deberian salir fichas creadas antes de que existiera el login.
--
-- 4) El log NO se puede borrar desde la app. Con sesion iniciada, desde la
--    consola del navegador en produccion:
--      await supabase.from('audit_log').delete().eq('id', 1)
--      await supabase.from('audit_log').update({action:'x'}).eq('id', 1)
--    Las dos tienen que devolver error de permisos, y
--      select count(*) from public.audit_log;
--    no debe cambiar.
--
-- 5) No se puede firmar como otro. Desde la misma consola:
--      await supabase.from('audit_log').insert({action:'ficha_abierta',
--        actor_email:'otro@alanait.com'})
--    Debe fallar: no hay privilegio de INSERT sobre actor_email.
--      await supabase.from('audit_log').insert({action:'ficha_borrada'})
--    Debe fallar tambien: la politica solo admite los cuatro tipos declarables.
--      await supabase.from('audit_log').insert({action:'ficha_abierta'})
--    Debe funcionar, y la fila resultante tiene que traer TU correo y origin='app'.
--
-- 6) La atribucion nueva es correcta. Con dos cuentas distintas: A guarda una
--    ficha, luego B la guarda. La version que se crea con el guardado de B
--    tiene que decir author_email = A (A escribio ese contenido) y
--    author_origin='directa'. Si dice B, el bug ha vuelto:
--      select version, author_email, author_origin, changed_by
--        from public.client_versions where client_id = '<id>' order by version desc;
--
-- 7) Guardar dos veces seguidas sin tocar nada NO crea version ni asiento.
--
-- 8) El borrado de una ficha con capturas deja UN asiento 'ficha_borrada',
--    no uno por captura.
-- ============================================================================


-- ============================================================================
-- VARIANTE: lectura del log restringida
-- ============================================================================
-- Si se decide que el log no lo vea todo el equipo, sustituir la politica de
-- lectura por esto. Cambiar la lista cuando cambie quien lleva el cumplimiento.
--
--   create or replace function public.es_admin_auditoria() returns boolean
--   language sql stable security definer set search_path = auth, pg_temp as $$
--     select lower(coalesce(auth.jwt() ->> 'email','')) in ('informatica@alanait.com');
--   $$;
--
--   drop policy "audit_log: lectura para el equipo" on public.audit_log;
--   create policy "audit_log: cada uno lo suyo, el responsable todo"
--     on public.audit_log for select to authenticated
--     using (actor_id = auth.uid() or public.es_admin_auditoria());
--
-- Con esta variante, la pestana "Actividad" de la app solo tiene sentido para
-- el responsable: al resto le mostraria unicamente sus propios pasos.
-- ============================================================================
