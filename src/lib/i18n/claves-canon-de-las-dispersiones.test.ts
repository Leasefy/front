/**
 * Guardia de las claves del canon en Dispersiones (causado / recaudado).
 *
 * Hermano de `claves-base-del-canon.test.ts`, que cubre el extracto y
 * Liquidaciones. La tabla, el cajón y el desglose por inmueble decían
 * «Recaudado» sobre el canon de la cuota del mes, y la dispersión gira por
 * defecto con base CAUSADO: haya pagado el inquilino o no. Una clave que sólo
 * exista en `es.json` sale en pantalla como su ruta para quien use la app en
 * inglés; y la regla es que con base CAUSADO no se diga «recaudado».
 */

import { describe, it, expect } from 'vitest';

import es from './locales/es.json';
import en from './locales/en.json';

function leer(dic: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, dic);
}

const TABLA = 'inmobiliaria.dispersiones.tableView';
const CAJON = 'inmobiliaria.dispersiones.detailView';
const DESGLOSE = 'inmobiliaria.finance.commBreakdown';
const ALERTAS = 'inmobiliaria.propietario.alertas';

/** Lo que consumen `DispersionTable`, `DispersionDetail` y `ComisionDesglose`. Escrito a mano a propósito. */
const CLAVES = [
  `${TABLA}.canonCausado`,
  `${TABLA}.canonRecaudado`,
  `${TABLA}.canon`,
  `${TABLA}.filaCausado`,
  `${TABLA}.filaRecaudado`,
  `${CAJON}.canonCausado`,
  `${CAJON}.canonRecaudado`,
  `${CAJON}.queEsCanonCausado`,
  `${DESGLOSE}.canonCausado`,
  `${DESGLOSE}.canonRecaudado`,
  `${ALERTAS}.sinCuenta.detalle`,
  `${ALERTAS}.pendienteDeGiro.detalle`,
  'inmobiliaria.propietarios.monthlyRevenue',
];

/**
 * Las que se muestran con base CAUSADO (o sin base: la ficha del propietario
 * no sabe con cuál se liquidó cada giro). Ninguna puede decir «recaudado» ni
 * «recibido».
 */
const DE_LA_BASE_CAUSADA = [
  `${TABLA}.canonCausado`,
  `${TABLA}.canon`,
  `${TABLA}.filaCausado`,
  `${CAJON}.canonCausado`,
  `${CAJON}.queEsCanonCausado`,
  `${DESGLOSE}.canonCausado`,
  `${ALERTAS}.sinCuenta.detalle`,
  `${ALERTAS}.pendienteDeGiro.detalle`,
  // Es el canon mensual de los contratos, no plata que entró.
  'inmobiliaria.propietarios.monthlyRevenue',
];

describe('claves del canon en Dispersiones', () => {
  it.each(CLAVES)('%s existe, con texto, en español y en inglés', (clave) => {
    expect(typeof leer(es, clave)).toBe('string');
    expect(typeof leer(en, clave)).toBe('string');
    expect((leer(es, clave) as string).trim()).not.toBe('');
    expect((leer(en, clave) as string).trim()).not.toBe('');
  });

  it.each(DE_LA_BASE_CAUSADA)('🔴 %s no dice «recaudado» ni «recibido»', (clave) => {
    expect(leer(es, clave)).not.toMatch(/recaud|recibid/i);
    expect(leer(en, clave)).not.toMatch(/collected|received/i);
  });

  it.each([`${TABLA}.collected`, `${CAJON}.collected`, `${DESGLOSE}.collected`])(
    '«Recaudado» a secas ya no existe: %s',
    (clave) => {
      expect(leer(es, clave)).toBeUndefined();
      expect(leer(en, clave)).toBeUndefined();
    },
  );
});
