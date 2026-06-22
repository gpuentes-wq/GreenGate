# GreenGate · Modelo de datos (explicado simple)

Este documento explica, sin tecnicismos, cómo se organizan los datos que sustentan la herramienta. La implementación exacta está en [`supabase/schema.sql`](../supabase/schema.sql).

## La idea en una frase

Modelamos **9 entidades** (las "cajas" donde vive cada tipo de dato) y las relaciones entre ellas. La clave del diseño: separar lo que es **información fija** de una persona/lugar de lo que es un **hecho que ocurre** (un trabajo, una reseña, una verificación). Así cada dato se carga una sola vez y sirve para todo.

## Las 9 entidades

| Entidad | Qué guarda | De tu lista original |
|---|---|---|
| **Administración** | El cliente B2B (la administradora) | CUIT, contacto del decisor |
| **Barrio** | Cada barrio/country que gestiona | cantidad de lotes |
| **Lote** | Cada unidad funcional | nº de lote, m², contacto |
| **Propietario** | El vecino | contacto (celular, mail) |
| **Prestador** | El jardinero / proveedor | nombre, CUIT/CUIL, domicilio, tipo de servicio, horario, zona preferente |
| **Verificación** | Estado de la documentación del prestador | seguro, antecedentes penales |
| **Trabajo** | Cada servicio realizado | CUIT que trabajó, pago, método de pago |
| **Valoración** | La reseña de un trabajo | valoración del servicio |
| **Ingreso** *(Fase 2)* | Trazabilidad de entradas al barrio | — |

## La decisión de diseño más importante

En tu lista, varios datos figuraban dentro de **"Propietario"**:

- los CUITs que ya trabajaron en cada lote
- el pago realizado por ese trabajo
- la valoración del servicio
- la vía / método de pago

**Esos datos no describen al propietario: describen cada _trabajo_ que pasó.** Por eso los pusimos en la entidad **Trabajo** (y la nota en **Valoración**). Ventaja: el mismo dato sirve a la vez para:

- calcular el **puntaje** del prestador (promedio de sus valoraciones),
- mostrar el **historial** de servicios de cada lote,
- y, más adelante, sumar los **ingresos** del prestador.

Sin duplicar ni desincronizar nada.

## Otras dos decisiones

1. **"Prestador" en lugar de "Jardinero".** Cada prestador tiene un *tipo de servicio principal*. Jardinería es el primero; cuando sumes plomería, fumigación, etc., no hay que rehacer el modelo. (El proyecto ya prevé esta expansión.)

2. **El puntaje se calcula, no se carga.** Si se cargara a mano se desincronizaría y perdería credibilidad —justo lo que el producto promete resolver—. Lo calcula la vista `prestador_directorio` a partir de las valoraciones.

## Dato sensible (importante, legal)

"Antecedentes penales" es un **dato sensible** bajo la **Ley 25.326** de Protección de Datos Personales; CUIT y domicilio también son datos personales. Por eso, en **Verificación** guardamos **solo el estado** (`verificado` / `vigente` / `vencido` / `rechazado`) + fecha + quién validó — **no el documento penal ni la póliza**. Es lo que la administración necesita (saber que está OK y vigente) y baja muchísimo la exposición legal.

## Cómo se conectan (relaciones)

> Regla simple: en una relación "uno a muchos", la referencia (la clave foránea) vive del lado "muchos". Por eso las dos relaciones clave **ya quedan cubiertas sin cambiar el esquema**.

- Una **Administración** gestiona muchos **Barrios** (1:N). Cada barrio tiene una sola administración.
- Un **Barrio** tiene muchos **Lotes** (1:N).
- Un **Propietario** puede tener muchos **Lotes** (1:N). Y como cada lote está en su propio barrio, **un mismo propietario puede tener lotes en distintos barrios**. El propietario no está atado a ningún barrio: se vincula a través de sus lotes.
- Un **Prestador** trabaja en muchos **Barrios**, y cada barrio tiene muchos prestadores (N:M).
- Un **Prestador** tiene varias **Verificaciones** (una por tipo: antecedentes, seguro, identidad).
- Un **Trabajo** conecta un **Lote** + un **Propietario** + un **Prestador**.
- Una **Valoración** pertenece a un **Trabajo** y apunta a un **Prestador**.

### Co-propiedad (decisión abierta)
Hoy cada lote tiene **un** propietario. Si más adelante necesitás que un lote tenga **más de un dueño** (matrimonios, familias), se agrega una tabla intermedia `lote_propietario` sin romper nada de lo ya cargado.

## El directorio (corazón del MVP)

La vista `prestador_directorio` arma, para cada prestador: su puntaje promedio, la cantidad de reseñas y las **insignias de verificación** (antecedentes ✓, seguro ✓, identidad ✓). Es exactamente la pantalla #1 que pidió la encuesta (79%).
