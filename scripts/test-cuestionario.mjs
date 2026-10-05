// Pruebas del cuestionario para el cliente. Sin dependencias:
//   node scripts/test-cuestionario.mjs
//
// Lo que se fija aqui es lo que no puede romperse nunca:
//   - Que el cliente no puede tocar NADA que lea el CiberScore. No por lista
//     escrita a mano, sino barriendo cada campo del cuestionario con cada valor
//     posible sobre las 5 fichas de ejemplo y un cliente perfecto, y exigiendo
//     que la salida ENTERA del motor y los avisos marcables no cambien. Es la
//     regla del proyecto: comparar entradas distintas del mismo motor.
//   - Que lo que dice el cliente no entra solo: solo se preselecciona lo que
//     rellena un hueco, nunca se borra nada y un fichero manipulado no cuela
//     campos de fuera del catalogo.
//   - Que el HTML que se entrega al cliente no lleva la nota, los avisos ni el
//     porque de los criterios, y que ningun valor se cuela como HTML.
//   - Que cada fila vuelve a SU fila aunque el tecnico borre o reordene filas
//     mientras el cuestionario esta fuera.
//
// La pagina del cliente se ejecuta aqui mismo sobre un DOM minimo: se rellena,
// se descarga el .json y se importa, de punta a punta, sin navegador.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SECTIONS, CAMPOS_CLIENTE, lectorEfectivo } from "../src/sections.js";
import { HINTS, TIPOS_HINT, hintsVisibles } from "../src/hints.js";
import { computeScore } from "../src/score/computeScore.js";
import { CRITERIOS, PRECONDICIONES, LITERALES_SIN_COMPROBAR } from "../src/score/criterios.js";
import { CUESTIONARIO, DATOS_EMPRESA, catalogoCliente, camposQueLeeElMotor, camposQueDisparanTareas, esPadrePermitido, tipoAdmitido } from "../src/cliente/catalogo.js";
import { construirCuestionario, datosCuestionario } from "../src/cliente/cuestionarioHTML.js";
import { leerRespuestas, compararRespuestas, aplicarRespuestas, seleccionInicial, TAMANO_MAXIMO } from "../src/cliente/respuestas.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
let ok = 0, fallos = 0;
const es = (etiqueta, real, esperado) => {
  const bien = JSON.stringify(real) === JSON.stringify(esperado);
  console.log(`  ${bien ? "ok  " : "FALLO"} ${etiqueta}${bien ? "" : `  esperaba ${JSON.stringify(esperado)}, dio ${JSON.stringify(real)}`}`);
  bien ? ok++ : fallos++;
};

const copia = (o) => JSON.parse(JSON.stringify(o));
const fichas = readdirSync(join(RAIZ, "ejemplos")).filter(n => n.endsWith(".alanait")).sort()
  .map(n => ({ nombre: n, ...JSON.parse(readFileSync(join(RAIZ, "ejemplos", n), "utf8")) }));
const puntuar = (e) => computeScore({ formData: e.formData, sectionEnabled: e.sectionEnabled, instanceCounts: e.instanceCounts || {}, criterios: CRITERIOS, precondiciones: PRECONDICIONES, fecha: e.clientData?.fecha || "2026-10-05" });
// Avisos marcables visibles en toda la ficha: lo que acabaria en el plan del PDF.
const tareas = (e) => SECTIONS.flatMap(s => Array.from({ length: Math.max(1, e.instanceCounts?.[s.id] || 1) }, (_, i) => {
  if (e.sectionEnabled?.[s.id] !== "si") return [];
  const getVal = (sid, f, idx) => e.formData?.[sid]?.[idx]?.[f] ?? "";
  return hintsVisibles(s.id, lectorEfectivo(s.id, getVal, i)).filter(h => TIPOS_HINT[h.tipo].marcable).map(h => `${h.id}@${i}`);
}).flat()).sort();
const firma = (e) => JSON.stringify({ score: puntuar(e), tareas: tareas(e) });
const estadoDe = (f) => ({ clientData: f.clientData, sectionEnabled: f.sectionEnabled, formData: f.formData, instanceCounts: f.instanceCounts || {} });

// Cliente perfecto: el mejor literal de cada criterio, como en test-score.
function perfecto() {
  const sectionEnabled = {}, formData = {};
  for (const s of SECTIONS) sectionEnabled[s.id] = "si";
  for (const c of CRITERIOS) {
    let mejor = null, valor = -1;
    for (const [lit, v] of Object.entries(c.mapa ?? {})) if (v > valor) { valor = v; mejor = lit; }
    if (mejor === null) continue;
    (formData[c.seccion] ??= { 0: {} });
    formData[c.seccion][0][c.campo] = mejor;
    if (c.dep) formData[c.seccion][0][c.dep.field] = c.dep.value;
  }
  return { nombre: "cliente perfecto", clientData: { empresa: "Perfecta SL", fecha: "2026-10-05" }, sectionEnabled, formData, instanceCounts: {} };
}
const bases = [...fichas, perfecto()];
const fichaVacia = () => ({ nombre: "ficha vacía", clientData: { empresa: "Nueva SL" }, sectionEnabled: {}, formData: {}, instanceCounts: {} });

// ── La pagina del cliente sobre un DOM minimo ───────────────────────────────
// Lo justo para lo que usa la pagina: crear nodos, atributos, eventos, texto.
// setTimeout se ejecuta en el acto, asi el guardado en el navegador es sincrono.
class Nodo {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.oyentes = {}; this._texto = ""; this.value = ""; this.checked = false; this.className = ""; }
  get textContent() { return this._texto + this.children.map(c => c.textContent).join(""); }
  set textContent(v) { this._texto = String(v); this.children = []; }
  get firstChild() { return this.children[0] ?? null; }
  appendChild(n) { this.children.push(n); return n; }
  removeChild(n) { this.children = this.children.filter(x => x !== n); return n; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  addEventListener(t, f) { (this.oyentes[t] ??= []).push(f); }
  disparar(t) { for (const f of this.oyentes[t] ?? []) f({ target: this }); }
  querySelectorAll(sel) { return todos(this, n => n.tagName === sel.toUpperCase()); }
  scrollIntoView() {}
  click() {}
}
const todos = (n, pred, out = []) => { for (const c of n.children) { if (pred(c)) out.push(c); todos(c, pred, out); } return out; };

function abrirPagina(html, almacen = new Map()) {
  const datosTexto = html.split('id="datos-cuestionario">')[1].split("</script>")[0];
  const codigo = html.split("<script>").slice(1).map(t => t.split("</script>")[0]).join("\n");
  const raiz = new Nodo("main"), body = new Nodo("body"), datos = new Nodo("script");
  datos._texto = datosTexto;
  const document = {
    createElement: (t) => new Nodo(t),
    createTextNode: (s) => { const n = new Nodo("#text"); n._texto = String(s); return n; },
    getElementById: (id) => id === "app" ? raiz : id === "datos-cuestionario" ? datos : null,
    body, execCommand: () => false,
  };
  const localStorage = { getItem: k => almacen.get(k) ?? null, setItem: (k, v) => almacen.set(k, String(v)), removeItem: k => almacen.delete(k) };
  new Function("document", "localStorage", "window", "URL", "Blob", "setTimeout", "clearTimeout", codigo)(
    document, localStorage, { confirm: () => true }, { createObjectURL: () => "blob:prueba", revokeObjectURL: () => {} },
    class { constructor(p) { this.p = p; } }, (f) => f(), () => {});
  const seccion = (titulo) => todos(raiz, n => n.tagName === "SECTION").find(s => s.children[0]?.textContent === titulo);
  const control = (dentro, etiqueta, n = 0) => {
    const l = todos(dentro, x => x.tagName === "LABEL" && x.attrs.for && x.textContent === etiqueta)[n];
    return l ? todos(dentro, x => x.attrs.id === l.attrs.for)[0] ?? null : null;
  };
  const escribir = (dentro, etiqueta, v, n = 0) => {
    const c = control(dentro, etiqueta, n);
    if (!c) throw new Error(`No encuentro «${etiqueta}»`);
    c.value = v; c.disparar(c.tagName === "SELECT" ? "change" : "input");
  };
  const pulsar = (dentro, texto) => {
    const b = todos(dentro, x => x.tagName === "BUTTON" && x.textContent === texto)[0];
    if (!b) throw new Error(`No encuentro el botón «${texto}»`);
    b.disparar("click");
  };
  const cabeceras = (dentro) => todos(dentro, x => x.className === "fila-cab").map(x => x.children[0].textContent);
  const descargar = () => {
    pulsar(raiz, "Descargar respuestas");
    return todos(raiz, x => x.tagName === "TEXTAREA" && "readonly" in x.attrs)[0].value;
  };
  return { raiz, seccion, control, escribir, pulsar, cabeceras, descargar, almacen };
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\nCatálogo: qué se le pregunta al cliente");
{
  const leidos = camposQueLeeElMotor();
  const disparan = camposQueDisparanTareas();
  const malos = [];
  for (const e of CUESTIONARIO) {
    const sec = SECTIONS.find(s => s.id === e.seccion);
    if (!sec) { malos.push(`${e.seccion}: la sección no existe`); continue; }
    for (const id of e.campos) {
      const f = sec.fields.find(x => x.id === id);
      const k = `${e.seccion}.${id}`;
      if (!f) { malos.push(`${k}: no existe`); continue; }
      if (!tipoAdmitido(f)) malos.push(`${k}: tipo ${f.type} no va en el cuestionario`);
      if (f.soloSiNo) malos.push(`${k}: es un campo del "no"`);
      const padre = (e.padres ?? []).includes(id);
      if (leidos.has(k) && !(padre && esPadrePermitido(e.seccion, id))) malos.push(`${k}: lo lee el motor`);
      if (disparan.has(k) && !padre) malos.push(`${k}: dispara un aviso de seguridad o de legado`);
    }
    for (const p of e.padres ?? []) if (!e.campos.includes(p)) malos.push(`${e.seccion}.${p}: padre declarado que no se pregunta`);
  }
  es("ningún campo del cuestionario lo lee el motor ni dispara una tarea", malos, []);

  // Todo lo que el catalogo nombra existe en el esquema: una etiqueta, un
  // apartado o una opcion mal escritos fallarian en silencio.
  const nombres = [];
  for (const e of CUESTIONARIO) {
    const sec = SECTIONS.find(s => s.id === e.seccion);
    const campo = (id) => sec.fields.find(f => f.id === id);
    for (const id of Object.keys(e.etiquetas ?? {})) if (!e.campos.includes(id)) nombres.push(`${e.seccion}: etiqueta de ${id}, que no se pregunta`);
    const gruposPreguntados = new Set(e.campos.map(id => campo(id)?.group).filter(Boolean));
    for (const g of Object.keys(e.grupos ?? {})) if (!gruposPreguntados.has(g)) nombres.push(`${e.seccion}: apartado «${g}» sin campos preguntados`);
    for (const [id, textos] of Object.entries(e.textosOpcion ?? {})) {
      for (const o of Object.keys(textos)) if (!(campo(id)?.options ?? []).includes(o)) nombres.push(`${e.seccion}.${id}: opción «${o}» que no existe`);
    }
    for (const id of e.identificar ?? []) if (!campo(id)) nombres.push(`${e.seccion}: identifica por ${id}, que no existe`);
    for (const r of e.ocultarSiFicha ?? []) {
      if (!(campo(r.campo)?.options ?? []).includes(r.valor)) nombres.push(`${e.seccion}.${r.campo}: valor «${r.valor}» que no existe`);
      if (e.campos.includes(r.campo)) nombres.push(`${e.seccion}: oculta según ${r.campo}, que sí se pregunta`);
      for (const id of r.ocultar) if (!e.campos.includes(id)) nombres.push(`${e.seccion}: oculta ${id}, que no se pregunta`);
    }
    if (e.permiteAnadir && !(e.filaNueva && e.textoAnadir && e.textoPrimero)) nombres.push(`${e.seccion}: permite añadir sin decir cómo se llama la fila nueva`);
  }
  es("todo lo que nombra el catálogo existe (etiquetas, apartados, opciones, identificadores)", nombres, []);

  const cat = catalogoCliente();
  es("los campos salen en el orden del formulario de la app", cat.secciones.filter(s => {
    const orden = SECTIONS.find(x => x.id === s.seccion).fields.map(f => f.id);
    return s.campos.some((c, i) => i > 0 && orden.indexOf(c.id) < orden.indexOf(s.campos[i - 1].id));
  }).map(s => s.seccion), []);
  es("ninguna pregunta llega al cliente con una etiqueta que fuera de su sitio no se entiende",
     cat.secciones.flatMap(s => s.campos.filter(c => /^¿Cuál\?$|^Detalle$|\(detalle\)$/i.test(c.label)).map(c => `${s.seccion}.${c.id}`)), []);
  es("el técnico sigue viendo la etiqueta de la app", cat.secciones.every(s => s.campos.every(c =>
    c.labelApp === SECTIONS.find(x => x.id === s.seccion).fields.find(f => f.id === c.id).label)), true);
  es("solo Ordenadores no deja añadir filas (sus filas son grupos que hace el técnico)", cat.secciones.filter(s => !s.permiteAnadir).map(s => s.seccion), ["pcs"]);
  es("las notas de cada sección, donde van los comentarios, no las lee el motor ni disparan tareas",
     CUESTIONARIO.map(e => `${e.seccion}.notas`).filter(k => camposQueLeeElMotor().has(k) || camposQueDisparanTareas().has(k)), []);

  // Un campo que cuelga de una pregunta que NO se hace va con el condicional
  // congelado: sale segun la ficha y el cliente no puede abrirlo.
  const malDep = [];
  for (const s of cat.secciones) for (const c of s.campos) {
    const preguntado = s.campos.some(x => x.id === c.dep?.field);
    if (c.dep && !preguntado && !c.depFijo) malDep.push(`${s.seccion}.${c.id}: cuelga de algo que no se pregunta y no va congelado`);
    if (c.depFijo && c.padre) malDep.push(`${s.seccion}.${c.id}: un padre no puede ir congelado`);
  }
  es("lo que cuelga de una pregunta que no se hace va con el condicional congelado", malDep, []);
  es("hay campos congelados de verdad (marca del firewall, NAS de copias, tenant…)",
     cat.secciones.flatMap(s => s.campos.filter(c => c.depFijo).map(c => `${s.seccion}.${c.id}`)).length >= 7, true);
  es("los datos de empresa existen y no incluyen la fecha de visita ni el responsable",
     [DATOS_EMPRESA.every(id => CAMPOS_CLIENTE.some(c => c.id === id)), DATOS_EMPRESA.includes("fecha"), DATOS_EMPRESA.includes("responsable")], [true, false, false]);
  es("las opciones de «no comprobado» no se le ofrecen al cliente",
     cat.secciones.flatMap(s => s.campos.flatMap(c => c.opciones.map(o => o.v))).filter(v => LITERALES_SIN_COMPROBAR.includes(v)), []);
  es("los campos de fecha se piden como fecha, igual que en la ficha",
     cat.secciones.flatMap(s => s.campos.filter(c => c.tipo === "date").map(c => `${s.seccion}.${c.id}`)),
     ["red.isp_fecha_renovacion", "servidores.garantia", "antivirus.vencimiento", "sai.sai_garantia", "impresion.contrato_vencimiento", "licenciamiento.fecha_renovacion"]);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\nBarrido: nada de lo que conteste el cliente mueve la nota ni las tareas");
{
  const cat = catalogoCliente();
  const valoresDe = (c) => c.tipo === "checks" ? [[], c.opciones.slice(0, 1).map(o => o.v), c.opciones.map(o => o.v)]
    : (c.tipo === "select" || c.tipo === "radio") ? ["", ...c.opciones.map(o => o.v)]
    : c.tipo === "number" ? ["", "0", "7", "250"]
    : c.tipo === "date" ? ["", "2026-01-31"]
    : ["", "Valor de prueba", "</script><img src=x onerror=alert(1)>"];
  let pruebas = 0;
  const distintos = [];
  for (const base of bases) {
    const referencia = firma(base);
    for (const s of cat.secciones) {
      if (base.sectionEnabled[s.seccion] !== "si") continue;
      for (const c of s.campos) {
        if (c.padre) continue;
        for (const v of valoresDe(c)) {
          const e = copia(base);
          const fila = ((e.formData[s.seccion] ??= {})[0] ??= {});
          // Con su pregunta abierta: un valor oculto por su dep no prueba nada.
          if (c.dep) fila[c.dep.field] = c.dep.value;
          const conDep = firma(e);
          fila[c.id] = v;
          pruebas++;
          if (firma(e) !== conDep) distintos.push(`${base.nombre} · ${s.seccion}.${c.id} = ${JSON.stringify(v)}`);
        }
      }
      // Los comentarios del cliente acaban en las notas de la seccion.
      const e = copia(base);
      const fila = ((e.formData[s.seccion] ??= {})[0] ??= {});
      fila.notas = `${fila.notas ?? ""}\nComentario del cliente (Ana, 06/10/2026): tenemos otra cosa`;
      pruebas++;
      if (firma(e) !== referencia) distintos.push(`${base.nombre} · ${s.seccion}.notas`);
    }
    // Abrir el dep de un campo inerte tambien tiene que ser inerte (el padre es inventario).
    const e = copia(base);
    for (const s of cat.secciones) for (const c of s.campos) if (c.dep && !c.padre && e.sectionEnabled[s.seccion] === "si") {
      const padreDef = s.campos.find(x => x.id === c.dep.field);
      if (padreDef && !padreDef.padre) ((e.formData[s.seccion] ??= {})[0] ??= {})[c.dep.field] = c.dep.value;
    }
    if (firma(e) !== referencia) distintos.push(`${base.nombre} · abrir los condicionales de inventario cambia la nota`);
  }
  es(`${pruebas} combinaciones campo × valor × ficha, ninguna cambia la salida del motor ni las tareas`, distintos, []);
  // Control: el barrido tiene que ser capaz de ver un cambio. Si esto fallara,
  // el verde de arriba no significaria nada.
  const control = copia(fichas[0]);
  const antesControl = firma(control);
  control.formData.red[0].rdp_expuesto = "Sí";
  es("control: cambiar un campo que puntúa (RDP expuesto) sí cambia la firma", firma(control) !== antesControl, true);
  const controlTarea = copia(fichas[0]);
  const antesTarea = firma(controlTarea);
  controlTarea.formData.telefonia[0].centralita_acceso = "Sí, pero las tiene el proveedor anterior";
  es("control: un campo que dispara una tarea (y por eso no se pregunta) sí cambia la firma", firma(controlTarea) !== antesTarea, true);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\nEl HTML que recibe el cliente");
{
  const extraerDatos = (html) => JSON.parse(html.split('id="datos-cuestionario">')[1].split("</script>")[0]);
  const scripts = (html) => html.split("<script>").slice(1).map(t => t.split("</script>")[0]);
  const f1 = copia(fichas[0]);
  // El nombre de las fichas de ejemplo lleva "Ex. Ciberscore 98/100": se cambia
  // para que la prueba mire lo que escribe el cuestionario, no el nombre.
  f1.clientData.empresa = "Garrigues Assessors SL";
  const entrada = { ...f1, tecnico: "tecnico@alanait.com", generado: "2026-10-05T10:00:00.000Z", id: "prueba-1", logo: "" };
  const html = construirCuestionario(entrada);
  const datos = extraerDatos(html);
  es("es un documento HTML completo", html.startsWith("<!DOCTYPE html>") && html.includes("</html>"), true);
  es("los datos viajan dentro y se leen tal cual", datos.id === "prueba-1" && datos.secciones.length === CUESTIONARIO.length, true);
  es("no nombra la nota ni el modelo", /ciberscore|puntúa|puntuación|nota global/i.test(html), false);
  const textosAvisos = Object.values(HINTS).flat().map(h => h.texto.slice(0, 50));
  es("no lleva el texto de ningún aviso (hay comerciales internos)", textosAvisos.filter(t => html.includes(t)).length, 0);
  es("no lleva el porqué de ningún criterio", CRITERIOS.filter(c => c.porQue && html.includes(c.porQue.slice(0, 50))).map(c => c.id), []);
  es("ni las etiquetas ni lo pendiente del técnico", ["labelApp", "opcionesApp", "pendiente", "tituloFicha"].filter(k => html.includes(`"${k}"`)), []);
  es("el código de la página es JavaScript válido", scripts(html).every(codigo => { try { new Function(codigo); return true; } catch { return false; } }), true);
  es("no hace ninguna petición de red (sin http en scripts ni estilos)", /https?:\/\//.test(html.replace(/data:image[^"]+/g, "")), false);

  const fp = copia(fichas[0]);
  fp.formData.erp[0].nombre = '</script><img src=x onerror=alert(1)>';
  fp.clientData.empresa = 'Mala <b>empresa</b> & "Cía"';
  const malo = construirCuestionario({ ...fp, generado: "x", id: "y" });
  es("un valor con </script> no cierra el bloque de datos ni se cuela como HTML", malo.includes("</script><img"), false);
  es("y vuelve intacto al leer los datos", extraerDatos(malo).secciones.find(s => s.seccion === "erp").filas[0].valores.nombre, '</script><img src=x onerror=alert(1)>');
  es("el nombre de la empresa va escapado en el título", malo.includes("<b>empresa</b>"), false);

  // Relleno: solo lo vigente.
  const fr = copia(fichas[0]);
  fr.formData.impresion[0].gestion = "No";
  fr.formData.impresion[0].proveedor_gestion = "Fosil SL";
  fr.formData.erp[0].soporte = "No sabe";
  fr.formData.otros_dispositivos = { 0: { marca: "Dato viejo" } };
  const d = datosCuestionario({ ...fr, generado: "x", id: "y" });
  const seccion = (dd, sid) => dd.secciones.find(s => s.seccion === sid);
  const fila = (sid) => seccion(d, sid).filas[0].valores;
  es("un campo oculto por su condicional no se le enseña al cliente", "proveedor_gestion" in fila("impresion"), false);
  es("«No sabe» llega en blanco, para que el cliente lo rellene", "soporte" in fila("erp"), false);
  es("una sección marcada «no» llega sin filas ni datos viejos, con la opción de añadir", [seccion(d, "otros_dispositivos").filas.length, seccion(d, "otros_dispositivos").permiteAnadir], [0, true]);
  es("lo vigente sí llega", fila("erp").nombre, "A3 Asesor");
  es("cada fila que ya existe lleva su nombre y su huella", [seccion(d, "servidores").filas[0].titulo, seccion(d, "servidores").filas[0].huella], ["SRV-DC01", JSON.stringify(["SRV-DC01", ""])]);

  // Lo que la ficha ya descarta no se pregunta.
  const sinSai = copia(fichas[0]);
  sinSai.formData.sai[0].sai_existe = "No";
  sinSai.formData.sai[0].rack_tipo = "Sin armario (equipos sueltos)";
  es("sin SAI ni armario en la ficha, no se pregunta por su marca ni por su tamaño",
     seccion(datosCuestionario({ ...sinSai, generado: "x", id: "y" }), "sai").filas[0].ocultos.sort(),
     ["autonomia", "cantidad", "marca", "protegidos", "rack_us", "sai_garantia", "sai_serial"]);

  // Hallazgo en "no": solo el comentario.
  const sinCopias = copia(fichas[0]);
  sinCopias.sectionEnabled.backup = "no";
  const bk = seccion(datosCuestionario({ ...sinCopias, generado: "x", id: "y" }), "backup");
  es("una sección cuyo «no» es un hallazgo llega sin filas y sin poder añadir", [bk.hallazgo, bk.filas.length, bk.permiteAnadir], [true, 0, false]);

  // Ficha en blanco: filas nuevas donde se puede anadir, la 0 en ordenadores.
  const dv = datosCuestionario({ ...fichaVacia(), generado: "x", id: "y" });
  es("en una ficha en blanco cada sección llega con una fila nueva (ordenadores, con la suya)",
     dv.secciones.map(s => [s.seccion, s.filas.map(f => f.origen)]),
     CUESTIONARIO.map(e => [e.seccion, e.seccion === "pcs" ? [0] : [null]]));
  es("y sin ningún dato", dv.secciones.every(s => s.filas.every(f => Object.keys(f.valores).length === 0)), true);
  const unaVacia = copia(fichas[0]);
  unaVacia.formData.servidores = { 0: {} };
  es("una sección con una única fila vacía se presenta como fila nueva", seccion(datosCuestionario({ ...unaVacia, generado: "x", id: "y" }), "servidores").filas.map(f => f.origen), [null]);
}

// ═══════════════════════════════════════════════════════════════════════════
// Respuesta de ejemplo, con la forma exacta que genera la pagina del cliente.
const respuestaDe = (secciones, empresa = []) => JSON.stringify({
  formato: "alanait-cuestionario-respuestas", version: 1,
  cuestionario: { id: "prueba-1", generado: "2026-10-05T10:00:00.000Z", empresa: "Garrigues" },
  respondido: "2026-10-06T09:00:00.000Z", rellenadoPor: { nombre: "Ana Pérez", cargo: "Administración" },
  empresa, secciones,
});

console.log("\nLeer el fichero que devuelve el cliente");
{
  es("rechaza un fichero vacío", leerRespuestas("").ok, false);
  es("rechaza lo que no es JSON", leerRespuestas("hola").ok, false);
  es("rechaza un JSON de otra cosa", leerRespuestas(JSON.stringify({ formato: "otro" })).ok, false);
  es("rechaza otra versión", leerRespuestas(JSON.stringify({ formato: "alanait-cuestionario-respuestas", version: 99 })).ok, false);
  es("rechaza un fichero enorme", leerRespuestas("x".repeat(TAMANO_MAXIMO + 1)).ok, false);

  const r = leerRespuestas(respuestaDe({
    erp: { comentario: "  Tenemos otro programa  ", filas: [{ origen: 0, campos: [
      { campo: "version", antes: "", valor: "2026.1" },
      { campo: "alojamiento", antes: "", valor: "Servidor propio" },    // señal de contradicción: fuera
      { campo: "tipo", antes: "", valor: "Inventado" },                  // opción que no existe
    ] }] },
    servidores: { filas: [{ origen: 0, campos: [{ campo: "so_soporte", antes: "", valor: "En soporte" }] }] },
    inventada: { filas: [{ origen: 0, campos: [{ campo: "lo_que_sea", antes: "", valor: "x" }] }] },
    red: { filas: [{ origen: 0, campos: [{ campo: "rdp_expuesto", antes: "", valor: "No" }, { campo: "isp_fecha_renovacion", antes: "", valor: "31/12/2026" }] }] },
    licenciamiento: { filas: [{ origen: 0, campos: [{ campo: "titularidad", antes: "", valor: "A nombre del cliente" }] }] },
    ["__proto__"]: { filas: [] },
  }, [{ campo: "telefono", antes: "", valor: "938 000 000" }, { campo: "responsable", antes: "", valor: "Yo" }, { campo: "fecha", antes: "", valor: "2020-01-01" }]));
  es("lee un fichero correcto", r.ok, true);
  const erp = r.datos.secciones.erp;
  es("se queda solo con los campos del catálogo y con valores válidos", erp.filas[0].campos.map(c => c.campo), ["version"]);
  es("el comentario llega limpio", erp.comentario, "Tenemos otro programa");
  es("descarta lo que puntúa de una sección que sí se pregunta (servidores.so_soporte)", "servidores" in r.datos.secciones, false);
  es("y secciones que no existen", "inventada" in r.datos.secciones, false);
  es("descarta un campo que puntúa aunque venga en el fichero (red.rdp_expuesto, titularidad)",
     [r.datos.secciones.red?.filas?.[0]?.campos?.map(c => c.campo) ?? [], "licenciamiento" in r.datos.secciones], [[], false]);
  es("una fecha mal escrita se descarta", (r.datos.secciones.red?.filas ?? []).length, 0);
  es("los datos de empresa solo los permitidos (ni responsable ni fecha)", r.datos.empresa.map(e => e.campo), ["telefono"]);
  es("y lo que descarta lo avisa", r.avisos.length >= 6, true);
  es("un texto larguísimo se recorta", leerRespuestas(respuestaDe({ erp: { filas: [{ origen: 0, campos: [{ campo: "version", antes: "", valor: "x".repeat(5000) }] }] } })).datos.secciones.erp.filas[0].campos[0].valor.length, 500);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\nComparar con la ficha y aplicar lo que acepta el técnico");
{
  const base = copia(fichas[0]);
  base.formData.erp[0].version = "2024";                 // la ficha ya tenia version
  base.clientData.telefono = "";                         // y no tenia telefono
  const estado = estadoDe(base);
  const antesJSON = JSON.stringify(estado);
  const datos = leerRespuestas(respuestaDe({
    erp: { comentario: "", filas: [
      { origen: 0, campos: [
        { campo: "partner", antes: "", valor: "Asesoría Z" },        // rellena un hueco
        { campo: "version", antes: "2024", valor: "2026" },          // cambia lo que no se ha tocado
        { campo: "proveedor", antes: "Otro", valor: "Wolters" },     // la ficha cambio desde el envio
        { campo: "nombre", antes: "A3 Asesor", valor: "" },          // el cliente lo borra
        { campo: "tipo", antes: "ERP", valor: "ERP" },               // no lo ha tocado: no es una respuesta
      ] },
      { origen: null, campos: [{ campo: "nombre", antes: "", valor: "Sage Despachos" }, { campo: "tipo", antes: "", valor: "ERP" }] },
    ] },
    licenciamiento: { filas: [
      { origen: 0, campos: [{ campo: "tipo_servicio", antes: "Dominio", valor: "Hosting web" }, { campo: "coste", antes: "", valor: "12 €/año" }] },
      { origen: null, campos: [
        { campo: "tipo_servicio", antes: "", valor: "Dominio" },
        { campo: "proveedor", antes: "", valor: "DonDominio" },
        { campo: "dominio_dns_gestion", antes: "", valor: "En el propio registrador" },
      ] },
    ] },
    otros_dispositivos: { comentario: "", filas: [{ origen: null, campos: [{ campo: "tipo", antes: "", valor: "TPV" }, { campo: "marca", antes: "", valor: "Ingenico" }] }] },
    impresion: { filas: [{ origen: 0, yaNoExiste: true, campos: [] }] },
  }, [{ campo: "telefono", antes: "", valor: "938 000 000" }])).datos;

  const cmp = compararRespuestas(datos, estado);
  const prop = (sid, campo) => cmp.secciones.find(s => s.seccion === sid)?.propuestas.find(p => p.campo === campo);
  // Con el telefono que trae la ficha de ejemplo, la misma respuesta es un
  // conflicto y no se preselecciona.
  const conTelefono = compararRespuestas(datos, { ...estado, clientData: fichas[0].clientData }).empresa.find(p => p.campo === "telefono");
  es("un dato de empresa que la ficha ya tiene distinto: conflicto, sin preseleccionar", [conTelefono.estado, conTelefono.preseleccionada], ["conflicto", false]);
  es("rellenar un hueco: preseleccionado", [prop("erp", "partner").estado, prop("erp", "partner").preseleccionada], ["rellena", true]);
  es("cambiar lo que nadie tocó: lo decide el técnico", [prop("erp", "version").estado, prop("erp", "version").preseleccionada], ["cambia", false]);
  es("si la ficha cambió desde el envío: conflicto", [prop("erp", "proveedor").estado, prop("erp", "proveedor").preseleccionada], ["conflicto", false]);
  es("lo que el cliente borra no se aplica nunca", [prop("erp", "nombre").estado, prop("erp", "nombre").aplicable], ["vaciado", false]);
  es("lo que el cliente no tocó no se ofrece", prop("erp", "tipo"), undefined);
  es("el técnico ve la etiqueta y el nombre de fila de la ficha", [prop("erp", "partner").etiqueta, prop("erp", "partner").fila], ["Partner / Implantador", "Programa: A3 Asesor"]);
  es("el tipo de un servicio que ya existe es solo referencia", [prop("licenciamiento", "tipo_servicio").estado, prop("licenciamiento", "tipo_servicio").aplicable], ["referencia", false]);
  es("«ya no lo tenemos» llega como información", cmp.secciones.find(s => s.seccion === "impresion").infos.length, 1);
  const nuevas = (sid) => cmp.secciones.find(s => s.seccion === sid).filasNuevas;
  es("una fila nueva sin criterios va preseleccionada; en servicios contratados no",
     [nuevas("erp")[0].preseleccionada, nuevas("licenciamiento")[0].preseleccionada], [true, false]);
  es("y se nombra por lo que la identifica", nuevas("erp")[0].titulo, "Programa nuevo: Sage Despachos");

  // Aplicar lo preseleccionado y nada mas.
  const sel = seleccionInicial(cmp);
  const r = aplicarRespuestas(estado, datos, sel, { ahora: "2026-10-06T10:00:00.000Z" });
  es("aplica lo que rellena huecos", [r.formData.erp[0].partner, r.clientData.telefono], ["Asesoría Z", "938 000 000"]);
  es("no toca lo que no se marcó", [r.formData.erp[0].version, r.formData.erp[0].proveedor, r.formData.erp[0].nombre], ["2024", "Wolters Kluwer", "A3 Asesor"]);
  es("añade la aplicación nueva", [r.instanceCounts.erp, r.formData.erp[1]?.nombre], [2, "Sage Despachos"]);
  es("no añade el servicio nuevo sin marcarlo", r.instanceCounts.licenciamiento ?? 1, 1);
  es("una sección marcada «no» no se toca sin marcarla «Sí»", [r.sectionEnabled.otros_dispositivos, r.formData.otros_dispositivos?.[0]?.tipo ?? null], ["no", null]);
  es("y se dice por qué no se aplicó", r.resumen.omitidos.some(o => o.motivo.includes("«Sí»")), true);
  es("no modifica el estado de entrada", JSON.stringify(estado), antesJSON);
  es("un hueco de un servicio existente también se rellena (el coste)", r.formData.licenciamiento[0].coste, "12 €/año");
  const imp = r.formData.__cliente__.importaciones;
  es("deja constancia sin índices de instancia: quién, cargo, 3 datos, 1 fila y lo que ya no tienen",
     imp.map(i => [i.campos, i.filas, i.rellenadoPor, i.cargo, i.yaNoExiste]), [[3, 1, "Ana Pérez", "Administración", ["Sistemas de impresión · Impresora: Kyocera TASKalfa 3253ci"]]]);

  // La nota no cambia con nada de eso.
  const notaAntes = JSON.stringify(puntuar({ ...base }));
  es("lo aplicado no mueve la salida del motor", JSON.stringify(puntuar({ ...base, ...r, clientData: r.clientData })), notaAntes);

  // Marcando lo demas a mano.
  const sel2 = seleccionInicial(cmp);
  sel2.claves.add(prop("erp", "version").clave);
  sel2.claves.add(prop("licenciamiento", "tipo_servicio").clave);       // aunque se marque, es referencia
  sel2.marcarSi.add("otros_dispositivos");
  const filaServicio = nuevas("licenciamiento")[0].clave;
  sel2.filas.add(filaServicio);
  const r2 = aplicarRespuestas(estado, datos, sel2, { ahora: "x" });
  es("el técnico puede aceptar un cambio marcándolo", r2.formData.erp[0].version, "2026");
  es("el tipo de un servicio existente no cambia aunque se marque", r2.formData.licenciamiento[0].tipo_servicio, "Dominio");
  es("marcar «Sí» abre la sección y la fila nueva aprovecha su primera fila vacía", [r2.sectionEnabled.otros_dispositivos, r2.instanceCounts.otros_dispositivos ?? 1, r2.formData.otros_dispositivos[0].tipo], ["si", 1, "TPV"]);
  es("servicio nuevo sin aceptar su tipo: se añade sin tipo y sin lo que cuelga de él",
     [r2.instanceCounts.licenciamiento, r2.formData.licenciamiento[1].proveedor, r2.formData.licenciamiento[1].tipo_servicio ?? "", r2.formData.licenciamiento[1].dominio_dns_gestion ?? ""], [2, "DonDominio", "", ""]);

  const sel3 = seleccionInicial(cmp);
  sel3.filas.add(filaServicio);
  sel3.padres.add(`${filaServicio}.tipo_servicio`);
  const r3 = aplicarRespuestas(estado, datos, sel3, { ahora: "x" });
  es("aceptando el tipo, se aplica y abre lo que cuelga de él", [r3.formData.licenciamiento[1].tipo_servicio, r3.formData.licenciamiento[1].dominio_dns_gestion], ["Dominio", "En el propio registrador"]);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\nHuecos, comentarios y lo que cuelga de otra respuesta");
{
  // "No sabe" en la ficha es un hueco: lo que diga el cliente lo rellena.
  const ns = copia(fichas[0]);
  ns.formData.erp[0].soporte = "No sabe";
  const dNs = leerRespuestas(respuestaDe({ erp: { filas: [{ origen: 0, huella: JSON.stringify(["A3 Asesor"]), campos: [{ campo: "soporte", antes: "", valor: "Sí" }] }] } })).datos;
  const pNs = compararRespuestas(dNs, estadoDe(ns)).secciones[0].propuestas[0];
  es("un «No sabe» de la ficha cuenta como hueco: rellena, preseleccionado", [pNs.estado, pNs.preseleccionada], ["rellena", true]);

  // La empresa de mantenimiento cuelga de "¿tiene contrato?".
  const sinContrato = copia(fichas[0]);
  sinContrato.formData.impresion[0].gestion = "No";
  const dImp = leerRespuestas(respuestaDe({ impresion: { filas: [{ origen: 0, huella: JSON.stringify(["Kyocera TASKalfa 3253ci", ""]), campos: [
    { campo: "gestion", antes: "No", valor: "Sí" }, { campo: "proveedor_gestion", antes: "", valor: "Ricoh" },
  ] }] } })).datos;
  const cImp = compararRespuestas(dImp, estadoDe(sinContrato));
  const pp = (campo) => cImp.secciones[0].propuestas.find(p => p.campo === campo);
  es("un dato que cuelga de un cambio sin marcar no va preseleccionado y dice de qué cuelga",
     [pp("proveedor_gestion").preseleccionada, pp("proveedor_gestion").requiere?.etiqueta], [false, "¿Gestión/contrato de mantenimiento?"]);
  const soloHijo = seleccionInicial(cImp);
  soloHijo.claves.add(pp("proveedor_gestion").clave);
  const rHijo = aplicarRespuestas(estadoDe(sinContrato), dImp, soloHijo, { ahora: "x" });
  es("y sin su respuesta no se aplica (quedaría oculto)", [rHijo.formData.impresion[0].proveedor_gestion ?? "", rHijo.resumen.omitidos[0]?.motivo], ["", "Necesita aceptar también «¿Gestión/contrato de mantenimiento?»."]);
  soloHijo.claves.add(pp("gestion").clave);
  const rAmbos = aplicarRespuestas(estadoDe(sinContrato), dImp, soloHijo, { ahora: "x" });
  es("con las dos, se aplican las dos", [rAmbos.formData.impresion[0].gestion, rAmbos.formData.impresion[0].proveedor_gestion], ["Sí", "Ricoh"]);

  // Comentarios: a las notas de la seccion, sin pisar lo que hay.
  const conNotas = copia(fichas[0]);
  conNotas.formData.wifi[0].notas = "Revisar el AP del almacén";
  const dCom = leerRespuestas(respuestaDe({ wifi: { comentario: "Hay un repetidor en el almacén", filas: [] }, backup: { comentario: "Ahora usamos Veeam", filas: [] } })).datos;
  const sinCopias = copia(conNotas);
  sinCopias.sectionEnabled.backup = "no";
  const cCom = compararRespuestas(dCom, estadoDe(sinCopias));
  const com = (sid) => cCom.secciones.find(s => s.seccion === sid).comentario;
  es("el comentario de una sección va preseleccionado; el de un hallazgo en «no», solo se lee",
     [com("wifi").preseleccionada, com("backup").aplicable], [true, false]);
  const rCom = aplicarRespuestas(estadoDe(sinCopias), dCom, seleccionInicial(cCom), { ahora: "x" });
  es("se añade a las notas, con quién y cuándo, sin borrar lo que había",
     rCom.formData.wifi[0].notas, "Revisar el AP del almacén\nComentario del cliente (Ana Pérez, 06/10/2026): Hay un repetidor en el almacén");
  es("y queda contado en la constancia", rCom.formData.__cliente__.importaciones[0].comentarios, 1);
  es("en la sección del hallazgo no se escribe nada", JSON.stringify(rCom.formData.backup), JSON.stringify(sinCopias.formData.backup));

  // Una fila nueva que se llama igual que una que ya esta: puede ser la misma.
  const dDup = leerRespuestas(respuestaDe({ erp: { filas: [{ origen: null, campos: [{ campo: "nombre", antes: "", valor: "A3 Asesor" }] }] } })).datos;
  const fDup = compararRespuestas(dDup, estadoDe(fichas[0])).secciones[0].filasNuevas[0];
  es("una fila nueva con el nombre de una que ya está no se preselecciona", [fDup.parecida, fDup.preseleccionada], ["Programa: A3 Asesor", false]);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\nCada fila vuelve a su fila aunque la ficha cambie mientras tanto");
{
  const dos = copia(fichas[0]);
  dos.formData.impresion = { 0: { marca: "Kyocera TASKalfa 3253ci", gestion: "Sí" }, 1: { marca: "HP LaserJet M404", ubicacion: "Recepción" } };
  dos.instanceCounts = { impresion: 2 };
  const huellaHP = datosCuestionario({ ...dos, generado: "x", id: "y" }).secciones.find(s => s.seccion === "impresion").filas[1].huella;
  const dHP = leerRespuestas(respuestaDe({ impresion: { filas: [{ origen: 1, huella: huellaHP, titulo: "HP LaserJet M404 · Recepción", campos: [
    { campo: "marca", antes: "HP LaserJet M404", valor: "HP LaserJet M404" }, { campo: "ubicacion", antes: "Recepción", valor: "Recepción" },
    { campo: "consumibles", antes: "", valor: "CF259A" },
  ] }] } })).datos;

  // El tecnico borra la Kyocera: la HP pasa a ser la fila 0.
  const borrada = copia(dos);
  borrada.formData.impresion = { 0: dos.formData.impresion[1] };
  borrada.instanceCounts = { impresion: 1 };
  const cB = compararRespuestas(dHP, estadoDe(borrada));
  es("si se borra la fila de delante, la respuesta sigue a su impresora", cB.secciones[0].propuestas.map(p => p.clave), ["impresion@0.consumibles"]);
  const rB = aplicarRespuestas(estadoDe(borrada), dHP, seleccionInicial(cB), { ahora: "x" });
  es("y se aplica en ella", [rB.formData.impresion[0].marca, rB.formData.impresion[0].consumibles], ["HP LaserJet M404", "CF259A"]);

  // El tecnico cambia la fila 1 por otra impresora: ya no es la misma.
  const cambiada = copia(dos);
  cambiada.formData.impresion[1] = { marca: "Brother HL-L2350", ubicacion: "Almacén" };
  const cC = compararRespuestas(dHP, estadoDe(cambiada));
  es("si en su sitio ahora hay otra, no se aplica encima: se ofrece como fila nueva",
     [cC.secciones[0].propuestas.length, cC.secciones[0].filasNuevas[0]?.titulo, cC.secciones[0].infos.length], [0, "Impresora nueva: HP LaserJet M404 · Recepción", 1]);
  es("y la fila nueva lleva la fila entera, no solo lo cambiado", cC.secciones[0].filasNuevas[0]?.campos.map(c => c.campo), ["marca", "ubicacion", "consumibles"]);

  // Dos filas sin nada que las identifique: solo valen en su sitio.
  const anonimas = copia(fichas[0]);
  anonimas.formData.impresion = { 0: { tipo: "Láser B/N" }, 1: { tipo: "Inkjet" } };
  anonimas.instanceCounts = { impresion: 2 };
  const hAnon = datosCuestionario({ ...anonimas, generado: "x", id: "y" }).secciones.find(s => s.seccion === "impresion").filas[0].huella;
  const dAnon = leerRespuestas(respuestaDe({ impresion: { filas: [{ origen: 0, huella: hAnon, campos: [{ campo: "consumibles", antes: "", valor: "TN-2420" }] }] } })).datos;
  const movida = copia(anonimas);
  movida.formData.impresion = { 0: { marca: "Ricoh", tipo: "Láser B/N" }, 1: { tipo: "Inkjet" } };
  es("una fila sin nombre que ya no está en su sitio no se busca en otra (se ofrece nueva)",
     [compararRespuestas(dAnon, estadoDe(movida)).secciones[0].propuestas.length, compararRespuestas(dAnon, estadoDe(movida)).secciones[0].filasNuevas.length], [0, 1]);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\nCondicional congelado, servidores nuevos y hallazgos en «No»");
{
  // Marca del firewall: solo si la ficha dice que hay firewall.
  const sinFw = copia(fichas[0]);
  sinFw.formData.red[0].firewall = "No";
  const filaRed = (f) => datosCuestionario({ ...f, generado: "x", id: "y" }).secciones.find(s => s.seccion === "red").filas[0];
  es("sin firewall en la ficha, la marca del firewall no se le pregunta", filaRed(sinFw).ocultos.includes("firewall_marca"), true);
  es("con firewall, sí, y viene rellena", [filaRed(fichas[0]).ocultos.includes("firewall_marca"), !!filaRed(fichas[0]).valores.firewall_marca], [false, true]);

  // Un fichero manipulado que trae la marca del firewall de un cliente sin firewall.
  const trucado = leerRespuestas(respuestaDe({ red: { filas: [{ origen: 0, campos: [{ campo: "firewall_marca", antes: "", valor: "Fortinet" }] }] } })).datos;
  const pFw = compararRespuestas(trucado, estadoDe(sinFw)).secciones.find(s => s.seccion === "red").propuestas[0];
  es("y si llega igualmente, no se aplica: su pregunta no está abierta", [pFw.estado, pFw.aplicable], ["referencia", false]);

  // Si la ficha aun no dice si hay firewall, se pregunta igual y va a las notas.
  const fwSinContestar = copia(fichas[0]);
  fwSinContestar.formData.red[0].firewall = "";
  es("con la pregunta del firewall sin contestar, su marca se pregunta igual", filaRed(fwSinContestar).ocultos.includes("firewall_marca"), false);
  const cFw = compararRespuestas(trucado, estadoDe(fwSinContestar));
  const pAnota = cFw.secciones.find(s => s.seccion === "red").propuestas[0];
  es("y lo que diga el cliente va a las notas, preseleccionado", [pAnota.estado, pAnota.preseleccionada], ["anota", true]);
  const rFw = aplicarRespuestas(estadoDe(fwSinContestar), trucado, seleccionInicial(cFw), { ahora: "x" });
  es("a las notas y no al campo: ni la marca ni la pregunta del firewall cambian",
     [(rFw.formData.red[0].notas ?? "").endsWith("pendiente de comprobar en la visita: Marca/Modelo Firewall: Fortinet"), rFw.formData.red[0].firewall_marca ?? "", rFw.formData.red[0].firewall, rFw.resumen.anotados],
     [true, fichas[0].formData.red[0].firewall_marca ?? "", "", 1]);
  es("y la nota no se mueve", JSON.stringify(puntuar({ ...fwSinContestar, ...rFw })), JSON.stringify(puntuar(fwSinContestar)));

  // Servidor nuevo: tipo y sistema solo con marca explicita, y lo que cuelga del tipo detras.
  const datosSrv = leerRespuestas(respuestaDe({ servidores: { filas: [{ origen: null, campos: [
    { campo: "nombre", antes: "", valor: "SRV-NUEVO" },
    { campo: "tipo", antes: "", valor: "Físico" },
    { campo: "serial", antes: "", valor: "CZJ999" },
    { campo: "so_familia", antes: "", valor: "Windows Server" },
  ] }] } })).datos;
  const est = estadoDe(fichas[0]);
  const cmpS = compararRespuestas(datosSrv, est);
  const filaS = cmpS.secciones.find(s => s.seccion === "servidores").filasNuevas[0];
  es("un servidor nuevo no va preseleccionado (deja comprobaciones pendientes)", filaS.preseleccionada, false);
  es("y el técnico ve qué queda pendiente", cmpS.secciones.find(s => s.seccion === "servidores").pendiente, "su sistema operativo, el parcheo, el RAID, la garantía y los accesos");
  es("lo que cuelga del tipo va aparte", filaS.campos.filter(c => c.cuelgaDePadre).map(c => c.campo), ["serial"]);
  const selS = seleccionInicial(cmpS);
  selS.filas.add(filaS.clave);
  const sinTipo = aplicarRespuestas(est, datosSrv, selS, { ahora: "x" });
  const nS = (r) => (r.instanceCounts.servidores ?? 1) - 1;
  es("sin aceptar su tipo, se añade sin tipo, sin sistema y sin lo que cuelga del tipo",
     [sinTipo.formData.servidores[nS(sinTipo)].nombre, sinTipo.formData.servidores[nS(sinTipo)].tipo ?? "", sinTipo.formData.servidores[nS(sinTipo)].serial ?? ""], ["SRV-NUEVO", "", ""]);
  selS.padres.add(`${filaS.clave}.tipo`);
  selS.padres.add(`${filaS.clave}.so_familia`);
  const conTipo = aplicarRespuestas(est, datosSrv, selS, { ahora: "x" });
  const srv = conTipo.formData.servidores[nS(conTipo)];
  es("aceptando tipo y sistema, se aplican y abren lo suyo", [srv.tipo, srv.so_familia, srv.serial], ["Físico", "Windows Server", "CZJ999"]);
  const antesS = puntuar(fichas[0]), despuesS = puntuar({ ...fichas[0], ...conTipo });
  es("un servidor nuevo no sube la nota: deja sin comprobar lo que puntúa de él", (despuesS.nota ?? 0) <= (antesS.nota ?? 0), true);

  // Hallazgo en "No": las copias. El cuestionario no puede quitarlo.
  const sinBackup = copia(fichas[0]);
  sinBackup.sectionEnabled.backup = "no";
  const datosBk = leerRespuestas(respuestaDe({ backup: { filas: [{ origen: null, campos: [{ campo: "software", antes: "", valor: "Nakivo" }, { campo: "retencion", antes: "", valor: "30 días" }] }] } })).datos;
  const cmpB = compararRespuestas(datosBk, estadoDe(sinBackup));
  const secB = cmpB.secciones.find(s => s.seccion === "backup");
  es("una sección «No» que es hallazgo crítico no se ofrece marcar «Sí»", [secB.marcarSiPermitido, secB.infos.some(t => t.includes("hallazgo crítico"))], [false, true]);
  const selB = seleccionInicial(cmpB);
  selB.marcarSi.add("backup");                                   // aunque lo intente
  for (const p of secB.propuestas) selB.claves.add(p.clave);
  for (const f of secB.filasNuevas) selB.filas.add(f.clave);
  const rB = aplicarRespuestas(estadoDe(sinBackup), datosBk, selB, { ahora: "x" });
  es("y aunque se intente, ni se marca «Sí» ni se aplica nada",
     [rB.sectionEnabled.backup, JSON.stringify(rB.formData.backup) === JSON.stringify(sinBackup.formData.backup), rB.resumen.campos + rB.resumen.filas], ["no", true, 0]);
  es("la nota no cambia", JSON.stringify(puntuar({ ...sinBackup, ...rB })), JSON.stringify(puntuar(sinBackup)));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\nLa página del cliente, de punta a punta (DOM mínimo)");
{
  const f1 = copia(fichas[0]);
  f1.clientData.empresa = "Garrigues Assessors SL";
  const html1 = construirCuestionario({ ...f1, tecnico: "tecnico@alanait.com", generado: "2026-10-05T10:00:00.000Z", id: "e2e-1", logo: "" });
  const p = abrirPagina(html1);
  const srv = p.seccion("Servidores"), red = p.seccion("Internet y red");
  es("la fila que ya existe se nombra por lo que la identifica", p.cabeceras(srv), ["Servidor: SRV-DC01"]);
  es("los ordenadores se nombran por su sistema, aunque no se pregunte", p.cabeceras(p.seccion("Ordenadores")), ["Grupo de ordenadores: Windows 11"]);
  es("el tipo de servidor que ya está en la ficha se enseña fijo, no se cambia",
     [p.control(srv, "Tipo de servidor"), todos(srv, x => x.className === "fijo").map(x => x.textContent)], [null, ["Virtual", "Windows Server"]]);
  es("lo que cuelga del tipo sigue al tipo de la ficha (virtual: plataforma sí, nº de serie no)",
     [!!p.control(srv, "Plataforma de virtualización"), p.control(srv, "Nº de serie")], [true, null]);
  es("con más de un apartado, sus rótulos; con uno, ninguno",
     [todos(red, x => x.className === "grupo").map(x => x.textContent), todos(p.seccion("Ordenadores"), x => x.className === "grupo").length], [["Conexión", "Equipos de red"], 0]);
  es("la pregunta del antispam se entiende sola", [!!p.control(p.seccion("Correo electrónico"), "¿Qué antispam o filtro de correo usan?"), todos(p.raiz, x => x.tagName === "LABEL" && x.textContent === "¿Cuál?").length], [true, 0]);
  es("los roles del servidor, en castellano", todos(srv, x => x.className === "check").some(x => x.textContent.trim() === "Controlador de dominio"), true);
  es("en Ordenadores no hay «Ya no lo tenemos»: se corrigen los números", todos(p.seccion("Ordenadores"), x => x.className === "ya").length, 0);
  es("una fila sin nada que la identifique, pero que se puede retirar, dice qué es", p.cabeceras(p.seccion("Armario de comunicaciones y SAI")), ["Armario"]);

  // Seccion en "no": nada escrito, y lo que se anada se puede quitar.
  const otros = p.seccion("Otros dispositivos");
  es("en una sección en «no», el botón no dice «otro»", todos(otros, x => x.tagName === "BUTTON").map(x => x.textContent), ["+ Añadir un aparato"]);
  p.pulsar(otros, "+ Añadir un aparato");
  es("lo añadido se puede quitar", p.cabeceras(p.seccion("Otros dispositivos")), ["Aparato"]);
  p.pulsar(p.seccion("Otros dispositivos"), "Quitar");
  es("y se quita", todos(p.seccion("Otros dispositivos"), x => x.className.startsWith("fila")).length, 0);

  // El cliente contesta.
  const erp = p.seccion("Aplicaciones de negocio");
  p.escribir(erp, "Versión", "2026.1");
  const imp = p.seccion("Impresoras");
  p.pulsar(imp, "+ Añadir otra impresora");
  const imp2 = p.seccion("Impresoras");
  p.escribir(imp2, "Marca y modelo", "HP LaserJet M404", 1);
  p.escribir(imp2, "¿Dónde está?", "Recepción", 1);
  es("la impresora nueva se distingue de la que ya estaba", p.cabeceras(imp2), ["Impresora: Kyocera TASKalfa 3253ci", "Impresora nueva"]);
  p.escribir(p.seccion("WiFi"), "¿Algo más que debamos saber de esto?", "Hay un repetidor en el almacén");
  const ya = todos(p.seccion("Telefonía"), x => x.className === "ya")[0].children[0];
  ya.checked = true; ya.disparar("change");
  p.escribir(p.raiz, "Su nombre", "Ana Pérez");
  p.escribir(p.raiz, "Su cargo", "Administración");
  const texto = p.descargar();
  const crudo = JSON.parse(texto);
  const filaErp = crudo.secciones.erp.filas[0];
  const yaEscritos = Object.keys(datosCuestionario({ ...f1, generado: "x", id: "y" }).secciones.find(s => s.seccion === "erp").filas[0].valores);
  es("de la fila que cambia van todos sus datos, con su huella",
     [filaErp.origen, filaErp.huella, filaErp.campos.map(c => c.campo)],
     [0, JSON.stringify(["A3 Asesor"]), catalogoCliente().secciones.find(s => s.seccion === "erp").campos.map(c => c.id).filter(id => yaEscritos.includes(id) || id === "version")]);
  es("la impresora nueva va como fila nueva", crudo.secciones.impresion.filas.map(f => [f.origen, f.campos.map(c => c.valor)]), [[null, ["HP LaserJet M404", "Recepción"]]]);
  es("«ya no lo tenemos» y el comentario viajan", [crudo.secciones.telefonia.filas[0].yaNoExiste, crudo.secciones.wifi.comentario], [true, "Hay un repetidor en el almacén"]);

  // Y lo importa el tecnico.
  const leido = leerRespuestas(texto);
  const cmp = compararRespuestas(leido.datos, estadoDe(f1));
  const r = aplicarRespuestas(estadoDe(f1), leido.datos, seleccionInicial(cmp), { ahora: "x" });
  es("al importarlo se aplica lo preseleccionado: la versión, la impresora y el comentario",
     [r.formData.erp[0].version, r.instanceCounts.impresion, r.formData.impresion[1].marca, r.formData.wifi[0].notas.startsWith("Comentario del cliente (Ana Pérez, ")], ["2026.1", 2, "HP LaserJet M404", true]);
  es("sin tocar la nota", JSON.stringify(puntuar({ ...f1, ...r })), JSON.stringify(puntuar(f1)));
  es("y sin avisos de datos descartados", leido.avisos, []);

  // Lo escrito se recupera al volver a abrirlo en el mismo ordenador.
  const otra = abrirPagina(html1, p.almacen);
  es("al volver a abrirlo, recupera lo escrito", [todos(otra.raiz, x => x.className === "recuperado").length, otra.control(otra.seccion("Aplicaciones de negocio"), "Versión").value], [1, "2026.1"]);

  // Ficha en blanco: el cliente lo cuenta todo desde cero.
  const vacia = fichaVacia();
  const pv = abrirPagina(construirCuestionario({ ...vacia, generado: "x", id: "e2e-2", logo: "" }));
  const sv = pv.seccion("Servidores");
  es("en blanco, una fila por sección y sin cabecera: no hay nada que distinguir", [pv.cabeceras(sv), pv.cabeceras(pv.seccion("Ordenadores"))], [[], []]);
  es("y el tipo de servidor se puede elegir", !!pv.control(sv, "Tipo de servidor"), true);
  pv.escribir(sv, "Nombre del servidor", "SRV01");
  pv.escribir(sv, "Tipo de servidor", "Virtual");
  const sv2 = pv.seccion("Servidores");
  es("y al elegir «Virtual» aparece lo suyo", [!!pv.control(sv2, "Plataforma de virtualización"), pv.control(sv2, "Nº de serie")], [true, null]);
  pv.escribir(sv2, "Plataforma de virtualización", "Hyper-V");
  pv.escribir(pv.seccion("Ordenadores"), "Número aproximado de ordenadores", "12");
  const redv = pv.seccion("Internet y red");
  es("en blanco también se pregunta el firewall", !!pv.control(redv, "Marca y modelo del firewall"), true);
  pv.escribir(redv, "Operador de Internet", "Movistar");
  pv.escribir(redv, "Marca y modelo del firewall", "FortiGate 40F");
  const lv = leerRespuestas(pv.descargar());
  const cv = compararRespuestas(lv.datos, estadoDe(vacia));
  const sel = seleccionInicial(cv);
  const filaSrv = cv.secciones.find(s => s.seccion === "servidores").filasNuevas[0];
  sel.filas.add(filaSrv.clave);
  sel.padres.add(`${filaSrv.clave}.tipo`);
  sel.marcarSi.add("servidores"); sel.marcarSi.add("pcs");
  const rv = aplicarRespuestas(estadoDe(vacia), lv.datos, sel, { ahora: "x" });
  es("al importarlo, el servidor entra en la primera fila con su tipo y lo que cuelga de él",
     [rv.instanceCounts.servidores ?? 1, rv.formData.servidores[0].nombre, rv.formData.servidores[0].tipo, rv.formData.servidores[0].hipervisor], [1, "SRV01", "Virtual", "Hyper-V"]);
  es("y los ordenadores, en su fila", rv.formData.pcs[0].cantidad, "12");
  const filaRedv = cv.secciones.find(s => s.seccion === "red").filasNuevas[0];
  const selRed = seleccionInicial(cv);
  selRed.filas.add(filaRedv.clave);
  selRed.marcarSi.add("red");
  const rRed = aplicarRespuestas(estadoDe(vacia), lv.datos, selRed, { ahora: "x" });
  es("el firewall que da el cliente queda en las notas de su red, no en el campo",
     [rRed.formData.red[0].isp, (rRed.formData.red[0].notas ?? "").endsWith("pendiente de comprobar en la visita: Marca/Modelo Firewall: FortiGate 40F"), rRed.formData.red[0].firewall_marca ?? ""],
     ["Movistar", true, ""]);

  // Hallazgo en "no" y lo que la ficha descarta.
  const raro = copia(f1);
  raro.sectionEnabled.backup = "no";
  raro.formData.sai[0].sai_existe = "No";
  const pr = abrirPagina(construirCuestionario({ ...raro, generado: "x", id: "e2e-3", logo: "" }));
  const bk = pr.seccion("Copias de seguridad");
  es("una sección cuyo «no» es un hallazgo: la nota y el comentario, nada más",
     [todos(bk, x => x.className === "nota-seccion").length, todos(bk, x => x.tagName === "INPUT" || x.tagName === "SELECT").length, todos(bk, x => x.tagName === "BUTTON").length], [1, 0, 0]);
  es("sin SAI en la ficha, no se pregunta su marca", pr.control(pr.seccion("Armario de comunicaciones y SAI"), "Marca y modelo del SAI"), null);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\nLo que trae el cliente nunca sube la nota ni da el sello");
{
  const resultados = [];
  for (const f of [...fichas, fichaVacia()]) {
    const estado = estadoDe(f);
    // Todo lo que el cuestionario permite, aceptado de golpe: cada campo con un
    // valor y una fila nueva por seccion, tipos incluidos, y las secciones
    // marcadas "si".
    const cat = catalogoCliente();
    const secciones = {};
    for (const s of cat.secciones) {
      const valor = (c) => c.tipo === "checks" ? [c.opciones[0].v] : (c.tipo === "select" || c.tipo === "radio") ? c.opciones[c.opciones.length - 1].v : c.tipo === "number" ? "3" : c.tipo === "date" ? "2027-01-01" : "Dato del cliente";
      const filas = [{ origen: 0, campos: s.campos.map(c => ({ campo: c.id, antes: "", valor: valor(c) })) }];
      if (s.permiteAnadir) filas.push({ origen: null, campos: s.campos.map(c => ({ campo: c.id, antes: "", valor: valor(c) })) });
      secciones[s.seccion] = { comentario: "Comentario de prueba", filas };
    }
    const datos = leerRespuestas(respuestaDe(secciones)).datos;
    const cmp = compararRespuestas(datos, estado);
    const preseleccion = aplicarRespuestas(estado, datos, seleccionInicial(cmp), { ahora: "x" });
    const sel = seleccionInicial(cmp);
    for (const s of cmp.secciones) {
      sel.marcarSi.add(s.seccion);
      for (const p of s.propuestas) sel.claves.add(p.clave);
      for (const fn of s.filasNuevas) { sel.filas.add(fn.clave); for (const c of fn.campos) if (c.padre) sel.padres.add(`${fn.clave}.${c.campo}`); }
    }
    const r = aplicarRespuestas(estado, datos, sel, { ahora: "x" });
    const antes = puntuar(f), despues = puntuar({ ...f, ...r }), soloPre = puntuar({ ...f, ...preseleccion });
    resultados.push({ ficha: f.nombre, sube: (despues.nota ?? 0) > (antes.nota ?? 0) || (soloPre.nota ?? 0) > (antes.nota ?? 0), sello: !antes.fiable && soloPre.fiable });
  }
  es("en las 5 fichas y en una en blanco, aceptándolo todo, la nota no sube; con lo preseleccionado, tampoco aparece el sello",
     resultados.filter(x => x.sube || x.sello).map(x => x.ficha), []);
}

console.log(`\n${ok} correctas, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);
