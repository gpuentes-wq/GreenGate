export interface Barrio {
  id: string
  nombre: string
  localidad: string | null
  zona: string | null
  cantidad_lotes: number | null
  etapa_activacion: string | null
}

export interface PrestadorDirectorio {
  id: string
  nombre: string
  apellido: string | null
  razon_social: string | null
  es_empresa: boolean
  tipo_servicio_principal: string
  zona_preferente: string | null
  horario_trabajo: string | null
  descripcion: string | null
  foto_url: string | null
  condicion_fiscal: string | null
  activo: boolean
  puntaje_promedio: number | null
  cantidad_valoraciones: number
}

export interface Especialidad {
  prestador_id: string
  tipo: string
  tarifa: number | null
}

export interface Valoracion {
  id: string
  prestador_id: string
  puntaje: number
  puntaje_calidad: number | null
  puntaje_puntualidad: number | null
  puntaje_comunicacion: number | null
  puntaje_precio: number | null
  comentario: string | null
  respuesta_prestador: string | null
  created_at: string
}
