-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Migración: DISPONIBLE_URGENCIA en prestador
-- ════════════════════════════════════════════════════════════════════════
-- Correr una vez en el SQL Editor de Supabase. Es idempotente (no rompe si
-- ya existe). El tilde "Abierto a servicios de urgencia" — aplica solo a
-- jardinería general (el resto de las categorías se cotiza de la forma
-- normal). Ver docs/spec-jardinero.md y docs/estrategia-piloto.md
-- ("Diferencial: servicio de urgencia").
-- ════════════════════════════════════════════════════════════════════════

alter table prestador add column if not exists disponible_urgencia boolean not null default false;
