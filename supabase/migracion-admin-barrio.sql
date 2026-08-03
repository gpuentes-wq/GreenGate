-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Migración: ORIGEN del prestador + vista prestador_directorio
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase. Es idempotente (no rompe si
-- ya existe). Ver docs/spec-administracion.md y docs/spec-jardinero.md.
-- ════════════════════════════════════════════════════════════════════════

-- Distingue cómo se originó el alta del prestador: autoregistro / alta
-- por administración / recomendado por un propietario.
alter table prestador add column if not exists origen text not null default 'autoregistro';

-- Se vuelve a crear la vista sumando disponible_urgencia y origen al final
-- (mismas columnas existentes, mismo orden — no rompe los select('*') que
-- ya usan AdminPanel.tsx y PropietarioDirectorio.tsx).
create or replace view prestador_directorio as
select
  p.id,
  p.nombre,
  p.apellido,
  p.razon_social,
  p.es_empresa,
  p.tipo_servicio_principal,
  p.zona_preferente,
  p.horario_trabajo,
  p.descripcion,
  p.foto_url,
  p.condicion_fiscal,
  p.activo,
  (select round(avg(puntaje)::numeric, 2) from valoracion where prestador_id = p.id) as puntaje_promedio,
  (select count(*) from valoracion where prestador_id = p.id)                        as cantidad_valoraciones,
  p.disponible_urgencia,
  p.origen
from prestador p;
