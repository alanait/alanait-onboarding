# Análisis multiagente (salida en bruto)

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
