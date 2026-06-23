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
  antecedentes_ok: boolean
  seguro_ok: boolean
  identidad_ok: boolean
}
