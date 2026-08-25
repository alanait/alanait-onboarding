# Problemas conocidos, experimentos fallidos y deuda técnica

> Objetivo: que una sesión futura **no repita** lo que ya se probó y no funcionó.

---

## A. Agujeros abiertos del modelo de puntuación

### A0-bis. ⚠️ LA LEY QUE TUMBA CUALQUIER ARREGLO DE A0 (medido el 2026-08-24)

**Antes de diseñar nada para A0, lee esto. Ahorra una sesión entera.**

El 24/08 se diseñaron y midieron **cuatro** mecanismos para cerrar A0 (tope suave
para el hueco, bloqueo de `fiable`, peso efectivo multiplicado, y un techo de no
verificación de diseño libre). **Los cuatro cayeron**, cada uno ante un refutador
adversarial independiente y con contraejemplo medido. No es mala suerte:

> **Por cada punto que una vía baja la rama honesta, la ventaja de esconder sube
> exactamente ese punto. 28 de 28 casos, coincidencia exacta, en tres vías
> distintas.**

La razón es estructural: **el hueco de un capador solo existe si la sección está en
«sí» y el `dep` abierto.** Así que castigar el hueco *es* premiar negar que la cosa
exista. Se construyeron las **28 rutas de ocultación** de un capador (19 = cerrar el
`dep` contestando el padre con otro valor; 9 = negar la sección):

| motor | rutas que ganan a la verdad | ventaja total | máxima |
|---|---|---|---|
| vivo 2.5.0 | 24 / 28 | +43 | +2 |
| tope suave | 28 / 28 | **+168** | +10 |
| peso efectivo | 28 / 28 | **+171** | +11 |
| techo no verificación | 28 / 28 | **+168** | +10 |
| bloquea `fiable` | 24 / 28 | +43 | +2 |

Casos que lo enseñan sin números: con las tres vías que mueven la nota, declarar que
**hay** firewall y no mirar su soporte pasa a puntuar **peor** que declarar que no
hay firewall (93 contra 97), y decir que el cliente **no prueba sus copias** gana +7
sobre decir que sí las prueba. Es, palabra por palabra, el motivo ① por el que D1
tumbó el «techo por capadores» en su día.

**Consecuencia práctica, y es un cambio de orden del proyecto:**

> **A2 (la fuga de los campos padre) es PRERREQUISITO de A0, y no tiene diseño.**
> Son 19 de las 28 rutas. Mientras cerrar un `dep` sea gratis, subir el precio del
> hueco es subir el precio de decir la verdad. **Lo que hay que diseñar el próximo
> día es A2, no A0.**

La única vía que no empeora nada es bloquear `fiable` con `capadoresPendientes`
—porque no toca la nota en ningún caso— pero por eso tampoco arregla A0, y además
deja sin informe al cliente pequeño honesto: medido, de cuatro conductas (dejar en
blanco / «No revisado» / mentir / inventárselo), **la única que se quedaba sin nota
era la honesta**.

Queda escrita, sin implementar, la regla correcta de `resuelto` que cualquier vía
futura necesitará: **hay hueco salvo cuando `agregacion === "max" && valor === 1`**.
Solo el lado `max` resuelve de verdad; las vías A y D tenían cada una media regla
mal, con inversiones medidas de hasta +42 de dominio por contestar *peor*.

### A0. ⚠️ Callar puntúa mejor que decir la verdad en 22 de los 24 capadores

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

Todos están **medidos**, no son sospechas.

### A1. Negar una sección era gratis — CERRADO EN PARTE el 21/08

**Estado: parcialmente resuelto.** Se añadieron precondiciones para `email`, `red`
y `pcs` (modelo 2.2.0). **Siguen negables sin coste** `servidores`, `wifi`,
`licenciamiento`, `vpn` y `sai`, por decisión de negocio explícita del dueño
(DECISIONS.md D13), no por olvido.

**Lo que había antes, para que no se pierda la medida.** Negar las 8 secciones sin
precondición hacía desaparecer el **73 % del peso de la nota** sin generar un solo
hallazgo. Y lo peor no era la nota: con `fiable: true` y evidencia 100 %, porque al
negar una sección sus criterios pasan a «no aplicaban» y entonces sí es cierto que
se comprobó todo lo aplicable. El informe llegaba a imprimir *«Nota 94, riesgo
bajo. Se comprobaron todos los criterios que aplicaban»*. **El atajo hacía que el
informe pareciera MÁS fiable, no menos.**

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

### A2. ⚠️ Fuga por campos padre (`dep`) — LO PRIMERO DEL PRÓXIMO DÍA

> **Cambió de prioridad el 2026-08-24.** Ya no es «un agujero pequeño de 0,7 %»:
> es el **prerrequisito de A0** (ver A0-bis) y son 19 de las 28 rutas de ocultación.
> **No tiene diseño.** Es lo que hay que diseñar, y probablemente ocupe una sesión.

**Cerrado en parte el 24/08:** «No revisado» en un campo padre ya cuenta igual que
dejarlo en blanco. Antes no: cerraba el `dep` de los hijos, los sacaba del
denominador **con sus capadores dentro**, y devolvía el sello de fiable que el
blanco sí retiene. Medido sobre un cliente perfecto que declara su NAS y reconoce no
haberlo mirado: la verdad daba **94**, contestar «No revisado» en el padre daba
**100 y fiable**. Sigue abierto el caso de **mentir** en el padre («No (solo
cloud)»), que da 100 con sello.

**Mitigado en parte desde 2.2.0:** dejarlos en blanco ya no toca la nota pero
**bloquea el sello de `fiable`**. La lista `CAMPOS_PADRE_SIN_CRITERIO` se **deriva**
de los `dep`, así que recoge sola cualquier campo padre nuevo — lo hizo con
`servidores.dominio` al añadir criterios de AD en 2.4.0. La fuga de nota sigue:
aparece en el barrido de monotonía (0,7 %, 6 casos de 804).

**Hoy son 7 campos** (`servidores.dominio` se sumó en 2.4.0). Los pesos de esta
tabla son los de antes de la reponderación del 21/08, valen como orden de
magnitud, no al dedillo:

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

Hay **24 capadores** (la cuenta subió en 2.4.0-2.5.0 con los criterios nuevos y el
cap del antivirus de firmas). **Va junto con A0**: son las dos caras del mismo
mecanismo, y conviene rediseñarlos a la vez. El problema es real, pero **la
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

### A7. Una sección SIN DECIDIR no cuesta nada — medido y APLAZADO por el dueño

**Lo reportó el dueño el 2026-08-25 con capturas de la app**, comparando la misma
ficha con el antivirus sin marcar (84), marcado «No» (72) y marcado «Sí» con
antivirus básico (75). Su lectura, textual: *«marcar o no marcar el NO del
antivirus es indiferente»*. Tenía razón, y medido sobre un cliente perfecto sale
peor de lo que se veía en sus capturas.

**Decisión suya: no se toca de momento** («ok no lo toquemos»). Se guardan las
mediciones porque volver a hacerlas cuesta media sesión.

**Las cuatro entradas posibles**, cliente perfecto en todo lo demás:

| sección | contestada | «sí» y VACÍA | **sin decidir** | «No» |
|---|---|---|---|---|
| antivirus | 100 | 92 | **100** | 91 |
| backup | 100 | 82 | **100** | 59 |
| correo | 100 | 83 | **100** | 89 |
| red | 100 | 87 | **100** | 84 |
| equipos | 100 | 89 | **100** | 87 |

**Lo que hace este agujero distinto de A0 y A1, y por eso tiene arreglo barato:**
el motor **ya hace lo correcto con «sí» y vacía** — ahí los criterios entran en el
denominador valiendo 0 y la nota baja a 82–92. La regla 1 funciona. El agujero es
**exclusivamente el estado «sin decidir»**: la sección no baja al denominador,
desaparece del modelo entera. Con 6 secciones sin decidir el motor devuelve
**nota 100 y evidencia 100 %**, que es sencillamente falso y es lo que el dueño ve
como «99 % comprobado» a mitad de visita.

**Las dos vías que se le presentaron:**

- **(a) «sin decidir» = «no demostrado»** — que cueste exactamente lo mismo que
  «sí y vacía». Recomendada. Deja antivirus en 92 frente a 91 del «No»
  (indiferente, que es justo lo que pedía), no afirma nada sobre el cliente, y
  **no abre escapatoria nueva**: la escapatoria sería marcar «sí» y no rellenar, y
  ésa ya cuesta lo mismo. Backup seguiría descuadrado (~82 frente a 59) porque
  esos 23 puntos son el cap por ausencia *confirmada* de copias.
- **(b) «sin decidir» = «no tiene»** — indiferencia total, pero el informe
  afirmaría carencias que nadie ha comprobado. Es el patrón que D1 y D6 ya
  descartaron cuatro veces.

**Lo primero y sin discusión, haga lo que haga la nota:** el arreglo de la
**evidencia**. Que una sección sin decidir cuente en el denominador de la
evidencia es el mismo arreglo que ya se hizo en 2.6.0 para las secciones negadas
(`pesoRetirado`), aplicado a las no decididas. No afirma nada y quita el 100 %
falso.

**Argumento a favor que el dueño no llegó a formular y conviene no perder:** hoy
la nota **empieza en 100 y baja según trabajas**. Para algo que D4 define como
*medida de progreso durante la visita*, eso está del revés. Con el arreglo
empieza baja y sube. Ojo: eso obliga a **reescribir una frase del Manual del
técnico**, que hoy dice «empieza alta y baja según se abren secciones».

**Efecto secundario que salió de paso y sigue abierto:** en **correo**, abrir la
sección y no rellenarla (83) puntúa **peor** que declarar que no hay correo (89).
Ahí sí hay algo torcido, y es pequeño.

Scripts de medición: `jc-seccion-sin-decidir.mjs` y `jc-si-vacio.mjs` en el
scratchpad de la sesión (se pierden; el contenido de las tablas es lo que vale).

---

## A-bis. Seguridad y privacidad (auditoría del 2026-08-21)

15 agentes en paralelo con pase adversarial: 99 hallazgos, **92 confirmados, 7
refutados, 78 de ellos nuevos**. Los 4 críticos se resolvieron ese mismo día. Lo
que queda abierto:

### AS1. Las políticas RLS dan acceso total a cualquier cuenta autenticada

`supabase-setup.sql:78` y siguientes: `FOR ALL TO authenticated USING (true)` sobre
`clients`, `client_versions`, `client_images` y `storage.objects`. **Cualquier
empleado puede leer y BORRAR la cartera entera**, y no hay registro de quién.

Era el multiplicador del alta abierta: convertía «alguien se coló» en «alguien
tiene todo». El alta ya está cerrada, pero esto sigue igual.

### AS2. `deleteClient` ignora los errores del Storage

La supresión queda **silenciosamente incompleta**: la ficha desaparece y las
capturas pueden quedarse. Choca de frente con el derecho de supresión del RGPD —
las capturas contienen, según la documentación del propio repo, credenciales y
datos bancarios.

### AS3. Sin trazabilidad de accesos

No hay log de quién abre o modifica qué. `created_by`/`changed_by` son TEXT libre
y el historial atribuye cada versión **a quien la sobrescribió, no a quien la
escribió**. Ante una brecha, no se podría acotar el alcance — que es lo que agrava
la posición frente a la AEPD.

### AS4. `client_versions` crece sin límite

Una copia completa de la ficha en cada guardado, para siempre, sin poda ni forma de
borrar una versión concreta.

### AS5. Las previews de Vercel apuntan a la base de producción

Cada rama genera una URL pública contra los datos reales. Riesgo conocido y
aceptado, pero sigue ahí.

### AS6. El PDF no dice que es interno

Salvo una etiqueta condicional a dos tercios del documento, y solo si hay
oportunidades comerciales. La primera página es la que se reenvía suelta.

### AS7. Cero media queries

Los dos paneles laterales suman 536 px fijos que no encogen. El técnico trabaja de
pie, y en tablet el formulario queda inservible.

---

## B. Deuda de interfaz

- **NO HAY RECUPERACIÓN DE CONTRASEÑA.** Descubierto el 25/08 al documentar el
  acceso en Hudu: `src/lib/auth.js` implementa `signUp`, `signIn` y `signOut`, y
  nada más. La pantalla de acceso no tiene «he olvidado mi contraseña». **Quien
  olvide la suya se queda fuera** hasta que un administrador entre en Supabase >
  Authentication > Users a restablecérsela. Es pequeño de arreglar
  (`resetPasswordForEmail` de Supabase más una pantalla de contraseña nueva) y
  duele el día que pasa, que será durante una visita.
- **El Manual solo está en el Panel de Clientes**, no en el editor — que es donde
  al técnico le entran las dudas, con el cliente delante. Se le ofreció al dueño
  ponerlo también allí (junto al icono del historial) y quedó sin contestar.

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

### C5. Puse `sai` como precondición crítica y el dueño lo revirtió (21/08)

Implementé una precondición para «sin armario/rack/SAI» razonando que un corte de
luz apaga los servidores en seco. El dueño lo probó contra un cliente real y lo
tumbó: **«el que haya armario o no debería ser una recomendación, no una cosa
crítica»**.

**La lección no es sobre el SAI.** Es que cuando el cambio decide **qué cuenta como
hallazgo crítico**, eso es criterio de negocio del dueño y hay que preguntarlo,
aunque técnicamente esté bien fundado. Se llegó a construir el mecanismo `salvoSi`
para ese caso; quedó sin uso.

### C6. Invertí la prioridad de dos mensajes y tapé el problema real (21/08)

Al añadir `padresSinDecidir` como bloqueo de `fiable` (2.2.0), le di prioridad
sobre el mensaje de evidencia insuficiente. En Kishoa-Powen —**evidencia 13 %**— el
PDF decía *«faltan 4 campos... la nota sería 10»*, dando a entender que contestar
esos 4 bastaba. El problema real era el **87 % del modelo sin mirar**.

Corregido: la evidencia manda siempre que sea ella la que no llegue al mínimo. Hay
prueba de regresión con los dos casos (evidencia baja, y evidencia 100 % con un
campo padre suelto).

**Lección:** al añadir una causa nueva a un mensaje que ya tenía varias, el orden
de prioridad **es parte del diseño**, no un detalle de implementación.

### C7. Un `sed` demasiado ancho tocó lo que no debía (21/08)

Al partir el dominio `endpoint` usé `sed` para renombrarlo a `servidores` en las
pruebas. Cambió también las que probaban el parque de PCs, que va a `puestos`:
5 fallos. **Salieron los tests, no se coló** — pero refuerza C3: tras editar por
script, verificar con `grep` y correr la batería antes de seguir.

### C8. Pruebas con números mágicos que caducan al reponderar (21/08)

Dos aserciones fijaban `nota === 20`, un valor que dependía del peso del criterio
dentro de su dominio. Al reponderar en 2.4.0 pasaron a dar 27 y fallaron sin que
nada estuviera roto. Reescritas para comparar notas entre sí
(`w10antes.nota > w10.nota`), que es lo que la prueba quería fijar.

**Regla:** una prueba del motor debe fijar **comportamiento**, no aritmética,
salvo que el número sea el objeto de la prueba.

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
