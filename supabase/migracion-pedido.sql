-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Migración: PEDIDO y cotización en la solicitud
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase. Es idempotente.
--
-- Hasta ahora `solicitud` era 1 propietario → 1 prestador, sin monto: cuando
-- el propietario elegía tres jardineros se creaban tres filas sueltas, sin
-- nada que las relacionara y sin un número que comparar.
--
-- El flujo diseñado en docs/spec-propietario.md es
--   1 pedido → N prestadores elegidos → N presupuestos comparables → 1 elegido
-- así que el concepto se parte en dos:
--
--   pedido    → la necesidad del propietario (una sola, con su descripción)
--   solicitud → la cotización de CADA prestador para ese pedido
--
-- Esta migración NO incluye el detalle estructurado que arma la IA
-- (detalle_estructurado jsonb, fotos_urls): se suma cuando el flujo de IA
-- esté conectado. Lo que sí queda es el lugar donde va a colgarse.
-- ════════════════════════════════════════════════════════════════════════

-- ── Tabla nueva: pedido ────────────────────────────────────────────────
create table if not exists pedido (
  id               uuid primary key default gen_random_uuid(),
  propietario_id   uuid references propietario(id) on delete set null,
  barrio_id        uuid references barrio(id) on delete set null,
  lote_id          uuid references lote(id) on delete set null,
  tipo_servicio    tipo_servicio not null default 'jardineria',
  descripcion      text,
  -- Sin login todavía: el propietario se identifica por estos datos, que son
  -- los mismos que ya pedía el modal de presupuesto.
  contacto_nombre  text,
  contacto_celular text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_pedido_barrio on pedido(barrio_id);

-- ── solicitud pasa a ser la cotización de un prestador para un pedido ──
alter table solicitud add column if not exists pedido_id uuid references pedido(id) on delete cascade;
alter table solicitud add column if not exists monto_presupuestado numeric(12,2);

create index if not exists idx_solicitud_pedido on solicitud(pedido_id);

-- Modo piloto (sin login): mismas reglas que el resto de las tablas.
alter table pedido disable row level security;
grant select, insert, update, delete on pedido to anon, authenticated;

drop policy if exists piloto_pedido on pedido;
create policy piloto_pedido on pedido for all to anon, authenticated using (true) with check (true);

-- ── Comprobación ───────────────────────────────────────────────────────
select column_name, data_type
  from information_schema.columns
 where table_name = 'solicitud'
   and column_name in ('pedido_id', 'monto_presupuestado');
