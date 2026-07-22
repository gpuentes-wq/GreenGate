// ════════════════════════════════════════════════════════════════════════
// verificacion.ts — FUENTE ÚNICA DE VERDAD del estado de verificación.
// ════════════════════════════════════════════════════════════════════════
// Principio: el estado se DERIVA, no se almacena.
//   · `estado` guarda solo la DECISIÓN del admin: pendiente / verificado / rechazado.
//   · "vencido" NO se guarda: se calcula a partir de `fecha_vencimiento`.
//   · Vigente = verificado Y no vencido.
// Las tres pantallas (Propietario, Administración, Jardinero) consumen estas
// funciones. Nadie mira el campo crudo por su cuenta → no pueden contradecirse.
// ════════════════════════════════════════════════════════════════════════

export type EstadoEfectivo = 'pendiente' | 'verificado' | 'vencido' | 'rechazado'

export interface VerificacionRow {
  tipo: string
  estado: string
  fecha_vencimiento: string | null
}

// Estados que el admin puede DECIDIR (no incluye 'vencido', que es derivado).
export const ESTADOS_DECISION = ['pendiente', 'verificado', 'rechazado'] as const

export const ESTADO_LABEL: Record<EstadoEfectivo, string> = {
  pendiente: 'Pendiente',
  verificado: 'Vigente',
  vencido: 'Vencido',
  rechazado: 'Rechazado',
}

export const ESTADO_COLOR: Record<EstadoEfectivo, string> = {
  pendiente: 'text-amber-600',
  verificado: 'text-gg-dark',
  vencido: 'text-red-600',
  rechazado: 'text-red-600',
}

function inicioDia(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function diasHasta(fecha: string, hoy: Date): number {
  const fv = new Date(fecha + 'T00:00:00').getTime()
  return Math.ceil((fv - inicioDia(hoy)) / 86_400_000)
}

// LA función. Deriva el estado efectivo de UNA verificación.
export function estadoVerificacion(
  estado: string,
  fechaVencimiento: string | null,
  hoy: Date = new Date(),
): EstadoEfectivo {
  if (estado === 'rechazado') return 'rechazado'
  // 'verificado' (o el legado 'vencido') significa que fue aprobado; la fecha manda:
  if (estado === 'verificado' || estado === 'vencido') {
    if (fechaVencimiento) {
      return diasHasta(fechaVencimiento, hoy) < 0 ? 'vencido' : 'verificado'
    }
    return estado === 'vencido' ? 'vencido' : 'verificado'
  }
  return 'pendiente'
}

// ¿Está vigente? (verificado y no vencido)
export function esVigente(estado: string, fechaVencimiento: string | null, hoy: Date = new Date()): boolean {
  return estadoVerificacion(estado, fechaVencimiento, hoy) === 'verificado'
}

// Insignias de un prestador a partir de sus verificaciones.
export function badgesPrestador(verifs: VerificacionRow[], hoy: Date = new Date()) {
  const vig = (tipo: string) => verifs.some((v) => v.tipo === tipo && esVigente(v.estado, v.fecha_vencimiento, hoy))
  return {
    antecedentes: vig('antecedentes_penales'),
    seguro: vig('seguro_art'),
    identidad: vig('identidad'),
  }
}

// ¿El prestador tiene las tres verificaciones vigentes?
export function prestadorVerificado(verifs: VerificacionRow[], hoy: Date = new Date()): boolean {
  const b = badgesPrestador(verifs, hoy)
  return b.antecedentes && b.seguro && b.identidad
}

// Alerta para el admin: vencido, o por vencer dentro de `diasAviso` días.
export function alertaVencimiento(
  estado: string,
  fechaVencimiento: string | null,
  hoy: Date = new Date(),
  diasAviso = 30,
): { vencido: boolean; texto: string } | null {
  const ef = estadoVerificacion(estado, fechaVencimiento, hoy)
  if (ef === 'vencido') {
    if (fechaVencimiento) {
      const d = diasHasta(fechaVencimiento, hoy)
      return { vencido: true, texto: d < 0 ? `vencido hace ${-d} días` : 'vencido' }
    }
    return { vencido: true, texto: 'vencido' }
  }
  if (ef === 'verificado' && fechaVencimiento) {
    const d = diasHasta(fechaVencimiento, hoy)
    if (d >= 0 && d <= diasAviso) {
      return { vencido: false, texto: `vence en ${d} día${d === 1 ? '' : 's'}` }
    }
  }
  return null
}
