import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import type { PrestadorDirectorio, Especialidad } from './types'
import { servicioLabel } from './labels'
import { Insignia, EmptyState } from './ui'
import { ContactarModal } from './ContactarModal'
import { badgesPrestador, prestadorVerificado, type VerificacionRow } from './verificacion'

type Extra = { tarifa: number | null; experiencia: number | null }

export default function PropietarioDirectorio() {
  const [prestadores, setPrestadores] = useState<PrestadorDirectorio[]>([])
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [extras, setExtras] = useState<Record<string, Extra>>({})
  const [fotos, setFotos] = useState<Record<string, string[]>>({})
  const [verifs, setVerifs] = useState<Record<string, VerificacionRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [soloVerificados, setSoloVerificados] = useState(false)
  const [enviados, setEnviados] = useState<Record<string, boolean>>({})
  const [contactar, setContactar] = useState<{ id: string; nombre: string } | null>(null)
  const [lightbox, setLightbox] = useState<{ fotos: string[]; i: number } | null>(null)

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      setError(null)
      const [p, e, x, f, v] = await Promise.all([
        supabase.from('prestador_directorio').select('*'),
        supabase.from('prestador_servicio').select('prestador_id,tipo,tarifa'),
        supabase.from('prestador').select('id,tarifa_referencia,anios_experiencia'),
        supabase.from('prestador_foto').select('prestador_id,url,orden').order('orden'),
        supabase.from('verificacion').select('prestador_id,tipo,estado,fecha_vencimiento'),
      ])
      const err = p.error || e.error || x.error || v.error
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }
      setPrestadores((p.data as PrestadorDirectorio[]) ?? [])
      setEspecialidades((e.data as Especialidad[]) ?? [])
      const map: Record<string, Extra> = {}
      const filas = (x.data as Array<{ id: string; tarifa_referencia: number | null; anios_experiencia: number | null }>) ?? []
      for (const r of filas) map[r.id] = { tarifa: r.tarifa_referencia, experiencia: r.anios_experiencia }
      setExtras(map)
      const fmap: Record<string, string[]> = {}
      const frows = (f.data as Array<{ prestador_id: string; url: string; orden: number }>) ?? []
      for (const r of frows) {
        if (!fmap[r.prestador_id]) fmap[r.prestador_id] = []
        fmap[r.prestador_id].push(r.url)
      }
      setFotos(fmap)
      const vmap: Record<string, VerificacionRow[]> = {}
      const vrows = (v.data as Array<{ prestador_id: string } & VerificacionRow>) ?? []
      for (const r of vrows) {
        if (!vmap[r.prestador_id]) vmap[r.prestador_id] = []
        vmap[r.prestador_id].push({ tipo: r.tipo, estado: r.estado, fecha_vencimiento: r.fecha_vencimiento })
      }
      setVerifs(vmap)
      setLoading(false)
    }
    cargar()
  }, [])

  const espPorPrestador = useMemo(() => {
    const m: Record<string, string[]> = {}
    for (const e of especialidades) {
      if (!m[e.prestador_id]) m[e.prestador_id] = []
      m[e.prestador_id].push(e.tipo)
    }
    return m
  }, [especialidades])

  const lista = useMemo(() => {
    let l = [...prestadores]
    if (soloVerificados) {
      l = l.filter((p) => prestadorVerificado(verifs[p.id] ?? []))
    }
    return l.sort((a, b) => (b.puntaje_promedio ?? -1) - (a.puntaje_promedio ?? -1))
  }, [prestadores, soloVerificados, verifs])

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-xl font-semibold text-gg-dark">Encontrá tu jardinero</h1>
      <p className="mb-6 text-sm text-gray-500">
        Jardineros verificados por la administración de tu barrio. Compará puntaje, especialidad y precio.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={soloVerificados}
            onChange={(e) => setSoloVerificados(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Solo verificados
        </label>
        <span className="text-sm text-gray-400">{lista.length} jardineros</span>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          No se pudieron cargar los datos: {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : lista.length === 0 ? (
        <EmptyState>No hay jardineros que coincidan con el filtro.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((p) => {
            const nombre = p.es_empresa && p.razon_social ? p.razon_social : `${p.nombre}${p.apellido ? ' ' + p.apellido : ''}`
            const badges = badgesPrestador(verifs[p.id] ?? [])
            const verificado = badges.antecedentes && badges.seguro && badges.identidad
            const esp = espPorPrestador[p.id] ?? []
            const ex = extras[p.id]
            const fotosP = fotos[p.id] ?? []
            return (
              <div key={p.id} className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-gray-900">{nombre}</div>
                    <div className="text-sm text-gray-500">
                      {servicioLabel(p.tipo_servicio_principal)}
                      {p.zona_preferente ? ` · ${p.zona_preferente}` : ''}
                    </div>
                  </div>
                  {verificado && (
                    <span className="shrink-0 rounded-full bg-gg-light px-2 py-1 text-xs font-medium text-gg-dark">
                      ✓ Verificado
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-1 text-sm">
                  {p.puntaje_promedio != null ? (
                    <>
                      <span className="text-amber-500">★</span>
                      <span className="font-medium">{p.puntaje_promedio}</span>
                      <span className="text-gray-400">({p.cantidad_valoraciones} reseñas)</span>
                    </>
                  ) : (
                    <span className="text-gray-400">Sin reseñas aún</span>
                  )}
                </div>

                {p.descripcion && <p className="mt-3 text-sm text-gray-600">{p.descripcion}</p>}

                {esp.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {esp.map((t) => (
                      <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {servicioLabel(t)}
                      </span>
                    ))}
                  </div>
                )}

                {fotosP.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {fotosP.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt="Trabajo anterior"
                        loading="lazy"
                        onClick={() => setLightbox({ fotos: fotosP, i })}
                        onError={(ev) => {
                          ev.currentTarget.style.display = 'none'
                        }}
                        className="h-16 w-24 shrink-0 cursor-pointer rounded-lg object-cover transition hover:opacity-80"
                      />
                    ))}
                  </div>
                )}

                {ex && (ex.tarifa != null || ex.experiencia != null) && (
                  <div className="mt-3 text-sm text-gray-700">
                    {ex.tarifa != null && (
                      <span>
                        Desde <strong>ARS {ex.tarifa.toLocaleString('es-AR')}</strong>
                      </span>
                    )}
                    {ex.experiencia != null && (
                      <span className="text-gray-400">
                        {ex.tarifa != null ? ' · ' : ''}
                        {ex.experiencia} años de experiencia
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-1">
                  <Insignia ok={badges.antecedentes} label="Antecedentes" />
                  <Insignia ok={badges.seguro} label="Seguro" />
                  <Insignia ok={badges.identidad} label="Identidad" />
                </div>

                <div className="mt-4">
                  {enviados[p.id] ? (
                    <div className="rounded-lg bg-gg-light px-3 py-2 text-center text-sm font-medium text-gg-dark">
                      Solicitud enviada ✓
                    </div>
                  ) : (
                    <button
                      onClick={() => setContactar({ id: p.id, nombre })}
                      className="w-full rounded-lg bg-gg-green px-3 py-2 text-sm font-medium text-white transition hover:bg-gg-dark"
                    >
                      Contactar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {contactar && (
        <ContactarModal
          prestadorId={contactar.id}
          prestadorNombre={contactar.nombre}
          onClose={() => setContactar(null)}
          onEnviado={() => {
            setEnviados((e) => ({ ...e, [contactar.id]: true }))
            setContactar(null)
          }}
        />
      )}

      {lightbox && (
        <Lightbox
          fotos={lightbox.fotos}
          i={lightbox.i}
          onClose={() => setLightbox(null)}
          onIndex={(i) => setLightbox((lb) => (lb ? { fotos: lb.fotos, i } : null))}
        />
      )}
    </main>
  )
}

function Lightbox({
  fotos,
  i,
  onClose,
  onIndex,
}: {
  fotos: string[]
  i: number
  onClose: () => void
  onIndex: (i: number) => void
}) {
  const prev = () => onIndex((i - 1 + fotos.length) % fotos.length)
  const next = () => onIndex((i + 1) % fotos.length)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && fotos.length > 1) prev()
      else if (e.key === 'ArrowRight' && fotos.length > 1) next()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 top-4 text-3xl leading-none text-white/80 hover:text-white"
      >
        ✕
      </button>
      {fotos.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            prev()
          }}
          aria-label="Anterior"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-4xl text-white/80 hover:text-white"
        >
          ‹
        </button>
      )}
      <img
        src={fotos[i]}
        alt="Trabajo anterior"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
      />
      {fotos.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            next()
          }}
          aria-label="Siguiente"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-4xl text-white/80 hover:text-white"
        >
          ›
        </button>
      )}
      {fotos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/70">
          {i + 1} / {fotos.length}
        </div>
      )}
    </div>
  )
}
