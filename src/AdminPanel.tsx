import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Barrio, PrestadorDirectorio } from './types'
import { Insignia, EmptyState } from './ui'
import { AltaBarrioModal } from './AltaBarrioModal'
import { ValidarPrestadorModal } from './ValidarPrestadorModal'
import { alertaVencimiento, badgesPrestador, prestadorVerificado, type VerificacionRow } from './verificacion'

const TIPO_LABELS: Record<string, string> = {
  antecedentes_penales: 'Antecedentes',
  seguro_art: 'Seguro / ART',
  identidad: 'Identidad',
}

type Verif = VerificacionRow & { id: string; prestador_id: string }
type Alerta = { id: string; prestador_id: string; nombre: string; tipo: string; texto: string; vencido: boolean }

export default function AdminPanel() {
  const [barrios, setBarrios] = useState<Barrio[]>([])
  const [prestadores, setPrestadores] = useState<PrestadorDirectorio[]>([])
  const [verificaciones, setVerificaciones] = useState<Verif[]>([])
  const [administracionId, setAdministracionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalBarrio, setModalBarrio] = useState(false)
  const [validar, setValidar] = useState<{ id: string; nombre: string } | null>(null)

  const cargar = useCallback(async () => {
    setError(null)
    const [b, p, a, v] = await Promise.all([
      supabase
        .from('barrio')
        .select('id,nombre,localidad,zona,cantidad_lotes,etapa_activacion')
        .order('nombre'),
      supabase
        .from('prestador_directorio')
        .select('*')
        .order('puntaje_promedio', { ascending: false, nullsFirst: false }),
      supabase.from('administracion').select('id').limit(1),
      supabase.from('verificacion').select('id,tipo,estado,fecha_vencimiento,prestador_id'),
    ])
    if (b.error) {
      setError(b.error.message)
      return
    }
    if (p.error) {
      setError(p.error.message)
      return
    }
    setBarrios((b.data as Barrio[]) ?? [])
    setPrestadores((p.data as PrestadorDirectorio[]) ?? [])
    setVerificaciones((v.data as Verif[]) ?? [])
    const adm = (a.data as Array<{ id: string }>) ?? []
    if (adm.length > 0) setAdministracionId(adm[0].id)
  }, [])

  useEffect(() => {
    setLoading(true)
    cargar().finally(() => setLoading(false))
  }, [cargar])

  const verifsPorPrestador = useMemo(() => {
    const m: Record<string, Verif[]> = {}
    for (const v of verificaciones) {
      if (!m[v.prestador_id]) m[v.prestador_id] = []
      m[v.prestador_id].push(v)
    }
    return m
  }, [verificaciones])

  const pendientes = prestadores.filter((p) => !prestadorVerificado(verifsPorPrestador[p.id] ?? [])).length

  const alertas = useMemo<Alerta[]>(() => {
    const nombrePorId = new Map(prestadores.map((p) => [p.id, nombreMostrar(p)]))
    const out: Alerta[] = []
    for (const v of verificaciones) {
      const al = alertaVencimiento(v.estado, v.fecha_vencimiento)
      if (al) {
        out.push({
          id: v.id,
          prestador_id: v.prestador_id,
          nombre: nombrePorId.get(v.prestador_id) ?? 'Prestador',
          tipo: v.tipo,
          texto: al.texto,
          vencido: al.vencido,
        })
      }
    }
    return out.sort((a, b) => Number(b.vencido) - Number(a.vencido))
  }, [verificaciones, prestadores])

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gg-dark">Panel de Administración</h1>
          <p className="text-sm text-gray-500">Gestión de barrios y validación de prestadores</p>
        </div>
        <button
          onClick={() => setModalBarrio(true)}
          className="rounded-lg bg-gg-green px-4 py-2 text-sm font-medium text-white hover:bg-gg-dark"
        >
          + Agregar barrio
        </button>
      </div>

      <section className="mb-8 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Tarjeta titulo="Barrios" valor={barrios.length} />
        <Tarjeta titulo="Prestadores" valor={prestadores.length} />
        <Tarjeta titulo="Pendientes de validación" valor={pendientes} acento />
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

      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          No se pudieron cargar los datos: {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="mb-3 text-lg font-semibold text-gg-dark">Mis barrios</h2>
            {barrios.length === 0 ? (
              <EmptyState>Todavía no hay barrios. Agregá el primero con el botón de arriba.</EmptyState>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Barrio</th>
                      <th className="px-4 py-2 font-medium">Localidad</th>
                      <th className="px-4 py-2 font-medium">Zona</th>
                      <th className="px-4 py-2 font-medium">Lotes</th>
                      <th className="px-4 py-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barrios.map((b) => (
                      <tr key={b.id} className="border-t border-gray-100">
                        <td className="px-4 py-2 font-medium text-gray-800">{b.nombre}</td>
                        <td className="px-4 py-2 text-gray-600">{b.localidad ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-600">{b.zona ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-600">{b.cantidad_lotes ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-600">{b.etapa_activacion ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gg-dark">Prestadores y validación</h2>
            {prestadores.length === 0 ? (
              <EmptyState>
                Todavía no hay prestadores. Cargá <code>supabase/seed.sql</code> en Supabase.
              </EmptyState>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Prestador</th>
                      <th className="px-4 py-2 font-medium">Servicio</th>
                      <th className="px-4 py-2 font-medium">Puntaje</th>
                      <th className="px-4 py-2 font-medium">Verificaciones</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {prestadores.map((p) => {
                      const b = badgesPrestador(verifsPorPrestador[p.id] ?? [])
                      return (
                        <tr key={p.id} className="border-t border-gray-100">
                          <td className="px-4 py-2 font-medium text-gray-800">{nombreMostrar(p)}</td>
                          <td className="px-4 py-2 text-gray-600">{p.tipo_servicio_principal}</td>
                          <td className="px-4 py-2 text-gray-600">
                            {p.puntaje_promedio != null
                              ? `★ ${p.puntaje_promedio} (${p.cantidad_valoraciones})`
                              : '—'}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              <Insignia ok={b.antecedentes} label="Antecedentes" />
                              <Insignia ok={b.seguro} label="Seguro" />
                              <Insignia ok={b.identidad} label="Identidad" />
                            </div>
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

      {modalBarrio && (
        <AltaBarrioModal
          administracionId={administracionId}
          onClose={() => setModalBarrio(false)}
          onCreado={() => {
            setModalBarrio(false)
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

function Tarjeta({ titulo, valor, acento }: { titulo: string; valor: number; acento?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-500">{titulo}</div>
      <div className={'mt-1 text-2xl font-semibold ' + (acento ? 'text-amber-600' : 'text-gg-dark')}>
        {valor}
      </div>
    </div>
  )
}
