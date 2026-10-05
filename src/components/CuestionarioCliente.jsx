// Cuestionario para el cliente: descargarlo y revisar sus respuestas.
//
// Dos pasos en la misma ventana:
//   1. Descargar el cuestionario (un .html) para mandarselo al cliente.
//   2. Cargar el .json que devuelve y revisar dato a dato antes de aplicar.
//
// Toda la logica de que se aplica y que no vive en src/cliente/respuestas.js,
// que esta probada en node (scripts/test-cuestionario.mjs). Esta pantalla solo
// ensena la comparacion y recoge lo que marca el tecnico.

import React, { useState } from "react";
import { C } from "../theme.js";
import { construirCuestionario, slugEmpresa } from "../cliente/cuestionarioHTML.js";
import { leerRespuestas, compararRespuestas, aplicarRespuestas, seleccionInicial, textoValor } from "../cliente/respuestas.js";
import { LOGO_ALANA } from "../assets/logo.js";

const ETIQUETA_ESTADO = {
  rellena: { texto: "Rellena un hueco", color: C.green, fondo: C.greenLight },
  cambia: { texto: "Corrige un dato", color: C.blue, fondo: C.blueLight },
  conflicto: { texto: "La ficha ha cambiado", color: C.amber, fondo: C.amberLight },
  vaciado: { texto: "Lo ha borrado", color: C.gray, fondo: C.grayLight },
  referencia: { texto: "Solo referencia", color: C.gray, fondo: C.grayLight },
};

const aSet = (o) => new Set(Object.keys(o).filter(k => o[k]));
const aObjeto = (s) => Object.fromEntries([...s].map(k => [k, true]));

function Etiqueta({ estado }) {
  const e = ETIQUETA_ESTADO[estado] ?? ETIQUETA_ESTADO.referencia;
  return <span style={{ fontSize: 11, color: e.color, background: e.fondo, borderRadius: 10, padding: "1px 8px", whiteSpace: "nowrap" }}>{e.texto}</span>;
}

function Propuesta({ p, marcada, alCambiar, bloqueada }) {
  const desactivada = !p.aplicable || bloqueada;
  return (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderTop: `1px solid ${C.border}`, cursor: desactivada ? "default" : "pointer", opacity: desactivada ? 0.75 : 1 }}>
      <input type="checkbox" checked={!!marcada && !desactivada} disabled={desactivada} onChange={e => alCambiar(e.target.checked)} style={{ marginTop: 3 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <b style={{ fontWeight: 500, color: C.text }}>{p.etiqueta}</b>
          {p.origen !== undefined && p.origen !== null && <span style={{ fontSize: 11, color: C.textLight }}>nº {p.origen + 1}</span>}
          <Etiqueta estado={p.estado} />
        </span>
        <span style={{ display: "block", fontSize: 13, color: C.textLight, marginTop: 2 }}>
          Ficha: <span style={{ color: C.text }}>{textoValor(p.actual, p.opciones)}</span>
          {"  →  "}Cliente: <span style={{ color: C.text, fontWeight: 500 }}>{textoValor(p.valor, p.opciones)}</span>
        </span>
        {p.motivo && <span style={{ display: "block", fontSize: 12, color: C.textLight, marginTop: 2 }}>{p.motivo}</span>}
      </span>
    </label>
  );
}

export default function CuestionarioCliente({ estado, tecnico, onAplicar, onDescargado, onCerrar }) {
  const [paso, setPaso] = useState("inicio");
  const [error, setError] = useState("");
  const [pegado, setPegado] = useState("");
  const [lectura, setLectura] = useState(null);       // { datos, avisos }
  const [cmp, setCmp] = useState(null);
  const [sel, setSel] = useState(null);               // { claves, filas, padres, marcarSi } como objetos
  const [resumen, setResumen] = useState(null);

  const descargar = () => {
    const id = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
    const html = construirCuestionario({ ...estado, tecnico, generado: new Date().toISOString(), id, logo: LOGO_ALANA });
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `cuestionario-${slugEmpresa(estado.clientData.empresa)}-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    onDescargado?.();
  };

  const procesar = (texto) => {
    const r = leerRespuestas(texto);
    if (!r.ok) { setError(r.error); return; }
    const c = compararRespuestas(r.datos, estado);
    const s = seleccionInicial(c);
    setError("");
    setLectura(r);
    setCmp(c);
    setSel({ claves: aObjeto(s.claves), filas: aObjeto(s.filas), padres: {}, marcarSi: {} });
    setPaso("revision");
  };

  const leerFichero = (fichero) => {
    if (!fichero) return;
    const lector = new FileReader();
    lector.onload = (e) => procesar(String(e.target.result || ""));
    lector.onerror = () => setError("No se ha podido leer el fichero.");
    lector.readAsText(fichero);
  };

  const marcar = (grupo, clave, valor) => setSel(prev => ({ ...prev, [grupo]: { ...prev[grupo], [clave]: valor } }));

  const aplicar = () => {
    const seleccion = { claves: aSet(sel.claves), filas: aSet(sel.filas), padres: aSet(sel.padres), marcarSi: aSet(sel.marcarSi) };
    const r = aplicarRespuestas(estado, lectura.datos, seleccion, { ahora: new Date().toISOString() });
    onAplicar(r);
    setResumen(r.resumen);
    setPaso("hecho");
  };

  const cuantos = sel ? Object.values(sel.claves).filter(Boolean).length + Object.values(sel.filas).filter(Boolean).length : 0;
  const empresaDistinta = lectura && lectura.datos.meta.empresa && estado.clientData.empresa
    && lectura.datos.meta.empresa.trim().toLowerCase() !== estado.clientData.empresa.trim().toLowerCase();

  const boton = { padding: "9px 16px", borderRadius: 8, fontSize: 13.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" };
  const primario = { ...boton, background: C.green, color: "#fff", border: "none" };
  const secundario = { ...boton, background: "#fff", color: C.blue, border: `1px solid ${C.blueBorder}` };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: 720, maxWidth: "100%", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 17, color: C.navy }}>📨 Cuestionario para el cliente</div>
            <div style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>
              El cliente adelanta datos de inventario; tú los revisas antes de que entren en la ficha.
            </div>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: C.gray, padding: "4px 8px", borderRadius: 6 }}>✕</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "16px 24px 20px", fontSize: 14, color: C.text }}>
          {paso === "inicio" && (
            <>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}>
                <div style={{ fontWeight: 500, color: C.navy, marginBottom: 4 }}>1. Mandárselo al cliente</div>
                <p style={{ margin: "0 0 10px", lineHeight: 1.5 }}>
                  Se descarga un fichero <b>.html</b> con lo que ya tenemos de esta ficha: contratos, equipos, correo,
                  antivirus, telefonía, impresoras, aplicaciones, servicios contratados y otros dispositivos. El cliente lo abre
                  en su navegador, sin cuenta ni internet, lo rellena y nos devuelve un fichero <b>.json</b>.
                </p>
                <p style={{ margin: "0 0 12px", fontSize: 12.5, color: C.textLight, lineHeight: 1.5 }}>
                  Algunos correos bloquean los adjuntos .html: si no le llega, mándaselo comprimido en .zip o como enlace de OneDrive.
                  No pregunta nada de seguridad ni le enseña la nota ni los avisos.
                </p>
                <button onClick={descargar} style={primario}>Descargar cuestionario</button>
              </div>

              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontWeight: 500, color: C.navy, marginBottom: 4 }}>2. Cargar lo que ha contestado</div>
                <p style={{ margin: "0 0 10px", lineHeight: 1.5 }}>
                  Abre el <b>.json</b> que te ha devuelto. Verás cada dato al lado de lo que hay en la ficha y elegirás qué aplicar.
                </p>
                <input type="file" accept=".json,application/json" onChange={e => { leerFichero(e.target.files?.[0]); e.target.value = ""; }} />
                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: "pointer", fontSize: 13, color: C.blue }}>Me lo ha mandado pegado en un correo</summary>
                  <textarea value={pegado} onChange={e => setPegado(e.target.value)} rows={5} placeholder="Pega aquí el texto que empieza por {"
                    style={{ width: "100%", marginTop: 8, padding: 8, border: `1px solid ${C.border}`, borderRadius: 7, fontFamily: "Consolas, monospace", fontSize: 12 }} />
                  <button onClick={() => procesar(pegado)} style={{ ...secundario, marginTop: 8 }}>Leer el texto</button>
                </details>
                {error && <div style={{ marginTop: 10, padding: "8px 12px", background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 8, color: C.red, fontSize: 13 }}>{error}</div>}
              </div>
            </>
          )}

          {paso === "revision" && cmp && (
            <>
              <div style={{ fontSize: 13, color: C.textLight, marginBottom: 10 }}>
                Contestado {lectura.datos.meta.rellenadoPor.nombre ? `por ${lectura.datos.meta.rellenadoPor.nombre}${lectura.datos.meta.rellenadoPor.cargo ? ` (${lectura.datos.meta.rellenadoPor.cargo})` : ""}` : "sin nombre"}
                {lectura.datos.meta.respondido ? ` · ${new Date(lectura.datos.meta.respondido).toLocaleString("es-ES")}` : ""}.
                {" "}Lo que rellena un hueco viene marcado; lo que cambia algo que ya está escrito lo decides tú.
              </div>
              {empresaDistinta && (
                <div style={{ marginBottom: 12, padding: "8px 12px", background: C.amberLight, border: `1px solid ${C.amberBorder}`, borderRadius: 8, color: C.amber, fontSize: 13 }}>
                  Estas respuestas son de «{lectura.datos.meta.empresa}» y la ficha abierta es «{estado.clientData.empresa}». Comprueba que es el cliente correcto.
                </div>
              )}
              {lectura.avisos.length > 0 && (
                <div style={{ marginBottom: 12, padding: "8px 12px", background: C.grayLight, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12.5, color: C.textLight }}>
                  Se han descartado {lectura.avisos.length} datos que el cuestionario no pregunta o que no son válidos.
                </div>
              )}

              {cmp.empresa.length > 0 && (
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px 4px", marginBottom: 12 }}>
                  <div style={{ fontWeight: 500, color: C.navy }}>Datos de la empresa</div>
                  {cmp.empresa.map(p => <Propuesta key={p.clave} p={p} marcada={sel.claves[p.clave]} alCambiar={v => marcar("claves", p.clave, v)} />)}
                </div>
              )}

              {cmp.secciones.map(s => {
                const necesitaSi = s.estadoSeccion !== "si" && (s.propuestas.some(p => p.aplicable) || s.filasNuevas.length > 0);
                const bloqueada = necesitaSi && !sel.marcarSi[s.seccion];
                return (
                  <div key={s.seccion} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px 6px", marginBottom: 12 }}>
                    <div style={{ fontWeight: 500, color: C.navy }}>{s.titulo}</div>
                    {necesitaSi && (
                      <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0", padding: "6px 10px", background: C.amberLight, borderRadius: 7, fontSize: 13, color: C.amber, cursor: "pointer" }}>
                        <input type="checkbox" checked={!!sel.marcarSi[s.seccion]} onChange={e => marcar("marcarSi", s.seccion, e.target.checked)} />
                        En la ficha esta sección no está marcada «Sí». Márcala para poder aplicar lo que dice el cliente.
                      </label>
                    )}
                    {s.comentario && (
                      <div style={{ margin: "8px 0", padding: "8px 10px", background: C.blueLight, borderRadius: 7, fontSize: 13 }}>
                        <span style={{ color: C.textLight }}>Comentario del cliente: </span>{s.comentario}
                      </div>
                    )}
                    {s.infos.map((t, i) => (
                      <div key={i} style={{ margin: "6px 0", fontSize: 13, color: C.amber }}>{t}</div>
                    ))}
                    {s.propuestas.map(p => <Propuesta key={p.clave} p={p} marcada={sel.claves[p.clave]} bloqueada={bloqueada} alCambiar={v => marcar("claves", p.clave, v)} />)}
                    {s.filasNuevas.map(f => {
                      const marcadaFila = !!sel.filas[f.clave] && !bloqueada;
                      return (
                        <div key={f.clave} style={{ padding: "8px 0", borderTop: `1px solid ${C.border}`, opacity: bloqueada ? 0.75 : 1 }}>
                          <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: bloqueada ? "default" : "pointer" }}>
                            <input type="checkbox" checked={marcadaFila} disabled={bloqueada} onChange={e => marcar("filas", f.clave, e.target.checked)} />
                            <b style={{ fontWeight: 500 }}>Añadir {s.etiquetaFila.toLowerCase()} nueva</b>
                          </label>
                          <div style={{ marginLeft: 26, fontSize: 13, color: C.textLight }}>
                            {f.campos.filter(c => !c.padre).map(c => `${c.etiqueta}: ${textoValor(c.valor, c.opciones)}`).join(" · ")}
                          </div>
                          {f.campos.filter(c => c.padre).map(c => (
                            <label key={c.campo} style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: 26, marginTop: 4, fontSize: 13, cursor: marcadaFila ? "pointer" : "default" }}>
                              <input type="checkbox" disabled={!marcadaFila} checked={marcadaFila && !!sel.padres[`${f.clave}.${c.campo}`]} onChange={e => marcar("padres", `${f.clave}.${c.campo}`, e.target.checked)} />
                              Usar el tipo que indica el cliente: <b style={{ fontWeight: 500 }}>{textoValor(c.valor, c.opciones)}</b>
                              <span style={{ color: C.textLight }}>(decide qué preguntas aparecen: compruébalo)</span>
                            </label>
                          ))}
                          {f.conCriterios && (
                            <div style={{ marginLeft: 26, marginTop: 4, fontSize: 12, color: C.textLight }}>
                              Al añadirlo quedan pendientes de comprobar en la visita su titularidad y su acceso al panel.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {cmp.empresa.length === 0 && cmp.secciones.length === 0 && (
                <div style={{ textAlign: "center", padding: 30, color: C.textLight }}>Las respuestas no traen nada distinto de lo que ya hay en la ficha.</div>
              )}
            </>
          )}

          {paso === "hecho" && resumen && (
            <div style={{ lineHeight: 1.6 }}>
              <p style={{ margin: "0 0 8px" }}>
                Aplicados <b>{resumen.campos}</b> {resumen.campos === 1 ? "dato" : "datos"} y <b>{resumen.filas}</b> {resumen.filas === 1 ? "fila nueva" : "filas nuevas"}
                {resumen.marcadas.length ? `, y ${resumen.marcadas.length === 1 ? "una sección marcada" : `${resumen.marcadas.length} secciones marcadas`} «Sí»` : ""}.
              </p>
              <p style={{ margin: "0 0 8px", color: C.green, fontWeight: 500 }}>Pulsa «Guardar» para conservarlos.</p>
              {resumen.omitidos.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 13, color: C.textLight }}>
                  <div style={{ marginBottom: 4 }}>No se ha aplicado:</div>
                  {resumen.omitidos.map((o, i) => <div key={i}>· {o.seccion}{o.campo ? ` · ${o.campo}` : ""}: {o.motivo}</div>)}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 24px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {paso === "revision" && (
            <>
              <button onClick={() => { setPaso("inicio"); setLectura(null); setCmp(null); }} style={secundario}>Volver</button>
              <button onClick={aplicar} disabled={cuantos === 0} style={{ ...primario, opacity: cuantos === 0 ? 0.5 : 1 }}>
                Aplicar {cuantos} {cuantos === 1 ? "elemento" : "elementos"}
              </button>
            </>
          )}
          {paso !== "revision" && <button onClick={onCerrar} style={secundario}>Cerrar</button>}
        </div>
      </div>
    </div>
  );
}
