/**
 * Cómo escribe la inmobiliaria un código o un teléfono en el buscador del
 * panel (QA del 04-10-2026).
 *
 *  - BU-01: «#24» daba «Sin resultados» mientras «24» sí encontraba el
 *    inmueble #24; «Contrato 3» y «#3» no encontraban el contrato 3. El «#» y
 *    la palabra son como se escribe el código en la casa.
 *  - BU-09: «3001112233» (el celular del contrato de Iván) no traía su
 *    contrato; tampoco «+57 300 111 2233» ni «300-111-2233».
 */

/**
 * El número de «#24», «# 24», «24», «Contrato 3», «contrato #3», «N.º 3»,
 * «inmueble 24»; `null` si lo escrito no es (sólo) un código. Las `palabras`
 * son las que pueden ir antes del número («contrato», «inmueble»…).
 */
export function numeroDeLaConsulta(consulta: string, palabras: readonly string[] = []): string | null {
  const limpia = consulta
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
  const prefijo = palabras.length > 0 ? `(?:(?:${palabras.join('|')})\\s*)?` : '';
  const m = limpia.match(new RegExp(`^${prefijo}(?:n\\s*[.°º]?\\s*[oº°]?\\s*)?#?\\s*(\\d{1,9})$`));
  return m ? m[1] : null;
}

/** Sólo los dígitos. */
export function digitos(s: string | null | undefined): string {
  return String(s ?? '').replace(/\D/g, '');
}

/**
 * Los dígitos de un teléfono escrito como sea («+57 300 111 2233»,
 * «300-111-2233», «(300) 1112233»), sin el indicativo de Colombia; `null` si
 * lo escrito no parece un teléfono (letras, o menos de 7 dígitos).
 */
export function telefonoDeLaConsulta(consulta: string): string | null {
  if (!/^[\d\s+().-]+$/.test(consulta.trim())) return null;
  let d = digitos(consulta);
  if (d.length === 12 && d.startsWith('57')) d = d.slice(2);
  return d.length >= 7 ? d : null;
}

/** ¿El teléfono guardado es el escrito? Compara por el final (el guardado puede traer +57). */
export function esElMismoTelefono(guardado: string | null | undefined, escrito: string): boolean {
  const g = digitos(guardado);
  if (g.length < 7) return false;
  return g.endsWith(escrito) || (escrito.length >= 10 && g.endsWith(escrito.slice(-10)));
}
