-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Migración: INTEGRANTES de un prestador-equipo
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase. Es idempotente (no rompe si
-- ya existe). Permite que un prestador sea un equipo de personas (no
-- necesariamente una empresa formal): la identidad pública/comercial sigue
-- siendo la del prestador, pero antecedentes e identidad se verifican por
-- integrante — son datos de una persona, no de un nombre comercial. El
-- seguro/ART queda a nivel del prestador (compartido por todo el equipo).
--
-- Un prestador unipersonal NO necesita filas en integrante: sigue
-- funcionando exactamente igual que hasta ahora.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists integrante (
  id            uuid primary key default gen_random_uuid(),
  prestador_id  uuid not null references prestador(id) on delete cascade,
  nombre        text not null,
  apellido      text,
  documento     text,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'verificacion' and column_name = 'integrante_id'
  ) then
    alter table verificacion add column integrante_id uuid references integrante(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_integrante_prestador on integrante(prestador_id);
create index if not exists idx_verificacion_integrante on verificacion(integrante_id);

-- Limpieza de la vista: ya no expone antecedentes_ok/seguro_ok/identidad_ok
-- (esos booleans no contemplaban equipos y ninguna pantalla los usa hoy;
-- src/verificacion.ts es la única fuente de verdad).
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
  (select count(*) from valoracion where prestador_id = p.id)                        as cantidad_valoraciones
from prestador p;

-- Trigger de updated_at, igual que el resto de las tablas.
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_integrante_updated') then
    create trigger trg_integrante_updated before update on integrante
      for each row execute function set_updated_at();
  end if;
end $$;

-- Modo piloto (sin login): lectura/escritura con la clave anon, igual que el resto.
alter table integrante disable row level security;
grant select, insert, update, delete on integrante to anon, authenticated;
drop policy if exists piloto_integrante on integrante;
create policy piloto_integrante on integrante for all to anon, authenticated using (true) with check (true);

-- ════════════════════════════════════════════════════════════════════════
-- OPCIONAL · Datos de ejemplo: convertir "Jardines del Norte" en equipo
-- ════════════════════════════════════════════════════════════════════════
-- Solo para VER la funcionalidad andando con datos reales, sin tocar nada
-- de lo que ya cargaste manualmente. Usa ids fijos (seguro de correr más
-- de una vez, no duplica). Las verificaciones de antecedentes/identidad
-- que "Jardines del Norte" ya tenía a nivel prestador quedan sin usarse a
-- partir de ahora (con integrantes, esos dos tipos se evalúan por
-- persona) — no hace falta borrarlas, son inofensivas.
insert into integrante (id, prestador_id, nombre, apellido, documento, activo) values
  ('f1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'Diego', 'Pereyra', '28444555', true),
  ('f1000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'Martín', 'Sosa', '30222111', true)
on conflict (id) do nothing;

insert into verificacion (id, prestador_id, integrante_id, tipo, estado, fecha_emision, fecha_vencimiento, validado_por, validado_en) values
  -- Diego (integrante fundador): al día.
  ('f2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'antecedentes_penales', 'verificado', '2025-11-10', '2026-11-10', 'a0000000-0000-0000-0000-000000000001', now()),
  ('f2000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'identidad',            'verificado', '2025-11-10', null,         'a0000000-0000-0000-0000-000000000001', now()),
  -- Martín (se sumó hace poco): identidad ok, antecedentes todavía pendientes.
  ('f2000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', 'antecedentes_penales', 'pendiente',  null,         null,         null, null),
  ('f2000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', 'identidad',            'verificado', '2026-06-01', null,         'a0000000-0000-0000-0000-000000000001', now())
on conflict (id) do nothing;
