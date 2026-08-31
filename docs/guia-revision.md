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

Los tres recorridos, en este orden (el 1 deja un pedido que vas a ver en el 2, y el 2 deja un presupuesto que vas a ver de vuelta en el 1):

1. **Soy Propietario** → elegí un barrio → mirá el directorio de jardineros. Podés buscar por nombre y filtrar por **"Solo verificados"** y por **"⚡ Solo urgencias"** (los que se declararon disponibles para atender el mismo día). Tocá el nombre de alguno para ver su perfil completo: servicio principal con su tarifa mensual de referencia, servicios adicionales, reseñas y documentación. Para pedir presupuesto, tildá **"Seleccionar para pedir presupuesto"** en uno o varios y usá la barra que aparece abajo: describís **una vez** qué necesitás y les llega a todos.
2. **Soy Jardinero** → elegí un perfil existente → en el panel vas a ver "Tu negocio" (puntaje, clientes activos, presupuestos realizados, servicios activos) y el tilde de "Abierto a servicios de urgencia" → pestaña **"Solicitudes"**: ahí está el pedido que dejaste como propietario, con el barrio del que viene. Cargale un monto y enviá el presupuesto. Si en cambio elegís **"Soy nuevo, quiero registrarme"**, entrás al alta de perfil desde cero — probala, es el onboarding real del jardinero.
3. **Volvé a Soy Propietario**, al mismo barrio → arriba del directorio aparece **"Mis presupuestos →"**. Ahí ves las respuestas juntas, con el puntaje de cada uno al lado, y un botón para **contactar por WhatsApp** al que elijas, con el mensaje ya redactado.
4. **Soy Administrador** → arranca directo en el panel de tu barrio (si la instancia tiene más de uno, te pide elegirlo primero): Resumen (prestadores, pendientes de validación, disponibles para urgencia), alertas de documentación por vencer, y la tabla de prestadores. Fijate que **"Documentación"** y **"Habilitado"** son dos columnas distintas y a propósito: la primera es un estado derivado de los papeles, la segunda es una decisión de la administración que se activa con un interruptor. Un prestador puede estar habilitado mientras termina de presentar el seguro, o quedar suspendido con todo en regla. Podés agregar un prestador nuevo vos mismo, o ir a "Ver todos mis barrios" para el panel multi-barrio.

> Cualquiera puede entrar por cualquiera de las tres puertas: sin login, nada impide elegir el rol que quieras. Es a propósito, para que se pueda recorrer el producto entero sin credenciales — no es cómo va a funcionar en producción.

> ⚠️ **Nota importante**: es un entorno de piloto sin login todavía (más abajo se explica por qué). Los datos son **ficticios**, y técnicamente cualquiera que entre puede escribir o borrar información — no es una vulnerabilidad no vista, es una decisión consciente para esta etapa. No cargues datos reales.

Si al entrar la app tira "Failed to fetch": el proyecto de base de datos (plan gratuito) se pausa por inactividad tras ~1 semana. Avisale a Gustavo para reactivarlo, no es un error del código.

Un detalle que conviene saber antes de probar: **"Mis presupuestos" solo aparece si pediste uno desde ese mismo navegador**. Sin login, la app recuerda tus pedidos en `localStorage` (ver `src/misPedidos.ts`). Si probás en incógnito o cambiás de dispositivo, arrancás de cero — es provisorio, hasta que exista Supabase Auth.

## 2. Si tu mirada es técnica

- **Arquitectura completa**: [`docs/arquitectura.md`](arquitectura.md) — stack, por qué no hay backend propio, flujos, costos, límites del plan gratuito.
- **Modelo de datos**: [`docs/modelo-de-datos.md`](modelo-de-datos.md) (explicado simple) y [`supabase/schema.sql`](../supabase/schema.sql) (el esquema base: 15 tablas + 1 vista).
  ⚠️ **`schema.sql` está desactualizado respecto de la base real.** Varias migraciones posteriores en [`supabase/`](../supabase/) no están volcadas ahí todavía: `prestador_sugerido`, `pedido`, `prestador.documento`, `disponible_urgencia`, los índices únicos de `verificacion`. Para ver el esquema vigente hay que leer `schema.sql` **más** los archivos `migracion-*.sql`, en orden. Está pendiente regenerarlo con `pg_dump --schema-only`.
- **Cómo se modela un presupuesto**: un **`pedido`** es la necesidad del propietario, una sola, con su descripción. Cada **`solicitud`** es la cotización de *un* prestador para ese pedido, con su `monto_presupuestado`. Es la forma de que N respuestas sean comparables entre sí. Ver [`supabase/migracion-pedido.sql`](../supabase/migracion-pedido.sql), que explica el razonamiento.
- **Cómo se modela la verificación**: hay **una sola verificación por prestador** (y una por integrante del equipo), no una por barrio. Los antecedentes y la identidad son hechos sobre una persona, y el seguro es una póliza: nada de eso cambia por trabajar en otro barrio. Lo que sí varía por barrio es *qué* documentación se exige, y para eso ya existen las columnas `barrio.requiere_*`, todavía sin UI. La lógica de las insignias vive entera en [`src/verificacion.ts`](../src/verificacion.ts) y es la única fuente de verdad: ninguna pantalla decide por su cuenta si alguien está verificado.
- **Código de la app**: [`src/`](../src/) — React + Vite + TypeScript + Tailwind. La entrada es `SeleccionRol.tsx` (las tres cajas), que resuelve el rol y el dato mínimo asociado y se lo pasa a la vista correspondiente; de ahí en adelante cada vista es un componente (`PropietarioDirectorio.tsx`, `MisPresupuestos.tsx`, `JardineroOnboarding.tsx`, `JardineroPanel.tsx`, `AdminBarrioPanel.tsx` como panel principal de administración y `AdminPanel.tsx` como panel multi-barrio secundario).
- **Seguridad — lo más importante a revisar**: RLS (Row Level Security) está **desactivado a propósito** (`supabase/rls-dev.sql`) porque todavía no hay login. Las políticas por rol ya están escritas como borrador en [`supabase/policies.sql`](../supabase/policies.sql), pendientes de activar. Los datos sensibles (antecedentes penales) nunca se guardan como documento, solo el estado de verificación — decisión explícita por la Ley 25.326. Del DNI y el CUIT se guarda el número, nunca una imagen. La vista pública `prestador_directorio` **no expone el celular del prestador**, también a propósito: el contacto se abre recién cuando el prestador respondió un presupuesto.
- **IA de descubrimiento (prototipo)**: hay un primer armado funcional en [`scripts/ia/`](../scripts/ia/) que estructura, con la API de Claude, un pedido en lenguaje natural del propietario. Corre como script local — todavía no está conectado a la app porque falta decidir dónde vive la clave de API en producción (Supabase Edge Function vs. Netlify Function). Es la pieza pendiente más relevante del lado conversacional del producto.

**Preguntas que ayudarían más que un veredicto general:**
- ¿El plan para pasar de RLS-off a RLS-on con login es sólido, o falta algo?
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
