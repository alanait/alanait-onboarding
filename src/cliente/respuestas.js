// Respuestas del cuestionario del cliente: leer, comparar con la ficha y
// aplicar lo que acepte el tecnico. Funciones puras, sin React ni red.
//
// TRES REGLAS, y las tres se comprueban aqui aunque la pantalla ya las cumpla:
//   1. Lo que dice el cliente nunca entra solo en la ficha. Se preselecciona
//      solo lo que rellena un hueco; lo que cambia algo ya escrito lo marca el
//      tecnico uno a uno.
//   2. Nada de lo que lee el motor del CiberScore se aplica desde el fichero
//      (catalogo.js). Un fichero manipulado que traiga "red.rdp_expuesto" o
//      "servidores.so_soporte" se descarta al leerlo y otra vez al aplicar.
//   3. Nunca se borra nada: ni un campo, ni una instancia, ni el si/no de una
//      seccion. Si el cliente vacia un dato o dice que algo ya no existe, se le
//      ensena al tecnico como informacion y lo decide el en la ficha.
//
// Las filas se emparejan por su HUELLA (los datos que la identifican en la
// ficha cuando se envio el cuestionario), no solo por su numero: si el tecnico
// borra la impresora 2 mientras el cuestionario esta fuera, lo que el cliente
// conteste de la impresora 3 no puede caer en la que ahora ocupa el sitio 2.

import { lectorEfectivo } from "../sections.js";
import {
  catalogoCliente, camposQueLeeElMotor, esPadrePermitido, esHallazgoSiNo, identificadorFila, instanciaVacia,
  huellaConDatos, valorFicha, DATOS_EMPRESA, VERSION_CUESTIONARIO,
} from "./catalogo.js";
import { CRITERIOS } from "../score/criterios.js";

export const TAMANO_MAXIMO = 1_000_000;
const LARGO_MAXIMO = 500;
const MAX_FILAS = 200;

const tiene = (o, k) => o !== null && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k);
const vacio = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
const igual = (a, b) => (vacio(a) && vacio(b)) || JSON.stringify(a ?? "") === JSON.stringify(b ?? "");
// Texto libre: sin caracteres de control y con un tope de largo.
const textoLimpio = (v) => typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, LARGO_MAXIMO) : null;

// Valida un valor contra la definicion del campo en el catalogo. Devuelve el
// valor normalizado, o undefined si no vale (se descarta con aviso).
function validar(campo, v) {
  if (campo.tipo === "checks") {
    if (!Array.isArray(v)) return undefined;
    const validas = campo.opciones.map(o => o.v);
    if (!v.every(x => typeof x === "string" && validas.includes(x))) return undefined;
    return validas.filter(o => v.includes(o));
  }
  const t = textoLimpio(v);
  if (t === null) return undefined;
  if (t === "") return "";
  if (campo.tipo === "select" || campo.tipo === "radio") return campo.opciones.some(o => o.v === t) ? t : undefined;
  if (campo.tipo === "number") return /^\d{1,7}([.,]\d{1,2})?$/.test(t) ? t : undefined;
  if (campo.tipo === "date") return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : undefined;
  return t;
}
// "antes" solo sirve para comparar: se normaliza sin exigir que sea una opcion.
const antesLimpio = (v) => Array.isArray(v) ? v.filter(x => typeof x === "string") : (textoLimpio(v) ?? "");

/**
 * Lee el fichero de respuestas. Solo pasa lo que esta en el catalogo vigente:
 * cualquier otra clave se descarta, y se cuenta en `avisos` para que el tecnico
 * sepa que el fichero traia algo raro.
 */
export function leerRespuestas(texto) {
  if (typeof texto !== "string" || !texto.trim()) return { ok: false, error: "El fichero está vacío." };
  if (texto.length > TAMANO_MAXIMO) return { ok: false, error: "El fichero es demasiado grande para ser unas respuestas del cuestionario." };
  let crudo;
  try { crudo = JSON.parse(texto); } catch { return { ok: false, error: "No se puede leer: no es un fichero de respuestas válido." }; }
  if (!crudo || typeof crudo !== "object" || crudo.formato !== "alanait-cuestionario-respuestas") {
    return { ok: false, error: "Este fichero no son las respuestas de un cuestionario de ALANA IT. ¿Es el .json que devolvió el cliente?" };
  }
  if (crudo.version !== VERSION_CUESTIONARIO) {
    return { ok: false, error: `Las respuestas son de otra versión del cuestionario (${crudo.version}); esta aplicación lee la ${VERSION_CUESTIONARIO}.` };
  }

  const cat = catalogoCliente();
  const avisos = [];
  const descartar = (que) => avisos.push(que);

  const empresa = [];
  for (const it of Array.isArray(crudo.empresa) ? crudo.empresa : []) {
    if (!tiene(it, "campo") || !DATOS_EMPRESA.includes(it.campo)) { descartar(`Dato de empresa desconocido: ${String(it?.campo).slice(0, 40)}`); continue; }
    const valor = textoLimpio(it.valor);
    if (valor === null) { descartar(`Valor no válido en ${it.campo}`); continue; }
    empresa.push({ campo: it.campo, antes: antesLimpio(it.antes), valor });
  }

  const secciones = {};
  const entrada = tiene(crudo, "secciones") && typeof crudo.secciones === "object" ? crudo.secciones : {};
  for (const k of Object.keys(entrada)) {
    if (!cat.secciones.some(s => s.seccion === k)) descartar(`Sección que el cuestionario no pregunta: ${k.slice(0, 40)}`);
  }
  for (const s of cat.secciones) {
    if (!tiene(entrada, s.seccion)) continue;
    const e = entrada[s.seccion] || {};
    const filas = [];
    for (const f of (Array.isArray(e.filas) ? e.filas : []).slice(0, MAX_FILAS)) {
      const origen = f?.origen === null || f?.origen === undefined ? null
        : Number.isInteger(f.origen) && f.origen >= 0 && f.origen < 1000 ? f.origen : undefined;
      if (origen === undefined) { descartar(`Fila con un número de instancia no válido en ${s.titulo}`); continue; }
      const campos = [];
      for (const it of Array.isArray(f.campos) ? f.campos : []) {
        const def = s.campos.find(c => c.id === it?.campo);
        if (!def) { descartar(`Campo que el cuestionario no pregunta: ${s.seccion}.${String(it?.campo).slice(0, 40)}`); continue; }
        const valor = validar(def, it.valor);
        if (valor === undefined) { descartar(`Valor no válido en ${s.titulo} · ${def.label}`); continue; }
        campos.push({ campo: def.id, antes: antesLimpio(it.antes), valor });
      }
      const huella = origen !== null && typeof f.huella === "string" && f.huella.length <= 2000 ? f.huella : null;
      const titulo = textoLimpio(f.titulo) ?? "";
      if (campos.length || f.yaNoExiste === true) filas.push({ origen, huella, titulo, yaNoExiste: f.yaNoExiste === true, campos });
    }
    const comentario = textoLimpio(e.comentario) ?? "";
    if (filas.length || comentario) secciones[s.seccion] = { comentario, filas };
  }

  const m = crudo.cuestionario || {};
  const meta = {
    id: textoLimpio(m.id) ?? "",
    generado: textoLimpio(m.generado) ?? "",
    empresa: textoLimpio(m.empresa) ?? "",
    respondido: textoLimpio(crudo.respondido) ?? "",
    rellenadoPor: { nombre: textoLimpio(crudo.rellenadoPor?.nombre) ?? "", cargo: textoLimpio(crudo.rellenadoPor?.cargo) ?? "" },
  };
  return { ok: true, datos: { meta, empresa, secciones }, avisos };
}

// Secciones con algun criterio del CiberScore: anadir ahi una fila no es
// inocuo (deja comprobaciones pendientes) y no se preselecciona nunca.
const SECCIONES_CON_CRITERIOS = new Set(CRITERIOS.map(c => c.seccion));
const VACIADO = "El cliente lo ha borrado. La aplicación no borra datos por lo que diga el cliente.";

/**
 * Compara las respuestas con la ficha actual y clasifica cada dato:
 *   rellena    la ficha no tenia nada (o "No revisado")  -> preseleccionado
 *   cambia     el cliente corrige un valor que nadie ha tocado desde que se
 *              envio el cuestionario                     -> lo marca el tecnico
 *   conflicto  la ficha cambio desde el envio y el cliente dice otra cosa
 *                                                        -> lo marca el tecnico
 * Lo que coincide con la ficha, o lo que el cliente no ha tocado, no se ensena.
 */
export function compararRespuestas(datos, { clientData = {}, sectionEnabled = {}, formData = {}, instanceCounts = {} }) {
  const cat = catalogoCliente();
  const leidos = camposQueLeeElMotor();
  const getVal = (s, f, idx) => formData[s]?.[idx]?.[f] ?? "";
  const clasificar = (antes, valor, actual) =>
    igual(valor, actual) ? "igual" : vacio(actual) ? "rellena" : igual(actual, antes) ? "cambia" : "conflicto";

  const empresa = [];
  for (const p of datos.empresa) {
    const def = cat.empresa.find(c => c.id === p.campo);
    const actual = clientData[p.campo] ?? "";
    if (vacio(p.valor)) {
      if (!vacio(actual)) empresa.push({ clave: `empresa.${p.campo}`, campo: p.campo, etiqueta: def.label, antes: p.antes, valor: "", actual, estado: "vaciado", aplicable: false, preseleccionada: false, motivo: VACIADO });
      continue;
    }
    const estado = clasificar(p.antes, p.valor, actual);
    if (estado === "igual") continue;
    empresa.push({ clave: `empresa.${p.campo}`, campo: p.campo, etiqueta: def.label, antes: p.antes, valor: p.valor, actual, estado, aplicable: true, preseleccionada: estado === "rellena" });
  }

  const secciones = [];
  for (const s of cat.secciones) {
    const r = datos.secciones[s.seccion];
    if (!r) continue;
    const count = Math.max(1, instanceCounts[s.seccion] || 1);
    const activa = sectionEnabled[s.seccion] === "si";
    const conCriterios = SECCIONES_CON_CRITERIOS.has(s.seccion);
    const salida = {
      seccion: s.seccion, titulo: s.tituloFicha, estadoSeccion: sectionEnabled[s.seccion] ?? "",
      // Una seccion cuyo "no" es un hallazgo critico no se pasa a "si" desde
      // aqui: quitaria el hallazgo con la palabra del cliente.
      marcarSiPermitido: !(sectionEnabled[s.seccion] === "no" && esHallazgoSiNo(s.seccion)),
      pendiente: conCriterios ? s.pendiente : null,
      comentario: null, propuestas: [], filasNuevas: [], infos: [], retiradas: [],
    };
    if (!salida.marcarSiPermitido) {
      salida.infos.push("En la ficha consta que no tienen esto, y eso es un hallazgo crítico. Si el cliente dice que sí lo tienen, compruébalo y cámbialo tú en la ficha: desde aquí no se aplica.");
    }

    // La ficha de AHORA. Sin la seccion en "si" no hay nada vigente con que
    // comparar: todo cuenta como hueco.
    const lector = (i) => activa ? lectorEfectivo(s.seccion, getVal, i) : () => "";
    const identActual = (i) => identificadorFila(s.seccion, lectorEfectivo(s.seccion, getVal, i));
    const nombreActual = (i) => {
      const t = activa ? identActual(i).titulo : "";
      return t ? `${s.filaNombre}: ${t}` : count > 1 ? `${s.filaNombre} nº ${i + 1}` : s.filaNombre;
    };

    // 1. Emparejar. Primero cada fila en su sitio, si su huella sigue ahi;
    //    despues, las que no casan se buscan por su huella en el resto. Una
    //    huella sin datos solo sirve en su sitio: buscarla en otro emparejaria
    //    dos filas sin nombre al azar.
    const destino = new Map(), usadas = new Set();
    r.filas.forEach((f, k) => {
      if (f.origen === null || f.origen >= count) return;
      const casa = !activa || f.huella === null || identActual(f.origen).huella === f.huella;
      if (casa && !usadas.has(f.origen)) { destino.set(k, f.origen); usadas.add(f.origen); }
    });
    if (activa) r.filas.forEach((f, k) => {
      if (f.origen === null || destino.has(k) || !huellaConDatos(f.huella)) return;
      const candidatas = [];
      for (let i = 0; i < count; i++) if (!usadas.has(i) && identActual(i).huella === f.huella) candidatas.push(i);
      if (candidatas.length === 1) { destino.set(k, candidatas[0]); usadas.add(candidatas[0]); }
    });

    r.filas.forEach((f, k) => {
      const nombreEnvio = f.titulo ? `${s.filaNombre}: ${f.titulo}` : f.origen !== null ? `${s.filaNombre} nº ${f.origen + 1}` : s.filaNueva;
      if (f.origen !== null && destino.has(k)) {
        const i = destino.get(k);
        if (f.yaNoExiste) {
          salida.infos.push(`${nombreActual(i)}: el cliente dice que ya no lo tienen. La aplicación no borra nada; quítalo tú en la ficha si es así.`);
          salida.retiradas.push(nombreActual(i));
        }
        salida.propuestas.push(...propuestasDeFila(s, f, i, lector(i), leidos, nombreActual(i), clasificar));
        return;
      }
      if (f.origen !== null) {
        if (f.yaNoExiste) { salida.infos.push(`${nombreEnvio}: el cliente dice que ya no lo tienen, y en la ficha ya no está.`); return; }
        if (!s.permiteAnadir) {
          salida.infos.push(`${nombreEnvio}: ha cambiado en la ficha desde que se envió el cuestionario. Lo que dice el cliente queda como referencia.`);
          for (const p of f.campos) {
            if (igual(p.valor, p.antes) || vacio(p.valor)) continue;
            const def = s.campos.find(c => c.id === p.campo);
            salida.propuestas.push({ clave: `${s.seccion}~${k}.${p.campo}`, seccion: s.seccion, origen: null, fila: nombreEnvio, campo: p.campo, etiqueta: def.labelApp, opciones: def.opcionesApp, antes: p.antes, valor: p.valor, actual: "", estado: "referencia", aplicable: false, preseleccionada: false, motivo: "La fila ha cambiado en la ficha desde que se envió: compruébalo y cámbialo tú." });
          }
          return;
        }
        salida.infos.push(`${nombreEnvio}: no coincide con ninguna fila de la ficha (se ha borrado o cambiado desde que se envió). Se ofrece como fila nueva.`);
      }
      // Fila nueva. Los campos con el condicional congelado no van a su campo:
      // no hay ficha detras que abra su pregunta, que puntua. Van a las notas
      // de la fila, para comprobarlos en la visita.
      const todos = f.campos.filter(p => !vacio(p.valor)).map(p => {
        const def = s.campos.find(c => c.id === p.campo);
        const padreDe = def.dep ? s.campos.find(c => c.id === def.dep.field) : null;
        return { campo: p.campo, etiqueta: def.labelApp, opciones: def.opcionesApp, valor: p.valor, dep: def.dep, depFijo: def.depFijo, depEtiqueta: def.depEtiqueta, padre: def.padre, cuelgaDePadre: !!padreDe?.padre };
      });
      const campos = todos.filter(c => !c.depFijo);
      const anotar = todos.filter(c => c.depFijo);
      if (!campos.length && !anotar.length) return;
      const ident = identificadorFila(s.seccion, (id) => campos.find(c => c.campo === id)?.valor ?? "");
      // Si ya hay en la ficha una fila que se llama igual, puede ser la misma:
      // no se preselecciona aunque la seccion no puntue.
      let parecida = null;
      if (activa && huellaConDatos(ident.huella)) {
        for (let i = 0; i < count; i++) if (identActual(i).huella === ident.huella) { parecida = nombreActual(i); break; }
      }
      salida.filasNuevas.push({
        clave: `${s.seccion}#${k}`, indice: k, campos, anotar, parecida,
        titulo: ident.titulo ? `${s.filaNueva}: ${ident.titulo}` : s.filaNueva,
        conCriterios,
        preseleccionada: !conCriterios && !parecida,
      });
    });

    if (r.comentario) {
      salida.comentario = { clave: `${s.seccion}.comentario`, texto: r.comentario, aplicable: salida.marcarSiPermitido, preseleccionada: salida.marcarSiPermitido };
    }
    if (salida.propuestas.length || salida.filasNuevas.length || salida.infos.length || salida.comentario) secciones.push(salida);
  }
  return { empresa, secciones };
}

// Las propuestas de una fila que ya existe, comparadas con su instancia actual.
function propuestasDeFila(s, f, i, leer, leidos, nombre, clasificar) {
  const props = [];
  for (const p of f.campos) {
    // Lo que el cliente no ha tocado no es una respuesta suya: llega solo para
    // poder rehacer la fila entera si ya no estuviera en la ficha.
    if (igual(p.valor, p.antes)) continue;
    const def = s.campos.find(c => c.id === p.campo);
    const actual = valorFicha(leer(p.campo));
    const base = { clave: `${s.seccion}@${i}.${p.campo}`, seccion: s.seccion, origen: i, fila: nombre, campo: p.campo, etiqueta: def.labelApp, opciones: def.opcionesApp, antes: p.antes, valor: p.valor, actual, dep: def.dep };
    if (def.padre || leidos.has(`${s.seccion}.${p.campo}`)) {
      props.push({ ...base, estado: "referencia", aplicable: false, preseleccionada: false, motivo: "Decide qué otras preguntas aparecen: en una fila que ya existe, compruébalo y cámbialo tú en la ficha si procede." });
      continue;
    }
    // Condicional congelado: a su campo solo si la ficha abre su pregunta; si
    // no, seria un valor que nadie ve (un fosil). Si la ficha aun no contesta
    // esa pregunta, lo que dice el cliente va a las notas; si la contesta con
    // otra cosa, solo se ensena.
    if (def.depFijo && leer(def.dep.field) !== def.dep.value) {
      if (vacio(p.valor)) continue;
      if (valorFicha(leer(def.dep.field)) === "") {
        props.push({ ...base, estado: "anota", aplicable: true, preseleccionada: true, depEtiqueta: def.depEtiqueta,
          motivo: `Cuelga de «${def.depEtiqueta}», que puntúa y está sin contestar: va a las notas para que lo compruebes en la visita.` });
      } else {
        props.push({ ...base, estado: "referencia", aplicable: false, preseleccionada: false, motivo: `Cuelga de «${def.depEtiqueta}», y la ficha dice otra cosa.` });
      }
      continue;
    }
    if (vacio(p.valor)) {
      if (!vacio(actual)) props.push({ ...base, estado: "vaciado", aplicable: false, preseleccionada: false, motivo: VACIADO });
      continue;
    }
    const estado = clasificar(p.antes, p.valor, actual);
    if (estado === "igual") continue;
    props.push({ ...base, estado, aplicable: true, preseleccionada: estado === "rellena" });
  }
  // Lo que cuelga de otra pregunta de la fila: si la ficha no la abre, solo
  // vale junto con la respuesta del cliente que la abre, y solo se
  // preselecciona si esa tambien.
  for (const p of props) {
    if (!p.aplicable || !p.dep) continue;
    const def = s.campos.find(c => c.id === p.campo);
    if (def.depFijo || leer(p.dep.field) === p.dep.value) continue;
    const abre = props.find(x => x.campo === p.dep.field && x.aplicable && x.valor === p.dep.value);
    if (abre) {
      p.requiere = { clave: abre.clave, etiqueta: abre.etiqueta };
      p.preseleccionada = p.preseleccionada && abre.preseleccionada;
      continue;
    }
    const padre = s.campos.find(c => c.id === p.dep.field);
    Object.assign(p, { estado: "referencia", aplicable: false, preseleccionada: false, motivo: `Cuelga de «${padre?.labelApp ?? p.dep.field}», que en la ficha no lo abre.` });
  }
  return props;
}

/** Lo que la pantalla preselecciona: el punto de partida de la revision. */
export function seleccionInicial(comparacion) {
  const claves = new Set();
  const filas = new Set();
  for (const p of comparacion.empresa) if (p.preseleccionada) claves.add(p.clave);
  for (const s of comparacion.secciones) {
    for (const p of s.propuestas) if (p.preseleccionada) claves.add(p.clave);
    for (const f of s.filasNuevas) if (f.preseleccionada) filas.add(f.clave);
    if (s.comentario?.preseleccionada) claves.add(s.comentario.clave);
  }
  return { claves, filas, padres: new Set(), marcarSi: new Set() };
}

// "2026-10-06T09:00:00.000Z" -> "06/10/2026"
const fechaCorta = (iso) => /^\d{4}-\d{2}-\d{2}/.test(iso ?? "") ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "";

/**
 * Aplica lo seleccionado y devuelve el estado nuevo de la ficha, sin tocar el
 * de entrada. Recalcula la comparacion por su cuenta: no se fia de lo que le
 * pase la pantalla mas alla de QUE claves se han marcado.
 *
 * seleccion = { claves, filas, padres, marcarSi } (Sets)
 *   claves    datos sueltos aceptados ("empresa.telefono", "erp@0.version")
 *             y comentarios ("erp.comentario")
 *   filas     filas nuevas aceptadas ("impresion#3")
 *   padres    en filas nuevas, el tipo que propone el cliente ("licenciamiento#2.tipo_servicio")
 *   marcarSi  secciones que el tecnico marca "si" para poder aplicar en ellas
 */
export function aplicarRespuestas(estado, datos, seleccion, { ahora = "" } = {}) {
  const cmp = compararRespuestas(datos, estado);
  const leidos = camposQueLeeElMotor();
  const cat = catalogoCliente();
  const clientData = { ...estado.clientData };
  const sectionEnabled = { ...estado.sectionEnabled };
  const formData = { ...estado.formData };
  const instanceCounts = { ...estado.instanceCounts };
  const omitidos = [];
  let campos = 0, filas = 0, comentarios = 0, anotados = 0;
  const marcadas = [], retiradas = [];

  for (const p of cmp.empresa) {
    if (!seleccion.claves.has(p.clave) || !p.aplicable) continue;
    clientData[p.campo] = p.valor;
    campos++;
  }

  for (const s of cmp.secciones) {
    retiradas.push(...s.retiradas.map(n => `${s.titulo} · ${n}`));
    const def = cat.secciones.find(x => x.seccion === s.seccion);
    const conComentario = !!s.comentario?.aplicable && seleccion.claves.has(s.comentario.clave);
    const hayAlgo = conComentario || s.propuestas.some(p => seleccion.claves.has(p.clave) && p.aplicable) || s.filasNuevas.some(f => seleccion.filas.has(f.clave));
    if (!hayAlgo) continue;
    if (sectionEnabled[s.seccion] !== "si") {
      if (!s.marcarSiPermitido) { omitidos.push({ seccion: s.titulo, motivo: "En la ficha consta que no lo tienen (hallazgo crítico): cámbialo tú en la ficha si lo compruebas." }); continue; }
      if (!seleccion.marcarSi.has(s.seccion)) { omitidos.push({ seccion: s.titulo, motivo: "La sección no está marcada «Sí»." }); continue; }
      // Marcar "si" solo puede abrir preguntas, nunca esconderlas.
      sectionEnabled[s.seccion] = "si";
      marcadas.push(s.seccion);
    }
    const copiaSeccion = { ...(formData[s.seccion] || {}) };
    const fila = (idx) => (copiaSeccion[idx] = { ...(copiaSeccion[idx] || {}) });
    const depAbierto = (c, valores) => !c.dep || valores[c.dep.field] === c.dep.value;
    // Primero los campos sin condicional y despues los que dependen de otro:
    // asi un padre aceptado abre a su hijo dentro de la misma aplicacion.
    const enOrden = (lista) => [...lista].sort((a, b) => (a.dep ? 1 : 0) - (b.dep ? 1 : 0));
    // Lo que va a las notas se junta por fila y se escribe al final.
    const paraNotas = new Map();
    const anotar = (idx, texto) => paraNotas.set(idx, [...(paraNotas.get(idx) ?? []), texto]);

    for (const p of enOrden(s.propuestas)) {
      if (!seleccion.claves.has(p.clave) || !p.aplicable) continue;
      if (p.estado === "anota") { anotar(p.origen, `${p.etiqueta}: ${textoValor(p.valor, p.opciones)}`); anotados++; continue; }
      if (leidos.has(`${s.seccion}.${p.campo}`)) { omitidos.push({ seccion: s.titulo, campo: p.etiqueta, motivo: "Lo lee el CiberScore: lo decide el técnico." }); continue; }
      if (p.requiere && !seleccion.claves.has(p.requiere.clave)) { omitidos.push({ seccion: s.titulo, campo: p.etiqueta, motivo: `Necesita aceptar también «${p.requiere.etiqueta}».` }); continue; }
      const valores = fila(p.origen);
      if (!depAbierto(p, valores)) { omitidos.push({ seccion: s.titulo, campo: p.etiqueta, motivo: "Su pregunta no está abierta en la ficha." }); continue; }
      valores[p.campo] = p.valor;
      campos++;
    }

    let count = Math.max(1, instanceCounts[s.seccion] || 1);
    const usadas = new Set(s.propuestas.filter(p => seleccion.claves.has(p.clave)).map(p => p.origen));
    for (const f of s.filasNuevas) {
      if (!seleccion.filas.has(f.clave)) continue;
      // La primera fila nueva aprovecha una instancia 0 vacia en vez de dejarla
      // en blanco delante: una seccion recien marcada "si" ya tiene una.
      let idx;
      if (count === 1 && !usadas.has(0) && instanciaVacia({ [s.seccion]: copiaSeccion }, s.seccion, 0)) { idx = 0; usadas.add(0); }
      else { idx = count; count++; }
      const valores = fila(idx);
      for (const c of enOrden(f.campos)) {
        const dc = def.campos.find(x => x.id === c.campo);
        if (c.padre) {
          if (!seleccion.padres.has(`${f.clave}.${c.campo}`) || !esPadrePermitido(s.seccion, c.campo)) continue;
        } else if (leidos.has(`${s.seccion}.${c.campo}`)) continue;
        if (dc.depFijo || !depAbierto(dc, valores)) { omitidos.push({ seccion: s.titulo, campo: c.etiqueta, motivo: "Su pregunta no está abierta en la ficha." }); continue; }
        valores[c.campo] = c.valor;
      }
      for (const c of f.anotar ?? []) { anotar(idx, `${c.etiqueta}: ${textoValor(c.valor, c.opciones)}`); anotados++; }
      instanceCounts[s.seccion] = count;
      filas++;
    }

    // Las notas, despues de las filas nuevas: escritas antes, la instancia 0
    // dejaria de estar vacia y la primera fila nueva iria detras de ella. El
    // comentario de la seccion, a la primera fila.
    const quien = [datos.meta.rellenadoPor.nombre, fechaCorta(datos.meta.respondido)].filter(Boolean).join(", ");
    const delCliente = `del cliente${quien ? ` (${quien})` : ""}`;
    const escribirNota = (idx, linea) => {
      const valores = fila(idx);
      const previa = typeof valores.notas === "string" ? valores.notas.trim() : "";
      valores.notas = previa ? `${previa}\n${linea}` : linea;
    };
    for (const [idx, textos] of paraNotas) escribirNota(idx, `Dato ${delCliente}, pendiente de comprobar en la visita: ${textos.join(" · ")}`);
    if (conComentario) {
      escribirNota(0, `Comentario ${delCliente}: ${s.comentario.texto}`);
      comentarios++;
    }
    formData[s.seccion] = copiaSeccion;
  }

  // Constancia de que entro informacion del cliente. Sin indices de instancia
  // a proposito: se desfasarian al borrar instancias (KNOWN_ISSUES C9). Lo que
  // el cliente dice que ya no tiene se guarda por su nombre.
  if (campos || filas || comentarios || anotados) {
    const previas = Array.isArray(estado.formData.__cliente__?.importaciones) ? estado.formData.__cliente__.importaciones : [];
    formData.__cliente__ = {
      ...(estado.formData.__cliente__ || {}),
      importaciones: [...previas, {
        fecha: ahora, cuestionario: datos.meta.id, generado: datos.meta.generado,
        rellenadoPor: datos.meta.rellenadoPor.nombre, cargo: datos.meta.rellenadoPor.cargo,
        campos, filas, comentarios, anotados, seccionesMarcadasSi: marcadas, yaNoExiste: retiradas,
      }],
    };
  }

  return { clientData, sectionEnabled, formData, instanceCounts, resumen: { campos, filas, comentarios, anotados, marcadas, omitidos } };
}

// Para la pantalla: el texto de un valor tal como lo ve el tecnico.
export function textoValor(v, opciones = []) {
  if (Array.isArray(v)) return v.map(x => opciones.find(o => o.v === x)?.t ?? x).join(", ");
  if (v === undefined || v === null || v === "") return "—";
  return opciones.find(o => o.v === v)?.t ?? String(v);
}
