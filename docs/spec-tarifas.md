# GreenGate · Especificación — Tarifa de referencia del servicio principal

Documento de referencia sobre cómo el jardinero publica su precio: **una sola tarifa, mensual, la de jardinería**. El resto de los servicios se publican sin precio y se cotizan en cada pedido. Se apoya en [`catalogo-servicios.md`](catalogo-servicios.md) (los servicios y sus sub-alcances) y [`spec-jardinero.md`](spec-jardinero.md) (la sección "Tus servicios" del perfil).

> Estado: **implementado**. La última sección describe la extensión pendiente para cuando el piloto sume un segundo rubro.

## El problema

Antes de este cambio, el modelo permitía cargar un precio por cada servicio: `prestador.tarifa_referencia` para el principal y `prestador_servicio.tarifa` para cada especialidad adicional. Dos problemas con eso:

1. **Nadie los cargaba.** El formulario del jardinero nunca expuso las tarifas por especialidad — sólo escribe `prestador.tarifa_referencia`. Las únicas que existían venían de [`seed.sql`](../supabase/seed.sql). El resultado era un perfil con una tabla de servicios donde casi todas las filas decían *"sin precio cargado"*: una promesa de comparación que el producto no cumplía.

2. **El número no significaba nada sin unidad.** "Desde ARS 95.000" puede ser un mantenimiento mensual, una visita puntual o el rediseño entero de un jardín. Es exactamente la opacidad de precios que la encuesta identificó como dolor del propietario (*"percepción de cartel entre jardineros"*, 12%), y que [`ideas-competencia.md`](ideas-competencia.md) propone atacar con precios de referencia públicos. Un precio sin unidad no se puede comparar, así que no resolvía nada.

## La decisión

Tres reglas, y las tres se apoyan en que **el piloto arranca con un solo rubro: jardinería**.

1. **El servicio principal es jardinería, fijo.** No se elige. En el alta del jardinero y en el alta que hace la administración, el campo se muestra como texto no editable.
2. **La tarifa de referencia es mensual**, siempre. La unidad va en la etiqueta: *"Tarifa de referencia mensual (ARS)"* al cargarla, *"Desde ARS 95.000 por mes"* al mostrarla.
3. **Los servicios adicionales no llevan precio.** Se publican como etiquetas y se cotizan en cada pedido, según lo que necesite el cliente.

Por qué así:

- **Es honesto con lo que el jardinero sabe cotizar de antemano.** El mantenimiento mensual es lo que hace todas las semanas y tiene un precio de referencia claro. Una poda de árbol en altura o un rediseño de jardín dependen del caso puntual — pedirle un número genérico produce un dato inventado, peor que no tener ninguno.
- **Al haber un solo rubro con una sola unidad, la unidad es una constante, no un dato.** Esto es lo que hace que todo el cambio viva en la capa de presentación: **no hizo falta ninguna columna nueva ni ninguna migración**. Cuando haya un segundo rubro, la unidad pasa a ser un dato — ver la última sección.
- **No bloquea el futuro.** Cuando el flujo de pedidos con IA esté construido ([`spec-propietario.md`](spec-propietario.md)), el precio real de cada trabajo va a salir de la cotización, no de la ficha. La tarifa de referencia es un dato de **descubrimiento** — para decidir a quién pedirle presupuesto —, no el precio final.

## Impacto por pantalla

Cinco componentes, todos en la capa de presentación.

| Pantalla | Cambio |
|---|---|
| **Alta / edición del jardinero** (`JardineroOnboarding.tsx`) | El desplegable de servicio principal pasa a texto fijo, con la nota *"Por ahora GreenGate arranca solo con jardinería"*. La tarifa se rotula **mensual**. Las especialidades pasan a llamarse **"Servicios adicionales"**, con la aclaración de que se cotizan en cada pedido |
| **Alta por la administración** (`AltaPrestadorModal.tsx`) | Mismo tratamiento del servicio principal |
| **Panel del jardinero** (`JardineroPanel.tsx`) | El principal con su tarifa mensual; el resto como etiquetas bajo *"También ofrecés, a cotizar en cada pedido"* |
| **Ficha pública** (`PerfilJardinero.tsx`) | *"Desde ARS 95.000 por mes"*. La tabla de precios por especialidad se reemplaza por etiquetas. La documentación verificada pasa a mostrarse **debajo** de los servicios adicionales, con su propio título |
| **Directorio del propietario** (`PropietarioDirectorio.tsx`) | La unidad en la tarjeta de cada prestador |

Las tres pantallas que muestran el precio usan la **misma frase**: *"Desde ARS X por mes"*.

### Un detalle de implementación que importa

En el alta/edición del jardinero, el servicio principal **muestra el valor guardado en la base, no una constante**. La diferencia no es cosmética: si un prestador tuviera `'poda'` como rubro, una constante se lo habría sobrescrito silenciosamente al guardar el perfil. Mostrando el valor real, el dato nunca se pierde y la pantalla no miente.

En `AltaPrestadorModal` sí se usa una constante, porque ahí siempre se crea un registro nuevo: no hay dato previo que respetar.

## Modelo de datos

**Sin cambios.** Ninguna columna nueva, ninguna migración.

- `prestador.tipo_servicio_principal` ya tenía `default 'jardineria'`, así que sigue guardándose igual.
- `prestador.tarifa_referencia` sigue siendo el mismo número; lo único que cambia es cómo se rotula.
- **`prestador_servicio.tarifa` deja de usarse.** No se borra: la columna queda con los datos del seed por si más adelante se decide reintroducir precios por especialidad. Ninguna pantalla la lee ni la escribe.

### La convención no está garantizada por el esquema

El enum `tipo_servicio` sigue aceptando sus siete valores. Que todos los prestadores sean de jardinería es hoy una convención de la aplicación, no una restricción de la base: alguien podría insertar un prestador con `'poda'` desde el SQL Editor.

Eso no rompe nada — las pantallas muestran el rubro real —, pero **la etiqueta de la tarifa diría "mensual" sin condición**, y el precio de un podador probablemente sea por trabajo. Para normalizar prestadores heredados sin perder información, el rubro viejo se conserva como especialidad adicional antes de unificar:

```sql
-- 1) Preservar el rubro actual como servicio adicional
insert into prestador_servicio (prestador_id, tipo)
select id, tipo_servicio_principal
  from prestador
 where tipo_servicio_principal <> 'jardineria'
on conflict do nothing;

-- 2) Recién ahora, unificar el principal
update prestador
   set tipo_servicio_principal = 'jardineria'
 where tipo_servicio_principal <> 'jardineria';
```

`trabajo.tipo_servicio` **no se toca**: ahí los valores distintos de jardinería son historial real de trabajos que ocurrieron.

## Qué NO cubre

- **No es el precio final de nada.** Sigue siendo un dato orientativo de descubrimiento. El precio real de cada trabajo sale de la cotización del jardinero dentro del flujo de pedidos (`spec-propietario.md`, pantalla 5), que todavía no está construido.
- **No agrega precios por sub-alcance.** El `catalogo-servicios.md` define sub-alcances (poda de cerco vs. árbol en altura, pileta con o sin productos) que afectan mucho el precio. Modelarlos como tarifas separadas sería volver al problema del principio: muchos campos que nadie llena. Esa granularidad la resuelve la IA en el pedido, preguntando lo que corresponde.
- **No hay validación de rangos.** Nada impide cargar un precio absurdo. Con pocos prestadores por barrio y la administración validando cada alta, no hace falta todavía.

## Extensión pendiente: unidad de tarifa por servicio

Todo lo de arriba se apoya en que hay **un solo rubro con una sola unidad**. Cuando el piloto sume un segundo vertical (ver el mecanismo de medición de demanda en `ideas-competencia.md`), la unidad deja de ser una constante y pasa a ser un dato del prestador.

El diseño ya está resuelto:

- **Una columna nueva**: `alter table prestador add column if not exists unidad_tarifa text;` — texto simple sin `CHECK`, consistente con `prestador.origen`. Valores: `visita`, `mes`, `hora`, `proyecto`. Backfill a `'visita'`… o a `'mes'`, dado que es lo que este documento fija hoy.
- **Cada servicio declara sus unidades válidas**, y la primera es la que se propone por defecto. Ofrecer las cuatro en todos lados invita a cargar precios que no se pueden comparar:

| Servicio | Unidades admitidas | Por qué |
|---|---|---|
| Jardinería | mes · visita · hora | El mantenimiento es mensual; el corte suelto, por visita |
| Poda | proyecto · visita · hora | Un cerco o un árbol se presupuestan por trabajo |
| Riego | proyecto · visita · hora | Instalación nueva = proyecto; mantenimiento = visita |
| Diseño y paisajismo | proyecto · hora | Siempre es un trabajo cerrado |
| Fumigación | visita · proyecto | Aplicación puntual |
| Limpieza exterior | proyecto · visita · hora | Depende del tamaño del terreno |
| Otro | las cuatro | Categoría abierta por definición |

- **El mapa vive en un único lugar**, `src/labels.ts`, junto a `SERVICIO_LABELS` — mismo principio que ya se aplica a las insignias de verificación en `src/verificacion.ts`: el catálogo se declara una vez y todas las pantallas lo consumen.
- **Al cambiar el servicio principal**, si la unidad elegida ya no aplica (ej. "por mes" en diseño y paisajismo) se reemplaza automáticamente por la sugerida del servicio nuevo, para no dejar al jardinero en un estado inválido.

> Cuando se sume **piletas** al `enum tipo_servicio` (pendiente ya anotado en `catalogo-servicios.md`), sus unidades naturales son *mes · visita*: el mantenimiento de pileta es típicamente un abono periódico.

## Pendiente / a definir

- **Precios de referencia públicos por barrio.** Con la tarifa ya normalizada a una unidad conocida, se vuelve posible la vista tipo *"Jardinería: mantenimiento mensual desde $X"* que propone [`ideas-competencia.md`](ideas-competencia.md) (idea #3, inspirada en Clickie). Es una vista sobre datos que ya existen, no una funcionalidad nueva — pero requiere decidir dónde vive: ¿en la landing, en el directorio, en un panel de la administración?
- **Qué pasa con la tarifa cuando el pedido es de un servicio adicional.** Si el propietario le pide una poda a un jardinero, la tarifa publicada no aplica. Hoy está bien porque el jardinero cotiza cada pedido, pero conviene revisarlo cuando se construya la comparación de presupuestos.

---

*Universidad de San Andrés · Maestría en Negocios Digitales (NBL) · Proyecto GreenGate*
