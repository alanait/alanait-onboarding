// Que se le pregunta al cliente en el cuestionario descargable, y que NUNCA.
//
// El cuestionario es para que el cliente adelante datos de INVENTARIO que el
// sabe mejor que nadie (contratos, impresoras, aplicaciones, servicios
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
// puntuan pero deciden que otras preguntas aparecen (licenciamiento.
// tipo_servicio). Se le preguntan al cliente como referencia y SOLO se pueden
// aplicar a una fila nueva, nunca a una que ya existe: en una fila nueva no hay
// ninguna respuesta que esconder, en una existente cambiarlo podria cerrar
// preguntas ya contestadas.

import { SECTIONS, CAMPOS_CLIENTE, textoOpcion } from "../sections.js";
import { CRITERIOS, CONTRADICCIONES, LITERALES_SIN_COMPROBAR, CAMPOS_PADRE_SIN_CRITERIO, PRECONDICIONES } from "../score/criterios.js";
import { HINTS, TIPOS_HINT } from "../hints.js";

// Sube si cambia el formato del fichero de respuestas, no por anadir campos.
export const VERSION_CUESTIONARIO = 1;

// Datos de la empresa que se le piden. La fecha de la visita y el responsable
// de ALANA no son cosa del cliente.
export const DATOS_EMPRESA = ["empresa", "sector", "trabajadores", "sedes", "contacto", "telefono", "email", "direccion", "web"];

// Por seccion: que campos, si puede anadir filas, y un titulo y una ayuda
// escritos para alguien que no es tecnico. En el orden de SECTIONS.
//
// De cada seccion se pregunta el INVENTARIO (marcas, modelos, numeros de
// serie, nombres, cantidades, garantias), nunca la pregunta que puntua: si el
// firewall esta en soporte, el cifrado de la WiFi o el parcheo de un servidor
// los comprueba el tecnico en la visita.
//
// Algunos campos de inventario cuelgan de una pregunta que puntua (la marca
// del firewall solo existe si hay firewall). Esos van con su condicional
// CONGELADO (`depFijo`, calculado en catalogoCliente): salen segun lo que ya
// dice la ficha, y el cliente no puede cambiar la pregunta de la que cuelgan.
//
// `permiteAnadir` en secciones SIN criterios (una fila nueva no mueve la nota)
// y, a proposito, en licenciamiento y servidores: que el cliente liste sus
// dominios, licencias y servidores es lo que mas valor tiene. Una fila nueva
// ahi deja pendiente comprobar lo que puntua de ella, que es lo honesto, y el
// tecnico la anade fila a fila, nunca en bloque.
export const CUESTIONARIO = [
  {
    seccion: "red", titulo: "Internet y red",
    ayuda: "Su contrato de Internet, el router, el firewall y los switches.",
    campos: ["isp", "isp_contrato", "isp_soporte", "isp_fecha_renovacion", "conexion_tipo", "conexion_vel", "ip_publica_tipo",
      "router_marca", "firewall_marca", "firewall_serial", "switches_num", "switches_marca"],
  },
  {
    seccion: "servidores", titulo: "Servidores",
    ayuda: "Una ficha por servidor, físico o virtual. Añada los que falten.",
    campos: ["nombre", "tipo", "marca", "serial", "roles", "ram", "almacenamiento", "garantia", "so_familia", "so",
      "hipervisor", "version_hipervisor", "host_fisico", "cluster", "nombre_cluster"],
    padres: ["tipo", "so_familia"],
    permiteAnadir: true,
  },
  {
    seccion: "pcs", titulo: "Ordenadores",
    ayuda: "Cuántos equipos de trabajo tienen y qué antigüedad, aproximadamente.",
    campos: ["cantidad", "portatiles_num", "antiguedad"],
  },
  {
    seccion: "backup", titulo: "Copias de seguridad",
    ayuda: "Qué programa hace las copias, qué se copia y adónde van.",
    campos: ["software", "backup_cobertura", "destino", "retencion", "backup_endpoints", "herramienta_endpoints", "repo_marca_modelo", "repo_capacidad"],
  },
  {
    seccion: "email", titulo: "Correo electrónico",
    ayuda: "El dominio de su correo, cuántos buzones tienen y con qué lo protegen.",
    campos: ["dominio", "tenant_nombre", "buzones", "plan", "antispam_cual", "backup_correo_solucion"],
  },
  {
    seccion: "antivirus", titulo: "Antivirus",
    ayuda: "Qué antivirus usan y cuándo vence la licencia.",
    campos: ["solucion", "licencias", "vencimiento"],
  },
  {
    seccion: "wifi", titulo: "WiFi",
    ayuda: "Sus redes WiFi y los puntos de acceso.",
    campos: ["ssids", "invitados", "controlador", "marca", "cantidad", "cobertura"],
  },
  {
    seccion: "vpn", titulo: "Acceso remoto (VPN)",
    ayuda: "Cómo se conectan a la oficina desde fuera.",
    campos: ["tipo", "solucion", "usuarios", "uso"],
  },
  {
    seccion: "sai", titulo: "Armario de comunicaciones y SAI",
    ayuda: "Dónde están los equipos de red y el SAI (la batería) que los protege de los cortes de luz.",
    campos: ["sala_ubicacion", "rack_us", "marca", "sai_serial", "cantidad", "autonomia", "sai_garantia", "protegidos"],
  },
  {
    seccion: "almacenamiento", titulo: "Almacenamiento de archivos",
    ayuda: "Dónde guardan los archivos: NAS, servidor, OneDrive, Google Drive… Uno por cada sistema.",
    campos: ["proveedor", "marca_modelo", "capacidad", "ubicacion", "sincronizacion", "acceso_remoto"],
    permiteAnadir: true,
  },
  {
    seccion: "telefonia", titulo: "Telefonía",
    ayuda: "Centralita, líneas fijas y móviles de empresa.",
    campos: ["tipo", "proveedor", "extensiones", "centralita", "centralita_tipo", "moviles", "moviles_num"],
    permiteAnadir: true,
  },
  {
    seccion: "impresion", titulo: "Impresoras",
    ayuda: "Una ficha por impresora o multifunción. Añada las que falten.",
    campos: ["marca", "tipo", "ubicacion", "consumibles", "gestion", "proveedor_gestion", "contrato_vencimiento"],
    permiteAnadir: true,
  },
  {
    seccion: "erp", titulo: "Aplicaciones de negocio",
    ayuda: "Programas de gestión que usan: ERP, CRM, contabilidad, facturación, nóminas…",
    campos: ["nombre", "tipo", "proveedor", "version", "licencias", "soporte", "partner", "soporte_contacto"],
    permiteAnadir: true,
  },
  {
    seccion: "licenciamiento", titulo: "Servicios contratados",
    ayuda: "Licencias, dominios, hosting, certificados SSL, servicios en la nube y contratos de mantenimiento. Una ficha por cada uno.",
    campos: ["tipo_servicio", "proveedor", "producto", "tipo_licencia", "cantidad", "partner", "contrato", "fecha_renovacion", "renovacion_automatica", "coste", "dominio_dns_gestion", "cloud_plataforma"],
    padres: ["tipo_servicio"],
    permiteAnadir: true,
  },
  {
    seccion: "otros_dispositivos", titulo: "Otros dispositivos",
    ayuda: "Terminales de venta, lectores, control de presencia, cámaras…",
    campos: ["tipo", "marca", "cantidad", "ubicacion", "conectividad", "software"],
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

/**
 * El catalogo resuelto contra el esquema: etiquetas, tipos, opciones y
 * condicionales salen de SECTIONS en cada llamada, asi que una etiqueta nueva o
 * una opcion anadida llega sola al cuestionario.
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
    const campos = entrada.campos.map(id => {
      const f = sec.fields.find(x => x.id === id);
      const tipo = esCampoFecha(id) && f.type === "text" ? "date" : f.type;
      return {
        id,
        label: f.label,
        tipo,
        placeholder: f.placeholder ?? "",
        grupo: f.group ?? "",
        opciones: (f.options ?? []).filter(o => !LITERALES_SIN_COMPROBAR.includes(o)).map(o => ({ v: o, t: textoOpcion(f, o) })),
        dep: f.dep ? { field: f.dep.field, value: f.dep.value } : null,
        // La pregunta de la que cuelga no se le hace al cliente (casi siempre
        // porque puntua): el campo sale o no segun lo que ya dice la ficha.
        depFijo: !!f.dep && !entrada.campos.includes(f.dep.field),
        padre: padres.has(id),
      };
    });
    return {
      seccion: sec.id,
      titulo: entrada.titulo ?? sec.label,
      ayuda: entrada.ayuda ?? "",
      etiquetaFila: sec.multiLabel ?? "Elemento",
      permiteAnadir: !!entrada.permiteAnadir,
      campos,
    };
  });
  return { empresa, secciones };
}

// Para los guardarrailes: que tipos de campo pueden ir en el cuestionario.
export const tipoAdmitido = (f) => TIPOS_ADMITIDOS.has(f.type);

// Secciones cuyo "no" es un hallazgo critico (precondicion: red, equipos,
// correo, antivirus, copias). Si estan en "no", lo que diga el cliente no puede
// pasarlas a "si": quitaria el hallazgo y subiria la nota solo con su palabra.
// Si de verdad lo tienen, lo comprueba y lo cambia el tecnico en la ficha.
const CON_PRECONDICION = new Set(PRECONDICIONES.filter(p => p.cuando === "no").map(p => p.seccion));
export const esHallazgoSiNo = (seccion) => CON_PRECONDICION.has(seccion);
