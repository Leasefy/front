import { redirect } from 'next/navigation';

/**
 * /panel/inmobiliaria/avaluos-ia/venta — RETIRADA (ARREGLOS-8, MOV-A2 Q2 a, 03-10-2026).
 *
 * Era una pantalla del prototipo huérfano de «Avalúos IA»:
 * un avalúo de VENTA con precio, comparables y propietaria inventados.
 * Todo estaba escrito a mano en el archivo, sin un solo fetch, y nada del panel
 * la enlazaba: sólo se llegaba por URL directa o desde otra pantalla del mismo
 * prototipo. Se retira entera, como `enviar` y `monitoreo`, y quien llegue por
 * un enlace viejo cae en el módulo real de avalúos, cableado al back.
 */
export default function AvaluoDeVentaRetiradoPage() {
  redirect('/panel/inmobiliaria/inmuebles/avaluos');
}
