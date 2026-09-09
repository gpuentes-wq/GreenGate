import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Especialidad, Valoracion } from './types'
import { servicioLabel } from './labels'
import { Insignia, EmptyState } from './ui'
import { badgesPrestador, type VerificacionRow, type IntegranteRow } from './verificacion'

// El barrio no está en `valoracion`: se trae de la solicitud que le dio origen.
// PostgREST tipa el embebido muchos-a-uno como array aunque en runtime llegue un
// objeto, así que se contemplan las dos formas.
type ValoracionConSolicitud = Valoracion & {
  solicitud: { barrio_id: string | null } | { barrio_id: string | null }[] | null
}
type ValoracionConBarrio = Valoracion & { barrio_id: string | null }

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
  const [valoraciones, setValoraciones] = useState<ValoracionConBarrio[]>([])
  const [nombreBarrio, setNombreBarrio] = useState<Record<string, string>>({})
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
          .select('id,prestador_id,puntaje,puntaje_calidad,puntaje_puntualidad,puntaje_comunicacion,puntaje_precio,comentario,respuesta_prestador,created_at,solicitud(barrio_id)')
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
      // La reseña se firma con el barrio, no con el nombre: lo que le da peso
      // frente a otro vecino es que sea de su misma comunidad. Y el nombre se
      // pidió para que el jardinero supiera quién pedía, no para publicarlo —
      // usarlo acá sería otra finalidad (Ley 25.326).
      const filasV = ((v.data as unknown as ValoracionConSolicitud[]) ?? []).map((fila) => {
        const { solicitud, ...resto } = fila
        const sol = Array.isArray(solicitud) ? solicitud[0] ?? null : solicitud
        return { ...resto, barrio_id: sol?.barrio_id ?? null }
      })
      setValoraciones(filasV)

      // Nombres de los barrios que aparecen en las reseñas.
      const barrioIds = [...new Set(filasV.map((x) => x.barrio_id).filter((x): x is string => !!x))]
      if (barrioIds.length > 0) {
        const { data: bData } = await supabase.from('barrio').select('id,nombre').in('id', barrioIds)
        const mapa: Record<string, string> = {}
        for (const b of (bData as Array<{ id: string; nombre: string }>) ?? []) mapa[b.id] = b.nombre
        setNombreBarrio(mapa)
      }
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
              Estos servicios se cotizan según lo que necesites: pedile una visita y lo hablás con él.
            </div>
          </div>
        )}

        <div className="mt-5">
          <div className="mb-2 text-sm font-medium text-gray-700">Documentación</div>
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
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-amber-500">{'★'.repeat(v.puntaje)}</span>
                  <span className="text-gray-600">
                    {v.barrio_id && nombreBarrio[v.barrio_id]
                      ? `Un vecino de ${nombreBarrio[v.barrio_id]}`
                      : 'Un vecino'}
                  </span>
                  <span className="text-gray-400">· {new Date(v.created_at).toLocaleDateString('es-AR')}</span>
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
        {/* La reseña no se deja acá: se deja desde "Mis pedidos", sobre el
            jardinero que elegiste. Este perfil lo mira cualquiera, así que un
            formulario suelto acá no tendría cómo saber si trataste con él. */}
        <p className="mt-4 text-xs text-gray-400">
          Las reseñas las dejan los vecinos que contrataron a este jardinero por GreenGate. Si lo elegiste para un
          pedido, vas a encontrar el formulario en “Mis pedidos”.
        </p>
      </section>
    </main>
  )
}
