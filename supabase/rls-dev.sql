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
                           'prestador_servicio','prestador_barrio','prestador_foto',
                           'verificacion','trabajo','valoracion','ingreso','solicitud','perfil'] loop
    execute format('alter table %I disable row level security;', t);
  end loop;
end $$;
