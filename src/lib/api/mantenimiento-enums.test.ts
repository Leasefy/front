import { describe, it, expect } from 'vitest';
import { mantenimientoAlBack, mantenimientoDelBack } from './mantenimiento-enums';
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria';

describe('los enums de mantenimiento viajan en el vocabulario de cada lado', () => {
  it('al back van en mayúscula y con sus prefijos', () => {
    expect(
      mantenimientoAlBack({ type: 'other', priority: 'low', paidBy: 'tenant', status: 'approved' }),
    ).toEqual({ type: 'OTHER_MAINT', priority: 'LOW', paidBy: 'TENANT_PAYS', status: 'MAINT_APPROVED' });
  });

  it('del back vuelven en minúscula, que es lo que compara el tablero', () => {
    const fila = mantenimientoDelBack({
      id: '1',
      type: 'PLUMBING',
      priority: 'EMERGENCY',
      paidBy: 'AGENCY_PAYS',
      status: 'MAINT_COMPLETED',
    } as unknown as SolicitudMantenimiento);
    expect(fila).toMatchObject({
      type: 'plumbing',
      priority: 'emergency',
      paidBy: 'agency',
      status: 'completed',
      quotes: [],
    });
  });

  it('lo que ya viene traducido pasa tal cual', () => {
    expect(mantenimientoDelBack({ status: 'reported', type: 'locks', quotes: [{ id: 'q' }] } as unknown as SolicitudMantenimiento))
      .toMatchObject({ status: 'reported', type: 'locks' });
  });
});
