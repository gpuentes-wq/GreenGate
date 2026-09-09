import { useState } from 'react'
import Administracion from './Administracion'
import PropietarioDirectorio from './PropietarioDirectorio'
import JardineroOnboarding from './JardineroOnboarding'
import { SeleccionRol, type DestinoRol } from './SeleccionRol'
import { DejarResena } from './DejarResena'

const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

// El jardinero le pasa al vecino un link con el id de la solicitud
// (?resena=<id>). Es la única entrada a la app que no pasa por elegir un rol:
// el vecino toca desde WhatsApp y cae directo en el formulario.
//
// Se lee una sola vez al arrancar. Si después navega, el parámetro deja de
// importar — no hay router, y agregar uno por una pantalla sería desproporcionado.
function resenaDeLaUrl(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('resena')
  } catch {
    return null
  }
}

// La app arranca preguntando quién sos (SeleccionRol) en vez de caer en una
// vista por defecto. El destino ya viene resuelto — qué barrio, qué perfil —
// así la pantalla siguiente no tiene que volver a preguntarlo.
type Vista = { tipo: 'inicio' } | { tipo: 'resena'; solicitudId: string } | DestinoRol

export default function App() {
  const [vista, setVista] = useState<Vista>(() => {
    const solicitudId = resenaDeLaUrl()
    return solicitudId ? { tipo: 'resena', solicitudId } : { tipo: 'inicio' }
  })
  const configIncompleta = !ANON || ANON === 'TU_ANON_KEY_ACA'
  const enInicio = vista.tipo === 'inicio'

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-gg-green text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <button
            type="button"
            onClick={() => setVista({ tipo: 'inicio' })}
            className="flex items-center gap-2 font-semibold"
          >
            🌿 GreenGate
          </button>
          {!enInicio && (
            <button
              type="button"
              onClick={() => setVista({ tipo: 'inicio' })}
              className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/20"
            >
              Cambiar de rol
            </button>
          )}
        </div>
      </header>

      {configIncompleta && (
        <div className="border-b border-amber-300 bg-amber-50 px-6 py-3 text-center text-sm text-amber-800">
          Falta conectar Supabase: completá <code>VITE_SUPABASE_ANON_KEY</code> en <code>.env</code>.
        </div>
      )}

      {vista.tipo === 'resena' && (
        <main className="mx-auto max-w-xl px-6 py-8">
          <DejarResena solicitudId={vista.solicitudId} />
        </main>
      )}
      {vista.tipo === 'inicio' && <SeleccionRol onElegir={(destino) => setVista(destino)} />}
      {vista.tipo === 'propietario' && <PropietarioDirectorio barrioInicial={vista.barrioId} />}
      {vista.tipo === 'jardinero' && <JardineroOnboarding prestadorInicial={vista.prestadorId} />}
      {vista.tipo === 'admin' && <Administracion />}
    </div>
  )
}
