/**
 * QA-FACT-CONTA-95 r2 · CB-E-14: la sección «Comprobantes del sistema anterior»
 * de la ficha del contrato se muestra con el permiso que el back pide para
 * leerlos (`reportes:view`, ContabilidadLecturaGuard). Con `contabilidad:view`
 * —un módulo que no existe en los permisos de la inmobiliaria— no la veía
 * nadie más que el administrador, ni siquiera el contador.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pagina = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

describe('CB-E-14 · comprobantes del sistema anterior en la ficha del contrato', () => {
  it('se muestran con reportes:view, el permiso de la lectura de la contabilidad', () => {
    expect(pagina).toMatch(/canAccess\('reportes', 'view'\) && <ComprobantesDelSistemaAnterior contractId=/);
  });
  it('ya no dependen de un módulo «contabilidad» que no existe en los permisos', () => {
    expect(pagina).not.toMatch(/canAccess\('contabilidad', 'view'\)/);
  });
});
