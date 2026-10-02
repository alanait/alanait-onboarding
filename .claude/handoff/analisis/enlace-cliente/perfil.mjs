// La ruta al repositorio se deriva de la posicion del fichero: vale en cualquier clon.
const SRC = new URL('../../../../src/', import.meta.url);
const { SECTIONS } = await import(new URL('sections.js', SRC).href);
const { CAMPOS_QUE_PUNTUAN } = await import(new URL('score/criterios.js', SRC).href);
const P = {
 red:['isp','isp_contrato','isp_soporte','isp_fecha_renovacion','conexion_tipo','conexion_vel'],
 email:['dominio','buzones','plan'],
 antivirus:['solucion','licencias','vencimiento'],
 pcs:['cantidad','portatiles_num'],
 telefonia:['tipo','proveedor','extensiones','centralita','centralita_tipo','moviles','moviles_num'],
 impresion:['marca','tipo','ubicacion','consumibles','gestion','proveedor_gestion','contrato_vencimiento'],
 erp:['nombre','tipo','proveedor','version','licencias','soporte','partner','soporte_contacto'],
 licenciamiento:['proveedor','producto','tipo_licencia','cantidad','partner','contrato','fecha_renovacion','coste','dominio_dns_gestion','cloud_plataforma'],
 otros_dispositivos:['tipo','marca','cantidad','ubicacion','conectividad','software'],
};
let n=0; const tipos={};
for (const [s, fs] of Object.entries(P)) { const sec = SECTIONS.find(x=>x.id===s); for (const fid of fs) { n++; const f = sec.fields.find(x=>x.id===fid); if(!f){console.log('NO EXISTE',s,fid);continue;} tipos[f.type]=(tipos[f.type]||0)+1; if (f.dep) console.log('dep', s+'.'+fid, '<-', f.dep.field, JSON.stringify(f.dep.value), 'padre en perfil:', fs.includes(f.dep.field), 'padre puntua:', CAMPOS_QUE_PUNTUAN.has(s+'.'+f.dep.field)); if (sec.depSeccion) {} } console.log(s, 'depSeccion:', JSON.stringify(sec.depSeccion||null), 'soloSiNo:', sec.fields.filter(f=>f.soloSiNo).length) }
console.log('total', n, tipos);
