import { redirect } from 'next/navigation';

/**
 * /panel/inmobiliaria/conciliacion-ia — RETIRADA (ARREGLOS-8, MOV-A2 Q2 a, 03-10-2026).
 *
 * Era una pantalla del prototipo de «Conciliación IA»:
 * la portada del agente, con un «77,5 %» de conciliación automática inventado.
 * Los pagadores, las cuentas «Bancolombia ***4821» y los montos estaban escritos a
 * mano en el archivo, sin un solo fetch, y nada del panel la enlazaba: duplicaba
 * el árbol real `/conciliacion`, que sí lee del micro y del back. Se retira la
 * carpeta entera (sus pantallas se enlazaban entre sí) y quien llegue por un
 * enlace viejo cae en la Sala de la conciliación.
 */
export default function ConciliacionIaRetiradaPage() {
  redirect('/panel/inmobiliaria/conciliacion');
}
