// Pone la nota del CiberScore en el nombre de empresa de cada cliente de
// ejemplo, para distinguirlos de un vistazo en el panel.
//
// La etiqueta se calcula, no se escribe a mano: si se tocan los criterios y la
// nota cambia, se vuelve a ejecutar esto y los nombres siguen siendo ciertos.
//
//   node scripts/etiquetar-ejemplos.mjs

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeScore } from "../src/score/computeScore.js";
import { CRITERIOS, PRECONDICIONES } from "../src/score/criterios.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGEN = join(RAIZ, "ejemplos");
const PUBLICO = join(RAIZ, "public", "ejemplos");

/** Quita una etiqueta anterior para no encadenarlas al reejecutar. */
const nombreLimpio = (s) => s.split(" - Ex. Ciberscore")[0].trim();

mkdirSync(PUBLICO, { recursive: true });
const indice = [];

for (const archivo of readdirSync(ORIGEN).filter(n => n.endsWith(".alanait")).sort()) {
  const ruta = join(ORIGEN, archivo);
  const c = JSON.parse(readFileSync(ruta, "utf8"));

  const r = computeScore({
    formData: c.formData, sectionEnabled: c.sectionEnabled,
    instanceCounts: c.instanceCounts, criterios: CRITERIOS, precondiciones: PRECONDICIONES,
  });

  const base = nombreLimpio(c.clientData.empresa);
  c.clientData.empresa = `${base} - Ex. Ciberscore ${r.nota}/100`;

  const json = JSON.stringify(c, null, 1);
  writeFileSync(ruta, json, "utf8");
  writeFileSync(join(PUBLICO, archivo), json, "utf8");

  indice.push({ archivo, empresa: c.clientData.empresa, sector: c.clientData.sector });
  console.log(`  ${String(r.nota).padStart(3)}  ${r.tramo.etiqueta.padEnd(15)} ${base}`);
}

writeFileSync(join(PUBLICO, "index.json"), JSON.stringify(indice, null, 1), "utf8");
console.log(`\n${indice.length} ejemplos etiquetados y publicados.`);
