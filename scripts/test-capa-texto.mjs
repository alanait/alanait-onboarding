// Pruebas de la capa de texto invisible del PDF. Sin dependencias:
//   node scripts/test-capa-texto.mjs
//
// Prueban la parte pura de src/print/capaTexto.js (codificacion, reparto por
// pagina, geometria y lo que se le pide a jsPDF). Medir el DOM necesita un
// navegador: que todo funciona junto se comprueba generando un PDF y pasandole
// scripts/verificar-pdf.mjs.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { aWinAnsi, geometriaCapa, repartirPorPagina, escribirCapa } from "../src/print/capaTexto.js";
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

// Lo que Helvetica de jsPDF codifica en una cadena sin recodificarla a UCS-2.
const CP1252_ALTO = new Set([0x152, 0x153, 0x160, 0x161, 0x178, 0x17d, 0x17e, 0x192, 0x2c6, 0x2dc,
  0x2013, 0x2014, 0x2018, 0x2019, 0x201a, 0x201c, 0x201d, 0x201e, 0x2020, 0x2021, 0x2022,
  0x2026, 0x2030, 0x2039, 0x203a, 0x20ac, 0x2122]);
const esCp1252 = (ch) => {
  const cp = ch.codePointAt(0);
  return (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa1 && cp <= 0xff) || cp === 0x0a || CP1252_ALTO.has(cp);
};

console.log("\nCodificación: lo que se escribe tiene que salir igual al extraerlo");
{
  const espanol = "á é í ó ú ü ñ Ñ ¿ ¡ « » — · € … ç l·l à è ò ï Á É Í Ó Ú";
  es("conserva acentos, eñe, signos de apertura, comillas, euro y l·l", aWinAnsi(espanol), espanol);
  es("quita los emojis de los títulos de sección", aWinAnsi("🌐 Internet y Red"), " Internet y Red");
  es("quita el selector de variación U+FE0F", aWinAnsi("🖥️ Servidores"), " Servidores");
  es("translitera flechas y comparaciones en vez de perderlas", aWinAnsi("a → b ≥ c ✓"), "a -> b >= c OK");
  es("el espacio duro pasa a espacio normal", aWinAnsi("50 €"), "50 €");
  es("una entrada vacía o nula no revienta", [aWinAnsi(""), aWinAnsi(null), aWinAnsi(undefined)], ["", "", ""]);

  // La prueba que habria cazado el fallo: un solo caracter fuera de cp1252
  // hace que jsPDF recodifique la cadena ENTERA en UCS-2 y salga basura.
  let fuera = 0;
  for (let cp = 0; cp <= 0x2ffff; cp++) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    for (const ch of aWinAnsi(String.fromCodePoint(cp))) if (!esCp1252(ch)) fuera++;
  }
  es("ningún punto de código de 0 a 0x2FFFF deja un carácter fuera de cp1252", fuera, 0);
}

console.log("\nReparto por página");
{
  const alto = 1000;
  const p = (base) => ({ t: String(base), base });
  const reparto = repartirPorPagina([p(0), p(999.9), p(1000), p(2500), p(2999), p(5000)], alto, 3);
  es("la línea base en el borde superior va a esa página", reparto[0].map(x => x.base), [0, 999.9]);
  es("la línea base exactamente en el corte va a la siguiente", reparto[1].map(x => x.base), [1000]);
  es("lo que pasa del final cae en la última, no se pierde", reparto[2].map(x => x.base), [2500, 2999, 5000]);
  es("una base negativa o no numérica se descarta", repartirPorPagina([p(-1), { t: "x" }], alto, 1)[0].length, 0);
}

console.log("\nGeometría");
{
  // A4 con margenes de 10 mm: 190 mm utiles; html2canvas a escala 2.
  const g = geometriaCapa({ scale: 2, contentWidthMM: 190, canvasWidth: 1438, marginLeft: 10, marginTop: 10 });
  es("mm por px CSS se calcula con la escala, no con el ancho CSS", Math.round(g.mmPorCss * 1e5) / 1e5, 0.26426);
  es("los márgenes pasan tal cual", [g.x0, g.y0], [10, 10]);
}

console.log("\nLo que se le pide a jsPDF");
{
  const llamadas = [];
  const pdfFalso = {
    internal: { scaleFactor: 72 / 25.4 },
    setFont: (f, e) => llamadas.push(["fuente", f, e]),
    setFontSize: (t) => llamadas.push(["tam", t]),
    getStringUnitWidth: (t, o) => { llamadas.push(["medir", t, o]); return t.length * 0.5; },
    text: (t, x, y, o) => llamadas.push(["texto", t, x, y, o]),
  };
  const g = geometriaCapa({ scale: 2, contentWidthMM: 190, canvasWidth: 1438, marginLeft: 10, marginTop: 10 });
  const palabras = [
    { t: "Diagnóstico", x: 0, w: 80, base: 1050, px: 16, negrita: true, espacio: true },
    { t: "🔒", x: 90, w: 10, base: 1050, px: 16, negrita: false, espacio: true },
    { t: "ancho", x: 100, w: 5000, base: 1050, px: 12, negrita: false, espacio: false },
    { t: "estrecho", x: 0, w: 1, base: 1060, px: 12, negrita: false, espacio: true },
  ];
  const escritas = escribirCapa(pdfFalso, palabras, g, 1000);
  const textos = llamadas.filter(l => l[0] === "texto");
  es("una palabra que solo era un emoji no se escribe vacía", escritas, 3);
  es("todo va en modo invisible", textos.every(l => l[4].renderingMode === "invisible"), true);
  es("se mide sin kerning, que es como lo pinta Tj", llamadas.filter(l => l[0] === "medir").every(l => l[2]?.doKerning === false), true);
  es("la escala horizontal queda acotada entre 0,3 y 3", textos.map(l => l[4].horizontalScale).every(h => h >= 0.3 && h <= 3), true);
  es("los extremos se acotan", [textos[1][4].horizontalScale, textos[2][4].horizontalScale], [3, 0.3]);
  es("el espacio que separa palabras va dentro del texto", [textos[0][1], textos[1][1]], ["Diagnóstico ", "ancho"]);
  es("la negrita se respeta", llamadas.find(l => l[0] === "fuente")[2], "bold");
  // y = margen + (base - inicio de pagina) * mm por px
  es("la posición vertical es relativa al inicio de su página", Math.round(textos[0][3] * 100) / 100, Math.round((10 + 50 * g.mmPorCss) * 100) / 100);
  es("no queda ninguna cadena fuera de cp1252", textos.every(l => [...l[1]].every(esCp1252)), true);
}

// Con el informe REAL de las 5 fichas: lo que la capa deja fuera tiene que ser
// solo decoracion (emojis, simbolos graficos), nunca una letra. Si un dia se
// cuela un caracter que se pierde (una o con doble acento, un simbolo nuevo en
// un aviso), esto lo dice antes de que alguien no lo encuentre buscando.
console.log("\nEl informe real de las 5 fichas pierde solo decoración");
{
  const dir = join(RAIZ, "ejemplos");
  const perdidos = new Set();
  for (const f of readdirSync(dir).filter(n => n.endsWith(".alanait")).sort()) {
    const c = JSON.parse(readFileSync(join(dir, f), "utf8"));
    const score = computeScore({ formData: c.formData, sectionEnabled: c.sectionEnabled, instanceCounts: c.instanceCounts, criterios: CRITERIOS, precondiciones: PRECONDICIONES });
    const html = buildPrintFragment(c.clientData, c.sectionEnabled, c.formData, c.instanceCounts, {}, score);
    const texto = html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    for (const ch of texto) if (aWinAnsi(ch) !== ch && ch !== " ") perdidos.add(ch);
  }
  const decoracion = (ch) => {
    const cp = ch.codePointAt(0);
    return cp >= 0x1f000 || cp === 0xfe0f || cp === 0x200d || (cp >= 0x2190 && cp <= 0x2bff);
  };
  es("todo lo que se pierde es emoji o símbolo gráfico", [...perdidos].filter(ch => !decoracion(ch)), []);
}

console.log(`\n${ok} correctas, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);
