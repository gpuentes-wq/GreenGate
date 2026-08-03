-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Migración: PRESTADOR_SUGERIDO (leads que recomienda un propietario)
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase. Es idempotente (no rompe si
-- ya existe). Si un propietario no encuentra a quien busca en el listado de
-- su barrio, puede proponer un prestador nuevo. Queda como lead para que
-- administración lo contacte y lo pase por el proceso de verificación —
-- no se suma automáticamente al directorio del barrio.
-- Ver docs/spec-propietario.md (pantalla "Listado de jardineros").
-- ════════════════════════════════════════════════════════════════════════

create table if not exists prestador_sugerido (
  id                        uuid primary key default gen_random_uuid(),
  barrio_id                 uuid references barrio(id) on delete set null,
  propietario_contacto_nombre  text,
  propietario_contacto_celular text,
  nombre_sugerido           text not null,
  contacto_sugerido         text,
  notas                     text,
  created_at                timestamptz not null default now()
);

create index if not exists idx_prestador_sugerido_barrio on prestador_sugerido(barrio_id);

-- Modo piloto (sin login): lectura/escritura con la clave anon.
alter table prestador_sugerido disable row level security;
grant select, insert, update, delete on prestador_sugerido to anon, authenticated;

-- Belt-and-suspenders: si RLS quedara activado igual, esta política permite el acceso.
drop policy if exists piloto_prestador_sugerido on prestador_sugerido;
create policy piloto_prestador_sugerido on prestador_sugerido for all to anon, authenticated using (true) with check (true);
