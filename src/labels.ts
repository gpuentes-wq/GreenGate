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

// ── Desde cuándo puede ir el jardinero ─────────────────────────────────
// Vive acá y no en cada pantalla porque lo escribe el jardinero
// (SolicitudesPanel) y lo lee el propietario (MisPresupuestos): si las
// etiquetas se separan, las dos puntas del mismo dato terminan diciendo cosas
// distintas.

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Una columna `date` llega como 'YYYY-MM-DD', y new Date() sobre ese string lo
// interpreta como medianoche UTC: en Argentina (UTC-3) eso cae el día
// anterior a las 21:00, así que la fecha se mostraría corrida un día. Por eso
// se arma a mano, en hora local.
function parseFecha(iso: string): Date | null {
  const partes = iso.split('-').map(Number)
  if (partes.length !== 3 || partes.some(Number.isNaN)) return null
  const [anio, mes, dia] = partes
  return new Date(anio, mes - 1, dia)
}

function hoyLocal(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Fecha de hoy en 'YYYY-MM-DD', que es lo que espera un <input type="date">.
export function hoyISO(): string {
  const d = hoyLocal()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export function sumarDiasISO(dias: number): string {
  const d = hoyLocal()
  d.setDate(d.getDate() + dias)
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

// "Mañana" se lee de un vistazo; "16/09" hay que pensarlo. Dentro de la semana
// se nombra el día, que es como la gente habla de esto.
export function cuandoLabel(iso: string | null): string {
  if (!iso) return 'A coordinar'
  const fecha = parseFecha(iso)
  if (!fecha) return 'A coordinar'

  const dias = Math.round((fecha.getTime() - hoyLocal().getTime()) / 86_400_000)
  const ddmm = `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}`

  if (dias <= 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  if (dias < 7) return `${DIAS[fecha.getDay()]} ${ddmm}`
  return ddmm
}

// Para ordenar: el que puede ir antes va primero, y "a coordinar" al final.
export function ordenDisponibilidad(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY
  const fecha = parseFecha(iso)
  return fecha ? fecha.getTime() : Number.POSITIVE_INFINITY
}
