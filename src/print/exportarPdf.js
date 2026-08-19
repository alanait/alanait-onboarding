// Exportacion del informe a PDF.
//
// html2pdf.js ofrece un camino corto (`.save()`) que hace todo de un tiron,
// pero para un documento largo como este produce paginas cortadas a mitad de
// seccion. La causa: `.save()` llama a `toPdf()`, que delega en el plugin
// context2d de jsPDF con `autoPaging:true` -- un mecanismo de paginacion
// automatica que decide donde partir pagina SEGUN VA DIBUJANDO, con su propio
// calculo de alto de pagina. Los marcadores que evitan cortes ("pdf-avoid",
// "pdf-break-before") los inserta un plugin distinto (pagebreaks.js), que usa
// OTRO calculo de alto de pagina para decidir cuanto espacio en blanco
// reservar. Los dos calculos no coinciden exactamente, y el margen de error se
// acumula segun baja el documento: en las primeras paginas es invisible, pero
// hacia la pagina 8-9 ya desalinea lo suficiente para que un titulo de seccion
// quede cortado.
//
// La correccion: en vez de dejar que jsPDF decida donde partir mientras
// dibuja, se renderiza el documento en UN canvas (que si respeta los
// marcadores: se verifico pixel a pixel), y ese canvas se corta a mano en
// tantas paginas como haga falta, usando el MISMO alto de pagina que ya uso el
// plugin de marcadores para reservar el espacio en blanco. Con una unica
// fuente de verdad para el alto de pagina, ambos calculos coinciden siempre.
export async function exportarInformePdf(container, filename) {
  const html2pdf = (await import('html2pdf.js')).default;

  const opts = {
    margin: [10, 10, 10, 10],
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
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
  await worker.toCanvas();
  const canvas = worker.prop.canvas;
  const scale = opts.html2canvas.scale;
  const pageHeightPx = Math.floor(worker.prop.pageSize.inner.px.height * scale);

  // Una instancia jsPDF real, sin pasar por el autoPaging de context2d: un
  // div vacio de 1x1 es suficiente para que html2pdf construya el objeto
  // jsPDF (no lo expone de otro modo). El pixel que dibuja para ese div queda
  // tapado por la primera pagina real, que empieza en el margen.
  const dummy = document.createElement('div');
  dummy.style.width = '1px';
  dummy.style.height = '1px';
  const pdfHolder = html2pdf().set({ jsPDF: opts.jsPDF, html2canvas: { scale: 1 } }).from(dummy);
  await pdfHolder.toPdf();
  const pdf = pdfHolder.prop.pdf;

  const [marginTop, marginRight, , marginLeft] = opts.margin;
  const pageWidthMM = pdf.internal.pageSize.getWidth();
  const contentWidthMM = pageWidthMM - marginLeft - marginRight;
  const pageWidthPx = canvas.width;
  const totalHeightPx = canvas.height;

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

    renderedPx += sliceHeightPx;
    pageIndex++;
  }

  pdf.save(filename);
}
