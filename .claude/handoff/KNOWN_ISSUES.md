# Problemas conocidos, experimentos fallidos y deuda técnica

> Objetivo: que una sesión futura **no repita** lo que ya se probó y no funcionó.

---

## A. Agujeros abiertos del modelo de puntuación

### A0. ⚠️ LO PRIMERO DEL PRÓXIMO DÍA — callar puntúa mejor que decir la verdad en 22 de los 24 capadores

**Es el bug histórico de este proyecto, el que ya se ha corregido cuatro veces,
vivo en su última esquina y a mayor escala de la que nadie había medido.**

Un capador dispara su tope solo cuando el técnico **contesta** el literal
crítico. Si el campo se deja **en blanco**, el criterio puntúa 0 igual —pero el
cap no salta—. Como el cap suele quitar más de lo que quita el 0, **dejarlo en
blanco sale a cuenta**.

Medido el 2026-08-21 sobre un cliente perfecto salvo ese campo, modelo 2.5.0:

| criterio | contestando la verdad | callándolo | ventaja de callar |
|---|---|---|---|
| `identidad_email_mfa` | 79 | 98 | **+19** |
| `red_rdp` | 89 | 99 | +10 |
| `wifi_cifrado` | 90 | 99 | +9 |
| `backup_repo_expuesto` | 90 | 98 | +8 |
| `backup_prueba_resultado` | 91 | 98 | +7 |
| `identidad_email_mfa_admins` | 91 | 98 | +7 |
| `red_firewall_soporte`, `backup_ultimo_job` | 92-93 | 98-99 | +6 |
| …16 más | | | +1 a +5 |

**22 de 24 capadores afectados.** Solo se salvan los dos cuyo cap queda por
encima de lo que ya da la media.

- **Reproducción:** cliente con todo en su mejor valor; cambiar un solo campo
  capador a su literal crítico y comparar con dejar ese mismo campo vacío.
- **NO lo introdujo el trabajo del 21/08.** Se descubrió ese día al verificar
  que el cap nuevo de `av_tipo_solucion` no reintroducía el patrón; la
  comprobación destapó que `red_firewall` ya se comportaba así desde antes
  (97 contestando la verdad, 98 callando). El cap nuevo añade un caso a una
  lista que ya tenía 21.
- **Mitigación actual, parcial:** `capadoresPendientes` recoge los capadores
  que aplicaban y nadie contestó, e impide que el informe afirme «sin hallazgos
  críticos». O sea: el documento no miente, pero **la nota sí premia el
  silencio**.
- **Por qué NO se arregló sobre la marcha:** el arreglo obvio —disparar el cap
  también cuando el campo está en blanco— es justo uno de los diseños que
  `DECISIONS.md` D1 ya descartó, porque afirma un hallazgo que nadie ha visto
  («este cliente tiene RDP publicado» cuando lo único cierto es que no se miró).
  Necesita diseño, no un parche.
- **Pistas para el diseño**, sin comprometerse a ninguna: (a) que el hueco de
  un capador aplique un tope propio, más suave que el del hallazgo confirmado,
  de modo que callar quede entre «bien» y «confirmado mal»; (b) que
  `capadoresPendientes` bloquee `fiable` igual que hoy lo hacen las secciones
  sin decidir y los campos padre; (c) tratar el hueco de un capador como
  evidencia que falta y dejar que la nota baje por la vía del denominador, sin
  cap. **Probar cualquiera comparando entradas distintas del mismo motor**, y
  contra el barrido de monotonía completo, no contra un caso suelto.

Todos están **medidos**, no son sospechas. Ninguno lo introdujo el trabajo de hoy;
son preexistentes y salieron a la luz al auditar.

### A1. Negar una sección es gratis (el más grande)

Marcando 13 de las 15 secciones como «no», **desaparecen 4 dominios enteros** —
perímetro (18), identidad (16), correo (12), física (8) = **54 % del peso del
modelo** — sin generar un solo hallazgo y sin afectar a `sinResponder`.

Solo `backup` y `antivirus` tienen precondición que convierte el «no» en hallazgo.
Negar Correo vale ~+28 puntos y no cuesta nada.

- **Reproducción exacta (verificada):** `sectionEnabled` con las 13 secciones
  restantes a `"no"`, `backup` y `antivirus` a `"si"` con sus campos bien
  contestados → **nota 36, `fiable: false`, evidencia 35 %, 0 hallazgos,
  `sinResponder: 0`**, y desaparecen `perimetro(18) identidad(16) correo(12)
  fisica(8)` = **54 % del peso**.
  El `fiable: false` aquí lo salva la evidencia baja, no una defensa contra este
  agujero: con las dos secciones restantes muy completas la evidencia sube.
- **Nota:** un análisis con agentes afirmó «nota 62, fiable». **No lo pude
  reproducir**: mi reconstrucción da 36 y `fiable=false`. La cifra exacta depende
  de cuánto se conteste en las dos secciones restantes. **Lo estructural (los 4
  dominios desaparecen) sí está confirmado.**
- **CÓMO COMPROBARLO, que tiene trampa:** los 4 dominios **siguen apareciendo en
  el array `dominios`** que devuelve `computeScore`, con `nota: null`. No
  desaparecen del objeto, desaparecen **del reparto**. Verificar mirando
  `pesoAplicable === 0`, nunca la presencia en la lista. (Comprobarlo por
  presencia da un falso «esto ya está arreglado».) La causa está en una sola
  línea: `computeScore.js:162`, `if (sectionEnabled[c.seccion] !== "si") continue;`.
- **Arreglo previsto:** precondiciones de sección. **Son 8 las secciones que hoy
  se pueden negar gratis**, no 5 como decía una versión anterior de este
  documento: `red`, `wifi`, `email`, `vpn`, `licenciamiento`, `pcs`, `servidores`
  y `sai`. Cambia notas → sube versión de modelo.

### A2. Fuga por campos padre (`dep`): 25 puntos de denominador

6 campos que no puntúan por sí mismos deciden si puntúan otros:

| campo padre | peso propio | peso que abre |
|---|---|---|
| `backup.repo_dedicado` | 0 | 10 |
| `servidores.so_familia` | 0 | 6 |
| `licenciamiento.tipo_servicio` | 0 | 4 |
| `servidores.tipo` | 0 | 2 |
| `email.proveedor` | 0 | 2 |
| `pcs.moviles` | 0 | 1 |

**Efecto medido (base propia, ~24 respuestas):** declarar «Sí, hay NAS» da
evidencia 42 % / nota 42; dejarlo en blanco, decir «No» o «No revisado» dan 47 % / 47.

**MUY IMPORTANTE — matiz que un análisis anterior se dejó.** Esto se reportó como
«decir la verdad cuesta 7 puntos y el sello», y **es una conclusión exagerada**. Lo
verifiqué: mide solo el estado *incompleto*. Al terminar de contestar, **la
honestidad gana**:

| caso | evidencia | nota |
|---|---|---|
| declara que NO tiene NAS | 47 % | 47 |
| declara NAS y no lo mira | 42 % | 42 ← bajón transitorio |
| **declara NAS y lo contesta entero** | 49 % | **48** ✓ |
| declara NAS y está mal | 49 % | 39 ← correcto, es riesgo real |

O sea: **no es el bug histórico**. El bajón intermedio es el estado «te he dicho
que existe y no lo he mirado», que genuinamente es menos evidencia.

**Consecuencia operativa:** mientras exista este comportamiento, **no publicar un
contador de «faltan N comprobaciones»**. Publicar la cuenta atrás es publicar el atajo.

### A3. Capadores sin salida honesta

Hay **22 capadores** (21 de dominio, 1 global). El problema es real, pero **la
cifra depende de la definición de «salida honesta», así que hay que fijarla antes
de tocar nada.** Medido sobre `CRITERIOS` × `SECTIONS`:

| definición | cuántos | quiénes |
|---|---|---|
| sin ninguna salida (ni «No aplica» ni «No revisado»): contestar o mentir | **5** | `red_firewall`, `backup_pruebas`, `identidad_email_mfa`, `srv_so_version_windows_server`, `srv_so_version_windows_cliente` |
| sin opción «No aplica» | **20** | los 5 de arriba + `red_firewall_soporte`, `red_rdp`, `wifi_cifrado`, `backup_ultimo_job`, `backup_prueba_resultado`, `backup_repo_expuesto`, `identidad_email_mfa_admins`, `identidad_pcs_admin_local_password`, `srv_so_soporte`, `sai_existe` y los 5 `san_*` |
| ídem, descontando los que sí tienen salida por su `mapa` | **15** | los 20 menos los 5 `san_*`, que ofrecen «No existían» → 1 |

Una versión anterior de este documento decía «12» sin registrar con qué
definición. **No es reproducible con ninguna de las tres**; se deja constancia
para que nadie intente cuadrarla. También nombraba `srv_so_soporte` sin el matiz
de que D5 lo dejó **condicionalmente inerte** (`redundanteSi`): cuando la versión
del SO decide, ese criterio sale del denominador y no capa.

Sin arreglarlo, **`capadoresPendientes = 0` nunca es exigible**.

### A4. La media global deja esconder un dominio entero

Dejando Perímetro (18) y Backup (18) sin tocar y el resto perfecto se llega a
evidencia 60 %, `fiable = true`, y el PDF sale con dos tarjetas a **0/100**.
Arreglo: umbral por dominio. **Requiere antes A1 y A3.**

### A5. Perímetro está calibrado para empresa mediana

Un micro-cliente perfecto se queda en perímetro 37–57 porque firewall dedicado,
UTM, VLANs, monitorización y línea de respaldo son controles de empresa mediana
cuya ausencia **es** riesgo real. Con Perímetro pesando 18/100, arrastra la nota de
todos los clientes pequeños. **Decisión de negocio, no técnica.**

### A6. `pcs_rmm_agente` mide nuestro trabajo, no el riesgo del cliente

Peso 2. Pregunta si ALANA ya desplegó su RMM, que en un onboarding vale 0 para
todos por definición. Está mal colocado.

---

## B. Deuda de interfaz

- **`App.jsx` → `avanceSeccion`**: la barra del carril de secciones sigue midiendo
  campos rellenos, no criterios. Es la **tercera aparición** del mismo porcentaje
  engañoso (las otras dos ya corregidas: cabecera de grupo y panel lateral).
- **Las «Preguntas críticas sin contestar» llevan a la SECCIÓN, no al CAMPO.**
  Para llevar al campo harían falta ids de DOM por campo (no son claves de datos,
  no se guardan en Supabase) y un campo `instancias` en `capadoresPendientes` para
  acertar el servidor correcto cuando hay tres.

---

## C. Incidentes de esta sesión y su causa raíz

### C1. Pantalla en blanco en producción (introducido y corregido hoy)

`ReferenceError: fechaVisita is not defined`. Al añadir la deducción del SO pasé
`fechaVisita` a `<Field>` desde `Rejilla`, pero **`Rejilla`, `Grupo` y el objeto
`comun` de `SectionFields` no la recibían**. Corregido en `4dbfbe5`.

**Causa raíz, y esto es lo importante:** ningún guardarraíl lo detecta.
`check-imports.mjs` valida *imports*, no identificadores fuera de ámbito, y Vite no
falla en build por una variable indefinida en JSX. **`node_modules` no está
instalado localmente**, así que no se puede renderizar React aquí para probarlo.

**Mitigación aplicable ya:** después de tocar componentes, **abrir la preview
desplegada en el navegador y leer la consola**. Se desplegó sin hacerlo y por eso
llegó a producción.

**Intento fallido de guardarraíl:** escribí un barrido con regex que comparaba
identificadores usados en `{x}` contra props destructuradas y locales. Da
**demasiados falsos positivos** (variables de `.map`, destructuring de arrays,
etc.): reportó `h`, `i`, `o`, `f`, `opt`, `titulo`, `version`, `section`… todos
legítimos. **No se guardó.** Si se quiere cerrar esto de verdad, la vía es ESLint
con `no-undef`, no un regex.

### C2. Los heredocs de bash corrompen JS (recurrente, muchas veces)

Escribir JS con `cat <<'EOF'` o con Python heredoc **convierte `\n` dentro de
cadenas JS en saltos de línea reales**, produciendo `SyntaxError: Invalid or
unexpected token`. Pasó al menos 4 veces hoy (`console.log("\nRegla 1...")`).

**Workaround que funciona:** construir el escape con `chr(92) + 'n'` en Python, o
usar la herramienta `Write`/`Edit` en vez de heredocs para contenido con escapes.

### C3. Edición de `criterios.js` que se perdió sin aviso

Un `redundanteSi` añadido con un script de Python **desapareció** entre dos
comandos (el grep posterior confirmó que ya no estaba). Se reaplicó con una guarda
idempotente (`if 'redundanteSi' in s: ya estaba`). **Causa no determinada.**
Recomendación: tras editar por script, **verificar con `grep` que el cambio
persiste** antes de seguir.

### C4. `etiquetar-ejemplos.mjs` recreaba `public/ejemplos/`

La carpeta se había borrado a propósito en `7b4685a` al retirar el botón «Cargar
ejemplos» de producción. El script seguía escribiendo ahí. Corregido.

---

## D. Cosas que parecían bugs y no lo eran

### D1. «El aviso ámbar sale aunque el campo esté relleno»

Reportado con captura: «Servidor con sistema operativo fuera de soporte» junto a un
«Windows Server 2025» recién escrito. **No era falso positivo**: el aviso apuntaba
a *otro* campo (`so_soporte`, que estaba vacío). El fallo real era el **texto**
(ver D6 en DECISIONS.md). Corregido, pero la lección es: comprobar a qué campo
apunta antes de asumir falso positivo.

### D2. «Benbros da 75, ¿tanta nota?» tras el arreglo

El dueño probó una **URL de preview anterior** al arreglo. El PDF lo confirmó:
imprimía `CiberScore 1.0.0`. Con el motor nuevo el mismo cliente da 9.

**Truco de diagnóstico:** el PDF imprime la versión del modelo en la caja
«Alcance». Si alguien reporta una nota rara, **mirar esa versión primero**.

### D3. Recorte de dígitos en las barras de dominio

Al arreglar el color de las barras pareció que la nota de dos cifras se cortaba
(«6» en vez de «67»). Era un **artefacto del arnés de pruebas**: usaba html2pdf
0.10.1 del CDN mientras el proyecto usa **0.14.0**. Con la versión real nunca pasó.
**Lección: fijar la versión exacta al montar arneses de prueba.**

---

## E. Bugs de librerías de terceros (documentados, con workaround)

- **html2canvas no rasteriza bien** un hijo con `width` en % dentro de un
  `overflow:hidden` + `border-radius`: el relleno desaparece y solo queda la pista
  gris. Todas las barras de dominio salían grises. **Workaround:** ancho exacto en
  px con `position:absolute`, sin depender de recorte.
- **`avoid-all` de html2pdf anula el selector `avoid` propio** y lo sustituye por
  su heurística interna, que no protege `<div>` de sección. Por eso el modo es
  `['legacy']` a secas.
- **Políticas de Postgres se SUMAN, no se sobrescriben.** Crear políticas nuevas no
  anula una `Allow public read` antigua; hay que hacer `drop policy`. Fue la causa
  del bucket de Storage abierto (sesión anterior, ya cerrado y verificado).

---

## E-bis. Trampas de nomenclatura al escribir pruebas a mano

- **La última sección se llama `otros_dispositivos`, no `otros`.** Ids reales:
  `red, servidores, pcs, backup, email, antivirus, wifi, vpn, sai, almacenamiento,
  telefonia, impresion, erp, licenciamiento, otros_dispositivos`.
  Un id equivocado en `sectionEnabled` **no da error**: la sección queda como
  `undefined` y el resultado sale distinto en silencio. Varias mediciones
  intermedias de esta sesión usaron `otros` por error.
- Ojo también con `servidores.so_familia` (la familia) frente a `servidores.so`
  (que es «Versión exacta / notas del sistema», texto libre). No son lo mismo.
- La sección de aplicaciones es `erp`, aunque su etiqueta sea
  «Aplicaciones / ERP / Licencias».

## F. Limitaciones del entorno de desarrollo

- **`node_modules` NO está instalado.** No se puede `npm run dev` ni renderizar
  React localmente. Los tests son scripts de Node sin dependencias, por eso
  funcionan.
- **La verificación real es la preview de Vercel**, no el build local (preferencia
  explícita del dueño).
- Los ficheros de `scratchpad` (temp del sistema) **se pierden**. Los análisis
  valiosos se copiaron a `.claude/handoff/analisis/`.
