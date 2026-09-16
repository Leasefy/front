/**
 * Con qué se abre el estado de cuenta de un cliente desde una fila de tabla.
 *
 * ── Por qué hace falta una función y no basta con `row.id` ──────────────────
 *
 * El estado de cuenta es POR CLIENTE, no por contrato ni por cuota (CEO,
 * 2026-09-13: «un propietario con 15 contratos tiene UN estado de cuenta; un
 * inquilino con varios locales de distintos propietarios, uno solo»). Su ruta
 * pide un `tenantRef`, y el back acepta DOS cosas a propósito:
 *
 *   · el `userId` de la cuenta del portal, cuando el inquilino la tiene;
 *   · su NÚMERO DE DOCUMENTO, cuando no.
 *
 * Lo segundo no es un respaldo menor: el documento es quien identifica al
 * inquilino —el correo sólo sirve para crearle cuenta— y de los 1.836
 * contratos migrados la enorme mayoría no tiene usuario. Pedir un UUID dejaría
 * sin estado de cuenta justamente a los clientes que la inmobiliaria necesita
 * ver, que son casi todos.
 *
 * Y cuando no hay ninguno de los dos, la respuesta es `null` y la fila NO
 * ofrece el enlace: mandar a `/estado-de-cuenta/inquilino/undefined` para que
 * el back conteste 404 es peor que no ofrecerlo.
 */

/** Lo mínimo que una fila necesita traer para identificar a su inquilino. */
export interface QuienDebe {
  /** El `User.id` del portal, si el inquilino tiene cuenta. */
  tenantId?: string | null;
  /** Su número de documento. Es lo que identifica al inquilino. */
  documento?: string | null;
}

/**
 * El `tenantRef` de una fila: la cuenta si existe, si no el documento.
 *
 * Se limpia el blanco: un `documento: '  '` que viene del archivo migrado no
 * es un documento, y armaría una URL con un segmento vacío.
 */
export function refDelInquilino(fila: QuienDebe): string | null {
  const cuenta = fila.tenantId?.trim();
  if (cuenta) return cuenta;
  const documento = fila.documento?.trim();
  return documento ? documento : null;
}

/**
 * Lo mismo, pero desde la `clave` con la que la cartera agrupa a un inquilino.
 *
 * El back la arma en `cartera.service.ts#claveDelInquilino` y lleva prefijo
 * porque tres orígenes distintos comparten el mismo espacio de valores:
 *
 *   `usuario:<userId>`     → tiene cuenta del portal.
 *   `documento:<numero>`   → no tiene cuenta, pero sí documento.
 *   `contrato:<contractId>`→ no tiene ninguno de los dos: se agrupa por
 *                            contrato para no juntar a dos personas distintas
 *                            que se llaman igual. Ése NO abre estado de cuenta.
 */
export function refDesdeLaClave(clave: string): string | null {
  const corte = clave.indexOf(':');
  if (corte < 0) return null;
  const tipo = clave.slice(0, corte);
  const valor = clave.slice(corte + 1).trim();
  if (!valor) return null;
  return tipo === 'usuario' || tipo === 'documento' ? valor : null;
}
