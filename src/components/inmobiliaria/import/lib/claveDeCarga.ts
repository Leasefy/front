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
    window.localStorage.removeItem('leasefy-carga-inmuebles-huella:' + lote);
  } catch {
    // nada que borrar
  }
}

const PREFIJO_HUELLA = 'leasefy-carga-inmuebles-huella:';
const EN_CURSO = 'leasefy-carga-inmuebles-en-curso';

export function guardarHuellaDeCarga(lote: string, huella: string): void {
  try {
    window.localStorage.setItem(PREFIJO_HUELLA + lote, huella);
  } catch {
    // sin almacenamiento sólo se pierde la comparación local
  }
}

export function leerHuellaDeCarga(lote: string): string | null {
  try {
    return window.localStorage.getItem(PREFIJO_HUELLA + lote);
  } catch {
    return null;
  }
}

/**
 * La clave del intento en curso, guardada ANTES de la primera petición: si la
 * respuesta nunca llega (corte) el lote igual pudo crearse, y reintentar con el
 * MISMO archivo reusa la clave en vez de abrir otro lote. Sólo vale con la misma
 * huella; con otro archivo se descarta.
 */
export function guardarClaveEnCurso(clave: string, huella: string | null): void {
  try {
    window.localStorage.setItem(EN_CURSO, JSON.stringify({ clave, huella }));
  } catch {
    // ver arriba
  }
}

export function leerClaveEnCurso(huella: string | null): string | null {
  try {
    const bruto = window.localStorage.getItem(EN_CURSO);
    if (!bruto) return null;
    const v = JSON.parse(bruto) as { clave?: unknown; huella?: unknown };
    return typeof v.clave === 'string' && (v.huella ?? null) === huella ? v.clave : null;
  } catch {
    return null;
  }
}

export function olvidarClaveEnCurso(): void {
  try {
    window.localStorage.removeItem(EN_CURSO);
  } catch {
    // nada que borrar
  }
}
