import { useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { Modal, Campo, inputClass } from './ui'

export function AltaBarrioModal({
  administracionId,
  onClose,
  onCreado,
}: {
  administracionId: string | null
  onClose: () => void
  onCreado: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [localidad, setLocalidad] = useState('')
  const [partido, setPartido] = useState('')
  const [zona, setZona] = useState('GBA Norte')
  const [cantidadLotes, setCantidadLotes] = useState('')
  const [sistemaAcceso, setSistemaAcceso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setGuardando(true)
    setError(null)
    const { error } = await supabase.from('barrio').insert({
      nombre: nombre.trim(),
      localidad: localidad.trim() || null,
      partido: partido.trim() || null,
      zona: zona.trim() || null,
      cantidad_lotes: cantidadLotes ? Number(cantidadLotes) : null,
      sistema_acceso: sistemaAcceso.trim() || null,
      administracion_id: administracionId,
    })
    setGuardando(false)
    if (error) {
      setError(error.message)
      return
    }
    onCreado()
  }

  return (
    <Modal titulo="Agregar barrio" onClose={onClose}>
      <form onSubmit={guardar} className="space-y-3">
        <Campo label="Nombre *">
          <input
            className={inputClass}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Ayres de Pilar"
            autoFocus
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Localidad">
            <input className={inputClass} value={localidad} onChange={(e) => setLocalidad(e.target.value)} />
          </Campo>
          <Campo label="Partido">
            <input className={inputClass} value={partido} onChange={(e) => setPartido(e.target.value)} />
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Zona">
            <input className={inputClass} value={zona} onChange={(e) => setZona(e.target.value)} />
          </Campo>
          <Campo label="Cantidad de lotes">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={cantidadLotes}
              onChange={(e) => setCantidadLotes(e.target.value)}
            />
          </Campo>
        </div>
        <Campo label="Sistema de acceso">
          <input
            className={inputClass}
            value={sistemaAcceso}
            onChange={(e) => setSistemaAcceso(e.target.value)}
            placeholder="Ej: Lectora de DNI en garita"
          />
        </Campo>

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
            {guardando ? 'Guardando…' : 'Guardar barrio'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
