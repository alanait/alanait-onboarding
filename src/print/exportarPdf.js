// Exportacion del informe a PDF.
//
// html2pdf.js ofrece un camino corto (`.save()`) que hace todo de un tiron,
// pero para un documento largo como este produce paginas cortadas a mitad de
// seccion. La causa, comprobada en el codigo de html2pdf.js 0.14.0: `toPdf()`
// trocea el canvas con su PROPIO alto de pagina, `floor(canvas.width * ratio)`,
// mientras que los marcadores que evitan cortes ("pdf-avoid",
// "pdf-break-before") los inserta toContainer() con OTRO alto, el de
// `pageSize.inner.px.height`. Los dos no coinciden exactamente y el error se
// acumula segun baja el documento: en las primeras paginas es invisible, pero
// hacia la pagina 8-9 ya desalinea lo suficiente para que un titulo de seccion
// quede cortado. (Hasta el 01/10/2026 este comentario lo atribuia al plugin
// context2d de jsPDF; el diagnostico era otro, el arreglo sigue siendo este.)
//
// La correccion: se renderiza el documento en UN canvas (que si respeta los
// marcadores: se verifico pixel a pixel), y ese canvas se corta a mano en
// tantas paginas como haga falta, usando el MISMO alto de pagina que ya uso el
// plugin de marcadores para reservar el espacio en blanco. Con una unica
// fuente de verdad para el alto de pagina, ambos calculos coinciden siempre.
//
// Cada pagina es una imagen JPEG, asi que el PDF no tenia texto: no se podia
// buscar, copiar ni seleccionar nada. Encima de cada imagen va ahora una capa
// de texto invisible con el texto real (capaTexto.js).
import { aWinAnsi, geometriaCapa, repartirPorPagina, escribirCapa, medirPalabras } from './capaTexto.js';

// Devuelve { paginas, palabrasCapa }. palabrasCapa es null si la capa de texto
// fallo: el PDF se genera igual, solo con la imagen, y quien llama decide como
// avisar. Perder el informe entero por la capa seria peor que no tenerla.
export async function exportarInformePdf(container, filename, { titulo = '' } = {}) {
  const html2pdf = (await import('html2pdf.js')).default;

  const opts = {
    margin: [10, 10, 10, 10],
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    // compress: sin el, la capa de texto pesa ~290 KB en un informe tipico;
    // comprimida, ~50 KB (un 2 % del PDF). No toca los JPEG.
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
    // 'avoid-all' queda fuera a proposito: mirando el codigo de html2pdf, ese
    // modo sustituye el selector "avoid" propio por su heuristica interna (que
    // no evita partir las secciones del inventario, son <div> normales) y con
    // 'avoid-all' presente el selector propio se ignora del todo.
    pagebreak: { mode: ['legacy'], before: '.pdf-break-before', avoid: '.pdf-avoid' },
  };

  const worker = html2pdf().set(opts).from(container);
  // toContainer() es quien inserta los <div> en blanco antes de cada bloque
  // marcado, calculando cuanto falta para el borde de la siguiente pagina.
  await worker.toContainer();
  // Las palabras se miden AQUI: sobre el clon que va a rasterizar html2canvas,
  // ya con los huecos de los saltos de pagina, y antes de que toCanvas() lo
  // quite del documento.
  let palabras = null;
  try {
    palabras = medirPalabras(worker.prop.container);
  } catch (err) {
    console.warn('Capa de texto del PDF: no se pudo medir el documento.', err);
  }
  await worker.toCanvas();
  const canvas = worker.prop.canvas;
  const scale = opts.html2canvas.scale;
  const pageHeightPx = Math.floor(worker.prop.pageSize.inner.px.height * scale);

  // Una instancia jsPDF real: un div vacio de 1x1 es suficiente para que
  // html2pdf construya el objeto jsPDF (no lo expone de otro modo). El pixel
  // que dibuja para ese div queda tapado por la primera pagina real, que
  // empieza en el margen.
  const dummy = document.createElement('div');
  dummy.style.width = '1px';
  dummy.style.height = '1px';
  const pdfHolder = html2pdf().set({ jsPDF: opts.jsPDF, html2canvas: { scale: 1 } }).from(dummy);
  await pdfHolder.toPdf();
  const pdf = pdfHolder.prop.pdf;

  // Metadatos: idioma para lectores de pantalla y buscadores, y un asunto que
  // dice que es interno aunque el fichero acabe fuera de contexto (AS6). Las
  // propiedades del documento no usan cp1252: se dejan en Latin-1.
  const latin1 = (s) => aWinAnsi(s).replace(/[^\x20-\x7e\xa1-\xff]/g, '');
  try {
    pdf.setLanguage('es-ES');
    pdf.setDocumentProperties({
      title: latin1(titulo ? `Informe de onboarding - ${titulo}` : 'Informe de onboarding'),
      subject: 'Uso interno - no entregar al cliente',
      creator: 'ALANA IT Onboarding',
    });
  } catch (err) {
    console.warn('PDF: no se pudieron fijar los metadatos.', err);
  }

  const [marginTop, marginRight, , marginLeft] = opts.margin;
  const pageWidthMM = pdf.internal.pageSize.getWidth();
  const contentWidthMM = pageWidthMM - marginLeft - marginRight;
  const pageWidthPx = canvas.width;
  const totalHeightPx = canvas.height;

  const nPaginas = Math.ceil(totalHeightPx / pageHeightPx);
  const altoPaginaCss = pageHeightPx / scale;
  const g = geometriaCapa({ scale, contentWidthMM, canvasWidth: pageWidthPx, marginLeft, marginTop });
  const porPagina = palabras ? repartirPorPagina(palabras, altoPaginaCss, nPaginas) : null;
  let palabrasCapa = porPagina ? 0 : null;

  let renderedPx = 0;
  let pageIndex = 0;
  while (renderedPx < totalHeightPx) {
    const sliceHeightPx = Math.min(pageHeightPx, totalHeightPx - renderedPx);
    const slice = document.createElement('canvas');
    slice.width = pageWidthPx;
    slice.height = sliceHeightPx;
    const ctx = slice.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageWidthPx, sliceHeightPx);
    ctx.drawImage(canvas, 0, renderedPx, pageWidthPx, sliceHeightPx, 0, 0, pageWidthPx, sliceHeightPx);

    if (pageIndex > 0) pdf.addPage();
    const sliceHeightMM = contentWidthMM * (sliceHeightPx / pageWidthPx);
    pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', marginLeft, marginTop, contentWidthMM, sliceHeightMM);

    if (porPagina && palabrasCapa !== null) {
      try {
        palabrasCapa += escribirCapa(pdf, porPagina[pageIndex] ?? [], g, pageIndex * altoPaginaCss);
      } catch (err) {
        // Se deja de escribir y se avisa: las paginas anteriores conservan su
        // texto, y quien llama dice que el PDF no es buscable entero.
        console.warn('Capa de texto del PDF: fallo al escribir la pagina', pageIndex + 1, err);
        palabrasCapa = null;
      }
    }

    renderedPx += sliceHeightPx;
    pageIndex++;
  }

  pdf.save(filename);
  return { paginas: pageIndex, palabrasCapa };
}
