# Estado actual — ALANA IT Onboarding

> Última actualización: 2026-08-20, al cerrar la sesión que fusionó la Fase 4 a producción.
> Verificado contra el repositorio, no solo contra la conversación.

## Qué es el proyecto

Aplicación web interna de ALANA IT (un MSP) para documentar la auditoría técnica de
onboarding de un cliente nuevo **durante la visita**. React + Vite + Supabase,
desplegada en Vercel. El técnico rellena 15 secciones de infraestructura, la app
calcula un **CiberScore** 0–100 y genera un **informe PDF interno**.

- **Producción:** https://alanait-onboarding.vercel.app
- **Repo:** github.com/alanait/alanait-onboarding
- **Rama por defecto:** `main`

## Dónde estamos exactamente

**Todo el trabajo está fusionado en `main` y desplegado en producción.** El árbol
está limpio salvo el propio handoff. No hay trabajo a medias en el código.

```
4dbfbe5  Arregla pantalla en blanco: fechaVisita no llegaba a Rejilla/Grupo   <- HEAD
d76ff6e  Marca en el formulario que campos mueven la nota
be190be  Deduce el soporte del SO de la version en vez de preguntarlo
c9caebc  Una pregunta sin contestar se nombra con su pregunta, no acusando
e9db1b0  Un aviso identico en varias instancias es una tarea, no seis
972a7c8  La nota mide la proteccion demostrada, no lo que se llego a mirar
cbfd9ef  Mide cuanta evidencia respalda cada nota (sin cambiar todavia ninguna nota)
7cf54b9  Protege tambien las filas de tabla sueltas del corte entre paginas
3db2e9c  Corta el PDF a mano: el autoPaging de jsPDF desalinea segun baja
340e9d9  Separa el marcador de salto de pagina del contenido visible
af8a646  Arregla paginacion y barras del informe ejecutivo en el PDF exportado
e628ad6  Fase 4: informe ejecutivo
0682df6  La nota solo se da cuando significa algo
```

**Último punto estable conocido:** `4dbfbe5` (= HEAD de `main`), desplegado y
verificado en el navegador (carga la pantalla de login, cero errores de consola).

**Modelo de puntuación:** `SCORE_MODEL_VERSION = "2.1.0"` (`src/score/dominios.js`).

## Qué está terminado

- **Motor CiberScore v2.1.0.** Denominador = peso *aplicable* (ver DECISIONS.md,
  es la decisión central del día). Mide `evidencia` en vez de la antigua
  `cobertura`. Deduce el soporte del SO de la versión.
- **Informe ejecutivo interno** en el PDF: sello de nota en portada, página de
  diagnóstico con 7 dominios ponderados, hallazgos críticos, preguntas críticas
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

Este orden viene de un análisis multiagente con fase adversarial y está ordenado
por daño, no por esfuerzo. Los puntos 1–3 se refuerzan entre sí: **hacer el 4
antes que el 3 bloquearía a clientes legítimos.**

1. **Precondiciones para `email`, `red`, `wifi`, `servidores` y `sai`.**
   Es el agujero más grande y está medido: negar secciones es gratis. Hoy solo
   `backup` y `antivirus` tienen precondición (negarlas genera hallazgo).
   Marcando 13 de 15 secciones como «no» desaparecen 4 dominios enteros —
   perímetro, identidad, correo y física, el **54 % del peso del modelo** — sin
   un solo hallazgo. **Cambia notas → subir `SCORE_MODEL_VERSION` a 2.2.0 o 3.0.0.**
   El dueño lo sabe y dejó la decisión pendiente para no acumular tres cambios de
   nota el mismo día.

2. **La fuga de los campos padre (`dep`): 29 puntos de denominador.**
   6 campos que no puntúan por sí mismos deciden si puntúan otros:
   `backup.repo_dedicado` pesa 0 y abre 10; `servidores.so_familia` pesa 0 y abre
   6; también `licenciamiento.tipo_servicio` (4), `servidores.tipo` (2),
   `email.proveedor` (2), `pcs.moviles` (1). Dos arreglos posibles: (a) que esos
   campos pasen a ser criterios con peso ≥ al que podan, o (b) partir la poda para
   que el balance nunca sea negativo.
   **Mientras esto siga así, NO publicar ningún contador de «faltan N
   comprobaciones»**: publicar la cuenta atrás es publicar el atajo.

3. **Salida honesta para los 12 capadores que no la tienen.**
   `red_firewall`, `wifi_cifrado`, `backup_ultimo_job`, `backup_pruebas`,
   `identidad_email_mfa`, `srv_so_soporte`, `sai_existe` y 5 más: hoy el técnico
   solo puede dejarlos en blanco o mentir. Sin esto no se puede exigir nunca
   `capadoresPendientes = 0`.

4. **Umbral por dominio, no solo global.** Diagnóstico verificado: la media global
   deja esconder un dominio entero (dejando Perímetro 18 + Backup 18 sin tocar y
   el resto perfecto se llega a evidencia 60 %, `fiable = true`, con dos tarjetas a
   0/100). **Requiere antes los puntos 1 y 3**, o bloquearía permanentemente al
   cliente de 6 usuarios sin correo corporativo.

5. **Calibración de Perímetro para clientes de 5–7 usuarios.** Un micro-cliente
   perfecto se queda en perímetro 37–57 porque firewall dedicado, UTM, VLANs,
   monitorización y línea de respaldo son controles de empresa mediana. Con
   Perímetro pesando 18/100, arrastra la nota de todos los clientes pequeños.
   **Es decisión de negocio, no técnica**: la palanca sería repartir pesos por
   tamaño de cliente, no añadir «no aplica».

6. **`App.jsx` → `avanceSeccion`**: la barra del carril de secciones sigue midiendo
   campos rellenos. Es la tercera aparición del mismo porcentaje engañoso; la
   receta es la del contador doble y cabe en pocas líneas.

7. **`pcs_rmm_agente` (peso 2) está mal colocado**: mide si ALANA ya desplegó su
   RMM, que en un onboarding vale 0 para todos por definición. Mide nuestro
   trabajo, no el riesgo del cliente.

## Ficheros relevantes ahora mismo

| Fichero | Por qué importa |
|---|---|
| `src/score/computeScore.js` | Motor puro. La decisión del denominador vive aquí. |
| `src/score/criterios.js` | 93 criterios + 2 precondiciones + `CAMPOS_QUE_PUNTUAN`. |
| `src/score/dominios.js` | 7 dominios ponderados, `EVIDENCIA_MINIMA`, versión del modelo. |
| `src/score/soporteSO.js` | Tabla de fin de soporte de SO (nuevo hoy). |
| `src/sections.js` | Esquema del formulario. **Los ids son claves de BD.** |
| `src/print/informe.js` | Parte ejecutiva del PDF. |
| `src/print/exportarPdf.js` | Corte manual del canvas en páginas. |
| `src/components/fields.jsx` | Formulario; marcado de campos que puntúan. |
| `src/components/ReportPanel.jsx` | Panel lateral en vivo. |

## Cambios sin commit

Solo documentación; **ningún cambio de funcionalidad**:

| Fichero | Qué |
|---|---|
| `.gitignore` | `.claude/` → `.claude/*` + `!.claude/handoff/`, para que el handoff sí se versione. |
| `CLAUDE.md` | **Nuevo.** No existía. Reglas permanentes. |
| `.claude/handoff/*` | **Nuevo.** Este handoff + `analisis/` con las dos síntesis multiagente rescatadas del scratchpad. |
| `README.md` | Añadidos CiberScore, avisos e informe ejecutivo a «Funcionalidades» (faltaban: el README era anterior) + puntero al handoff. |
| `ejemplos/README.md` | Notas obsoletas corregidas (53→51, 32→30, 6→5) y nota de mantenimiento. |

## Deuda de documentación detectada (no corregida)

- **`KB.md`** dice «Última actualización: Marzo 2026» y **no menciona el
  CiberScore, los avisos ni el informe ejecutivo**. Está desfasado. No se tocó
  porque es documentación de usuario final y reescribirla excede el alcance de la
  consolidación.

## Tests

**92 en verde, 0 fallos.** Ninguno falla.

```
node scripts/test-score.mjs      → 55 correctas, 0 fallos
node scripts/test-informe.mjs    → 37 correctas, 0 fallos
node scripts/check-ids.mjs       → 396 campos preservados
node scripts/check-imports.mjs   → 57 simbolos resueltos
node scripts/check-score.mjs     → 93 criterios, 2 precondiciones, 7 dominios
```

Notas de las 5 fichas de ejemplo con el motor actual: **99 / 78 / 51 / 30 / 5**
(evidencia 100 / 100 / 99 / 97 / 96 %).

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
