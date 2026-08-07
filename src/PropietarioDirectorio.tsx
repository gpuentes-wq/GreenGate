import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import type { PrestadorDirectorio, Especialidad } from './types'
import { servicioLabel } from './labels'
import { Insignia, EmptyState } from './ui'
import { PedirPresupuestoModal } from './PedirPresupuestoModal'
import { ProponerPrestadorModal } from './ProponerPrestadorModal'
import { PerfilJardinero } from './PerfilJardinero'
import { badgesPrestador, prestadorVerificado, type VerificacionRow, type IntegranteRow } from './verificacion'

type Extra = { tarifa: number | null; experiencia: number | null }
type BarrioOpt = { id: string; nombre: string }
type PrestadorBarrioRow = { prestador_id: string; barrio_id: string; habilitado: boolean }

// barrioInicial llega de la pantalla de selección de rol; el selector de barrio
// se mantiene igual, para poder cambiar sin volver al inicio.
export default function PropietarioDirectorio({ barrioInicial = '' }: { barrioInicial?: string }) {
  const [vista, setVista] = useState<{ tipo: 'listado' } | { tipo: 'perfil'; prestadorId: string }>({ tipo: 'listado' })

  const [barrios, setBarrios] = useState<BarrioOpt[]>([])
  const [barrioId, setBarrioId] = useState(barrioInicial)
  const [prestadorBarrio, setPrestadorBarrio] = useState<PrestadorBarrioRow[]>([])

  const [prestadores, setPrestadores] = useState<PrestadorDirectorio[]>([])
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [extras, setExtras] = useState<Record<string, Extra>>({})
  const [verifs, setVerifs] = useState<Record<string, VerificacionRow[]>>({})
  const [integrantes, setIntegrantes] = useState<Record<string, IntegranteRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [soloVerificados, setSoloVerificados] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [enviados, setEnviados] = useState<Record<string, boolean>>({})
  const [modalPresupuesto, setModalPresupuesto] = useState(false)
  const [modalProponer, setModalProponer] = useState(false)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      setError(null)
      const [b, pb, p, e, x, v, i] = await Promise.all([
        supabase.from('barrio').select('id,nombre').order('nombre'),
        supabase.from('prestador_barrio').select('prestador_id,barrio_id,habilitado'),
        supabase.from('prestador_directorio').select('*'),
        supabase.from('prestador_servicio').select('prestador_id,tipo,tarifa'),
        supabase.from('prestador').select('id,tarifa_referencia,anios_experiencia'),
        supabase.from('verificacion').select('prestador_id,integrante_id,tipo,estado,fecha_vencimiento'),
        supabase.from('integrante').select('id,prestador_id,activo'),
      ])
      const err = b.error || pb.error || p.error || e.error || x.error || v.error || i.error
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }
      setBarrios((b.data as BarrioOpt[]) ?? [])
      setPrestadorBarrio((pb.data as PrestadorBarrioRow[]) ?? [])
      setPrestadores((p.data as PrestadorDirectorio[]) ?? [])
      setEspecialidades((e.data as Especialidad[]) ?? [])
      const map: Record<string, Extra> = {}
      const filas = (x.data as Array<{ id: string; tarifa_referencia: number | null; anios_experiencia: number | null }>) ?? []
      for (const r of filas) map[r.id] = { tarifa: r.tarifa_referencia, experiencia: r.anios_experiencia }
      setExtras(map)
      const vmap: Record<string, VerificacionRow[]> = {}
      const vrows = (v.data as Array<{ prestador_id: string } & VerificacionRow>) ?? []
      for (const r of vrows) {
        if (!vmap[r.prestador_id]) vmap[r.prestador_id] = []
        vmap[r.prestador_id].push({ tipo: r.tipo, estado: r.estado, fecha_vencimiento: r.fecha_vencimiento, integrante_id: r.integrante_id })
      }
      setVerifs(vmap)
      const imap: Record<string, IntegranteRow[]> = {}
      const irows = (i.data as Array<{ id: string; prestador_id: string; activo: boolean }>) ?? []
      for (const r of irows) {
        if (!imap[r.prestador_id]) imap[r.prestador_id] = []
        imap[r.prestador_id].push({ id: r.id, activo: r.activo })
      }
      setIntegrantes(imap)
      setLoading(false)
    }
    cargar()
  }, [])

  const espPorPrestador = useMemo(() => {
    const m: Record<string, string[]> = {}
    for (const e of especialidades) {
      if (!m[e.prestador_id]) m[e.prestador_id] = []
      m[e.prestador_id].push(e.tipo)
    }
    return m
  }, [especialidades])

  const habilitadosEnBarrio = useMemo(() => {
    if (!barrioId) return new Set<string>()
    return new Set(prestadorBarrio.filter((r) => r.barrio_id === barrioId && r.habilitado).map((r) => r.prestador_id))
  }, [prestadorBarrio, barrioId])

  const nombreDe = (p: PrestadorDirectorio) => (p.es_empresa && p.razon_social ? p.razon_social : `${p.nombre}${p.apellido ? ' ' + p.apellido : ''}`)

  const lista = useMemo(() => {
    if (!barrioId) return []
    let l = prestadores.filter((p) => habilitadosEnBarrio.has(p.id))
    if (soloVerificados) {
      l = l.filter((p) => prestadorVerificado(verifs[p.id] ?? [], integrantes[p.id] ?? []))
    }
    const q = busqueda.trim().toLowerCase()
    if (q) {
      l = l.filter((p) => nombreDe(p).toLowerCase().includes(q))
    }
    return l.sort((a, b) => (b.puntaje_promedio ?? -1) - (a.puntaje_promedio ?? -1))
  }, [prestadores, barrioId, habilitadosEnBarrio, soloVerificados, busqueda, verifs, integrantes])

  function toggleSeleccion(id: string) {
    setSeleccionados((s) => {
      const copia = new Set(s)
      if (copia.has(id)) copia.delete(id)
      else copia.add(id)
      return copia
    })
  }

  if (vista.tipo === 'perfil') {
    return <PerfilJardinero prestadorId={vista.prestadorId} onVolver={() => setVista({ tipo: 'listado' })} />
  }

  const seleccionadosInfo = prestadores.filter((p) => seleccionados.has(p.id)).map((p) => ({ id: p.id, nombre: nombreDe(p) }))

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 pb-24">
      <h1 className="text-xl font-semibold text-gg-dark">Encontrá tu jardinero</h1>
      <p className="mb-6 text-sm text-gray-500">
        Jardineros verificados por la administración de tu barrio. Compará puntaje, especialidad y precio.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Tu barrio
          <select
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            value={barrioId}
            onChange={(e) => setBarrioId(e.target.value)}
          >
            <option value="">Elegí un barrio…</option>
            {barrios.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        </label>
        {barrioId && (
          <>
            <input
              type="text"
              placeholder="Buscar por nombre…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={soloVerificados}
                onChange={(e) => setSoloVerificados(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Solo verificados
            </label>
            <span className="text-sm text-gray-400">{lista.length} jardineros</span>
          </>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          No se pudieron cargar los datos: {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : !barrioId ? (
        <EmptyState>Elegí tu barrio arriba para ver los jardineros disponibles.</EmptyState>
      ) : lista.length === 0 ? (
        <EmptyState>No hay jardineros que coincidan con el filtro.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((p) => {
            const nombre = nombreDe(p)
            const badges = badgesPrestador(verifs[p.id] ?? [], integrantes[p.id] ?? [])
            const verificado = badges.antecedentes && badges.seguro && badges.identidad
            const esp = espPorPrestador[p.id] ?? []
            const ex = extras[p.id]
            const yaEnviado = enviados[p.id]
            return (
              <div key={p.id} className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <button
                      type="button"
                      onClick={() => setVista({ tipo: 'perfil', prestadorId: p.id })}
                      className="font-semibold text-gray-900 hover:underline"
                    >
                      {nombre}
                    </button>
                    <div className="text-sm text-gray-500">{servicioLabel(p.tipo_servicio_principal)}</div>
                  </div>
                  {verificado && (
                    <span className="shrink-0 rounded-full bg-gg-light px-2 py-1 text-xs font-medium text-gg-dark">
                      ✓ Verificado
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-1 text-sm">
                  {p.puntaje_promedio != null ? (
                    <>
                      <span className="text-amber-500">★</span>
                      <span className="font-medium">{p.puntaje_promedio}</span>
                      <span className="text-gray-400">({p.cantidad_valoraciones} reseñas)</span>
                    </>
                  ) : (
                    <span className="text-gray-400">Sin reseñas aún</span>
                  )}
                </div>

                {p.descripcion && <p className="mt-3 text-sm text-gray-600">{p.descripcion}</p>}

                {esp.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {esp.map((t) => (
                      <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {servicioLabel(t)}
                      </span>
                    ))}
                  </div>
                )}

                {ex && (ex.tarifa != null || ex.experiencia != null) && (
                  <div className="mt-3 text-sm text-gray-700">
                    {ex.tarifa != null && (
                      <span>
                        Desde <strong>ARS {ex.tarifa.toLocaleString('es-AR')}</strong>
                      </span>
                    )}
                    {ex.experiencia != null && (
                      <span className="text-gray-400">
                        {ex.tarifa != null ? ' · ' : ''}
                        {ex.experiencia} años de experiencia
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-1">
                  <Insignia ok={badges.antecedentes} label="Antecedentes" />
                  <Insignia ok={badges.seguro} label="Seguro" />
                  <Insignia ok={badges.identidad} label="Identidad" />
                </div>

                <div className="mt-4">
                  {yaEnviado ? (
                    <div className="rounded-lg bg-gg-light px-3 py-2 text-center text-sm font-medium text-gg-dark">
                      Solicitud enviada ✓
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={seleccionados.has(p.id)}
                        onChange={() => toggleSeleccion(p.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Seleccionar para pedir presupuesto
                    </label>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {barrioId && (
        <p className="mt-6 text-sm text-gray-500">
          ¿No encontrás a quien buscás?{' '}
          <button type="button" onClick={() => setModalProponer(true)} className="font-medium text-gg-green hover:underline">
            Proponé un prestador
          </button>
        </p>
      )}

      {seleccionados.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white px-6 py-3 shadow-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <span className="text-sm text-gray-700">{seleccionados.size} seleccionado{seleccionados.size === 1 ? '' : 's'}</span>
            <button
              type="button"
              onClick={() => setModalPresupuesto(true)}
              className="rounded-lg bg-gg-green px-4 py-2 text-sm font-medium text-white hover:bg-gg-dark"
            >
              Pedir presupuesto ({seleccionados.size})
            </button>
          </div>
        </div>
      )}

      {modalPresupuesto && (
        <PedirPresupuestoModal
          prestadores={seleccionadosInfo}
          onClose={() => setModalPresupuesto(false)}
          onEnviado={() => {
            setEnviados((e) => {
              const copia = { ...e }
              for (const id of seleccionados) copia[id] = true
              return copia
            })
            setSeleccionados(new Set())
            setModalPresupuesto(false)
          }}
        />
      )}

      {modalProponer && (
        <ProponerPrestadorModal barrioId={barrioId || null} onClose={() => setModalProponer(false)} onEnviado={() => setModalProponer(false)} />
      )}
    </main>
  )
}
