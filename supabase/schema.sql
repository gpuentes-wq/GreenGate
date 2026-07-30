-- ════════════════════════════════════════════════════════════════════════
-- GreenGate · Esquema de base de datos (PostgreSQL / Supabase)
-- ════════════════════════════════════════════════════════════════════════
-- Modelo de datos del MVP: directorio de prestadores verificados con
-- calificaciones (feature #1, 79% en la encuesta) + validación documental
-- de la administración.
--
-- Versión ampliada: incorpora todos los campos sugeridos para tener el
-- esquema lo más completo posible. Más adelante se define qué subconjunto
-- usa el MVP; los campos no usados quedan disponibles sin molestar.
--
-- El lenguaje del dominio está en español (lote, propietario, prestador).
-- Cómo correrlo: pegar este archivo en el SQL Editor de Supabase y ejecutar.
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
-- nuevos:
create type condicion_fiscal     as enum ('informal', 'monotributo', 'responsable_inscripto', 'exento', 'otro');
create type etapa_comercial      as enum ('prospecto', 'piloto', 'cliente', 'inactivo');
create type etapa_activacion     as enum ('piloto', 'activo', 'baja');
create type tipo_uso             as enum ('residencia_principal', 'fin_de_semana', 'temporal');
create type frecuencia_servicio  as enum ('unico', 'semanal', 'quincenal', 'mensual');
create type estado_pago          as enum ('pendiente', 'pagado', 'parcial');
create type medio_ingreso        as enum ('peatonal', 'vehiculo');
create type estado_moderacion    as enum ('publicada', 'oculta', 'reportada');
create type estado_solicitud     as enum ('pendiente', 'aceptada', 'rechazada');

-- ════════════════════════════════════════════════════════════════════════
-- ENTIDADES
-- ════════════════════════════════════════════════════════════════════════

-- ── ADMINISTRACION ── El cliente B2B que paga y es canal de distribución.
create table administracion (
  id               uuid primary key default gen_random_uuid(),
  razon_social     text not null,
  cuit             text,
  condicion_fiscal condicion_fiscal,
  domicilio        text,
  contacto_nombre  text,
  contacto_rol     text,                 -- p.ej. Gerente de Operaciones, Intendente
  contacto_cel     text,
  contacto_email   text,
  etapa_comercial  etapa_comercial not null default 'prospecto',  -- pipeline (ex "estado")
  plan             text,                 -- plan/suscripción contratada
  fecha_alta_contrato date,
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
  provincia         text,
  zona              text,                -- p.ej. "GBA Norte"
  cantidad_lotes    integer,
  sistema_acceso    text,                -- sistema de control de accesos que ya usa el barrio
  -- requisitos de documentación configurables por barrio (personalización):
  requiere_antecedentes boolean not null default true,
  requiere_seguro_art   boolean not null default true,
  requiere_identidad    boolean not null default true,
  horarios_ingreso  text,                -- franja horaria permitida para prestadores
  latitud           numeric(9,6),        -- para geocerca / trazabilidad (Fase 2)
  longitud          numeric(9,6),
  etapa_activacion  etapa_activacion not null default 'piloto',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── PROPIETARIO ── El vecino (lado de la demanda). No está atado a un barrio:
--    se vincula a los barrios a través de sus lotes (uno o varios, en uno o varios barrios).
create table propietario (
  id                    uuid primary key default gen_random_uuid(),
  nombre                text not null,
  apellido              text,
  celular               text,
  email                 text,
  metodo_pago_preferido metodo_pago,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ── LOTE ── Unidad funcional. Está en UN barrio y tiene UN propietario.
--    Un propietario puede tener VARIOS lotes; y como cada lote referencia su
--    propio barrio, esos lotes pueden estar en DISTINTOS barrios.
create table lote (
  id              uuid primary key default gen_random_uuid(),
  barrio_id       uuid not null references barrio(id) on delete cascade,
  numero          text not null,              -- número/identificador del lote
  metros2         numeric(10,2),              -- superficie del lote (m²)
  metros2_jardin  numeric(10,2),              -- superficie de verde a mantener (≠ m² del lote)
  manzana         text,
  seccion         text,
  tipo_uso        tipo_uso,                   -- residencia principal / fin de semana / temporal
  contacto        text,                       -- contacto del lote, si difiere del propietario
  propietario_id  uuid references propietario(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (barrio_id, numero)
);

-- ── PRESTADOR ── La oferta. Incluye jardineros; el rubro lo define
--    tipo_servicio_principal. Puede ser persona o empresa (es_empresa).
create table prestador (
  id                       uuid primary key default gen_random_uuid(),
  nombre                   text not null,     -- nombre de la persona / contacto
  apellido                 text,
  razon_social             text,              -- si es empresa
  es_empresa               boolean not null default false,
  cuit_cuil                text,
  condicion_fiscal         condicion_fiscal,  -- informal / monotributo / responsable_inscripto
  celular                  text,
  email                    text,
  domicilio                text,
  tipo_servicio_principal  tipo_servicio not null default 'jardineria',
  horario_trabajo          text,              -- texto libre (p.ej. "Lun-Vie 8-17")
  zona_preferente          text,
  descripcion              text,              -- bio / presentación del prestador
  foto_url                 text,              -- foto de perfil
  anios_experiencia        integer,
  cantidad_ayudantes       integer,
  tarifa_referencia        numeric(12,2),     -- precio de referencia
  cbu_alias                text,              -- para el cobro digital (Fase 2)
  activo                   boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Especialidades adicionales del prestador (más allá del servicio principal).
create table prestador_servicio (
  prestador_id  uuid not null references prestador(id) on delete cascade,
  tipo          tipo_servicio not null,
  tarifa        numeric(12,2),                -- tarifa de referencia para esa especialidad
  descripcion   text,
  primary key (prestador_id, tipo)
);

-- Barrios en los que el prestador ya trabajó / está habilitado a ingresar.
create table prestador_barrio (
  prestador_id                    uuid not null references prestador(id) on delete cascade,
  barrio_id                       uuid not null references barrio(id) on delete cascade,
  habilitado                      boolean not null default false,   -- habilitado por la administración
  fecha_habilitacion              date,
  fecha_vencimiento_habilitacion  date,
  primary key (prestador_id, barrio_id)
);

-- Portfolio: fotos de trabajos anteriores del prestador (34% de propietarios lo valora).
create table prestador_foto (
  id            uuid primary key default gen_random_uuid(),
  prestador_id  uuid not null references prestador(id) on delete cascade,
  url           text not null,
  descripcion   text,
  orden         integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ── INTEGRANTE ── Una persona real que trabaja DENTRO de un prestador que es
--    un equipo (no necesariamente una empresa formal). Un prestador unipersonal
--    NO necesita filas acá: el prestador mismo ES la persona, como siempre.
--    Cuando un prestador tiene integrantes, la identidad pública/comercial
--    (nombre, puntaje, directorio) sigue siendo la del prestador, pero
--    antecedentes e identidad — datos de una persona, no de un nombre
--    comercial — se verifican por integrante (ver tabla verificacion).
create table integrante (
  id            uuid primary key default gen_random_uuid(),
  prestador_id  uuid not null references prestador(id) on delete cascade,
  nombre        text not null,
  apellido      text,
  documento     text,              -- DNI, para la identidad de ESA persona
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── VERIFICACION ── SOLO ESTADO. Por decisión de diseño NO se almacena el
--    documento sensible (antecedentes penales, póliza). Guardamos el estado,
--    las fechas y quién validó. Reduce la exposición bajo la Ley 25.326.
--    integrante_id: NULL = aplica al prestador entero (caso unipersonal, o
--    seguro/ART compartido por todo el equipo). Con valor = es la
--    verificación personal de ESE integrante (antecedentes/identidad en un
--    equipo). prestador_id queda siempre completo (denormalizado a
--    propósito) para no tener que pasar por integrante en cada consulta.
create table verificacion (
  id                 uuid primary key default gen_random_uuid(),
  prestador_id       uuid not null references prestador(id) on delete cascade,
  integrante_id      uuid references integrante(id) on delete cascade,
  barrio_id          uuid references barrio(id) on delete set null,  -- si es específica de un barrio
  tipo               tipo_verificacion not null,
  estado             estado_verificacion not null default 'pendiente',
  fecha_emision      date,
  fecha_vencimiento  date,
  aseguradora        text,            -- para seguro/ART (sin el documento)
  nro_poliza         text,            -- nº de póliza / comprobante
  validado_por       uuid references administracion(id) on delete set null,
  validado_en        timestamptz,
  observaciones      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── TRABAJO ── Cada servicio realizado: la relación propietario–lote–prestador.
--    Acá viven el precio (monto), el método de pago y la comisión de la plataforma.
create table trabajo (
  id                  uuid primary key default gen_random_uuid(),
  lote_id             uuid not null references lote(id) on delete cascade,
  propietario_id      uuid references propietario(id) on delete set null,
  prestador_id        uuid not null references prestador(id) on delete restrict,
  barrio_id           uuid references barrio(id) on delete set null,
  fecha               date not null default current_date,
  tipo_servicio       tipo_servicio not null default 'jardineria',
  descripcion         text,
  monto               numeric(12,2),                       -- precio del trabajo
  moneda              text not null default 'ARS',
  comision_plataforma numeric(12,2),                       -- take rate (~12%) = ingreso de GreenGate
  metodo_pago         metodo_pago,
  estado_pago         estado_pago not null default 'pendiente',
  fecha_pago          date,
  frecuencia          frecuencia_servicio,                 -- único / semanal / quincenal / mensual
  estado              estado_trabajo not null default 'realizado',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── VALORACION ── Reseña de un trabajo. El puntaje del prestador se CALCULA
--    a partir de acá. Permite calificar por dimensión (calidad, puntualidad…).
create table valoracion (
  id                   uuid primary key default gen_random_uuid(),
  trabajo_id           uuid references trabajo(id) on delete set null,
  prestador_id         uuid not null references prestador(id) on delete cascade,
  propietario_id       uuid references propietario(id) on delete set null,
  puntaje              smallint not null check (puntaje between 1 and 5),
  puntaje_calidad      smallint check (puntaje_calidad between 1 and 5),
  puntaje_puntualidad  smallint check (puntaje_puntualidad between 1 and 5),
  puntaje_comunicacion smallint check (puntaje_comunicacion between 1 and 5),
  puntaje_precio       smallint check (puntaje_precio between 1 and 5),
  comentario           text,
  respuesta_prestador  text,
  fotos_urls           text[],
  verificada           boolean not null default false,     -- proviene de un trabajo real
  estado_moderacion    estado_moderacion not null default 'publicada',
  created_at           timestamptz not null default now()
);

-- ── INGRESO / ACCESO (Fase 2) ── Trazabilidad de entradas al barrio.
create table ingreso (
  id             uuid primary key default gen_random_uuid(),
  prestador_id   uuid not null references prestador(id) on delete cascade,
  lote_id        uuid references lote(id) on delete set null,
  barrio_id      uuid not null references barrio(id) on delete cascade,
  ingreso_at     timestamptz not null default now(),
  egreso_at      timestamptz,
  medio          medio_ingreso,
  patente        text,
  autorizado_por text,
  registrado_por text,
  observaciones  text,
  created_at     timestamptz not null default now()
);

-- ── SOLICITUD ── Pedido de contacto de un propietario a un prestador.
--    Cierra el círculo del marketplace (el prestador la ve en su buzón).
create table solicitud (
  id               uuid primary key default gen_random_uuid(),
  prestador_id     uuid not null references prestador(id) on delete cascade,
  propietario_id   uuid references propietario(id) on delete set null,
  barrio_id        uuid references barrio(id) on delete set null,
  contacto_nombre  text,
  contacto_celular text,
  mensaje          text,
  estado           estado_solicitud not null default 'pendiente',
  created_at       timestamptz not null default now()
);

-- ── PERFIL ── Vincula un usuario de Supabase Auth con su rol y su alcance.
--    Es la base para el login y para la seguridad por barrio (ver policies.sql).
--    NOTA: el vínculo propietario/prestador ↔ login vive acá (no duplicado en cada tabla).
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
-- ════════════════════════════════════════════════════════════════════════
-- NOTA: a propósito NO incluye antecedentes_ok/seguro_ok/identidad_ok.
-- Con integrantes, "¿está verificado?" ya no es un exists() simple (para un
-- equipo hay que exigir que TODOS los integrantes activos estén al día) —
-- ese cálculo es responsabilidad exclusiva de src/verificacion.ts, la
-- única fuente de verdad, consumida igual por las tres pantallas.
create view prestador_directorio as
select
  p.id,
  p.nombre,
  p.apellido,
  p.razon_social,
  p.es_empresa,
  p.tipo_servicio_principal,
  p.zona_preferente,
  p.horario_trabajo,
  p.descripcion,
  p.foto_url,
  p.condicion_fiscal,
  p.activo,
  (select round(avg(puntaje)::numeric, 2) from valoracion where prestador_id = p.id) as puntaje_promedio,
  (select count(*) from valoracion where prestador_id = p.id)                        as cantidad_valoraciones
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
  foreach t in array array['administracion','barrio','propietario','lote','prestador','integrante','verificacion','trabajo'] loop
    execute format('create trigger trg_%1$s_updated before update on %1$I for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════════════════
-- Índices para las búsquedas más frecuentes
-- ════════════════════════════════════════════════════════════════════════
create index on barrio(administracion_id);
create index on lote(barrio_id);
create index on lote(propietario_id);
create index on prestador_foto(prestador_id);
create index on integrante(prestador_id);
create index on verificacion(prestador_id);
create index on verificacion(integrante_id);
create index on verificacion(barrio_id);
create index on trabajo(prestador_id);
create index on trabajo(lote_id);
create index on valoracion(prestador_id);
create index on prestador_barrio(barrio_id);
create index on ingreso(prestador_id);
create index on solicitud(prestador_id);
