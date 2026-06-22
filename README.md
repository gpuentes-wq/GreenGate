# GreenGate

Plataforma B2B2C de servicios (jardinería) para barrios privados. Conecta **administraciones**, **propietarios** y **prestadores** con un directorio de prestadores verificados y calificados, avalado por la administración del barrio.

> Estado: **MVP en construcción**. Esta etapa monta la base de datos y el punto de partida del proyecto.

## Stack

| Capa | Herramienta | Tier |
|---|---|---|
| Base de datos + Auth + Storage | **Supabase** (PostgreSQL) | Free |
| Frontend | **React + Vite + TypeScript + Tailwind** (SPA) | — |
| Hosting | **Netlify** | Free |
| Código | **GitHub** | Free |

Costo del piloto: **~US$0** mientras se usen los tiers gratuitos.

## Estructura del repositorio

```
greengate/
├── supabase/
│   ├── schema.sql      ← el modelo de datos (las 9 entidades)
│   ├── seed.sql        ← datos de ejemplo para ver el directorio
│   └── policies.sql    ← seguridad por barrio (RLS) — borrador, se aplica con el login
├── docs/
│   └── modelo-de-datos.md  ← el modelo explicado sin tecnicismos
├── .env.example        ← plantilla de variables de entorno
└── netlify.toml        ← configuración de despliegue
```

## Puesta en marcha

### Paso 1 — Base de datos (Supabase) · no requiere Node

1. Crear una cuenta gratis en https://supabase.com y un proyecto nuevo (región: South America / São Paulo).
2. En el proyecto, ir a **SQL Editor** → **New query**.
3. Pegar el contenido de [`supabase/schema.sql`](supabase/schema.sql) y **Run**.
4. Repetir con [`supabase/seed.sql`](supabase/seed.sql) para cargar datos de ejemplo.
5. Ir a **Table Editor** y verificar que están las tablas con datos. Probar la vista `prestador_directorio`.
6. Guardar de **Project Settings → API**: la **Project URL** y la **anon public key** (las usa la app en el Paso 3).

### Paso 2 — Instalar Node.js (prerequisito de la app)

Aún no está instalado. Opción recomendada (PowerShell):

```powershell
winget install OpenJS.NodeJS.LTS
```

(O bajar el instalador LTS de https://nodejs.org y siguiente-siguiente.) Cerrar y reabrir la terminal después de instalar.

### Paso 3 — App (cuando exista el frontend)

```bash
cp .env.example .env     # y completar con la URL y la anon key de Supabase
npm install
npm run dev
```

### Paso 4 — GitHub + Netlify

1. Crear un repositorio vacío en GitHub y conectarlo:
   ```bash
   git remote add origin https://github.com/<usuario>/greengate.git
   git push -u origin main
   ```
2. En https://netlify.com → **Add new site → Import from GitHub** → elegir el repo.
3. Cargar en Netlify las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Cada push a `main` despliega solo.

## Seguridad y datos personales

- Los **antecedentes penales** son un **dato sensible** (Ley 25.326). Por diseño guardamos **solo el estado de verificación**, nunca el documento.
- La seguridad por barrio (cada administración ve solo lo suyo) se implementa con **RLS** ([`supabase/policies.sql`](supabase/policies.sql)). Se aplica y prueba **antes** de cargar datos reales o publicar.
- La **anon key** de Supabase puede ir en el frontend; la **service_role key** NUNCA va al frontend ni al repo.

## Roadmap

- **Fase 0** — Prototipo / base de datos *(actual)*
- **Fase 1** — MVP: directorio + panel de administración. Piloto en 1 barrio.
- **Fase 2** — Agenda, cobro digital, trazabilidad de ingresos.
- **Fase 3** — Multi-barrio, nuevos rubros, IA.
