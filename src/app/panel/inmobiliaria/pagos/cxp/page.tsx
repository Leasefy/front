import { redirect } from 'next/navigation';

/**
 * /panel/inmobiliaria/pagos/cxp — las cuentas por pagar no tienen listado
 * propio: las facturas de proveedor se registran y se ven desde Liquidaciones
 * (la Tesorería de siempre). Este segmento existe sólo porque debajo viven la
 * ficha de una factura (`cxp/[id]`) y el alta desde foto (`cxp/nueva`); sin
 * este índice, la URL padre caería en `pagos/[id]` con `id = 'cxp'` y pediría
 * al agente un caso que no existe.
 */
export default function CuentasPorPagarIndex() {
  redirect('/panel/inmobiliaria/pagos/liquidaciones');
}
