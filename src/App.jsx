import React, { useState, useEffect, useCallback } from "react";
import Dashboard from "./components/Dashboard.jsx";
import VersionHistory from "./components/VersionHistory.jsx";
import LoginPage from "./components/LoginPage.jsx";
import { isSupabaseConfigured } from "./lib/supabase.js";
import { getSession, onAuthChange, signOut, getUserName } from "./lib/auth.js";
import { saveClient as saveToCloud, loadClient, resolveImagesToBase64, searchClients } from "./lib/clientService.js";
import { SECTIONS, lectorEfectivo, reindexarHints } from "./sections.js";
import { C, inp, FUENTE } from "./theme.js";
import { SiNoToggle, ImageZone, SectionFields } from "./components/fields.jsx";
import { buildPrintFragment } from "./print/buildPrintHTML.js";
import { exportarInformePdf } from "./print/exportarPdf.js";
import { computeScore } from "./score/computeScore.js";
import { CRITERIOS, PRECONDICIONES, CAMPOS_QUE_PUNTUAN } from "./score/criterios.js";
import { hintsVisibles, claveHint, TIPOS_HINT } from "./hints.js";
import ReportPanel from "./components/ReportPanel.jsx";
import SectionRail from "./components/SectionRail.jsx";

// ── Print View ──────────────────────────────────────────────────────────────
// Vista para Ctrl+P del navegador. Renderiza el mismo HTML que la exportacion a
// PDF, asi que informe y PDF nunca pueden divergir. El contenido va escapado en
// buildPrintFragment, por eso es seguro inyectarlo.
function PrintView({ clientData, sectionEnabled, formData, instanceCounts, sectionImages }) {
  const score = computeScore({ formData, sectionEnabled, instanceCounts, criterios: CRITERIOS, precondiciones: PRECONDICIONES, fecha: clientData.fecha });
  const html = buildPrintFragment(clientData, sectionEnabled, formData, instanceCounts, sectionImages, score);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Boton cuadrado de la cabecera: solo icono, con el nombre en su `title`. */
const btnIcono = (activo) => ({
  width: 30, height: 30, borderRadius: 7, flexShrink: 0,
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 14, lineHeight: 1, padding: 0, cursor: "pointer",
  background: activo ? "rgba(47,182,186,0.35)" : "rgba(255,255,255,0.12)",
  border: `1px solid ${activo ? "rgba(47,182,186,0.65)" : "rgba(255,255,255,0.2)"}`,
  color: "#fff", fontFamily: "inherit", transition: "background 0.15s",
});

// ── Main Component ───────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    getSession().then(s => { setSession(s); setAuthLoading(false); });
    const sub = onAuthChange(s => { setSession(s); setAuthLoading(false); });
    return () => sub?.unsubscribe();
  }, []);

  const [view, setView] = useState(isSupabaseConfigured() ? 'dashboard' : 'editor');
  const [currentClientId, setCurrentClientId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const [clientData, setClientData] = useState({ empresa: "", sector: "", trabajadores: "", sedes: "", contacto: "", telefono: "", email: "", web: "", direccion: "", fecha: new Date().toISOString().split("T")[0], responsable: "" });
  const [sectionEnabled, setSectionEnabled] = useState({});
  const [formData, setFormData] = useState({});
  const [instanceCounts, setInstanceCounts] = useState({});
  const [sectionImages, setSectionImages] = useState({});


  const addImage = (sectionId, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setSectionImages(prev => ({
        ...prev,
        [sectionId]: [...(prev[sectionId] || []), { src: e.target.result, caption: "", name: file.name }]
      }));
      setIsDirty(true);
    };
    reader.readAsDataURL(file);
  };
  const removeImage = (sectionId, idx) => {
    setSectionImages(prev => ({ ...prev, [sectionId]: prev[sectionId].filter((_, i) => i !== idx) }));
    setIsDirty(true);
  };
  const updateCaption = (sectionId, idx, caption) => {
    setSectionImages(prev => ({ ...prev, [sectionId]: prev[sectionId].map((img, i) => i === idx ? { ...img, caption } : img) }));
    setIsDirty(true);
  };

  const getVal = (sectionId, fieldId, idx = null) => {
    if (idx !== null) return formData[sectionId]?.[idx]?.[fieldId] ?? "";
    return formData[sectionId]?.[fieldId] ?? "";
  };
  const setVal = (sectionId, fieldId, value, idx = null) => {
    setFormData(prev => {
      if (idx !== null) return { ...prev, [sectionId]: { ...prev[sectionId], [idx]: { ...prev[sectionId]?.[idx], [fieldId]: value } } };
      return { ...prev, [sectionId]: { ...prev[sectionId], [fieldId]: value } };
    });
    setIsDirty(true);
  };

  const getCount = (id) => instanceCounts[id] || 1;

  // ── Estado de los avisos de buenas practicas ───────────────────────────────
  // Vive dentro de formData bajo __hints__, igual que __other_notes__: asi viaja
  // gratis a Supabase, al historial de versiones y al export .alanait, sin tocar
  // el esquema de la base de datos. Los clientes guardados sin esa clave cargan
  // igual porque se lee con ?? "".
  const getHint = (hintId, idx) => formData.__hints__?.[claveHint(hintId, idx)] ?? "";
  const setHint = (hintId, idx, estado) => {
    setFormData(prev => {
      const actual = prev.__hints__ ?? {};
      const clave = claveHint(hintId, idx);
      const siguiente = { ...actual };
      if (estado === "") delete siguiente[clave];
      else siguiente[clave] = estado;
      return { ...prev, __hints__: siguiente };
    });
    setIsDirty(true);
  };

  /** Avisos accionables sin resolver de una seccion, sumando sus instancias. */
  const hintsPendientes = (section) => {
    let n = 0;
    for (let i = 0; i < getCount(section.id); i++) {
      for (const h of hintsVisibles(section.id, lectorEfectivo(section.id, getVal, i))) {
        if (!TIPOS_HINT[h.tipo].marcable) continue;
        if (getHint(h.id, i) !== "hecho" && getHint(h.id, i) !== "na") n++;
      }
    }
    return n;
  };

  const addInstance = (id) => setInstanceCounts(prev => ({ ...prev, [id]: getCount(id) + 1 }));

  const answered = SECTIONS.filter(s => sectionEnabled[s.id] !== undefined).length;
  const progress = Math.round((answered / SECTIONS.length) * 100);

  // ── Navegacion por secciones ───────────────────────────────────────────────
  // El scroll no lo lleva la ventana sino la columna de contenido, asi que los
  // enlaces de ancla del navegador no sirven: hay que desplazar el contenedor.
  const contenidoRef = React.useRef(null);
  const seccionRefs = React.useRef({});
  const [arribaVisible, setArribaVisible] = useState(false);

  const irASeccion = (sectionId) => {
    setSeccionActiva(sectionId);
    seccionRefs.current[sectionId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const irArriba = () => contenidoRef.current?.scrollTo({ top: 0, behavior: "smooth" });

  const [exporting, setExporting] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  // Ctrl+P: montar la vista de impresion justo antes y desmontarla despues.
  useEffect(() => {
    const antes = () => setImprimiendo(true);
    const despues = () => setImprimiendo(false);
    window.addEventListener("beforeprint", antes);
    window.addEventListener("afterprint", despues);
    return () => {
      window.removeEventListener("beforeprint", antes);
      window.removeEventListener("afterprint", despues);
    };
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [informeOpen, setInformeOpen] = useState(true);
  const [seccionActiva, setSeccionActiva] = useState(null);

  /**
   * Campos que PUNTUAN, visibles y rellenos, sumando instancias.
   *
   * Antes contaba todo campo visible por igual, marca de firewall o numero de
   * serie. Es la tercera aparicion del mismo porcentaje enganoso -las otras
   * dos, cabecera de grupo y panel lateral, ya cuentan solo lo que mueve la
   * nota- asi que esta barra queda igual de ciega hasta ahora.
   */
  const avanceSeccion = (sectionId) => {
    const sec = SECTIONS.find(s => s.id === sectionId);
    let total = 0, rellenos = 0, totalBruto = 0, rellenosBruto = 0;
    if (!sec || sectionEnabled[sectionId] !== "si") return { total, rellenos };
    for (let i = 0; i < getCount(sectionId); i++) {
      for (const f of sec.fields) {
        if (f.dep && getVal(sectionId, f.dep.field, i) !== f.dep.value) continue;
        const v = getVal(sectionId, f.id, i);
        const relleno = Array.isArray(v) ? v.length > 0 : v !== "" && v !== undefined;
        totalBruto++;
        if (relleno) rellenosBruto++;
        if (!CAMPOS_QUE_PUNTUAN.has(`${sectionId}.${f.id}`)) continue;
        total++;
        if (relleno) rellenos++;
      }
    }
    // Una seccion sin ningun criterio (almacenamiento, telefonia, impresion,
    // erp, otros_dispositivos) no puede quedarse fija en 0% pase lo que pase:
    // ahi no hay nota que medir, asi que se muestra el avance del inventario
    // en vez de fingir que algo puntua. Mismo criterio que el contador doble
    // de fields.jsx cuando un grupo no tiene ningun campo que puntue.
    return total > 0 ? { total, rellenos } : { total: totalBruto, rellenos: rellenosBruto };
  };
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const unsavedCallbackRef = React.useRef(null); // stores path to confirm

  const handlePrint = async () => {
    setExporting(true);
    try {
      const container = document.createElement('div');
      const score = computeScore({ formData, sectionEnabled, instanceCounts, criterios: CRITERIOS, precondiciones: PRECONDICIONES, fecha: clientData.fecha });
      container.innerHTML = buildPrintFragment(clientData, sectionEnabled, formData, instanceCounts, sectionImages, score);
      // 190mm = A4 (210mm) menos los margenes de 10mm que aplica html2pdf a cada
      // lado. Asi el contenido se mapea 1:1 con el area imprimible y no se corta.
      container.style.width = '190mm';
      container.style.padding = '0';
      container.style.background = '#fff';
      container.style.fontFamily = FUENTE;
      document.body.appendChild(container);

      const nombre = clientData.empresa ? clientData.empresa.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, "_") : "onboarding";
      const fecha = new Date().toISOString().split("T")[0];
      await exportarInformePdf(container, `${nombre}_${fecha}.pdf`);

      document.body.removeChild(container);
    } catch (err) {
      console.error('PDF export error:', err);
      alert("Error al generar PDF: " + err.message);
    }
    setExporting(false);
  };

  const [currentFilePath, setCurrentFilePath] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [recentProjects, setRecentProjects] = useState([]);
  const [showRecent, setShowRecent] = useState(false);

  // Mark dirty on any data change
  const markDirty = () => setIsDirty(true);

  const handleSave = async () => {
    if (isSupabaseConfigured()) {
      // Save to cloud
      setSaving(true);
      try {
        const id = await saveToCloud(currentClientId, { clientData, sectionEnabled, formData, instanceCounts, sectionImages });
        setCurrentClientId(id);
        setCurrentFilePath(clientData.empresa || "proyecto");
        addToRecent(clientData.empresa || "proyecto", id);
        loadRecent();
        setIsDirty(false);
      } catch (err) {
        // Ficha guardada, imagen(es) no: se conserva el id para que reintentar
        // actualice este cliente en vez de crear uno duplicado. isDirty se
        // deja en true a proposito: no todo se guardo de verdad.
        if (err.clientId) {
          setCurrentClientId(err.clientId);
          setCurrentFilePath(clientData.empresa || "proyecto");
        }
        alert("Error al guardar: " + err.message);
      }
      setSaving(false);
    } else {
      // Fallback: save as file
      handleExportFile();
    }
  };

  const handleExportFile = async () => {
    // SIEMPRE lo que hay en pantalla, nunca lo ultimo guardado en la nube: un
    // export que descartara cambios sin guardar mientras apaga el aviso de
    // "sin guardar" es la peor combinacion posible (bug real, corregido aqui).
    let exportImages = sectionImages;
    try {
      exportImages = await resolveImagesToBase64(sectionImages);
    } catch {
      // Si falla la conversion de alguna imagen, se exporta igualmente con
      // las URLs firmadas que hubiera: dejar caer el export entero por una
      // foto perderia el formulario completo.
    }
    const projectData = { clientData, sectionEnabled, formData, instanceCounts, sectionImages: exportImages };
    const json = JSON.stringify(projectData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const nombre = clientData.empresa ? clientData.empresa.replace(/[^a-zA-Z0-9]/g, "_") : "proyecto";
    a.href = url;
    a.download = nombre + ".alanait";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    addToRecent(nombre, currentClientId);
    setCurrentFilePath(nombre);
    // Sin Supabase configurado, exportar a fichero ES el guardado (lo usa
    // handleSave como fallback mas abajo): ahi si hay que apagar el aviso. Con
    // Supabase configurado, exportar es una copia aparte y la nube sigue
    // teniendo la version antigua: el aviso de "cambios sin guardar" tiene que
    // seguir en pie.
    if (!isSupabaseConfigured()) setIsDirty(false);
    loadRecent();
  };

  const handleSaveAs = async () => {
    await handleExportFile();
  };

  const fileInputLoadRef = React.useRef(null);

  const loadFromFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setClientData(data.clientData || {});
        setSectionEnabled(data.sectionEnabled || {});
        setFormData(data.formData || {});
        setInstanceCounts(data.instanceCounts || {});
        setSectionImages(data.sectionImages || {});
        // Un .alanait cargado es un proyecto distinto: hay que soltar el id del
        // cliente que estuviera abierto o el siguiente Guardar lo sobrescribiria.
        setCurrentClientId(null);
        setCurrentFilePath(file.name.replace(/\.alanait$/, ""));
        setIsDirty(false);
        addToRecent(data.clientData?.empresa || file.name);
        loadRecent();
      } catch {
        alert("Error al leer el archivo. Asegúrate de que es un archivo .alanait válido.");
      }
    };
    reader.readAsText(file);
  };

  const handleLoad = async () => {
    if (isDirty) {
      unsavedCallbackRef.current = () => fileInputLoadRef.current?.click();
      setShowUnsaved(true);
      return;
    }
    fileInputLoadRef.current?.click();
  };

  const addToRecent = (empresa, cloudId = null) => {
    try {
      let recent = JSON.parse(localStorage.getItem("alanait_recent") || "[]");
      const name = empresa || "Sin nombre";
      recent = recent.filter(r => r.empresa !== name);
      recent.unshift({ empresa: name, date: new Date().toISOString(), cloudId: cloudId || null });
      localStorage.setItem("alanait_recent", JSON.stringify(recent.slice(0, 10)));
    } catch {}
  };

  const loadRecent = () => {
    try {
      const recent = JSON.parse(localStorage.getItem("alanait_recent") || "[]");
      setRecentProjects(recent || []);
    } catch {
      setRecentProjects([]);
    }
  };

  useEffect(() => {
    loadRecent();
    const onFocus = () => loadRecent();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Cerrar la pestana o el navegador con cambios sin guardar perdia la visita
  // entera sin un solo aviso: no hay borrador local ni autoguardado, todo vive
  // en memoria de React. Esto no lo evita -sigue sin haber autoguardado- pero
  // hace que hacerlo sea una decision del tecnico, no un accidente.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const doNewProject = () => {
    setClientData({ empresa: "", sector: "", trabajadores: "", sedes: "", contacto: "", telefono: "", email: "", web: "", direccion: "", fecha: new Date().toISOString().split("T")[0], responsable: "" });
    setSectionEnabled({});
    setFormData({});
    setInstanceCounts({});
    setSectionImages({});
    setCurrentFilePath(null);
    setCurrentClientId(null);
    setIsDirty(false);
    setShowRecent(false);
    setView('editor');
  };

  const openClientFromCloud = async (id) => {
    try {
      const data = await loadClient(id);
      setClientData(data.clientData);
      setSectionEnabled(data.sectionEnabled);
      setFormData(data.formData);
      setInstanceCounts(data.instanceCounts);
      setSectionImages(data.sectionImages);
      setCurrentClientId(data.id);
      setCurrentFilePath(data.clientData.empresa || "proyecto");
      addToRecent(data.clientData.empresa || "proyecto", data.id);
      loadRecent();
      setIsDirty(false);
      setView('editor');
    } catch (err) {
      alert("Error al cargar cliente: " + err.message);
    }
  };

  const handleRestoreVersion = (snapshot) => {
    if (snapshot.clientData) setClientData(snapshot.clientData);
    if (snapshot.sectionEnabled) setSectionEnabled(snapshot.sectionEnabled);
    if (snapshot.formData) setFormData(snapshot.formData);
    if (snapshot.instanceCounts) setInstanceCounts(snapshot.instanceCounts);
    setIsDirty(true);
    setShowVersionHistory(false);
  };

  const handleNewProject = () => {
    if (isDirty) {
      unsavedCallbackRef.current = doNewProject;
      setShowUnsaved(true);
      return;
    }
    doNewProject();
  };

  const clientFields = [
    { id: "empresa", label: "Nombre de la empresa", placeholder: "Empresa S.L.", full: true },
    { id: "sector", label: "Sector de la empresa", placeholder: "Ej: Construcción, Retail, Sanidad..." },
    { id: "trabajadores", label: "Nº de trabajadores", placeholder: "Ej: 25" },
    { id: "sedes", label: "Nº de sedes", placeholder: "Ej: 3" },
    { id: "contacto", label: "Persona de contacto", placeholder: "Nombre Apellidos" },
    { id: "telefono", label: "Teléfono", placeholder: "+34 6XX XXX XXX" },
    { id: "email", label: "Email", placeholder: "contacto@empresa.com" },
    { id: "direccion", label: "Dirección", placeholder: "Calle, Número, Población", full: true },
    { id: "web", label: "Página web", placeholder: "Ej: www.empresa.com" },
    { id: "fecha", label: "Fecha de visita", placeholder: "DD/MM/AAAA" },
    { id: "responsable", label: "Responsable ALANA IT", placeholder: "Nombre técnico" },
  ];

  // Auth guard - show login if Supabase is configured but no session
  if (isSupabaseConfigured() && authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.navy, color: "#fff", fontFamily: FUENTE }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div>Cargando...</div>
        </div>
      </div>
    );
  }

  if (isSupabaseConfigured() && !session) {
    return <LoginPage onLogin={s => { setSession(s); setView('dashboard'); }} />;
  }

  // Dashboard view
  if (view === 'dashboard') {
    return (
      <Dashboard
        onOpenClient={openClientFromCloud}
        onNewClient={doNewProject}
        session={session}
        onSignOut={async () => { await signOut(); setSession(null); }}
      />
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { margin: 0; padding: 0; background: white; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>
      {/* Vista de impresion: solo se monta mientras se imprime de verdad.
          Montada siempre, reconstruia el informe completo —el logo de 91 KB y
          todas las capturas en base64— en cada pulsacion de tecla. */}
      {imprimiendo && (
        <div className="print-only">
          <PrintView
            clientData={clientData}
            sectionEnabled={sectionEnabled}
            formData={formData}
            instanceCounts={instanceCounts}
            sectionImages={sectionImages}
          />
        </div>
      )}
      {/* VERSION HISTORY MODAL */}
      {showVersionHistory && currentClientId && (
        <VersionHistory
          clientId={currentClientId}
          onRestore={handleRestoreVersion}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
      {/* UNSAVED CHANGES MODAL */}
      {showUnsaved && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "28px 32px", width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>💾</div>
            <div style={{ fontWeight: 500, fontSize: 16, color: C.navy, marginBottom: 8 }}>Cambios sin guardar</div>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
              El proyecto actual tiene cambios sin guardar. ¿Qué quieres hacer?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={async () => {
                await handleSave();
                setShowUnsaved(false);
                if (unsavedCallbackRef.current) await unsavedCallbackRef.current();
                unsavedCallbackRef.current = null;
              }} style={{ padding: "10px", background: C.green, border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                💾 Guardar y continuar
              </button>
              <button onClick={async () => {
                setShowUnsaved(false);
                setIsDirty(false);
                if (unsavedCallbackRef.current) await unsavedCallbackRef.current();
                unsavedCallbackRef.current = null;
              }} style={{ padding: "10px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                Descartar cambios
              </button>
              <button onClick={() => { setShowUnsaved(false); unsavedCallbackRef.current = null; }} style={{ padding: "10px", background: "transparent", border: "none", borderRadius: 8, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN VIEW */}
      {/* Alto exacto de ventana y scroll unicamente en la columna de contenido.
          Antes se restaba una cabecera de 67px fijos, pero la cabecera envuelve
          en varias lineas segun el ancho, asi que el total superaba 100vh y
          aparecia una segunda barra de desplazamiento. */}
      <div className="screen-only no-print" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", fontFamily: FUENTE }}>
        {/* Header */}
        <div style={{ background: C.navy, color: "#fff", padding: "0 24px", flexShrink: 0, zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
          {/* Una sola fila de 46px. Antes la marca ocupaba tres lineas y los
              botones envolvian en dos filas: la cabecera medía más de 150px.
              Ahora los conmutadores y las acciones secundarias son solo icono
              con su titulo, y el texto se reserva para Guardar y Exportar. */}
          <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", gap: 8, height: 46 }}>
            <button onClick={() => { setSidebarOpen(p => !p); loadRecent(); }} title="Proyectos recientes" aria-label="Proyectos recientes" style={btnIcono(sidebarOpen)}>🗂</button>
            {isSupabaseConfigured() && (
              <button onClick={() => {
                if (isDirty) { unsavedCallbackRef.current = () => setView('dashboard'); setShowUnsaved(true); }
                else setView('dashboard');
              }} title="Volver al panel de clientes" aria-label="Volver al panel de clientes" style={btnIcono(false)}>←</button>
            )}

            <div style={{ minWidth: 0, marginRight: 4 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.14em", color: "#A9C6EA", textTransform: "uppercase", marginRight: 7 }}>Alana IT</span>
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>
                {currentFilePath ? currentFilePath.split("\\").pop().split("/").pop() : "Onboarding técnico"}
              </span>
              {isDirty && <span title="Cambios sin guardar" style={{ color: "#2FB6BA", marginLeft: 5, fontSize: 15 }}>•</span>}
            </div>

            <div style={{ flex: 1 }} />

            <span style={{ fontSize: 11.5, color: "#A9C6EA", whiteSpace: "nowrap" }}>
              {answered}/{SECTIONS.length} · <b style={{ color: "#fff", fontWeight: 500 }}>{progress}%</b>
            </span>

            <span style={{ width: 1, height: 20, background: "rgba(255,255,255,0.18)", margin: "0 3px" }} />

            <button onClick={() => setRailOpen(p => !p)} title="Lista de secciones" aria-label="Lista de secciones" style={btnIcono(railOpen)}>☰</button>
            <button onClick={() => setInformeOpen(p => !p)} title="Informe en vivo" aria-label="Informe en vivo" style={btnIcono(informeOpen)}>▤</button>
            {isSupabaseConfigured() && currentClientId && (
              <button onClick={() => setShowVersionHistory(true)} title="Historial de versiones" aria-label="Historial de versiones" style={btnIcono(false)}>🕘</button>
            )}

            <button onClick={handleSave} disabled={saving} style={{
              background: isDirty ? C.green : "rgba(255,255,255,0.12)", color: "#fff",
              border: `1px solid ${isDirty ? "#1FA0A4" : "rgba(255,255,255,0.2)"}`,
              padding: "0 13px", height: 30, borderRadius: 7, fontSize: 12.5, fontWeight: 500,
              cursor: "pointer", opacity: saving ? 0.6 : 1, whiteSpace: "nowrap", fontFamily: "inherit",
            }}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button onClick={handlePrint} disabled={exporting} style={{
              background: "#2FB6BA", color: "#fff", border: "none",
              padding: "0 14px", height: 30, borderRadius: 7, fontSize: 12.5, fontWeight: 500,
              cursor: "pointer", opacity: exporting ? 0.6 : 1, whiteSpace: "nowrap", fontFamily: "inherit",
            }}>
              {exporting ? "Generando…" : "PDF"}
            </button>

            {session && (
              <>
                <span style={{ width: 1, height: 20, background: "rgba(255,255,255,0.18)", margin: "0 3px" }} />
                <span title={getUserName(session)} style={{ fontSize: 11.5, color: "#A9C6EA", whiteSpace: "nowrap", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {getUserName(session)}
                </span>
                <button onClick={async () => { await signOut(); setSession(null); }} title="Cerrar sesión" aria-label="Cerrar sesión" style={btnIcono(false)}>⏻</button>
              </>
            )}
          </div>
          <div style={{ height: 2, background: "rgba(255,255,255,0.14)" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#2FB6BA", transition: "width 0.4s ease" }} />
          </div>
        </div>

        {/* Body: sidebar + content */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>

        {/* Navegacion por secciones: columna fija, siempre a la vista */}
        <SectionRail
          abierto={railOpen}
          sectionEnabled={sectionEnabled}
          avance={avanceSeccion}
          avisos={hintsPendientes}
          activa={seccionActiva}
          onIr={irASeccion}
        />

        {/* Proyectos: panel superpuesto. Es gestion de archivos, no navegacion
            del formulario, asi que no merece una columna permanente. */}
        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200 }} />
        )}
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0, zIndex: 201,
          width: 236, display: "flex", flexDirection: "column",
          background: "#16294D", height: "100%",
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          visibility: sidebarOpen ? "visible" : "hidden",
          transition: "transform 0.22s ease, visibility 0.22s",
          boxShadow: sidebarOpen ? "2px 0 18px rgba(0,0,0,0.28)" : "none",
        }}>
          <div style={{ padding: "12px 8px 8px", display: "flex", flexDirection: "column", height: "100%" }}>
            {/* New project button */}
            <button onClick={handleNewProject} style={{
              width: "100%", padding: "8px 10px", background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#e2e8f0",
              fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: 7, marginBottom: 4,
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              ✏️ <span>Nuevo proyecto</span>
            </button>
            <button onClick={() => handleLoad()} style={{
              width: "100%", padding: "8px 10px", background: "transparent",
              border: "none", borderRadius: 6, color: "#A9C6EA",
              fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: 7, marginBottom: 12,
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "#94a3b8"}
            onMouseLeave={e => e.currentTarget.style.color = "#64748b"}>
              📁 <span>Abrir archivo...</span>
            </button>
            <input ref={fileInputLoadRef} type="file" accept=".alanait" style={{ display: "none" }}
              onChange={e => { if (e.target.files[0]) loadFromFile(e.target.files[0]); e.target.value = ""; }} />
            {isSupabaseConfigured() && (
              <button onClick={handleExportFile} style={{
                width: "100%", padding: "8px 10px", background: "transparent",
                border: "none", borderRadius: 6, color: "#A9C6EA",
                fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: 7, marginBottom: 12,
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#94a3b8"}
              onMouseLeave={e => e.currentTarget.style.color = "#64748b"}>
                💾 <span>Exportar a local (.alanait)</span>
              </button>
            )}

            {/* Recent projects list */}
            <div style={{ fontSize: 10, fontWeight: 500, color: "#A9C6EA", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 6px", marginBottom: 4 }}>
              Recientes
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {recentProjects.length === 0 ? (
                <div style={{ padding: "10px 6px", fontSize: 11, color: "#93A7C4", fontStyle: "italic" }}>
                  Sin proyectos aún
                </div>
              ) : recentProjects.map((p, i) => {
                const isActive = currentFilePath === p.empresa;
                return (
                  <div key={i}
                    style={{
                      padding: "7px 8px", borderRadius: 6, cursor: "pointer", marginBottom: 1,
                      background: isActive ? "rgba(29,78,216,0.2)" : "transparent",
                      transition: "background 0.15s", position: "relative",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4,
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.querySelector('.del-btn').style.opacity = "1";
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                      e.currentTarget.querySelector('.del-btn').style.opacity = "0";
                    }}
                  >
                    <div onClick={async () => {
                      let targetId = p.cloudId;
                      // If no cloudId but Supabase is configured, try to find by name
                      if (!targetId && isSupabaseConfigured() && p.empresa) {
                        try {
                          const results = await searchClients(p.empresa);
                          const match = results.find(c => c.empresa === p.empresa);
                          if (match) {
                            targetId = match.id;
                            // Update the recent entry with the cloudId for next time
                            addToRecent(p.empresa, match.id);
                            loadRecent();
                          }
                        } catch {}
                      }
                      if (targetId && isSupabaseConfigured()) {
                        if (isDirty) {
                          unsavedCallbackRef.current = () => openClientFromCloud(targetId);
                          setShowUnsaved(true);
                        } else {
                          openClientFromCloud(targetId);
                        }
                      } else if (!isSupabaseConfigured()) {
                        handleLoad();
                      }
                    }} style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? "#93c5fd" : "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.empresa || "Sin nombre"}
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                        {new Date(p.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <button className="del-btn" onClick={e => {
                      e.stopPropagation();
                      setConfirmDelete(p.empresa);
                    }} style={{
                      opacity: 0, transition: "opacity 0.15s", background: "transparent",
                      border: "none", color: "#ef4444", cursor: "pointer", padding: "2px 4px",
                      fontSize: 14, lineHeight: 1, borderRadius: 4, flexShrink: 0,
                    }}>✕</button>
                  </div>
                );
              })}
            </div>

            {/* Inline delete confirmation */}
            {confirmDelete && (
              <div style={{ margin: "8px", padding: "10px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "#fca5a5", marginBottom: 8, lineHeight: 1.4 }}>
                  ¿Eliminar este proyecto del historial reciente?
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => {
                    try {
                      let recent = JSON.parse(localStorage.getItem("alanait_recent") || "[]");
                      recent = recent.filter(r => r.empresa !== confirmDelete);
                      localStorage.setItem("alanait_recent", JSON.stringify(recent));
                    } catch {}
                    if (currentFilePath === confirmDelete) handleNewProject();
                    setConfirmDelete(null);
                    loadRecent();
                  }} style={{ flex: 1, padding: "5px", background: "#ef4444", border: "none", borderRadius: 5, color: "#fff", fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
                    Eliminar
                  </button>
                  <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "5px", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 5, color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div
          ref={contenidoRef}
          onScroll={e => setArribaVisible(e.currentTarget.scrollTop > 400)}
          style={{ flex: 1, minWidth: 0, overflowY: "auto", height: "100%", position: "relative" }}
        >
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 20px 24px" }}>
          {/* Client data */}
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 20, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ background: C.navy, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>👤</span>
              <span style={{ color: "#fff", fontWeight: 500, fontSize: 15 }}>Datos del Cliente</span>
            </div>
            <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {clientFields.map(f => (
                <div key={f.id} style={f.full ? { gridColumn: "1 / -1" } : {}}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: C.gray, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{f.label}</label>
                  <input type={f.id === "fecha" ? "date" : "text"} value={clientData[f.id]} onChange={e => { const val = f.id === "telefono" ? e.target.value.replace(/[^0-9+\s\-()]/g, "") : e.target.value; setClientData(p => ({ ...p, [f.id]: val })); setIsDirty(true); }} placeholder={f.placeholder} style={inp} />
                </div>
              ))}
            </div>
          </div>

          {/* Sections */}
          {SECTIONS.map(section => {
            const enabled = sectionEnabled[section.id];
            const pendientes = enabled === "si" ? hintsPendientes(section) : 0;
            return (
              <div key={section.id} ref={el => { seccionRefs.current[section.id] = el; }} style={{ background: "#fff", borderRadius: 10, border: `1px solid ${enabled === "si" ? C.blueBorder : enabled === "no" ? C.redBorder : C.border}`, marginBottom: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "border-color 0.2s", scrollMarginTop: 12 }}>
                <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: enabled === "si" ? `1px solid ${C.border}` : "none", background: enabled === "si" ? C.blueLight : enabled === "no" ? C.redLight : C.grayLight }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{section.icon}</span>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 15, color: C.navy, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {section.label}
                        {pendientes > 0 && (
                          <span style={{
                            fontSize: 11, fontWeight: 500, color: C.amber, background: C.amberLight,
                            border: `1px solid ${C.amberBorder}`, borderRadius: 10, padding: "1px 8px",
                            whiteSpace: "nowrap",
                          }}>
                            {pendientes} {pendientes === 1 ? "aviso" : "avisos"}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>{section.question}</div>
                    </div>
                  </div>
                  <SiNoToggle value={enabled} onChange={v => { setSectionEnabled(p => ({ ...p, [section.id]: p[section.id] === v ? undefined : v })); setIsDirty(true); }} />
                </div>

                {enabled === "si" && (
                  <div style={{ padding: "20px" }}>
                    <>
                      {Array.from({ length: getCount(section.id) }, (_, i) => (
                        <div key={i} style={{ marginBottom: getCount(section.id) > 1 ? 24 : 0, paddingBottom: getCount(section.id) > 1 ? 24 : 0, borderBottom: getCount(section.id) > 1 ? `1px dashed ${C.border}` : "none" }}>
                          {getCount(section.id) > 1 && (
                            <div style={{ fontSize: 12, fontWeight: 500, color: C.blue, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${C.blueBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span>{section.multiLabel} {i + 1}</span>
                              <button onClick={() => {
                                setFormData(prev => {
                                  const sec = { ...(prev[section.id] || {}) };
                                  const count = getCount(section.id);
                                  for (let j = i; j < count - 1; j++) sec[j] = sec[j + 1] || {};
                                  delete sec[count - 1];
                                  // Los estados de aviso van indexados por instancia
                                  // (hintId@2): si no se reindexan aqui, al borrar la
                                  // instancia 1 los avisos resueltos de la 2 se quedan
                                  // colgados y aparecen sobre datos que no son suyos.
                                  return {
                                    ...prev,
                                    [section.id]: sec,
                                    __hints__: reindexarHints(prev.__hints__ ?? {}, section.id, i, count),
                                  };
                                });
                                setInstanceCounts(prev => ({ ...prev, [section.id]: Math.max(1, getCount(section.id) - 1) }));
                                setIsDirty(true);
                              }} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12, padding: "2px 6px", fontWeight: 500 }}>✕ Eliminar</button>
                            </div>
                          )}
                          <SectionFields section={section} instanceIdx={i} getVal={getVal} setVal={setVal} getHint={getHint} setHint={setHint} fechaVisita={clientData.fecha} />
                        </div>
                      ))}
                      <button onClick={() => { addInstance(section.id); setIsDirty(true); }} style={{ marginTop: 8, padding: "7px 16px", border: `1.5px dashed ${C.blue}`, background: C.blueLight, color: C.blue, borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                        + Añadir {section.multiLabel}
                      </button>
                      <ImageZone sectionId={section.id} images={sectionImages[section.id] || []} addImage={addImage} removeImage={removeImage} updateCaption={updateCaption} />
                    </>
                  </div>
                )}

                {enabled === "no" && (
                  <div style={{ padding: "10px 20px", fontSize: 13, color: C.red, fontStyle: "italic" }}>
                    Sin servicio — no se documentará esta sección.
                  </div>
                )}
              </div>
            );
          })}

          {/* Datos adicionales */}
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ padding: "14px 20px", background: C.grayLight, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>📝</span>
              <div>
                <div style={{ fontWeight: 500, fontSize: 15, color: C.navy }}>Datos adicionales</div>
                <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>Notas, observaciones e imágenes que no encajan en ninguna sección específica</div>
              </div>
            </div>
            <div style={{ padding: "20px" }}>
              <label style={{ fontWeight: 500, fontSize: 13, color: C.text, display: "block", marginBottom: 6 }}>Notas adicionales</label>
              <textarea
                value={formData["__other_notes__"] || ""}
                onChange={e => { setFormData(prev => ({ ...prev, "__other_notes__": e.target.value })); setIsDirty(true); }}
                placeholder="Escribe aquí cualquier dato adicional, observación o información relevante que no encaje en las secciones anteriores..."
                style={{ width: "100%", minHeight: 150, padding: 12, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
              />
              <div style={{ marginTop: 16 }}>
                <label style={{ fontWeight: 500, fontSize: 13, color: C.text, display: "block", marginBottom: 6 }}>Capturas adicionales</label>
                <ImageZone sectionId="__other__" images={sectionImages["__other__"] || []} addImage={addImage} removeImage={removeImage} updateCaption={updateCaption} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
            <button onClick={handlePrint}  style={{ background: C.navy, color: "#fff", border: "none", padding: "13px 36px", borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: "pointer", boxShadow: "0 4px 14px rgba(13,31,60,0.3)", letterSpacing: "0.02em" }}>
              {exporting ? "⏳ Generando..." : "📄 Generar PDF del informe"}
            </button>
            <div style={{ fontSize: 12, color: C.textLight, marginTop: 10 }}>
              El PDF se descargará directamente
            </div>
          </div>
        </div>

        {/* Volver arriba: aparece al bajar, no estorba en la parte alta */}
        {arribaVisible && (
          <button
            onClick={irArriba}
            title="Volver arriba"
            aria-label="Volver arriba"
            style={{
              position: "sticky", bottom: 24, float: "right", marginRight: 24,
              width: 42, height: 42, borderRadius: "50%", cursor: "pointer",
              background: C.navy, color: "#fff", border: "none", fontSize: 17,
              boxShadow: "0 4px 14px rgba(13,31,60,0.35)", zIndex: 50,
            }}
          >
            ↑
          </button>
        )}
        </div>{/* end main content */}

        {/* Informe en vivo: se rehace en cada tecla, asi que el tecnico ve el
            efecto de lo que responde sin tener que exportar el PDF. */}
        <div style={{
          width: informeOpen ? 300 : 0, minWidth: informeOpen ? 300 : 0,
          background: "#fff", borderLeft: informeOpen ? `1px solid ${C.border}` : "none",
          overflowY: "auto", overflowX: "hidden", height: "100%", flexShrink: 0,
          transition: "width 0.25s ease, min-width 0.25s ease",
        }}>
          {informeOpen && (
            <ReportPanel
              sectionEnabled={sectionEnabled}
              formData={formData}
              instanceCounts={instanceCounts}
              getVal={getVal}
              getCount={getCount}
              getHint={getHint}
              onIrASeccion={irASeccion}
              fechaVisita={clientData.fecha}
            />
          )}
        </div>
        </div>{/* end body row */}
      </div>
    </>
  );
}
