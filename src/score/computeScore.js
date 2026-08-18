// Motor del CiberScore.
//
// Funcion pura: mismas respuestas y misma version del modelo dan siempre la
// misma nota. No lee estado de React ni la fecha; todo entra por parametros,
// asi que se puede probar y se puede recalcular una nota antigua.
//
// Las tres reglas del modelo:
//
//   1. La ignorancia no puntua. Un campo vacio o marcado como no revisado sale
//      del denominador: ni premia ni castiga. Lo que NUNCA pasa es que puntue
//      como bueno. Un criterio puede declarar `computa` para forzar que un
//      literal concreto si entre valiendo lo que diga el mapa, cuando
//      desconocerlo es en si mismo el riesgo.
//   2. Caps criticos. Hay hallazgos que ninguna suma de puntos maquilla: capan
//      su dominio, y algunos la nota global.
//   3. Multi-instancia. Con varios servidores o varias redes, cada criterio
//      dice si manda la peor instancia (`min`, para SO en soporte o RAID) o si
//      basta con una buena (`max`, para backup fuera de sede).

import { DOMINIOS, tramoDe, SCORE_MODEL_VERSION } from "./dominios.js";

const vacio = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

/**
 * Valor de un criterio en UNA instancia.
 * Devuelve null cuando no computa, y entonces sale del denominador.
 */
function valorEnInstancia(criterio, leer) {
  // Un campo condicional cuya condicion no se cumple ni siquiera aparece en
  // pantalla: penalizar por el seria injusto.
  if (criterio.dep && leer(criterio.dep.field) !== criterio.dep.value) return null;

  const v = leer(criterio.campo);
  if (vacio(v)) return null;
  if (Array.isArray(v)) return null; // los checks no se resuelven con un mapa literal

  if (!(criterio.mapa && v in criterio.mapa)) return null; // literal desconocido: no inventamos
  if (v === "No revisado" && !criterio.computa?.includes(v)) return null;

  return criterio.mapa[v];
}

/** Agrega las instancias de una seccion segun diga el criterio. */
function agregar(valores, modo) {
  const v = valores.filter(x => x !== null);
  if (!v.length) return null;
  return modo === "max" ? Math.max(...v) : Math.min(...v);
}

/**
 * @param {object} p
 * @param {object} p.formData        respuestas del formulario
 * @param {object} p.sectionEnabled  { seccion: "si" | "no" | undefined }
 * @param {object} p.instanceCounts  { seccion: n }
 * @param {Array}  p.criterios       reglas del modelo
 * @param {Array}  p.precondiciones  reglas de seccion entera (p.ej. no hay backup)
 */
export function computeScore({ formData = {}, sectionEnabled = {}, instanceCounts = {}, criterios = [], precondiciones = [] }) {
  const porDominio = {};
  for (const d of Object.keys(DOMINIOS)) porDominio[d] = { suma: 0, pesos: 0, cap: 100, evaluados: 0 };

  const hallazgos = [];
  let capGlobal = 100;

  // ── Precondiciones de seccion ────────────────────────────────────────────
  // "No tiene backup" no es un dato que falte: es el hallazgo.
  for (const p of precondiciones) {
    if (sectionEnabled[p.seccion] !== p.cuando) continue;
    hallazgos.push({ id: p.id, dominio: p.dominio, gravedad: "critico", texto: p.texto });
    if (p.capDominio !== undefined) porDominio[p.dominio].cap = Math.min(porDominio[p.dominio].cap, p.capDominio);
    if (p.capGlobal !== undefined) capGlobal = Math.min(capGlobal, p.capGlobal);
  }

  // ── Criterios ────────────────────────────────────────────────────────────
  for (const c of criterios) {
    // Seccion sin responder, o marcada como que no aplica: fuera del
    // denominador. Las secciones cuyo "no" es un hallazgo van en precondiciones.
    if (sectionEnabled[c.seccion] !== "si") continue;

    const n = Math.max(1, instanceCounts[c.seccion] || 1);
    const valores = [];
    for (let i = 0; i < n; i++) {
      valores.push(valorEnInstancia(c, (campo) => formData[c.seccion]?.[i]?.[campo] ?? ""));
    }

    const valor = agregar(valores, c.agregacion);
    if (valor === null) continue;

    const d = porDominio[c.dominio];
    d.suma += c.peso * valor;
    d.pesos += c.peso;
    d.evaluados++;

    // Un cap se dispara si CUALQUIER instancia esta en el estado critico
    if (c.critico) {
      const disparado = Array.from({ length: n }, (_, i) => formData[c.seccion]?.[i]?.[c.campo])
        .some(v => c.critico.cuando.includes(v));
      if (disparado) {
        hallazgos.push({ id: c.id, dominio: c.dominio, gravedad: "critico", texto: c.porQue });
        if (c.critico.capDominio !== undefined) d.cap = Math.min(d.cap, c.critico.capDominio);
        if (c.critico.capGlobal !== undefined) capGlobal = Math.min(capGlobal, c.critico.capGlobal);
      }
    }
  }

  // ── Nota por dominio y global ────────────────────────────────────────────
  // Un dominio sin ningun criterio computable no arrastra la nota: sale del
  // reparto y su peso se reparte entre los que si tienen datos.
  const dominios = [];
  let numerador = 0, pesoTotal = 0;

  for (const [id, d] of Object.entries(porDominio)) {
    const evaluable = d.pesos > 0;
    const bruto = evaluable ? (d.suma / d.pesos) * 100 : null;
    const nota = evaluable ? Math.round(Math.min(bruto, d.cap)) : null;

    dominios.push({
      id, nombre: DOMINIOS[id].nombre, peso: DOMINIOS[id].peso,
      nota, evaluable, capado: evaluable && bruto > d.cap,
      criteriosEvaluados: d.evaluados,
      tramo: evaluable ? tramoDe(nota) : null,
    });

    if (evaluable) { numerador += nota * DOMINIOS[id].peso; pesoTotal += DOMINIOS[id].peso; }
  }

  const global = pesoTotal ? Math.round(Math.min(numerador / pesoTotal, capGlobal)) : null;

  return {
    version: SCORE_MODEL_VERSION,
    nota: global,
    tramo: global === null ? null : tramoDe(global),
    capadaGlobal: global !== null && capGlobal < 100,
    cobertura: pesoTotal,
    dominios: dominios.sort((a, b) => b.peso - a.peso),
    hallazgos,
  };
}
