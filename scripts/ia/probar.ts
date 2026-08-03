// Script de prueba por consola para iterar sobre la extracción sin tocar la app.
// Uso: npm run ia:probar -- "texto que escribiría el propietario"
// Sin argumento, corre un par de ejemplos fijos (jardinería general y poda).

import { extraerPedido } from './extraer-pedido'

const EJEMPLOS = [
  'Necesito que me corten el pasto, hace tiempo que no lo hago y está bastante crecido. Es un jardín mediano.',
  'Tengo un árbol grande que está tapando la luz, necesito que le saquen unas ramas. No sé bien la altura pero es alto.',
]

async function correrEjemplo(texto: string) {
  console.log('\n=== Texto del propietario ===')
  console.log(texto)
  try {
    const resultado = await extraerPedido({ texto })
    console.log('\n--- Resultado ---')
    console.log(JSON.stringify(resultado, null, 2))
  } catch (err) {
    console.error('\n--- Error ---')
    console.error(err instanceof Error ? err.message : err)
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Falta ANTHROPIC_API_KEY en el .env — completala antes de correr este script.')
    process.exit(1)
  }

  const argumento = process.argv.slice(2).join(' ').trim()
  const textos = argumento ? [argumento] : EJEMPLOS

  for (const texto of textos) {
    await correrEjemplo(texto)
  }
}

main()
