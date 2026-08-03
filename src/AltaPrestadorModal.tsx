import { useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { Modal, Campo, inputClass } from './ui'
import { servicioLabel } from './labels'

const SERVICIOS = ['jardineria', 'poda', 'fumigacion', 'riego', 'diseno_paisajismo', 'limpieza_exterior', 'otro']
const CONDICIONES = ['informal', 'monotributo', 'responsable_inscripto', 'exento', 'otro']

// Alta de un prestador que la administración ya conoce (trabaja informalmente
// en el barrio). Queda pendiente de validación como cualquier otro alta —
// el jardinero entra después solo a completar/validar su documentación.
export function AltaPrestadorModal({
  barrioId,
  onClose,
  onCreado,
}: {
  barrioId: string
  onClose: () => void
  onCreado: () => void
}) {
  const [esEmpresa, setEsEmpresa] = useState(false)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [celular, setCelular] = useState('')
  const [servicioPrincipal, setServicioPrincipal] = useState('jardineria')
  const [condicion, setCondicion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (esEmpresa ? !razonSocial.trim() : !nombre.trim()) {
      setError(esEmpresa ? 'La razón social es obligatoria' : 'El nombre es obligatorio')
      return
    }
    if (!celular.trim()) {
      setError('El celular es obligatorio')
      return
    }
    setGuardando(true)
    setError(null)

    const { data, error: pErr } = await supabase
      .from('prestador')
      .insert({
        nombre: esEmpresa ? razonSocial.trim() : nombre.trim(),
        apellido: esEmpresa ? null : apellido.trim() || null,
        razon_social: esEmpresa ? razonSocial.trim() : null,
        es_empresa: esEmpresa,
        celular: celular.trim(),
        tipo_servicio_principal: servicioPrincipal,
        condicion_fiscal: condicion || null,
        origen: 'alta_administracion',
      })
      .select('id')
      .single()
    if (pErr || !data) {
      setGuardando(false)
      setError(pErr?.message ?? 'No se pudo crear el prestador')
      return
    }

    const prestadorId = data.id as string
    const { error: pbErr } = await supabase
      .from('prestador_barrio')
      .insert({ prestador_id: prestadorId, barrio_id: barrioId, habilitado: false })
    if (pbErr) {
      setGuardando(false)
      setError(pbErr.message)
      return
    }
    await supabase.from('verificacion').insert([
      { prestador_id: prestadorId, barrio_id: barrioId, tipo: 'antecedentes_penales', estado: 'pendiente' },
      { prestador_id: prestadorId, barrio_id: barrioId, tipo: 'seguro_art', estado: 'pendiente' },
      { prestador_id: prestadorId, barrio_id: barrioId, tipo: 'identidad', estado: 'pendiente' },
    ])

    setGuardando(false)
    onCreado()
  }

  return (
    <Modal titulo="Agregar prestador" onClose={onClose}>
      <form onSubmit={guardar} className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={esEmpresa}
            onChange={(e) => setEsEmpresa(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Es una empresa
        </label>

        {esEmpresa ? (
          <Campo label="Razón social *">
            <input className={inputClass} value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} autoFocus />
          </Campo>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Nombre *">
              <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
            </Campo>
            <Campo label="Apellido">
              <input className={inputClass} value={apellido} onChange={(e) => setApellido(e.target.value)} />
            </Campo>
          </div>
        )}

        <Campo label="Celular *">
          <input className={inputClass} value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="+54 9 11 ..." />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Servicio principal">
            <select className={inputClass} value={servicioPrincipal} onChange={(e) => setServicioPrincipal(e.target.value)}>
              {SERVICIOS.map((s) => (
                <option key={s} value={s}>
                  {servicioLabel(s)}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Condición fiscal">
            <select className={inputClass} value={condicion} onChange={(e) => setCondicion(e.target.value)}>
              <option value="">Sin especificar</option>
              {CONDICIONES.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c.replace('_', ' ')}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-gg-green px-4 py-2 text-sm font-medium text-white hover:bg-gg-dark disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : 'Guardar prestador'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
