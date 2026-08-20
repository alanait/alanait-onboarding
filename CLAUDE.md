# ALANA IT Onboarding — instrucciones permanentes

App web interna de un MSP para auditar la infraestructura de un cliente **durante
la visita**. React + Vite + Supabase, desplegada en Vercel. Calcula un **CiberScore**
0–100 y genera un **informe PDF interno**.

**Producción:** https://alanait-onboarding.vercel.app · **Rama por defecto:** `main`

> **Al retomar trabajo existente, lee primero `.claude/handoff/`.** Ahí está el
> estado actual, el porqué de cada decisión del modelo de puntuación, los agujeros
> conocidos y los experimentos que ya fallaron. Especialmente `DECISIONS.md` antes
> de tocar el motor: tres diseños de corrección "obvios" ya se descartaron por
> reintroducir el mismo bug.

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
- **Nunca leer respuestas directamente de `form_data`.** Usar `lectorEfectivo()`:
  un campo oculto por su `dep` conserva su valor y dispararía avisos fósiles.
- **Nunca publicar un contador de "faltan N comprobaciones"** mientras exista la
  fuga de los campos padre (`KNOWN_ISSUES.md` § A2): publicar la cuenta atrás es
  publicar el atajo.
- **Nunca republicar los ejemplos en `public/ejemplos/`**: el botón "Cargar
  ejemplos" se retiró de producción a propósito.
- No entregar el PDF al cliente: es **interno**. La versión para cliente es una
  fase propia, no un interruptor (razón en `DECISIONS.md` D10).

## Reglas del motor de puntuación

1. **Lo que no se ha comprobado no puntúa**: cuenta en el denominador y vale 0.
   Solo sale del denominador lo que **no aplica** al cliente.
2. **Caps críticos**: hay hallazgos que capan su dominio, y algunos la nota global.
3. **Multi-instancia**: `min` (manda la peor) o `max` (basta una buena).

`computeScore()` es **pura y determinista**: no lee el reloj ni estado de React.
La fecha de la visita entra por parámetro. **Si cambian pesos, criterios,
literales o la agregación, subir `SCORE_MODEL_VERSION`** (`src/score/dominios.js`).
No hace falta migración: la nota no se guarda en BD, se recalcula.

## Comandos

```bash
npm run build     # 5 guardarraíles encadenados + vite build
node scripts/test-score.mjs          # 55 pruebas del motor
node scripts/test-informe.mjs        # 37 pruebas del informe
node scripts/puntuar-ejemplos.mjs    # notas de las 5 fichas de ejemplo
node scripts/etiquetar-ejemplos.mjs  # reetiquetar tras cambiar el modelo
```

Los cinco guardarraíles (`check-ids`, `check-imports`, `check-score`,
`test-score`, `test-informe`) están encadenados en `npm run build`, así que
**fallan el deploy**, no solo avisan.

## Verificación

- **`node_modules` NO está instalado localmente**: no se puede `npm run dev` ni
  renderizar React aquí. El usuario prefiere **validar en previews de Vercel**.
- **Tras tocar componentes React, abrir la preview y leer la consola del navegador
  antes de dar nada por bueno.** Los guardarraíles no detectan identificadores
  fuera de ámbito; así llegó una pantalla en blanco a producción.
- Para saber qué build sirve una URL, comparar el hash de `/assets/index-XXXX.js`.
- El PDF imprime la versión del modelo en la caja «Alcance»: mirarla primero ante
  un reporte de nota rara.

## Flujo de trabajo

- Trabajar en **rama**, no en `main`. Fusionar solo cuando el usuario lo pida.
- El usuario es el **dueño del producto**, no un desarrollador externo: sus
  observaciones sobre comportamiento raro suelen destapar bugs reales. Medirlas
  antes de explicarlas.
