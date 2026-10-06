import { describe, it, expect } from 'vitest';

import { fechaDeLaSolicitud } from './fecha-de-la-solicitud';

const dia = (iso: string) => iso.slice(0, 10);
const base = {
  createdAt: '2026-10-04T16:49:47.104Z',
  updatedAt: '2026-10-04T16:52:00.000Z',
  validatedAt: null,
  dueDate: '2026-10-05T05:00:00.000Z',
};

describe('la fecha de cada intento en el historial de Pagos', () => {
  it('QA-INQ-95: un intento rechazado dice cuándo lo rechazaron, no «Vence»', () => {
    expect(fechaDeLaSolicitud({ ...base, status: 'REJECTED' }, 'es', dia)).toBe('Rechazado el 2026-10-04');
    expect(fechaDeLaSolicitud({ ...base, status: 'REJECTED', validatedAt: '2026-10-04T16:50:00.000Z' }, 'es', dia)).toBe(
      'Rechazado el 2026-10-04',
    );
  });

  it('aprobado, enviado y lo demás como antes', () => {
    expect(fechaDeLaSolicitud({ ...base, status: 'APPROVED', validatedAt: '2026-10-04T17:12:00.000Z' }, 'es', dia)).toBe(
      'Aprobado el 2026-10-04',
    );
    expect(fechaDeLaSolicitud({ ...base, status: 'PENDING_VALIDATION' }, 'es', dia)).toBe('Enviado el 2026-10-04');
    expect(fechaDeLaSolicitud({ ...base, status: 'EXPIRED' }, 'es', dia)).toBe('Vence 2026-10-05');
  });

  it('QA-INQ-95: un intento cancelado dice cuándo se canceló, no «Vence»', () => {
    expect(fechaDeLaSolicitud({ ...base, status: 'CANCELLED' }, 'es', dia)).toBe('Cancelado el 2026-10-04');
  });
});
