## 1. DIAGNÓSTICO EN UNA FRASE

El CiberScore no mide lo bien protegido que está el cliente, mide lo bien que pinta lo poco que el técnico llegó a mirar: cada pregunta sin contestar sale del cálculo en vez de contar como "no demostrado", así que la nota sube cuanto menos se investiga — Kishoa-Powen sacó backup 100/100 con **1** criterio contestado de **10**, y el informe imprimió "sin hallazgos críticos abiertos".

---

## 2. LA CORRECCIÓN

### Un solo cambio: el denominador

Hoy la nota de un dominio es `suma / pesoEvaluado`. Pasa a ser `suma / pesoAplicable`.

```
nota_dominio = min( (Σ pesoᵢ·valorᵢ) / pesoAplicable · 100 ,  cap )
```

donde `pesoAplicable` es el peso de **todos** los criterios que le tocaban a este cliente (sección marcada "sí" y condicional cumplida), contestados o no. **Un criterio aplicable y sin contestar entra en el denominador valiendo 0.**

La nota deja de significar *"qué buena pinta tiene lo que miramos"* y pasa a significar **"qué porcentaje de la protección esperada está demostrada"**. Es la regla 1 del modelo (*la ignorancia no puntúa*) aplicada al agregar, que es exactamente donde se olvidaba: dentro de un cociente normalizado no existe la posición neutra — quitar algo del numerador *y* del denominador equivale a imputarle la media de lo que sí se miró, que es el valor más optimista disponible.

Descarto los tres enfoques anteriores como mecanismo:
- **Umbral por dominio**: no toca `d.pesos`, así que el incentivo sobrevive intacto, y crea uno nuevo (borrar 6 respuestas buenas subía 89→99).
- **Techo `50+50c`**: el techo es una función creciente de la información, así que confesar un firewall inexistente subía la nota 10 puntos. Rechazado por construcción.
- **Techo por capadores 79/59**: el dominio vacío seguía escapando del reparto y "marcar sección = no" pagaba 9 puntos.

De ellos rescato dos piezas, ya sin poder sobre la nota: la lista de **comprobaciones críticas pendientes** (informativa) y el **`sinResponder` extendido a todas las secciones**.

### Por qué el imputado es 0 y no 45 ni 50

Con imputación a un valor `V₀`, contestar un criterio mueve la nota de `V₀` a su valor real. Si `V₀ > 0`, **borrar la respuesta de un defecto confirmado (valor 0) sube la nota** — el incentivo perverso, otra vez. Sólo `V₀ = 0` garantiza:

- **P1 · contestar la verdad de un defecto nunca sube la nota.** Numerador +0, denominador ya lo contaba ⇒ nota igual, y si dispara cap, baja. *Medido: 0 subidas en 8.886 pruebas de rellenar un hueco con un literal que vale 0. En v1 también 0, pero v1 partía de un 100 falso.*
- **P2 · borrar una respuesta casi nunca sube la nota.** *Medido: en 9.000 borrados aleatorios v1 sube el **30,5 %** de las veces (máx +30); v2 sube el **2,1 %** (máx +4). Barrido exhaustivo de los 799 campos de los 5 ejemplos: v1 sube en 43, v2 en 5.*
- **P3 · la nota nunca sube respecto a hoy.** *Medido: 0 subidas en 4.000 formularios aleatorios.*
- **P4 · los hallazgos no cambian.** *Medido: lista idéntica en 3.000/3.000.*
- **P5 · ser honesto deja de costar.** Declarar "No revisado" y dejar en blanco dan **la misma nota** (ambos 0 en el numerador). Hoy: callar 100 / declarar 60, **40 puntos de castigo por honestidad**. Con el cambio: **0**.

El coste de `V₀ = 0` es que la nota arranca en 0 y sube según se rellena. Eso no es un defecto: es el gradiente que hoy apunta al revés. Y se contiene con la fiabilidad (abajo), que impide publicar la nota hasta que la evidencia la sostiene.

### Cómo resuelve Kishoa

Backup con `frecuencia="Continuo"` como único criterio: `pesoAplicable = 17` (los 25 del dominio menos los que cuelgan de un condicional no cumplido), `pesoEvaluado = 2`.

```
v1   backup = 2/2   · 100 = 100/100   "el 100 % de lo que miré está bien"
v2   backup = 2/17  · 100 =  12/100   "he demostrado el 12 % de lo que había que demostrar"
```

Global reconstruido: **79 "Riesgo medio", FIABLE, 0 hallazgos → 25 "Riesgo crítico", NO FIABLE, evidencia 34 %, 11 comprobaciones críticas pendientes.** El informe deja de imprimir nota y pasa por la rama "Sin nota", que `informe.js:44` **ya tiene programada** y que nunca se disparaba porque la cobertura vieja daba 88.

### Cómo evita la trampa del reparto

Tres cierres, cada uno contra una vía distinta:

1. **`evaluable` pasa de `pesos > 0` a `pesoAplicable > 0`.** Un dominio con la sección marcada "sí" y todo en blanco ya no desaparece: entra con **0** y con su peso íntegro. Ésta es la vía que reintroducían las tres propuestas.
2. **Un dominio sin peso aplicable pero con un hallazgo crítico confirmado entra igualmente, valiendo 0.** Es el caso `sin_backup` / `sin_antivirus`: el peso ya no se reparte entre los dominios buenos.
3. **Una sección sin decidir ya no da nota fiable.** `sinResponder` pasa a listar *toda* sección que el modelo puntúa y esté en `undefined`, no sólo las dos `exigida`. Con esto, dejar una sección sin tocar y marcarla "no" **dan exactamente la misma nota** (medido: 98 y 98 sobre el ejemplo 01 quitando `servidores`), y la única diferencia es que sin decidirla no hay nota publicable. Desaparece el premio de 9 puntos por declarar inexistente algo que sí existe, que era el fallo bloqueante de la propuesta de capadores.

### Fiabilidad

`fiable = nota !== null && evidencia >= 60 && sinResponder.length === 0`

`evidencia` sustituye a `cobertura`, que medía peso de *dominios tocados* y por eso mentía por factores de 20x. Nueva definición: `Σ pesoDominio · (pesoEvaluado/pesoAplicable) / Σ pesoDominio`, sobre los dominios aplicables. Los 5 ejemplos dan 93-100; Kishoa 34; el peor caso 9. El 60 conserva su calibración donde importa y muerde donde debe.

---

## 3. CAMBIOS POR FICHERO

### `src/score/dominios.js`

Renombrar `COBERTURA_MINIMA` → `EVIDENCIA_MINIMA` (mismo valor 60), corregir su comentario —hoy afirma que 60 obliga a perímetro+backup+identidad, que suman **52**— y subir la versión.

```js
// Evidencia minima para publicar la nota: fraccion del peso de criterio
// APLICABLE que hay que haber comprobado de verdad. No cuenta dominios
// "tocados": con la definicion vieja, un dominio con un criterio de diez
// aportaba su peso entero y un cliente del que no se sabia nada pasaba por
// fiable con 4 respuestas.
//
// 60 se mantiene porque en un formulario bien relleno la evidencia real ronda
// el 95-100% (medido en los cinco ejemplos: 93, 95, 98, 100, 100), asi que el
// umbral no roza el trabajo bien hecho y corta en seco el que esta a medias.
export const EVIDENCIA_MINIMA = 60;

// Version del modelo. 2.0.0: cambia la agregacion (el denominador de cada
// dominio pasa a ser el peso aplicable), asi que las mismas respuestas dan
// otro numero y las notas dejan de ser comparables con las de 1.x.
export const SCORE_MODEL_VERSION = "2.0.0";
```

### `src/score/criterios.js`

Dos añadidos, ningún id tocado:

```js
// Literales que significan "este control no existe en este cliente". Salen del
// denominador: la superficie de riesgo es genuinamente menor y exigir evidencia
// sobre algo que no existe convierte el aviso en ruido permanente.
export const LITERALES_NO_APLICA = ["No aplica", "No hay red de invitados", "Otro", "Otra"];

// Literales que significan "nadie lo ha mirado". Valen lo mismo que el hueco:
// declararlo y callarlo son el mismo estado de conocimiento, y si valieran
// distinto el tecnico aprenderia a no tocar el desplegable.
export const LITERALES_SIN_COMPROBAR = ["No revisado", "No se sabe", "No sabe"];
```

Y añadir `"Pendiente de revisar": 0` a los mapas de `correo_admins_revisados`, `correo_usuarios_inactivos` y `correo_licencias_revisadas`: es una respuesta del cliente ("no lo hemos revisado"), no un hueco de la visita, y hoy no está clasificada en ninguna parte.

### `src/score/computeScore.js`

Sobre HEAD (`cbfd9ef`, que ya introdujo `pesoAplicable` y `evidencia`).

**(a) `valorEnInstancia` (líneas 24-41) → `estadoEnInstancia`, con tres estados.**

```js
/**
 * Estado de un criterio en UNA instancia. Tres valores y no dos, porque el
 * motor tiene que distinguir dos cosas que hasta ahora salian igual del
 * cociente:
 *   "noaplica"      el control no existe en este cliente. Fuera del
 *                   denominador: su superficie de riesgo es menor de verdad.
 *   "sincomprobar"  existe y nadie lo ha mirado. DENTRO del denominador
 *                   valiendo 0, porque no hay posicion neutra: sacarlo de los
 *                   dos lados del cociente le imputa la media de lo que si se
 *                   miro, que es siempre el valor mas optimista disponible.
 *   "valor"         comprobado, con lo que diga el mapa.
 */
function estadoEnInstancia(criterio, leer) {
  // Un condicional que no se cumple ni siquiera aparece en pantalla. Con el
  // padre en blanco tampoco se puede exigir: no sabemos si el cliente tiene
  // eso, y contarlo como pendiente haria que contestar "No" al padre SUBIERA
  // la nota, que es el fallo que se esta arreglando con el signo cambiado.
  if (criterio.dep && leer(criterio.dep.field) !== criterio.dep.value) return { tipo: "noaplica" };

  const v = leer(criterio.campo);
  if (vacio(v)) return { tipo: "sincomprobar" };
  if (Array.isArray(v)) return { tipo: "noaplica" };
  if (LITERALES_NO_APLICA.includes(v)) return { tipo: "noaplica" };
  // `computa` sigue siendo la excepcion documentada: para estos criterios
  // reconocer que nadie lo ha mirado ES el hallazgo, asi que puntua lo que
  // diga el mapa en vez de contar como hueco.
  if (criterio.computa?.includes(v) && criterio.mapa && v in criterio.mapa) return { tipo: "valor", valor: criterio.mapa[v] };
  if (LITERALES_SIN_COMPROBAR.includes(v)) return { tipo: "sincomprobar" };
  // Literal que el modelo no conoce: no se inventa valor, pero tampoco se
  // regala. check-score.mjs impide que esto ocurra por descuido.
  if (!(criterio.mapa && v in criterio.mapa)) return { tipo: "sincomprobar" };
  return { tipo: "valor", valor: criterio.mapa[v] };
}
```

`valorCrudoEfectivo` no se toca (los caps siguen leyendo literales). `aplicaEnInstancia` (líneas 54-65) desaparece: la absorbe `estadoEnInstancia`.

**(b) Acumulador (línea 89)**

```js
for (const d of Object.keys(DOMINIOS)) {
  porDominio[d] = { suma: 0, pesoEvaluado: 0, pesoAplicable: 0, cap: 100, evaluados: 0, aplicables: 0 };
}
```

**(c) `sinResponder` (línea 96-101).** Sale del bucle de precondiciones y pasa a cubrir todas las secciones que el modelo puntúa:

```js
// Dejar una seccion sin decidir deja de ser gratis. No cambia la nota —sus
// criterios siguen fuera— pero invalida la fiabilidad, y con eso desaparece el
// premio por marcar "no" una seccion que si existe: silencio y "no" dan hoy la
// misma nota, y el "no" es una declaracion que queda escrita y se puede leer
// en el informe.
const sinResponder = [...new Set([
  ...criterios.map(c => c.seccion),
  ...precondiciones.filter(p => p.exigida).map(p => p.seccion),
])].filter(s => sectionEnabled[s] === undefined).sort();
```

**(d) Bucle de criterios (líneas 109-147)**

```js
const capadoresPendientes = [];

for (const c of criterios) {
  if (sectionEnabled[c.seccion] !== "si") continue;

  const n = Math.max(1, instanceCounts[c.seccion] || 1);
  const d = porDominio[c.dominio];
  const valores = [];
  let aplicables = 0, evaluadas = 0;

  for (let i = 0; i < n; i++) {
    const leer = (campo) => formData[c.seccion]?.[i]?.[campo] ?? "";
    const e = estadoEnInstancia(c, leer);
    if (e.tipo === "noaplica") { valores.push(null); continue; }
    aplicables++;
    if (e.tipo === "valor") { evaluadas++; valores.push(e.valor); }
    else valores.push(null);
  }

  if (aplicables === 0) continue;

  d.pesoAplicable += c.peso;
  d.aplicables++;

  const valor = agregar(valores, c.agregacion);

  // Fraccion demostrada del criterio. Tres servidores son tres comprobaciones y
  // documentar uno no demuestra los otros dos. Con una excepcion que la propia
  // regla 3 obliga: cuando el valor ya no puede cambiar mirando las demas
  // instancias —un 0 con `min`, un 1 con `max`— el criterio esta resuelto.
  let fraccion = 0;
  if (valor !== null) {
    const resuelto = (c.agregacion === "min" && valor === 0) || (c.agregacion === "max" && valor === 1);
    fraccion = resuelto ? 1 : evaluadas / aplicables;
  }

  if (valor !== null) {
    d.suma += c.peso * valor * fraccion;
    d.pesoEvaluado += c.peso * fraccion;
    d.evaluados++;
  }

  if (c.critico) {
    /* ...el bloque de disparo de caps se queda EXACTAMENTE igual... */
    // else: comprobacion critica que aplicaba y nadie hizo. No toca la nota
    // —afirmar el peor caso sin haberlo visto seria fabricar un hallazgo— pero
    // el informe no puede seguir imprimiendo "sin hallazgos criticos abiertos"
    // sobre ella.
    else if (evaluadas < aplicables) {
      capadoresPendientes.push({ id: c.id, dominio: c.dominio, seccion: c.seccion,
        campo: c.campo, capDominio: c.critico.capDominio, capGlobal: c.critico.capGlobal });
    }
  }
}
```

**(e) Agregación (líneas 149-196)**

```js
for (const [id, d] of Object.entries(porDominio)) {
  // Un dominio con criterios que le aplican NO puede salir del reparto por
  // estar en blanco: si saliera, su peso se repartiria entre los que si tienen
  // datos —que son los que salieron bien— y borrar respuestas subiria la nota.
  // Y si no le aplica nada pero hay un hallazgo critico confirmado, tampoco:
  // "no tiene copias" es un dato del cliente, no un hueco de la visita.
  const evaluable = d.pesoAplicable > 0 || d.cap < 100;
  const bruto = d.pesoAplicable > 0 ? (d.suma / d.pesoAplicable) * 100 : 0;
  const nota = evaluable ? Math.round(Math.min(bruto, d.cap)) : null;
  const evidencia = d.pesoAplicable > 0 ? Math.round((d.pesoEvaluado / d.pesoAplicable) * 100) : null;
  ...
  if (evaluable) { numerador += nota * DOMINIOS[id].peso; pesoTotal += DOMINIOS[id].peso; }
  if (d.pesoAplicable > 0) { evidPond += DOMINIOS[id].peso * (d.pesoEvaluado / d.pesoAplicable); pesoEvid += DOMINIOS[id].peso; }
}

const global = pesoTotal ? Math.round(Math.min(numerador / pesoTotal, capGlobal)) : null;
const evidencia = pesoEvid ? Math.round((evidPond / pesoEvid) * 100) : 0;
const fiable = global !== null && evidencia >= EVIDENCIA_MINIMA && sinResponder.length === 0;
```

**(f) Cabecera (líneas 7-18): la regla 1 se reescribe, no se añade una cuarta.**

```js
//   1. Lo que no se ha comprobado no puntua. Un campo vacio o marcado como no
//      revisado sigue contando en el denominador de su dominio y vale 0: la
//      nota es "cuanta proteccion se ha demostrado", no "que tal pinta lo que
//      se miro". Lo unico que sale del denominador es lo que NO APLICA a este
//      cliente, que es una afirmacion sobre el cliente y no sobre la visita.
```

**Objeto devuelto — cambios:**

| campo | qué pasa |
|---|---|
| `cobertura` | **se elimina.** Medía peso de dominios tocados; era la cifra que mentía |
| `coberturaMinima` | → `evidenciaMinima` |
| `evidencia` | **cambia de valor.** Ahora `Σ pesoDominio·(pesoEvaluado/pesoAplicable) / Σ pesoDominio` |
| `sinResponder` | **cambia de alcance:** todas las secciones del modelo sin decidir |
| `capadoresPendientes` | **nuevo.** `[{id, dominio, seccion, campo, capDominio, capGlobal}]` |
| `d.nota` | mismo tipo; `null` sólo cuando `evaluable === false`, así que `reduce` sobre evaluables nunca compara con `null` |
| `d.evidencia` | cambia de valor (denominador por instancia) |
| `d.criteriosAplicables` | **nuevo.** El denominador que le faltaba a `criteriosEvaluados` |
| `d.pesoEvaluado` | ahora fraccionario en multi-instancia |

El motor sigue siendo puro y determinista. `src/sections.js` no se toca: ni un id.

### `scripts/check-score.mjs`

Guardarraíl nuevo, en la línea de `check-ids.mjs`: **toda opción de un campo puntuado tiene que estar clasificada.**

```js
// Una opcion que no este ni en el mapa ni en las dos listas de literales es un
// agujero silencioso: con el denominador nuevo caeria en "sin comprobar" y
// restaria nota a un tecnico que contesto bien. Verificado: hoy las 93 quedan
// clasificadas, asi que esto solo puede romperse al anadir opciones nuevas.
for (const k of f.options) {
  if (k in c.mapa) continue;
  if (LITERALES_NO_APLICA.includes(k) || LITERALES_SIN_COMPROBAR.includes(k)) continue;
  mal(`${c.id}: la opcion "${k}" de ${c.seccion}.${c.campo} no esta clasificada`);
}
```

### `src/print/informe.js`

**`selloNota` (líneas 44-62)** — el pie deja de decir "cobertura":

```js
const pie = hayNota
  ? `evidencia ${score.evidencia}% · modelo ${esc(score.version)}`
  : (score.sinResponder?.length
      ? `faltan ${score.sinResponder.length} secciones por responder`
      : `sólo se ha comprobado el ${score.evidencia}% del modelo`);
```

Y el pie del sello, cuando no hay nota:
> Medición del estado técnico observado en la visita. **No hay nota porque no hay evidencia suficiente:** lo que no se comprobó no cuenta como correcto.

**`paginaDiagnostico` (líneas 77-87)** — la frase más cara del documento:

```js
// La frase tiene que hablar de la REVISION, no del cliente. Lo unico que se
// puede afirmar es que ningun criterio COMPROBADO disparo un hallazgo, y con
// medio backup en blanco esa frase tiene todas las papeletas de ser falsa.
const pend = score.capadoresPendientes.length;
if (!score.fiable) {
  lectura = score.sinResponder?.length
    ? `Sin nota: quedan ${score.sinResponder.length} secciones sin responder (${esc(score.sinResponder.join(", "))}). Mientras no se decida si el cliente tiene esos servicios, cualquier puntuación sería engañosa.`
    : `Sin nota: sólo se ha comprobado el ${score.evidencia}% de lo que aplicaba a este cliente, por debajo del ${score.evidenciaMinima}% necesario. La nota provisional sería ${score.nota} sobre 100, y sólo puede subir a medida que se complete la visita.`;
} else if (criticos === 0 && pend === 0) {
  lectura = `Nota ${score.nota} sobre 100, ${score.tramo.etiqueta.toLowerCase()}. Se comprobaron todos los criterios que aplicaban a este cliente y ninguno ha dado un hallazgo crítico.`;
} else if (criticos === 0) {
  lectura = `Nota ${score.nota} sobre 100, ${score.tramo.etiqueta.toLowerCase()}. Ninguno de los criterios comprobados ha dado un hallazgo crítico, pero quedan ${pend} comprobaciones críticas sin hacer: hasta que se hagan, la ausencia de hallazgos no es una afirmación sobre el cliente.`;
} else { /* ...como hoy, mas la coletilla de pendientes si pend > 0... */ }
```

**Filas de dominio (líneas 89-113)** — bajo el nombre, cuando `d.evidencia < 100`:

```js
const evid = (d.evaluable && d.evidencia !== null && d.evidencia < 100)
  ? `<div style="font-size:9.5px;color:${C.ambar};padding-left:2px;">${d.criteriosEvaluados} de ${d.criteriosAplicables} criterios comprobados</div>`
  : "";
```

En ámbar, no en magenta: el magenta es un problema del cliente y esto es un hueco de la visita. La barra no necesita tratamiento especial — con el denominador nuevo su longitud **ya es** la fracción demostrada.

**Caja de Alcance (líneas 129-132)**:

> **Alcance.** Observación directa en la visita del {fecha}. No incluye escaneo de vulnerabilidades, prueba de restauración propia ni revisión de consolas a las que no se dio acceso. Comprobado el **{evidencia}%** del peso del modelo que aplicaba a este cliente · CiberScore {version}. **Lo que no se comprobó no puntúa: sale con valor cero, nunca como correcto.** Secciones declaradas inexistentes en este cliente: {lista de `sectionEnabled[s] === "no"`, o "ninguna"}. Una nota calculada con otra versión del modelo no es comparable con esta.

**`bloqueHallazgos` (línea 141)** — deja de devolver `""` cuando hay pendientes:

> Ningún criterio de los comprobados ha disparado un hallazgo crítico. Quedan **{n}** comprobaciones críticas sin realizar: {lista `dominio · sección.campo`}.

### `src/components/ReportPanel.jsx`

1. **La nota se muestra siempre** (líneas 97-120). Con el denominador nuevo es una medida de progreso que crece según se rellena; ocultarla mata el gradiente durante la visita, que es el único momento en que el hueco tiene arreglo. La **etiqueta del semáforo y el color de tramo sólo cuando `fiable`**; si no, número en gris con el pie:
   > **Provisional.** {evidencia}% comprobado; hace falta el {evidenciaMinima}%. Sube según completas.
   
   y si hay secciones sin decidir:
   > Faltan {n} secciones por responder: {lista}. Márcalas como "sí" o "no" antes de cerrar la visita.

2. **Línea 129**: `calculada sobre el {cobertura}% del modelo` → `{criteriosEvaluados} de {criteriosAplicables} criterios comprobados · evidencia {evidencia}%`.

3. **Línea 133**: quitar `.filter(d => d.evaluable)`. Los dominios sin datos son justo los que hay que ver durante la visita. Cada fila añade `{d.criteriosEvaluados}/{d.criteriosAplicables}`.

4. **Bloque nuevo "Comprobaciones críticas pendientes"**, con `capadoresPendientes` ordenado por `capDominio` ascendente y el botón `onIrASeccion` que ya existe para los hints. Convierte el panel de marcador en lista de trabajo.

5. **Línea 149**: título `"Cobertura del formulario"` → `"Formulario relleno"`, para que la palabra "cobertura" desaparezca del producto.

### `scripts/test-score.mjs`

**Rompen 3 de 31** (verificado ejecutando la suite real contra el motor nuevo: **28 correctas, 3 fallos**), y las tres son las que fijan la semántica rota:

| línea | hoy | pasa a |
|---|---|---|
| 39-40 `"...y no puntua como bueno"` | `nota === 100` | `nota === 40` — **el test que documenta el arreglo**: su comentario ya decía lo correcto y el `es()` afirmaba lo contrario |
| 60-61 `"max: basta una buena"` | `nota === 100` | rellenar `rdp_expuesto:"No"` en las dos instancias para aislar lo que quiere medir; entonces sigue dando 100 |
| 75-76 `"la cobertura dice..."` | `.cobertura === 18` | `es("la evidencia mide peso de criterio, no dominios tocados", ...evidencia, 12)` |

`scripts/test-informe.mjs` da **27/27 sin tocar nada** (verificado), una vez `informe.js` usa `score.evidencia`.

**Bloque nuevo, `"Regla 1 — lo que no se ha comprobado no puntua"`:**

| test | qué fija |
|---|---|
| `un criterio bueno de dos no da 100` | el denominador es el aplicable |
| `y el motor publica cuantos lo respaldan` | `[criteriosEvaluados, criteriosAplicables] === [1, 2]` |
| `un criterio con dep no cumplida sale del denominador` | `pesoAplicable` no lo incluye; "no aplica" sigue siendo neutro |
| `un padre condicional en blanco tambien poda` | y el test hermano: `contestar "No" al padre NO sube la nota del dominio` — el fallo bloqueante del techo |
| `declarar "No revisado" y dejar en blanco dan la misma nota` | el castigo por honestidad, en una aserción |
| **`un dominio activado y vacio NO sale del reparto`** | `evaluable === true`, `nota === 0`. El test que impide reintroducir la trampa |
| **`un dominio sin peso aplicable pero con hallazgo critico tampoco`** | `sin_antivirus` con pcs/servidores/antivirus en "no" → endpoint entra valiendo 0 |
| `una seccion sin decidir invalida la nota` | `sinResponder` sobre una sección no `exigida` |
| **`marcar una seccion "no" da la misma nota que dejarla sin tocar`** | mata el premio por declarar inexistente lo que existe |
| `tres servidores con uno contestado no dan evidencia plena` | `evidencia === 33` |
| `...salvo que el valor ya este resuelto` | `min` con un 0, `max` con un 1 → `evidencia === 100` |
| `un capador aplicable sin contestar sale en capadoresPendientes` | y no toca la nota |
| **[MODELO REAL] `cuatro respuestas ya no dan 100`** | contra `CRITERIOS` de verdad: `nota === 9`, `fiable === false`. Los tests de hoy no lo cazan porque su modelo sintético tiene 4 criterios en 2 dominios |
| **[FIXTURES] `los cinco ejemplos dan 99/78/51/31/5`** | regresión que se rompe sola si alguien retoca el denominador |
| **[INVARIANTE] `contestar un defecto (valor 0) nunca sube la nota`** | 200 formularios deterministas; es la propiedad que las tres propuestas anteriores no tenían |
| **[INVARIANTE] `borrar una respuesta no sube la nota salvo que libere un cap`** | mismo barrido, con la lista blanca de excepciones explícita |

---

## 4. TABLA DE IMPACTO

Ejecutado contra `ejemplos/*.alanait` y `CRITERIOS`/`PRECONDICIONES` reales.

| caso | nota antes | **nota después** | fiable | evidencia | por qué |
|---|---|---|---|---|---|
| `01-bien-protegido` | 99 | **99** | sí → sí | 100 % | todo comprobado, nada que imputar |
| `02-medio-alto` | 78 | **78** | sí → sí | 100 % | — |
| `03-medio` | 53 | **51** | sí → sí | 98 % | perímetro 67→63 y correo 50→48 por 3 campos en blanco |
| `04-medio-bajo` | 32 | **31** | sí → sí | 95 % | correo 15→10: 6 criterios de 11 |
| `05-riesgo-critico` | 6 | **5** | sí → sí | 93 % | backup entra en el reparto valiendo 0 en vez de desaparecer |
| **Kishoa-Powen** (reconstruido) | 79 · Riesgo medio · 0 hallazgos | **25 · Riesgo crítico** | **sí → NO** | 34 % | backup 100→12 (1 de 7), correo 100→21 (2 de 10), identidad 67→13, saneamiento —→0. **11 comprobaciones críticas pendientes** |
| **Peor caso documentado** (4 secciones, 4 respuestas) | 100 · Riesgo bajo | **9 · Riesgo crítico** | **sí → NO** | 9 % | — |
| Kishoa **contestando la verdad mala** | 27 | **20** | sí → **sí** | 77 % | 10 hallazgos críticos |
| Formulario vacío | — | **—** | no → no | 0 % | sin secciones decididas no hay nota, como hoy |

**Lo que no puedo calcular con certeza:** Kishoa-Powen no está en el repositorio (`grep` sin resultados). Los números de arriba salen de una reconstrucción calibrada hasta reproducir lo documentado — v1 = 79 "Riesgo medio", fiable, 0 hallazgos, backup 100/100 con 1 criterio, correo 100/100 con 2 — contra los 78 reportados. El caso real puede moverse unos puntos; la forma del resultado (deja de ser fiable, backup y correo se desploman) no depende de la calibración.

**Efecto sobre los ficheros de ejemplo:** hay que re-etiquetar 03, 04 y 05, cuyo nombre de empresa lleva la nota (`- Ex. Ciberscore 53/100`). Se hace ejecutando `node scripts/etiquetar-ejemplos.mjs`, que ya recalcula y reescribe; no hay que editar nada a mano.

---

## 5. `SCORE_MODEL_VERSION`

**Sube a `"2.0.0"`.** Cambia la agregación, no la presentación: las mismas respuestas dan otro número (79 → 25) y `score.cobertura` desaparece del objeto. Es literalmente el caso para el que existe la constante.

**Notas guardadas: no hay ninguna que migrar.** Verificado en `supabase-setup.sql` (la tabla `clients` guarda `section_enabled`, `form_data`, `instance_counts` y datos de empresa — **ninguna columna de nota, tramo, cobertura ni versión**), en `src/lib/clientService.js:63-77` (`saveClient` no incluye nada del score) y en `:198-206` (`createVersionSnapshot` guarda sólo el crudo). La nota se recalcula en cada render y en cada impresión. **Migración: ninguna. Backfill: ninguno. Riesgo en base de datos: cero.** Al desplegar, cada cliente existente muestra su nota v2 la próxima vez que alguien lo abra, y baja si su formulario estaba a medias — que es el arreglo.

Lo que sí queda con la nota vieja y hay que gestionar a mano:

1. **Los PDF ya entregados.** Llevan fecha y `CiberScore 1.0.0` impreso, así que son trazables, pero un informe con "78 · riesgo medio · sin hallazgos críticos abiertos" sobre un cliente cuya nota v2 es 25 sigue circulando en un correo o en el CRM. **Acción concreta:** recalcular con el motor nuevo todos los clientes de Supabase, listar los que quedan con `evidencia < 60`, y regenerar su informe antes de que nadie los use en una conversación comercial. Es una función pura sobre datos que ya están guardados.
2. **La serie histórica.** Una bajada entre visitas puede ser sólo el cambio de modelo. Cualquier gráfico de evolución tiene que segmentar por `score.version`, o recalcular las versiones antiguas de `client_versions` con el motor nuevo para que la serie entera sea v2.
3. **`ids-snapshot.json` / `check-ids.mjs`:** nada. No se toca ningún id de `sections.js`.

---

## 6. LO QUE NO SE HACE AHORA

- **No se añade ningún techo, umbral ni segunda contabilidad.** Las tres propuestas metían entre 2 y 12 conceptos nuevos y cada mecanismo traía su propia superficie de exploit. Aquí sólo cambia el denominador. El modelo se sigue explicando con las mismas tres reglas.
- **No se fabrica el peor caso para los capadores sin comprobar.** Un `rdp_expuesto` en blanco no aplica el cap de 30: eso sería afirmar un desastre que nadie ha visto. Se publica como comprobación pendiente y bloquea la frase del informe, no la nota. Consecuencia asumida y medida: confesar un capador sigue costando más que callarlo (borrar `email.mfa_admins="No"` en el ejemplo 02 sube de 78 a 84). Es irreducible sin inventar hallazgos, y ahora está delatado en `capadoresPendientes`.
- **No se toca la lista de precondiciones.** Con `sinResponder` extendido a todas las secciones, poner `exigida` en las ocho restantes ya no aporta nada. Lo que sí queda abierto es que un cliente puede marcar `sai: "no"` y borrar los 8 puntos de infraestructura física; ese agujero existe idéntico hoy y sólo se cierra con precondiciones nuevas, que son decisiones de modelo (¿qué secciones es implausible que un cliente no tenga?) y llevan sus propios textos.
- **No se le pone `capGlobal` a `sin_antivirus`.** Medido: un cliente con red/wifi/backup/correo perfectos y el resto marcado "no" sale **87 "Riesgo bajo" con el hallazgo "sin antivirus" abierto** (v1 daba 99, así que el cambio ya mejora 12 puntos). Añadir `capGlobal: 59` a esa precondición lo bajaría a 59 y **no mueve ninguno de los cinco ejemplos**, pero es un juicio de modelo —¿un parque sin antivirus es tan grave como no tener copias?— y no forma parte del bug de cobertura. Es un cambio de una línea que el dueño puede tomar aparte.
- **No se rediseña la portada del PDF.** Los cambios de `informe.js` son textos y una anotación por fila; la paginación y las barras, que se acaban de arreglar, no se tocan.
- **No se elimina el flag `computa`.** Con el denominador nuevo casi no cambia nada (blanco y "No revisado" dan la misma nota), pero sí importa en multi-instancia con agregación `min`, donde un 0 declarado arrastra el agregado y un hueco no. Quitarlo rompería la monotonía v2 ≤ v1: comprobado, era la única causa de las 22 subidas que aparecían antes de restaurarlo.

---

## 7. RIESGO QUE ASUMO

**El punto más débil: la nota baja para todo el mundo, y baja más cuanto peor estaba hecha la visita — que es justo la visita cuyo informe ya se envió.** Kishoa pasa de 79 a 25 y de "fiable" a "sin nota". Si el comercial ya enseñó ese 79, ahora la herramienta le contradice. No hay forma técnica de evitarlo: la nota vieja no era el estado del cliente, era el estado de la visita, y decirlo en voz alta tiene coste comercial inmediato. Hay que asumirlo antes de desplegar, no después.

Debajo de eso, cuatro cosas concretas que sé que no quedan bien:

1. **Confesar sigue costando más que callar cuando hay un cap de por medio.** Borrar `email.mfa_admins="No"` en el ejemplo 02 sube la nota de 78 a 84. Se ha reducido —43 borrados rentables de 799 pasan a 5, y el máximo de +9 a +6— pero no se ha eliminado, y no se puede sin fabricar hallazgos.
2. **Borrar la respuesta de un campo-puerta puede subir la nota unos puntos.** Quitar `backup.repo_dedicado="Sí"` en el ejemplo 03 sube de 51 a 54: al desaparecer el padre, sus cuatro hijos salen del denominador. Es la contrapartida de la decisión de que un padre en blanco pode el subárbol — la alternativa (contarlos como pendientes) hacía que contestar `firewall="No"` *subiera* la nota 10 puntos, que es peor. Techo del agujero: unos 20 puntos de peso de criterio repartidos en seis puertas.
3. **Una instancia de más vacía baja la nota.** El técnico que pulsa "añadir servidor" y no lo rellena ve el ejemplo 01 caer de 99 a 95. Es la única defensa contra documentar 1 de 3 servidores, y es visible y autocorregible en el panel (`endpoint · 20 de 21 criterios`), pero es fricción real y la primera queja que va a llegar.
4. **La nota arranca en 0 y el semáforo dice "Riesgo crítico" durante toda la primera mitad de la visita.** El PDF no la imprime (`fiable=false` va a la rama "Sin nota") y el panel la muestra en gris y sin etiqueta, pero el número está en pantalla y alguien puede fotografiarlo. Si en producción resulta que los técnicos dejan de creerse el marcador, la respuesta correcta no es subir el suelo —eso reabre el bug— sino cambiar la etiqueta del panel de "nota" a "protección demostrada" y dejar el semáforo para el final.

**Archivos con el prototipo verificado:** `C:\Users\JUANCA~1\AppData\Local\Temp\claude\C--Users-JuanCarlosGarc-a-claude-AlanaOnboardingApp\5b7000c6-43e1-4a17-b3ae-a10bb2030546\scratchpad\decision\` — `v2.mjs` (motor completo, listo para copiar sobre `src/score/computeScore.js` cambiando el import), `run.mjs` (los 5 ejemplos dominio a dominio), `kishoa.mjs`, `final.mjs` (honestidad, peor caso, Kishoa callado vs honesto), `props.mjs` (barrido exhaustivo de 799 borrados y los casos de las tres refutaciones), `fuzz.mjs` (los cuatro invariantes sobre 9.000/8.886/4.000/3.000 formularios).