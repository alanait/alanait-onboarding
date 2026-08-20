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
export const SCORE_MODEL_VERSION = "2.1.0";
