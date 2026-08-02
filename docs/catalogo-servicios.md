# GreenGate · Catálogo de servicios (MVP)

Listado de los servicios de jardinería y derivados que contempla esta primera versión del MVP, con sus sub-alcances. Sirve de base para el esquema de preguntas que usará la IA en el flujo de pedido (ver [`estrategia-piloto.md`](estrategia-piloto.md)).

## Servicios

| # | Servicio | Sub-alcances |
|---|---|---|
| 1 | **Jardinería general** | Corte de césped (la base, lo más común) · Cuidado de ollas y canteros (opcional, suele cotizarse aparte — no todos los que hacen corte lo incluyen) |
| 2 | **Poda** | Cercos vivos / setos (altura de persona, sin equipo especial) · Árboles en altura (requiere trabajo en altura, más riesgo, posible equipo especial) |
| 3 | **Riego** | Instalación de sistema nuevo, desde cero (normalmente requiere un especialista) · Mantenimiento de sistema existente (lo puede resolver un jardinero general) |
| 4 | **Diseño y paisajismo** | Servicio único (rediseño puntual del jardín) · Parte de un mantenimiento integral, más premium (combinado con jardinería recurrente) |
| 5 | **Fumigación y control de plagas** | Fumigación para prevenir/eliminar insectos · Fumigación y/o fertilización localizada en zonas específicas del jardín |
| 6 | **Desmalezamiento** *(antes "limpieza exterior")* | Terrenos con pasto muy largo o plantas grandes descontroladas |
| 7 | **Cuidado de piletas** *(categoría nueva)* | Con o sin productos incluidos (ácido/cloro/otros) · Pasada de barrefondos · Control de PH · Limpieza de hojas y superficie |
| 8 | **Otro** | Categoría abierta — alimenta la funcionalidad de "pedí el servicio que te falta" del landing |

## Por qué importan los sub-alcances

Cada sub-alcance define una pregunta clave que la IA le va a hacer al propietario dentro del esquema de descubrimiento del pedido (ver sección "Diseño del flujo de descubrimiento" en `estrategia-piloto.md`) — por ejemplo, en jardinería general la pregunta de si incluye ollas y canteros, o en poda si es cerco o árbol en altura. Esto es lo que después determina qué campos preguntar (tamaño, altura, tipo de instalación, etc.) y ayuda a que el precio cotizado sea preciso.

## Esquema de preguntas por servicio

Preguntas que la IA le hace al propietario para armar el pedido, siguiendo el principio de "extraer primero, preguntar después" definido en `estrategia-piloto.md`: si el dato ya vino en el texto libre o se puede inferir de una foto, la pregunta se salta. El tope duro es 10 preguntas, pero en la práctica la mayoría de los pedidos se resuelven con muchas menos.

### Jardinería general

*Siempre (si no vienen ya en el texto/foto inicial):*
1. ¿Necesitás solo corte de césped, o también cuidado de ollas y canteros? *(alcance)*
2. ¿Qué tamaño tiene aproximadamente el jardín? — chico/mediano/grande, o m² si lo sabés *(tamaño)*
3. ¿Es un servicio puntual (una vez) o querés que sea mensual/recurrente? *(frecuencia)*

*Condicionales (solo si hace falta):*
4. ¿El pasto está muy crecido o es mantenimiento regular? *(estado)* — se salta si se puede ver en la foto
5. ¿Hay algo que el jardinero deba tener en cuenta? (plantas delicadas, mascotas, riego automático, etc.) *(especificaciones)* — se salta si ya lo mencionó
6. ¿Para cuándo lo necesitás? *(urgencia)* — se salta si ya quedó claro

### Poda

*Siempre:*
1. ¿Es poda de cercos/setos o de árboles? *(alcance — determina las preguntas siguientes)*
2. Cantidad aproximada — metros de cerco, o cantidad de árboles *(tamaño)*
3. ¿Es puntual o parte de un mantenimiento periódico? *(frecuencia)*

*Condicionales, solo si es árboles:*
4. ¿Qué altura aproximada tienen? *(altura)* — clave para saber si hace falta equipo especial
5. ¿Hay cables o tendido eléctrico cerca? *(seguridad)* — afecta el riesgo y quién puede tomarlo

*Condicionales, solo si es cerco:*
6. ¿Alguna forma o estilo particular que quieras mantener? *(especificaciones)* — opcional

*Siempre que no haya quedado claro:*
7. ¿Para cuándo lo necesitás? *(urgencia)*

### Riego

*Siempre:*
1. ¿Es instalación de un sistema nuevo, o mantenimiento de uno que ya existe? *(alcance — determina las preguntas siguientes)*
2. ¿Qué tamaño tiene el área a regar? — m² o cantidad de sectores *(tamaño)*

*Condicionales, solo si es instalación nueva:*
3. ¿Ya tenés una fuente de agua disponible cerca? *(infraestructura)*
4. ¿Cuántas zonas distintas querés regar por separado? *(complejidad del sistema)*

*Condicionales, solo si es mantenimiento:*
5. ¿Qué problema estás teniendo? (aspersores tapados, fugas, no prende, etc.) *(diagnóstico)*

*Siempre:*
6. ¿Es puntual o querés que quede como mantenimiento periódico? *(frecuencia)*
7. ¿Para cuándo lo necesitás? *(urgencia)* — solo si no quedó claro

### Diseño y paisajismo

*Siempre:*
1. ¿Es un rediseño puntual, o querés incorporarlo como parte de un mantenimiento integral recurrente? *(alcance)*
2. ¿Qué área del jardín querés rediseñar? — todo el jardín, o un sector puntual *(tamaño/alcance espacial)*
3. ¿Tenés alguna idea o estilo en mente, o preferís que te propongan algo? *(especificaciones)*

*Condicionales:*
4. ¿Buscás sumar riego automático, iluminación u otros elementos además de plantas? *(elementos adicionales)* — se salta si ya lo mencionó
5. ¿Tenés un presupuesto aproximado en mente? *(opcional)* — ayuda a calibrar la propuesta, no es obligatoria

*Siempre que no haya quedado claro:*
6. ¿Para cuándo te gustaría tenerlo listo? *(plazo)*

### Fumigación y control de plagas

*Siempre:*
1. ¿Buscás prevenir/eliminar insectos y plagas, o es más una fertilización localizada de alguna zona? *(alcance)*
2. ¿Qué área necesita tratamiento? — todo el jardín o una zona puntual *(tamaño/alcance espacial)*

*Condicionales, solo si es control de plagas:*
3. ¿Identificaste qué tipo de plaga es? (hormigas, pulgones, etc.) *(especificación)* — se salta si no lo sabe, queda "a diagnosticar por el prestador"
4. ¿Hay mascotas o niños que frecuenten el jardín? *(seguridad)* — algunos productos requieren cuidado especial

*Condicionales, solo si es fertilización:*
5. ¿Qué tipo de plantas necesitan el tratamiento? *(especificación)*

*Siempre:*
6. ¿Es puntual o querés que sea periódico? *(frecuencia)*
7. ¿Para cuándo lo necesitás? *(urgencia)* — solo si no quedó claro

### Desmalezamiento

*Siempre:*
1. ¿Qué tamaño tiene aproximadamente el terreno? *(tamaño)*
2. ¿Qué tan crecido está? — pasto alto, arbustos descontrolados, o ambos *(estado/alcance)*

*Condicionales:*
3. ¿Hay algo que el jardinero deba evitar o conservar? (plantas que sí querés mantener, mangueras enterradas, etc.) *(especificaciones)* — se salta si no aplica
4. ¿Querés que se lleven los residuos, o los dejás vos? *(logística)* — afecta el precio

*Siempre que no haya quedado claro:*
5. ¿Para cuándo lo necesitás? *(urgencia)*

### Cuidado de piletas

*Siempre:*
1. ¿Necesitás que incluya los productos (ácido/cloro/otros), o los ponés vos? *(alcance — afecta el precio)*
2. ¿Qué tamaño tiene la pileta aproximadamente? *(tamaño)*

*Condicionales:*
3. ¿Es apertura/cierre de temporada, o mantenimiento regular? *(alcance temporal)*
4. ¿Es puntual o querés que sea periódico (ej. semanal)? *(frecuencia)*
5. ¿Cómo está el agua ahora? (turbia, con hojas, algas, etc.) *(estado)* — se salta si se puede ver en la foto

*Siempre que no haya quedado claro:*
6. ¿Para cuándo lo necesitás? *(urgencia)*

*(La categoría "Otro" queda sin esquema fijo por definición — es la vía abierta para pedidos que no encajan en las anteriores.)*

## Pendientes técnicos (para cuando se lleve a código)

- **Agregar "piletas" a la base de datos.** Hoy el `enum tipo_servicio` en `supabase/schema.sql` no lo contempla — hace falta una migración (`ALTER TYPE tipo_servicio ADD VALUE 'piletas'`).
- **Renombrar la etiqueta de "limpieza exterior" a "Desmalezamiento".** Solo cambia el texto visible en `src/labels.ts` (`SERVICIO_LABELS`), no la base de datos — el valor interno `limpieza_exterior` se mantiene.

---

*Universidad de San Andrés · Maestría en Negocios Digitales (NBL) · Proyecto GreenGate*
