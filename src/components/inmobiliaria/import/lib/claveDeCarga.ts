/**
 * claveDeCarga — la clave de idempotencia de cada carga, para poder seguir
 * subiéndola después de una recarga (T-0130).
 *
 * Subir por tandas exige mandar SIEMPRE la misma `idempotencyKey`, y el back no
 * la devuelve en ningún estado de lote (es la llave de la carga, no un dato de
 * ella). Sin guardarla, recargar la página a mitad de la subida dejaba la carga
 * sin forma de continuar: sólo descartarla.
 *
 * Es un UUID al azar: no identifica a nadie ni abre nada, y sin la sesión del
 * back no sirve de nada. Se guarda por lote en el navegador y se borra cuando la
 * carga termina de subirse. NO se guarda ningún dato del archivo.
 *
 * Todo va envuelto: el almacenamiento puede no existir (ventana privada,
 * bloqueado) y la pantalla tiene que funcionar igual — sólo pierde poder seguir
 * una subida cortada en otro momento.
 */

const PREFIJO = 'leasefy-carga-inmuebles-clave:';

export function guardarClaveDeCarga(lote: string, clave: string): void {
  try {
    window.localStorage.setItem(PREFIJO + lote, clave);
  } catch {
    // Sin almacenamiento no se puede retomar la subida tras una recarga.
  }
}

export function leerClaveDeCarga(lote: string): string | null {
  try {
    return window.localStorage.getItem(PREFIJO + lote);
  } catch {
    return null;
  }
}

export function olvidarClaveDeCarga(lote: string): void {
  try {
    window.localStorage.removeItem(PREFIJO + lote);
  } catch {
    // nada que borrar
  }
}
