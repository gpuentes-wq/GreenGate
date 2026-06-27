-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Migración: tabla de SOLICITUDES de contacto (propietario → prestador)
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase. Es idempotente (no rompe si
-- ya existe). Cierra el círculo: el propietario deja sus datos y al jardinero
-- le llega la solicitud para aceptar o rechazar.
-- ════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_solicitud') then
    create type estado_solicitud as enum ('pendiente', 'aceptada', 'rechazada');
  end if;
end $$;

create table if not exists solicitud (
  id               uuid primary key default gen_random_uuid(),
  prestador_id     uuid not null references prestador(id) on delete cascade,
  propietario_id   uuid references propietario(id) on delete set null,
  barrio_id        uuid references barrio(id) on delete set null,
  contacto_nombre  text,
  contacto_celular text,
  mensaje          text,
  estado           estado_solicitud not null default 'pendiente',
  created_at       timestamptz not null default now()
);

create index if not exists idx_solicitud_prestador on solicitud(prestador_id);

-- Modo piloto (sin login): lectura/escritura con la clave anon.
alter table solicitud disable row level security;
grant select, insert, update, delete on solicitud to anon, authenticated;
