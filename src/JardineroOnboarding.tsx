import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { Campo, inputClass } from './ui'
import { servicioLabel } from './labels'

const SERVICIOS = ['jardineria', 'poda', 'fumigacion', 'riego', 'diseno_paisajismo', 'limpieza_exterior', 'otro']

const CONDICIONES = [
  { v: '', l: 'Prefiero completarlo después' },
  { v: 'informal', l: 'Informal' },
  { v: 'monotributo', l: 'Monotributo' },
  { v: 'responsable_inscripto', l: 'Responsable inscripto' },
]

type BarrioOpt = { id: string; nombre: string }
type PrestadorLite = { id: string; nombre: string; apellido: string | null; razon_social: string | null; es_empresa: boolean }

function nombreJardinero(j: PrestadorLite): string {
  if (j.es_empresa && j.razon_social) return j.razon_social
  return j.apellido ? `${j.nombre} ${j.apellido}` : j.nombre
}

export default function JardineroOnboarding() {
  const [barrios, setBarrios] = useState<BarrioOpt[]>([])
  const [jardineros, setJardineros] = useState<PrestadorLite[]>([])
  const [editId, setEditId] = useState<string | null>(null)

  const [esEmpresa, setEsEmpresa] = useState(false)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [celular, setCelular] = useState('')
  const [email, setEmail] = useState('')
  const [domicilio, setDomicilio] = useState('')
  const [servicioPrincipal, setServicioPrincipal] = useState('jardineria')
  const [especialidades, setEspecialidades] = useState<string[]>([])
  const [zona, setZona] = useState('GBA Norte')
  const [horario, setHorario] = useState('')
  const [experiencia, setExperiencia] = useState('')
  const [tarifa, setTarifa] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cuit, setCuit] = useState('')
  const [condicion, setCondicion] = useState('')
  const [barrioId, setBarrioId] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)
  const [okEditar, setOkEditar] = useState(false)

  useEffect(() => {
    supabase.from('barrio').select('id,nombre').order('nombre').then(({ data }) => setBarrios((data as BarrioOpt[]) ?? []))
    cargarJardineros()
  }, [])

  async function cargarJardineros() {
    const { data } = await supabase
      .from('prestador')
      .select('id,nombre,apellido,razon_social,es_empresa')
      .order('nombre')
    setJardineros((data as PrestadorLite[]) ?? [])
  }

  function reiniciar() {
    setEditId(null)
    setEsEmpresa(false)
    setNombre('')
    setApellido('')
    setRazonSocial('')
    setCelular('')
    setEmail('')
    setDomicilio('')
    setServicioPrincipal('jardineria')
    setEspecialidades([])
    setZona('GBA Norte')
    setHorario('')
    setExperiencia('')
    setTarifa('')
    setDescripcion('')
    setCuit('')
    setCondicion('')
    setBarrioId('')
    setError(null)
    setExito(false)
    setOkEditar(false)
  }

  async function seleccionar(id: string) {
    if (!id) {
      reiniciar()
      return
    }
    setError(null)
    setOkEditar(false)
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
    setZona((pr.zona_preferente as string) ?? '')
    setHorario((pr.horario_trabajo as string) ?? '')
    setExperiencia(pr.anios_experiencia != null ? String(pr.anios_experiencia) : '')
    setTarifa(pr.tarifa_referencia != null ? String(pr.tarifa_referencia) : '')
    setDescripcion((pr.descripcion as string) ?? '')
    setCuit((pr.cuit_cuil as string) ?? '')
    setCondicion((pr.condicion_fiscal as string) ?? '')
    setBarrioId('')
    setExito(false)
  }

  function toggleEsp(t: string) {
    setEspecialidades((es) => (es.includes(t) ? es.filter((x) => x !== t) : [...es, t]))
  }

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
      zona_preferente: zona.trim() || null,
      horario_trabajo: horario.trim() || null,
      descripcion: descripcion.trim() || null,
      anios_experiencia: experiencia ? Number(experiencia) : null,
      tarifa_referencia: tarifa ? Number(tarifa) : null,
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
      cargarJardineros()
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
    setExito(true)
    cargarJardineros()
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
            onClick={reiniciar}
            className="mt-5 rounded-lg bg-gg-green px-4 py-2 text-sm font-medium text-white hover:bg-gg-dark"
          >
            Cargar otro jardinero
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-xl font-semibold text-gg-dark">{editId ? 'Editá tu perfil' : 'Sumate como jardinero'}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {editId
          ? 'Actualizá tus datos. Los cambios se reflejan en el directorio al instante.'
          : 'Creá tu perfil gratis. No necesitás estar formalizado para empezar — eso es opcional.'}
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
        <span className="text-sm text-gray-600">¿Ya tenés perfil?</span>
        <select value={editId ?? ''} onChange={(e) => seleccionar(e.target.value)} className={inputClass + ' max-w-xs'}>
          <option value="">— Crear perfil nuevo —</option>
          {jardineros.map((j) => (
            <option key={j.id} value={j.id}>
              {nombreJardinero(j)}
            </option>
          ))}
        </select>
        {editId && (
          <button type="button" onClick={reiniciar} className="text-sm font-medium text-gg-green hover:underline">
            + Crear nuevo
          </button>
        )}
      </div>

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
          <legend className="px-1 text-sm font-semibold text-gg-dark">Tu servicio</legend>
          <Campo label="Servicio principal">
            <select className={inputClass} value={servicioPrincipal} onChange={(e) => setServicioPrincipal(e.target.value)}>
              {SERVICIOS.map((s) => (
                <option key={s} value={s}>
                  {servicioLabel(s)}
                </option>
              ))}
            </select>
          </Campo>
          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">Especialidades adicionales</span>
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
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Zona preferente">
              <input className={inputClass} value={zona} onChange={(e) => setZona(e.target.value)} />
            </Campo>
            <Campo label="Horario">
              <input className={inputClass} value={horario} onChange={(e) => setHorario(e.target.value)} placeholder="Lun-Vie 8-17" />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Años de experiencia">
              <input type="number" min="0" className={inputClass} value={experiencia} onChange={(e) => setExperiencia(e.target.value)} />
            </Campo>
            <Campo label="Tarifa de referencia (ARS)">
              <input type="number" min="0" className={inputClass} value={tarifa} onChange={(e) => setTarifa(e.target.value)} />
            </Campo>
          </div>
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

        {!editId && (
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
    </main>
  )
}
