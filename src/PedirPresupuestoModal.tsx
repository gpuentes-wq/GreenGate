import { useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { Modal, Campo, inputClass } from './ui'
import { recordarPedido } from './misPedidos'

export function PedirPresupuestoModal({
  prestadores,
  barrioId,
  onClose,
  onEnviado,
}: {
  prestadores: { id: string; nombre: string }[]
  barrioId: string
  onClose: () => void
  onEnviado: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // No se pide el celular: el jardinero nunca lo recibe y el contacto va en
  // sentido inverso — el propietario compara los presupuestos y escribe por
  // WhatsApp al que elige, desde "Mis presupuestos".
  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('Dejá tu nombre para que el jardinero sepa quién pide')
      return
    }
    setEnviando(true)
    setError(null)

    // Un pedido agrupa las N cotizaciones: es lo que después permite
    // compararlas entre sí en "Mis presupuestos".
    const { data: ped, error: pedErr } = await supabase
      .from('pedido')
      .insert({
        barrio_id: barrioId,
        descripcion: mensaje.trim() || null,
        contacto_nombre: nombre.trim(),
      })
      .select('id')
      .single()
    if (pedErr || !ped) {
      setEnviando(false)
      setError(pedErr?.message ?? 'No se pudo crear el pedido')
      return
    }
    const pedidoId = (ped as { id: string }).id

    const { error } = await supabase.from('solicitud').insert(
      prestadores.map((p) => ({
        pedido_id: pedidoId,
        prestador_id: p.id,
        barrio_id: barrioId,
        contacto_nombre: nombre.trim(),
        mensaje: mensaje.trim() || null,
      })),
    )
    setEnviando(false)
    if (error) {
      setError(error.message)
      return
    }
    recordarPedido(pedidoId)
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
