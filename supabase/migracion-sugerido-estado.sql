-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Migración: ESTADO DE LOS PRESTADORES SUGERIDOS
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase. Es aditiva e idempotente: no
-- borra ni reescribe nada, y se puede correr dos veces sin romper.
--
-- Por qué. `prestador_sugerido` guardaba el lead y nada más. Ahora que la
-- administración lo ve, necesita poder cerrarlo: sin estado, el que ya se dio
-- de alta sigue apareciendo como pendiente para siempre y la lista se vuelve
-- ruido a la semana. Y borrar la fila tampoco sirve — se pierde el rastro de
-- que un vecino recomendó a alguien, que es justamente el dato interesante.
--
-- Ver docs/spec-administracion.md ("los prestadores sugeridos").
-- ════════════════════════════════════════════════════════════════════════

-- Texto simple con default, sin CHECK ni enum: es el mismo criterio que
-- `prestador.origen`. Valores usados por la app:
--   'pendiente'    — recién llegado, la administración todavía no lo miró
--   'dado_de_alta' — se convirtió en un prestador real (ver prestador_id)
--   'descartado'   — la administración decidió no darlo de alta
alter table prestador_sugerido
  add column if not exists estado text not null default 'pendiente';

-- A qué prestador terminó dando origen. Queda en null si se descartó.
-- `on delete set null`: si después se borra el prestador, el lead sobrevive
-- como registro histórico en vez de desaparecer con él.
alter table prestador_sugerido
  add column if not exists prestador_id uuid references prestador(id) on delete set null;

-- Cuándo se resolvió. Sirve para no mostrar eternamente lo ya atendido y
-- para medir cuánto tarda la administración en responder a un vecino.
alter table prestador_sugerido
  add column if not exists resuelto_en timestamptz;

-- La consulta del panel es siempre "los pendientes de este barrio".
create index if not exists idx_prestador_sugerido_estado
  on prestador_sugerido(barrio_id, estado);

-- Las filas que ya existían quedan en 'pendiente' por el default, que es lo
-- correcto: nadie las atendió todavía, porque hasta ahora no había pantalla.

-- ── Comprobar ───────────────────────────────────────────────────────────
select estado, count(*)
  from prestador_sugerido
 group by estado;
