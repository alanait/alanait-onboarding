# Conocimiento que solo existe en la conversación

> Nada de esto se puede reconstruir leyendo el repositorio. Es lo primero que se
> perdería en una compactación automática.

---

## 1. Quién es el usuario y cómo trabaja

- **Juan Carlos García**, `informatica@alanait.com`. Es el **dueño del producto y
  del negocio**, no un desarrollador externo: dirige un MSP y él mismo usa la app.
- Habla y escribe en **español**. Responder siempre en español.
- **Detecta problemas de producto con muy buen criterio.** En esta sesión, tres de
  sus observaciones destaparon bugs reales:
  - «no creo que deberían ser así, se le da mucha puntuación» → destapó la
    inflación por cobertura parcial (el bug central del día).
  - «sale la alerta aunque esté relleno» → destapó que los 22 capadores usaban
    texto de acusación sobre campos vacíos.
  - «esto se debería determinar según la versión, no preguntarlo» → destapó un
    doble conteo del mismo hecho en el dominio endpoint.

  **Cuando dice que algo no cuadra, medirlo antes de explicarlo.** Ha acertado
  todas las veces.

## 2. Preferencias de trabajo explícitas

- **No compilar en local.** Validar vía **preview deploys de Vercel**.
- **Trabajar en rama**, no en `main`, y fusionar cuando él lo diga.
- Quiere **explicaciones del porqué**, no solo el qué. Los mensajes de commit del
  repo siguen ese estilo a propósito.
- Le vale que se le dé una recomendación clara en vez de un menú de opciones.

## 3. Contexto de negocio (clave para decisiones de producto)

- **La mayoría de sus clientes son pequeños: 5–7 usuarios, sistemas muy sencillos.**
  Esto condiciona el modelo entero: un umbral pensado para empresa mediana penaliza
  a casi toda su cartera.
- El informe lo leen **el técnico y el comercial** de ALANA IT. Por eso importa
  tanto que no diga «sin hallazgos críticos» sobre lo que nadie miró: puede acabar
  en una conversación comercial.
- Usan **Hudu** (documentación) y **NinjaOne / Acronis** (RMM y backup). Aparecen
  citados en los textos de los avisos, y por eso el informe es interno.
- Venden servicios propios: **EasySecure**, **EasyBackup**, **EasyGo** — aparecen
  en los avisos de tipo `comercial`.

## 4. Requisitos que se confirmaron durante la conversación

- **El informe es interno.** La versión para cliente es una fase propia, no un
  interruptor (decisión explícita: «si lo hacemos solo interno por ahora el
  informe, haz la fase 4»).
- **«Si algo no cabe, se mueve a la página siguiente»** — instrucción literal sobre
  el PDF. Ninguna sección puede partirse entre páginas.
- **«Así como todo lo que se pueda automatizar»** — directriz general: si la app
  puede deducir un dato, no debe preguntarlo.
- **Los ejemplos llevan la nota en el nombre de empresa** («Ex. Ciberscore 53/100»),
  y hay que reetiquetarlos con `scripts/etiquetar-ejemplos.mjs` cuando cambia el
  modelo.

## 5. Correcciones que me hizo (y que conviene no repetir)

- **Desplegué a producción sin abrir la app en el navegador** y llegó una pantalla
  en blanco. Tras tocar componentes React, **abrir la preview y leer la consola**
  antes de dar nada por bueno.
- Probó una **URL de preview antigua** y reportó una nota que ya estaba corregida.
  Al dar una URL, dejar claro cuál es la buena; y ante un reporte de nota rara,
  **mirar primero la versión del modelo impresa en el PDF**.

## 6. Ideas aplazadas y descartadas

**Aplazadas (siguen vivas):**
- **Versión del informe para el cliente.** Requiere auditar ~116 textos de avisos,
  16 campos de notas libres y las capturas (pueden mostrar la consola del proveedor
  saliente). Fase propia.
- **Integración con NinjaOne** para poblar inventario y versiones de SO
  automáticamente. Se mencionó como la vía correcta para ir más allá de la
  deducción por tabla. No se ha empezado.
- **Licencia de la tipografía Centra No2.** La app usa **Jost** como sustituto
  libre. **Nunca se confirmó** si la licencia corporativa cubre la app. Sigue abierto.

**Descartadas:**
- Botón «Cargar ejemplos» en producción: **retirado a petición suya**, junto con la
  carpeta `public/ejemplos/`. No reintroducirlo.
- Bajar el umbral del 60 %: descartado con datos (ver DECISIONS.md D3).
- Los tres diseños alternativos del motor (umbral / techo / capadores): descartados
  en revisión adversarial (ver DECISIONS.md D1).

## 7. Preguntas abiertas para el dueño

1. **¿Se implementan las precondiciones de sección?** (punto 1 de «Qué falta»).
   Cierra el agujero más grande pero **cambia notas y sube versión de modelo**. Se
   le avisó de que llevaba tres cambios de nota en un día y prefirió validar antes.
2. **¿Se limpian las ramas antiguas?** Quedan **dos**, no seis:
   `fase0/modularizar` y `fase4/informe`. **Ambas son ancestros de `main`**, o sea
   que están fusionadas del todo y borrarlas no pierde nada. Las otras cuatro que
   este documento daba por vivas (`fase1/…`, `fase2/hints`, `fase3/ciberscore`,
   `rediseno/marca-e-informe-vivo`) ya no existen en el remoto. Se le ofreció
   borrarlas y no contestó.
3. **Calibración de Perímetro por tamaño de cliente** — decisión de negocio suya.
4. **Licencia de Centra No2.**

## 8. Datos medidos que costaría reproducir

Todos verificados ejecutando el motor real.

**El bug central (antes del arreglo):**
- Kishoa-Powen: nota 78, `cobertura 62 %`, **evidencia real 12 %**. Backup 100/100
  con 1 criterio de 10.
- Peor caso: **7 campos de 149 → 100/100 «Riesgo bajo» marcado fiable.**
- Contestar «no hay pruebas de restauración» costaba 50 puntos de dominio; dejarlo
  en blanco, 0.

**Después del arreglo:**
- 5 ejemplos: 99 / 78 / 51 / 30 / 5, evidencia 96–100 %.
- Kishoa: 78 → **12**, no fiable, 9 capadores pendientes.
- Benbros: 75 → **9**, no fiable, evidencia 15 %.
- Borrar una respuesta subía la nota en **43 de 799** casos (5,4 %) antes; **5 de
  799** (0,6 %) después.

**Sobre el tamaño del formulario (clave para clientes pequeños):**
- Cliente pequeño: **200 campos visibles, solo ~70 puntúan**. 134 son inventario.
- Secciones con **cero** criterios puntuables: Almacenamiento (14 campos),
  Telefonía (10), Impresión (11), ERP (10) y Otros dispositivos (7) = **52 campos
  que no mueven la nota**. (Una versión anterior decía 4 secciones y 45 campos:
  se dejaba fuera `otros_dispositivos`.)
- `CAMPOS_QUE_PUNTUAN` tiene **99 claves** (93 criterios + 6 campos padre).
- Un cliente pequeño contestando todo lo visible llega a **evidencia 100 %, nota 84**
  (medido antes del cambio de la deducción del SO).
- Cruza el 60 % con **~36 respuestas**.
- Benbros: 108 de 234 campos rellenos (46 %) pero **30 % de evidencia**, porque lo
  relleno era casi todo inventario.

**Pesos por dominio** (suman 100): perímetro 18, backup 18, identidad 16,
endpoint 16, correo 12, saneamiento 12, física 8.
**Peso de criterio por dominio:** perimetro 32, backup 25, identidad 19,
endpoint 53, correo 21, saneamiento 23, fisica 24.

## 9. Método de trabajo que funcionó (merece repetirse)

Los bugs serios de esta sesión **no los encontró una revisión normal**: los encontró
lanzar varios agentes en paralelo para diseñar la corrección **y un pase adversarial
que intentaba romper cada diseño**.

Ese pase tumbó **tres** diseños que parecían correctos, todos por el mismo motivo, y
evitó meter la regresión en producción.

**Instrucción concreta que hizo la diferencia** (reutilizable):

> «¿Existe algún par de entradas donde contestar la verdad de un problema, o abrir
> una sección, o marcar algo como que existe, dé una nota PEOR que callarlo, mentir
> o dejarlo en blanco? Simula al técnico con prisa a las 19:00 de un viernes.»

**Advertencia importante:** los agentes también **exageraron conclusiones**. El caso
«decir la verdad cuesta 7 puntos y el sello» resultó ser una lectura del estado
incompleto; al terminar de contestar, la honestidad gana (ver KNOWN_ISSUES A2).
**Verificar siempre los hallazgos de los agentes ejecutando el motor.**

## 10. Historia del proyecto (fases, por si aparece en el git log)

- **Fase 0**: modularizar `App.jsx` + guardarraíles de integridad.
- **Fase 1**: absorber un checklist de 100 puntos de Excel en campos nuevos.
- **Fase 2**: sistema de avisos contextuales (hints).
- **Rediseño**: marca real de ALANA IT (colores de alanait.com) + informe en vivo.
- **Fase 3**: CiberScore (7 dominios ponderados) + 5 clientes de ejemplo.
- **Fase 4**: informe ejecutivo en el PDF ← **cerrada y en producción hoy**.

Paleta de marca: azul `#2F56A3`, turquesa `#2FB6BA`, magenta `#CC3366`, ámbar
`#B4530F`, tinta `#333333`, gris `#868686`, papel `#F9F9F9`.
Tipografía: **Jost** (sustituto libre de Centra No2), pesos 300–500, nunca 700/800.

## 11. Suposiciones no verificadas

- Las fechas de fin de soporte de `soporteSO.js` se escribieron de memoria del
  modelo (fechas oficiales de Microsoft y del EOL de CentOS 7). **No se
  contrastaron contra una fuente en vivo.** Son estables y públicas, pero si algo
  parece raro, verificar. Windows Server 2016 (2027-01-12) es la más cercana a
  caducar y por tanto la que antes cambiará de significado.
- La reconstrucción de Kishoa y Benbros se hizo **a partir de sus PDF**, no de los
  ficheros originales (no están en el repo). Los números son fieles (Benbros
  reproduce exactamente 75 / cobertura 74 % con el motor viejo) pero no son los
  datos reales guardados en Supabase.
