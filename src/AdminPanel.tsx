import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Barrio, PrestadorDirectorio } from './types'
import { Insignia, EmptyState } from './ui'

export default function AdminPanel() {
  const [barrios, setBarrios] = useState<Barrio[]>([])
  const [prestadores, setPrestadores] = useState<PrestadorDirectorio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      setError(null)
      const [b, p] = await Promise.all([
        supabase
          .from('barrio')
          .select('id,nombre,localidad,zona,cantidad_lotes,etapa_activacion')
          .order('nombre'),
        supabase
          .from('prestador_directorio')
          .select('*')
          .order('puntaje_promedio', { ascending: false, nullsFirst: false }),
      ])
      if (b.error) setError(b.error.message)
      else if (p.error) setError(p.error.message)
      else {
        setBarrios((b.data as Barrio[]) ?? [])
        setPrestadores((p.data as PrestadorDirectorio[]) ?? [])
      }
      setLoading(false)
    }
    cargar()
  }, [])

  const pendientes = prestadores.filter(
    (p) => !(p.antecedentes_ok && p.seguro_ok && p.identidad_ok),
  ).length

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-xl font-semibold text-gg-dark">Panel de Administración</h1>
      <p className="mb-6 text-sm text-gray-500">Gestión de barrios y validación de prestadores</p>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Tarjeta titulo="Barrios" valor={barrios.length} />
        <Tarjeta titulo="Prestadores" valor={prestadores.length} />
        <Tarjeta titulo="Pendientes de validación" valor={pendientes} acento />
      </section>

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
              <EmptyState>
                Todavía no hay datos. Cargá <code>supabase/seed.sql</code> en Supabase.
              </EmptyState>
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
                    </tr>
                  </thead>
                  <tbody>
                    {prestadores.map((p) => (
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
                            <Insignia ok={p.antecedentes_ok} label="Antecedentes" />
                            <Insignia ok={p.seguro_ok} label="Seguro" />
                            <Insignia ok={p.identidad_ok} label="Identidad" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
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
