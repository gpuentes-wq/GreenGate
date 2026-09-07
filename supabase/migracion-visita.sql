-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Migración: el pedido busca una VISITA, no un número
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase. Es idempotente y aditiva: la
-- app desplegada sigue funcionando aunque todavía no tenga el código nuevo.
--
-- Por qué cambia el flujo: un jardinero no puede cotizar un jardín que no vio.
-- El precio depende de los metros, los árboles y el acceso, así que el número
-- que devolvía sobre una descripción de dos renglones era una adivinanza o un
-- precio inflado para cubrirse. Y el propietario los comparaba como si fueran
-- equivalentes.
--
-- Ahora el jardinero responde "puedo ir" + cuándo, y el precio firme se acuerda
-- en la visita. Lo que el propietario compara pasa a ser lo que sí es
-- comparable en esta instancia: quién puede ir antes, con qué puntaje, y con
-- qué tarifa de referencia publicada en su perfil.
--
-- El estimado sigue existiendo pero es opcional y se muestra "a confirmar":
-- reusa la columna monto_presupuestado que ya estaba, no se crea otra.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1) Estados nuevos ───────────────────────────────────────────────────
-- Hasta ahora el circuito no cerraba: el propietario elegía por WhatsApp y la
-- app no se enteraba. Los que no fueron elegidos quedaban en 'aceptada' para
-- siempre, esperando una respuesta que nunca llegaba.
--
-- Nota: 'alter type ... add value' no puede USARSE en la misma transacción en
-- que se declara. Este script no lo usa, así que corre de una. Si el editor
-- igual se queja, corré estas dos líneas solas y después el resto.
alter type estado_solicitud add value if not exists 'elegida';
alter type estado_solicitud add value if not exists 'no_seleccionada';

-- ── 2) La respuesta del jardinero ───────────────────────────────────────
-- Cuándo puede ir. Valores que escribe la UI: 'esta_semana',
-- 'proxima_semana', 'a_coordinar'. Sin check constraint a propósito: el
-- vocabulario todavía se está acomodando y una restricción acá obliga a una
-- migración destructiva cada vez que se suma una opción.
alter table solicitud add column if not exists disponibilidad text;

-- Aclaración libre del jardinero: qué haría, o qué necesita saber antes de ir.
-- Es lo que antes no tenía dónde escribir, y que lo obligaba a elegir entre
-- inventar un número o rechazar el pedido.
alter table solicitud add column if not exists detalle text;

comment on column solicitud.disponibilidad is
  'Cuándo puede ir el prestador: esta_semana | proxima_semana | a_coordinar';
comment on column solicitud.detalle is
  'Aclaración del prestador al responder: qué haría o qué necesita saber';
comment on column solicitud.monto_presupuestado is
  'Estimado OPCIONAL, a confirmar en la visita. No es un precio cerrado.';

-- ── 3) Comprobación ─────────────────────────────────────────────────────
select column_name, data_type
  from information_schema.columns
 where table_name = 'solicitud'
   and column_name in ('disponibilidad', 'detalle', 'monto_presupuestado')
 order by column_name;

select enumlabel
  from pg_enum
 where enumtypid = 'estado_solicitud'::regtype
 order by enumsortorder;
