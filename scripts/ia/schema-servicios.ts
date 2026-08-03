// Traduce docs/catalogo-servicios.md a datos: campos a extraer + preguntas
// pendientes por cada tipo de servicio. Fuente de verdad para el esquema:
// docs/catalogo-servicios.md — si el catálogo cambia, actualizar acá también.

export type TipoServicio =
  | 'jardineria'
  | 'poda'
  | 'riego'
  | 'diseno_paisajismo'
  | 'fumigacion'
  | 'limpieza_exterior'
  | 'piletas'
  | 'otro'

export type CampoServicio = {
  campo: string
  pregunta: string
}

export const ESQUEMA_POR_SERVICIO: Record<TipoServicio, CampoServicio[]> = {
  jardineria: [
    { campo: 'alcance', pregunta: '¿Necesitás solo corte de césped, o también cuidado de ollas y canteros?' },
    { campo: 'tamano', pregunta: '¿Qué tamaño tiene aproximadamente el jardín? (chico/mediano/grande, o m² si lo sabés)' },
    { campo: 'frecuencia', pregunta: '¿Es un servicio puntual (una vez) o querés que sea mensual/recurrente?' },
    { campo: 'estado', pregunta: '¿El pasto está muy crecido o es mantenimiento regular?' },
    { campo: 'especificaciones', pregunta: '¿Hay algo que el jardinero deba tener en cuenta? (plantas delicadas, mascotas, riego automático, etc.)' },
    { campo: 'urgencia', pregunta: '¿Para cuándo lo necesitás?' },
  ],
  poda: [
    { campo: 'alcance', pregunta: '¿Es poda de cercos/setos o de árboles?' },
    { campo: 'tamano', pregunta: 'Cantidad aproximada — metros de cerco, o cantidad de árboles' },
    { campo: 'frecuencia', pregunta: '¿Es puntual o parte de un mantenimiento periódico?' },
    { campo: 'altura', pregunta: '¿Qué altura aproximada tienen? (solo si es árboles)' },
    { campo: 'seguridad', pregunta: '¿Hay cables o tendido eléctrico cerca? (solo si es árboles)' },
    { campo: 'especificaciones', pregunta: '¿Alguna forma o estilo particular que quieras mantener? (solo si es cerco)' },
    { campo: 'urgencia', pregunta: '¿Para cuándo lo necesitás?' },
  ],
  riego: [
    { campo: 'alcance', pregunta: '¿Es instalación de un sistema nuevo, o mantenimiento de uno que ya existe?' },
    { campo: 'tamano', pregunta: '¿Qué tamaño tiene el área a regar? (m² o cantidad de sectores)' },
    { campo: 'infraestructura', pregunta: '¿Ya tenés una fuente de agua disponible cerca? (solo si es instalación nueva)' },
    { campo: 'complejidad', pregunta: '¿Cuántas zonas distintas querés regar por separado? (solo si es instalación nueva)' },
    { campo: 'diagnostico', pregunta: '¿Qué problema estás teniendo? (solo si es mantenimiento)' },
    { campo: 'frecuencia', pregunta: '¿Es puntual o querés que quede como mantenimiento periódico?' },
    { campo: 'urgencia', pregunta: '¿Para cuándo lo necesitás?' },
  ],
  diseno_paisajismo: [
    { campo: 'alcance', pregunta: '¿Es un rediseño puntual, o querés incorporarlo como parte de un mantenimiento integral recurrente?' },
    { campo: 'tamano', pregunta: '¿Qué área del jardín querés rediseñar? (todo el jardín, o un sector puntual)' },
    { campo: 'especificaciones', pregunta: '¿Tenés alguna idea o estilo en mente, o preferís que te propongan algo?' },
    { campo: 'elementos_adicionales', pregunta: '¿Buscás sumar riego automático, iluminación u otros elementos además de plantas?' },
    { campo: 'presupuesto', pregunta: '¿Tenés un presupuesto aproximado en mente? (opcional)' },
    { campo: 'plazo', pregunta: '¿Para cuándo te gustaría tenerlo listo?' },
  ],
  fumigacion: [
    { campo: 'alcance', pregunta: '¿Buscás prevenir/eliminar insectos y plagas, o es más una fertilización localizada de alguna zona?' },
    { campo: 'tamano', pregunta: '¿Qué área necesita tratamiento? (todo el jardín o una zona puntual)' },
    { campo: 'especificacion_plaga', pregunta: '¿Identificaste qué tipo de plaga es? (solo si es control de plagas)' },
    { campo: 'seguridad', pregunta: '¿Hay mascotas o niños que frecuenten el jardín? (solo si es control de plagas)' },
    { campo: 'especificacion_plantas', pregunta: '¿Qué tipo de plantas necesitan el tratamiento? (solo si es fertilización)' },
    { campo: 'frecuencia', pregunta: '¿Es puntual o querés que sea periódico?' },
    { campo: 'urgencia', pregunta: '¿Para cuándo lo necesitás?' },
  ],
  limpieza_exterior: [
    { campo: 'tamano', pregunta: '¿Qué tamaño tiene aproximadamente el terreno?' },
    { campo: 'estado', pregunta: '¿Qué tan crecido está? (pasto alto, arbustos descontrolados, o ambos)' },
    { campo: 'especificaciones', pregunta: '¿Hay algo que el jardinero deba evitar o conservar?' },
    { campo: 'logistica', pregunta: '¿Querés que se lleven los residuos, o los dejás vos?' },
    { campo: 'urgencia', pregunta: '¿Para cuándo lo necesitás?' },
  ],
  piletas: [
    { campo: 'alcance', pregunta: '¿Necesitás que incluya los productos (ácido/cloro/otros), o los ponés vos?' },
    { campo: 'tamano', pregunta: '¿Qué tamaño tiene la pileta aproximadamente?' },
    { campo: 'alcance_temporal', pregunta: '¿Es apertura/cierre de temporada, o mantenimiento regular?' },
    { campo: 'frecuencia', pregunta: '¿Es puntual o querés que sea periódico? (ej. semanal)' },
    { campo: 'estado', pregunta: '¿Cómo está el agua ahora? (turbia, con hojas, algas, etc.)' },
    { campo: 'urgencia', pregunta: '¿Para cuándo lo necesitás?' },
  ],
  otro: [
    { campo: 'descripcion', pregunta: 'Contame con tus palabras qué necesitás.' },
  ],
}

export const TOPE_PREGUNTAS = 10
