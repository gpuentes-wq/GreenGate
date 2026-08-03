import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { ESQUEMA_POR_SERVICIO, TOPE_PREGUNTAS, type CampoServicio, type TipoServicio } from './schema-servicios'

const MODELO = 'claude-opus-5'

const TIPOS_SERVICIO = Object.keys(ESQUEMA_POR_SERVICIO) as [TipoServicio, ...TipoServicio[]]

const client = new Anthropic()

export type ResultadoExtraccion = {
  tipo_servicio: TipoServicio
  detalle_estructurado: Record<string, string | null>
  preguntas_pendientes: string[]
}

// Paso 1: clasificar el tipo de servicio a partir del texto libre.
// Esquema chico (un solo enum) — se salta si ya vino un tipoServicioHint.
const ClasificacionSchema = z.object({
  tipo_servicio: z.enum(TIPOS_SERVICIO),
})

async function clasificarTipoServicio(texto: string): Promise<TipoServicio> {
  const catalogo = Object.keys(ESQUEMA_POR_SERVICIO).join(', ')
  const message = await client.beta.messages.parse({
    model: MODELO,
    max_tokens: 512,
    system: `Sos el asistente de GreenGate. Clasificá el pedido de un propietario en una de estas categorías de servicio de jardinería: ${catalogo}. Si no encaja claramente en ninguna, usá "otro".`,
    messages: [{ role: 'user', content: texto }],
    output_format: betaZodOutputFormat(ClasificacionSchema),
  })
  const resultado = message.parsed_output
  if (!resultado) {
    throw new Error(`La IA no pudo clasificar el pedido (stop_reason: ${message.stop_reason})`)
  }
  return resultado.tipo_servicio
}

// Paso 2: dado el tipo de servicio, armar un schema SOLO con los campos de
// esa categoría (nunca más de 7 — muy por debajo del límite de 16 campos
// nullable que impone la API) y extraer el detalle + preguntas pendientes.
function armarSchemaDetalle(campos: CampoServicio[]) {
  const shape = Object.fromEntries(campos.map((c) => [c.campo, z.string().nullable()]))
  return z.object({
    detalle_estructurado: z.object(shape),
    preguntas_pendientes: z.array(z.string()),
  })
}

function armarSystemPromptDetalle(tipoServicio: TipoServicio, campos: CampoServicio[]): string {
  const listado = campos.map((c) => `- ${c.campo}: ${c.pregunta}`).join('\n')
  const ejemploCampo = campos[0]

  return `Sos el asistente de GreenGate que ayuda a un propietario a describir un trabajo de "${tipoServicio}" para que un prestador pueda cotizarlo.

Campos de esta categoría y la pregunta asociada a cada uno:
${listado}

Tu tarea:
1. En "detalle_estructurado" usá EXACTAMENTE estos nombres de campo como claves. Completá con un valor corto (una palabra o frase breve, no hace falta citar textual) todo lo que puedas inferir o deducir razonablemente del texto del propietario — no dejes en null algo que el texto ya sugiere. Usá null solo para lo que genuinamente no se menciona ni se puede deducir.
2. En "preguntas_pendientes" incluí ÚNICAMENTE las preguntas — copiadas tal cual del listado de arriba — de los campos que quedaron en null. No inventes preguntas nuevas. Nunca más de ${TOPE_PREGUNTAS}.
3. No inventes datos que el propietario no dio.

Ejemplo: si el texto menciona algo relacionado a "${ejemploCampo.campo}", ese campo NO debe quedar en null — completalo con lo que se pueda deducir, aunque no sea una cita textual.`
}

export async function extraerPedido(input: {
  texto: string
  tipoServicioHint?: TipoServicio
}): Promise<ResultadoExtraccion> {
  const tipoServicio = input.tipoServicioHint ?? (await clasificarTipoServicio(input.texto))
  const campos = ESQUEMA_POR_SERVICIO[tipoServicio]

  const message = await client.beta.messages.parse({
    model: MODELO,
    max_tokens: 2048,
    system: armarSystemPromptDetalle(tipoServicio, campos),
    messages: [{ role: 'user', content: input.texto }],
    output_format: betaZodOutputFormat(armarSchemaDetalle(campos)),
  })

  const resultado = message.parsed_output
  if (!resultado) {
    throw new Error(`La IA no devolvió una extracción válida (stop_reason: ${message.stop_reason})`)
  }

  return {
    tipo_servicio: tipoServicio,
    detalle_estructurado: resultado.detalle_estructurado,
    preguntas_pendientes: resultado.preguntas_pendientes.slice(0, TOPE_PREGUNTAS),
  }
}
