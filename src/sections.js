// ─────────────────────────────────────────────────────────────────────────
// Esquema del cuestionario de onboarding.
//
// AVISO: los `id` de seccion y de campo son CLAVES DE DATOS ya guardados en
// Supabase (form_data.red["0"].isp = "Movistar"). Renombrar o eliminar un id
// existente equivale a borrar ese dato en todos los clientes guardados.
// Solo se anaden campos nuevos. Los `label` son presentacion y si pueden cambiar.
//
// scripts/check-ids.mjs verifica este contrato en cada build.
// ─────────────────────────────────────────────────────────────────────────

export const SECTIONS = [
  {
    id: "red", label: "Internet y Red (Router, Switches, Firewall)", icon: "🌐",
    question: "¿Dispone de conexión a internet e infraestructura de red gestionada?",
    multi: true, multiLabel: "Red",
    fields: [
      // ── Conexión a Internet ──────────────────────────────────────────────
      { id: "isp", label: "Proveedor de Internet (ISP)", type: "text", group: "Conexión a Internet" },
      { id: "isp_contrato", label: "Nº de contrato con el operador", type: "text", placeholder: "Ej: 900123456", group: "Conexión a Internet" },
      { id: "isp_soporte", label: "Contacto de soporte del operador", type: "text", placeholder: "Ej: 900 104 871 / empresas@operador.es", group: "Conexión a Internet" },
      { id: "isp_fecha_renovacion", label: "Renovación / fin de permanencia", type: "text", group: "Conexión a Internet" },
      { id: "conexion_tipo", label: "Tipo de conexión", type: "select", options: ["Fibra", "ADSL", "Cable", "4G/5G backup", "MPLS", "Otro"], group: "Conexión a Internet" },
      { id: "conexion_vel", label: "Velocidad contratada", type: "text", placeholder: "Ej: 600/300 Mbps", group: "Conexión a Internet" },
      { id: "vel_real", label: "Velocidad real medida (speedtest)", type: "text", placeholder: "Ej: 520/290 Mbps", group: "Conexión a Internet" },
      { id: "ip_publica_tipo", label: "IP pública", type: "radio", options: ["Fija", "Dinámica", "No revisado"], group: "Conexión a Internet" },
      { id: "ddns", label: "¿DDNS configurado?", type: "radio", options: ["Sí", "No", "No necesario"], dep: { field: "ip_publica_tipo", value: "Dinámica" }, group: "Conexión a Internet" },
      { id: "linea_backup", label: "¿Línea de backup/failover?", type: "radio", options: ["Sí", "No"], group: "Conexión a Internet" },

      // ── Router y Firewall perimetral ─────────────────────────────────────
      { id: "router_marca", label: "Marca/Modelo Router", type: "text", group: "Router y Firewall perimetral" },
      { id: "firewall", label: "¿Dispone de Firewall dedicado?", type: "radio", options: ["Sí", "No"], group: "Router y Firewall perimetral" },
      { id: "firewall_marca", label: "Marca/Modelo Firewall", type: "text", dep: { field: "firewall", value: "Sí" }, group: "Router y Firewall perimetral" },
      { id: "firewall_serial", label: "Nº de serie del firewall", type: "text", dep: { field: "firewall", value: "Sí" }, group: "Router y Firewall perimetral" },
      { id: "firewall_firmware", label: "Versión de firmware", type: "text", placeholder: "Ej: FortiOS 7.4.3", dep: { field: "firewall", value: "Sí" }, group: "Router y Firewall perimetral" },
      { id: "firewall_firmware_ok", label: "¿Firmware actualizado?", type: "radio", options: ["Sí", "No", "No revisado"], dep: { field: "firewall", value: "Sí" }, group: "Router y Firewall perimetral" },
      { id: "firewall_soporte", label: "Garantía / soporte del fabricante", type: "select", options: ["En soporte", "Fuera de soporte (EOL)", "No revisado"], dep: { field: "firewall", value: "Sí" }, group: "Router y Firewall perimetral" },
      { id: "firewall_gestion", label: "Gestión del Firewall", type: "select", options: ["Autogestionado", "Gestionado por proveedor", "Sin gestión activa"], dep: { field: "firewall", value: "Sí" }, group: "Router y Firewall perimetral" },
      { id: "accesos_heredados", label: "Accesos del proveedor anterior (router/firewall)", type: "radio", options: ["Revocados", "Pendiente de revocar", "No existían", "No revisado"], group: "Router y Firewall perimetral" },
      { id: "nat_reglas", label: "Reglas NAT / port-forwarding activas", type: "radio", options: ["Documentadas", "Existen sin documentar", "No hay", "No revisado"], group: "Router y Firewall perimetral" },
      { id: "rdp_expuesto", label: "¿RDP (3389) u otros puertos de riesgo expuestos a internet?", type: "radio", options: ["Sí", "No", "No revisado"], group: "Router y Firewall perimetral" },
      { id: "vpns_auditadas", label: "VPNs configuradas (site-to-site / acceso remoto)", type: "radio", options: ["Auditadas", "Pendiente de auditar", "No hay VPNs"], group: "Router y Firewall perimetral" },
      { id: "utm", label: "¿UTM / filtrado web / IDS activo?", type: "radio", options: ["Sí", "No", "No revisado"], group: "Router y Firewall perimetral" },

      // ── Switching y LAN ──────────────────────────────────────────────────
      { id: "switches_num", label: "Número de switches", type: "number", group: "Switching y LAN" },
      { id: "switches_marca", label: "Marca/Modelo de switches", type: "text", placeholder: "Ej: Aruba 1930, TP-Link SG3428", group: "Switching y LAN" },
      { id: "switches_tipo", label: "Tipo de switches (¿gestionados?)", type: "select", options: ["Todos gestionados", "Mixto", "Todos no gestionados"], group: "Switching y LAN" },
      { id: "vlans", label: "¿Segmentación por VLANs?", type: "radio", options: ["Sí", "No"], group: "Switching y LAN" },
      { id: "vlans_detalle", label: "VLANs y finalidad de cada una", type: "text", placeholder: "Ej: VLAN10 usuarios, VLAN20 servidores, VLAN30 invitados", dep: { field: "vlans", value: "Sí" }, group: "Switching y LAN" },
      { id: "ip_gateway", label: "IP Gateway / Router", type: "ip", placeholder: "Ej: 192.168.1.1", group: "Switching y LAN" },
      { id: "ip_rango", label: "Rango / Máscara de red", type: "cidr", placeholder: "Ej: 192.168.1.0/24", group: "Switching y LAN" },

      // ── Servicios de red ─────────────────────────────────────────────────
      { id: "dhcp_servidor", label: "¿Quién ofrece el DHCP?", type: "select", options: ["Router/Firewall", "Servidor Windows (AD/DHCP)", "Switch L3", "Otro dispositivo", "No hay DHCP (IPs estáticas)", "No revisado"], group: "Servicios de red" },
      { id: "dns_tipo", label: "DNS configurado en firewall/red", type: "select", options: ["DNS del ISP", "Públicos (8.8.8.8 / 1.1.1.1)", "Interno (AD/Windows)", "Mixto", "Otro"], group: "Servicios de red" },
      { id: "monitorizacion", label: "¿Monitorización de red activa?", type: "radio", options: ["Sí", "No"], group: "Servicios de red" },
      { id: "notas", label: "Notas adicionales", type: "textarea", group: "Servicios de red" },
    ]
  },
  {
    id: "servidores", label: "Servidores", icon: "🖥️",
    question: "¿Dispone de servidores?",
    multi: true, multiLabel: "Servidor",
    fields: [
      // ── Identificación ───────────────────────────────────────────────────
      { id: "nombre", label: "Nombre / Hostname", type: "text", group: "Identificación" },
      { id: "ip", label: "Dirección IP", type: "ip", placeholder: "Ej: 192.168.1.10", group: "Identificación" },
      { id: "tipo", label: "Tipo", type: "select", options: ["Físico", "Virtual", "Cloud"], group: "Identificación" },
      { id: "marca", label: "Marca / Modelo", type: "text", group: "Identificación" },
      { id: "serial", label: "Nº de serie", type: "text", placeholder: "Ej: CZJ1234ABC", dep: { field: "tipo", value: "Físico" }, group: "Identificación" },
      // "DNS", "DHCP" y "Terminal Server (RDS)" van AL FINAL: anadir opciones
      // es seguro, reordenarlas o reescribirlas romperia los datos guardados.
      { id: "roles", label: "Roles principales", type: "checks", options: ["Domain Controller", "File Server", "App Server", "ERP/CRM", "Print Server", "Backup Server", "Hypervisor", "Web Server", "Base de datos", "Otro", "DNS", "DHCP", "Terminal Server (RDS)"], group: "Identificación" },

      // ── Hardware ─────────────────────────────────────────────────────────
      { id: "ram", label: "Memoria RAM", type: "text", placeholder: "Ej: 32 GB", group: "Hardware" },
      { id: "almacenamiento", label: "Almacenamiento", type: "text", placeholder: "Ej: 2×1TB SSD RAID1", group: "Hardware" },
      { id: "raid_estado", label: "Estado del RAID / controladora", type: "select", options: ["Óptimo", "Degradado (disco en fallo)", "En reconstrucción", "Sin RAID (disco único)", "No aplica", "No revisado"], group: "Hardware" },
      { id: "garantia", label: "Garantía hasta", type: "text", placeholder: "Ej: 12/2026", group: "Hardware" },
      { id: "hw_soporte", label: "Garantía / soporte del hardware", type: "select", options: ["En garantía", "Fuera de garantía", "No aplica", "No revisado"], group: "Hardware" },
      { id: "firmware_estado", label: "Firmware del hardware (BIOS / controladora / ILO)", type: "select", options: ["Al día", "Parches pendientes", "Muy desactualizado", "No revisado"], dep: { field: "tipo", value: "Físico" }, group: "Hardware" },
      { id: "oob_tipo", label: "Acceso fuera de banda (ILO / iDRAC / IPMI)", type: "select", options: ["iLO (HPE)", "iDRAC (Dell)", "IPMI / BMC genérico", "XClarity (Lenovo)", "Otro", "No tiene", "No revisado"], dep: { field: "tipo", value: "Físico" }, group: "Hardware" },

      // ── Sistema operativo ────────────────────────────────────────────────
      { id: "so", label: "Sistema Operativo", type: "text", placeholder: "Ej: Windows Server 2022", group: "Sistema operativo" },
      { id: "so_soporte", label: "¿El sistema operativo está en soporte?", type: "select", options: ["En soporte", "Fuera de soporte (EOL)", "No revisado"], group: "Sistema operativo" },
      { id: "so_parcheo", label: "Nivel de parches", type: "select", options: ["Al día", "Parches pendientes", "Muy desactualizado", "No revisado"], group: "Sistema operativo" },
      { id: "so_licencia_titular", label: "Titularidad de la licencia del SO y CALs", type: "radio", options: ["A nombre del cliente", "A nombre del proveedor anterior", "No revisado"], group: "Sistema operativo" },

      // ── Virtualización (solo servidores virtuales) ───────────────────────
      { id: "hipervisor", label: "Plataforma de virtualización", type: "select", options: ["VMware ESXi", "Hyper-V", "Proxmox", "KVM", "Citrix XenServer", "Otro"], dep: { field: "tipo", value: "Virtual" }, group: "Virtualización" },
      { id: "version_hipervisor", label: "Versión del hipervisor", type: "text", placeholder: "Ej: ESXi 8.0 U2, Hyper-V 2022...", dep: { field: "tipo", value: "Virtual" }, group: "Virtualización" },
      { id: "host_fisico", label: "Host físico", type: "text", placeholder: "Ej: ESXi01, HV-SERVER01...", dep: { field: "tipo", value: "Virtual" }, group: "Virtualización" },
      { id: "cluster", label: "¿Pertenece a cluster?", type: "radio", options: ["Sí", "No"], dep: { field: "tipo", value: "Virtual" }, group: "Virtualización" },
      { id: "nombre_cluster", label: "Nombre del cluster", type: "text", placeholder: "Ej: vCluster-Prod", dep: { field: "cluster", value: "Sí" }, group: "Virtualización" },
      { id: "lic_hipervisor", label: "Licenciamiento hipervisor", type: "text", placeholder: "Ej: vSphere Standard, Datacenter...", dep: { field: "tipo", value: "Virtual" }, group: "Virtualización" },
      { id: "almacenamiento_compartido", label: "Almacenamiento compartido (cabina/SAN)", type: "text", placeholder: "Ej: Dell PowerVault iSCSI", dep: { field: "tipo", value: "Virtual" }, group: "Virtualización" },
      { id: "snapshots", label: "Snapshots acumulados", type: "select", options: ["Sin snapshots", "1-2 snapshots recientes", "Snapshots antiguos acumulados", "No revisado"], dep: { field: "tipo", value: "Virtual" }, group: "Virtualización" },

      // ── Dominio y accesos ────────────────────────────────────────────────
      { id: "dominio", label: "¿Pertenece a dominio AD?", type: "radio", options: ["Sí", "No"], group: "Dominio y accesos" },
      { id: "dominio_cuentas", label: "Auditoría de usuarios y grupos del dominio", type: "select", options: ["Revisado, correcto", "Revisado, con hallazgos", "Pendiente de revisar", "No aplica"], dep: { field: "dominio", value: "Sí" }, group: "Dominio y accesos" },
      { id: "gpos_revisadas", label: "GPOs activas revisadas", type: "select", options: ["Revisado, correcto", "Revisado, con hallazgos", "Pendiente de revisar", "No aplica"], dep: { field: "dominio", value: "Sí" }, group: "Dominio y accesos" },
      { id: "acceso_remoto", label: "Acceso remoto habilitado", type: "select", options: ["RDP", "SSH", "Ambos", "Ninguno"], group: "Dominio y accesos" },
      { id: "herramientas_acceso", label: "Herramientas de acceso remoto instaladas", type: "checks", options: ["RDP", "TeamViewer", "AnyDesk", "VNC", "VPN corporativa", "RMM del proveedor anterior", "Ninguna"], group: "Dominio y accesos" },
      { id: "accesos_heredados", label: "Accesos del proveedor anterior al servidor", type: "radio", options: ["Revocados", "Pendiente de revocar", "No existían", "No revisado"], group: "Dominio y accesos" },

      { id: "notas", label: "Notas", type: "textarea", group: "Notas" },
    ]
  },
  {
    id: "pcs", label: "Ordenadores / PCs", icon: "💻",
    question: "¿Dispone de ordenadores de trabajo?",
    multi: true, multiLabel: "Grupo de PCs",
    fields: [
      // ── Inventario ───────────────────────────────────────────────────────
      { id: "cantidad", label: "Número aproximado de equipos", type: "number", group: "Inventario" },
      { id: "portatiles_num", label: "De los cuales, portátiles", type: "number", group: "Inventario" },
      { id: "antiguedad", label: "Antigüedad media de equipos", type: "select", options: ["< 2 años", "2–4 años", "4–6 años", "> 6 años", "Mixto"], group: "Inventario" },

      // ── Sistema operativo y parcheo ──────────────────────────────────────
      { id: "so", label: "Sistema Operativo predominante", type: "select", options: ["Windows 11", "Windows 10", "macOS", "Linux", "Mixto"], group: "Sistema operativo y parcheo" },
      { id: "so_soporte", label: "¿Los sistemas operativos están en soporte?", type: "select", options: ["En soporte", "Mixto", "Fuera de soporte (EOL)", "No revisado"], group: "Sistema operativo y parcheo" },
      { id: "parcheo_gestion", label: "Gestión de actualizaciones del sistema", type: "select", options: ["Centralizada por RMM", "WSUS / Intune / GPO", "Windows Update automático sin control", "Manual por el usuario", "Sin gestión", "No revisado"], group: "Sistema operativo y parcheo" },
      { id: "parcheo_terceros", label: "Actualizaciones de terceros (Chrome, Adobe, Java...)", type: "select", options: ["Centralizada por RMM", "Automática de cada aplicación", "Manual", "Sin gestión", "No revisado"], group: "Sistema operativo y parcheo" },
      { id: "software_licencias", label: "¿El software instalado está licenciado?", type: "select", options: ["Todo con licencia", "Hay software sin licencia", "No revisado"], group: "Sistema operativo y parcheo" },

      // ── Dominio y gestión ────────────────────────────────────────────────
      { id: "dominio", label: "¿Unidos a dominio?", type: "radio", options: ["Sí", "No", "Mixto"], group: "Dominio y gestión" },
      { id: "gestion_central", label: "¿Gestión centralizada (MDM/Intune/GPO)?", type: "radio", options: ["Sí", "No"], group: "Dominio y gestión" },
      { id: "gestion_tipo", label: "Herramienta de gestión", type: "text", dep: { field: "gestion_central", value: "Sí" }, group: "Dominio y gestión" },
      { id: "rmm_agente", label: "¿Agente RMM desplegado?", type: "select", options: ["Sí, en todos", "Sí, parcialmente", "No", "No revisado"], group: "Dominio y gestión" },
      { id: "rmm_producto", label: "RMM utilizado", type: "select", options: ["NinjaOne", "Acronis", "Otro", "Ninguno", "No revisado"], group: "Dominio y gestión" },
      { id: "moviles", label: "¿Dispositivos móviles corporativos?", type: "radio", options: ["Sí", "No"], group: "Dominio y gestión" },
      { id: "moviles_mdm", label: "¿MDM para móviles?", type: "radio", options: ["Sí", "No"], dep: { field: "moviles", value: "Sí" }, group: "Dominio y gestión" },

      // ── Cuentas locales y cifrado ────────────────────────────────────────
      { id: "admin_local", label: "¿Los usuarios son administradores locales?", type: "select", options: ["Ninguno es administrador", "Solo algunos usuarios", "Todos son administradores", "No revisado"], group: "Cuentas locales y cifrado" },
      { id: "admin_local_password", label: "Contraseña de administrador local", type: "select", options: ["Única por equipo (LAPS o gestor)", "La misma en todos los equipos", "No revisado"], group: "Cuentas locales y cifrado" },
      { id: "accesos_heredados", label: "Cuentas locales del proveedor anterior", type: "radio", options: ["Revocados", "Pendiente de revocar", "No existían", "No revisado"], group: "Cuentas locales y cifrado" },
      { id: "cifrado_portatiles", label: "Cifrado de disco (BitLocker / FileVault)", type: "select", options: ["Activo en todos", "Activo en algunos", "No activo", "No aplica", "No revisado"], group: "Cuentas locales y cifrado" },
      { id: "cifrado_claves", label: "Custodia de las claves de recuperación", type: "select", options: ["En AD / Entra ID", "En Intune", "En gestor de contraseñas del MSP", "En el propio equipo o en papel", "No se custodian", "No revisado"], dep: { field: "cifrado_portatiles", value: "Activo en todos" }, group: "Cuentas locales y cifrado" },

      { id: "notas", label: "Notas adicionales", type: "textarea", group: "Notas" },
    ]
  },
  {
    id: "backup", label: "Backup", icon: "💾",
    question: "¿Dispone de sistema de backup?",
    multi: true, multiLabel: "Backup",
    fields: [
      // -- Solucion --
      { id: "software", label: "Software de backup", type: "select", options: ["Veeam", "Acronis", "Nakivo", "Commvault", "Windows Server Backup", "Datto", "Cobian", "Duplicati", "Veritas Backup Exec", "Otro"], group: "Solución" },
      { id: "consola_url", label: "Consola de gestión (URL)", type: "text", placeholder: "Ej: https://cloud.acronis.com", group: "Solución" },
      { id: "consola_acronis", label: "Consola Acronis (URL / tipo)", type: "text", placeholder: "Ej: Acronis Cyber Protect Cloud", dep: { field: "software", value: "Acronis" }, group: "Solución" },
      { id: "agentes_acronis", label: "Nº de agentes desplegados", type: "number", dep: { field: "software", value: "Acronis" }, group: "Solución" },
      { id: "plan_proteccion", label: "Plan de protección activo", type: "text", placeholder: "Ej: Advanced Backup, Disaster Recovery...", dep: { field: "software", value: "Acronis" }, group: "Solución" },
      { id: "consola_accesos_heredados", label: "Accesos del proveedor anterior a la consola", type: "radio", options: ["Revocados", "Pendiente de revocar", "No existían", "No revisado"], group: "Solución" },

      // -- Que se copia y politica --
      { id: "backup_cobertura", label: "¿Qué se copia?", type: "checks", options: ["Servidores (SO completo / VM)", "Datos y ficheros compartidos", "Bases de datos / ERP", "Correo (Exchange / M365 / Google)", "SharePoint / OneDrive / Teams", "PCs de usuario", "Configuración de red (firewall / switches)"], group: "Qué se copia y política" },
      { id: "frecuencia", label: "Frecuencia", type: "select", options: ["Continuo", "Diario", "Semanal", "Mensual", "Sin política definida"], group: "Qué se copia y política" },
      { id: "tipo", label: "Tipo de backup", type: "select", options: ["Completo", "Incremental", "Diferencial", "Mixto"], group: "Qué se copia y política" },
      { id: "retencion_rango", label: "Retención", type: "select", options: ["Menos de 7 días", "7 a 14 días", "15 a 30 días", "1 a 3 meses", "3 a 12 meses", "Más de 12 meses", "Sin retención definida", "No revisado"], group: "Qué se copia y política" },
      { id: "retencion", label: "Retención (detalle)", type: "text", placeholder: "Ej: 30 diarias + 12 mensuales", group: "Qué se copia y política" },
      { id: "destino", label: "Destino del backup", type: "checks", options: ["NAS local", "Disco externo", "Cloud (Azure/S3/Jotelulu)", "Acronis Cloud", "Cinta", "Otro"], group: "Qué se copia y política" },
      { id: "offsite", label: "¿Backup offsite / fuera de sede?", type: "radio", options: ["Sí", "No"], group: "Qué se copia y política" },

      // -- Verificacion y proteccion --
      { id: "ultimo_job", label: "Estado de las últimas ejecuciones", type: "select", options: ["Correctas", "Con avisos", "Con errores", "Sin ejecutar desde hace días", "No revisado"], group: "Verificación y protección" },
      { id: "backup_alertas", label: "Alertas de fallo de copia", type: "select", options: ["Configuradas y se revisan", "Se envían pero nadie las revisa", "No hay alertas configuradas", "No revisado"], group: "Verificación y protección" },
      { id: "pruebas", label: "¿Se realizan pruebas de restauración?", type: "radio", options: ["Sí", "No", "Nunca"], group: "Verificación y protección" },
      { id: "pruebas_freq", label: "Frecuencia de pruebas", type: "text", dep: { field: "pruebas", value: "Sí" }, group: "Verificación y protección" },
      { id: "prueba_resultado", label: "Resultado de la última restauración de prueba", type: "select", options: ["Correcta", "Correcta con incidencias", "Fallida", "No se ha podido probar", "No revisado"], group: "Verificación y protección" },
      { id: "inmutabilidad", label: "¿Copias inmutables / anti-ransomware?", type: "select", options: ["Sí, copias inmutables (WORM / object lock)", "Solo protección anti-ransomware del software", "No", "No revisado"], group: "Verificación y protección" },

      // -- Backup de endpoints --
      { id: "backup_endpoints", label: "¿Backup de endpoints?", type: "radio", options: ["Sí", "No"], group: "Backup de endpoints" },
      { id: "herramienta_endpoints", label: "Herramienta de backup endpoints", type: "text", placeholder: "Ej: Acronis, Veeam Agent, OneDrive...", dep: { field: "backup_endpoints", value: "Sí" }, group: "Backup de endpoints" },
      { id: "que_respalda", label: "¿Qué se respalda en endpoints?", type: "checks", options: ["Documentos", "Escritorio", "Perfiles de usuario", "AppData", "Disco completo"], dep: { field: "backup_endpoints", value: "Sí" }, group: "Backup de endpoints" },
      { id: "destino_endpoints", label: "Destino backup endpoints", type: "text", dep: { field: "backup_endpoints", value: "Sí" }, group: "Backup de endpoints" },

      // -- Repositorio de copias (NAS o servidor dedicado) --
      { id: "repo_dedicado", label: "¿Hay un repositorio dedicado (NAS/servidor)?", type: "radio", options: ["Sí", "No (solo cloud)", "No revisado"], group: "Repositorio de copias" },
      { id: "repo_marca_modelo", label: "Marca / Modelo del repositorio", type: "text", placeholder: "Ej: Synology RS1221+", dep: { field: "repo_dedicado", value: "Sí" }, group: "Repositorio de copias" },
      { id: "repo_serial", label: "Nº de serie del repositorio", type: "text", dep: { field: "repo_dedicado", value: "Sí" }, group: "Repositorio de copias" },
      { id: "repo_garantia", label: "Garantía del repositorio hasta", type: "text", dep: { field: "repo_dedicado", value: "Sí" }, group: "Repositorio de copias" },
      { id: "repo_capacidad", label: "Capacidad y RAID del repositorio", type: "text", placeholder: "Ej: 4x8TB RAID 5, 24 TB útiles", dep: { field: "repo_dedicado", value: "Sí" }, group: "Repositorio de copias" },
      { id: "repo_parcheo", label: "Sistema / firmware del repositorio", type: "select", options: ["Al día", "Parches pendientes", "Muy desactualizado", "No revisado"], dep: { field: "repo_dedicado", value: "Sí" }, group: "Repositorio de copias" },
      { id: "repo_expuesto", label: "¿El repositorio está publicado a internet?", type: "select", options: ["No, solo LAN", "Sí, únicamente por VPN", "Sí, publicado directamente", "No revisado"], dep: { field: "repo_dedicado", value: "Sí" }, group: "Repositorio de copias" },
      { id: "repo_mfa", label: "¿MFA en el acceso al repositorio?", type: "radio", options: ["Sí", "No", "No revisado"], dep: { field: "repo_dedicado", value: "Sí" }, group: "Repositorio de copias" },
      { id: "repo_accesos_heredados", label: "Accesos del proveedor anterior al repositorio", type: "radio", options: ["Revocados", "Pendiente de revocar", "No existían", "No revisado"], dep: { field: "repo_dedicado", value: "Sí" }, group: "Repositorio de copias" },
      { id: "repo_seguridad", label: "Seguridad aplicada en el repositorio", type: "checks", options: ["Cifrado de datos en reposo", "Snapshots inmutables / bloqueo de borrado", "VLAN o red dedicada para backup", "Antivirus del NAS activo", "Papelera / retención de borrados", "Registro de accesos activo"], dep: { field: "repo_dedicado", value: "Sí" }, group: "Repositorio de copias" },

      { id: "notas", label: "Notas adicionales", type: "textarea", group: "Notas" },
    ]
  },
  {
    id: "email", label: "Correo Electrónico", icon: "📧",
    question: "¿Dispone de correo corporativo?",
    multi: true, multiLabel: "Cuenta de correo",
    fields: [
      // -- Proveedor y dominio --
      { id: "proveedor", label: "Proveedor", type: "select", options: ["Microsoft 365", "Google Workspace", "Exchange On-Premise", "Hosting externo", "Otro"], group: "Proveedor y dominio" },
      { id: "dominio", label: "Dominio de correo", type: "text", placeholder: "Ej: empresa.com", group: "Proveedor y dominio" },
      { id: "tenant_nombre", label: "Nombre del tenant", type: "text", placeholder: "Ej: empresa.onmicrosoft.com", dep: { field: "proveedor", value: "Microsoft 365" }, group: "Proveedor y dominio" },
      { id: "buzones", label: "Número de buzones", type: "number", group: "Proveedor y dominio" },
      { id: "plan", label: "Plan / Licencias", type: "text", placeholder: "Ej: M365 Business Basic", group: "Proveedor y dominio" },
      { id: "plan_m365", label: "Plan de Microsoft 365", type: "select", options: ["Business Basic", "Business Standard", "Business Premium", "Microsoft 365 E3", "Microsoft 365 E5", "Office 365 E1", "Office 365 E3", "Exchange Online Plan 1", "Exchange Online Plan 2", "Mixto / varios planes", "No revisado"], dep: { field: "proveedor", value: "Microsoft 365" }, group: "Proveedor y dominio" },

      // -- Usuarios y administradores --
      { id: "admins_revisados", label: "Administradores del tenant revisados", type: "select", options: ["Revisado, correcto", "Revisado, con hallazgos", "Pendiente de revisar", "No aplica"], group: "Usuarios y administradores" },
      { id: "admins_heredados", label: "Accesos de administrador del proveedor anterior", type: "radio", options: ["Revocados", "Pendiente de revocar", "No existían", "No revisado"], group: "Usuarios y administradores" },
      { id: "usuarios_inactivos", label: "Usuarios inactivos revisados", type: "select", options: ["Revisado, correcto", "Revisado, con hallazgos", "Pendiente de revisar", "No aplica"], group: "Usuarios y administradores" },
      { id: "licencias_revisadas", label: "Licencias asignadas revisadas", type: "select", options: ["Revisado, correcto", "Revisado, con hallazgos", "Pendiente de revisar", "No aplica"], group: "Usuarios y administradores" },

      // -- Seguridad de acceso --
      { id: "mfa", label: "¿MFA activado?", type: "radio", options: ["Sí", "No", "Parcialmente"], group: "Seguridad de acceso" },
      { id: "mfa_admins", label: "¿MFA en las cuentas de administrador?", type: "radio", options: ["Sí", "No", "No revisado"], group: "Seguridad de acceso" },
      { id: "conditional_access", label: "Acceso condicional", type: "select", options: ["Configurado", "Solo valores predeterminados de seguridad", "Sin políticas", "No revisado"], dep: { field: "proveedor", value: "Microsoft 365" }, group: "Seguridad de acceso" },
      { id: "antispam", label: "¿Solución antispam/antiphishing?", type: "radio", options: ["Sí", "No"], group: "Seguridad de acceso" },
      { id: "antispam_cual", label: "¿Cuál?", type: "text", dep: { field: "antispam", value: "Sí" }, group: "Seguridad de acceso" },

      // -- Registros DNS del dominio --
      { id: "spf", label: "SPF", type: "select", options: ["Correcto", "Existe pero incompleto o erróneo", "No existe", "No revisado"], group: "Registros DNS del dominio" },
      { id: "dkim", label: "DKIM", type: "select", options: ["Configurado y firmando", "Configurado pero inactivo", "No existe", "No revisado"], group: "Registros DNS del dominio" },
      { id: "dmarc", label: "DMARC", type: "select", options: ["p=reject", "p=quarantine", "p=none (solo monitorización)", "No existe", "No revisado"], group: "Registros DNS del dominio" },

      // -- Backup y comparticion --
      { id: "backup_correo", label: "¿Backup del correo activo?", type: "radio", options: ["Sí", "No", "No revisado"], group: "Backup y compartición" },
      { id: "backup_correo_solucion", label: "Solución de backup del correo", type: "text", placeholder: "Ej: Acronis, Veeam para M365...", dep: { field: "backup_correo", value: "Sí" }, group: "Backup y compartición" },
      { id: "archivado", label: "¿Archivado de correo?", type: "radio", options: ["Sí", "No"], group: "Backup y compartición" },
      { id: "comparticion_externa", label: "Compartición externa en OneDrive / SharePoint", type: "select", options: ["Bloqueada (solo usuarios internos)", "Permitida solo con usuarios autenticados", "Enlaces anónimos permitidos", "No revisado"], group: "Backup y compartición" },

      { id: "notas", label: "Notas adicionales", type: "textarea", group: "Notas" },
    ]
  },
  {
    id: "antivirus", label: "Antivirus / Seguridad Endpoint", icon: "🛡️",
    question: "¿Dispone de solución antivirus/EDR?",
    multi: true, multiLabel: "Solución antivirus",
    fields: [
      // -- Solucion y licenciamiento --
      { id: "solucion", label: "Solución actual", type: "text", placeholder: "Ej: Trend Micro, Sophos, Defender…", group: "Solución y licenciamiento" },
      { id: "tipo", label: "Tipo de solución", type: "select", options: ["Antivirus básico", "EDR", "XDR", "MDR gestionado", "No sabe"], group: "Solución y licenciamiento" },
      { id: "licencias", label: "Número de licencias", type: "number", group: "Solución y licenciamiento" },
      { id: "vencimiento", label: "Fecha de vencimiento", type: "text", placeholder: "Ej: 12/2025", group: "Solución y licenciamiento" },
      { id: "licencias_estado", label: "Estado de la licencia", type: "select", options: ["Vigente", "Caducada", "En periodo de prueba", "No revisado"], group: "Solución y licenciamiento" },

      // -- Cobertura --
      { id: "cobertura", label: "Cobertura del parque", type: "select", options: ["Todos los equipos", "La mayoría, con excepciones", "Solo algunos equipos", "No revisado"], group: "Cobertura" },
      { id: "servidores_av", label: "¿Cubre también servidores?", type: "radio", options: ["Sí", "No"], group: "Cobertura" },
      { id: "funciones", label: "Funciones activas", type: "checks", options: ["Antimalware", "Anti-ransomware", "Firewall del endpoint", "Control de dispositivos USB", "Filtrado web", "Control de aplicaciones", "DLP"], group: "Cobertura" },

      // -- Consola y gestion --
      { id: "consola", label: "¿Consola de gestión centralizada?", type: "radio", options: ["Sí", "No"], group: "Consola y gestión" },
      { id: "consola_url", label: "URL de la consola", type: "text", dep: { field: "consola", value: "Sí" }, group: "Consola y gestión" },
      { id: "consola_acceso", label: "¿Quién controla la consola?", type: "select", options: ["El cliente", "El proveedor anterior", "Ambos", "Nadie / credenciales perdidas", "No revisado"], group: "Consola y gestión" },
      { id: "alertas_monitorizadas", label: "¿Quién vigila las alertas?", type: "select", options: ["Proveedor / SOC (MDR)", "El cliente", "Nadie", "No revisado"], group: "Consola y gestión" },

      { id: "notas", label: "Notas adicionales", type: "textarea", group: "Notas" },
    ]
  },
  {
    id: "wifi", label: "WiFi", icon: "📶",
    question: "¿Dispone de red WiFi?",
    multi: true, multiLabel: "Red WiFi",
    fields: [
      // -- Redes y cifrado --
      { id: "ssids", label: "SSIDs / Redes WiFi", type: "text", placeholder: "Ej: CORP_WIFI, GUEST_WIFI", group: "Redes y cifrado" },
      { id: "cifrado", label: "Cifrado de la red principal", type: "select", options: ["WPA3", "WPA2-Enterprise (802.1X)", "WPA2-PSK", "WPA/WPA2 mixto", "WEP", "Abierta (sin contraseña)", "No revisado"], group: "Redes y cifrado" },
      { id: "invitados", label: "¿Red de invitados separada?", type: "radio", options: ["Sí", "No"], group: "Redes y cifrado" },
      { id: "invitados_aislado", label: "Aislamiento de la red de invitados", type: "select", options: ["VLAN aislada, sin acceso a la LAN", "Separada solo por SSID, misma red", "Con acceso a la LAN", "No hay red de invitados", "No revisado"], group: "Redes y cifrado" },
      { id: "password_heredada", label: "Contraseñas WiFi heredadas del proveedor anterior", type: "radio", options: ["Cambiadas", "Pendiente de cambiar", "No aplica", "No revisado"], group: "Redes y cifrado" },

      // -- Infraestructura --
      { id: "controlador", label: "¿Controlador WiFi centralizado?", type: "select", options: ["Sí (cloud)", "Sí (local)", "No, APs autónomos"], group: "Infraestructura" },
      { id: "marca", label: "Marca de APs", type: "text", placeholder: "Ej: Ubiquiti, Meraki, TP-Link…", group: "Infraestructura" },
      { id: "cantidad", label: "Número de APs", type: "number", group: "Infraestructura" },
      { id: "aps_soporte", label: "¿Los APs están en soporte?", type: "select", options: ["En soporte", "Fuera de soporte (EOL)", "No revisado"], group: "Infraestructura" },
      { id: "cobertura", label: "¿Cobertura suficiente?", type: "radio", options: ["Sí", "No", "Parcial"], group: "Infraestructura" },
      { id: "accesos_heredados", label: "Accesos del proveedor anterior a la controladora", type: "radio", options: ["Revocados", "Pendiente de revocar", "No existían", "No revisado"], group: "Infraestructura" },

      { id: "notas", label: "Notas adicionales", type: "textarea", group: "Notas" },
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
    // Esta seccion era "SAI / UPS". Se amplia al armario de comunicaciones
    // completo (rack, sala, cableado, alimentacion y SAI) conservando el id
    // "sai" y los ids de sus 7 campos originales, para no perder lo ya
    // documentado. La pregunta se amplia para que un "si" antiguo siga siendo
    // valido.
    id: "sai", label: "Armario de telecomunicaciones", icon: "🧰",
    question: "¿Dispone de armario de comunicaciones, rack o SAI?",
    multi: true, multiLabel: "Armario",
    fields: [
      // ── Armario / Rack ───────────────────────────────────────────────────
      { id: "rack_tipo", label: "Tipo de armario", type: "select", options: ["Rack de pie 19\"", "Rack mural", "Semi-rack", "Sin armario (equipos sueltos)", "No revisado"], group: "Armario / Rack" },
      { id: "rack_us", label: "Tamaño del rack (U)", type: "text", placeholder: "Ej: 42U", group: "Armario / Rack" },
      { id: "rack_ocupacion", label: "U ocupadas / libres", type: "text", placeholder: "Ej: 18 ocupadas / 24 libres", group: "Armario / Rack" },
      { id: "rack_estado", label: "Estado del armario (puertas, bandejas, montaje)", type: "select", options: ["Bueno", "Aceptable", "Deficiente", "No revisado"], group: "Armario / Rack" },
      { id: "rack_cerrado", label: "¿Armario cerrado con llave?", type: "radio", options: ["Con llave", "Sin llave", "Abierto / sin puertas", "No revisado"], group: "Armario / Rack" },

      // ── Sala y climatización ─────────────────────────────────────────────
      { id: "sala_ubicacion", label: "Ubicación de la sala / armario", type: "text", placeholder: "Ej: Planta 1, junto a recepción", group: "Sala y climatización" },
      { id: "sala_tipo", label: "Tipo de espacio", type: "select", options: ["Sala técnica dedicada", "Despacho u oficina", "Almacén", "Zona de paso", "Otro"], group: "Sala y climatización" },
      { id: "ventilacion", label: "Ventilación / climatización", type: "select", options: ["Aire acondicionado dedicado", "AA de la oficina", "Ventiladores en el rack", "Ventilación natural", "Ninguna", "No revisado"], group: "Sala y climatización" },
      { id: "acceso_restringido", label: "¿Acceso físico restringido?", type: "radio", options: ["Sí", "No", "No revisado"], group: "Sala y climatización" },

      // ── Cableado ─────────────────────────────────────────────────────────
      { id: "cableado_estado", label: "Estado del cableado estructurado", type: "select", options: ["Bueno y documentado", "Bueno, sin documentación", "Con puntos problemáticos", "Deficiente", "No revisado"], group: "Cableado" },
      { id: "cableado_categoria", label: "Categoría del cableado", type: "select", options: ["Cat 5e", "Cat 6", "Cat 6A", "Cat 7", "Mixto cobre", "Fibra + cobre", "No revisado"], group: "Cableado" },
      { id: "patch_panel", label: "¿Dispone de patch panel?", type: "radio", options: ["Sí, etiquetado", "Sí, sin etiquetar", "No hay", "No revisado"], group: "Cableado" },
      { id: "tomas_red", label: "Nº de tomas de red / puntos", type: "text", placeholder: "Ej: 24 tomas, 18 en uso", group: "Cableado" },
      { id: "etiquetado", label: "¿Cableado y equipos etiquetados?", type: "radio", options: ["Sí", "Parcial", "No", "No revisado"], group: "Cableado" },

      // ── Alimentación eléctrica ───────────────────────────────────────────
      { id: "pdu_tipo", label: "Distribución eléctrica", type: "select", options: ["PDU de rack", "Regletas schuko", "PDU + regletas schuko", "Ninguna", "No revisado"], group: "Alimentación eléctrica" },
      { id: "pdu_gestionable", label: "¿PDU gestionable / monitorizable?", type: "radio", options: ["Sí", "No", "No aplica"], group: "Alimentación eléctrica" },
      { id: "circuito_dedicado", label: "¿Circuito eléctrico dedicado para el rack?", type: "radio", options: ["Dedicado", "Compartido", "No revisado"], group: "Alimentación eléctrica" },
      { id: "tomas_electricas", label: "Tomas eléctricas libres", type: "text", placeholder: "Ej: 8 tomas, 2 libres", group: "Alimentación eléctrica" },

      // ── SAI / UPS (campos historicos, ids intocables) ────────────────────
      { id: "sai_existe", label: "¿Dispone de SAI/UPS?", type: "radio", options: ["Sí", "No", "No revisado"], group: "SAI / UPS" },
      { id: "marca", label: "Marca / Modelo del SAI", type: "text", placeholder: "Ej: APC, Eaton…", group: "SAI / UPS" },
      { id: "sai_serial", label: "Nº de serie del SAI", type: "text", group: "SAI / UPS" },
      { id: "cantidad", label: "Número de SAIs", type: "number", group: "SAI / UPS" },
      { id: "protegidos", label: "Equipos protegidos", type: "checks", options: ["Servidores", "Switches core", "Router/Firewall", "PCs críticos", "NAS/Almacenamiento"], group: "SAI / UPS" },
      { id: "autonomia", label: "Autonomía estimada", type: "text", placeholder: "Ej: 15 min", group: "SAI / UPS" },
      { id: "sai_garantia", label: "Garantía del SAI hasta", type: "text", group: "SAI / UPS" },
      { id: "baterias", label: "¿Baterías revisadas recientemente?", type: "radio", options: ["Sí", "No", "No se sabe"], group: "SAI / UPS" },
      { id: "sai_firmware", label: "Firmware del SAI", type: "select", options: ["Al día", "Parches pendientes", "Muy desactualizado", "No revisado"], group: "SAI / UPS" },
      { id: "sai_gestion", label: "Acceso remoto / gestión del SAI", type: "select", options: ["Tarjeta de red SNMP", "USB / serie a servidor", "Sin acceso remoto", "No revisado"], group: "SAI / UPS" },
      { id: "monitorizado", label: "¿SAI monitorizado (SNMP/software)?", type: "radio", options: ["Sí", "No"], group: "SAI / UPS" },
      { id: "sai_apagado", label: "¿Apagado ordenado configurado?", type: "radio", options: ["Sí", "No", "No revisado"], group: "SAI / UPS" },

      { id: "notas", label: "Notas adicionales", type: "textarea", group: "Notas" },
    ]
  },
  {
    id: "almacenamiento", label: "Almacenamiento de información", icon: "🗄️",
    question: "¿Cómo almacena el cliente su información y archivos?",
    multi: true, multiLabel: "Sistema de almacenamiento",
    fields: [
      { id: "tipo", label: "Tipo de almacenamiento", type: "select", options: ["NAS local", "NAS Enterprise", "SAN", "DAS", "Servidor de ficheros", "SharePoint / OneDrive", "Google Drive", "Dropbox", "S3 / Azure Blob", "Mixto", "Otro"] },
      { id: "proveedor", label: "Proveedor / Plataforma", type: "text", placeholder: "Ej: Microsoft, Google, Synology..." },
      { id: "marca_modelo", label: "Marca / Modelo", type: "text", placeholder: "Ej: Synology DS1621+, Dell PowerVault..." },
      { id: "capacidad", label: "Capacidad total", type: "text", placeholder: "Ej: 2 TB, 1 TB OneDrive..." },
      { id: "tipo_discos", label: "Tipo de discos", type: "select", options: ["SSD", "HDD", "SAS", "Mixto", "N/A"] },
      { id: "protocolo", label: "Protocolo de acceso", type: "select", options: ["iSCSI", "Fibre Channel", "NFS", "SMB/CIFS", "Otro", "N/A"] },
      { id: "raid", label: "Configuración RAID", type: "text", placeholder: "Ej: RAID 5, RAID 10..." },
      { id: "conexion_hosts", label: "Conexión a hosts/servidores", type: "text", placeholder: "Ej: 2x 10GbE a ESXi01 y ESXi02" },
      { id: "ubicacion", label: "Ubicación", type: "select", options: ["On-premise", "Cloud", "Híbrido"] },
      { id: "acceso_remoto", label: "¿Acceso remoto a los archivos?", type: "radio", options: ["Sí", "No"] },
      { id: "sincronizacion", label: "¿Sincronización en equipos locales?", type: "radio", options: ["Sí", "No"] },
      { id: "permisos", label: "¿Gestión de permisos/carpetas?", type: "radio", options: ["Sí", "No", "Básica"] },
      // Evita inventariar dos veces el mismo NAS: si este equipo es ademas el
      // destino de las copias, se documenta en la seccion Backup.
      { id: "es_destino_backup", label: "¿Es también el destino de las copias de seguridad?", type: "radio", options: ["Sí", "No", "No revisado"] },
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
      { id: "centralita_acceso", label: "Acceso de administración a la centralita", type: "select", options: ["Sí, credenciales en poder del cliente o ALANA", "Sí, pero las tiene el proveedor anterior", "No hay acceso", "No revisado"] },
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
      { id: "contrato_vencimiento", label: "Vencimiento del contrato de mantenimiento", type: "text", dep: { field: "gestion", value: "Sí" } },
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
      { id: "soporte_contacto", label: "Contacto de soporte del fabricante", type: "text", placeholder: "Ej: soporte@proveedor.com / 900 123 456" },
      { id: "notas", label: "Notas", type: "textarea" },
    ]
  },
  {
    id: "licenciamiento", label: "Licenciamiento y contratos", icon: "📋",
    question: "¿Dispone de licencias o contratos de mantenimiento?",
    multi: true, multiLabel: "Licencia / Contrato",
    fields: [
      // -- Servicio contratado --
      // "Conectividad / linea" se omite a proposito: la conexion del ISP ya se
      // documenta en la seccion "Internet y Red" y duplicarla aqui invita a que
      // el mismo contrato quede registrado dos veces con datos distintos.
      { id: "tipo_servicio", label: "Tipo de servicio", type: "select", options: ["Licencia de software", "Contrato de mantenimiento", "Dominio", "Hosting web", "Certificado SSL", "Servicio cloud", "Otro"], group: "Servicio contratado" },
      { id: "proveedor", label: "Proveedor / Fabricante", type: "text", placeholder: "Ej: Microsoft, Adobe, Fortinet...", group: "Servicio contratado" },
      { id: "producto", label: "Producto", type: "text", placeholder: "Ej: Microsoft 365 Business Premium", group: "Servicio contratado" },
      { id: "tipo_licencia", label: "Tipo de licencia", type: "select", options: ["Suscripción mensual", "Suscripción anual", "Perpetua", "OEM", "Por volumen", "Freemium", "Otro"], group: "Servicio contratado" },
      { id: "cantidad", label: "Cantidad de licencias", type: "number", group: "Servicio contratado" },
      { id: "partner", label: "Partner / Distribuidor", type: "text", group: "Servicio contratado" },
      { id: "contrato", label: "Contrato asociado", type: "text", placeholder: "Nº contrato o referencia", group: "Servicio contratado" },

      // -- Titularidad, renovacion y acceso --
      { id: "titularidad", label: "Titularidad", type: "radio", options: ["A nombre del cliente", "A nombre del proveedor anterior", "No revisado"], group: "Titularidad y renovación" },
      { id: "fecha_renovacion", label: "Fecha de renovación", type: "text", placeholder: "Ej: 12/2026", group: "Titularidad y renovación" },
      { id: "renovacion_automatica", label: "¿Renovación automática?", type: "radio", options: ["Sí", "No", "No revisado"], group: "Titularidad y renovación" },
      { id: "coste", label: "Coste", type: "text", placeholder: "Ej: 12,50€/usuario/mes", group: "Titularidad y renovación" },
      { id: "acceso_panel", label: "Acceso al panel de gestión", type: "select", options: ["Sí, credenciales en poder del cliente o ALANA", "Sí, pero las tiene el proveedor anterior", "No hay acceso", "No revisado"], group: "Titularidad y renovación" },

      // -- Detalle segun el tipo de servicio --
      { id: "dominio_dns_gestion", label: "¿Dónde se gestiona el DNS?", type: "select", options: ["En el propio registrador", "Cloudflare u otro DNS externo", "En el hosting web", "Servidor DNS propio", "No revisado"], dep: { field: "tipo_servicio", value: "Dominio" }, group: "Detalle del servicio" },
      { id: "ssl_estado", label: "Estado del certificado", type: "select", options: ["Vigente (más de 60 días)", "Caduca en menos de 60 días", "Caducado", "Autofirmado / no válido", "No revisado"], dep: { field: "tipo_servicio", value: "Certificado SSL" }, group: "Detalle del servicio" },
      { id: "cloud_plataforma", label: "Plataforma cloud", type: "select", options: ["Microsoft Azure", "Amazon AWS", "Google Cloud", "Dropbox", "Jotelulu", "Otro"], dep: { field: "tipo_servicio", value: "Servicio cloud" }, group: "Detalle del servicio" },
      { id: "cloud_mfa", label: "¿MFA en el acceso cloud?", type: "radio", options: ["Sí", "No", "Parcialmente", "No revisado"], dep: { field: "tipo_servicio", value: "Servicio cloud" }, group: "Detalle del servicio" },
      { id: "cloud_cuentas_heredadas", label: "Cuentas del proveedor anterior en el cloud", type: "radio", options: ["Revocados", "Pendiente de revocar", "No existían", "No revisado"], dep: { field: "tipo_servicio", value: "Servicio cloud" }, group: "Detalle del servicio" },

      { id: "notas", label: "Notas", type: "textarea", group: "Notas" },
    ]
  },
  {
    id: "otros_dispositivos", label: "Otros dispositivos / Periféricos", icon: "🔌",
    question: "¿Dispone de otros dispositivos o periféricos especiales?",
    multi: true, multiLabel: "Dispositivo",
    fields: [
      { id: "tipo", label: "Tipo de dispositivo", type: "select", options: ["Lector de tarjetas", "Terminal de firma", "PDA / Terminal móvil", "Escáner de códigos", "TPV", "Cámara de seguridad", "Control de acceso", "Control de presencia", "Sensor IoT", "Otro"] },
      { id: "marca", label: "Marca / Modelo", type: "text" },
      { id: "cantidad", label: "Cantidad", type: "number" },
      { id: "ubicacion", label: "Ubicación", type: "text", placeholder: "Ej: Recepción, Almacén..." },
      { id: "conectividad", label: "Conectividad", type: "checks", options: ["USB", "Red Ethernet", "WiFi", "Bluetooth", "Serie/RS232", "Otro"] },
      { id: "software", label: "Software asociado", type: "text", placeholder: "Ej: app de gestión, driver especial..." },
      { id: "notas", label: "Notas", type: "textarea" },
    ]
  },
];
