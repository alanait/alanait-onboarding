# Decisión — CiberScore y el umbral del 60%

## 1. La respuesta a su pregunta

**No, el 60% no es mucho: son 36 respuestas, no 190 campos.** Un cliente pequeño de 5-7 usuarios (sin servidor, sin VPN, sin rack) ve 166 campos en pantalla, pero solo **63 puntúan**; contestando esos 63 en el orden en que aparecen, la nota se vuelve fiable en el campo **36 — 55 clics, sin escribir una letra, tocando solo tres bloques (Internet y Red, Ordenadores, Backup)**. El problema nunca fue el umbral: es que la aplicación no distingue en pantalla un desplegable que mueve la nota de una casilla de número de serie, así que el técnico rellena los 138 campos de inventario primero y llega al final con **evidencia 0%** (medido: rellenar los 138 campos que no puntúan de un formulario de 15 secciones deja la evidencia exactamente en cero).

---

## 2. Qué se hace

Orden: lo que más resuelve por lo que menos cuesta. Todo lo de los puntos 1-4 es **aditivo, no cambia ni una nota** y no toca `SCORE_MODEL_VERSION`.

### 2.1 Marcar en el formulario qué campos puntúan · **el 80% del beneficio**
- **Qué cambia:** una regla fina de 2 px en el margen izquierdo de los 99 campos que mueven la nota — los 93 criterios **más los 6 campos que no puntúan por sí mismos pero abren criterios con `dep`** (`backup.repo_dedicado` abre 10 puntos de peso, `servidores.so_familia` 6, `licenciamiento.tipo_servicio` 4, `servidores.tipo` 2, `email.proveedor` 2, `pcs.moviles` 1). Marcar solo los criterios diría que "¿Hay un repositorio dedicado?" es inventario, y es justo lo contrario.
- **Dónde:** `C:\Users\JuanCarlosGarcía\claude\AlanaOnboardingApp\src\components\fields.jsx` (componente `Rejilla`), más dos helpers nuevos en `...\src\sections.js` (`campoVisible`, que hoy está copiado a mano en seis sitios).
- **Qué gana el técnico:** de **70 campos a 36** para tener nota fiable en el cliente pequeño. La marca **no cambia al contestarse** — dice una sola cosa ("esto mueve la nota") y nunca se convierte en semáforo.
- **Densidad medida:** 63 de 166 campos (38%) en el cliente pequeño; los criterios se agrupan (5/5 en "Cuentas locales y cifrado", 9/13 en "Router y Firewall", 0/14 en Almacenamiento entero), así que la marca se lee como corchete donde hay bloque y como señal aislada donde no. No hay árbol de navidad.

### 2.2 Contador doble en la cabecera de cada grupo
- **Qué cambia:** donde hoy pone `11/13` (campos rellenos) pasa a poner `▏2/9 · 11/13`. El primero cuenta los campos que mueven la nota; el segundo, en gris, sigue contando campos.
- **Dónde:** `...\src\components\fields.jsx` (componente `Grupo`).
- **Qué gana:** hoy "Router y Firewall perimetral" puede marcar **13/13 en verde con 4 criterios sin contestar**, porque marca, modelo, número de serie y firmware son texto libre. Eso se acaba.

### 2.3 Separar "Inventario documentado" del avance hacia la nota
- **Qué cambia:** el bloque "Formulario relleno · 46% · 108 de 234 campos" desaparece de arriba. En su sitio, el avance de la nota en unidades de comprobación; el porcentaje de campos baja al final del panel con etiqueta propia.
- **Dónde:** `...\src\components\ReportPanel.jsx`.
- **Qué gana:** el caso Benbros deja de ser inexplicable. Hoy el panel dice 46% y el motor dice 30% de evidencia y nadie puede explicar la diferencia; con esto son dos cifras con dos etiquetas distintas. Y en los 5 ejemplos de referencia, que hoy muestran un "64%" que se lee como "me falta un tercio", pasará a leerse **"93 de 93 comprobaciones · Inventario documentado 64%"**, que es exactamente lo que pasa.

### 2.4 Ir al campo, no a la sección
- **Qué cambia:** las líneas de "Preguntas críticas sin contestar" llevan al campo concreto y lo resaltan 2 s en turquesa, abriendo el grupo si estaba plegado. Requiere ids de DOM por campo (`idCampo`, `idGrupo` en `sections.js` — **no son claves de datos**, no se guardan en Supabase) y un campo nuevo `instancias` en `capadoresPendientes` para acertar el servidor correcto cuando hay tres.
- **Dónde:** `...\src\App.jsx` (`irACampo` + keyframes), `...\src\components\fields.jsx`, `...\src\components\ReportPanel.jsx`, `...\src\score\computeScore.js` (una línea, aditiva).
- **Aviso importante:** el bloque ámbar **ya está arreglado** en el commit `c9caebc` — ya se titula "Preguntas críticas sin contestar", ya pinta `preguntaDe(...).pregunta` y ya lleva el subtítulo que explica que no son tareas. **No se vuelve a tocar el texto ni se vuelve a colgar el `titular` acusatorio como tooltip.** Lo único que falta es que el clic aterrice en el campo y el estado vacío.

### 2.5 Imprimir el peso que se ha quedado fuera · **la única contención real**
- **Qué cambia:** `computeScore` devuelve `noAplicables[]` (`{id, seccion, campo, peso, motivo, por, valor}`) y por dominio `pesoNoAplicable`. El panel lo muestra junto al contador de dominio y el PDF imprime una tabla corta.
- **Dónde:** `...\src\score\computeScore.js` (aditivo, no toca `suma`, `pesoAplicable`, `evidencia` ni `fiable`), `...\src\components\ReportPanel.jsx`, `...\src\print\informe.js`.
- **Por qué importa, medido:** en el perfil pequeño, con los 7 campos padre en blanco el peso aplicable es **117**; declarando los siete es **146**. Son **29 puntos de denominador que hoy se mueven en silencio** y que el informe no menciona en ninguna parte. Un dominio con 20 criterios podados y 5 contestados imprime hoy "5/5 criterios comprobados", idéntico a uno comprobado entero. Esto no cierra la fuga (ver §6), pero la escribe en el entregable que lee el cliente.

### 2.6 Las dos opciones que faltan · **lo único que cambia notas**
| Campo | Opción nueva | Valor |
|---|---|---|
| `red.switches_tipo` | "No hay switches (todo al router)" | 1 |
| `antivirus.servidores_av` | "No hay servidores" | 1 |

- **Dónde:** `...\src\sections.js` (opción al final de la lista) y `...\src\score\criterios.js` (entrada nueva en el mapa).
- **Por qué:** son las dos únicas penalizaciones por ser pequeño que no son calibración. Un cliente cuya LAN es el router del operador tiene hoy que mentir ("Todos no gestionados") o dejarlo en blanco; y `av_servidores` pregunta si el antivirus cubre servidores a un cliente que no tiene ninguno — la sección Servidores está en "no", pero el criterio vive en Antivirus y no lo protege.
- **Patrón:** declarar la ausencia **puntúa 1 y se queda dentro del denominador**, exactamente como el `"No existían"` de saneamiento. No desaparece del cociente, así que no premia esconder.
- **Medido:** micro-cliente honesto del día 1 pasa de **73 a 75** (perímetro 33→37, endpoint 53→60). Los 5 ejemplos: **99/78/51/30/5 → idénticos** (nadie usa las opciones nuevas). `check-ids.mjs` solo falla con opciones **perdidas** (verificado en el código, línea 92); añadir es seguro.
- **Coste:** `SCORE_MODEL_VERSION` a `2.2.0` (hoy está en 2.1.0, no en 2.0.0).

---

## 3. Qué NO se toca

### El 60% no se mueve. Ni un punto.

| Dato medido | Valor |
|---|---|
| Campos marcados hasta nota fiable, cliente pequeño, en el orden de la pantalla | **36 (55 clics)** |
| Lo mismo ordenando por peso | 24 |
| Lo mismo con 15 secciones activas | 53 (84 clics) |
| Evidencia que se consigue **sin credenciales caras** (mirar, un PC, portal M365, consolas de backup y antivirus) | **83,9%** |
| Cliente pequeño contestando el formulario entero con la verdad del día 1 | evidencia **91%**, nota 73 (75 tras §2.6) |
| Tiempo real | 12-15 min, y está en abrir 3-4 consolas, no en los clics |

Bajarlo no arregla nada y empeora una cosa concreta: **con el 60% actual ya se puede publicar "fiable" con dos dominios enteros sin mirar.** Está medido: dejando Perímetro (peso 18) y Backup (peso 18) sin tocar y el resto perfecto, la evidencia queda en 60%, `fiable = true`, y el PDF sale con dos tarjetas a **0/100**. Bajar el listón al 40-50% multiplica ese caso. El problema del 60% no es que sea alto: es que es una media y no mira **dónde**.

### Tampoco se toca (y por qué, con el dato)

| Propuesta descartada | Motivo medido |
|---|---|
| **"Faltan N comprobaciones" con lista ordenada** | El número **baja al esconder infraestructura** (28 → 26 → 23 → 20 según se marcan servidores, SAI, VPN y WiFi como "no") y **no se cumple** contestando las N que lista si el técnico declara que las cosas existen (57%, sigue Provisional) — solo se cumple contestándolas con la opción que cierra el condicional (60%, fiable). Es poner la diana en la cabecera del panel. |
| **Exigir los 9 campos padre declarados para publicar nota** | De las tres respuestas posibles en `backup.repo_dedicado`, **dos podan** ("No (solo cloud)" y "No revisado"). El bloqueo empuja a 2 de 3 hacia la respuesta que esconde, cuesta +5 comprobaciones al honesto y no quita ni un punto al que miente. |
| **Exigir `capadoresPendientes = 0`** | **12 de los 22 capadores no tienen salida honesta.** Medido: declarar la sección WiFi y contestar "No revisado" en el cifrado deja el informe **sin nota**; marcar la sección WiFi como "no" (mentira) publica **100 fiable**. Es el pecado capital del proyecto, agravado. |
| **Suelo por dominio (`COBERTURA_MINIMA_DOMINIO`) + base mínima** | El diagnóstico es correcto y hay que hacerlo, pero el paquete no está listo: `BASE_MINIMA_DOMINIO = 3` **bloquea permanentemente** al cliente honesto de 6 usuarios sin correo corporativo (identidad se queda en 6 puntos frente a una base de 9, y **ninguna respuesta lo desbloquea**). |
| **"El silencio no poda" (R1)** | Medido en el motor parcheado: hoy callarse da 95 y negar 93 (mentir cuesta −2); con R1 callarse da 74 y negar 92 (**mentir gana +18 y el sello**). Empeora exactamente lo que pretende arreglar. |
| **`dep.salvo`, `sinSeccion`, quitar opciones "No aplica"** | Rompe el build: `check-ids.mjs` falla con 4 opciones perdidas y `check-score.mjs` con 2 `dep` sin `value`. Y `sinSeccion` en `av_servidores` **borra del score un "No" que el técnico ya escribió**. |
| **`notaMaxima` ("no puede pasar de X")** | No es cota superior: se rompe en 18 de 500 pruebas, con hasta +10 puntos de exceso, precisamente en la rama donde se imprimiría. |
| **`computa: ["No revisado"]` en `red_firewall_soporte`** | No es neutro: con dos redes documentadas baja la nota global 4 puntos. |

---

## 4. Textos literales

### 4.1 Marca de canalón — leyenda, una sola vez, bajo el bloque de progreso

> `▏` Los campos con esta marca son los que mueven el CiberScore. El resto es inventario para el informe.

### 4.2 Cabecera de grupo

Formato: `▏2/9 · 11/13`
- `title` del primer contador: **"Campos de este grupo que mueven el CiberScore"**
- El primero en azul, o en verde cuando está completo. El segundo siempre en gris.

### 4.3 Indicador de progreso — sustituye a "Formulario relleno", va arriba

**Con secciones sin decidir** (tiene prioridad, es lo único accionable):
> **Faltan 4 secciones por responder**
> Backup, Correo, VPN, WiFi. Márcalas como "sí" o "no": hasta entonces no se sabe cuántas comprobaciones le aplican a este cliente.

**En curso:**
> **Comprobaciones que puntúan**
> **32 / 54**
> 60% del peso comprobado. La nota se publica a partir del 60%.

**Con la nota ya publicada:**
> **Comprobaciones que puntúan**
> **41 / 54**
> 78% del peso comprobado. Cada comprobación que añadas la hace más precisa.

**Todo contestado:**
> **Comprobaciones que puntúan**
> **54 / 54**
> Contestadas todas las comprobaciones que aplican a este cliente.

`title` del bloque:
> El total puede subir cuando una respuesta abre comprobaciones nuevas: al decir que sí hay firewall aparecen las cuatro suyas.

### 4.4 Bloque de inventario — abajo del todo, degradado

> **INVENTARIO DOCUMENTADO**
> **46%**  ·  108 de 234 campos
> La mayoría son datos para el informe (nombres, IPs, modelos, contratos) y no puntúan.

### 4.5 Preguntas críticas sin contestar — solo cambia el final del subtítulo y se añade el estado vacío

Título (**se queda como está**): `Preguntas críticas sin contestar`

Subtítulo (cambia "ir a la sección" por "ir al campo"):
> No son tareas: son campos del formulario. Pulsa para ir al campo; al contestarlos desaparecen.

Tercera línea de cada entrada:
> Internet y Red · sin contestar · Ir al campo →

En secciones con varias instancias, la cabecera de la línea lleva cuál:
> Servidores · Servidor 2 · sin contestar · Ir al campo →

**Estado vacío nuevo** (hoy el bloque simplemente no se pinta, y ésta es la señal que el técnico busca antes de cerrar la visita):
> Contestadas todas las preguntas que pueden bajar la nota ellas solas.

### 4.6 Peso excluido — panel

Junto al contador de cada dominio:
> `5/5` · **9 pts no aplican**

`title`: **"Comprobaciones que no aplican a este cliente porque se ha declarado que ese equipo o servicio no existe"**

### 4.7 Peso excluido — PDF, tras el bloque de dominios

> **Comprobaciones que no aplican a este cliente — 19 puntos de 146**
> *¿MFA en el acceso al repositorio? — no hay repositorio dedicado (solo cloud)*
> *Sistema / firmware del repositorio — no hay repositorio dedicado (solo cloud)*
> *Accesos del proveedor anterior al repositorio — no hay repositorio dedicado (solo cloud)*
> *MDM en móviles corporativos — no hay móviles corporativos*
> …

Y en la caja de Alcance:
> Inventario documentado: 108 de 234 campos (46%).

### 4.8 Opciones nuevas (literales exactos)

- `red.switches_tipo` → **"No hay switches (todo al router)"**
- `antivirus.servidores_av` → **"No hay servidores"**

---

## 5. Tabla de impacto

### Cliente pequeño (5-7 usuarios; Servidores, VPN, SAI y Otros en "no")
166 campos visibles, de ellos **63 puntúan**.

| | campos a rellenar para tener nota | evidencia | nota |
|---|---|---|---|
| **HOY** — orden de pantalla, todos los campos | **70** | 60% | 60 |
| **DESPUÉS** — solo los campos marcados, orden de pantalla | **36** (55 clics, 3 bloques) | 60% | 60 |
| Formulario entero, honesto día 1 — HOY | 166 | 91% | **73** |
| Formulario entero, honesto día 1 — DESPUÉS (§2.6) | 166 | 91% | **75** |

**Reducción: 49% menos campos para la misma nota.** Si el cliente declara honestamente NAS + móviles + M365 + servicio cloud, el camino sube a 39 campos: correcto, ha declarado más infraestructura que comprobar.

### Cliente completo (las 15 secciones en "sí")

| | campos | evidencia | nota |
|---|---|---|---|
| DESPUÉS — solo marcados | **53** (84 clics) | 60% | 60 |

### Benbros (40 trabajadores, formulario a medias, servidor cloud de un tercero)
Cifras reales del caso: **108 de 234 campos rellenos (46%) y evidencia 30%**. La distancia se explica midiendo el patrón exacto: **rellenar los 138 campos que NO puntúan de un formulario de 15 secciones deja la evidencia en 0%**. A partir de ahí hacen falta 53 respuestas marcadas para llegar al 60%.

| | campos rellenos | evidencia | nota |
|---|---|---|---|
| HOY | 108 de 234 (46%) | **30%** | provisional |
| DESPUÉS | los mismos 108, pero el panel dice "≈25 de 87 comprobaciones · Inventario documentado 46%" y las 62 que faltan están marcadas en pantalla | 30% | provisional |

No cambia la nota. Cambia que por primera vez se puede explicar por qué 46% no es 30%, y dónde están los campos que faltan.

### Los 5 ejemplos de referencia (medidos hoy, motor real)

| fichero | nota | evidencia | campos rellenos | comprobaciones | nota DESPUÉS |
|---|---|---|---|---|---|
| 01-bien-protegido | 99 | 100% | 163/253 (64%) | 93/93 | **99** |
| 02-medio-alto | 78 | 100% | 160/251 (64%) | 92/92 | **78** |
| 03-medio | 51 | 99% | 161/249 (65%) | 92/92 | **51** |
| 04-medio-bajo | 30 | 97% | 150/233 (64%) | 87/87 | **30** |
| 05-riesgo-crítico | 5 | 96% | 122/188 (65%) | 73/73 | **5** |

**Ninguna nota cambia.** Lo que cambia es que hoy el panel les pone un "64%" que se lee como formulario incompleto, y pasará a leerse "todas las comprobaciones hechas · inventario documentado 64%".

---

## 6. El riesgo que asumimos, sin maquillar

**¿Puede un cliente mal revisado sacar nota fiable? Sí. No es un no rotundo y no puedo darle uno.** Tres agujeros medidos, y ninguno lo abre este cambio — los tres ya están vivos hoy:

**1. Negar secciones. Es el grande y cuesta 21 clics.**
Marcando 13 de las 15 secciones como "no" (solo Backup y Antivirus en "sí", que son las que tienen precondición) y contestando **6 desplegables** con la mejor opción: **nota 62 · Riesgo medio, evidencia 62%, fiable, 0 hallazgos.** Seis respuestas. Este cambio no lo toca ni lo empeora; tampoco lo arregla.

**2. Contestar solo lo que puntúa, mintiendo.**
Cliente pequeño, 24 respuestas ordenadas por peso: nota 60, evidencia 60%, fiable, 0 hallazgos, **inventario documentado 0%**. Con 15 secciones, 30 respuestas.

**3. La fuga por campos padre. Declarar la verdad cuesta la nota.**
Medido, tras las mismas 24 respuestas, cambiando **solo** `backup.repo_dedicado`:

| respuesta | evidencia | nota | fiable |
|---|---|---|---|
| en blanco | 60% | 60 | **sí** |
| **"Sí" (hay NAS — la verdad)** | **52%** | **53** | **NO** |
| "No (solo cloud)" | 60% | 60 | sí |
| "No revisado" | 60% | 60 | sí |

**Decir la verdad cuesta 7 puntos y el sello. Las tres formas de no decirla lo conservan.** Esto existe hoy, no lo crea este cambio, y **no lo arregla**. Es la razón principal por la que rechazo el contador "Faltan N": publicar la cuenta atrás es publicar el atajo.

**¿Qué empeora este cambio?** Una cosa, y la digo en voz alta: **hoy la pereza produce el resultado honesto.** El técnico vago hace lo que hizo Benbros — rellena inventario, que es rápido y no obliga a decidir — y sale evidencia 30% y "Provisional". Con la marca, la pereza tiene una diana más barata: 36 campos señalados en pantalla. Sigue siendo peor que el atajo que ya existe hoy (24 respuestas ordenadas por peso), porque **la marca no ordena por peso** — solo dice cuáles son. Pero acorta el camino del vago de 70 a 36.

**Qué lo contiene, y no es suficiente:**
- La firma del fraude es inconfundible y ahora se publica: los caminos falsos dan **inventario documentado 0-4%**, frente al 64% de los cinco ejemplos y el 46% de Benbros. Un PDF con CiberScore fiable e "Inventario documentado 4%" se delata solo. Hoy los dos números están mezclados en un solo porcentaje que no distingue una cosa de la otra.
- El peso excluido se imprime con nombre y motivo: la poda deja de ser gratis porque usted la lee en el informe.
- No se publica el aporte de cada criterio. El técnico ve qué campos puntúan, no cuánto puntúa cada uno.

**Lo que no puedo afirmar:** que un técnico decidido no saque un 60 fiable en dos minutos. Puede, y podía antes. Lo único que consigo es que quede rastro en el entregable.

---

## 7. Lo que dejamos para después

Por orden de daño:

1. **Precondiciones para `email`, `red`, `wifi`, `servidores` y `sai`.** Es el agujero de 21 clics del §6.1 y ninguno de los tres caminos lo cierra. Hoy solo Backup y Antivirus tienen precondición: negarlas es un hallazgo. Negar Correo vale +28 puntos y no cuesta nada. Cambia notas → `SCORE_MODEL_VERSION` mayor. **Esto es lo siguiente que hay que hacer.**

2. **La fuga de los campos padre (`dep`), 29 puntos de denominador.** Dos arreglos posibles, ninguno cabe aquí: (a) que esos 6 campos pasen a ser criterios con peso ≥ al que podan, o (b) partir la poda para que el balance nunca sea negativo. `backup.repo_dedicado` pesa 0 y decide 10; `servidores.so_familia` pesa 0 y decide 6. Mientras eso siga así, **no se publica ningún contador de comprobaciones pendientes.**

3. **Salida honesta para los 12 capadores que no la tienen.** `red_firewall`, `wifi_cifrado`, `backup_ultimo_job`, `backup_pruebas`, `identidad_email_mfa`, `srv_so_soporte`, `sai_existe` y cinco más: hoy el técnico solo puede dejarlos en blanco o mentir. Sin esto no se puede exigir nunca `capadoresPendientes = 0`.

4. **El listón por dominio.** El diagnóstico es bueno y está verificado: la media global deja esconderse un dominio entero (Perímetro + Backup fuera = 60% fiable con dos tarjetas a 0). Pero hace falta antes el punto 3, las precondiciones del punto 1, y rehacer la base mínima, que hoy bloquearía permanentemente al cliente de 6 usuarios sin correo corporativo.

5. **La calibración de Perímetro en clientes de 5-7 usuarios.** Tras §2.6, el perímetro del micro-cliente perfecto se queda en 37-57 porque 9 de sus puntos aplicables (firewall dedicado, UTM, VLANs, monitorización, línea de respaldo) son controles de empresa mediana cuya ausencia es un riesgo real y **debe** costar. Con Perímetro pesando 18 sobre 100, eso arrastra la nota global de todos los clientes pequeños. Si quiere que un micro-cliente bien llevado llegue a verde, la palanca es el reparto de pesos por tamaño de cliente, no el "no aplica". Es decisión suya, no técnica.

6. **La barra del carril de secciones** (`App.jsx`, `avanceSeccion`) sigue midiendo campos rellenos. Es la tercera aparición del mismo porcentaje engañoso; la receta es la del contador doble y cabe en cinco líneas.

7. **`pcs_rmm_agente`** (peso 2) mide si ALANA ya ha desplegado su herramienta: en un onboarding vale 0 para todos por definición. Mide nuestro trabajo, no el riesgo del cliente. Está mal colocado.

---

**Ficheros a tocar:** `C:\Users\JuanCarlosGarcía\claude\AlanaOnboardingApp\src\sections.js` · `...\src\components\fields.jsx` · `...\src\components\ReportPanel.jsx` · `...\src\App.jsx` · `...\src\score\computeScore.js` · `...\src\score\criterios.js` · `...\src\score\dominios.js` (solo la versión) · `...\src\print\informe.js` · `...\scripts\test-score.mjs`. Ningún `id` de sección ni de campo se toca; ninguna opción se retira.