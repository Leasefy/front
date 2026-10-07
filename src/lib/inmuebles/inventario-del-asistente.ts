import type { InventoryItem } from '@/lib/types/inmobiliaria';

/**
 * Los ítems que el asistente «Nueva consignación» guarda como inventario del
 * inmueble al crear la consignación.
 *
 * 🔴 QA con avatares (04-10): el paso «Acta de entrega» dejaba escribir el
 * inventario pero el asistente NO lo mandaba a ningún lado —se perdía al
 * crear— y después el contrato no se podía crear («El inmueble no tiene
 * inventario»). Ahora viaja por `PUT /consignaciones/:id/inventario`, que lo
 * deja también como borrador del inventario por versiones de la ficha.
 *
 * Lo que el back acepta (`ItemDeInventarioDto`): nombre de 1 a 120, cantidad
 * de 1 a 999, estado conocido, notas hasta 500. Un renglón sin nombre no es un
 * ítem: se omite en vez de tumbar el guardado.
 */
const CONDICIONES = new Set(['excellent', 'good', 'fair', 'poor']);

export function itemsDelInventarioDelAsistente(items: readonly InventoryItem[] | undefined): InventoryItem[] {
  return (items ?? [])
    .filter((i) => i.name.trim().length > 0)
    .map((i) => {
      const notas = i.notes?.trim().slice(0, 500);
      return {
        id: i.id,
        name: i.name.trim().slice(0, 120),
        quantity: Math.min(999, Math.max(1, Math.round(Number(i.quantity) || 1))),
        condition: CONDICIONES.has(i.condition) ? i.condition : 'good',
        ...(notas ? { notes: notas } : {}),
      };
    });
}
