// Prototipo del guardarrail que necesitaria un enlace de cliente:
// para cada campo candidato a la lista blanca, barrer TODOS sus valores
// posibles (opciones, vacio, texto, arrays) sobre el cliente perfecto (con y sin
// los campos deducibles contestados) y sobre las 5 fichas de ejemplo, y exigir
// que computeScore devuelva EXACTAMENTE lo mismo: nota, fiable, evidencia,
// motivoNoFiable, hallazgos, contradicciones, capadores pendientes.
//
// Compara ENTRADAS DISTINTAS DEL MISMO MOTOR, que es la regla del proyecto.
// Se ejecuta desde la raiz del repo: node .claude/handoff/analisis/enlace-cliente/barrido-inercia.mjs
const R = new URL('../../../../', import.meta.url);
const H = await import(new URL('.claude/handoff/analisis/arnes-capadores.mjs', R).href);
const { SECTIONS } = await import(new URL('src/sections.js', R).href);
const { CAMPOS_QUE_PUNTUAN, CONTRADICCIONES } = await import(new URL('src/score/criterios.js', R).href);

const firma = (r) => JSON.stringify({
  nota: r.nota, fiable: r.fiable, ev: r.evidencia, m: r.motivoNoFiable,
  h: (r.hallazgos ?? []).map(h => h.id ?? h.criterio ?? h.titular).sort(),
  c: (r.contradicciones ?? []).map(c => c.id ?? c).sort(),
  p: (r.capadoresPendientes ?? []).length,
  d: (r.dominios ?? []).map(d => `${d.id}:${d.nota}`).join(','),
});

// Candidatos: lo que una lista blanca "ingenua" derivaria por exclusion.
const candidatos = [];
for (const s of SECTIONS) for (const f of s.fields) {
  const k = `${s.id}.${f.id}`;
  if (f.soloSiNo || CAMPOS_QUE_PUNTUAN.has(k) || f.type === 'textarea') continue;
  candidatos.push({ s, f, k });
}

const valoresDe = (f) => {
  if (f.type === 'checks') return [[], [f.options[0]], [...f.options]];
  if (f.options) return ['', ...f.options];
  if (f.type === 'number') return ['', '0', '7'];
  return ['', 'texto libre', 'Windows 11'];
};

const perfecto = H.clientePerfecto();
const perfectoSinSoporte = H.clientePerfecto();
perfectoSinSoporte.formData.pcs[0].so_soporte = '';
for (const sec of ['servidores']) perfectoSinSoporte.formData[sec][0].so_soporte = '';
// Bases con secciones declarables NEGADAS (con motivo): es ahi donde las
// senales de CONTRADICCIONES actuan, y sin ellas el barrido no las ve.
const negadas = H.clientePerfecto();
for (const s of ['servidores', 'wifi', 'vpn', 'licenciamiento']) {
  negadas.sectionEnabled[s] = 'no';
  negadas.formData[s] = { 0: { sin_servicio_motivo: 'Otro (indicar)', sin_servicio_detalle: 'x' } };
}
const bases = [
  { nombre: 'perfecto', fecha: '2026-10-01', cliente: perfecto },
  { nombre: 'perfecto-sin-so_soporte', fecha: '2026-10-01', cliente: perfectoSinSoporte },
  { nombre: 'perfecto-con-4-negadas', fecha: '2026-10-01', cliente: negadas },
  ...H.fichasEjemplo().map(f => ({ nombre: f.fichero, fecha: f.fecha, cliente: f.cliente })),
];

const clonar = (x) => JSON.parse(JSON.stringify(x));
const mueven = new Map();
let pruebas = 0;
for (const { s, f, k } of candidatos) {
  for (const b of bases) {
    const n = b.cliente.instanceCounts?.[s.id] ?? 1;
    for (let i = 0; i < n; i++) {
      const firmas = new Set();
      for (const v of valoresDe(f)) {
        const x = clonar(b.cliente);
        x.formData[s.id] ??= {};
        x.formData[s.id][i] ??= {};
        x.formData[s.id][i][f.id] = v;
        firmas.add(firma(H.puntuar(x, b.fecha)));
        pruebas++;
      }
      if (firmas.size > 1) {
        const m = mueven.get(k) ?? new Set();
        m.add(b.nombre);
        mueven.set(k, m);
      }
    }
  }
}
console.log(`Candidatos: ${candidatos.length}  bases: ${bases.length}  evaluaciones: ${pruebas}`);
console.log(`Campos "de inventario" que SI cambian la salida del motor: ${mueven.size}`);
for (const [k, b] of mueven) console.log(`  ${k}  <- en: ${[...b].join(', ')}`);
const senales = new Set(CONTRADICCIONES.map(c => `${c.senal.seccion}.${c.senal.campo}`));
console.log('Senales de contradiccion entre los candidatos:', candidatos.filter(c => senales.has(c.k)).map(c => c.k));
