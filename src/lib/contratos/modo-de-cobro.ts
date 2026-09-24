/**
 * Las dos formas de cobrar un contrato, dichas igual en crear, editar y
 * administrar. Es la regla del back (`motor-de-mora/regla-del-arriendo.ts`,
 * Nico y Juan Camilo, 16-09) y la bandera `prorratearPrimerMes`.
 */

export const PREGUNTA_DEL_PRORRATEO = '¿Se prorratea?';

/** Lo que pasa con «Sí». */
export const SI_SE_PRORRATEA =
  'Sí: el arriendo se genera el 1 de cada mes con los días de plazo. El primer mes se cobra por días desde la fecha de cartera, sobre un mes de 30 (del 21 al 31 son 10 días de 30) y vence ese día; el último mes se cobra hasta el fin.';

/** Lo que pasa con «No». */
export const NO_SE_PRORRATEA =
  'No: va fecha a fecha. Cada período va del día de la fecha de cartera al día anterior del mes siguiente (del 20 al 19), se cobra completo —también el último— y vence el día en que empieza.';
