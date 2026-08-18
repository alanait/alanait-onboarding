-- ============================================
-- ALANA IT Onboarding - Supabase Setup
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Tabla de clientes
CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa         TEXT NOT NULL DEFAULT '',
  sector          TEXT DEFAULT '',
  trabajadores    TEXT DEFAULT '',
  sedes           TEXT DEFAULT '',
  contacto        TEXT DEFAULT '',
  telefono        TEXT DEFAULT '',
  email           TEXT DEFAULT '',
  web             TEXT DEFAULT '',
  direccion       TEXT DEFAULT '',
  fecha           TEXT DEFAULT '',
  responsable     TEXT DEFAULT '',
  section_enabled JSONB NOT NULL DEFAULT '{}',
  form_data       JSONB NOT NULL DEFAULT '{}',
  instance_counts JSONB NOT NULL DEFAULT '{}',
  created_by      TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de historial de versiones
CREATE TABLE client_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  snapshot    JSONB NOT NULL,
  changed_by  TEXT DEFAULT '',
  change_note TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_versions_client ON client_versions(client_id, version DESC);

-- 3. Tabla de imagenes
CREATE TABLE client_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  section_id   TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  caption      TEXT DEFAULT '',
  file_name    TEXT DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_images_client_section ON client_images(client_id, section_id);

-- 4. Funcion para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. Row Level Security
--
-- IMPORTANTE: solo el rol "authenticated". El rol "anon" NO debe tener acceso:
-- la anon key va incrustada en el bundle publico de Vercel, asi que cualquier
-- politica con USING (true) sin restringir el rol expone los datos a internet.
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access on clients"
  ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on client_versions"
  ON client_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on client_images"
  ON client_images FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Storage bucket (crear en Storage > New Bucket)
-- Nombre: client-images
-- Public: FALSE
--
-- Si el bucket ya existe y era publico, cerrarlo con supabase-storage-privado.sql
--
-- Un bucket publico permite listar y descargar las capturas sin iniciar sesion,
-- y esas capturas contienen credenciales y datos sensibles de los clientes.
-- Con el bucket privado hay que servir las imagenes con URLs firmadas
-- (createSignedUrl) en vez de getPublicUrl.

CREATE POLICY "Authenticated read client-images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-images');

CREATE POLICY "Authenticated write client-images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-images');

CREATE POLICY "Authenticated delete client-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-images');
