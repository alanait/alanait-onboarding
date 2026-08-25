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

---

# Sesión del 2026-08-21 (modelo 2.2.0 → 2.5.0)

## D13. Qué significa el «no» de una sección: tres respuestas, no una

**Decisión.** `email`, `red` y `pcs` pasan a tener precondición: marcarlas «no» es
un hallazgo crítico. `servidores`, `wifi`, `licenciamiento`, `vpn` y `sai` siguen
siendo negables **sin coste**.

**Motivo.** Medido antes de tocar nada: negar las 8 secciones sin precondición
hacía desaparecer el **73 % del peso de la nota** sin generar un solo hallazgo, y
—lo peor— con `fiable: true` y evidencia 100 %, porque al negar una sección sus
criterios pasan a «no aplicaban» y entonces sí es cierto que se comprobó todo lo
aplicable. El informe llegaba a imprimir *«Nota 94, riesgo bajo. Se comprobaron
todos los criterios que aplicaban»*. **El atajo hacía que el informe pareciera más
fiable, no menos.**

El corte entre los dos grupos es de negocio: ningún cliente real carece de correo,
red o equipos; sí puede carecer legítimamente de servidores (todo-cloud), wifi
(nave), VPN (nadie teletrabaja) o licencias propias.

**`sai` se implementó como precondición y se revirtió el mismo día.** Se probó con
un cliente real y el dueño decidió que tener armario o rack es **una recomendación,
no algo que deba capar un dominio**. Se llegó a construir un mecanismo `salvoSi`
(exenta si no hay servidores) que quedó sin uso al revertir. **No volver a
proponerlo sin preguntar.**

**Consecuencia de cambiarlo.** Reaparece el 73 %.

---

## D14. Se gradúa la calidad de la respuesta, pero solo donde hay calidad distinta

**Decisión.** 12 criterios pasan de valores {0, 0.5, 1} a escalones finos. Los
otros 26 con empates **se dejan como están**.

**Motivo.** Lo reportó el dueño: *«no puede valer igual de nota un antivirus
normal, que edr, xdr, mdr gestionado»*. Al revisar los 93 criterios, 38 tenían
empates — **pero solo 12 escondían calidad distinta**.

**Lo importante es la otra mitad:** 26 empates son equivalencias deliberadas y
CORRECTAS. `"No hay VPNs"` vale lo mismo que `"Auditadas"` porque no hay nada que
auditar; `"No existían"` lo mismo que `"Revocados"`; los tres tipos de rack valen
igual porque el tipo no cambia el riesgo. **Aplanarlas habría metido ruido en vez
de precisión.** Hay pruebas que ahora las fijan para que nadie las «arregle».

**Las dos reglas que hacen que graduar sea seguro**, ambas con prueba propia:
1. Ninguna respuesta real puede quedar por debajo de callarse. Callar vale 0, así
   que bajar un valor nunca cruza ese suelo.
2. El mismo hecho no puede puntuar dos veces. Por eso en `av_tipo_solucion` los
   saltos EDR→MDR son cortos: el gran diferencial del MDR (que alguien vigile la
   consola 24×7) **ya lo mide `av_alertas_vigiladas`**.

---

## D15. `endpoint` se parte en `puestos` y `servidores`

**Decisión.** El dominio `endpoint` (16 puntos) desaparece. Nacen `puestos` (13) y
`servidores` (11). El resto de dominios cede 8 puntos para financiarlo.

**Motivo, y es el hallazgo estructural de la sesión.** El peso de un dominio **se
reparte entre sus criterios**: es suma cero, cuantos más criterios tiene, menos
vale cada uno. `endpoint` tenía 24 criterios y 53 unidades en 16 puntos porque
dentro convivían tres subsistemas (puestos, antivirus, servidores):

| dominio | criterios | unidades | %nota | valor de 1 unidad |
|---|---|---|---|---|
| identidad | 8 | 19 | 16 | **0,842 pts** |
| endpoint | 24 | 53 | 16 | **0,302 pts** |

**Una unidad de peso valía 2,8× menos por el mismo número.** Síntoma: elegir MDR
gestionado en vez de antivirus de firmas movía 0,45 puntos sobre 100.

**Beneficio que no se buscaba:** un cliente todo-cloud sin servidores perdía 21 de
53 unidades **en silencio**. Ahora `servidores` simplemente no aplica y su peso se
reparte, que es lo honesto. Y en el informe se ve: en el ejemplo 03, puestos 27
frente a servidores 63, que antes era un único «endpoint 45».

**La cuenta que importa** no es el `peso` de un criterio sino
`peso / suma_pesos_del_dominio × peso_del_dominio`. Está escrito en la cabecera de
`dominios.js`.

---

## D16. La escala de peso pasa de 1–3 a 1–5

**Decisión.** `check-score.mjs` acepta pesos 1 a 5.

**Motivo.** Con tres niveles, «esto decide la seguridad del puesto» y «esto importa
bastante» tenían que ser los dos un 3, y no había forma de decir que el tipo de
solución antivirus manda más que el titular de una licencia. Suben a 4
`av_tipo_solucion`, `av_cobertura_parque`, `av_alertas_vigiladas`,
`pcs_so_soporte`, `pcs_parcheo_sistema` y `srv_so_parcheo`. **Bajan a 1 los que
medían el trabajo de ALANA o riesgo legal en vez de riesgo del cliente**:
`pcs_rmm_agente`, `pcs_software_licenciado`, `srv_licencia_titular`.

**Seguro por construcción:** el reparto sigue siendo suma cero dentro del dominio,
así que un cliente perfecto sigue dando exactamente 100.

---

## D17. El antivirus de firmas capa el dominio, porque el peso no podía llegar

**Decisión.** `av_tipo_solucion` con «Antivirus básico» puntúa 0 **y capa
`puestos` a 65**.

**Motivo — el techo que obligó a ello.** Tras partir el dominio y subir el peso a
4, el dueño insistió: *«el edr, xdr y mdr siguen pesando lo mismo globalmente»*.
Tenía razón, y al medirlo apareció un límite que no se había visto:

> **El peso de un criterio está acotado por el de su dominio.** `puestos` entero
> vale 13 puntos: aunque `av_tipo_solucion` fuera el único criterio del dominio, no
> podría mover más de 13. Siendo 1 de 13 criterios, su techo real eran ~2 puntos.

Medido: cliente perfecto salvo el antivirus daba 100 con MDR+SOC y 97 con firmas
sin vigilar. **Ningún reparto de pesos podía arreglarlo**, porque el problema no
era cómo se reparte sino cuánto hay que repartir.

El único mecanismo del modelo que escapa a ese techo es el **cap** — que es además
donde este modelo ya concentra toda su no linealidad. Con el cap, la diferencia
global pasa de 3 a 5 puntos y la del dominio a 35, y sale una tarjeta «Puestos 65»
en ámbar junto al resto en verde.

**Por qué NO una curva sobre la media del dominio.** Se consideró (elevar la nota
del dominio a un exponente preserva el 100). Se descartó: **el informe lo lee un
comercial**. «Tienes un 62 porque te falta X» se entiende; «porque la media era 71
elevada a 1,3» no. La no linealidad tiene que venir de pesos y caps, que se
explican solos.

---

## D18. «Exportar a local» exporta lo que hay en pantalla, no lo guardado

**Decisión.** `handleExportFile` deja de leer de la nube. Y con Supabase
configurado **ya no apaga el aviso de «cambios sin guardar»**.

**Motivo.** Era una trampa: el técnico con cambios sin guardar pulsaba exportar,
se descargaba la versión ANTERIOR de la nube, y encima se apagaba el aviso. Creía
haber salvaguardado su trabajo y había hecho lo contrario.

Se sigue apagando el aviso cuando **no** hay Supabase, porque ahí exportar a
fichero *es* el guardado (`handleSave` lo usa como fallback).

Las imágenes se convierten a base64 al exportar: las URLs firmadas del bucket
caducan a las 8 h y un `.alanait` con esas URLs se rompe solo.

---

## D19. Un fallo al subir una captura es un error visible, no un silencio

**Decisión.** `syncImages` acumula los fallos y lanza; `saveClient` adjunta el
`clientId` al error antes de propagarlo.

**Motivo.** Antes, si `upload` fallaba, la imagen no se añadía a la tabla y
`saveClient` devolvía éxito igual: la app decía «Guardado» y la captura —que puede
llevar credenciales o datos bancarios— desaparecía para siempre.

**El detalle del `clientId` importa:** la ficha ya está guardada cuando falla la
imagen. Sin propagar el id, el reintento crearía un cliente duplicado. Y `isDirty`
se deja en `true` a propósito: no se guardó todo.

---

# Sesión del 2026-08-24

## D20. El borrador local usa `localStorage`, y cuando no cabe lo dice

**Decisión.** `src/lib/borrador.js` copia la visita a `localStorage` 1,5 s después
de dejar de escribir, y también en `pagehide` y `visibilitychange`. Al arrancar se
**ofrece** recuperarlo; nunca se restaura solo.

**Por qué `localStorage` y no IndexedDB**, que es la respuesta «correcta» de manual
y aquí es la equivocada: `localStorage` es **síncrono**, así que se puede escribir
dentro de `pagehide` —el último instante en que el navegador deja correr código—.
IndexedDB es asíncrono y en ese momento no garantiza terminar la escritura, que es
justo el caso que hay que cubrir. El precio es el cupo (~5 MB por origen) cuando
una sola captura en base64 puede ocupar 2 MB.

**Por eso el aligerado por escalones, y por eso se cuentan las omitidas.** Si no
cabe: primero fuera las capturas aún no subidas (las que ya están en la nube son
una URL corta y sobreviven), luego todas. El número de capturas que se quedaron
fuera **se guarda y se enseña al recuperar**. Un borrador que dice haber salvado
unas capturas que soltó es peor que no tener borrador: el técnico se entera al
imprimir el informe, días después y delante del cliente.

**Por qué el cupo se comprueba intentando escribir.** No hay forma fiable de
consultar el espacio libre de `localStorage`: la única señal real es que
`setItem` lance. Por eso son tres intentos y no un cálculo de tamaño. Solo se
reintenta aligerando si el fallo es de cupo — con el almacén bloqueado (modo
privado, permisos) quitar fotos no arregla nada y solo retrasaría el aviso.

**Por qué NO apaga el punto de «cambios sin guardar».** El borrador es una red de
seguridad, no un guardado. Si apagara el aviso, el técnico se iría de la visita
creyendo que el cliente está en la nube cuando solo está en el portátil con el que
fue. Mismo razonamiento que D18.

**Por qué no se restaura solo.** Pisar en silencio lo que el técnico tenga delante
es la misma pérdida de datos con el signo del revés.

**Por qué una ficha recién abierta no se ofrece.** Nace con la fecha de hoy puesta.
Ofrecer recuperar *eso* enseña a decir que no al aviso, y el día que importe también
se dirá que no (`borradorTieneContenido` ignora el campo `fecha`).

**Guardarraíl:** `scripts/test-borrador.mjs`, encadenado en `npm run build` como
sexto. Usa un `localStorage` de mentira **con cupo**, porque el comportamiento que
hay que fijar es el de cuando NO cabe.

---

## D21. El «no» de una sección pide motivo, pero sigue sin costar nota

**Decisión (modelo 2.6.0).** `servidores`, `wifi`, `vpn`, `licenciamiento` y `sai`
siguen siendo negables y **siguen retirando su peso de la nota**. Lo que cambia:

1. El «no» pide un **motivo** de lista cerrada. Con motivo, el peso retirado cuenta
   en el numerador *y* en el denominador de la evidencia (neutro). Sin motivo,
   solo en el denominador, valiendo 0, y **bloquea `fiable`**.
2. **11 `CONTRADICCIONES`**: una sección declarada inexistente contra una respuesta
   *cerrada* de otra que no podría ser cierta. Bloquean el sello; no tocan la nota.
3. **`depSeccion`**: `av_servidores` solo aplica si hay sección de servidores.

**Por qué NO se convierte en precondición.** Es la decisión del dueño de C5, y sigue
siendo suya. El «no» puede ser verdad.

**Por qué la nota NO se mueve.** Retirar el peso de algo que de verdad no existe es
lo correcto (regla 1). Moverlo habría reintroducido el bug histórico. Lo que se
cierra es el otro efecto, que era peor: **negar una sección subía la evidencia**, y
la evidencia es lo que abre el sello. Medido: sobre una visita a medias el atajo
movía `fiable` de false a **true en las cinco fichas**.

**Por qué las señales blandas quedan fuera.** `pcs.dominio = "Sí"` se contesta igual
con Entra ID y sin un solo servidor. **Una regla que salta sobre un cliente
legítimo enseña a ignorar el aviso**, y entonces no sirve ninguna.

**Por qué existe `contra_vpn_inversa`.** Sin la mitad simétrica, la salida barata de
una contradicción sería mentir en la señal. «No hay VPNs» ya valía lo mismo que
«Auditadas» (D14), así que silenciar el aviso saldría gratis.

**Efecto secundario que el dueño debe validar:** `licenciamiento` queda **negable
solo en la práctica si nada más lo desmiente**. Un cliente con `licencias_estado =
"Vigente"` y `email.proveedor = "Microsoft 365"` —dos respuestas normales— dispara
dos contradicciones al negarla. Es defendible (todo cliente tiene licencias) pero
es un cambio de negocio: quitar `contra_lic_antivirus` lo revierte.

**Un mentiroso coherente sigue ganando.** Negar las 4 con motivo *y* retocar una
decena de respuestas en 5 secciones da 98 fiable. Ningún motor detecta una
falsificación internamente consistente. Lo que se compra es el precio: de 4 clics a
4 clics + 4 motivos + una decena de respuestas, y con **cualquiera** sin retocar el
informe no se publica.

---

## D22. La auditoría la escribe la base, no el navegador

**Decisión.** `supabase-auditoria.sql`: las mutaciones (crear/modificar/borrar ficha,
subir/borrar captura) las registran **triggers `SECURITY DEFINER`**. Lo que no muta
nada —abrir, PDF, exportar, restaurar— lo declara la app, marcado `origin = 'app'`
frente a `origin = 'base'`.

**Motivo.** Con `FOR ALL TO authenticated USING (true)` (AS1, sigue abierto), un log
escrito por el cliente bajo esas mismas políticas es **borrable y falsificable por
quien lo genera**. Un log que el propio actor puede borrar no es una prueba.

**El `GRANT INSERT` es por columnas.** El navegador no tiene privilegio para nombrar
`actor_id`, `origin` ni `occurred_at`. Falsificar autoría no queda «comprobado y
rechazado»: no hay forma de intentarlo.

**El bug que hacía inútil el historial que ya había.** `createVersionSnapshot`
archiva el estado *anterior* y lo etiqueta con el usuario de la edición *en curso*:
desfase de uno. La versión N llevaba el nombre del autor de la edición N+1, y la
pantalla lo imprimía como «Guardado por X». Los datos viejos **no se
reinterpretan**: se derivan por desplazamiento donde se puede (`derivada`) y se
marcan `indeterminada` donde el valor era texto libre. Hueco declarado antes que
atribución inventada — D6 aplicado a la autoría.

**Corrección al diseño, hecha antes de entregarlo.** El asiento del borrado contaba
capturas y versiones en un trigger `AFTER DELETE`, pero el `ON DELETE CASCADE` es
también un trigger AFTER y **cuál corre primero depende del orden alfabético de los
nombres y de la intercalación de la base**. Si gana la cascada, los contadores salen
0 y el asiento del borrado —el evento que más importa— diría que no había ninguna
captura. Se cuenta y se anota en el `BEFORE`.

**Orden de despliegue: el código aguanta los dos.** `createVersionSnapshot` **no se
retira todavía** —si el SQL no está puesto, es lo único que crea historial— y
`getVersions` pide las columnas de autoría con reintento sin ellas, porque pedir una
columna inexistente no devuelve null: **hace fallar la consulta entera** y dejaría el
historial en blanco.

**Lo que NO cubre, y venderlo de más sería el patrón de siempre:** no cierra AS1
(sigue siendo detectivo, no preventivo); `ficha_abierta` es *declarado*, no
certificado (una cuenta con su token puede leer `clients` por la API sin dejar
rastro); no cubre a quien tenga la `service_role` key; y el log es dato personal de
los empleados, así que **hay que informarles** (RGPD art. 13, LOPDGDD 87-90).

---

## D23. El Manual del técnico vive DENTRO de la app, y sus cifras se derivan

**Decisión.** `src/components/Manual.jsx`, una pantalla superpuesta que se abre desde
el botón «Manual» del Panel de Clientes, junto a «Importar .alanait».

**Por qué dentro de la app y no en un PDF, en Hudu o en el README.** Lo que explica
—que solo 105 de los 280 campos mueven la nota, que «sin tocar» no es una respuesta,
que avisos y hallazgos son listas distintas— son las dudas que le entran al técnico
**con el cliente delante**. Un manual que hay que ir a buscar a otro sitio no se abre
en ese momento.

**Por qué las cifras se derivan de `SECTIONS`, `CAMPOS_QUE_PUNTUAN`, `DOMINIOS`,
`TRAMOS` y `HINTS` en cada render, en vez de escribirse a mano.** El día que se añada
un criterio, un manual con números fijos **empieza a mentir en silencio**. Es el
mismo criterio por el que el informe se construye con los datos. La tabla de
secciones y las tres tarjetas se generan solas: si `licenciamiento` deja de ser
declarable, se mueve de columna sin tocar el manual.

**La columna vertebral es una estructura real del modelo, no un invento
pedagógico:** las 15 secciones son de tres tipos y hay **cinco de cada uno** — 5 con
precondición (el «no» es hallazgo), 5 declarables (el «no» pide motivo) y 5 de solo
inventario (cero criterios). No estaba dicho en ninguna parte, y sin ello un técnico
puede documentar telefonía a conciencia sin saber que no mueve la nota.

**Lo que el manual NO dice, a propósito: dónde están los atajos.** Dejar secciones sin
marcar sube la nota hoy (§ A7), pero escribirlo en un manual **es publicar el atajo**
— misma razón que la prohibición del contador de «faltan N comprobaciones» en
`CLAUDE.md`. Dice la conducta que se quiere («decídelas todas antes de cerrar»), no
el mecanismo.

**Cuidado al arreglar A7:** el manual afirma hoy que la nota «empieza alta y baja
según se abren secciones». Si se arregla A7 esa frase **hay que reescribirla**.

**Sin fuentes nuevas:** usa Jost, que la app ya carga, y la paleta de `theme.js`.
Cero peticiones de red añadidas. La primera versión (publicada como artifact) usaba
IBM Plex; se descartó al llevarla dentro.

**Colocación del botón, corregida por el dueño.** Se puso centrado en la barra
razonando que «no es una acción». Él pidió ponerlo **junto a Importar, siguiendo un
orden**. El resultado es mejor: los tres botones quedan de menos a más compromiso
—leer, traer una ficha que ya existe, crear una nueva— y Manual comparte estilo con
Importar porque los dos son secundarios; el azul sólido se reserva para la única
acción que crea algo.

---

## D24. La documentación de la app en Hudu actualiza el asset existente

**Decisión.** Se actualizó el asset **4476** («Onboarding Alana IT», creado el
18/03/2026) en vez de crear uno nuevo, y se renombró a **«Onboarding Técnico ALANA
IT»**.

**Motivo.** El asset ya tenía **tres contraseñas colgando** (GitHub, Supabase,
credenciales de la app). Crear un duplicado habría partido la documentación en dos y
dejado esas contraseñas asociadas al asset equivocado. Además conserva su URL, que
puede estar enlazada desde otros sitios.

**El renombrado**, porque «Onboarding Alana IT» se confunde con el proceso de
onboarding de un cliente, que es justo lo que la herramienta documenta.

**Layout: «Aplicaciones / Licencias» (id 8).** No existe ningún layout llamado «App»;
ése es el que ALANA usa para software.

**Qué se anotó y qué no.** Nombres de variables de entorno, **nunca valores**. Y los
puntos abiertos sin maquillar —SQL de auditoría sin ejecutar, alta de cuentas
abierta, RLS permisivo—, porque una ficha de Hudu que solo cuenta lo que funciona no
sirve el día que hay un incidente.

**El acceso va ARRIBA DEL TODO** (cómo entrar, cómo registrarse, qué hacer si se
olvida la contraseña), antes de la descripción. Lo pidió así el dueño: es lo que se
busca cuando se abre esa ficha.

---

## D25. Salir de Vercel y Supabase: estudiado, viable, APLAZADO

**Decisión del dueño: «por ahora lo dejamos así».** Se documenta el análisis para no
repetirlo.

**Lo que se midió:** la app apenas está acoplada —4 ficheros y 515 líneas, todos en
`src/lib/`; 22 de los 26 ficheros de `src/` no saben que Supabase existe—. Lo
acoplado es el **SQL: 1.001 líneas con 33 usos de superficie propia de Supabase**.
No hay ninguna función de servidor: `vercel.json` son cinco líneas.

**La recomendación fue autoalojar Supabase (opción A)**, no sustituirlo: el código no
cambia y el SQL vale tal cual porque `auth.uid()` sigue existiendo. Sustituirlo de
verdad (opción B) obliga a **rehacer el modelo de seguridad entero**, porque RLS
funciona gracias a que PostgREST inyecta el JWT, y deja a la auditoría sin su
argumento.

**El freno decisivo NO es técnico:** la app se usa **en casa del cliente**. La infra
propia tendría que estar expuesta a internet y disponible durante las visitas. Hoy
una caída es problema de un tercero; con infra propia es propia, y se nota a las
once de la mañana con el cliente delante.

**Consecuencia de cambiar la decisión:** además de lo anterior, se pierden las
previews por rama, que son **literalmente cómo se verifica este proyecto** (no hay
`node_modules` local). Habría que montar un sustituto antes, no después.

**Pregunta sin responder que condiciona todo:** por qué quieren salir. Si el motivo
es RGPD o soberanía del dato, **Supabase tiene región UE** y puede que no haga falta
migrar nada — conviene comprobar la región del proyecto antes de mover un dedo.
