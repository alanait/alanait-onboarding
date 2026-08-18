import { SECTIONS } from './src/sections.js';
import { HINTS } from './src/hints.js';

const out = [];
const P = (...a) => out.push(a.join(' '));

const secById = new Map(SECTIONS.map(s => [s.id, s]));
P('SECCIONES:', SECTIONS.length, '| CAMPOS:', SECTIONS.reduce((n, s) => n + s.fields.length, 0));
P('HINTS:', Object.values(HINTS).reduce((n, h) => n + h.length, 0));

// 1. duplicados de id de campo dentro de una seccion
P('\n== 1. IDs DE CAMPO DUPLICADOS ==');
for (const s of SECTIONS) {
  const vistos = new Map();
  for (const f of s.fields) {
    if (vistos.has(f.id)) P(`  ${s.id}.${f.id} duplicado (grupos: "${vistos.get(f.id).group}" y "${f.group}")`);
    vistos.set(f.id, f);
  }
}

// 2. dep rotos / imposibles
P('\n== 2. DEP ROTOS O IMPOSIBLES ==');
for (const s of SECTIONS) {
  const byId = new Map(s.fields.map(f => [f.id, f]));
  for (const f of s.fields) {
    if (!f.dep) continue;
    const t = byId.get(f.dep.field);
    if (!t) { P(`  ${s.id}.${f.id}: dep.field "${f.dep.field}" NO EXISTE en la seccion`); continue; }
    if (t.options && !t.options.includes(f.dep.value)) {
      P(`  ${s.id}.${f.id}: dep.value "${f.dep.value}" no esta en options de ${t.id} [${t.options.join(' | ')}]`);
    }
    if (!t.options) P(`  ${s.id}.${f.id}: dep sobre campo "${t.id}" de tipo ${t.type} (sin options; comparacion por texto libre)`);
    // dep encadenado: el campo del que depende, depende a su vez de otro
    if (t.dep) P(`  NOTA ${s.id}.${f.id}: dep encadenado sobre ${t.id} que a su vez depende de ${t.dep.field}`);
    // dep cruzando grupos
    if ((f.group || '') !== (t.group || '')) P(`  NOTA ${s.id}.${f.id}: dep cruza de grupo "${t.group}" -> "${f.group}"`);
  }
}

// 3. hints
P('\n== 3. HINTS: anchor / when rotos ==');
for (const [sid, hs] of Object.entries(HINTS)) {
  const s = secById.get(sid);
  if (!s) { P(`  HINTS["${sid}"]: no existe esa seccion en SECTIONS`); continue; }
  const byId = new Map(s.fields.map(f => [f.id, f]));
  const ids = new Set();
  for (const h of hs) {
    if (ids.has(h.id)) P(`  ${sid}: id de hint duplicado "${h.id}"`);
    ids.add(h.id);
    if (!['seguridad', 'legado', 'comercial', 'doc'].includes(h.tipo)) P(`  ${sid}/${h.id}: tipo desconocido "${h.tipo}"`);
    if (h.anchor && !byId.has(h.anchor)) P(`  ROTO ${sid}/${h.id}: anchor "${h.anchor}" NO EXISTE -> el aviso nunca se pinta`);
    if (h.when) {
      const t = byId.get(h.when.field);
      if (!t) { P(`  ROTO ${sid}/${h.id}: when.field "${h.when.field}" NO EXISTE -> nunca se dispara`); continue; }
      const vals = h.when.valueIn ?? [h.when.value];
      if (t.options) {
        const malos = vals.filter(v => !t.options.includes(v));
        if (malos.length) P(`  ROTO ${sid}/${h.id}: when sobre ${t.id}, valores inalcanzables ${JSON.stringify(malos)} (options: ${t.options.join(' | ')})`);
      } else {
        P(`  ${sid}/${h.id}: when sobre campo ${t.id} tipo ${t.type} sin options (${JSON.stringify(vals)})`);
      }
      // el campo del when esta oculto por un dep?
      if (t.dep) P(`  AVISO ${sid}/${h.id}: when depende de ${t.id}, que solo se ve si ${t.dep.field}="${t.dep.value}"`);
    }
    // hint anclado a campo con dep: se pinta aunque el campo este oculto
    if (h.anchor) {
      const a = byId.get(h.anchor);
      if (a?.dep) P(`  AVISO ${sid}/${h.id}: anchor "${h.anchor}" tiene dep (${a.dep.field}="${a.dep.value}"); si el dep no se cumple el campo desaparece pero el aviso sigue`);
      if (a && h.when && h.when.field !== h.anchor) P(`  NOTA ${sid}/${h.id}: anchor=${h.anchor} pero when sobre ${h.when.field}`);
    }
    if (!h.texto || !h.texto.trim()) P(`  ${sid}/${h.id}: texto vacio`);
  }
}

// 4. secciones sin hints
P('\n== 4. SECCIONES SIN HINTS ==');
for (const s of SECTIONS) if (!HINTS[s.id]) P(`  ${s.id} (${s.label}) sin avisos`);

// 5. grupos
P('\n== 5. GRUPOS ==');
for (const s of SECTIONS) {
  const orden = [];
  const grupos = new Map();
  for (const f of s.fields) {
    const g = f.group || '';
    if (!grupos.has(g)) { grupos.set(g, []); orden.push(g); }
    grupos.get(g).push(f);
  }
  const mixto = orden.includes('') && orden.length > 1;
  if (mixto) P(`  ${s.id}: mezcla campos sin grupo con campos agrupados (orden: ${orden.map(g => g || '(sin grupo)').join(' > ')})`);
  // grupo no contiguo
  let prev = null; const vistos = new Set(); const rotos = new Set();
  for (const f of s.fields) {
    const g = f.group || '';
    if (g !== prev) { if (vistos.has(g)) rotos.add(g); vistos.add(g); prev = g; }
  }
  if (rotos.size) P(`  ${s.id}: grupos no contiguos -> ${[...rotos].join(', ')} (se fusionan en la posicion de la primera aparicion)`);
  // grupo cuyos campos son todos condicionales
  for (const [g, fs] of grupos) {
    if (g && fs.every(f => f.dep)) P(`  ${s.id}/"${g}": TODOS los campos son condicionales -> el grupo puede quedar vacio`);
  }
}

// 6. campos sin tipo soportado por fields.jsx
P('\n== 6. TIPOS DE CAMPO ==');
const soportados = new Set(['ip', 'cidr', 'text', 'number', 'select', 'radio', 'checks', 'textarea']);
const tipos = {};
for (const s of SECTIONS) for (const f of s.fields) {
  tipos[f.type] = (tipos[f.type] || 0) + 1;
  if (!soportados.has(f.type)) P(`  ROTO ${s.id}.${f.id}: type "${f.type}" no lo pinta fields.jsx (render vacio)`);
  if ((f.type === 'select' || f.type === 'radio' || f.type === 'checks') && (!f.options || !f.options.length)) P(`  ROTO ${s.id}.${f.id}: ${f.type} sin options`);
}
P('  reparto:', JSON.stringify(tipos));

// 7. campos text con id que fuerza input date
P('\n== 7. CAMPOS QUE fields.jsx CONVIERTE EN <input type=date> POR SU ID ==');
for (const s of SECTIONS) for (const f of s.fields) {
  if ((f.type === 'text' || f.type === 'number') && (f.id.includes('fecha') || f.id.includes('garantia') || f.id.includes('vencimiento'))) {
    P(`  ${s.id}.${f.id} (${f.type}) label="${f.label}" placeholder="${f.placeholder ?? ''}"`);
  }
}

// 8. multi
P('\n== 8. multi / multiLabel ==');
for (const s of SECTIONS) if (!s.multi || !s.multiLabel) P(`  ${s.id}: multi=${s.multi} multiLabel=${s.multiLabel}`);
P('  (buildPrintHTML tiene rama else para !multi: ' + (SECTIONS.every(s => s.multi) ? 'MUERTA, todas son multi' : 'viva') + ')');

// 9. carga de hints por seccion
P('\n== 9. CARGA POR SECCION ==');
for (const s of SECTIONS) {
  const hs = HINTS[s.id] ?? [];
  const sinWhen = hs.filter(h => !h.when).length;
  P(`  ${s.id}: ${s.fields.length} campos, ${hs.length} avisos (${sinWhen} siempre visibles), marcables siempre-visibles: ${hs.filter(h => !h.when && ['seguridad','legado'].includes(h.tipo)).length}`);
}

console.log(out.join('\n'));
