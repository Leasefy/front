import { redirect } from 'next/navigation';

/**
 * /panel/inmobiliaria/conciliacion-ia/lote — RETIRADA (ARREGLOS-8, MOV-A2 Q2 a, 03-10-2026).
 *
 * Era una pantalla del prototipo de «Conciliación IA»:
 * un lote de 120 movimientos para aprobar de un golpe.
 * Los pagadores, las cuentas «Bancolombia ***4821» y los montos estaban escritos a
 * mano en el archivo, sin un solo fetch, y nada del panel la enlazaba: duplicaba
 * el árbol real `/conciliacion`, que sí lee del micro y del back. Se retira la
 * carpeta entera (sus pantallas se enlazaban entre sí) y quien llegue por un
 * enlace viejo cae en Movimientos, el único lugar donde se concilia el banco.
 */
export default function LoteDeConciliacionIaRetiradoPage() {
  redirect('/panel/inmobiliaria/conciliacion/movimientos');
}
