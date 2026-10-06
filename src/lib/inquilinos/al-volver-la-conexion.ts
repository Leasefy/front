'use client';

import { useEffect, useRef } from 'react';

import { useEstadoDeConexion } from '@/lib/conexion/estado-de-conexion';

/**
 * XE-01 (QA-INQ-95 ronda 2, 05-10-2026): con el back caído la lista de
 * Inquilinos dice «Los datos siguen ahí; apenas vuelva la red los traemos.»
 * y no los traía: la franja de conexión se quitaba sola a los 10 s y la tarjeta
 * se quedaba en «No pudimos conectarnos» hasta que alguien tocara «Intentar de
 * nuevo». Esto cumple lo que el cartel promete, SÓLO en esta pantalla: cuando
 * la conexión pasa de caída a «bien» y la lectura había fallado, se vuelve a
 * pedir UNA vez.
 *
 * No va en `FalloDeCarga` (que es de toda la app) a propósito: hay un
 * `onReintentar` que inicia un cobro, y ése no se puede disparar solo.
 */
export function useAlVolverLaConexion(volverAPedir: () => void, fallo: boolean): void {
  const conexion = useEstadoDeConexion();
  const antes = useRef(conexion);
  useEffect(() => {
    const venia = antes.current;
    antes.current = conexion;
    if (venia !== 'bien' && conexion === 'bien' && fallo) volverAPedir();
  }, [conexion, fallo, volverAPedir]);
}
