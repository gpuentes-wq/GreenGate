import { useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { Modal, Campo, inputClass } from './ui'

export function ProponerPrestadorModal({
  barrioId,
  onClose,
  onEnviado,
}: {
  barrioId: string | null
  onClose: () => void
  onEnviado: () => void
}) {
  const [tuNombre, setTuNombre] = useState('')
  const [tuCelular, setTuCelular] = useState('')
  const [nombreSugerido, setNombreSugerido] = useState('')
  const [contactoSugerido, setContactoSugerido] = useState('')
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nombreSugerido.trim()) {
      setError('Contanos el nombre del prestador que querés proponer')
      return
    }
    setEnviando(true)
    setError(null)
    const { error } = await supabase.from('prestador_sugerido').insert({
      barrio_id: barrioId,
      propietario_contacto_nombre: tuNombre.trim() || null,
      propietario_contacto_celular: tuCelular.trim() || null,
      nombre_sugerido: nombreSugerido.trim(),
      contacto_sugerido: contactoSugerido.trim() || null,
      notas: notas.trim() || null,
    })
    setEnviando(false)
    if (error) {
      setError(error.message)
      return
    }
    onEnviado()
  }

  return (
    <Modal titulo="Proponer un prestador" onClose={onClose}>
      <form onSubmit={enviar} className="space-y-3">
        <p className="text-sm text-gray-500">
          ¿Conocés a alguien de confianza que todavía no está en la plataforma? Contanos y lo contactamos para que se sume.
        </p>
        <Campo label="Nombre del prestador *">
          <input className={inputClass} value={nombreSugerido} onChange={(e) => setNombreSugerido(e.target.value)} autoFocus />
        </Campo>
        <Campo label="Contacto del prestador (opcional)">
          <input
            className={inputClass}
            value={contactoSugerido}
            onChange={(e) => setContactoSugerido(e.target.value)}
            placeholder="Teléfono o alguna forma de ubicarlo"
          />
        </Campo>
        <Campo label="Notas (opcional)">
          <textarea
            className={inputClass}
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej: hace jardinería en el barrio hace años, muy recomendado..."
          />
        </Campo>
        <Campo label="Tu nombre (opcional)">
          <input className={inputClass} value={tuNombre} onChange={(e) => setTuNombre(e.target.value)} />
        </Campo>
        <Campo label="Tu celular (opcional)">
          <input className={inputClass} value={tuCelular} onChange={(e) => setTuCelular(e.target.value)} placeholder="+54 9 11 ..." />
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
            {enviando ? 'Enviando…' : 'Proponer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
