import { describe, expect, it } from 'vitest';
import { AREAS_DE_LA_AGENDA, NOMBRE_DEL_AREA, areaDeLaTarea } from './areas-de-la-agenda';

/** Los mismos casos que `area-de-la-tarea.spec.ts` del back: el espejo dice lo mismo. */
describe('areaDeLaTarea (espejo del back)', () => {
  it.each([
    ['Pagar la factura de EPM del 402', 'servicios_publicos'],
    ['Llamar a Juan por la mora de octubre', 'cobranza'],
    ['Mandar el plomero al 301: gotera en el baño', 'mantenimientos'],
    ['Acta de entrega del apto 5', 'inspecciones'],
    ['Firmar la renovación con el propietario', 'contratos'],
    ['Mostrar el inmueble a los interesados', 'comercial'],
    ['Llamar a Pedro Morales', 'general'],
  ])('«%s» → %s', (titulo, area) => {
    expect(areaDeLaTarea({ titulo })).toBe(area);
  });

  it('la firma del agente manda y el área guardada gana', () => {
    expect(areaDeLaTarea({ titulo: 'Revisar el 402', nota: 'Servi la dejó: el contrato…' })).toBe('servicios_publicos');
    expect(areaDeLaTarea({ area: 'cobranza', titulo: 'Firmar el contrato' })).toBe('cobranza');
  });

  it('cada área tiene su nombre para mostrar', () => {
    for (const a of AREAS_DE_LA_AGENDA) expect(NOMBRE_DEL_AREA[a]).toBeTruthy();
  });
});
