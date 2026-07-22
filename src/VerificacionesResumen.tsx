import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { estadoVerificacion, ESTADO_LABEL, ESTADO_COLOR, type VerificacionRow } from './verificacion'

const TIPO_LABELS: Record<string, string> = {
  antecedentes_penales: 'Antecedentes',
  seguro_art: 'Seguro / ART',
  identidad: 'Identidad',
}

// Muestra al jardinero el estado DERIVADO de sus verificaciones
// (usa la misma función que el directorio y el panel del admin).
export function VerificacionesResumen({ prestadorId }: { prestadorId: string }) {
  const [verifs, setVerifs] = useState<VerificacionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('verificacion')
      .select('tipo,estado,fecha_vencimiento')
      .eq('prestador_id', prestadorId)
      .order('tipo')
      .then(({ data }) => {
        setVerifs((data as VerificacionRow[]) ?? [])
        setLoading(false)
      })
  }, [prestadorId])

  if (loading) return null

  if (verifs.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
        Todavía no tenés verificaciones cargadas. Cuando pidas trabajar en un barrio, la administración
        las revisa (antecedentes, seguro e identidad).
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 text-sm font-semibold text-gg-dark">Estado de tus verificaciones</div>
      <div className="space-y-1.5">
        {verifs.map((v, i) => {
          const ef = estadoVerificacion(v.estado, v.fecha_vencimiento)
          return (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{TIPO_LABELS[v.tipo] ?? v.tipo}</span>
              <span className={'font-medium ' + ESTADO_COLOR[ef]}>
                {ESTADO_LABEL[ef]}
                {ef === 'vencido' && v.fecha_vencimiento ? ` (venció el ${v.fecha_vencimiento})` : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
