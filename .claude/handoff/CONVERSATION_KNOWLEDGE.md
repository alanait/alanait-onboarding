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

1. **CONTESTADA EN PARTE el 21/08.** Se implementaron para `email`, `red` y `pcs`.
   **Queda decidir** qué hacer con `servidores`, `wifi`, `licenciamiento` y `vpn`,
   que siguen negables sin coste. (`sai` ya se decidió: no capa, es recomendación.)
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

**Pesos por dominio ANTES del 21/08** (suman 100): perímetro 18, backup 18,
identidad 16, endpoint 16, correo 12, saneamiento 12, física 8.
**Peso de criterio por dominio:** perimetro 32, backup 25, identidad 19,
endpoint 53, correo 21, saneamiento 23, fisica 24.

> **Obsoleto desde 2.4.0.** `endpoint` se partió y todos los pesos se movieron.
> Los actuales están en `src/score/dominios.js`, que es la fuente de verdad; se
> dejan los viejos aquí solo para poder leer notas y mediciones anteriores.
> Hoy: perímetro 16, backup 17, identidad 15, **puestos 13**, **servidores 11**,
> correo 11, saneamiento 10, física 7.

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

---

## 12. Sesión del 2026-08-21 — lo que decidió el dueño

Cinco decisiones de producto suyas, con sus palabras. **Son criterio de negocio: no
las revierta nadie razonando técnicamente.**

1. **«El que haya armario o no debería ser una recomendación, no una cosa
   crítica.»** Tener rack o SAI **no capa** ningún dominio. Se implementó como
   precondición y se revirtió el mismo día tras probarlo con un cliente real.
2. **«Me estás llenando todo de información… aquí tienen que salir las cosas
   importantes como antes.»** El panel lateral se satura fácil. Las listas se
   cortan en 6 con «y N más». **Añadir un bloque nuevo al panel tiene un coste**;
   no es gratis por ser información cierta.
3. **«No puede valer igual de nota un antivirus normal, que edr, xdr, mdr
   gestionado.»** Origen de la graduación de calidad (2.3.0).
4. **«Un XDR o MDR debería tener más peso que un punto solo en ciberscore.»**
   Origen de partir `endpoint` (2.4.0) y del cap del antivirus de firmas (2.5.0).
5. **«Si fuera perfecto debería dar 100, pero tampoco tiene por qué ser lineal.»**
   Restricción dura y explícita. **Verificar el invariante del 100 después de
   cualquier cambio de pesos.** La no linealidad sale de pesos y caps, no de curvas.

**Y una instrucción de método que conviene respetar:** *«piensa sobre esto antes de
hacer cambios»*. Cuando la pregunta es de diseño y no de implementación, quiere
análisis y recomendación **antes** de que se toque el código. Interrumpió una vez
para insistir en ello.

## 13. Datos medidos el 21/08 que costaría reproducir

**La dilución de dominios** (lo que destapó todo):

| dominio | criterios | unidades | %nota | valor de 1 unidad |
|---|---|---|---|---|
| identidad | 8 | 19 | 16 | 0,842 pts |
| endpoint (antes de partirse) | 24 | 53 | 16 | **0,302 pts** |

**El techo del peso por dominio.** `puestos` entero a cero deja la nota global en
87. Cualquier criterio de dentro está acotado por eso: `av_tipo_solucion` tenía un
techo real de ~2 puntos por mucho que se le subiera el peso. **Por eso hizo falta
un cap y no una reponderación.**

**El agujero de negar secciones (antes de 2.2.0):** las 8 secciones sin
precondición sumaban el **73 %** del peso de la nota. Sobre el ejemplo 02, el atajo
completo daba **94 con `fiable: true`, evidencia 100 % y cero hallazgos**, frente a
78 contestando honestamente.

**El cliente pequeño — el diagnóstico anterior era FALSO.** El handoff decía
«perímetro 37–57». Medido: una oficina de 6 personas con router del operador, sin
UTM ni VLANs, pero con backup, antivirus, MFA y parches perfectos saca **perímetro
64 y nota global 93**. No hay problema de calibración medible. Ese 93 estaba además
inflado por el agujero A1 (sin SAI, el dominio *física* desaparecía del reparto):
con precondición habría sido 86.

**Seguridad, verificado contra producción:** `GET /auth/v1/settings` devolvía
`disable_signup: false`. Y lo que **sí** estaba bien: sin sesión, `clients` y
`client_images` devuelven `[]` y el bucket rechaza el listado. La exposición era
exclusivamente el alta de cuentas, no la anon key.

## 14. Cómo se verifica un deploy sin CLI de Vercel

No hay `vercel` instalado ni token. La preview se encuentra por la API de GitHub:

```bash
gh api "repos/alanait/alanait-onboarding/deployments?per_page=1" --jq '.[0].id'
gh api "repos/alanait/alanait-onboarding/deployments/<ID>/statuses" --jq '.[0].environment_url'
```

Abrir esa URL en el navegador y leer la consola **antes de dar nada por bueno**.
Ojo: abrir la URL del panel de Vercel (`vercel.com/...`) pide login y no sirve; la
que vale es la `*.vercel.app` que devuelve `environment_url`.

---

## 15. Sesión del 2026-08-24/25 — personas, rumbo y estado

### 15.1 Personas nuevas que aparecen

- **Joan Cuello — el JEFE de Juan Carlos.** Es quien tiene que revisar la
  aplicación. **Está de vacaciones**; el correo de presentación está redactado pero
  **NO enviado**: se lo mandará cuando vuelva. Hasta esa revisión el proyecto está
  en pausa deliberada.
- El correo redactado **solo existió en la conversación, no está en el repo**.
  Incluía instrucciones de registro y acceso paso a paso, qué es la herramienta y
  los dos usos previstos. Si hay que reconstruirlo, el contenido está resumido aquí
  y en CURRENT_STATE; **el texto exacto se ha perdido**.

### 15.2 Los dos usos que el dueño quiere darle

1. **Onboarding de clientes nuevos** — para lo que está pensada.
2. **Documentar la cartera de mantenimiento ANTIGUA**, con sus palabras: *«la
   podríamos usar para mantenimientos antiguos para documentar todo»*. El valor que
   le ve: CiberScore comparable en toda la cartera.
   > **Efecto que NADIE ha medido y conviene medir antes de prometerlo:** el dominio
   > `saneamiento` pesa un 10 % y va **entero** de accesos heredados del proveedor
   > saliente (`san_red_accesos`, `san_servidores_accesos`, `san_email_admins`,
   > `san_backup_*`, `san_licenciamiento_*`). A un cliente que lleva doce años con
   > ALANA eso no le aplica igual, y hoy no hay forma de declararlo. Puede falsear
   > la comparación entre cartera nueva y antigua.

### 15.3 Siguiente fase declarada: Hudu

*«En la siguiente fase configuraré subir todo a Hudu»*. Que lo recogido en la visita
pase a la documentación del cliente en Hudu en vez de quedarse solo en la app.
**La configuración la hará él**, pero el desarrollo es nuestro.

Datos de Hudu confirmados esta sesión (para no volver a buscarlos):

| | |
|---|---|
| Empresa «Alana IT » (con espacio final) | id **3** |
| Layout «Aplicaciones / Licencias» | id **8** |
| Asset de la propia app | id **4476** · https://alanait.huducloud.com/a/d303da0ec8e2 |

**No existe ningún layout llamado «App»**. Layouts disponibles: Almacenamiento,
Antivirus, Aplicaciones/Licencias, Backup, Certificados, Dispositivos de Red,
Domain AD, Email, Ordenadores, Partners, Printing, RMM, SAI/UPS, Servidores,
Usuarios M365, VPN, WiFi. **Varios se parecen mucho a las secciones de la app**, lo
cual es una pista fuerte para el mapeo de la integración.

### 15.4 Lo que se documentó en Hudu

El asset **ya existía** desde el 18/03/2026 con una sola línea, y **tenía tres
contraseñas colgando** (GitHub, Supabase, credenciales de la app). Por eso se
**actualizó en vez de crear uno nuevo**: un duplicado habría partido la
documentación y dejado las contraseñas huérfanas. Se renombró de «Onboarding Alana
IT» a **«Onboarding Técnico ALANA IT»** porque el anterior se confundía con el
proceso de onboarding de un cliente.

Contiene, por este orden: **cómo acceder**, **cómo registrarse**, dónde está
alojado, nombres de las variables de entorno (**nunca los valores**), qué datos
guarda con la lectura de RGPD, estado y puntos abiertos, dependencias de terceros y
un puntero al Manual dentro de la app.

**Hallazgo menor NO resuelto:** la contraseña «Supabase database password» apunta a
`supabase.com/dashboard/new/vtydmylteayuysxshsch`. El `/new/` es la página de «crear
proyecto» de la **organización**, así que ese identificador es el de la organización
y no un proyecto equivocado — pero la URL útil sería
`supabase.com/dashboard/project/zqdogsxqkmjjnbzkuxwq`. Además es la única de las
tres que **no cuelga del asset**. Se ofreció arreglarlo y quedó **sin contestar**.

### 15.5 Migración a infraestructura propia — estudiada y APLAZADA

Preguntó si se puede migrar a una máquina Linux propia saliendo de Supabase y
Vercel. Respondió **«ok, por ahora lo dejamos así»**. Conclusiones, para no repetir
el análisis:

- **Vercel es lo fácil**: no hay funciones de servidor, es una SPA estática.
  nginx o Caddy con fallback a `index.html`. **Horas, no días.**
- **Supabase tiene dos caminos:**
  - **(A) Autoalojar Supabase** (docker-compose oficial). El código **no cambia**:
    dos variables de entorno. **Las 1.001 líneas de SQL valen tal cual** porque
    `auth.uid()` sigue existiendo. 1–2 días. **Es la recomendación.**
  - **(B) Salir de Supabase de verdad**: reescribir 4 ficheros es lo de menos — hay
    que **rehacer el modelo de seguridad entero**, porque RLS funciona gracias a que
    PostgREST inyecta el JWT. Y la auditoría se queda sin su argumento («lo escribe
    la base, no el navegador»). **Semanas.**
- **El freno real NO es técnico:** la app se usa **en casa del cliente**, así que la
  infra propia tendría que estar expuesta a internet y disponible durante las
  visitas. Hoy, si se cae Vercel o Supabase es problema de otro; mañana es suyo, a
  las once de la mañana con el cliente delante.
- **Se perderían las previews por rama**, que son literalmente cómo verificamos.
- Otros efectos: SMTP propio para los correos de auth, URLs firmadas de las
  capturas, backups (`pg_dump` + volumen) **y probar la restauración**.
- **Pregunta que se le hizo y NO contestó:** *por qué* quieren salir — coste,
  RGPD/soberanía del dato, o exigencia de un cliente. Cambia la recomendación: **si
  es RGPD, Supabase tiene región UE y quizá no haga falta migrar**. Conviene
  comprobar en qué región está el proyecto antes de mover nada.

### 15.6 El agujero que destapó con capturas y decidió NO tocar

Mandó cinco capturas comparando la misma ficha y dijo: *«el hecho de no poner nada
implica que los equipos no tengan antivirus… marcar o no marcar el NO del antivirus
es indiferente»*. **Tenía razón.** Medición completa en KNOWN_ISSUES § A7.

Su decisión: **«ok no lo toquemos»**. Se le presentaron dos vías —(a) «sin decidir»
= «no demostrado», recomendada; (b) «sin decidir» = «no tiene», rechazable por
D1/D6— y **no eligió ninguna**.

> **Matiz de la respuesta que conviene conservar:** no se siguió su propuesta
> literal («no poner nada implica que no tiene antivirus») porque a las 10:18 con 4
> de 15 secciones decididas el silencio significa «todavía no he llegado», no «no
> tiene». Tratarlo como ausencia confirmada pondría un hallazgo crítico rojo sobre
> un cliente al que no se ha preguntado, y el técnico dejaría de creerse los
> hallazgos — que es el fallo que ya se tuvo con los avisos ámbar.

### 15.7 Correcciones y preferencias nuevas de esta sesión

- **«ponlo cerca de Importar .alanait al lado, como siguiendo un orden»** — el botón
  del Manual se había puesto centrado en la barra y lo quiso **junto a las
  acciones**. Quedó: Manual · Importar · + Nuevo Cliente, de menos a más
  compromiso, con Manual compartiendo estilo con Importar (los dos secundarios) y el
  azul sólido reservado para la única acción que crea algo.
- Pidió que el manual fuera **«visual y fácil de ver»** y que luego se pudiera
  **poner dentro de la aplicación**. Por eso se hizo primero como artifact y después
  como componente React con la paleta y la tipografía de la propia app.
- **«Documenta la app en Hudu donde está alojada como Asset app»**, y después
  **«explica también cómo registrarse y cómo acceder en el principio del asset»** —
  el acceso va **arriba del todo**, antes de la descripción.
- Al pedir el ticket: quería **resumen ejecutivo corto**, no un volcado técnico.

### 15.8 Preguntas que se le hicieron y siguen SIN CONTESTAR

1. ¿Poner el **Manual también en el editor**, junto al icono del historial? Es donde
   surgen las dudas de verdad, con el cliente delante.
2. ¿Arreglar la entrada de contraseña de Supabase en Hudu (URL + enlazarla al
   asset)?
3. ¿Añadir **recuperación de contraseña** a la app? Hoy no existe.
4. ¿Borrar las ramas remotas `fase0/modularizar` y `fase4/informe`, ambas ancestros
   de `main`? Se ha ofrecido **tres veces** en dos sesiones y nunca ha contestado.
5. ¿Por qué quieren salir de Vercel/Supabase?
6. Las dos decisiones de negocio de 2.6.0: `licenciamiento` queda negable solo si
   nada más lo desmiente, y `sai` entra en el mecanismo del motivo.

### 15.9 Tres avisos sobre el correo a Joan que siguen vivos

1. Joan verá **datos reales de clientes**, no un entorno de pruebas.
2. Si su correo no es `@alanait.com`, **el registro le fallará**.
3. El borrador dice «cinco clientes de ejemplo cargados», pero **el botón de
   cargarlos se retiró de producción a propósito** (D11). O se quita la frase, o hay
   que cargárselos a mano en su cuenta.

### 15.10 Método que volvió a funcionar, y su coste

Se lanzó un **workflow de 13 agentes** (2,2 M de tokens, ~69 min) con fase
adversarial: 2 midieron, 4 diseñaron una vía cada uno para A0, 4 refutaron, 2
diseñaron secciones y auditoría, 1 sintetizó. **Los cuatro diseños de A0 cayeron**,
cada uno con contraejemplo medido. De ahí salió el hallazgo estructural de la sesión
(la «ley» de A0-bis), que ninguna revisión normal habría encontrado.

**Y hay que verificar a los agentes:** el diseño de auditoría traía un fallo real
—contar capturas en un trigger `AFTER DELETE`, cuando la cascada también es AFTER—
que se corrigió antes de entregarlo. **La medición de A0 del 21/08 también estaba
mal**: decía «22 de 24 capadores» y son **24 de 24**.

### 15.11 Datos medidos el 24/25 de agosto que costaría reproducir

- **La ley de A0-bis:** por cada punto que una vía baja la rama honesta, la ventaja
  de esconder sube exactamente ese punto. **28 de 28 casos**, en tres vías. Ventaja
  total de esconder: motor vivo **+43**; con tope suave, peso efectivo o techo de no
  verificación, **+168 a +171**.
- **Las 28 rutas de ocultación** de un capador: 19 = cerrar el `dep` contestando el
  padre con otro valor; 9 = negar la sección. **El campo en blanco es solo una de
  tres formas de esquivar**, y es la única que los cuatro diseños midieron.
- **El atajo de negar secciones antes de 2.6.0:** hasta **+29 puntos** y **5
  hallazgos críticos borrados**; sobre visita a medias movía `fiable` de false a
  **true en las cinco fichas**. Después: **3 combinaciones de +1 punto**, ninguna
  borra hallazgos.
- **El peaje del todo-cloud honesto:** contestar la verdad en
  `antivirus.servidores_av` daba **89**; mentir devolvía **100**. Con `depSeccion`,
  la verdad da 100 y la mentira queda delatada por contradicción.
- **El padre «No revisado»:** declarar el NAS y reconocer no haberlo mirado daba
  **94**; contestar «No revisado» en el padre daba **100 y fiable**.
- **Monotonía sobre las 5 fichas:** 14 casos de 804 antes de 2.6.0, **12 después**.
- **Acoplamiento con Supabase:** 4 ficheros, 515 líneas; 22 de 26 ficheros
  indiferentes; 1.001 líneas de SQL con 33 usos de superficie propia.
- **Estructura 5/5/5 de las secciones** (columna vertebral del Manual): 5 con
  precondición, 5 declarables, 5 de solo inventario. **280 campos, 105 puntúan.**

### 15.12 Estado del registro de cuentas — verificado, no supuesto

`GET /auth/v1/settings` contra producción el 24/08 devolvió **`disable_signup:
false`**, `mailer_autoconfirm: false`, proveedor `email` activo. O sea: **el alta
está ABIERTA** y la protección depende entera de que el Auth Hook esté activo.
**No se puede comprobar el hook desde fuera sin dar de alta una cuenta**, y crear
cuentas es algo que Claude no hace. Lo tiene que mirar el dueño en el panel.

Antes de esto el dueño lo había desactivado y **se rompió el login** (comportamiento
documentado de Supabase: «Enable signups» apaga el proveedor entero), así que
**volvió a habilitarlo**. Esa es la razón de que esté abierto.

### 15.13 Límite permanente de la verificación

**Claude no puede iniciar sesión en la app** (no crea cuentas ni introduce
contraseñas). Todo lo que solo se ve con sesión iniciada —formulario, panel lateral,
Manual, Panel de Clientes— **lo tiene que mirar el dueño**. Lo que sí se puede
verificar sin sesión: que la preview compila, que la página de login carga sin
errores de consola, que el contenido está en el bundle, y un repaso estático de que
ningún identificador queda fuera de ámbito.

Esta limitación se aplicó tres veces esta sesión y siempre se avisó explícitamente.
