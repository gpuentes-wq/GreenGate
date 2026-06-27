import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { EmptyState } from './ui'

type Solicitud = {
  id: string
  contacto_nombre: string | null
  contacto_celular: string | null
  mensaje: string | null
  estado: string
  created_at: string
}

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  aceptada: 'bg-gg-light text-gg-dark',
  rechazada: 'bg-gray-100 text-gray-500',
}

export function SolicitudesPanel({ prestadorId }: { prestadorId: string }) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      const { data, error } = await supabase
        .from('solicitud')
        .select('id,contacto_nombre,contacto_celular,mensaje,estado,created_at')
        .eq('prestador_id', prestadorId)
        .order('created_at', { ascending: false })
      if (error) setError(error.message)
      else setSolicitudes((data as Solicitud[]) ?? [])
      setLoading(false)
    }
    cargar()
  }, [prestadorId])

  async function responder(id: string, estado: string) {
    setSolicitudes((s) => s.map((x) => (x.id === id ? { ...x, estado } : x)))
    const { error } = await supabase.from('solicitud').update({ estado }).eq('id', id)
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
          Todavía no recibiste solicitudes. Cuando un propietario te contacte desde el directorio, vas a verlas acá.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {solicitudes.map((s) => (
            <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-gray-900">{s.contacto_nombre ?? 'Vecino'}</div>
                <span className={'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ' + (ESTADO_BADGE[s.estado] ?? '')}>
                  {s.estado}
                </span>
              </div>
              {s.contacto_celular && <div className="mt-1 text-sm text-gray-600">📞 {s.contacto_celular}</div>}
              {s.mensaje && <p className="mt-2 text-sm text-gray-600">“{s.mensaje}”</p>}
              <div className="mt-1 text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('es-AR')}</div>

              {s.estado === 'pendiente' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => responder(s.id, 'aceptada')}
                    className="rounded-lg bg-gg-green px-3 py-1 text-sm font-medium text-white hover:bg-gg-dark"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => responder(s.id, 'rechazada')}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Rechazar
                  </button>
                </div>
              )}
              {s.estado === 'aceptada' && (
                <p className="mt-2 text-sm font-medium text-gg-dark">
                  ✓ Aceptaste — contactá al vecino{s.contacto_celular ? ` al ${s.contacto_celular}` : ''}.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
