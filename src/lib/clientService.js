import { supabase, isSupabaseConfigured } from './supabase.js';

// Get current user email
function getCurrentUserEmail() {
  try {
    const session = supabase?.auth?.session?.() || null;
    // For newer supabase-js versions
    return supabase?.auth?.getUser?.()?.then(r => r.data?.user?.email) || '';
  } catch { return ''; }
}

async function getUserEmail() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.email || '';
  } catch { return ''; }
}

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
    // Create version snapshot BEFORE updating
    await createVersionSnapshot(clientId, clientData.responsable || '');

    const { error } = await supabase.from('clients').update(row).eq('id', clientId);
    if (error) throw error;
  } else {
    // Set created_by on first save
    row.created_by = await getUserEmail();
    const { data, error } = await supabase.from('clients').insert(row).select('id').single();
    if (error) throw error;
    clientId = data.id;
  }

  // Sync images
  await syncImages(clientId, sectionImages || {});

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

  // Build sectionImages object matching frontend format
  const sectionImages = {};
  for (const img of (images || [])) {
    if (!sectionImages[img.section_id]) sectionImages[img.section_id] = [];
    const { data: urlData } = supabase.storage.from('client-images').getPublicUrl(img.storage_path);
    sectionImages[img.section_id].push({
      src: urlData.publicUrl,
      caption: img.caption || '',
      name: img.file_name || '',
      _storageId: img.id,
      _storagePath: img.storage_path,
    });
  }

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
        }
      }
    }
  }

  // Delete removed images
  for (const ex of (existing || [])) {
    if (!newPaths.has(ex.storage_path)) {
      await supabase.storage.from('client-images').remove([ex.storage_path]);
      await supabase.from('client_images').delete().eq('id', ex.id);
    }
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

// ─── Export to .alanait format (with base64 images) ──

export async function exportToFile(id) {
  const client = await loadClient(id);

  // Convert storage URLs back to base64 for the file
  const sectionImages = {};
  for (const [sectionId, images] of Object.entries(client.sectionImages || {})) {
    sectionImages[sectionId] = [];
    for (const img of images) {
      let src = img.src;
      // If it's a URL (not base64), fetch and convert
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
      sectionImages[sectionId].push({ src, caption: img.caption, name: img.name });
    }
  }

  return {
    clientData: client.clientData,
    sectionEnabled: client.sectionEnabled,
    formData: client.formData,
    instanceCounts: client.instanceCounts,
    sectionImages,
  };
}
