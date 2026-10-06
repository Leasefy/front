/**
 * 🔴 QA-CONT-95 (B-29, 04-10-2026): lo que devuelve un PATCH del contrato no
 * trae lo que `GET /contracts/:id` arma aparte (la regla de cobro de la
 * inmobiliaria, los dueños con su parte, la comisión de la consignación…).
 * Reemplazar el contrato de la ficha con esa respuesta borraba esos datos: tras
 * «Corregir» en «Cómo se cobra», «Plazo antes de la mora» pasaba de «Sin
 * fijar: no corre mora…» a «Los días de la inmobiliaria». Se funde: lo que la
 * respuesta trae manda; lo que no trae (`undefined`) se conserva.
 */
import type { Contract } from '@/lib/types/contract';

export function fundirContrato(anterior: Contract | null, nuevo: Contract): Contract {
  if (!anterior) return nuevo;
  const definidos = Object.fromEntries(
    Object.entries(nuevo).filter(([, v]) => v !== undefined),
  ) as Partial<Contract>;
  return { ...anterior, ...definidos };
}
