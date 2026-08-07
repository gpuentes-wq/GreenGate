import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from './lib/supabase'
import { inputClass } from './ui'

type BarrioOpt = { id: string; nombre: string }
type PrestadorLite = { id: string; nombre: string; apellido: string | null; razon_social: string | null; es_empresa: boolean }

function nombreJardinero(j: PrestadorLite): string {
  if (j.es_empresa && j.razon_social) return j.razon_social
  return j.apellido ? `${j.nombre} ${j.apellido}` : j.nombre
}

// Puerta de entrada de la app: en vez de caer en una vista por defecto y tener
// que entender las pestañas, el usuario dice quién es y desde ahí se arma el
// resto. Propietario y jardinero necesitan además saber "cuál" son (qué barrio,
// qué perfil) — mientras no haya login, eso se elige acá, en un segundo paso.
export type DestinoRol =
  | { tipo: 'admin' }
  | { tipo: 'propietario'; barrioId: string }
  | { tipo: 'jardinero'; prestadorId: string | null }

export function SeleccionRol({ onElegir }: { onElegir: (destino: DestinoRol) => void }) {
  const [paso, setPaso] = useState<'rol' | 'propietario' | 'jardinero'>('rol')
  const [barrios, setBarrios] = useState<BarrioOpt[]>([])
  const [jardineros, setJardineros] = useState<PrestadorLite[]>([])
  const [barrioId, setBarrioId] = useState('')
  const [prestadorId, setPrestadorId] = useState('')

  useEffect(() => {
    supabase
      .from('barrio')
      .select('id,nombre')
      .order('nombre')
      .then(({ data }) => setBarrios((data as BarrioOpt[]) ?? []))
    supabase
      .from('prestador')
      .select('id,nombre,apellido,razon_social,es_empresa')
      .order('nombre')
      .then(({ data }) => setJardineros((data as PrestadorLite[]) ?? []))
  }, [])

  if (paso === 'propietario') {
    return (
      <Paso titulo="¿En qué barrio vivís?" texto="Vas a ver los jardineros habilitados por la administración de ese barrio." onVolver={() => setPaso('rol')}>
        <select className={inputClass} value={barrioId} onChange={(e) => setBarrioId(e.target.value)}>
          <option value="">Elegí tu barrio…</option>
          {barrios.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!barrioId}
          onClick={() => onElegir({ tipo: 'propietario', barrioId })}
          className="mt-4 w-full rounded-lg bg-gg-green px-4 py-2 text-sm font-medium text-white transition hover:bg-gg-dark disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Ver jardineros de mi barrio
        </button>
      </Paso>
    )
  }

  if (paso === 'jardinero') {
    return (
      <Paso titulo="¿Cuál es tu perfil?" texto="Elegí tu perfil para entrar a tu panel." onVolver={() => setPaso('rol')}>
        <select className={inputClass} value={prestadorId} onChange={(e) => setPrestadorId(e.target.value)}>
          <option value="">Elegí tu perfil…</option>
          {jardineros.map((j) => (
            <option key={j.id} value={j.id}>
              {nombreJardinero(j)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!prestadorId}
          onClick={() => onElegir({ tipo: 'jardinero', prestadorId })}
          className="mt-4 w-full rounded-lg bg-gg-green px-4 py-2 text-sm font-medium text-white transition hover:bg-gg-dark disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Entrar a mi panel
        </button>
        <button
          type="button"
          onClick={() => onElegir({ tipo: 'jardinero', prestadorId: null })}
          className="mt-3 w-full rounded-lg border border-gg-green px-4 py-2 text-sm font-medium text-gg-green transition hover:bg-gg-light"
        >
          Soy nuevo, quiero registrarme
        </button>
      </Paso>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-center text-2xl font-semibold text-gg-dark">¿Cómo querés entrar?</h1>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm text-gray-500">
        Elegí tu rol para ver la pantalla que te corresponde.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CajaRol icono="🏘️" titulo="Soy Administrador" texto="Validá prestadores y gestioná tu barrio." onClick={() => onElegir({ tipo: 'admin' })} />
        <CajaRol icono="👤" titulo="Soy Propietario" texto="Buscá un jardinero verificado en tu barrio." onClick={() => setPaso('propietario')} />
        <CajaRol icono="🌿" titulo="Soy Jardinero" texto="Gestioná tu perfil, tus barrios y tus solicitudes." onClick={() => setPaso('jardinero')} />
      </div>
    </main>
  )
}

function CajaRol({ icono, titulo, texto, onClick }: { icono: string; titulo: string; texto: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-gray-200 bg-white p-6 text-left transition hover:border-gg-green hover:shadow-sm"
    >
      <div className="text-3xl">{icono}</div>
      <div className="mt-3 font-semibold text-gg-dark">{titulo}</div>
      <div className="mt-1 text-sm text-gray-500">{texto}</div>
    </button>
  )
}

function Paso({ titulo, texto, onVolver, children }: { titulo: string; texto: string; onVolver: () => void; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <button type="button" onClick={onVolver} className="mb-4 text-sm font-medium text-gg-green hover:underline">
        ← Volver
      </button>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-gg-dark">{titulo}</h1>
        <p className="mb-4 mt-1 text-sm text-gray-500">{texto}</p>
        {children}
      </div>
    </main>
  )
}
