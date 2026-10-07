import { redirect } from 'next/navigation';

/**
 * /panel/inmobiliaria/pagos/cxp/nueva — 🔴 CB-R21 (04-10-2026).
 *
 * Nico, tal cual: «Proveedores: Una sola, en Gastos». Acá vivía un segundo
 * formulario de factura de proveedor (lectura de la foto con IA, `POST
 * /ap/bills` del agente de pagos) que guardaba la factura APARTE: no llegaba
 * al libro, ni al P&G, ni a la exógena. La factura se registra en
 * Contabilidad → Gastos; la URL vieja (marcadores, enlaces viejos) lleva ahí.
 */
export default function NuevaFacturaDeProveedor() {
  redirect('/panel/inmobiliaria/contabilidad/gastos');
}
