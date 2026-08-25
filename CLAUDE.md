# ALANA IT Onboarding — instrucciones permanentes

App web interna de un MSP para auditar la infraestructura de un cliente **durante
la visita**. React + Vite + Supabase, desplegada en Vercel. Calcula un **CiberScore**
0–100 y genera un **informe PDF interno**.

**Producción:** https://alanait-onboarding.vercel.app · **Rama por defecto:** `main`

> **Al retomar trabajo existente, lee primero `.claude/handoff/`.** Empieza por
> `CURRENT_STATE.md`, que abre diciendo si el proyecto está en pausa y qué toca.
> Ahí está también el porqué de cada decisión del modelo (`DECISIONS.md`), los
> agujeros medidos (`KNOWN_ISSUES.md`), lo que solo se dijo hablando
> (`CONVERSATION_KNOWLEDGE.md`) y lo que hay que saber antes de tocar según qué
> parte (`PROJECT_KNOWLEDGE.md`).
>
> **`DECISIONS.md` y `KNOWN_ISSUES.md` § A0-bis son obligatorios antes de tocar el
> motor: SIETE diseños de corrección «obvios» ya se han descartado con medición**
> —tres en agosto y cuatro más el 24/08, estos últimos con revisión adversarial—
> todos por reintroducir el mismo bug.

## Idioma

- **Hablar con el usuario en español.**
- **Comentarios de código en español SIN tildes**, explicando el **porqué**.
- **Textos de cara al usuario en español CON tildes.**
- Mensajes de commit en español, contando el porqué y el caso real que lo motivó.

## Nunca hacer

- **Nunca renombrar ni borrar un `id` de sección o campo de `src/sections.js`.**
  Son claves de base de datos permanentes (JSONB en Supabase). Solo cambios
  aditivos. `scripts/check-ids.mjs` rompe el build si se viola.
- **Nunca introducir nada que premie esconder información.** Si contestar la verdad
  de un problema, abrir una sección o declarar que algo existe da peor nota que
  callarlo o mentir, el diseño está mal. Este proyecto ha corregido ese patrón
  cuatro veces. Probar siempre comparando **entradas distintas del mismo motor**,
  no versiones del motor con la misma entrada.
  > **Y probarlo contra las 28 rutas de ocultación, no solo contra el campo en
  > blanco.** Un capador se esquiva de tres formas: dejarlo vacío, cerrar su `dep`
  > contestando el padre con otro valor, o negar la sección entera. Cuatro diseños
  > cayeron en agosto por medir solo la primera (`KNOWN_ISSUES.md` § A0-bis).
- **Nunca leer respuestas directamente de `form_data`.** Usar `lectorEfectivo()`:
  un campo oculto por su `dep` conserva su valor y dispararía avisos fósiles.
- **Nunca publicar un contador de "faltan N comprobaciones"** mientras exista la
  fuga de los campos padre (`KNOWN_ISSUES.md` § A2): publicar la cuenta atrás es
  publicar el atajo. Lo mismo vale para la **documentación de cara al técnico**: el
  Manual dice la conducta que se quiere ("decide las 15 secciones antes de cerrar"),
  nunca el mecanismo que la esquiva.
- **Nunca republicar los ejemplos en `public/ejemplos/`**: el botón "Cargar
  ejemplos" se retiró de producción a propósito.
- No entregar el PDF al cliente: es **interno**. La versión para cliente es una
  fase propia, no un interruptor (razón en `DECISIONS.md` D10).

## Reglas del motor de puntuación

1. **Lo que no se ha comprobado no puntúa**: cuenta en el denominador y vale 0.
   Solo sale del denominador lo que **no aplica** al cliente.
2. **Caps críticos**: hay hallazgos que capan su dominio, y algunos la nota global.
   Son además la **única** palanca capaz de mover la nota global más de lo que
   permite el peso de un dominio: el peso de un criterio está acotado por el de su
   dominio (`DECISIONS.md` D15 y D17).
3. **Multi-instancia**: `min` (manda la peor) o `max` (basta una buena).
4. **Un cliente perfecto tiene que dar exactamente 100.** Restricción explícita del
   dueño. Es gratis mantenerla —el reparto es suma cero dentro de cada dominio— pero
   **hay que verificarla** después de tocar pesos, dominios o mapas.

`computeScore()` es **pura y determinista**: no lee el reloj ni estado de React.
La fecha de la visita entra por parámetro. **Si cambian pesos, criterios,
literales o la agregación, subir `SCORE_MODEL_VERSION`** (`src/score/dominios.js`).
No hace falta migración: la nota no se guarda en BD, se recalcula.

## Comandos

```bash
npm run build     # 6 guardarraíles encadenados + vite build
node scripts/test-score.mjs          # 115 pruebas del motor
node scripts/test-informe.mjs        # 58 pruebas del informe
node scripts/test-borrador.mjs       # 33 pruebas del borrador local
node scripts/puntuar-ejemplos.mjs    # notas de las 5 fichas de ejemplo
node scripts/etiquetar-ejemplos.mjs  # reetiquetar tras cambiar el modelo
```

Los seis guardarraíles (`check-ids`, `check-imports`, `check-score`,
`test-score`, `test-informe`, `test-borrador`) están encadenados en
`npm run build`, así que **fallan el deploy**, no solo avisan.

## Verificación

- **`node_modules` NO está instalado localmente**: no se puede `npm run dev` ni
  renderizar React aquí. El usuario prefiere **validar en previews de Vercel**.
- **Tras tocar componentes React, abrir la preview y leer la consola del navegador
  antes de dar nada por bueno.** Los guardarraíles no detectan identificadores
  fuera de ámbito; así llegó una pantalla en blanco a producción. Un barrido con
  regex para detectarlos se ha intentado dos veces y da demasiados falsos positivos
  (nombres de propiedades CSS): la vía real sería ESLint con `no-undef`.
- **Claude NO puede iniciar sesión en la app.** Todo lo que solo se ve con sesión
  —formulario, panel lateral, Manual, Panel de Clientes— **lo tiene que mirar el
  dueño, y hay que decírselo explícitamente** en vez de dar por buena la pantalla.
  Sin sesión sí se puede comprobar: que la preview compila, que el login carga sin
  errores de consola, que el contenido está en el bundle, y el repaso estático de
  ámbito.
- Para saber qué build sirve una URL, comparar el hash de `/assets/index-XXXX.js`.
- El PDF imprime la versión del modelo en la caja «Alcance»: mirarla primero ante
  un reporte de nota rara.

## Peculiaridad del entorno que muerde cada sesión

**Los heredocs de bash y los `-e` de node con comillas corrompen el contenido**
(escapes `\n`, `\s`, `$`, comillas simples). Ha pasado tres veces solo en la sesión
del 24/08. **Para escribir código o texto con escapes, usar las herramientas
`Write`/`Edit`, o volcar el contenido a un fichero del scratchpad y procesarlo con
un script `.mjs`.** Ver `KNOWN_ISSUES.md` C2.

Y tras editar por script, **verificar con `grep` que el cambio persiste**: hubo un
caso de edición que desapareció sin aviso (C3).

## Flujo de trabajo

- Trabajar en **rama**, no en `main`. Fusionar solo cuando el usuario lo pida.
- El usuario es el **dueño del producto**, no un desarrollador externo: sus
  observaciones sobre comportamiento raro suelen destapar bugs reales. Medirlas
  antes de explicarlas.
