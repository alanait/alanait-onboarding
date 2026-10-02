// Navegacion permanente por secciones, a la izquierda.
//
// Sustituye a la tira de iconos de la cabecera y al bloque "por seccion" del
// informe, que hacian lo mismo en dos sitios distintos. Al ser una columna fija
// caben el nombre completo, el avance y los avisos, que en una tira horizontal
// de 15 iconos no cabian.

//
// Va por TARJETAS, no por secciones: "Aplicaciones de negocio" y "Licencias y
// contratos" se ven juntas en el formulario y aqui son una sola entrada. Su
// punto de estado solo sale con las dos preguntas decididas, y al pulsarla se
// salta a la primera que falte.

import React from "react";
import { C } from "../theme.js";
import { TARJETAS, estadoTarjeta } from "../sections.js";

// Avance de una tarjeta. Si alguna de sus secciones en "si" tiene campos que
// puntuan, se suman solo esos; si ninguna puntua, el inventario de todas.
// Sumar los dos tipos mezclaria cosas que no se miden igual.
function avanceTarjeta(t, sectionEnabled, avance) {
  const partes = t.miembros.filter(m => sectionEnabled[m.id] === "si").map(m => avance(m.id));
  const usadas = partes.some(p => p.puntua) ? partes.filter(p => p.puntua) : partes;
  return usadas.reduce((a, p) => ({ total: a.total + p.total, rellenos: a.rellenos + p.rellenos }), { total: 0, rellenos: 0 });
}

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
          fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase",
          color: C.textLight, padding: "0 8px", marginBottom: 8,
        }}>
          Secciones
        </div>

        {TARJETAS.map(t => {
          const s = t.bloque ?? t.miembros[0];
          const { estado: est, faltan } = estadoTarjeta(t, sectionEnabled);
          const a = avanceTarjeta(t, sectionEnabled, avance);
          const n = t.miembros.reduce((suma, m) => suma + (sectionEnabled[m.id] === "si" ? avisos(m) : 0), 0);
          const act = t.miembros.some(m => m.id === activa);
          const pct = a.total ? Math.round((a.rellenos / a.total) * 100) : 0;

          return (
            <button
              key={t.id}
              onClick={() => onIr((faltan[0] ?? t.miembros[0]).id)}
              title={faltan.length && t.miembros.length > 1 ? `${s.label} · falta decidir: ${faltan.map(m => m.label).join(" y ")}` : s.label}
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
              {/* Icono de la seccion, con un punto de estado encima:
                  turquesa respondida, magenta sin servicio, nada sin responder */}
              <span style={{ position: "relative", flexShrink: 0, width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 14, lineHeight: 1, filter: est === "no" ? "grayscale(1)" : "none" }} aria-hidden="true">{s.icon}</span>
                {est !== undefined && (
                  <span style={{
                    position: "absolute", right: -2, bottom: -1,
                    width: 7, height: 7, borderRadius: "50%",
                    background: est === "si" ? C.green : C.red,
                    border: "1.5px solid #fff",
                  }} />
                )}
              </span>

              <span style={{
                flex: 1, minWidth: 0, fontSize: 12.5,
                color: act ? C.blue : C.text, fontWeight: act ? 600 : 400,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {s.label}
              </span>

              {n > 0 && (
                <span style={{
                  fontSize: 9.5, fontWeight: 500, color: "#fff", background: C.red,
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
