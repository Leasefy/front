import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({ cicloDeVidaApi: {} }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ propietariosApi: {} }));

import { pistaDeLaFechaDeCesion, queSeHizoConElMes } from './CesionDelInmueble';

describe('QA-CONT-95 · E-10 la cesión a mitad de mes lo dice', () => {
  it('🔴 desde el 16 de noviembre: noviembre se reparte por días (r3), y se dice con la excepción', () => {
    const pista = pistaDeLaFechaDeCesion('2026-11-16', 'Pedro');
    expect(pista).toContain('Noviembre de 2026 se reparte por días: hasta el 15 es de Pedro y desde el 16, del nuevo dueño');
    expect(pista).toContain('si ese mes ya se giró o lleva IVA o retenciones, queda completo de Pedro');
  });
  it('el aviso de «listo» dice cuántos días le quedaron a cada uno, o por qué no se repartió', () => {
    const base = { propietarioAnterior: 'Pedro', propietarioNuevo: 'Clara' };
    expect(
      queSeHizoConElMes({ ...base, mesRepartido: { mes: '2026-11', diasDelQueVende: 15, diasDelQueCompra: 15 } }),
    ).toBe(' Noviembre de 2026 quedó repartido por días: 15 de Pedro y 15 de Clara.');
    expect(
      queSeHizoConElMes({ ...base, mesRepartido: { mes: '2026-11', sinRepartir: 'ese mes ya se giró o se cerró a nombre de quien vende' } }),
    ).toBe(' Noviembre de 2026 quedó completo de Pedro: ese mes ya se giró o se cerró a nombre de quien vende.');
    expect(queSeHizoConElMes({ ...base, mesRepartido: null })).toBe('');
  });
  it('desde el 1.º no hay nada que advertir', () => {
    expect(pistaDeLaFechaDeCesion('2026-11-01', 'Pedro')).toBe('Tiene que ser posterior al último período ya cobrado.');
  });
});
