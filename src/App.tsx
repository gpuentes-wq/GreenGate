import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Barrio, PrestadorDirectorio } from './types'

const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function App() {
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
      if (b.error) {
        setError(b.error.message)
      } else if (p.error) {
        setError(p.error.message)
      } else {
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

  const configIncompleta = !ANON || ANON === 'TU_ANON_KEY_ACA'

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-gg-green text-white">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <h1 className="text-xl font-semibold">🌿 GreenGate · Panel de Administración</h1>
          <p className="text-sm text-white/80">Gestión de barrios y validación de prestadores</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {configIncompleta && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            <strong>Falta conectar Supabase.</strong> Completá <code>VITE_SUPABASE_ANON_KEY</code> en
            el archivo <code>.env</code> con tu clave anon (Supabase → Project Settings → API) y
            reiniciá <code>npm run dev</code>.
          </div>
        )}

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
                <Vacio />
              ) : (
                <Tabla
                  columnas={['Barrio', 'Localidad', 'Zona', 'Lotes', 'Estado']}
                  filas={barrios.map((b) => [
                    b.nombre,
                    b.localidad ?? '—',
                    b.zona ?? '—',
                    b.cantidad_lotes != null ? String(b.cantidad_lotes) : '—',
                    b.etapa_activacion ?? '—',
                  ])}
                />
              )}
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-gg-dark">Prestadores y validación</h2>
              {prestadores.length === 0 ? (
                <Vacio />
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
    </div>
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

function Tabla({ columnas, filas }: { columnas: string[]; filas: string[][] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            {columnas.map((c) => (
              <th key={c} className="px-4 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i} className="border-t border-gray-100">
              {fila.map((celda, j) => (
                <td key={j} className={'px-4 py-2 ' + (j === 0 ? 'font-medium text-gray-800' : 'text-gray-600')}>
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Insignia({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ' +
        (ok ? 'bg-gg-light text-gg-dark' : 'bg-gray-100 text-gray-400')
      }
    >
      <span>{ok ? '✓' : '○'}</span>
      {label}
    </span>
  )
}

function Vacio() {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
      Todavía no hay datos. Cargá el archivo <code>supabase/seed.sql</code> en Supabase para ver el
      panel con ejemplos.
    </div>
  )
}
