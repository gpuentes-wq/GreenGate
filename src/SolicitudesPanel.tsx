import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { EmptyState } from './ui'

// El celular del propietario no viaja hasta acá: para cotizar no hace falta, y
// el contacto va en la otra dirección — el propietario compara los presupuestos
// que recibió y llama al que elige. Lo que sí necesita saber el jardinero es de
// qué barrio viene el pedido, porque condiciona la distancia y el ingreso.
type Solicitud = {
  id: string
  contacto_nombre: string | null
  barrio_id: string | null
  mensaje: string | null
  estado: string
  monto_presupuestado: number | null
  created_at: string
}

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  aceptada: 'bg-gg-light text-gg-dark',
  rechazada: 'bg-gray-100 text-gray-500',
}

// El monto vive en su propio estado por fila: si estuviera en el componente
// padre, escribir en una solicitud pisaría lo tipeado en las demás.
function Cotizar({
  solicitudId,
  onResponder,
}: {
  solicitudId: string
  onResponder: (id: string, estado: string, monto?: number | null) => void
}) {
  const [monto, setMonto] = useState('')
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <input
        type="number"
        min="0"
        value={monto}
        onChange={(e) => setMonto(e.target.value)}
        placeholder="Tu presupuesto (ARS)"
        className="w-44 rounded-lg border border-gray-300 px-3 py-1 text-sm focus:border-gg-green focus:outline-none"
      />
      <button
        onClick={() => onResponder(solicitudId, 'aceptada', monto ? Number(monto) : null)}
        className="rounded-lg bg-gg-green px-3 py-1 text-sm font-medium text-white hover:bg-gg-dark"
      >
        Presupuestar
      </button>
      <button
        onClick={() => onResponder(solicitudId, 'rechazada')}
        className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
      >
        Rechazar
      </button>
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
        .select('id,contacto_nombre,barrio_id,mensaje,estado,monto_presupuestado,created_at')
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

  // Aceptar y cotizar es un solo movimiento: sin monto, el propietario no
  // tiene nada que comparar entre los prestadores que eligió.
  async function responder(id: string, estado: string, monto?: number | null) {
    const cambios = estado === 'aceptada' ? { estado, monto_presupuestado: monto ?? null } : { estado }
    setSolicitudes((s) => s.map((x) => (x.id === id ? { ...x, ...cambios } : x)))
    const { error } = await supabase.from('solicitud').update(cambios).eq('id', id)
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
          Todavía no recibiste pedidos de presupuesto. Cuando un propietario te elija desde el directorio, vas a verlos acá.
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
              {s.barrio_id && barrios[s.barrio_id] && (
                <div className="mt-1 text-sm text-gray-600">🏘️ {barrios[s.barrio_id]}</div>
              )}
              {s.mensaje && <p className="mt-2 text-sm text-gray-600">“{s.mensaje}”</p>}
              <div className="mt-1 text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('es-AR')}</div>

              {s.estado === 'pendiente' && <Cotizar solicitudId={s.id} onResponder={responder} />}
              {s.estado === 'aceptada' && (
                <p className="mt-2 text-sm font-medium text-gg-dark">
                  ✓ Presupuestaste
                  {s.monto_presupuestado != null ? ` ARS ${s.monto_presupuestado.toLocaleString('es-AR')}` : ''} — si el
                  vecino te elige, se va a contactar con vos.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
