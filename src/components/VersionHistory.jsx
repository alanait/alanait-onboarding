import React, { useState, useEffect } from "react";
import { getVersions, loadVersion } from "../lib/clientService.js";

const C = {
  navy: "#1E3A6E", blue: "#2F56A3", blueLight: "#EEF3FB",
  gray: "#868686", border: "#E4E6EA", textLight: "#9AA0A6",
};

/**
 * Quien escribio ESTA version, dicho con la seguridad que de verdad se tiene.
 *
 *   directa        la escribio el trigger de la base: el autor es el de verdad.
 *   derivada       reconstruida del historial anterior por desplazamiento.
 *   indeterminada  historica y no reconstruible: no se inventa un nombre.
 *   legacy         anterior al SQL de auditoria; `changed_by` es quien
 *                  sobreescribio, no quien escribio, asi que se dice asi.
 */
function autoria(v) {
  const estilo = { fontSize: 12, color: C.textLight, marginTop: 4 };
  if (v.author_origin === "directa" && v.author_email) {
    return <div style={estilo}>Escrito por: {v.author_email}</div>;
  }
  if (v.author_origin === "derivada" && v.author_email) {
    return (
      <div style={estilo} title="Autoría reconstruida del historial anterior, no registrada en su momento">
        Escrito por: {v.author_email} <span style={{ opacity: 0.7 }}>(reconstruido)</span>
      </div>
    );
  }
  if (v.author_origin === "indeterminada") {
    return (
      <div style={estilo}>
        Autoría no registrada{v.changed_by ? ` · sobrescrita por ${v.changed_by}` : ""}
      </div>
    );
  }
  // Sin columnas de autoria todavia (el SQL no se ha ejecutado): se dice lo
  // unico que ese dato significa de verdad.
  if (v.changed_by) return <div style={estilo}>Sobrescrita por: {v.changed_by}</div>;
  return null;
}

export default function VersionHistory({ clientId, onRestore, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    getVersions(clientId).then(v => { setVersions(v); setLoading(false); });
  }, [clientId]);

  const handleRestore = async (versionId, version) => {
    if (!confirm(`¿Restaurar a la version ${version}? Se perderan los cambios actuales no guardados.`)) return;
    setRestoring(versionId);
    try {
      const snapshot = await loadVersion(versionId);
      onRestore(snapshot, version);
    } catch (err) {
      alert("Error al restaurar: " + err.message);
    }
    setRestoring(null);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, width: 480, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 17, color: C.navy }}>📜 Historial de versiones</div>
            <div style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>Cada vez que guardas se crea una version</div>
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", fontSize: 20, cursor: "pointer",
            color: C.gray, padding: "4px 8px", borderRadius: 6,
          }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 24px 24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: C.gray }}>Cargando historial...</div>
          ) : versions.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <div style={{ color: C.gray, fontSize: 14 }}>Sin versiones anteriores</div>
              <div style={{ color: C.textLight, fontSize: 12, marginTop: 4 }}>
                Las versiones se crean automaticamente al guardar cambios
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {versions.map(v => (
                <div key={v.id} style={{
                  padding: "14px 16px", borderRadius: 10, border: `1px solid ${C.border}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.blueLight}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        background: C.blue, color: "#fff", fontSize: 11, fontWeight: 500,
                        padding: "2px 8px", borderRadius: 10,
                      }}>v{v.version}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: C.navy }}>
                        {new Date(v.created_at).toLocaleDateString("es-ES", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {/* "Guardado por: {changed_by}" era FALSO: esa columna
                        guarda a quien SOBREESCRIBIO la version, no a quien la
                        escribio. Ahora la etiqueta depende de lo segura que sea
                        la atribucion, en vez de afirmar siempre lo mismo. */}
                    {autoria(v)}
                  </div>
                  <button
                    onClick={() => handleRestore(v.id, v.version)}
                    disabled={restoring === v.id}
                    style={{
                      padding: "6px 14px", background: C.blueLight, color: C.blue,
                      border: `1px solid ${C.blue}33`, borderRadius: 7, fontSize: 12,
                      fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.blue; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.blueLight; e.currentTarget.style.color = C.blue; }}
                  >
                    {restoring === v.id ? "⏳..." : "Restaurar"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
