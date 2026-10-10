import { Armchair, Car, Dog, Money, Sun } from '@phosphor-icons/react';

/**
 * «Ideas para afinar»: el menú de la caja de abajo en la conversación y en la
 * lista del marketplace. Cada una se envía tal cual, como si la escribieran,
 * y el entendedor del back la vuelve una pastilla.
 */
export const IDEAS_PARA_AFINAR = [
  { id: 'balcon', titulo: 'Que tenga balcón', texto: 'que tenga balcón', icono: Sun },
  { id: 'parqueadero', titulo: 'Con parqueadero', texto: 'con parqueadero', icono: Car },
  { id: 'mascotas', titulo: 'Que acepte mascotas', texto: 'que acepte mascotas', icono: Dog },
  { id: 'amoblado', titulo: 'Amoblado', texto: 'amoblado', icono: Armchair },
  { id: 'barato', titulo: 'Hasta $2,5 millones', texto: 'hasta 2.5 millones', icono: Money },
] as const;
