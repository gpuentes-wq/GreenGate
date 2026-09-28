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

## Los prestadores sugeridos · ✅ *(era el agujero más concreto)*

Cuando un propietario usa **"Proponé un prestador"**, el lead se guarda en `prestador_sugerido`. Durante meses **ninguna pantalla lo leyó**: entraba el dato y no salía, así que la tercera vía de alimentación del directorio descrita en `spec-jardinero.md` estaba cortada a la mitad. Ya está cerrada.

El panel del barrio muestra un bloque **"🌱 Propuestos por vecinos"** con los pendientes de ese barrio, y de cada uno: el nombre, el contacto, la nota que dejó el vecino, quién lo propuso y cuándo. Dos acciones:

- **Dar de alta** abre el mismo `AltaPrestadorModal` de siempre, **precargado** con lo que escribió el vecino. La administración corrige lo que haga falta y completa el DNI, que el vecino no tiene por qué saber. Al crearse el prestador, el lead se cierra solo apuntando al prestador que originó.
- **Descartar** lo saca de la lista sin borrar la fila.

Va en **verde y no en ámbar** a propósito: el ámbar de este panel significa "algo está por vencerse". Una recomendación de un vecino pide una acción, pero es buena noticia.

**Aviso de posible duplicado.** Si el nombre propuesto se parece al de alguien que ya está en el directorio del barrio, la fila lo advierte. Es el lead inútil más frecuente: el vecino no encontró a su jardinero porque buscó mal, no porque falte. Sin el aviso, la administración lo da de alta dos veces y el directorio queda con dos fichas de la misma persona, cada una con sus reseñas.

> **Descartar no borra.** Que un vecino haya recomendado a alguien es información que conviene conservar aunque no se lo dé de alta: si tres vecinos distintos proponen al mismo, eso dice algo que una fila borrada no diría.

## El cambio de modelo de datos — hecho

- **`prestador.disponible_urgencia`** — ✅ alimenta la estadística del resumen y el filtro del propietario.
- **`prestador.origen`** — ✅ texto simple con default `'autoregistro'`, sin `CHECK` (consistente con el resto de las migraciones, que no retrofittean enums). Valores usados: `autoregistro` y `alta_administracion`.
- **`prestador.documento`** (DNI) — ✅ no estaba previsto acá; es contra ese número que se valida la identidad.
- **Una verificación por prestador, no por barrio** — ✅ ver `migracion-verificacion-unica.sql`. Antes se duplicaban al sumar un barrio y convivía una copia vencida con la vigente, así que el panel mostraba la insignia bien y la alerta mal al mismo tiempo.
- **`prestador_sugerido.estado / prestador_id / resuelto_en`** — ✅ `migracion-sugerido-estado.sql`. La tabla guardaba el lead y nada más; sin estado, el que ya se dio de alta seguía apareciendo como pendiente para siempre. `estado` es texto con default `'pendiente'`, mismo criterio que `origen`: valores `pendiente`, `dado_de_alta` y `descartado`.
- **Carga masiva CSV/XLS** — ⏳ falta definir el formato y el mapeo a `prestador` + `prestador_servicio` + `verificacion`. No es una tabla nueva, es un proceso de importación a diseñar.

## Pendiente / a definir

- **Requisitos de documentación por barrio** — las columnas `barrio.requiere_antecedentes / requiere_seguro_art / requiere_identidad` existen desde el principio, pero no hay UI: hoy se crean siempre los tres tipos. Es el último ítem 🟡 que queda en los tres canvas (ver `cobertura-propuesta-valor.md`).
- **Carga masiva**: columnas esperadas, validaciones y qué pasa si una fila falla.
- **Login (Supabase Auth)** — hoy el rol se elige de una lista, sin credenciales. Es lo que habilita reactivar el RLS y que cada administración vea solo sus barrios.
- **Trazabilidad de ingresos** (`ingreso`) — Fase 2, depende de integrar el control de accesos del barrio.

---

*Universidad de San Andrés · Maestría en Negocios Digitales (NBL) · Proyecto GreenGate*
