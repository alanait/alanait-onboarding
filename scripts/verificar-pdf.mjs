#!/usr/bin/env node
// Comprueba que un PDF del informe lleva texto buscable, sin dependencias.
//
//   node scripts/verificar-pdf.mjs Empresa_2026-10-01.pdf "Diagnóstico" "¿" "Empresa"
//
// Dice cuantas paginas, imagenes y bloques de texto tiene, cuantos son de texto
// invisible (la capa de capaTexto.js), si alguno se recodifico en UCS-2 (texto
// que saldria como basura al extraerlo) y si aparece cada busqueda. Sale con
// codigo 1 si falla alguna busqueda o si el PDF no tiene texto.
//
// NO esta en la cadena del build: el PDF se genera en el navegador. Sirve para
// comprobar un PDF real a mano, en el equipo de quien lo genero: no hace falta
// mandarlo a nadie, y lleva credenciales del cliente.
//
// No es un lector de PDF general: entiende lo que escribe jsPDF (flujos
// FlateDecode o sin comprimir, fuentes estandar en WinAnsi, operador Tj).
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

// cp1252 0x80-0x9F -> Unicode (de 0xA0 a 0xFF coincide con Latin-1)
const CP1252 = { 0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
  0x88: 0x2c6, 0x89: 0x2030, 0x8a: 0x160, 0x8b: 0x2039, 0x8c: 0x152, 0x8e: 0x17d, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x2dc, 0x99: 0x2122, 0x9a: 0x161,
  0x9b: 0x203a, 0x9c: 0x153, 0x9e: 0x17e, 0x9f: 0x178 };
const decodificar = (b) => String.fromCodePoint(CP1252[b] ?? b);

function flujos(buf) {
  const s = buf.toString('latin1');
  const out = [];
  const re = /<<((?:(?!>>\s*stream)[\s\S])*?)>>\s*stream\r?\n/g;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    const ini = m.index + m[0].length;
    const fin = s.indexOf('endstream', ini);
    let datos = buf.subarray(ini, fin);
    const dicc = m[1];
    if (/\/Subtype\s*\/Image/.test(dicc)) { out.push({ imagen: true }); continue; }
    if (/FlateDecode/.test(dicc)) {
      try { datos = inflateSync(datos); } catch { try { datos = inflateSync(datos.subarray(0, datos.length - 1)); } catch { continue; } }
    }
    out.push({ imagen: false, txt: datos.toString('latin1') });
  }
  return out;
}

// Cadena literal PDF "(...)" desde la posicion i, que apunta a "(".
function literal(t, i) {
  let prof = 0;
  const bytes = [];
  for (i++; i < t.length; i++) {
    const c = t[i];
    if (c === '\\') {
      const n = t[++i];
      const esc = { n: 10, r: 13, t: 9, b: 8, f: 12, '(': 40, ')': 41, '\\': 92 };
      if (n in esc) bytes.push(esc[n]);
      else if (/[0-7]/.test(n)) { let o = n; while (o.length < 3 && /[0-7]/.test(t[i + 1])) o += t[++i]; bytes.push(parseInt(o, 8) & 255); }
      else if (n === '\r' || n === '\n') { /* continuacion de linea */ }
      else bytes.push(n.charCodeAt(0));
    } else if (c === '(') { prof++; bytes.push(40); }
    else if (c === ')') { if (prof === 0) return { bytes, fin: i }; prof--; bytes.push(41); }
    else bytes.push(c.charCodeAt(0));
  }
  return { bytes, fin: i };
}

export function extraerTexto(buf) {
  let bloques = 0, invisibles = 0, ucs2 = 0, imagenes = 0;
  const paginas = [];
  for (const f of flujos(buf)) {
    if (f.imagen) { imagenes++; continue; }
    const t = f.txt;
    if (!/\bBT\b/.test(t) && !/\bDo\b/.test(t)) continue;   // no es contenido de pagina
    bloques += (t.match(/\bBT\b/g) || []).length;
    invisibles += (t.match(/\b3 Tr\b/g) || []).length;
    let texto = '';
    for (let i = 0; i < t.length; i++) {
      if (t[i] !== '(') continue;
      const { bytes, fin } = literal(t, i);
      i = fin;
      // jsPDF recodifica en UCS-2 SIN marca FEFF cuando una cadena lleva algo
      // fuera de cp1252: se delata por los bytes nulos. Al extraerla sale
      // "\u0000C\u0000o...", que no encuentra ninguna busqueda.
      if (bytes.includes(0)) ucs2++;
      texto += bytes.map(decodificar).join('');
    }
    paginas.push(texto);
  }
  return { paginas: paginas.length, imagenes, bloques, invisibles, ucs2, texto: paginas.join('\n') };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [ruta, ...busquedas] = process.argv.slice(2);
  if (!ruta) {
    console.error('Uso: node scripts/verificar-pdf.mjs fichero.pdf ["busqueda" ...]');
    process.exit(2);
  }
  const r = extraerTexto(readFileSync(ruta));
  const normalizar = (x) => x.toLocaleLowerCase('es').replace(/\s+/g, ' ');
  const plano = normalizar(r.texto);
  const caracteres = r.texto.replace(/\s/g, '').length;
  console.log(`${ruta.split(/[\\/]/).pop()}: ${r.paginas} paginas, ${r.imagenes} imagenes, ${r.bloques} bloques de texto (${r.invisibles} invisibles), ${caracteres} caracteres, ${r.ucs2} cadenas en UCS-2`);
  let fallos = caracteres === 0 ? 1 : 0;
  if (caracteres === 0) console.log('  FALLA el PDF no lleva texto: solo imagen');
  if (r.ucs2) { fallos++; console.log(`  FALLA ${r.ucs2} cadenas recodificadas en UCS-2 saldran como basura`); }
  for (const b of busquedas) {
    const ok = plano.includes(normalizar(b));
    if (!ok) fallos++;
    console.log(`  ${ok ? 'OK   ' : 'FALLA'} ${b}`);
  }
  process.exit(fallos ? 1 : 0);
}
