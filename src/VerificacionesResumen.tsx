import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { estadoVerificacion, ESTADO_LABEL, ESTADO_COLOR, type VerificacionRow } from './verificacion'

const TIPO_LABELS: Record<string, string> = {
  antecedentes_penales: 'Antecedentes',
  seguro_art: 'Seguro / ART',
  identidad: 'Identidad',
}

type Integrante = { id: string; nombre: string; apellido: string | null }

// Muestra al jardinero el estado DERIVADO de sus verificaciones
// (usa la misma función que el directorio y el panel del admin).
// Si es un equipo, desglosa antecedentes/identidad por integrante — son
// datos personales — y muestra el seguro una sola vez, compartido.
export function VerificacionesResumen({ prestadorId }: { prestadorId: string }) {
  const [verifs, setVerifs] = useState<VerificacionRow[]>([])
  const [integrantes, setIntegrantes] = useState<Integrante[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('verificacion').select('tipo,estado,fecha_vencimiento,integrante_id').eq('prestador_id', prestadorId).order('tipo'),
      supabase.from('integrante').select('id,nombre,apellido').eq('prestador_id', prestadorId).eq('activo', true).order('nombre'),
    ]).then(([v, i]) => {
      setVerifs((v.data as VerificacionRow[]) ?? [])
      setIntegrantes((i.data as Integrante[]) ?? [])
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

  const esEquipo = integrantes.length > 0
  const seguro = verifs.find((v) => v.tipo === 'seguro_art' && v.integrante_id === null)
  const propias = esEquipo ? [] : verifs.filter((v) => v.tipo !== 'seguro_art')

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 text-sm font-semibold text-gg-dark">Estado de tus verificaciones</div>
      <div className="space-y-1.5">
        {seguro && <FilaEstado label={TIPO_LABELS.seguro_art} verif={seguro} />}
        {!esEquipo && propias.map((v, i) => <FilaEstado key={i} label={TIPO_LABELS[v.tipo] ?? v.tipo} verif={v} />)}
      </div>

      {esEquipo && (
        <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
          {integrantes.map((integ) => {
            const suyas = verifs.filter((v) => v.integrante_id === integ.id)
            return (
              <div key={integ.id}>
                <div className="mb-1 text-xs font-semibold text-gray-500">
                  {integ.nombre}
                  {integ.apellido ? ` ${integ.apellido}` : ''}
                </div>
                <div className="space-y-1">
                  {suyas.length === 0 ? (
                    <p className="text-xs text-gray-400">Sin verificaciones cargadas todavía.</p>
                  ) : (
                    suyas.map((v, i) => <FilaEstado key={i} label={TIPO_LABELS[v.tipo] ?? v.tipo} verif={v} />)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilaEstado({ label, verif }: { label: string; verif: VerificacionRow }) {
  const ef = estadoVerificacion(verif.estado, verif.fecha_vencimiento)
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={'font-medium ' + ESTADO_COLOR[ef]}>
        {ESTADO_LABEL[ef]}
        {ef === 'vencido' && verif.fecha_vencimiento ? ` (venció el ${verif.fecha_vencimiento})` : ''}
      </span>
    </div>
  )
}
