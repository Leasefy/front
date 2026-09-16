/**
 * Lo que está mal en la resolución, AL LADO DEL CAMPO.
 *
 * 🔴 F5 (auditoría del 13-09): el formulario mandaba cualquier cosa y el back
 * contestaba con un `toast` rojo. El toast se va solo a los cinco segundos, no
 * señala qué campo está mal y desaparece justo cuando la persona baja la vista
 * al formulario para arreglarlo. Con cuatro reglas que se pueden comprobar sin
 * salir del navegador, mandar el viaje para recibir un aviso que se borra es
 * la peor de las dos opciones.
 *
 * Las reglas son LAS MISMAS de `erroresDeLaResolucion` en
 * `back-erp/src/inmobiliaria/facturacion/resolucion-de-facturacion.ts`, y el
 * back las sigue aplicando: esto no lo reemplaza, lo adelanta. El back es
 * quien manda —hay clientes que no son esta pantalla— y su mensaje se sigue
 * mostrando si algo se escapa.
 */

export type CampoDeLaResolucion =
  | 'desde'
  | 'hasta'
  | 'vigenteDesde'
  | 'vigenteHasta';

export interface FormularioDeLaResolucion {
  desde: string;
  hasta: string;
  vigenteDesde: string;
  vigenteHasta: string;
}

export type ErroresDeLaResolucion = Partial<
  Record<CampoDeLaResolucion, string>
>;

/**
 * Un entero mayor que cero. `Number('')` es 0 y `Number('1e3')` es 1000: las
 * dos cosas pasarían un `> 0` a secas, así que se mira el texto.
 */
function enteroPositivo(texto: string): number | null {
  if (!/^\d+$/.test(texto.trim())) return null;
  const n = Number(texto.trim());
  return Number.isSafeInteger(n) && n >= 1 ? n : null;
}

/**
 * Qué está mal, por campo. Un objeto vacío = se puede mandar.
 *
 * Un campo TODAVÍA VACÍO no es un error: no se le grita a alguien por no haber
 * terminado de escribir. Lo vacío lo frena el botón, que sigue pidiendo los
 * seis campos.
 */
export function erroresDeLaResolucion(
  form: FormularioDeLaResolucion,
): ErroresDeLaResolucion {
  const errores: ErroresDeLaResolucion = {};

  const desde = form.desde.trim() === '' ? null : enteroPositivo(form.desde);
  const hasta = form.hasta.trim() === '' ? null : enteroPositivo(form.hasta);

  if (form.desde.trim() !== '' && desde === null) {
    errores.desde = 'El número inicial del rango es un entero mayor que cero.';
  }
  if (form.hasta.trim() !== '' && hasta === null) {
    errores.hasta = 'El número final del rango es un entero mayor que cero.';
  }
  if (desde !== null && hasta !== null && hasta < desde) {
    errores.hasta = `El rango termina antes de empezar: «hasta» no puede ser menor que ${desde.toLocaleString('es-CO')}.`;
  }

  if (
    form.vigenteDesde !== '' &&
    form.vigenteHasta !== '' &&
    // Comparación de texto `YYYY-MM-DD`: ordena igual que la fecha y no
    // construye un `Date`, que en Bogotá (UTC−5) se corre un día.
    form.vigenteHasta < form.vigenteDesde
  ) {
    errores.vigenteHasta = 'La vigencia termina antes de empezar.';
  }

  return errores;
}

export function hayErrores(errores: ErroresDeLaResolucion): boolean {
  return Object.keys(errores).length > 0;
}
