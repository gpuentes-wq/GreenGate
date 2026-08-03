import { useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { Modal, Campo, inputClass } from './ui'

export function PedirPresupuestoModal({
  prestadores,
  onClose,
  onEnviado,
}: {
  prestadores: { id: string; nombre: string }[]
  onClose: () => void
  onEnviado: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [celular, setCelular] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !celular.trim()) {
      setError('Dejá tu nombre y un teléfono de contacto')
      return
    }
    setEnviando(true)
    setError(null)
    const { error } = await supabase.from('solicitud').insert(
      prestadores.map((p) => ({
        prestador_id: p.id,
        contacto_nombre: nombre.trim(),
        contacto_celular: celular.trim(),
        mensaje: mensaje.trim() || null,
      })),
    )
    setEnviando(false)
    if (error) {
      setError(error.message)
      return
    }
    onEnviado()
  }

  return (
    <Modal titulo={`Pedir presupuesto a ${prestadores.length} prestador${prestadores.length === 1 ? '' : 'es'}`} onClose={onClose}>
      <form onSubmit={enviar} className="space-y-3">
        <p className="text-sm text-gray-500">
          Le va a llegar el mismo mensaje a: <strong>{prestadores.map((p) => p.nombre).join(', ')}</strong>.
        </p>
        <Campo label="Tu nombre *">
          <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
        </Campo>
        <Campo label="Tu celular *">
          <input className={inputClass} value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="+54 9 11 ..." />
        </Campo>
        <Campo label="Mensaje (opcional)">
          <textarea
            className={inputClass}
            rows={2}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Ej: necesito mantenimiento semanal del jardín..."
          />
        </Campo>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-gg-green px-4 py-2 text-sm font-medium text-white hover:bg-gg-dark disabled:opacity-60"
          >
            {enviando ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
