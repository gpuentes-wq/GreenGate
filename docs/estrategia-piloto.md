# GreenGate · Estrategia de piloto y validación de interés

Documento de referencia sobre cómo validar el interés de los 3 tipos de usuario (administración, propietarios, jardineros) antes de dar acceso al MVP.

## Principio general

**No se entrega acceso al MVP hasta validar interés real.** El piloto primero mide interés (respuestas, disposición a usarlo) y recién a quien muestre interés genuino se lo invita a probar la app.

## Insight clave que define el orden

El propietario es, muchas veces, quien empuja a la administración a incorporar servicios nuevos. Su opinión pesa mucho en la decisión de la administración. Por eso el piloto no arranca por la administración en frío, sino por los propietarios — y se usa su interés como palanca.

## Secuencia recomendada

1. **Arrancar por propietarios conocidos** en 2-3 barrios objetivo. Mostrarles el landing y preguntar directamente: *"si esto existiera en tu barrio, ¿lo pedirías en la administración?"* Esto valida interés real y también si están dispuestos a ser la voz interna ante la administración.

2. **Priorizar a los que tienen llegada a la administración** (comisión directiva, consorcio, buena relación con el gerente/encargado). Son el mejor "puente": si a ellos les interesa, pueden plantearlo puertas adentro, lo cual pesa mucho más que un contacto en frío.

3. **Recién ahí abordar a la administración**, ya no en frío sino con evidencia concreta: *"tengo a N vecinos de tu barrio interesados en algo así, ¿te muestro cómo sería?"* Esto baja la percepción de riesgo del lado de la administración y da un motivo real para pedir la reunión/demo.

4. **Sumar jardineros al final**, una vez que haya un barrio con administración dispuesta a habilitarlo. Hasta que la administración no "habilita el barrio" en la app, ni propietarios ni jardineros pueden usar el MVP de verdad (así está diseñado el flujo hoy). Hasta ese momento, el interés de propietarios es señal de validación, no uso real.

## Canales por segmento

| Segmento | Canal recomendado | Por qué |
|---|---|---|
| **Propietarios** | WhatsApp directo a contactos conocidos | Es venta consumer, informal; Instagram solo tiene sentido más adelante, con el visto bueno de la administración para compartirlo en el grupo del barrio |
| **Administración** | Contacto directo (llamada / mensaje personalizado), no redes masivas | Es una venta consultiva B2B; el objetivo es conseguir 2-3 barrios piloto reales |
| **Jardineros** | WhatsApp directo o en persona | Es el canal natural de este segmento, orientado al boca a boca |

## Seguimiento del experimento

Llevar una planilla simple con:
- Nombre
- Segmento (propietario / administración / jardinero)
- Barrio
- Canal usado
- Fecha de contacto
- Respuesta
- Nivel de interés (alto / medio / bajo)
- Si es propietario: **¿tiene llegada a la administración?** (sí/no) — para priorizar a quién contactar primero

Esto además sirve como evidencia cuantitativa (tasa de respuesta por canal/segmento) para el trabajo de UDESA.

## Incentivos de retención (moat)

El riesgo central de cualquier marketplace de dos lados: una vez que propietario y jardinero se conocieron y el primer trabajo salió bien, ¿por qué seguirían pasando por la plataforma y no directo por WhatsApp? Sin una respuesta clara a esto, el modelo de negocio se cae.

### Los tres anclas de retención

1. **Reputación que solo vale adentro.** El jardinero pierde visibilidad ante nuevos vecinos si se va del sistema; el propietario pierde la comparación y las reseñas de sus vecinos. Ya está en el producto (puntaje, calificaciones). Una reseña buena queda visible para *todos* los vecinos que entren al directorio del barrio, no solo para quien el propietario decida recomendárselo en persona — es el boca a boca de siempre, pero con alcance automático en vez de depender de que alguien se acuerde de mencionarlo.
2. **Servicio recurrente gestionado en la app.** Si el vínculo pasa a ser mensual y la app maneja agenda/recordatorios (tipo de servicio mensual/recurrente vs. puntual, ya en el roadmap del producto), hay una razón concreta para seguir ahí más allá del primer contacto.
3. **Pago dentro de la plataforma** (Fase 2, MercadoPago). Es la palanca más fuerte contra la fuga a WhatsApp — lo más costoso de reemplazar afuera.

### Propuesta: cotización asistida por IA (el "gancho" de entrada)

Idea original: usar un LLM para levantar la información del pedido del propietario (descripción + fotos de lo que necesita) y transmitírsela estructurada al jardinero, para que arme un presupuesto más rápido — optimizando el ida y vuelta que hoy pasa por WhatsApp.

- Se plantea como **gancho de entrada**, no como automatización de toda la negociación: la IA estructura el pedido y lo entrega armado al jardinero, que cotiza *dentro* de la app. No se plantea que la IA negocie sola desde el arranque — es mucho desarrollo para un MVP y no es necesario para dar valor real.
- **Catálogo de especialidades como upsell de descubrimiento.** Si el perfil del jardinero muestra todas sus especialidades (corte, poda, riego, diseño), el propietario puede pedir varios servicios juntos desde el primer contacto, en vez de descubrirlos recién en una conversación separada más adelante. Esto funciona mejor *antes* del primer contacto directo — una vez que propietario y jardinero ya se conocen y tienen el teléfono del otro, un pedido adicional puede negociarse igual de fácil por WhatsApp, así que el valor real está en la etapa de descubrimiento, no en retener a un cliente que ya se tiene.

### Extensión: pedido en paralelo a varios jardineros + comparación asistida

Si el propietario ve 3 jardineros habilitados en su barrio, la IA arma el mismo pedido estructurado y lo manda en paralelo a los 3. Cuando llegan las respuestas, arma un comparativo.

- **Es más fuerte como argumento de retención que la cotización individual**: comparar 3 presupuestos en simultáneo con una tabla clara (precio, tiempo estimado, calificación, disponibilidad) es algo que WhatsApp no puede replicar (serían 3 chats separados, sin nada que ayude a decidir).
- **La IA debe comparar, no decidir por el usuario.** Tabla comparativa + resumen corto (ej. "el más económico es X, el mejor calificado es Y"), no una recomendación tipo caja negra — así el propietario confía y entiende el porqué.
- **Cuidar cómo lo vive el jardinero.** Competir a ciegas contra otros puede generar rechazo; el marco correcto es "te llegan más pedidos por estar en la plataforma, y competís en igualdad de condiciones con tu reputación real" — coherente con la promesa de visibilidad y más clientes.
- Técnicamente es más simple que automatizar toda la negociación: la IA solo estructura la entrada (un pedido) y resume la salida (N respuestas) — no necesita negociar nada.

### Diferencial: servicio de urgencia

Propuesta: en la pantalla de propietarios, poder pedir un servicio de urgencia (ej. "no vino mi jardinero habitual") y acceder rápido a prestadores dispuestos a responder de inmediato. Es un momento donde el valor de estar en la plataforma se nota más que nunca: en una urgencia nadie quiere comparar presupuestos con calma, quiere ver ya quién está disponible ahora — algo que preguntar entre contactos por WhatsApp no resuelve tan rápido.

- **Requiere una señal de disponibilidad en tiempo real**, distinta del perfil general/especialidades fijas: el prestador se marca como "disponible para urgencia ahora" (se prende/apaga). Podría sumarse a la sección "Tipo de servicio" de la pantalla de Inicio del jardinero, como una tercera opción o un toggle aparte.
- **Con/sin maquinaria propia como diferenciador de precio.** Una urgencia puede requerir herramienta específica (ej. motosierra) que no todos tienen; el que carga con el equipo cobra más.
- **Puede ser un segmento propio de prestador**, no necesariamente alguien con cartera de clientes recurrentes — alguien que se dedique solo a atender urgencias. El modelo de datos ya lo permite (el campo de tipo de servicio deja la puerta abierta a variantes).
- **Punto de atención**: en una urgencia hay menos tiempo para comparar reseñas con calma, así que probablemente convenga limitarlo a prestadores ya verificados y con una vara de calificación más alta, para compensar la menor chance de elegir con calma.
- Es una funcionalidad de mayor alcance (necesita estado de disponibilidad en vivo) — buen tema para preguntar directamente en las entrevistas del piloto ("¿te serviría un servicio de urgencia?") antes de construirlo.

### Por qué cierra el modelo de negocio

El propietario se queda porque comparar ahí es mejor que afuera; el jardinero se queda porque los pedidos comparativos (y el volumen de leads) solo le llegan estando en la plataforma. Combinado con reputación, recurrencia y pago in-app, da varias razones simultáneas para no desintermediar.

## Pendiente

- Definir los 2-3 barrios donde arrancar el piloto.
- Redactar los mensajes de contacto (WhatsApp para propietarios y jardineros, mensaje más formal para administración).
- Diseñar el flujo concreto de la cotización asistida por IA (qué información se pide, cómo se estructura, cómo se le presenta al jardinero).
- Sumar la pregunta sobre servicio de urgencia a las entrevistas del piloto, para validar interés antes de construirlo.

---

*Universidad de San Andrés · Maestría en Negocios Digitales (NBL) · Proyecto GreenGate*
