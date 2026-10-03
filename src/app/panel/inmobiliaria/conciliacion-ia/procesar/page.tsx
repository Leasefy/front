import { redirect } from 'next/navigation';

/**
 * /panel/inmobiliaria/conciliacion-ia/procesar — RETIRADA (ARREGLOS-8, MOV-A2 Q2 a, 03-10-2026).
 *
 * Era una pantalla del prototipo de «Conciliación IA»:
 * una «conciliación en curso» de especialistas que no corría nada.
 * Los pagadores, las cuentas «Bancolombia ***4821» y los montos estaban escritos a
 * mano en el archivo, sin un solo fetch, y nada del panel la enlazaba: duplicaba
 * el árbol real `/conciliacion`, que sí lee del micro y del back. Se retira la
 * carpeta entera (sus pantallas se enlazaban entre sí) y quien llegue por un
 * enlace viejo cae en la Sala de la conciliación, donde se pide la corrida de verdad.
 */
export default function ProcesarConciliacionIaRetiradaPage() {
  redirect('/panel/inmobiliaria/conciliacion');
}
