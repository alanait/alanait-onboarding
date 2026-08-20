# Conocimiento del proyecto

> Lo que hay que saber antes de tocar ciertas partes, y que no es evidente
> leyendo el código por encima. `README.md` y `KB.md` cubren el «qué es la app»;
> esto cubre el cómo y los límites.

---

## 1. Arquitectura y flujo de datos

```
Formulario (App.jsx + components/fields.jsx)
        │  formData / sectionEnabled / instanceCounts
        ▼
computeScore()  ← función PURA (score/computeScore.js)
        │  { nota, fiable, evidencia, dominios[], hallazgos[], capadoresPendientes[] }
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
> impresión. Por eso subir `SCORE_MODEL_VERSION` no requiere migración ni backfill:
> cada cliente muestra su nota nueva la próxima vez que alguien lo abre.
> Verificado en `supabase-setup.sql` y `src/lib/clientService.js`.

---

## 2. Las tres reglas del modelo de puntuación

Están documentadas en la cabecera de `computeScore.js`. Resumen:

1. **Lo que no se ha comprobado no puntúa.** Campo vacío o «No revisado» **sigue
   contando en el denominador y vale 0**. Lo único que sale del denominador es lo
   que **NO APLICA** — que es una afirmación sobre el *cliente*, no sobre la
   *visita*. (Un criterio puede declarar `computa` para forzar que un literal
   concreto sí puntúe cuando desconocerlo es en sí el riesgo: p. ej. `red_rdp`.)
2. **Caps críticos.** Hay hallazgos que ninguna suma de puntos maquilla: capan su
   dominio, y algunos la nota global.
3. **Multi-instancia.** Con varios servidores o redes, cada criterio dice si manda
   la peor instancia (`min`) o si basta una buena (`max`).

**Las 2 precondiciones que existen hoy** (`PRECONDICIONES` en `criterios.js`):

| id | sección | cuando | efecto |
|---|---|---|---|
| `sin_backup` | `backup` | `"no"` | `capGlobal: 59`, `capDominio: 0`, `exigida: true` |
| `sin_antivirus` | `antivirus` | `"no"` | `capDominio: 30`, `exigida: true` |

Son las **únicas** secciones donde declarar «no» genera hallazgo. Las otras 13 se
pueden negar gratis (ver KNOWN_ISSUES § A1).

**Estados de un criterio** (`estadoEnInstancia`): `noaplica` / `sincomprobar` / `valor`.
Es la distinción que hace que el modelo funcione; ver DECISIONS.md D1.

---

## 3. Contrato de datos — LO MÁS IMPORTANTE

**Los `id` de secciones y campos en `src/sections.js` son claves de base de datos
permanentes.** Se guardan literalmente en el JSONB de Supabase.

- **Solo cambios ADITIVOS.** Nunca renombrar ni borrar un id.
- `scripts/check-ids.mjs` **rompe el build** si se viola. Compara contra
  `scripts/ids-snapshot.json` (396 campos hoy).
- El guardarraíl vigila también los arrays de `options`, porque los literales
  también son datos guardados.

**Corolario poco obvio:** añadir una opción a un desplegable es seguro; quitarla o
reescribirla, no. `check-score.mjs` solo falla con opciones **perdidas**.

---

## 4. Los cinco guardarraíles

Encadenados en `npm run build`, así que **fallan el deploy de Vercel**, no solo
avisan.

| Script | Qué protege |
|---|---|
| `check-ids.mjs` | El contrato de datos (ids y opciones). |
| `check-imports.mjs` | Símbolos usados pero no importados. Nació de dos bugs reales. |
| `check-score.mjs` | Que los literales de los criterios existan en el esquema, y que **toda opción de un campo puntuado esté clasificada** (en el mapa, o en `LITERALES_NO_APLICA` / `LITERALES_SIN_COMPROBAR`). |
| `test-score.mjs` | 55 pruebas del motor. |
| `test-informe.mjs` | 37 pruebas del informe, sin navegador. |

**Lo que NO cubren:** identificadores fuera de ámbito en JSX (causó una pantalla en
blanco en producción — ver KNOWN_ISSUES C1) y la paginación real del PDF.

---

## 5. Sistema de avisos (hints)

- Catálogo declarativo en `src/hints.js` (~116 avisos).
- 4 tipos en `TIPOS_HINT`: `seguridad` y `legado` son **marcables** (Hecho /
  Pendiente / N/A); `comercial` es `interno: true` y **nunca se entrega al
  cliente**; `doc` es informativo.
- Estado persistido dentro de `formData.__hints__` con clave `"hintId@instanceIdx"`
  (`claveHint`). Viaja gratis a Supabase, al historial y al export `.alanait`, sin
  tocar el esquema de BD. Igual que `__other_notes__`.
- **Los avisos son independientes del CiberScore.** Un aviso abierto no es un
  hallazgo del score. En el panel conviven ambos y es fácil confundirlos.

---

## 6. Lectura de campos condicionales — trampa conocida

`lectorEfectivo(sectionId, getVal, idx)` en `sections.js`.

Un campo cuyo `dep` no se cumple no se pinta, **pero su valor sigue en `form_data`**
si alguna vez se contestó y luego se cambió el campo padre. Leer en crudo hace que
un valor fósil dispare avisos que el técnico no puede ver ni resolver, y que puntúe.

> **Todo lo que interprete respuestas (avisos, informe, score) debe leer por
> `lectorEfectivo`, no directamente de `form_data`.**

---

## 7. Generación del PDF

- `html2pdf.js@0.14.0` (html2canvas + jsPDF). **Todo en cliente, sin servidor.**
- **No se usa `.save()`**: `src/print/exportarPdf.js` renderiza un canvas y lo
  corta a mano. Ver DECISIONS.md D9 para el porqué completo.
- Clases de control: `.pdf-break-before` (marcador vacío de 24 px, separado del
  contenido) y `.pdf-avoid` (bloques que no se pueden partir: secciones del
  inventario, filas `<tr>`, imágenes, ítems del plan).
- El ancho del contenedor es `190mm` = A4 (210) menos los márgenes de 10 mm, para
  que el contenido se mapee 1:1 con el área imprimible.

---

## 8. Integraciones externas

- **Supabase**: BD, Auth (login restringido a dominio corporativo) y Storage
  (bucket `client-images`, **privado**, servido con `createSignedUrl` de 8 h).
- **Vercel**: deploy automático desde `main` → producción; cada rama genera preview.
  **Las previews usan las mismas credenciales de Supabase que producción** (riesgo
  conocido y aceptado).
- Existen conectores MCP de **NinjaOne** y **Hudu** en el entorno de trabajo, pero
  **la app no se integra con ellos**. Se mencionó como vía futura para poblar
  inventario automáticamente (ver CONVERSATION_KNOWLEDGE).

---

## 9. Variables de entorno (solo nombres)

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Configuradas en Vercel. La anon key va incrustada en el bundle público, por eso
**las políticas RLS deben restringir por rol `authenticated`**: cualquier política
con `USING (true)` sin restringir rol expone los datos a internet.

---

## 10. Despliegue y verificación

```bash
npm run build     # 5 guardarraíles + vite build (outputDirectory: build/)
```

- `vercel.json`: framework vite, `outputDirectory: "build"`.
- **`node_modules` no está instalado localmente.** No se puede `npm run dev` ni
  renderizar React aquí. La verificación real es la **preview desplegada**.
- Para comprobar qué build sirve una URL: mirar el hash del bundle
  (`/assets/index-XXXX.js`) en las peticiones de red. Dos URLs con el mismo hash
  sirven el mismo código.
- El PDF imprime la **versión del modelo** en la caja «Alcance». Útil para
  diagnosticar reportes de notas raras.

---

## 11. Convenciones de código

- **Comentarios en español SIN tildes**, explicando el **porqué**, no el qué.
- **Textos de cara al usuario en español CON tildes.**
- Los comentarios largos que explican una trampa se dejan **junto al código que la
  contiene**, no en un doc aparte (ver `informe.js`, `computeScore.js`).
- Mensajes de commit en español, describiendo el porqué y el caso real que lo
  motivó.

---

## 12. Casos límite que ya están cubiertos (no re-romperlos)

- Cliente vacío → no inventa nota (`nota === null`).
- Cliente con una sola respuesta → nota devuelta pero `fiable === false`.
- `buildPrintFragment` con `score = null` → sigue generando informe sin diagnóstico.
- Cliente impecable (99) → no genera bloque de hallazgos vacío.
- Multi-instancia con valor ya resuelto (`min` con 0, `max` con 1) → evidencia 100 %
  sin exigir mirar las demás instancias.
