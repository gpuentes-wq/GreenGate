# GreenGate · Cobertura de la propuesta de valor en el MVP (v1)

Este documento cruza, línea por línea, lo que los **tres Value Proposition Canvas** (Módulo #4) prometen a cada segmento contra lo que **el MVP hoy realmente entrega** en la app (`greengate-arg.netlify.app`). Sirve para autoevaluarnos antes de mostrarlo, y para que un revisor externo pueda validar rápido si la v1 cubre lo necesario.

> Leyenda: **✅** implementado y funcionando · **🟡** parcial (existe en la base de datos, sin flujo completo en la UI) · **⏳** Fase 2, no empezado

## Resumen ejecutivo

| Segmento | Ítems del canvas | Cubiertos (✅) | Parciales (🟡) | Fase 2 (⏳) |
|---|---|---|---|---|
| 👤 Propietario | 8 | 5 | 1 | 2 |
| 🌿 Jardinero | 8 | 5 | 1 | 2 |
| 🏘️ Administración | 8 | 5 | 1 | 2 |

**Lectura rápida:** el MVP cubre el **núcleo validado por la encuesta** —directorio con calificaciones y verificación— en los tres segmentos, y desde septiembre cubre también **el ciclo completo de contratación y reseña**, que era el hueco más serio de la versión anterior de este documento: el propietario pide visitas a varios jardineros, compara respuestas, elige uno, y después lo califica; el jardinero puede responder esa reseña. **El puntaje del directorio ya no sale de datos de ejemplo: se calcula sobre reseñas de uso real.**

Lo que queda pendiente es lo declarado como Fase 2 desde el Módulo 5 —**pago digital y agenda**— más dos piezas de producto que se detallan al final: el **login** y la **configuración de requisitos por barrio**.

---

## 👤 Propietario

**Statement (Módulo #4):** *"Para los propietarios de barrios privados que quieren mantener su jardín con un servicio confiable sin tener que gestionarlo activamente, que tienen el desafío de encontrar, comparar y evaluar jardineros en un mercado opaco donde hoy solo cuentan con el boca a boca, hemos desarrollado GreenGate, una plataforma respaldada por la administración del barrio, que les permite ver jardineros verificados y calificados por sus propios vecinos, comparar precios, agendar y pagar digitalmente, y contar con historial y un reemplazo disponible ante cualquier imprevisto."*

**Jobs to be done:** mantener el jardín sin gestionarlo activamente · encontrar reemplazo confiable · contratar especialidades (poda, diseño, fumigación) · verificar quién entra a su propiedad · comparar antes de contratar · pagar y que quede registro.

| Lo que promete el canvas (Products & Services / Pain Relievers) | MVP v1 | Dónde |
|---|---|---|
| Directorio de jardineros activos del barrio, con calificaciones | ✅ | `PropietarioDirectorio.tsx` + vista `prestador_directorio`. El puntaje se deriva de `valoracion`, alimentada por reseñas reales |
| Perfiles con fotos de trabajos anteriores y especialidades | ✅ | Portfolio con lightbox, badges de especialidad |
| Comparador por precio, calificación y especialidad | ✅ | Tarjetas ordenadas por puntaje, con tarifa y especialidades visibles |
| Insignia de verificado (antecedentes, seguro/ART, identidad) | ✅ | Insignias derivadas de `verificacion.ts`, filtro "Solo verificados" |
| Canal de contacto respaldado por el barrio | ✅ | Pide una visita a varios jardineros a la vez (1 `pedido` → N `solicitud`), compara las respuestas en "Mis pedidos", elige a uno y recién ahí se abre el WhatsApp. Puede dar de baja el pedido y los jardineros se enteran |
| Reserva y agendamiento desde el celular | ⏳ | Fase 2. Existe el primer tramo —el jardinero responde desde cuándo puede ir y el propietario compara por esa fecha— pero el turno se acuerda por WhatsApp, no en la app |
| Pago digital (MercadoPago/tarjeta) con registro del acuerdo | ⏳ | Fase 2 (`trabajo.metodo_pago` existe en el schema, sin UI) |
| Historial de servicios + reemplazo/jardinero de urgencia | 🟡 | **Urgencias resuelto**: los jardineros declaran si las atienden, el directorio filtra por eso y el pedido puede marcarse urgente, con la respuesta distinguiendo quién puede ir hoy. **Historial parcial**: el propietario ve sus pedidos y las respuestas en "Mis pedidos", pero no un historial de trabajos de su propiedad — la tabla `trabajo` sigue sin escribirse desde la app |

---

## 🌿 Jardinero

**Statement (Módulo #4):** *"Para los jardineros que trabajan en barrios privados y hoy no tienen forma de diferenciarse por su calidad ni de hacer crecer su cartera más allá del boca a boca, que tienen el desafío de conseguir nuevos clientes, cobrar a tiempo y organizar su operación sin perder la autonomía que valoran, hemos desarrollado GreenGate, una plataforma respaldada por la administración del barrio, que les da un perfil verificado con reputación acumulable, acceso a nuevos clientes y herramientas simples de agenda y cobro digital — sin exigirles formalizarse para empezar."*

**Jobs to be done:** conseguir clientes sin depender del boca a boca · diferenciarse por calidad · organizar la agenda · vender especialidades · cobrar a tiempo · acceder gradualmente a formalización.

| Lo que promete el canvas (Products & Services / Pain Relievers) | MVP v1 | Dónde |
|---|---|---|
| Onboarding de baja fricción, sin exigir formalización tributaria | ✅ | `JardineroOnboarding.tsx` — CUIT/condición fiscal explícitamente opcionales |
| Perfil verificado con calificaciones y portfolio de fotos | ✅ | Mismo perfil que ve el propietario: fotos, reseñas reales firmadas por barrio, y **derecho a réplica** — puede responder públicamente cada reseña (`valoracion.respuesta_prestador`) |
| Bandeja de solicitudes de propietarios | ✅ | `SolicitudesPanel.tsx` — responde desde cuándo puede ir, con una aclaración y un estimado opcional. Ve cuándo lo eligen, cuándo eligen a otro y cuándo dan de baja un pedido, y puede pedirle la reseña al vecino |
| Vidriera de especialidades (poda, diseño, riego, fumigación) | ✅ | Selector de especialidades adicionales en el alta/edición de perfil |
| Requisitos de ingreso unificados y preconfigurados por barrio | 🟡 | El schema soporta requisitos por barrio (`barrio.requiere_*`), pero hoy **no hay UI** para que la administración los configure; se crean siempre los 3 tipos de verificación por default |
| El historial queda en la plataforma, no se pierde al perder un cliente | ✅ | Los datos del prestador y sus verificaciones persisten en Supabase, independientes de cualquier propietario puntual |
| Agenda digital + agrupamiento de visitas por cercanía | ⏳ | Fase 2 |
| Cobro digital (CBU/alias) con seguimiento de pagos pendientes | ⏳ | Fase 2 — `prestador.cbu_alias` existe en el schema, no está en el formulario de alta |

---

## 🏘️ Administración

**Statement (Módulo #4):** *"Para las administraciones de barrios privados que gestionan el acceso y la convivencia de sus comunidades, que tienen el desafío de controlar el ingreso de prestadores de forma segura, trazable y sin incrementar la carga operativa de su equipo, hemos desarrollado GreenGate, una plataforma digital B2B, que les permitirá validar automáticamente la documentación de cada prestador, registrar y geolocalizar cada ingreso vinculado al lote que lo convocó, y ofrecer a sus vecinos un directorio curado de servicios certificados."*

**Jobs to be done:** validar y autorizar ingresos · verificar documentación vigente · dar un canal de queja al vecino sin asumir responsabilidad · posicionarse como administración moderna · reducir riesgo legal · conectar propietarios con prestadores validados.

| Lo que promete el canvas (Products & Services / Pain Relievers) | MVP v1 | Dónde |
|---|---|---|
| Panel de control con validación de documentación (antecedentes, seguro/ART, identidad) | ✅ | `AdminPanel.tsx` + `ValidarPrestadorModal.tsx` |
| Alertas automáticas de vencimiento de documentación | ✅ | Sección "Documentación que requiere atención" (vencidos + por vencer en 30 días), derivada por `verificacion.ts` — no hay estados contradictorios entre pantallas |
| Registro digital de prestadores habilitados por barrio | ✅ | Tabla `prestador_barrio`, alta y gestión de barrios en el panel |
| Directorio curado de servicios certificados para compartir con vecinos | ✅ | El mismo directorio que ve el propietario nace de la validación que hace el admin |
| Historial y calificaciones que respaldan decisiones ante quejas | ✅ | Las calificaciones ya nacen del uso real (pedido → elección → reseña) y el panel las muestra por prestador, con promedio y cantidad (`AdminBarrioPanel.tsx`). Ante una queja, la administración tiene con qué respaldarse |
| Personalización de requisitos por barrio | 🟡 | Campo en el schema (`barrio.requiere_antecedentes/seguro_art/identidad`), sin UI en el alta de barrio (`AltaBarrioModal.tsx`) para configurarlo |
| Registro y geolocalización de cada ingreso vinculado al lote, en tiempo real | ⏳ | Fase 2 — tabla `ingreso` ya modelada, sin integración con el control de accesos del barrio ni UI |
| Detección en tiempo real de un prestador operando en más de un lote simultáneamente | ⏳ | Fase 2 (depende de la integración de accesos de arriba) |

---

## Lo que se cerró desde la versión anterior

**El ciclo de reseña real.** Era el hueco número uno de este documento: el puntaje venía de `seed.sql` y no había forma de que un propietario calificara a quien contrató. Hoy el circuito cierra entero — el propietario pide visitas, elige a uno, lo califica desde "Mis pedidos" o desde un link que el propio jardinero le pasa por WhatsApp, y el jardinero puede responder esa reseña. Es lo que le faltaba al "un solo registro, tres lecturas distintas" del Módulo 5 para funcionar con datos reales.

Junto con eso se cerraron el **flujo de pedidos y visitas** (un pedido a varios jardineros, comparación, elección y baja) y las **urgencias** (marca del prestador, filtro en el directorio y pedido urgente).

## Lo que sigue abierto

1. **Pago digital y agenda son, a propósito, Fase 2.** Coincide con lo que ya definió el Módulo 5 — no es un olvido, es la secuencia planeada. Vale la pena repetirlo así de explícito para que un revisor no lo lea como una falla.
2. **No hay login.** El propietario se identifica por los pedidos guardados en su navegador (`localStorage`), así que pierde el acceso a sus presupuestos si cambia de dispositivo o limpia los datos. Es el límite conocido del piloto y la condición para activar las políticas de seguridad por rol, que ya están escritas en `supabase/policies.sql`.
3. **La administración no puede configurar qué documentación exige.** Las columnas `barrio.requiere_*` existen desde el principio pero no hay pantalla: hoy se crean siempre los tres tipos de verificación. Es el único ítem 🟡 que queda en los tres canvas.

## El riesgo que no es técnico

El circuito de reseñas funciona, pero **arranca vacío**. El puntaje del directorio solo vale si hay reseñas reales cargadas, y para las primeras hace falta empujar a mano: pedirle a los primeros vecinos que elijan a alguien que después lo califiquen. Sin ese empujón inicial, el directorio sigue mostrando los datos de ejemplo y la propuesta de valor no se sostiene sola.

## Qué NO cubre este documento

Este documento compara **oferta prometida vs. entregada**. No repite el análisis de **validación de mercado** (qué tan probado está cada dolor con evidencia primaria) — eso está en [`docs/guia-revision.md`](guia-revision.md) sección 3, y en la investigación original (encuestas a 80 propietarios y 9 administraciones).

---

*GreenGate · Universidad de San Andrés · Maestría en Negocios Digitales (NBL)*
