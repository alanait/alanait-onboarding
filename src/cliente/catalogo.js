// Que se le pregunta al cliente en el cuestionario descargable, y que NUNCA.
//
// El cuestionario es para que el cliente adelante datos de INVENTARIO que el
// sabe mejor que nadie (contratos, equipos, impresoras, aplicaciones, servicios
// contratados) y que el tecnico luego revisa y acepta en la ficha. No es una
// auditoria: lo que el cliente dice no es una comprobacion del tecnico.
//
// REGLA FIJA: ningun campo que lea el motor del CiberScore entra aqui como
// dato aplicable. Ni criterios, ni campos de los que se deduce otro, ni senales
// de contradiccion, ni los campos del "no" de una seccion, ni los que disparan
// un aviso de seguridad o de legado. Si el cliente pudiera tocarlos, una
// respuesta suya podria subir la nota, apagar un aviso o cerrar la pregunta de
// la que cuelga un criterio (la ruta de ocultacion de KNOWN_ISSUES A2).
// scripts/test-cuestionario.mjs lo comprueba en cada build, contra el motor
// real, campo a campo y valor a valor.
//
// La unica excepcion son los PADRES declarados en `padres`: campos que no
// puntuan pero deciden que otras preguntas aparecen (tipo de servidor, tipo de
// servicio). Se le preguntan al cliente y SOLO se pueden aplicar a una fila
// nueva, nunca a una que ya existe: en una fila nueva no hay ninguna respuesta
// que esconder, en una existente cambiarlo podria cerrar preguntas ya
// contestadas. En una fila existente con el padre ya decidido, el cliente lo ve
// como texto fijo, no como pregunta.

import { SECTIONS, CAMPOS_CLIENTE, textoOpcion } from "../sections.js";
import { CRITERIOS, CONTRADICCIONES, LITERALES_SIN_COMPROBAR, CAMPOS_PADRE_SIN_CRITERIO, PRECONDICIONES } from "../score/criterios.js";
import { HINTS, TIPOS_HINT } from "../hints.js";

// Sube si cambia el formato del fichero de respuestas, no por anadir campos.
export const VERSION_CUESTIONARIO = 1;

// Datos de la empresa que se le piden. La fecha de la visita y el responsable
// de ALANA no son cosa del cliente.
export const DATOS_EMPRESA = ["empresa", "sector", "trabajadores", "sedes", "contacto", "telefono", "email", "direccion", "web"];

// Por seccion, en el orden de SECTIONS:
//   campos       que se pregunta (salen en el orden del formulario de la app)
//   padres       ver arriba
//   etiquetas    como se le pregunta al CLIENTE: la etiqueta de la app esta
//                escrita para el tecnico ("¿Cual?", "Retencion (detalle)",
//                "Roles principales") y fuera de su sitio no se entiende. El
//                tecnico, al revisar, sigue viendo la etiqueta de la app.
//   textosOpcion como se le ENSENA una opcion al cliente; se guarda la misma.
//   grupos       nombre del apartado para el cliente (el de la app prometia
//                cosas que no se preguntan: "Redes y cifrado" sin cifrado).
//   identificar  con que campos de la ficha se nombra cada fila ("Servidor ·
//                SRV-DC01"). Pueden ser campos que no se preguntan: solo se
//                ensenan. Son tambien la huella con la que se comprueba, al
//                volver, que la fila sigue siendo la misma.
//   ocultarSiFicha  campos que no tocan segun otra respuesta de la ficha que
//                no se pregunta (sin SAI no se pregunta su marca).
//   filaNombre, filaNueva, textoAnadir, textoPrimero  como se llama cada
//                fila y el boton (textoPrimero cuando aun no hay ninguna),
//                escritos enteros: "Impresora nueva", "Otro servidor"... no
//                comparten genero y no se pueden componer.
//   pendiente    lo que queda por comprobar si el tecnico acepta una fila
//                nueva en una seccion que puntua. Solo lo lee el tecnico.
//
// De cada seccion se pregunta el INVENTARIO, nunca la pregunta que puntua: si
// el firewall esta en soporte, el cifrado de la WiFi o el parcheo de un
// servidor los comprueba el tecnico en la visita.
//
// Algunos campos de inventario cuelgan de una pregunta que puntua (la marca
// del firewall solo existe si hay firewall). Esos van con su condicional
// CONGELADO (`depFijo`, calculado en catalogoCliente): el cliente no puede
// cambiar la pregunta de la que cuelgan. Si la ficha la contesta, salen segun
// lo que diga; si no la contesta, se preguntan igual y la respuesta va a las
// notas de la seccion hasta que el tecnico compruebe la pregunta.
//
// `permiteAnadir`: el cliente puede anadir filas (otra impresora, otro
// servidor, la red de otra oficina). En las secciones SIN criterios una fila
// nueva no mueve la nota y llega preseleccionada. En las que tienen criterios
// deja pendiente comprobar lo que puntua de ella (`pendiente`), que es lo
// honesto: nunca sube la nota, y el tecnico la anade fila a fila, sin
// preseleccion. Ordenadores no: sus filas son grupos que hace el tecnico (por
// oficina o por sistema) y al cliente solo se le pide el numero aproximado; con
// el boton, lo natural seria anadir una fila por ordenador.
export const CUESTIONARIO = [
  {
    seccion: "red", titulo: "Internet y red",
    ayuda: "Su contrato de Internet y los equipos de red de la oficina.",
    campos: ["isp", "isp_contrato", "isp_soporte", "isp_fecha_renovacion", "conexion_tipo", "conexion_vel", "ip_publica_tipo",
      "router_marca", "firewall_marca", "firewall_serial", "switches_num", "switches_marca"],
    etiquetas: {
      isp: "Operador de Internet", isp_soporte: "Teléfono o correo de soporte del operador",
      isp_fecha_renovacion: "Fin de permanencia o renovación", ip_publica_tipo: "¿La IP pública es fija o dinámica?",
      router_marca: "Marca y modelo del router", firewall_marca: "Marca y modelo del firewall",
      switches_marca: "Marca y modelo de los switches",
    },
    // Router, firewall y switches en un solo apartado: el firewall solo sale si
    // la ficha dice que lo hay, y un apartado "Router y firewall" sin firewall
    // prometeria una pregunta que no esta.
    grupos: { "Conexión a Internet": "Conexión", "Router y Firewall perimetral": "Equipos de red", "Switching y LAN": "Equipos de red" },
    identificar: ["isp"],
    filaNombre: "Red", filaNueva: "Red de otra oficina", textoAnadir: "+ Añadir la red de otra oficina", textoPrimero: "+ Añadir una red",
    pendiente: "su firewall, los puertos expuestos y los accesos heredados",
    permiteAnadir: true,
  },
  {
    seccion: "servidores", titulo: "Servidores",
    ayuda: "Uno por cada servidor: físico, virtual o en la nube. Añada los que falten.",
    campos: ["nombre", "tipo", "marca", "serial", "roles", "ram", "almacenamiento", "garantia", "so_familia", "so", "hipervisor", "host_fisico"],
    padres: ["tipo", "so_familia"],
    etiquetas: {
      nombre: "Nombre del servidor", tipo: "Tipo de servidor", marca: "Marca y modelo", roles: "¿Para qué se usa?",
      almacenamiento: "Discos o almacenamiento", so: "Versión exacta del sistema (si la sabe)",
      host_fisico: "Servidor físico en el que funciona",
    },
    grupos: { "Identificación": "Datos generales", "Hardware": "Equipo", "Sistema operativo": "Sistema operativo", "Virtualización": "Máquina virtual" },
    textosOpcion: { roles: {
      "Domain Controller": "Controlador de dominio", "File Server": "Servidor de archivos", "App Server": "Servidor de aplicaciones",
      "Print Server": "Servidor de impresión", "Backup Server": "Servidor de copias", "Hypervisor": "Aloja máquinas virtuales",
      "Web Server": "Servidor web", "Terminal Server (RDS)": "Escritorio remoto (RDS)",
    } },
    identificar: ["nombre", "marca"],
    filaNombre: "Servidor", filaNueva: "Servidor nuevo", textoAnadir: "+ Añadir otro servidor", textoPrimero: "+ Añadir un servidor",
    pendiente: "su sistema operativo, el parcheo, el RAID, la garantía y los accesos",
    permiteAnadir: true,
  },
  {
    seccion: "pcs", titulo: "Ordenadores",
    ayuda: "Cuántos ordenadores de trabajo tienen y qué antigüedad, aproximadamente.",
    campos: ["cantidad", "portatiles_num", "antiguedad"],
    etiquetas: { cantidad: "Número aproximado de ordenadores", portatiles_num: "De ellos, portátiles", antiguedad: "Antigüedad media" },
    identificar: ["so"],
    filaNombre: "Grupo de ordenadores",
  },
  {
    seccion: "backup", titulo: "Copias de seguridad",
    ayuda: "Con qué programa se hacen las copias, qué se copia y dónde se guardan.",
    campos: ["software", "backup_cobertura", "retencion", "destino", "backup_endpoints", "herramienta_endpoints", "repo_marca_modelo", "repo_capacidad"],
    etiquetas: {
      software: "Programa de copias", retencion: "¿Cuánto tiempo se guardan las copias?", destino: "¿Dónde se guardan las copias?",
      backup_endpoints: "¿Se hace copia de los ordenadores de los usuarios?", herramienta_endpoints: "¿Con qué programa?",
      repo_marca_modelo: "Marca y modelo del NAS de copias", repo_capacidad: "Capacidad del NAS de copias",
    },
    grupos: { "Solución": "Copias", "Qué se copia y política": "Copias", "Backup de endpoints": "Copias de los ordenadores", "Repositorio de copias": "NAS de copias" },
    identificar: ["software"],
    filaNombre: "Sistema de copias", filaNueva: "Otro sistema de copias", textoAnadir: "+ Añadir otro sistema de copias", textoPrimero: "+ Añadir un sistema de copias",
    pendiente: "la frecuencia, la copia fuera de la oficina y las pruebas de restauración",
    permiteAnadir: true,
  },
  {
    seccion: "email", titulo: "Correo electrónico",
    ayuda: "El dominio de su correo, cuántos buzones tienen y qué plan.",
    campos: ["dominio", "tenant_nombre", "buzones", "plan", "antispam_cual", "backup_correo_solucion"],
    etiquetas: {
      dominio: "Dominio del correo (lo que va detrás de la @)", tenant_nombre: "Tenant de Microsoft 365 (…onmicrosoft.com)",
      plan: "Plan o licencias contratadas", antispam_cual: "¿Qué antispam o filtro de correo usan?",
      backup_correo_solucion: "¿Con qué se hace la copia del correo?",
    },
    grupos: { "Proveedor y dominio": "Dominio y buzones", "Seguridad de acceso": "Protección del correo", "Backup y compartición": "Protección del correo" },
    identificar: ["dominio"],
    filaNombre: "Correo", filaNueva: "Otro dominio de correo", textoAnadir: "+ Añadir otro dominio de correo", textoPrimero: "+ Añadir un dominio de correo",
    pendiente: "el MFA, el SPF/DKIM/DMARC y los administradores del tenant",
    permiteAnadir: true,
  },
  {
    seccion: "antivirus", titulo: "Antivirus",
    ayuda: "Qué antivirus usan y cuándo vence la licencia.",
    campos: ["solucion", "licencias", "vencimiento"],
    etiquetas: { solucion: "Antivirus que usan", vencimiento: "Vencimiento de la licencia" },
    identificar: ["solucion"],
    filaNombre: "Antivirus", filaNueva: "Otro antivirus", textoAnadir: "+ Añadir otro antivirus", textoPrimero: "+ Añadir un antivirus",
    pendiente: "el tipo de solución, su cobertura y quién vigila las alertas",
    permiteAnadir: true,
  },
  {
    seccion: "wifi", titulo: "WiFi",
    ayuda: "Sus redes WiFi y los aparatos que la emiten (puntos de acceso).",
    campos: ["ssids", "invitados", "controlador", "marca", "cantidad", "cobertura"],
    etiquetas: {
      ssids: "Nombres de las redes WiFi", invitados: "¿Tienen una WiFi aparte para invitados?",
      controlador: "¿La WiFi se gestiona desde una consola central?", marca: "Marca de los puntos de acceso",
      cantidad: "Número de puntos de acceso", cobertura: "¿La WiFi llega bien a toda la oficina?",
    },
    textosOpcion: { controlador: { "Sí (cloud)": "Sí, en la nube", "Sí (local)": "Sí, en la oficina", "No, APs autónomos": "No, cada aparato va por su cuenta" } },
    grupos: { "Redes y cifrado": "Redes", "Infraestructura": "Puntos de acceso" },
    identificar: ["ssids"],
    filaNombre: "WiFi", filaNueva: "WiFi de otra oficina", textoAnadir: "+ Añadir la WiFi de otra oficina", textoPrimero: "+ Añadir la WiFi",
    pendiente: "el cifrado, la red de invitados y las contraseñas heredadas",
    permiteAnadir: true,
  },
  {
    seccion: "vpn", titulo: "Acceso remoto (VPN)",
    ayuda: "Si se conectan a la oficina desde fuera: cómo y cuántas personas.",
    campos: ["tipo", "solucion", "usuarios", "uso"],
    etiquetas: { tipo: "Tipo de VPN (si lo sabe)", solucion: "Programa o fabricante de la VPN", usuarios: "¿Cuántas personas se conectan?", uso: "¿Para qué se usa?" },
    identificar: ["solucion"],
    filaNombre: "VPN", filaNueva: "Otra VPN", textoAnadir: "+ Añadir otra VPN", textoPrimero: "+ Añadir una VPN",
    pendiente: "el MFA de la VPN",
    permiteAnadir: true,
  },
  {
    seccion: "sai", titulo: "Armario de comunicaciones y SAI",
    ayuda: "Dónde están los equipos de red y, si tienen, el SAI: la batería que los mantiene encendidos en un corte de luz.",
    campos: ["rack_us", "sala_ubicacion", "marca", "sai_serial", "cantidad", "protegidos", "autonomia", "sai_garantia"],
    etiquetas: {
      rack_us: "Tamaño del armario (en U, si lo sabe)", sala_ubicacion: "¿Dónde está el armario o los equipos de red?", marca: "Marca y modelo del SAI",
      protegidos: "¿Qué equipos protege el SAI?", autonomia: "¿Cuánto aguanta en un corte de luz?",
    },
    textosOpcion: { protegidos: { "Switches core": "Switches principales", "NAS/Almacenamiento": "NAS o almacenamiento" } },
    grupos: { "Armario / Rack": "Armario", "Sala y climatización": "Armario", "SAI / UPS": "SAI" },
    // Si la ficha ya dice que no hay SAI o que no hay armario, no se le
    // pregunta al cliente por su marca ni por su tamano.
    ocultarSiFicha: [
      { campo: "sai_existe", valor: "No", ocultar: ["marca", "sai_serial", "cantidad", "protegidos", "autonomia", "sai_garantia"] },
      { campo: "rack_tipo", valor: "Sin armario (equipos sueltos)", ocultar: ["rack_us"] },
    ],
    identificar: ["sala_ubicacion"],
    filaNombre: "Armario", filaNueva: "Otro armario", textoAnadir: "+ Añadir otro armario", textoPrimero: "+ Añadir un armario o un SAI",
    pendiente: "el SAI, las baterías y la climatización",
    permiteAnadir: true,
  },
  {
    seccion: "almacenamiento", titulo: "Almacenamiento de archivos",
    ayuda: "Dónde guardan los archivos de la empresa: un NAS, un servidor, OneDrive, Google Drive… Uno por cada sistema; añada los que falten.",
    campos: ["proveedor", "marca_modelo", "capacidad", "ubicacion", "acceso_remoto", "sincronizacion"],
    etiquetas: {
      proveedor: "Plataforma o fabricante", marca_modelo: "Marca y modelo (si es un NAS o un servidor)", ubicacion: "¿Dónde está?",
      acceso_remoto: "¿Se accede a los archivos desde fuera de la oficina?", sincronizacion: "¿Los archivos se sincronizan en los ordenadores?",
    },
    textosOpcion: { ubicacion: { "On-premise": "En la oficina", "Cloud": "En la nube", "Híbrido": "En los dos sitios" } },
    identificar: ["tipo", "proveedor", "marca_modelo"],
    filaNombre: "Almacenamiento", filaNueva: "Otro sistema de almacenamiento", textoAnadir: "+ Añadir otro sistema de almacenamiento", textoPrimero: "+ Añadir un sistema de almacenamiento",
    permiteAnadir: true,
  },
  {
    seccion: "telefonia", titulo: "Telefonía",
    ayuda: "Centralita, líneas fijas y móviles de empresa.",
    campos: ["tipo", "proveedor", "extensiones", "centralita", "centralita_tipo", "moviles", "moviles_num"],
    etiquetas: {
      proveedor: "Operador de telefonía", extensiones: "Número de extensiones o líneas", centralita: "¿Tienen centralita?",
      moviles: "¿Tienen móviles de empresa?",
    },
    identificar: ["proveedor", "tipo"],
    filaNombre: "Telefonía", filaNueva: "Otro sistema de telefonía", textoAnadir: "+ Añadir otro sistema de telefonía", textoPrimero: "+ Añadir un sistema de telefonía",
    permiteAnadir: true,
  },
  {
    seccion: "impresion", titulo: "Impresoras",
    ayuda: "Una por cada impresora o multifunción. Añada las que falten.",
    campos: ["marca", "tipo", "ubicacion", "consumibles", "gestion", "proveedor_gestion", "contrato_vencimiento"],
    etiquetas: {
      marca: "Marca y modelo", ubicacion: "¿Dónde está?", consumibles: "Tóner o tinta que usa",
      gestion: "¿Tiene contrato de mantenimiento?", proveedor_gestion: "Empresa de mantenimiento", contrato_vencimiento: "Vencimiento del contrato",
    },
    identificar: ["marca", "ubicacion"],
    filaNombre: "Impresora", filaNueva: "Impresora nueva", textoAnadir: "+ Añadir otra impresora", textoPrimero: "+ Añadir una impresora",
    permiteAnadir: true,
  },
  {
    seccion: "erp", titulo: "Aplicaciones de negocio",
    ayuda: "Programas de gestión que usan: ERP, CRM, contabilidad, facturación, nóminas… Uno por cada programa.",
    campos: ["nombre", "tipo", "proveedor", "version", "licencias", "soporte", "partner", "soporte_contacto"],
    etiquetas: {
      nombre: "Nombre del programa", proveedor: "Fabricante", version: "Versión", licencias: "Número de licencias o usuarios",
      soporte: "¿Tienen soporte del fabricante?", partner: "Empresa que lo instaló o lo mantiene", soporte_contacto: "Contacto de soporte",
    },
    identificar: ["nombre"],
    filaNombre: "Programa", filaNueva: "Programa nuevo", textoAnadir: "+ Añadir otro programa", textoPrimero: "+ Añadir un programa",
    permiteAnadir: true,
  },
  {
    seccion: "licenciamiento", titulo: "Servicios contratados",
    ayuda: "Licencias, dominios, hosting, certificados SSL, servicios en la nube y contratos de mantenimiento. Uno por cada servicio; añada los que falten.",
    campos: ["tipo_servicio", "proveedor", "producto", "tipo_licencia", "cantidad", "partner", "contrato", "fecha_renovacion", "renovacion_automatica", "coste", "dominio_dns_gestion", "cloud_plataforma"],
    padres: ["tipo_servicio"],
    etiquetas: {
      proveedor: "Proveedor o fabricante", producto: "Producto o servicio", partner: "Distribuidor", contrato: "Nº de contrato o referencia",
      renovacion_automatica: "¿Se renueva automáticamente?", dominio_dns_gestion: "¿Dónde se gestionan los DNS del dominio?",
      cloud_plataforma: "Plataforma en la nube",
    },
    grupos: { "Servicio contratado": "Servicio", "Titularidad y renovación": "Renovación y coste", "Detalle del servicio": "Detalle" },
    identificar: ["tipo_servicio", "producto", "proveedor"],
    filaNombre: "Servicio", filaNueva: "Servicio nuevo", textoAnadir: "+ Añadir otro servicio", textoPrimero: "+ Añadir un servicio",
    pendiente: "su titularidad y quién tiene acceso a su panel",
    permiteAnadir: true,
  },
  {
    seccion: "otros_dispositivos", titulo: "Otros dispositivos",
    ayuda: "Terminales de venta, lectores, control de presencia, cámaras… Uno por cada tipo de aparato.",
    campos: ["tipo", "marca", "cantidad", "ubicacion", "conectividad", "software"],
    etiquetas: { tipo: "Tipo de aparato", marca: "Marca y modelo", ubicacion: "¿Dónde está?", conectividad: "¿Cómo se conecta?", software: "Programa que usa" },
    identificar: ["tipo", "marca"],
    filaNombre: "Aparato", filaNueva: "Aparato nuevo", textoAnadir: "+ Añadir otro aparato", textoPrimero: "+ Añadir un aparato",
    permiteAnadir: true,
  },
];

// ── Lo que lee el motor ────────────────────────────────────────────────────
// Derivado del propio modelo, no escrito a mano: el dia que se anada un
// criterio sobre un campo de esta lista, el build falla en vez de dejar que el
// cliente lo conteste.
export function camposQueLeeElMotor() {
  const leidos = new Set();
  const anadir = (s, c) => { if (s && c) leidos.add(`${s}.${c}`); };
  for (const c of CRITERIOS) {
    anadir(c.seccion, c.campo);
    if (c.dep) anadir(c.seccion, c.dep.field);
    if (c.deducibleDe) anadir(c.seccion, c.deducibleDe);
    for (const r of c.redundanteSi ?? []) { anadir(c.seccion, r.campo); anadir(c.seccion, r.dep?.field); }
  }
  for (const k of CONTRADICCIONES) {
    anadir(k.senal.seccion, k.senal.campo);
    if (k.senal.dep) anadir(k.senal.seccion, k.senal.dep.field);
  }
  for (const s of SECTIONS) for (const f of s.fields) if (f.soloSiNo) anadir(s.id, f.id);
  return leidos;
}

// Campos que deciden si sale un aviso marcable (seguridad o legado). Que el
// cliente los contestara podria apagar una tarea que el tecnico tiene que
// comprobar en persona.
export function camposQueDisparanTareas() {
  const salida = new Set();
  for (const [s, lista] of Object.entries(HINTS)) {
    for (const h of lista) {
      if (h.when && TIPOS_HINT[h.tipo]?.marcable) salida.add(`${s}.${h.when.field}`);
    }
  }
  return salida;
}

// Los padres que se pueden preguntar como referencia son solo los que el motor
// lee UNICAMENTE como padres (no tienen criterio propio).
const PADRES_SIN_CRITERIO = new Set(CAMPOS_PADRE_SIN_CRITERIO);
export const esPadrePermitido = (seccion, campo) => PADRES_SIN_CRITERIO.has(`${seccion}.${campo}`);

// Igual que fields.jsx: estos campos de texto se pintan como selector de fecha
// y guardan "AAAA-MM-DD". El cuestionario tiene que guardar el mismo formato.
export const esCampoFecha = (id) => id.includes("fecha") || id.includes("garantia") || id.includes("vencimiento");

const TIPOS_ADMITIDOS = new Set(["text", "number", "select", "radio", "checks"]);
// "No revisado" y "No sabe" cuentan como hueco: para el cliente, no saber algo
// es dejarlo en blanco.
const sinDato = (v) => v === undefined || v === null || v === "" || LITERALES_SIN_COMPROBAR.includes(v) || (Array.isArray(v) && v.length === 0);

/**
 * El catalogo resuelto contra el esquema. Tipos, opciones y condicionales salen
 * de SECTIONS en cada llamada, asi que una opcion anadida llega sola al
 * cuestionario. Los campos salen en el orden del formulario de la app.
 *
 * Cada campo lleva dos etiquetas: `label`, la que lee el cliente, y `labelApp`,
 * la del formulario, que es la que ve el tecnico al revisar. Lo mismo con las
 * opciones: `opciones` como las lee el cliente, `opcionesApp` como en la ficha.
 *
 * Las opciones de "no comprobado" ("No revisado", "No sabe") se quitan: para el
 * cliente, no saber algo es dejarlo en blanco, y no se puede convertir en una
 * respuesta.
 */
export function catalogoCliente() {
  const empresa = DATOS_EMPRESA.map(id => {
    const c = CAMPOS_CLIENTE.find(x => x.id === id);
    return { id, label: c.label, placeholder: c.placeholder ?? "" };
  });
  const secciones = CUESTIONARIO.map(entrada => {
    const sec = SECTIONS.find(s => s.id === entrada.seccion);
    const padres = new Set(entrada.padres ?? []);
    const posicion = (id) => sec.fields.findIndex(x => x.id === id);
    const campos = [...entrada.campos].sort((a, b) => posicion(a) - posicion(b)).map(id => {
      const f = sec.fields.find(x => x.id === id);
      const tipo = esCampoFecha(id) && f.type === "text" ? "date" : f.type;
      const textos = entrada.textosOpcion?.[id] ?? {};
      const validas = (f.options ?? []).filter(o => !LITERALES_SIN_COMPROBAR.includes(o));
      return {
        id,
        label: entrada.etiquetas?.[id] ?? f.label,
        labelApp: f.label,
        tipo,
        placeholder: f.placeholder ?? "",
        grupo: entrada.grupos?.[f.group] ?? f.group ?? "",
        opciones: validas.map(o => ({ v: o, t: textos[o] ?? textoOpcion(f, o) })),
        opcionesApp: validas.map(o => ({ v: o, t: textoOpcion(f, o) })),
        dep: f.dep ? { field: f.dep.field, value: f.dep.value } : null,
        // La pregunta de la que cuelga no se le hace al cliente (casi siempre
        // porque puntua). Si la ficha la contesta, el campo sale o no segun lo
        // que diga; si no la contesta, se pregunta igual, y lo que responda el
        // cliente va a las NOTAS de la seccion, no al campo: escribirlo en el
        // campo seria un valor que nadie ve, y abrir la pregunta para que se
        // vea seria contestar por el cliente algo que puntua.
        depFijo: !!f.dep && !entrada.campos.includes(f.dep.field),
        depEtiqueta: f.dep ? sec.fields.find(x => x.id === f.dep.field)?.label ?? f.dep.field : null,
        padre: padres.has(id),
      };
    });
    const filaNombre = entrada.filaNombre ?? sec.multiLabel ?? sec.label;
    return {
      seccion: sec.id,
      titulo: entrada.titulo ?? sec.label,
      tituloFicha: sec.label,
      ayuda: entrada.ayuda ?? "",
      filaNombre,
      // Sin valor por defecto con genero: las secciones que permiten anadir
      // los declaran (lo exige test-cuestionario).
      filaNueva: entrada.filaNueva ?? filaNombre,
      textoAnadir: entrada.textoAnadir ?? "+ Añadir",
      textoPrimero: entrada.textoPrimero ?? entrada.textoAnadir ?? "+ Añadir",
      pendiente: entrada.pendiente ?? "lo que puntúa de esta fila",
      permiteAnadir: !!entrada.permiteAnadir,
      ocultarSiFicha: entrada.ocultarSiFicha ?? [],
      campos,
    };
  });
  return { empresa, secciones };
}

// Una instancia esta vacia si no tiene ningun valor fuera de los campos del
// "no". Mira TODOS los campos de la seccion, no solo los del cuestionario: una
// fila con un criterio contestado no esta vacia aunque el cliente no vea nada.
export function instanciaVacia(formData, seccion, idx) {
  const sec = SECTIONS.find(s => s.id === seccion);
  const datos = formData?.[seccion]?.[idx] ?? {};
  return sec.fields.every(f => f.soloSiNo || sinDato(datos[f.id]));
}

// Una huella sin ningun identificador no distingue una fila de otra: solo vale
// para comprobar que la fila sigue en su sitio, nunca para buscarla en otro.
export function huellaConDatos(huella) {
  try { const v = JSON.parse(huella); return Array.isArray(v) && v.some(x => typeof x === "string" && x !== ""); }
  catch { return false; }
}

/**
 * Como se nombra una fila con lo que ya hay en la ficha ("SRV-DC01 · Dell
 * PowerEdge"), y su huella: los mismos valores en crudo. La huella viaja con el
 * cuestionario y vuelve con las respuestas; si al volver la fila de la ficha
 * ya no tiene esa huella (el tecnico la borro o la cambio mientras el
 * cuestionario estaba fuera), las respuestas no se aplican a ciegas a la fila
 * que ahora ocupa ese numero.
 */
export function identificadorFila(seccion, leer) {
  const entrada = CUESTIONARIO.find(e => e.seccion === seccion);
  const sec = SECTIONS.find(s => s.id === seccion);
  const ids = entrada?.identificar ?? [];
  const crudos = ids.map(id => {
    const v = leer(id);
    return sinDato(v) ? "" : (Array.isArray(v) ? v.join(", ") : String(v));
  });
  const textos = ids.map((id, i) => crudos[i] ? textoOpcion(sec.fields.find(x => x.id === id), crudos[i]) : "").filter(Boolean);
  return { titulo: textos.slice(0, 2).join(" · "), huella: JSON.stringify(crudos) };
}

// Para los guardarrailes: que tipos de campo pueden ir en el cuestionario.
export const tipoAdmitido = (f) => TIPOS_ADMITIDOS.has(f.type);

// Secciones cuyo "no" es un hallazgo critico (precondicion: red, equipos,
// correo, antivirus, copias). Si estan en "no", lo que diga el cliente no puede
// pasarlas a "si": quitaria el hallazgo y subiria la nota solo con su palabra.
// Si de verdad lo tienen, lo comprueba y lo cambia el tecnico en la ficha.
const CON_PRECONDICION = new Set(PRECONDICIONES.filter(p => p.cuando === "no").map(p => p.seccion));
export const esHallazgoSiNo = (seccion) => CON_PRECONDICION.has(seccion);

// Para comparar con lo que contesta el cliente: un "No revisado" de la ficha
// es un hueco, igual que cuando se le envia.
export const valorFicha = (v) => sinDato(v) ? "" : v;
