import { computeScore } from "../src/score/computeScore.js";
import { CRITERIOS, PRECONDICIONES } from "../src/score/criterios.js";

const run = (sectionEnabled, formData, instanceCounts = {}) =>
  computeScore({ criterios: CRITERIOS, precondiciones: PRECONDICIONES, sectionEnabled, formData, instanceCounts });

const pinta = (t, r) => {
  console.log("\n" + t);
  console.log("  nota " + r.nota + " (" + (r.tramo?.etiqueta ?? "-") + ")" + (r.capadaGlobal ? " [capada]" : "") + "  cobertura " + r.cobertura + "%");
  for (const d of r.dominios.filter(x => x.evaluable)) {
    console.log("    " + String(d.nota).padStart(3) + "  " + d.nombre + (d.capado ? "  [capado]" : "") + "  (" + d.criteriosEvaluados + " criterios)");
  }
  if (r.hallazgos.length) console.log("    hallazgos criticos: " + r.hallazgos.length);
};

// ── Cliente en mal estado, del tipo que motiva el proyecto ────────────────
pinta("Cliente heredado sin sanear", run(
  { red: "si", servidores: "si", pcs: "si", backup: "si", email: "si", antivirus: "si", wifi: "si", sai: "si" },
  {
    red: { 0: { firewall: "Sí", firewall_soporte: "Fuera de soporte (EOL)", firewall_gestion: "Sin gestión activa",
                rdp_expuesto: "Sí", utm: "No", vlans: "No", accesos_heredados: "Pendiente de revocar",
                nat_reglas: "Existen sin documentar", vpns_auditadas: "Pendiente de auditar" } },
    servidores: { 0: { tipo: "Físico", so_familia: "Windows Server", so_windows_server: "Windows Server 2012 R2",
                       so_soporte: "Fuera de soporte (EOL)", raid_estado: "Degradado (disco en fallo)",
                       accesos_heredados: "Pendiente de revocar", so_licencia_titular: "A nombre del proveedor anterior" } },
    pcs: { 0: { so_soporte: "Fuera de soporte (EOL)", cifrado_portatiles: "No activo",
                admin_local: "Todos son administradores", accesos_heredados: "Pendiente de revocar" } },
    backup: { 0: { offsite: "No", inmutabilidad: "No", ultimo_job: "Con errores", pruebas: "Nunca" } },
    email: { 0: { proveedor: "Microsoft 365", mfa: "No", spf: "No existe", dkim: "No existe", dmarc: "No existe",
                  admins_heredados: "Pendiente de revocar" } },
    antivirus: { 0: { tipo: "Antivirus básico", cobertura: "Solo algunos equipos" } },
    wifi: { 0: { cifrado: "WPA2-PSK", invitados_aislado: "Con acceso a la LAN", password_heredada: "Pendiente de cambiar" } },
    sai: { 0: { sai_existe: "No", rack_cerrado: "Abierto / sin puertas" } },
  }));

// ── Cliente bien llevado ─────────────────────────────────────────────────
pinta("Cliente bien mantenido", run(
  { red: "si", servidores: "si", backup: "si", email: "si", antivirus: "si" },
  {
    red: { 0: { firewall: "Sí", firewall_soporte: "En soporte", firewall_gestion: "Autogestionado",
                rdp_expuesto: "No", utm: "Sí", vlans: "Sí", accesos_heredados: "Revocados",
                nat_reglas: "Documentadas", vpns_auditadas: "Auditadas" } },
    servidores: { 0: { tipo: "Virtual", so_soporte: "En soporte", so_parcheo: "Al día",
                       accesos_heredados: "Revocados", so_licencia_titular: "A nombre del cliente" } },
    backup: { 0: { offsite: "Sí", inmutabilidad: "Sí, copias inmutables (WORM / object lock)",
                   ultimo_job: "Correctas", pruebas: "Sí", prueba_resultado: "Correcta" } },
    email: { 0: { proveedor: "Microsoft 365", mfa: "Sí", spf: "Correcto", dkim: "Configurado y firmando",
                  dmarc: "p=reject", admins_heredados: "Revocados" } },
    antivirus: { 0: { tipo: "MDR gestionado", cobertura: "Todos los equipos" } },
  }));

// ── Sin backup: el cap global ────────────────────────────────────────────
pinta("Todo perfecto pero SIN backup", run(
  { red: "si", backup: "no" },
  { red: { 0: { firewall: "Sí", firewall_soporte: "En soporte", firewall_gestion: "Autogestionado",
                rdp_expuesto: "No", utm: "Sí", vlans: "Sí", accesos_heredados: "Revocados",
                nat_reglas: "Documentadas", vpns_auditadas: "Auditadas" } } }));

// ── El incentivo perverso que encontro el verificador ────────────────────
console.log("\nIncentivo perverso (debe estar corregido)");
const base = { backup: "si" };
const enBlanco = run(base, { backup: { 0: { pruebas: "Nunca", offsite: "Sí", ultimo_job: "Correctas" } } });
const honesto = run(base, { backup: { 0: { pruebas: "Nunca", prueba_resultado: "Fallida", offsite: "Sí", ultimo_job: "Correctas" } } });
const b1 = enBlanco.dominios.find(d => d.id === "backup").nota;
const b2 = honesto.dominios.find(d => d.id === "backup").nota;
console.log("  dejando el resultado en blanco: " + b1);
console.log("  contestando 'Fallida':          " + b2);
console.log("  " + (b2 <= b1 ? "ok   contestar nunca puntua mejor que callar" : "FALLO callar puntua mejor"));
process.exit(b2 <= b1 ? 0 : 1);
