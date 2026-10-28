import { describe, expect, it } from 'vitest';

import { hojaDeLiquidacion, hojaDeSolicitudes, hojaDeTiempos, liquidacionDelMes, ultimosMeses } from './reportes-de-mantenimiento';
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria';

const s = (o: Partial<SolicitudMantenimiento> & Record<string, unknown>) =>
  ({ id: 's', title: 'Fuga', propertyTitle: 'Apto 301', propertyAddress: 'Cra 76', propietarioName: 'Ana', tenantName: 'Iván', type: 'plumbing', priority: 'high', status: 'completed', quotes: [], paidBy: 'owner', createdAt: '2026-10-02T15:00:00Z', updatedAt: '', ...o }) as unknown as SolicitudMantenimiento;

describe('reportes de Mantenimientos (Juan Camilo y Nico, 28-10)', () => {
  const lista = [
    s({ id: 'a', proveedorId: 'p1', proveedor: { id: 'p1', nombre: 'Plomería Día', telefono: '300', activo: true }, approvedAmount: 180000, completedAt: '2026-10-10T15:00:00Z', slaVenceAt: '2026-10-11T00:00:00Z' }),
    s({ id: 'b', proveedorId: 'p1', proveedor: { id: 'p1', nombre: 'Plomería Día', telefono: '300', activo: true }, approvedAmount: 50000, completedAt: '2026-10-20T15:00:00Z', sinCosto: true }),
    s({ id: 'c', selectedQuoteId: 'q', quotes: [{ id: 'q', providerName: 'Eléctricos Ruiz', providerPhone: '311', amount: 90000, description: '', estimatedDays: 1, createdAt: '' }], completedAt: '2026-10-05T15:00:00Z', paidBy: 'tenant' }),
    s({ id: 'd', proveedorId: 'p1', approvedAmount: 70000, completedAt: '2026-09-29T15:00:00Z' }),
    s({ id: 'e', status: 'in_progress', proveedorId: 'p1', approvedAmount: 99000 }),
  ];

  it('la liquidación del mes: por proveedor, sólo lo cerrado en el mes; la garantía en 0; sin costo final, lo cotizado', () => {
    const l = liquidacionDelMes(lista, '2026-10');
    expect(l.map((x) => [x.nombre, x.trabajos.length, x.total])).toEqual([
      ['Plomería Día', 2, 180000],
      ['Eléctricos Ruiz', 1, 90000],
    ]);
    expect(l[0].trabajos[1].aCargoDe).toBe('Garantía (sin costo)');
    const hoja = hojaDeLiquidacion(l);
    expect(hoja.at(-1)).toEqual(['Total del mes', '', '', '', '', '', '', '', 270000]);
  });

  it('las solicitudes dicen el estado, quién paga y si se cerró a tiempo', () => {
    const fila = hojaDeSolicitudes([lista[0]])[1];
    expect(fila).toContain('Cerrada');
    expect(fila).toContain('Propietario');
    expect(fila.at(-1)).toBe('Sí');
  });

  it('los tiempos traen lo creado o cerrado en el mes', () => {
    expect(hojaDeTiempos(lista, '2026-10').length - 1).toBe(5);
    expect(hojaDeTiempos(lista, '2026-08').length - 1).toBe(0);
  });

  it('los meses, del actual hacia atrás', () => {
    expect(ultimosMeses(3, new Date('2026-01-15T12:00:00Z'))).toEqual(['2026-01', '2025-12', '2025-11']);
  });
});
