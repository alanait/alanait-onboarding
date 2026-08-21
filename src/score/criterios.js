// Criterios del CiberScore: que campo puntua, en que dominio, cuanto pesa y
// que vale cada respuesta.
//
// Generado a partir del diseno de cuatro agentes y depurado contra el esquema:
// se descartaron los criterios sobre campos inexistentes, sobre campos de tipo
// `checks` (que no se resuelven con un mapa literal) y los que puntuaban un
// mismo campo en dos dominios, que habria contado el mismo hecho dos veces
// sobre casi un tercio de la nota. Las dependencias vienen del esquema.
//
// AVISO: las claves de cada `mapa` son literales EXACTOS de las opciones del
// campo. Si se reescribe una opcion en sections.js hay que reescribirla aqui:
// el motor casa por cadena, y un criterio que no case deja de puntuar en
// silencio. scripts/check-score.mjs lo verifica en cada build.

// Literales que significan "este control no existe en este cliente". Salen del
// denominador: su superficie de riesgo es genuinamente menor, y exigir
// evidencia sobre algo que no existe convertiria el aviso en ruido permanente.
//
// "Otro"/"Otra" entran aqui a proposito: el cliente tiene algo que el
// desplegable no sabe graduar. No es un hueco de la visita —el tecnico
// contesto— y contarlo como cero seria castigarle por un caso que el modelo no
// contempla. Solo afecta a red_dns, sai_sala y srv_so_version_linux.
export const LITERALES_NO_APLICA = ["No aplica", "No hay red de invitados", "Otro", "Otra"];

// Literales que significan "existe y nadie lo ha mirado". Valen lo mismo que el
// hueco: declararlo y callarlo son el mismo estado de conocimiento, y si
// valieran distinto el tecnico aprenderia a no tocar el desplegable.
//
// La excepcion es `computa`, que sigue documentada en computeScore: para unos
// pocos criterios desconocer el dato ES el hallazgo, y ahi si puntua.
export const LITERALES_SIN_COMPROBAR = ["No revisado", "No se sabe", "No sabe"];

export const CRITERIOS = [

  // ── Red y perímetro ─────────────────────────────────────
  { id: "red_firewall", dominio: "perimetro", seccion: "red", campo: "firewall", peso: 3, mapa: { "Sí": 1, No: 0 }, agregacion: "min", critico: { cuando: ["No"], capDominio: 79 },
    titular: "Sin firewall dedicado: el perímetro es el router del operador",
    porQue: "Sin firewall dedicado el perimetro es el router del operador: ni inspeccion, ni segmentacion, ni logs, ni control real de las reglas NAT. 'No' aqui es una carencia confirmada, no un 'no revisado' (el campo ni siquiera ofrece esa opcion), por eso puntua 0 y ademas impide que el dominio llegue a verde aunque el resto este correcto." },
  { id: "red_firewall_firmware", dominio: "perimetro", seccion: "red", campo: "firewall_firmware_ok", peso: 2, mapa: { "Sí": 1, No: 0, "No revisado": 0 }, dep: { field: "firewall", value: "Sí" }, agregacion: "min",
    porQue: "El firewall es el unico equipo del cliente expuesto a internet las 24 horas. Un firmware sin actualizar arrastra CVEs publicas con exploit disponible; las campanas contra Fortinet, SonicWall o Sophos se explotan en dias, no en meses." },
  { id: "red_firewall_soporte", dominio: "perimetro", seccion: "red", campo: "firewall_soporte", peso: 3, mapa: { "En soporte": 1, "Fuera de soporte (EOL)": 0, "No revisado": 0 }, dep: { field: "firewall", value: "Sí" }, agregacion: "min", critico: { cuando: ["Fuera de soporte (EOL)"], capDominio: 59 },
    titular: "Firewall fuera de soporte del fabricante",
    porQue: "Un firewall EOL ya no recibe parches del fabricante: la proxima vulnerabilidad critica no se corregira nunca. Es el equivalente perimetral del servidor con SO fuera de soporte, y capea el dominio por el mismo motivo que aquel." },
  { id: "red_firewall_gestion", dominio: "perimetro", seccion: "red", campo: "firewall_gestion", peso: 2, mapa: { Autogestionado: 1, "Gestionado por proveedor": 1, "Sin gestión activa": 0 }, dep: { field: "firewall", value: "Sí" }, agregacion: "min",
    porQue: "'Sin gestion activa' significa que nadie revisa reglas, firmware ni logs y el firewall envejece solo. Es indiferente quien lo gestione (cliente o proveedor) mientras alguien lo haga: la dependencia del MSP saliente ya la mide red_accesos_heredados y penalizarla tambien aqui seria contarla dos veces." },
  { id: "red_nat_reglas", dominio: "perimetro", seccion: "red", campo: "nat_reglas", peso: 2, mapa: { Documentadas: 1, "No hay": 1, "Existen sin documentar": 0.5, "No revisado": 0 }, agregacion: "min",
    porQue: "Cada regla NAT sin dueno conocido es una puerta heredada que nadie se atreve a cerrar. 'No hay' puntua igual que 'Documentadas' porque la superficie expuesta es cero; 'Existen sin documentar' se queda a medias: hay exposicion, pero todavia no consta que sea peligrosa." },
  { id: "red_rdp", dominio: "perimetro", seccion: "red", campo: "rdp_expuesto", peso: 3, mapa: { No: 1, "Sí": 0, "No revisado": 0 }, computa: ["No revisado"], agregacion: "min", critico: { cuando: ["Sí"], capDominio: 30 },
    titular: "RDP u otros puertos de riesgo publicados a internet",
    porQue: "RDP publicado es la via de entrada mas explotada en pymes: fuerza bruta permanente y ransomware el mismo fin de semana. Excepcion a la regla 1 acordada con el dueno: si nadie ha comprobado que puertos hay abiertos, se asume lo peor y computa 0." },
  { id: "red_vpns", dominio: "perimetro", seccion: "red", campo: "vpns_auditadas", peso: 2, mapa: { Auditadas: 1, "No hay VPNs": 1, "Pendiente de auditar": 0 }, agregacion: "min",
    porQue: "Una VPN sin auditar casi siempre esconde usuarios del proveedor anterior, de empleados que ya no estan o del integrador que monto el ERP hace anos. 'No hay VPNs' vale 1 porque no hay nada que auditar ni que revocar." },
  { id: "red_utm", dominio: "perimetro", seccion: "red", campo: "utm", peso: 2, mapa: { "Sí": 1, No: 0, "No revisado": 0 }, agregacion: "min",
    porQue: "Filtrado web e IPS cortan phishing, command-and-control y descargas maliciosas antes de que lleguen al puesto (CIS 9). En un cliente sin EDR es la unica capa de red que existe." },
  { id: "red_vlans", dominio: "perimetro", seccion: "red", campo: "vlans", peso: 2, mapa: { "Sí": 1, No: 0 }, agregacion: "min",
    porQue: "Sin VLANs, la impresora, la camara IP, el movil de una visita y el servidor comparten la misma red plana: un equipo comprometido alcanza a todos los demas (CIS 12, segmentacion)." },
  { id: "red_switches", dominio: "perimetro", seccion: "red", campo: "switches_tipo", peso: 1, mapa: { "Todos gestionados": 1, Mixto: 0.5, "Todos no gestionados": 0 }, agregacion: "min",
    porQue: "Un switch no gestionado no permite VLANs, ni seguridad de puerto, ni saber que hay conectado. No es un agujero por si mismo, pero bloquea cualquier mejora posterior de segmentacion: por eso pesa 1 y no mas." },
  { id: "red_dns", dominio: "perimetro", seccion: "red", campo: "dns_tipo", peso: 1, mapa: { "Interno (AD/Windows)": 1, "Públicos (8.8.8.8 / 1.1.1.1)": 1, "DNS del ISP": 0.5, Mixto: 0.5 }, agregacion: "min",
    porQue: "Los DNS del operador no filtran, no registran consultas y se caen mas de lo que el cliente cree; el 'Mixto' suele ser una configuracion a medias que rompe la resolucion interna. El literal 'Otro' queda fuera del mapa a proposito: sin saber cual es, no se puede juzgar." },
  { id: "red_monitorizacion", dominio: "perimetro", seccion: "red", campo: "monitorizacion", peso: 1, mapa: { "Sí": 1, No: 0 }, agregacion: "min",
    porQue: "Sin monitorizacion, la caida de la linea o de un switch la descubre el cliente llamando por telefono. Mide si ya existe vigilancia de red antes de que entre ALANA." },
  { id: "red_linea_backup", dominio: "perimetro", seccion: "red", campo: "linea_backup", peso: 1, mapa: { "Sí": 1, No: 0 }, agregacion: "min",
    porQue: "Con el correo, el ERP y el backup en cloud, quedarse sin linea es quedarse sin empresa: continuidad basica del ENS. Pesa 1 porque en oficinas pequenas sigue siendo una decision de coste, no un fallo de seguridad." },
  { id: "wifi_cifrado", dominio: "perimetro", seccion: "wifi", campo: "cifrado", peso: 3, mapa: { WPA3: 1, "WPA2-Enterprise (802.1X)": 1, "WPA2-PSK": 0.8, "WPA/WPA2 mixto": 0.5, WEP: 0, "Abierta (sin contraseña)": 0, "No revisado": 0 }, agregacion: "min", critico: { cuando: ["WEP", "Abierta (sin contraseña)"], capDominio: 39 },
    titular: "WiFi con cifrado inseguro o red abierta",
    porQue: "WEP se rompe en minutos y una red abierta mete a cualquiera desde el aparcamiento dentro de la LAN, saltandose el firewall entero: por eso capea el dominio a rojo. WPA2-PSK sigue siendo razonable en una pyme y por eso baja poco, pero no puede empatar con WPA3 ni con 802.1X: una clave compartida no identifica a nadie, no se revoca por usuario y se va con cada empleado que se marcha. El mixto baja mas porque ademas permite caer a TKIP." },
  { id: "wifi_invitados_aislado", dominio: "perimetro", seccion: "wifi", campo: "invitados_aislado", peso: 2, mapa: { "VLAN aislada, sin acceso a la LAN": 1, "Separada solo por SSID, misma red": 0.5, "Con acceso a la LAN": 0, "No revisado": 0 }, agregacion: "min",
    porQue: "La red de invitados existe para que el movil de una visita o el portatil de un comercial externo no vean el servidor de ficheros. Separarla solo por SSID es aislamiento aparente: siguen en la misma red. 'No hay red de invitados' se deja fuera del mapa porque no es observable si eso significa que no hay visitas o que se les da la clave corporativa." },
  { id: "wifi_aps_soporte", dominio: "perimetro", seccion: "wifi", campo: "aps_soporte", peso: 2, mapa: { "En soporte": 1, "Fuera de soporte (EOL)": 0, "No revisado": 0 }, agregacion: "min",
    porQue: "Un AP fuera de soporte no recibe firmware: se queda sin WPA3, arrastra vulnerabilidades conocidas y es un equipo de red al que se llega sin necesidad de cable." },
  { id: "lic_ssl_estado", dominio: "perimetro", seccion: "licenciamiento", campo: "ssl_estado", peso: 2, mapa: { "Vigente (más de 60 días)": 1, "Caduca en menos de 60 días": 0.5, Caducado: 0, "Autofirmado / no válido": 0, "No revisado": 0 }, dep: { field: "tipo_servicio", value: "Certificado SSL" }, agregacion: "min",
    porQue: "Un certificado caducado tira el servicio que protege y ademas ensena al usuario a saltarse el aviso del navegador, que es justo la costumbre que explota el phishing. El autofirmado hace lo mismo todos los dias. 'Caduca en menos de 60 dias' no es un fallo todavia pero si una fecha con dueno: si nadie la tiene apuntada, se convierte en caducado" },

  // ── Backup y resiliencia ────────────────────────────────
  { id: "backup_frecuencia", dominio: "backup", seccion: "backup", campo: "frecuencia", peso: 2, mapa: { Continuo: 1, Diario: 0.85, Semanal: 0.5, Mensual: 0, "Sin política definida": 0 }, agregacion: "max",
    porQue: "La frecuencia fija el RPO: cuanto trabajo se pierde en el peor caso. Diaria es el minimo razonable en una pyme y por eso se queda cerca del maximo, pero no lo iguala: una copia diaria son hasta 24 horas de trabajo perdido y una continua son minutos, y en un despacho eso es un dia entero de facturacion. Semanal significa perder hasta cinco dias y mensual equivale a no tener copia util. 'Sin politica definida' es peor que una mala frecuencia porque nadie sabe cual es." },
  { id: "backup_retencion", dominio: "backup", seccion: "backup", campo: "retencion_rango", peso: 2, mapa: { "Menos de 7 días": 0, "7 a 14 días": 0.5, "15 a 30 días": 0.75, "1 a 3 meses": 0.9, "3 a 12 meses": 1, "Más de 12 meses": 1, "Sin retención definida": 0, "No revisado": 0 }, agregacion: "max",
    porQue: "El cifrado o el borrado silencioso se detectan tarde: con menos de 7 dias de retencion, cuando alguien se da cuenta ya solo quedan copias del dato corrupto. A partir de 15-30 dias hay margen real de recuperacion, pero no es el mismo margen que tres meses: un atacante que entra y espera, o un borrado que nadie nota hasta el cierre trimestral, se comen 30 dias sin despeinarse. Por encima de 3 meses ya no compensa mas -el rendimiento decreciente es real y el coste de almacenamiento no lo es- asi que ahi se iguala. 'No revisado' figura en el mapa por documentacion pero NO computa (no esta en computa), segun la regla 1." },
  { id: "backup_offsite", dominio: "backup", seccion: "backup", campo: "offsite", peso: 3, mapa: { "Sí": 1, No: 0 }, agregacion: "max",
    porQue: "Regla 3-2-1: si todas las copias viven en la misma sede, un incendio, un robo o un ransomware que salta al NAS se lleva produccion y backup a la vez. Basta con que una instancia de backup tenga destino fuera de sede, por eso agrega por max. Deliberadamente SIN cap (ver notas)." },
  { id: "backup_ultimo_job", dominio: "backup", seccion: "backup", campo: "ultimo_job", peso: 3, mapa: { Correctas: 1, "Con avisos": 0.5, "Con errores": 0, "Sin ejecutar desde hace días": 0, "No revisado": 0 }, agregacion: "min", critico: { cuando: ["Con errores", "Sin ejecutar desde hace días"], capDominio: 50 },
    titular: "Las últimas copias no terminaron correctamente",
    porQue: "Es el unico dato observable en la visita que demuestra que la copia existe hoy y no solo en el papel del contrato. Jobs en error o parados varios dias equivalen a no tener backup, y ninguna otra virtud del diseno lo compensa: por eso capa el dominio. Agrega por min porque un sistema fallando es un hallazgo real aunque otro vaya bien. 'No revisado' no computa." },
  { id: "backup_alertas", dominio: "backup", seccion: "backup", campo: "backup_alertas", peso: 2, mapa: { "Configuradas y se revisan": 1, "Se envían pero nadie las revisa": 0.5, "No hay alertas configuradas": 0, "No revisado": 0 }, agregacion: "min",
    porQue: "Sin alertas atendidas, un backup roto se descubre el dia que hay que restaurar. Que se envien y nadie las mire es medio punto: la tuberia existe, falta el destinatario (redirigirlas al buzon de soporte de ALANA). 'No revisado' no computa." },
  { id: "backup_pruebas", dominio: "backup", seccion: "backup", campo: "pruebas", peso: 2, mapa: { "Sí": 1, No: 0, Nunca: 0 }, agregacion: "max", critico: { cuando: ["Nunca"], capDominio: 65 },
    titular: "Nunca se ha probado una restauración",
    porQue: "Mide el PROCESO: si existe la costumbre de probar restauraciones (CIS 11.5). Un backup jamas probado no puede considerarse verificado por muy verdes que salgan los jobs, asi que 'Nunca' impide que el dominio llegue a verde. El RESULTADO de la ultima prueba lo puntua backup_prueba_resultado, que solo entra si aqui hay 'Sí' (ver notas), para no castigar dos veces el mismo hecho." },
  { id: "backup_prueba_resultado", dominio: "backup", seccion: "backup", campo: "prueba_resultado", peso: 3, mapa: { Correcta: 1, "Correcta con incidencias": 0.5, Fallida: 0, "No se ha podido probar": 0, "No revisado": 0 }, dep: { field: "pruebas", value: "Sí" }, agregacion: "max", critico: { cuando: ["Fallida"], capDominio: 45 },
    titular: "La última restauración de prueba falló",
    porQue: "Una copia que no se ha restaurado nunca no es una copia: es una carpeta grande. Solo cuenta si se declaran pruebas, para que dejarlo en blanco no puntue mejor que reconocer un fallo." },
  { id: "backup_inmutabilidad", dominio: "backup", seccion: "backup", campo: "inmutabilidad", peso: 3, mapa: { "Sí, copias inmutables (WORM / object lock)": 1, "Solo protección anti-ransomware del software": 0.5, No: 0, "No revisado": 0 }, agregacion: "max",
    porQue: "El ransomware moderno borra o cifra las copias antes de cifrar produccion; la inmutabilidad (object lock / WORM) es lo unico que garantiza que dentro del periodo de retencion no se pueden destruir. La proteccion propia del software de backup ayuda pero depende de que el atacante no tenga la consola, por eso medio punto. 'No revisado' no computa." },
  { id: "backup_repo_parcheo", dominio: "backup", seccion: "backup", campo: "repo_parcheo", peso: 2, mapa: { "Al día": 1, "Parches pendientes": 0.5, "Muy desactualizado": 0, "No revisado": 0 }, dep: { field: "repo_dedicado", value: "Sí" }, agregacion: "min",
    porQue: "Las vulnerabilidades de DSM/QTS y de firmware de NAS son el vector habitual para cifrar directamente el repositorio de copias (Deadbolt, eCh0raix). Solo se evalua si repo_dedicado = 'Sí'; un cliente solo-cloud no tiene este campo y sale del denominador. 'No revisado' no computa." },
  { id: "backup_repo_expuesto", dominio: "backup", seccion: "backup", campo: "repo_expuesto", peso: 3, mapa: { "No, solo LAN": 1, "Sí, únicamente por VPN": 0.5, "Sí, publicado directamente": 0, "No revisado": 0 }, computa: ["No revisado"], dep: { field: "repo_dedicado", value: "Sí" }, agregacion: "min", critico: { cuando: ["Sí, publicado directamente"], capDominio: 40 },
    titular: "Repositorio de copias publicado a internet",
    porQue: "Un NAS de backup publicado a internet es el equivalente exacto del RDP expuesto y ademas apunta al activo que decide si el cliente sobrevive a un incidente: capa el dominio igual que el RDP. Acceso solo por VPN es aceptable pero no ideal (media). EXCEPCION DE LA REGLA 1 justificada: 'No revisado' SI computa valiendo 0 porque aqui el desconocimiento es el riesgo — si nadie ha mirado las reglas NAT del firewall hay que asumir que puede estar publicado, y comprobarlo cuesta lo mismo que comprobar el RDP. No dispara cap, solo puntua 0." },

  // ── Identidad y accesos ─────────────────────────────────
  { id: "identidad_email_mfa", dominio: "identidad", seccion: "email", campo: "mfa", peso: 3, mapa: { "Sí": 1, Parcialmente: 0.5, No: 0 }, agregacion: "min", critico: { cuando: ["No"], capDominio: 55, capGlobal: 79 },
    titular: "Sin MFA en el correo corporativo",
    porQue: "El correo es la llave del resto: sin MFA, una contrasena filtrada en cualquier brecha entrega el buzon, y con el los restablecimientos de contrasena de todo lo demas. Es el control mas barato y mas rentable que existe (CIS 6.3). Sin MFA no puede haber verde." },
  { id: "identidad_email_mfa_admins", dominio: "identidad", seccion: "email", campo: "mfa_admins", peso: 3, mapa: { "Sí": 1, No: 0, "No revisado": 0 }, agregacion: "min", critico: { cuando: ["No"], capDominio: 40 },
    titular: "Sin MFA en las cuentas de administrador",
    porQue: "Un administrador global sin MFA es la toma de control completa del tenant: crear buzones, redirigir correo, dar acceso a SharePoint y borrar el rastro (CIS 6.5). Ninguna suma de buenas practicas compensa eso." },
  { id: "identidad_vpn_mfa", dominio: "identidad", seccion: "vpn", campo: "mfa", peso: 3, mapa: { "Sí": 1, No: 0 }, agregacion: "min",
    porQue: "La VPN publica la LAN en internet. Sin segundo factor, unas credenciales robadas o reutilizadas son acceso remoto legitimo a toda la red interna, indistinguible de un empleado." },
  { id: "identidad_backup_repo_mfa", dominio: "identidad", seccion: "backup", campo: "repo_mfa", peso: 2, mapa: { "Sí": 1, No: 0, "No revisado": 0 }, dep: { field: "repo_dedicado", value: "Sí" }, agregacion: "min",
    porQue: "El repositorio de copias es el primer objetivo del ransomware, antes que los datos. Si se entra con solo usuario y contrasena, se borra la copia y el rescate deja de tener alternativa." },
  { id: "identidad_cloud_mfa", dominio: "identidad", seccion: "licenciamiento", campo: "cloud_mfa", peso: 2, mapa: { "Sí": 1, Parcialmente: 0.5, No: 0, "No revisado": 0 }, dep: { field: "tipo_servicio", value: "Servicio cloud" }, agregacion: "min",
    porQue: "Cada panel cloud (Azure, AWS, Jotelulu) es un centro de datos entero detras de una contrasena. Manda el peor: basta un phishing en el servicio mas descuidado para apagar o cifrar lo que hay dentro." },
  { id: "identidad_pcs_admin_local", dominio: "identidad", seccion: "pcs", campo: "admin_local", peso: 2, mapa: { "Ninguno es administrador": 1, "Solo algunos usuarios": 0.5, "Todos son administradores": 0, "No revisado": 0 }, agregacion: "min",
    porQue: "Un usuario administrador de su equipo puede desactivar el antivirus, instalar lo que sea y ejecutar el adjunto con privilegios: es lo que convierte un clic en un incidente (CIS 5.4)." },
  { id: "identidad_pcs_admin_local_password", dominio: "identidad", seccion: "pcs", campo: "admin_local_password", peso: 3, mapa: { "Única por equipo (LAPS o gestor)": 1, "La misma en todos los equipos": 0, "No revisado": 0 }, agregacion: "min", critico: { cuando: ["La misma en todos los equipos"], capDominio: 50 },
    titular: "Misma contraseña de administrador local en todo el parque",
    porQue: "La misma contrasena de administrador local en todo el parque convierte un unico equipo comprometido en el parque entero: es el movimiento lateral de manual. LAPS o un gestor lo cortan de raiz (CIS 4.7 / 5.2)." },
  { id: "identidad_pcs_cuentas_nominales", dominio: "identidad", seccion: "pcs", campo: "dominio", peso: 1, mapa: { "Sí": 1, Mixto: 0.5, No: 0 }, agregacion: "min",
    porQue: "Proxy observable de cuenta nominal: sin directorio central los equipos tiran de cuentas locales compartidas, y entonces no hay quien hizo que ni forma fiable de dar de baja a quien se va." },
  { id: "identidad_ad_cuentas", dominio: "identidad", seccion: "servidores", campo: "dominio_cuentas", peso: 2, mapa: { "Revisado, correcto": 1, "Revisado, con hallazgos": 0, "Pendiente de revisar": 0 }, dep: { field: "dominio", value: "Sí" }, agregacion: "min",
    porQue: "En un directorio que lleva anos funcionando se acumulan cuentas de gente que ya no esta, cuentas de servicio con contrasena que no caduca y administradores de dominio que nadie recuerda haber creado. Es el equivalente en el AD de lo que correo_admins_revisados mide en el tenant, y sale igual que aquel: un hallazgo confirmado y una revision pendiente valen los dos cero, porque en un caso el riesgo esta visto y en el otro no se sabe" },

  // ── Endpoint y servidores ───────────────────────────────
  { id: "pcs_so_soporte", dominio: "puestos", seccion: "pcs", campo: "so_soporte", peso: 4, deducibleDe: "so", mapa: { "En soporte": 1, Mixto: 0.5, "Fuera de soporte (EOL)": 0 }, agregacion: "min",
    porQue: "Un parque con sistemas fuera de soporte no recibe parches: cualquier vulnerabilidad publicada queda abierta para siempre (CIS 2.2 / ENS op.exp.4)" },
  { id: "pcs_parcheo_sistema", dominio: "puestos", seccion: "pcs", campo: "parcheo_gestion", peso: 4, mapa: { "Centralizada por RMM": 1, "WSUS / Intune / GPO": 0.85, "Windows Update automático sin control": 0.5, "Manual por el usuario": 0, "Sin gestión": 0 }, agregacion: "min",
    porQue: "Sin gestion centralizada de actualizaciones nadie sabe que equipo esta sin parchear ni cuanto tarda en estarlo (CIS 7.3). WSUS/Intune/GPO es gestion centralizada de verdad y por eso queda cerca del maximo, pero se queda corto respecto al RMM en lo que aqui importa: el RMM da inventario y verificacion continua a quien presta el servicio, mientras que el WSUS del cliente lo tiene que mirar alguien del cliente, y es justo lo que nadie hace" },
  { id: "pcs_parcheo_terceros", dominio: "puestos", seccion: "pcs", campo: "parcheo_terceros", peso: 2, mapa: { "Centralizada por RMM": 1, "Automática de cada aplicación": 0.5, Manual: 0.2, "Sin gestión": 0 }, agregacion: "min",
    porQue: "Navegador, Java y Acrobat son la via de entrada real; el parcheo de terceros se olvida mucho mas que el del sistema (CIS 7.4). 'Manual' no es cero del todo -significa que existe la costumbre de repasarlo, aunque sea a mano y a destiempo- pero se queda muy abajo porque en la practica se hace cuando algo falla, no cuando sale el parche" },
  { id: "pcs_cifrado_disco", dominio: "puestos", seccion: "pcs", campo: "cifrado_portatiles", peso: 3, mapa: { "Activo en todos": 1, "Activo en algunos": 0.5, "No activo": 0 }, agregacion: "min",
    porQue: "Un portátil sin cifrar que se pierde es una brecha de datos notificable a la AEPD, no una incidencia de hardware (CIS 3.6 / ENS mp.si.2)" },
  { id: "pcs_cifrado_custodia", dominio: "puestos", seccion: "pcs", campo: "cifrado_claves", peso: 1, mapa: { "En AD / Entra ID": 1, "En Intune": 1, "En gestor de contraseñas del MSP": 1, "En el propio equipo o en papel": 0.5, "No se custodian": 0 }, dep: { field: "cifrado_portatiles", value: "Activo en todos" }, agregacion: "min",
    porQue: "Cifrado sin custodia de la clave de recuperación es pérdida de datos garantizada en el primer arranque fallido; la clave guardada en el propio equipo no protege nada" },
  { id: "pcs_rmm_agente", dominio: "puestos", seccion: "pcs", campo: "rmm_agente", peso: 1, mapa: { "Sí, en todos": 1, "Sí, parcialmente": 0.5, No: 0 }, agregacion: "min",
    porQue: "Sin agente RMM no hay inventario ni parcheo ni respuesta remota: el equipo sin agente es el que nadie mira (CIS 1.1)" },
  { id: "pcs_software_licenciado", dominio: "puestos", seccion: "pcs", campo: "software_licencias", peso: 1, mapa: { "Todo con licencia": 1, "Hay software sin licencia": 0 }, agregacion: "min",
    porQue: "El software sin licencia suele llegar con crack o activador, que es malware con permiso de administrador, y además expone al cliente a una reclamación del fabricante (CIS 2.3)" },
  { id: "pcs_mdm_moviles", dominio: "puestos", seccion: "pcs", campo: "moviles_mdm", peso: 1, mapa: { "Sí": 1, No: 0 }, dep: { field: "moviles", value: "Sí" }, agregacion: "min",
    porQue: "Móviles corporativos con correo de empresa y sin MDM no se pueden borrar en remoto cuando se pierden o cuando el empleado se marcha" },
  { id: "av_tipo_solucion", dominio: "puestos", seccion: "antivirus", campo: "tipo", peso: 4, mapa: { "Antivirus básico": 0, EDR: 0.7, XDR: 0.9, "MDR gestionado": 1 }, agregacion: "min", critico: { cuando: ["Antivirus básico"], capDominio: 65 },
    titular: "Solo antivirus de firmas: no detecta el ransomware actual",
    porQue: "El antivirus de firmas no ve el ransomware moderno, que llega sin fichero y se ejecuta en memoria. Puntua 0 y no a medio camino porque no es media proteccion: es proteccion contra la amenaza de hace diez anos, y la carencia esta confirmada, no pendiente de mirar. Ademas CAPA el dominio, y esa es la unica forma de que la eleccion de solucion se note en la nota global: el peso de un criterio esta acotado por el de su dominio -puestos entero solo vale 13 puntos- asi que por mucho que se suba, elegir MDR en vez de firmas no llegaria a mover ni dos puntos. Del EDR hacia arriba los saltos son cortos a proposito: el gran diferencial del MDR -que alguien vigile la consola 24x7- ya lo mide av_alertas_vigiladas, y contarlo tambien aqui seria puntuar el mismo hecho dos veces. Lo que se gradua aqui es el alcance de la tecnologia: EDR mira el puesto, XDR correlaciona ademas red e identidad (CIS 10.7)" },
  { id: "av_cobertura_parque", dominio: "puestos", seccion: "antivirus", campo: "cobertura", peso: 4, mapa: { "Todos los equipos": 1, "La mayoría, con excepciones": 0.5, "Solo algunos equipos": 0 }, agregacion: "max",
    porQue: "Basta un equipo sin protección para que entre el cifrado y se propague por los recursos compartidos (CIS 10.1)" },
  { id: "av_servidores", dominio: "servidores", seccion: "antivirus", campo: "servidores_av", peso: 3, mapa: { "Sí": 1, No: 0 }, agregacion: "max",
    porQue: "El servidor de ficheros es el objetivo del ransomware, no el PC del usuario; dejarlo fuera del antivirus es dejar fuera lo único que importa" },
  { id: "av_licencia_estado", dominio: "puestos", seccion: "antivirus", campo: "licencias_estado", peso: 2, mapa: { Vigente: 1, Caducada: 0, "En periodo de prueba": 0.5 }, agregacion: "min",
    porQue: "Una licencia caducada deja el agente instalado pero sin actualizaciones ni consola: aparenta protección y no la da" },
  { id: "av_alertas_vigiladas", dominio: "puestos", seccion: "antivirus", campo: "alertas_monitorizadas", peso: 4, mapa: { "Proveedor / SOC (MDR)": 1, "El cliente": 0.5, Nadie: 0 }, agregacion: "min",
    porQue: "Una detección que nadie lee no es una detección; el ransomware avisa horas antes en la consola y nadie la mira (CIS 8.11 / 17.x)" },
  { id: "av_consola_control", dominio: "puestos", seccion: "antivirus", campo: "consola_acceso", peso: 2, mapa: { "El cliente": 1, "El proveedor anterior": 0.25, Ambos: 0.5, "Nadie / credenciales perdidas": 0 }, agregacion: "min",
    porQue: "Si la consola la controla el proveedor anterior o nadie, el antivirus no se puede configurar, excluir ni desinstalar: la proteccion existe pero es ingobernable. Los dos casos no son iguales: con el proveedor anterior la consola es recuperable pidiendola en el traspaso, y hasta entonces alguien la esta mirando; con las credenciales perdidas no hay a quien pedirsela y se acaba reinstalando el agente equipo por equipo" },
  { id: "srv_so_soporte", dominio: "servidores", seccion: "servidores", campo: "so_soporte", peso: 3,
    redundanteSi: [
      { campo: "so_windows_server", dep: { field: "so_familia", value: "Windows Server" } },
      { campo: "so_windows_cliente", dep: { field: "so_familia", value: "Windows (escritorio)" } },
      { campo: "so_linux", dep: { field: "so_familia", value: "Linux" } },
    ],
    mapa: { "En soporte": 1, "Fuera de soporte (EOL)": 0 }, agregacion: "min", critico: { cuando: ["Fuera de soporte (EOL)"], capDominio: 45 },
    titular: "Servidor con sistema operativo fuera de soporte",
    porQue: "Un servidor fuera de soporte no recibirá nunca el parche de la próxima vulnerabilidad crítica y suele ser justo el que guarda los datos (CIS 2.2)" },
  { id: "srv_so_version_windows_server", dominio: "servidores", seccion: "servidores", campo: "so_windows_server", peso: 3, mapa: { "Windows Server 2025": 1, "Windows Server 2022": 1, "Windows Server 2019": 0.8, "Windows Server 2016": 0.5, "Windows Server 2012 R2": 0, "Windows Server 2012": 0, "Windows Server 2008 R2": 0, "Windows Server 2008": 0, "Anterior a 2008": 0 }, dep: { field: "so_familia", value: "Windows Server" }, agregacion: "min", critico: { cuando: ["Windows Server 2012 R2", "Windows Server 2012", "Windows Server 2008 R2", "Windows Server 2008", "Anterior a 2008"], capDominio: 45 },
    titular: "Windows Server sin parches de seguridad desde hace años",
    porQue: "La version concreta es un dato objetivo, no una opinion del tecnico: 2012 R2 y anteriores estan fuera de soporte y 2016 agota el soporte extendido en enero de 2027. Lo que se gradua por encima es el recorrido que le queda: 2019 termina en enero de 2029 y ya esta en la segunda mitad de su vida -es una migracion que hay que empezar a planificar, no un problema-, mientras que 2022 y 2025 llegan a 2031 y 2034" },
  { id: "srv_so_version_windows_cliente", dominio: "servidores", seccion: "servidores", campo: "so_windows_cliente", peso: 3, mapa: { "Windows 11": 1, "Windows 10": 0, "Windows 8.1": 0, "Windows 7": 0, "Anterior a Windows 7": 0 }, dep: { field: "so_familia", value: "Windows (escritorio)" }, agregacion: "min", critico: { cuando: ["Windows 10", "Windows 8.1", "Windows 7", "Anterior a Windows 7"], capDominio: 45 },
    titular: "Windows de escritorio haciendo de servidor, sin soporte",
    porQue: "Un Windows de escritorio haciendo de servidor y además fuera de soporte (Windows 10 caducó en octubre de 2025) es el caso clásico del servidor de ficheros escondido bajo una mesa" },
  { id: "srv_so_version_linux", dominio: "servidores", seccion: "servidores", campo: "so_linux", peso: 3, mapa: { "Ubuntu Server LTS": 1, "Ubuntu Server (no LTS)": 0.5, Debian: 1, "Red Hat Enterprise Linux": 1, "Rocky Linux / AlmaLinux": 1, "CentOS 7 o anterior": 0, SUSE: 1 }, dep: { field: "so_familia", value: "Linux" }, agregacion: "min", critico: { cuando: ["CentOS 7 o anterior"], capDominio: 45 },
    titular: "Distribución de Linux sin actualizaciones de seguridad",
    porQue: "CentOS 7 murió en junio de 2024 y no tiene sucesor de actualizaciones; una Ubuntu no LTS deja de recibir parches a los nueve meses" },
  { id: "srv_so_parcheo", dominio: "servidores", seccion: "servidores", campo: "so_parcheo", peso: 4, mapa: { "Al día": 1, "Parches pendientes": 0.5, "Muy desactualizado": 0 }, agregacion: "min",
    porQue: "Estar en soporte no sirve de nada si los parches no se aplican; en servidores el retraso se acumula porque reiniciar da miedo (CIS 7.3)" },
  { id: "srv_raid", dominio: "servidores", seccion: "servidores", campo: "raid_estado", peso: 3, mapa: { "Óptimo": 1, "Degradado (disco en fallo)": 0, "En reconstrucción": 0.5, "Sin RAID (disco único)": 0 }, agregacion: "min", critico: { cuando: ["Degradado (disco en fallo)"], capDominio: 50 },
    titular: "RAID degradado: hay un disco en fallo",
    porQue: "Un RAID degradado es una pérdida de datos con fecha pendiente de confirmar: el segundo disco cae durante la reconstrucción con mucha más frecuencia de la que la gente cree" },
  { id: "srv_hw_garantia", dominio: "servidores", seccion: "servidores", campo: "hw_soporte", peso: 2, mapa: { "En garantía": 1, "Fuera de garantía": 0 }, agregacion: "min",
    porQue: "Servidor fuera de garantía es servidor sin repuesto: la avería deja de medirse en horas y pasa a medirse en semanas de parada" },
  { id: "srv_firmware", dominio: "servidores", seccion: "servidores", campo: "firmware_estado", peso: 1, mapa: { "Al día": 1, "Parches pendientes": 0.5, "Muy desactualizado": 0 }, dep: { field: "tipo", value: "Físico" }, agregacion: "min",
    porQue: "BIOS, controladora e iLO/iDRAC acumulan vulnerabilidades explotables por debajo del sistema operativo y corrigen errores de pérdida de datos de la controladora" },
  { id: "srv_snapshots", dominio: "servidores", seccion: "servidores", campo: "snapshots", peso: 1, mapa: { "Sin snapshots": 1, "1-2 snapshots recientes": 1, "Snapshots antiguos acumulados": 0 }, dep: { field: "tipo", value: "Virtual" }, agregacion: "min",
    porQue: "Los snapshots antiguos llenan el datastore y degradan el rendimiento; cuando el disco se llena la máquina se para, y además rompen los backups" },
  { id: "srv_licencia_titular", dominio: "servidores", seccion: "servidores", campo: "so_licencia_titular", peso: 1, mapa: { "A nombre del cliente": 1, "A nombre del proveedor anterior": 0 }, agregacion: "min",
    porQue: "Si la licencia del SO y las CALs están a nombre del proveedor anterior, el cliente está ejecutando su servidor con una licencia que no es suya y que le pueden retirar" },
  { id: "srv_gpos", dominio: "servidores", seccion: "servidores", campo: "gpos_revisadas", peso: 2, mapa: { "Revisado, correcto": 1, "Revisado, con hallazgos": 0, "Pendiente de revisar": 0 }, dep: { field: "dominio", value: "Sí" }, agregacion: "min",
    porQue: "Las GPO son donde vive de verdad la configuracion de seguridad de un dominio Windows: politica de contrasenas, quien es administrador local, si se puede ejecutar desde el escritorio, si el firewall del puesto esta encendido. Un juego de GPO heredado y sin revisar suele llevar dentro excepciones que alguien puso hace anos para que funcionara un programa concreto y que nadie ha vuelto a quitar" },

  // ── Correo y colaboración ───────────────────────────────
  { id: "correo_spf", dominio: "correo", seccion: "email", campo: "spf", peso: 2, mapa: { Correcto: 1, "Existe pero incompleto o erróneo": 0.5, "No existe": 0, "No revisado": 0 }, agregacion: "min",
    porQue: "Sin SPF correcto cualquiera puede enviar correo en nombre del dominio del cliente: es el fraude del CEO con el remitente autentico. Un SPF incompleto o mal formado protege a medias y suele romper el correo legitimo." },
  { id: "correo_dkim", dominio: "correo", seccion: "email", campo: "dkim", peso: 2, mapa: { "Configurado y firmando": 1, "Configurado pero inactivo": 0.5, "No existe": 0, "No revisado": 0 }, agregacion: "min",
    porQue: "DKIM firma criptograficamente el correo saliente. Sin firma valida el receptor no puede separar el correo legitimo del suplantado, y DMARC se queda sin nada que alinear." },
  { id: "correo_dmarc", dominio: "correo", seccion: "email", campo: "dmarc", peso: 2, mapa: { "p=reject": 1, "p=quarantine": 0.5, "p=none (solo monitorización)": 0.25, "No existe": 0, "No revisado": 0 }, agregacion: "min",
    porQue: "DMARC es lo unico que le dice al receptor que hacer con el correo suplantado: p=reject lo bloquea, p=quarantine lo aparta a spam, y p=none solo mira sin proteger a nadie. Sin politica aplicada, SPF y DKIM no defienden al destinatario. p=none no protege, pero no es lo mismo que no tener nada: el registro existe, los informes llegan y subir a quarantine es cambiar una palabra, mientras que desde cero hay que alinear SPF y DKIM antes de poder aplicar ninguna politica." },
  { id: "correo_antispam", dominio: "correo", seccion: "email", campo: "antispam", peso: 3, mapa: { "Sí": 1, No: 0 }, agregacion: "min",
    porQue: "El phishing es la via de entrada numero uno en pyme. El filtro antispam/antiphishing es el control que reduce el volumen antes de que llegue al usuario, que es donde falla la cadena." },
  { id: "correo_conditional_access", dominio: "correo", seccion: "email", campo: "conditional_access", peso: 2, mapa: { Configurado: 1, "Solo valores predeterminados de seguridad": 0.5, "Sin políticas": 0, "No revisado": 0 }, dep: { field: "proveedor", value: "Microsoft 365" }, agregacion: "min",
    porQue: "El acceso condicional impide iniciar sesion desde donde y como no toca. Los valores predeterminados de seguridad dan MFA basico y ya es medio camino, pero no permiten excepciones controladas ni reglas por ubicacion o dispositivo." },
  { id: "correo_comparticion_externa", dominio: "correo", seccion: "email", campo: "comparticion_externa", peso: 2, mapa: { "Bloqueada (solo usuarios internos)": 1, "Permitida solo con usuarios autenticados": 1, "Enlaces anónimos permitidos": 0, "No revisado": 0 }, agregacion: "min",
    porQue: "Los enlaces anonimos de SharePoint/OneDrive son documentos accesibles por cualquiera que tenga la URL, sin caducidad y sin trazabilidad. Compartir con usuarios autenticados es tan valido como bloquear: identifica a quien abre y se puede revocar." },
  { id: "correo_backup_correo", dominio: "correo", seccion: "email", campo: "backup_correo", peso: 3, mapa: { "Sí": 1, No: 0, "No revisado": 0 }, agregacion: "min",
    porQue: "Microsoft y Google garantizan el servicio, no tus datos (responsabilidad compartida). Un borrado masivo, un ex-empleado o un ransomware sobre el buzon no se recuperan sin copia propia." },
  { id: "correo_archivado", dominio: "correo", seccion: "email", campo: "archivado", peso: 1, mapa: { "Sí": 1, No: 0 }, agregacion: "min",
    porQue: "Sin archivado no hay retencion garantizada ni forma de responder a una peticion legal o a una investigacion interna sobre correo antiguo. Impacto de cumplimiento, no de brecha: por eso pesa poco." },
  { id: "correo_admins_revisados", dominio: "correo", seccion: "email", campo: "admins_revisados", peso: 2, mapa: { "Revisado, correcto": 1, "Revisado, con hallazgos": 0, "Pendiente de revisar": 0 }, agregacion: "min",
    porQue: "Los administradores de mas son la puerta trasera silenciosa del tenant. Un hallazgo aqui significa cuentas privilegiadas reales que nadie controla, no una tarea pendiente." },
  { id: "correo_usuarios_inactivos", dominio: "correo", seccion: "email", campo: "usuarios_inactivos", peso: 1, mapa: { "Revisado, correcto": 1, "Revisado, con hallazgos": 0, "Pendiente de revisar": 0 }, agregacion: "min",
    porQue: "Los buzones de gente que ya no esta siguen siendo credenciales validas que nadie vigila, y ademas se pagan todos los meses (CIS 5.3)." },
  { id: "correo_licencias_revisadas", dominio: "correo", seccion: "email", campo: "licencias_revisadas", peso: 1, mapa: { "Revisado, correcto": 1, "Revisado, con hallazgos": 0, "Pendiente de revisar": 0 }, agregacion: "min",
    porQue: "Licencias mal asignadas dejan usuarios sin las protecciones del plan que la empresa ya esta pagando (Defender, DLP, archivado), ademas del coste tirado." },

  // ── Saneamiento del onboarding ──────────────────────────
  { id: "san_red_accesos", dominio: "saneamiento", seccion: "red", campo: "accesos_heredados", peso: 3, mapa: { Revocados: 1, "Pendiente de revocar": 0, "No existían": 1, "No revisado": 0 }, computa: ["No revisado"], agregacion: "min", critico: { cuando: ["Pendiente de revocar"], capDominio: 50 },
    titular: "El proveedor anterior conserva acceso al router o al firewall",
    porQue: "Quien conserva el administrador del firewall conserva la puerta de la empresa: puede abrir un NAT o una VPN cuando quiera. No haberlo revisado es no haber hecho el saneamiento, que es justo lo que mide este dominio" },
  { id: "san_servidores_accesos", dominio: "saneamiento", seccion: "servidores", campo: "accesos_heredados", peso: 3, mapa: { Revocados: 1, "Pendiente de revocar": 0, "No existían": 1, "No revisado": 0 }, computa: ["No revisado"], agregacion: "min", critico: { cuando: ["Pendiente de revocar"], capDominio: 50 },
    titular: "El proveedor anterior conserva acceso a los servidores",
    porQue: "Una cuenta del proveedor anterior en un servidor suele ser administrador del dominio, y ninguna otra medida del onboarding vale nada mientras siga viva" },
  { id: "san_email_admins", dominio: "saneamiento", seccion: "email", campo: "admins_heredados", peso: 3, mapa: { Revocados: 1, "Pendiente de revocar": 0, "No existían": 1, "No revisado": 0 }, computa: ["No revisado"], agregacion: "min", critico: { cuando: ["Pendiente de revocar"], capDominio: 50 },
    titular: "El proveedor anterior conserva administración del correo",
    porQue: "Un administrador global heredado en el tenant lee cualquier buzón, crea reglas de reenvío y se reasigna permisos: es el acceso más silencioso que existe" },
  { id: "san_backup_consola_accesos", dominio: "saneamiento", seccion: "backup", campo: "consola_accesos_heredados", peso: 3, mapa: { Revocados: 1, "Pendiente de revocar": 0, "No existían": 1, "No revisado": 0 }, computa: ["No revisado"], agregacion: "min", critico: { cuando: ["Pendiente de revocar"], capDominio: 50 },
    titular: "El proveedor anterior conserva acceso a la consola de copias",
    porQue: "Desde la consola de backup se borran las copias y se desprograman los trabajos; es el acceso que convierte un incidente recuperable en uno definitivo" },
  { id: "san_backup_repo_accesos", dominio: "saneamiento", seccion: "backup", campo: "repo_accesos_heredados", peso: 3, mapa: { Revocados: 1, "Pendiente de revocar": 0, "No existían": 1, "No revisado": 0 }, computa: ["No revisado"], dep: { field: "repo_dedicado", value: "Sí" }, agregacion: "min", critico: { cuando: ["Pendiente de revocar"], capDominio: 50 },
    titular: "El proveedor anterior conserva acceso al repositorio de copias",
    porQue: "El repositorio es el último recurso frente a ransomware; una credencial heredada con permiso de borrado sobre el NAS anula esa última línea" },
  { id: "san_pcs_accesos", dominio: "saneamiento", seccion: "pcs", campo: "accesos_heredados", peso: 2, mapa: { Revocados: 1, "Pendiente de revocar": 0, "No existían": 1, "No revisado": 0 }, computa: ["No revisado"], agregacion: "min",
    porQue: "Las cuentas locales de soporte del proveedor anterior sobreviven a los cambios de dominio y dan administrador local para saltar al resto de la red" },
  { id: "san_wifi_accesos", dominio: "saneamiento", seccion: "wifi", campo: "accesos_heredados", peso: 1, mapa: { Revocados: 1, "Pendiente de revocar": 0, "No existían": 1, "No revisado": 0 }, computa: ["No revisado"], agregacion: "min",
    porQue: "El controlador WiFi heredado permite crear un SSID o cambiar la VLAN de invitados desde la nube, sin pisar la oficina" },
  { id: "san_wifi_password", dominio: "saneamiento", seccion: "wifi", campo: "password_heredada", peso: 1, mapa: { Cambiadas: 1, "Pendiente de cambiar": 0, "No revisado": 0 }, computa: ["No revisado"], agregacion: "min",
    porQue: "La PSK que conoce el proveedor anterior (y media plantilla que ya no trabaja allí) es acceso directo a la LAN desde el aparcamiento" },
  { id: "san_licenciamiento_cloud_cuentas", dominio: "saneamiento", seccion: "licenciamiento", campo: "cloud_cuentas_heredadas", peso: 2, mapa: { Revocados: 1, "Pendiente de revocar": 0, "No existían": 1, "No revisado": 0 }, computa: ["No revisado"], dep: { field: "tipo_servicio", value: "Servicio cloud" }, agregacion: "min",
    porQue: "Las cuentas heredadas en Azure, AWS o Jotelulu permiten apagar, clonar o facturar recursos del cliente y sobreviven a cualquier cambio de contraseña local" },
  { id: "san_licenciamiento_panel", dominio: "saneamiento", seccion: "licenciamiento", campo: "acceso_panel", peso: 2, mapa: { "Sí, credenciales en poder del cliente o ALANA": 1, "Sí, pero las tiene el proveedor anterior": 0, "No hay acceso": 0, "No revisado": 0 }, computa: ["No revisado"], agregacion: "min", critico: { cuando: ["Sí, pero las tiene el proveedor anterior"], capDominio: 50 },
    titular: "El proveedor anterior conserva el panel de licencias y dominios",
    porQue: "Quien controla el panel del registrador o del distribuidor de licencias puede dejar caducar un dominio, mover los DNS o no renovar: no hace falta entrar en ningun servidor para dejar al cliente sin correo ni sin web. 'No hay acceso' tambien puntua cero porque el resultado practico es el mismo, nadie del lado del cliente puede tocarlo. Es el mismo tipo de acceso heredado que el resto del dominio y por eso computa aunque nadie lo haya mirado" },
  { id: "san_licenciamiento_titular", dominio: "saneamiento", seccion: "licenciamiento", campo: "titularidad", peso: 2, mapa: { "A nombre del cliente": 1, "A nombre del proveedor anterior": 0, "No revisado": 0 }, computa: ["No revisado"], agregacion: "min",
    porQue: "Licencias, dominios y certificados a nombre del proveedor saliente son activos del cliente que el cliente no posee: al terminar la relacion se los puede llevar, y recuperarlos es una negociacion, no un tramite. Complementa a srv_licencia_titular, que solo mira el SO de los servidores" },

  // ── Infraestructura física ──────────────────────────────
  { id: "sai_existe", dominio: "fisica", seccion: "sai", campo: "sai_existe", peso: 3, mapa: { "Sí": 1, No: 0, "No revisado": 0 }, agregacion: "max", critico: { cuando: ["No"], capDominio: 59 },
    titular: "Sin SAI: un corte de luz apaga los servidores en seco",
    porQue: "Sin SAI cada microcorte es un apagado sucio: bases de datos corruptas, RAID reconstruyendo y cabina de backup a medio escribir. Es el unico criterio de este dominio que agrega por 'max' a proposito: la pregunta es si el cliente protege electricamente su armario principal, y asi un armario secundario de pared sin SAI no capea el dominio entero." },
  { id: "sai_baterias", dominio: "fisica", seccion: "sai", campo: "baterias", peso: 2, mapa: { "Sí": 1, No: 0, "No se sabe": 0 }, computa: ["No se sabe"], agregacion: "min",
    porQue: "Las baterias mueren en silencio a los 3-5 anos y el SAI solo se descubre inutil en el primer corte real, que es el peor momento posible. Atencion al literal: este campo NO usa 'No revisado' sino 'No se sabe', asi que hay que declararlo explicitamente; computa como 0 porque si nadie sabe si aguantan, en la practica no aguantan." },
  { id: "sai_apagado", dominio: "fisica", seccion: "sai", campo: "sai_apagado", peso: 2, mapa: { "Sí": 1, No: 0, "No revisado": 0 }, agregacion: "min",
    porQue: "Un SAI sin apagado ordenado solo retrasa el desastre diez minutos: cuando se agota la bateria el servidor cae igual de sucio que si no hubiera SAI. Es la mitad del control que casi nadie configura." },
  { id: "sai_monitorizado", dominio: "fisica", seccion: "sai", campo: "monitorizado", peso: 1, mapa: { "Sí": 1, No: 0 }, agregacion: "min",
    porQue: "Un SAI no monitorizado no avisa de bateria degradada, sobrecarga ni cortes repetidos. Es el aviso que permite cambiar baterias antes del apagon en lugar de despues." },
  { id: "sai_firmware", dominio: "fisica", seccion: "sai", campo: "sai_firmware", peso: 1, mapa: { "Al día": 1, "Parches pendientes": 0.5, "Muy desactualizado": 0, "No revisado": 0 }, agregacion: "min",
    porQue: "La tarjeta SNMP del SAI es un equipo mas en la LAN, con interfaz web y credenciales por defecto. 'Muy desactualizado' es un dispositivo olvidado con acceso a la red; pesa 1 porque no esta publicado a internet." },
  { id: "sai_rack_tipo", dominio: "fisica", seccion: "sai", campo: "rack_tipo", peso: 1, mapa: { "Rack de pie 19\"": 1, "Rack mural": 1, "Semi-rack": 1, "Sin armario (equipos sueltos)": 0, "No revisado": 0 }, agregacion: "min",
    porQue: "Equipos sueltos sobre una estanteria significan polvo, tirones de cable, apagados accidentales y cero control de quien los toca. El tipo concreto de rack no cambia el riesgo (los tres valen 1); tenerlo o no, si." },
  { id: "sai_rack_estado", dominio: "fisica", seccion: "sai", campo: "rack_estado", peso: 1, mapa: { Bueno: 1, Aceptable: 0.5, Deficiente: 0, "No revisado": 0 }, agregacion: "min",
    porQue: "Un armario deficiente (sin puertas, bandejas improvisadas, equipos apilados sin sujecion) acaba en caidas por calor o por un cable que alguien engancha al pasar." },
  { id: "sai_rack_cerrado", dominio: "fisica", seccion: "sai", campo: "rack_cerrado", peso: 2, mapa: { "Con llave": 1, "Sin llave": 0.5, "Abierto / sin puertas": 0, "No revisado": 0 }, agregacion: "min",
    porQue: "Acceso fisico es acceso total: un puerto libre en el switch, un reset del firewall o un USB en el servidor se saltan todos los controles logicos. Medida de proteccion de instalaciones del ENS basico. 'Sin llave' se queda en 0.5 porque al menos hay puertas que disuaden y protegen del polvo." },
  { id: "sai_sala", dominio: "fisica", seccion: "sai", campo: "sala_tipo", peso: 1, mapa: { "Sala técnica dedicada": 1, "Despacho u oficina": 0.6, "Almacén": 0.4, "Zona de paso": 0 }, agregacion: "min",
    porQue: "Un rack en zona de paso recibe golpes, cables enganchados y curiosos; en despacho o almacen es asumible en una pyme pero sin control real de acceso ni de temperatura. El despacho puntua algo mas que el almacen porque suele tener puerta, alguien dentro que nota un ruido raro y el mismo clima que el resto de la oficina; el almacen no suele tener ninguna de las tres cosas y ademas acumula polvo. 'Otro' sale del mapa: no es evaluable sin leer las notas." },
  { id: "sai_ventilacion", dominio: "fisica", seccion: "sai", campo: "ventilacion", peso: 2, mapa: { "Aire acondicionado dedicado": 1, "AA de la oficina": 0.6, "Ventiladores en el rack": 0.4, "Ventilación natural": 0.25, Ninguna: 0, "No revisado": 0 }, agregacion: "min",
    porQue: "El calor es lo que mata al hardware on-premise, y las tres alternativas al aire acondicionado dedicado no valen lo mismo. El AA de la oficina refrigera de verdad mientras esta encendido y solo falla de noche y el fin de semana -que es justo cuando corre el backup-. Los ventiladores del rack no bajan la temperatura, solo mueven el aire caliente, asi que sirven para que no haya puntos calientes pero no para que la sala este fresca. La ventilacion natural no controla nada: en agosto el armario esta a la temperatura que le toque. Sin ninguna, cocina discos y fuentes." },
  { id: "sai_acceso_restringido", dominio: "fisica", seccion: "sai", campo: "acceso_restringido", peso: 2, mapa: { "Sí": 1, No: 0, "No revisado": 0 }, agregacion: "min",
    porQue: "Si cualquiera entra donde estan los servidores y los switches, el resto de controles se salta con un destornillador. Junto con rack_cerrado forma el control de acceso fisico exigido por el ENS basico." },
  { id: "sai_circuito", dominio: "fisica", seccion: "sai", campo: "circuito_dedicado", peso: 1, mapa: { Dedicado: 1, Compartido: 0.5, "No revisado": 0 }, agregacion: "min",
    porQue: "Compartir el circuito del rack con enchufes de oficina termina con el diferencial saltando por un calefactor o un aspirador. Se puntua suave porque en pymes el circuito compartido es la norma y el SAI absorbe buena parte del problema." },
  { id: "sai_cableado", dominio: "fisica", seccion: "sai", campo: "cableado_estado", peso: 1, mapa: { "Bueno y documentado": 1, "Bueno, sin documentación": 1, "Con puntos problemáticos": 0.5, Deficiente: 0, "No revisado": 0 }, agregacion: "min",
    porQue: "Aqui se mide el estado fisico, no el papeleo: 'Bueno, sin documentacion' vale 1 porque la documentacion la mide el dominio de saneamiento y contarla dos veces distorsionaria la nota. Un cableado deficiente son incidencias intermitentes imposibles de diagnosticar." },
  { id: "sai_etiquetado", dominio: "fisica", seccion: "sai", campo: "etiquetado", peso: 1, mapa: { "Sí": 1, Parcial: 0.5, No: 0, "No revisado": 0 }, agregacion: "min",
    porQue: "Sin etiquetado, cualquier intervencion en el rack empieza por adivinar que cable es cual, y en una averia eso son horas de parada que paga el cliente." },
  { id: "sai_pdu", dominio: "fisica", seccion: "sai", campo: "pdu_tipo", peso: 1, mapa: { "PDU de rack": 1, "PDU + regletas schuko": 0.6, "Regletas schuko": 0.35, Ninguna: 0, "No revisado": 0 }, agregacion: "min",
    porQue: "Las regletas encadenadas dentro del rack son la causa clasica del apagon accidental y de la sobrecarga. Una PDU no es imprescindible en una pyme, por eso el criterio pesa 1 y las regletas no bajan a 0. Pero tener PDU y ademas alguna regleta no es lo mismo que ir solo con regletas: en el primer caso lo critico suele estar en la PDU y la regleta es el añadido, en el segundo no hay nada bien alimentado." },
];

// Precondiciones: casos en los que la respuesta a nivel de SECCION es en si
// misma el hallazgo. Marcar "no" en backup no es un dato que falte —es que el
// cliente no tiene copias— y ningun reparto de puntos puede compensar eso.
//
// Solo entran aqui secciones cuyo "no" tiene una unica lectura razonable, o
// que se pueden eximir con `salvoSi` cuando ese "no" si es legitimo. Las
// demas secciones negables (servidores, wifi, licenciamiento, vpn) se dejan
// fuera a proposito: para esas el "no" puede ser verdad (todo-cloud, nave sin
// wifi, nadie teletrabaja) y forzar un hallazgo las penalizaria sin motivo.
// Medido antes de este cambio: negar las 8 secciones sin precondicion hacia
// desaparecer el 73% del peso de la nota sin un solo hallazgo (KNOWN_ISSUES A1).
export const PRECONDICIONES = [
  { id: "sin_backup", seccion: "backup", cuando: "no", dominio: "backup", capGlobal: 59, capDominio: 0, exigida: true,
    titular: "Sin copias de seguridad",
    texto: "El cliente no tiene copias de seguridad. Es el hallazgo mas grave posible y limita la nota global por si solo." },
  { id: "sin_antivirus", seccion: "antivirus", cuando: "no", dominio: "puestos", capDominio: 30, exigida: true,
    titular: "Sin antivirus ni EDR desplegado",
    texto: "No hay solucion antivirus ni EDR desplegada en el parque de equipos." },
  { id: "sin_email", seccion: "email", cuando: "no", dominio: "correo", capDominio: 0, exigida: true,
    titular: "Sin correo corporativo",
    texto: "El cliente no tiene correo corporativo: lo mas probable es que se use correo personal para el trabajo, lo que es un riesgo de identidad y de fuga de datos que ningun otro control compensa." },
  { id: "sin_red", seccion: "red", cuando: "no", dominio: "perimetro", capDominio: 0, exigida: true,
    titular: "Sin infraestructura de red gestionada",
    texto: "El cliente declara no tener conexion a internet ni infraestructura de red gestionada. Sin eso no hay perimetro que proteger, solo lo que ofrezca el operador por defecto." },
  { id: "sin_pcs", seccion: "pcs", cuando: "no", dominio: "puestos", capDominio: 0, exigida: true,
    titular: "Sin ordenadores de trabajo",
    texto: "El cliente declara no tener ordenadores de trabajo. Es una respuesta atipica que conviene confirmar en la visita: si es asi, el dominio de puestos no tiene nada que proteger en este cliente." },
  // sai se probo como precondicion (capDominio 0, exenta si no hay
  // servidores) y se revirtio el mismo dia: probado en vivo contra un cliente
  // real, el dueno decidio que tener o no armario/rack es una recomendacion,
  // no algo que deba capar un dominio ni marcarse como hallazgo critico. Igual
  // que servidores, wifi, licenciamiento y vpn: queda como seccion negable sin
  // coste, decision de negocio explicita.
];

// Campos del formulario que mueven la nota, como claves "seccion.campo".
//
// Incluye los campos de cada criterio Y los campos padre de los que cuelga un
// criterio por su `dep`. Marcar solo los criterios diria que "AHay un
// repositorio dedicado?" es inventario, cuando es justo lo contrario: ese campo
// no puntua por si mismo pero decide si puntuan otros tres.
//
// Existe porque en pantalla un desplegable que decide la nota y una casilla de
// numero de serie se ven exactamente igual. El caso que lo destapo: un cliente
// con 108 de 234 campos rellenos y solo un 30% de evidencia, porque lo relleno
// era casi todo inventario.
export const CAMPOS_QUE_PUNTUAN = new Set([
  ...CRITERIOS.map(c => `${c.seccion}.${c.campo}`),
  ...CRITERIOS.filter(c => c.dep).map(c => `${c.seccion}.${c.dep.field}`),
]);

// Campos padre que NO tienen criterio propio: solo deciden si puntuan otros
// (backup.repo_dedicado, servidores.so_familia, licenciamiento.tipo_servicio,
// servidores.tipo, email.proveedor, pcs.moviles). Derivado, no a mano, para
// que un futuro campo padre sin peso propio entre solo por existir.
const CAMPOS_CON_CRITERIO_PROPIO = new Set(CRITERIOS.map(c => `${c.seccion}.${c.campo}`));
export const CAMPOS_PADRE_SIN_CRITERIO = [...new Set(
  CRITERIOS.filter(c => c.dep).map(c => `${c.seccion}.${c.dep.field}`)
)].filter(k => !CAMPOS_CON_CRITERIO_PROPIO.has(k));
