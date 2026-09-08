-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Migración: el propietario puede CANCELAR un pedido
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase. Es idempotente y aditiva: la
-- app desplegada sigue funcionando aunque todavía no tenga el código nuevo.
--
-- Es el hueco simétrico del que cerró migracion-visita.sql. Ahí resolvimos qué
-- pasa cuando el propietario ELIGE: el elegido se entera y los demás dejan de
-- esperar. Faltaba el caso en que el propietario NO avanza — resolvió el tema
-- por otro lado, lo pospone, o simplemente cambió de idea.
--
-- Sin esto, un jardinero que se tomó el trabajo de contestar y de reservarse
-- una fecha queda esperando indefinidamente una respuesta que no va a llegar.
-- Es el mismo problema que ya tuvimos, y es el que más rápido hace que un
-- prestador deje de contestar por la app.
--
-- Se cancela el PEDIDO, no cada solicitud: para el propietario es un solo acto
-- ("ya no lo necesito"), y las solicitudes son la consecuencia.
--
-- Qué solicitudes se cancelan: las que siguen vivas — 'pendiente', 'aceptada' y
-- 'elegida'. Las 'rechazada' y 'no_seleccionada' ya están cerradas y se dejan
-- como están: pisarlas borraría lo que efectivamente pasó.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1) Estado nuevo ─────────────────────────────────────────────────────
-- Nota: 'alter type ... add value' no puede USARSE en la misma transacción en
-- que se declara. Este script no lo usa, así que corre de una.
alter type estado_solicitud add value if not exists 'cancelada';

-- ── 2) Marca en el pedido ───────────────────────────────────────────────
-- Se guarda la fecha y no un booleano: un pedido cancelado hace tres meses no
-- es lo mismo que uno cancelado recién, y el dato no cuesta nada de más.
-- NULL = vigente.
alter table pedido add column if not exists cancelado_en timestamptz;

comment on column pedido.cancelado_en is
  'Cuándo el propietario dio de baja el pedido. NULL = vigente. Las solicitudes vivas del pedido pasan a estado cancelada.';

-- ── 3) Comprobación ─────────────────────────────────────────────────────
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_name = 'pedido'
   and column_name = 'cancelado_en';

select enumlabel
  from pg_enum
 where enumtypid = 'estado_solicitud'::regtype
 order by enumsortorder;
