# GreenGate · Ideas de la competencia (Tegu y Clickie)

Análisis de dos marketplaces de servicios del hogar argentinos, hecho para sacar ideas aplicables a GreenGate. Basado en el contenido público de sus sitios (julio 2026) — no hay acceso a sus datos internos, solo a lo que muestran en su landing y páginas públicas.

- **Tegu** — https://tegu.ar/ — Córdoba Capital, app-first.
- **Clickie** — https://clickie.com.ar/ — CABA/GBA/Córdoba, landing conversacional.

Los dos son **competidores horizontales** (cubren plomería, electricidad, pintura, etc., no solo jardinería) y **B2C puro** (no entran por una administración de barrio) — la diferencia de modelo con GreenGate es justamente lo que hace interesante compararlos: resuelven partes del problema que a nosotros todavía nos faltan.

## Perfil de cada uno

### 🔵 Tegu

| | |
|---|---|
| Monetización | **Cobra al prestador por cada contacto/lead recibido.** El cliente usa la plataforma gratis, sin comisión sobre el trabajo. |
| Matching | Pedido en lenguaje natural ("necesito alguien que pinte la sala este finde") → una IA sugiere profesionales verificados cercanos. |
| Verificación | Identidad (DNI), antecedentes penales, **matrículas y certificaciones profesionales**, referencias laborales. |
| Confianza en la landing | Métricas en vivo: usuarios, tareas creadas, tiempo de respuesta promedio (5 min), barrios cubiertos, prestadores verificados. |
| Reseñas | Importadas tal cual de las stores (Google Play / App Store), **incluida alguna queja real** — no son todas positivas curadas. |
| Expansión de rubros | *"¿Tu servicio no está? Contanos y lo sumamos"* — mide demanda antes de construir un rubro nuevo. |
| Canal | App-first (la web ofrece "preferir seguir en la web" como alternativa secundaria). |

### 🟣 Clickie

| | |
|---|---|
| UX de la landing | 100% conversacional — un asistente con mascota, sin scroll de secciones, con chips de respuesta rápida. |
| Flujo declarado | 4 pasos explícitos: **Pedido → Presupuestos → Elegís → Pago**. |
| Frase de confianza clave | *"Pagás solo cuando el trabajo esté terminado"* — pago liberado al finalizar, no adelantado. |
| Precios | **Página pública de precios de referencia**, actualizada mensualmente, por tarea específica dentro de cada rubro (ej. "Destapación simple: desde $30.000"), con la aclaración "solo mano de obra, valores orientativos, no vinculantes". |
| Servicios | Cada rubro tiene 3 tags cortos de confianza (ej. Plomero: "Perfiles Verificados · Conexión Directa · Reseñas Reales"). |
| Prueba social | Logos de prensa (Clarín, Forbes, iProUP, Canal 12, Vorterix) + "+25.000 usuarios". |

## Ideas priorizadas para GreenGate

### 1. 💰 Cobrar por lead — monetizable HOY, sin esperar a Fase 2

El modelo de negocio documentado (Doc#3) es **12% de take rate** sobre el trabajo (campo `trabajo.comision_plataforma` en el schema). El problema: cobrar ese 12% **requiere que el pago pase por la plataforma**, y eso es Fase 2, todavía sin construir.

Mientras tanto, el buzón de solicitudes (propietario → jardinero, tabla `solicitud`) **ya funciona en el MVP v1**. Si se le cobra al jardinero por cada solicitud recibida (o por cada una aceptada), como hace Tegu, hay un camino de monetización **disponible ahora**, sin depender de integrar MercadoPago.

**Propuesta concreta:** evaluarlo como complemento al take rate (no necesariamente reemplazo) — por ejemplo, gratis las primeras N solicitudes del mes, luego un costo fijo por lead adicional.

### 2. 💵 "Pagás cuando el trabajo termina" — principio de diseño para Fase 2, no solo una frase

No es marketing, es una decisión de flujo: liberar el pago al confirmar que el trabajo se hizo, no antes. Ataca directamente uno de los dolores más votados en la encuesta propia (pago en efectivo, sin comprobante ni mecanismo de reclamo). Conviene decidir esto **antes** de construir el módulo de pago, no ajustarlo después.

### 3. 📊 Precios de referencia por tipo de tarea

Ya existe `tarifa_referencia` por prestador y por especialidad en la base (`prestador`, `prestador_servicio`). Falta agregarlos en una vista pública tipo "Jardinería: mantenimiento mensual desde $X · Poda desde $Y". Ataca un dolor validado explícitamente en la encuesta (*"percepción de cartel entre jardineros"*, 12% de los propietarios) y el dato ya está — es una vista, no una funcionalidad nueva desde cero. Candidato natural para sumar a [`landing/index.html`](../landing/index.html) o a un panel de administración.

### Bonus: mecanismo para decidir cuándo sumar el segundo rubro

*"¿Tu servicio no está? Contanos y lo sumamos"* de Tegu es, literalmente, el mecanismo que faltaba para la decisión que ya tomamos de **diferir la taxonomía de rubros** hasta que haya demanda real de un segundo vertical (ver nota en memoria del proyecto). En vez de adivinar cuándo construir plomería/electricidad, se mide con un campo simple ("¿qué otro servicio te gustaría encontrar acá?") en la app o la landing, y se decide con datos.

## Qué NO aplica directamente (por la diferencia de modelo)

- **Matching por IA en lenguaje natural**: tiene sentido en un marketplace horizontal, ciudad-wide, con muchos rubros y prestadores. GreenGate opera **acotado a un barrio**, con pocos prestadores por rubro — hoy alcanza con navegar el directorio; el matching por IA sería sobre-ingeniería en esta etapa.
- **Matrículas/certificaciones profesionales**: relevante para plomero/gasista/electricista (rubros regulados), no para jardinería. Se vuelve relevante cuando se sume un rubro que sí las requiera.
- **Blog / contenido SEO**: tiene sentido para un B2C que necesita tráfico orgánico. El modelo de GreenGate entra por la administración del barrio, no por búsqueda orgánica del propietario — más adelante puede sumar valor, pero no es el canal de adquisición prioritario.
- **App nativa (app-first)**: prematuro para el piloto; la SPA web actual alcanza para validar antes de invertir en una app.

## Relación con otros documentos

Las ideas #1 y #3 conversan directo con los huecos que ya habíamos detectado en [`docs/cobertura-propuesta-valor.md`](cobertura-propuesta-valor.md) (falta pago digital, falta ciclo de reseña real, opacidad de precios). No son ideas sueltas — refuerzan el mismo roadmap.

---

*GreenGate · Universidad de San Andrés · Maestría en Negocios Digitales (NBL)*
