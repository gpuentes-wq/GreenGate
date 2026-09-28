# GreenGate · Especificación de pantallas — Jardinero

Documento de referencia para las pantallas del rol jardinero (`src/JardineroPanel.tsx`, `src/JardineroOnboarding.tsx`, `src/SolicitudesPanel.tsx`). Se apoya en [`estrategia-piloto.md`](estrategia-piloto.md) y [`catalogo-servicios.md`](catalogo-servicios.md).

> **Escrito como diseño previo y actualizado una vez construido.** Cada sección lleva su estado: **✅** construida · **🟡** parcial · **⏳** no empezada.

## Las 4 secciones

### 1. Mi panel · ✅

- **"Necesita tu atención"** — construido, y ampliado. Además de solicitudes sin responder y vencimientos de documentación, muestra **novedades recientes**: que lo eligieron para un trabajo, y que un vecino dio de baja un pedido que había respondido (así puede liberar la fecha que se había reservado). Las novedades se acotan a los últimos 7 días, porque no se resuelven haciendo nada — sin esa ventana el aviso quedaría prendido para siempre.
  - El bloque se pinta de ámbar **solo cuando hay algo que hacer**. Que lo hayan elegido es buena noticia y va en verde, con el título "Todo al día".
  - No tiene acceso propio a las solicitudes: la pestaña **Solicitudes** está siempre visible y un segundo camino al mismo lugar era ruido.
- **"Tu negocio"** — construido con las métricas nuevas: puntaje de reseñas, clientes activos, **pedidos respondidos** y servicios activos. Se reemplazó "facturado este mes", que no tenía de dónde salir.
- **Tilde de urgencia accesible desde el panel** — construido, con el mismo interruptor que en el perfil.
- **"Próximamente"** — la sección existe con sus placeholders.

### 2. Mi perfil · ✅

- Datos personales y fiscales (opcionales). Se pide **DNI** —obligatorio, del titular o del contacto si es empresa— porque es contra ese número que la administración valida la identidad. Reemplazó al domicilio, que no consumía ninguna pantalla.
- **Tus servicios**: servicio principal fijo en **jardinería**, con tarifa de referencia **mensual**; el resto se publica como servicios adicionales que se cotizan según el pedido. El tilde **"Abierto a servicios de urgencia"** aplica al perfil entero.
- **Barrios**: selección editable y múltiple desde `BarriosManager.tsx`. Sumar barrios sí; dar de baja o editar uno ya sumado lo maneja administración.
- **Validación de documentación**: el jardinero declara, la administración aprueba (`prestador_barrio.habilitado` arranca en `false`).

> **Una verificación por prestador, no por barrio.** Los antecedentes y la identidad son hechos sobre una persona y el seguro es una póliza: nada de eso cambia por trabajar en otro barrio. Antes se duplicaban al sumar un barrio, y convivía una copia vencida con la vigente. Lo que sí varía por barrio es *qué* documentación se exige — para eso están `barrio.requiere_*`, todavía sin UI.

### Cómo se alimenta el directorio de prestadores

La plataforma se retroalimenta desde los tres actores:

1. **Autoregistro** — ✅ el jardinero se da de alta y la administración valida después.
2. **Alta por administración** — ✅ la administración lo carga con los datos que ya tiene (`AltaPrestadorModal.tsx`), incluido el DNI. Es el caso más común al arranque del piloto. 🟡 **Falta el segundo tramo**: que el jardinero entre después a completar su documentación sobre un perfil que ya existe, en vez de crearlo de cero — probablemente vía invitación o código.
3. **Recomendado por el propietario** — ✅ el lead queda en `prestador_sugerido` para que administración lo dé de alta.

Los tres convergen en el mismo paso: la validación la hace siempre administración. El campo **`prestador.origen`** ya existe para distinguirlos (`autoregistro` por defecto, `alta_administracion` cuando lo carga el barrio).

### 3. Mi equipo · ✅

Construido, condicionado a "soy empresa". El **DNI de cada integrante es obligatorio**, por el mismo motivo que el del titular.

### 4. Mis solicitudes · ✅ *(cambió de fondo)*

**Acá está el cambio de diseño más importante del período.** Se había previsto que el jardinero respondiera con un precio, y que la IA lo estructurara en una cotización comparable. No se sostiene: **no puede cotizar un jardín que no vio**. El número era una adivinanza o un precio inflado para cubrirse.

Lo que se construyó:

- Responde **"Puedo ir"** con la **fecha desde la que puede pasar** — no un turno reservado: es lo antes que podría, porque está compitiendo con otros y todavía no sabe si lo van a elegir. Suma una aclaración libre y un estimado **opcional**, marcado como a confirmar.
- Si el pedido es **urgente**, la fecha arranca en hoy y la solicitud se marca. Puede ofrecer otro día igual: si nadie puede hoy, el vecino prefiere saber quién puede mañana antes que recibir tres rechazos. La pantalla se lo avisa para que conteste tranquilo.
- **Ve qué comprometió en todos los estados** — cuando lo eligen, cuando eligen a otro y cuando dan de baja el pedido. Sin eso, la fecha que había reservado desaparecía de la pantalla justo cuando más la necesitaba.
- **Las sin responder van primero**, en ámbar pleno; dentro de ellas, las urgentes y después las más viejas — la que más esperó es la que peor queda sin respuesta.
- **Reseñas**: cuando lo eligen, puede **pedirle la reseña al vecino** (copia un mensaje con un link para pegar en el WhatsApp que ya tiene), leerla cuando llega y **responderla públicamente**.

**La IA de este lado no se construyó.** Era la mitad simétrica del flujo de descubrimiento, y perdió sentido al dejar de pedir una cotización estructurada: hoy el jardinero responde con una fecha y dos líneas, que no necesitan extracción.

## El cambio de modelo de datos — hecho

- **`prestador.disponible_urgencia`** (boolean) — hecho. Es una **disposición** ("atiendo urgencias"), no un estado del día: no caduca, porque un reset diario garantizaría el error caro —olvidarse de prenderlo cuesta trabajo perdido e invisible— y secaría la oferta. La disponibilidad real se confirma en cada pedido.
- **`prestador.documento`** (DNI) — no estaba previsto. Reemplazó a `domicilio`, que quedó en la tabla sin escribirse.
- **"Pedidos respondidos"** — se cuenta como `solicitud` con `estado` distinto de `pendiente`.
- **"Clientes activos"** — vecinos distintos que lo eligieron en los últimos 60 días. Antes contaba filas de `trabajo` y **daba siempre cero**, porque nada escribe en esa tabla.
- **`solicitud.updated_at`** con trigger — no estaba previsto. Sin fecha de cambio no se puede acotar una novedad, y el aviso quedaría prendido para siempre.
- **`prestador.origen`** — hecho (`migracion-admin-barrio.sql`). Texto simple con default `'autoregistro'`; `AltaPrestadorModal.tsx` escribe `'alta_administracion'`. El tercer caso —recomendado por un propietario— no tiene valor propio: el lead vive en `prestador_sugerido` y, cuando la administración lo da de alta, queda como alta de administración.

## Pendiente / a definir

- **Completar perfil por invitación**: cómo entra un jardinero que la administración ya cargó, sin crear un perfil duplicado.
- **Pantalla de reseñas propia**: hoy solo ve y responde las que cuelgan de una solicitud. Cuando tenga cinco o seis, conviene una vista con todas juntas — el acceso natural es hacer clickeable la tarjeta "Tu puntaje" del panel.
- **Recordatorio periódico de urgencias**: un "¿seguís atendiendo urgencias?" para que la marca no envejezca, sin castigar al que se olvida.

---

*Universidad de San Andrés · Maestría en Negocios Digitales (NBL) · Proyecto GreenGate*
