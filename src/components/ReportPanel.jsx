// Informe en vivo: se construye segun el tecnico rellena, para que vea el
// impacto de cada respuesta en el momento de darla y no al exportar el PDF.
//
// Todo lo que muestra sale de datos reales del formulario. La nota de seguridad
// llegara en la fase del ciberscore y ocupara la franja de arriba; hasta
// entonces esa franja resume cobertura y hallazgos abiertos, que es lo que se
// puede afirmar con lo que hay.

import React from "react";
import { C } from "../theme.js";
import { SECTIONS, preguntaDe, lectorEfectivo } from "../sections.js";
import { hintsVisibles, TIPOS_HINT } from "../hints.js";
import { computeScore } from "../score/computeScore.js";
import { CRITERIOS, PRECONDICIONES } from "../score/criterios.js";

// Semaforo de la nota. El magenta de marca marca el riesgo alto y el turquesa
// el bajo, para no meter un verde y un rojo ajenos a la paleta.
const COLOR_TRAMO = {
  critico: C.red,
  alto: C.red,
  medio: C.amber,
  bajo: C.green,
};

const COLOR_TIPO = {
  seguridad: { c: C.red, bg: C.redLight, borde: C.redBorder },
  legado: { c: C.amber, bg: C.amberLight, borde: C.amberBorder },
  comercial: { c: C.green, bg: C.greenLight, borde: C.greenBorder },
  doc: { c: C.blue, bg: C.blueLight, borde: C.blueBorder },
};

/** Recorre el formulario y resume cobertura y hallazgos. */
function resumir({ sectionEnabled, getVal, getCount, getHint }) {
  const respondidas = SECTIONS.filter(s => sectionEnabled[s.id] !== undefined).length;
  const activas = SECTIONS.filter(s => sectionEnabled[s.id] === "si");

  let campos = 0, rellenos = 0;
  const abiertos = [];
  const porTipo = { seguridad: 0, legado: 0, comercial: 0, doc: 0 };

  for (const s of activas) {
    let cs = 0, rs = 0;
    for (let i = 0; i < getCount(s.id); i++) {
      for (const f of s.fields) {
        // Un campo condicional que no se cumple no cuenta: no se puede rellenar
        if (f.dep && getVal(s.id, f.dep.field, i) !== f.dep.value) continue;
        cs++;
        const v = getVal(s.id, f.id, i);
        if (Array.isArray(v) ? v.length > 0 : v !== "" && v !== undefined) rs++;
      }
      for (const h of hintsVisibles(s.id, lectorEfectivo(s.id, getVal, i))) {
        porTipo[h.tipo]++;
        const marcable = TIPOS_HINT[h.tipo].marcable;
        const estado = getHint(h.id, i);
        if (marcable && estado !== "hecho" && estado !== "na") {
          abiertos.push({ ...h, seccion: s.label, icono: s.icon, instancia: getCount(s.id) > 1 ? i + 1 : null });
        }
      }
    }
    campos += cs; rellenos += rs;
  }

  // Los de seguridad primero: son los que no pueden quedarse sin cerrar
  abiertos.sort((a, b) => (a.tipo === "seguridad" ? 0 : 1) - (b.tipo === "seguridad" ? 0 : 1));

  return {
    respondidas, total: SECTIONS.length,
    activas: activas.length,
    campos, rellenos,
    pctCampos: campos ? Math.round((rellenos / campos) * 100) : 0,
    abiertos, porTipo,
  };
}

function Cifra({ valor, etiqueta, color }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 500, color, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{valor}</div>
      <div style={{ fontSize: 10.5, color: C.textLight, lineHeight: 1.3, marginTop: 2 }}>{etiqueta}</div>
    </div>
  );
}

export default function ReportPanel({ sectionEnabled, formData, instanceCounts, getVal, getCount, getHint, onIrASeccion, fechaVisita = "" }) {
  const r = resumir({ sectionEnabled, getVal, getCount, getHint });
  const score = computeScore({ formData, sectionEnabled, instanceCounts, criterios: CRITERIOS, precondiciones: PRECONDICIONES, fecha: fechaVisita });
  const seguridadAbiertos = r.abiertos.filter(h => h.tipo === "seguridad").length;

  const titulo = {
    fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase",
    color: C.textLight, marginBottom: 9,
  };

  return (
    <div style={{ padding: "16px 16px 28px" }}>
      <div style={titulo}>CiberScore</div>
      {score.nota !== null && !score.fiable ? (
        // La nota se ensena igualmente, en gris y sin etiqueta de tramo. Con el
        // denominador aplicable es una medida de progreso que sube segun se
        // rellena, y ocultarla mataria el gradiente durante la visita, que es
        // el unico momento en que el hueco tiene arreglo.
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 38, fontWeight: 600, lineHeight: 1, color: C.textLight, fontVariantNumeric: "tabular-nums" }}>
              {score.nota}
            </span>
            <span style={{ fontSize: 12, color: C.textLight }}>/ 100</span>
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 500, color: C.textLight }}>Provisional</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: C.border, overflow: "hidden", margin: "9px 0 4px" }}>
            <div style={{ height: "100%", width: `${score.nota}%`, background: C.textLight, transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: 10.5, color: C.textLight, lineHeight: 1.45 }}>
            {score.sinResponder.length > 0
              ? `Faltan ${score.sinResponder.length} secciones por responder: ${score.sinResponder.join(", ")}. Márcalas como "sí" o "no" antes de cerrar la visita.`
              // La evidencia manda siempre que sea ella la que no llega: con
              // un cliente al 13% el problema de verdad es el 87% sin mirar,
              // no los 2-3 campos padre sueltos. El mensaje de campos padre
              // solo tiene sentido cuando la evidencia YA esta al dia y lo
              // unico que falta son esos campos -si no, sonaria a "contesta
              // estos 3 y ya tienes nota" siendo falso.
              : score.evidencia < score.evidenciaMinima
                ? `${score.evidencia}% comprobado; hace falta el ${score.evidenciaMinima}%. Sube según completas.`
                : score.padresSinDecidir?.length > 0
                  ? `Falta${score.padresSinDecidir.length > 1 ? "n" : ""} ${score.padresSinDecidir.length} campo${score.padresSinDecidir.length > 1 ? "s que deciden" : " que decide"} otras respuestas: ${score.padresSinDecidir.map(p => preguntaDe(p.seccion, p.campo).pregunta).join(", ")}.`
                  : `${score.evidencia}% comprobado; hace falta el ${score.evidenciaMinima}%. Sube según completas.`}
          </div>
        </div>
      ) : score.nota === null ? (
        <div style={{ fontSize: 12, color: C.textLight, background: C.grayLight, borderRadius: 6, padding: "10px 12px", marginBottom: 18 }}>
          Aún no hay respuestas suficientes para calcular la nota.
        </div>
      ) : (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 38, fontWeight: 600, lineHeight: 1, color: COLOR_TRAMO[score.tramo.nivel], fontVariantNumeric: "tabular-nums" }}>
              {score.nota}
            </span>
            <span style={{ fontSize: 12, color: C.textLight }}>/ 100</span>
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 500, color: COLOR_TRAMO[score.tramo.nivel] }}>
              {score.tramo.etiqueta}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: C.border, overflow: "hidden", margin: "9px 0 4px" }}>
            <div style={{ height: "100%", width: `${score.nota}%`, background: COLOR_TRAMO[score.tramo.nivel], transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: 10.5, color: C.textLight }}>
            {score.capadaGlobal && <b style={{ color: C.red }}>Limitada por un hallazgo crítico · </b>}
            evidencia {score.evidencia}% de lo que aplicaba a este cliente
          </div>

          <div style={{ marginTop: 12 }}>
            {/* Sin filtrar por evaluable: los dominios sin datos son justo los
                que hay que ir a mirar, y esconderlos durante la visita es lo
                que dejaba salir un cliente entero sin backup revisado. */}
            {score.dominios.map(d => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ flex: 1, fontSize: 11.5, color: d.evaluable ? C.text : C.textLight, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {d.nombre}
                </span>
                {d.capado && <span title="Limitado por un hallazgo crítico" style={{ fontSize: 9.5, color: C.red }}>▲</span>}
                <span style={{ fontSize: 9.5, color: d.evidencia !== null && d.evidencia < 100 ? C.amber : C.textLight, fontVariantNumeric: "tabular-nums" }}>
                  {d.criteriosAplicables > 0 ? `${d.criteriosEvaluados}/${d.criteriosAplicables}` : ""}
                </span>
                <span style={{ width: 44, height: 4, borderRadius: 2, background: C.border, overflow: "hidden", flexShrink: 0 }}>
                  {d.evaluable && <span style={{ display: "block", height: "100%", width: `${d.nota}%`, background: COLOR_TRAMO[d.tramo.nivel] }} />}
                </span>
                <span style={{ width: 22, textAlign: "right", fontSize: 11, color: C.textLight, fontVariantNumeric: "tabular-nums" }}>
                  {d.evaluable ? d.nota : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dos cifras separadas, no una mezclada. La de campos respondia a una
          pregunta que el tecnico no se hace ("cuanto formulario queda?") y
          escondia la que si ("cuanto me falta para tener nota?"): un cliente
          con el 46% de campos rellenos tenia un 30% de evidencia y nadie podia
          explicar la diferencia, porque lo relleno era casi todo inventario. */}
      <div style={titulo}>Avance hacia la nota</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <Cifra valor={`${score.evidencia}%`} etiqueta={`comprobado · hace falta ${score.evidenciaMinima}%`} color={score.fiable ? C.green : C.blue} />
        <Cifra valor={`${r.respondidas}/${r.total}`} etiqueta="secciones decididas" color={C.blue} />
      </div>
      <div style={{ height: 5, borderRadius: 3, background: C.border, overflow: "hidden", marginBottom: 6, position: "relative" }}>
        <div style={{ height: "100%", width: `${score.evidencia}%`, background: score.fiable ? C.green : C.blue, transition: "width 0.3s" }} />
        {/* La marca del umbral: sin ella el tecnico no sabe donde esta la meta. */}
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${score.evidenciaMinima}%`, width: 1, background: C.textLight }} />
      </div>
      <div style={{ fontSize: 10.5, color: C.textLight, marginBottom: 18, lineHeight: 1.45 }}>
        Inventario documentado: {r.pctCampos}% ({r.rellenos} de {r.campos} campos). No mueve la nota.
      </div>

      {/* Hallazgos del motor de puntuacion: sin backup, sin correo, RDP
          expuesto... Antes solo salian en el PDF exportado, asi que un
          hallazgo que ya habia bajado la nota podia no verse en ningun sitio
          durante la visita. Deliberadamente antes de "Hallazgos abiertos"
          (avisos): estos si limitan la nota, los avisos son independientes. */}
      {score.hallazgos.length > 0 && (
        <>
          <div style={titulo}>Hallazgos del CiberScore</div>
          <div style={{ fontSize: 10.5, color: C.textLight, lineHeight: 1.45, marginBottom: 8 }}>
            Limitan la nota por si solos. No son los avisos de mas abajo.
          </div>
          <div style={{ marginBottom: 18 }}>
            {score.hallazgos.map(h => {
              const c = CRITERIOS.find(x => x.id === h.id);
              const p = PRECONDICIONES.find(x => x.id === h.id);
              const seccion = c?.seccion ?? p?.seccion;
              return (
                <button
                  key={h.id}
                  onClick={() => onIrASeccion?.(seccion)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                    fontSize: 11.5, lineHeight: 1.4, color: C.text,
                    background: C.redLight, border: `1px solid ${C.redBorder}`,
                    borderRadius: 6, padding: "7px 10px", marginBottom: 5,
                  }}>
                  {(c ?? p)?.titular || h.texto}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Comprobaciones criticas que aplicaban y nadie ha hecho. No son
          hallazgos —nadie ha visto el problema— pero son lo unico que impide
          decir que el cliente esta limpio, asi que van antes que los avisos. */}
      {score.capadoresPendientes?.length > 0 && (
        <>
          <div style={titulo}>Preguntas críticas sin contestar</div>
          <div style={{ fontSize: 10.5, color: C.textLight, lineHeight: 1.45, marginBottom: 8 }}>
            No son tareas: son campos del formulario. Pulsa para ir a la sección; al contestarlos desaparecen.
          </div>
          <div style={{ marginBottom: 18 }}>
            {/* Igual que "Hallazgos abiertos" mas abajo: en un cliente muy
                incompleto esta lista puede tener 10-15 preguntas, y sacarlas
                todas de golpe entierra las importantes. Mismo tope de 6. */}
            {[...score.capadoresPendientes]
              .sort((a, b) => (a.capDominio ?? 100) - (b.capDominio ?? 100))
              .slice(0, 6)
              .map(cp => (
                <button
                  key={cp.id}
                  onClick={() => onIrASeccion?.(cp.seccion)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                    fontSize: 11.5, lineHeight: 1.4, color: C.text,
                    background: C.amberLight, border: `1px solid ${C.amberBorder}`,
                    borderRadius: 6, padding: "7px 10px", marginBottom: 5,
                  }}>
                  {preguntaDe(cp.seccion, cp.campo).pregunta}
                  <span style={{ display: "block", fontSize: 10, color: C.amber, marginTop: 2 }}>
                    {preguntaDe(cp.seccion, cp.campo).seccion} · sin contestar
                  </span>
                </button>
              ))}
            {score.capadoresPendientes.length > 6 && (
              <div style={{ fontSize: 11, color: C.textLight, paddingLeft: 10, marginTop: 4 }}>
                y {score.capadoresPendientes.length - 6} más
              </div>
            )}
          </div>
        </>
      )}

      {/* Hallazgos */}
      <div style={titulo}>Hallazgos abiertos</div>
      {r.abiertos.length === 0 ? (
        <div style={{ fontSize: 12, color: C.textLight, background: C.grayLight, borderRadius: 6, padding: "10px 12px", marginBottom: 18 }}>
          {r.activas === 0
            ? "Marca las secciones que apliquen para empezar."
            : "Ninguno pendiente. Los avisos aparecen aquí según respondes."}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {seguridadAbiertos > 0 && (
              <span style={{ fontSize: 11, fontWeight: 500, color: C.red, background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: "2px 9px" }}>
                {seguridadAbiertos} de seguridad
              </span>
            )}
            {r.abiertos.length - seguridadAbiertos > 0 && (
              <span style={{ fontSize: 11, fontWeight: 500, color: C.amber, background: C.amberLight, border: `1px solid ${C.amberBorder}`, borderRadius: 10, padding: "2px 9px" }}>
                {r.abiertos.length - seguridadAbiertos} de legado
              </span>
            )}
          </div>
          <div style={{ marginBottom: 18 }}>
            {r.abiertos.slice(0, 6).map((h, i) => {
              const col = COLOR_TIPO[h.tipo];
              return (
                <button
                  key={h.id + i}
                  onClick={() => onIrASeccion(SECTIONS.find(s => s.label === h.seccion)?.id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                    background: col.bg, border: "none", borderLeft: `2px solid ${col.c}`,
                    padding: "7px 10px", marginBottom: 5, fontFamily: "inherit",
                  }}
                >
                  <div style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: col.c, marginBottom: 2 }}>
                    {h.seccion}{h.instancia ? ` · ${h.instancia}` : ""}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.45 }}>
                    {h.texto.length > 110 ? h.texto.slice(0, 108).replace(/\s+\S*$/, "") + "…" : h.texto}
                  </div>
                </button>
              );
            })}
            {r.abiertos.length > 6 && (
              <div style={{ fontSize: 11, color: C.textLight, paddingLeft: 10, marginTop: 4 }}>
                y {r.abiertos.length - 6} más
              </div>
            )}
          </div>
        </>
      )}

      {/* Oportunidades: internas, nunca salen en el informe del cliente */}
      {r.porTipo.comercial > 0 && (
        <>
          <div style={titulo}>Oportunidades detectadas</div>
          <div style={{
            fontSize: 12, color: C.text, background: C.greenLight,
            border: `1px solid ${C.greenBorder}`, borderRadius: 6, padding: "9px 11px", marginBottom: 18,
          }}>
            <b style={{ color: C.green }}>{r.porTipo.comercial}</b> propuestas de servicio para esta visita
            <div style={{ fontSize: 10.5, color: C.textLight, marginTop: 3 }}>Uso interno · no salen en el informe del cliente</div>
          </div>
        </>
      )}

    </div>
  );
}
