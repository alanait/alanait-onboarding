// Informe en vivo: se construye segun el tecnico rellena, para que vea el
// impacto de cada respuesta en el momento de darla y no al exportar el PDF.
//
// Todo lo que muestra sale de datos reales del formulario. La nota de seguridad
// llegara en la fase del ciberscore y ocupara la franja de arriba; hasta
// entonces esa franja resume cobertura y hallazgos abiertos, que es lo que se
// puede afirmar con lo que hay.

import React from "react";
import { C } from "../theme.js";
import { SECTIONS } from "../sections.js";
import { hintsVisibles, TIPOS_HINT } from "../hints.js";

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
  const porSeccion = [];

  for (const s of activas) {
    let cs = 0, rs = 0, avisos = 0;
    for (let i = 0; i < getCount(s.id); i++) {
      for (const f of s.fields) {
        // Un campo condicional que no se cumple no cuenta: no se puede rellenar
        if (f.dep && getVal(s.id, f.dep.field, i) !== f.dep.value) continue;
        cs++;
        const v = getVal(s.id, f.id, i);
        if (Array.isArray(v) ? v.length > 0 : v !== "" && v !== undefined) rs++;
      }
      for (const h of hintsVisibles(s.id, id => getVal(s.id, id, i))) {
        porTipo[h.tipo]++;
        const marcable = TIPOS_HINT[h.tipo].marcable;
        const estado = getHint(h.id, i);
        if (marcable && estado !== "hecho" && estado !== "na") {
          avisos++;
          abiertos.push({ ...h, seccion: s.label, icono: s.icon, instancia: getCount(s.id) > 1 ? i + 1 : null });
        }
      }
    }
    campos += cs; rellenos += rs;
    porSeccion.push({ id: s.id, label: s.label, icono: s.icon, cs, rs, avisos });
  }

  // Los de seguridad primero: son los que no pueden quedarse sin cerrar
  abiertos.sort((a, b) => (a.tipo === "seguridad" ? 0 : 1) - (b.tipo === "seguridad" ? 0 : 1));

  return {
    respondidas, total: SECTIONS.length,
    activas: activas.length,
    campos, rellenos,
    pctCampos: campos ? Math.round((rellenos / campos) * 100) : 0,
    abiertos, porTipo, porSeccion,
  };
}

function Cifra({ valor, etiqueta, color }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{valor}</div>
      <div style={{ fontSize: 10.5, color: C.textLight, lineHeight: 1.3, marginTop: 2 }}>{etiqueta}</div>
    </div>
  );
}

export default function ReportPanel({ sectionEnabled, getVal, getCount, getHint, onIrASeccion }) {
  const r = resumir({ sectionEnabled, getVal, getCount, getHint });
  const seguridadAbiertos = r.abiertos.filter(h => h.tipo === "seguridad").length;

  const titulo = {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
    color: C.textLight, marginBottom: 9,
  };

  return (
    <div style={{ padding: "16px 16px 28px" }}>
      <div style={titulo}>Informe en vivo</div>

      {/* Cobertura */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <Cifra valor={`${r.respondidas}/${r.total}`} etiqueta="secciones respondidas" color={C.blue} />
        <Cifra valor={`${r.pctCampos}%`} etiqueta={`${r.rellenos} de ${r.campos} campos`} color={r.pctCampos >= 80 ? C.green : C.blue} />
      </div>
      <div style={{ height: 5, borderRadius: 3, background: C.border, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ height: "100%", width: `${r.pctCampos}%`, background: r.pctCampos >= 80 ? C.green : C.blue, transition: "width 0.3s" }} />
      </div>

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
              <span style={{ fontSize: 11, fontWeight: 700, color: C.red, background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: "2px 9px" }}>
                {seguridadAbiertos} de seguridad
              </span>
            )}
            {r.abiertos.length - seguridadAbiertos > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, background: C.amberLight, border: `1px solid ${C.amberBorder}`, borderRadius: 10, padding: "2px 9px" }}>
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
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: col.c, marginBottom: 2 }}>
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

      {/* Avance por seccion */}
      {r.porSeccion.length > 0 && (
        <>
          <div style={titulo}>Por sección</div>
          {r.porSeccion.map(s => (
            <button
              key={s.id}
              onClick={() => onIrASeccion(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                background: "transparent", border: "none", padding: "4px 0",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}
            >
              <span style={{ fontSize: 12, flexShrink: 0 }} aria-hidden="true">{s.icono}</span>
              <span style={{ flex: 1, fontSize: 11.5, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.label}
              </span>
              {s.avisos > 0 && (
                <span style={{ fontSize: 9.5, fontWeight: 700, color: "#fff", background: C.red, borderRadius: 7, padding: "0 5px", flexShrink: 0 }}>
                  {s.avisos}
                </span>
              )}
              <span style={{ width: 42, height: 4, borderRadius: 2, background: C.border, overflow: "hidden", flexShrink: 0 }}>
                <span style={{ display: "block", height: "100%", width: `${s.cs ? Math.round((s.rs / s.cs) * 100) : 0}%`, background: s.cs && s.rs === s.cs ? C.green : C.blue }} />
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
