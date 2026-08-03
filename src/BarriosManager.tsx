import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Campo, inputClass, EmptyState } from './ui'

type BarrioAsignado = { barrio_id: string; nombre: string; habilitado: boolean }
type BarrioOpt = { id: string; nombre: string }

// Gestión de los barrios donde trabaja un prestador. Solo permite sumar
// barrios nuevos — dar de baja o editar uno ya sumado queda fuera de este
// alcance (lo maneja administración desde su propio módulo).
export function BarriosManager({ prestadorId }: { prestadorId: string }) {
  const [asignados, setAsignados] = useState<BarrioAsignado[]>([])
  const [opciones, setOpciones] = useState<BarrioOpt[]>([])
  const [barrioId, setBarrioId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agregando, setAgregando] = useState(false)

  async function cargar() {
    setLoading(true)
    setError(null)
    const [pbRes, bRes] = await Promise.all([
      supabase.from('prestador_barrio').select('barrio_id,habilitado').eq('prestador_id', prestadorId),
      supabase.from('barrio').select('id,nombre').order('nombre'),
    ])
    if (pbRes.error || bRes.error) {
      setError((pbRes.error ?? bRes.error)?.message ?? 'No se pudieron cargar los barrios')
      setLoading(false)
      return
    }
    const opts = (bRes.data as BarrioOpt[]) ?? []
    const nombrePorId = new Map(opts.map((b) => [b.id, b.nombre]))
    const pb = (pbRes.data as Array<{ barrio_id: string; habilitado: boolean }>) ?? []
    setAsignados(pb.map((r) => ({ barrio_id: r.barrio_id, nombre: nombrePorId.get(r.barrio_id) ?? 'Barrio', habilitado: r.habilitado })))
    setOpciones(opts)
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [prestadorId])

  const idsAsignados = new Set(asignados.map((a) => a.barrio_id))
  const disponibles = opciones.filter((b) => !idsAsignados.has(b.id))

  async function agregar() {
    if (!barrioId) {
      setError('Elegí un barrio para sumar')
      return
    }
    setAgregando(true)
    setError(null)
    const { error: pbErr } = await supabase.from('prestador_barrio').insert({ prestador_id: prestadorId, barrio_id: barrioId, habilitado: false })
    if (pbErr) {
      setAgregando(false)
      setError(pbErr.message)
      return
    }
    await supabase.from('verificacion').insert([
      { prestador_id: prestadorId, barrio_id: barrioId, tipo: 'antecedentes_penales', estado: 'pendiente' },
      { prestador_id: prestadorId, barrio_id: barrioId, tipo: 'seguro_art', estado: 'pendiente' },
      { prestador_id: prestadorId, barrio_id: barrioId, tipo: 'identidad', estado: 'pendiente' },
    ])
    setBarrioId('')
    setAgregando(false)
    cargar()
  }

  if (loading) return <p className="text-sm text-gray-500">Cargando barrios…</p>

  return (
    <div className="space-y-3">
      {asignados.length === 0 ? (
        <EmptyState>Todavía no elegiste ningún barrio.</EmptyState>
      ) : (
        <div className="flex flex-wrap gap-2">
          {asignados.map((a) => (
            <span
              key={a.barrio_id}
              className={'rounded-full px-3 py-1 text-sm ' + (a.habilitado ? 'bg-gg-light text-gg-dark' : 'bg-amber-50 text-amber-700')}
            >
              {a.nombre} · {a.habilitado ? 'habilitado' : 'pendiente de validación'}
            </span>
          ))}
        </div>
      )}

      {disponibles.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px]">
            <Campo label="Sumar otro barrio">
              <select className={inputClass} value={barrioId} onChange={(e) => setBarrioId(e.target.value)}>
                <option value="">Elegí un barrio…</option>
                {disponibles.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <button
            type="button"
            onClick={agregar}
            disabled={agregando || !barrioId}
            className="rounded-lg bg-gg-green px-4 py-2 text-sm font-medium text-white hover:bg-gg-dark disabled:opacity-60"
          >
            {agregando ? 'Agregando…' : '+ Sumar barrio'}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
