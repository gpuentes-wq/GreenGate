# GreenGate · Especificación de pantallas — Administración

Documento de referencia para el desarrollo de las pantallas del rol administración en el MVP. Se apoya en [`estrategia-piloto.md`](estrategia-piloto.md), [`catalogo-servicios.md`](catalogo-servicios.md), [`spec-propietario.md`](spec-propietario.md) y [`spec-jardinero.md`](spec-jardinero.md).

## Dos niveles, con la prioridad invertida respecto a lo construido hoy

- **Panel de un barrio** (nuevo, pasa a ser la **pantalla principal/default**). Es el caso común: cerca del 80% de los barrios privados tiene su propia administración, o sea 1 administración = 1 barrio. La mayoría de las administraciones entra directo a operar sobre su único barrio, sin tener que elegir nada primero.
- **Panel multi-barrio** (es lo que hoy existe como `AdminPanel.tsx` — la tabla "Mis barrios"). Pasa a ser una **pantalla secundaria/anexa**, que solo tiene sentido mostrar si esa administración gestiona más de un barrio (el ~20% restante).

Este documento se enfoca en el **panel de un barrio**, que es el que falta construir.

## Contenido del panel de un barrio

- **Documentación que requiere atención** — ya existe como funcionalidad (alertas de vencimiento en `AdminPanel.tsx`); se reutiliza tal cual, scopeada a este barrio.
- **Resumen**: prestadores totales, pendientes de validación (ya existen como estadísticas, hoy a nivel multi-barrio) + **cantidad de prestadores disponibles para urgencia en este momento** — esto último es nuevo, y depende del campo `disponible_urgencia` que se suma a `prestador` (ver `spec-jardinero.md`).
- **Listado de prestadores**: estado de verificación, puntaje de reseñas, y **acción de validar por cada requisito por separado** (antecedentes / seguro / identidad) — ya existe (`ValidarPrestadorModal`), incluyendo el caso de equipos (antecedentes e identidad se validan persona por persona; el seguro es compartido). No hay gap acá, se reutiliza.
- **Carga masiva de prestadores vía CSV/XLS** — funcionalidad nueva. Permite subir un archivo con un listado de prestadores y su estado, en vez de cargarlos uno por uno.
- **Agregar prestador**: dos caminos —
  - **Uno a uno**: alta manual de un prestador conocido por la administración (ver "alta por administración" en `spec-jardinero.md` — la administración ya tiene los datos porque el jardinero ya trabaja en el barrio; después el jardinero solo entra a completar/validar su documentación).
  - **Masivo**: el CSV/XLS del punto anterior.

## Conexión con lo ya construido

- El panel de un barrio reutiliza directamente: las alertas de vencimiento, el listado de prestadores con `prestador_directorio`, y `ValidarPrestadorModal` — todo lo que hoy vive en `AdminPanel.tsx` a nivel multi-barrio pasa a operar scopeado a un `barrio_id`.
- `AdminPanel.tsx` (la tabla "Mis barrios") se conserva pero se relega a pantalla secundaria, accesible solo si la administración tiene más de un barrio asociado.

## Cambio de modelo de datos necesario

- **`prestador.disponible_urgencia`**: mismo campo ya identificado en `spec-jardinero.md`, necesario acá también para la estadística de disponibles para urgencia del resumen.
- **`prestador.origen`**: mismo campo ya identificado en `spec-jardinero.md`, para diferenciar altas por autoregistro / administración / recomendación de propietario.
- **Carga masiva CSV/XLS**: falta definir el formato del archivo (columnas esperadas) y cómo se mapea a `prestador` + `prestador_servicio` + `verificacion` — no es solo una tabla nueva, es un proceso de importación a diseñar.

## Pendiente / a definir

- Formato exacto del archivo de carga masiva (columnas, validaciones, qué pasa si hay errores en alguna fila).
- Cómo administración revisa y gestiona los leads que llegan de la funcionalidad "proponer nuevo prestador" del propietario (`spec-propietario.md`, pantalla 2) — no quedó definida una pantalla específica para esto todavía.
- Detalle de qué ve la administración en el panel multi-barrio (pantalla secundaria) más allá de lo que ya existe hoy.

---

*Universidad de San Andrés · Maestría en Negocios Digitales (NBL) · Proyecto GreenGate*
