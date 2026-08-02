# GreenGate · Especificación de pantallas — Propietario

Documento de referencia para el desarrollo de las pantallas del rol propietario en el MVP. Se apoya en lo ya definido en [`estrategia-piloto.md`](estrategia-piloto.md) (flujo de IA, comparación multi-jardinero) y [`catalogo-servicios.md`](catalogo-servicios.md) (esquema de preguntas por servicio).

## Datos de login (para más adelante)

El login (Supabase Auth) no está incluido en este MVP todavía, pero al implementarlo hay que capturar: **Nombre, mail, teléfono, barrio y lote.** Es la base para conectar al propietario con el resto del modelo (filtrar por su barrio, asociar sus trabajos a su lote).

## Las 6 pantallas

### 1. Solicitud de servicio

- Cuadro de texto libre para describir la necesidad → dispara la IA, que preselecciona los prestadores disponibles (se ven en la pantalla siguiente).
- **Acceso rápido a "Urgencia"**, separado del cuadro de texto: un atajo directo a los jardineros de jardinería general marcados como disponibles para urgencia ahora, sin pasar por el flujo completo de descripción. Ver `spec-jardinero.md` (el tilde "Abierto a servicios de urgencia") y la sección "Diferencial: servicio de urgencia" en `estrategia-piloto.md`.

> La recurrencia (si el trabajo termina siendo puntual o se vuelve mensual) ya no se elige de antemano acá — se define recién en la conversación de cotización, entre propietario y jardinero (ver pantalla 5).

> Esta descripción inicial es liviana a propósito: sirve para que la IA clasifique el tipo de servicio y arme la lista de candidatos, no busca ser exhaustiva todavía. Es el mismo pedido que se termina de completar en la pantalla 4 (no son dos descripciones independientes) — así el propietario no tiene que responder todo el detalle antes de saber quién está disponible en su barrio.

### 2. Listado de jardineros

- Listado de prestadores filtrado por barrio.
- Buscador por nombre y/o tipo de servicio.
- Muestra por cada prestador: nombre, reseña (puntaje resumen), tipos de servicio, estado de verificación.
- **Si no encuentra a quien busca**: opción de recomendar/proponer que se incorpore un nuevo proveedor a la plataforma (queda como funcionalidad prevista en esta pantalla; cómo se comunica ese lead se define más adelante).
- **Selección múltiple**: el propietario elige a qué jardineros quiere contactar para pedir presupuesto. Al apretar "Contactar", se dispara la IA para hacer las preguntas de validación del trabajo (ver pantalla 4) — puede abrirse como una pantalla de diálogo.

### 3. Perfil completo del jardinero

Se accede haciendo click en un jardinero desde el listado. Es una ampliación con más detalle de lo que ya se muestra en la pantalla 2:

- Todas las reseñas que le escribieron (no solo el puntaje resumen).
- Experiencia.
- Precios de referencia.
- Posibilidad de cargar una nueva reseña.

Pantalla puramente informativa, con botón para volver atrás.

### 4. Especificación de trabajo

Es la interacción en cuadro de diálogo entre el propietario y la IA para definir el alcance del servicio, previo a enviarlo al/los jardinero/s seleccionados en la pantalla 2. Puede incluir:

- Fotos.
- Datos específicos del jardín.
- Comentarios que amplíen la necesidad.

> Continúa sobre la misma descripción de la pantalla 1 — la IA retoma lo ya escrito y sigue completando con las preguntas puntuales del esquema por servicio (ver `catalogo-servicios.md`), en vez de arrancar de cero. Es la misma necesidad, completándose en dos pasos.

### 5. Presupuestos

- Respuestas recibidas con presupuesto de los prestadores contactados.
- El propietario selecciona la que más le interesa para confirmar la contratación.
- **Forma de pago**: se elige preferencia entre **efectivo** y/o **transferencia**. No se paga a través de la plataforma en este primer MVP (eso queda para una versión posterior).
- **Cierre del trabajo**: lo puede cerrar el propietario o el jardinero. El cierre habilita la carga de la reseña y deja cerrado el circuito.

### 6. Perfil del propietario

- Sus datos.
- Historial de trabajos contratados, y con quién.
- Reseñas pendientes y realizadas.

## Cambio de modelo de datos necesario

Hoy la tabla `solicitud` (`supabase/schema.sql`) es **1 propietario → 1 prestador**: no tiene monto, no tiene fotos. El flujo de arriba necesita **1 pedido → N prestadores elegidos → N presupuestos comparables → 1 elegido → 1 trabajo confirmado**. Esto implica separar el concepto en dos:

- **`pedido` (tabla nueva)**: la necesidad estructurada que arma la pantalla 1 + 4. Campos propuestos: `propietario_id`, `barrio_id`, `lote_id`, `tipo_servicio`, `descripcion`, `detalle_estructurado` (jsonb — lo que arma la IA según el esquema de `catalogo-servicios.md`: alcance, tamaño, altura, etc.), `fotos_urls`, `created_at`. (No lleva recurrencia — eso se define recién en la cotización, no en el pedido inicial.)
- **`solicitud` (se extiende)**: pasa a representar la cotización de *cada* prestador elegido para un pedido. Se le suma `pedido_id` (nueva referencia) y `monto_presupuestado`. Mantiene el resto de sus campos actuales (`estado`, `mensaje`, `contacto_nombre`, `contacto_celular`).

Esto conecta directo con la comparación multi-jardinero ya diseñada en `estrategia-piloto.md`.

## Conexión con lo ya construido

- **Pantalla 2** reutiliza `PropietarioDirectorio.tsx`: hoy filtra por "Solo verificados" y no tiene filtro por barrio, ni buscador por nombre. También hay que cambiar el propósito del botón — hoy es "Contactar" directo (abre `ContactarModal`), y pasaría a ser "Seleccionar para pedir presupuesto" con selección múltiple.
- **Pantalla 3** es una ampliación de la tarjeta que ya existe en el listado — pantalla nueva, pero reutiliza los mismos datos (`verificacion.ts`, vista `prestador_directorio`).
- **Pantalla 5** se apoya en `trabajo` (ya tiene `monto`, `metodo_pago` — incluye `efectivo` y `transferencia` — `estado_pago`, `frecuencia`) y `valoracion` (ya soporta reseña multi-dimensión + fotos). El **cierre bilateral** necesita un ajuste: hoy `estado_trabajo` es `solicitado / confirmado / realizado / cancelado`, no distingue "cerrado por propietario" de "cerrado por jardinero" — falta definir cómo modelarlo (ver pendientes).

## Pendiente / a definir

- Cómo modelar el cierre bilateral del trabajo (¿dos flags booleanos, uno por parte, que habilitan la reseña cuando ambos están en true? ¿o estados nuevos en `estado_trabajo`?).
- Tabla o mecanismo para "proponer nuevo prestador" (el lead que surge en la pantalla 2).
- Cómo se dispara y persiste la conversación de la pantalla 4 — ¿un único llamado con extracción, o multi-turno real? (ver `estrategia-piloto.md`, sección "Diseño del flujo de descubrimiento").
- Login (Supabase Auth) — no incluido en este MVP todavía, pero deja definidos los campos a capturar: Nombre, mail, teléfono, barrio, lote.

---

*Universidad de San Andrés · Maestría en Negocios Digitales (NBL) · Proyecto GreenGate*
