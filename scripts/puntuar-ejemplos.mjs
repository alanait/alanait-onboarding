// Puntua los clientes de ejemplo de ejemplos/ y muestra su desglose.
//   node scripts/puntuar-ejemplos.mjs

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { computeScore } from "../src/score/computeScore.js";
import { CRITERIOS, PRECONDICIONES } from "../src/score/criterios.js";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "ejemplos");

for (const f of readdirSync(DIR).filter(n => n.endsWith(".alanait")).sort()) {
  const c = JSON.parse(readFileSync(join(DIR, f), "utf8"));
  const r = computeScore({
    formData: c.formData, sectionEnabled: c.sectionEnabled,
    instanceCounts: c.instanceCounts, criterios: CRITERIOS, precondiciones: PRECONDICIONES,
  });
  console.log("");
  console.log(`${f}  ·  ${c.clientData.empresa}`);
  console.log(`  nota ${r.nota}  ${r.tramo.etiqueta}${r.capadaGlobal ? "  [capada]" : ""}${r.fiable ? "" : "  [no fiable]"}   evidencia ${r.evidencia}%`);
  const linea = r.dominios.filter(d => d.evaluable)
    .map(d => `${d.id} ${d.nota}${d.capado ? "*" : ""}`).join("  ");
  console.log("  " + linea);
  if (r.hallazgos.length) console.log(`  hallazgos criticos: ${r.hallazgos.length}`);
}
console.log("");
