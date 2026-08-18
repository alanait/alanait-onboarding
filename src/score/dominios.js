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

// Version del modelo. Una nota guardada con una version distinta no es
// comparable con las de hoy: al cambiar pesos, criterios o literales, sube esto.
export const SCORE_MODEL_VERSION = "1.0.0";
