'use client'

/**
 * useLinksDeCobriQueNoSePagaron — los links de pago de Cobri cuyo pago la
 * pasarela no aprobó o que vencieron sin pago, para «Pagos fallidos»
 * (COBRI-7, QA de los agentes en el lab, 16-10-2026).
 *
 * «Pagos fallidos» leía sólo la cola de trabajo del agente de pagos, que nada
 * llena: con un pago de Cobri rechazado decía «0 · Sin pagos fallidos» mientras
 * la pantalla de Cobri decía «Pago fallido». La fuente de verdad del link de
 * cada cuota es el back (`GET /inmobiliaria/cobros/links`, por mes y estado).
 *
 * Mira el mes anterior, el corriente y el siguiente (`mesTopeDeLosLinks`): la
 * cuota que vence el 1 del mes que viene ya tiene link este mes, y una de hace
 * dos meses ya la lleva cobranza. Si una lectura falla se dice, nunca «0».
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { payuApi } from '@/lib/api/payu.service'
import { mesActual, sumarMeses } from '@/lib/recaudo/meses'
import type { EstadoDelLinkDePago, LinkDePagoDeCuota } from '@/lib/types/payu'

const ESTADOS: readonly EstadoDelLinkDePago[] = ['fallido', 'vencido']
/** Por mes y estado: más de esto es una inmobiliaria con otro problema, y se dice. */
const POR_LECTURA = 50

export interface LinksQueNoSePagaron {
  items: LinkDePagoDeCuota[]
  /** Cuántos hay de verdad (puede pasar de `items` si alguna lectura topó). */
  total: number
  cargando: boolean
  error: unknown
  recargar: () => Promise<void>
}

/** Los meses que se miran, del más viejo al más nuevo. */
export function mesesQueSeMiran(hoy: string = mesActual()): string[] {
  return [sumarMeses(hoy, -1), hoy, sumarMeses(hoy, 1)]
}

export function useLinksDeCobriQueNoSePagaron(): LinksQueNoSePagaron {
  const [estado, setEstado] = useState<Omit<LinksQueNoSePagaron, 'recargar'>>({
    items: [],
    total: 0,
    cargando: true,
    error: null,
  })
  const ultimo = useRef(0)

  const recargar = useCallback(async () => {
    const n = ++ultimo.current
    setEstado((s) => ({ ...s, cargando: true, error: null }))
    try {
      const paginas = await Promise.all(
        mesesQueSeMiran().flatMap((mes) =>
          ESTADOS.map((e) => payuApi.links({ mes, estado: e, page: 1, limit: POR_LECTURA })),
        ),
      )
      if (n !== ultimo.current) return
      const items = paginas
        .flatMap((p) => p.items)
        .sort((a, b) => a.fechaDeVencimiento.localeCompare(b.fechaDeVencimiento))
      setEstado({ items, total: paginas.reduce((s, p) => s + p.total, 0), cargando: false, error: null })
    } catch (error) {
      if (n !== ultimo.current) return
      setEstado((s) => ({ ...s, cargando: false, error }))
    }
  }, [])

  useEffect(() => {
    void recargar()
    const contador = ultimo
    return () => {
      contador.current++
    }
  }, [recargar])

  return { ...estado, recargar }
}
