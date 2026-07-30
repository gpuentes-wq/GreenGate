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

En la app hay 3 pestañas arriba (Propietario / Jardinero / Administración). Sugerencia de recorrido:

1. **Propietario** → mirá el directorio de jardineros, tildá "Solo verificados", tocá una foto del portfolio (se abre en grande), tocá "Contactar" en alguno y dejá tus datos.
2. **Jardinero** → en "¿Ya tenés perfil?" elegí uno existente → pestaña "Solicitudes" → ahí vas a ver el contacto que acabás de dejar como propietario.
3. **Administración** → mirá el panel de barrios y prestadores, la sección de alertas de vencimiento de documentación, y el botón "Validar" sobre un prestador.

> ⚠️ **Nota importante**: es un entorno de piloto sin login todavía (más abajo se explica por qué). Los datos son **ficticios**, y técnicamente cualquiera que entre puede escribir o borrar información — no es una vulnerabilidad no vista, es una decisión consciente para esta etapa. No cargues datos reales.

Si al entrar la app tira "Failed to fetch": el proyecto de base de datos (plan gratuito) se pausa por inactividad tras ~1 semana. Avisale a Gustavo para reactivarlo, no es un error del código.

## 2. Si tu mirada es técnica

- **Arquitectura completa**: [`docs/arquitectura.md`](arquitectura.md) — stack, por qué no hay backend propio, flujos, costos, límites del plan gratuito.
- **Modelo de datos**: [`docs/modelo-de-datos.md`](modelo-de-datos.md) (explicado simple) y [`supabase/schema.sql`](../supabase/schema.sql) (el esquema real, 14 tablas + 1 vista).
- **Código de la app**: [`src/`](../src/) — React + Vite + TypeScript + Tailwind. Cada vista es un componente (`PropietarioDirectorio.tsx`, `JardineroOnboarding.tsx`, `AdminPanel.tsx`).
- **Seguridad — lo más importante a revisar**: RLS (Row Level Security) está **desactivado a propósito** (`supabase/rls-dev.sql`) porque todavía no hay login. Las políticas por rol ya están escritas como borrador en [`supabase/policies.sql`](../supabase/policies.sql), pendientes de activar. Los datos sensibles (antecedentes penales) nunca se guardan como documento, solo el estado de verificación — decisión explícita por la Ley 25.326.

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
