'use client';

/**
 * 🟠 IA95-28 (QA-IA-95, 05-10-2026): la ficha del inmueble decía «Acta de
 * entrega · 0 items en inventario» (y su hoja, «INVENTARIO · 0 ÍTEMS») aunque
 * el inmueble tiene el acta de entrega de Vidi con 7 ítems y la devolución con
 * sus descuentos, que se ven en Documentos › Actas.
 *
 * De dónde leía: `consignacion.inventoryItems`, el inventario que se arma en la
 * CAPTACIÓN del mandato (asistente de consignación). Las actas de entrega y
 * devolución (las de Vidi y las que se levantan en Documentos) viven aparte, en
 * `actas_entrega`, con su propio inventario por acta. Con el inventario de la
 * captación vacío, la fila contaba cero y no miraba las actas.
 *
 * Ahora: si el inventario de la captación tiene ítems, se cuentan esos (con su
 * número gramatical y «ítems» con tilde); si está vacío y el mandato tiene
 * actas, la fila dice cuántos ítems trae la última acta de entrega (o la última
 * acta) y lleva a Documentos › Actas; sin ninguna de las dos, lo dice.
 *
 * Las actas se piden con `GET /inmobiliaria/actas?consignacionId=` (pide
 * `contratos:view`): sin ese permiso, o si falla, la ficha queda como antes.
 */
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';
import { actaDelBack } from '@/lib/actas/acta-del-back';
import type { ActaEntrega } from '@/lib/types/inmobiliaria';

/** Las actas de entrega y devolución de UN mandato. Lanza si el back falla. */
export async function actasDelMandato(consignacionId: string): Promise<ActaEntrega[]> {
  const res = await apiClient.get<{ data?: unknown[] } | unknown[]>(
    `/inmobiliaria/actas?consignacionId=${encodeURIComponent(consignacionId)}`,
  );
  const filas = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
  return filas.map(actaDelBack);
}

/**
 * Las actas del mandato, sólo cuando hace falta (`activo`). Cualquier falla
 * (sin permiso, sin red) es «no hay»: la ficha no se rompe por esto.
 */
export function useActasDelMandato(consignacionId: string | null | undefined, activo: boolean): ActaEntrega[] {
  const [actas, setActas] = useState<ActaEntrega[]>([]);
  useEffect(() => {
    if (!activo || !consignacionId) {
      setActas([]);
      return;
    }
    let vivo = true;
    actasDelMandato(consignacionId)
      .then((a) => {
        if (vivo) setActas(a);
      })
      .catch(() => {
        if (vivo) setActas([]);
      });
    return () => {
      vivo = false;
    };
  }, [consignacionId, activo]);
  return actas;
}

/** De qué se cuenta el inventario en la ficha. Pura. */
export type InventarioDeLaFicha =
  | { de: 'captacion'; items: number }
  | { de: 'acta'; items: number; actaId: string; tipo: ActaEntrega['type']; fecha: string }
  | { de: 'nada' };

/**
 * El inventario que la ficha cuenta: el de la captación si tiene ítems; si no,
 * el de la última acta de ENTREGA del mandato (o la última acta) que tenga
 * ítems. Pura.
 */
export function inventarioDeLaFicha(itemsDeLaCaptacion: number, actas: readonly ActaEntrega[]): InventarioDeLaFicha {
  if (itemsDeLaCaptacion > 0) return { de: 'captacion', items: itemsDeLaCaptacion };
  const conItems = actas.filter((a) => (a.items?.length ?? 0) > 0);
  const masReciente = (lista: readonly ActaEntrega[]) =>
    [...lista].sort((x, y) => (y.deliveryDate ?? '').localeCompare(x.deliveryDate ?? ''))[0];
  const elegida = masReciente(conItems.filter((a) => a.type === 'entrega')) ?? masReciente(conItems);
  if (!elegida) return { de: 'nada' };
  return { de: 'acta', items: elegida.items.length, actaId: elegida.id, tipo: elegida.type, fecha: elegida.deliveryDate ?? '' };
}
