# GreenGate · Modelo de datos (explicado simple)

Este documento explica, sin tecnicismos, cómo se organizan los datos que sustentan la herramienta. La implementación exacta está en [`supabase/schema.sql`](../supabase/schema.sql).

## La idea en una frase

Modelamos **12 entidades** (las "cajas" donde vive cada tipo de dato) y las relaciones entre ellas. La clave del diseño: separar lo que es **información fija** de una persona/lugar de lo que es un **hecho que ocurre** (un trabajo, una reseña, una verificación). Así cada dato se carga una sola vez y sirve para todo.

## Las 12 entidades

| Entidad | Qué guarda | De tu lista original |
|---|---|---|
| **Administración** | El cliente B2B (la administradora) | CUIT, contacto del decisor |
| **Barrio** | Cada barrio/country que gestiona | cantidad de lotes |
| **Lote** | Cada unidad funcional | nº de lote, m², contacto |
| **Propietario** | El vecino | contacto (celular, mail) |
| **Prestador** | El jardinero / proveedor (una persona o un equipo) | nombre, CUIT/CUIL, DNI, tipo de servicio |
| **Integrante** | Cada persona real de un prestador-equipo | — (surge al sumar equipos, jul 2026) |
| **Verificación** | Estado de la documentación (del prestador o de un integrante) | seguro, antecedentes penales |
| **Pedido** | La necesidad del propietario: una sola, con su descripción, el barrio y si es urgente | — (surge al separar el pedido de la respuesta, sep 2026) |
| **Solicitud** | La respuesta de *un* prestador a ese pedido: desde cuándo puede ir | — (ídem) |
| **Trabajo** | Cada servicio realizado | CUIT que trabajó, pago, método de pago |
| **Valoración** | La reseña del trabajo, anclada a la solicitud elegida | valoración del servicio |
| **Ingreso** *(Fase 2)* | Trazabilidad de entradas al barrio | — |

## La decisión de diseño más importante

En tu lista, varios datos figuraban dentro de **"Propietario"**:

- los CUITs que ya trabajaron en cada lote
- el pago realizado por ese trabajo
- la valoración del servicio
- la vía / método de pago

**Esos datos no describen al propietario: describen cada _trabajo_ que pasó.** Por eso los pusimos en la entidad **Trabajo** (y la nota en **Valoración**). El razonamiento sigue valiendo, aunque `Trabajo` todavía no se escriba desde la app — ver más abajo por qué. Ventaja: el mismo dato sirve a la vez para:

- calcular el **puntaje** del prestador (promedio de sus valoraciones),
- mostrar el **historial** de servicios de cada lote,
- y, más adelante, sumar los **ingresos** del prestador.

Sin duplicar ni desincronizar nada.

## La segunda decisión importante: un pedido, muchas respuestas (sep 2026)

Al principio había una sola caja, `Solicitud`, que era **1 propietario → 1 prestador**. Si el vecino quería consultar a tres jardineros, se creaban tres filas sueltas, sin nada que las relacionara: no se podían comparar porque el sistema no sabía que eran la misma necesidad.

Se partió en dos:

- **Pedido** — la necesidad. Se escribe una vez: qué necesita, en qué barrio, si es urgente.
- **Solicitud** — la respuesta de cada jardinero a ese pedido. Cuántos jardineros eligió el vecino, tantas solicitudes.

Es lo que hace posible la comparación: las N respuestas cuelgan del mismo pedido, así que ponerlas una al lado de la otra es leer una lista, no cruzar datos sueltos.

**Lo que la solicitud guarda cambió sobre la marcha.** Se había pensado que el jardinero respondiera con un precio. No funciona: no puede cotizar un jardín que no vio, así que el número era una adivinanza o un precio inflado para cubrirse — y el vecino los comparaba como si fueran equivalentes. Hoy responde **desde cuándo puede ir** (`disponible_desde`), con una aclaración y un estimado opcional marcado como a confirmar. El precio se acuerda en la visita.

## Otras dos decisiones

1. **"Prestador" en lugar de "Jardinero".** Cada prestador tiene un *tipo de servicio principal*. Jardinería es el primero; cuando sumes plomería, fumigación, etc., no hay que rehacer el modelo. (El proyecto ya prevé esta expansión.)

2. **El puntaje se calcula, no se carga.** Si se cargara a mano se desincronizaría y perdería credibilidad —justo lo que el producto promete resolver—. Lo calcula la vista `prestador_directorio` a partir de las valoraciones.

## Prestador unipersonal vs. equipo (julio 2026)

Un jardinero puede trabajar solo, o en un grupo de personas que no necesariamente forman una empresa registrada. El modelo tenía que soportar los dos casos sin duplicar reglas ni crear una fuente de verdad contradictoria:

- **Unipersonal** (como era desde el principio): el `Prestador` **es** la persona. Sus verificaciones (antecedentes, identidad, seguro) le pertenecen directamente a él. Nada cambió acá.
- **Equipo**: el `Prestador` pasa a ser el **nombre público** — el que ve el propietario en el directorio, con un solo puntaje y una sola ficha, sin desglosar quién lo integra. Pero **antecedentes e identidad son datos de una persona real**, no de un nombre comercial: por eso cada `Integrante` tiene sus propias verificaciones. El **seguro/ART sigue siendo del equipo** (una póliza real suele cubrir a toda la cuadrilla), no de cada persona.

La regla que se deriva de esto: **un equipo está "verificado" solo si TODOS sus integrantes activos tienen antecedentes e identidad al día.** Si falta uno solo, el equipo entero aparece como no verificado — es la misma exigencia que ya existía, aplicada persona por persona en vez de una sola vez.

Esta regla vive en un único lugar del código (`src/verificacion.ts`), consumida igual por las tres pantallas (propietario, jardinero, administración), siguiendo el mismo principio que ya usábamos para los vencimientos: **el estado se deriva, no se carga a mano en cada pantalla.**

## Dato sensible (importante, legal)

"Antecedentes penales" es un **dato sensible** bajo la **Ley 25.326** de Protección de Datos Personales; CUIT y domicilio también son datos personales. Por eso, en **Verificación** guardamos **solo el estado** (`verificado` / `vigente` / `vencido` / `rechazado`) + fecha + quién validó — **no el documento penal ni la póliza**. Es lo que la administración necesita (saber que está OK y vigente) y baja muchísimo la exposición legal.

## Cómo se conectan (relaciones)

> Regla simple: en una relación "uno a muchos", la referencia (la clave foránea) vive del lado "muchos". Por eso las dos relaciones clave **ya quedan cubiertas sin cambiar el esquema**.

- Una **Administración** gestiona muchos **Barrios** (1:N). Cada barrio tiene una sola administración.
- Un **Barrio** tiene muchos **Lotes** (1:N).
- Un **Propietario** puede tener muchos **Lotes** (1:N). Y como cada lote está en su propio barrio, **un mismo propietario puede tener lotes en distintos barrios**. El propietario no está atado a ningún barrio: se vincula a través de sus lotes.
- Un **Prestador** trabaja en muchos **Barrios**, y cada barrio tiene muchos prestadores (N:M).
- Un **Prestador** tiene varios **Integrantes** cuando es un equipo (1:N). Si no tiene ninguno, es unipersonal.
- Un **Prestador** (o, si es equipo, cada uno de sus **Integrantes**) tiene varias **Verificaciones** (una por tipo: antecedentes, seguro, identidad).
- Un **Pedido** tiene muchas **Solicitudes** (1:N) — una por cada prestador que el propietario eligió consultar.
- Una **Solicitud** apunta a un **Prestador** y a un **Pedido**.
- Un **Trabajo** conecta un **Lote** + un **Propietario** + un **Prestador**.
- Una **Valoración** apunta a un **Prestador** y cuelga de la **Solicitud elegida**.

### Co-propiedad (decisión abierta)
Hoy cada lote tiene **un** propietario. Si más adelante necesitás que un lote tenga **más de un dueño** (matrimonios, familias), se agrega una tabla intermedia `lote_propietario` sin romper nada de lo ya cargado.

## Por qué la reseña cuelga de la solicitud y no del trabajo

El diseño original decía que la valoración pertenecía a un **Trabajo**, y conceptualmente sigue siendo lo correcto: una reseña califica un servicio prestado.

Pero `Trabajo` exige un **lote**, y sin login el propietario no tiene lote asignado — se identifica por los pedidos guardados en su navegador. Esperar al login para tener reseñas habría dejado el directorio con puntajes de ejemplo indefinidamente, que es justamente lo que el producto promete resolver.

La salida fue anclar la reseña a la **solicitud elegida**. Es una prueba suficiente de que el trato existió: ese vecino eligió a ese jardinero para ese pedido. Un índice único sobre `solicitud_id` garantiza **una reseña por trabajo**, que es lo que impide inflar un puntaje.

`Trabajo` queda modelada y sin uso, esperando a la Fase 2: con pago digital de por medio hay un hecho concreto que registrar, y con login el lote deja de ser un obstáculo.

## El directorio (corazón del MVP)

La vista `prestador_directorio` arma, para cada prestador, su **puntaje promedio** y la **cantidad de reseñas**. Es exactamente la pantalla #1 que pidió la encuesta (79%).

Las **insignias de verificación** (antecedentes ✓, seguro ✓, identidad ✓) que se ven junto al puntaje **no** salen de esta vista: las calcula `src/verificacion.ts` en el momento, cruzando las verificaciones del prestador (y, si es un equipo, las de cada integrante). Se sacaron de la vista a propósito, porque un simple "¿existe una verificación vigente?" en SQL no alcanza para saber si *todo* un equipo está al día — esa lógica necesita vivir en un solo lugar, no repetirse (y potencialmente desincronizarse) en la base y en el frontend a la vez.
