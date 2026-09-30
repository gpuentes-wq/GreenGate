# GreenGate · Guía para revisar el proyecto

Este documento es para quien va a revisar GreenGate desde afuera del equipo. Te da un camino sugerido de 15-30 minutos para formarte una opinión informada, sin tener que preguntar nada antes.

## Qué es GreenGate, en un párrafo

Plataforma B2B2C que profesionaliza el mercado informal de jardinería en barrios privados del GBA. Conecta tres actores: la **administración** del barrio (cliente que paga, valida el ingreso de prestadores), el **propietario** (elige un jardinero verificado y calificado por sus vecinos) y el **prestador/jardinero** (gana visibilidad y reputación). Nace de un trabajo de la Maestría en Negocios Digitales (UDESA), con investigación primaria propia (encuestas a propietarios y administraciones).

## 1. Probalo en vivo (10 min)

No hace falta cuenta ni instalar nada. Dos URLs públicas:

| Qué | Dónde | URL alternativa |
|---|---|---|
| **Landing / presentación** | https://greengate.com.ar/landing/ | https://greengate-arg.netlify.app/landing/ |
| **App funcional** | https://greengate.com.ar/ | https://greengate-arg.netlify.app/ |

Las dos columnas sirven el mismo sitio: `greengate.com.ar` es el dominio propio y `greengate-arg.netlify.app` es la dirección que da Netlify. Si una no responde, probá la otra.

Al entrar, la app te pregunta quién sos con tres cajas: **Soy Administrador**, **Soy Propietario**, **Soy Jardinero**. Elegís una y, si hace falta, te pide el dato mínimo para saber "cuál" sos — en qué barrio vivís, o cuál es tu perfil de jardinero. Ese paso reemplaza al login, que todavía no existe. Podés volver a esta pantalla en cualquier momento con **"Cambiar de rol"**, arriba a la derecha.

Los recorridos, en este orden — cada paso deja algo que vas a ver en el siguiente, así que conviene no saltearlos:

1. **Soy Propietario** → elegí un barrio → mirá el directorio de jardineros. Podés buscar por nombre y filtrar por **"Solo verificados"** y por **"⚡ Solo urgencias"** (los que se declararon disponibles para atender el mismo día). Tocá el nombre de alguno para ver su perfil completo: servicio principal con su tarifa mensual de referencia, servicios adicionales, reseñas y documentación. Para pedir, tildá **"Seleccionar para pedir visita"** en dos o tres y usá la barra que aparece abajo: describís **una vez** qué necesitás y les llega a todos. Podés marcar el pedido como **urgente** — les llega igual a todos, pero marcado, y a los que no atienden urgencias te lo avisa antes de enviar.
2. **Soy Jardinero** → elegí uno de los que acabás de convocar → el panel abre con "Necesita tu atención" y "Tu negocio" (puntaje, clientes activos, pedidos respondidos) → pestaña **"Solicitudes"**: las sin responder van primero, en ámbar. Respondé con **"Puedo ir"**, eligiendo desde cuándo, con una aclaración y un estimado opcional — no un precio cerrado: el jardinero todavía no vio el jardín. Repetí con el segundo jardinero, poniendo otra fecha. Si en cambio elegís **"Soy nuevo, quiero registrarme"**, entrás al alta de perfil desde cero — probala, es el onboarding real.
3. **Volvé a Soy Propietario**, al mismo barrio → arriba del directorio aparece **"Mis pedidos →"**. Cada jardinero es una tarjeta con su respuesta, ordenadas por quién puede ir antes. Elegí a uno: los demás pasan a "No lo elegiste" y recién ahí se abre el **WhatsApp** con el mensaje ya redactado. Probá también **"Ya no lo necesito"** en otro pedido, para ver la baja.
4. **Volvé al Jardinero elegido** → en Solicitudes ahora dice **"🎉 Te eligieron"**, con la fecha que había comprometido. Tocá **"Pedirle una reseña"**: copia un mensaje con un link. Pegalo en la barra del navegador y vas a caer en el formulario de reseña — cargá estrellas y un comentario.
5. **Mirá el perfil de ese jardinero** como propietario: la reseña aparece firmada como *"Un vecino de <barrio>"*, y el puntaje del directorio cambió. Desde Solicitudes, el jardinero puede **responder** esa reseña, y la respuesta se publica debajo.
6. **Soy Administrador** → arranca directo en el panel de tu barrio (si la instancia tiene más de uno, te pide elegirlo primero): Resumen (prestadores, pendientes de validación, disponibles para urgencia), alertas de documentación por vencer, y la tabla de prestadores. Fijate que **"Documentación"** y **"Habilitado"** son dos columnas distintas y a propósito: la primera es un estado derivado de los papeles, la segunda es una decisión de la administración que se activa con un interruptor. Un prestador puede estar habilitado mientras termina de presentar el seguro, o quedar suspendido con todo en regla. Podés agregar un prestador nuevo vos mismo, o ir a "Ver todos mis barrios" para el panel multi-barrio.

> Cualquiera puede entrar por cualquiera de las tres puertas: sin login, nada impide elegir el rol que quieras. Es a propósito, para que se pueda recorrer el producto entero sin credenciales — no es cómo va a funcionar en producción.

> ⚠️ **Nota importante**: es un entorno de piloto sin login todavía (más abajo se explica por qué). Los datos son **ficticios**, y técnicamente cualquiera que entre puede escribir o borrar información — no es una vulnerabilidad no vista, es una decisión consciente para esta etapa. No cargues datos reales.

Si al entrar la app tira "Failed to fetch": el proyecto de base de datos (plan gratuito) se pausa por inactividad tras ~1 semana. Avisale a Gustavo para reactivarlo, no es un error del código.

Un detalle que conviene saber antes de probar: **"Mis pedidos" solo aparece si pediste una visita desde ese mismo navegador**. Sin login, la app recuerda tus pedidos en `localStorage` (ver `src/misPedidos.ts`). Si probás en incógnito o cambiás de dispositivo, arrancás de cero — es provisorio, hasta que exista Supabase Auth.

## 2. Si tu mirada es técnica

- **Arquitectura completa**: [`docs/arquitectura.md`](arquitectura.md) — stack, por qué no hay backend propio, flujos, costos, límites del plan gratuito.
- **Modelo de datos**: [`docs/modelo-de-datos.md`](modelo-de-datos.md) (explicado simple) y [`supabase/schema.sql`](../supabase/schema.sql) (el esquema base: 15 tablas + 1 vista).
  ⚠️ **`schema.sql` está desactualizado respecto de la base real.** Varias migraciones posteriores en [`supabase/`](../supabase/) no están volcadas ahí todavía: `prestador_sugerido`, `pedido` (con `es_urgencia` y `cancelado_en`), `prestador.documento`, `disponible_urgencia`, `solicitud.disponible_desde/detalle/updated_at`, `valoracion.solicitud_id`, los estados nuevos de `estado_solicitud` y los índices únicos de `verificacion`. Para ver el esquema vigente hay que leer `schema.sql` **más** los archivos `migracion-*.sql`, en orden. Está pendiente regenerarlo con `pg_dump --schema-only`.
- **Cómo se modela un pedido**: un **`pedido`** es la necesidad del propietario, una sola, con su descripción. Cada **`solicitud`** es la respuesta de *un* prestador, con la fecha desde la que puede ir. Es la forma de que N respuestas sean comparables entre sí. Ver [`supabase/migracion-pedido.sql`](../supabase/migracion-pedido.sql) y [`migracion-visita.sql`](../supabase/migracion-visita.sql), que explican el razonamiento.
- **Por qué se pide una visita y no un precio**: un jardinero no puede cotizar un jardín que no vio; el número que devolvía sobre una descripción de dos renglones era una adivinanza o un precio inflado, y el propietario los comparaba como si fueran equivalentes. Ahora responde *cuándo puede ir* y el precio se acuerda en la visita. El estimado quedó, pero opcional y marcado como a confirmar.
- **Cómo se ancla una reseña**: `valoracion.solicitud_id` apunta a la solicitud **elegida** — esa es la prueba de que el trato existió, y un índice único garantiza una sola reseña por trabajo. No cuelga de `trabajo` porque esa tabla exige `lote_id` y sin login el propietario no tiene lote. Ver [`supabase/migracion-resena.sql`](../supabase/migracion-resena.sql).
- **Cómo se modela la verificación**: hay **una sola verificación por prestador** (y una por integrante del equipo), no una por barrio. Los antecedentes y la identidad son hechos sobre una persona, y el seguro es una póliza: nada de eso cambia por trabajar en otro barrio. Lo que sí varía por barrio es *qué* documentación se exige, y para eso ya existen las columnas `barrio.requiere_*`, todavía sin UI. La lógica de las insignias vive entera en [`src/verificacion.ts`](../src/verificacion.ts) y es la única fuente de verdad: ninguna pantalla decide por su cuenta si alguien está verificado.
- **Código de la app**: [`src/`](../src/) — React + Vite + TypeScript + Tailwind. La entrada es `SeleccionRol.tsx` (las tres cajas), que resuelve el rol y el dato mínimo asociado y se lo pasa a la vista correspondiente; de ahí en adelante cada vista es un componente (`PropietarioDirectorio.tsx`, `MisPresupuestos.tsx`, `DejarResena.tsx`, `JardineroOnboarding.tsx`, `JardineroPanel.tsx`, `AdminBarrioPanel.tsx` como panel principal de administración y `AdminPanel.tsx` como panel multi-barrio secundario). Hay una sola entrada que no pasa por elegir rol: `?resena=<id>`, el link con el que el jardinero le pide la reseña al vecino.
- **Seguridad — lo más importante a revisar**: el RLS está **activado en las 17 tablas** (`supabase/rls-piloto.sql`), pero con políticas **permisivas**: sin login no hay a quién atribuirle una fila, así que lectura, alta y edición siguen abiertas a quien tenga el link. Lo que sí está cerrado es el **borrado** —ninguna tabla lo admite desde el navegador salvo `prestador_servicio`, que lo necesita para que el jardinero pueda sacarse un servicio— y la **edición de puntajes**: en `valoracion` el update está acotado por columna a `respuesta_prestador`, así que una reseña publicada no se puede alterar ni borrar desde afuera. Las políticas por rol están escritas como borrador en [`supabase/policies.sql`](../supabase/policies.sql) y esperan al login. Los datos sensibles (antecedentes penales) nunca se guardan como documento, solo el estado de verificación — decisión explícita por la Ley 25.326. Del DNI y el CUIT se guarda el número, nunca una imagen. La vista pública `prestador_directorio` **no expone el celular del prestador**, también a propósito: el contacto se abre recién cuando el propietario eligió a ese prestador.
- **IA de descubrimiento (prototipo)**: hay un primer armado funcional en [`scripts/ia/`](../scripts/ia/) que estructura, con la API de Claude, un pedido en lenguaje natural del propietario. Corre como script local — todavía no está conectado a la app porque falta decidir dónde vive la clave de API en producción (Supabase Edge Function vs. Netlify Function). Es la pieza pendiente más relevante del lado conversacional del producto.

**Preguntas que ayudarían más que un veredicto general:**
- ¿El recorte del piloto —RLS activado pero permisivo, con el borrado cerrado— es defendible mientras no haya login, o conviene restringir también la escritura?
- ¿El modelo de datos tiene algún supuesto que no vaya a escalar?
- ¿La decisión de no tener backend propio (solo Supabase + frontend) es sostenible más allá del piloto?
- La identidad del propietario hoy vive en `localStorage`. ¿Es un puente razonable hasta el login, o ya conviene resolverlo bien?

## 3. Si tu mirada es de negocio / producto

- **Cobertura de la propuesta de valor**: [`docs/cobertura-propuesta-valor.md`](cobertura-propuesta-valor.md) — cruza, línea por línea, lo que prometen los 3 Value Proposition Canvas (Propietario, Jardinero, Administración) contra lo que el MVP entrega hoy. Es el documento más directo para responder "¿esta v1 cubre lo que se necesita?".
- **Especificaciones por rol**: [`spec-propietario.md`](spec-propietario.md), [`spec-jardinero.md`](spec-jardinero.md), [`spec-administracion.md`](spec-administracion.md) y [`spec-tarifas.md`](spec-tarifas.md) — qué hace cada pantalla y por qué.
- **Estrategia del piloto**: [`docs/estrategia-piloto.md`](estrategia-piloto.md) — cómo se entra al primer barrio y en qué orden se convence a cada actor.
- **Documentos fundacionales** (fuera de este repo, se comparten aparte si hacen falta): selección de idea, evaluación de oportunidad, investigación del cliente (encuestas a 80 propietarios y 9 administraciones), Value Proposition Canvas de los 3 segmentos, Product-Market Fit.
- **Estado de validación por segmento:**
  - Propietarios: ✅ validado con evidencia primaria (n=80).
  - Administraciones: ✅ validado (n=9, 89% pagaría, 5 dejaron contacto para piloto).
  - Jardineros (oferta): ⚠️ todavía hipótesis, evidencia insuficiente (n=2). Es el riesgo abierto más importante.
- **El MVP** (lo que ves en la app) prioriza exactamente lo que la encuesta marcó como decisivo: directorio con calificaciones (79%) + validación documental del administrador. Lo que falta (agenda, cobro digital, geolocalización) es Fase 2 a propósito.
- **Alcance de la v1**: el servicio principal es **jardinería**, con una tarifa de referencia **mensual**. El resto de los servicios se ofrecen como adicionales a cotizar según el pedido. El modelo de datos ya soporta otros rubros; la decisión de arrancar con uno solo es de foco, no una limitación técnica.

**Preguntas que ayudarían más que un veredicto general:**
- ¿El riesgo de retención del jardinero (que "se escape" del sistema una vez que conoce al propietario) está bien mitigado?
- ¿La secuencia de expansión (barrio por barrio, luego otros rubros) tiene sentido, o hay un atajo mejor?
- ¿Ves algo en la propuesta de valor que no cierre para alguno de los tres actores?
- La landing le habla al **propietario**, aunque quien paga es la administración. ¿Es la puerta de entrada correcta?

## 4. Cómo dejar tu feedback

Tres caminos, según cuánto quieras profundizar:

- **Formulario** (2 minutos): https://forms.gle/s6tY6Z2hvVLqiS2J6 — el mismo de la landing. Te pregunta desde qué rol mirás y tiene un campo abierto al final.
- **Directo a Gustavo**, por el canal que ya tengan. Es lo más rápido para ida y vuelta.
- **Un Issue en GitHub**, si preferís dejarlo por escrito y trazable.

---

*GreenGate · Universidad de San Andrés · Maestría en Negocios Digitales (NBL)*
