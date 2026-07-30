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
  // NULL = aplica al prestador entero (unipersonal, o seguro/ART compartido
  // por el equipo). Con valor = verificación personal de ESE integrante.
  integrante_id: string | null
}

export interface IntegranteRow {
  id: string
  activo: boolean
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
//
// Si el prestador tiene integrantes ACTIVOS (es un equipo), antecedentes e
// identidad exigen que TODOS estén vigentes — son datos de cada persona, no
// del nombre comercial. El seguro/ART siempre es a nivel del prestador
// (integrante_id null): una póliza compartida por todo el equipo.
// Si no tiene integrantes (unipersonal), se evalúa directo sobre el
// prestador, exactamente como antes de que existiera esta noción de equipo.
export function badgesPrestador(verifs: VerificacionRow[], integrantes: IntegranteRow[] = [], hoy: Date = new Date()) {
  const activos = integrantes.filter((i) => i.activo)
  const vigentePara = (tipo: string, integranteId: string | null) =>
    verifs.some((v) => v.tipo === tipo && v.integrante_id === integranteId && esVigente(v.estado, v.fecha_vencimiento, hoy))

  const seguro = vigentePara('seguro_art', null)

  if (activos.length === 0) {
    return {
      antecedentes: vigentePara('antecedentes_penales', null),
      seguro,
      identidad: vigentePara('identidad', null),
    }
  }
  return {
    antecedentes: activos.every((i) => vigentePara('antecedentes_penales', i.id)),
    seguro,
    identidad: activos.every((i) => vigentePara('identidad', i.id)),
  }
}

// ¿El prestador (unipersonal o equipo) tiene las tres verificaciones vigentes?
export function prestadorVerificado(verifs: VerificacionRow[], integrantes: IntegranteRow[] = [], hoy: Date = new Date()): boolean {
  const b = badgesPrestador(verifs, integrantes, hoy)
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
