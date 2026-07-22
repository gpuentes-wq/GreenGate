import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Modal } from './ui'
import { ESTADOS_DECISION, estadoVerificacion, ESTADO_LABEL, ESTADO_COLOR } from './verificacion'

const TIPO_LABELS: Record<string, string> = {
  antecedentes_penales: 'Antecedentes penales',
  seguro_art: 'Seguro / ART',
  identidad: 'Identidad',
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

  async function guardar(id: string, cambios: Partial<Verif>) {
    setVerifs((vs) => vs.map((v) => (v.id === id ? { ...v, ...cambios } : v)))
    const { error } = await supabase
      .from('verificacion')
      .update({ ...cambios, validado_por: administracionId, validado_en: new Date().toISOString() })
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
          <p className="text-sm text-gray-500">
            Elegí tu <strong>decisión</strong> y la <strong>fecha de vencimiento</strong>. El estado
            (Vigente / Vencido) se calcula solo a partir de la fecha — no se elige a mano.
          </p>
          {verifs.map((v) => {
            const efectivo = estadoVerificacion(v.estado, v.fecha_vencimiento)
            const decision = v.estado === 'vencido' ? 'verificado' : v.estado
            return (
              <div key={v.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-800">{TIPO_LABELS[v.tipo] ?? v.tipo}</div>
                  <span className={'text-xs font-semibold ' + ESTADO_COLOR[efectivo]}>
                    {ESTADO_LABEL[efectivo]}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <label className="block text-xs text-gray-500">
                    Decisión
                    <select
                      value={decision}
                      onChange={(e) => guardar(v.id, { estado: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm capitalize"
                    >
                      {ESTADOS_DECISION.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs text-gray-500">
                    Vence (opcional)
                    <input
                      type="date"
                      value={v.fecha_vencimiento ?? ''}
                      onChange={(e) => guardar(v.id, { fecha_vencimiento: e.target.value || null })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm"
                    />
                  </label>
                </div>
              </div>
            )
          })}
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
