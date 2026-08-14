#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Contrato de ids del esquema de onboarding.
//
// Los ids de seccion y de campo de src/sections.js son claves de datos guardados
// en Supabase: form_data.red["0"].isp. Renombrar o borrar uno equivale a perder
// ese dato en todos los clientes ya documentados, de forma silenciosa.
//
// Este script compara el esquema actual contra la instantanea de
// scripts/ids-snapshot.json y falla si algo existente desaparecio o cambio de
// tipo. Anadir campos nuevos siempre esta permitido.
//
// Se ejecuta en cada build (npm run build), asi que un despliegue que rompa el
// contrato falla en Vercel y no llega a produccion.
//
//   node scripts/check-ids.mjs            comprobar
//   node scripts/check-ids.mjs --update   aceptar el esquema actual como bueno
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { SECTIONS } from '../src/sections.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = join(AQUI, 'ids-snapshot.json');

/** Aplana el esquema a { "seccion.campo": "tipo" } */
function esquemaActual() {
  const plano = {};
  for (const seccion of SECTIONS) {
    for (const campo of seccion.fields) {
      plano[`${seccion.id}.${campo.id}`] = campo.type;
    }
  }
  return plano;
}

const actual = esquemaActual();

if (process.argv.includes('--update')) {
  writeFileSync(SNAPSHOT, JSON.stringify(actual, null, 2) + '\n', 'utf8');
  console.log(`Instantanea actualizada: ${Object.keys(actual).length} campos en ${SECTIONS.length} secciones.`);
  process.exit(0);
}

let guardado;
try {
  guardado = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
} catch {
  console.error(
    'No hay instantanea de ids todavia.\n' +
    'Generala una vez con:  node scripts/check-ids.mjs --update'
  );
  process.exit(1);
}

const desaparecidos = [];
const cambiados = [];

for (const [clave, tipo] of Object.entries(guardado)) {
  if (!(clave in actual)) {
    desaparecidos.push(clave);
  } else if (actual[clave] !== tipo) {
    cambiados.push(`${clave}: ${tipo} -> ${actual[clave]}`);
  }
}

const nuevos = Object.keys(actual).filter(k => !(k in guardado));

if (desaparecidos.length === 0 && cambiados.length === 0) {
  const extra = nuevos.length ? ` (+${nuevos.length} campo${nuevos.length > 1 ? 's' : ''} nuevo${nuevos.length > 1 ? 's' : ''})` : '';
  console.log(`Contrato de ids OK: ${Object.keys(guardado).length} campos preservados${extra}.`);
  process.exit(0);
}

console.error('\nCONTRATO DE IDS ROTO — esto borraria datos de clientes ya guardados.\n');

if (desaparecidos.length) {
  console.error(`  Campos que han desaparecido (${desaparecidos.length}):`);
  for (const c of desaparecidos) console.error(`    - ${c}`);
  console.error('');
}

if (cambiados.length) {
  console.error(`  Campos que han cambiado de tipo (${cambiados.length}):`);
  for (const c of cambiados) console.error(`    - ${c}`);
  console.error('');
}

console.error(
  '  Si el cambio es intencionado y ya has migrado los datos afectados,\n' +
  '  acepta el esquema nuevo con:  node scripts/check-ids.mjs --update\n'
);
process.exit(1);
