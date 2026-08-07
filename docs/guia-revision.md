# GreenGate · Guía para revisar el proyecto

Este documento es para quien va a revisar GreenGate desde afuera del equipo. Te da un camino sugerido de 15-30 minutos para formarte una opinión informada, sin tener que preguntar nada antes.

## Qué es GreenGate, en un párrafo

Plataforma B2B2C que profesionaliza el mercado informal de jardinería en barrios privados del GBA. Conecta tres actores: la **administración** del barrio (cliente que paga, valida el ingreso de prestadores), el **propietario** (elige un jardinero verificado y calificado por sus vecinos) y el **prestador/jardinero** (gana visibilidad y reputación). Nace de un trabajo de la Maestría en Negocios Digitales (UDESA), con investigación primaria propia (encuestas a propietarios y administraciones).

## 1. Probalo en vivo (10 min)

No hace falta cuenta ni instalar nada. Dos URLs públicas:

| Qué | Dónde |
|---|---|
| **Landing / presentación** | https://greengate-arg.netlify.app/landing/ |
| **App funcional** | https://greengate-arg.netlify.app/ |

Al entrar, la app te pregunta quién sos con tres cajas: **Soy Administrador**, **Soy Propietario**, **Soy Jardinero**. Elegís una y, si hace falta, te pide el dato mínimo para saber "cuál" sos — en qué barrio vivís, o cuál es tu perfil de jardinero. Ese paso reemplaza al login, que todavía no existe. Podés volver a esta pantalla en cualquier momento con **"Cambiar de rol"**, arriba a la derecha.

Los tres recorridos, en este orden (el 1 deja un pedido que vas a ver en el 2):

1. **Soy Propietario** → elegí un barrio → mirá el directorio de jardineros: buscá por nombre, tildá "Solo verificados", seleccioná uno o dos con el checkbox "Seleccionar para pedir presupuesto" y pedí presupuesto desde la barra que aparece abajo. Tocá el nombre de alguno para ver su perfil completo (todas las reseñas, precios y años de experiencia).
2. **Soy Jardinero** → elegí un perfil existente → en el panel vas a ver "Tu negocio" (puntaje, clientes activos, presupuestos realizados, servicios activos) y el tilde de "Abierto a servicios de urgencia" → pestaña "Solicitudes" → ahí vas a ver el pedido de presupuesto que acabás de dejar como propietario. Si en cambio elegís **"Soy nuevo, quiero registrarme"**, entrás al alta de perfil desde cero — probala, es el onboarding real del jardinero.
3. **Soy Administrador** → arranca directo en el panel de tu barrio (si la instancia tiene más de uno, te pide elegirlo primero): Resumen (prestadores, pendientes de validación, disponibles para urgencia), alertas de documentación por vencer, y el botón "Validar" sobre un prestador pendiente. Podés agregar un prestador nuevo vos mismo, o ir a "Ver todos mis barrios" para el panel multi-barrio.

> Cualquiera puede entrar por cualquiera de las tres puertas: sin login, nada impide elegir el rol que quieras. Es a propósito, para que se pueda recorrer el producto entero sin credenciales — no es cómo va a funcionar en producción.

> ⚠️ **Nota importante**: es un entorno de piloto sin login todavía (más abajo se explica por qué). Los datos son **ficticios**, y técnicamente cualquiera que entre puede escribir o borrar información — no es una vulnerabilidad no vista, es una decisión consciente para esta etapa. No cargues datos reales.

Si al entrar la app tira "Failed to fetch": el proyecto de base de datos (plan gratuito) se pausa por inactividad tras ~1 semana. Avisale a Gustavo para reactivarlo, no es un error del código.

## 2. Si tu mirada es técnica

- **Arquitectura completa**: [`docs/arquitectura.md`](arquitectura.md) — stack, por qué no hay backend propio, flujos, costos, límites del plan gratuito.
- **Modelo de datos**: [`docs/modelo-de-datos.md`](modelo-de-datos.md) (explicado simple) y [`supabase/schema.sql`](../supabase/schema.sql) (el esquema base, 15 tablas + 1 vista — algunas migraciones posteriores en [`supabase/`](../supabase/) todavía no están volcadas ahí, como `prestador_sugerido`).
- **Código de la app**: [`src/`](../src/) — React + Vite + TypeScript + Tailwind. La entrada es `SeleccionRol.tsx` (las tres cajas), que resuelve el rol y el dato mínimo asociado y se lo pasa a la vista correspondiente; de ahí en adelante cada vista es un componente (`PropietarioDirectorio.tsx`, `JardineroOnboarding.tsx`, `AdminBarrioPanel.tsx` como panel principal de administración y `AdminPanel.tsx` como panel multi-barrio secundario).
- **Seguridad — lo más importante a revisar**: RLS (Row Level Security) está **desactivado a propósito** (`supabase/rls-dev.sql`) porque todavía no hay login. Las políticas por rol ya están escritas como borrador en [`supabase/policies.sql`](../supabase/policies.sql), pendientes de activar. Los datos sensibles (antecedentes penales) nunca se guardan como documento, solo el estado de verificación — decisión explícita por la Ley 25.326.
- **IA de descubrimiento (prototipo)**: hay un primer armado funcional en [`scripts/ia/`](../scripts/ia/) que estructura, con la API de Claude, un pedido en lenguaje natural del propietario. Corre como script local — todavía no está conectado a la app porque falta decidir dónde vive la clave de API en producción (Supabase Edge Function vs. Netlify Function). Es la pieza pendiente más relevante del lado conversacional del producto.

**Preguntas que ayudarían más que un veredicto general:**
- ¿El plan para pasar de RLS-off a RLS-on con login es sólido, o falta algo?
- ¿El modelo de datos (`schema.sql`) tiene algún supuesto que no vaya a escalar?
- ¿La decisión de no tener backend propio (solo Supabase + frontend) es sostenible más allá del piloto?

## 3. Si tu mirada es de negocio / producto

- **Cobertura de la propuesta de valor**: [`docs/cobertura-propuesta-valor.md`](cobertura-propuesta-valor.md) — cruza, línea por línea, lo que prometen los 3 Value Proposition Canvas (Propietario, Jardinero, Administración) contra lo que el MVP entrega hoy. Es el documento más directo para responder "¿esta v1 cubre lo que se necesita?".
- **Documentos fundacionales** (fuera de este repo, se comparten aparte si hacen falta): selección de idea, evaluación de oportunidad, investigación del cliente (encuestas a 80 propietarios y 9 administraciones), Value Proposition Canvas de los 3 segmentos, Product-Market Fit.
- **Estado de validación por segmento:**
  - Propietarios: ✅ validado con evidencia primaria (n=80).
  - Administraciones: ✅ validado (n=9, 89% pagaría, 5 dejaron contacto para piloto).
  - Jardineros (oferta): ⚠️ todavía hipótesis, evidencia insuficiente (n=2). Es el riesgo abierto más importante.
- **El MVP** (lo que ves en la app) prioriza exactamente lo que la encuesta marcó como decisivo: directorio con calificaciones (79%) + validación documental del administrador. Lo que falta (agenda, cobro digital, geolocalización) es Fase 2 a propósito.

**Preguntas que ayudarían más que un veredicto general:**
- ¿El riesgo de retención del jardinero (que "se escape" del sistema una vez que conoce al propietario) está bien mitigado?
- ¿La secuencia de expansión (barrio por barrio, luego otros rubros) tiene sentido, o hay un atajo mejor?
- ¿Ves algo en la propuesta de valor que no cierre para alguno de los tres actores?

## 4. Cómo dejar tu feedback

Lo más simple: comentarios directos a Gustavo (por el canal que ya tengan). Si preferís dejarlo por escrito y trazable, podés abrir un **Issue** en el repo de GitHub con tus observaciones.

---

*GreenGate · Universidad de San Andrés · Maestría en Negocios Digitales (NBL)*
