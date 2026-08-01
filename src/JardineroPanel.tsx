import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { servicioLabel } from './labels'
import { Tarjeta, EmptyState } from './ui'
import { VerificacionesResumen } from './VerificacionesResumen'
import { alertaVencimiento } from './verificacion'

type BarrioOperativo = { nombre: string; habilitado: boolean }
type ServicioPublicado = { tipo: string; tarifa: number | null; principal: boolean }
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
// 2) Tu negocio (puntaje, clientes activos, facturado) — salud general.
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
  const [servicios, setServicios] = useState<ServicioPublicado[]>([])
  const [pendientes, setPendientes] = useState(0)
  const [clientesActivos, setClientesActivos] = useState(0)
  const [facturadoMes, setFacturadoMes] = useState(0)
  const [puntajePromedio, setPuntajePromedio] = useState<number | null>(null)
  const [cantidadValoraciones, setCantidadValoraciones] = useState(0)
  const [integrantesActivos, setIntegrantesActivos] = useState(0)
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      setError(null)

      const [pbRes, psRes, prRes, dirRes, solRes, trabRes, integRes, verifRes] = await Promise.all([
        supabase.from('prestador_barrio').select('barrio_id,habilitado').eq('prestador_id', prestadorId),
        supabase.from('prestador_servicio').select('tipo,tarifa').eq('prestador_id', prestadorId),
        supabase.from('prestador').select('tipo_servicio_principal,tarifa_referencia').eq('id', prestadorId).single(),
        supabase.from('prestador_directorio').select('puntaje_promedio,cantidad_valoraciones').eq('id', prestadorId).single(),
        supabase.from('solicitud').select('estado').eq('prestador_id', prestadorId),
        supabase.from('trabajo').select('monto,fecha,estado,propietario_id').eq('prestador_id', prestadorId),
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

      // Servicios publicados: el principal (con su tarifa) + las especialidades.
      const principal = prRes.data as { tipo_servicio_principal: string; tarifa_referencia: number | null } | null
      const especialidades = (psRes.data as Array<{ tipo: string; tarifa: number | null }>) ?? []
      const lista: ServicioPublicado[] = []
      if (principal) lista.push({ tipo: principal.tipo_servicio_principal, tarifa: principal.tarifa_referencia, principal: true })
      for (const e of especialidades) lista.push({ tipo: e.tipo, tarifa: e.tarifa, principal: false })
      setServicios(lista)

      // Solicitudes pendientes (necesitan respuesta).
      const solicitudes = (solRes.data as Array<{ estado: string }>) ?? []
      setPendientes(solicitudes.filter((s) => s.estado === 'pendiente').length)

      // Clientes activos: propietarios distintos con un trabajo en los últimos 60 días.
      const trabajos = (trabRes.data as Array<{ monto: number | null; fecha: string; estado: string; propietario_id: string | null }>) ?? []
      const hoy = new Date()
      const haceSesentaDias = new Date(hoy.getTime() - 60 * 86_400_000)
      const clientes = new Set(
        trabajos.filter((t) => t.propietario_id && new Date(t.fecha + 'T00:00:00') >= haceSesentaDias).map((t) => t.propietario_id as string),
      )
      setClientesActivos(clientes.size)

      // Facturado este mes: trabajos realizados con fecha dentro del mes actual.
      const facturado = trabajos
        .filter((t) => t.estado === 'realizado' && esMismoMes(t.fecha, hoy))
        .reduce((acc, t) => acc + (t.monto ?? 0), 0)
      setFacturadoMes(facturado)

      // Alertas de documentación (propias, y de cada integrante si es un equipo).
      const nombrePorIntegrante = new Map(integrantes.map((i) => [i.id, `${i.nombre}${i.apellido ? ' ' + i.apellido : ''}`]))
      const verifRows = (verifRes.data as Array<{ tipo: string; estado: string; fecha_vencimiento: string | null; integrante_id: string | null }>) ?? []
      const listaAlertas: Alerta[] = []
      for (const v of verifRows) {
        const al = alertaVencimiento(v.estado, v.fecha_vencimiento)
        if (!al) continue
        const persona = v.integrante_id ? nombrePorIntegrante.get(v.integrante_id) : null
        const etiqueta = persona ? `${TIPO_LABEL_PERSONA[v.tipo] ?? v.tipo} ${persona}` : TIPO_LABEL_PROPIO[v.tipo] ?? v.tipo
        listaAlertas.push({ texto: `${etiqueta} ${al.texto}`, vencido: al.vencido })
      }
      listaAlertas.sort((a, b) => Number(b.vencido) - Number(a.vencido))
      setAlertas(listaAlertas)

      setLoading(false)
    }
    cargar()
  }, [prestadorId])

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

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Tu negocio</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Tarjeta titulo="Tu puntaje" valor={puntajePromedio != null ? `★ ${puntajePromedio} (${cantidadValoraciones})` : 'Sin reseñas aún'} />
          <Tarjeta titulo="Clientes activos" valor={clientesActivos} />
          <Tarjeta titulo="Facturado este mes" valor={`$${facturadoMes.toLocaleString('es-AR')}`} />
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
                    {b.nombre} · {b.habilitado ? 'habilitado' : 'pendiente de validación'}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">Tus servicios y precios</div>
            {servicios.length === 0 ? (
              <EmptyState>Todavía no tenés servicios publicados.</EmptyState>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-100">
                <table className="w-full text-sm">
                  <tbody>
                    {servicios.map((s, i) => (
                      <tr key={i} className="border-t border-gray-100 first:border-t-0">
                        <td className="px-3 py-2 text-gray-800">
                          {servicioLabel(s.tipo)}
                          {s.principal && <span className="ml-2 text-xs text-gray-400">(principal)</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-600">
                          {s.tarifa != null ? `desde $${s.tarifa.toLocaleString('es-AR')}` : 'sin precio cargado'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
        </div>
      </section>
    </div>
  )
}

function esMismoMes(fechaISO: string, ref: Date): boolean {
  const f = new Date(fechaISO + 'T00:00:00')
  return f.getFullYear() === ref.getFullYear() && f.getMonth() === ref.getMonth()
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
