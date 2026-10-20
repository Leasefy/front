'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CommandMenu, type CommandGroup } from '@leasefy/cadence'

import { NAV_ITEMS } from '@/components/admin/Nav'
import { SECCIONES_DEL_ADMIN, datosDeLaPantalla } from '@/lib/admin/menu-del-admin'

/** Sin tildes ni mayúsculas: «exogena» encuentra «Exógena». */
function plano(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * El buscador de pantallas del admin (⌘K / Ctrl K): el `CommandMenu` de
 * Cadence con las 40 pantallas agrupadas por sección. Se abre desde «Buscar
 * una pantalla» de la barra, desde la lupa de la cabecera en el celular o con
 * el atajo. Busca por nombre, por lo que hay adentro y por la sección.
 */
export function BuscadorDelAdmin({
  abierto,
  onAbierto,
}: {
  abierto: boolean
  onAbierto: (abierto: boolean) => void
}) {
  const router = useRouter()
  const [consulta, setConsulta] = useState('')

  // ⌘K / Ctrl K abre y cierra. Escape lo cierra el propio diálogo.
  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onAbierto(!abierto)
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [abierto, onAbierto])

  // Al cerrar, lo escrito se borra: la próxima vez abre con todo.
  useEffect(() => {
    if (!abierto) setConsulta('')
  }, [abierto])

  const grupos = useMemo<CommandGroup[]>(() => {
    const q = plano(consulta.trim())
    const pantallas = NAV_ITEMS.map((item) => ({ item, datos: datosDeLaPantalla(item) }))
    const nombreDeSeccion = (clave: string | null) =>
      clave ? SECCIONES_DEL_ADMIN.find((s) => s.clave === clave)?.nombre ?? '' : 'Inicio'
    const calza = (x: (typeof pantallas)[number]) =>
      !q || plano(`${x.datos.nombre} ${x.datos.queHay} ${nombreDeSeccion(x.datos.seccion)}`).includes(q)

    const orden: Array<string | null> = [null, ...SECCIONES_DEL_ADMIN.map((s) => s.clave)]
    return orden
      .map((clave) => ({
        label: nombreDeSeccion(clave),
        items: pantallas
          .filter((x) => x.datos.seccion === clave && calza(x))
          .map(({ item, datos }) => {
            const Icono = datos.icono
            return {
              id: item.href,
              label: datos.nombre,
              meta: datos.queHay,
              icon: <Icono className="h-4 w-4" />,
              onSelect: () => router.push(item.href),
            }
          }),
      }))
      .filter((g) => g.items.length > 0)
  }, [consulta, router])

  return (
    <CommandMenu
      open={abierto}
      onOpenChange={onAbierto}
      placeholder="Buscar una pantalla del admin…"
      groups={grupos}
      searchValue={consulta}
      onSearch={setConsulta}
    />
  )
}
