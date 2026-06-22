-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Esquema de base de datos (PostgreSQL / Supabase)
-- ════════════════════════════════════════════════════════════════════════
-- Modelo de datos del MVP: directorio de prestadores verificados con
-- calificaciones (feature #1, 79% en la encuesta) + validación documental
-- de la administración.
--
-- El lenguaje del dominio está en español (lote, propietario, prestador)
-- para que coincida con el negocio. Las palabras clave de SQL, en inglés.
--
-- Cómo correrlo: pegar este archivo completo en el SQL Editor de Supabase
-- y ejecutar. Luego correr seed.sql para cargar datos de ejemplo.
-- ════════════════════════════════════════════════════════════════════════

-- ── Extensiones ─────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";   -- habilita gen_random_uuid()

-- ── Tipos (enums) ───────────────────────────────────────────────────────
create type rol_usuario          as enum ('superadmin', 'admin_barrio', 'propietario', 'prestador');
create type tipo_servicio        as enum ('jardineria', 'poda', 'fumigacion', 'riego', 'diseno_paisajismo', 'limpieza_exterior', 'otro');
create type tipo_verificacion    as enum ('antecedentes_penales', 'seguro_art', 'identidad');
create type estado_verificacion  as enum ('pendiente', 'verificado', 'vencido', 'rechazado');
create type metodo_pago          as enum ('efectivo', 'transferencia', 'mercadopago', 'tarjeta', 'otro');
create type estado_trabajo       as enum ('solicitado', 'confirmado', 'realizado', 'cancelado');

-- ════════════════════════════════════════════════════════════════════════
-- ENTIDADES
-- ════════════════════════════════════════════════════════════════════════

-- ── ADMINISTRACION ── El cliente B2B que paga y es canal de distribución.
create table administracion (
  id               uuid primary key default gen_random_uuid(),
  razon_social     text not null,
  cuit             text,
  contacto_nombre  text,
  contacto_rol     text,                 -- p.ej. Gerente de Operaciones, Intendente
  contacto_cel     text,
  contacto_email   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── BARRIO ── Cada barrio/country. Una administración gestiona uno o varios.
create table barrio (
  id                uuid primary key default gen_random_uuid(),
  administracion_id uuid references administracion(id) on delete set null,
  nombre            text not null,
  localidad         text,
  partido           text,
  zona              text,                -- p.ej. "GBA Norte"
  cantidad_lotes    integer,
  sistema_acceso    text,                -- sistema de control de accesos que ya usa el barrio
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── PROPIETARIO ── El vecino (lado de la demanda).
create table propietario (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  celular     text,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── LOTE ── Unidad funcional. Pertenece a un barrio y a un propietario.
create table lote (
  id              uuid primary key default gen_random_uuid(),
  barrio_id       uuid not null references barrio(id) on delete cascade,
  numero          text not null,              -- número/identificador del lote
  metros2         numeric(10,2),              -- superficie del lote (m²)
  contacto        text,                       -- contacto del lote, si difiere del propietario
  propietario_id  uuid references propietario(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (barrio_id, numero)
);

-- ── PRESTADOR ── La oferta. Incluye jardineros; el rubro lo define
--    tipo_servicio_principal. Diseñado para sumar otros oficios sin rehacer nada.
create table prestador (
  id                       uuid primary key default gen_random_uuid(),
  nombre                   text not null,
  cuit_cuil                text,
  celular                  text,
  email                    text,
  domicilio                text,
  tipo_servicio_principal  tipo_servicio not null default 'jardineria',
  horario_trabajo          text,              -- texto libre (p.ej. "Lun-Vie 8-17")
  zona_preferente          text,
  activo                   boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Especialidades adicionales del prestador (más allá del servicio principal).
create table prestador_servicio (
  prestador_id  uuid not null references prestador(id) on delete cascade,
  tipo          tipo_servicio not null,
  primary key (prestador_id, tipo)
);

-- Barrios en los que el prestador ya trabajó / está habilitado a ingresar.
create table prestador_barrio (
  prestador_id  uuid not null references prestador(id) on delete cascade,
  barrio_id     uuid not null references barrio(id) on delete cascade,
  habilitado    boolean not null default false,   -- habilitado por la administración
  primary key (prestador_id, barrio_id)
);

-- ── VERIFICACION ── SOLO ESTADO. Por decisión de diseño NO se almacena el
--    documento sensible (antecedentes penales, póliza). Guardamos el estado,
--    las fechas y quién validó. Reduce la exposición bajo la Ley 25.326.
create table verificacion (
  id                 uuid primary key default gen_random_uuid(),
  prestador_id       uuid not null references prestador(id) on delete cascade,
  barrio_id          uuid references barrio(id) on delete set null,  -- si es específica de un barrio
  tipo               tipo_verificacion not null,
  estado             estado_verificacion not null default 'pendiente',
  fecha_emision      date,
  fecha_vencimiento  date,
  validado_por       uuid references administracion(id) on delete set null,
  validado_en        timestamptz,
  observaciones      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── TRABAJO ── Cada servicio realizado: la relación propietario–lote–prestador.
--    Acá viven el "CUIT que trabajó en el lote", "el pago" y "el método de pago"
--    que originalmente figuraban como campos del propietario.
create table trabajo (
  id              uuid primary key default gen_random_uuid(),
  lote_id         uuid not null references lote(id) on delete cascade,
  propietario_id  uuid references propietario(id) on delete set null,
  prestador_id    uuid not null references prestador(id) on delete restrict,
  barrio_id       uuid references barrio(id) on delete set null,
  fecha           date not null default current_date,
  tipo_servicio   tipo_servicio not null default 'jardineria',
  monto           numeric(12,2),
  metodo_pago     metodo_pago,
  estado          estado_trabajo not null default 'realizado',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── VALORACION ── Reseña de un trabajo. El puntaje del prestador se CALCULA
--    a partir de acá (no se carga a mano, así no se desincroniza).
create table valoracion (
  id              uuid primary key default gen_random_uuid(),
  trabajo_id      uuid references trabajo(id) on delete set null,
  prestador_id    uuid not null references prestador(id) on delete cascade,
  propietario_id  uuid references propietario(id) on delete set null,
  puntaje         smallint not null check (puntaje between 1 and 5),
  comentario      text,
  created_at      timestamptz not null default now()
);

-- ── INGRESO / ACCESO (Fase 2) ── Trazabilidad de entradas al barrio.
--    Se conecta con el sistema de control de accesos. Modelado desde ya
--    para no rehacer el esquema, pero no es parte del MVP.
create table ingreso (
  id            uuid primary key default gen_random_uuid(),
  prestador_id  uuid not null references prestador(id) on delete cascade,
  lote_id       uuid references lote(id) on delete set null,
  barrio_id     uuid not null references barrio(id) on delete cascade,
  ingreso_at    timestamptz not null default now(),
  egreso_at     timestamptz,
  created_at    timestamptz not null default now()
);

-- ── PERFIL ── Vincula un usuario de Supabase Auth con su rol y su alcance.
--    Es la base para el login y para la seguridad por barrio (ver policies.sql).
create table perfil (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  rol                rol_usuario not null,
  administracion_id  uuid references administracion(id) on delete set null,
  prestador_id       uuid references prestador(id) on delete set null,
  propietario_id     uuid references propietario(id) on delete set null,
  nombre             text,
  created_at         timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════
-- VISTA: DIRECTORIO DE PRESTADORES (corazón del MVP)
-- Prestador + puntaje promedio + cantidad de reseñas + insignias de verificación.
-- ════════════════════════════════════════════════════════════════════════
create view prestador_directorio as
select
  p.id,
  p.nombre,
  p.tipo_servicio_principal,
  p.zona_preferente,
  p.horario_trabajo,
  p.activo,
  (select round(avg(puntaje)::numeric, 2) from valoracion where prestador_id = p.id) as puntaje_promedio,
  (select count(*) from valoracion where prestador_id = p.id)                        as cantidad_valoraciones,
  exists (select 1 from verificacion where prestador_id = p.id and tipo = 'antecedentes_penales' and estado = 'verificado') as antecedentes_ok,
  exists (select 1 from verificacion where prestador_id = p.id and tipo = 'seguro_art'           and estado = 'verificado') as seguro_ok,
  exists (select 1 from verificacion where prestador_id = p.id and tipo = 'identidad'            and estado = 'verificado') as identidad_ok
from prestador p;

-- ════════════════════════════════════════════════════════════════════════
-- updated_at automático
-- ════════════════════════════════════════════════════════════════════════
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['administracion','barrio','propietario','lote','prestador','verificacion','trabajo'] loop
    execute format('create trigger trg_%1$s_updated before update on %1$I for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════════════
-- Índices para las búsquedas más frecuentes
-- ════════════════════════════════════════════════════════════════════════
create index on barrio(administracion_id);
create index on lote(barrio_id);
create index on lote(propietario_id);
create index on verificacion(prestador_id);
create index on verificacion(barrio_id);
create index on trabajo(prestador_id);
create index on trabajo(lote_id);
create index on valoracion(prestador_id);
create index on prestador_barrio(barrio_id);
create index on ingreso(prestador_id);
