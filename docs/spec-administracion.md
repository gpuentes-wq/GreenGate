# GreenGate · Especificación de pantallas — Administración

Documento de referencia para las pantallas del rol administración. Se apoya en [`estrategia-piloto.md`](estrategia-piloto.md), [`catalogo-servicios.md`](catalogo-servicios.md), [`spec-propietario.md`](spec-propietario.md) y [`spec-jardinero.md`](spec-jardinero.md).

> **Escrito como diseño previo y actualizado una vez construido.** Cada bloque lleva su estado: **✅** construido · **🟡** parcial · **⏳** no empezado.

## Dos niveles, con la prioridad invertida respecto de lo que había

- **Panel de un barrio** (`AdminBarrioPanel.tsx`) — ✅ construido, y es la pantalla principal. Es el caso común: cerca del 80% de los barrios privados tiene su propia administración, o sea 1 administración = 1 barrio.
- **Panel multi-barrio** (`AdminPanel.tsx`, la tabla "Mis barrios") — ✅ relegado a pantalla secundaria, accesible con "Ver todos mis barrios" solo si la administración gestiona más de uno.

## Contenido del panel de un barrio

- **Documentación que requiere atención** — ✅ alertas de vencidos y por vencer en 30 días, derivadas por `verificacion.ts`, scopeadas al barrio.
- **Resumen** — ✅ prestadores totales, pendientes de validación y **disponibles para urgencia**.
- **Listado de prestadores** — ✅ con estado de verificación, puntaje y validación **por requisito separado** (antecedentes / seguro / identidad) vía `ValidarPrestadorModal`. En equipos, antecedentes e identidad se validan persona por persona; el seguro es compartido.
- **Agregar prestador uno a uno** — ✅ `AltaPrestadorModal.tsx`, incluyendo el DNI. Marca el perfil con `origen = 'alta_administracion'`.
- **Carga masiva vía CSV/XLS** — ⏳ no empezada.

### Dos columnas que parecen una: "Documentación" y "Habilitado"

Es la decisión de diseño más importante de este panel, y no estaba en el diseño original.

- **Documentación** es un **estado derivado**: lo calcula `verificacion.ts` a partir de los papeles, y nadie lo edita a mano.
- **Habilitado** es una **decisión de la administración**, con su propio interruptor sobre `prestador_barrio.habilitado`.

Hubo un intento de sincronizarlas —que habilitado se pusiera solo cuando la documentación estaba completa— y rompió algo real: el filtro "Solo verificados" del propietario dejó de significar nada, porque una condición pasaba a implicar la otra. Son deliberadamente independientes. Un prestador puede estar **habilitado mientras termina de presentar el seguro**, o quedar **suspendido con todo en regla** por una decisión del barrio.

### Lo que la administración ve de las reseñas

✅ El panel muestra el puntaje y la cantidad de reseñas por prestador. Desde septiembre esos números **nacen del uso real** —pedido, elección y reseña del vecino— y no del seed. Es lo que le permite respaldarse ante una queja, que era uno de los jobs to be done del canvas.

## El agujero más concreto: los prestadores sugeridos

🔴 Cuando un propietario usa **"Proponé un prestador"**, el lead se guarda en `prestador_sugerido` — pero **ninguna pantalla lo lee**. La administración nunca se entera.

Es la tercera vía de alimentación del directorio descrita en `spec-jardinero.md`, y hoy está cortada a la mitad: entra el dato y no sale. Se arregla con una lista de sugeridos en el panel del barrio, con la opción de dar de alta desde ahí. Es chico y desbloquea una funcionalidad que ya está construida del lado del propietario.

## El cambio de modelo de datos — hecho

- **`prestador.disponible_urgencia`** — ✅ alimenta la estadística del resumen y el filtro del propietario.
- **`prestador.origen`** — ✅ texto simple con default `'autoregistro'`, sin `CHECK` (consistente con el resto de las migraciones, que no retrofittean enums). Valores usados: `autoregistro` y `alta_administracion`.
- **`prestador.documento`** (DNI) — ✅ no estaba previsto acá; es contra ese número que se valida la identidad.
- **Una verificación por prestador, no por barrio** — ✅ ver `migracion-verificacion-unica.sql`. Antes se duplicaban al sumar un barrio y convivía una copia vencida con la vigente, así que el panel mostraba la insignia bien y la alerta mal al mismo tiempo.
- **Carga masiva CSV/XLS** — ⏳ falta definir el formato y el mapeo a `prestador` + `prestador_servicio` + `verificacion`. No es una tabla nueva, es un proceso de importación a diseñar.

## Pendiente / a definir

- **Ver y gestionar los prestadores sugeridos** — el agujero de arriba. Lo más urgente de esta pantalla.
- **Requisitos de documentación por barrio** — las columnas `barrio.requiere_antecedentes / requiere_seguro_art / requiere_identidad` existen desde el principio, pero no hay UI: hoy se crean siempre los tres tipos. Es el último ítem 🟡 que queda en los tres canvas (ver `cobertura-propuesta-valor.md`).
- **Carga masiva**: columnas esperadas, validaciones y qué pasa si una fila falla.
- **Login (Supabase Auth)** — hoy el rol se elige de una lista, sin credenciales. Es lo que habilita reactivar el RLS y que cada administración vea solo sus barrios.
- **Trazabilidad de ingresos** (`ingreso`) — Fase 2, depende de integrar el control de accesos del barrio.

---

*Universidad de San Andrés · Maestría en Negocios Digitales (NBL) · Proyecto GreenGate*
