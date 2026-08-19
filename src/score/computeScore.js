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

import { DOMINIOS, tramoDe, SCORE_MODEL_VERSION, COBERTURA_MINIMA } from "./dominios.js";

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


/**
 * Valor literal de un campo respetando su condicional, sin pasar por el mapa.
 * Lo usa el disparo de caps, que compara contra los literales criticos.
 */
function valorCrudoEfectivo(criterio, leer) {
  if (criterio.dep && leer(criterio.dep.field) !== criterio.dep.value) return null;
  const v = leer(criterio.campo);
  return vacio(v) ? null : v;
}

/**
 * Si el criterio LLEGA A APLICAR en esta instancia, con independencia de que se
 * haya contestado o no.
 *
 * Es la diferencia entre "no aplica" y "no se ha mirado", que el motor hasta
 * ahora no distinguia: los dos salian del denominador por igual. Un campo
 * oculto porque su condicional no se cumple no existe para este cliente y no
 * puede contar como evidencia que falta; uno visible y en blanco si.
 */
function aplicaEnInstancia(criterio, leer) {
  return !(criterio.dep && leer(criterio.dep.field) !== criterio.dep.value);
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
  // `pesos` es el peso de los criterios que SE HAN PODIDO evaluar (el
  // denominador de la nota). `pesoAplicable` es el de los que le tocaban a este
  // cliente, contestados o no. La distancia entre ambos es la evidencia que
  // falta, y es lo que hasta ahora el motor no sabia medir: un dominio con un
  // solo criterio bueno de diez daba 100 sin que nada lo delatara.
  for (const d of Object.keys(DOMINIOS)) porDominio[d] = { suma: 0, pesos: 0, pesoAplicable: 0, cap: 100, evaluados: 0 };

  const hallazgos = [];
  let capGlobal = 100;

  // ── Precondiciones de seccion ────────────────────────────────────────────
  // "No tiene backup" no es un dato que falte: es el hallazgo.
  const sinResponder = [];
  for (const p of precondiciones) {
    // Dejar la seccion en blanco no puede puntuar mejor que reconocer que no
    // hay servicio: sin backup son 59 y sin contestar salian 100, porque el
    // dominio simplemente no computaba. Ahora invalida la fiabilidad.
    if (p.exigida && sectionEnabled[p.seccion] === undefined) sinResponder.push(p.seccion);
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

    // Le toca a este cliente si aplica en al menos una instancia: con tres
    // servidores, un criterio que solo aplica al tercero sigue siendo evidencia
    // que se espera.
    const aplica = Array.from({ length: n }, (_, i) =>
      aplicaEnInstancia(c, (campo) => formData[c.seccion]?.[i]?.[campo] ?? "")).some(Boolean);
    if (aplica) porDominio[c.dominio].pesoAplicable += c.peso;

    const valor = agregar(valores, c.agregacion);
    if (valor === null) continue;

    const d = porDominio[c.dominio];
    d.suma += c.peso * valor;
    d.pesos += c.peso;
    d.evaluados++;

    // Un cap se dispara si CUALQUIER instancia esta en el estado critico.
    // Se lee con el mismo filtro que el resto: un valor fosil de un campo
    // oculto por su `dep` no puede capar un dominio entero.
    if (c.critico) {
      const disparado = Array.from({ length: n }, (_, i) => valorCrudoEfectivo(c, (campo) => formData[c.seccion]?.[i]?.[campo] ?? ""))
        .some(v => v !== null && c.critico.cuando.includes(v));
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

    // Cuanto de lo que habia que mirar en este dominio se ha mirado de verdad.
    // No cambia la nota: la mide. Quien la presente decide si con un 10% de
    // evidencia detras esa nota se puede ensenar como tal.
    const evidencia = d.pesoAplicable > 0 ? Math.round((d.pesos / d.pesoAplicable) * 100) : null;

    dominios.push({
      id, nombre: DOMINIOS[id].nombre, peso: DOMINIOS[id].peso,
      nota, evaluable, capado: evaluable && bruto > d.cap,
      criteriosEvaluados: d.evaluados,
      evidencia, pesoEvaluado: d.pesos, pesoAplicable: d.pesoAplicable,
      tramo: evaluable ? tramoDe(nota) : null,
    });

    if (evaluable) { numerador += nota * DOMINIOS[id].peso; pesoTotal += DOMINIOS[id].peso; }
  }

  const global = pesoTotal ? Math.round(Math.min(numerador / pesoTotal, capGlobal)) : null;

  // Evidencia global: que parte del modelo aplicable se ha llegado a evaluar,
  // ponderada por el peso de cada dominio.
  //
  // No confundir con `cobertura`, que cuenta el peso de los dominios que tienen
  // ALGUN criterio evaluado: un dominio con un solo criterio de diez cuenta ahi
  // por su peso entero. Por eso un cliente del que apenas se sabe nada podia
  // salir con cobertura 92% y nota 100. `evidencia` es la que no se deja
  // enganar: ese mismo cliente sale por debajo del 10%.
  let pesoEvaluadoTotal = 0, pesoAplicableTotal = 0;
  for (const [id, d] of Object.entries(porDominio)) {
    pesoEvaluadoTotal += d.pesos * DOMINIOS[id].peso;
    pesoAplicableTotal += d.pesoAplicable * DOMINIOS[id].peso;
  }
  const evidencia = pesoAplicableTotal > 0 ? Math.round((pesoEvaluadoTotal / pesoAplicableTotal) * 100) : 0;

  // La nota se devuelve siempre —a medio rellenar tambien sirve para orientar—
  // pero solo es fiable con cobertura suficiente y sin secciones exigidas en
  // blanco. La interfaz decide como presentarla; el motor solo lo declara.
  const fiable = global !== null && pesoTotal >= COBERTURA_MINIMA && sinResponder.length === 0;

  return {
    version: SCORE_MODEL_VERSION,
    nota: global,
    fiable,
    sinResponder,
    coberturaMinima: COBERTURA_MINIMA,
    tramo: global === null ? null : tramoDe(global),
    capadaGlobal: global !== null && capGlobal < 100,
    cobertura: pesoTotal,
    evidencia,
    dominios: dominios.sort((a, b) => b.peso - a.peso),
    hallazgos,
  };
}
