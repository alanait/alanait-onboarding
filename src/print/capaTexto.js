// Capa de texto invisible del informe PDF.
//
// El PDF se genera como una imagen JPEG por pagina (exportarPdf.js), asi que no
// tenia ni una letra: no se podia buscar, copiar ni seleccionar nada. Esta capa
// pone ENCIMA de esa imagen el texto real, en modo de pintado 3 ("invisible"),
// en la posicion de cada palabra. Es lo que hacen los PDF escaneados con OCR,
// pero aqui el texto sale exacto del DOM: no hay reconocimiento que se pueda
// equivocar. La imagen no cambia ni un pixel.
//
// Se descartaron (ver DECISIONS.md):
//   - window.print(): pierde la descarga directa y hoy imprime en blanco.
//   - jsPDF .html(): medido, perdia 58 palabras e ignoraba los saltos de pagina.
//   - reescribir el informe con pdfmake o react-pdf: rompe la fuente unica
//     buildPrintFragment y son semanas.
//   - Chromium en servidor: la app no tiene servidor.
//   - tesseract.js: reconoceria por OCR un texto que ya tenemos exacto.
//
// Las funciones puras (todas menos medirPalabras) no tocan el DOM al
// importarse, para que scripts/test-capa-texto.mjs las pruebe con node.

// ── Codificacion ─────────────────────────────────────────────────────────────
// La capa usa Helvetica, que jsPDF escribe en WinAnsiEncoding (cp1252). Un solo
// caracter fuera de cp1252 hace que jsPDF recodifique la cadena ENTERA en UCS-2
// sin BOM, y al extraerla sale "\u0000C\u0000o\u0000n...": un emoji estropeaba
// la linea completa. Por eso se sanea caracter a caracter.
const CP1252_ALTO = new Set([
  0x152, 0x153, 0x160, 0x161, 0x178, 0x17d, 0x17e, 0x192, 0x2c6, 0x2dc,
  0x2013, 0x2014, 0x2018, 0x2019, 0x201a, 0x201c, 0x201d, 0x201e, 0x2020, 0x2021,
  0x2022, 0x2026, 0x2030, 0x2039, 0x203a, 0x20ac, 0x2122,
]);

// Lo que no existe en cp1252 pero tiene un equivalente legible. Lo demas
// (emojis de los titulos de seccion, selector de variacion U+FE0F) se quita: se
// sigue viendo en la imagen, solo deja de ser buscable.
const TRANSLIT = {
  "→": "->", "←": "<-", "≥": ">=", "≤": "<=", "≠": "!=",
  "✓": "OK", "✔": "OK", "✗": "x", "−": "-",
  " ": " ", " ": " ", " ": " ", "‑": "-", "‐": "-",
};

export function aWinAnsi(s) {
  let out = "";
  for (const ch of String(s ?? "")) {
    if (Object.prototype.hasOwnProperty.call(TRANSLIT, ch)) { out += TRANSLIT[ch]; continue; }
    const cp = ch.codePointAt(0);
    if ((cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa1 && cp <= 0xff) || cp === 0x0a || CP1252_ALTO.has(cp)) out += ch;
  }
  return out;
}

// ── Geometria ────────────────────────────────────────────────────────────────
// mmPorCss: milimetros de pagina por px CSS del documento. Se calcula con la
// ESCALA de html2canvas y no con canvas.width / ancho CSS: el canvas redondea
// su ancho (718,11 px CSS -> 1437 o 1438 px) y ese redondeo desplazaria la capa
// medio milimetro al final de cada linea.
export function geometriaCapa({ scale, contentWidthMM, canvasWidth, marginLeft, marginTop }) {
  return { mmPorCss: scale * contentWidthMM / canvasWidth, x0: marginLeft, y0: marginTop };
}

// Reparte las palabras entre las paginas por su LINEA BASE: cada palabra va a la
// pagina donde cae, aunque una linea quede partida entre dos imagenes. La
// ultima pagina se cierra en Infinity para no perder nada por redondeo.
export function repartirPorPagina(palabras, altoPaginaCss, nPaginas) {
  const paginas = Array.from({ length: nPaginas }, () => []);
  for (const p of palabras) {
    if (!(p.base >= 0)) continue;
    const k = Math.min(nPaginas - 1, Math.floor(p.base / altoPaginaCss));
    paginas[k].push(p);
  }
  return paginas;
}

// ── Escritura ────────────────────────────────────────────────────────────────
// Escribe las palabras de UNA pagina. Cada palabra se estira o encoge en
// horizontal hasta ocupar exactamente el ancho que tiene en la imagen, asi la
// seleccion cae encima de la tinta aunque la fuente de la capa (Helvetica) no
// sea la de la pagina (Jost). Devuelve cuantas palabras ha escrito.
export function escribirCapa(pdf, palabras, g, yCssInicio) {
  const ptPorMm = 72 / 25.4;
  let escritas = 0;
  for (const p of palabras) {
    const texto = aWinAnsi(p.t).replace(/\s+/g, " ").trim();
    if (!texto) continue;
    const tamPt = p.px * g.mmPorCss * ptPorMm;
    pdf.setFont("helvetica", p.negrita ? "bold" : "normal");
    pdf.setFontSize(tamPt);
    const anchoMM = p.w * g.mmPorCss;
    // SIN kerning: jsPDF escribe con Tj, que no aplica kerning, asi que medir
    // con el daria un ancho que luego no se pinta.
    const natural = pdf.getStringUnitWidth(texto, { doKerning: false }) * tamPt / pdf.internal.scaleFactor;
    const escala = natural > 0 ? Math.max(0.3, Math.min(3, anchoMM / natural)) : 1;
    const x = g.x0 + p.x * g.mmPorCss;
    const y = g.y0 + (p.base - yCssInicio) * g.mmPorCss;
    // horizontalScale es un FACTOR (1 = 100 %): jsPDF emite escala*100 Tz.
    // El espacio final es el que separa las palabras al copiar o extraer.
    pdf.text(p.espacio ? texto + " " : texto, x, y, { renderingMode: "invisible", horizontalScale: escala, baseline: "alphabetic" });
    escritas++;
  }
  return escritas;
}

// ── Medicion del DOM (solo navegador) ────────────────────────────────────────
function transformar(t, tt) {
  if (tt === "uppercase") return t.toLocaleUpperCase("es");
  if (tt === "lowercase") return t.toLocaleLowerCase("es");
  return t;
}

// html2pdf mete el clon dentro de un overlay con opacity:0. Si se mirase la
// opacidad hasta la raiz del documento, TODO el informe contaria como
// invisible: solo se mira hasta `root`.
function esVisible(el, root) {
  const cs = getComputedStyle(el);
  if (cs.visibility === "hidden" || cs.display === "none") return false;
  for (let a = el; a && a !== root.parentElement; a = a.parentElement) {
    if (parseFloat(getComputedStyle(a).opacity) === 0) return false;
  }
  return true;
}

// Cada palabra visible de `root` con su caja, en px CSS respecto a la esquina
// superior izquierda de `root`. Hay que llamarla sobre el MISMO nodo que
// rasteriza html2canvas (worker.prop.container) entre toContainer() y
// toCanvas(): ese nodo ya lleva los huecos de los saltos de pagina, y
// toCanvas() lo quita del documento al terminar.
export function medirPalabras(root) {
  const origen = root.getBoundingClientRect();
  const lienzo = document.createElement("canvas").getContext("2d");
  const metricas = new Map();
  const medidas = (cs) => {
    const clave = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    if (!metricas.has(clave)) {
      lienzo.font = clave;
      const m = lienzo.measureText("Hg");
      metricas.set(clave, { asc: m.fontBoundingBoxAscent, desc: m.fontBoundingBoxDescent });
    }
    return metricas.get(clave);
  };

  const recorrido = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const padre = n.parentElement;
      if (!padre || padre.closest("style,script,noscript,template")) return NodeFilter.FILTER_REJECT;
      return /\S/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodos = [];
  for (let n = recorrido.nextNode(); n; n = recorrido.nextNode()) nodos.push(n);

  const rango = document.createRange();
  const palabras = [];
  nodos.forEach((nodo, i) => {
    const el = nodo.parentElement;
    if (!esVisible(el, root)) return;
    const cs = getComputedStyle(el);
    const met = medidas(cs);
    const px = parseFloat(cs.fontSize);
    const negrita = (parseInt(cs.fontWeight, 10) || 400) >= 600;
    const txt = nodo.nodeValue;
    const re = /\S+/g;
    for (let m = re.exec(txt); m; m = re.exec(txt)) {
      rango.setStart(nodo, m.index);
      rango.setEnd(nodo, m.index + m[0].length);
      const rects = rango.getClientRects();
      if (!rects.length) continue;
      // Una palabra partida en varias lineas (una URL con overflow-wrap) se
      // trocea por caracteres para dejar cada trozo en su linea.
      const piezas = [];
      if (rects.length === 1) {
        piezas.push({ t: m[0], l: rects[0].left, r: rects[0].right, top: rects[0].top, h: rects[0].height });
      } else {
        let actual = null;
        for (let k = 0; k < m[0].length; k++) {
          rango.setStart(nodo, m.index + k);
          rango.setEnd(nodo, m.index + k + 1);
          const rc = rango.getBoundingClientRect();
          if (!rc.width && !rc.height) continue;
          if (actual && Math.abs(rc.top - actual.top) > 1) { piezas.push(actual); actual = null; }
          if (!actual) actual = { t: "", l: rc.left, r: rc.right, top: rc.top, h: rc.height };
          actual.t += m[0][k];
          actual.r = rc.right;
        }
        if (actual) piezas.push(actual);
      }
      const fin = m.index + m[0].length;
      const blancoDom = fin < txt.length ? /\s/.test(txt[fin]) : !!(nodos[i + 1] && /^\s/.test(nodos[i + 1].nodeValue));
      piezas.forEach((pz, q) => {
        const top = pz.top - origen.top;
        palabras.push({
          t: transformar(pz.t, cs.textTransform),
          x: pz.l - origen.left,
          w: pz.r - pz.l,
          base: top + (pz.h - (met.asc + met.desc)) / 2 + met.asc,
          px, negrita,
          cortada: q < piezas.length - 1,
          blancoDom,
        });
      });
    }
  });

  // Espacio detras de cada palabra: el del DOM, o uno visual (cambio de linea,
  // o hueco de mas de 0,15 em, como entre dos celdas de una tabla). Sin el, los
  // extractores pegan las palabras ("2.7.0.Lo que...").
  palabras.forEach((a, j) => {
    const b = palabras[j + 1];
    a.espacio = !a.cortada && (a.blancoDom || !b || Math.abs(b.base - a.base) > 1 || b.x - (a.x + a.w) > 0.15 * a.px);
  });
  return palabras;
}
