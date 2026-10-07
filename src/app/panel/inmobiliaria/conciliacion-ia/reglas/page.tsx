import { redirect } from 'next/navigation';

/**
 * /panel/inmobiliaria/conciliacion-ia/reglas — RETIRADA (ARREGLOS-8, MOV-A2 Q2 a, 03-10-2026).
 *
 * Era una pantalla del prototipo de «Conciliación IA»:
 * unas reglas de conciliación que no se guardaban en ningún lado.
 * Los pagadores, las cuentas «Bancolombia ***4821» y los montos estaban escritos a
 * mano en el archivo, sin un solo fetch, y nada del panel la enlazaba: duplicaba
 * el árbol real `/conciliacion`, que sí lee del micro y del back. Se retira la
 * carpeta entera (sus pantallas se enlazaban entre sí) y quien llegue por un
 * enlace viejo cae en la configuración de verdad (autonomía y política de cruce).
 */
export default function ReglasDeConciliacionIaRetiradaPage() {
  redirect('/panel/inmobiliaria/conciliacion/configuracion');
}
