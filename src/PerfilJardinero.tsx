import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Especialidad, Valoracion } from './types'
import { servicioLabel } from './labels'
import { Insignia, EmptyState } from './ui'
import { badgesPrestador, type VerificacionRow, type IntegranteRow } from './verificacion'

type PrestadorCompleto = {
  id: string
  nombre: string
  apellido: string | null
  razon_social: string | null
  es_empresa: boolean
  tipo_servicio_principal: string
  descripcion: string | null
  anios_experiencia: number | null
  tarifa_referencia: number | null
}

export function PerfilJardinero({ prestadorId, onVolver }: { prestadorId: string; onVolver: () => void }) {
  const [prestador, setPrestador] = useState<PrestadorCompleto | null>(null)
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [valoraciones, setValoraciones] = useState<Valoracion[]>([])
  const [verifs, setVerifs] = useState<VerificacionRow[]>([])
  const [integrantes, setIntegrantes] = useState<IntegranteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      setError(null)
      const [p, e, v, ver, integ] = await Promise.all([
        supabase
          .from('prestador')
          .select('id,nombre,apellido,razon_social,es_empresa,tipo_servicio_principal,descripcion,anios_experiencia,tarifa_referencia')
          .eq('id', prestadorId)
          .single(),
        supabase.from('prestador_servicio').select('prestador_id,tipo,tarifa').eq('prestador_id', prestadorId),
        supabase
          .from('valoracion')
          .select('id,prestador_id,puntaje,puntaje_calidad,puntaje_puntualidad,puntaje_comunicacion,puntaje_precio,comentario,respuesta_prestador,created_at')
          .eq('prestador_id', prestadorId)
          .order('created_at', { ascending: false }),
        supabase.from('verificacion').select('tipo,estado,fecha_vencimiento,integrante_id').eq('prestador_id', prestadorId),
        supabase.from('integrante').select('id,activo').eq('prestador_id', prestadorId),
      ])
      const err = p.error || e.error || v.error || ver.error || integ.error
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }
      setPrestador(p.data as PrestadorCompleto)
      setEspecialidades((e.data as Especialidad[]) ?? [])
      setValoraciones((v.data as Valoracion[]) ?? [])
      setVerifs((ver.data as VerificacionRow[]) ?? [])
      setIntegrantes((integ.data as IntegranteRow[]) ?? [])
      setLoading(false)
    }
    cargar()
  }, [prestadorId])

  if (loading) return <p className="text-gray-500">Cargando…</p>
  if (error) return <p className="text-sm text-red-600">No se pudo cargar el perfil: {error}</p>
  if (!prestador) return <EmptyState>No se encontró este prestador.</EmptyState>

  const nombre = prestador.es_empresa && prestador.razon_social ? prestador.razon_social : `${prestador.nombre}${prestador.apellido ? ' ' + prestador.apellido : ''}`
  const badges = badgesPrestador(verifs, integrantes)
  const puntajePromedio = valoraciones.length > 0 ? Math.round((valoraciones.reduce((acc, v) => acc + v.puntaje, 0) / valoraciones.length) * 10) / 10 : null

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <button type="button" onClick={onVolver} className="mb-4 text-sm font-medium text-gg-green hover:underline">
        ← Volver al listado
      </button>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{nombre}</h1>
            <p className="text-sm text-gray-500">{servicioLabel(prestador.tipo_servicio_principal)}</p>
          </div>
          {badges.antecedentes && badges.seguro && badges.identidad && (
            <span className="shrink-0 rounded-full bg-gg-light px-2 py-1 text-xs font-medium text-gg-dark">✓ Verificado</span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-1 text-sm">
          {puntajePromedio != null ? (
            <>
              <span className="text-amber-500">★</span>
              <span className="font-medium">{puntajePromedio}</span>
              <span className="text-gray-400">({valoraciones.length} reseñas)</span>
            </>
          ) : (
            <span className="text-gray-400">Sin reseñas aún</span>
          )}
        </div>

        {prestador.descripcion && <p className="mt-4 text-sm text-gray-700">{prestador.descripcion}</p>}

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
          {prestador.anios_experiencia != null && <span>{prestador.anios_experiencia} años de experiencia</span>}
          {prestador.tarifa_referencia != null && (
            <span>Desde ARS {prestador.tarifa_referencia.toLocaleString('es-AR')} por mes</span>
          )}
        </div>

        {especialidades.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 text-sm font-medium text-gray-700">También ofrece</div>
            <div className="flex flex-wrap gap-2">
              {especialidades.map((e, i) => (
                <span key={i} className="rounded-full bg-gg-light px-3 py-1 text-sm text-gg-dark">
                  {servicioLabel(e.tipo)}
                </span>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Estos servicios se cotizan según lo que necesites: pedile un presupuesto.
            </div>
          </div>
        )}

        <div className="mt-5">
          <div className="mb-2 text-sm font-medium text-gray-700">Documentación verificada</div>
          <div className="flex flex-wrap gap-2">
            <Insignia ok={badges.antecedentes} label="Antecedentes" />
            <Insignia ok={badges.seguro} label="Seguro" />
            <Insignia ok={badges.identidad} label="Identidad" />
          </div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Reseñas ({valoraciones.length})</h2>
        {valoraciones.length === 0 ? (
          <EmptyState>Todavía no tiene reseñas.</EmptyState>
        ) : (
          <div className="space-y-3">
            {valoraciones.map((v) => (
              <div key={v.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-amber-500">{'★'.repeat(v.puntaje)}</span>
                  <span className="text-gray-400">{new Date(v.created_at).toLocaleDateString('es-AR')}</span>
                </div>
                {v.comentario && <p className="mt-2 text-sm text-gray-700">{v.comentario}</p>}
                {v.respuesta_prestador && (
                  <p className="mt-2 rounded-md bg-gray-50 p-2 text-sm text-gray-600">
                    <span className="font-medium">Respuesta del prestador: </span>
                    {v.respuesta_prestador}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-gray-400">
          Vas a poder dejar tu propia reseña acá una vez que confirmes un trabajo con este prestador — disponible cuando esté el login.
        </p>
      </section>
    </main>
  )
}
