// Componentes de formulario del editor de onboarding.
// Field renderiza cualquier campo del esquema SECTIONS segun su `type`.

import React, { useState } from "react";
import { C, inp } from "../theme.js";

function CidrField({ value, onChange, placeholder, style }) {
  const valid = !value || /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/[0-9]{1,2})?$/.test(value);
  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value.replace(/[^0-9./]/g, ""))}
        placeholder={placeholder || "Ej: 192.168.1.0/24"}
        maxLength={18}
        style={{ ...style, fontFamily: "monospace", borderColor: value && !valid ? "#ef4444" : style.borderColor }}
      />
      {value && !valid && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>Formato válido: 192.168.1.0/24</div>}
    </div>
  );
}

function Field({ section, field, instanceIdx, getVal, setVal }) {
  const sid = section.id;
  const v = instanceIdx !== null ? getVal(sid, field.id, instanceIdx) : getVal(sid, field.id, null);
  const set = (val) => instanceIdx !== null ? setVal(sid, field.id, val, instanceIdx) : setVal(sid, field.id, val, null);

  if (field.dep) {
    const depV = instanceIdx !== null ? getVal(sid, field.dep.field, instanceIdx) : getVal(sid, field.dep.field, null);
    if (depV !== field.dep.value) return null;
  }

  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: C.gray, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "5px" }}>
        {field.label}
      </label>
      {field.type === "ip" ? (
        <input
          type="text"
          value={v}
          onChange={e => {
            const val = e.target.value.replace(/[^0-9.]/g, "");
            set(val);
          }}
          onBlur={e => {
            // Auto-format: ensure valid IP structure
            const val = e.target.value.replace(/[^0-9.]/g, "");
            set(val);
          }}
          placeholder={field.placeholder || "Ej: 192.168.1.1"}
          maxLength={15}
          style={{ ...inp, fontFamily: "monospace", letterSpacing: "0.05em" }}
        />
      ) : field.type === "cidr" ? (
        <CidrField value={v} onChange={set} placeholder={field.placeholder} style={inp} />
      ) : field.type === "text" || field.type === "number" ? (
        <input
          type={field.id && (field.id.includes("fecha") || field.id.includes("garantia") || field.id.includes("vencimiento")) ? "date" : field.type}
          value={v} onChange={e => set(e.target.value)}
          placeholder={field.placeholder || ""}
          style={inp}
        />
      ) : field.type === "select" ? (
        <select value={v} onChange={e => set(e.target.value)} style={inp}>
          <option value="">— Seleccionar —</option>
          {field.options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : field.type === "radio" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {field.options.map(o => {
            const sel = v === o;
            return (
              <button key={o} onClick={() => set(v === o ? "" : o)} style={{
                padding: "6px 14px", borderRadius: "20px", fontSize: "13px", cursor: "pointer",
                border: sel ? `1.5px solid ${C.blue}` : `1.5px solid ${C.border}`,
                background: sel ? C.blueLight : "#fff", color: sel ? C.blue : C.gray,
                fontWeight: sel ? "600" : "400", transition: "all 0.15s",
              }}>{o}</button>
            );
          })}
        </div>
      ) : field.type === "checks" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
          {field.options.map(o => {
            const arr = Array.isArray(v) ? v : [];
            const sel = arr.includes(o);
            return (
              <button key={o} onClick={() => set(sel ? arr.filter(x => x !== o) : [...arr, o])} style={{
                padding: "5px 12px", borderRadius: "20px", fontSize: "13px", cursor: "pointer",
                border: sel ? `1.5px solid ${C.blue}` : `1.5px solid ${C.border}`,
                background: sel ? C.blueLight : "#fff", color: sel ? C.blue : C.gray,
                fontWeight: sel ? "600" : "400", transition: "all 0.15s",
              }}>{sel ? "✓ " : ""}{o}</button>
            );
          })}
        </div>
      ) : field.type === "textarea" ? (
        <textarea value={v} onChange={e => set(e.target.value)} rows={3} placeholder={field.placeholder || "Notas..."} style={{ ...inp, resize: "vertical" }} />
      ) : null}
    </div>
  );
}

function SiNoToggle({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      {["si", "no"].map(opt => {
        const sel = value === opt;
        const isSi = opt === "si";
        const color = isSi ? C.green : C.red;
        const lightBg = isSi ? C.greenLight : C.redLight;
        return (
          <button key={opt} onClick={() => onChange(opt)} style={{
            padding: "7px 20px", borderRadius: "6px", fontSize: "14px", fontWeight: "700",
            cursor: "pointer", border: `2px solid ${sel ? color : C.border}`,
            background: sel ? lightBg : "#fff", color: sel ? color : C.textLight,
            transition: "all 0.15s", letterSpacing: "0.05em",
          }}>
            {isSi ? "✓ SÍ" : "✗ NO"}
          </button>
        );
      })}
    </div>
  );
}

function ImageZone({ sectionId, images, addImage, removeImage, updateCaption }) {
  const [pasteMsg, setPasteMsg] = useState("");
  const fileInputRef = React.useRef(null);



  // Clipboard paste
  const handlePasteClick = async () => {
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        let found = false;
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith("image/")) {
              const blob = await item.getType(type);
              const file = new File([blob], "captura.png", { type });
              addImage(sectionId, file);
              found = true;
            }
          }
        }
        if (!found) setPasteMsg("No hay imagen en el portapapeles.");
        else setPasteMsg("");
      } else {
        setPasteMsg("Haz clic aquí y pulsa Ctrl+V");
        pasteInputRef.current?.focus();
      }
    } catch {
      setPasteMsg("Haz clic aquí y pulsa Ctrl+V");
      pasteInputRef.current?.focus();
    }
  };

  const pasteInputRef = React.useRef(null);

  return (
    <div style={{ marginTop: 20, borderTop: `1px dashed #cbd5e1`, paddingTop: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.gray, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <span>📷</span> Capturas de pantalla
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>

        {/* Explorador */}
        <button onClick={() => fileInputRef.current?.click()} style={{
          flex: 1, padding: "12px 8px", border: `1px solid ${C.border}`, borderRadius: 8,
          background: "#fff", cursor: "pointer", fontSize: 12, color: C.gray,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.gray; }}>
          <span style={{ fontSize: 22 }}>📁</span>
          <span style={{ fontWeight: 600 }}>Explorador</span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Haz clic</span>
        </button>
        <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: "none" }}
          onChange={e => { Array.from(e.target.files).forEach(f => addImage(sectionId, f)); e.target.value = ""; }} />

        {/* Paste */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0 }}>
          <button onClick={handlePasteClick} style={{
            flex: 1, padding: "12px 8px", border: `1px solid ${C.border}`, borderRadius: 8,
            background: "#fff", cursor: "pointer", fontSize: 12, color: C.gray,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: "100%",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.gray; }}>
            <span style={{ fontSize: 22 }}>📋</span>
            <span style={{ fontWeight: 600 }}>Pegar</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>Portapapeles</span>
          </button>
          {/* Hidden focusable for Ctrl+V fallback */}
          <div ref={pasteInputRef} tabIndex={0} style={{ width: 0, height: 0, overflow: "hidden", outline: "none" }}
            onPaste={e => {
              const items = e.clipboardData?.items;
              if (!items) return;
              for (const item of items) {
                if (item.type.startsWith("image/")) {
                  e.preventDefault();
                  addImage(sectionId, item.getAsFile());
                  setPasteMsg("");
                  return;
                }
              }
            }} />
        </div>
      </div>

      {pasteMsg && <div style={{ fontSize: 11, color: C.blue, padding: "4px 2px", marginBottom: 8 }}>{pasteMsg}</div>}

      {images && images.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          {images.map((img, i) => (
            <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ position: "relative" }}>
                <img src={img.src} alt={img.caption || img.name} style={{ maxWidth: "100%", height: "auto", display: "block" }} />
                <button onClick={e => { e.stopPropagation(); removeImage(sectionId, i); }} style={{
                  position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff",
                  border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer",
                  fontSize: 14, lineHeight: "28px", textAlign: "center", padding: 0,
                }}>✕</button>
              </div>
              <div style={{ padding: "8px 10px", background: "#f8fafc" }}>
                <input value={img.caption} onChange={e => updateCaption(sectionId, i, e.target.value)}
                  placeholder="Descripción de la captura..."
                  onClick={e => e.stopPropagation()}
                  style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 4, padding: "5px 8px", fontSize: 12, color: "#374151", boxSizing: "border-box", outline: "none", background: "#fff" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Campos de una instancia de seccion ──────────────────────────────────────
// Si los campos declaran `group`, se pintan agrupados en acordeones plegables
// con un contador de relleno. Si no lo declaran (el resto de secciones), se
// pintan en la rejilla de siempre y no cambia nada.

/** Rejilla de dos columnas; textarea y checks ocupan el ancho completo. */
function Rejilla({ section, campos, instanceIdx, getVal, setVal }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
      {campos.map(f => (
        <div key={f.id} style={f.type === "textarea" || f.type === "checks" ? { gridColumn: "1 / -1" } : {}}>
          <Field section={section} field={f} instanceIdx={instanceIdx} getVal={getVal} setVal={setVal} />
        </div>
      ))}
    </div>
  );
}

function Grupo({ section, titulo, campos, instanceIdx, getVal, setVal }) {
  const [abierto, setAbierto] = useState(true);

  // Un campo condicional que no se cumple no cuenta: si no se ve, no se puede rellenar.
  const visibles = campos.filter(f => !f.dep || getVal(section.id, f.dep.field, instanceIdx) === f.dep.value);
  const rellenos = visibles.filter(f => {
    const v = getVal(section.id, f.id, instanceIdx);
    return Array.isArray(v) ? v.length > 0 : v !== "" && v !== undefined;
  }).length;
  const completo = visibles.length > 0 && rellenos === visibles.length;

  // Un grupo cuyos campos son todos condicionales y ninguno se cumple no pinta
  // nada: sin esto quedaria una cabecera de acordeon vacia con un "0/0".
  if (visibles.length === 0) return null;

  return (
    <div style={{ marginBottom: 18 }}>
      <button
        onClick={() => setAbierto(a => !a)}
        aria-expanded={abierto}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          background: "transparent", border: "none", cursor: "pointer",
          padding: "0 0 6px", marginBottom: 12,
          borderBottom: `1px solid ${C.blueBorder}`,
          fontSize: 12, fontWeight: 700, color: C.blue,
          textTransform: "uppercase", letterSpacing: "0.08em",
          fontFamily: "inherit", textAlign: "left",
        }}
      >
        <span style={{ display: "inline-block", transform: abierto ? "rotate(90deg)" : "none", transition: "transform 0.15s", fontSize: 10 }}>▶</span>
        <span style={{ flex: 1 }}>{titulo}</span>
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 0,
          color: completo ? C.green : C.textLight,
          fontVariantNumeric: "tabular-nums",
        }}>
          {rellenos}/{visibles.length}
        </span>
      </button>
      {abierto && <Rejilla section={section} campos={campos} instanceIdx={instanceIdx} getVal={getVal} setVal={setVal} />}
    </div>
  );
}

function SectionFields({ section, instanceIdx, getVal, setVal }) {
  // Agrupar preservando el orden de aparicion del esquema
  const orden = [];
  const porGrupo = new Map();
  for (const f of section.fields) {
    const g = f.group || "";
    if (!porGrupo.has(g)) { porGrupo.set(g, []); orden.push(g); }
    porGrupo.get(g).push(f);
  }

  if (orden.length === 1 && orden[0] === "") {
    return <Rejilla section={section} campos={section.fields} instanceIdx={instanceIdx} getVal={getVal} setVal={setVal} />;
  }

  return (
    <>
      {orden.map(titulo => (
        titulo === ""
          ? <Rejilla key="__sin_grupo__" section={section} campos={porGrupo.get(titulo)} instanceIdx={instanceIdx} getVal={getVal} setVal={setVal} />
          : <Grupo key={titulo} section={section} titulo={titulo} campos={porGrupo.get(titulo)} instanceIdx={instanceIdx} getVal={getVal} setVal={setVal} />
      ))}
    </>
  );
}

export { CidrField, Field, SiNoToggle, ImageZone, SectionFields };
