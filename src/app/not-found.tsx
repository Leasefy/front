import type { Metadata } from 'next'
import { PaginaNoEncontrada } from '@/components/estado/PaginaNoEncontrada'

/**
 * 404 global.
 *
 * Antes de esto no existía ninguno: cualquier URL mal escrita mostraba la
 * pantalla por defecto de Next, en inglés y sin salida. Desde el 01-10 es una
 * «dirección que no existe» con a dónde ir (`PaginaNoEncontrada`).
 */

export const metadata: Metadata = {
  title: 'Esta página no existe · Leasefy',
}

export default function NoEncontrado() {
  return <PaginaNoEncontrada />
}
