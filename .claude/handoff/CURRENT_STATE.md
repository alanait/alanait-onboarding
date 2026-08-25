# Estado actual — ALANA IT Onboarding

> Última actualización: 2026-08-25. Verificado contra el repositorio
> ejecutándolo, no solo contra la conversación.

---

## ⏸ EL PROYECTO ESTÁ EN PAUSA

**Esperando a que lo revise Joan Cuello (el jefe).** El correo de presentación
está redactado pero **NO enviado**: Juan Carlos se lo mandará cuando Joan vuelva
de vacaciones. Hasta que haya esa revisión, no se arranca fase nueva.

El correo incluye instrucciones de registro y acceso, un resumen de para qué
sirve, y los dos usos previstos: onboarding de clientes nuevos y documentación de
la cartera de mantenimiento antigua.

> **Tres avisos que se le dieron a Juan Carlos sobre ese correo y que siguen sin
> resolver:** (1) Joan verá **datos reales de clientes**, no un entorno de
> pruebas; (2) si su correo no es `@alanait.com` el registro le fallará; (3) el
> borrador menciona «cinco clientes de ejemplo cargados», pero **el botón de
> cargarlos se retiró de producción a propósito** (D11) — o se quita esa frase o
> hay que cargárselos a mano en su cuenta.

## Lo que hay pendiente, por orden

**Siguiente fase declarada por el dueño: integrar con Hudu.** Que lo que se recoge
en la visita pase a la documentación del cliente en Hudu y no haya que teclearlo
dos veces. La configuración la hará él. Ya hay conectores MCP de Hudu en el
entorno, y el asset de la propia aplicación está documentado en
https://alanait.huducloud.com/a/d303da0ec8e2.

Acciones manuales del dueño, ninguna hecha todavía:

| | |
|---|---|
| Enviar el correo a **Joan Cuello** | cuando vuelva de vacaciones |
| Ejecutar **`supabase-auditoria.sql`** | sin él no hay registro de accesos y la autoría del historial sigue mal |
| Verificar el **Auth Hook** de restricción de altas | el registro por correo está ABIERTO (`disable_signup: false`, comprobado el 24/08) |
| Abrir el **Manual** con sesión iniciada | nadie lo ha visto renderizado: está detrás del login |
| Decidir sobre **`licenciamiento`** y **`sai`** | ver «Decisiones que tiene que tomar el dueño» |

Trabajo de desarrollo, en orden de daño:

1. **A2 — la fuga de los campos padre.** Es el punto 0 del motor y es
   prerrequisito de A0. **No tiene diseño.** (`KNOWN_ISSUES.md` § A2 y § A0-bis.)
2. **A7 — una sección sin decidir no cuesta nada.** Medido el 25/08 y **aplazado
   por decisión del dueño** («ok no lo toquemos»). Las mediciones están guardadas
   para no repetirlas. (`KNOWN_ISSUES.md` § A7.)
3. **A0 — los capadores**, después de A2.
4. **No hay recuperación de contraseña** (§ B). Quien olvide la suya se queda
   fuera hasta que un administrador entre en Supabase.
5. **AS1 — las políticas RLS** dan acceso total a cualquier cuenta autenticada.
   Pesa más ahora que el registro está abierto.
6. El resto de seguridad y de modelo, en sus apartados.

> **Antes de tocar el motor, lee `KNOWN_ISSUES.md` § A0-bis.** El orden de
> prioridades cambió el 24/08: A0 no se puede arreglar antes que A2, y eso está
> medido sobre 28 rutas de ocultación, no supuesto.

---

## Qué es el proyecto

Aplicación web interna de ALANA IT (un MSP) para documentar la auditoría técnica de
onboarding de un cliente nuevo **durante la visita**. React + Vite + Supabase,
desplegada en Vercel. El técnico rellena 15 secciones de infraestructura, la app
calcula un **CiberScore** 0–100 y genera un **informe PDF interno**.

- **Producción:** https://alanait-onboarding.vercel.app
- **Repo:** github.com/alanait/alanait-onboarding
- **Rama por defecto:** `main`

## Dónde estamos exactamente

**Modelo de puntuación: `SCORE_MODEL_VERSION = "2.6.0"`** (`src/score/dominios.js`).

Trabajo del 24/08 en la rama **`fix/capadores-autoguardado-auditoria`**, no en `main`:

```
ba56989 Historial de auditoria: quien abrio, cambio o borro cada ficha
4cdf55f Modelo 2.6.0: negar una seccion deja de comprar el sello de fiable
5706e16 Documenta por que el borrador usa localStorage y por que cuenta lo que no cabe
eb150a3 Autoguardado local: la visita deja de vivir solo en memoria de React
```

**Hay una acción manual pendiente del dueño**, y hasta que la haga el punto de
auditoría está a medias: **ejecutar `supabase-auditoria.sql`** en el SQL Editor de
Supabase. El código funciona con y sin él (ver DECISIONS D22), pero sin ejecutarlo no
hay registro y la atribución del historial sigue equivocada.

## Qué está terminado

- **Motor CiberScore 2.6.0.** Negar una sección deja de comprar el sello de fiable:
  el «no» pide motivo, 11 reglas de contradicción retienen el sello si el formulario
  se desmiente, y `depSeccion` quita el peaje de 11 puntos que pagaba el todo-cloud
  honesto. Ver DECISIONS D21.
- **Autoguardado local** (`src/lib/borrador.js`): la visita se copia a localStorage
  al parar de escribir y al salir de la página, y se ofrece recuperarla al arrancar.
  Ver DECISIONS D20.
- **Historial de auditoría** (`supabase-auditoria.sql` + `src/lib/auditoria.js`):
  escrito por triggers de Postgres, no por el navegador. **Pendiente de ejecutar.**
  Ver DECISIONS D22.
- **Dos arreglos del informe**: el bloque de comprobaciones críticas pendientes se
  imprime también cuando hay hallazgos (antes no se veía nunca en un cliente real),
  y `motivoNoFiable` se calcula una sola vez en el motor en vez de rederivarse en
  `informe.js` y `ReportPanel.jsx` por separado, que ya divergían.
- Todo lo anterior de 2.1.0–2.5.0 (precondiciones, graduación de calidad, partición
  de `endpoint`, escala 1–5, cap del antivirus de firmas), el informe ejecutivo, la
  exportación PDF propia y el bucket privado.

## Qué falta — próximos pasos EN ORDEN

> ### 0. ⚠️ EMPEZAR POR AQUÍ — A2, la fuga de los campos padre
>
> **No es lo que decía este documento el 21/08.** Entonces el punto 0 era A0 (callar
> puntúa mejor que contestar). El 24/08 se diseñaron y midieron **cuatro** mecanismos
> para cerrarlo y **los cuatro cayeron**, cada uno ante un refutador independiente,
> por la misma ley medida en 28 de 28 casos:
>
> **Por cada punto que una vía baja la rama honesta, la ventaja de esconder sube
> exactamente ese punto.** Porque el hueco de un capador solo existe si la sección
> está en «sí» y el `dep` abierto: castigar el hueco *es* premiar negar la cosa.
>
> Así que **A2 va antes que A0**, y A2 **no tiene diseño**. Medición, las 28 rutas y
> las cuatro refutaciones en `KNOWN_ISSUES.md` § A0-bis. **Leer también D1 y D21.**

1. **A0**, después de A2. Sigue vivo: callar un capador puntúa mejor que contestar en
   22 de 24. La regla correcta de `resuelto` está escrita y sin implementar (A0-bis).
2. **Ejecutar `supabase-auditoria.sql`** y, cuando esté confirmado en producción,
   retirar `createVersionSnapshot` de `clientService.js` (hoy se deja a propósito
   para que la app funcione en los dos órdenes de despliegue).
3. **AS1 — las políticas RLS dan acceso total a cualquier cuenta autenticada.** Es el
   agujero de seguridad más grande que queda, y ahora pesa más: **el registro de
   cuentas por correo está abierto** (verificado el 24/08: `disable_signup: false`).
   La protección depende entera de que el Auth Hook de `supabase-restringir-alta.sql`
   esté activo, y eso no se puede comprobar desde fuera sin dar de alta una cuenta.
4. **Umbral por dominio** (el que el dueño aplazó con «luego me lo recuerdas»).
   Requiere antes A2 y A3.
5. **A3 — salida honesta para los capadores.** 5 no ofrecen ninguna alternativa a
   contestar o mentir; 20 no ofrecen «No aplica». Va con A0.
6. **Calibración de perímetro**: sin medición válida. Hacen falta 3-4 fichas reales
   de clientes pequeños, no un cliente sintético.
7. `servidores.herramientas_acceso` puede valer «RMM del proveedor anterior» y no
   puntúa: es un campo `checks` y el motor no resuelve multiselección.
8. Resto de seguridad: AS2 (`deleteClient` ignora errores de Storage), AS4
   (`client_versions` sin poda), AS5 (previews contra la BD de producción), AS6 (el
   PDF no se declara interno en portada), AS7 (cero media queries).

## Rumbo declarado por el dueño (25/08/2026)

- **Siguiente fase: volcar la información a Hudu.** Que lo que se recoge en la visita
  acabe en la documentación de Hudu en vez de quedarse solo en la app. La
  configuración la hará él. Ya hay conectores MCP de Hudu en el entorno, y el asset
  de la propia aplicación está documentado en
  https://alanait.huducloud.com/a/d303da0ec8e2 (layout «Aplicaciones / Licencias»).
- **Segundo uso, además del onboarding:** pasar con la misma herramienta a los
  clientes de mantenimiento antiguos, para tener CiberScore comparable en toda la
  cartera. Afecta al modelo: esos clientes no son «onboarding», así que el dominio
  `saneamiento` (10 %, accesos heredados del proveedor anterior) puede no aplicarles.
  **Conviene medirlo antes de prometerlo.**
- **Estudiado y aplazado:** salir de Vercel y Supabase a Linux propio. La app apenas
  está acoplada (4 ficheros, 515 líneas, todos en `src/lib/`); lo acoplado es el SQL
  (1.001 líneas con `auth.uid()`, `storage.objects`, `supabase_auth_admin`). Vía de
  menor riesgo: autoalojar Supabase, que no obliga a tocar código. Freno real: la app
  se usa en casa del cliente, así que la infra propia tendría que estar expuesta a
  internet y disponible justo durante las visitas.

## Decisiones que tiene que tomar el dueño

1. **`licenciamiento` queda negable solo si nada más lo desmiente.** Dos respuestas
   normales (`licencias_estado = "Vigente"`, `email.proveedor = "Microsoft 365"`)
   disparan contradicción al negar la sección. Defendible, pero es cambio de negocio:
   quitar `contra_lic_antivirus` lo revierte.
2. **`sai` entró en el mecanismo del motivo.** No capa ni genera hallazgo —eso lo
   revirtió él en su día (C5)— pero ahora pide un clic más. Excluirla es un filtro de
   una línea.
3. **AS1 / registro abierto**: qué hacer con las políticas RLS y con el alta.
4. Pendientes de antes: calibración de perímetro, licencia de Centra No2, y borrar
   las ramas `fase0/modularizar` y `fase4/informe`.

## Ficheros relevantes ahora mismo

| Fichero | Por qué importa |
|---|---|
| `src/score/computeScore.js` | Motor puro. Denominador, evidencia, contradicciones, `motivoNoFiable`. |
| `src/score/criterios.js` | 98 criterios, 5 precondiciones, `MOTIVOS_INEXISTENCIA`, 11 `CONTRADICCIONES`. |
| `src/score/dominios.js` | 8 dominios, `EVIDENCIA_MINIMA`, versión del modelo y su porqué. |
| `src/lib/borrador.js` | Autoguardado local. |
| `src/lib/auditoria.js` | Eventos que la app declara (los demás los escribe la base). |
| `supabase-auditoria.sql` | **Pendiente de ejecutar.** Triggers, RLS y reconstrucción de autoría. |
| `src/sections.js` | Esquema. **Los ids son claves de BD.** 406 campos. |
| `src/print/informe.js` | Parte ejecutiva del PDF. |

## Cambios sin commitear

**Ninguno.** Árbol limpio, `main` sincronizado con `origin/main`.

## Alcance de la sesión del 24-25/08

**28 ficheros, +3.422 / −278** entre `ca7a4c5` y `HEAD`. Dos PR, los dos fusionados:
[#16](https://github.com/alanait/alanait-onboarding/pull/16) (motor 2.6.0,
autoguardado y auditoría) y
[#17](https://github.com/alanait/alanait-onboarding/pull/17) (Manual del técnico).

Ficheros **nuevos**: `src/lib/borrador.js`, `src/lib/auditoria.js`,
`src/components/Manual.jsx`, `scripts/test-borrador.mjs`, `supabase-auditoria.sql`.

## Instrumentos de medición disponibles

En `.claude/handoff/analisis/` hay tres arneses ejecutables rescatados del
scratchpad, **verificados desde esa ubicación**. El primero es además librería:

```bash
node .claude/handoff/analisis/arnes-capadores.mjs
```

Construye un cliente perfecto sintético a partir de los `CRITERIOS` reales, verifica
el invariante del 100 y saca la tabla de los 24 capadores. **Es lo primero que hace
falta para atacar A2 o A0.** Detalles en el README de esa carpeta.

## Tests

**206 en verde, 0 fallos.**

```
node scripts/check-ids.mjs       → 406 campos preservados
node scripts/check-imports.mjs   → 72 simbolos resueltos
node scripts/check-score.mjs     → 98 criterios, 5 precondiciones, 8 dominios
node scripts/test-score.mjs      → 115 correctas
node scripts/test-informe.mjs    → 58 correctas
node scripts/test-borrador.mjs   → 33 correctas
```

Los **seis** están encadenados en `npm run build`: fallan el deploy, no solo avisan.

Notas de las 5 fichas de ejemplo: **98 / 75 / 48 / 33 / 7** (evidencia 100/100/99/98/96 %).
Las dos últimas cambiaron porque las reglas de contradicción **encontraron un error de
dato real** en las fichas 04 y 05: decían «no hay VPN» documentando un FortiClient
SSL/TLS con 12 usuarios y MFA. Corregido a `vpn: "si"`.

## Qué hacer al retomar la sesión

1. **`git log --oneline -5`** para ver dónde estás. El 24/08 se cerró en
   `ba56989`, en la rama `fix/capadores-autoguardado-auditoria`.
2. Correr los seis guardarraíles para partir de verde.
3. **Leer `KNOWN_ISSUES.md` § A0-bis antes de tocar el motor.** Cuatro diseños ya
   refutados con medición; repetir cualquiera de ellos es perder una sesión.
4. **Leer `DECISIONS.md` D1, D21 y D22** si vas a tocar puntuación o auditoría.
5. Tras tocar componentes React, **abrir la preview de Vercel y leer la consola**.
   Los guardarraíles no ven identificadores fuera de ámbito (C1).
