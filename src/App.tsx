import { useState } from 'react'
import Administracion from './Administracion'
import PropietarioDirectorio from './PropietarioDirectorio'
import JardineroOnboarding from './JardineroOnboarding'
import { SeleccionRol, type DestinoRol } from './SeleccionRol'
import { DejarResena } from './DejarResena'

const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

// El barrio de demostración (supabase/seed-barrio-demo.sql). Está aislado a
// propósito: sus jardineros son ficticios y sus celulares no existen, así que
// nada de lo que haga un visitante llega a una persona real ni ensucia el
// puntaje de los prestadores del piloto.
const BARRIO_DEMO = 'dd000000-0000-0000-0000-000000000001'

// Dos entradas a la app que no pasan por elegir rol, las dos por querystring.
// Se leen una sola vez al arrancar: después el parámetro deja de importar, y
// agregar un router por dos casos sería desproporcionado.
//
//   ?resena=<id>  el jardinero se lo pasa al vecino por WhatsApp
//   ?demo         el link público de la landing, para probar la app
function param(nombre: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(nombre)
  } catch {
    return null
  }
}

// La app arranca preguntando quién sos (SeleccionRol) en vez de caer en una
// vista por defecto. El destino ya viene resuelto — qué barrio, qué perfil —
// así la pantalla siguiente no tiene que volver a preguntarlo.
type Vista = { tipo: 'inicio' } | { tipo: 'resena'; solicitudId: string } | DestinoRol

export default function App() {
  // El modo demo se fija al arrancar y no se apaga: es lo que encierra al
  // visitante en la vista de propietario. Si se pudiera salir, terminaría en
  // el panel de un jardinero real viendo sus solicitudes.
  const [demo] = useState(() => param('demo') !== null)
  const [vista, setVista] = useState<Vista>(() => {
    const solicitudId = param('resena')
    if (solicitudId) return { tipo: 'resena', solicitudId }
    if (param('demo') !== null) return { tipo: 'propietario', barrioId: BARRIO_DEMO }
    return { tipo: 'inicio' }
  })
  const configIncompleta = !ANON || ANON === 'TU_ANON_KEY_ACA'
  const enInicio = vista.tipo === 'inicio'

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-gg-green text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          {/* En demo el logo no navega: es la otra puerta de salida hacia la
              selección de rol, y dejarla abierta vaciaría de sentido ocultar
              el botón de al lado. */}
          {demo ? (
            <span className="flex items-center gap-2 font-semibold">🌿 GreenGate</span>
          ) : (
            <button
              type="button"
              onClick={() => setVista({ tipo: 'inicio' })}
              className="flex items-center gap-2 font-semibold"
            >
              🌿 GreenGate
            </button>
          )}
          {!enInicio && !demo && (
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

      {/* Decirlo de frente, y antes de que pruebe nada: alguien podría creer
          que contrató a un jardinero de verdad. */}
      {demo && (
        <div className="border-b border-amber-300 bg-amber-50 px-6 py-3 text-center text-sm text-amber-800">
          Estás probando GreenGate con un <strong>barrio de demostración</strong>. Los jardineros y las
          reseñas son ficticios: nadie recibe tus mensajes ni va a ir a tu casa.
        </div>
      )}

      {vista.tipo === 'resena' && (
        <main className="mx-auto max-w-xl px-6 py-8">
          <DejarResena solicitudId={vista.solicitudId} />
        </main>
      )}
      {vista.tipo === 'inicio' && <SeleccionRol onElegir={(destino) => setVista(destino)} />}
      {vista.tipo === 'propietario' && <PropietarioDirectorio barrioInicial={vista.barrioId} demo={demo} />}
      {vista.tipo === 'jardinero' && <JardineroOnboarding prestadorInicial={vista.prestadorId} />}
      {vista.tipo === 'admin' && <Administracion />}
    </div>
  )
}
