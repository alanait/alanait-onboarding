// Lo que reporta el dueno: no marcar nada en antivirus/backup puntua MEJOR que
// marcar "No". Mide las tres entradas del mismo motor.
import { clientePerfecto, puntuar, FECHA } from "./arnes-capadores.mjs";

const clon = (x) => JSON.parse(JSON.stringify(x));

const caso = (seccion, estado) => {
  const c = clon(clientePerfecto());
  if (estado === "sin_decidir") { delete c.sectionEnabled[seccion]; delete c.formData[seccion]; }
  else if (estado === "no") { c.sectionEnabled[seccion] = "no"; c.formData[seccion] = { 0: {} }; }
  // "si" = como viene del cliente perfecto, contestado entero
  return puntuar(c, FECHA);
};

const fila = (etiqueta, r, dominio) => {
  const d = r.dominios.find(x => x.id === dominio);
  console.log(
    etiqueta.padEnd(34),
    "nota", String(r.nota).padStart(3),
    "| evidencia", String(r.evidencia).padStart(3) + "%",
    "| fiable", String(r.fiable).padEnd(5),
    "| dominio", String(d?.nota).padStart(4),
    "| pesoAplicable", String(d?.pesoAplicable).padStart(2),
    "| hallazgos", r.hallazgos.length,
  );
};

for (const [seccion, dominio] of [["antivirus", "puestos"], ["backup", "backup"], ["email", "correo"], ["red", "perimetro"], ["pcs", "puestos"]]) {
  console.log(`\n── ${seccion.toUpperCase()} (dominio ${dominio}) — todo lo demas perfecto ──`);
  fila('contestada entera ("si")', caso(seccion, "si"), dominio);
  fila('declarada "No" (la verdad)', caso(seccion, "no"), dominio);
  fila("SIN DECIDIR (no se toca)", caso(seccion, "sin_decidir"), dominio);
  const no = caso(seccion, "no").nota, cero = caso(seccion, "sin_decidir").nota;
  console.log(`   >>> ventaja de NO TOCAR frente a decir la verdad: ${cero - no >= 0 ? "+" : ""}${cero - no} puntos`);
}

// Y el caso que se ve en la captura: varias secciones sin decidir a la vez.
console.log("\n── Varias secciones sin decidir a la vez ──");
const varias = clon(clientePerfecto());
for (const s of ["antivirus", "backup", "licenciamiento", "sai", "vpn", "wifi"]) {
  delete varias.sectionEnabled[s]; delete varias.formData[s];
}
const r = puntuar(varias, FECHA);
console.log(`   6 secciones sin decidir -> nota ${r.nota}, evidencia ${r.evidencia}%, fiable ${r.fiable}`);
console.log(`   sinResponder: ${r.sinResponder.join(", ")}`);
console.log(`   peso de dominio que sigue en el reparto: ${r.dominios.filter(d => d.evaluable).map(d => d.id + ":" + d.peso).join(" ")}`);
console.log();
