# Decisiones y su porqué

> El código dice **qué** hicimos. Este fichero dice **por qué**, y sobre todo qué
> alternativas se probaron y por qué se descartaron. Léelo antes de "mejorar" el
> motor de puntuación: varias de las mejoras obvias ya se intentaron y rompen algo.

---

## D1. El denominador de cada dominio es el peso APLICABLE, no el evaluado

**Decisión.** `nota_dominio = suma / pesoAplicable`, donde `pesoAplicable` incluye
los criterios que le tocaban al cliente aunque nadie los haya contestado. Un
criterio aplicable y sin comprobar **cuenta en el denominador y vale 0**.

**Motivo.** Antes era `suma / pesoEvaluado`: un criterio sin contestar salía del
numerador *y* del denominador. Eso **no es neutro**. En un cociente normalizado no
existe la posición neutra: quitar algo de los dos lados equivale a **imputarle la
media de lo que sí se midió**, que es el valor más optimista disponible. Por eso un
dominio con un criterio bueno de diez daba 100.

**Caso que lo destapó.** Cliente real «Kishoa-Powen»: nota 78/100 «riesgo medio»,
marcada fiable, con Backup a **100/100 habiendo contestado 1 criterio de 10**
(`frecuencia = Continuo`, peso 2 de 25). Quedaban sin comprobar las pruebas de
restauración, el estado de las últimas ejecuciones, el offsite, la inmutabilidad y
si el repositorio estaba publicado a internet — cuatro de ellos capadores.
Peor caso medido: **7 campos de 149 daban 100/100 «Riesgo bajo» marcado fiable.**

**Alternativas consideradas y por qué se rechazaron.** Se diseñaron tres en
paralelo con agentes y las tres cayeron en revisión adversarial, **todas por el
mismo motivo: reintroducían el incentivo perverso** («callarse puntúa mejor que
contestar»), que este proyecto ya había corregido dos veces antes.

| Enfoque | Por qué se rechazó |
|---|---|
| **Umbral por dominio** (no dar nota bajo X% de cobertura del dominio) | No toca `d.pesos`, así que el incentivo sobrevive intacto; y crea uno nuevo: borrar 6 respuestas buenas subía 89→99. |
| **Techo proporcional** `min(bruto, cap, 50+50·c)` | El techo es **función creciente de la información**: confesar un firewall inexistente subía la nota 10 puntos. Medido: abrir la sección de correo y contestar 2 campos honestos daba 65 y `fiable=false`; no abrirla daba 69 y `fiable=true`. |
| **Techo por capadores** (79/59 según comprobaciones críticas hechas) | Contestar la verdad **buena** en un campo padre abría un capador hijo pendiente que bajaba la nota; contestar la verdad **mala** cerraba el `dep` y no penalizaba. Y creaba un premio nuevo por marcar una sección «no». |

**Lección metodológica que conviene no perder.** Las tres propuestas demostraban
monotonía comparando motor viejo contra nuevo **con la misma entrada**. Pero el
técnico no elige entre versiones del motor: **elige entre entradas**. Cualquier
diseño futuro hay que probarlo comparando *entradas distintas del mismo motor*.

**Por qué el valor imputado es 0 y no 45 ni 50.** Con imputación a `V₀ > 0`,
borrar la respuesta de un defecto confirmado (valor 0) **sube** la nota. Solo
`V₀ = 0` evita eso.

**Consecuencia de cambiarlo.** Se vuelve al bug original. Cualquier revisión debe
mantener las tres protecciones contra «la trampa del reparto» (D2).

---

## D2. Tres cierres contra la «trampa del reparto»

**Decisión.** En `computeScore`:
1. `evaluable = d.pesoAplicable > 0 || d.cap < 100` (antes era `d.pesos > 0`).
   Un dominio activado y vacío **no sale del reparto**: entra valiendo 0.
2. Un dominio sin peso aplicable pero con hallazgo crítico confirmado también entra.
3. `sinResponder` cubre **todas** las secciones puntuadas sin decidir, no solo las
   dos con `exigida`.

**Motivo.** Si un dominio malo desaparece del reparto, su peso se redistribuye
entre los que sí tienen datos — que son justo los que salieron bien — y **borrar
respuestas subiría la nota**. El cierre 3 elimina además el premio por marcar «no»
una sección que sí existe: silencio y «no» dan la misma nota, y el «no» al menos
es una declaración que queda escrita en el informe.

**Consecuencia de cambiarlo.** Reaparece el incentivo a esconder. Hay tests que lo
fijan (`un dominio activado y vacio NO sale del reparto`).

---

## D3. `evidencia` sustituye a `cobertura`

**Decisión.** Se elimina `cobertura` del objeto devuelto. `evidencia` = fracción
del peso de criterio *aplicable* que se ha comprobado, ponderada por peso de dominio.
`EVIDENCIA_MINIMA = 60`.

**Motivo.** `cobertura` contaba el peso de los **dominios tocados**: un dominio con
1 criterio evaluado de 10 aportaba su peso entero. Mentía por factores de 20×.
Contraste medido en Kishoa: `cobertura 62 %` frente a **evidencia real 12 %**.

**Por qué se mantiene el 60 y no se baja.** Medido: un cliente pequeño (5–7
usuarios, sin servidor/VPN/rack) que contesta lo que sí tiene llega a **evidencia
100 %**, y cruza el 60 % con ~36 respuestas. En las 5 fichas de ejemplo la
evidencia real es 96–100 %. El umbral **no roza el trabajo bien hecho**. Bajarlo
empeoraría el agujero de esconder dominios enteros (ver KNOWN_ISSUES).

---

## D4. La nota se sigue mostrando aunque no sea fiable

**Decisión.** El panel muestra siempre el número; en gris y etiquetado
**«Provisional»** mientras `fiable === false`. El PDF, en cambio, **no imprime nota**
si no es fiable.

**Motivo.** Con el denominador nuevo la nota es una medida de progreso que sube
según se rellena. Ocultarla mataría el gradiente **durante la visita**, que es el
único momento en que el hueco tiene arreglo. En el PDF el criterio es el contrario:
un documento que se reenvía suelto no puede llevar un número sin respaldo.

---

## D5. El soporte del SO se deduce de la versión

**Decisión.** `src/score/soporteSO.js` tabula el **fin de soporte extendido** de
cada versión. Dos mecanismos según el caso:
- `servidores.so_soporte`: `redundanteSi: ["so_windows_server","so_windows_cliente","so_linux"]`
  → sale del denominador cuando la versión decide.
- `pcs.so_soporte`: `deducibleDe: "so"` → se **deduce** cuando el campo está vacío.

**Motivo.** Lo planteó el dueño: «esto se debería determinar según la versión, no
preguntarlo». Al implementarlo apareció un fallo de modelo: en servidores,
«Versión de Windows Server» (peso 2) y «¿Está en soporte?» (peso 3) **puntuaban el
mismo hecho**, ambos capando a 45. Un WS2012 generaba **dos hallazgos** por un
único dato.

**Por qué mecanismos distintos.** En `pcs` no existe criterio de versión, así que
el dato hace falta: se deduce y cuenta como evidencia. En `servidores` sí existe, y
con más matiz (WS2016 vale 0.5), así que el criterio de soporte sobra.

**Por qué la fecha de referencia es la de la VISITA y no la de hoy.** Un informe de
hace un año tiene que seguir diciendo lo que era cierto aquel día, y el motor debe
seguir siendo puro. La fecha entra por parámetro (`computeScore({..., fecha})`).
Comprobado: el mismo parque de Windows 10 sale «en soporte» visto el 2025-01-01 y
«fuera» el 2026-08-20.

**Por qué la respuesta manual gana a la deducción.** Clientes con ESU de pago son
la excepción legítima. El formulario ofrece «Contestar a mano».

**Qué NO es derivable y por qué.** `red.firewall_soporte` y `wifi.aps_soporte`:
solo hay marca/modelo en texto libre, no hay versión que consultar. Linux con
versión menor desconocida (Ubuntu LTS, Debian, RHEL…) tampoco.

---

## D6. Una pregunta sin contestar se nombra con su pregunta

**Decisión.** `sections.js` exporta `preguntaDe(seccion, campo)`. Las listas de
comprobaciones pendientes muestran **la etiqueta del campo**, nunca el `titular`
del criterio.

**Motivo.** El `titular` está escrito para un hallazgo **confirmado** («RAID
degradado: hay un disco en fallo»). Puesto sobre un campo que solo está en blanco,
afirma un problema que nadie ha visto. El dueño lo reportó con captura: veía
«Servidor con sistema operativo fuera de soporte» al lado de un «Windows Server
2025» recién escrito y lo leyó, con razón, como alarma falsa. **Pasaba en los 22
capadores sin excepción.**

**Consecuencia de cambiarlo.** El informe volvería a acusar de cosas no
comprobadas. Hay test de regresión que lo fija.

---

## D7. El informe no dice «sin hallazgos críticos» si no se comprobó todo

**Decisión.** Esa frase solo se imprime si `criticos === 0 && capadoresPendientes === 0`.
Si quedan capadores sin hacer se publica el bloque **«Preguntas críticas sin
contestar»** con la coletilla «No son hallazgos: son huecos».

**Motivo.** Es la frase más cara del documento. Decir «sin hallazgos» sobre lo que
nadie miró es literalmente cierto y completamente engañoso, y el informe lo lee
también el comercial.

---

## D8. La respuesta a «clientes pequeños» fue señalar campos, no bajar el listón

**Decisión.** Marcar en el formulario los campos que puntúan (regla lateral),
contador doble por grupo, y panel que mide avance hacia la nota.

**Motivo.** Medido: de 200 campos visibles en un cliente pequeño, solo ~70 mueven
la nota; cuatro secciones enteras (Almacenamiento, Telefonía, Impresión, ERP: 45
campos) **no tienen ni un criterio**. Benbros tenía 46 % de campos rellenos y 30 %
de evidencia porque lo relleno era casi todo inventario. **El problema nunca fue el
umbral: era que en pantalla un desplegable que decide la nota y una casilla de
número de serie se ven igual.**

**Por qué la marca no cambia al contestarse.** Si se pusiera verde sería un segundo
semáforo compitiendo con el del grupo, y se dejaría de leer. Dice una sola cosa.

**Por qué incluye campos padre.** `CAMPOS_QUE_PUNTUAN` añade los campos de los que
cuelga un criterio por `dep`. Marcar solo los criterios diría que «¿Hay repositorio
dedicado?» es inventario, cuando decide si puntúan otros tres.

**Riesgo asumido y consciente.** La marca **acorta también el camino del técnico
con prisa** (de ~70 campos a ~36). Se aceptó porque ya existía un atajo peor
(contestar 24 respuestas ordenadas por peso) y porque la marca **no ordena por
peso**: solo dice cuáles son.

---

## D9. El PDF se corta a mano, no con el autoPaging de jsPDF

**Decisión.** `src/print/exportarPdf.js` renderiza **un** canvas y lo corta a mano
en páginas, usando el mismo alto de página que usó el plugin de marcadores.

**Motivo.** `.save()` de html2pdf delega en el plugin context2d de jsPDF con
`autoPaging`, que decide dónde partir **mientras dibuja**, con su propio cálculo de
alto de página. Los marcadores (`pdf-avoid`, `pdf-break-before`) los inserta *otro*
plugin con *otro* cálculo. Los dos no coinciden y el error se acumula: invisible en
las primeras páginas, hacia la 8-9 cortaba títulos de sección por la mitad.
Con una sola fuente de verdad para el alto de página, ambos coinciden siempre.

**Configuración exacta y por qué.** `pagebreak: { mode: ['legacy'], before: '.pdf-break-before', avoid: '.pdf-avoid' }`.
`avoid-all` queda **fuera a propósito**: mirando el código de html2pdf, ese modo
fuerza el selector `avoid` a lista vacía y lo sustituye por su heurística interna,
que no evita partir las secciones del inventario.

**Marcadores de 24 px.** Cada bloque empieza con un `<div class="pdf-break-before" style="height:24px">`
**vacío y separado del contenido**. El cálculo del salto llega corto por casi una
línea; sin la reserva, asomaba un fleco del bloque siguiente en la página anterior.
Al ir separado, ese fleco es siempre espacio en blanco, nunca texto ni color.

---

## D10. El informe es INTERNO; la versión para cliente es una fase propia

**Decisión.** El PDF se entrega al técnico y al comercial de ALANA IT, no al cliente.

**Motivo.** No basta con quitar un bloque. Habría que revisar los textos de los 116
avisos (varios mencionan Hudu, NinjaOne y la cuenta técnica de ALANA), los 16
campos de notas libres y las propias capturas, que pueden ser la consola del
proveedor saliente. Está escrito en la cabecera de `src/print/informe.js` como
aviso permanente.

---

## D11. Los ejemplos ya no se publican en `public/ejemplos/`

**Decisión.** `scripts/etiquetar-ejemplos.mjs` solo reescribe `ejemplos/`.

**Motivo.** `public/ejemplos/` alimentaba un botón «Cargar ejemplos» que se retiró
de producción; la carpeta se borró en `7b4685a`. El script seguía recreándola, lo
que volvía a servir datos de ejemplo desde la web sin que nadie los pidiera.

---

## D12. `.claude/handoff/` sí se versiona

**Decisión.** `.gitignore` pasa de `.claude/` a `.claude/*` + `!.claude/handoff/`.

**Motivo.** El porqué de las decisiones del modelo tiene que viajar con el repo.
Se usa `.claude/*` y no `.claude/` porque **git no puede reincluir nada dentro de
un directorio ya excluido**. `launch.json` sigue siendo local.
