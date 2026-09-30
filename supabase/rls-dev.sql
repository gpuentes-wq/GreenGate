-- ════════════════════════════════════════════════════════════════════════
-- ⛔ OBSOLETO · NO CORRER · Reemplazado por supabase/rls-piloto.sql
-- ════════════════════════════════════════════════════════════════════════
-- Este archivo DESACTIVA Row Level Security por completo. Dejaba la base
-- abierta a cualquiera con la clave anon, que viaja en el bundle del
-- navegador: leer, escribir y BORRAR cualquier fila de cualquier tabla.
--
-- Era aceptable mientras la app no estaba publicada. Dejó de serlo cuando
-- se empezó a repartir el link, así que se cerró con rls-piloto.sql.
--
-- Se conserva por dos motivos: documenta cuál era el estado anterior, y es
-- el camino de vuelta si hubiera que revertir de urgencia (ver la nota al
-- pie de rls-piloto.sql — ojo que no nombra `pedido` ni `prestador_sugerido`,
-- que son posteriores, ni devuelve los grants de delete revocados).
-- ════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · RLS en modo DESARROLLO / PILOTO (todavía sin login)
-- ════════════════════════════════════════════════════════════════════════
-- Desactiva Row Level Security para que la app (clave anon) pueda leer y
-- escribir mientras NO hay login. Correr en el SQL Editor de Supabase.
--
-- ⚠️  IMPORTANTE: esto deja la base accesible a cualquiera con la clave anon.
--     Es aceptable AHORA porque son datos de ejemplo y no hay login.
--     ANTES de cargar datos reales o publicar, reactivar RLS con las
--     políticas por rol de supabase/policies.sql.
-- ════════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array['administracion','barrio','propietario','lote','prestador',
                           'prestador_servicio','prestador_barrio','prestador_foto','integrante',
                           'verificacion','trabajo','valoracion','ingreso','solicitud','perfil'] loop
    execute format('alter table %I disable row level security;', t);
  end loop;
end $$;
