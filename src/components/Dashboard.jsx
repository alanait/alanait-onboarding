import React, { useState, useEffect, useRef } from "react";
import { listClients, searchClients, deleteClient, importFromFile } from "../lib/clientService.js";
import { isSupabaseConfigured } from "../lib/supabase.js";
import { getUserName } from "../lib/auth.js";

const C = {
  navy: "#0d1f3c", blue: "#1d4ed8", blueLight: "#eff6ff",
  green: "#15803d", red: "#b91c1c", gray: "#64748b",
  border: "#e2e8f0", textLight: "#94a3b8",
};

export default function Dashboard({ onOpenClient, onNewClient, onImportFile, session, onSignOut }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const data = search ? await searchClients(search) : await listClients();
    setClients(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleDelete = async (id) => {
    try {
      await deleteClient(id);
      setConfirmDeleteId(null);
      load();
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const handleImport = async (file) => {
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const newId = await importFromFile(data);
      load();
      onOpenClient(newId);
    } catch (err) {
      alert("Error al importar: " + err.message);
    }
    setImporting(false);
  };

  if (!isSupabaseConfigured()) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 40, maxWidth: 500, textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
          <h2 style={{ color: C.navy, marginBottom: 8 }}>Configurar Supabase</h2>
          <p style={{ color: C.gray, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            Para usar el modo cloud, configura las variables de entorno:
          </p>
          <div style={{ background: "#1e293b", borderRadius: 8, padding: 16, textAlign: "left", fontSize: 13, color: "#e2e8f0", fontFamily: "monospace", lineHeight: 1.8 }}>
            VITE_SUPABASE_URL=https://xxx.supabase.co<br />
            VITE_SUPABASE_ANON_KEY=eyJhbG...
          </div>
          <p style={{ color: C.textLight, fontSize: 12, marginTop: 16 }}>
            Crea un archivo <code>.env.local</code> en la raiz del proyecto con estas variables.
          </p>
          <button onClick={onNewClient} style={{
            marginTop: 20, padding: "12px 24px", background: C.blue, color: "#fff",
            border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>
            Usar sin cloud (modo local)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.navy, color: "#fff", padding: "0 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#93c5fd", textTransform: "uppercase", marginBottom: 2 }}>ALANA IT</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Panel de Clientes</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => fileRef.current?.click()} disabled={importing} style={{
              padding: "9px 16px", background: "rgba(255,255,255,0.12)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, fontSize: 13,
              fontWeight: 600, cursor: "pointer",
            }}>
              {importing ? "⏳ Importando..." : "📂 Importar .alanait"}
            </button>
            <input ref={fileRef} type="file" accept=".alanait" style={{ display: "none" }}
              onChange={e => { if (e.target.files[0]) handleImport(e.target.files[0]); e.target.value = ""; }} />
            <button onClick={onNewClient} style={{
              padding: "9px 18px", background: C.blue, color: "#fff",
              border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              + Nuevo Cliente
            </button>
            {session && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8, paddingLeft: 8, borderLeft: "1px solid rgba(255,255,255,0.2)" }}>
                <span style={{ fontSize: 12, color: "#93c5fd" }}>👤 {getUserName(session)}</span>
                <button onClick={onSignOut} style={{ background: "rgba(255,255,255,0.08)", color: "#94a3b8", border: "none", padding: "6px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                  Salir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px" }}>
        {/* Search */}
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="🔍 Buscar por empresa, sector, contacto o responsable..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "12px 16px", border: `1px solid ${C.border}`,
              borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box",
              background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          />
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div style={{ background: "#fff", borderRadius: 10, padding: "16px 20px", flex: 1, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.navy }}>{clients.length}</div>
            <div style={{ fontSize: 12, color: C.gray }}>Clientes registrados</div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: C.gray }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            Cargando clientes...
          </div>
        ) : clients.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, background: "#fff", borderRadius: 12, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.navy, marginBottom: 8 }}>
              {search ? "Sin resultados" : "Sin clientes aun"}
            </div>
            <div style={{ fontSize: 14, color: C.gray, marginBottom: 20 }}>
              {search ? "Prueba con otros terminos de busqueda" : "Crea tu primer onboarding o importa un archivo .alanait"}
            </div>
            {!search && (
              <button onClick={onNewClient} style={{
                padding: "10px 24px", background: C.blue, color: "#fff",
                border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>
                + Crear primer cliente
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: `2px solid ${C.border}` }}>
                  {["Empresa", "Sector", "Contacto", "Responsable", "Fecha", "Actualizado", ""].map((h, i) => (
                    <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.gray, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}
                    onClick={() => onOpenClient(c.id)}
                    style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.blueLight}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>{c.empresa || "Sin nombre"}</div>
                      <div style={{ fontSize: 12, color: C.textLight }}>{c.trabajadores ? `${c.trabajadores} trabajadores` : ""}</div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151" }}>{c.sector || "—"}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151" }}>{c.contacto || "—"}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151" }}>{c.responsable || "—"}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151" }}>
                      {c.fecha ? new Date(c.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: C.textLight }}>
                      {new Date(c.updated_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                    </td>
                    <td style={{ padding: "14px 8px", textAlign: "right" }}>
                      {confirmDeleteId === c.id ? (
                        <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleDelete(c.id)} style={{
                            padding: "4px 10px", background: C.red, color: "#fff", border: "none",
                            borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer",
                          }}>Eliminar</button>
                          <button onClick={() => setConfirmDeleteId(null)} style={{
                            padding: "4px 10px", background: "#f1f5f9", color: "#64748b", border: "none",
                            borderRadius: 5, fontSize: 11, cursor: "pointer",
                          }}>No</button>
                        </div>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(c.id); }} style={{
                          background: "transparent", border: "none", color: "#cbd5e1",
                          cursor: "pointer", fontSize: 16, padding: "4px 8px", borderRadius: 4,
                          transition: "color 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = C.red}
                        onMouseLeave={e => e.currentTarget.style.color = "#cbd5e1"}
                        >🗑️</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
