import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/contracts.service', () => ({ contractsApi: {}, mapBackendContract: (x: unknown) => x }));

import { enlaceParaAgregarElCorreo } from './InvitarInquilino';

describe('QA-CONT-95 · B-23 sin correo del inquilino hay a dónde ir', () => {
  it('🔴 lleva a su ficha de Inquilinos (por documento) y vuelve al contrato', () => {
    const href = enlaceParaAgregarElCorreo({ id: 'c-26', tenantDocument: '1.036.900.111' });
    expect(href).toBe('/panel/inmobiliaria/inquilinos?persona=doc%3A1036900111&volver=%2Fpanel%2Finmobiliaria%2Fcontratos%2Fc-26');
  });
  it('sin documento no inventa un enlace', () => {
    expect(enlaceParaAgregarElCorreo({ id: 'c-26', tenantDocument: '' })).toBeNull();
  });
});
