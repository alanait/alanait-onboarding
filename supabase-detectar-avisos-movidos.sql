-- ─────────────────────────────────────────────────────────────────────────────
-- Detectar fichas afectadas por el fallo de reindexarHints (18/08 - 01/10/2026)
--
-- SOLO LECTURA: no modifica nada. Se ejecuta en el SQL Editor de Supabase.
--
-- Que paso: al pulsar "Eliminar" en una instancia de CUALQUIER seccion, la app
-- reindexaba las marcas de avisos (Hecho / Pendiente / N/A) de TODAS las
-- secciones. Se perdia la marca de la posicion borrada en todas ellas y las
-- de posiciones posteriores subian un puesto, cerrando tareas de la instancia
-- equivocada. Entro en ffd550a (18/08/2026) y se corrige en la rama
-- fix/reindexar-hints-por-seccion.
--
-- Como se detecta: cada guardado deja una instantanea en client_versions con
-- instanceCounts y formData.__hints__. Una ficha es candidata si entre dos
-- estados consecutivos BAJA el numero de instancias de alguna seccion (alguien
-- borro una) Y cambian las marcas de avisos. La ultima fila de cada cliente es
-- su estado actual en la tabla clients.
--
-- Que hacer con cada candidata: abrir el Historial de la ficha, mirar la
-- version anterior al borrado y volver a poner a mano las marcas que se
-- movieron. NO restaurar la version entera: se perderia todo lo hecho despues.
-- ─────────────────────────────────────────────────────────────────────────────

WITH estados AS (
  SELECT client_id,
         version,
         created_at,
         snapshot -> 'instanceCounts'          AS instancias,
         snapshot -> 'formData' -> '__hints__' AS avisos
  FROM client_versions
  UNION ALL
  SELECT id,
         2147483647,                          -- el estado actual va el ultimo
         updated_at,
         instance_counts,
         form_data -> '__hints__'
  FROM clients
),
pares AS (
  SELECT client_id,
         version,
         created_at,
         instancias,
         avisos,
         LAG(version)    OVER w AS version_anterior,
         LAG(instancias) OVER w AS instancias_antes,
         LAG(avisos)     OVER w AS avisos_antes
  FROM estados
  WINDOW w AS (PARTITION BY client_id ORDER BY version)
)
SELECT c.empresa,
       p.client_id,
       p.version_anterior,
       CASE WHEN p.version = 2147483647 THEN 'actual' ELSE p.version::text END AS version,
       p.created_at,
       s.key                                  AS seccion_con_borrado,
       s.value::int                           AS instancias_antes,
       COALESCE((p.instancias ->> s.key)::int, 1) AS instancias_despues
FROM pares p
JOIN clients c ON c.id = p.client_id
CROSS JOIN LATERAL jsonb_each_text(COALESCE(p.instancias_antes, '{}'::jsonb)) s
WHERE p.instancias_antes IS NOT NULL
  AND s.value ~ '^[0-9]+$'
  AND COALESCE(p.instancias ->> s.key, '1') ~ '^[0-9]+$'
  AND COALESCE((p.instancias ->> s.key)::int, 1) < s.value::int
  AND p.avisos IS DISTINCT FROM p.avisos_antes
  AND p.created_at >= '2026-08-18'
ORDER BY c.empresa, p.created_at;
