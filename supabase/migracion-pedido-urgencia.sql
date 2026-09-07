-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Migración: el pedido puede ser una URGENCIA
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase. Es idempotente y aditiva: la
-- app desplegada sigue funcionando aunque todavía no tenga el código nuevo.
--
-- Hasta ahora la urgencia era solo una propiedad del PRESTADOR
-- (prestador.disponible_urgencia): un interruptor que dice "atiendo
-- emergencias". Con eso el vecino podía encontrar a alguien, pero no había
-- forma de decirle a ese alguien que ESTE pedido apura.
--
-- La urgencia INFORMA, no rutea. El pedido le llega igual a todos los
-- prestadores que el propietario eligió, tengan o no la marca: alguien que
-- normalmente no toma urgencias puede tomar esta, porque conoce al vecino o
-- porque tiene la semana floja. Filtrarlo de entrada le sacaría una decisión
-- que es suya — y la autonomía es justo lo que el jardinero valora
-- (ver docs/cobertura-propuesta-valor.md).
--
-- Por eso no se pisa con el filtro del directorio: la marca del prestador y
-- el filtro sirven para que el vecino ELIJA; este campo sirve para que el
-- jardinero PRIORICE. Actúan en momentos distintos y sobre personas distintas.
-- ════════════════════════════════════════════════════════════════════════

alter table pedido add column if not exists es_urgencia boolean not null default false;

comment on column pedido.es_urgencia is
  'El propietario declaró que este pedido es una urgencia. Informa al prestador para que priorice; NO filtra a quién se le manda.';

-- ── Comprobación ───────────────────────────────────────────────────────
select column_name, data_type, column_default, is_nullable
  from information_schema.columns
 where table_name = 'pedido'
   and column_name = 'es_urgencia';
