'use client'

import { usePathname } from 'next/navigation'

import { NAV_ITEMS } from '@/components/admin/Nav'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { nombreDeLaSeccion, pantallaDeLaRuta } from '@/lib/admin/menu-del-admin'

/**
 * El encabezado de una pantalla del admin: el MISMO `EncabezadoDePantalla` de
 * las pantallas del panel de la inmobiliaria (glow up, 22-10-2026). Arriba a la
 * izquierda, dónde estoy (la sección del menú, en mono), el título y UNA línea
 * de para qué sirve la pantalla; arriba a la derecha, de lo más callado a lo
 * más fuerte: la ayuda, las secundarias y la acción principal (la única azul).
 *
 * Sin `label`, el rótulo es la sección del menú a la que pertenece la ruta
 * («Cobranza», «Sistema»…).
 *
 * `right` se conserva para las pantallas que todavía no separan la principal
 * de las secundarias: va como secundarias.
 */
export function PageHeader({
  label,
  title,
  description,
  right,
  principal,
  acciones,
  ayuda,
  junto,
  'data-testid': testId,
}: {
  label?: string
  title: React.ReactNode
  /** UNA línea: para qué sirve la pantalla. */
  description?: React.ReactNode
  /** Secundarias (como `acciones`); se conserva por compatibilidad. */
  right?: React.ReactNode
  /** La acción que más se hace aquí: un `Button size="sm"` (el único azul). */
  principal?: React.ReactNode
  /** Acciones de apoyo (`outline`/`secondary`, `size="sm"`). */
  acciones?: React.ReactNode
  /** El «¿Cómo funciona?» de la pantalla, callado y primero. */
  ayuda?: React.ReactNode
  /** Algo que acompaña al título (una insignia de estado). */
  junto?: React.ReactNode
  'data-testid'?: string
}) {
  const ruta = usePathname() ?? '/admin'
  const pantalla = pantallaDeLaRuta(ruta, NAV_ITEMS)
  const rotulo = label ?? (pantalla ? nombreDeLaSeccion(pantalla.seccion) : null) ?? 'Admin de Leasefy'
  const secundarias =
    acciones || right ? (
      <>
        {acciones}
        {right}
      </>
    ) : undefined
  return (
    <EncabezadoDePantalla
      seccion={rotulo}
      titulo={title}
      descripcion={description}
      acciones={secundarias}
      accionPrincipal={principal}
      ayuda={ayuda}
      junto={junto}
      data-testid={testId}
    />
  )
}
