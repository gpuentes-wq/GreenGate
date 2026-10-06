import { useState, type ReactNode } from 'react'

// El link personal del jardinero. Hoy, para ver si le llegaron solicitudes,
// tiene que abrir la app, elegir "soy jardinero" y buscarse en una lista. Con
// este link es un toque desde favoritos o desde un WhatsApp guardado. No es una
// notificación, pero baja tanto el costo de revisar que cambia la frecuencia —
// que es el problema real mientras no exista un canal de aviso.
//
// No expone nada nuevo: sin login, cualquiera puede elegir cualquier perfil de
// esa misma lista. Cuando haya Supabase Auth, este link pasa a ser la invitación
// y deja de dar acceso por sí solo.
export function linkAcceso(prestadorId: string): string {
  return `${window.location.origin}/?jardinero=${prestadorId}`
}

export function BotonCopiar({
  valor,
  className,
  title,
  children = 'Copiar',
}: {
  valor: string
  className?: string
  title?: string
  children?: ReactNode
}) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // El portapapeles no está disponible en http ni en navegadores viejos.
      // No se avisa nada: el campo de al lado queda seleccionable para copiar
      // a mano, que es el mismo resultado con un paso más.
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      title={title}
      className={className ?? 'shrink-0 rounded-lg bg-gg-green px-3 py-2 text-sm font-medium text-white hover:bg-gg-dark'}
    >
      {copiado ? '¡Copiado!' : children}
    </button>
  )
}

export function Insignia({ ok, label }: { ok: boolean; label: string }) {
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

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
      {children}
    </div>
  )
}

export const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gg-green focus:outline-none focus:ring-1 focus:ring-gg-green'

export function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  )
}

// Interruptor de encendido/apagado. Para cosas que se prenden y se apagan
// seguido (disponibilidad, habilitación) un switch lee mejor que un checkbox:
// se ve el estado de un vistazo, sin leer la etiqueta.
export function Switch({
  activo,
  onCambiar,
  etiqueta,
}: {
  activo: boolean
  onCambiar: (valor: boolean) => void
  etiqueta: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={() => onCambiar(!activo)}
      className={'relative h-6 w-11 shrink-0 rounded-full transition ' + (activo ? 'bg-gg-green' : 'bg-gray-300')}
    >
      <span
        className={
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ' + (activo ? 'left-5' : 'left-0.5')
        }
      />
    </button>
  )
}

export function Tarjeta({
  titulo,
  valor,
  acento,
  onClick,
}: {
  titulo: string
  valor: string | number
  acento?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={
        'w-full rounded-lg border border-gray-200 bg-white p-4 text-left ' +
        (onClick ? 'cursor-pointer transition hover:border-gg-green' : 'cursor-default')
      }
    >
      <div className="text-sm text-gray-500">{titulo}</div>
      <div className={'mt-1 text-2xl font-semibold ' + (acento ? 'text-amber-600' : 'text-gg-dark')}>{valor}</div>
    </button>
  )
}

// Pestaña de navegación dentro de una pantalla. Vive acá y no en el archivo
// de un rol porque la usan el jardinero y el propietario: si cada uno tuviera
// su copia, la navegación se vería distinta según quién entra.
export function SubTab({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ' +
        (activo ? 'border-gg-green text-gg-dark' : 'border-transparent text-gray-500 hover:text-gray-700')
      }
    >
      {children}
    </button>
  )
}

export function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gg-dark">{titulo}</h3>
          <button onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
