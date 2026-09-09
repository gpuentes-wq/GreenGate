-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Migración: la reseña se ancla a la solicitud elegida
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase. Es idempotente y aditiva: la
-- app desplegada sigue funcionando aunque todavía no tenga el código nuevo.
--
-- Hasta ahora `valoracion` existía pero nada la escribía: las reseñas que se
-- ven en el directorio vienen del seed. Es el agujero más grande del producto,
-- porque el puntaje de los vecinos es lo que hace que el directorio valga más
-- que una lista de teléfonos.
--
-- Por qué la solicitud y no `trabajo`: una reseña necesita apoyarse en algo que
-- pruebe que el trato existió, y eso ya lo tenemos — una solicitud en estado
-- 'elegida' es exactamente eso. `trabajo` exige lote_id (not null) y sin login
-- el propietario no tiene lote; queda para Fase 2, cuando haya pago digital y
-- un hecho real que registrar.
--
-- El puntaje no hay que recalcularlo: prestador_directorio lo deriva de esta
-- tabla (ver schema.sql), así que en cuanto entre la primera fila cambian el
-- promedio, la cantidad, el orden del directorio y el perfil.
-- ════════════════════════════════════════════════════════════════════════

alter table valoracion add column if not exists solicitud_id uuid references solicitud(id) on delete set null;

-- Una sola reseña por trabajo elegido. Es lo que impide que alguien puntúe diez
-- veces al mismo jardinero, y también lo que limita el daño de que el link de
-- reseña circule: quien lo tenga puede escribir una, no una campaña.
--
-- Índice parcial porque las filas del seed tienen solicitud_id nulo y en
-- Postgres los NULL no chocan entre sí, pero la intención se lee mejor así.
create unique index if not exists valoracion_una_por_solicitud
    on valoracion (solicitud_id) where solicitud_id is not null;

comment on column valoracion.solicitud_id is
  'Solicitud elegida que da origen a la reseña. Es la prueba de que el vecino y el prestador trataron. NULL en las filas del seed.';

-- ── Comprobación ───────────────────────────────────────────────────────
select column_name, data_type
  from information_schema.columns
 where table_name = 'valoracion' and column_name = 'solicitud_id';

select indexname from pg_indexes
 where tablename = 'valoracion' and indexname = 'valoracion_una_por_solicitud';
