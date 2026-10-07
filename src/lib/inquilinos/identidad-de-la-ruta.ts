/**
 * EC-05 (QA-INQ-95 ronda 2): la ruta del estado de cuenta trae el `User.id`
 * (con cuenta), una identidad sintética (`doc:…`, `correo:…`, `contrato:…`) o
 * el documento suelto; la ficha del inquilino lo pide como `doc:<n>`.
 */
export function identidadDeLaRuta(id: string): string {
  const limpio = id.trim();
  return /^\d{1,30}$/.test(limpio) ? `doc:${limpio}` : limpio;
}
