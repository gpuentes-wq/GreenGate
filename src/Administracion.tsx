import { useState } from 'react'
import { AdminBarrioPanel } from './AdminBarrioPanel'
import AdminPanel from './AdminPanel'

export default function Administracion() {
  const [vista, setVista] = useState<'barrio' | 'multibarrio'>('barrio')

  if (vista === 'multibarrio') {
    return <AdminPanel onVolver={() => setVista('barrio')} />
  }
  return <AdminBarrioPanel onVerMultibarrio={() => setVista('multibarrio')} />
}
