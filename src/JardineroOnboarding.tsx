import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { Campo, inputClass } from './ui'
import { servicioLabel } from './labels'
import { SolicitudesPanel } from './SolicitudesPanel'
import { JardineroPanel } from './JardineroPanel'
import { IntegrantesManager } from './IntegrantesManager'
import { BarriosManager } from './BarriosManager'

const SERVICIOS = ['jardineria', 'poda', 'fumigacion', 'riego', 'diseno_paisajismo', 'limpieza_exterior', 'otro']

const CONDICIONES = [
  { v: '', l: 'Prefiero completarlo después' },
  { v: 'informal', l: 'Informal' },
  { v: 'monotributo', l: 'Monotributo' },
  { v: 'responsable_inscripto', l: 'Responsable inscripto' },
]

type Seccion = 'panel' | 'perfil' | 'equipo' | 'solicitudes'

const TITULOS: Record<Seccion, string> = {
  panel: 'Tu panel',
  perfil: 'Editá tu perfil',
  equipo: 'Tu equipo',
  solicitudes: 'Tus solicitudes',
}
const SUBTITULOS: Record<Seccion, string> = {
  panel: 'Todo lo que necesitás para gestionar tu trabajo en GreenGate, de un vistazo.',
  perfil: 'Actualizá tus datos. Los cambios se reflejan en el directorio al instante.',
  equipo: 'Si trabajás con otras personas, sumalas acá para que cada una tenga su propia verificación.',
  solicitudes: 'Pedidos de contacto que te dejaron los propietarios.',
}

type BarrioOpt = { id: string; nombre: string }
// prestadorInicial llega de la pantalla de selección de rol: si trae un id, se
// entra directo al panel de ese jardinero; si es null, al alta de perfil nuevo.
export default function JardineroOnboarding({ prestadorInicial = null }: { prestadorInicial?: string | null }) {
  const [barrios, setBarrios] = useState<BarrioOpt[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [seccion, setSeccion] = useState<Seccion>('panel')

  const [esEmpresa, setEsEmpresa] = useState(false)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [celular, setCelular] = useState('')
  const [email, setEmail] = useState('')
  const [domicilio, setDomicilio] = useState('')
  const [servicioPrincipal, setServicioPrincipal] = useState('jardineria')
  const [especialidades, setEspecialidades] = useState<string[]>([])
  const [experiencia, setExperiencia] = useState('')
  const [tarifa, setTarifa] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cuit, setCuit] = useState('')
  const [condicion, setCondicion] = useState('')
  const [barrioId, setBarrioId] = useState('')
  const [disponibleUrgencia, setDisponibleUrgencia] = useState(false)

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)
  // Id del perfil recién creado, para poder entrar a su panel desde el "¡Tu perfil se creó!".
  const [creadoId, setCreadoId] = useState<string | null>(null)
  const [okEditar, setOkEditar] = useState(false)

  useEffect(() => {
    supabase.from('barrio').select('id,nombre').order('nombre').then(({ data }) => setBarrios((data as BarrioOpt[]) ?? []))
    if (prestadorInicial) seleccionar(prestadorInicial)
  }, [prestadorInicial])

  function reiniciar() {
    setEditId(null)
    setSeccion('panel')
    setEsEmpresa(false)
    setNombre('')
    setApellido('')
    setRazonSocial('')
    setCelular('')
    setEmail('')
    setDomicilio('')
    setServicioPrincipal('jardineria')
    setEspecialidades([])
    setExperiencia('')
    setTarifa('')
    setDescripcion('')
    setCuit('')
    setCondicion('')
    setBarrioId('')
    setDisponibleUrgencia(false)
    setError(null)
    setExito(false)
    setCreadoId(null)
    setOkEditar(false)
  }

  async function seleccionar(id: string) {
    if (!id) {
      reiniciar()
      return
    }
    setError(null)
    setOkEditar(false)
    setSeccion('panel')
    const [{ data: p }, { data: esp }] = await Promise.all([
      supabase.from('prestador').select('*').eq('id', id).single(),
      supabase.from('prestador_servicio').select('tipo').eq('prestador_id', id),
    ])
    if (!p) {
      setError('No se pudo cargar el perfil')
      return
    }
    const pr = p as Record<string, unknown>
    setEditId(id)
    setEsEmpresa(Boolean(pr.es_empresa))
    setNombre((pr.nombre as string) ?? '')
    setApellido((pr.apellido as string) ?? '')
    setRazonSocial((pr.razon_social as string) ?? '')
    setCelular((pr.celular as string) ?? '')
    setEmail((pr.email as string) ?? '')
    setDomicilio((pr.domicilio as string) ?? '')
    setServicioPrincipal((pr.tipo_servicio_principal as string) ?? 'jardineria')
    setEspecialidades(((esp as { tipo: string }[]) ?? []).map((e) => e.tipo))
    setExperiencia(pr.anios_experiencia != null ? String(pr.anios_experiencia) : '')
    setTarifa(pr.tarifa_referencia != null ? String(pr.tarifa_referencia) : '')
    setDescripcion((pr.descripcion as string) ?? '')
    setCuit((pr.cuit_cuil as string) ?? '')
    setCondicion((pr.condicion_fiscal as string) ?? '')
    setBarrioId('')
    setDisponibleUrgencia(Boolean(pr.disponible_urgencia))
    setExito(false)
  }

  function toggleEsp(t: string) {
    setEspecialidades((es) => (es.includes(t) ? es.filter((x) => x !== t) : [...es, t]))
  }

  // "Abierto a servicios de urgencia" solo aplica a jardinería general.
  const ofreceJardineriaGeneral = servicioPrincipal === 'jardineria' || especialidades.includes('jardineria')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('Tu nombre es obligatorio')
      return
    }
    if (!celular.trim()) {
      setError('Un teléfono de contacto es obligatorio')
      return
    }
    setGuardando(true)
    setError(null)
    setOkEditar(false)

    const base = {
      nombre: nombre.trim(),
      apellido: apellido.trim() || null,
      razon_social: esEmpresa ? razonSocial.trim() || null : null,
      es_empresa: esEmpresa,
      celular: celular.trim(),
      email: email.trim() || null,
      domicilio: domicilio.trim() || null,
      cuit_cuil: cuit.trim() || null,
      condicion_fiscal: condicion || null,
      tipo_servicio_principal: servicioPrincipal,
      descripcion: descripcion.trim() || null,
      anios_experiencia: experiencia ? Number(experiencia) : null,
      tarifa_referencia: tarifa ? Number(tarifa) : null,
      disponible_urgencia: ofreceJardineriaGeneral ? disponibleUrgencia : false,
    }
    const espSel = especialidades.filter((t) => t !== servicioPrincipal)

    if (editId) {
      const { error: uErr } = await supabase.from('prestador').update(base).eq('id', editId)
      if (uErr) {
        setGuardando(false)
        setError(uErr.message)
        return
      }
      await supabase.from('prestador_servicio').delete().eq('prestador_id', editId)
      if (espSel.length > 0) {
        await supabase.from('prestador_servicio').insert(espSel.map((t) => ({ prestador_id: editId, tipo: t })))
      }
      setGuardando(false)
      setOkEditar(true)
      return
    }

    const { data, error: pErr } = await supabase
      .from('prestador')
      .insert({ ...base, activo: true })
      .select('id')
      .single()
    if (pErr || !data) {
      setGuardando(false)
      setError(pErr?.message ?? 'No se pudo crear el perfil')
      return
    }
    const prestadorId = (data as { id: string }).id

    if (espSel.length > 0) {
      await supabase.from('prestador_servicio').insert(espSel.map((t) => ({ prestador_id: prestadorId, tipo: t })))
    }
    if (barrioId) {
      await supabase.from('prestador_barrio').insert({ prestador_id: prestadorId, barrio_id: barrioId, habilitado: false })
      await supabase.from('verificacion').insert([
        { prestador_id: prestadorId, barrio_id: barrioId, tipo: 'antecedentes_penales', estado: 'pendiente' },
        { prestador_id: prestadorId, barrio_id: barrioId, tipo: 'seguro_art', estado: 'pendiente' },
        { prestador_id: prestadorId, barrio_id: barrioId, tipo: 'identidad', estado: 'pendiente' },
      ])
    }
    setGuardando(false)
    setCreadoId(prestadorId)
    setExito(true)
  }

  if (exito) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12 text-center">
        <div className="rounded-xl border border-gg-light bg-gg-light/40 p-8">
          <div className="text-4xl">🌿</div>
          <h1 className="mt-3 text-xl font-semibold text-gg-dark">¡Tu perfil se creó!</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
            {barrioId
              ? 'La administración del barrio va a revisar tus documentos (antecedentes, seguro e identidad). Cuando te validen, vas a aparecer como verificado en el directorio.'
              : 'Ya estás en el directorio. Más adelante sumá un barrio y tus documentos para que te validen y destaquen.'}
          </p>
          <button
            onClick={() => creadoId && seleccionar(creadoId)}
            className="mt-5 rounded-lg bg-gg-green px-4 py-2 text-sm font-medium text-white hover:bg-gg-dark"
          >
            Ir a mi panel
          </button>
        </div>
      </main>
    )
  }

  const titulo = !editId ? 'Sumate como jardinero' : TITULOS[seccion]
  const subtitulo = !editId
    ? 'Creá tu perfil gratis. No necesitás estar formalizado para empezar — eso es opcional.'
    : SUBTITULOS[seccion]

  const ancho = editId && seccion === 'panel' ? 'max-w-5xl' : 'max-w-2xl'

  return (
    <main className={'mx-auto px-6 py-8 ' + ancho}>
      <h1 className="text-xl font-semibold text-gg-dark">{titulo}</h1>
      <p className="mb-6 text-sm text-gray-500">{subtitulo}</p>

      {editId && (
        <div className="mb-6 flex gap-1 border-b border-gray-200">
          <SubTab activo={seccion === 'panel'} onClick={() => setSeccion('panel')}>
            Mi panel
          </SubTab>
          <SubTab activo={seccion === 'perfil'} onClick={() => setSeccion('perfil')}>
            Mi perfil
          </SubTab>
          <SubTab activo={seccion === 'equipo'} onClick={() => setSeccion('equipo')}>
            Mi equipo
          </SubTab>
          <SubTab activo={seccion === 'solicitudes'} onClick={() => setSeccion('solicitudes')}>
            Solicitudes
          </SubTab>
        </div>
      )}

      {editId && seccion === 'panel' ? (
        <JardineroPanel
          prestadorId={editId}
          onVerSolicitudes={() => setSeccion('solicitudes')}
          onEditarPerfil={() => setSeccion('perfil')}
          onVerEquipo={() => setSeccion('equipo')}
        />
      ) : editId && seccion === 'equipo' ? (
        <IntegrantesManager prestadorId={editId} />
      ) : editId && seccion === 'solicitudes' ? (
        <SolicitudesPanel prestadorId={editId} />
      ) : (
        <>
          {!editId && <PanelPreview />}

          {okEditar && (
            <div className="mb-6 rounded-lg border border-gg-light bg-gg-light/50 p-3 text-sm font-medium text-gg-dark">
              ✓ Cambios guardados.
            </div>
          )}

          <form onSubmit={enviar} className="space-y-6">
            <fieldset className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
              <legend className="px-1 text-sm font-semibold text-gg-dark">Tus datos</legend>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={esEmpresa}
                  onChange={(e) => setEsEmpresa(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Soy una empresa
              </label>
              {esEmpresa && (
                <Campo label="Razón social">
                  <input className={inputClass} value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />
                </Campo>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Campo label={esEmpresa ? 'Nombre del contacto *' : 'Nombre *'}>
                  <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </Campo>
                <Campo label="Apellido">
                  <input className={inputClass} value={apellido} onChange={(e) => setApellido(e.target.value)} />
                </Campo>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Celular *">
                  <input className={inputClass} value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="+54 9 11 ..." />
                </Campo>
                <Campo label="Email">
                  <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
                </Campo>
              </div>
              <Campo label="Domicilio">
                <input className={inputClass} value={domicilio} onChange={(e) => setDomicilio(e.target.value)} />
              </Campo>
            </fieldset>

            <fieldset className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
              <legend className="px-1 text-sm font-semibold text-gg-dark">Tus servicios</legend>
              {/* Fijo en esta etapa: GreenGate arranca solo con jardinería. Se muestra el
                  valor guardado (no una constante) para no pisar el rubro de un prestador
                  que ya tuviera otro. Cuando se sumen rubros, vuelve a ser un desplegable. */}
              <Campo label="Servicio principal">
                <div className={inputClass + ' bg-gray-50 text-gray-500'}>{servicioLabel(servicioPrincipal)}</div>
                <span className="mt-1 block text-xs text-gray-500">
                  Por ahora GreenGate arranca solo con jardinería. Los demás servicios los sumás abajo.
                </span>
              </Campo>
              {/* Van pegados al servicio principal: la tarifa es su precio de referencia. */}
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Años de experiencia">
                  <input type="number" min="0" className={inputClass} value={experiencia} onChange={(e) => setExperiencia(e.target.value)} />
                </Campo>
                <Campo label="Tarifa de referencia mensual (ARS)">
                  <input type="number" min="0" className={inputClass} value={tarifa} onChange={(e) => setTarifa(e.target.value)} />
                </Campo>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-700">Servicios adicionales</span>
                <span className="mb-2 block text-xs text-gray-500">
                  No llevan precio fijo: los cotizás en cada pedido, según lo que necesite el cliente.
                </span>
                <div className="flex flex-wrap gap-2">
                  {SERVICIOS.filter((s) => s !== servicioPrincipal).map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => toggleEsp(s)}
                      className={
                        'rounded-full border px-3 py-1 text-sm transition ' +
                        (especialidades.includes(s)
                          ? 'border-gg-green bg-gg-light text-gg-dark'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50')
                      }
                    >
                      {servicioLabel(s)}
                    </button>
                  ))}
                </div>
              </div>
              {ofreceJardineriaGeneral && (
                <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={disponibleUrgencia}
                    onChange={(e) => setDisponibleUrgencia(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300"
                  />
                  <span>
                    <span className="font-medium">Abierto a servicios de urgencia</span>
                    <span className="block text-xs text-gray-500">
                      Solo para jardinería general. Podés cambiarlo cuando quieras desde tu panel.
                    </span>
                  </span>
                </label>
              )}
              <Campo label="Presentación / bio">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Contá en qué te destacás..."
                />
              </Campo>
            </fieldset>

            <fieldset className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
              <legend className="px-1 text-sm font-semibold text-gg-dark">
                Formalización <span className="font-normal text-gray-400">(opcional)</span>
              </legend>
              <p className="text-xs text-gray-500">
                No es obligatorio para empezar. Podés completarlo cuando quieras para acceder a más beneficios.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="CUIT / CUIL">
                  <input className={inputClass} value={cuit} onChange={(e) => setCuit(e.target.value)} />
                </Campo>
                <Campo label="Condición fiscal">
                  <select className={inputClass} value={condicion} onChange={(e) => setCondicion(e.target.value)}>
                    {CONDICIONES.map((c) => (
                      <option key={c.v} value={c.v}>
                        {c.l}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>
            </fieldset>

            {!editId ? (
              <fieldset className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
                <legend className="px-1 text-sm font-semibold text-gg-dark">¿Dónde querés trabajar?</legend>
                <Campo label="Barrio (opcional)">
                  <select className={inputClass} value={barrioId} onChange={(e) => setBarrioId(e.target.value)}>
                    <option value="">Elegir más adelante</option>
                    {barrios.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nombre}
                      </option>
                    ))}
                  </select>
                </Campo>
                {barrioId && (
                  <p className="text-xs text-gray-500">
                    Le vamos a pedir a la administración que valide tus documentos (antecedentes, seguro e identidad) para ese barrio.
                  </p>
                )}
              </fieldset>
            ) : (
              <fieldset className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
                <legend className="px-1 text-sm font-semibold text-gg-dark">Barrios donde trabajás</legend>
                <BarriosManager prestadorId={editId} />
              </fieldset>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={guardando}
              className="w-full rounded-lg bg-gg-green px-4 py-3 text-sm font-medium text-white hover:bg-gg-dark disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : editId ? 'Guardar cambios' : 'Crear mi perfil'}
            </button>
          </form>
        </>
      )}
    </main>
  )
}

// Vista previa del panel que va a tener el jardinero apenas se sume, con
// datos de ejemplo (no reales). Se muestra antes de completar el alta,
// para que sepa qué va a ganar antes de tener que llenar el formulario.
function PanelPreview() {
  return (
    <div className="mb-6 rounded-xl border border-dashed border-gray-300 p-4">
      <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
        Vista previa · así se va a ver tu panel
      </span>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-xs text-gray-400">Tu puntaje</div>
          <div className="text-lg font-semibold text-gray-400">★ 4.8</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-xs text-gray-400">Clientes activos</div>
          <div className="text-lg font-semibold text-gray-400">6</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-xs text-gray-400">Presupuestos realizados</div>
          <div className="text-lg font-semibold text-gray-400">9</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-xs text-gray-400">Servicios activos</div>
          <div className="text-lg font-semibold text-gray-400">3</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Vas a ver tus solicitudes, tu reputación y tu negocio de un vistazo. Completá tus datos abajo para empezar.
      </p>
    </div>
  )
}

function SubTab({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: string }) {
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
