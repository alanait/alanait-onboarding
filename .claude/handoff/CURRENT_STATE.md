# Estado actual — ALANA IT Onboarding

> Última actualización: 2026-08-21, al cerrar la sesión del motor 2.5.0.
> Verificado contra el repositorio, no solo contra la conversación.
>
> **Antes que nada, lee el punto 0 de «Qué falta».** Es el bug histórico del
> proyecto vivo en su última esquina, y el dueño pidió expresamente empezar por ahí.

## Qué es el proyecto

Aplicación web interna de ALANA IT (un MSP) para documentar la auditoría técnica de
onboarding de un cliente nuevo **durante la visita**. React + Vite + Supabase,
desplegada en Vercel. El técnico rellena 15 secciones de infraestructura, la app
calcula un **CiberScore** 0–100 y genera un **informe PDF interno**.

- **Producción:** https://alanait-onboarding.vercel.app
- **Repo:** github.com/alanait/alanait-onboarding
- **Rama por defecto:** `main`

## Dónde estamos exactamente

**Todo el trabajo está fusionado en `main` y desplegado en producción.** No hay
trabajo a medias en el código: lo que queda son huecos del modelo, no código
incompleto.

Los commits de la sesion del 21/08 (motor 2.2.0 -> 2.5.0, perdida de datos y
seguridad) estan todos en `main` y desplegados.

```
08058e4 Modelo 2.5.0: el antivirus de firmas capa el dominio de puestos
2b08610 Modelo 2.4.0: parte endpoint, ensancha la escala de peso y anade 5 criterios
ebfabe9 Modelo 2.3.0: gradua la calidad de la respuesta donde antes habia empates
b7aab2e Tres correcciones probando contra dos clientes reales incompletos
b947a07 Corrige la fiabilidad y hace visibles en vivo los hallazgos que ya lo estaban en el PDF
de0ad58 Prepara (sin ejecutar) el cierre de fondo del alta de cuentas
886c3fb Cierra la perdida de datos mas grave y dos fugas de campos fosiles
82882ae Motor 2.2.0: precondiciones para email/red/pcs/sai y tres correcciones mas
e097b0c Corrige cinco cifras del handoff que no aguantaron el contraste con el codigo
4dd2826 Guarda el porque de las decisiones del motor donde no se pierda
4dbfbe5 Arregla pantalla en blanco: fechaVisita no llegaba a Rejilla/Grupo
d76ff6e Marca en el formulario que campos mueven la nota
be190be Deduce el soporte del SO de la version en vez de preguntarlo
```

**Modelo de puntuación:** `SCORE_MODEL_VERSION = "2.5.0"` (`src/score/dominios.js`).

## Qué está terminado

- **Motor CiberScore v2.5.0.** Denominador = peso *aplicable* (ver DECISIONS.md,
  es la decisión central del día). Mide `evidencia` en vez de la antigua
  `cobertura`. Deduce el soporte del SO de la versión.
- **Informe ejecutivo interno** en el PDF: sello de nota en portada, página de
  diagnóstico con 8 dominios ponderados, hallazgos críticos, preguntas críticas
  sin contestar, plan de acción y oportunidades comerciales (marcadas «uso
  interno»).
- **Exportación PDF propia** (`src/print/exportarPdf.js`): corta el canvas a mano
  en vez de usar el `autoPaging` de jsPDF.
- **Marcado de campos que puntúan** en el formulario + contador doble por grupo.
- **Panel lateral** mide avance hacia la nota (evidencia vs umbral 60%), no % de
  campos rellenos.
- **Bucket de Supabase cerrado** (URLs firmadas, 8 h) — hecho en sesión anterior,
  verificado desde fuera.

## Qué está parcialmente implementado

Nada a medias en el código. Lo que sigue son **huecos conocidos del modelo**, no
código incompleto. Están todos documentados en `KNOWN_ISSUES.md` con su medición.

## Qué falta — próximos pasos EN ORDEN

> ### 0. ⚠️ EMPEZAR POR AQUÍ — el disparo de los capadores
>
> **Callar puntúa mejor que decir la verdad en 22 de los 24 capadores.** El peor:
> contestar «no hay MFA en el correo» da 79, dejarlo en blanco da 98 —
> **19 puntos por callarse**. Es el bug histórico del proyecto (el que ya se ha
> corregido cuatro veces) vivo en su última esquina.
>
> Medición completa, reproducción y tres vías de diseño en `KNOWN_ISSUES.md` § A0.
> **Leer también `DECISIONS.md` D1 antes de tocarlo:** el arreglo obvio —disparar
> el cap también con el campo vacío— ya está descartado, porque afirma un
> hallazgo que nadie ha visto.
>
> Lo pidió el dueño expresamente el 2026-08-21: «pues hay que arreglarlo,
> documéntalo como importante para el siguiente día».

Este orden viene de un análisis multiagente con fase adversarial y está ordenado
por daño, no por esfuerzo. Los puntos 1–3 se refuerzan entre sí: **hacer el 4
antes que el 3 bloquearía a clientes legítimos.**

1. **Terminar las precondiciones de sección.** Hecho el 21/08 para `email`, `red`
   y `pcs` (siempre hallazgo si «no»). **Quedan negables sin coste** `servidores`,
   `wifi`, `licenciamiento`, `vpn` y `sai`, y eso es **decisión de negocio del
   dueño**, no técnica: para esas cinco el «no» puede ser verdad (todo-cloud, nave
   sin wifi, nadie teletrabaja).
   **`sai` ya se probó como precondición y se revirtió el mismo día**: probado
   contra un cliente real, el dueño decidió que tener armario/rack es una
   recomendación, no algo que deba capar un dominio. No volver a proponerlo sin
   preguntar.

2. **La fuga de los campos padre (`dep`).**
   7 campos que no puntúan por sí mismos deciden si puntúan otros:
   `backup.repo_dedicado`, `servidores.so_familia`, `servidores.dominio`,
   `licenciamiento.tipo_servicio`, `servidores.tipo`, `email.proveedor`,
   `pcs.moviles`. Dos arreglos posibles: (a) que esos campos pasen a ser criterios
   con peso ≥ al que podan, o (b) partir la poda para que el balance nunca sea
   negativo.
   **Mitigado en parte desde 2.2.0**: dejarlos en blanco ya no toca la nota pero
   **bloquea el sello de `fiable`** (`CAMPOS_PADRE_SIN_CRITERIO`, que se **deriva**
   y por eso recoge sola cualquier padre nuevo). La fuga de nota sigue: aparece en
   el barrido de monotonía, 0,7 %.
   **Mientras esto siga así, NO publicar ningún contador de «faltan N
   comprobaciones»**: publicar la cuenta atrás es publicar el atajo.

3. **Salida honesta para los capadores que no la tienen.** Hay **24 capadores**.
   Cuántos carecen de salida depende de qué se considere salida, y hay que fijar
   ese criterio antes de tocar nada (medición en `KNOWN_ISSUES.md` § A3): **5** no
   ofrecen ninguna opción distinta de contestar o mentir; **15** no ofrecen «No
   aplica». Sin esto no se puede exigir nunca `capadoresPendientes = 0`.
   **Va junto con el punto 0**: son las dos caras del mismo mecanismo.

4. **Umbral por dominio, no solo global.** La media global deja esconder un
   dominio entero. **Requiere antes los puntos 1 y 3**, o bloquearía
   permanentemente al cliente de 6 usuarios sin correo corporativo.

5. **Calibración de Perímetro para clientes pequeños — OJO, el diagnóstico
   anterior era falso.** Este documento decía que un micro-cliente perfecto se
   quedaba en perímetro 37–57. **Se midió el 21/08 y sale 64, con nota global 93.**
   No hay problema de calibración medible. Y ese 93 estaba además inflado por el
   agujero A1, así que **no calibrar hasta rehacer la medición con 3-4 fichas
   reales de clientes pequeños**, no con un cliente sintético.

6. **`servidores.herramientas_acceso` puede valer «RMM del proveedor anterior»** y
   no puntúa: es exactamente el mismo riesgo que sí se cubrió el 21/08 en
   licenciamiento. Es un campo de tipo `checks` y el motor no resuelve
   multiselección contra un mapa literal. La vía sería añadir un `select` aparte.

7. **Autoguardado / borrador local.** El 21/08 se añadió aviso al cerrar la
   pestaña, pero **la visita entera sigue viviendo en memoria de React**: no hay
   autoguardado ni borrador en `localStorage`. Es el hallazgo crítico de UX de la
   auditoría y sigue abierto.

## Ficheros relevantes ahora mismo

| Fichero | Por qué importa |
|---|---|
| `src/score/computeScore.js` | Motor puro. La decisión del denominador vive aquí. |
| `src/score/criterios.js` | 98 criterios + 5 precondiciones + `CAMPOS_QUE_PUNTUAN` + `CAMPOS_PADRE_SIN_CRITERIO`. |
| `src/score/dominios.js` | 8 dominios ponderados, `EVIDENCIA_MINIMA`, versión del modelo. |
| `src/score/soporteSO.js` | Tabla de fin de soporte de SO (nuevo hoy). |
| `src/sections.js` | Esquema del formulario. **Los ids son claves de BD.** |
| `src/print/informe.js` | Parte ejecutiva del PDF. |
| `src/print/exportarPdf.js` | Corte manual del canvas en páginas. |
| `src/components/fields.jsx` | Formulario; marcado de campos que puntúan. |
| `src/components/ReportPanel.jsx` | Panel lateral en vivo. |

## De dónde sale esta documentación

Entró en `main` por el PR #14, en un único commit encima de `4dbfbe5`. Solo
documentación; **ningún fichero de `src/` ni de `scripts/` cambió**:

| Fichero | Qué |
|---|---|
| `.gitignore` | `.claude/` → `.claude/*` + `!.claude/handoff/`, para que el handoff sí se versione. |
| `CLAUDE.md` | **Nuevo.** No existía. Reglas permanentes. |
| `.claude/handoff/*` | **Nuevo.** Este handoff + `analisis/` con las dos síntesis multiagente rescatadas del scratchpad. |
| `README.md` | Añadidos CiberScore, avisos e informe ejecutivo a «Funcionalidades» (faltaban: el README era anterior) + puntero al handoff. |
| `ejemplos/README.md` | Notas obsoletas corregidas (53→51, 32→30, 6→5) y nota de mantenimiento. |

Antes de fusionarlo se contrastó **contra el código, ejecutándolo**, y aparecieron
cinco cifras mal que van corregidas en ese mismo commit: la fuga de campos padre
(25, no 29), el recuento de capadores sin salida (no reproducible, ver § A3), las
secciones que se pueden negar gratis (8, no 5), las secciones sin criterios (5 y
52 campos, no 4 y 45) y las ramas antiguas que quedan (2, no 6).

**Lección: las cifras de este handoff se escribieron de memoria de una sesión
larga. Si vas a apoyar una decisión en una, vuelve a medirla.**

## Deuda de documentación detectada (no corregida)

- **`KB.md`** dice «Última actualización: Marzo 2026» y **no menciona el
  CiberScore, los avisos ni el informe ejecutivo**. Está desfasado. No se tocó
  porque es documentación de usuario final y reescribirla excede el alcance de la
  consolidación.

## Tests

**133 en verde, 0 fallos.** Ninguno falla.

```
node scripts/test-score.mjs      → 81 correctas, 0 fallos
node scripts/test-informe.mjs    → 52 correctas, 0 fallos
node scripts/check-ids.mjs       → 396 campos preservados
node scripts/check-imports.mjs   → 57 simbolos resueltos
node scripts/check-score.mjs     → 98 criterios, 5 precondiciones, 8 dominios
```

Notas de las 5 fichas de ejemplo con el motor actual: **98 / 75 / 48 / 30 / 5**
(evidencia 100 / 100 / 99 / 98 / 96 %).

## Comandos

```bash
npm run build      # encadena los 5 guardarraíles y luego vite build
npm run dev        # servidor local (OJO: node_modules NO está instalado)
node scripts/puntuar-ejemplos.mjs      # notas de las 5 fichas de ejemplo
node scripts/escenarios-score.mjs      # escenarios sintéticos del motor
node scripts/etiquetar-ejemplos.mjs    # recalcula la nota en el nombre de empresa
```

## Qué hacer al retomar la sesión

1. **Leer `DECISIONS.md` antes de tocar el motor.** Hoy se descartaron tres
   diseños de corrección por reintroducir el mismo bug histórico. Si vas a
   cambiar la puntuación, el listado de trampas ya conocidas está ahí.
2. `git status` y `git log --oneline -5` para confirmar que sigues en `4dbfbe5`.
3. Correr los 5 guardarraíles (arriba) para partir de verde.
4. Si el dueño no dice otra cosa, **el siguiente trabajo es el punto 1 de
   «Qué falta»** (precondiciones de sección), y hay que avisarle de que cambia
   notas y sube versión de modelo.
5. **No empezar nada del motor sin leer `KNOWN_ISSUES.md`**: contiene experimentos
   fallidos ya hechos que no merece la pena repetir.
