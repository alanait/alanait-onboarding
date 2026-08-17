// Aviso de buena practica que se pinta junto al campo que lo dispara.
//
// Pensado para un tecnico con prisa en casa del cliente: se ve, se entiende de
// una pasada y se puede ignorar. Los de seguridad y legado llevan estado; al
// marcarlos se atenuan, de modo que siguen ahi para el informe pero dejan de
// reclamar atencion.

import React from "react";
import { C } from "../theme.js";
import { TIPOS_HINT, ESTADOS_HINT } from "../hints.js";

const COLOR = {
  seguridad: { texto: C.red, fondo: C.redLight, borde: C.red },
  legado: { texto: C.amber, fondo: C.amberLight, borde: C.amber },
  comercial: { texto: C.green, fondo: C.greenLight, borde: C.green },
  doc: { texto: C.blue, fondo: C.blueLight, borde: C.blue },
};

export default function HintBanner({ hint, estado, onEstado }) {
  const meta = TIPOS_HINT[hint.tipo];
  const c = COLOR[hint.tipo];
  const resuelto = estado === "hecho" || estado === "na";

  return (
    <div
      style={{
        display: "flex", alignItems: "flex-start", gap: 9,
        background: c.fondo, borderLeft: `3px solid ${c.borde}`,
        borderRadius: 6, padding: "9px 12px", marginBottom: 12,
        opacity: resuelto ? 0.55 : 1, transition: "opacity 0.15s",
      }}
    >
      <span style={{ fontSize: 13, lineHeight: "18px", flexShrink: 0 }} aria-hidden="true">
        {meta.icono}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 500, letterSpacing: "0.06em",
          textTransform: "uppercase", color: c.texto, marginRight: 7,
        }}>
          {meta.etiqueta}
          {meta.interno ? " · interno" : ""}
        </span>
        <span style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>{hint.texto}</span>
      </div>

      {meta.marcable && (
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {ESTADOS_HINT.map(e => {
            const activo = estado === e.valor;
            return (
              <button
                key={e.valor}
                // Volver a pulsar el estado activo lo desmarca, igual que los
                // radios del formulario.
                onClick={() => onEstado(activo ? "" : e.valor)}
                aria-pressed={activo}
                style={{
                  fontSize: 10.5, padding: "2px 8px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${activo ? c.borde : C.border}`,
                  background: activo ? "#fff" : "transparent",
                  color: activo ? c.texto : C.textLight,
                  fontWeight: activo ? 700 : 400,
                  fontFamily: "inherit", whiteSpace: "nowrap",
                }}
              >
                {e.etiqueta}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
