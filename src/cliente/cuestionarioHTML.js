// Cuestionario para el cliente: UN fichero HTML que se abre en cualquier
// navegador, sin cuenta, sin internet y sin servidor.
//
// Por que un fichero y no un enlace: el enlace exigia un portal publico, dos
// funciones SQL abiertas a anonimos y un proyecto de pruebas (7-8 dias, ver
// .claude/handoff/analisis/enlace-cliente). El fichero no toca la base de datos:
// sale de la ficha, el cliente lo rellena en su ordenador, devuelve otro
// fichero con sus respuestas y el tecnico las revisa en la app.
//
// SEGURIDAD DEL FICHERO
//   - Los datos van como JSON dentro de <script type="application/json"> con
//     "<" escapado, y la pagina los pinta con textContent: ningun valor del
//     cliente ni de la ficha se interpreta como HTML.
//   - Ni una peticion de red: sin fuentes externas, sin CDN. Funciona sin
//     conexion y no avisa a nadie de que se ha abierto.
//   - Solo lleva lo que lista catalogo.js: inventario que no mueve la nota.
//     Nada de la nota, los avisos, las notas internas ni las capturas.
//
// El codigo de la pagina va como texto (String.raw) y no como funcion, para que
// el empaquetador no lo transforme: lo que se escribe aqui es exactamente lo
// que ejecuta el navegador del cliente. Por eso esta escrito en JavaScript
// sencillo, sin plantillas de texto ni sintaxis reciente.

import { lectorEfectivo } from "../sections.js";
import { catalogoCliente, VERSION_CUESTIONARIO } from "./catalogo.js";
import { LITERALES_SIN_COMPROBAR } from "../score/criterios.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Nombre de fichero sin caracteres raros: va en el nombre de lo que descarga
// el cliente y en el del cuestionario.
export const slugEmpresa = (empresa) =>
  String(empresa || "cliente").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "cliente";

/**
 * Datos que viajan dentro del cuestionario. Exportado para las pruebas.
 *
 * Solo se rellena con lo que ya hay en las secciones marcadas "si", y solo con
 * los campos visibles (lectorEfectivo): un valor fosil de un campo oculto no se
 * le ensena al cliente como si fuera vigente.
 */
export function datosCuestionario({ clientData = {}, sectionEnabled = {}, formData = {}, instanceCounts = {}, tecnico = "", generado = "", id = "" }) {
  const cat = catalogoCliente();
  const getVal = (s, f, idx) => formData[s]?.[idx]?.[f] ?? "";
  // "No revisado" / "No sabe" no se le ensenan al cliente como respuesta: para
  // el, no saber algo es un hueco que puede rellenar.
  const normalizar = (v) => Array.isArray(v) ? v.filter(x => typeof x === "string")
    : (v === undefined || v === null || LITERALES_SIN_COMPROBAR.includes(v) ? "" : String(v));

  const secciones = cat.secciones.map(s => {
    const activa = sectionEnabled[s.seccion] === "si";
    const n = activa ? Math.max(1, instanceCounts[s.seccion] || 1) : 1;
    const filas = Array.from({ length: n }, (_, i) => {
      const valores = {};
      if (activa) {
        const leer = lectorEfectivo(s.seccion, getVal, i);
        for (const c of s.campos) {
          const v = normalizar(leer(c.id));
          if (v !== "" && !(Array.isArray(v) && v.length === 0)) valores[c.id] = v;
        }
      }
      return { origen: i, valores };
    });
    return { ...s, filas };
  });

  return {
    formato: "alanait-cuestionario",
    version: VERSION_CUESTIONARIO,
    id, generado, tecnico,
    empresaNombre: clientData.empresa || "",
    slug: slugEmpresa(clientData.empresa),
    empresa: cat.empresa.map(c => ({ ...c, valor: normalizar(clientData[c.id]) })),
    secciones,
  };
}

/** El HTML completo del cuestionario, listo para descargar. Funcion pura. */
export function construirCuestionario({ logo = "", ...entrada }) {
  const datos = datosCuestionario(entrada);
  // "<" escapado: un valor con "</script>" no puede cerrar el bloque de datos.
  const json = JSON.stringify(datos).replace(/</g, "\\u003c");
  const empresa = esc(datos.empresaNombre || "su empresa");
  const imagen = logo && /^data:image\/(png|jpeg|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(logo)
    ? `<img class="logo" src="${logo}" alt="ALANA IT">`
    : `<div class="marca">ALANA IT</div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Cuestionario de información · ${empresa}</title>
<style>${CSS}</style>
</head>
<body>
<header class="cabecera">
  ${imagen}
  <div>
    <h1>Cuestionario de información</h1>
    <p class="empresa">${empresa}</p>
  </div>
</header>
<noscript><p class="aviso">Este cuestionario necesita JavaScript. Ábralo con Chrome, Edge, Firefox o Safari.</p></noscript>
<main id="app"></main>
<script type="application/json" id="datos-cuestionario">${json}</script>
<script>${PAGINA}</script>
</body>
</html>
`;
}

const CSS = `
:root { --azul:#2F56A3; --marino:#1E3A6E; --turquesa:#178A8E; --tinta:#333; --gris:#6b6b6b; --borde:#E4E6EA; --papel:#F9F9F9; --magenta:#CC3366; }
* { box-sizing: border-box; }
body { margin:0; background:var(--papel); color:var(--tinta); font:15px/1.5 "Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif; }
.cabecera { display:flex; align-items:center; gap:18px; padding:18px 24px; background:#fff; border-bottom:3px solid var(--azul); }
.cabecera h1 { margin:0; font-size:20px; font-weight:500; color:var(--marino); }
.cabecera .empresa { margin:2px 0 0; color:var(--gris); }
/* El logo es un cuadrado de 2000 px con el dibujo en una franja horizontal en
   el centro: se recorta esa franja en vez de encoger el cuadrado entero. */
.logo { width:240px; height:44px; object-fit:cover; object-position:50% 52%; flex-shrink:0; }
.marca { font-weight:600; letter-spacing:.12em; color:var(--azul); }
main { max-width:920px; margin:0 auto; padding:20px 16px 60px; }
.intro, .tarjeta { background:#fff; border:1px solid var(--borde); border-radius:10px; padding:18px 20px; margin-bottom:16px; }
.intro p { margin:0 0 8px; }
.intro .nota { color:var(--magenta); font-weight:500; }
.recuperado { background:#E6F7F7; border:1px solid #9BDCDE; border-radius:8px; padding:10px 14px; margin-bottom:16px; }
.tarjeta h2 { margin:0; font-size:17px; font-weight:500; color:var(--marino); }
.tarjeta .ayuda { margin:2px 0 14px; color:var(--gris); font-size:13.5px; }
.fila { border-top:1px dashed var(--borde); padding:14px 0 6px; }
.fila:first-of-type { border-top:none; padding-top:0; }
.fila.nueva { background:#F4F8FD; margin:0 -20px; padding:14px 20px 6px; border-top:1px solid #BBCCE8; }
.fila-cab { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px; font-size:12px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--azul); }
.rejilla { display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:10px 16px; }
.campo label { display:block; font-size:12.5px; color:var(--gris); margin-bottom:4px; }
.campo input[type=text], .campo input[type=number], .campo input[type=date], .campo select, .campo textarea {
  width:100%; padding:8px 10px; border:1px solid var(--borde); border-radius:7px; font:inherit; color:inherit; background:#fff; }
.campo input:focus, .campo select:focus, .campo textarea:focus, button:focus-visible { outline:2px solid var(--azul); outline-offset:1px; }
.comentario { margin-top:12px; }
.checks { display:flex; flex-wrap:wrap; gap:6px 14px; padding-top:4px; }
.check, .ya { font-size:13.5px; text-transform:none; letter-spacing:0; font-weight:400; color:var(--tinta); cursor:pointer; }
button { font:inherit; cursor:pointer; }
.anadir { margin-top:12px; padding:7px 14px; border:1.5px dashed var(--azul); background:#EEF3FB; color:var(--azul); border-radius:7px; }
.enlace { background:none; border:none; color:var(--magenta); padding:2px 4px; font-size:12px; text-transform:none; letter-spacing:0; }
.final { background:#fff; border:1px solid var(--borde); border-top:3px solid var(--turquesa); border-radius:10px; padding:16px 20px; }
.final .rejilla { margin-bottom:12px; }
.primario { padding:11px 22px; background:var(--turquesa); color:#fff; border:none; border-radius:8px; font-weight:500; font-size:15px; }
.secundario { padding:10px 16px; background:#fff; color:var(--azul); border:1px solid #BBCCE8; border-radius:8px; margin-left:8px; }
.hecho { margin-top:12px; padding:12px 14px; background:#E6F7F7; border:1px solid #9BDCDE; border-radius:8px; }
.hecho textarea { width:100%; margin-top:8px; font:12px/1.4 Consolas, monospace; }
.aviso { max-width:920px; margin:20px auto; padding:14px; background:#FDF2F6; border:1px solid #F3C2D4; border-radius:8px; }
@media (max-width:600px) { .cabecera { padding:14px 16px; flex-wrap:wrap; } .logo { width:180px; height:33px; } .tarjeta, .intro { padding:14px 16px; } .fila.nueva { margin:0 -16px; padding:14px 16px 6px; } .secundario { margin:8px 0 0; } }
`;

// La pagina del cliente. Sin plantillas de texto ni sintaxis reciente, a
// proposito (ver arriba).
const PAGINA = String.raw`
(function () {
  "use strict";
  var raiz = document.getElementById("app");
  var DATOS;
  try { DATOS = JSON.parse(document.getElementById("datos-cuestionario").textContent); }
  catch (e) { raiz.textContent = "No se ha podido abrir el cuestionario: el fichero está dañado. Pida otro a su técnico."; return; }
  var CLAVE = "alanait-cuestionario-" + DATOS.id;

  function el(tag, props, hijos) {
    var n = document.createElement(tag);
    props = props || {};
    for (var k in props) {
      if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
      var v = props[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === "text") n.textContent = v;
      else if (k === "className") n.className = v;
      else if (k === "value") n.value = v;
      else if (k === "checked") n.checked = true;
      else if (k.indexOf("on") === 0 && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : String(v));
    }
    (hijos || []).forEach(function (h) {
      if (h === null || h === undefined || h === false) return;
      n.appendChild(typeof h === "string" ? document.createTextNode(h) : h);
    });
    return n;
  }
  function vaciar(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function copia(o) { return JSON.parse(JSON.stringify(o)); }
  function vacio(v) { return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0); }
  function igual(a, b) { if (vacio(a) && vacio(b)) return true; return JSON.stringify(a) === JSON.stringify(b); }
  function limpiar(v) { if (Array.isArray(v)) return v.slice(); if (v === undefined || v === null) return ""; return String(v).trim(); }

  function estadoInicial() {
    var e = { empresa: {}, secciones: {}, rellenadoPor: { nombre: "", cargo: "" } };
    DATOS.empresa.forEach(function (c) { e.empresa[c.id] = c.valor || ""; });
    DATOS.secciones.forEach(function (s) {
      e.secciones[s.seccion] = { comentario: "", filas: s.filas.map(function (f) { return { origen: f.origen, yaNoExiste: false, valores: copia(f.valores) }; }) };
    });
    return e;
  }

  var estado = estadoInicial();
  var recuperado = false;
  try {
    var guardado = localStorage.getItem(CLAVE);
    if (guardado) {
      var g = JSON.parse(guardado);
      if (g && g.id === DATOS.id && g.estado && g.estado.secciones) { estado = g.estado; recuperado = true; }
    }
  } catch (e) {}

  var temporizador = null;
  function guardarLocal() {
    clearTimeout(temporizador);
    temporizador = setTimeout(function () {
      try { localStorage.setItem(CLAVE, JSON.stringify({ id: DATOS.id, estado: estado })); } catch (e) {}
    }, 300);
  }

  function seccionDe(id) { for (var i = 0; i < DATOS.secciones.length; i++) if (DATOS.secciones[i].seccion === id) return DATOS.secciones[i]; return null; }
  function antesDe(sid, origen) {
    if (origen === null || origen === undefined) return {};
    var s = seccionDe(sid);
    for (var i = 0; i < s.filas.length; i++) if (s.filas[i].origen === origen) return s.filas[i].valores;
    return {};
  }
  function visible(campo, valores) { return !campo.dep || valores[campo.dep.field] === campo.dep.value; }
  function decideOtros(s, id) { return s.campos.some(function (c) { return c.dep && c.dep.field === id; }); }

  var contador = 0;
  function controlCampo(campo, valor, alCambiar) {
    var id = "campo-" + (++contador);
    var control;
    if (campo.tipo === "select" || campo.tipo === "radio") {
      var opciones = [el("option", { value: "", text: "—" })];
      campo.opciones.forEach(function (o) { opciones.push(el("option", { value: o.v, text: o.t })); });
      control = el("select", { id: id, onchange: function (ev) { alCambiar(ev.target.value); } }, opciones);
      control.value = valor || "";
    } else if (campo.tipo === "checks") {
      var marcados = Array.isArray(valor) ? valor : [];
      control = el("div", { className: "checks", id: id }, campo.opciones.map(function (o) {
        var caja = el("input", { type: "checkbox", "data-v": o.v, checked: marcados.indexOf(o.v) !== -1, onchange: function () {
          var lista = [];
          Array.prototype.forEach.call(control.querySelectorAll("input"), function (i) { if (i.checked) lista.push(i.getAttribute("data-v")); });
          alCambiar(lista);
        } });
        return el("label", { className: "check" }, [caja, " " + o.t]);
      }));
    } else {
      var tipo = campo.tipo === "number" ? "number" : campo.tipo === "date" ? "date" : "text";
      control = el("input", { id: id, type: tipo, value: valor || "", placeholder: campo.placeholder || "",
        min: tipo === "number" ? "0" : null, maxlength: tipo === "text" ? "300" : null,
        oninput: function (ev) { alCambiar(ev.target.value); } });
    }
    return el("div", { className: "campo" }, [el("label", { "for": id, text: campo.label }), control]);
  }

  function nombreFila(s, fila, j, total) {
    if (fila.origen === null) return s.etiquetaFila + " nueva";
    var previo = antesDe(s.seccion, fila.origen);
    var ident = previo.nombre || previo.marca || previo.producto || previo.proveedor || previo.isp || "";
    var base = total > 1 ? s.etiquetaFila + " " + (j + 1) : s.etiquetaFila;
    return ident ? base + " · " + ident : base;
  }

  function pintarSeccion(s, cont) {
    vaciar(cont);
    var st = estado.secciones[s.seccion];
    var existentes = st.filas.filter(function (f) { return f.origen !== null; }).length;
    st.filas.forEach(function (fila, j) {
      var nueva = fila.origen === null;
      var previo = antesDe(s.seccion, fila.origen);
      var conDatos = !nueva && Object.keys(previo).some(function (k) { return !vacio(previo[k]); });
      var accion = null;
      if (nueva) accion = el("button", { type: "button", className: "enlace", text: "Quitar", onclick: function () { st.filas.splice(j, 1); guardarLocal(); pintarSeccion(s, cont); } });
      else if (conDatos) accion = el("label", { className: "ya" }, [el("input", { type: "checkbox", checked: fila.yaNoExiste, onchange: function (ev) { fila.yaNoExiste = ev.target.checked; guardarLocal(); } }), " Ya no lo tenemos"]);
      var campos = s.campos.filter(function (c) { return visible(c, fila.valores); }).map(function (c) {
        return controlCampo(c, fila.valores[c.id], function (v) {
          fila.valores[c.id] = v;
          guardarLocal();
          if (decideOtros(s, c.id)) pintarSeccion(s, cont);
        });
      });
      cont.appendChild(el("div", { className: "fila" + (nueva ? " nueva" : "") }, [
        el("div", { className: "fila-cab" }, [el("span", { text: nombreFila(s, fila, j, existentes) }), accion]),
        el("div", { className: "rejilla" }, campos),
      ]));
    });
    if (s.permiteAnadir) {
      cont.appendChild(el("button", { type: "button", className: "anadir", text: "+ Añadir " + s.etiquetaFila,
        onclick: function () { st.filas.push({ origen: null, yaNoExiste: false, valores: {} }); guardarLocal(); pintarSeccion(s, cont); } }));
    }
    cont.appendChild(el("div", { className: "campo comentario" }, [
      el("label", { text: "¿Algo más que debamos saber de esto?" }),
      el("textarea", { rows: "2", value: st.comentario, oninput: function (ev) { st.comentario = ev.target.value; guardarLocal(); } }),
    ]));
  }

  function respuestas() {
    var r = {
      formato: "alanait-cuestionario-respuestas", version: DATOS.version,
      cuestionario: { id: DATOS.id, generado: DATOS.generado, empresa: DATOS.empresaNombre },
      respondido: new Date().toISOString(),
      rellenadoPor: { nombre: limpiar(estado.rellenadoPor.nombre), cargo: limpiar(estado.rellenadoPor.cargo) },
      empresa: [], secciones: {},
    };
    DATOS.empresa.forEach(function (c) {
      var antes = c.valor || "", v = limpiar(estado.empresa[c.id]);
      if (!igual(v, antes)) r.empresa.push({ campo: c.id, antes: antes, valor: v });
    });
    DATOS.secciones.forEach(function (s) {
      var st = estado.secciones[s.seccion], filas = [];
      st.filas.forEach(function (fila) {
        var previo = antesDe(s.seccion, fila.origen), campos = [];
        s.campos.forEach(function (c) {
          if (!visible(c, fila.valores)) return;
          var v = limpiar(fila.valores[c.id]), a = previo[c.id] === undefined ? "" : previo[c.id];
          if (!igual(v, a)) campos.push({ campo: c.id, antes: a, valor: v });
        });
        if (campos.length || fila.yaNoExiste) filas.push({ origen: fila.origen, yaNoExiste: !!fila.yaNoExiste, campos: campos });
      });
      var com = limpiar(st.comentario);
      if (filas.length || com) r.secciones[s.seccion] = { comentario: com, filas: filas };
    });
    return r;
  }

  var zonaHecho = null;
  function mostrarHecho(nombre, texto, descargado) {
    vaciar(zonaHecho);
    var destino = DATOS.tecnico ? " a " + DATOS.tecnico : " a su técnico de ALANA IT";
    var area = el("textarea", { rows: "6", readonly: true, value: texto });
    var copiar = el("button", { type: "button", className: "secundario", text: "Copiar el texto", onclick: function () {
      area.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      copiar.textContent = ok ? "Copiado" : "Selecciónelo y cópielo a mano";
    } });
    zonaHecho.appendChild(el("div", { className: "hecho" }, [
      el("p", { text: descargado
        ? "Se ha descargado «" + nombre + "». Envíenos ese fichero por correo" + destino + "."
        : "Su navegador no ha permitido descargar el fichero. Copie este texto y péguelo en un correo" + destino + "." }),
      el("p", { text: descargado ? "Si no encuentra el fichero, copie este texto y péguelo en el correo:" : "" }),
      area, copiar,
    ]));
    zonaHecho.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function descargar() {
    var texto = JSON.stringify(respuestas(), null, 2);
    var nombre = "respuestas-" + DATOS.slug + "-" + new Date().toISOString().slice(0, 10) + ".json";
    try {
      var url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
      var a = el("a", { href: url, download: nombre });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      mostrarHecho(nombre, texto, true);
    } catch (e) { mostrarHecho(nombre, texto, false); }
  }

  function pintar() {
    vaciar(raiz);
    var destino = DATOS.tecnico ? " a " + DATOS.tecnico : " a su técnico de ALANA IT";
    if (recuperado) {
      raiz.appendChild(el("div", { className: "recuperado" }, [
        "Se ha recuperado lo que ya había escrito en este ordenador. ",
        el("button", { type: "button", className: "enlace", text: "Empezar de nuevo", onclick: function () {
          if (!window.confirm("¿Borrar lo escrito y empezar de nuevo?")) return;
          try { localStorage.removeItem(CLAVE); } catch (e) {}
          estado = estadoInicial(); recuperado = false; pintar();
        } }),
      ]));
    }
    raiz.appendChild(el("div", { className: "intro" }, [
      el("p", { text: "Con estos datos preparamos la visita de ALANA IT y documentamos su infraestructura. Rellene lo que sepa y deje en blanco lo que no: no hace falta completarlo todo." }),
      el("p", { text: "Lo que ya tenemos aparece escrito. Si algo no es correcto, corríjalo; si ya no lo tienen, márquelo." }),
      el("p", { className: "nota", text: "No escriba contraseñas ni datos bancarios en este formulario." }),
      el("p", { text: "Lo que escribe se guarda en este ordenador mientras lo rellena. Al terminar, pulse «Descargar respuestas» al final de la página y envíenos el fichero" + destino + "." }),
    ]));

    var tarjetaEmpresa = el("section", { className: "tarjeta" }, [
      el("h2", { text: "Datos de la empresa" }),
      el("p", { className: "ayuda", text: "Para saber con quién hablar." }),
      el("div", { className: "rejilla" }, DATOS.empresa.map(function (c) {
        return controlCampo({ id: c.id, label: c.label, tipo: "text", placeholder: c.placeholder }, estado.empresa[c.id], function (v) { estado.empresa[c.id] = v; guardarLocal(); });
      })),
    ]);
    raiz.appendChild(tarjetaEmpresa);

    DATOS.secciones.forEach(function (s) {
      var cuerpo = el("div");
      raiz.appendChild(el("section", { className: "tarjeta" }, [el("h2", { text: s.titulo }), el("p", { className: "ayuda", text: s.ayuda }), cuerpo]));
      pintarSeccion(s, cuerpo);
    });

    zonaHecho = el("div");
    raiz.appendChild(el("section", { className: "final" }, [
      el("div", { className: "rejilla" }, [
        controlCampo({ id: "nombre", label: "Su nombre", tipo: "text" }, estado.rellenadoPor.nombre, function (v) { estado.rellenadoPor.nombre = v; guardarLocal(); }),
        controlCampo({ id: "cargo", label: "Su cargo", tipo: "text" }, estado.rellenadoPor.cargo, function (v) { estado.rellenadoPor.cargo = v; guardarLocal(); }),
      ]),
      el("button", { type: "button", className: "primario", text: "Descargar respuestas", onclick: descargar }),
      zonaHecho,
    ]));
  }

  pintar();
})();
`;
