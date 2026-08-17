// ─────────────────────────────────────────────────────────────────────────
// Catalogo de buenas practicas que la aplicacion muestra al tecnico mientras
// rellena el onboarding.
//
// AVISO: los `id` de hint son CLAVES DE DATOS. El estado que marca el tecnico
// se guarda en form_data.__hints__["id_del_hint@0"], asi que renombrar un id
// existente pierde lo ya marcado. Solo se anaden hints nuevos.
// scripts/check-ids.mjs verifica este contrato en cada build.
//
// tipo:   seguridad | legado | comercial | doc   (ver TIPOS_HINT abajo)
// anchor: id de campo bajo el que se pinta el aviso; sin anchor va al final
// when:   { field, value } o { field, valueIn: [...] }; sin when, siempre visible
// ─────────────────────────────────────────────────────────────────────────

export const HINTS = {
  red: [
    {
      id: "red_firewall_seguridad",
      tipo: "seguridad",
      anchor: "firewall",
      when: { field: "firewall", value: "Sí" },
      texto: "Cambia las credenciales de administración del firewall y revoca los usuarios de otros proveedores. Deshabilita la gestión web desde internet (WAN) si no es imprescindible.",
    },
    {
      id: "red_gral_seguridad",
      tipo: "seguridad",
      texto: "Revoca TODOS los accesos remotos heredados (TeamViewer/AnyDesk, VPNs, cuentas cloud del proveedor anterior). Deja únicamente accesos autorizados con credenciales nuevas gestionadas por Alana IT.",
    },
    {
      id: "red_accesos_heredados_seguridad",
      tipo: "seguridad",
      anchor: "accesos_heredados",
      when: { field: "accesos_heredados", valueIn: ["Pendiente de revocar", "No revisado"] },
      texto: "Riesgo de seguridad: recuerda eliminar contraseñas de gestión anteriores y revocar VPNs o accesos remotos heredados antes de cerrar el onboarding.",
    },
    {
      id: "red_utm_comercial",
      tipo: "comercial",
      anchor: "utm",
      when: { field: "utm", value: "No" },
      texto: "Sin UTM / filtrado web / IDS: oportunidad comercial. Ofrecer EasySecure o solución equivalente (que lo valore el técnico).",
    },
    {
      id: "red_linea_backup_comercial",
      tipo: "comercial",
      anchor: "linea_backup",
      when: { field: "linea_backup", value: "No" },
      texto: "Sin redundancia de internet: oportunidad de venta. Recomendar línea de backup/failover (4G/5G o segunda fibra).",
    },
    {
      id: "red_rdp_expuesto_seguridad",
      tipo: "seguridad",
      anchor: "rdp_expuesto",
      when: { field: "rdp_expuesto", value: "Sí" },
      texto: "RDP u otros puertos de riesgo expuestos a internet: cerrarlos o publicarlos solo tras VPN. Eliminar o documentar las reglas NAT heredadas sin propietario conocido.",
    },
    {
      id: "red_firewall_soporte_comercial",
      tipo: "comercial",
      anchor: "firewall_soporte",
      when: { field: "firewall_soporte", value: "Fuera de soporte (EOL)" },
      texto: "Firewall fuera de soporte o EOL: recomendar sustitución del equipo o contratación de soporte del fabricante.",
    },
    {
      id: "red_vpns_auditadas_seguridad",
      tipo: "seguridad",
      anchor: "vpns_auditadas",
      when: { field: "vpns_auditadas", value: "Pendiente de auditar" },
      texto: "Identifica los usuarios VPN activos (site-to-site y acceso remoto) y elimina las cuentas del proveedor anterior. Detalla el inventario en la sección VPN de la app.",
    },
    {
      id: "red_ip_publica_tipo_doc",
      tipo: "doc",
      anchor: "ip_publica_tipo",
      when: { field: "ip_publica_tipo", value: "Dinámica" },
      texto: "IP dinámica: si hay acceso remoto, verifica si tienen DDNS y documéntalo (proveedor, hostname, dónde se renueva).",
    },
    {
      id: "red_gral_doc",
      tipo: "doc",
      texto: "Revisa quién ofrece el DHCP y documéntalo en Hudu: rango servido, reservas y exclusiones.",
    },
    {
      id: "red_gral_doc_2",
      tipo: "doc",
      texto: "Mide la velocidad real con speedtest y compárala con la contratada. Documenta las diferencias significativas.",
    },
    {
      id: "red_switches_tipo_comercial",
      tipo: "comercial",
      anchor: "switches_tipo",
      when: { field: "switches_tipo", value: "Todos no gestionados" },
      texto: "Switches no gestionados: recomendar como mejora futura switching gestionado (VLANs, monitorización, seguridad de puerto).",
    },
  ],
  servidores: [
    // ── Fin de soporte por version concreta ─────────────────────────────────
    // Se disparan solos al elegir la version, sin que el tecnico tenga que
    // saberse las fechas de fin de soporte de memoria.
    {
      id: "servidores_so_windows_server_eol",
      tipo: "seguridad",
      anchor: "so_windows_server",
      when: { field: "so_windows_server", valueIn: ["Windows Server 2012 R2", "Windows Server 2012", "Windows Server 2008 R2", "Windows Server 2008", "Anterior a 2008"] },
      texto: "Este Windows Server ya no recibe parches de seguridad. Es el hallazgo más grave que puede tener un servidor: presupuesta la migración, ponlo por escrito al cliente y, mientras tanto, aíslalo de internet.",
    },
    {
      id: "servidores_so_windows_server_doc",
      tipo: "doc",
      anchor: "so_windows_server",
      when: { field: "so_windows_server", value: "Windows Server 2016" },
      texto: "Windows Server 2016 entra en fin de soporte extendido en enero de 2027. Conviene plantear la renovación este año y no esperar al último trimestre.",
    },
    {
      id: "servidores_so_windows_cliente_seguridad",
      tipo: "seguridad",
      anchor: "so_windows_cliente",
      when: { field: "so_windows_cliente", valueIn: ["Windows 10", "Windows 8.1", "Windows 7", "Anterior a Windows 7"] },
      texto: "Un Windows de escritorio sin soporte haciendo de servidor: sin parches y, además, con límite de conexiones simultáneas. Plantea sustituirlo por Windows Server o por un servicio cloud.",
    },
    {
      id: "servidores_so_linux_seguridad",
      tipo: "seguridad",
      anchor: "so_linux",
      when: { field: "so_linux", valueIn: ["CentOS 7 o anterior", "Ubuntu Server (no LTS)"] },
      texto: "Esta distribución ya no recibe actualizaciones de seguridad. CentOS está descontinuado: la migración natural es Rocky Linux o AlmaLinux, que son compatibles binariamente.",
    },
    {
      id: "servidores_gral_seguridad",
      tipo: "seguridad",
      texto: "Cambiar la contraseña del administrador local del servidor y, si es DC, la del administrador del dominio. Registrar las nuevas credenciales en Hudu, nunca en un documento suelto.",
    },
    {
      id: "servidores_gral_doc",
      tipo: "doc",
      texto: "Dar de alta el servidor en Hudu (activo, credenciales, IP, garantía) y desplegar el agente de RMM (NinjaOne) para monitorización y parcheo.",
    },
    {
      id: "servidores_so_soporte_seguridad",
      tipo: "seguridad",
      anchor: "so_soporte",
      when: { field: "so_soporte", value: "Fuera de soporte (EOL)" },
      texto: "S.O. fuera de soporte: no recibe parches de seguridad. Presupuestar migración urgente al cliente y dejar constancia escrita del riesgo aceptado mientras tanto. (Acción marcada como obligatoria en el checklist.)",
    },
    {
      id: "servidores_hw_soporte_comercial",
      tipo: "comercial",
      anchor: "hw_soporte",
      when: { field: "hw_soporte", value: "Fuera de garantía" },
      texto: "Garantía del hardware caducada: ofrecer renovación de soporte del fabricante o plan de sustitución. Sin garantía, un fallo de placa o fuente puede dejar el servidor parado días.",
    },
    {
      id: "servidores_accesos_heredados_legado",
      tipo: "legado",
      anchor: "accesos_heredados",
      when: { field: "accesos_heredados", value: "Pendiente de revocar" },
      texto: "Revocar todos los accesos remotos heredados: cuentas RDP, TeamViewer/AnyDesk/VNC, agentes RMM del proveedor anterior y usuarios de la ILO/iDRAC. Verificar después que ya no conectan.",
    },
    {
      id: "servidores_dominio_cuentas_seguridad",
      tipo: "seguridad",
      anchor: "dominio_cuentas",
      when: { field: "dominio_cuentas", value: "Revisado, con hallazgos" },
      texto: "Deshabilitar (no borrar) las cuentas inactivas y las del proveedor anterior en AD y en los usuarios locales del servidor. Revisar también quién pertenece a Domain Admins y Administradores locales.",
    },
    {
      id: "servidores_gpos_revisadas_legado",
      tipo: "legado",
      anchor: "gpos_revisadas",
      when: { field: "gpos_revisadas", value: "Revisado, con hallazgos" },
      texto: "Documentar las GPOs heredadas del proveedor anterior antes de tocarlas, contrastar con el cliente qué sigue siendo necesario y desvincular las obsoletas.",
    },
    {
      id: "servidores_snapshots_seguridad",
      tipo: "seguridad",
      anchor: "snapshots",
      when: { field: "snapshots", value: "Snapshots antiguos acumulados" },
      texto: "Consolidar y eliminar los snapshots antiguos. Un snapshot olvidado degrada el rendimiento y puede llenar el datastore hasta parar todas las VMs del host.",
    },
    {
      id: "servidores_raid_estado_seguridad",
      tipo: "seguridad",
      anchor: "raid_estado",
      when: { field: "raid_estado", value: "Degradado (disco en fallo)" },
      texto: "RAID degradado: sustituir el disco en fallo de inmediato. Antes de reconstruir, verificar que el backup de este servidor es reciente y restaurable.",
    },
    {
      id: "servidores_firmware_estado_seguridad",
      tipo: "seguridad",
      anchor: "firmware_estado",
      when: { field: "firmware_estado", value: "Parches pendientes" },
      texto: "Planificar ventana de mantenimiento para actualizar BIOS, controladora RAID e ILO/iDRAC. Aplicar el service pack del fabricante (HPE SPP, Dell DSU) en lugar de componentes sueltos.",
    },
    {
      id: "servidores_so_licencia_titular_comercial",
      tipo: "comercial",
      anchor: "so_licencia_titular",
      when: { field: "so_licencia_titular", value: "A nombre del proveedor anterior" },
      texto: "La licencia del S.O. figura a nombre del proveedor saliente: iniciar el traspaso de titularidad al cliente o presupuestar licencia propia antes de cerrar la salida del proveedor.",
    },
    {
      id: "servidores_gral_doc_2",
      tipo: "doc",
      texto: "Repasa en el servidor lo que caduca el mismo día y no se documenta: servicios detenidos, errores recurrentes en el visor de eventos y unidades por encima del 80%. Si algo falla, abre ticket antes de cerrar el alta.",
    },
    {
      id: "servidores_raid_estado_seguridad_2",
      tipo: "seguridad",
      anchor: "raid_estado",
      texto: "Comprueba el estado SMART de los discos en la controladora. Un disco en prefallo con el RAID todavía en óptimo es la avería más barata de prevenir y la más cara de ignorar.",
    },
    {
      id: "servidores_dominio_cuentas_seguridad_2",
      tipo: "seguridad",
      anchor: "dominio_cuentas",
      texto: "Revisa que las políticas de auditoría avanzada estén activadas (inicios de sesión, gestión de cuentas, acceso a objetos) y amplía el tamaño de los registros. Sin ellas no hay forma de investigar un incidente.",
    },
    {
      id: "servidores_so_licencia_titular_comercial_2",
      tipo: "comercial",
      anchor: "so_licencia_titular",
      texto: "Verifica que existan CALs suficientes y a nombre del cliente (de usuario o de dispositivo, y las de RDS si hay Terminal Server). Es el incumplimiento de licencia más habitual y el más caro en una auditoría de Microsoft.",
    },
    {
      id: "servidores_oob_tipo_doc",
      tipo: "doc",
      anchor: "oob_tipo",
      texto: "Recupera y documenta en Hudu las credenciales de la ILO/iDRAC/IPMI, y asígnale una IP de gestión fija. Sin ese acceso no se puede diagnosticar un servidor que no arranca.",
    },
  ],
  pcs: [
    {
      id: "pcs_so_seguridad_eol",
      tipo: "seguridad",
      anchor: "so",
      when: { field: "so", value: "Windows 10" },
      texto: "Windows 10 dejó de recibir actualizaciones de seguridad en octubre de 2025. Un parque entero sin parches es la vía de entrada más probable: plantea el plan de renovación o la ampliación de soporte (ESU).",
    },
    {
      id: "pcs_rmm_agente_seguridad",
      tipo: "seguridad",
      anchor: "rmm_agente",
      when: { field: "rmm_agente", value: "No" },
      texto: "Desplegar el agente RMM (NinjaOne o Acronis) en todos los equipos incluidos en el contrato.",
    },
    {
      id: "pcs_rmm_agente_seguridad_2",
      tipo: "seguridad",
      anchor: "rmm_agente",
      when: { field: "rmm_agente", value: "Sí, parcialmente" },
      texto: "Completar el despliegue del agente RMM en los equipos que todavía no lo tienen.",
    },
    {
      id: "pcs_gral_doc",
      tipo: "doc",
      texto: "Volcar el inventario de equipos al RMM y a la documentación (Hudu) al cerrar el alta; el conteo del formulario es la base del contrato de mantenimiento.",
    },
    {
      id: "pcs_so_soporte_comercial",
      tipo: "comercial",
      anchor: "so_soporte",
      when: { field: "so_soporte", value: "Fuera de soporte (EOL)" },
      texto: "Preparar propuesta de renovación de equipos o de actualización de SO: todo el parque está fuera de soporte.",
    },
    {
      id: "pcs_so_soporte_comercial_2",
      tipo: "comercial",
      anchor: "so_soporte",
      when: { field: "so_soporte", value: "Mixto" },
      texto: "Listar los equipos EOL y presupuestar su actualización o sustitución.",
    },
    {
      id: "pcs_parcheo_gestion_seguridad",
      tipo: "seguridad",
      anchor: "parcheo_gestion",
      when: { field: "parcheo_gestion", value: "Sin gestión" },
      texto: "Programar el parcheo de Windows desde el RMM, con ventana de mantenimiento y reinicios controlados.",
    },
    {
      id: "pcs_parcheo_gestion_seguridad_2",
      tipo: "seguridad",
      anchor: "parcheo_gestion",
      when: { field: "parcheo_gestion", value: "Manual por el usuario" },
      texto: "Retirar el parcheo manual y pasarlo a política centralizada del RMM.",
    },
    {
      id: "pcs_parcheo_terceros_seguridad",
      tipo: "seguridad",
      anchor: "parcheo_terceros",
      when: { field: "parcheo_terceros", value: "Sin gestión" },
      texto: "Activar el parcheo de terceros (Chrome, Adobe, Java, Zoom...) desde el RMM.",
    },
    {
      id: "pcs_accesos_heredados_seguridad",
      tipo: "seguridad",
      anchor: "accesos_heredados",
      when: { field: "accesos_heredados", value: "Pendiente de revocar" },
      texto: "Eliminar las cuentas locales del proveedor anterior y las huérfanas en cada equipo.",
    },
    {
      id: "pcs_admin_local_seguridad",
      tipo: "seguridad",
      anchor: "admin_local",
      when: { field: "admin_local", value: "Todos son administradores" },
      texto: "Retirar el permiso de administrador local a los usuarios y dejar una única cuenta de administrador gestionada por ALANA.",
    },
    {
      id: "pcs_admin_local_password_seguridad",
      tipo: "seguridad",
      anchor: "admin_local_password",
      when: { field: "admin_local_password", value: "La misma en todos los equipos" },
      texto: "Desplegar LAPS o contraseñas únicas por equipo para el administrador local.",
    },
    {
      id: "pcs_dominio_doc",
      tipo: "doc",
      anchor: "dominio",
      when: { field: "dominio", value: "Mixto" },
      texto: "Documentar cada equipo que queda fuera del dominio y el motivo.",
    },
    {
      id: "pcs_cifrado_portatiles_seguridad",
      tipo: "seguridad",
      anchor: "cifrado_portatiles",
      when: { field: "cifrado_portatiles", value: "No activo" },
      texto: "Activar BitLocker en los portátiles y verificar el guardado de la clave de recuperación.",
    },
    {
      id: "pcs_cifrado_claves_seguridad",
      tipo: "seguridad",
      anchor: "cifrado_claves",
      when: { field: "cifrado_claves", value: "En el propio equipo o en papel" },
      texto: "Trasladar las claves de recuperación a AD/Entra ID, Intune o al gestor de contraseñas del MSP.",
    },
    {
      id: "pcs_cifrado_claves_seguridad_2",
      tipo: "seguridad",
      anchor: "cifrado_claves",
      when: { field: "cifrado_claves", value: "No se custodian" },
      texto: "Sin custodia de claves, un disco cifrado es pérdida de datos: implantar el escrow antes de tocar nada.",
    },
    {
      id: "pcs_gral_doc_2",
      tipo: "doc",
      texto: "El detalle de licencias del software crítico va en las secciones 'Aplicaciones / ERP' y 'Licenciamiento y contratos'; aquí solo se inventaría qué está instalado en los puestos.",
    },
    {
      id: "pcs_software_licencias_comercial",
      tipo: "comercial",
      anchor: "software_licencias",
      when: { field: "software_licencias", value: "Hay software sin licencia" },
      texto: "Regularizar las licencias sin cobertura antes de asumir el mantenimiento del parque.",
    },
    {
      id: "pcs_software_licencias_seguridad",
      tipo: "seguridad",
      anchor: "software_licencias",
      texto: "Revisa si queda software fuera de soporte en los equipos (Office 2016 o anterior, navegadores antiguos, Java heredado). Cada uno es una vía de entrada que ya no recibe parches.",
    },
  ],
  backup: [
    {
      id: "backup_gral_seguridad",
      tipo: "seguridad",
      texto: "Restaurar un fichero y, si es viable, una VM completa. Un backup no verificado no es un backup. Anotar fecha y resultado en los campos de verificación.",
    },
    {
      id: "backup_pruebas_seguridad",
      tipo: "seguridad",
      anchor: "pruebas",
      when: { field: "pruebas", value: "Nunca" },
      texto: "Nunca se ha probado una restauración. Tratar como riesgo crítico aunque los jobs salgan en verde: programar prueba trimestral y dejarla en el contrato de servicio.",
    },
    {
      id: "backup_consola_accesos_heredados_seguridad",
      tipo: "seguridad",
      anchor: "consola_accesos_heredados",
      when: { field: "consola_accesos_heredados", value: "Pendiente de revocar" },
      texto: "Cambiar la contraseña de administrador de la consola de backup y eliminar las cuentas del proveedor anterior. Guardar las nuevas credenciales en el gestor de ALANA.",
    },
    {
      id: "backup_gral_seguridad_2",
      tipo: "seguridad",
      texto: "Si la consola lo soporta, activar segundo factor. Un atacante con acceso a la consola puede borrar las copias antes de cifrar.",
    },
    {
      id: "backup_offsite_seguridad",
      tipo: "seguridad",
      anchor: "offsite",
      when: { field: "offsite", value: "No" },
      texto: "Todas las copias están en la misma sede. Un ransomware o un incendio se lleva producción y backup a la vez. Proponer segunda copia cloud (regla 3-2-1).",
    },
    {
      id: "backup_inmutabilidad_seguridad",
      tipo: "seguridad",
      anchor: "inmutabilidad",
      when: { field: "inmutabilidad", value: "No" },
      texto: "Activar object lock / snapshots inmutables en el destino para que las copias no se puedan borrar ni cifrar dentro del periodo de retención.",
    },
    {
      id: "backup_repo_parcheo_seguridad",
      tipo: "seguridad",
      anchor: "repo_parcheo",
      when: { field: "repo_parcheo", value: "Parches pendientes" },
      texto: "Planificar ventana y actualizar DSM/QTS/firmware del NAS. Las vulnerabilidades de NAS son el vector habitual de cifrado del repositorio.",
    },
    {
      id: "backup_repo_accesos_heredados_seguridad",
      tipo: "seguridad",
      anchor: "repo_accesos_heredados",
      when: { field: "repo_accesos_heredados", value: "Pendiente de revocar" },
      texto: "Eliminar las cuentas del proveedor anterior, revisar el grupo administradores del NAS y dejar solo cuentas de ALANA y del cliente. Renombrar o deshabilitar la cuenta admin por defecto.",
    },
    {
      id: "backup_repo_mfa_seguridad",
      tipo: "seguridad",
      anchor: "repo_mfa",
      when: { field: "repo_mfa", value: "No" },
      texto: "Habilitar segundo factor en el acceso al NAS o al portal del repositorio cloud, empezando por las cuentas administradoras.",
    },
    {
      id: "backup_repo_expuesto_seguridad",
      tipo: "seguridad",
      anchor: "repo_expuesto",
      when: { field: "repo_expuesto", value: "Sí, publicado directamente" },
      texto: "Acción prioritaria: retirar la publicación directa del NAS, cerrar el port-forwarding en el firewall y dejar el acceso solo por VPN.",
    },
    {
      id: "backup_gral_doc",
      tipo: "doc",
      texto: "Adjuntar captura del plan de protección o del job (qué incluye, frecuencia y retención) y del último informe de ejecución con las fechas visibles.",
    },
    {
      id: "backup_repo_dedicado_doc",
      tipo: "doc",
      anchor: "repo_dedicado",
      when: { field: "repo_dedicado", value: "Sí" },
      texto: "Adjuntar captura del gestor de almacenamiento del NAS (volumen, RAID, salud de discos y espacio libre) y de la etiqueta con número de serie.",
    },
    {
      id: "backup_backup_alertas_seguridad",
      tipo: "seguridad",
      anchor: "backup_alertas",
      when: { field: "backup_alertas", value: "Se envían pero nadie las revisa" },
      texto: "Redirigir las notificaciones de los jobs al buzón de soporte de ALANA e integrarlas en la monitorización para que un fallo genere ticket.",
    },
    {
      id: "backup_gral_comercial",
      tipo: "comercial",
      texto: "Si el cliente no tiene copias de seguridad, es el riesgo más grave del onboarding: propuesta de EasyBackup antes de cerrar el alta y constancia escrita de que se ha advertido.",
    },
    {
      id: "backup_backup_cobertura_seguridad",
      tipo: "seguridad",
      anchor: "backup_cobertura",
      texto: "Contrasta lo marcado en «¿Qué se copia?» con lo que de verdad es crítico para el negocio. Microsoft 365 y Google Workspace NO hacen backup real: si el correo no está marcado, hay un hueco.",
    },
    {
      id: "backup_destino_seguridad",
      tipo: "seguridad",
      anchor: "destino",
      texto: "Si hay disco externo o cinta, comprueba que alguien rota los soportes de verdad y se los lleva fuera. Un disco que vive enchufado al servidor lo cifra el mismo ransomware.",
    },
  ],
  email: [
    {
      id: "email_proveedor_doc",
      tipo: "doc",
      anchor: "proveedor",
      when: { field: "proveedor", value: "Microsoft 365" },
      texto: "Documentar en Hudu el tenant ID, los dominios verificados y la URL de administración (admin.microsoft.com) antes de cerrar el onboarding.",
    },
    {
      id: "email_plan_m365_comercial",
      tipo: "comercial",
      anchor: "plan_m365",
      when: { field: "plan_m365", value: "Business Basic" },
      texto: "Business Basic no incluye Office de escritorio ni seguridad avanzada. Valorar upgrade a Standard o Premium según el uso real.",
    },
    {
      id: "email_plan_m365_comercial_2",
      tipo: "comercial",
      anchor: "plan_m365",
      when: { field: "plan_m365", value: "Business Standard" },
      texto: "Si manejan datos sensibles, proponer upgrade a Business Premium: incluye Defender for Office, Intune y Acceso Condicional.",
    },
    {
      id: "email_admins_heredados_seguridad",
      tipo: "seguridad",
      anchor: "admins_heredados",
      when: { field: "admins_heredados", value: "Pendiente de revocar" },
      texto: "Revocar los accesos de administrador del proveedor anterior, eliminar sus cuentas de servicio y cerrar sus sesiones activas.",
    },
    {
      id: "email_admins_revisados_seguridad",
      tipo: "seguridad",
      anchor: "admins_revisados",
      when: { field: "admins_revisados", value: "Revisado, con hallazgos" },
      texto: "Reducir el número de Administradores Globales al mínimo (2-4) y pasar el resto a roles delegados.",
    },
    {
      id: "email_proveedor_doc_2",
      tipo: "doc",
      anchor: "proveedor",
      when: { field: "proveedor", value: "Microsoft 365" },
      texto: "Crear la cuenta técnica de Alana IT con rol Administrador Global y MFA, y guardarla en el gestor de contraseñas del cliente.",
    },
    {
      id: "email_mfa_seguridad",
      tipo: "seguridad",
      anchor: "mfa",
      when: { field: "mfa", value: "No" },
      texto: "Activar MFA para todos los usuarios del tenant. Empezar por administradores y dirección; es el control de seguridad más básico.",
    },
    {
      id: "email_mfa_seguridad_2",
      tipo: "seguridad",
      anchor: "mfa",
      when: { field: "mfa", value: "Parcialmente" },
      texto: "Completar el despliegue de MFA en los usuarios que aún no lo tienen y fijar fecha de corte para el registro.",
    },
    {
      id: "email_licencias_revisadas_comercial",
      tipo: "comercial",
      anchor: "licencias_revisadas",
      when: { field: "licencias_revisadas", value: "Revisado, con hallazgos" },
      texto: "Liberar las licencias sobrantes en la próxima renovación y trasladar el ahorro al cliente como valor del cambio de MSP.",
    },
    {
      id: "email_usuarios_inactivos_seguridad",
      tipo: "seguridad",
      anchor: "usuarios_inactivos",
      when: { field: "usuarios_inactivos", value: "Revisado, con hallazgos" },
      texto: "Deshabilitar (no borrar) los usuarios inactivos, revocar sus sesiones y convertir sus buzones en compartidos para liberar licencia.",
    },
    {
      id: "email_backup_correo_comercial",
      tipo: "comercial",
      anchor: "backup_correo",
      when: { field: "backup_correo", value: "No" },
      texto: "Ofrecer EasyBackup por usuario M365: Microsoft no hace backup granular ni protege frente a borrado malicioso o ransomware.",
    },
    {
      id: "email_conditional_access_seguridad",
      tipo: "seguridad",
      anchor: "conditional_access",
      when: { field: "conditional_access", value: "Sin políticas" },
      texto: "Configurar Acceso Condicional (bloqueo geográfico, dispositivos conformes, MFA obligatorio) o al menos activar los valores predeterminados de seguridad.",
    },
    {
      id: "email_spf_seguridad",
      tipo: "seguridad",
      anchor: "spf",
      when: { field: "spf", value: "No existe" },
      texto: "Publicar el registro SPF del dominio. Sin él cualquiera puede suplantar el correo del cliente.",
    },
    {
      id: "email_spf_seguridad_2",
      tipo: "seguridad",
      anchor: "spf",
      when: { field: "spf", value: "Existe pero incompleto o erróneo" },
      texto: "Corregir el SPF: incluir todos los emisores legítimos y terminar en -all (o ~all mientras se valida).",
    },
    {
      id: "email_dkim_seguridad",
      tipo: "seguridad",
      anchor: "dkim",
      when: { field: "dkim", value: "No existe" },
      texto: "Activar la firma DKIM en el proveedor y publicar los CNAME correspondientes en el DNS del dominio.",
    },
    {
      id: "email_dmarc_seguridad",
      tipo: "seguridad",
      anchor: "dmarc",
      when: { field: "dmarc", value: "No existe" },
      texto: "Publicar DMARC en p=none con dirección rua para empezar a monitorizar, y endurecer después.",
    },
    {
      id: "email_dmarc_seguridad_2",
      tipo: "seguridad",
      anchor: "dmarc",
      when: { field: "dmarc", value: "p=none (solo monitorización)" },
      texto: "Endurecer DMARC a p=quarantine y luego a p=reject una vez validados los informes rua.",
    },
    {
      id: "email_comparticion_externa_seguridad",
      tipo: "seguridad",
      anchor: "comparticion_externa",
      when: { field: "comparticion_externa", value: "Enlaces anónimos permitidos" },
      texto: "Restringir los enlaces de tipo \"cualquier persona con el enlace\" o forzarles caducidad y solo lectura.",
    },
  ],
  antivirus: [
    {
      id: "antivirus_tipo_comercial",
      tipo: "comercial",
      anchor: "tipo",
      when: { field: "tipo", value: "Antivirus básico" },
      texto: "Ofrecer EasySecure EDR o XDR en sustitución del antivirus básico.",
    },
    {
      id: "antivirus_tipo_comercial_2",
      tipo: "comercial",
      anchor: "tipo",
      when: { field: "tipo", value: "No sabe" },
      texto: "Verificar en consola qué producto hay realmente y proponer EasySecure EDR/XDR si no existe EDR.",
    },
    {
      id: "antivirus_licencias_estado_comercial",
      tipo: "comercial",
      anchor: "licencias_estado",
      when: { field: "licencias_estado", value: "Caducada" },
      texto: "Licencia de antivirus caducada: renovar de urgencia o migrar a EasySecure.",
    },
    {
      id: "antivirus_cobertura_seguridad",
      tipo: "seguridad",
      anchor: "cobertura",
      when: { field: "cobertura", value: "Solo algunos equipos" },
      texto: "Instalar y activar la protección en los equipos que están sin cobertura.",
    },
    {
      id: "antivirus_consola_acceso_seguridad",
      tipo: "seguridad",
      anchor: "consola_acceso",
      when: { field: "consola_acceso", value: "El proveedor anterior" },
      texto: "Revocar el acceso del proveedor anterior a la consola de antivirus y crear credenciales propias del cliente.",
    },
    {
      id: "antivirus_consola_acceso_seguridad_2",
      tipo: "seguridad",
      anchor: "consola_acceso",
      when: { field: "consola_acceso", value: "Ambos" },
      texto: "Revocar el acceso residual del proveedor anterior a la consola de antivirus.",
    },
    {
      id: "antivirus_consola_acceso_seguridad_3",
      tipo: "seguridad",
      anchor: "consola_acceso",
      when: { field: "consola_acceso", value: "Nadie / credenciales perdidas" },
      texto: "Recuperar las credenciales de la consola con el fabricante o plantear migración limpia de solución.",
    },
    {
      id: "antivirus_consola_seguridad",
      tipo: "seguridad",
      anchor: "consola",
      texto: "Entra en la consola y comprueba si hay detecciones sin resolver o equipos con la protección desactivada. Resuélvelo durante la visita: es lo primero que se mira si hay un incidente después.",
    },
  ],
  wifi: [
    {
      id: "wifi_password_heredada_seguridad",
      tipo: "seguridad",
      anchor: "password_heredada",
      when: { field: "password_heredada", value: "Pendiente de cambiar" },
      texto: "La clave WiFi la conoce el proveedor saliente (y probablemente medio edificio). Cambiarla y repartirla solo por el canal acordado con el cliente.",
    },
    {
      id: "wifi_cifrado_seguridad",
      tipo: "seguridad",
      anchor: "cifrado",
      when: { field: "cifrado", value: "WEP" },
      texto: "WEP se rompe en minutos. Planificar la migración a WPA2-PSK como mínimo, o sustituir los APs si no lo soportan.",
    },
    {
      id: "wifi_cifrado_seguridad_2",
      tipo: "seguridad",
      anchor: "cifrado",
      when: { field: "cifrado", value: "Abierta (sin contraseña)" },
      texto: "Red WiFi sin cifrado. Si es la red de invitados, dejarla al menos con WPA2 y aislada; si es la corporativa, es un hallazgo crítico.",
    },
    {
      id: "wifi_invitados_aislado_seguridad",
      tipo: "seguridad",
      anchor: "invitados_aislado",
      when: { field: "invitados_aislado", value: "Con acceso a la LAN" },
      texto: "Los invitados alcanzan la red interna. Moverlos a una VLAN sin ruta hacia servidores ni PCs, dejando solo salida a internet.",
    },
    {
      id: "wifi_accesos_heredados_seguridad",
      tipo: "seguridad",
      anchor: "accesos_heredados",
      when: { field: "accesos_heredados", value: "Pendiente de revocar" },
      texto: "Quitar la cuenta cloud o local del MSP saliente del controlador (UniFi, Meraki, Omada...) y verificar que no quedan APs adoptados en su cuenta.",
    },
    {
      id: "wifi_aps_soporte_comercial",
      tipo: "comercial",
      anchor: "aps_soporte",
      when: { field: "aps_soporte", value: "Fuera de soporte (EOL)" },
      texto: "APs sin firmware ni parches del fabricante. Preparar propuesta de renovación con el cliente.",
    },
  ],
  sai: [
    {
      id: "sai_cableado_estado_doc",
      tipo: "doc",
      anchor: "cableado_estado",
      texto: "Si el cableado tiene puntos problemáticos, anótalos en Notas y fotografía el armario. Es la información que nadie recuerda seis meses después y la que más tiempo ahorra en una incidencia.",
    },
    {
      id: "sai_gral_doc",
      tipo: "doc",
      texto: "Fotografía el armario abierto, el frontal del rack y la sala. Súbelo a las capturas de esta sección: vale más que cualquier descripción escrita del montaje.",
    },
  ],
  almacenamiento: [
    {
      id: "almacenamiento_es_destino_backup_doc",
      tipo: "doc",
      anchor: "es_destino_backup",
      when: { field: "es_destino_backup", value: "Sí" },
      texto: "Este NAS ya está inventariado en Almacenamiento. No repetir marca, modelo y RAID: en la sección Backup rellenar solo lo específico del repositorio (garantía, firmware, accesos, MFA, seguridad).",
    },
  ],
  telefonia: [
    {
      id: "telefonia_centralita_acceso_legado",
      tipo: "legado",
      anchor: "centralita_acceso",
      when: { field: "centralita_acceso", value: "Sí, pero las tiene el proveedor anterior" },
      texto: "Sin acceso a la centralita no se pueden gestionar desvíos, buzones ni bloquear destinos internacionales (fraude telefónico). Reclamar credenciales de administrador por escrito.",
    },
  ],
  impresion: [
    {
      id: "impresion_gral_seguridad",
      tipo: "seguridad",
      texto: "Cambia la contraseña por defecto del panel web de las impresoras de red. Vienen con la del fabricante, están en la LAN y suelen guardar la cuenta del escaneo a carpeta.",
    },
  ],
  erp: [
    {
      id: "erp_gral_legado",
      tipo: "legado",
      texto: "Averigua cómo entra el proveedor del ERP al sistema. Si tiene un escritorio remoto permanente instalado, sustitúyelo por acceso bajo demanda y documenta el método.",
    },
  ],
  licenciamiento: [
    {
      id: "licenciamiento_titularidad_legado",
      tipo: "legado",
      anchor: "titularidad",
      when: { field: "titularidad", value: "A nombre del proveedor anterior" },
      texto: "El dominio figura a nombre del proveedor anterior. Solicitar el código de autorización (AuthCode/EPP) y traspasar la titularidad al cliente ANTES de cerrar la migración; sin esto, el cliente no controla ni su web ni su correo.",
    },
    {
      id: "licenciamiento_renovacion_automatica_comercial",
      tipo: "comercial",
      anchor: "renovacion_automatica",
      when: { field: "renovacion_automatica", value: "No" },
      texto: "Activar la renovación automática o registrar la fecha en el calendario de renovaciones de ALANA. Un dominio o un SSL caducado tumba la web y el correo el mismo día.",
    },
    {
      id: "licenciamiento_acceso_panel_seguridad",
      tipo: "seguridad",
      anchor: "acceso_panel",
      when: { field: "acceso_panel", value: "Sí, pero las tiene el proveedor anterior" },
      texto: "El proveedor anterior conserva acceso al panel. Cambiar la contraseña, activar MFA y eliminar sus usuarios y contactos técnicos.",
    },
    {
      id: "licenciamiento_ssl_estado_seguridad",
      tipo: "seguridad",
      anchor: "ssl_estado",
      when: { field: "ssl_estado", value: "Caduca en menos de 60 días" },
      texto: "Certificado a menos de 60 días de caducar. Planificar la renovación y confirmar en qué equipos hay que reinstalarlo (web, firewall/portal VPN, Exchange, ERP).",
    },
    {
      id: "licenciamiento_ssl_estado_seguridad_2",
      tipo: "seguridad",
      anchor: "ssl_estado",
      when: { field: "ssl_estado", value: "Autofirmado / no válido" },
      texto: "Certificado autofirmado o no válido: los usuarios se acostumbran a aceptar avisos de seguridad. Sustituir por uno emitido por una CA reconocida.",
    },
    {
      id: "licenciamiento_tipo_servicio_seguridad",
      tipo: "seguridad",
      anchor: "tipo_servicio",
      when: { field: "tipo_servicio", value: "Hosting web" },
      texto: "Comprobar versión del CMS, plugins y usuarios administradores de la web. Un WordPress sin actualizar es una de las vías de entrada más frecuentes; dejar por escrito si la web está o no dentro del alcance del contrato con ALANA.",
    },
    {
      id: "licenciamiento_tipo_servicio_doc",
      tipo: "doc",
      anchor: "tipo_servicio",
      when: { field: "tipo_servicio", value: "Dominio" },
      texto: "Antes de migrar correo o web, documentar quién puede editar los registros MX, SPF, DKIM y DMARC y con qué credenciales. Un cambio de MX sin acceso al DNS bloquea la migración.",
    },
    {
      id: "licenciamiento_cloud_cuentas_heredadas_seguridad",
      tipo: "seguridad",
      anchor: "cloud_cuentas_heredadas",
      when: { field: "cloud_cuentas_heredadas", value: "Pendiente de revocar" },
      texto: "Auditar usuarios, aplicaciones registradas, relaciones de partner (CSP/GDAP) y cuentas de servicio del MSP saliente. Eliminarlas o deshabilitarlas y documentar la fecha.",
    },
    {
      id: "licenciamiento_cloud_mfa_seguridad",
      tipo: "seguridad",
      anchor: "cloud_mfa",
      when: { field: "cloud_mfa", value: "No" },
      texto: "Administración cloud sin MFA. Activarlo en todas las cuentas privilegiadas antes de dar por cerrado el onboarding.",
    },
    {
      id: "licenciamiento_gral_comercial",
      tipo: "comercial",
      texto: "Al cerrar el onboarding, volcar al calendario de renovaciones todas las fechas recogidas en la sección de licencias y contratos: dominios, SSL, hosting, soporte del ERP, renting de impresión y licencias.",
    },
  ],
  otros_dispositivos: [
    {
      id: "otros_dispositivos_gral_seguridad",
      tipo: "seguridad",
      texto: "Los dispositivos de terceros (cámaras, control de accesos, TPV) deberían colgar de una VLAN aislada, no de la red corporativa. Y el instalador no debería conservar acceso al portal.",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// Tipos de aviso
// ─────────────────────────────────────────────────────────────────────────
//
// seguridad  Riesgo activo que hay que corregir.
// legado     Herencia del proveedor anterior que hay que limpiar.
// comercial  Oportunidad de servicio detectada. INTERNO: nunca sale en un
//            informe que pueda acabar en manos del cliente.
// doc        Recordatorio de que revisar o documentar durante la visita.
//
// Solo seguridad y legado se marcan: son tareas con estado. Los otros dos son
// informativos, para no anadir friccion a quien va con prisa.

export const TIPOS_HINT = {
  seguridad: { etiqueta: "Seguridad", icono: "⚠️", marcable: true, interno: false },
  legado: { etiqueta: "Legado", icono: "🔑", marcable: true, interno: false },
  comercial: { etiqueta: "Oportunidad", icono: "💡", marcable: false, interno: true },
  doc: { etiqueta: "Documentar", icono: "📋", marcable: false, interno: false },
};

export const ESTADOS_HINT = [
  { valor: "hecho", etiqueta: "Hecho" },
  { valor: "pendiente", etiqueta: "Pendiente" },
  { valor: "na", etiqueta: "N/A" },
];

/** Hints declarados para una seccion. */
export function hintsDeSeccion(sectionId) {
  return HINTS[sectionId] ?? [];
}

/**
 * Clave con la que se guarda el estado de un hint.
 * Las secciones son multi-instancia, asi que cada instancia lleva su estado.
 */
export function claveHint(hintId, instanceIdx) {
  return instanceIdx === null || instanceIdx === undefined ? hintId : `${hintId}@${instanceIdx}`;
}

/**
 * Decide si un hint aplica, dado un lector de valores del formulario.
 * Sin `when` siempre aplica. La condicion es declarativa a proposito: la fase
 * del ciberscore necesita poder recorrer el catalogo entero sin ejecutar nada.
 */
export function hintAplica(hint, leerCampo) {
  if (!hint.when) return true;
  const v = leerCampo(hint.when.field);
  if (hint.when.valueIn) return hint.when.valueIn.includes(v);
  return v === hint.when.value;
}

/** Hints visibles ahora mismo para una instancia concreta de una seccion. */
export function hintsVisibles(sectionId, leerCampo) {
  return hintsDeSeccion(sectionId).filter(h => hintAplica(h, leerCampo));
}
