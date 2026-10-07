import { redirect } from 'next/navigation';

/**
 * /panel/inmobiliaria/pagos/cxp — las cuentas por pagar no tienen listado
 * propio. Este segmento existe sólo porque debajo viven la ficha de una
 * factura (`cxp/[id]`) y el alta desde foto (`cxp/nueva`); sin este índice, la
 * URL padre caería en `pagos/[id]` con `id = 'cxp'` y pediría al agente un caso
 * que no existe.
 *
 * 🔴 PG-16 (QA de Pagos, 03-10-2026): redirigía a Liquidaciones —el neto de
 * los PROPIETARIOS—, así que «Ver cuentas por pagar» (Facturación) aterrizaba
 * en otra cosa. Las facturas de PROVEEDOR viven en su cola, la pestaña
 * «Facturas de proveedores» de Liquidaciones: ahí lleva.
 */
export default function CuentasPorPagarIndex() {
  redirect('/panel/inmobiliaria/pagos/liquidaciones/por-aprobar');
}
