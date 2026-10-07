import { redirect } from 'next/navigation';

/**
 * /panel/inmobiliaria/conciliacion-ia/conexiones — RETIRADA (ARREGLOS-8, MOV-A2 Q2 a, 03-10-2026).
 *
 * Era una pantalla del prototipo de «Conciliación IA»:
 * un diagrama de las fuentes y lo que activa la conciliación.
 * Los pagadores, las cuentas «Bancolombia ***4821» y los montos estaban escritos a
 * mano en el archivo, sin un solo fetch, y nada del panel la enlazaba: duplicaba
 * el árbol real `/conciliacion`, que sí lee del micro y del back. Se retira la
 * carpeta entera (sus pantallas se enlazaban entre sí) y quien llegue por un
 * enlace viejo cae en las conexiones de verdad.
 */
export default function ConexionesDeConciliacionIaRetiradaPage() {
  redirect('/panel/inmobiliaria/conciliacion/conexiones');
}
