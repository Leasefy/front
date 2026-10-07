import { redirect } from 'next/navigation';

/**
 * /panel/inmobiliaria/conciliacion-ia/excepciones — RETIRADA (ARREGLOS-8, MOV-A2 Q2 a, 03-10-2026).
 *
 * Era una pantalla del prototipo de «Conciliación IA»:
 * la bandeja de excepciones agrupadas por tipo.
 * Los pagadores, las cuentas «Bancolombia ***4821» y los montos estaban escritos a
 * mano en el archivo, sin un solo fetch, y nada del panel la enlazaba: duplicaba
 * el árbol real `/conciliacion`, que sí lee del micro y del back. Se retira la
 * carpeta entera (sus pantallas se enlazaban entre sí) y quien llegue por un
 * enlace viejo cae en «Por revisar», la cola humana de la conciliación.
 */
export default function ExcepcionesDeConciliacionIaRetiradaPage() {
  redirect('/panel/inmobiliaria/conciliacion/cola');
}
