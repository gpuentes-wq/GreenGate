import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Modal } from './ui'

const TIPO_LABELS: Record<string, string> = {
  antecedentes_penales: 'Antecedentes penales',
  seguro_art: 'Seguro / ART',
  identidad: 'Identidad',
}

const ESTADOS = ['pendiente', 'verificado', 'vencido', 'rechazado']

const ESTADO_COLOR: Record<string, string> = {
  verificado: 'text-gg-dark',
  pendiente: 'text-amber-600',
  vencido: 'text-red-600',
  rechazado: 'text-red-600',
}

type Verif = { id: string; tipo: string; estado: string; fecha_vencimiento: string | null }

export function ValidarPrestadorModal({
  prestadorId,
  prestadorNombre,
  administracionId,
  onClose,
  onCambio,
}: {
  prestadorId: string
  prestadorNombre: string
  administracionId: string | null
  onClose: () => void
  onCambio: () => void
}) {
  const [verifs, setVerifs] = useState<Verif[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from('verificacion')
        .select('id,tipo,estado,fecha_vencimiento')
        .eq('prestador_id', prestadorId)
        .order('tipo')
      if (error) setError(error.message)
      else setVerifs((data as Verif[]) ?? [])
      setLoading(false)
    }
    cargar()
  }, [prestadorId])

  async function cambiar(id: string, estado: string) {
    setVerifs((vs) => vs.map((v) => (v.id === id ? { ...v, estado } : v)))
    const { error } = await supabase
      .from('verificacion')
      .update({ estado, validado_por: administracionId, validado_en: new Date().toISOString() })
      .eq('id', id)
    if (error) setError(error.message)
    else onCambio()
  }

  return (
    <Modal titulo={`Validar: ${prestadorNombre}`} onClose={onClose}>
      {loading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : verifs.length === 0 ? (
        <p className="text-sm text-gray-500">Este prestador no tiene verificaciones cargadas.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Cambiá el estado de cada documento. Se guarda al instante.</p>
          {verifs.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3"
            >
              <div>
                <div className="text-sm font-medium text-gray-800">{TIPO_LABELS[v.tipo] ?? v.tipo}</div>
                {v.fecha_vencimiento && (
                  <div className="text-xs text-gray-400">Vence: {v.fecha_vencimiento}</div>
                )}
              </div>
              <select
                value={v.estado}
                onChange={(e) => cambiar(v.id, e.target.value)}
                className={
                  'rounded-lg border border-gray-300 px-2 py-1 text-sm font-medium capitalize ' +
                  (ESTADO_COLOR[v.estado] ?? '')
                }
              >
                {ESTADOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          onClick={onClose}
          className="rounded-lg bg-gg-green px-4 py-2 text-sm font-medium text-white hover:bg-gg-dark"
        >
          Listo
        </button>
      </div>
    </Modal>
  )
}
