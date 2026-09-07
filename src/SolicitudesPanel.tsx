import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { EmptyState } from './ui'
import { cuandoLabel, hoyISO, sumarDiasISO } from './labels'

// El celular del propietario no viaja hasta acá: para responder no hace falta, y
// el contacto va en la otra dirección — el propietario compara lo que recibió y
// escribe al que elige. Lo que sí necesita saber el jardinero es de qué barrio
// viene el pedido, porque condiciona la distancia y el ingreso.
type Solicitud = {
  id: string
  contacto_nombre: string | null
  barrio_id: string | null
  mensaje: string | null
  estado: string
  monto_presupuestado: number | null
  disponible_desde: string | null
  detalle: string | null
  created_at: string
}

type Respuesta = {
  estado: string
  disponible_desde?: string | null
  detalle?: string | null
  monto_presupuestado?: number | null
}

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  aceptada: 'bg-gg-light text-gg-dark',
  elegida: 'bg-green-100 text-green-800',
  no_seleccionada: 'bg-gray-100 text-gray-500',
  rechazada: 'bg-gray-100 text-gray-500',
}

// El estado se guarda como enum ('no_seleccionada'), que no se puede mostrar
// tal cual en pantalla.
const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Sin responder',
  aceptada: 'Respondida',
  elegida: 'Te eligieron',
  no_seleccionada: 'Eligieron a otro',
  rechazada: 'No la tomaste',
}

// El jardinero responde si PUEDE IR, no con un precio cerrado: no vio el jardín
// todavía. El estimado es opcional y viaja marcado como a confirmar.
//
// El formulario vive por fila y con su propio estado: si estuviera en el
// componente padre, escribir en una solicitud pisaría lo tipeado en las demás.
function Responder({
  solicitudId,
  onResponder,
}: {
  solicitudId: string
  onResponder: (id: string, respuesta: Respuesta) => void
}) {
  // Arranca en mañana: es la respuesta más probable y evita un toque. Si el
  // jardinero prefiere arreglarlo hablando, borra la fecha y queda "a coordinar".
  const [desde, setDesde] = useState<string>(() => sumarDiasISO(1))
  const [detalle, setDetalle] = useState('')
  const [estimado, setEstimado] = useState('')

  return (
    <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3">
      <label className="block text-xs font-medium text-gray-600">
        ¿Desde cuándo podés ir a verlo?
        <input
          type="date"
          value={desde}
          min={hoyISO()}
          onChange={(e) => setDesde(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-gg-green focus:outline-none"
        />
        <span className="mt-1 block font-normal text-gray-500">
          No es un turno reservado: es lo antes que podrías pasar. Si preferís coordinarlo, borrá la fecha.
        </span>
      </label>

      <label className="block text-xs font-medium text-gray-600">
        Querés aclarar algo? (opcional)
        <textarea
          rows={2}
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          placeholder="Ej: llevo la máquina y me llevo los restos. ¿El fondo también entra?"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-gg-green focus:outline-none"
        />
      </label>

      <label className="block text-xs font-medium text-gray-600">
        Estimado por mes (opcional) — el precio final lo cerrás en la visita
        <input
          type="number"
          min="0"
          value={estimado}
          onChange={(e) => setEstimado(e.target.value)}
          placeholder="ARS"
          className="mt-1 block w-44 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-gg-green focus:outline-none"
        />
      </label>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={() =>
            onResponder(solicitudId, {
              estado: 'aceptada',
              disponible_desde: desde || null,
              detalle: detalle.trim() || null,
              monto_presupuestado: estimado ? Number(estimado) : null,
            })
          }
          className="rounded-lg bg-gg-green px-3 py-1.5 text-sm font-medium text-white hover:bg-gg-dark"
        >
          Puedo ir
        </button>
        <button
          onClick={() => onResponder(solicitudId, { estado: 'rechazada' })}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          No puedo tomarlo
        </button>
      </div>
    </div>
  )
}

export function SolicitudesPanel({ prestadorId }: { prestadorId: string }) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [barrios, setBarrios] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      const { data, error } = await supabase
        .from('solicitud')
        .select('id,contacto_nombre,barrio_id,mensaje,estado,monto_presupuestado,disponible_desde,detalle,created_at')
        .eq('prestador_id', prestadorId)
        .order('created_at', { ascending: false })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      const filas = (data as Solicitud[]) ?? []
      setSolicitudes(filas)

      const ids = [...new Set(filas.map((s) => s.barrio_id).filter((x): x is string => !!x))]
      if (ids.length > 0) {
        const { data: bData } = await supabase.from('barrio').select('id,nombre').in('id', ids)
        const mapa: Record<string, string> = {}
        for (const b of (bData as Array<{ id: string; nombre: string }>) ?? []) mapa[b.id] = b.nombre
        setBarrios(mapa)
      }
      setLoading(false)
    }
    cargar()
  }, [prestadorId])

  async function responder(id: string, respuesta: Respuesta) {
    setSolicitudes((s) => s.map((x) => (x.id === id ? { ...x, ...respuesta } : x)))
    const { error } = await supabase.from('solicitud').update(respuesta).eq('id', id)
    if (error) setError(error.message)
  }

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente').length

  if (loading) return <p className="text-gray-500">Cargando…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        {solicitudes.length} solicitudes · {pendientes} sin responder
      </p>
      {solicitudes.length === 0 ? (
        <EmptyState>
          Todavía no recibiste pedidos. Cuando un propietario te elija desde el directorio, vas a verlos acá.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {solicitudes.map((s) => (
            <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-gray-900">{s.contacto_nombre ?? 'Vecino'}</div>
                <span
                  className={'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ' + (ESTADO_BADGE[s.estado] ?? '')}
                >
                  {ESTADO_LABEL[s.estado] ?? s.estado}
                </span>
              </div>
              {s.barrio_id && barrios[s.barrio_id] && (
                <div className="mt-1 text-sm text-gray-600">🏘️ {barrios[s.barrio_id]}</div>
              )}
              {s.mensaje && <p className="mt-2 text-sm text-gray-600">“{s.mensaje}”</p>}
              <div className="mt-1 text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('es-AR')}</div>

              {s.estado === 'pendiente' && <Responder solicitudId={s.id} onResponder={responder} />}

              {s.estado === 'aceptada' && (
                <p className="mt-2 text-sm text-gg-dark">
                  ✓ Dijiste que podés ir · <strong>{cuandoLabel(s.disponible_desde)}</strong>
                  {s.monto_presupuestado != null && (
                    <> · estimado ARS {s.monto_presupuestado.toLocaleString('es-AR')}</>
                  )}
                  <span className="block text-gray-500">
                    El vecino está comparando. Si te elige, te va a escribir por WhatsApp.
                  </span>
                </p>
              )}

              {s.estado === 'elegida' && (
                <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
                  🎉 Te eligieron para este trabajo. {s.contacto_nombre ?? 'El vecino'} te va a escribir por WhatsApp
                  para coordinar la visita.
                </p>
              )}

              {s.estado === 'no_seleccionada' && (
                <p className="mt-2 text-sm text-gray-500">
                  El vecino eligió a otro jardinero para este pedido. No hace falta que esperes.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
