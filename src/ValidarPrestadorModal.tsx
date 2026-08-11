import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Modal } from './ui'
import { ESTADOS_DECISION, estadoVerificacion, ESTADO_LABEL, ESTADO_COLOR } from './verificacion'

const TIPO_LABELS: Record<string, string> = {
  antecedentes_penales: 'Antecedentes penales',
  seguro_art: 'Seguro / ART',
  identidad: 'Identidad',
}

type Verif = { id: string; tipo: string; estado: string; fecha_vencimiento: string | null; integrante_id: string | null }
type Integrante = { id: string; nombre: string; apellido: string | null }

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
  const [integrantes, setIntegrantes] = useState<Integrante[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      const [vRes, iRes] = await Promise.all([
        supabase.from('verificacion').select('id,tipo,estado,fecha_vencimiento,integrante_id').eq('prestador_id', prestadorId).order('tipo'),
        supabase.from('integrante').select('id,nombre,apellido').eq('prestador_id', prestadorId).eq('activo', true).order('nombre'),
      ])
      if (vRes.error) setError(vRes.error.message)
      else setVerifs((vRes.data as Verif[]) ?? [])
      setIntegrantes((iRes.data as Integrante[]) ?? [])
      setLoading(false)
    }
    cargar()
  }, [prestadorId])

  // Validar documentación NO habilita al prestador en el barrio: son dos
  // decisiones distintas. La documentación es un hecho verificable (y de ahí
  // salen las insignias); habilitar el ingreso al barrio es una decisión de la
  // administración, con su propio control en la tabla de prestadores.
  async function guardar(id: string, cambios: Partial<Verif>) {
    setVerifs((vs) => vs.map((v) => (v.id === id ? { ...v, ...cambios } : v)))
    const { error } = await supabase
      .from('verificacion')
      .update({ ...cambios, validado_por: administracionId, validado_en: new Date().toISOString() })
      .eq('id', id)
    if (error) setError(error.message)
    else onCambio()
  }

  const esEquipo = integrantes.length > 0
  const seguroEquipo = verifs.filter((v) => v.tipo === 'seguro_art' && v.integrante_id === null)
  const otrasUnipersonal = verifs.filter((v) => v.integrante_id === null && v.tipo !== 'seguro_art')

  return (
    <Modal titulo={`Validar: ${prestadorNombre}`} onClose={onClose}>
      {loading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : verifs.length === 0 ? (
        <p className="text-sm text-gray-500">Este prestador todavía no tiene documentación cargada.</p>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-gray-500">
            Elegí tu <strong>decisión</strong> y la <strong>fecha de vencimiento</strong>. El estado
            (Vigente / Vencido) se calcula solo a partir de la fecha — no se elige a mano.
          </p>
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Validar la documentación no habilita el ingreso al barrio: eso se decide aparte, con el
            tilde "Habilitado" en la tabla de prestadores.
          </p>

          {esEquipo && (
            <p className="rounded-lg bg-gg-light/50 px-3 py-2 text-xs text-gg-dark">
              Es un equipo de {integrantes.length} persona{integrantes.length === 1 ? '' : 's'}. El seguro es
              compartido; antecedentes e identidad se validan una por una, porque son datos personales.
            </p>
          )}

          {seguroEquipo.length > 0 && (
            <FilaVerif
              titulo={esEquipo ? 'Seguro / ART del equipo' : 'Seguro / ART'}
              verif={seguroEquipo[0]}
              onGuardar={guardar}
            />
          )}

          {!esEquipo &&
            otrasUnipersonal.map((v) => (
              <FilaVerif key={v.id} titulo={TIPO_LABELS[v.tipo] ?? v.tipo} verif={v} onGuardar={guardar} />
            ))}

          {esEquipo &&
            integrantes.map((integ) => {
              const propias = verifs.filter((v) => v.integrante_id === integ.id)
              return (
                <div key={integ.id} className="rounded-xl border border-gray-200 p-3">
                  <div className="mb-2 text-sm font-semibold text-gg-dark">
                    {integ.nombre}
                    {integ.apellido ? ` ${integ.apellido}` : ''}
                  </div>
                  {propias.length === 0 ? (
                    <p className="text-xs text-gray-400">Sin documentación cargada para esta persona.</p>
                  ) : (
                    <div className="space-y-3">
                      {propias.map((v) => (
                        <FilaVerif key={v.id} titulo={TIPO_LABELS[v.tipo] ?? v.tipo} verif={v} onGuardar={guardar} compacta />
                      ))}
                    </div>
                  )}
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

function FilaVerif({
  titulo,
  verif,
  onGuardar,
  compacta,
}: {
  titulo: string
  verif: Verif
  onGuardar: (id: string, cambios: Partial<Verif>) => void
  compacta?: boolean
}) {
  const efectivo = estadoVerificacion(verif.estado, verif.fecha_vencimiento)
  const decision = verif.estado === 'vencido' ? 'verificado' : verif.estado
  return (
    <div className={compacta ? '' : 'rounded-lg border border-gray-200 p-3'}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-800">{titulo}</div>
        <span className={'text-xs font-semibold ' + ESTADO_COLOR[efectivo]}>{ESTADO_LABEL[efectivo]}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <label className="block text-xs text-gray-500">
          Decisión
          <select
            value={decision}
            onChange={(e) => onGuardar(verif.id, { estado: e.target.value })}
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
            value={verif.fecha_vencimiento ?? ''}
            onChange={(e) => onGuardar(verif.id, { fecha_vencimiento: e.target.value || null })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
      </div>
    </div>
  )
}
