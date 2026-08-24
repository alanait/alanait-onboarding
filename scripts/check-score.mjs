#!/usr/bin/env node
// Verifica los criterios del CiberScore contra el esquema del formulario.
//
// El motor casa por cadena literal. Si alguien reescribe una opcion en
// sections.js y no la reescribe aqui, ese criterio deja de puntuar para
// siempre y nadie se entera: la nota simplemente sale distinta. Esto lo caza.

import { SECTIONS } from '../src/sections.js';
import { CRITERIOS, PRECONDICIONES, LITERALES_NO_APLICA, LITERALES_SIN_COMPROBAR, CONTRADICCIONES, MOTIVOS_INEXISTENCIA, MOTIVO_OTRO } from '../src/score/criterios.js';
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

    // Toda opcion de un campo puntuado tiene que estar clasificada: en el mapa,
    // o en una de las dos listas de literales. Una opcion suelta caeria en "sin
    // comprobar" y restaria nota a un tecnico que contesto bien, en silencio.
    for (const k of f.options) {
      if (k in c.mapa) continue;
      if (LITERALES_NO_APLICA.includes(k) || LITERALES_SIN_COMPROBAR.includes(k)) continue;
      mal(`${c.id}: la opcion "${k}" de ${c.seccion}.${c.campo} no esta clasificada (ni en el mapa, ni como no-aplica, ni como sin-comprobar)`);
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

  // Escala 1-5 desde el modelo 2.4.0. Con 1-3, "esto decide la seguridad del
  // puesto" y "esto importa bastante" tenian que ser los dos un 3, y no hay
  // forma de decir que el tipo de solucion antivirus manda mas que el numero
  // de serie de la licencia. Cinco niveles dan ese margen sin inventar nada:
  // el reparto sigue siendo suma cero dentro del dominio, asi que un cliente
  // perfecto sigue dando exactamente 100.
  if (![1, 2, 3, 4, 5].includes(c.peso)) mal(`${c.id}: peso ${c.peso} fuera de 1-5`);
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

// `depSeccion` tiene que apuntar a una seccion real: si no, el criterio no
// aplicaria NUNCA y desapareceria del modelo sin que nadie se entere.
for (const c of CRITERIOS.filter(x => x.depSeccion)) {
  if (!SECTIONS.some(s => s.id === c.depSeccion.seccion)) {
    mal(`${c.id}: depSeccion apunta a "${c.depSeccion.seccion}", que no existe`);
  }
}

// Las contradicciones son el unico sitio del modelo donde un literal se compara
// contra OTRA seccion. Un literal que no case no da error: simplemente deja de
// comprobar, en silencio, que es el motivo entero por el que existe este
// fichero. Se comprueba tambien que la seccion declarable tenga sus campos del
// "no": sin ellos el motivo no se podria contestar y el sello nunca llegaria.
for (const k of CONTRADICCIONES) {
  const sec = SECTIONS.find(s => s.id === k.seccion);
  if (!sec) { mal(`contradiccion ${k.id}: la seccion ${k.seccion} no existe`); continue; }
  if ((k.cuando ?? "no") === "no" && !sec.fields.some(f => f.id === "sin_servicio_motivo")) {
    mal(`contradiccion ${k.id}: la seccion ${k.seccion} no tiene campo de motivo`);
  }
  const senal = SECTIONS.find(s => s.id === k.senal.seccion);
  if (!senal) { mal(`contradiccion ${k.id}: la seccion de senal ${k.senal.seccion} no existe`); continue; }
  const campo = senal.fields.find(f => f.id === k.senal.campo);
  if (!campo) { mal(`contradiccion ${k.id}: ${k.senal.seccion}.${k.senal.campo} no existe`); continue; }
  for (const v of k.senal.valores) {
    if (!(campo.options ?? []).includes(v)) {
      mal(`contradiccion ${k.id}: "${v}" no es una opcion de ${k.senal.seccion}.${k.senal.campo}`);
    }
  }
  if (k.senal.dep && !senal.fields.some(f => f.id === k.senal.dep.field)) {
    mal(`contradiccion ${k.id}: el dep apunta a ${k.senal.dep.field}, que no existe en ${k.senal.seccion}`);
  }
}

// Cada seccion declarable tiene que ofrecer motivos, y el literal "Otro" tiene
// que estar entre ellos o el campo de detalle no se pintaria nunca.
for (const [sec, motivos] of Object.entries(MOTIVOS_INEXISTENCIA)) {
  const s = SECTIONS.find(x => x.id === sec);
  if (!s) { mal(`MOTIVOS_INEXISTENCIA: la seccion ${sec} no existe`); continue; }
  const campo = s.fields.find(f => f.id === "sin_servicio_motivo");
  if (!campo) { mal(`MOTIVOS_INEXISTENCIA: ${sec} no tiene campo sin_servicio_motivo`); continue; }
  if (!motivos.includes(MOTIVO_OTRO)) mal(`MOTIVOS_INEXISTENCIA: ${sec} no ofrece "${MOTIVO_OTRO}"`);
  if (JSON.stringify(campo.options) !== JSON.stringify(motivos)) {
    mal(`MOTIVOS_INEXISTENCIA: las opciones de ${sec}.sin_servicio_motivo no coinciden con la lista`);
  }
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
