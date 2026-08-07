# GreenGate · Especificación — Tarifa de referencia del servicio principal

Documento de referencia para el cambio en cómo el jardinero publica sus precios: **una sola tarifa, la del servicio principal, con su unidad**. Se apoya en [`catalogo-servicios.md`](catalogo-servicios.md) (los servicios y sus sub-alcances) y [`spec-jardinero.md`](spec-jardinero.md) (la sección "Tu servicio" del perfil).

## El problema

Hoy el modelo permite cargar un precio por cada servicio: `prestador.tarifa_referencia` para el principal y `prestador_servicio.tarifa` para cada especialidad adicional. Dos problemas con eso:

1. **Nadie los carga.** El formulario del jardinero nunca expuso las tarifas por especialidad — sólo escribe `prestador.tarifa_referencia`. Las únicas tarifas por especialidad que existen vienen de [`seed.sql`](../supabase/seed.sql). El resultado es que el perfil muestra una tabla de servicios donde casi todas las filas dicen *"sin precio cargado"*: una promesa de comparación que el producto no cumple.

2. **El número no significa nada sin unidad.** "Desde ARS 30.000" puede ser un corte de césped mensual, una visita puntual o el rediseño entero de un jardín. Es exactamente la opacidad de precios que la encuesta identificó como dolor del propietario (*"percepción de cartel entre jardineros"*, 12%), y que [`ideas-competencia.md`](ideas-competencia.md) propone atacar con precios de referencia públicos. Un precio sin unidad no se puede comparar, así que no resuelve nada.

## La decisión

**Un solo precio de referencia, el del servicio principal, siempre acompañado de su unidad.** Las especialidades adicionales se publican sin precio: se cotizan en cada presupuesto.

Por qué así:

- **Es honesto con lo que el jardinero realmente sabe cotizar de antemano.** Su servicio principal es el que hace todas las semanas y tiene un precio de referencia claro. Una poda de árbol en altura o un rediseño de jardín dependen del caso puntual — pedirle un número genérico produce un dato inventado, peor que no tener ninguno.
- **Elimina la ambigüedad estructuralmente.** Como `tipo_servicio_principal` es una columna única de `prestador` (ver más abajo), hay exactamente una tarifa y una unidad por prestador. No hay que decidir cuál de N filas es "la principal", ni existe el caso de dos marcadas o ninguna.
- **No bloquea el futuro.** Cuando el flujo de pedidos con IA esté construido ([`spec-propietario.md`](spec-propietario.md)), el precio real de cada trabajo va a salir de la cotización, no de la ficha. La tarifa de referencia es un dato de descubrimiento — para decidir a quién pedirle presupuesto —, no el precio final.

## Unidades de tarifa

Cuatro valores: **por visita**, **por mes**, **por hora**, **por proyecto**.

No todas aplican a todos los servicios. Ofrecer las cuatro en todos lados invita a cargar precios que no se pueden comparar entre sí, así que cada servicio declara las suyas y la primera es la que se propone por defecto:

| Servicio | Unidades admitidas (la primera es el default) | Por qué |
|---|---|---|
| **Jardinería** | visita · mes · hora | El corte de césped se cobra por visita, o mensual si es recurrente |
| **Poda** | proyecto · visita · hora | Un cerco o un árbol se presupuestan por trabajo, no por unidad de tiempo |
| **Riego** | proyecto · visita · hora | Instalación nueva = proyecto; mantenimiento = visita |
| **Diseño y paisajismo** | proyecto · hora | Siempre es un trabajo cerrado; no tiene sentido "por mes" |
| **Fumigación** | visita · proyecto | Aplicación puntual |
| **Limpieza exterior** (desmalezamiento) | proyecto · visita · hora | Depende del tamaño del terreno |
| **Otro** | las cuatro | Categoría abierta por definición |

Este mapa vive en un único lugar del código, `src/labels.ts`, junto a `SERVICIO_LABELS` — mismo principio que ya se aplica a las insignias de verificación en `src/verificacion.ts`: **el catálogo se declara una vez y todas las pantallas lo consumen**, en vez de repetir la lista en cada formulario.

> Cuando se sume **piletas** al `enum tipo_servicio` (pendiente ya anotado en `catalogo-servicios.md`), sus unidades naturales son *mes · visita*: el mantenimiento de pileta es típicamente un abono periódico.

## Cambio de modelo de datos

Una sola columna nueva:

```sql
alter table prestador add column if not exists unidad_tarifa text;
```

- **Texto simple, sin `CHECK`**, consistente con el resto de las migraciones del proyecto (`prestador.origen` se resolvió igual). Valores usados por la app: `visita`, `mes`, `hora`, `proyecto`.
- **Nullable**: un jardinero puede no haber cargado precio todavía. La regla es que `unidad_tarifa` sólo tiene sentido si `tarifa_referencia` no es nula — al guardar, si no hay tarifa la unidad se graba `null`.
- **Backfill**: los prestadores que ya tienen `tarifa_referencia` cargada (los del seed) quedarían sin unidad. La migración les asigna `'visita'`, que es el supuesto más seguro para jardinería general; el jardinero lo corrige desde su perfil.

**`prestador_servicio.tarifa` deja de usarse.** No se borra: la columna queda en la base con los datos del seed, por si más adelante se decide reintroducir precios por especialidad. Ninguna pantalla la lee ni la escribe.

## Impacto por pantalla

### Perfil del jardinero (`JardineroOnboarding.tsx`)

La tarifa ya está al lado del servicio principal (commit `62bf789`). Se le suma el selector de unidad, pegado al monto, y el label pasa a ser dinámico:

> **Tarifa de referencia de Jardinería (ARS)** → `[ 25000 ] [ por visita ▾ ]`

El selector ofrece sólo las unidades válidas del servicio principal elegido. **Si el jardinero cambia su servicio principal y la unidad ya no aplica** (ej. tenía "por mes" en jardinería y pasa a diseño y paisajismo), se reemplaza automáticamente por la sugerida del servicio nuevo — no se lo deja en un estado inválido ni se le pide que lo arregle a mano.

Bajo las especialidades adicionales, una línea aclara que **no llevan precio: se cotizan en cada presupuesto**. Es donde aparece la duda, así que es donde va la respuesta.

### Panel del jardinero (`JardineroPanel.tsx`)

La sección "Tus servicios" deja de ser una tabla de filas iguales. El principal se muestra con su tarifa y unidad; el resto, como chips verdes bajo *"También ofrecés, a cotizar en cada presupuesto"*. La jerarquía visual refleja la del modelo.

La métrica **"Servicios activos"** sigue contando el principal más las especialidades.

### Ficha pública (`PerfilJardinero.tsx`)

La tarifa se muestra con su unidad: *"Desde ARS 25.000 por visita"*. La tabla "Servicios y precios de referencia" —que con este cambio diría *"sin precio cargado"* en todas sus filas— se reemplaza por los mismos chips verdes, con la aclaración de que esos servicios se cotizan en el presupuesto.

### Directorio del propietario (`PropietarioDirectorio.tsx`)

Misma corrección en la tarjeta de cada prestador: *"Desde ARS 25.000 por visita"*. Es la pantalla donde el propietario compara, así que es donde la unidad más falta.

## Qué NO cubre este cambio

- **No es el precio final de nada.** Sigue siendo un dato orientativo de descubrimiento. El precio real de cada trabajo sale de la cotización del jardinero dentro del flujo de pedidos (`spec-propietario.md`, pantalla 5), que todavía no está construido.
- **No agrega precios por sub-alcance.** El `catalogo-servicios.md` define sub-alcances (poda de cerco vs. árbol en altura, pileta con o sin productos) que afectan mucho el precio. Modelarlos como tarifas separadas sería volver al problema de arriba: muchos campos que nadie llena. Esa granularidad la resuelve la IA en el pedido, preguntando lo que corresponde.
- **No hay validación de rangos.** Nada impide cargar un precio absurdo. Con pocos prestadores por barrio y la administración validando cada alta, no hace falta todavía.

## Pendiente / a definir

- **Precios de referencia públicos por barrio.** Con tarifa + unidad ya normalizadas, se vuelve posible la vista tipo *"Jardinería: mantenimiento mensual desde $X · Poda desde $Y"* que propone [`ideas-competencia.md`](ideas-competencia.md) (idea #3, inspirada en Clickie). Es una vista sobre datos que ya existen, no una funcionalidad nueva — pero requiere decidir dónde vive: ¿en la landing, en el directorio, en un panel de la administración?
- **Qué pasa con la unidad cuando el pedido es de una especialidad.** Si el propietario le pide una poda a un jardinero cuyo principal es jardinería, la tarifa publicada no aplica. Hoy eso está bien porque el jardinero cotiza cada pedido, pero conviene revisarlo cuando se construya la comparación de presupuestos.
- **Piletas**: sumar el valor al `enum tipo_servicio` y sus unidades al mapa (ver `catalogo-servicios.md`).

---

*Universidad de San Andrés · Maestría en Negocios Digitales (NBL) · Proyecto GreenGate*
