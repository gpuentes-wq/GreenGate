-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Políticas de seguridad (Row Level Security) — BORRADOR
-- ════════════════════════════════════════════════════════════════════════
-- IMPORTANTE: NO correr todavía. Estas políticas se aplican y se prueban
-- cuando integremos el login (Supabase Auth), porque dependen de usuarios
-- reales y de la tabla `perfil`.
--
-- Durante el desarrollo trabajamos con RLS desactivado (el editor de tablas
-- de Supabase usa la clave de servicio y siempre ve todo). Antes de cargar
-- datos REALES o publicar la app, activamos RLS con políticas como estas.
--
-- Regla general del modelo: cada administración ve SOLO los datos de sus
-- barrios; cada prestador/propietario ve SOLO lo suyo; el superadmin ve todo.
-- ════════════════════════════════════════════════════════════════════════

-- ── Helpers ──────────────────────────────────────────────────────────────
create or replace function es_superadmin() returns boolean language sql stable as $$
  select exists (select 1 from perfil where user_id = auth.uid() and rol = 'superadmin');
$$;

create or replace function mi_administracion() returns uuid language sql stable as $$
  select administracion_id from perfil where user_id = auth.uid();
$$;

-- ── Activar RLS en todas las tablas ──────────────────────────────────────
alter table administracion       enable row level security;
alter table barrio               enable row level security;
alter table propietario          enable row level security;
alter table lote                 enable row level security;
alter table prestador            enable row level security;
alter table prestador_servicio   enable row level security;
alter table prestador_barrio     enable row level security;
alter table prestador_foto       enable row level security;
alter table integrante           enable row level security;
alter table verificacion         enable row level security;
alter table trabajo              enable row level security;
alter table valoracion           enable row level security;
alter table ingreso              enable row level security;
alter table solicitud            enable row level security;
alter table perfil               enable row level security;

-- ── Ejemplos de políticas (a completar con cada tabla y operación) ────────

-- Cada usuario ve y edita su propio perfil.
create policy "perfil propio" on perfil
  for all using (user_id = auth.uid());

-- Un admin ve los barrios de su administración; el superadmin ve todos.
create policy "barrios de mi administracion" on barrio
  for select using (es_superadmin() or administracion_id = mi_administracion());

-- Un admin gestiona los lotes de sus barrios.
create policy "lotes de mis barrios" on lote
  for all using (
    es_superadmin()
    or barrio_id in (select id from barrio where administracion_id = mi_administracion())
  );

-- Un admin gestiona las verificaciones de los prestadores de sus barrios.
create policy "verificaciones de mis barrios" on verificacion
  for all using (
    es_superadmin()
    or barrio_id in (select id from barrio where administracion_id = mi_administracion())
  );

-- NOTA: faltan las políticas para propietario, prestador, trabajo, valoracion,
-- prestador_barrio, prestador_servicio, ingreso, integrante y solicitud. Las
-- definimos en detalle cuando tengamos el login y los flujos de cada rol, y
-- las probamos una por una. Para integrante: cada prestador-equipo debe
-- poder gestionar SOLO sus propios integrantes (scope por prestador_id).
