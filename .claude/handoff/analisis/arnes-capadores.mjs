// Arnes de medicion del agujero A0 (KNOWN_ISSUES seccion A0): callar un campo
// capador puntua mejor que contestar el literal critico.
//
// NO modifica nada del repo. Solo lee el modelo y mide.
//
// Uso directo:   node arnes-capadores.mjs
// Uso como libreria:
//   import { clientePerfecto, puntuar, tablaCapadores, barridoMonotonia } from "./arnes-capadores.mjs";

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

// La raiz del repo se deriva de la posicion de ESTE fichero (esta en
// .claude/handoff/analisis/), para que funcione en cualquier clon y no solo
// en la maquina donde se escribio.
const REPO = fileURLToPath(new URL("../../..", import.meta.url));
const imp = (rel) => import(pathToFileURL(join(REPO, rel)).href);

const { computeScore } = await imp("src/score/computeScore.js");
const { CRITERIOS, PRECONDICIONES, LITERALES_NO_APLICA, LITERALES_SIN_COMPROBAR } =
  await imp("src/score/criterios.js");
const { SECTIONS } = await imp("src/sections.js");
const { DOMINIOS } = await imp("src/score/dominios.js");

export { computeScore, CRITERIOS, PRECONDICIONES, DOMINIOS };

// Fecha de la visita: entra por parametro porque el motor es puro.
export const FECHA = "2026-08-24";

const clonar = (o) => JSON.parse(JSON.stringify(o));

/** El mejor literal de un mapa: valor maximo, excluyendo literales que sacan el criterio del denominador. */
export function mejorLiteral(criterio) {
  if (!criterio.mapa) return null;
  const candidatos = Object.entries(criterio.mapa)
    .filter(([k]) => !LITERALES_NO_APLICA.includes(k) && !LITERALES_SIN_COMPROBAR.includes(k));
  if (!candidatos.length) return null;
  candidatos.sort((a, b) => b[1] - a[1]);
  return { literal: candidatos[0][0], valor: candidatos[0][1] };
}

// Campos padre que abren criterios por `dep` y que ENTRAN EN CONFLICTO: un solo
// valor por instancia, pero varios criterios piden valores distintos. Se elige
// uno por defecto; el resto de criterios queda "noaplica" (fuera del
// denominador), que es legitimo y no impide el 100.
export const PADRES_POR_DEFECTO = {
  "servidores.so_familia": "Windows Server",   // alternativas: "Windows (escritorio)", "Linux"
  "servidores.tipo": "Físico",                 // alternativa: "Virtual" (abre srv_snapshots)
  "licenciamiento.tipo_servicio": "Servicio cloud", // alternativa: "Certificado SSL" (abre lic_ssl_estado)
};

/**
 * Cliente PERFECTO sintetico: todas las secciones a "si", una instancia por
 * seccion, y cada criterio aplicable en su mejor literal segun su propio mapa.
 *
 * @param {object} preferencias  overrides de campos padre, claves "seccion.campo"
 */
export function clientePerfecto(preferencias = {}) {
  const padres = { ...PADRES_POR_DEFECTO, ...preferencias };
  const formData = {};
  const set = (sec, campo, val) => {
    formData[sec] ??= { 0: {} };
    formData[sec][0][campo] = val;
  };

  // 1) Campos padre (los que deciden deps). Primero los que tienen criterio
  //    propio se resolveran en el paso 2; aqui solo se fijan los conflictivos y
  //    los que no puntuan.
  for (const [clave, val] of Object.entries(padres)) {
    const [sec, campo] = clave.split(".");
    set(sec, campo, val);
  }
  // Padres sin conflicto: el valor que abre el criterio hijo.
  for (const c of CRITERIOS) {
    if (!c.dep) continue;
    const clave = `${c.seccion}.${c.dep.field}`;
    if (clave in padres) continue;
    set(c.seccion, c.dep.field, c.dep.value);
  }

  // 2) Cada criterio en su mejor literal, si su dep se cumple con los padres
  //    elegidos. Un criterio con dep no satisfecha NO se rellena: queda
  //    "noaplica" y sale del denominador.
  for (const c of CRITERIOS) {
    if (c.dep && formData[c.seccion]?.[0]?.[c.dep.field] !== c.dep.value) continue;
    const m = mejorLiteral(c);
    if (!m) continue;
    set(c.seccion, c.campo, m.literal);
  }

  const sectionEnabled = {};
  for (const s of SECTIONS) sectionEnabled[s.id] = "si";
  const instanceCounts = {};
  for (const s of SECTIONS) instanceCounts[s.id] = 1;

  return { formData, sectionEnabled, instanceCounts };
}

/** Puntua un cliente {formData, sectionEnabled, instanceCounts} con el modelo real. */
export function puntuar(cliente, fecha = FECHA) {
  return computeScore({
    formData: cliente.formData,
    sectionEnabled: cliente.sectionEnabled,
    instanceCounts: cliente.instanceCounts,
    criterios: CRITERIOS,
    precondiciones: PRECONDICIONES,
    fecha,
  });
}

export const notaDominio = (res, id) => res.dominios.find(d => d.id === id)?.nota ?? null;

/** Los criterios capadores: los que llevan `critico`. */
export const CAPADORES = CRITERIOS.filter(c => c.critico);

/**
 * Tres entradas DISTINTAS del MISMO motor para un capador:
 *   a) literal critico contestado   b) campo vacio   c) mejor literal
 * Todo lo demas se queda en el cliente perfecto.
 */
// Bases especiales para capadores que en la base por defecto NO aplican.
// srv_so_soporte se anula por `redundanteSi` en cuanto so_familia es "Windows
// Server" con una version que la tabla de fin de soporte sabe decidir: hay que
// medirlo sobre una familia cuya version NO se puede deducir (Linux), que es el
// unico caso en que ese criterio existe de verdad.
export const PREFERENCIAS_CAPADOR = {
  srv_so_soporte: { "servidores.so_familia": "Linux" },
};

export function variantesCapador(c) {
  // Si el capador cuelga de un dep conflictivo, se construye la base que lo
  // hace aplicable; si no, no se estaria midiendo nada.
  const pref = { ...(PREFERENCIAS_CAPADOR[c.id] ?? {}) };
  if (c.dep) {
    const clave = `${c.seccion}.${c.dep.field}`;
    if (clave in PADRES_POR_DEFECTO && PADRES_POR_DEFECTO[clave] !== c.dep.value) pref[clave] = c.dep.value;
  }
  const base = clientePerfecto(pref);

  const conValor = (v) => {
    const x = clonar(base);
    if (v === null) delete x.formData[c.seccion][0][c.campo];
    else x.formData[c.seccion][0][c.campo] = v;
    return x;
  };

  const literalCritico = c.critico.cuando[0];
  const mejor = mejorLiteral(c).literal;

  const a = puntuar(conValor(literalCritico));
  const b = puntuar(conValor(null));
  const cc = puntuar(conValor(mejor));

  return {
    id: c.id, dominio: c.dominio, campo: `${c.seccion}.${c.campo}`,
    literalCritico, mejorLiteral: mejor,
    capDominio: c.critico.capDominio, capGlobal: c.critico.capGlobal,
    verdad:   { nota: a.nota, dom: notaDominio(a, c.dominio), fiable: a.fiable, hallazgos: a.hallazgos.length },
    vacio:    { nota: b.nota, dom: notaDominio(b, c.dominio), fiable: b.fiable, hallazgos: b.hallazgos.length,
                pendiente: b.capadoresPendientes.some(p => p.id === c.id) },
    mejor:    { nota: cc.nota, dom: notaDominio(cc, c.dominio), fiable: cc.fiable, hallazgos: cc.hallazgos.length },
    ventaja: b.nota - a.nota,
    ventajaDominio: (notaDominio(b, c.dominio) ?? 0) - (notaDominio(a, c.dominio) ?? 0),
  };
}

/** La tabla completa de los capadores, ordenada por ventaja de callar. */
export function tablaCapadores() {
  return CAPADORES.map(variantesCapador).sort((x, y) => y.ventaja - x.ventaja || y.ventajaDominio - x.ventajaDominio);
}

/** Carga las fichas reales de ejemplos/. */
export function fichasEjemplo() {
  const dir = join(REPO, "ejemplos");
  return readdirSync(dir).filter(n => n.endsWith(".alanait")).sort().map(f => {
    const c = JSON.parse(readFileSync(join(dir, f), "utf8"));
    return { fichero: f, empresa: c.clientData?.empresa ?? "", fecha: c.clientData?.fecha || FECHA,
             cliente: { formData: c.formData, sectionEnabled: c.sectionEnabled, instanceCounts: c.instanceCounts } };
  });
}

/**
 * Barrido de monotonia: borrar UNA respuesta no puede subir la nota.
 * Devuelve todos los campos rellenos y los casos en que borrarlos sube.
 */
export function barridoMonotonia(cliente, fecha = FECHA) {
  const basal = puntuar(cliente, fecha).nota;
  const casos = [];
  let total = 0;
  for (const [sec, instancias] of Object.entries(cliente.formData ?? {})) {
    for (const [idx, campos] of Object.entries(instancias ?? {})) {
      for (const [campo, val] of Object.entries(campos ?? {})) {
        if (val === "" || val === null || val === undefined || (Array.isArray(val) && !val.length)) continue;
        total++;
        const x = clonar(cliente);
        delete x.formData[sec][idx][campo];
        const nota = puntuar(x, fecha).nota;
        if (nota !== null && basal !== null && nota > basal) {
          casos.push({ seccion: sec, instancia: Number(idx), campo, valor: val, basal, alBorrar: nota, delta: nota - basal });
        }
      }
    }
  }
  return { basal, total, casos };
}

// ── Informe por consola ────────────────────────────────────────────────────
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pad = (s, n) => String(s).padEnd(n);
  const padi = (s, n) => String(s).padStart(n);

  console.log("\n=== 1. CLIENTE PERFECTO SINTETICO ===");
  const perfecto = clientePerfecto();
  const rp = puntuar(perfecto);
  console.log(`nota ${rp.nota}   evidencia ${rp.evidencia}%   fiable ${rp.fiable}   hallazgos ${rp.hallazgos.length}   capadoresPendientes ${rp.capadoresPendientes.length}`);
  console.log("dominios: " + rp.dominios.map(d => `${d.id} ${d.nota}${d.capado ? "*" : ""}`).join("  "));
  if (rp.nota !== 100) {
    console.log("!! NO da 100. Dominios por debajo de 100:");
    for (const d of rp.dominios) if (d.nota !== null && d.nota < 100) console.log(`   ${d.id}: ${d.nota} (pesoEvaluado ${d.pesoEvaluado} / aplicable ${d.pesoAplicable}, evidencia ${d.evidencia}%)`);
  }
  if (!rp.fiable) console.log(`   [fiable=false] sinResponder=${JSON.stringify(rp.sinResponder)} padresSinDecidir=${JSON.stringify(rp.padresSinDecidir)}`);

  console.log("\n=== 2. LOS CAPADORES ===");
  console.log(`total capadores (criterios con \`critico\`): ${CAPADORES.length}`);
  const conGlobal = CAPADORES.filter(c => c.critico.capGlobal !== undefined);
  console.log(`con capGlobal: ${conGlobal.length} (${conGlobal.map(c => c.id).join(", ") || "-"})`);
  console.log(`solo capDominio: ${CAPADORES.filter(c => c.critico.capGlobal === undefined).length}`);
  const precGlobal = PRECONDICIONES.filter(p => p.capGlobal !== undefined);
  console.log(`(precondiciones de seccion, aparte: ${PRECONDICIONES.length}, con capGlobal ${precGlobal.length}: ${precGlobal.map(p => p.id).join(", ")})`);

  const tabla = tablaCapadores();
  console.log("");
  console.log(pad("criterio", 34) + pad("dominio", 12) + padi("capD", 5) + padi("capG", 5) +
    "  | " + padi("a:verdad", 9) + padi("b:vacio", 8) + padi("c:mejor", 8) + padi("vent(b-a)", 10) +
    "  | " + padi("domA", 5) + padi("domB", 5) + padi("domC", 5) + padi("ventDom", 8));
  console.log("-".repeat(130));
  for (const t of tabla) {
    console.log(pad(t.id, 34) + pad(t.dominio, 12) + padi(t.capDominio ?? "-", 5) + padi(t.capGlobal ?? "-", 5) +
      "  | " + padi(t.verdad.nota, 9) + padi(t.vacio.nota, 8) + padi(t.mejor.nota, 8) + padi((t.ventaja > 0 ? "+" : "") + t.ventaja, 10) +
      "  | " + padi(t.verdad.dom, 5) + padi(t.vacio.dom, 5) + padi(t.mejor.dom, 5) + padi((t.ventajaDominio > 0 ? "+" : "") + t.ventajaDominio, 8));
  }
  const afectados = tabla.filter(t => t.ventaja > 0);
  console.log(`\ncapadores en los que CALLAR da mejor nota global que contestar la verdad: ${afectados.length} de ${tabla.length}`);
  const soloDom = tabla.filter(t => t.ventaja === 0 && t.ventajaDominio > 0);
  console.log(`capadores sin ventaja global pero SI de dominio: ${soloDom.length}${soloDom.length ? " (" + soloDom.map(t => t.id).join(", ") + ")" : ""}`);
  console.log(`capadores sin ventaja ninguna: ${tabla.filter(t => t.ventaja === 0 && t.ventajaDominio === 0).length}`);
  console.log(`en todos los casos b) el motor marca el capador como pendiente: ${tabla.every(t => t.vacio.pendiente)}`);

  console.log("\n=== 3. BARRIDO DE MONOTONIA SOBRE LAS 5 FICHAS REALES ===");
  let totRespuestas = 0, totCasos = 0;
  for (const f of fichasEjemplo()) {
    const b = barridoMonotonia(f.cliente, f.fecha);
    totRespuestas += b.total; totCasos += b.casos.length;
    console.log(`\n${f.fichero}  nota ${b.basal}  ·  ${b.total} respuestas  ·  ${b.casos.length} casos en que BORRAR sube la nota`);
    for (const c of b.casos) {
      const cr = CRITERIOS.find(x => x.seccion === c.seccion && x.campo === c.campo);
      const esCap = cr?.critico ? "  [CAPADOR]" : cr ? "" : "  (campo padre/sin criterio)";
      console.log(`   ${c.seccion}[${c.instancia}].${c.campo} = "${c.valor}"   ${c.basal} -> ${c.alBorrar}  (+${c.delta})${esCap}`);
    }
  }
  console.log(`\nTOTAL: ${totCasos} casos de no monotonia sobre ${totRespuestas} respuestas (${(100 * totCasos / totRespuestas).toFixed(2)}%)`);
  console.log("");
}
