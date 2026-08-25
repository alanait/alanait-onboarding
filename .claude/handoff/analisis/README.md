# Análisis y arneses de medición

Estos dos ficheros son la **síntesis final de dos flujos multiagente** ejecutados
el 2026-08-20. Se guardan porque contienen **mediciones caras de reproducir**
(barridos sobre miles de formularios, caminos mínimos al umbral, inventarios de
pesos criterio a criterio).

| Fichero | Pregunta que respondía |
|---|---|
| `2026-08-20-motor-cobertura-parcial.md` | Cómo corregir que la nota se inflara con cobertura parcial de dominio. |
| `2026-08-20-clientes-pequenos.md` | Si el umbral del 60 % de evidencia es alcanzable para clientes de 5–7 usuarios. |

## Léelos con estas advertencias

1. **Son salida en bruto de agentes, no doctrina.** Lo que se decidió y por qué
   está en `../DECISIONS.md`; lo que quedó pendiente, en `../CURRENT_STATE.md`.

2. **Contienen al menos una conclusión exagerada, ya refutada.** El segundo
   fichero afirma que «decir la verdad cuesta 7 puntos y el sello» al declarar un
   repositorio de copias. Se verificó ejecutando el motor: eso mide solo el estado
   *incompleto*; al terminar de contestar, la honestidad gana. Detalle en
   `../KNOWN_ISSUES.md` § A2.

3. **Algunas cifras no se pudieron reproducir.** El «nota 62 fiable» del agujero de
   negar secciones no se replicó (mi reconstrucción daba 36 y no fiable). Lo
   estructural sí está confirmado.

4. **Referencian rutas y hashes de commit del momento.** Pueden haber cambiado.

5. **Los ficheros describen el estado ANTERIOR a varios arreglos** que ya se
   implementaron el mismo día (deducción del soporte de SO, marcado de campos que
   puntúan, textos de las preguntas pendientes). No tomarlos como estado actual.

---

## Arneses de medición ejecutables (rescatados del scratchpad el 25/08/2026)

El scratchpad de la sesión **se pierde**. Estos tres scripts se guardan aquí porque
el trabajo que viene —A2, la fuga de los campos padre, y después A0— los necesita, y
reconstruirlos cuesta media sesión.

No tocan nada del repositorio: **solo leen el modelo y miden**. No están encadenados
a `npm run build` a propósito: no son guardarraíles, son instrumentos.

| Fichero | Qué mide |
|---|---|
| `arnes-capadores.mjs` | Construye un **cliente perfecto sintético** a partir de los `CRITERIOS` reales y comprueba que da 100. Tabla de los 24 capadores (contestar la verdad / dejar en blanco / mejor literal) y barrido de monotonía sobre las 5 fichas. **Es también librería**: exporta `clientePerfecto()`, `puntuar()`, `barridoMonotonia()`, `tablaCapadores()`, `variantesCapador()`, `mejorLiteral()`, `fichasEjemplo()`. |
| `medir-seccion-sin-decidir.mjs` | El agujero A7: qué cuesta no tocar una sección frente a marcarla «No», en las 5 secciones con precondición. |
| `medir-si-vacio.mjs` | Las cuatro entradas posibles de una sección —contestada / «sí» y vacía / sin decidir / «No»—. La columna «sí y vacía» es la escapatoria que aparecería ante cualquier castigo al silencio. |

Se ejecutan desde la raíz del repositorio:

    node .claude/handoff/analisis/arnes-capadores.mjs

La ruta al repositorio **se deriva de la posición del propio fichero**, así que
funcionan en cualquier clon. Verificado el 25/08 desde esta ubicación.

> **Para probar un rediseño del motor:** parchea una copia de `src/score/` en el
> scratchpad, apunta el arnés a ella, y exige que la columna «ventaja de callar» no
> sea positiva en ninguna fila **y** que el cliente perfecto siga dando exactamente
> 100. Y recuerda que eso solo cubre **una de las tres** rutas de ocultación: falta
> cerrar el `dep` por el padre y negar la sección (`../KNOWN_ISSUES.md` § A0-bis).
