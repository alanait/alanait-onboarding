## RECOMENDACIÓN

Recomiendo que la propia app genere el enlace. Al cerrar la ficha, el técnico pulsa «Enlace para el cliente», copia la dirección y la manda por correo o WhatsApp. El cliente la abre en el móvil sin cuenta, rellena los contratos, proveedores e inventario sencillo y pulsa «He terminado». Lo que contesta aparece solo dentro de la ficha, en un apartado aparte, y no cuenta hasta que el técnico lo acepta campo a campo. Antes del primer cliente real hay que cerrar el alta de cuentas, que está abierta hoy en producción. Eso hay que hacerlo con portal o sin él.

## COMO FUNCIONARIA

**El técnico**
1. Con la ficha guardada, pulsa «Enlace para el cliente». Elige la caducidad (7, 14 o 30 días como máximo) y marca las secciones que se preguntan. Por defecto van todas las del perfil: líneas, correo, antivirus, nº de equipos, telefonía, impresión, ERP, licencias y otros dispositivos. Pulsa «Generar».
2. El navegador crea un token aleatorio de 256 bits y guarda solo su hash. El técnico ve una vez `https://alanait-onboarding.vercel.app/portal/#t=…` y lo copia. Si la página no es producción, sale un aviso en rojo.
3. En el Panel de Clientes y en el editor aparece «N respuestas del cliente». Se abre un panel como VersionHistory que muestra, por cada campo, lo que hay ahora y lo que propone el cliente:
   - «Aceptar» solo se activa si una función pura `puedeAceptar()` lo permite (ver plan).
   - «Rechazar» pide motivo, y puede tachar el valor como «[redactado]» si era una contraseña.
   - Una fila nueva de impresora, ERP u otro dispositivo se acepta con «Añadir como instancia nueva», que hace addInstance + setVal.
4. Después pulsa el Guardar de siempre. Solo si `saveClient` va bien se marca lo aceptado.

**El externo**
1. Abre el enlace y ve el nombre de la empresa, un aviso de privacidad, «No escribas contraseñas» y un botón «Empezar».
2. Ve formularios en blanco por sección. Como única pista de cada impresora o ERP ya registrado aparece su nombre, que sirve de etiqueta.
3. En impresión, ERP y otros dispositivos puede pulsar «Añadir otro». Cada sección tiene una caja de comentario.
4. Puede guardar y volver otro día. «He terminado» cierra el enlace.
5. Si el enlace no existe, ha caducado o se ha revocado, el mensaje es el mismo en los tres casos.
6. Nunca ve la nota, los avisos, las notas internas, las capturas ni lo que ya hay en la ficha.

## QUE TIENE QUE HACER EL DUENO ANTES

1. **Hoy, y con independencia del portal: cerrar el alta.**
   - Lo medí hoy con `GET /auth/v1/settings` y la anon key: `"disable_signup":false`.
   - Se mira en Supabase > Authentication > Hooks. Si «Before User Created» no está activo con `restringir_alta_a_alanait`, hay que ejecutar `supabase-restringir-alta.sql` y activarlo. La alternativa es desactivar «Enable signups».
   - Por qué: por AS1 (`supabase-setup.sql:78-83`, `FOR ALL TO authenticated USING (true)`), una cuenta colada ve toda la cartera. La anon key ya va en el bundle del login, así que el portal no añade riesgo, pero tampoco lo tapa.
   - `KNOWN_ISSUES.md:331` dice «El alta ya está cerrada», que es falso: lo contradicen `CURRENT_STATE.md:86` y la medición de hoy.
2. **Crear un proyecto Supabase de pruebas** (gratis, unos 20 minutos) y poner en Vercel `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` solo para la rama `feat/enlace-cliente`. `src/lib/supabase.js:3-4` ya lee esas variables. Así la rama no escribe en producción (AS5).
3. **Antes del primer cliente real:**
   - comprobar la región del proyecto (Settings > General; D25 no la verificó);
   - enlazar la política de privacidad;
   - confirmar que los contratos no prohíben recoger datos por este canal. Aquí no hay subencargado nuevo: es la misma Supabase.

No hace falta: AS1, porque el externo nunca tiene identidad Auth (medido hoy: `anonymous_users:false`), ni ejecutar `supabase-auditoria.sql`.

## PLAN DE IMPLEMENTACION

La rama `feat/enlace-cliente` sale de main **después** de fusionar las dos ramas pendientes. `8a4cc1d` ya usa D28 y reestructura App.jsx con `renderSeccion`, así que esta decisión será **D29** y las líneas de App.jsx hay que recalcularlas tras la fusión.

1. **`src/portal/campos.js`**: la lista blanca, solo ids.
   - Parto del perfil de `enlace-portal-minimo/perfil.mjs` y **quito** `red.isp_contrato` y `red.isp_soporte`, que sirven para suplantar al cliente ante la operadora.
   - `telefonia.centralita`, `telefonia.moviles` e `impresion.gestion` se preguntan, pero son **solo referencia**: son padres de dep y los decide el técnico.
   - «Añadir otro» solo en telefonia, impresion, erp y otros_dispositivos. Lo he medido con `CAMPOS_QUE_PUNTUAN`: esas secciones no tienen ningún criterio, así que crear instancias no mueve la nota. Licenciamiento sí tiene 6 criterios y queda fuera de «añadir»: las licencias extra van en el comentario.

2. **`src/portal/puedeAceptar.js`** (puro). Devuelve false si:
   - la clave está en CAMPOS_QUE_PUNTUAN, es origen de `deducibleDe` o `redundanteSi`, o es señal de CONTRADICCIONES;
   - es padre de algún `dep` o `when.field` de algún HINT;
   - es el sí/no de la sección o un motivo del no;
   - la sección no está en "si";
   - el dep está cerrado en la ficha del técnico (leído con `lectorEfectivo`, `sections.js:539`);
   - `idx >= getCount`;
   - la opción no está en `options`.

3. **`scripts/check-portal.mjs`**, encadenado en `npm run build` antes de `vite build`:
   - (a) se ejecutan las reglas de `puedeAceptar` sobre la lista;
   - (b) barrido de inercia, adaptado de `barrido-inercia.mjs`: llevar `arnes-capadores.mjs` a `scripts/`, comparar **también los avisos de HINTS** y no solo `computeScore`, y añadir el caso «instancia vacía añadida» en las 4 secciones;
   - (c) la lista del `.sql` coincide con `campos.js`;
   - (d) `src/portal` no importa nada de fuera;
   - (e) genera `src/portal/esquema.generado.json`.

4. **`scripts/test-portal.mjs`**: `puedeAceptar` con fichas de ejemplo; aplicar en bloque todo lo aceptable deja la nota y los avisos idénticos en las 5 fichas, también por las 28 rutas de ocultación. En **`test-informe.mjs`**, `<img src=x onerror=…>` en los campos del perfil no sale sin escapar de `buildPrintFragment`. Hoy `App.jsx:209` y `:28` dependen de `esc()`.

5. **`supabase-portal-enlace.sql`** (raíz), partido en dos ficheros: objetos y `-pruebas.sql`. Correcciones sobre el borrador:
   - trigger BEFORE INSERT en `portal_enlaces` que rechace claves fuera de una lista fija escrita en el SQL. Hoy solo hay `jsonb_typeof(alcance)='object'` (línea 34) y authenticated inserta `alcance` libre (línea 86);
   - una huella por instancia (su nombre en el momento de crear el enlace) y filas nuevas con clave `n1..n5`;
   - `portal_leer` devuelve solo la estructura y las etiquetas, **sin valores**, y no cuenta lecturas. Los escáneres de correo (Safe Links) abren enlaces; el uso solo se cuenta al guardar;
   - `decidido_por_email`/`decidido_at` los pone un trigger con `auth.jwt()`. Hoy los escribe el cliente (línea 92);
   - `grant update(valor)` solo para dejarlo en `"[redactado]"` con estado `rechazado`, comprobado por el trigger;
   - `drop policy if exists` antes de las líneas 95-98;
   - `purgar_portal()`: decididas a los 90 días y enlaces a los 30 días de caducar. Programarla con pg_cron, sin verificar si está activo;
   - se mantienen los `revoke … from public, anon, authenticated` y `grant execute to anon` (líneas 264-267).

6. **`portal/index.html` + `vite.config.js`**: `build.rollupOptions.input` con dos entradas (Vite ^5.4) y meta noindex. Fuentes del sistema: nada de Google Fonts, que hoy carga `index.html:15-17`.

7. **`src/portal/{main.jsx,PortalApp.jsx,cliente.js}`**: cliente Supabase con `persistSession:false`, `autoRefreshToken:false`, `detectSessionInUrl:false` y `storageKey:'portal'`. Sin `dangerouslySetInnerHTML`.

8. **`vercel.json`**: redirección 308 de `/portal` a `/portal/`. Cabeceras para `/portal` y `/portal/(.*)`:
   - `Content-Security-Policy` con `default-src 'self'; connect-src https://*.supabase.co; frame-ancestors 'none'; base-uri 'none'`;
   - `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex` y `Cache-Control: no-store`.
   Hoy `vercel.json` no tiene cabeceras y `/portal/` da 404 (medido).

9. **`src/lib/portalService.js`**, **`src/components/PortalEnlace.jsx`**, **`src/components/RespuestasCliente.jsx`**:
   - **Bloquear «Eliminar instancia»** en las secciones con un enlace activo, o revocarlo al borrar. `App.jsx:1010` reindexa y la bandeja va por índice.
   - Guardar la procedencia en `formData.__cliente__.aceptados[clave@i]={enlace,fecha,tecnico}` y marcarla como «declarado por el cliente». No se guarda la respuesta en bruto en form_data, porque iría a client_versions para siempre (AS4).
   - Sin «aceptar todo».

10. **`App.jsx`** y **`Dashboard.jsx`**: los botones, la insignia y la cola de aceptadas que se marca tras `handleSave` (`App.jsx:258`).

11. **Handoff**:
    - corregir `KNOWN_ISSUES.md:331`;
    - en `supabase-auditoria.sql:640`, `create or replace view … with (security_invoker = true)` y `revoke all … from anon`. Hoy solo hace `grant … to authenticated` (línea 646): es una deducción, no está medido;
    - añadir D29 y una entrada en el Manual que diga la conducta sin explicar qué puntúa.

**Pruebas sin tocar producción**
1. Guardarraíles de node en local.
2. SQL en el proyecto de pruebas: el fichero de pruebas con `set local role anon` dentro de `begin…rollback`. Casos: token falso, campo fuera de lista, instancia ajena y `select` directo de las tablas como anon.
3. Preview de la rama, que apunta al proyecto de pruebas. Yo abro `/portal/#t=…` sin sesión y leo la consola. El dueño mira con sesión el diálogo, el panel de revisión y las insignias, que yo no puedo ver.
4. Al fusionar: el dueño ejecuta el SQL de objetos en producción. Son solo objetos nuevos y no altera ninguna tabla existente.

## ESFUERZO

- **7–8 días de desarrollo:**
  - SQL con sus pruebas: 1,5
  - lista blanca, `puedeAceptar` y guardarraíles: 1,5
  - portal: 1,5
  - generar el enlace: 0,5
  - panel de revisión, añadir instancia y procedencia: 1,5–2
  - previews y ajustes: 0,5–1
- **Dueño: 2–3 horas** en varias sesiones (hook, proyecto de pruebas, variables de Vercel, mirar 3 pantallas con sesión, SQL final).
- **Después:**
  - «añadir licencia» con decisión sobre la nota: +1 día;
  - aviso por correo al técnico cuando el cliente termina: +1 día;
  - PIN: +0,5 días.

## POR QUE NO LAS OTRAS VIAS

- **M365 (Excel por SharePoint):**
  - Exige permitir en el tenant de ALANA enlaces «Cualquier persona» con **edición**, que es justo lo que la app puntúa con 0 a los clientes (`criterios.js:205`, `hints.js:593-597`).
  - Sites.Selected con «write» probablemente no basta para `createLink`; según la documentación de Graph harían falta FullControl u Owner.
  - Hay que registrar en Entra los URI de cada rama, sin comodines.
  - Al externo le llega un libro de unas 17 hojas, malo en el móvil, y nadie se entera de cuándo termina.
  - Sale en 10–12 días y no es lo que el dueño llama «fácil».
- **Tally:**
  - Es fácil para el cliente, pero no para el técnico: por cada cliente hay que descargar un CSV con las respuestas de **todos** los clientes, importarlo y borrarlo. Unos 12 pasos.
  - Sin Pro (20 €/mes) los técnicos tienen que compartir la cuenta del dueño.
  - Es un subencargado nuevo (art. 28.2), en un dominio ajeno que parece phishing, y el mapeo va por título de pregunta.
  - Para que las respuestas aparezcan solas hace falta un webhook a una RPC anónima, y entonces el coste se parece al del portal.
- **Papel:** el dueño lo ha descartado como primera opción. Y el portal no necesita los 4 prerrequisitos del juez anterior: solo el del alta, que es urgente igualmente.

## RIESGOS ABIERTOS

- Todo el aislamiento entre clientes depende de 2 funciones SECURITY DEFINER que nunca se han ejecutado: no hay Postgres local. La mitigación es el proyecto de pruebas, `search_path=''`, que ninguna reciba `client_id` y los casos negativos.
- Mismo origen: un XSS en el portal o en el PDF afectaría a la sesión del técnico, porque comparten localStorage. La app principal sigue sin CSP (`vercel.json`, solo HSTS medido): hay que hacerla como tarea propia. El aislamiento total sería otro dominio de Vercel (+0,5 días).
- Un token reenviado o abierto por un escáner de correo deja **proponer** cambios durante 14–30 días, pero ya no da lectura de datos.
- El técnico puede aceptar sin mirar. Que no haya «aceptar todo» y que los rechazos lleven motivo lo frena, pero no lo impide.
- La lista blanca hay que mantenerla. Si un campo del perfil pasa a puntuar o a disparar avisos, el build falla: está bien que falle, pero los enlaces ya emitidos conservan su alcance hasta 30 días, y por eso `puedeAceptar` se evalúa al aceptar, no al generar.
- Licencias extra: en el MVP solo llegan como comentario.
- Sin verificar: que Vercel sirva `build/portal/index.html` y que pg_cron esté disponible para la purga.
- RGPD: falta la región del proyecto, el texto del art. 13 y el nombre de quien rellena, que es un dato de un tercero. Supabase y Vercel registran la IP, así que el aviso no puede decir lo contrario.

Comprobaciones de hoy:
- `/auth/v1/settings` devuelve `disable_signup:false`, `mailer_autoconfirm:false` y `anonymous_users:false`.
- `/portal/` da 404.
- La vista `v_actividad_ficha` no tiene `security_invoker`.

Script auxiliar: `C:\Users\JUANCA~1\AppData\Local\Temp\claude\C--Users-JuanCarlosGarc-a-claude-AlanaOnboardingApp\5b7000c6-43e1-4a17-b3ae-a10bb2030546\scratchpad\enlace-juez\secs.mjs`.