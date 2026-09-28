# GreenGate · Especificación de pantallas — Propietario

Documento de referencia para las pantallas del rol propietario. Se apoya en lo definido en [`estrategia-piloto.md`](estrategia-piloto.md) (flujo de IA, comparación multi-jardinero) y [`catalogo-servicios.md`](catalogo-servicios.md) (esquema de preguntas por servicio).

> **Este documento se escribió como diseño previo y se actualizó una vez construido.** Cada pantalla lleva su estado: **✅** construida · **🟡** parcial · **⏳** no empezada. Donde el diseño cambió respecto de lo planeado, está dicho y explicado — esas diferencias son el aprendizaje del período, no un desvío a corregir.

## Datos de login (para más adelante)

El login (Supabase Auth) sigue sin estar. Al implementarlo hay que capturar: **Nombre, mail, teléfono, barrio y lote.** Es la base para conectar al propietario con el resto del modelo (filtrar por su barrio, asociar sus trabajos a su lote).

Mientras tanto, el propietario se identifica por los ids de sus pedidos guardados en el navegador (`src/misPedidos.ts`): "Mis pedidos" solo aparece donde pidió, y se pierde al cambiar de dispositivo.

## Las 6 pantallas

### 1. Solicitud de servicio · 🟡

- Cuadro de texto libre para describir la necesidad. **Existe, pero no dispara la IA**: hoy es el campo "Qué necesitás" del modal de pedido, y el texto viaja tal cual al jardinero. El prototipo de IA está en `scripts/ia/`, sin conectar — falta decidir dónde vive la clave de API en producción.
- **Acceso a urgencias**: resuelto de otra forma que la planeada. En vez de un atajo separado, el directorio tiene un filtro **"⚡ Solo urgencias"** y el pedido puede marcarse urgente con un tilde. La urgencia **informa, no rutea**: el pedido le llega igual a todos los elegidos, marcado, y si alguno no atiende urgencias el modal lo avisa antes de enviar. Se hizo así para no sacarle al jardinero la decisión de tomar *esa* urgencia.

> La recurrencia (si el trabajo es puntual o mensual) no se elige acá — se define en la conversación entre propietario y jardinero, después de la visita.

### 2. Listado de jardineros · ✅

- Listado filtrado por barrio, con buscador por nombre. Filtros **"Solo verificados"** y **"⚡ Solo urgencias"**.
- Muestra por cada prestador: nombre, puntaje resumen, servicios, estado de verificación e insignia de urgencia.
- **Si no encuentra a quien busca**: "Proponé un prestador" carga el lead en `prestador_sugerido`, para que la administración lo dé de alta.
- **Selección múltiple**: se tildan dos o tres y la barra inferior abre el modal. Cambió el nombre: es **"Seleccionar para pedir visita"**, no presupuesto (ver pantalla 5).

### 3. Perfil completo del jardinero · ✅

Se accede haciendo click en un jardinero desde el listado:

- Todas las reseñas, firmadas como *"Un vecino de <barrio>"*, con la respuesta del prestador si la escribió.
- Experiencia, servicio principal con tarifa mensual de referencia, servicios adicionales y documentación.

Pantalla informativa, con botón para volver. **La reseña no se carga acá**, como se había previsto: este perfil lo ve cualquiera, así que un formulario suelto no tendría cómo saber si el que mira trató con ese jardinero. Se deja desde "Mis pedidos", sobre el jardinero elegido.

### 4. Especificación de trabajo (IA) · ⏳

El diálogo con la IA para definir el alcance —fotos, datos del jardín, preguntas por servicio— **no está construido**. Hoy esa información se reemplaza con el campo de texto libre de la pantalla 1 y con la aclaración que escribe el jardinero al responder.

Las columnas donde colgaría (`detalle_estructurado` jsonb, `fotos_urls`) todavía no existen en `pedido`: se suman cuando el flujo de IA se conecte.

### 5. Mis pedidos · ✅ *(era "Presupuestos")*

**Acá está el cambio de diseño más importante del período.** La pantalla se había pensado como comparación de presupuestos con monto. No funcionaba: **un jardinero no puede cotizar un jardín que no vio**. El número que devolvía sobre una descripción de dos renglones era una adivinanza que después corregía, o un precio inflado para cubrirse — y el propietario los comparaba como si fueran equivalentes.

Lo que se construyó en su lugar:

- El pedido busca una **visita**, no un número. Cada jardinero responde **desde cuándo puede ir**, con una aclaración y un estimado **opcional**, siempre marcado *"a confirmar en la visita"*.
- Las respuestas se muestran como tarjetas, **ordenadas por quién puede ir antes**. En un pedido urgente se distingue con color quién puede hoy.
- **Elegir es un acto explícito**: el elegido pasa a `elegida` y lo ve en su panel; los demás pasan a `no_seleccionada` y dejan de esperar. Recién ahí se abre el WhatsApp, con el mensaje redactado.
- **Dar de baja** ("Ya no lo necesito") cierra el pedido para todos, así el que respondió no queda esperando indefinidamente.
- El precio real se acuerda en la visita, fuera de la app. **Forma de pago**: efectivo o transferencia, entre las partes. No se paga por la plataforma en este MVP.

El **cierre bilateral del trabajo** que se había previsto no se construyó: en su lugar, la reseña se ancla a la solicitud elegida, que ya es prueba suficiente de que el trato existió. Ver pendientes.

### 6. Perfil del propietario · ⏳

Sus datos, historial de trabajos y reseñas pendientes. **Depende del login**: sin identidad persistente no hay a quién colgarle un perfil. Lo más cercano hoy es "Mis pedidos", que muestra los pedidos de ese navegador.

## El cambio de modelo de datos — hecho

Lo que este documento proponía se construyó, con diferencias:

- **`pedido` (tabla nueva)** — hecha. Tiene `propietario_id`, `barrio_id`, `lote_id`, `tipo_servicio`, `descripcion`, `contacto_nombre`, `created_at`, más dos que no estaban previstos: `es_urgencia` y `cancelado_en`. **No tiene** `detalle_estructurado` ni `fotos_urls`: esperan al flujo de IA.
- **`solicitud` (extendida)** — hecha. Se le sumó `pedido_id` y `monto_presupuestado`, y después `disponible_desde` (la fecha que reemplazó al precio como criterio de comparación), `detalle` y `updated_at`. `estado_solicitud` ganó tres valores: `elegida`, `no_seleccionada` y `cancelada`.
- **`contacto_celular` dejó de pedirse.** El jardinero no necesita el teléfono del vecino para responder, y el contacto va en sentido inverso: se abre cuando el propietario elige.
- **`valoracion.solicitud_id`** — no estaba en el diseño original. Ancla la reseña a la solicitud elegida, con un índice único que garantiza una por trabajo.

Ver `supabase/migracion-pedido.sql`, `migracion-visita.sql`, `migracion-disponible-desde.sql`, `migracion-pedido-urgencia.sql`, `migracion-cancelar-pedido.sql` y `migracion-resena.sql`, cada una con su razonamiento.

## Conexión con lo ya construido

- **Pantalla 2** es `PropietarioDirectorio.tsx`. Ya tiene el filtro por barrio, el buscador por nombre, los dos filtros y la selección múltiple.
- **Pantalla 3** es `PerfilJardinero.tsx`.
- **Pantalla 5** es `MisPresupuestos.tsx` — el archivo conserva el nombre viejo, la pantalla se llama "Mis pedidos". Se apoya en `pedido`, `solicitud` y `valoracion`; **no** usa `trabajo`, que sigue sin escribirse desde la app porque exige `lote_id`.
- **La reseña** vive en `DejarResena.tsx`, accesible desde "Mis pedidos" o desde el link `?resena=<id>` que el jardinero le pasa al vecino por WhatsApp.

## Pendiente / a definir

- **El flujo de IA de la pantalla 4** — el prototipo existe en `scripts/ia/`; falta decidir dónde vive la clave de API (Supabase Edge Function vs. Netlify Function) y si es un llamado único con extracción o multi-turno.
- **Login (Supabase Auth)** — habilita la pantalla 6, el historial por lote y reactivar el RLS.
- **El cierre del trabajo y la tabla `trabajo`** — hoy la app no registra que un trabajo se hizo. Es Fase 2, junto con el pago digital: ahí sí hay un hecho concreto que registrar, y `trabajo.lote_id` deja de ser un obstáculo porque habrá login.
- **Historial de la propiedad** — qué se hizo, cuándo y quién. Depende de las dos anteriores.

---

*Universidad de San Andrés · Maestría en Negocios Digitales (NBL) · Proyecto GreenGate*
