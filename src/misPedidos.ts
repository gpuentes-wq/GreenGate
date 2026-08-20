// Sin login todavía, el propietario no tiene identidad en la base: cuando pide
// un presupuesto deja nombre y celular sueltos y se va. Para que pueda volver a
// ver las respuestas, guardamos los ids de sus pedidos en este navegador.
//
// Es deliberadamente provisorio y tiene los límites obvios: se pierde al
// cambiar de dispositivo o al limpiar el navegador. Alcanza para el caso real
// del piloto — pedir y volver a mirar un rato después, en el mismo teléfono —
// y evita bloquear todo el flujo de presupuestos detrás del login, que es un
// trabajo bastante más grande (ver docs/spec-propietario.md).
//
// Cuando exista Supabase Auth, esto se reemplaza por una consulta filtrada por
// propietario_id y el archivo desaparece.

const CLAVE = 'greengate.pedidos'

export function misPedidos(): string[] {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return []
    const lista = JSON.parse(crudo)
    return Array.isArray(lista) ? lista.filter((x) => typeof x === 'string') : []
  } catch {
    // localStorage puede fallar (modo privado, cuota llena, JSON corrupto).
    // No es motivo para romper la pantalla: se sigue sin historial.
    return []
  }
}

export function recordarPedido(pedidoId: string) {
  try {
    const actuales = misPedidos()
    if (actuales.includes(pedidoId)) return
    localStorage.setItem(CLAVE, JSON.stringify([pedidoId, ...actuales]))
  } catch {
    // Ídem: si no se puede guardar, el pedido igual se creó en la base.
  }
}
