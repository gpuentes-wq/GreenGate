import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { EmptyState } from './ui'
import { cuandoLabel, esHoy, hoyISO, sumarDiasISO } from './labels'

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
  // PostgREST embebe el pedido por la FK solicitud.pedido_id. Es null en las
  // solicitudes viejas, anteriores a que existiera la tabla pedido.
  pedido: { es_urgencia: boolean } | null
}

// Sin tipos generados, el cliente de Supabase no sabe que solicitud → pedido es
// muchos-a-uno y tipa el embebido como array. En runtime llega un objeto, pero
// se contemplan las dos formas para no depender de ese detalle.
type SolicitudRow = Omit<Solicitud, 'pedido'> & {
  pedido: { es_urgencia: boolean } | { es_urgencia: boolean }[] | null
}

function normalizar(fila: SolicitudRow): Solicitud {
  const { pedido, ...resto } = fila
  return { ...resto, pedido: Array.isArray(pedido) ? pedido[0] ?? null : pedido }
}

type Respuesta = {
  estado: string
  disponible_desde?: string | null
  detalle?: string | null
  monto_presupuestado?: number | null
}

// La forma de la insignia dice tanto como el color:
//   ámbar pleno → necesita que hagas algo (sin responder)
//   claro con borde → novedad: pasó algo sin que estuvieras mirando
//   gris        → lo decidiste vos, no hay nada nuevo
//
// 'rechazada' es la única gris: es el estado que eligió el propio jardinero.
// Que lo elijan, que elijan a otro o que den de baja el pedido son las tres
// cosas que le pasan de afuera, y las tres liberan la fecha que había reservado.
//
// 'pendiente' va en ámbar pleno sobre blanco y es lo más fuerte de la pantalla:
// es la única que pide una acción, y con tres estados en la familia del ámbar
// necesita separarse de ellos por intensidad, no solo por tono.
const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-500 text-white',
  aceptada: 'bg-gg-light text-gg-dark',
  elegida: 'border border-green-300 bg-green-50 text-green-800',
  no_seleccionada: 'border border-amber-300 bg-amber-50 text-amber-800',
  rechazada: 'bg-gray-100 text-gray-500',
  cancelada: 'border border-amber-300 bg-amber-50 text-amber-800',
}

// El estado se guarda como enum ('no_seleccionada'), que no se puede mostrar
// tal cual en pantalla.
const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Sin responder',
  aceptada: 'Respondida',
  elegida: 'Te eligieron',
  no_seleccionada: 'Eligieron a otro',
  rechazada: 'No la tomaste',
  cancelada: 'Dado de baja',
}

// Estados en los que el jardinero ya contestó y se comprometió con una fecha.
// En todos ellos tiene que poder ver qué dijo: cuando lo eligen, cuando eligen a
// otro o cuando dan de baja el pedido, el formulario ya no está y sin esto la
// fecha que reservó desaparece de la pantalla.
//
// 'rechazada' queda afuera a propósito: ahí no comprometió nada.
const RESPONDIDAS = ['aceptada', 'elegida', 'no_seleccionada', 'cancelada']

// El jardinero responde si PUEDE IR, no con un precio cerrado: no vio el jardín
// todavía. El estimado es opcional y viaja marcado como a confirmar.
//
// El formulario vive por fila y con su propio estado: si estuviera en el
// componente padre, escribir en una solicitud pisaría lo tipeado en las demás.
function Responder({
  solicitudId,
  urgente,
  onResponder,
}: {
  solicitudId: string
  urgente: boolean
  onResponder: (id: string, respuesta: Respuesta) => void
}) {
  // Arranca en mañana, que es la respuesta más probable, y evita un toque. Si el
  // pedido es urgente arranca hoy: el vecino necesita a alguien ya, y dejarlo en
  // mañana haría que el default trabaje en contra. Borrando la fecha queda
  // "a coordinar".
  const [desde, setDesde] = useState<string>(() => (urgente ? hoyISO() : sumarDiasISO(1)))
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

      {/* Un urgente contestado para otro día sigue sirviendo: si nadie puede ir
          hoy, el vecino prefiere saber quién puede mañana antes que recibir tres
          rechazos. Se avisa para que el jardinero conteste tranquilo, sabiendo
          que del otro lado se ve la fecha real. */}
      {urgente && !esHoy(desde) && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          El vecino lo marcó urgente. Si hoy no podés, contestale igual — va a ver que sos para{' '}
          <strong>{cuandoLabel(desde || null).toLowerCase()}</strong> y decide él.
        </p>
      )}

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
        .select('id,contacto_nombre,barrio_id,mensaje,estado,monto_presupuestado,disponible_desde,detalle,created_at,pedido(es_urgencia)')
        .eq('prestador_id', prestadorId)
        .order('created_at', { ascending: false })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      const filas = ((data as unknown as SolicitudRow[]) ?? []).map(normalizar)
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

  // Lo que hay que contestar va arriba. Ordenado por fecha a secas, una
  // solicitud sin responder de hace tres días quedaba debajo de dos ya cerradas.
  //
  // Dentro de las pendientes: primero las urgentes, y después las más viejas —
  // es al revés que en el resto de la lista, y a propósito: la que más esperó es
  // la que peor queda sin respuesta. En las ya cerradas manda lo más reciente,
  // que es donde están las novedades.
  const ordenadas = useMemo(() => {
    const esPendiente = (s: Solicitud) => (s.estado === 'pendiente' ? 0 : 1)
    return solicitudes.slice().sort((a, b) => {
      if (esPendiente(a) !== esPendiente(b)) return esPendiente(a) - esPendiente(b)

      if (a.estado === 'pendiente') {
        const urg = (s: Solicitud) => (s.pedido?.es_urgencia ? 0 : 1)
        if (urg(a) !== urg(b)) return urg(a) - urg(b)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [solicitudes])

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
          {ordenadas.map((s) => (
            <div
              key={s.id}
              className={
                'rounded-xl border bg-white p-4 ' +
                // Sin responder es lo único accionable: se marca la tarjeta entera
                // para que se distinga al bajar por la lista, sin leer la insignia.
                (s.estado === 'pendiente' ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200')
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-gray-900">
                  {s.contacto_nombre ?? 'Vecino'}
                  {s.pedido?.es_urgencia && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-red-700">
                      ⚡ Urgente
                    </span>
                  )}
                </div>
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

              {s.estado === 'pendiente' && (
                <Responder solicitudId={s.id} urgente={!!s.pedido?.es_urgencia} onResponder={responder} />
              )}

              {RESPONDIDAS.includes(s.estado) && (
                <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <p className="text-gray-700">
                    Le dijiste que podías ir <strong>{cuandoLabel(s.disponible_desde)}</strong>
                    {s.monto_presupuestado != null && (
                      <> · estimado ARS {s.monto_presupuestado.toLocaleString('es-AR')}</>
                    )}
                  </p>
                  {s.detalle && <p className="mt-1 text-xs text-gray-500">“{s.detalle}”</p>}
                </div>
              )}

              {s.estado === 'aceptada' && (
                <p className="mt-2 text-sm text-gray-500">
                  El vecino está comparando. Si te elige, te va a escribir por WhatsApp.
                </p>
              )}

              {s.estado === 'elegida' && (
                <p className="mt-2 rounded-lg border border-green-200 bg-green-100 px-3 py-2 text-sm font-medium text-green-900">
                  🎉 Te eligieron para este trabajo. {s.contacto_nombre ?? 'El vecino'} te va a escribir por WhatsApp
                  para coordinar la visita.
                </p>
              )}

              {/* Mismo tratamiento que la baja: el resultado práctico es idéntico
                  —la fecha que había reservado queda libre— y hasta ahora eso
                  no se le decía. */}
              {s.estado === 'no_seleccionada' && (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900">
                  🗓️ El vecino eligió a otro jardinero para este pedido. Si te habías reservado la fecha, ya podés
                  liberarla.
                </p>
              )}

              {/* Mismo tratamiento que en el panel: ámbar enmarcado y calendario,
                  para que la baja se lea igual en las dos pantallas. */}
              {s.estado === 'cancelada' && (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900">
                  🗓️ El vecino dio de baja el pedido. Si te habías reservado la fecha, ya podés liberarla.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
