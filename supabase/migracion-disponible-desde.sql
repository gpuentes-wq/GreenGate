-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Migración: la disponibilidad pasa a ser una FECHA
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase, DESPUÉS de migracion-visita.sql.
-- Es idempotente y aditiva: la app desplegada sigue funcionando aunque todavía
-- no tenga el código nuevo.
--
-- Reemplaza a `disponibilidad`, que guardaba tres cajones ('esta_semana',
-- 'proxima_semana', 'a_coordinar'). El problema de los cajones es la
-- ambigüedad: "esta semana" respondido un viernes a la tarde no quiere decir
-- nada, y el propietario tiene que interpretarlo para comparar.
--
-- Es "a partir de", NO un turno reservado. La diferencia importa: el jardinero
-- responde compitiendo con otros dos y sin saber si lo van a elegir. Si esto
-- fuera un compromiso en firme, contestarle a cuatro vecinos lo dejaría
-- sobrevendido. El día y la hora exactos se acuerdan después de que lo eligen,
-- que es cuando hay una sola contraparte.
--
-- NULL significa "a coordinar": es el jardinero que puede ir pero prefiere
-- arreglarlo hablando. No es un dato faltante, es una respuesta válida.
--
-- `disponibilidad` queda en la tabla pero deja de escribirse, igual que
-- verificacion.barrio_id y prestador.domicilio. No se borra porque eliminar una
-- columna es irreversible. No se hace backfill: traducir 'esta_semana' a una
-- fecha concreta sería inventar un dato que el jardinero nunca dio.
-- ════════════════════════════════════════════════════════════════════════

alter table solicitud add column if not exists disponible_desde date;

comment on column solicitud.disponible_desde is
  'Fecha a partir de la cual el prestador puede ir a ver el trabajo. NULL = a coordinar. No es un turno reservado.';

comment on column solicitud.disponibilidad is
  'OBSOLETA — reemplazada por disponible_desde. Se conserva por los datos ya cargados.';

-- ── Comprobación ───────────────────────────────────────────────────────
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_name = 'solicitud'
   and column_name in ('disponible_desde', 'disponibilidad')
 order by column_name;
