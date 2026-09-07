import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { EmptyState } from './ui'
import { misPedidos } from './misPedidos'
import { disponibilidadLabel } from './labels'

type Pedido = { id: string; barrio_id: string | null; descripcion: string | null; created_at: string }
type Cotizacion = {
  id: string
  pedido_id: string
  prestador_id: string
  estado: string
  monto_presupuestado: number | null
  disponibilidad: string | null
  detalle: string | null
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
  rechazada: 'No puede tomarlo',
  no_seleccionada: 'No lo elegiste',
}

// Estados en los que el prestador quedó dentro del pedido y su teléfono tiene
// sentido: respondió que puede ir, o ya fue elegido.
const EN_JUEGO = ['aceptada', 'elegida']

function nombreDe(p: PrestadorLite): string {
  if (p.es_empresa && p.razon_social) return p.razon_social
  return p.apellido ? `${p.nombre} ${p.apellido}` : p.nombre
}

// wa.me espera solo dígitos con código de país: nada de "+", espacios ni guiones.
// Los celulares se cargan a mano y vienen con formatos variados ("+54 9 11
// 6666-3001", "11 6666 3001"), así que se limpia y, si falta el código de país,
// se asume Argentina — el producto opera solo en el GBA.
function paraWhatsApp(celular: string): string {
  const digitos = celular.replace(/\D/g, '')
  return digitos.startsWith('54') ? digitos : `54${digitos}`
}

// El jardinero recibe un mensaje de un número que no conoce, y puede estar en
// varios pedidos a la vez: el texto le recuerda de cuál se trata. Lo que se
// coordina es la visita, no el cierre — el precio se acuerda viendo el jardín.
function mensajeWhatsApp(barrio: string | null, descripcion: string | null, cuando: string | null): string {
  const partes = [`Hola! Te escribo por GreenGate, te elegí para el jardín de mi casa en ${barrio ?? 'mi barrio'}.`]
  if (descripcion) partes.push(`Mi pedido fue: "${descripcion}".`)
  const label = disponibilidadLabel(cuando)
  if (label) partes.push(`Me dijiste que podías ir ${label.toLowerCase()}. ¿Coordinamos?`)
  else partes.push('¿Cuándo te queda cómodo pasar a verlo?')
  return partes.join(' ')
}

// Los presupuestos que pidió este propietario. Sin login, los pedidos se
// identifican por los ids guardados en este navegador (ver misPedidos.ts).
export function MisPresupuestos({ barrioId, onVolver }: { barrioId: string; onVolver: () => void }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [prestadores, setPrestadores] = useState<Record<string, PrestadorLite>>({})
  const [barrios, setBarrios] = useState<Record<string, string>>({})
  // Celulares de los prestadores que siguen en juego, y solo de ellos. El
  // directorio público (prestador_directorio) no expone el teléfono a
  // propósito: se conoce recién cuando hay una respuesta de por medio.
  const [celulares, setCelulares] = useState<Record<string, string>>({})
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
        supabase
          .from('pedido')
          .select('id,barrio_id,descripcion,created_at')
          .in('id', ids)
          .order('created_at', { ascending: false }),
        supabase
          .from('solicitud')
          .select('id,pedido_id,prestador_id,estado,monto_presupuestado,disponibilidad,detalle')
          .in('pedido_id', ids),
      ])
      if (pRes.error || sRes.error) {
        setError((pRes.error || sRes.error)!.message)
        setLoading(false)
        return
      }
      const cots = (sRes.data as Cotizacion[]) ?? []
      // Solo los pedidos del barrio elegido: la pantalla vive dentro del
      // directorio de ese barrio. Cuando exista el login, el propietario va a
      // estar asociado a un barrio y este filtro se vuelve implícito.
      const peds = ((pRes.data as Pedido[]) ?? []).filter((p) => p.barrio_id === barrioId)
      setPedidos(peds)
      setCotizaciones(cots)

      // Nombre del barrio: va en el mensaje precargado de WhatsApp, para que el
      // jardinero entienda de qué se trata al recibir un número desconocido.
      const barrioIds = [...new Set(peds.map((p) => p.barrio_id).filter((x): x is string => !!x))]
      if (barrioIds.length > 0) {
        const { data } = await supabase.from('barrio').select('id,nombre').in('id', barrioIds)
        const mapa: Record<string, string> = {}
        for (const b of (data as Array<{ id: string; nombre: string }>) ?? []) mapa[b.id] = b.nombre
        setBarrios(mapa)
      }

      // Consulta acotada: solo los que respondieron que pueden ir, no todos los
      // del pedido.
      const enJuegoIds = [...new Set(cots.filter((c) => EN_JUEGO.includes(c.estado)).map((c) => c.prestador_id))]
      if (enJuegoIds.length > 0) {
        const { data } = await supabase.from('prestador').select('id,celular').in('id', enJuegoIds)
        const mapa: Record<string, string> = {}
        for (const p of (data as Array<{ id: string; celular: string | null }>) ?? []) {
          if (p.celular) mapa[p.id] = p.celular
        }
        setCelulares(mapa)
      }

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
    setLoading(true)
    cargar()
  }, [barrioId])

  // Elegir cierra el pedido para todos: el elegido pasa a 'elegida' y el resto
  // deja de esperar. Antes de esto el propietario se iba por WhatsApp y la app
  // nunca se enteraba, así que los demás quedaban colgados para siempre.
  async function elegir(pedidoId: string, solicitudId: string) {
    const hermanas = cotizaciones
      .filter((c) => c.pedido_id === pedidoId && c.id !== solicitudId && c.estado !== 'rechazada')
      .map((c) => c.id)

    setCotizaciones((cs) =>
      cs.map((c) => {
        if (c.id === solicitudId) return { ...c, estado: 'elegida' }
        if (hermanas.includes(c.id)) return { ...c, estado: 'no_seleccionada' }
        return c
      }),
    )

    const { error: e1 } = await supabase.from('solicitud').update({ estado: 'elegida' }).eq('id', solicitudId)
    if (e1) {
      setError(e1.message)
      return
    }
    if (hermanas.length > 0) {
      // Si esto falla, el elegido ya quedó bien: los otros siguen esperando,
      // que es el estado anterior. No se revierte la elección por eso.
      const { error: e2 } = await supabase
        .from('solicitud')
        .update({ estado: 'no_seleccionada' })
        .in('id', hermanas)
      if (e2) setError(e2.message)
    }
  }

  if (loading) return <p className="text-gray-500">Cargando…</p>

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <button type="button" onClick={onVolver} className="mb-4 text-sm font-medium text-gg-green hover:underline">
        ← Volver al directorio
      </button>

      <h1 className="text-xl font-semibold text-gg-dark">Mis presupuestos</h1>
      <p className="mb-6 text-sm text-gray-500">
        Los jardineros que pueden ir a ver tu jardín. El precio se acuerda en la visita.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">No se pudieron cargar: {error}</p>}

      {pedidos.length === 0 ? (
        <EmptyState>
          Todavía no pediste presupuestos en este barrio. Cuando pidas uno en el directorio, vas a poder comparar las
          respuestas acá.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {pedidos.map((pedido) => {
            const suyas = cotizaciones.filter((c) => c.pedido_id === pedido.id)
            const yaElegido = suyas.some((c) => c.estado === 'elegida')
            return (
              <section key={pedido.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="text-xs text-gray-400">
                  Pedido del {new Date(pedido.created_at).toLocaleDateString('es-AR')}
                </div>
                {pedido.descripcion && <p className="mt-1 text-sm text-gray-700">“{pedido.descripcion}”</p>}

                <div className="mt-4 space-y-2">
                  {suyas.map((c) => {
                    const p = prestadores[c.prestador_id]
                    const puedeIr = c.estado === 'aceptada' || c.estado === 'elegida'
                    return (
                      <div key={c.id} className="rounded-lg border border-gray-100 px-3 py-2 text-sm">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium text-gray-800">
                            {p ? nombreDe(p) : 'Prestador'}
                            {p?.puntaje_promedio != null && (
                              <span className="ml-2 text-xs font-normal text-gray-400">
                                ★ {p.puntaje_promedio} ({p.cantidad_valoraciones})
                              </span>
                            )}
                          </span>
                          <span className="text-gray-600">
                            {puedeIr ? (
                              <>
                                Puede ir <strong>{disponibilidadLabel(c.disponibilidad) ?? 'a coordinar'}</strong>
                              </>
                            ) : (
                              <span className="text-gray-400">{ESTADO_LABEL[c.estado] ?? c.estado}</span>
                            )}
                          </span>
                        </div>

                        {puedeIr && c.detalle && <p className="mt-1 text-xs text-gray-600">“{c.detalle}”</p>}

                        {/* El estimado se muestra siempre marcado como no cerrado:
                            el jardinero todavía no vio el jardín. */}
                        {puedeIr && c.monto_presupuestado != null && (
                          <p className="mt-1 text-xs text-gray-500">
                            Estimado ARS {c.monto_presupuestado.toLocaleString('es-AR')} por mes — a confirmar en la
                            visita
                          </p>
                        )}

                        {c.estado === 'aceptada' && !yaElegido && (
                          <button
                            type="button"
                            onClick={() => elegir(pedido.id, c.id)}
                            className="mt-2 w-full rounded-lg border border-gg-green px-3 py-1.5 text-sm font-medium text-gg-green transition hover:bg-gg-light sm:w-auto"
                          >
                            Elegir a este jardinero
                          </button>
                        )}

                        {/* El contacto se abre recién cuando lo elegiste: antes de
                            eso no hay a quién escribirle todavía. */}
                        {c.estado === 'elegida' && (
                          <div className="mt-2">
                            <p className="mb-2 text-xs font-medium text-green-700">
                              ✓ Lo elegiste. Le avisamos en su panel.
                            </p>
                            {celulares[c.prestador_id] ? (
                              <a
                                href={`https://wa.me/${paraWhatsApp(celulares[c.prestador_id])}?text=${encodeURIComponent(
                                  mensajeWhatsApp(
                                    (pedido.barrio_id && barrios[pedido.barrio_id]) || null,
                                    pedido.descripcion,
                                    c.disponibilidad,
                                  ),
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block w-full rounded-lg bg-gg-green px-3 py-1.5 text-center text-sm font-medium text-white transition hover:bg-gg-dark sm:w-auto"
                              >
                                Coordinar por WhatsApp
                              </a>
                            ) : (
                              <p className="text-xs text-gray-500">
                                No tiene celular cargado. Avisale a la administración de tu barrio.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {!yaElegido && suyas.filter((c) => c.estado === 'aceptada').length > 1 && (
                  <p className="mt-3 text-xs text-gray-500">
                    Compará quién puede ir antes y con qué puntaje. El precio de referencia de cada uno está en su
                    perfil; el precio final lo van a acordar cuando vea el jardín.
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
