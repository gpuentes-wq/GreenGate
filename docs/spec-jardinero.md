# GreenGate · Especificación de pantallas — Jardinero

Documento de referencia para el desarrollo de las pantallas del rol jardinero en el MVP. A diferencia de propietario, acá ya hay bastante construido (`src/JardineroPanel.tsx`, `src/JardineroOnboarding.tsx`) — este documento marca qué se mantiene y qué cambia. Se apoya en [`estrategia-piloto.md`](estrategia-piloto.md) y [`catalogo-servicios.md`](catalogo-servicios.md).

## Las 4 secciones

### 1. Mi panel

- **"Necesita tu atención"** (solicitudes pendientes + vencimientos de documentación) — ya construido tal cual en `JardineroPanel.tsx`.
- **"Tu negocio"** — ya construido, pero cambian las métricas: hoy muestra puntaje, clientes activos y *facturado este mes*. Pasa a mostrar **puntaje de reseñas, clientes activos, presupuestos realizados y tus servicios activos** (se reemplaza "facturado este mes" por las dos nuevas).
- **Acceso rápido al tilde de urgencia**: como la disponibilidad puede cambiar día a día, conviene que "Abierto a servicios de urgencia" (ver pantalla "Mi perfil") esté prendible/apagable también desde acá, no solo enterrado en el perfil.
- **"Próximamente"** — ya existe la sección con 2 placeholders (pagos recibidos, mapa de clientes). Se suman 6 más: **asesor legal, seguros, monotributo, capacitaciones, créditos, compra de herramientas.**

### 2. Mi perfil

- Datos personales, datos fiscales (opcional) — ya existen los campos en `JardineroOnboarding.tsx`.
- **Tu servicio**: selección de especialidades (ya existe), con precios de referencia por servicio (ya existen los campos). Se suma un solo tilde, **"Abierto a servicios de urgencia"**, aplicable únicamente a jardinería general (el resto de las categorías se cotiza de la forma normal, sin este atajo). Lo puede tildar tanto un jardinero de cartera que tiene un hueco libre ese día/semana, como alguien que se dedica solo a atender urgencias — incluso de forma estacional.
- **Seleccionar barrio(s) donde quiere trabajar** — hoy el barrio se elige una sola vez al crear el perfil y no es editable ni múltiple. Pasa a ser una selección editable desde "Mi perfil", y probablemente múltiple (la tabla `prestador_barrio` ya está pensada para eso).
- **Validación de documentación según barrio**: el jardinero sube/declara documentación; la aprobación real la hace administración desde su propio módulo — ya es consistente con cómo está modelado hoy (`prestador_barrio.habilitado` arranca en `false`).

### Cómo se alimenta el directorio de prestadores

La plataforma se retroalimenta desde los tres actores, no solo por autoregistro:

1. **Autoregistro**: el jardinero se da de alta él mismo, y la administración valida su documentación después (el flujo que existe hoy).
2. **Alta por administración**: la administración ya conoce al jardinero porque ya trabaja informalmente en el barrio, y lo carga ella misma con los datos que ya tiene. Va a ser el caso más común al arranque del piloto, justamente porque son los prestadores que ya están trabajando. El jardinero entra después solo a **validar/completar su documentación** sobre un perfil que ya existe — no lo crea de cero. Requiere que el onboarding del jardinero contemple este caso (probablemente vía una invitación/código que le manda la administración), además del alta desde cero.
3. **Recomendado por el propietario**: si no encuentra a quien busca en el listado, puede proponer un prestador nuevo (ver `spec-propietario.md`, pantalla 2). Queda como lead para que administración/GreenGate lo contacte.

Los tres caminos convergen en el mismo paso: la validación de documentación la hace siempre administración, sin importar quién originó el alta. El modelo de `prestador` necesita un campo que distinga el origen (autoregistro / alta por administración / recomendado), para saber en qué punto del proceso está cada perfil. El detalle de la acción de "dar de alta" desde el lado de administración se define en la spec de ese rol.

### 3. Mi equipo

Ya construido, condicionado a "soy empresa". Sin cambios pendientes por ahora.

### 4. Mis solicitudes

Detalle de solicitudes de presupuesto/trabajo con su estado correspondiente. Se conecta con el pedido que arma la IA del lado del propietario (`spec-propietario.md`, pantallas 1 y 4).

**La IA también trabaja de este lado**: el jardinero puede responder en lenguaje coloquial (qué trabajo hace, cuánto cobra) y la IA lo estructura en una cotización comparable — es la otra mitad del flujo, simétrica a la extracción del lado del propietario. Sin esto, la pantalla "Presupuestos" del propietario (comparación de varias cotizaciones) no tendría datos estructurados para comparar.

## Cambio de modelo de datos necesario

- **`prestador`**: sumar un campo `disponible_urgencia` (boolean) — el tilde de "Abierto a servicios de urgencia", simple y a nivel de todo el perfil (no por especialidad, ya que solo aplica a jardinería general).
- **"Presupuestos realizados"** (métrica nueva): se cuenta a partir de `solicitud` — falta definir si es toda solicitud respondida, o solo las que llegaron a tener un monto cotizado (una vez extendida `solicitud` según `spec-propietario.md`).
- **"Servicios activos"** (métrica nueva): cuenta de especialidades publicadas — el dato ya existe en `prestador_servicio`, es una query nueva, no una tabla nueva.
- **`prestador`**: sumar un campo de origen del alta (autoregistro / alta por administración / recomendado por propietario), para saber en qué punto del proceso está cada perfil.

## Pendiente / a definir

- Definir exactamente qué cuenta como "presupuesto realizado" para la métrica de "Tu negocio".
- Confirmar si la selección múltiple de barrios en "Mi perfil" entra en este MVP o queda para una iteración posterior.
- Cómo se dispara y persiste la interacción de IA del lado del jardinero en "Mis solicitudes" (mismo tipo de diseño que la pantalla "Especificación de trabajo" del propietario, pero en sentido inverso).

---

*Universidad de San Andrés · Maestría en Negocios Digitales (NBL) · Proyecto GreenGate*
