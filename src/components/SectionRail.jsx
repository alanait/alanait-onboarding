// Navegacion permanente por secciones, a la izquierda.
//
// Sustituye a la tira de iconos de la cabecera y al bloque "por seccion" del
// informe, que hacian lo mismo en dos sitios distintos. Al ser una columna fija
// caben el nombre completo, el avance y los avisos, que en una tira horizontal
// de 15 iconos no cabian.

import React from "react";
import { C } from "../theme.js";
import { SECTIONS } from "../sections.js";

export default function SectionRail({ abierto, sectionEnabled, avance, avisos, activa, onIr }) {
  return (
    <div style={{
      width: abierto ? 236 : 0, minWidth: abierto ? 236 : 0,
      background: "#fff", borderRight: abierto ? `1px solid ${C.border}` : "none",
      overflowY: "auto", overflowX: "hidden", height: "100%", flexShrink: 0,
      transition: "width 0.22s ease, min-width 0.22s ease",
    }}>
      <div style={{ padding: "14px 10px 24px" }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
          color: C.textLight, padding: "0 8px", marginBottom: 8,
        }}>
          Secciones
        </div>

        {SECTIONS.map(s => {
          const est = sectionEnabled[s.id];
          const a = avance(s.id);
          const n = est === "si" ? avisos(s) : 0;
          const act = activa === s.id;
          const pct = a.total ? Math.round((a.rellenos / a.total) * 100) : 0;

          return (
            <button
              key={s.id}
              onClick={() => onIr(s.id)}
              title={s.label}
              style={{
                display: "flex", alignItems: "center", gap: 9, width: "100%",
                padding: "7px 8px", marginBottom: 1, borderRadius: 7,
                background: act ? C.blueLight : "transparent",
                border: "none", borderLeft: `2px solid ${act ? C.blue : "transparent"}`,
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                opacity: est === "no" ? 0.45 : 1, transition: "background 0.15s",
              }}
              onMouseEnter={e => { if (!act) e.currentTarget.style.background = C.grayLight; }}
              onMouseLeave={e => { if (!act) e.currentTarget.style.background = "transparent"; }}
            >
              {/* Estado: turquesa respondida, magenta sin servicio, hueco sin responder */}
              <span style={{
                width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                background: est === "si" ? C.green : est === "no" ? C.red : "transparent",
                border: est === undefined ? `1.5px solid ${C.border}` : "none",
              }} />

              <span style={{
                flex: 1, minWidth: 0, fontSize: 12.5,
                color: act ? C.blue : C.text, fontWeight: act ? 600 : 400,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {s.label}
              </span>

              {n > 0 && (
                <span style={{
                  fontSize: 9.5, fontWeight: 700, color: "#fff", background: C.red,
                  borderRadius: 7, padding: "0 5px", flexShrink: 0, lineHeight: "14px",
                }}>{n}</span>
              )}

              {est === "si" && (
                <span style={{ width: 26, height: 3, borderRadius: 2, background: C.border, overflow: "hidden", flexShrink: 0 }}>
                  <span style={{ display: "block", height: "100%", width: `${pct}%`, background: pct === 100 ? C.green : C.blue }} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
