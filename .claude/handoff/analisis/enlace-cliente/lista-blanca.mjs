// Deriva la lista blanca de campos que un enlace de cliente podria exponer, y
// mide que parte del "inventario" no es inerte: senales de CONTRADICCIONES
// (mueven `fiable`) y disparadores de avisos (seguridad/legado/comercial/doc).
// La ruta al repositorio se deriva de la posicion del fichero: vale en cualquier clon.
const SRC = new URL('../../../../src/', import.meta.url);
const { SECTIONS } = await import(new URL('sections.js', SRC).href);
const { CAMPOS_QUE_PUNTUAN, CONTRADICCIONES, PRECONDICIONES } = await import(new URL('score/criterios.js', SRC).href);
const { HINTS } = await import(new URL('hints.js', SRC).href);

const senales = new Set(CONTRADICCIONES.map(c => `${c.senal.seccion}.${c.senal.campo}`));
const disparadores = new Map(); // campo -> {tipo: n}
for (const [sid, lista] of Object.entries(HINTS)) {
  for (const h of lista) {
    if (!h.when) continue;
    const k = `${sid}.${h.when.field}`;
    const m = disparadores.get(k) ?? {};
    m[h.tipo] = (m[h.tipo] ?? 0) + 1;
    disparadores.set(k, m);
  }
}
const inventario = [];
for (const s of SECTIONS) for (const f of s.fields) {
  const k = `${s.id}.${f.id}`;
  if (f.soloSiNo || CAMPOS_QUE_PUNTUAN.has(k) || f.type === 'textarea') continue;
  inventario.push({ k, f, s });
}
const conSenal = inventario.filter(x => senales.has(x.k)).map(x => x.k);
const conAviso = inventario.filter(x => disparadores.has(x.k)).map(x => `${x.k} ${JSON.stringify(disparadores.get(x.k))}`);
const conAvisoSegLeg = inventario.filter(x => { const d = disparadores.get(x.k); return d && (d.seguridad || d.legado); }).map(x => x.k);
console.log('Inventario (no puntua, no notas, no soloSiNo):', inventario.length);
console.log('  de ellos senal de CONTRADICCION (mueven fiable):', conSenal.length, conSenal);
console.log('  de ellos disparan algun aviso:', conAviso.length);
for (const l of conAviso) console.log('    ', l);
console.log('  de ellos disparan aviso de seguridad o legado:', conAvisoSegLeg.length, conAvisoSegLeg);
const inerte = inventario.filter(x => !senales.has(x.k) && !disparadores.has(x.k));
console.log('Inventario INERTE (ni nota, ni fiable, ni avisos):', inerte.length);
const porSec = {};
for (const x of inerte) (porSec[x.s.id] ??= []).push(x.f.id);
for (const [s, l] of Object.entries(porSec)) console.log(`  [${s}] ${l.length}: ${l.join(', ')}`);
console.log('Senales de contradiccion que SI puntuan:', [...senales].filter(k => CAMPOS_QUE_PUNTUAN.has(k)));
console.log('Precondiciones:', PRECONDICIONES.map(p => p.seccion));
// Campos comerciales: que campos disparan avisos comerciales (internos)
const comerciales = [];
for (const [sid, lista] of Object.entries(HINTS)) for (const h of lista) if (h.tipo === 'comercial') comerciales.push(`${sid}.${h.when?.field ?? '(siempre)'}=${JSON.stringify(h.when?.value ?? h.when?.valueIn ?? '')}`);
console.log('Avisos comerciales (', comerciales.length, '):', comerciales.join(' | '));
