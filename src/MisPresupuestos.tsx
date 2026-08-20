import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { EmptyState } from './ui'
import { misPedidos } from './misPedidos'

type Pedido = { id: string; descripcion: string | null; created_at: string }
type Cotizacion = {
  id: string
  pedido_id: string
  prestador_id: string
  estado: string
  monto_presupuestado: number | null
}
type PrestadorLite = {
  id: string
  nombre: string
  apellido: string | null
  razon_social: string | null
  es_empresa: boolean
  puntaje_promedio: number | null
  cantidad_valoraciones: number
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Esperando respuesta',
  aceptada: 'Presupuestó',
  rechazada: 'No puede tomarlo',
}

function nombreDe(p: PrestadorLite): string {
  if (p.es_empresa && p.razon_social) return p.razon_social
  return p.apellido ? `${p.nombre} ${p.apellido}` : p.nombre
}

// Los presupuestos que pidió este propietario. Sin login, los pedidos se
// identifican por los ids guardados en este navegador (ver misPedidos.ts).
export function MisPresupuestos({ onVolver }: { onVolver: () => void }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [prestadores, setPrestadores] = useState<Record<string, PrestadorLite>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      const ids = misPedidos()
      if (ids.length === 0) {
        setLoading(false)
        return
      }
      const [pRes, sRes] = await Promise.all([
        supabase.from('pedido').select('id,descripcion,created_at').in('id', ids).order('created_at', { ascending: false }),
        supabase.from('solicitud').select('id,pedido_id,prestador_id,estado,monto_presupuestado').in('pedido_id', ids),
      ])
      if (pRes.error || sRes.error) {
        setError((pRes.error || sRes.error)!.message)
        setLoading(false)
        return
      }
      const cots = (sRes.data as Cotizacion[]) ?? []
      setPedidos((pRes.data as Pedido[]) ?? [])
      setCotizaciones(cots)

      const prestadorIds = [...new Set(cots.map((c) => c.prestador_id))]
      if (prestadorIds.length > 0) {
        const { data } = await supabase
          .from('prestador_directorio')
          .select('id,nombre,apellido,razon_social,es_empresa,puntaje_promedio,cantidad_valoraciones')
          .in('id', prestadorIds)
        const mapa: Record<string, PrestadorLite> = {}
        for (const p of (data as PrestadorLite[]) ?? []) mapa[p.id] = p
        setPrestadores(mapa)
      }
      setLoading(false)
    }
    cargar()
  }, [])

  if (loading) return <p className="text-gray-500">Cargando…</p>

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <button type="button" onClick={onVolver} className="mb-4 text-sm font-medium text-gg-green hover:underline">
        ← Volver al directorio
      </button>

      <h1 className="text-xl font-semibold text-gg-dark">Mis presupuestos</h1>
      <p className="mb-6 text-sm text-gray-500">
        Las respuestas de los jardineros a los que les pediste presupuesto.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">No se pudieron cargar: {error}</p>}

      {pedidos.length === 0 ? (
        <EmptyState>
          Todavía no pediste ningún presupuesto desde este dispositivo. Cuando pidas uno en el directorio, vas a
          poder comparar las respuestas acá.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {pedidos.map((pedido) => {
            const suyas = cotizaciones.filter((c) => c.pedido_id === pedido.id)
            const conMonto = suyas.filter((c) => c.monto_presupuestado != null)
            const masBarato = conMonto.length > 1
              ? conMonto.reduce((a, b) => (a.monto_presupuestado! <= b.monto_presupuestado! ? a : b)).id
              : null
            return (
              <section key={pedido.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="text-xs text-gray-400">
                  Pedido del {new Date(pedido.created_at).toLocaleDateString('es-AR')}
                </div>
                {pedido.descripcion && <p className="mt-1 text-sm text-gray-700">“{pedido.descripcion}”</p>}

                <div className="mt-4 space-y-2">
                  {suyas.map((c) => {
                    const p = prestadores[c.prestador_id]
                    return (
                      <div
                        key={c.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-gray-800">
                          {p ? nombreDe(p) : 'Prestador'}
                          {p?.puntaje_promedio != null && (
                            <span className="ml-2 text-xs font-normal text-gray-400">
                              ★ {p.puntaje_promedio} ({p.cantidad_valoraciones})
                            </span>
                          )}
                        </span>
                        <span className="text-gray-600">
                          {c.monto_presupuestado != null ? (
                            <>
                              <strong>ARS {c.monto_presupuestado.toLocaleString('es-AR')}</strong>
                              {c.id === masBarato && (
                                <span className="ml-2 rounded-full bg-gg-light px-2 py-0.5 text-xs font-medium text-gg-dark">
                                  el más económico
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">{ESTADO_LABEL[c.estado] ?? c.estado}</span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {conMonto.length > 1 && (
                  <p className="mt-3 text-xs text-gray-500">
                    Compará precio y puntaje: el más barato no siempre es el mejor. Contactá al que elijas por su
                    teléfono, desde su perfil en el directorio.
                  </p>
                )}
              </section>
            )
          })}
        </div>
      )}
    </main>
  )
}
