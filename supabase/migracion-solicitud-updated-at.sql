-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Migración: solicitud registra CUÁNDO cambió
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase. Es idempotente y aditiva.
--
-- Hasta ahora `solicitud` guardaba en qué estado está, pero no desde cuándo.
-- Eso alcanzaba mientras el panel del jardinero solo contaba pendientes, que
-- no necesitan fecha: están o no están.
--
-- Deja de alcanzar para avisar novedades. Un "te eligieron" o un "lo dieron de
-- baja" son noticias, y una noticia sin fecha no se puede apagar: el aviso
-- quedaría prendido para siempre y el bloque dejaría de significar algo.
--
-- El aviso de bajas hoy se apoya en pedido.cancelado_en, que es un rodeo: mira
-- la fecha del pedido para saber cuándo cambió la solicitud. Con esta columna
-- cada solicitud dice lo suyo, y "te eligieron" —que no tenía ninguna fecha de
-- dónde colgarse— también se puede acotar.
--
-- Se llama updated_at y no actualizado_en para seguir la convención del resto
-- del esquema, donde las ocho tablas con historial ya usan ese nombre.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1) La función, por las dudas ────────────────────────────────────────
-- Ya existe (schema.sql), pero se redefine igual: así esta migración corre
-- sola contra una base que se haya armado por partes.
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── 2) La columna, en tres pasos y no en uno ────────────────────────────
-- Agregarla directamente con `not null default now()` estamparía la fecha de
-- HOY en todas las filas viejas. Cada solicitud ya elegida o ya cancelada
-- pasaría a parecer recién cambiada, y el panel del jardinero le mostraría
-- como novedad algo que pasó hace un mes.
--
-- Por eso se agrega nullable, se rellena con created_at —la única fecha real
-- que tenemos de esas filas— y recién ahí se le ponen las restricciones.
alter table solicitud add column if not exists updated_at timestamptz;

update solicitud set updated_at = created_at where updated_at is null;

alter table solicitud alter column updated_at set default now();
alter table solicitud alter column updated_at set not null;

-- ── 3) El trigger ───────────────────────────────────────────────────────
-- Se engancha el mismo que ya usan administracion, barrio, propietario, lote,
-- prestador, integrante, verificacion y trabajo.
--
-- Va por trigger y no desde la app a propósito: hoy hay tres lugares que
-- escriben en solicitud y mañana habrá más. Con el trigger, cualquier update
-- queda fechado, incluso uno hecho a mano desde el SQL Editor.
drop trigger if exists trg_solicitud_updated on solicitud;
create trigger trg_solicitud_updated
  before update on solicitud
  for each row execute function set_updated_at();

-- ── 4) Comprobación ─────────────────────────────────────────────────────
select column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_name = 'solicitud' and column_name = 'updated_at';

select tgname from pg_trigger where tgrelid = 'solicitud'::regclass and not tgisinternal;

-- Ninguna fila debería quedar con updated_at anterior a created_at.
select count(*) as inconsistentes from solicitud where updated_at < created_at;
