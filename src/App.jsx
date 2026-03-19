import React, { useState, useEffect, useCallback } from "react";
import Dashboard from "./components/Dashboard.jsx";
import VersionHistory from "./components/VersionHistory.jsx";
import LoginPage from "./components/LoginPage.jsx";
import { isSupabaseConfigured } from "./lib/supabase.js";
import { getSession, onAuthChange, signOut, getUserName } from "./lib/auth.js";
import { saveClient as saveToCloud, loadClient, exportToFile } from "./lib/clientService.js";

const SECTIONS = [
  {
    id: "red", label: "Red (Routers, Switches, Firewall)", icon: "🌐",
    question: "¿Dispone de infraestructura de red gestionada?",
    multi: true, multiLabel: "Red",
    fields: [
      { id: "isp", label: "Proveedor de Internet (ISP)", type: "text" },
      { id: "conexion_tipo", label: "Tipo de conexión", type: "select", options: ["Fibra", "ADSL", "Cable", "4G/5G backup", "MPLS", "Otro"] },
      { id: "conexion_vel", label: "Velocidad contratada", type: "text", placeholder: "Ej: 600/300 Mbps" },
      { id: "linea_backup", label: "¿Línea de backup/failover?", type: "radio", options: ["Sí", "No"] },
      { id: "router_marca", label: "Marca/Modelo Router", type: "text" },
      { id: "firewall", label: "¿Dispone de Firewall dedicado?", type: "radio", options: ["Sí", "No"] },
      { id: "firewall_marca", label: "Marca/Modelo Firewall", type: "text", dep: { field: "firewall", value: "Sí" } },
      { id: "firewall_gestion", label: "Gestión del Firewall", type: "select", options: ["Autogestionado", "Gestionado por proveedor", "Sin gestión activa"], dep: { field: "firewall", value: "Sí" } },
      { id: "switches_num", label: "Número de switches", type: "number" },
      { id: "switches_tipo", label: "Tipo de switches", type: "select", options: ["Todos gestionados", "Mixto", "Todos no gestionados"] },
      { id: "vlans", label: "¿Segmentación por VLANs?", type: "radio", options: ["Sí", "No"] },
      { id: "monitorizacion", label: "¿Monitorización de red activa?", type: "radio", options: ["Sí", "No"] },
      { id: "ip_gateway", label: "IP Gateway / Router", type: "ip", placeholder: "Ej: 192.168.1.1" },
      { id: "ip_rango", label: "Rango / Máscara de red", type: "cidr", placeholder: "Ej: 192.168.1.0/24" },
      { id: "notas", label: "Notas adicionales", type: "textarea" },
    ]
  },
  {
    id: "servidores", label: "Servidores", icon: "🖥️",
    question: "¿Dispone de servidores?",
    multi: true, multiLabel: "Servidor",
    fields: [
      { id: "nombre", label: "Nombre / Hostname", type: "text" },
      { id: "tipo", label: "Tipo", type: "select", options: ["Físico", "Virtual", "Cloud"] },
      { id: "marca", label: "Marca / Modelo", type: "text" },
      { id: "so", label: "Sistema Operativo", type: "text", placeholder: "Ej: Windows Server 2022" },
      { id: "roles", label: "Roles principales", type: "checks", options: ["Domain Controller", "File Server", "App Server", "ERP/CRM", "Print Server", "Backup Server", "Hypervisor", "Web Server", "Base de datos", "Otro"] },
      { id: "ram", label: "Memoria RAM", type: "text", placeholder: "Ej: 32 GB" },
      { id: "almacenamiento", label: "Almacenamiento", type: "text", placeholder: "Ej: 2×1TB SSD RAID1" },
      { id: "garantia", label: "Garantía hasta", type: "text", placeholder: "Ej: 12/2026" },
      { id: "dominio", label: "¿Pertenece a dominio AD?", type: "radio", options: ["Sí", "No"] },
      { id: "acceso_remoto", label: "Acceso remoto habilitado", type: "select", options: ["RDP", "SSH", "Ambos", "Ninguno"] },
      { id: "notas", label: "Notas", type: "textarea" },
    ]
  },
  {
    id: "pcs", label: "Ordenadores / PCs", icon: "💻",
    question: "¿Dispone de ordenadores de trabajo?",
    multi: true, multiLabel: "Grupo de PCs",
    fields: [
      { id: "cantidad", label: "Número aproximado de equipos", type: "number" },
      { id: "so", label: "Sistema Operativo predominante", type: "select", options: ["Windows 11", "Windows 10", "macOS", "Linux", "Mixto"] },
      { id: "dominio", label: "¿Unidos a dominio?", type: "radio", options: ["Sí", "No", "Mixto"] },
      { id: "gestion_central", label: "¿Gestión centralizada (MDM/Intune/GPO)?", type: "radio", options: ["Sí", "No"] },
      { id: "gestion_tipo", label: "Herramienta de gestión", type: "text", dep: { field: "gestion_central", value: "Sí" } },
      { id: "moviles", label: "¿Dispositivos móviles corporativos?", type: "radio", options: ["Sí", "No"] },
      { id: "moviles_mdm", label: "¿MDM para móviles?", type: "radio", options: ["Sí", "No"], dep: { field: "moviles", value: "Sí" } },
      { id: "antiguedad", label: "Antigüedad media de equipos", type: "select", options: ["< 2 años", "2–4 años", "4–6 años", "> 6 años", "Mixto"] },
      { id: "notas", label: "Notas adicionales", type: "textarea" },
    ]
  },
  {
    id: "backup", label: "Backup", icon: "💾",
    question: "¿Dispone de sistema de backup?",
    multi: true, multiLabel: "Backup",
    fields: [
      { id: "software", label: "Software de backup", type: "text", placeholder: "Ej: Veeam, Acronis, Windows Backup…" },
      { id: "destino", label: "Destino del backup", type: "checks", options: ["NAS local", "Disco externo", "Cloud (Azure/S3/Jotelulu)", "Cinta", "Otro"] },
      { id: "frecuencia", label: "Frecuencia", type: "select", options: ["Continuo", "Diario", "Semanal", "Mensual", "Sin política definida"] },
      { id: "tipo", label: "Tipo de backup", type: "select", options: ["Completo", "Incremental", "Diferencial", "Mixto"] },
      { id: "retencion", label: "Retención", type: "text", placeholder: "Ej: 30 días / 3 meses" },
      { id: "pruebas", label: "¿Se realizan pruebas de restauración?", type: "radio", options: ["Sí", "No", "Nunca"] },
      { id: "pruebas_freq", label: "Frecuencia de pruebas", type: "text", dep: { field: "pruebas", value: "Sí" } },
      { id: "offsite", label: "¿Backup offsite / fuera de sede?", type: "radio", options: ["Sí", "No"] },
      { id: "notas", label: "Notas adicionales", type: "textarea" },
    ]
  },
  {
    id: "email", label: "Correo Electrónico", icon: "📧",
    question: "¿Dispone de correo corporativo?",
    multi: true, multiLabel: "Cuenta de correo",
    fields: [
      { id: "proveedor", label: "Proveedor", type: "select", options: ["Microsoft 365", "Google Workspace", "Exchange On-Premise", "Hosting externo", "Otro"] },
      { id: "dominio", label: "Dominio de correo", type: "text", placeholder: "Ej: empresa.com" },
      { id: "buzones", label: "Número de buzones", type: "number" },
      { id: "plan", label: "Plan / Licencias", type: "text", placeholder: "Ej: M365 Business Basic" },
      { id: "antispam", label: "¿Solución antispam/antiphishing?", type: "radio", options: ["Sí", "No"] },
      { id: "antispam_cual", label: "¿Cuál?", type: "text", dep: { field: "antispam", value: "Sí" } },
      { id: "mfa", label: "¿MFA activado?", type: "radio", options: ["Sí", "No", "Parcialmente"] },
      { id: "archivado", label: "¿Archivado de correo?", type: "radio", options: ["Sí", "No"] },
      { id: "notas", label: "Notas adicionales", type: "textarea" },
    ]
  },
  {
    id: "antivirus", label: "Antivirus / Seguridad Endpoint", icon: "🛡️",
    question: "¿Dispone de solución antivirus/EDR?",
    multi: true, multiLabel: "Solución antivirus",
    fields: [
      { id: "solucion", label: "Solución actual", type: "text", placeholder: "Ej: Trend Micro, Sophos, Defender…" },
      { id: "tipo", label: "Tipo de solución", type: "select", options: ["Antivirus básico", "EDR", "XDR", "MDR gestionado", "No sabe"] },
      { id: "consola", label: "¿Consola de gestión centralizada?", type: "radio", options: ["Sí", "No"] },
      { id: "licencias", label: "Número de licencias", type: "number" },
      { id: "vencimiento", label: "Fecha de vencimiento", type: "text", placeholder: "Ej: 12/2025" },
      { id: "servidores_av", label: "¿Cubre también servidores?", type: "radio", options: ["Sí", "No"] },
      { id: "notas", label: "Notas adicionales", type: "textarea" },
    ]
  },
  {
    id: "wifi", label: "WiFi", icon: "📶",
    question: "¿Dispone de red WiFi?",
    multi: true, multiLabel: "Red WiFi",
    fields: [
      { id: "ssids", label: "SSIDs / Redes WiFi", type: "text", placeholder: "Ej: CORP_WIFI, GUEST_WIFI" },
      { id: "invitados", label: "¿Red de invitados separada?", type: "radio", options: ["Sí", "No"] },
      { id: "controlador", label: "¿Controlador WiFi centralizado?", type: "select", options: ["Sí (cloud)", "Sí (local)", "No, APs autónomos"] },
      { id: "marca", label: "Marca de APs", type: "text", placeholder: "Ej: Ubiquiti, Meraki, TP-Link…" },
      { id: "cantidad", label: "Número de APs", type: "number" },
      { id: "cobertura", label: "¿Cobertura suficiente?", type: "radio", options: ["Sí", "No", "Parcial"] },
      { id: "notas", label: "Notas adicionales", type: "textarea" },
    ]
  },
  {
    id: "vpn", label: "VPN", icon: "🔒",
    question: "¿Dispone de VPN corporativa?",
    multi: true, multiLabel: "VPN",
    fields: [
      { id: "tipo", label: "Tipo de VPN", type: "select", options: ["SSL/TLS", "IPsec Site-to-Site", "IPsec Client-to-Site", "OpenVPN", "WireGuard", "Otro"] },
      { id: "solucion", label: "Solución / Fabricante", type: "text", placeholder: "Ej: Fortinet, Cisco AnyConnect…" },
      { id: "usuarios", label: "Número de usuarios VPN", type: "number" },
      { id: "mfa", label: "¿MFA en la VPN?", type: "radio", options: ["Sí", "No"] },
      { id: "uso", label: "Uso principal", type: "checks", options: ["Teletrabajo", "Conexión entre sedes", "Proveedores externos", "Otro"] },
      { id: "notas", label: "Notas adicionales", type: "textarea" },
    ]
  },
  {
    id: "sai", label: "SAI / UPS", icon: "🔋",
    question: "¿Dispone de SAI/UPS?",
    multi: true, multiLabel: "SAI/UPS",
    fields: [
      { id: "marca", label: "Marca / Modelo", type: "text", placeholder: "Ej: APC, Eaton…" },
      { id: "cantidad", label: "Número de SAIs", type: "number" },
      { id: "protegidos", label: "Equipos protegidos", type: "checks", options: ["Servidores", "Switches core", "Router/Firewall", "PCs críticos", "NAS/Almacenamiento"] },
      { id: "autonomia", label: "Autonomía estimada", type: "text", placeholder: "Ej: 15 min" },
      { id: "baterias", label: "¿Baterías revisadas recientemente?", type: "radio", options: ["Sí", "No", "No se sabe"] },
      { id: "monitorizado", label: "¿SAI monitorizado (SNMP/software)?", type: "radio", options: ["Sí", "No"] },
      { id: "notas", label: "Notas adicionales", type: "textarea" },
    ]
  },
  {
    id: "almacenamiento", label: "Almacenamiento de información", icon: "🗄️",
    question: "¿Cómo almacena el cliente su información y archivos?",
    multi: true, multiLabel: "Sistema de almacenamiento",
    fields: [
      { id: "tipo", label: "Tipo de almacenamiento", type: "select", options: ["NAS local", "Servidor de ficheros", "SharePoint / OneDrive", "Google Drive", "Dropbox", "S3 / Azure Blob", "Mixto", "Otro"] },
      { id: "proveedor", label: "Proveedor / Plataforma", type: "text", placeholder: "Ej: Microsoft, Google, Synology..." },
      { id: "capacidad", label: "Capacidad total", type: "text", placeholder: "Ej: 2 TB, 1 TB OneDrive..." },
      { id: "ubicacion", label: "Ubicación", type: "select", options: ["On-premise", "Cloud", "Híbrido"] },
      { id: "acceso_remoto", label: "¿Acceso remoto a los archivos?", type: "radio", options: ["Sí", "No"] },
      { id: "sincronizacion", label: "¿Sincronización en equipos locales?", type: "radio", options: ["Sí", "No"] },
      { id: "permisos", label: "¿Gestión de permisos/carpetas?", type: "radio", options: ["Sí", "No", "Básica"] },
      { id: "notas", label: "Notas adicionales", type: "textarea" },
    ]
  },
  {
    id: "telefonia", label: "Telefonía", icon: "📞",
    question: "¿Dispone de sistema de telefonía corporativa?",
    multi: true, multiLabel: "Sistema de telefonía",
    fields: [
      { id: "tipo", label: "Tipo de telefonía", type: "select", options: ["Telefonía fija tradicional", "VoIP / IP", "Central virtual (cloud)", "Móviles corporativos", "Microsoft Teams Phone", "Mixto", "Otro"] },
      { id: "proveedor", label: "Proveedor", type: "text", placeholder: "Ej: Vodafone, Orange, Movistar..." },
      { id: "extensiones", label: "Número de extensiones / líneas", type: "number" },
      { id: "centralita", label: "¿Dispone de centralita?", type: "radio", options: ["Sí", "No"] },
      { id: "centralita_tipo", label: "Tipo de centralita", type: "select", options: ["Física", "Virtual / Cloud", "Teams Phone"], dep: { field: "centralita", value: "Sí" } },
      { id: "grabacion", label: "¿Grabación de llamadas?", type: "radio", options: ["Sí", "No"] },
      { id: "moviles", label: "¿Móviles corporativos?", type: "radio", options: ["Sí", "No"] },
      { id: "moviles_num", label: "Número de móviles", type: "number", dep: { field: "moviles", value: "Sí" } },
      { id: "notas", label: "Notas adicionales", type: "textarea" },
    ]
  },
  {
    id: "impresion", label: "Sistemas de impresión", icon: "🖨️",
    question: "¿Dispone de impresoras o sistemas de impresión?",
    multi: true, multiLabel: "Impresora",
    fields: [
      { id: "marca", label: "Marca / Modelo", type: "text", placeholder: "Ej: HP LaserJet Pro M404..." },
      { id: "tipo", label: "Tipo", type: "select", options: ["Láser B/N", "Láser Color", "Inkjet", "Multifunción", "Plotter", "Térmica", "Otro"] },
      { id: "conectividad", label: "Conectividad", type: "select", options: ["Red (cable)", "WiFi", "USB", "Bluetooth", "Mixto"] },
      { id: "ip", label: "Dirección IP", type: "ip", placeholder: "192.168.1.100", dep: { field: "conectividad", value: "Red (cable)" } },
      { id: "ip_wifi", label: "Dirección IP", type: "ip", placeholder: "192.168.1.101", dep: { field: "conectividad", value: "WiFi" } },
      { id: "ubicacion", label: "Ubicación", type: "text", placeholder: "Ej: Oficina principal, Almacén..." },
      { id: "consumibles", label: "Tipo de consumibles", type: "text", placeholder: "Ej: Tóner HP CF217A" },
      { id: "gestion", label: "¿Gestión/contrato de mantenimiento?", type: "radio", options: ["Sí", "No"] },
      { id: "proveedor_gestion", label: "Proveedor mantenimiento", type: "text", dep: { field: "gestion", value: "Sí" } },
      { id: "notas", label: "Notas adicionales", type: "textarea" },
    ]
  },
  {
    id: "erp", label: "Aplicaciones / ERP / Licencias", icon: "📊",
    question: "¿Dispone de ERP, CRM u otras aplicaciones críticas?",
    multi: true, multiLabel: "Aplicación",
    fields: [
      { id: "nombre", label: "Nombre de la aplicación", type: "text" },
      { id: "tipo", label: "Tipo", type: "select", options: ["ERP", "CRM", "Contabilidad", "Gestión documental", "Ofimática", "CAD/CAM", "Facturación", "RRHH", "Otro"] },
      { id: "proveedor", label: "Proveedor / Fabricante", type: "text" },
      { id: "version", label: "Versión actual", type: "text" },
      { id: "alojamiento", label: "Alojamiento", type: "select", options: ["On-Premise", "Cloud/SaaS", "Servidor propio", "Infraestructura proveedor"] },
      { id: "licencias", label: "Nº licencias / usuarios", type: "number" },
      { id: "soporte", label: "¿Soporte activo del fabricante?", type: "radio", options: ["Sí", "No", "No sabe"] },
      { id: "partner", label: "Partner / Implantador", type: "text" },
      { id: "notas", label: "Notas", type: "textarea" },
    ]
  },
];

const C = {
  navy: "#0d1f3c", blue: "#1d4ed8", blueLight: "#eff6ff", blueBorder: "#bfdbfe",
  green: "#15803d", greenLight: "#f0fdf4", greenBorder: "#86efac",
  red: "#b91c1c", redLight: "#fef2f2", redBorder: "#fecaca",
  gray: "#64748b", grayLight: "#f8fafc", border: "#e2e8f0", text: "#1e293b", textLight: "#64748b",
};

const inp = {
  width: "100%", padding: "8px 11px", border: `1px solid ${C.border}`,
  borderRadius: "6px", fontSize: "13px", color: C.text, background: "#fff",
  boxSizing: "border-box", fontFamily: "inherit", outline: "none",
};

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

function buildPrintHTML(clientData, sectionEnabled, formData, instanceCounts, sectionImages) {
  const getVal = (sectionId, fieldId, idx = null) => {
    if (idx !== null) return formData[sectionId]?.[idx]?.[fieldId] ?? "";
    return formData[sectionId]?.[fieldId] ?? "";
  };

  const clientLabels = {
    empresa: "Empresa", sector: "Sector", trabajadores: "Nº trabajadores", sedes: "Nº sedes",
    contacto: "Persona de contacto", telefono: "Teléfono",
    email: "Email", web: "Página web", direccion: "Dirección", fecha: "Fecha de visita", responsable: "Responsable ALANA IT"
  };

  const tdL = `padding:6px 10px;border:1px solid #e2e8f0;font-size:12px;font-weight:600;width:38%;background:#f8fafc;color:#374151;vertical-align:top;`;
  const tdV = `padding:6px 10px;border:1px solid #e2e8f0;font-size:12px;color:#1e293b;`;
  const h2S = `font-size:13px;font-weight:700;color:#0d1f3c;background:#eff6ff;padding:7px 10px;border-left:4px solid #1d4ed8;margin:0 0 8px 0;`;

  let body = "";

  // Cover page
  body += `<div style="page-break-after:always;padding:60px 48px 48px;box-sizing:border-box;background:#fff;">
    <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAfQB9ADASIAAhEBAxEB/8QAHQABAAICAwEBAAAAAAAAAAAAAAEIBgcCBQkEA//EAFwQAQABAgQDBAMIDgUICAUEAwABAgMEBQYRByExCBJBUWFxgRMiMjd0kaGxFBUXIzZCUmJydbKzwdFWgpKiwhYkM0NGc4OUNDVTVZPS4fAlJ0RUYxgmRWVkw/H/xAAbAQEAAgMBAQAAAAAAAAAAAAAABQYBBAcCA//EAD0RAQABAwICBgkDBAICAgIDAAABAgMEBREhMQYSEzJBcSIzNFFhgaGxwRRSkRUWQtEjU3LwQ+ElNWKS8f/aAAwDAQACEQMRAD8AuWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/9k=" style="height:125px;width:auto;display:block;margin-bottom:40px;" />
    <div style="width:60px;height:5px;background:#1d4ed8;border-radius:3px;margin-bottom:40px;"></div>
    <h1 style="font-size:52px;font-weight:800;color:#0d1f3c;margin:0 0 12px 0;line-height:1.1;">${clientData.empresa || "Empresa"}</h1>
    <p style="font-size:18px;color:#64748b;margin:0 0 48px 0;">Informe de inventario y análisis técnico inicial</p>
    <table style="border-collapse:collapse;width:auto;margin-bottom:60px;">
      ${clientData.contacto ? `<tr><td style="padding:6px 20px 6px 0;font-size:13px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Contacto</td><td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:500;">${clientData.contacto}</td></tr>` : ""}
      ${clientData.telefono ? `<tr><td style="padding:6px 20px 6px 0;font-size:13px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Teléfono</td><td style="padding:6px 0;font-size:14px;color:#1e293b;">${clientData.telefono}</td></tr>` : ""}
      ${clientData.email ? `<tr><td style="padding:6px 20px 6px 0;font-size:13px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Email</td><td style="padding:6px 0;font-size:14px;color:#1e293b;">${clientData.email}</td></tr>` : ""}
      ${clientData.web ? `<tr><td style="padding:6px 20px 6px 0;font-size:13px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Web</td><td style="padding:6px 0;font-size:14px;color:#1d4ed8;">${clientData.web}</td></tr>` : ""}
      ${clientData.direccion ? `<tr><td style="padding:6px 20px 6px 0;font-size:13px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Dirección</td><td style="padding:6px 0;font-size:14px;color:#1e293b;">${clientData.direccion}</td></tr>` : ""}
      ${clientData.fecha ? `<tr><td style="padding:6px 20px 6px 0;font-size:13px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Fecha visita</td><td style="padding:6px 0;font-size:14px;color:#1e293b;">${clientData.fecha}</td></tr>` : ""}
      ${clientData.responsable ? `<tr><td style="padding:6px 20px 6px 0;font-size:13px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Técnico</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#1d4ed8;">${clientData.responsable}</td></tr>` : ""}
    </table>
    <div style="border-top:2px solid #e2e8f0;padding-top:20px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:12px;color:#94a3b8;">alanait.com</div>
      <div style="text-align:right;font-size:12px;color:#94a3b8;">
        Documento generado el <strong style="color:#64748b;">${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</strong>
      </div>
    </div>
  </div>`;

  // Header (index page)
  body += `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:3px solid #0d1f3c;">
    <div>
      <div style="font-size:10px;letter-spacing:0.1em;color:#64748b;text-transform:uppercase;margin-bottom:4px;">Informe de Onboarding Técnico</div>
      <h1 style="margin:0;font-size:24px;color:#0d1f3c;font-weight:800;">${clientData.empresa || "—"}</h1>
    </div>
    <div style="text-align:right;font-size:11px;color:#64748b;">
      <div style="font-weight:700;font-size:13px;color:#0d1f3c;">ALANA IT</div>
      <div>alanait.com</div>
      <div style="margin-top:4px;">${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</div>
    </div>
  </div>`;

  // Client data
  const clientRows = Object.entries(clientData).filter(([,v]) => v)
    .map(([k,v]) => `<tr><td style="${tdL}">${clientLabels[k]||k}</td><td style="${tdV}">${v}</td></tr>`).join("");
  if (clientRows) {
    body += `<div style="margin-bottom:20px;"><h2 style="${h2S}">👤 Datos del Cliente</h2>
      <table style="width:100%;border-collapse:collapse;"><tbody>${clientRows}</tbody></table></div>`;
  }

  // Sections
  SECTIONS.filter(s => sectionEnabled[s.id] === "si").forEach(section => {
    const imgs = sectionImages[section.id] || [];
    let tables = "";

    const makeRows = (idx) => {
      let rows = "";
      section.fields.forEach(f => {
        const v = getVal(section.id, f.id, idx);
        if (!v || v === "" || (Array.isArray(v) && v.length === 0)) return;
        rows += `<tr><td style="${tdL}">${f.label}</td><td style="${tdV}">${Array.isArray(v) ? v.join(", ") : v}</td></tr>`;
      });
      return rows;
    };

    if (section.multi) {
      const count = instanceCounts[section.id] || 1;
      for (let i = 0; i < count; i++) {
        const rows = makeRows(i);
        if (!rows) continue;
        tables += count > 1 ? `<p style="font-size:12px;font-weight:700;color:#1d4ed8;margin:8px 0 4px;border-bottom:1px solid #e2e8f0;padding-bottom:3px;">${section.multiLabel} ${i+1}</p>` : "";
        tables += `<table style="width:100%;border-collapse:collapse;margin-bottom:8px;"><tbody>${rows}</tbody></table>`;
      }
    } else {
      const rows = makeRows(null);
      if (rows) tables = `<table style="width:100%;border-collapse:collapse;"><tbody>${rows}</tbody></table>`;
    }

    let imgHtml = "";
    if (imgs.length > 0) {
      imgHtml = `<div style="margin-top:12px;"><p style="font-size:11px;font-weight:700;color:#64748b;margin:0 0 8px;text-transform:uppercase;">📷 Capturas</p>`;
      imgs.forEach(img => {
        imgHtml += `<div style="margin-bottom:12px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;page-break-inside:avoid;">
          <img src="${img.src}" style="max-width:100%;height:auto;display:block;" />
          ${img.caption ? `<p style="font-size:11px;color:#64748b;padding:5px 8px;margin:0;background:#f8fafc;">${img.caption}</p>` : ""}
        </div>`;
      });
      imgHtml += `</div>`;
    }

    if (!tables && !imgHtml) return;
    body += `<div style="margin-bottom:20px;page-break-inside:avoid;">
      <h2 style="${h2S}">${section.icon} ${section.label}</h2>${tables}${imgHtml}</div>`;
  });

  // Secciones sin servicio
  const noSections = SECTIONS.filter(s => sectionEnabled[s.id] === "no");
  if (noSections.length > 0) {
    body += `<div style="margin-top:16px;padding:10px;background:#fafafa;border:1px solid #e2e8f0;border-radius:6px;">
      <p style="font-size:11px;font-weight:600;color:#64748b;margin:0 0 6px;">Secciones sin servicio:</p>
      ${noSections.map(s => `<span style="display:inline-block;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;padding:3px 10px;border-radius:4px;font-size:11px;margin:3px;">${s.icon} ${s.label}</span>`).join("")}
    </div>`;
  }

  // Otras capturas
  const otras = sectionImages["__other__"] || [];
  if (otras.length > 0) {
    body += `<div style="margin-top:20px;"><h2 style="${h2S}">🗂️ Otras capturas</h2>`;
    otras.forEach(img => {
      body += `<div style="margin-bottom:12px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;page-break-inside:avoid;">
        <img src="${img.src}" style="max-width:100%;height:auto;display:block;" />
        ${img.caption ? `<p style="font-size:11px;color:#64748b;padding:5px 8px;margin:0;background:#f8fafc;">${img.caption}</p>` : ""}
      </div>`;
    });
    body += `</div>`;
  }

  // Footer
  body += `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8;">
    Generado por ALANA IT Onboarding Tool · ${new Date().toLocaleString("es-ES")}
  </div>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Onboarding ${clientData.empresa || ""}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; }
      * { box-sizing: border-box; }
      table { border-collapse: collapse; width: 100%; }
      tr { page-break-inside: avoid !important; break-inside: avoid !important; }
      td { page-break-inside: avoid !important; break-inside: avoid !important; }
      h2 { page-break-after: avoid !important; break-after: avoid !important; }
      img { page-break-inside: avoid !important; break-inside: avoid !important; max-width: 100%; }
      .section { page-break-inside: avoid !important; break-inside: avoid !important; }
      table { page-break-inside: avoid; break-inside: avoid; width: 100%; border-collapse: collapse; }
      div[style*="margin-bottom:20px"] { page-break-inside: avoid; break-inside: avoid; }
      @media print {
        body { padding: 10px; }
        @page { margin: 1.5cm; }
      }
    </style>
  </head><body>${body}

  </body></html>`;
}

// ── Print View ──────────────────────────────────────────────────────────────
function PrintView({ clientData, sectionEnabled, formData, instanceCounts, sectionImages }) {
  const getVal = (sectionId, fieldId, idx = null) => {
    if (idx !== null) return formData[sectionId]?.[idx]?.[fieldId] ?? "";
    return formData[sectionId]?.[fieldId] ?? "";
  };

  const clientLabels = { empresa: "Empresa", sector: "Sector", trabajadores: "Nº trabajadores", sedes: "Nº sedes", contacto: "Persona de contacto", telefono: "Teléfono", email: "Email", web: "Página web", direccion: "Dirección", fecha: "Fecha de visita", responsable: "Responsable ALANA IT" };

  const tdLabel = { padding: "6px 10px", border: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "600", width: "38%", background: "#f8fafc", color: "#374151" };
  const tdVal = { padding: "6px 10px", border: "1px solid #e2e8f0", fontSize: "12px", color: "#1e293b" };
  const h2Style = { fontSize: "13px", fontWeight: "700", color: "#0d1f3c", background: "#eff6ff", padding: "7px 10px", borderLeft: "4px solid #1d4ed8", margin: "0 0 8px 0" };

  return (
    <div className="print-view" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 13, color: "#1e293b", padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 14, borderBottom: "3px solid #0d1f3c" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Informe de Onboarding Técnico</div>
          <h1 style={{ margin: 0, fontSize: 24, color: "#0d1f3c", fontWeight: 800 }}>{clientData.empresa || "—"}</h1>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, color: "#64748b" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#0d1f3c" }}>ALANA IT</div>
          <div>alanait.com</div>
          <div style={{ marginTop: 4 }}>{new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</div>
        </div>
      </div>

      {/* Client data */}
      {Object.entries(clientData).some(([, v]) => v) && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={h2Style}>👤 Datos del Cliente</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {Object.entries(clientData).filter(([, v]) => v).map(([k, v]) => (
                <tr key={k}><td style={tdLabel}>{clientLabels[k] || k}</td><td style={tdVal}>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sections */}
      {SECTIONS.filter(s => sectionEnabled[s.id] === "si").map(section => {
        const imgs = sectionImages[section.id] || [];
        let hasContent = false;

        const renderRows = (idx = null) => section.fields.map(f => {
          const v = getVal(section.id, f.id, idx);
          if (!v || v === "" || (Array.isArray(v) && v.length === 0)) return null;
          hasContent = true;
          return (
            <tr key={f.id} style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
              <td style={tdLabel}>{f.label}</td>
              <td style={tdVal}>{Array.isArray(v) ? v.join(", ") : v}</td>
            </tr>
          );
        });

        return (
          <div key={section.id} style={{ marginBottom: 20, pageBreakInside: "avoid", breakInside: "avoid" }}>
            <h2 style={h2Style}>{section.icon} {section.label}</h2>
            {section.multi ? (
              Array.from({ length: instanceCounts[section.id] || 1 }, (_, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  {(instanceCounts[section.id] || 1) > 1 && (
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8", margin: "8px 0 4px", borderBottom: "1px solid #e2e8f0", paddingBottom: 3 }}>
                      {section.multiLabel} {i + 1}
                    </p>
                  )}
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>{renderRows(i)}</tbody>
                  </table>
                </div>
              ))
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>{renderRows(null)}</tbody>
              </table>
            )}
            {imgs.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>📷 Capturas</p>
                {imgs.map((img, i) => (
                  <div key={i} style={{ marginBottom: 12, border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden", pageBreakInside: "avoid" }}>
                    <img src={img.src} alt={img.caption || ""} style={{ maxWidth: "100%", height: "auto", display: "block" }} />
                    {img.caption && <p style={{ fontSize: 11, color: "#64748b", padding: "5px 8px", margin: 0, background: "#f8fafc" }}>{img.caption}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Secciones sin servicio */}
      {SECTIONS.filter(s => sectionEnabled[s.id] === "no").length > 0 && (
        <div style={{ marginTop: 16, padding: 10, background: "#fafafa", border: "1px solid #e2e8f0", borderRadius: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#64748b", margin: "0 0 6px" }}>Secciones sin servicio:</p>
          {SECTIONS.filter(s => sectionEnabled[s.id] === "no").map(s => (
            <span key={s.id} style={{ display: "inline-block", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "3px 10px", borderRadius: 4, fontSize: 11, margin: 3 }}>
              {s.icon} {s.label}
            </span>
          ))}
        </div>
      )}

      {/* Otras capturas */}
      {(sectionImages["__other__"] || []).length > 0 && (
        <div style={{ marginTop: 20, pageBreakInside: "avoid" }}>
          <h2 style={h2Style}>🗂️ Otras capturas</h2>
          {(sectionImages["__other__"] || []).map((img, i) => (
            <div key={i} style={{ marginBottom: 12, border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden", pageBreakInside: "avoid" }}>
              <img src={img.src} alt={img.caption || ""} style={{ maxWidth: "100%", height: "auto", display: "block" }} />
              {img.caption && <p style={{ fontSize: 11, color: "#64748b", padding: "5px 8px", margin: 0, background: "#f8fafc" }}>{img.caption}</p>}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24, paddingTop: 12, borderTop: "1px solid #e2e8f0", textAlign: "center", fontSize: 10, color: "#94a3b8" }}>
        Generado por ALANA IT Onboarding Tool · {new Date().toLocaleString("es-ES")}
      </div>
    </div>
  );
}

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
  const addInstance = (id) => setInstanceCounts(prev => ({ ...prev, [id]: getCount(id) + 1 }));

  const answered = SECTIONS.filter(s => sectionEnabled[s.id] !== undefined).length;
  const progress = Math.round((answered / SECTIONS.length) * 100);

  const [exporting, setExporting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const unsavedCallbackRef = React.useRef(null); // stores path to confirm

  const handlePrint = async () => {
    setExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const html = buildPrintHTML(clientData, sectionEnabled, formData, instanceCounts, sectionImages);

      // Create temporary container
      const container = document.createElement('div');
      container.innerHTML = html;
      // Extract just the body content
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) container.innerHTML = bodyMatch[1];
      container.style.width = '210mm';
      container.style.padding = '20px';
      container.style.fontFamily = "'Segoe UI', system-ui, sans-serif";
      document.body.appendChild(container);

      const nombre = clientData.empresa ? clientData.empresa.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, "_") : "onboarding";
      const fecha = new Date().toISOString().split("T")[0];

      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: `${nombre}_${fecha}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }).from(container).save();

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
        setIsDirty(false);
      } catch (err) {
        alert("Error al guardar: " + err.message);
      }
      setSaving(false);
    } else {
      // Fallback: save as file
      handleExportFile();
    }
  };

  const handleExportFile = async () => {
    let projectData;
    if (isSupabaseConfigured() && currentClientId) {
      try {
        projectData = await exportToFile(currentClientId);
      } catch {
        projectData = { clientData, sectionEnabled, formData, instanceCounts, sectionImages };
      }
    } else {
      projectData = { clientData, sectionEnabled, formData, instanceCounts, sectionImages };
    }
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
    addToRecent(nombre);
    setCurrentFilePath(nombre);
    setIsDirty(false);
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

  const addToRecent = (empresa) => {
    try {
      let recent = JSON.parse(localStorage.getItem("alanait_recent") || "[]");
      const name = empresa || "Sin nombre";
      recent = recent.filter(r => r.empresa !== name);
      recent.unshift({ empresa: name, date: new Date().toISOString() });
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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1f3c", color: "#fff", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
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
        * { -webkit-user-drag: none; }
        [data-dropzone] { -webkit-user-drag: element !important; cursor: copy !important; }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { margin: 0; padding: 0; background: white; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>
      {/* PRINT VIEW — only shown when printing */}
      <div className="print-only">
        <PrintView
          clientData={clientData}
          sectionEnabled={sectionEnabled}
          formData={formData}
          instanceCounts={instanceCounts}
          sectionImages={sectionImages}
        />
      </div>
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
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0d1f3c", marginBottom: 8 }}>Cambios sin guardar</div>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
              El proyecto actual tiene cambios sin guardar. ¿Qué quieres hacer?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={async () => {
                await handleSave();
                setShowUnsaved(false);
                if (unsavedCallbackRef.current) await unsavedCallbackRef.current();
                unsavedCallbackRef.current = null;
              }} style={{ padding: "10px", background: "#15803d", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
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
      <div className="screen-only no-print" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
        {/* Header */}
        <div style={{ background: C.navy, color: "#fff", padding: "0 24px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0" }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#93c5fd", textTransform: "uppercase", marginBottom: 2 }}>ALANA IT</div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Onboarding Técnico</div>
              {currentFilePath && <div style={{ fontSize: 11, color: "#93c5fd", marginTop: 1 }}>{currentFilePath.split("\\").pop().split("/").pop()}{isDirty ? " •" : ""}</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {/* Left group: navigation + actions */}
              {isSupabaseConfigured() && (
                <button onClick={() => {
                  if (isDirty) { unsavedCallbackRef.current = () => setView('dashboard'); setShowUnsaved(true); }
                  else setView('dashboard');
                }} style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", padding: "9px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                  ← Panel
                </button>
              )}
              <button onClick={() => { setSidebarOpen(p => !p); loadRecent(); }} style={{ background: sidebarOpen ? "rgba(29,78,216,0.4)" : "rgba(255,255,255,0.12)", color: "#fff", border: `1px solid ${sidebarOpen ? "rgba(29,78,216,0.6)" : "rgba(255,255,255,0.2)"}`, padding: "9px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                ☰ Proyectos
              </button>
              <button onClick={handleSave} disabled={saving} style={{ background: isDirty ? "#15803d" : "rgba(255,255,255,0.12)", color: "#fff", border: `1px solid ${isDirty ? "#16a34a" : "rgba(255,255,255,0.2)"}`, padding: "9px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", opacity: saving ? 0.6 : 1 }}>
                {saving ? "⏳ Guardando..." : isDirty ? "💾 Guardar *" : "💾 Guardar"}
              </button>
              {isSupabaseConfigured() && currentClientId && (
                <button onClick={() => setShowVersionHistory(true)} style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", padding: "9px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                  📜 Historial
                </button>
              )}
              {/* Spacer */}
              <div style={{ flex: 1 }} />
              {/* Right group: progress + PDF + user */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#93c5fd" }}>Progreso</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{answered}/{SECTIONS.length}</div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "3px solid #3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                {progress}%
              </div>
              <button onClick={handlePrint} disabled={exporting} style={{ background: C.blue, color: "#fff", border: "none", padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: exporting ? 0.6 : 1 }}>
                {exporting ? "⏳ Generando..." : "📄 Exportar PDF"}
              </button>
              {session && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 8, borderLeft: "1px solid rgba(255,255,255,0.2)" }}>
                  <span style={{ fontSize: 12, color: "#93c5fd" }}>👤 {getUserName(session)}</span>
                  <button onClick={async () => { await signOut(); setSession(null); }} style={{ background: "rgba(255,255,255,0.08)", color: "#94a3b8", border: "none", padding: "6px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    Salir
                  </button>
                </div>
              )}
            </div>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.1)" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#3b82f6", transition: "width 0.4s ease", borderRadius: 2 }} />
          </div>
        </div>

        {/* Body: sidebar + content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar */}
        <div style={{
          width: sidebarOpen ? 200 : 0, minWidth: sidebarOpen ? 200 : 0,
          background: "#111827", display: "flex", flexDirection: "column",
          transition: "width 0.25s ease, min-width 0.25s ease",
          overflow: "hidden", flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.07)",
          height: "calc(100vh - 67px)",
        }}>
          <div style={{ padding: "12px 8px 8px", opacity: sidebarOpen ? 1 : 0, transition: "opacity 0.2s", display: "flex", flexDirection: "column", height: "100%" }}>
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
              border: "none", borderRadius: 6, color: "#64748b",
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
                border: "none", borderRadius: 6, color: "#64748b",
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
            <div style={{ fontSize: 10, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 6px", marginBottom: 4 }}>
              Recientes
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {recentProjects.length === 0 ? (
                <div style={{ padding: "10px 6px", fontSize: 11, color: "#374151", fontStyle: "italic" }}>
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
                    <div onClick={() => handleLoad()} style={{ flex: 1, minWidth: 0 }}>
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
                  }} style={{ flex: 1, padding: "5px", background: "#ef4444", border: "none", borderRadius: 5, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
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
        <div style={{ flex: 1, overflowY: "auto", height: "calc(100vh - 67px)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>
          {/* Client data */}
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 20, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ background: C.navy, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>👤</span>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Datos del Cliente</span>
            </div>
            <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {clientFields.map(f => (
                <div key={f.id} style={f.full ? { gridColumn: "1 / -1" } : {}}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.gray, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{f.label}</label>
                  <input type={f.id === "fecha" ? "date" : "text"} value={clientData[f.id]} onChange={e => { const val = f.id === "telefono" ? e.target.value.replace(/[^0-9+\s\-()]/g, "") : e.target.value; setClientData(p => ({ ...p, [f.id]: val })); setIsDirty(true); }} placeholder={f.placeholder} style={inp} />
                </div>
              ))}
            </div>
          </div>

          {/* Sections */}
          {SECTIONS.map(section => {
            const enabled = sectionEnabled[section.id];
            return (
              <div key={section.id} style={{ background: "#fff", borderRadius: 10, border: `1px solid ${enabled === "si" ? C.blueBorder : enabled === "no" ? C.redBorder : C.border}`, marginBottom: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "border-color 0.2s" }}>
                <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: enabled === "si" ? `1px solid ${C.border}` : "none", background: enabled === "si" ? C.blueLight : enabled === "no" ? C.redLight : C.grayLight }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{section.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: C.navy }}>{section.label}</div>
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
                            <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${C.blueBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span>{section.multiLabel} {i + 1}</span>
                              <button onClick={() => {
                                setFormData(prev => {
                                  const sec = { ...(prev[section.id] || {}) };
                                  const count = getCount(section.id);
                                  for (let j = i; j < count - 1; j++) sec[j] = sec[j + 1] || {};
                                  delete sec[count - 1];
                                  return { ...prev, [section.id]: sec };
                                });
                                setInstanceCounts(prev => ({ ...prev, [section.id]: Math.max(1, getCount(section.id) - 1) }));
                                setIsDirty(true);
                              }} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12, padding: "2px 6px", fontWeight: 500 }}>✕ Eliminar</button>
                            </div>
                          )}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                            {section.fields.map(f => (
                              <div key={f.id} style={f.type === "textarea" || f.type === "checks" ? { gridColumn: "1 / -1" } : {}}>
                                <Field section={section} field={f} instanceIdx={i} getVal={getVal} setVal={setVal} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button onClick={() => { addInstance(section.id); setIsDirty(true); }} style={{ marginTop: 8, padding: "7px 16px", border: `1.5px dashed ${C.blue}`, background: C.blueLight, color: C.blue, borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
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

          {/* Otras capturas */}
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ padding: "14px 20px", background: C.grayLight, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🗂️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.navy }}>Otras capturas</div>
                <div style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>Imágenes que no encajan en ninguna sección específica</div>
              </div>
            </div>
            <div style={{ padding: "20px" }}>
              <ImageZone sectionId="__other__" images={sectionImages["__other__"] || []} addImage={addImage} removeImage={removeImage} updateCaption={updateCaption} />
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
            <button onClick={handlePrint}  style={{ background: C.navy, color: "#fff", border: "none", padding: "13px 36px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(13,31,60,0.3)", letterSpacing: "0.02em" }}>
              {exporting ? "⏳ Generando..." : "📄 Generar PDF del informe"}
            </button>
            <div style={{ fontSize: 12, color: C.textLight, marginTop: 10 }}>
              Se abrirá el diálogo de impresión — selecciona "Guardar como PDF"
            </div>
          </div>
        </div>
        </div>{/* end main content */}
        </div>{/* end body row */}
      </div>
    </>
  );
}
