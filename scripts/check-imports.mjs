#!/usr/bin/env node
// Comprueba que todo simbolo del proyecto usado en un archivo esta importado ahi.
//
// Vite no falla por esto: un identificador suelto podria ser un global del
// navegador, asi que el build pasa en verde y la aplicacion revienta al pintar.
// Ya ha ocurrido dos veces (la constante FUENTE y luego lectorEfectivo), y las
// dos se detectaron solo al abrir la consola del navegador. Esto lo caza antes.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(RAIZ, 'src');

const archivos = (dir) => readdirSync(dir).flatMap(n => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? archivos(p) : (/\.jsx?$/.test(p) ? [p] : []);
});

const rutas = archivos(SRC);
// Limite de palabra. Se construye por codigo porque escribirlo como literal
// dentro de una cadena se pierde al generar este archivo desde un script.
const LIMITE = String.fromCharCode(92) + 'b';
const DECL = /^(?:export\s+)?(?:async\s+)?(?:const|function|let|class)\s+([A-Za-z_$][\w$]*)/gm;

// Simbolos que exporta el propio proyecto: son los unicos que vigilamos.
const exportados = new Map();
for (const p of rutas) {
  for (const m of readFileSync(p, 'utf8').matchAll(/^export\s+(?:async\s+)?(?:const|function|let|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    exportados.set(m[1], relative(RAIZ, p));
  }
}


const ESPALABRA = (c) => c !== '' && /[A-Za-z0-9_$]/.test(c);

/** True si `nombre` aparece como identificador suelto, no como .propiedad. */
function usaComoIdentificador(codigo, nombre) {
  let i = codigo.indexOf(nombre);
  while (i !== -1) {
    const antes = i > 0 ? codigo[i - 1] : '';
    const despues = codigo[i + nombre.length] ?? '';
    if (!ESPALABRA(antes) && antes !== '.' && !ESPALABRA(despues)) return true;
    i = codigo.indexOf(nombre, i + 1);
  }
  return false;
}

let fallos = 0;
for (const p of rutas) {
  const src = readFileSync(p, 'utf8');
  const rel = relative(RAIZ, p);

  const importados = new Set();
  for (const m of src.matchAll(/import\s+(?:([\w$]+)\s*,\s*)?\{([^}]*)\}\s+from/g)) {
    if (m[1]) importados.add(m[1]);
    for (const parte of m[2].split(',')) {
      const nombre = parte.trim().split(/\s+as\s+/).pop().trim();
      if (nombre) importados.add(nombre);
    }
  }
  for (const m of src.matchAll(/import\s+([\w$]+)\s+from/g)) importados.add(m[1]);

  const propios = new Set();
  for (const m of src.matchAll(DECL)) propios.add(m[1]);

  // Solo codigo: sin imports, sin comentarios y sin cadenas, para que un nombre
  // mencionado dentro de un texto no cuente como uso.
  const codigo = src
    .split('\n').filter(l => !l.trimStart().startsWith('import ')).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/'[^'\n]*'/g, "''")
    .replace(/"[^"\n]*"/g, '""')
    .replace(/`[^`]*`/g, '``');

  for (const [nombre, origen] of exportados) {
    if (nombre.length < 3) continue;   // 'C' aparece en cualquier sitio: no es verificable asi
    if (importados.has(nombre) || propios.has(nombre)) continue;
    if (usaComoIdentificador(codigo, nombre)) {
      console.error(`  ${rel}: usa "${nombre}" sin importarlo (se exporta en ${origen})`);
      fallos++;
    }
  }
}

if (fallos) {
  console.error(`\nCONTRATO DE IMPORTS ROTO: ${fallos} referencia(s) sin resolver.`);
  console.error('La aplicacion compilaria igual y fallaria al pintar.\n');
  process.exit(1);
}
console.log(`Imports OK: ${exportados.size} simbolos del proyecto, todas las referencias resueltas.`);
