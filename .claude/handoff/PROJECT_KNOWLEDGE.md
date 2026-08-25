# Conocimiento del proyecto

> Lo que hay que saber antes de tocar ciertas partes, y que no es evidente
> leyendo el código por encima. `README.md` y `KB.md` cubren el «qué es la app»;
> esto cubre el cómo y los límites.
>
> Actualizado el 2026-08-25 (modelo 2.6.0).

---

## 1. Arquitectura y flujo de datos

```
Formulario (App.jsx + components/fields.jsx)
        │  formData / sectionEnabled / instanceCounts
        ├──► borrador.js        (copia local automática en localStorage)
        ▼
computeScore()  ← función PURA (score/computeScore.js)
        │  { nota, fiable, motivoNoFiable, evidencia, dominios[], hallazgos[],
        │    capadoresPendientes[], seccionesDeclaradas[], negadasSinMotivo[],
        │    contradicciones[], padresSinDecidir[], sinResponder[] }
        ├──► ReportPanel.jsx      (panel lateral en vivo)
        └──► print/informe.js     (parte ejecutiva del PDF)
                    │
                    ▼
             print/buildPrintHTML.js   ← FUENTE ÚNICA del informe
                    │                     (la usan PDF y Ctrl+P)
                    ▼
             print/exportarPdf.js      ← corta el canvas a mano
```

**Invariante clave:** `buildPrintFragment()` es la única fuente del informe. La
usan tanto la exportación a PDF como la vista de impresión del navegador, para que
no puedan divergir. Antes había dos implementaciones paralelas.

**Persistencia:** Supabase (PostgreSQL + Storage + Auth). La tabla `clients` guarda
`section_enabled`, `form_data`, `instance_counts` y datos de empresa en JSONB.

> **La nota NO se guarda en base de datos.** Se recalcula en cada render y en cada
> impresión. Por eso subir `SCORE_MODEL_VERSION` no requiere migración ni backfill.

---

## 2. Las cuatro reglas del modelo de puntuación

Documentadas en la cabecera de `computeScore.js`:

1. **Lo que no se ha comprobado no puntúa.** Campo vacío o «No revisado» **sigue
   contando en el denominador y vale 0**. Lo único que sale del denominador es lo
   que **NO APLICA** — una afirmación sobre el *cliente*, no sobre la *visita*.
   (`computa` fuerza que un literal concreto sí puntúe cuando desconocerlo es en sí
   el riesgo: p. ej. `red_rdp`.)
2. **Caps críticos.** Hay hallazgos que ninguna suma de puntos maquilla.
3. **Multi-instancia.** `min` (manda la peor) o `max` (basta una buena).
4. **Un cliente perfecto da EXACTAMENTE 100.** Restricción dura del dueño. Desde
   2.6.0 hay **prueba propia en `test-score.mjs`**, construida a partir de los
   `CRITERIOS` reales (el mejor literal de cada mapa) para que no caduque al añadir
   criterios.

### Las 5 precondiciones (`PRECONDICIONES` en `criterios.js`)

| id | sección | cuando | efecto |
|---|---|---|---|
| `sin_backup` | `backup` | `"no"` | `capGlobal: 59`, `capDominio: 0` |
| `sin_antivirus` | `antivirus` | `"no"` | `capDominio: 30` (dominio `puestos`) |
| `sin_email` | `email` | `"no"` | `capDominio: 0` |
| `sin_red` | `red` | `"no"` | `capDominio: 0` |
| `sin_pcs` | `pcs` | `"no"` | `capDominio: 0` |

Existe un mecanismo `salvoSi` que exime una precondición si otra sección hace
legítimo el «no». **Hoy no lo usa nadie**: se construyó para `sin_sai` y esa
precondición se revirtió el mismo día (C5). Se deja porque es la forma correcta de
expresar «este "no" solo es carencia si existe algo que proteger».

### El peso de un criterio es relativo a su dominio

`peso` (1 a 5) **no es puntos de la nota**. El peso del dominio se reparte entre sus
criterios: es suma cero. La cuenta real es:

```
% de la nota = peso_criterio / suma_pesos_del_dominio × peso_del_dominio
```

Consecuencias: **añadir criterios a un dominio diluye a todos los demás**, y **el
impacto de cualquier criterio está acotado por el peso de su dominio**. Si hace
falta que un control mueva la nota más de lo que permite su dominio, la palanca
**no es el peso: es un cap** (D15 y D17).

---

## 3. Mecanismos añadidos en 2.6.0 — hay que conocerlos antes de tocar el motor

**`depSeccion`** — un criterio puede colgar de OTRA sección. Solo lo usa
`av_servidores`, que vive en el dominio `servidores` pero pregunta en la sección
`antivirus`. Sin esto, negar `servidores` dejaba un dominio de 11 puntos decidido
por un único campo sin forma honesta de contestarse.

**`MOTIVOS_INEXISTENCIA` + campos `soloSiNo`** — las 5 secciones declarables
(`servidores`, `wifi`, `vpn`, `sai`, `licenciamiento`) tienen dos campos que **solo
se pintan cuando la sección se marca «no»**: `sin_servicio_motivo` (select) y
`sin_servicio_detalle` (texto, `dep` de `"Otro (indicar)"`). Se guardan en
`form_data[seccion]["0"]`.
- `SectionFields` los filtra con `f.soloSiNo`; el bloque `enabled === "no"` de
  `App.jsx` (~línea 1010) los pinta.
- **NO están en `CAMPOS_QUE_PUNTUAN`** a propósito: deciden el sello, no la nota.

**`CONTRADICCIONES`** — 11 reglas que cruzan una sección declarada inexistente
contra una respuesta CERRADA de otra sección. **No son hallazgos y no tocan la
nota**: solo bloquean `fiable`. Solo señales duras; las blandas se descartaron a
propósito (`pcs.dominio = "Sí"` se contesta igual con Entra ID y sin servidores).
Incluye una regla **simétrica** (`contra_vpn_inversa`) para que mentir en la señal
no sea la salida barata.

**`motivoNoFiable`** — se calcula UNA vez en el motor. Cascada, y **el orden es
parte del diseño**: `sin_nota` → `secciones` → `evidencia` → `contradicciones` →
`sin_motivo` → `padres`. La evidencia manda siempre que sea ella la que no llega
(lección de C6). `informe.js` y `ReportPanel.jsx` lo consumen; **no rederivar la
cascada en ningún sitio más**.

**`sinDecidir()`** — un campo PADRE contestado con un literal de
`LITERALES_SIN_COMPROBAR` («No revisado») cuenta igual que en blanco. Antes valía
más: cerraba el `dep` de los hijos y devolvía el sello.

**`declaradoSinComprobar`** — un literal que entra por `computa` sigue puntuando lo
que dice su mapa, pero **deja de cerrar el capador pendiente**.

---

## 4. Contrato de datos — LO MÁS IMPORTANTE

**Los `id` de secciones y campos en `src/sections.js` son claves de base de datos
permanentes.** Se guardan literalmente en el JSONB de Supabase.

- **Solo cambios ADITIVOS.** Nunca renombrar ni borrar un id.
- `scripts/check-ids.mjs` **rompe el build**. Compara contra
  `scripts/ids-snapshot.json` (**406 campos** desde 2.6.0).
- Acepta campos nuevos automáticamente («+N campos nuevos»), pero para fijarlos en
  la instantánea hay que ejecutar `node scripts/check-ids.mjs --update`.
- El guardarraíl vigila también los arrays de `options`.

**Corolario:** añadir una opción a un desplegable es seguro; quitarla o
reescribirla, no.

---

## 5. Los SEIS guardarraíles

Encadenados en `npm run build`: **fallan el deploy de Vercel**, no solo avisan.

| Script | Qué protege |
|---|---|
| `check-ids.mjs` | El contrato de datos (ids y opciones). 406 campos. |
| `check-imports.mjs` | Símbolos usados pero no importados. 72 símbolos. |
| `check-score.mjs` | Literales de criterios contra el esquema, clasificación de toda opción de campo puntuado, peso entre 1 y 5, **y desde 2.6.0**: que `depSeccion` apunte a una sección real, que cada señal de `CONTRADICCIONES` case con literales reales, y que las opciones de `sin_servicio_motivo` coincidan con `MOTIVOS_INEXISTENCIA`. |
| `test-score.mjs` | **115** pruebas del motor. |
| `test-informe.mjs` | **58** pruebas del informe, sin navegador. |
| `test-borrador.mjs` | **33** pruebas del borrador local, con un `localStorage` de mentira **con cupo**. |

**Lo que NO cubren:** identificadores fuera de ámbito en JSX (causó una pantalla en
blanco en producción — C1) y la paginación real del PDF. **Un barrido con regex
para lo primero se intentó dos veces y da demasiados falsos positivos** (nombres de
propiedades CSS dentro de `<style>` y de objetos de estilo en línea). La vía real
sería ESLint con `no-undef`.

---

## 6. Sistema de avisos (hints)

- Catálogo declarativo en `src/hints.js`: **116 avisos** — 72 `seguridad`,
  21 `comercial`, 18 `doc`, 5 `legado`.
- `seguridad` y `legado` son **marcables** (Hecho / Pendiente / N/A); `comercial` es
  `interno: true` y **nunca se entrega al cliente**; `doc` es informativo.
- Estado en `formData.__hints__` con clave `"hintId@instanceIdx"` (`claveHint`).
  Viaja gratis a Supabase, al historial y al export `.alanait`.
- **Los avisos son independientes del CiberScore.** En el panel conviven ambos y es
  fácil confundirlos — el Manual dedica una sección a separarlos.

---

## 7. Lectura de campos condicionales — trampa conocida

`lectorEfectivo(sectionId, getVal, idx)` en `sections.js`.

Un campo cuyo `dep` no se cumple no se pinta, **pero su valor sigue en `form_data`**
si alguna vez se contestó. Leer en crudo hace que un valor fósil dispare avisos que
el técnico no puede resolver, y que puntúe.

> **Todo lo que interprete respuestas (avisos, informe, score) debe leer por
> `lectorEfectivo`, no directamente de `form_data`.**

---

## 8. Borrador local (`src/lib/borrador.js`)

- Clave `alanait_borrador` en `localStorage`, con `version` para descartar formatos
  viejos en vez de interpretarlos mal.
- Se escribe **1,5 s después de dejar de escribir** y en `pagehide` /
  `visibilitychange`.
- **Tres intentos de escritura**, aligerando capturas por escalones: (0) todo,
  (1) fuera las base64 aún no subidas, (2) fuera todas. Se **cuentan** las omitidas
  y se dicen al recuperar.
- Solo se reintenta aligerando si el fallo es de cupo (`QuotaExceededError`,
  `NS_ERROR_DOM_QUOTA_REACHED`, `code === 22`).
- Se borra al guardar en la nube, al exportar sin Supabase, al abrir otro cliente,
  al cargar un `.alanait` y al empezar de cero.
- **NO apaga el punto de «cambios sin guardar».**

---

## 9. Auditoría (`supabase-auditoria.sql` + `src/lib/auditoria.js`)

> **PENDIENTE DE EJECUTAR EL SQL.** El código funciona con y sin él, a propósito.

- Las **mutaciones** las registran triggers `SECURITY DEFINER` de Postgres; lo que
  no muta nada (abrir ficha, PDF, exportar, restaurar) lo declara la app con
  `origin='app'` frente a `origin='base'`.
- `GRANT INSERT` **por columnas**: el navegador no puede nombrar `actor_id`,
  `origin` ni `occurred_at`.
- El log **no guarda contenido del formulario**: solo ids de sección, número de
  versión y contadores.
- **`createVersionSnapshot` sigue en `clientService.js` a propósito**, aunque el
  trigger la deje obsoleta: si el SQL no está ejecutado, es lo único que crea
  historial. Retirarla solo cuando el SQL esté confirmado en producción.
- **`getVersions` pide las columnas de autoría con reintento sin ellas**: pedir una
  columna inexistente no devuelve null, hace fallar la consulta entera.

---

## 10. Generación del PDF

- `html2pdf.js@0.14.0`. **Todo en cliente, sin servidor.**
- **No se usa `.save()`**: `exportarPdf.js` renderiza un canvas y lo corta a mano
  (D9).
- Clases: `.pdf-break-before` (marcador vacío de 24 px, **separado** del contenido)
  y `.pdf-avoid`.
- Contenedor a `190mm` = A4 menos los márgenes de 10 mm.
- `pagebreak: { mode: ['legacy'], ... }`; `avoid-all` queda fuera a propósito.

---

## 11. Integraciones externas

- **Supabase**: BD, Auth (login restringido a `@alanait.com` **solo en el
  navegador**) y Storage (bucket `client-images`, **privado**, `createSignedUrl` de
  8 h).
- **Vercel**: deploy automático desde `main` → producción; cada rama genera preview.
  **Las previews usan las mismas credenciales de Supabase que producción.**
- **Hudu**: hay conectores MCP en el entorno. **La app no se integra todavía** — es
  la siguiente fase. El asset de la propia aplicación está en
  https://alanait.huducloud.com/a/d303da0ec8e2 (empresa id 3, layout
  «Aplicaciones / Licencias» id 8, asset id 4476).
- **NinjaOne**: hay conector MCP, sin integración.

---

## 12. Variables de entorno (SOLO NOMBRES)

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Configuradas en Vercel. La anon key va incrustada en el bundle público, por eso
**las políticas RLS deben restringir por rol `authenticated`**.

Proyecto de Supabase: `zqdogsxqkmjjnbzkuxwq` (referencia pública, no es secreto).

---

## 13. Acoplamiento con Supabase — medido el 25/08

Relevante para cualquier plan de migración:

- De los **26 ficheros** de `src/`, solo **6 mencionan Supabase**, y dos de ellos
  (`App.jsx`, `Dashboard.jsx`) únicamente para `isSupabaseConfigured()`.
- El acoplamiento real son **4 ficheros y 515 líneas**: `supabase.js` (10),
  `auth.js` (54), `clientService.js` (394), `auditoria.js` (57).
- **Los otros 22 ficheros no saben que Supabase existe**: motor, secciones, avisos,
  informe, PDF, borrador, Manual y todos los guardarraíles.
- Lo acoplado de verdad es el **SQL: 1.001 líneas** con 33 usos de superficie propia
  de Supabase (`auth.uid()`, `auth.jwt()`, `auth.users`, `storage.objects`,
  `supabase_auth_admin`, `request.headers`).
- **No hay ninguna función de servidor.** `vercel.json` son 5 líneas.

---

## 14. Despliegue y verificación

```bash
npm run build     # 6 guardarraíles + vite build (outputDirectory: build/)
```

- **`node_modules` NO está instalado localmente.** No se puede `npm run dev` ni
  renderizar React. **La verificación real es la preview desplegada.**
- Para encontrar la preview de una rama sin CLI de Vercel:
  ```bash
  gh api "repos/alanait/alanait-onboarding/deployments?per_page=1" --jq '.[0].id'
  gh api "repos/alanait/alanait-onboarding/deployments/<ID>/statuses" --jq '.[0].environment_url'
  ```
  La URL del panel de Vercel (`vercel.com/...`) pide login y no sirve.
- Para saber qué build sirve una URL: hash de `/assets/index-XXXX.js`.
- El PDF imprime la **versión del modelo** en la caja «Alcance».
- **Limitación permanente de la verificación:** el Panel de Clientes y el editor
  están detrás del login, y **Claude no puede iniciar sesión**. Todo lo que solo se
  ve con sesión iniciada (formulario, panel lateral, Manual) lo tiene que mirar el
  dueño.

---

## 15. Convenciones de código

- **Comentarios en español SIN tildes**, explicando el **porqué**.
- **Textos de cara al usuario en español CON tildes.**
- Los comentarios largos que explican una trampa se dejan **junto al código**.
- Mensajes de commit en español, contando el porqué y el caso real.
- **Nada de negritas 700/800 en tipografía**: Jost en pesos 300–500.

---

## 16. Casos límite ya cubiertos (no re-romperlos)

- Cliente vacío → `nota === null`.
- Cliente con una sola respuesta → nota devuelta pero `fiable === false`.
- `buildPrintFragment` con `score = null` → sigue generando informe.
- Cliente impecable → no genera bloque de hallazgos vacío.
- Multi-instancia con valor resuelto (`min` con 0, `max` con 1) → evidencia 100 %
  sin exigir mirar las demás instancias.
- Borrador de otra versión o corrupto → se descarta, no se interpreta.
- Ficha recién abierta (solo con la fecha de hoy) → no se ofrece recuperarla.
