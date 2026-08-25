// Si castigaramos el silencio, la escapatoria obvia seria marcar "si" y no
// contestar nada. Mide cuanto vale hoy esa cuarta entrada.
import { clientePerfecto, puntuar, FECHA } from "./arnes-capadores.mjs";

const clon = (x) => JSON.parse(JSON.stringify(x));

const caso = (seccion, estado) => {
  const c = clon(clientePerfecto());
  if (estado === "sin_decidir") { delete c.sectionEnabled[seccion]; delete c.formData[seccion]; }
  else if (estado === "no") { c.sectionEnabled[seccion] = "no"; c.formData[seccion] = { 0: {} }; }
  else if (estado === "si_vacio") { c.sectionEnabled[seccion] = "si"; c.formData[seccion] = { 0: {} }; }
  return puntuar(c, FECHA);
};

console.log("\nLas CUATRO entradas posibles, cliente perfecto en todo lo demas:\n");
console.log("seccion      contestada   'si' y VACIA   sin decidir   'No' (verdad)   pendientes con 'si' vacia");
console.log("-".repeat(100));
for (const s of ["antivirus", "backup", "email", "red", "pcs"]) {
  const a = caso(s, "si"), b = caso(s, "si_vacio"), c = caso(s, "sin_decidir"), d = caso(s, "no");
  console.log(
    s.padEnd(12),
    String(a.nota).padStart(6),
    String(b.nota).padStart(14),
    String(c.nota).padStart(13),
    String(d.nota).padStart(15),
    String(b.capadoresPendientes.length).padStart(20),
    ` (evid ${String(b.evidencia).padStart(3)}% / ${String(c.evidencia).padStart(3)}%)`,
  );
}
console.log(`
Lectura: la columna "'si' y VACIA" es la escapatoria que aparecerian si el
silencio pasara a costar. Si esa columna ya es alta HOY, castigar el silencio
solo mueve el atajo de sitio, que es la ley de A0-bis.
`);
