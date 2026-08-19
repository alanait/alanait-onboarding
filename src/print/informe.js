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

import { SECTIONS, lectorEfectivo } from "../sections.js";
import { hintsVisibles, TIPOS_HINT, claveHint } from "../hints.js";
import { CRITERIOS, PRECONDICIONES } from "../score/criterios.js";
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

/** Ancho maximo de la barra de un dominio, proporcional a su peso. */
const anchoPeso = (peso) => Math.round((peso / 18) * 100);

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
    : (score.sinResponder?.length ? "Sin datos suficientes" : "Sin nota");
  const pie = hayNota
    ? `cobertura ${score.cobertura}% · modelo ${esc(score.version)}`
    : (score.sinResponder?.length
        ? `falta responder ${esc(score.sinResponder.join(" y "))}`
        : `evaluado el ${score.cobertura}% del modelo`);

  return `<div style="display:inline-block;border:2px solid ${color};border-radius:8px;padding:14px 20px;min-width:150px;text-align:center;">
    <div style="font-size:40px;font-weight:500;color:${color};line-height:1;">${valor}${hayNota ? '<span style="font-size:15px;color:#868686;font-weight:400;"> / 100</span>' : ""}</div>
    <div style="font-size:12px;color:${color};margin-top:5px;">${etiqueta}</div>
    <div style="font-size:9.5px;color:#868686;margin-top:3px;">${pie}</div>
  </div>
  <div style="font-size:9.5px;color:#868686;margin-top:8px;max-width:260px;line-height:1.45;">
    Medición del estado técnico observado en la visita. No es una calificación de la empresa.
  </div>`;
}

// ── Pagina de diagnostico ───────────────────────────────────────────────────
export function paginaDiagnostico(score, sectionEnabled, fecha) {
  if (!score) return "";

  const evaluables = score.dominios.filter(d => d.evaluable);
  const color = score.fiable && score.nota !== null ? COLOR_TRAMO[score.tramo.nivel] : C.gris;

  // Lectura de la nota, construida con los datos y no a mano
  const criticos = score.hallazgos.length;
  const peor = evaluables.length ? evaluables.reduce((a, b) => (a.nota <= b.nota ? a : b)) : null;
  let lectura;
  if (!score.fiable) {
    lectura = score.sinResponder?.length
      ? `Sin nota: falta responder ${esc(score.sinResponder.join(" y "))}. Sin esos datos cualquier puntuación sería engañosa.`
      : `Sin nota: sólo se ha podido evaluar el ${score.cobertura}% del modelo, por debajo del ${score.coberturaMinima}% necesario.`;
  } else if (criticos === 0) {
    lectura = `Nota ${score.nota} sobre 100, ${score.tramo.etiqueta.toLowerCase()}. Sin hallazgos críticos abiertos.`;
  } else {
    lectura = `Nota ${score.nota} sobre 100, ${score.tramo.etiqueta.toLowerCase()}. ${criticos} hallazgo${criticos > 1 ? "s" : ""} crítico${criticos > 1 ? "s" : ""}` +
      (peor ? `, y el dominio más débil es ${esc(peor.nombre.toLowerCase())} (${peor.nota}).` : ".") +
      (score.capadaGlobal ? " La nota global está limitada por un hallazgo crítico." : "");
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
    return `<tr>
      <td style="padding:5px 8px 5px 0;font-size:11.5px;color:${C.tinta};width:44%;">${esc(d.nombre)}${capa}</td>
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
      Evaluado el ${score.cobertura}% del peso del modelo${score.version ? ` · CiberScore ${esc(score.version)}` : ""}.
      Una nota calculada con otra versión del modelo no es comparable con esta.
    </div>
  </div>`;
}

// ── Hallazgos criticos ──────────────────────────────────────────────────────
// Se imprime el `titular` del criterio, nunca su `porQue`: ese texto justifica
// por que el criterio puntua asi, lleva jerga del modelo y mide 200 caracteres
// de media. No describe el problema y no cabe.
export function bloqueHallazgos(score) {
  if (!score || !score.hallazgos.length) return "";

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
    return `<div style="padding:7px 0;border-bottom:1px solid ${C.borde};page-break-inside:avoid;">
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

  // Seguridad antes que legado; dentro de cada tipo, el orden del catalogo
  const peso = { seguridad: 0, legado: 1 };
  abiertos.sort((a, b) => (peso[a.tipo] ?? 9) - (peso[b.tipo] ?? 9));

  const mostrados = abiertos.slice(0, TOPE_PLAN);
  const resto = abiertos.length - mostrados.length;

  const filas = mostrados.map((h, i) => {
    const col = h.tipo === "seguridad" ? C.magenta : C.ambar;
    return `<div style="display:flex;gap:9px;padding:7px 0;border-bottom:1px solid ${C.borde};page-break-inside:avoid;">
      <span style="flex:0 0 18px;font-size:11px;color:${C.gris};">${i + 1}</span>
      <span style="flex:0 0 3px;background:${col};border-radius:2px;"></span>
      <span style="flex:1;">
        <span style="display:block;font-size:11.5px;color:${C.tinta};line-height:1.5;">${esc(h.texto)}</span>
        <span style="display:block;font-size:9.5px;color:${C.gris};margin-top:2px;">${esc(h.seccion)}${h.instancia ? ` · ${h.instancia}` : ""}</span>
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

  const filas = lista.map(h => `<div style="padding:6px 0;border-bottom:1px solid ${C.borde};page-break-inside:avoid;">
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
