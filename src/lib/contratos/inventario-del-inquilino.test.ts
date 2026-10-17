import { describe, expect, it } from 'vitest';

import { seOfreceFirmarElInventario } from './inventario-del-inquilino';

describe('seOfreceFirmarElInventario (CONTR-8)', () => {
  it('con el contrato ya firmado por el inquilino, se ofrece (también al volver otro día)', () => {
    for (const estado of ['pending_landlord', 'signed', 'active']) {
      expect(seOfreceFirmarElInventario(estado)).toBe(true);
    }
  });

  it('antes de firmar el contrato, o con el contrato muerto, no', () => {
    for (const estado of ['draft', 'pending_tenant', 'cancelled', 'rejected', 'expired', null, undefined]) {
      expect(seOfreceFirmarElInventario(estado)).toBe(false);
    }
  });
});
