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
