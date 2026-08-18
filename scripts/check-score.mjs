#!/usr/bin/env node
// Verifica los criterios del CiberScore contra el esquema del formulario.
//
// El motor casa por cadena literal. Si alguien reescribe una opcion en
// sections.js y no la reescribe aqui, ese criterio deja de puntuar para
// siempre y nadie se entera: la nota simplemente sale distinta. Esto lo caza.

import { SECTIONS } from '../src/sections.js';
import { CRITERIOS, PRECONDICIONES } from '../src/score/criterios.js';
import { DOMINIOS } from '../src/score/dominios.js';

const campoDe = (sid, fid) => SECTIONS.find(s => s.id === sid)?.fields.find(f => f.id === fid);
let fallos = 0;
const mal = (m) => { console.error('  ' + m); fallos++; };

const vistos = new Set();
for (const c of CRITERIOS) {
  if (vistos.has(c.id)) mal(`id duplicado: ${c.id}`);
  vistos.add(c.id);

  if (!DOMINIOS[c.dominio]) mal(`${c.id}: dominio desconocido "${c.dominio}"`);

  const f = campoDe(c.seccion, c.campo);
  if (!f) { mal(`${c.id}: ${c.seccion}.${c.campo} no existe en el esquema`); continue; }
  if (f.type === 'checks') mal(`${c.id}: ${c.seccion}.${c.campo} es checks y no se puede mapear literal a literal`);

  // Literales del mapa que ya no existen entre las opciones del campo
  if (f.options) {
    for (const k of Object.keys(c.mapa)) {
      if (!f.options.includes(k)) mal(`${c.id}: "${k}" ya no es una opcion de ${c.seccion}.${c.campo}`);
    }
    for (const k of (c.critico?.cuando ?? [])) {
      if (!f.options.includes(k)) mal(`${c.id}: el cap se dispara con "${k}", que no es una opcion del campo`);
    }
  }

  // La dependencia declarada debe coincidir con la del esquema, salvo que sea
  // una dependencia logica deliberada sobre un campo que existe.
  if (f.dep && JSON.stringify(c.dep) !== JSON.stringify(f.dep)) {
    const suya = c.dep && campoDe(c.seccion, c.dep.field);
    if (!suya) mal(`${c.id}: el esquema condiciona ${c.campo} a ${f.dep.field}="${f.dep.value}" y el criterio no lo declara`);
  }
  if (c.dep) {
    const destino = campoDe(c.seccion, c.dep.field);
    if (!destino) mal(`${c.id}: dep apunta a ${c.dep.field}, que no existe`);
    else if (destino.options && !destino.options.includes(c.dep.value)) {
      mal(`${c.id}: dep espera "${c.dep.value}", que no es opcion de ${c.dep.field}`);
    }
  }

  if (![1, 2, 3].includes(c.peso)) mal(`${c.id}: peso ${c.peso} fuera de 1-3`);
  if (!['min', 'max'].includes(c.agregacion)) mal(`${c.id}: agregacion "${c.agregacion}" no valida`);
}

// Un mismo campo no puede puntuar dos veces
const porCampo = new Map();
for (const c of CRITERIOS) {
  const k = c.seccion + '.' + c.campo;
  if (porCampo.has(k)) mal(`${c.id} y ${porCampo.get(k)} puntuan ambos ${k}`);
  porCampo.set(k, c.id);
}

for (const p of PRECONDICIONES) {
  if (!SECTIONS.some(s => s.id === p.seccion)) mal(`precondicion ${p.id}: la seccion ${p.seccion} no existe`);
  if (!DOMINIOS[p.dominio]) mal(`precondicion ${p.id}: dominio desconocido`);
}

// Todo dominio con peso declarado debe tener con que puntuar
for (const [id, d] of Object.entries(DOMINIOS)) {
  const n = CRITERIOS.filter(c => c.dominio === id).length;
  if (n === 0) mal(`el dominio "${id}" pesa ${d.peso}% y no tiene ningun criterio`);
}

if (fallos) {
  console.error(`\nMODELO DE PUNTUACION ROTO: ${fallos} problema(s).`);
  console.error('Un criterio que no case con el esquema deja de puntuar en silencio.\n');
  process.exit(1);
}

const pesos = {};
for (const c of CRITERIOS) pesos[c.dominio] = (pesos[c.dominio] ?? 0) + c.peso;
console.log(`Modelo OK: ${CRITERIOS.length} criterios, ${PRECONDICIONES.length} precondiciones, ${Object.keys(DOMINIOS).length} dominios.`);
console.log('  ' + Object.entries(pesos).map(([d, w]) => `${d} ${w}`).join(' · '));
