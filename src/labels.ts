const SERVICIO_LABELS: Record<string, string> = {
  jardineria: 'Jardinería',
  poda: 'Poda',
  fumigacion: 'Fumigación',
  riego: 'Riego',
  diseno_paisajismo: 'Diseño y paisajismo',
  limpieza_exterior: 'Limpieza exterior',
  otro: 'Otro',
}

export function servicioLabel(tipo: string): string {
  return SERVICIO_LABELS[tipo] ?? tipo
}

// Cuándo puede ir el jardinero. Vive acá y no en cada pantalla porque lo
// escribe el jardinero (SolicitudesPanel) y lo lee el propietario
// (MisPresupuestos): si las etiquetas se separan, las dos puntas del mismo
// dato terminan diciendo cosas distintas.
export const DISPONIBILIDAD_OPCIONES = [
  { valor: 'esta_semana', label: 'Esta semana' },
  { valor: 'proxima_semana', label: 'La semana que viene' },
  { valor: 'a_coordinar', label: 'A coordinar' },
] as const

const DISPONIBILIDAD_LABELS: Record<string, string> = Object.fromEntries(
  DISPONIBILIDAD_OPCIONES.map((o) => [o.valor, o.label]),
)

export function disponibilidadLabel(valor: string | null): string | null {
  if (!valor) return null
  return DISPONIBILIDAD_LABELS[valor] ?? valor
}
