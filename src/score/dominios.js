// Dominios del CiberScore y su peso en la nota global.
//
// Los pesos salen de donde mas dano hace un fallo en una pyme, no de repartir
// a partes iguales: perimetro y backup pesan el doble que la infraestructura
// fisica porque un RDP publicado o unas copias que no restauran se llevan la
// empresa por delante, y un SAI sin baterias no.
//
// Alineado de forma pragmatica con CIS Controls v8 IG1 y el ENS basico: solo
// entra lo que un tecnico puede observar en una visita de un par de horas.
//
// EL PESO DE UN DOMINIO SE REPARTE ENTRE SUS CRITERIOS. Es un juego de suma
// cero: cuantos mas criterios tiene un dominio, menos vale cada uno. Por eso
// la cuenta que importa no es el `peso` de un criterio sino
// `peso / suma_de_pesos_del_dominio * peso_del_dominio`, y por eso partir un
// dominio sobrecargado sube el valor de todo lo que hay dentro sin tocar
// ningun criterio.
//
// Ese era el caso de "endpoint" hasta la version 2.4.0: 24 criterios y 53
// unidades de peso metidas en 16 puntos, porque dentro convivian tres
// subsistemas (puestos, antivirus y servidores). Una unidad de peso alli valia
// 0,302 puntos frente a los 0,842 de identidad: 2,8 veces menos por el mismo
// numero. El sintoma que lo destapo: elegir MDR gestionado en vez de un
// antivirus de firmas movia 0,45 puntos sobre 100, que es ruido.
export const DOMINIOS = {
  perimetro:   { nombre: "Red y perímetro",            peso: 16 },
  backup:      { nombre: "Backup y resiliencia",       peso: 17 },
  identidad:   { nombre: "Identidad y accesos",        peso: 15 },
  puestos:     { nombre: "Puestos y antivirus",        peso: 13 },
  servidores:  { nombre: "Servidores",                 peso: 11 },
  correo:      { nombre: "Correo y colaboración",      peso: 11 },
  saneamiento: { nombre: "Saneamiento del onboarding", peso: 10 },
  fisica:      { nombre: "Infraestructura física",     peso: 7 },
};

/** Tramos del semaforo. De peor a mejor, el primero que cumple manda. */
export const TRAMOS = [
  { hasta: 39,  nivel: "critico", etiqueta: "Riesgo crítico" },
  { hasta: 59,  nivel: "alto",    etiqueta: "Riesgo alto" },
  { hasta: 79,  nivel: "medio",   etiqueta: "Riesgo medio" },
  { hasta: 100, nivel: "bajo",    etiqueta: "Riesgo bajo" },
];

export const tramoDe = (nota) => TRAMOS.find(t => nota <= t.hasta) ?? TRAMOS[TRAMOS.length - 1];

// Evidencia minima para publicar la nota: que fraccion del peso de criterio
// APLICABLE hay que haber comprobado de verdad.
//
// Sustituye a la COBERTURA_MINIMA anterior, que medía peso de dominios
// TOCADOS: un dominio con un criterio evaluado de diez aportaba su peso
// entero, asi que un cliente del que no se sabia nada pasaba por fiable. El
// caso que lo destapo (Kishoa-Powen) daba cobertura 62% con evidencia real
// del 12%, y contestando 7 campos de 149 se llegaba a cobertura 92% con
// nota 100.
//
// 60 se mantiene porque en un formulario bien relleno la evidencia real ronda
// el 93-100% (medido en los cinco ejemplos), asi que el umbral no roza el
// trabajo bien hecho y corta en seco el que esta a medias. Por debajo se
// devuelve la nota igualmente —durante la visita sirve de progreso— pero
// marcada como no fiable.
export const EVIDENCIA_MINIMA = 60;

// Version del modelo. Una nota guardada con una version distinta no es
// comparable con las de hoy: al cambiar pesos, criterios o literales, sube esto.
//
// 2.0.0: cambia la agregacion. El denominador de cada dominio pasa a ser el
// peso APLICABLE en vez del peso evaluado, asi que un criterio que aplicaba y
// nadie miro cuenta y vale 0. Las mismas respuestas dan otro numero.
//
// 2.1.0: el soporte del sistema operativo se deduce de la version en vez de
// preguntarse. En servidores eso quita un doble conteo -la version y "esta en
// soporte" eran el mismo hecho puntuando dos veces en el mismo dominio, con el
// mismo tope disparandose por duplicado- asi que algunas notas bajan un punto.
//
// 2.2.0: cuatro correcciones, todas medidas antes de aplicarse.
//   - Precondicion nueva para email, red y pcs: siempre hallazgo si "no",
//     ningun cliente real puede carecer de correo, red o equipos. Cierra
//     buena parte del agujero medido en A1: negar las 8 secciones sin
//     precondicion hacia desaparecer el 73% del peso de la nota sin un solo
//     hallazgo. Quedan fuera a proposito servidores, wifi, licenciamiento,
//     vpn y sai: para esas el "no" puede ser una respuesta real. sai se probo
//     como precondicion el mismo dia y se revirtio: probado contra un cliente
//     real, tener armario/rack es una recomendacion, no algo que deba capar
//     un dominio (decision de negocio explicita, no bug).
//   - Un valor fosil en so_windows_server/so_windows_cliente/so_linux ya no
//     puede silenciar srv_so_soporte cuando so_familia ha cambiado desde que
//     se contesto: redundanteSi ahora exige que su propio dep se cumpla.
//   - El disparo de un cap con agregacion "max" (sai_existe, backup_pruebas,
//     backup_prueba_resultado) exige ahora que TODAS las instancias esten en
//     el estado critico, no que baste una: antes un armario secundario sin
//     SAI capaba el dominio igual que si el principal tampoco lo tuviera,
//     contradiciendo el porQue del propio criterio.
//   - Dejar en blanco un campo padre sin criterio propio (backup.repo_dedicado,
//     servidores.so_familia, licenciamiento.tipo_servicio, servidores.tipo,
//     email.proveedor, pcs.moviles) ya no es gratis del todo: no toca la nota,
//     pero impide el sello de fiable, igual que una seccion sin decidir.
//
// 2.3.0: se gradua la CALIDAD de la respuesta donde antes habia empates que
// escondian diferencias reales. Reportado por el dueno: "no puede valer igual
// de nota un antivirus normal, que edr, xdr, mdr gestionado". Se revisaron los
// 93 criterios: 38 tenian empates, pero solo 12 escondian calidad distinta.
// Los otros 26 son equivalencias deliberadas y CORRECTAS que NO se han tocado
// -"No hay VPNs" vale lo mismo que "Auditadas" porque no hay nada que
// auditar, y los tres tipos de rack valen igual porque el tipo no cambia el
// riesgo-, y confundir las dos cosas habria metido ruido en vez de precision.
//
// Graduados: av_tipo_solucion, av_consola_control, backup_frecuencia,
// backup_retencion, pcs_parcheo_sistema, pcs_parcheo_terceros, wifi_cifrado,
// srv_so_version_windows_server, correo_dmarc, sai_sala, sai_ventilacion,
// sai_pdu. El porQue de cada uno explica el escalon.
//
// Dos cuidados al hacerlo, los dos verificados: ninguna respuesta real puede
// quedar por debajo de callarse (todas siguen siendo > 0, y callar sigue
// valiendo 0), y el mismo hecho no puede puntuar dos veces -por eso en
// av_tipo_solucion los saltos de EDR a MDR son cortos: quien vigila la
// consola ya lo mide av_alertas_vigiladas-. El barrido de monotonia sobre las
// 804 respuestas de los ejemplos baja de 0,6% a 0,5%.
// 2.4.0: cambio estructural. Reportado por el dueno: "un XDR o MDR deberia
// tener mas peso que un punto solo en ciberscore". Al medirlo, el problema no
// estaba en el valor de la respuesta sino en la DILUCION: "endpoint" tenia 24
// criterios y 53 unidades de peso en 16 puntos, asi que una unidad alli valia
// 0,302 puntos frente a los 0,842 de identidad. Elegir MDR en vez de antivirus
// de firmas movia 0,45 puntos sobre 100. Tres cambios:
//
//   - "endpoint" se parte en "puestos" (13) y "servidores" (11), que es lo que
//     de verdad habia dentro. Beneficio extra: un cliente todo-cloud sin
//     servidores perdia 21 de 53 unidades EN SILENCIO; ahora "servidores"
//     simplemente no aplica y su peso se reparte, que es lo honesto.
//   - La escala de peso pasa de 1-3 a 1-5. Con tres niveles no habia forma de
//     decir que el tipo de solucion antivirus manda mas que el titular de una
//     licencia. av_tipo_solucion, av_cobertura_parque, av_alertas_vigiladas,
//     pcs_so_soporte, pcs_parcheo_sistema y srv_so_parcheo suben a 4; bajan a
//     1 los que median trabajo de ALANA o riesgo legal en vez de seguridad
//     (pcs_rmm_agente, pcs_software_licenciado, srv_licencia_titular).
//   - Cinco criterios nuevos sobre riesgos que el formulario ya recogia y
//     nadie puntuaba: san_licenciamiento_panel y san_licenciamiento_titular
//     (el proveedor saliente conserva el panel de dominios y licencias, o las
//     licencias estan a su nombre), lic_ssl_estado, identidad_ad_cuentas y
//     srv_gpos.
//
// El resto de dominios cede 8 puntos para financiarlo: perimetro 18->16,
// backup 18->17, identidad 16->15, correo 12->11, saneamiento 12->10,
// fisica 8->7.
//
// Queda fuera a proposito servidores.herramientas_acceso, que puede valer
// "RMM del proveedor anterior" y es el mismo riesgo: es un campo de tipo
// `checks` y el motor no resuelve multiseleccion contra un mapa literal.
//
// Verificado: un cliente perfecto sigue dando EXACTAMENTE 100 (el reparto es
// suma cero dentro de cada dominio y los pesos de dominio siguen sumando 100).
// 2.5.0: el antivirus de firmas pasa a capar el dominio de puestos (65) y a
// puntuar 0 en vez de 0,25; EDR baja a 0,7 para separarlo de XDR.
//
// Viene de medir la queja del dueno ("el edr, xdr y mdr siguen pesando lo
// mismo globalmente") y encontrar un techo que no habia visto: el peso de un
// criterio esta acotado por el de su dominio. Puestos entero vale 13 puntos,
// asi que aunque av_tipo_solucion fuera el unico criterio del dominio, elegir
// MDR en vez de firmas no podria mover mas de 13; siendo 1 de 13 criterios,
// su techo real eran ~2 puntos. Medido antes del cambio: cliente perfecto
// salvo el antivirus daba 100 con MDR+SOC y 97 con firmas sin vigilar.
//
// NINGUN reparto de pesos puede arreglar eso, porque el problema no es como
// se reparte sino cuanto hay que repartir. El unico mecanismo del modelo que
// escapa a ese techo es el cap, que es ademas donde este modelo ya pone toda
// su no linealidad (sin MFA en correo capa la global a 79, RDP publicado capa
// perimetro a 30). Con el cap, la diferencia global pasa de 3 a 5 puntos y la
// del dominio a 35, y la tarjeta "Puestos 65" sale en ambar junto al resto en
// verde, que es la lectura que hace falta.
//
// EFECTO SECUNDARIO CONOCIDO, comun a todos los caps y por tanto no nuevo:
// contestar "Antivirus basico" puntua algo peor que dejar el campo en blanco,
// porque el hueco no dispara el cap. Se comprobo que el cap de red_firewall ya
// se comportaba asi desde antes (97 contestando la verdad, 98 callando). Lo
// contiene `capadoresPendientes`, que impide que el informe afirme que no hay
// hallazgos criticos. Cerrarlo de verdad exige rediseñar los caps, no este
// criterio.
// 2.6.0: negar una seccion deja de ser gratis, pero por la via de la evidencia
// y del sello, no por la de la nota. Y un criterio que solo existe si hay
// servidores deja de cobrarse cuando el cliente declara que no los tiene.
//
// Viene de medir el atajo que D13 dejo abierto a proposito. Sobre las 5 fichas
// de ejemplo, las 155 combinaciones de negar servidores, wifi, licenciamiento,
// vpn y sai: 64 subian la nota Y SE PUBLICABAN, hasta +6, y 12 de ellas ademas
// borraban un hallazgo critico del informe. Lo peor no era la nota: sobre una
// visita a medias el atajo movia `fiable` de false a TRUE en las cinco fichas,
// porque al negar una seccion sus criterios pasan a "no aplicaban" y entonces
// si es cierto que se comprobo todo lo aplicable. El atajo hacia que el informe
// pareciera MAS fiable, no menos.
//
// Tres cambios, y ninguno convierte el "no" en hallazgo ni en cap: eso ya lo
// decidio el dueno cuando revirtio la precondicion del SAI, y sigue siendo suyo.
//
//   - El "no" pide MOTIVO, de una lista cerrada. CON motivo, el peso retirado
//     cuenta en el numerador Y en el denominador de la evidencia: neutro,
//     porque el tecnico declaro algo sobre el cliente y queda escrito con su
//     nombre y la fecha. SIN motivo cuenta solo en el denominador y vale 0,
//     igual que cualquier otra cosa que nadie ha comprobado, y ademas bloquea
//     `fiable`. Es la regla 1 aplicada un piso mas arriba, a nivel de seccion.
//   - CONTRADICCIONES: 11 reglas duras que cruzan una seccion declarada
//     inexistente contra una respuesta CERRADA de otra seccion que no podria
//     ser cierta si aquella no existiera ("no hay servidores" frente a "el DHCP
//     lo da un servidor Windows"). No son hallazgos y no tocan la nota: no se
//     afirma que el cliente tenga servidores, se afirma que el formulario se
//     contradice, que es un hecho del propio formulario. Solo bloquean el
//     sello. Las senales blandas quedan fuera a proposito: pcs.dominio = "Si"
//     se contesta igual con Entra ID y sin un solo servidor, y una regla que
//     salta sobre un cliente legitimo ensena a ignorar el aviso.
//   - `depSeccion`: av_servidores solo aplica si la seccion servidores esta en
//     "si". El todo-cloud honesto pagaba 11 puntos por contestar la verdad
//     ("No, el antivirus no cubre servidores" daba 89; mentir "Si" devolvia los
//     100). Ahora la verdad da 100 y la mentira no gana nada, porque salta la
//     contradiccion con la seccion negada.
//
// Medido despues: de las 64 combinaciones que subian la nota y se publicaban
// quedan 3, todas de +1 punto y ninguna borra un hallazgo; en visita a medias
// `fiable` sigue en false en las cinco fichas; el barrido de monotonia no se
// mueve (14 de 804, los mismos casos, todos de campo padre); y un cliente
// perfecto sigue dando exactamente 100.
//
// La nota al negar una seccion NO cambia, y es deliberado: retirar el peso de
// algo que de verdad no existe sigue siendo lo correcto, y moverlo habria
// reintroducido el bug que este proyecto lleva cuatro veces corrigiendo.
//
// Dos arreglos mas del mismo dia, de otros agujeros:
//
//   - Un capador cuyo literal de "no comprobado" entra por `computa` (red_rdp =
//     "No revisado" y los siete san_*) contaba como evaluado y NO entraba en
//     capadoresPendientes. Las fichas 03 y 04 salian con CERO comprobaciones
//     criticas pendientes teniendo el RDP y el panel de licencias sin mirar.
//     Ese literal sigue puntuando lo que dice su mapa -esa excepcion no se
//     toca- pero deja de cerrar el pendiente. No mueve ninguna nota.
//   - "No revisado" en un campo PADRE contaba como decidido: cerraba el `dep`
//     de sus hijos, los sacaba del denominador con sus capadores dentro, y
//     devolvia el sello de fiable que el blanco si retiene. Declarar el NAS y
//     reconocer no haberlo mirado daba 94; contestar "No revisado" en el padre
//     daba 100 y fiable. Ahora los dos valen igual, que es lo que el propio
//     modelo declara en LITERALES_SIN_COMPROBAR.
//
// LO QUE NO SE HA TOCADO: A0. Callar un capador sigue puntuando mejor que
// contestar su literal critico en 22 de 24. Se disenaron y midieron cuatro
// mecanismos y los cuatro cayeron por lo mismo, medido sobre las 28 rutas de
// ocultacion que tiene un capador: el castigo del hueco y el premio por negar
// que la cosa existe son EL MISMO NUMERO, punto por punto, en 28 de 28 casos,
// porque el hueco solo nace si la seccion esta en "si" y el `dep` abierto. La
// ventaja total de esconder pasaba de +43 a +168 en las tres vias que mueven la
// nota. Cerrar A0 por la nota exige cerrar antes la fuga de los campos padre
// (KNOWN_ISSUES A2), y eso todavia no tiene diseno.
export const SCORE_MODEL_VERSION = "2.6.0";
