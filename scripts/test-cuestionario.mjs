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
      if (f.dep && !e.campos.includes(f.dep.field)) malos.push(`${k}: depende de ${f.dep.field}, que no se pregunta`);
    }
    for (const p of e.padres ?? []) if (!e.campos.includes(p)) malos.push(`${e.seccion}.${p}: padre declarado que no se pregunta`);
    // Anadir filas solo donde no mueve la nota, o en licenciamiento a sabiendas.
    const conCriterios = CRITERIOS.some(c => c.seccion === e.seccion);
    if (e.permiteAnadir && conCriterios && e.seccion !== "licenciamiento") malos.push(`${e.seccion}: permite añadir filas y tiene criterios`);
  }
  es("ningún campo del cuestionario lo lee el motor, ni dispara una tarea, ni cuelga de algo que no se pregunta", malos, []);
  es("los datos de empresa existen y no incluyen la fecha de visita ni el responsable",
     [DATOS_EMPRESA.every(id => CAMPOS_CLIENTE.some(c => c.id === id)), DATOS_EMPRESA.includes("fecha"), DATOS_EMPRESA.includes("responsable")], [true, false, false]);
  const cat = catalogoCliente();
  es("las opciones de «no comprobado» no se le ofrecen al cliente",
     cat.secciones.flatMap(s => s.campos.flatMap(c => c.opciones.map(o => o.v))).filter(v => LITERALES_SIN_COMPROBAR.includes(v)), []);
  es("los campos de fecha se piden como fecha, igual que en la ficha",
     cat.secciones.flatMap(s => s.campos.filter(c => c.tipo === "date").map(c => `${s.seccion}.${c.id}`)),
     ["red.isp_fecha_renovacion", "antivirus.vencimiento", "impresion.contrato_vencimiento", "licenciamiento.fecha_renovacion"]);
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
  fr.sectionEnabled.otros_dispositivos = "no";
  fr.formData.otros_dispositivos = { 0: { marca: "Dato viejo" } };
  const d = datosCuestionario({ ...fr, generado: "x", id: "y" });
  const fila = (sid) => d.secciones.find(s => s.seccion === sid).filas[0].valores;
  es("un campo oculto por su condicional no se le enseña al cliente", "proveedor_gestion" in fila("impresion"), false);
  es("«No sabe» llega en blanco, para que el cliente lo rellene", "soporte" in fila("erp"), false);
  es("una sección marcada «no» llega en blanco", Object.keys(fila("otros_dispositivos")).length, 0);
  es("lo vigente sí llega", fila("erp").nombre, "A3 Asesor");
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
    red: { filas: [{ origen: 0, campos: [{ campo: "rdp_expuesto", antes: "", valor: "No" }, { campo: "isp_fecha_renovacion", antes: "", valor: "31/12/2026" }] }] },
    licenciamiento: { filas: [{ origen: 0, campos: [{ campo: "titularidad", antes: "", valor: "A nombre del cliente" }] }] },
    ["__proto__"]: { filas: [] },
  }, [{ campo: "telefono", antes: "", valor: "938 000 000" }, { campo: "responsable", antes: "", valor: "Yo" }, { campo: "fecha", antes: "", valor: "2020-01-01" }]));
  es("lee un fichero correcto", r.ok, true);
  const erp = r.datos.secciones.erp;
  es("se queda solo con los campos del catálogo y con valores válidos", erp.filas[0].campos.map(c => c.campo), ["version"]);
  es("el comentario llega limpio", erp.comentario, "Tenemos otro programa");
  es("descarta secciones que no se preguntan (servidores)", "servidores" in r.datos.secciones, false);
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
  const estado = { clientData: base.clientData, sectionEnabled: base.sectionEnabled, formData: base.formData, instanceCounts: base.instanceCounts || {} };
  const antesJSON = JSON.stringify(estado);
  const datos = leerRespuestas(respuestaDe({
    erp: { comentario: "", filas: [
      { origen: 0, campos: [
        { campo: "partner", antes: "", valor: "Asesoría Z" },        // rellena un hueco
        { campo: "version", antes: "2024", valor: "2026" },          // cambia lo que no se ha tocado
        { campo: "proveedor", antes: "Otro", valor: "Wolters" },     // la ficha cambio desde el envio
        { campo: "nombre", antes: "A3 Asesor", valor: "" },          // el cliente lo borra
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
    otros_dispositivos: { comentario: "", filas: [{ origen: 0, campos: [{ campo: "tipo", antes: "", valor: "TPV" }, { campo: "marca", antes: "", valor: "Ingenico" }] }] },
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
  es("el tipo de un servicio que ya existe es solo referencia", [prop("licenciamiento", "tipo_servicio").estado, prop("licenciamiento", "tipo_servicio").aplicable], ["referencia", false]);
  es("«ya no lo tenemos» llega como información", cmp.secciones.find(s => s.seccion === "impresion").infos.length, 1);
  const nuevas = (sid) => cmp.secciones.find(s => s.seccion === sid).filasNuevas;
  es("una fila nueva sin criterios va preseleccionada; en servicios contratados no",
     [nuevas("erp")[0].preseleccionada, nuevas("licenciamiento")[0].preseleccionada], [true, false]);

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
  es("deja constancia sin índices de instancia: 3 datos (partner, teléfono, coste) y 1 fila",
     r.formData.__cliente__.importaciones.map(i => [i.campos, i.filas, i.rellenadoPor]), [[3, 1, "Ana Pérez"]]);

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
  es("marcar «Sí» abre la sección y aprovecha su primera fila vacía", [r2.sectionEnabled.otros_dispositivos, r2.instanceCounts.otros_dispositivos ?? 1, r2.formData.otros_dispositivos[0].tipo], ["si", 1, "TPV"]);
  es("servicio nuevo sin aceptar su tipo: se añade sin tipo y sin lo que cuelga de él",
     [r2.instanceCounts.licenciamiento, r2.formData.licenciamiento[1].proveedor, r2.formData.licenciamiento[1].tipo_servicio ?? "", r2.formData.licenciamiento[1].dominio_dns_gestion ?? ""], [2, "DonDominio", "", ""]);

  const sel3 = seleccionInicial(cmp);
  sel3.filas.add(filaServicio);
  sel3.padres.add(`${filaServicio}.tipo_servicio`);
  const r3 = aplicarRespuestas(estado, datos, sel3, { ahora: "x" });
  es("aceptando el tipo, se aplica y abre lo que cuelga de él", [r3.formData.licenciamiento[1].tipo_servicio, r3.formData.licenciamiento[1].dominio_dns_gestion], ["Dominio", "En el propio registrador"]);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\nLo que trae el cliente nunca sube la nota ni da el sello");
{
  const resultados = [];
  for (const f of fichas) {
    const estado = { clientData: f.clientData, sectionEnabled: f.sectionEnabled, formData: f.formData, instanceCounts: f.instanceCounts || {} };
    // Todo lo que el cuestionario permite, aceptado de golpe: cada campo con un
    // valor y una fila nueva por seccion, tipos incluidos, y las secciones
    // marcadas "si".
    const cat = catalogoCliente();
    const secciones = {};
    for (const s of cat.secciones) {
      const valor = (c) => c.tipo === "checks" ? [c.opciones[0].v] : (c.tipo === "select" || c.tipo === "radio") ? c.opciones[c.opciones.length - 1].v : c.tipo === "number" ? "3" : c.tipo === "date" ? "2027-01-01" : "Dato del cliente";
      const filas = [{ origen: 0, campos: s.campos.map(c => ({ campo: c.id, antes: "", valor: valor(c) })) }];
      if (s.permiteAnadir) filas.push({ origen: null, campos: s.campos.map(c => ({ campo: c.id, antes: "", valor: valor(c) })) });
      secciones[s.seccion] = { comentario: "", filas };
    }
    const datos = leerRespuestas(respuestaDe(secciones)).datos;
    const cmp = compararRespuestas(datos, estado);
    const sel = seleccionInicial(cmp);
    for (const s of cmp.secciones) {
      sel.marcarSi.add(s.seccion);
      for (const p of s.propuestas) sel.claves.add(p.clave);
      for (const fn of s.filasNuevas) { sel.filas.add(fn.clave); for (const c of fn.campos) if (c.padre) sel.padres.add(`${fn.clave}.${c.campo}`); }
    }
    const r = aplicarRespuestas(estado, datos, sel, { ahora: "x" });
    const antes = puntuar(f), despues = puntuar({ ...f, ...r });
    resultados.push({ ficha: f.nombre, sube: (despues.nota ?? 0) > (antes.nota ?? 0), sello: !antes.fiable && despues.fiable });
  }
  es("en las 5 fichas, aceptándolo todo, la nota no sube y el sello no aparece",
     resultados.filter(x => x.sube || x.sello).map(x => x.ficha), []);
}

console.log(`\n${ok} correctas, ${fallos} fallos\n`);
process.exit(fallos ? 1 : 0);
