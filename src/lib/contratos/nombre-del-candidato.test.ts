import { describe, it, expect } from 'vitest';
import { nombreDelCandidato } from './nombre-del-candidato';

describe('nombreDelCandidato (QA-CONT-95, C-26)', () => {
  it('🔴 arma el nombre de `tenant` cuando el back no manda `tenantName`', () => {
    expect(nombreDelCandidato({ tenant: { firstName: 'Camila', lastName: 'Invitada Mesa' } })).toBe('Camila Invitada Mesa');
  });
  it('usa `tenantName` si viene', () => {
    expect(nombreDelCandidato({ tenantName: 'Ana Ruiz' })).toBe('Ana Ruiz');
  });
  it('sin nada: «—», nunca vacío', () => {
    expect(nombreDelCandidato(null)).toBe('—');
  });
});
