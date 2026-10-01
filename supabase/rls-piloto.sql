-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · RLS en modo PILOTO ABIERTO (todavía sin login)
-- ════════════════════════════════════════════════════════════════════════
-- Reemplaza a rls-dev.sql, que DESACTIVABA RLS por completo.
--
-- Qué resuelve. Hasta ahora cualquiera con la clave anon —que viaja en el
-- bundle del navegador y es pública por diseño— podía leer, escribir y
-- BORRAR cualquier fila de cualquier tabla. Con el link de la app circulando,
-- el riesgo dejó de ser teórico: un borrado masivo no deja rastro ni aviso.
--
-- Qué NO resuelve. Sin login no hay a quién atribuirle una fila, así que
-- select, insert y update siguen abiertos. Lo que se cierra es el borrado,
-- que es el daño irreversible, y la edición de puntajes ya publicados.
-- Las políticas por rol (supabase/policies.sql) esperan a Supabase Auth.
--
-- ⚠️ HACER BACKUP ANTES DE CORRER. Es reversible, pero conviene.
-- Correr entero en el SQL Editor de Supabase. Es idempotente.
-- ════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════
-- PASO 1 · Borrar todas las políticas existentes
-- ════════════════════════════════════════════════════════════════════════
-- Imprescindible, y es el paso que se olvida. Cuatro migraciones crearon
-- políticas `for all ... using (true)` sobre integrante, pedido,
-- prestador_sugerido y solicitud. `for all` INCLUYE delete: si se activa RLS
-- sin borrarlas, esas cuatro tablas siguen siendo borrables por cualquiera.
-- También limpia las políticas viejas de policies.sql, que asumen un login
-- que todavía no existe y hoy bloquearían la app entera.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname
             from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;


-- ════════════════════════════════════════════════════════════════════════
-- PASO 2 · Todas las tablas menos valoracion
-- ════════════════════════════════════════════════════════════════════════
-- Son 17. rls-dev.sql nombraba 15: `pedido` y `prestador_sugerido` se
-- crearon después, en sus propias migraciones.
--
-- select / insert / update abiertos; delete SIN política Y sin permiso.
-- Las dos cosas: con RLS y sin política, un delete no falla — afecta cero
-- filas y devuelve éxito, que es peor que un error porque nadie se entera.
-- Revocando el grant, falla con "permission denied" y se puede verificar.
do $$
declare t text;
begin
  foreach t in array array[
    'administracion','barrio','propietario','lote','prestador',
    'prestador_servicio','prestador_barrio','prestador_foto','integrante',
    'verificacion','trabajo','ingreso','solicitud','perfil',
    'pedido','prestador_sugerido'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
    execute format('grant select, insert, update on %I to anon, authenticated', t);
    execute format('create policy pil_sel_%s on %I for select to anon, authenticated using (true)', t, t);
    execute format('create policy pil_ins_%s on %I for insert to anon, authenticated with check (true)', t, t);
    execute format('create policy pil_upd_%s on %I for update to anon, authenticated using (true) with check (true)', t, t);
  end loop;
end $$;


-- ════════════════════════════════════════════════════════════════════════
-- PASO 3 · prestador_servicio: la única excepción con delete
-- ════════════════════════════════════════════════════════════════════════
-- JardineroOnboarding.tsx:185 borra las especialidades del prestador antes
-- de reinsertarlas. Sin delete, el jardinero no puede sacarse un servicio
-- que ya no presta. Es el único delete de toda la app (verificado).
grant delete on prestador_servicio to anon, authenticated;
create policy pil_del_prestador_servicio on prestador_servicio
  for delete to anon, authenticated using (true);


-- ════════════════════════════════════════════════════════════════════════
-- PASO 4 · valoracion: el puntaje es inmutable, la respuesta no
-- ════════════════════════════════════════════════════════════════════════
-- Una reseña publicada no se edita ni se borra desde afuera: es el activo
-- que hace creíble al directorio. Pero el jardinero SÍ tiene que poder
-- responderla (SolicitudesPanel.tsx:297 escribe respuesta_prestador), así
-- que un bloqueo total de update rompería esa función.
--
-- RLS trabaja por fila, no por columna. El control fino va por GRANT de
-- columna: se revoca el update de la tabla y se otorga solo sobre
-- respuesta_prestador. La política de RLS deja pasar la fila; el grant
-- decide qué columna se puede tocar. Un PATCH sobre puntaje o comentario
-- falla con "permission denied for column".
alter table valoracion enable row level security;
revoke all on valoracion from anon, authenticated;
grant select, insert on valoracion to anon, authenticated;
grant update (respuesta_prestador) on valoracion to anon, authenticated;

create policy pil_sel_valoracion on valoracion
  for select to anon, authenticated using (true);
create policy pil_ins_valoracion on valoracion
  for insert to anon, authenticated with check (true);
-- Sin delete: una reseña no se borra.
create policy pil_upd_valoracion on valoracion
  for update to anon, authenticated using (true) with check (true);


-- ════════════════════════════════════════════════════════════════════════
-- PASO 5 · La vista del directorio
-- ════════════════════════════════════════════════════════════════════════
-- prestador_directorio es una vista, no una tabla: RLS no se le aplica y
-- corre con los permisos de su dueño. El grant es defensivo — si se
-- perdiera, el directorio del propietario quedaría vacío sin error visible.
revoke all on prestador_directorio from anon, authenticated;
grant select on prestador_directorio to anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════
-- PASO 6 · Comprobar el resultado
-- ════════════════════════════════════════════════════════════════════════
-- Las 18 filas (17 tablas + valoracion ya contada) deben decir rls = true.
select c.relname as tabla, c.relrowsecurity as rls,
       count(p.policyname) as politicas
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  left join pg_policies p on p.tablename = c.relname and p.schemaname = 'public'
 where c.relkind = 'r'
 group by c.relname, c.relrowsecurity
 order by c.relrowsecurity, c.relname;

-- Quién puede borrar qué. Solo debe aparecer prestador_servicio.
select table_name, privilege_type
  from information_schema.table_privileges
 where grantee = 'anon' and privilege_type = 'DELETE'
 order by table_name;

-- Columnas de valoracion que anon puede actualizar. Solo respuesta_prestador.
select column_name
  from information_schema.column_privileges
 where grantee = 'anon' and table_name = 'valoracion' and privilege_type = 'UPDATE';

-- ════════════════════════════════════════════════════════════════════════
-- PASO 7 · Storage: limpieza defensiva, no por exposición real
-- ════════════════════════════════════════════════════════════════════════
-- Una auditoría encontró que anon tenía insert/update/delete/truncate
-- sobre storage.buckets, storage.buckets_analytics y storage.objects.
-- Se confirmó en Settings → Data API → Exposed schemas que `storage` NO
-- está expuesto por la API REST: este permiso no era alcanzable desde el
-- navegador con la clave anon. No era una puerta abierta real.
--
-- Se revoca de todos modos, por higiene: si alguien expone `storage` en
-- esa lista más adelante (por ejemplo al implementar subida real de
-- fotos, hoy inexistente — la app no usa storage.from() ni .upload() en
-- ningún componente), que empiece desde permisos mínimos y no herede
-- esto sin darse cuenta.
revoke insert, update, delete, truncate, references, trigger
  on storage.buckets from anon;
revoke insert, update, delete, truncate, references, trigger
  on storage.buckets_analytics from anon;
revoke insert, update, delete, truncate, references, trigger
  on storage.objects from anon;


-- ════════════════════════════════════════════════════════════════════════
-- NOTA · Cómo volver atrás
-- ════════════════════════════════════════════════════════════════════════
-- Correr rls-dev.sql. Desactiva RLS en las tablas que nombra (no en pedido
-- ni prestador_sugerido, que son posteriores) pero NO devuelve los grants
-- de delete revocados acá. Para eso, además:
--   grant delete on <tabla> to anon, authenticated;
