/**
 * En qué entorno corre la app, para decidir lo que NUNCA debe existir en
 * producción (el mock del segundo factor, por ahora).
 *
 * No se usa `NODE_ENV`: producción y los builds locales corren los dos con
 * `NODE_ENV=production`. La señal es `NEXT_PUBLIC_APP_ENV`, y falla cerrado:
 * sólo `development` y `staging` (exactos) cuentan como "no producción";
 * ausente, vacía o cualquier otro valor es producción.
 */

const ENTORNOS_SIN_PRODUCCION: readonly string[] = ['development', 'staging'];

/** Dominio de producción: ahí el mock no existe aunque la variable diga otra cosa. */
const DOMINIO_DE_PRODUCCION = 'leasefy.co';

function hostnameDelNavegador(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.location?.hostname;
}

function esDominioDeProduccion(hostname: string | undefined): boolean {
  if (!hostname) return false;
  const h = hostname.trim().toLowerCase();
  return h === DOMINIO_DE_PRODUCCION || h.endsWith(`.${DOMINIO_DE_PRODUCCION}`);
}

export interface OpcionesDeEntorno {
  /** `NEXT_PUBLIC_APP_ENV`; por defecto se lee del entorno. */
  entorno?: string | undefined;
  /** `window.location.hostname`; por defecto se lee del navegador. */
  hostname?: string | undefined;
}

/** ¿Esto es producción? Ante la duda, sí. */
export function esProduccion(opciones: OpcionesDeEntorno = {}): boolean {
  const entorno = 'entorno' in opciones ? opciones.entorno : process.env.NEXT_PUBLIC_APP_ENV;
  const hostname = 'hostname' in opciones ? opciones.hostname : hostnameDelNavegador();
  if (esDominioDeProduccion(hostname)) return true;
  return !(typeof entorno === 'string' && ENTORNOS_SIN_PRODUCCION.includes(entorno));
}

/** ¿Se ofrece el mock de autenticación del segundo factor? Nunca en producción. */
export function mockDeSegundoFactorHabilitado(opciones: OpcionesDeEntorno = {}): boolean {
  return !esProduccion(opciones);
}
