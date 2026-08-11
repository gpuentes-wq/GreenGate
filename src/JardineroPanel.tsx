import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { servicioLabel } from './labels'
import { Tarjeta, EmptyState, Switch } from './ui'
import { VerificacionesResumen } from './VerificacionesResumen'
import { alertaVencimiento } from './verificacion'

type BarrioOperativo = { nombre: string; habilitado: boolean }
// La tarifa vive solo en el servicio principal, y es mensual. Las especialidades
// adicionales se publican sin precio: se cotizan en cada pedido.
type ServicioPrincipal = { tipo: string; tarifa: number | null }
type Alerta = { texto: string; vencido: boolean }
type IntegranteNombre = { id: string; nombre: string; apellido: string | null }

const TIPO_LABEL_PROPIO: Record<string, string> = {
  antecedentes_penales: 'Tus antecedentes',
  seguro_art: 'Tu seguro/ART',
  identidad: 'Tu identidad',
}
const TIPO_LABEL_PERSONA: Record<string, string> = {
  antecedentes_penales: 'Antecedentes de',
  seguro_art: 'Seguro/ART de',
  identidad: 'Identidad de',
}

// Panel/dashboard del jardinero: lo primero que ve al elegir su perfil.
// Ordenado por urgencia, no como una lista plana de tarjetas iguales:
// 1) Necesita tu atención (solicitudes + vencimientos) — lo único que
//    cambia sesión a sesión y exige una acción.
// 2) Tu negocio (puntaje, clientes activos, presupuestos, servicios) — salud general.
// 3) Tu perfil público (equipo, barrios, servicios y precios) — cambia
//    poco, es más referencia que algo para chequear cada vez.
export function JardineroPanel({
  prestadorId,
  onVerSolicitudes,
  onEditarPerfil,
  onVerEquipo,
}: {
  prestadorId: string
  onVerSolicitudes: () => void
  onEditarPerfil: () => void
  onVerEquipo: () => void
}) {
  const [barrios, setBarrios] = useState<BarrioOperativo[]>([])
  const [servicioPrincipal, setServicioPrincipal] = useState<ServicioPrincipal | null>(null)
  const [especialidades, setEspecialidades] = useState<string[]>([])
  const [pendientes, setPendientes] = useState(0)
  const [clientesActivos, setClientesActivos] = useState(0)
  const [presupuestosRealizados, setPresupuestosRealizados] = useState(0)
  const [puntajePromedio, setPuntajePromedio] = useState<number | null>(null)
  const [cantidadValoraciones, setCantidadValoraciones] = useState(0)
  const [integrantesActivos, setIntegrantesActivos] = useState(0)
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [disponibleUrgencia, setDisponibleUrgencia] = useState(false)
  const [ofreceJardineriaGeneral, setOfreceJardineriaGeneral] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      setError(null)

      const [pbRes, psRes, prRes, dirRes, solRes, trabRes, integRes, verifRes] = await Promise.all([
        supabase.from('prestador_barrio').select('barrio_id,habilitado').eq('prestador_id', prestadorId),
        supabase.from('prestador_servicio').select('tipo').eq('prestador_id', prestadorId),
        supabase.from('prestador').select('tipo_servicio_principal,tarifa_referencia,disponible_urgencia').eq('id', prestadorId).single(),
        supabase.from('prestador_directorio').select('puntaje_promedio,cantidad_valoraciones').eq('id', prestadorId).single(),
        supabase.from('solicitud').select('estado').eq('prestador_id', prestadorId),
        supabase.from('trabajo').select('fecha,propietario_id').eq('prestador_id', prestadorId),
        supabase.from('integrante').select('id,nombre,apellido').eq('prestador_id', prestadorId).eq('activo', true),
        supabase.from('verificacion').select('tipo,estado,fecha_vencimiento,integrante_id').eq('prestador_id', prestadorId),
      ])
      const err = pbRes.error || psRes.error || prRes.error || solRes.error || trabRes.error || integRes.error || verifRes.error
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      // Barrios: primero traigo los ids habilitados/pendientes, después sus nombres.
      const pbRows = (pbRes.data as Array<{ barrio_id: string; habilitado: boolean }>) ?? []
      const barrioIds = pbRows.map((r) => r.barrio_id)
      const nombrePorBarrio = new Map<string, string>()
      if (barrioIds.length > 0) {
        const { data: bData } = await supabase.from('barrio').select('id,nombre').in('id', barrioIds)
        for (const b of (bData as Array<{ id: string; nombre: string }>) ?? []) nombrePorBarrio.set(b.id, b.nombre)
      }
      setBarrios(pbRows.map((r) => ({ nombre: nombrePorBarrio.get(r.barrio_id) ?? 'Barrio', habilitado: r.habilitado })))

      const integrantes = (integRes.data as IntegranteNombre[]) ?? []
      setIntegrantesActivos(integrantes.length)

      // Puntaje: viene calculado de la vista, a partir de las reseñas reales.
      const dir = dirRes.data as { puntaje_promedio: number | null; cantidad_valoraciones: number } | null
      setPuntajePromedio(dir?.puntaje_promedio ?? null)
      setCantidadValoraciones(dir?.cantidad_valoraciones ?? 0)

      // El principal lleva la tarifa mensual; las especialidades, solo el nombre.
      const principal = prRes.data as { tipo_servicio_principal: string; tarifa_referencia: number | null; disponible_urgencia: boolean } | null
      const adicionales = ((psRes.data as Array<{ tipo: string }>) ?? [])
        .map((e) => e.tipo)
        .filter((t) => t !== principal?.tipo_servicio_principal)
      setServicioPrincipal(principal ? { tipo: principal.tipo_servicio_principal, tarifa: principal.tarifa_referencia } : null)
      setEspecialidades(adicionales)
      setDisponibleUrgencia(principal?.disponible_urgencia ?? false)
      setOfreceJardineriaGeneral(principal?.tipo_servicio_principal === 'jardineria' || adicionales.includes('jardineria'))

      // Solicitudes pendientes (necesitan respuesta).
      const solicitudes = (solRes.data as Array<{ estado: string }>) ?? []
      setPendientes(solicitudes.filter((s) => s.estado === 'pendiente').length)
      // Presupuestos realizados: solicitudes ya respondidas (no quedaron pendientes).
      // Proxy más cercano disponible hoy — no hay todavía monto de cotización.
      setPresupuestosRealizados(solicitudes.filter((s) => s.estado !== 'pendiente').length)

      // Clientes activos: propietarios distintos con un trabajo en los últimos 60 días.
      const trabajos = (trabRes.data as Array<{ fecha: string; propietario_id: string | null }>) ?? []
      const hoy = new Date()
      const haceSesentaDias = new Date(hoy.getTime() - 60 * 86_400_000)
      const clientes = new Set(
        trabajos.filter((t) => t.propietario_id && new Date(t.fecha + 'T00:00:00') >= haceSesentaDias).map((t) => t.propietario_id as string),
      )
      setClientesActivos(clientes.size)

      // Alertas de documentación (propias, y de cada integrante si es un equipo).
      const nombrePorIntegrante = new Map(integrantes.map((i) => [i.id, `${i.nombre}${i.apellido ? ' ' + i.apellido : ''}`]))
      const verifRows = (verifRes.data as Array<{ tipo: string; estado: string; fecha_vencimiento: string | null; integrante_id: string | null }>) ?? []
      const listaAlertas: Alerta[] = []
      for (const v of verifRows) {
        const persona = v.integrante_id ? nombrePorIntegrante.get(v.integrante_id) : null
        const etiqueta = persona ? `${TIPO_LABEL_PERSONA[v.tipo] ?? v.tipo} ${persona}` : TIPO_LABEL_PROPIO[v.tipo] ?? v.tipo

        // alertaVencimiento() solo cubre vencido / por vencer — está pensada para
        // documentación ya validada. Del lado del jardinero también importa lo que
        // todavía no se validó: sin esto el panel decía "Todo al día" con papeles
        // sin presentar.
        if (v.estado === 'pendiente') {
          listaAlertas.push({ texto: `${etiqueta}: pendiente de validación`, vencido: false })
          continue
        }
        if (v.estado === 'rechazado') {
          listaAlertas.push({ texto: `${etiqueta}: rechazada, volvé a presentarla`, vencido: true })
          continue
        }

        const al = alertaVencimiento(v.estado, v.fecha_vencimiento)
        if (!al) continue
        listaAlertas.push({ texto: `${etiqueta} ${al.texto}`, vencido: al.vencido })
      }
      listaAlertas.sort((a, b) => Number(b.vencido) - Number(a.vencido))
      setAlertas(listaAlertas)

      setLoading(false)
    }
    cargar()
  }, [prestadorId])

  async function toggleUrgencia() {
    const nuevoValor = !disponibleUrgencia
    setDisponibleUrgencia(nuevoValor)
    await supabase.from('prestador').update({ disponible_urgencia: nuevoValor }).eq('id', prestadorId)
  }

  if (loading) return <p className="text-gray-500">Cargando…</p>
  if (error) return <p className="text-sm text-red-600">No se pudo cargar tu panel: {error}</p>

  const todoAlDia = pendientes === 0 && alertas.length === 0

  return (
    <div className="space-y-6">
      <section className={'rounded-xl p-4 ' + (todoAlDia ? 'bg-gg-light/50' : 'bg-amber-50')}>
        <h3 className={'mb-2 text-xs font-semibold ' + (todoAlDia ? 'text-gg-dark' : 'text-amber-800')}>Necesita tu atención</h3>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-gray-800">
            {pendientes > 0
              ? `${pendientes} solicitud${pendientes === 1 ? '' : 'es'} esperando respuesta`
              : 'No tenés solicitudes pendientes'}
          </span>
          {pendientes > 0 && (
            <button
              onClick={onVerSolicitudes}
              className="shrink-0 rounded-lg border border-amber-400 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              Ver
            </button>
          )}
        </div>
        {alertas.length > 0 && (
          <ul className="mt-2 space-y-1">
            {alertas.map((a, i) => (
              <li key={i} className={'text-sm ' + (a.vencido ? 'text-red-700' : 'text-amber-800')}>
                ⚠ {a.texto}
              </li>
            ))}
          </ul>
        )}
        {todoAlDia && <p className="mt-1 text-sm text-gray-500">Todo al día.</p>}
      </section>

      {ofreceJardineriaGeneral && (
        <section className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
          <div>
            <div className="text-sm font-medium text-gray-800">Abierto a servicios de urgencia</div>
            <div className="text-xs text-gray-500">Solo para jardinería general. Podés prenderlo y apagarlo según tu disponibilidad del día.</div>
          </div>
          <Switch activo={disponibleUrgencia} onCambiar={toggleUrgencia} etiqueta="Abierto a servicios de urgencia" />
        </section>
      )}

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Tu negocio</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Tarjeta titulo="Tu puntaje" valor={puntajePromedio != null ? `★ ${puntajePromedio} (${cantidadValoraciones})` : 'Sin reseñas aún'} />
          <Tarjeta titulo="Clientes activos" valor={clientesActivos} />
          <Tarjeta titulo="Presupuestos realizados" valor={presupuestosRealizados} />
          <Tarjeta titulo="Servicios activos" valor={(servicioPrincipal ? 1 : 0) + especialidades.length} />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Tu perfil público</h3>
          <button type="button" onClick={onEditarPerfil} className="text-sm font-medium text-gg-green hover:underline">
            Editar →
          </button>
        </div>
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">
            {integrantesActivos > 0
              ? `👥 Trabajás en equipo con ${integrantesActivos} persona${integrantesActivos === 1 ? '' : 's'}.`
              : '¿Trabajás con alguien más?'}{' '}
            <button type="button" onClick={onVerEquipo} className="font-medium text-gg-green hover:underline">
              Gestionar equipo →
            </button>
          </p>

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">Barrios donde operás</div>
            {barrios.length === 0 ? (
              <EmptyState>Todavía no elegiste ningún barrio. Sumalo desde tu perfil.</EmptyState>
            ) : (
              <div className="flex flex-wrap gap-2">
                {barrios.map((b, i) => (
                  <span
                    key={i}
                    className={
                      'rounded-full px-3 py-1 text-sm ' + (b.habilitado ? 'bg-gg-light text-gg-dark' : 'bg-amber-50 text-amber-700')
                    }
                  >
                    {b.nombre} · {b.habilitado ? 'habilitado' : 'pendiente de habilitación'}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">Tus servicios</div>
            {!servicioPrincipal ? (
              <EmptyState>Todavía no tenés servicios publicados.</EmptyState>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm">
                  <span className="text-gray-800">
                    {servicioLabel(servicioPrincipal.tipo)}
                    <span className="ml-2 text-xs text-gray-400">(principal)</span>
                  </span>
                  <span className="text-right text-gray-600">
                    {servicioPrincipal.tarifa != null ? (
                      <>
                        Desde ARS {servicioPrincipal.tarifa.toLocaleString('es-AR')} por mes
                      </>
                    ) : (
                      'sin precio cargado'
                    )}
                  </span>
                </div>
                {especialidades.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-1 text-xs text-gray-500">También ofrecés, a cotizar en cada pedido:</div>
                    <div className="flex flex-wrap gap-2">
                      {especialidades.map((t) => (
                        <span key={t} className="rounded-full bg-gg-light px-3 py-1 text-sm text-gg-dark">
                          {servicioLabel(t)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <VerificacionesResumen prestadorId={prestadorId} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Próximamente</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Placeholder
            icono="💳"
            titulo="Verificar pagos recibidos"
            texto="Vas a poder confirmar acá los pagos de tus trabajos, liberados cuando el propietario marca el servicio como terminado."
          />
          <Placeholder
            icono="🗺️"
            titulo="Mapa de tus clientes"
            texto="Vas a poder ver la ubicación de tus clientes activos dentro del barrio, para organizar mejor tus visitas."
          />
          <Placeholder icono="⚖️" titulo="Asesor legal" texto="Consultas legales relacionadas a tu actividad, sin costo adicional." />
          <Placeholder icono="🛡️" titulo="Seguros" texto="Cotizá y contratá tu seguro/ART directo desde la plataforma." />
          <Placeholder icono="🧾" titulo="Monotributo" texto="Ayuda para inscribirte y gestionar tu monotributo." />
          <Placeholder icono="🎓" titulo="Capacitaciones" texto="Cursos y contenido para mejorar tu oficio y tu negocio." />
          <Placeholder icono="💰" titulo="Créditos" texto="Acceso a créditos pensados para prestadores de servicios." />
          <Placeholder icono="🧰" titulo="Compra de herramientas" texto="Descuentos y financiación para equipar tu trabajo." />
        </div>
      </section>
    </div>
  )
}

function Placeholder({ icono, titulo, texto }: { icono: string; titulo: string; texto: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
        <span>{icono}</span>
        <span>{titulo}</span>
      </div>
      <p className="mt-1 text-xs text-gray-400">{texto}</p>
    </div>
  )
}
