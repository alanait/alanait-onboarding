// Pruebas del informe ejecutivo, sin navegador.
//
// No comprueban que sea bonito —eso se mira en el PDF— sino que dice la verdad:
// que la nota que imprime es la que calcula el motor, que no se cuela el
// `porQue` de los criterios (jerga del modelo) y que los casos limite no
// generan un documento roto.
//
//   node scripts/test-informe.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPrintFragment } from "../src/print/buildPrintHTML.js";
import { computeScore } from "../src/score/computeScore.js";
import { CRITERIOS, PRECONDICIONES } from "../src/score/criterios.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
let ok = 0, fallos = 0;
const es = (etiqueta, real, esperado) => {
  const bien = JSON.stringify(real) === JSON.stringify(esperado);
  console.log(`  ${bien ? "ok  " : "FALLO"} ${etiqueta}${bien ? "" : `  esperaba ${JSON.stringify(esperado)}, dio ${JSON.stringify(real)}`}`);
  bien ? ok++ : fallos++;
};

const informe = (c) => {
  const score = computeScore({
    formData: c.formData, sectionEnabled: c.sectionEnabled,
    instanceCounts: c.instanceCounts, criterios: CRITERIOS, precondiciones: PRECONDICIONES,
  });
  return { html: buildPrintFragment(c.clientData, c.sectionEnabled, c.formData, c.instanceCounts, c.sectionImages, score), score };
};

// ── Los cinco ejemplos ──────────────────────────────────────────────────────
console.log("\nLos cinco clientes de ejemplo");
const dir = join(RAIZ, "ejemplos");
for (const f of readdirSync(dir).filter(n => n.endsWith(".alanait")).sort()) {
  const c = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const { html, score } = informe(c);
  const nota = String(score.nota);
  // La nota impresa tiene que ser la que calcula el motor, no otra
  const saleLaNota = html.includes(`>${nota}<span`) || html.includes(`>${nota}</div>`) || html.includes(`Nota ${nota} sobre 100`);
  es(`${f.slice(0, 18).padEnd(18)} nota ${nota} impresa`, saleLaNota, true);
}

// ── Jerga del modelo ────────────────────────────────────────────────────────
console.log("\nEl informe no imprime la jerga interna del modelo");
{
  const c = JSON.parse(readFileSync(join(dir, "05-riesgo-critico.alanait"), "utf8"));
  const { html } = informe(c);
  // `porQue` justifica el criterio para quien mantiene el codigo; no es texto
  // de informe y varios llevan referencias a las reglas del modelo dentro.
  for (const jerga of ["regla 1", "Excepcion", "Excepción", "ver notas", "capea", "capGlobal", "capDominio"]) {
    es(`no aparece "${jerga}"`, html.includes(jerga), false);
  }
  const conPorQue = CRITERIOS.filter(x => x.critico && html.includes(x.porQue.slice(0, 40)));
  es("ningun porQue impreso literalmente", conPorQue.length, 0);
}

// ── Titulares ───────────────────────────────────────────────────────────────
console.log("\nHallazgos");
{
  const c = JSON.parse(readFileSync(join(dir, "05-riesgo-critico.alanait"), "utf8"));
  const { html, score } = informe(c);
  es("hay hallazgos que imprimir", score.hallazgos.length > 0, true);
  const sinTitular = score.hallazgos.filter(h => {
    const k = CRITERIOS.find(x => x.id === h.id) || PRECONDICIONES.find(x => x.id === h.id);
    return !k?.titular;
  });
  es("todos los hallazgos tienen titular", sinTitular.map(h => h.id), []);
  es("el titular sale impreso", html.includes("RDP u otros puertos de riesgo publicados a internet"), true);
  es("y su efecto sobre la nota", html.includes("limita"), true);
}

// ── El cliente impecable ────────────────────────────────────────────────────
console.log("\nCliente sin hallazgos (nota 99)");
{
  const c = JSON.parse(readFileSync(join(dir, "01-bien-protegido.alanait"), "utf8"));
  const { html, score } = informe(c);
  es("no genera bloque de hallazgos", html.includes("Hallazgos críticos"), false);
  es("y lo dice en el diagnostico", html.includes("Sin hallazgos críticos"), true);
  es("nota fiable", score.fiable, true);
}

// ── Casos limite ────────────────────────────────────────────────────────────
console.log("\nCasos límite");
{
  const vacio = { clientData: { empresa: "Vacío SL" }, sectionEnabled: {}, formData: {}, instanceCounts: {}, sectionImages: {} };
  const { html, score } = informe(vacio);
  es("cliente vacío no revienta", html.length > 500, true);
  es("y no inventa nota", score.nota, null);
  es("el sello dice que no hay nota", html.includes("Sin nota") || html.includes("Sin datos suficientes"), true);

  const suelto = { clientData: { empresa: "Suelto SL" }, sectionEnabled: { email: "si" }, formData: { email: { 0: { mfa: "Sí" } } }, instanceCounts: {}, sectionImages: {} };
  const r2 = informe(suelto);
  es("una respuesta suelta no se presenta como nota", r2.html.includes("Sin datos suficientes") || r2.html.includes("Sin nota"), true);
  es("y no imprime 100 como veredicto", r2.html.includes(">100<span"), false);

  const sinScore = buildPrintFragment(vacio.clientData, {}, {}, {}, {}, null);
  es("sin score sigue generando informe", sinScore.length > 300, true);
  es("y no pinta diagnostico", sinScore.includes("Diagnóstico"), false);
}

console.log("");
console.log(`${ok} correctas, ${fallos} fallos`);
console.log("");
process.exit(fallos ? 1 : 0);
