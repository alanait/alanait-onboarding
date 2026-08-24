import { supabase, isSupabaseConfigured } from './supabase.js';
import { registrarEvento } from './auditoria.js';

// Get current user email
async function getUserEmail() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.email || '';
  } catch { return ''; }
}

// Vigencia de las URLs firmadas de las capturas: una jornada de trabajo. Se
// generan al abrir el cliente, asi que basta con que cubran la sesion de
// edicion mas larga razonable. Subirla no aporta nada y alarga la ventana en
// la que una URL filtrada sigue sirviendo.
const VIGENCIA_URL_IMAGEN = 8 * 60 * 60; // segundos

// ─── Helpers ──────────────────────────────────────────

function base64ToBlob(dataUrl) {
  const [header, b64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function mimeToExt(mime) {
  const map = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
  return map[mime] || 'png';
}

// ─── List clients (dashboard) ─────────────────────────

export async function listClients() {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('clients')
    .select('id, empresa, sector, trabajadores, contacto, responsable, fecha, updated_at, created_by')
    .order('updated_at', { ascending: false });
  if (error) { console.error('listClients error:', error); return []; }
  return data || [];
}

// ─── Search clients ───────────────────────────────────

export async function searchClients(query) {
  if (!isSupabaseConfigured() || !query) return listClients();
  const q = `%${query}%`;
  const { data, error } = await supabase
    .from('clients')
    .select('id, empresa, sector, trabajadores, contacto, responsable, fecha, updated_at, created_by')
    .or(`empresa.ilike.${q},sector.ilike.${q},contacto.ilike.${q},responsable.ilike.${q}`)
    .order('updated_at', { ascending: false });
  if (error) { console.error('searchClients error:', error); return []; }
  return data || [];
}

// ─── Save client (create or update) ──────────────────

export async function saveClient(id, { clientData, sectionEnabled, formData, instanceCounts, sectionImages }) {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');

  const row = {
    empresa: clientData.empresa || '',
    sector: clientData.sector || '',
    trabajadores: clientData.trabajadores || '',
    sedes: clientData.sedes || '',
    contacto: clientData.contacto || '',
    telefono: clientData.telefono || '',
    email: clientData.email || '',
    web: clientData.web || '',
    direccion: clientData.direccion || '',
    fecha: clientData.fecha || '',
    responsable: clientData.responsable || '',
    section_enabled: sectionEnabled || {},
    form_data: formData || {},
    instance_counts: instanceCounts || {},
  };

  let clientId = id;

  if (clientId) {
    // Create version snapshot BEFORE updating.
    // La autoria es el usuario autenticado, no el campo de texto "Responsable"
    // del formulario (que es el tecnico asignado al cliente, no quien edita).
    //
    // ESTA LLAMADA ESTA CONDENADA, PERO NO SE QUITA TODAVIA. Cuando se ejecute
    // supabase-auditoria.sql, la version la creara un trigger AFTER UPDATE -con
    // el autor correcto, que aqui esta mal: se etiqueta la version con quien la
    // SOBREESCRIBE, no con quien la escribio- y el `revoke insert` de ese mismo
    // SQL hara que esta linea falle en silencio, que es inofensivo porque no se
    // comprueba su error.
    //
    // Se deja para que la app funcione igual EN LOS DOS ORDENES: si el SQL aun
    // no se ha ejecutado, esto sigue siendo lo unico que crea el historial, y
    // quitarlo antes de tiempo dejaria una ventana sin historial de versiones.
    // Retirarla en cuanto el SQL este confirmado en produccion.
    await createVersionSnapshot(clientId, await getUserEmail() || clientData.responsable || '');

    const { error } = await supabase.from('clients').update(row).eq('id', clientId);
    if (error) throw error;
  } else {
    // Set created_by on first save
    row.created_by = await getUserEmail();
    const { data, error } = await supabase.from('clients').insert(row).select('id').single();
    if (error) throw error;
    clientId = data.id;
  }

  // Sync images. Si falla, la ficha del cliente YA esta guardada: hay que
  // avisar del fallo sin perder el id, para que reintentar actualice el mismo
  // cliente en vez de crear uno duplicado.
  try {
    await syncImages(clientId, sectionImages || {});
  } catch (err) {
    err.clientId = clientId;
    throw err;
  }

  return clientId;
}

// ─── Load client ─────────────────────────────────────

export async function loadClient(id) {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');

  const { data: client, error } = await supabase.from('clients').select('*').eq('id', id).single();
  if (error) throw error;

  // Load images
  const { data: images } = await supabase
    .from('client_images')
    .select('*')
    .eq('client_id', id)
    .order('section_id')
    .order('sort_order');

  // URLs firmadas, no publicas. Las capturas contienen credenciales y datos
  // sensibles de los clientes: con el bucket publico cualquiera que conociera
  // o adivinara una ruta podia descargarlas sin iniciar sesion. Se piden en
  // lote (una sola llamada) y caducan solas.
  const rutas = (images || []).map(i => i.storage_path);
  const firmadas = new Map();
  if (rutas.length) {
    const { data: urls, error: errUrl } = await supabase.storage
      .from('client-images')
      .createSignedUrls(rutas, VIGENCIA_URL_IMAGEN);
    if (errUrl) console.error('createSignedUrls error:', errUrl);
    for (const u of (urls || [])) {
      if (u.signedUrl) firmadas.set(u.path, u.signedUrl);
    }
  }

  const sectionImages = {};
  for (const img of (images || [])) {
    if (!sectionImages[img.section_id]) sectionImages[img.section_id] = [];
    sectionImages[img.section_id].push({
      src: firmadas.get(img.storage_path) || '',
      caption: img.caption || '',
      name: img.file_name || '',
      _storageId: img.id,
      _storagePath: img.storage_path,
    });
  }

  // Abrir una ficha es el acceso que ningun trigger puede ver: no muta nada.
  // Se declara aqui y no en App.jsx porque es el unico punto por el que pasa la
  // lectura completa del cliente. Sin await: el tecnico no espera a la traza.
  registrarEvento('ficha_abierta', {
    clientId: id,
    empresa: client.empresa,
    detalle: { capturas: (images || []).length },
  });

  return {
    id: client.id,
    clientData: {
      empresa: client.empresa, sector: client.sector, trabajadores: client.trabajadores,
      sedes: client.sedes, contacto: client.contacto, telefono: client.telefono,
      email: client.email, web: client.web, direccion: client.direccion,
      fecha: client.fecha, responsable: client.responsable,
    },
    sectionEnabled: client.section_enabled || {},
    formData: client.form_data || {},
    instanceCounts: client.instance_counts || {},
    sectionImages,
  };
}

// ─── Delete client ───────────────────────────────────

export async function deleteClient(id) {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');

  // Delete storage files first
  const { data: images } = await supabase.from('client_images').select('storage_path').eq('client_id', id);
  if (images?.length) {
    const paths = images.map(i => i.storage_path);
    await supabase.storage.from('client-images').remove(paths);
  }

  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

// ─── Version history ─────────────────────────────────

async function createVersionSnapshot(clientId, changedBy) {
  // Get current state
  const { data: current } = await supabase.from('clients').select('*').eq('id', clientId).single();
  if (!current) return;

  // Get next version number
  const { data: versions } = await supabase
    .from('client_versions')
    .select('version')
    .eq('client_id', clientId)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = ((versions?.[0]?.version) || 0) + 1;

  const snapshot = {
    clientData: {
      empresa: current.empresa, sector: current.sector, trabajadores: current.trabajadores,
      sedes: current.sedes, contacto: current.contacto, telefono: current.telefono,
      email: current.email, web: current.web, direccion: current.direccion,
      fecha: current.fecha, responsable: current.responsable,
    },
    sectionEnabled: current.section_enabled,
    formData: current.form_data,
    instanceCounts: current.instance_counts,
  };

  await supabase.from('client_versions').insert({
    client_id: clientId,
    version: nextVersion,
    snapshot,
    changed_by: changedBy,
  });
}

export async function getVersions(clientId) {
  if (!isSupabaseConfigured()) return [];

  // `changed_by` guarda a quien SOBREESCRIBIO la version, no a quien la
  // escribio: es un desfase de uno, y la pantalla lo imprimia como "Guardado
  // por X", que es falso. `author_email` + `author_origin` traen la autoria
  // buena; las llegadas antes de supabase-auditoria.sql quedan marcadas como
  // reconstruidas o indeterminadas en vez de reinterpretarse a la brava.
  //
  // Se piden en dos pasos porque las columnas nuevas solo existen despues de
  // ejecutar ese SQL, y pedir una columna inexistente no devuelve null: hace
  // fallar la consulta entera y dejaria la pantalla de historial en blanco.
  const conAutoria = await supabase
    .from('client_versions')
    .select('id, version, changed_by, created_at, author_email, author_origin')
    .eq('client_id', clientId)
    .order('version', { ascending: false });
  if (!conAutoria.error) return conAutoria.data || [];

  const { data, error } = await supabase
    .from('client_versions')
    .select('id, version, changed_by, created_at')
    .eq('client_id', clientId)
    .order('version', { ascending: false });
  if (error) { console.error('getVersions error:', error); return []; }
  return data || [];
}

export async function loadVersion(versionId) {
  if (!isSupabaseConfigured()) throw new Error('Supabase no configurado');
  const { data, error } = await supabase.from('client_versions').select('snapshot').eq('id', versionId).single();
  if (error) throw error;
  return data.snapshot;
}

// ─── Image sync ──────────────────────────────────────

async function syncImages(clientId, sectionImages) {
  // Get existing images from DB
  const { data: existing } = await supabase
    .from('client_images')
    .select('id, storage_path, section_id, sort_order')
    .eq('client_id', clientId);

  const existingPaths = new Set((existing || []).map(e => e.storage_path));
  const newPaths = new Set();
  // Una subida fallida NO puede desaparecer en silencio: antes, si `upload`
  // fallaba, la imagen simplemente no se anadia a newPaths ni a la tabla, y
  // saveClient devolvia exito igual. El tecnico veia "Guardado" con una
  // captura -a veces con credenciales o datos bancarios- perdida para siempre.
  const fallos = [];

  // Upload new images, track all current paths
  for (const [sectionId, images] of Object.entries(sectionImages)) {
    for (let i = 0; i < images.length; i++) {
      const img = images[i];

      if (img._storagePath) {
        // Already in storage
        newPaths.add(img._storagePath);
        // Update caption/order if changed
        await supabase.from('client_images')
          .update({ caption: img.caption || '', sort_order: i })
          .eq('id', img._storageId);
      } else if (img.src && img.src.startsWith('data:')) {
        // New base64 image - upload to storage
        const blob = base64ToBlob(img.src);
        const ext = mimeToExt(blob.type);
        const path = `${clientId}/${sectionId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from('client-images')
          .upload(path, blob, { contentType: blob.type });

        if (!uploadErr) {
          newPaths.add(path);
          await supabase.from('client_images').insert({
            client_id: clientId,
            section_id: sectionId,
            storage_path: path,
            caption: img.caption || '',
            file_name: img.name || '',
            sort_order: i,
          });
        } else {
          fallos.push(img.name || `imagen ${i + 1} de ${sectionId}`);
        }
      }
    }
  }

  // Delete removed images. Se hace igual aunque haya fallos arriba: lo que si
  // se pudo sincronizar no debe quedarse a medias por lo que no se pudo.
  for (const ex of (existing || [])) {
    if (!newPaths.has(ex.storage_path)) {
      await supabase.storage.from('client-images').remove([ex.storage_path]);
      await supabase.from('client_images').delete().eq('id', ex.id);
    }
  }

  if (fallos.length) {
    throw new Error(`No se pudieron subir ${fallos.length} captura${fallos.length > 1 ? "s" : ""}: ${fallos.join(", ")}. El resto del cliente sí se ha guardado; vuelve a intentarlo para esa${fallos.length > 1 ? "s" : ""} imagen${fallos.length > 1 ? "es" : ""}.`);
  }
}

// ─── Import .alanait file to Supabase ────────────────

export async function importFromFile(fileData) {
  return saveClient(null, {
    clientData: fileData.clientData || {},
    sectionEnabled: fileData.sectionEnabled || {},
    formData: fileData.formData || {},
    instanceCounts: fileData.instanceCounts || {},
    sectionImages: fileData.sectionImages || {},
  });
}

// ─── Imagenes para .alanait (con base64, no URLs firmadas) ──
//
// Las URLs firmadas del bucket caducan a las 8 horas: un .alanait exportado
// con esas URLs se rompe en cuanto caducan. Recibe las imagenes que esten EN
// PANTALLA -no las vuelve a leer de la nube- para que "Exportar a local"
// exporte siempre lo que el tecnico esta viendo, con cambios sin guardar
// incluidos.
export async function resolveImagesToBase64(sectionImages) {
  const resultado = {};
  for (const [sectionId, images] of Object.entries(sectionImages || {})) {
    resultado[sectionId] = [];
    for (const img of images) {
      let src = img.src;
      // Si ya es una URL (no base64), se descarga y se convierte.
      if (src && !src.startsWith('data:')) {
        try {
          const resp = await fetch(src);
          const blob = await resp.blob();
          src = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch {
          src = img.src; // fallback
        }
      }
      resultado[sectionId].push({ src, caption: img.caption, name: img.name });
    }
  }
  return resultado;
}
