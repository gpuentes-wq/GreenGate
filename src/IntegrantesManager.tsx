import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { Campo, inputClass, EmptyState } from './ui'

type Integrante = { id: string; nombre: string; apellido: string | null; documento: string | null; activo: boolean }

// Gestión de integrantes de un prestador-equipo. Un prestador unipersonal
// no necesita usar esto — apenas se agrega el primer integrante, el
// prestador pasa a comportarse como equipo (ver verificacion.ts).
export function IntegrantesManager({ prestadorId }: { prestadorId: string }) {
  const [integrantes, setIntegrantes] = useState<Integrante[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [documento, setDocumento] = useState('')
  const [agregando, setAgregando] = useState(false)

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('integrante')
      .select('id,nombre,apellido,documento,activo')
      .eq('prestador_id', prestadorId)
      .order('nombre')
    if (error) setError(error.message)
    else setIntegrantes((data as Integrante[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    cargar()
  }, [prestadorId])

  async function agregar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setAgregando(true)
    setError(null)
    const { data, error: iErr } = await supabase
      .from('integrante')
      .insert({ prestador_id: prestadorId, nombre: nombre.trim(), apellido: apellido.trim() || null, documento: documento.trim() || null })
      .select('id')
      .single()
    if (iErr || !data) {
      setAgregando(false)
      setError(iErr?.message ?? 'No se pudo agregar')
      return
    }
    const integranteId = (data as { id: string }).id
    // Cada integrante necesita sus propias verificaciones de antecedentes e
    // identidad — el seguro/ART sigue siendo del equipo, no se repite acá.
    await supabase.from('verificacion').insert([
      { prestador_id: prestadorId, integrante_id: integranteId, tipo: 'antecedentes_penales', estado: 'pendiente' },
      { prestador_id: prestadorId, integrante_id: integranteId, tipo: 'identidad', estado: 'pendiente' },
    ])
    setNombre('')
    setApellido('')
    setDocumento('')
    setAgregando(false)
    cargar()
  }

  async function toggleActivo(integ: Integrante) {
    setIntegrantes((is) => is.map((i) => (i.id === integ.id ? { ...i, activo: !i.activo } : i)))
    await supabase.from('integrante').update({ activo: !integ.activo }).eq('id', integ.id)
  }

  if (loading) return <p className="text-gray-500">Cargando…</p>

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Si trabajás solo, no hace falta que cargues nada acá — tu perfil ya representa a la persona
        verificada. Sumá integrantes solo si trabajás en equipo: cada uno va a tener sus propias
        verificaciones de antecedentes e identidad (el seguro sigue siendo uno solo, del equipo).
      </p>

      {integrantes.length === 0 ? (
        <EmptyState>Todavía no sumaste integrantes.</EmptyState>
      ) : (
        <div className="space-y-2">
          {integrantes.map((i) => (
            <div key={i.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
              <div>
                <div className={'text-sm font-medium ' + (i.activo ? 'text-gray-800' : 'text-gray-400 line-through')}>
                  {i.nombre}
                  {i.apellido ? ` ${i.apellido}` : ''}
                </div>
                {i.documento && <div className="text-xs text-gray-400">DNI {i.documento}</div>}
              </div>
              <button
                type="button"
                onClick={() => toggleActivo(i)}
                className="text-xs font-medium text-gg-green hover:underline"
              >
                {i.activo ? 'Dar de baja' : 'Reactivar'}
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={agregar} className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gg-dark">Sumar integrante</h3>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Nombre *">
            <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
          <Campo label="Apellido">
            <input className={inputClass} value={apellido} onChange={(e) => setApellido(e.target.value)} />
          </Campo>
        </div>
        <Campo label="DNI (opcional)">
          <input className={inputClass} value={documento} onChange={(e) => setDocumento(e.target.value)} />
        </Campo>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={agregando}
          className="rounded-lg bg-gg-green px-4 py-2 text-sm font-medium text-white hover:bg-gg-dark disabled:opacity-60"
        >
          {agregando ? 'Agregando…' : '+ Agregar integrante'}
        </button>
      </form>
    </div>
  )
}
