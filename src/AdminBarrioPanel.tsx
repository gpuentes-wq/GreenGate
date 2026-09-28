import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import type { PrestadorDirectorio } from './types'
import { Insignia, EmptyState, Tarjeta, Switch } from './ui'
import { ValidarPrestadorModal } from './ValidarPrestadorModal'
import { AltaPrestadorModal } from './AltaPrestadorModal'
import { alertaVencimiento, badgesPrestador, prestadorVerificado, type VerificacionRow, type IntegranteRow } from './verificacion'

const TIPO_LABELS: Record<string, string> = {
  antecedentes_penales: 'Antecedentes',
  seguro_art: 'Seguro / ART',
  identidad: 'Identidad',
}

type BarrioOpt = { id: string; nombre: string }
type PrestadorBarrioRow = { prestador_id: string; barrio_id: string; habilitado: boolean }
type Verif = VerificacionRow & { id: string; prestador_id: string }
type IntegranteConNombre = IntegranteRow & { prestador_id: string; nombre: string; apellido: string | null }
type Alerta = { id: string; prestador_id: string; nombre: string; tipo: string; texto: string; vencido: boolean }
type Sugerido = {
  id: string
  barrio_id: string | null
  estado: string
  nombre_sugerido: string
  contacto_sugerido: string | null
  notas: string | null
  propietario_contacto_nombre: string | null
  propietario_contacto_celular: string | null
  created_at: string
}
// Qué alta está en curso. `sugeridoId` es null cuando la administración usa el
// botón "+ Agregar prestador" y no viene de una sugerencia; cuando viene, al
// crear el prestador hay que cerrar el lead que lo originó.
type AltaEnCurso = { sugeridoId: string | null; inicial?: { nombre?: string; apellido?: string; celular?: string } }

export function AdminBarrioPanel({ onVerMultibarrio }: { onVerMultibarrio?: () => void }) {
  const [barrios, setBarrios] = useState<BarrioOpt[]>([])
  const [barrioId, setBarrioId] = useState('')
  const [prestadorBarrio, setPrestadorBarrio] = useState<PrestadorBarrioRow[]>([])
  const [prestadores, setPrestadores] = useState<PrestadorDirectorio[]>([])
  const [verificaciones, setVerificaciones] = useState<Verif[]>([])
  const [integrantes, setIntegrantes] = useState<IntegranteConNombre[]>([])
  const [administracionId, setAdministracionId] = useState<string | null>(null)
  const [sugeridos, setSugeridos] = useState<Sugerido[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alta, setAlta] = useState<AltaEnCurso | null>(null)
  const [validar, setValidar] = useState<{ id: string; nombre: string } | null>(null)
  // Qué sugerencia está pidiendo confirmación para descartarse. Se confirma en
  // la misma pantalla, por el mismo motivo que la baja de un pedido: un
  // confirm() del navegador se descarta sin leer.
  const [descartando, setDescartando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setError(null)
    const [b, pb, p, a, v, i, s] = await Promise.all([
      supabase.from('barrio').select('id,nombre').order('nombre'),
      supabase.from('prestador_barrio').select('prestador_id,barrio_id,habilitado'),
      supabase.from('prestador_directorio').select('*').order('puntaje_promedio', { ascending: false, nullsFirst: false }),
      supabase.from('administracion').select('id').limit(1),
      supabase.from('verificacion').select('id,tipo,estado,fecha_vencimiento,prestador_id,integrante_id'),
      supabase.from('integrante').select('id,prestador_id,nombre,apellido,activo'),
      supabase
        .from('prestador_sugerido')
        .select(
          'id,barrio_id,estado,nombre_sugerido,contacto_sugerido,notas,propietario_contacto_nombre,propietario_contacto_celular,created_at',
        )
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false }),
    ])
    const err = b.error || pb.error || p.error || v.error || i.error || s.error
    if (err) {
      setError(err.message)
      return
    }
    const bData = (b.data as BarrioOpt[]) ?? []
    setBarrios(bData)
    setPrestadorBarrio((pb.data as PrestadorBarrioRow[]) ?? [])
    setPrestadores((p.data as PrestadorDirectorio[]) ?? [])
    setVerificaciones((v.data as Verif[]) ?? [])
    setIntegrantes((i.data as IntegranteConNombre[]) ?? [])
    setSugeridos((s.data as Sugerido[]) ?? [])
    const adm = (a.data as Array<{ id: string }>) ?? []
    if (adm.length > 0) setAdministracionId(adm[0].id)
    setBarrioId((actual) => actual || (bData.length === 1 ? bData[0].id : ''))
  }, [])

  useEffect(() => {
    setLoading(true)
    cargar().finally(() => setLoading(false))
  }, [cargar])

  // Habilitar el ingreso al barrio es una decisión de la administración,
  // separada de la documentación: un jardinero que ya trabaja hace años puede
  // estar habilitado mientras termina de presentar el seguro. El propietario lo
  // ve en el directorio, sin insignias — que es información útil, no un error.
  async function cambiarHabilitacion(prestadorId: string, habilitado: boolean) {
    setPrestadorBarrio((rows) =>
      rows.map((r) => (r.prestador_id === prestadorId && r.barrio_id === barrioId ? { ...r, habilitado } : r)),
    )
    const { error } = await supabase
      .from('prestador_barrio')
      .update({ habilitado })
      .eq('prestador_id', prestadorId)
      .eq('barrio_id', barrioId)
    if (error) setError(error.message)
  }

  // Descartar no borra la fila: la marca. Que un vecino haya recomendado a
  // alguien es información que conviene conservar aunque la administración
  // decida no darlo de alta — si tres vecinos distintos proponen al mismo,
  // eso dice algo.
  async function descartar(sugeridoId: string) {
    setSugeridos((rows) => rows.filter((r) => r.id !== sugeridoId))
    setDescartando(null)
    const { error } = await supabase
      .from('prestador_sugerido')
      .update({ estado: 'descartado', resuelto_en: new Date().toISOString() })
      .eq('id', sugeridoId)
    if (error) {
      setError(error.message)
      cargar()
    }
  }

  // Se llama cuando el alta salió de una sugerencia: cierra el lead y lo deja
  // apuntando al prestador que originó, para que quede el rastro completo.
  async function marcarDadoDeAlta(sugeridoId: string, prestadorId: string) {
    const { error } = await supabase
      .from('prestador_sugerido')
      .update({ estado: 'dado_de_alta', prestador_id: prestadorId, resuelto_en: new Date().toISOString() })
      .eq('id', sugeridoId)
    if (error) setError(error.message)
  }

  const verifsPorPrestador = useMemo(() => {
    const m: Record<string, Verif[]> = {}
    for (const v of verificaciones) {
      if (!m[v.prestador_id]) m[v.prestador_id] = []
      m[v.prestador_id].push(v)
    }
    return m
  }, [verificaciones])

  const integrantesPorPrestador = useMemo(() => {
    const m: Record<string, IntegranteConNombre[]> = {}
    for (const i of integrantes) {
      if (!m[i.prestador_id]) m[i.prestador_id] = []
      m[i.prestador_id].push(i)
    }
    return m
  }, [integrantes])

  const idsEnBarrio = useMemo(() => {
    if (!barrioId) return new Set<string>()
    return new Set(prestadorBarrio.filter((r) => r.barrio_id === barrioId).map((r) => r.prestador_id))
  }, [prestadorBarrio, barrioId])

  const lista = useMemo(
    () => prestadores.filter((p) => idsEnBarrio.has(p.id)),
    [prestadores, idsEnBarrio],
  )

  const habilitadoEnBarrio = useMemo(
    () => new Set(prestadorBarrio.filter((r) => r.barrio_id === barrioId && r.habilitado).map((r) => r.prestador_id)),
    [prestadorBarrio, barrioId],
  )

  const pendientes = lista.filter(
    (p) => !prestadorVerificado(verifsPorPrestador[p.id] ?? [], integrantesPorPrestador[p.id] ?? []),
  ).length

  const disponiblesUrgencia = lista.filter((p) => p.disponible_urgencia).length

  const alertas = useMemo<Alerta[]>(() => {
    const nombrePorId = new Map(lista.map((p) => [p.id, nombreMostrar(p)]))
    const integrantePorId = new Map(integrantes.map((i) => [i.id, i]))
    const out: Alerta[] = []
    for (const v of verificaciones) {
      if (!idsEnBarrio.has(v.prestador_id)) continue
      const al = alertaVencimiento(v.estado, v.fecha_vencimiento)
      if (al) {
        const prestadorNombre = nombrePorId.get(v.prestador_id) ?? 'Prestador'
        const integ = v.integrante_id ? integrantePorId.get(v.integrante_id) : null
        out.push({
          id: v.id,
          prestador_id: v.prestador_id,
          nombre: integ ? `${prestadorNombre} — ${integ.nombre}${integ.apellido ? ' ' + integ.apellido : ''}` : prestadorNombre,
          tipo: v.tipo,
          texto: al.texto,
          vencido: al.vencido,
        })
      }
    }
    return out.sort((a, b) => Number(b.vencido) - Number(a.vencido))
  }, [verificaciones, lista, integrantes, idsEnBarrio])

  // Sugerencias pendientes de este barrio, con un aviso cuando el nombre se
  // parece al de alguien que ya está en el directorio. Es el caso más común de
  // lead inútil: el vecino no encontró a su jardinero porque buscó mal, no
  // porque falte. Sin el aviso, la administración lo da de alta dos veces.
  const sugeridosDelBarrio = useMemo(() => {
    const yaEstan = lista.map((p) => normalizar(nombreMostrar(p)))
    return sugeridos
      .filter((s) => s.barrio_id === barrioId)
      .map((s) => {
        const n = normalizar(s.nombre_sugerido)
        return { ...s, posibleDuplicado: n.length > 2 && yaEstan.some((y) => y.includes(n) || n.includes(y)) }
      })
  }, [sugeridos, barrioId, lista])

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-gray-500">Cargando…</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gg-dark">Panel de Administración</h1>
          <p className="text-sm text-gray-500">Documentación, validación y alta de prestadores de tu barrio</p>
        </div>
        {barrios.length > 1 && onVerMultibarrio && (
          <button
            onClick={onVerMultibarrio}
            className="text-sm font-medium text-gg-green hover:underline"
          >
            Ver todos mis barrios →
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          No se pudieron cargar los datos: {error}
        </div>
      )}

      {barrios.length > 1 && (
        <div className="mt-6">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Barrio
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
        </div>
      )}

      {!barrioId ? (
        <EmptyState>
          {barrios.length === 0 ? 'Todavía no hay barrios cargados.' : 'Elegí un barrio arriba para operar sobre él.'}
        </EmptyState>
      ) : (
        <>
          <section className="mb-8 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Tarjeta titulo="Prestadores" valor={lista.length} />
            <Tarjeta titulo="Pendientes de validación" valor={pendientes} acento />
            <Tarjeta titulo="Disponibles para urgencia" valor={disponiblesUrgencia} />
          </section>

          {alertas.length > 0 && (
            <section className="mb-8 rounded-lg border border-amber-300 bg-amber-50 p-4">
              <h2 className="mb-3 text-sm font-semibold text-amber-800">
                ⏰ Documentación que requiere atención ({alertas.length})
              </h2>
              <ul className="space-y-2">
                {alertas.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-amber-900">
                      <span
                        className={
                          'mr-2 inline-block rounded px-1.5 py-0.5 text-xs font-semibold ' +
                          (a.vencido ? 'bg-red-100 text-red-700' : 'bg-amber-200 text-amber-900')
                        }
                      >
                        {a.vencido ? 'VENCIDO' : 'POR VENCER'}
                      </span>
                      <strong>{a.nombre}</strong> — {TIPO_LABELS[a.tipo] ?? a.tipo} {a.texto}
                    </span>
                    <button
                      onClick={() => setValidar({ id: a.prestador_id, nombre: a.nombre })}
                      className="shrink-0 rounded-lg border border-amber-400 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                    >
                      Revisar
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* En verde y no en ámbar a propósito: el ámbar de arriba significa
              "algo está por romperse". Esto es una recomendación de un vecino,
              que es buena noticia aunque pida una acción. */}
          {sugeridosDelBarrio.length > 0 && (
            <section className="mb-8 rounded-lg border border-green-300 bg-green-50 p-4">
              <h2 className="text-sm font-semibold text-green-800">
                🌱 Propuestos por vecinos ({sugeridosDelBarrio.length})
              </h2>
              <p className="mb-3 mt-1 text-xs text-green-700">
                Vecinos del barrio recomendaron a estas personas. Todavía no están en el directorio.
              </p>
              <ul className="space-y-2">
                {sugeridosDelBarrio.map((s) => (
                  <li key={s.id} className="rounded-lg border border-green-200 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800">
                          {s.nombre_sugerido}
                          {s.contacto_sugerido && (
                            <span className="ml-2 text-sm font-normal text-gray-500">{s.contacto_sugerido}</span>
                          )}
                        </p>
                        {s.posibleDuplicado && (
                          <p className="mt-1 text-xs font-medium text-amber-700">
                            ⚠️ Ya hay un prestador con un nombre parecido en este barrio. Fijate antes de darlo de alta.
                          </p>
                        )}
                        {s.notas && <p className="mt-1 text-sm italic text-gray-600">“{s.notas}”</p>}
                        <p className="mt-1 text-xs text-gray-400">
                          {s.propietario_contacto_nombre
                            ? `Lo propuso ${s.propietario_contacto_nombre}`
                            : 'Lo propuso un vecino'}
                          {s.propietario_contacto_celular && ` · ${s.propietario_contacto_celular}`}
                          {` · ${fechaCorta(s.created_at)}`}
                        </p>
                      </div>
                      {descartando === s.id ? (
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-gray-500">¿Descartar?</span>
                          <button
                            onClick={() => descartar(s.id)}
                            className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Sí, descartar
                          </button>
                          <button
                            onClick={() => setDescartando(null)}
                            className="text-xs text-gray-500 hover:underline"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() =>
                              setAlta({
                                sugeridoId: s.id,
                                inicial: {
                                  ...partirNombre(s.nombre_sugerido),
                                  celular: s.contacto_sugerido ?? '',
                                },
                              })
                            }
                            className="rounded-lg bg-gg-green px-3 py-1.5 text-xs font-medium text-white hover:bg-gg-dark"
                          >
                            Dar de alta
                          </button>
                          <button
                            onClick={() => setDescartando(s.id)}
                            className="text-xs text-gray-500 hover:underline"
                          >
                            Descartar
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gg-dark">Prestadores del barrio</h2>
              <button
                onClick={() => setAlta({ sugeridoId: null })}
                className="rounded-lg bg-gg-green px-4 py-2 text-sm font-medium text-white hover:bg-gg-dark"
              >
                + Agregar prestador
              </button>
            </div>
            {lista.length === 0 ? (
              <EmptyState>Todavía no hay prestadores en este barrio. Agregá el primero con el botón de arriba.</EmptyState>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Prestador</th>
                      <th className="px-4 py-2 font-medium">Servicio</th>
                      <th className="px-4 py-2 font-medium">Puntaje</th>
                      <th className="px-4 py-2 font-medium">Documentación</th>
                      <th className="px-4 py-2 font-medium">Habilitado</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((p) => {
                      const integrantesDe = integrantesPorPrestador[p.id] ?? []
                      const b = badgesPrestador(verifsPorPrestador[p.id] ?? [], integrantesDe)
                      return (
                        <tr key={p.id} className="border-t border-gray-100">
                          <td className="px-4 py-2 font-medium text-gray-800">
                            {nombreMostrar(p)}
                            {integrantesDe.length > 0 && (
                              <span className="ml-2 text-xs font-normal text-gray-400">
                                · {integrantesDe.length} integrante{integrantesDe.length === 1 ? '' : 's'}
                              </span>
                            )}
                            {p.disponible_urgencia && (
                              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                ⚡ Urgencia
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-600">{p.tipo_servicio_principal}</td>
                          <td className="px-4 py-2 text-gray-600">
                            {p.puntaje_promedio != null ? `★ ${p.puntaje_promedio} (${p.cantidad_valoraciones})` : '—'}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              <Insignia ok={b.antecedentes} label="Antecedentes" />
                              <Insignia ok={b.seguro} label="Seguro" />
                              <Insignia ok={b.identidad} label="Identidad" />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <Switch
                              activo={habilitadoEnBarrio.has(p.id)}
                              onCambiar={(v) => cambiarHabilitacion(p.id, v)}
                              etiqueta={`Habilitar a ${nombreMostrar(p)} en este barrio`}
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              onClick={() => setValidar({ id: p.id, nombre: nombreMostrar(p) })}
                              className="rounded-lg border border-gg-green px-3 py-1 text-sm font-medium text-gg-green hover:bg-gg-light"
                            >
                              Validar
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {alta && barrioId && (
        <AltaPrestadorModal
          barrioId={barrioId}
          inicial={alta.inicial}
          onClose={() => setAlta(null)}
          onCreado={async (prestadorId) => {
            if (alta.sugeridoId) await marcarDadoDeAlta(alta.sugeridoId, prestadorId)
            setAlta(null)
            cargar()
          }}
        />
      )}

      {validar && (
        <ValidarPrestadorModal
          prestadorId={validar.id}
          prestadorNombre={validar.nombre}
          administracionId={administracionId}
          onClose={() => setValidar(null)}
          onCambio={cargar}
        />
      )}
    </main>
  )
}

function nombreMostrar(p: PrestadorDirectorio): string {
  if (p.es_empresa && p.razon_social) return p.razon_social
  return p.apellido ? `${p.nombre} ${p.apellido}` : p.nombre
}

// Sin acentos ni mayúsculas: el vecino escribe "Ramon Perez" y en el directorio
// está "Ramón Pérez". Comparar tal cual no encontraría nunca el duplicado.
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// El vecino escribe un nombre suelto; el alta pide nombre y apellido por
// separado. La primera palabra es el nombre y el resto el apellido: acierta en
// la mayoría de los casos y, cuando no, la administración lo corrige ahí mismo.
function partirNombre(completo: string): { nombre: string; apellido: string } {
  const partes = completo.trim().split(/\s+/)
  return { nombre: partes[0] ?? '', apellido: partes.slice(1).join(' ') }
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}
