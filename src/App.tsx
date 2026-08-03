import { useState, type ReactNode } from 'react'
import Administracion from './Administracion'
import PropietarioDirectorio from './PropietarioDirectorio'
import JardineroOnboarding from './JardineroOnboarding'

const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY
type Vista = 'propietario' | 'jardinero' | 'admin'

export default function App() {
  const [vista, setVista] = useState<Vista>('propietario')
  const configIncompleta = !ANON || ANON === 'TU_ANON_KEY_ACA'

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-gg-green text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">🌿 GreenGate</div>
          <nav className="flex gap-1 rounded-lg bg-white/10 p-1 text-sm">
            <Tab activo={vista === 'propietario'} onClick={() => setVista('propietario')}>
              Propietario
            </Tab>
            <Tab activo={vista === 'jardinero'} onClick={() => setVista('jardinero')}>
              Jardinero
            </Tab>
            <Tab activo={vista === 'admin'} onClick={() => setVista('admin')}>
              Administración
            </Tab>
          </nav>
        </div>
      </header>

      {configIncompleta && (
        <div className="border-b border-amber-300 bg-amber-50 px-6 py-3 text-center text-sm text-amber-800">
          Falta conectar Supabase: completá <code>VITE_SUPABASE_ANON_KEY</code> en <code>.env</code>.
        </div>
      )}

      {vista === 'propietario' && <PropietarioDirectorio />}
      {vista === 'jardinero' && <JardineroOnboarding />}
      {vista === 'admin' && <Administracion />}
    </div>
  )
}

function Tab({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        'rounded-md px-3 py-1.5 transition ' +
        (activo ? 'bg-white font-medium text-gg-dark' : 'text-white/90 hover:bg-white/10')
      }
    >
      {children}
    </button>
  )
}
