import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { EmptyState } from './ui'

// Pantalla que abre el link que el jardinero le pasa al vecino
// (greengate.com.ar/?resena=<solicitud_id>) y también el bloque "¿Cómo te fue?"
// de Mis pedidos. Es la única puerta por donde entran reseñas reales.
//
// Sin login, el id de la solicitud es la credencial: quien lo tiene puede
// escribir la reseña de ESE trabajo, una sola vez (índice único en la base).
// Es un compromiso consciente para el piloto — está anotado en
// migracion-resena.sql.

type Datos = {
  prestadorNombre: string
  prestadorId: string
  descripcion: string | null
  yaTieneResena: boolean
}

const ESTRELLAS = [1, 2, 3, 4, 5]

export function DejarResena({ solicitudId, onListo }: { solicitudId: string; onListo?: () => void }) {
  const [datos, setDatos] = useState<Datos | null>(null)
  const [puntaje, setPuntaje] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviada, setEnviada] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      setError(null)

      const { data: sol, error: solErr } = await supabase
        .from('solicitud')
        .select('id,prestador_id,estado,pedido(descripcion)')
        .eq('id', solicitudId)
        .maybeSingle()

      if (solErr) {
        setError(solErr.message)
        setLoading(false)
        return
      }
      if (!sol) {
        setError('No encontramos ese trabajo. Revisá el link.')
        setLoading(false)
        return
      }

      const fila = sol as unknown as {
        prestador_id: string
        estado: string
        pedido: { descripcion: string | null } | { descripcion: string | null }[] | null
      }
      // Solo se reseña un trabajo que el vecino efectivamente eligió: es la
      // prueba de que hubo trato.
      if (fila.estado !== 'elegida') {
        setError('Ese pedido todavía no tiene un jardinero elegido, así que no hay nada que calificar.')
        setLoading(false)
        return
      }

      const pedido = Array.isArray(fila.pedido) ? fila.pedido[0] ?? null : fila.pedido

      const [prestRes, valRes] = await Promise.all([
        supabase
          .from('prestador_directorio')
          .select('nombre,apellido,razon_social,es_empresa')
          .eq('id', fila.prestador_id)
          .maybeSingle(),
        supabase.from('valoracion').select('id').eq('solicitud_id', solicitudId).maybeSingle(),
      ])

      const pr = prestRes.data as {
        nombre: string
        apellido: string | null
        razon_social: string | null
        es_empresa: boolean
      } | null

      setDatos({
        prestadorId: fila.prestador_id,
        prestadorNombre: pr
          ? pr.es_empresa && pr.razon_social
            ? pr.razon_social
            : `${pr.nombre}${pr.apellido ? ' ' + pr.apellido : ''}`
          : 'el jardinero',
        descripcion: pedido?.descripcion ?? null,
        yaTieneResena: !!valRes.data,
      })
      setLoading(false)
    }
    cargar()
  }, [solicitudId])

  async function enviar() {
    if (!datos || puntaje === 0) return
    setEnviando(true)
    setError(null)

    // Solo el puntaje general: las cuatro dimensiones de la tabla
    // (calidad, puntualidad, comunicación, precio) quedan nulas a propósito.
    // Cuatro sliders en el celular matan la tasa de respuesta, y sin reseñas
    // no hay producto. Se suman cuando haya volumen.
    const { error: insErr } = await supabase.from('valoracion').insert({
      solicitud_id: solicitudId,
      prestador_id: datos.prestadorId,
      puntaje,
      comentario: comentario.trim() || null,
      verificada: true,
    })
    setEnviando(false)

    if (insErr) {
      // El índice único devuelve 23505: no es un error del vecino, es que la
      // reseña ya estaba.
      setError(
        insErr.code === '23505'
          ? 'Ese trabajo ya tiene una reseña cargada.'
          : insErr.message,
      )
      return
    }
    setEnviada(true)
    onListo?.()
  }

  if (loading) return <p className="text-gray-500">Cargando…</p>

  if (error && !datos) {
    return <EmptyState>{error}</EmptyState>
  }

  if (enviada) {
    return (
      <div className="rounded-xl border border-green-300 bg-green-50 p-5 text-center">
        <p className="text-lg font-medium text-green-900">¡Gracias!</p>
        <p className="mt-1 text-sm text-green-800">
          Tu reseña ya aparece en el perfil de {datos?.prestadorNombre} y ayuda a tus vecinos a decidir.
        </p>
      </div>
    )
  }

  if (datos?.yaTieneResena) {
    return <EmptyState>Este trabajo ya tiene una reseña cargada. Gracias por dejarla.</EmptyState>
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-gg-dark">¿Cómo te fue con {datos?.prestadorNombre}?</h2>
      {datos?.descripcion && <p className="mt-1 text-sm text-gray-500">Tu pedido fue: “{datos.descripcion}”</p>}

      {/* Botones grandes y no un slider: se toca con el pulgar, en la calle. */}
      <div className="mt-4 flex gap-1">
        {ESTRELLAS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPuntaje(n)}
            aria-label={`${n} de 5`}
            className={
              'h-11 w-11 rounded-lg text-2xl transition ' +
              (n <= puntaje ? 'text-amber-500' : 'text-gray-300 hover:text-amber-300')
            }
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        rows={3}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Contales a tus vecinos cómo trabajó (opcional)"
        className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gg-green focus:outline-none"
      />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={enviar}
        disabled={puntaje === 0 || enviando}
        className="mt-3 w-full rounded-lg bg-gg-green px-4 py-2 text-sm font-medium text-white transition hover:bg-gg-dark disabled:opacity-50 sm:w-auto"
      >
        {enviando ? 'Enviando…' : 'Publicar reseña'}
      </button>
      {puntaje === 0 && <p className="mt-2 text-xs text-gray-400">Elegí cuántas estrellas para poder publicar.</p>}
    </div>
  )
}
