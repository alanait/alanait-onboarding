// Dominios del CiberScore y su peso en la nota global.
//
// Los pesos salen de donde mas dano hace un fallo en una pyme, no de repartir
// a partes iguales: perimetro y backup pesan el doble que la infraestructura
// fisica porque un RDP publicado o unas copias que no restauran se llevan la
// empresa por delante, y un SAI sin baterias no.
//
// Alineado de forma pragmatica con CIS Controls v8 IG1 y el ENS basico: solo
// entra lo que un tecnico puede observar en una visita de un par de horas.

export const DOMINIOS = {
  perimetro:   { nombre: "Red y perímetro",            peso: 18 },
  backup:      { nombre: "Backup y resiliencia",       peso: 18 },
  identidad:   { nombre: "Identidad y accesos",        peso: 16 },
  endpoint:    { nombre: "Endpoint y servidores",      peso: 16 },
  correo:      { nombre: "Correo y colaboración",      peso: 12 },
  saneamiento: { nombre: "Saneamiento del onboarding", peso: 12 },
  fisica:      { nombre: "Infraestructura física",     peso: 8 },
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
export const SCORE_MODEL_VERSION = "2.2.0";
