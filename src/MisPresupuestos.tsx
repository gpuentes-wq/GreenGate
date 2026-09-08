import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { EmptyState } from './ui'
import { misPedidos } from './misPedidos'
import { cuandoLabel, ordenDisponibilidad } from './labels'

type Pedido = {
  id: string
  barrio_id: string | null
  descripcion: string | null
  es_urgencia: boolean
  cancelado_en: string | null
  created_at: string
}
type Cotizacion = {
  id: string
  pedido_id: string
  prestador_id: string
  estado: string
  monto_presupuestado: number | null
  disponible_desde: string | null
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
  cancelada: 'Cancelaste el pedido',
}

// Solicitudes que siguen vivas: son las que hay que cerrar al cancelar. Las
// rechazadas y no seleccionadas ya terminaron y se dejan como están —
// pisarlas borraría lo que efectivamente pasó.
const VIVAS = ['pendiente', 'aceptada', 'elegida']

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
function mensajeWhatsApp(barrio: string | null, descripcion: string | null, desde: string | null): string {
  const partes = [`Hola! Te escribo por GreenGate, te elegí para el jardín de mi casa en ${barrio ?? 'mi barrio'}.`]
  if (descripcion) partes.push(`Mi pedido fue: "${descripcion}".`)
  if (desde) {
    // "Hoy" y "Mañana" ya son adverbios: anteponerles "a partir del" daría
    // "a partir del mañana". El resto sí lo necesita ("a partir del martes 16/09").
    const label = cuandoLabel(desde).toLowerCase()
    const cuando = label === 'hoy' || label === 'mañana' ? label : `a partir del ${label}`
    partes.push(`Me dijiste que podías ir ${cuando}. ¿Coordinamos?`)
  } else {
    partes.push('¿Cuándo te queda cómodo pasar a verlo?')
  }
  return partes.join(' ')
}

// Los pedidos de visita que hizo este propietario. Sin login, los pedidos se
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
  // Qué pedido está pidiendo confirmación de baja. Se confirma en la misma
  // pantalla y no con un confirm() del navegador, que en el celular aparece
  // como un cartel del sistema y se descarta sin leer.
  const [confirmando, setConfirmando] = useState<string | null>(null)

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
          .select('id,barrio_id,descripcion,es_urgencia,cancelado_en,created_at')
          .in('id', ids)
          .order('created_at', { ascending: false }),
        supabase
          .from('solicitud')
          .select('id,pedido_id,prestador_id,estado,monto_presupuestado,disponible_desde,detalle')
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

  // Dar de baja el pedido entero: es un solo acto para el propietario ("ya no
  // lo necesito") y las solicitudes son la consecuencia. Sin esto, el jardinero
  // que se tomó el trabajo de contestar queda esperando para siempre.
  async function cancelar(pedidoId: string) {
    const vivas = cotizaciones.filter((c) => c.pedido_id === pedidoId && VIVAS.includes(c.estado)).map((c) => c.id)
    const ahora = new Date().toISOString()

    setConfirmando(null)
    setPedidos((ps) => ps.map((p) => (p.id === pedidoId ? { ...p, cancelado_en: ahora } : p)))
    setCotizaciones((cs) => cs.map((c) => (vivas.includes(c.id) ? { ...c, estado: 'cancelada' } : c)))

    const { error: e1 } = await supabase.from('pedido').update({ cancelado_en: ahora }).eq('id', pedidoId)
    if (e1) {
      setError(e1.message)
      return
    }
    if (vivas.length > 0) {
      const { error: e2 } = await supabase.from('solicitud').update({ estado: 'cancelada' }).in('id', vivas)
      if (e2) setError(e2.message)
    }
  }

  if (loading) return <p className="text-gray-500">Cargando…</p>

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <button type="button" onClick={onVolver} className="mb-4 text-sm font-medium text-gg-green hover:underline">
        ← Volver al directorio
      </button>

      <h1 className="text-xl font-semibold text-gg-dark">Mis pedidos</h1>
      <p className="mb-6 text-sm text-gray-500">
        Los jardineros que pueden ir a ver tu jardín. El precio se acuerda en la visita.
      </p>

      {error && <p className="mb-4 text-sm text-red-600">No se pudieron cargar: {error}</p>}

      {pedidos.length === 0 ? (
        <EmptyState>
          Todavía no pediste ninguna visita en este barrio. Cuando pidas una en el directorio, vas a poder comparar
          las respuestas acá.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {pedidos.map((pedido) => {
            // El que puede ir antes va arriba: es el criterio de comparación que
            // reemplazó al precio, así que tiene que estar a la vista sin buscar.
            // Los que no pueden ir quedan al final, en el orden que vengan.
            const suyas = cotizaciones
              .filter((c) => c.pedido_id === pedido.id)
              .slice()
              .sort((a, b) => {
                const puede = (c: Cotizacion) => (c.estado === 'aceptada' || c.estado === 'elegida' ? 0 : 1)
                if (puede(a) !== puede(b)) return puede(a) - puede(b)
                return ordenDisponibilidad(a.disponible_desde) - ordenDisponibilidad(b.disponible_desde)
              })
            const yaElegido = suyas.some((c) => c.estado === 'elegida')
            const cancelado = !!pedido.cancelado_en
            const elegido = suyas.find((c) => c.estado === 'elegida')
            return (
              <section key={pedido.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>Pedido del {new Date(pedido.created_at).toLocaleDateString('es-AR')}</span>
                  {pedido.es_urgencia && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold uppercase tracking-wide text-red-700">
                      ⚡ Urgente
                    </span>
                  )}
                  {cancelado && (
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 font-semibold uppercase tracking-wide text-gray-600">
                      Cancelado
                    </span>
                  )}
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
                                Puede ir <strong>{cuandoLabel(c.disponible_desde)}</strong>
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

                        {c.estado === 'aceptada' && !yaElegido && !cancelado && (
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
                                    c.disponible_desde,
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

                {!cancelado && !yaElegido && suyas.filter((c) => c.estado === 'aceptada').length > 1 && (
                  <p className="mt-3 text-xs text-gray-500">
                    Compará quién puede ir antes y con qué puntaje. El precio de referencia de cada uno está en su
                    perfil; el precio final lo van a acordar cuando vea el jardín.
                  </p>
                )}

                {cancelado && (
                  <p className="mt-3 text-xs text-gray-500">
                    Diste de baja este pedido. Los jardineros lo ven en su panel y ya no te están esperando.
                  </p>
                )}

                {/* Dar de baja es lo que le falta al circuito cuando el vecino no
                    avanza: sin esto, el que contestó espera indefinidamente. */}
                {!cancelado && confirmando !== pedido.id && (
                  <button
                    type="button"
                    onClick={() => setConfirmando(pedido.id)}
                    className="mt-3 text-xs text-gray-400 underline hover:text-gray-600"
                  >
                    Ya no lo necesito
                  </button>
                )}

                {!cancelado && confirmando === pedido.id && (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-700">
                      {elegido ? (
                        <>
                          Ya elegiste a <strong>{prestadores[elegido.prestador_id] ? nombreDe(prestadores[elegido.prestador_id]) : 'un jardinero'}</strong>. Le avisamos en su panel, pero si ya
                          habían coordinado, escribile también por WhatsApp.
                        </>
                      ) : (
                        <>Les avisamos a los jardineros que ya no lo necesitás, así dejan de esperarte.</>
                      )}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => cancelar(pedido.id)}
                        className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
                      >
                        Sí, dar de baja
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmando(null)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-white"
                      >
                        Volver
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </main>
  )
}
