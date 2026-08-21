// Parte ejecutiva del informe de onboarding: portada con la nota, diagnostico
// por dominios, hallazgos criticos y plan de accion.
//
// DOCUMENTO INTERNO. Se entrega al tecnico y al comercial de ALANA IT, no al
// cliente. Eso permite imprimir sin filtrar las notas libres, los pies de foto
// y las oportunidades comerciales. Si algun dia se hace una version para el
// cliente NO basta con quitar un bloque: hay que revisar los textos de los 116
// avisos (varios mencionan Hudu, NinjaOne y la cuenta tecnica de ALANA), los 16
// campos de notas libres y las propias capturas, que pueden ser la consola del
// proveedor saliente. Es una fase propia, no un interruptor.

import { SECTIONS, lectorEfectivo, preguntaDe } from "../sections.js";
import { hintsVisibles, TIPOS_HINT, claveHint } from "../hints.js";
import { CRITERIOS, PRECONDICIONES } from "../score/criterios.js";
import { DOMINIOS } from "../score/dominios.js";
import { esc } from "./buildPrintHTML.js";

// Paleta de marca. El informe no puede leer theme.js porque el PDF se rasteriza
// aparte y necesita los valores literales.
const C = {
  azul: "#2F56A3", turquesa: "#2FB6BA", magenta: "#CC3366", ambar: "#B4530F",
  tinta: "#333333", gris: "#868686", papel: "#F9F9F9", borde: "#E4E6EA",
};

const COLOR_TRAMO = { critico: C.magenta, alto: C.magenta, medio: C.ambar, bajo: C.turquesa };

// Cada bloque empieza con un <div class="pdf-break-before"> vacio, separado del
// contenido real. html2pdf calcula el salto midiendo ese marcador, y el calculo
// llega corto por casi una linea (por que, no esta claro: probablemente una
// diferencia de redondeo entre el pase que mide el DOM y el que rasteriza el
// canvas a scale:2). Sin la reserva de 24px, ese margen de error deja un fleco
// del primer elemento del bloque asomando en la pagina anterior. El marcador va
// separado del contenido (y no el "page-break-before" puesto directamente en el
// contenido) para que ese fleco sea siempre espacio en blanco, nunca texto ni
// color de fondo.

/**
 * Como se nombran las instancias de una tarea agrupada. Una sola instancia se
 * nombra por su numero; varias se resumen, porque el texto del aviso es el
 * mismo y listarlas una a una no anade nada.
 */
const etiquetaInstancias = (h) => {
  const xs = h.instancias ?? (h.instancia === null || h.instancia === undefined ? [] : [h.instancia]);
  if (!xs.length) return "";
  if (xs.length === 1) return ` · ${xs[0]}`;
  return ` · ${xs.length} instancias (${xs.join(", ")})`;
};

/** Ancho maximo de la barra de un dominio, proporcional a su peso. */
// Se deriva del peso mayor que haya, no de un 18 escrito a mano: al partir
// "endpoint" en 2.4.0 el maximo dejo de ser 18 y las barras se habrian quedado
// cortas para siempre sin que nada avisara.
const PESO_DOMINIO_MAX = Math.max(...Object.values(DOMINIOS).map(d => d.peso));
const anchoPeso = (peso) => Math.round((peso / PESO_DOMINIO_MAX) * 100);

// ── Sello de la nota, para la portada ───────────────────────────────────────
// Contenido y encuadrado, no titular: la primera pagina es lo que se reenvia
// suelta, y un "6/100" a toda plana sin contexto es una sentencia.
export function selloNota(score) {
  if (!score) return "";
  const hayNota = score.nota !== null && score.fiable;
  const color = hayNota ? COLOR_TRAMO[score.tramo.nivel] : C.gris;
  const valor = hayNota ? String(score.nota) : "—";
  const etiqueta = hayNota
    ? esc(score.tramo.etiqueta)
    : (score.sinResponder?.length || score.padresSinDecidir?.length ? "Sin datos suficientes" : "Sin nota");
  // Tres motivos posibles de "no fiable", no dos: evidencia insuficiente,
  // secciones sin decidir, o campos padre sin decidir. La evidencia manda
  // siempre que sea ella la que no llega -con un cliente al 13% el problema
  // de verdad es el 87% sin mirar, no dos o tres campos padre sueltos-. El
  // texto de campos padre solo tiene sentido cuando la evidencia YA esta al
  // dia y lo unico que falta son esos campos ("sólo se ha comprobado el
  // 100%... por debajo del 60%" seria una contradiccion literal).
  const pie = hayNota
    ? `evidencia ${score.evidencia}% · modelo ${esc(score.version)}`
    : score.sinResponder?.length
      ? `faltan ${score.sinResponder.length} secciones por responder`
      : score.evidencia < score.evidenciaMinima
        ? `sólo se ha comprobado el ${score.evidencia}% del modelo`
        : score.padresSinDecidir?.length
          ? `faltan ${score.padresSinDecidir.length} campo${score.padresSinDecidir.length > 1 ? "s que deciden" : " que decide"} otras respuestas`
          : `sólo se ha comprobado el ${score.evidencia}% del modelo`;

  return `<div style="display:inline-block;border:2px solid ${color};border-radius:8px;padding:14px 20px;min-width:150px;text-align:center;">
    <div style="font-size:40px;font-weight:500;color:${color};line-height:1;">${valor}${hayNota ? '<span style="font-size:15px;color:#868686;font-weight:400;"> / 100</span>' : ""}</div>
    <div style="font-size:12px;color:${color};margin-top:5px;">${etiqueta}</div>
    <div style="font-size:9.5px;color:#868686;margin-top:3px;">${pie}</div>
  </div>
  <div style="font-size:9.5px;color:#868686;margin-top:8px;max-width:260px;line-height:1.45;">
    Medición del estado técnico observado en la visita. No es una calificación de la empresa.${hayNota ? "" : "<br><b style=\"font-weight:500;\">No hay nota porque no hay evidencia suficiente:</b> lo que no se comprobó no cuenta como correcto."}
  </div>`;
}

// ── Pagina de diagnostico ───────────────────────────────────────────────────
export function paginaDiagnostico(score, sectionEnabled, fecha) {
  if (!score) return "";

  const evaluables = score.dominios.filter(d => d.evaluable);
  const color = score.fiable && score.nota !== null ? COLOR_TRAMO[score.tramo.nivel] : C.gris;

  // Lo que el cliente ha declarado que no tiene. Va en el alcance porque cambia
  // el denominador: sin decirlo, un lector no puede saber si un dominio en
  // blanco es que no existe o que no se miro.
  const sinServicio = SECTIONS.filter(s => (sectionEnabled || {})[s.id] === "no").map(s => s.label);

  // Mismo filtro pero solo con las secciones que de verdad mueven la nota:
  // negar una seccion sin ningun criterio (almacenamiento, telefonia...) no
  // quita nada del denominador y no merece la advertencia de mas abajo.
  const seccionesConModelo = new Set([...CRITERIOS.map(c => c.seccion), ...PRECONDICIONES.map(p => p.seccion)]);
  const sinServicioRelevante = SECTIONS.filter(s => (sectionEnabled || {})[s.id] === "no" && seccionesConModelo.has(s.id)).map(s => s.label);

  // Lectura de la nota, construida con los datos y no a mano
  const criticos = score.hallazgos.length;
  const peor = evaluables.length ? evaluables.reduce((a, b) => (a.nota <= b.nota ? a : b)) : null;
  // La frase tiene que hablar de la REVISION, no del cliente. Lo unico que se
  // puede afirmar es que ningun criterio COMPROBADO disparo un hallazgo, y con
  // medio formulario en blanco esa frase tiene todas las papeletas de ser
  // falsa: el caso que destapo esto imprimia "sin hallazgos criticos abiertos"
  // sobre un backup del que solo se habia mirado un criterio de diez.
  const pendientes = score.capadoresPendientes?.length ?? 0;
  const coletilla = pendientes > 0
    ? ` Quedan ${pendientes} comprobación${pendientes > 1 ? "es" : ""} crítica${pendientes > 1 ? "s" : ""} sin hacer.`
    : "";
  let lectura;
  if (!score.fiable) {
    if (score.sinResponder?.length) {
      lectura = `Sin nota: quedan ${score.sinResponder.length} secciones sin responder (${esc(score.sinResponder.join(", "))}). Mientras no se decida si el cliente tiene esos servicios, cualquier puntuación sería engañosa.`;
    } else if (score.evidencia >= score.evidenciaMinima && score.padresSinDecidir?.length) {
      // Solo entra aqui cuando la evidencia YA llega al minimo: si un cliente
      // esta al 13%, el problema de verdad es el 87% sin mirar, no dos o tres
      // campos padre sueltos, y decir "contesta estos y ya tienes nota" seria
      // falso. El texto de "evidencia baja" de mas abajo seria ademas una
      // contradiccion literal con evidencia al 100% (100 no esta "por debajo"
      // de nada), por eso este caso necesita su propio texto.
      const nombres = score.padresSinDecidir.map(p => preguntaDe(p.seccion, p.campo).pregunta);
      lectura = `Sin nota: queda${nombres.length > 1 ? "n" : ""} ${nombres.length} campo${nombres.length > 1 ? "s" : ""} sin contestar que decide${nombres.length > 1 ? "n" : ""} si puntúan otras respuestas (${esc(nombres.join(", "))}). La nota provisional sería ${score.nota} sobre 100.`;
    } else {
      lectura = `Sin nota: sólo se ha comprobado el ${score.evidencia}% de lo que aplicaba a este cliente, por debajo del ${score.evidenciaMinima}% necesario. La nota provisional sería ${score.nota} sobre 100, y sólo puede subir a medida que se complete la visita.`;
    }
  } else if (criticos === 0 && pendientes === 0) {
    // "Se comprobo todo" solo es exacto si nada de lo que puntua se declaro
    // inexistente: negar una seccion la saca del denominador tan limpiamente
    // como comprobarla entera, y sin este matiz la frase sonaria igual de
    // rotunda en los dos casos. El caso que lo destapo: negar 8 secciones sin
    // precondicion podia dar nota 94 fiable con esta misma frase encima.
    lectura = sinServicioRelevante.length
      ? `Nota ${score.nota} sobre 100, ${score.tramo.etiqueta.toLowerCase()}. Se comprobó el ${score.evidencia}% del modelo que aplicaba a este cliente —quedan fuera ${sinServicioRelevante.length} ${sinServicioRelevante.length > 1 ? "secciones declaradas inexistentes" : "sección declarada inexistente"} (${esc(sinServicioRelevante.join(", "))})— y ninguno de los criterios comprobados ha dado un hallazgo crítico.`
      : `Nota ${score.nota} sobre 100, ${score.tramo.etiqueta.toLowerCase()}. Se comprobaron todos los criterios que aplicaban a este cliente y ninguno ha dado un hallazgo crítico.`;
  } else if (criticos === 0) {
    lectura = `Nota ${score.nota} sobre 100, ${score.tramo.etiqueta.toLowerCase()}. Ninguno de los criterios comprobados ha dado un hallazgo crítico, pero quedan ${pendientes} comprobación${pendientes > 1 ? "es" : ""} crítica${pendientes > 1 ? "s" : ""} sin hacer: hasta que se hagan, la ausencia de hallazgos no es una afirmación sobre el cliente.`;
  } else {
    lectura = `Nota ${score.nota} sobre 100, ${score.tramo.etiqueta.toLowerCase()}. ${criticos} hallazgo${criticos > 1 ? "s" : ""} crítico${criticos > 1 ? "s" : ""}` +
      (peor ? `, y el dominio más débil es ${esc(peor.nombre.toLowerCase())} (${peor.nota}).` : ".") +
      (score.capadaGlobal ? " La nota global está limitada por un hallazgo crítico." : "") + coletilla;
  }

  const filas = score.dominios.map(d => {
    const est = sectionEnabled || {};
    let cuerpo, nota, notaColor = C.gris;
    if (d.evaluable) {
      const c = COLOR_TRAMO[d.tramo.nivel];
      notaColor = c;
      nota = String(d.nota);
      const anchoTrack = anchoPeso(d.peso);
      // Nada de overflow:hidden para recortar el relleno: html2canvas no rasteriza
      // bien un hijo en % dentro de un border-radius+overflow:hidden (el relleno
      // desaparece y solo queda la pista gris). Ancho exacto en px y position:
      // absolute en su lugar, que no depende de que el motor recorte nada.
      const anchoFill = Math.min(anchoTrack, Math.round(anchoTrack * d.nota / 100));
      cuerpo = `<span style="display:inline-block;width:${anchoTrack}px;height:7px;background:${C.borde};border-radius:4px;vertical-align:middle;position:relative;">
          <span style="display:block;position:absolute;left:0;top:0;height:7px;width:${anchoFill}px;background:${c};border-radius:4px;"></span>
        </span>`;
    } else {
      nota = "—";
      cuerpo = `<span style="display:inline-block;width:${anchoPeso(d.peso)}px;height:7px;background:repeating-linear-gradient(90deg,${C.borde},${C.borde} 3px,#fff 3px,#fff 6px);border-radius:4px;vertical-align:middle;"></span>`;
    }
    const capa = d.capado
      ? `<div style="font-size:9.5px;color:${C.magenta};padding-left:2px;">Limitado por un hallazgo crítico</div>`
      : "";
    // En ambar y no en magenta: el magenta es un problema del cliente, y esto
    // es un hueco de la visita. La barra no necesita nada especial —con el
    // denominador aplicable su longitud YA es la fraccion demostrada.
    const evid = (d.evaluable && d.evidencia !== null && d.evidencia < 100)
      ? `<div style="font-size:9.5px;color:${C.ambar};padding-left:2px;">${d.criteriosEvaluados} de ${d.criteriosAplicables} criterios comprobados</div>`
      : "";
    return `<tr class="pdf-avoid">
      <td style="padding:5px 8px 5px 0;font-size:11.5px;color:${C.tinta};width:44%;">${esc(d.nombre)}${capa}${evid}</td>
      <td style="padding:5px 8px;font-size:9.5px;color:${C.gris};width:16%;">${d.peso}% de la nota</td>
      <td style="padding:5px 8px;width:32%;">${cuerpo}</td>
      <td style="padding:5px 0;font-size:12px;color:${notaColor};text-align:right;width:8%;white-space:nowrap;">${nota}</td>
    </tr>`;
  }).join("");

  return `<div class="pdf-break-before" style="height:24px;"></div>
  <div style="page-break-before:always;">
    <h2 style="font-size:16px;font-weight:500;color:${C.azul};margin:0 0 4px;">Diagnóstico</h2>
    <p style="font-size:12.5px;color:${C.tinta};line-height:1.55;margin:0 0 18px;max-width:64ch;">${lectura}</p>

    <div style="font-size:10px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:${C.gris};margin-bottom:6px;">Por dominio</div>
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;">${filas}</table>

    <div style="margin-top:20px;background:${C.papel};border:1px solid ${C.borde};border-radius:6px;padding:10px 13px;font-size:10px;color:${C.gris};line-height:1.55;">
      <b style="color:${C.tinta};font-weight:500;">Alcance.</b> Observación directa en la visita del ${esc(fecha || "—")}.
      No incluye escaneo de vulnerabilidades, prueba de restauración propia ni revisión de consolas a las que no se dio acceso.
      Comprobado el ${score.evidencia}% del peso del modelo que aplicaba a este cliente${score.version ? ` · CiberScore ${esc(score.version)}` : ""}.
      <b style="color:${C.tinta};font-weight:500;">Lo que no se comprobó no puntúa: sale con valor cero, nunca como correcto.</b>
      Secciones declaradas inexistentes en este cliente: ${esc(sinServicio.length ? sinServicio.join(", ") : "ninguna")}.
      Una nota calculada con otra versión del modelo no es comparable con esta.
    </div>
  </div>`;
}

// ── Hallazgos criticos ──────────────────────────────────────────────────────
// Se imprime el `titular` del criterio, nunca su `porQue`: ese texto justifica
// por que el criterio puntua asi, lleva jerga del modelo y mide 200 caracteres
// de media. No describe el problema y no cabe.
export function bloqueHallazgos(score) {
  if (!score) return "";

  const pendientes = score.capadoresPendientes ?? [];

  // Sin hallazgos pero con comprobaciones criticas sin hacer, callarse seria lo
  // peor: el lector entiende "no hay problemas" cuando lo cierto es "no se ha
  // mirado". Se imprime el bloque con la lista de lo que falta.
  if (!score.hallazgos.length) {
    if (!pendientes.length) return "";
    // Se imprime LA PREGUNTA del campo, no el `titular` del criterio. El titular
    // afirma el problema ("Servidor con sistema operativo fuera de soporte") y
    // vale para un hallazgo confirmado; sobre un campo que solo esta en blanco
    // se lee como una acusacion que el informe no puede sostener.
    const filasP = pendientes.map(p => {
      const q = preguntaDe(p.seccion, p.campo);
      return `<div class="pdf-avoid" style="padding:7px 0;border-bottom:1px solid ${C.borde};page-break-inside:avoid;">
        <div style="font-size:12px;font-weight:500;color:${C.tinta};line-height:1.4;">${esc(q.pregunta)}</div>
        <div style="font-size:9.5px;color:${C.gris};margin-top:2px;">${esc(q.seccion)} · sin contestar</div>
      </div>`;
    }).join("");
    return `<div class="pdf-break-before" style="height:24px;"></div>
    <div style="page-break-before:always;">
      <h2 style="font-size:16px;font-weight:500;color:${C.azul};margin:0 0 4px;">Preguntas críticas sin contestar</h2>
      <p style="font-size:11px;color:${C.gris};margin:0 0 12px;">
        Ningún criterio de los comprobados ha disparado un hallazgo crítico, pero
        ${pendientes.length} pregunta${pendientes.length > 1 ? "s" : ""} que sí pueden darlo quedó${pendientes.length > 1 ? "aron" : ""} sin contestar en la visita.
        No son hallazgos: son huecos. Hasta cerrarlos, este informe no afirma que el cliente esté limpio.
      </p>
      <div style="border-top:2px solid ${C.ambar};">${filasP}</div>
    </div>`;
  }

  const titularDe = (h) => {
    const c = CRITERIOS.find(x => x.id === h.id) || PRECONDICIONES.find(x => x.id === h.id);
    return c?.titular || h.texto;
  };
  const efectoDe = (h) => {
    const c = CRITERIOS.find(x => x.id === h.id);
    const p = PRECONDICIONES.find(x => x.id === h.id);
    const k = c?.critico || p;
    if (k?.capGlobal !== undefined) return `limita la nota global a ${k.capGlobal}`;
    if (k?.capDominio !== undefined) {
      const d = score.dominios.find(x => x.id === h.dominio);
      return `limita ${d ? d.nombre.toLowerCase() : h.dominio} a ${k.capDominio}`;
    }
    return "";
  };

  // Orden: por peso del dominio, que es el orden en que computeScore los devuelve
  const orden = new Map(score.dominios.map((d, i) => [d.id, i]));
  const lista = [...score.hallazgos].sort((a, b) => (orden.get(a.dominio) ?? 99) - (orden.get(b.dominio) ?? 99));

  const filas = lista.map(h => {
    const dom = score.dominios.find(d => d.id === h.dominio);
    const efecto = efectoDe(h);
    return `<div class="pdf-avoid" style="padding:7px 0;border-bottom:1px solid ${C.borde};page-break-inside:avoid;">
      <div style="font-size:12px;font-weight:500;color:${C.tinta};line-height:1.4;">${esc(titularDe(h))}</div>
      <div style="font-size:9.5px;color:${C.gris};margin-top:2px;">${esc(dom ? dom.nombre : h.dominio)}${efecto ? ` · ${esc(efecto)}` : ""}</div>
    </div>`;
  }).join("");

  return `<div class="pdf-break-before" style="height:24px;"></div>
  <div style="page-break-before:always;">
    <h2 style="font-size:16px;font-weight:500;color:${C.azul};margin:0 0 4px;">Hallazgos críticos</h2>
    <p style="font-size:11px;color:${C.gris};margin:0 0 12px;">
      ${lista.length} hallazgo${lista.length > 1 ? "s" : ""} que limita${lista.length > 1 ? "n" : ""} la puntuación por sí solo${lista.length > 1 ? "s" : ""}.
      Ninguna mejora en otros apartados los compensa.
    </p>
    <div style="border-top:2px solid ${C.magenta};">${filas}</div>
  </div>`;
}

// ── Plan de accion ──────────────────────────────────────────────────────────
// Sale de los avisos marcables que siguen pendientes. Se descartan los que
// caen sobre un campo que ya genero un hallazgo critico: si no, el plan repite
// tres veces "revoca los accesos del proveedor anterior" y deja de leerse.
const TOPE_PLAN = 18;

export function bloquePlan(score, sectionEnabled, formData, instanceCounts) {
  const camposConHallazgo = new Set(
    (score?.hallazgos ?? []).map(h => {
      const c = CRITERIOS.find(x => x.id === h.id);
      return c ? `${c.seccion}.${c.campo}` : null;
    }).filter(Boolean)
  );

  const hints = formData.__hints__ ?? {};
  const abiertos = [];

  for (const s of SECTIONS) {
    if (sectionEnabled[s.id] !== "si") continue;
    const n = Math.max(1, instanceCounts[s.id] || 1);
    for (let i = 0; i < n; i++) {
      const leer = lectorEfectivo(s.id, (sid, fid, idx) => formData[sid]?.[idx]?.[fid] ?? "", i);
      for (const h of hintsVisibles(s.id, leer)) {
        const tipo = TIPOS_HINT[h.tipo];
        if (!tipo.marcable) continue;
        const estado = hints[claveHint(h.id, i)] ?? "";
        if (estado === "hecho" || estado === "na") continue;
        if (h.anchor && camposConHallazgo.has(`${s.id}.${h.anchor}`)) continue; // ya sale como hallazgo
        abiertos.push({ ...h, seccion: s.label, instancia: n > 1 ? i + 1 : null });
      }
    }
  }

  if (!abiertos.length) return "";

  // Un aviso identico en varias instancias es UNA tarea, no varias. Un cliente
  // con seis aplicaciones ERP llenaba seis de las dieciocho plazas del plan con
  // la misma linea palabra por palabra, y el texto ni siquiera dice de que
  // aplicacion habla, asi que no habia forma de repartirlas. Se colapsan en una
  // y se dice en cuantas instancias toca.
  const agrupados = new Map();
  for (const a of abiertos) {
    const clave = `${a.seccion}|${a.id}`;
    const previo = agrupados.get(clave);
    if (previo) previo.instancias.push(a.instancia);
    else agrupados.set(clave, { ...a, instancias: a.instancia === null ? [] : [a.instancia] });
  }
  abiertos.length = 0;
  abiertos.push(...agrupados.values());

  // Seguridad antes que legado; dentro de cada tipo, el orden del catalogo
  const peso = { seguridad: 0, legado: 1 };
  abiertos.sort((a, b) => (peso[a.tipo] ?? 9) - (peso[b.tipo] ?? 9));

  const mostrados = abiertos.slice(0, TOPE_PLAN);
  const resto = abiertos.length - mostrados.length;

  const filas = mostrados.map((h, i) => {
    const col = h.tipo === "seguridad" ? C.magenta : C.ambar;
    return `<div class="pdf-avoid" style="display:flex;gap:9px;padding:7px 0;border-bottom:1px solid ${C.borde};page-break-inside:avoid;">
      <span style="flex:0 0 18px;font-size:11px;color:${C.gris};">${i + 1}</span>
      <span style="flex:0 0 3px;background:${col};border-radius:2px;"></span>
      <span style="flex:1;">
        <span style="display:block;font-size:11.5px;color:${C.tinta};line-height:1.5;">${esc(h.texto)}</span>
        <span style="display:block;font-size:9.5px;color:${C.gris};margin-top:2px;">${esc(h.seccion)}${etiquetaInstancias(h)}</span>
      </span>
    </div>`;
  }).join("");

  return `<div class="pdf-break-before" style="height:24px;"></div>
  <div style="page-break-before:always;">
    <h2 style="font-size:16px;font-weight:500;color:${C.azul};margin:0 0 4px;">Plan de acción</h2>
    <p style="font-size:11px;color:${C.gris};margin:0 0 12px;">
      Tareas de seguridad y de limpieza del proveedor anterior que siguen abiertas, en orden de prioridad.
      Lo que ya aparece como hallazgo crítico no se repite aquí.
    </p>
    <div style="border-top:2px solid ${C.azul};">${filas}</div>
    ${resto > 0 ? `<p style="font-size:10px;color:${C.gris};margin-top:8px;">Y ${resto} más, en el detalle por secciones.</p>` : ""}
  </div>`;
}

// ── Oportunidades detectadas (INTERNO) ──────────────────────────────────────
export function bloqueOportunidades(sectionEnabled, formData, instanceCounts) {
  const vistas = new Set();
  const lista = [];
  for (const s of SECTIONS) {
    if (sectionEnabled[s.id] !== "si") continue;
    const n = Math.max(1, instanceCounts[s.id] || 1);
    for (let i = 0; i < n; i++) {
      const leer = lectorEfectivo(s.id, (sid, fid, idx) => formData[sid]?.[idx]?.[fid] ?? "", i);
      for (const h of hintsVisibles(s.id, leer)) {
        if (h.tipo !== "comercial" || vistas.has(h.id)) continue;
        vistas.add(h.id);
        lista.push({ ...h, seccion: s.label });
      }
    }
  }
  if (!lista.length) return "";

  const filas = lista.map(h => `<div class="pdf-avoid" style="padding:6px 0;border-bottom:1px solid ${C.borde};page-break-inside:avoid;">
      <div style="font-size:11.5px;color:${C.tinta};line-height:1.5;">${esc(h.texto)}</div>
      <div style="font-size:9.5px;color:${C.gris};margin-top:2px;">${esc(h.seccion)}</div>
    </div>`).join("");

  return `<div class="pdf-break-before" style="height:24px;"></div>
  <div style="page-break-before:always;">
    <div style="background:${C.magenta};color:#fff;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;padding:5px 10px;border-radius:4px;display:inline-block;margin-bottom:10px;">
      Uso interno · no entregar al cliente
    </div>
    <h2 style="font-size:16px;font-weight:500;color:${C.azul};margin:0 0 4px;">Oportunidades detectadas</h2>
    <p style="font-size:11px;color:${C.gris};margin:0 0 12px;">${lista.length} propuesta${lista.length > 1 ? "s" : ""} de servicio a partir de lo documentado en la visita.</p>
    <div style="border-top:2px solid ${C.turquesa};">${filas}</div>
  </div>`;
}
