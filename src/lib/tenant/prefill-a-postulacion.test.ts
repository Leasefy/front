/**
 * prefill-a-postulacion.test.ts — pre-scoring identity precedence
 * (T-0020 / T-0001 WU-2).
 *
 * `preScoringIdentity` is orthogonal to `hasPreviousApplication` — it must be
 * applied and locked even for a tenant with no previous application. When
 * both sources are present, the study identity wins field-by-field over the
 * previous-application value.
 */

import { describe, it, expect } from 'vitest';

import {
  aplicarPrefill,
  aplicarIdentidadDelEstudio,
  documentosEnRanuras,
  identidadEfectiva,
} from './prefill-a-postulacion';
import { createEmptyApplication } from '@/lib/types/application';
import type {
  ApplicationPrefill,
  ApplicationPrefillData,
  PreScoringIdentity,
} from '@/lib/api/applications.types';

const IDENTIDAD: PreScoringIdentity = {
  orderId: 'order-1',
  fullName: 'María Fernanda Ruiz',
  documentType: 'cc',
  documentNumber: '1020304050',
  email: 'maria@ejemplo.co',
  lockedFields: ['fullName', 'documentType', 'documentNumber', 'email'],
};

const PREVIA: ApplicationPrefillData = {
  hasPreviousApplication: true,
  fullName: 'Nombre Viejo',
  documentType: 'ce',
  documentNumber: '999999',
  dateOfBirth: '1994-03-15',
  phone: '3105551234',
  email: 'viejo@ejemplo.co',
  currentAddress: 'Calle 93 # 15-20, Bogotá',
  timeAtCurrentAddress: 24,
  maritalStatus: 'single',
  dependents: 0,
  employmentStatus: 'employed',
  companyName: 'Acme SAS',
  industry: 'Tecnología',
  position: 'Analista',
  contractType: 'indefinite',
  timeAtJob: 30,
  employerPhone: '3115551234',
  employerAddress: 'Carrera 7 # 71-21',
  monthlySalary: 6_000_000,
  additionalIncome: 0,
  additionalIncomeSource: '',
  totalMonthlyIncome: 6_000_000,
  monthlyObligations: 500_000,
  availableForRent: 2_500_000,
  references: {
    previousLandlords: [],
    employmentReferences: [],
    personalReferences: [],
  },
  hasCoSigner: false,
  coSigner: null,
};

describe('identidadEfectiva', () => {
  it('la identidad del estudio gana campo a campo sobre la postulación anterior', () => {
    const efectiva = identidadEfectiva({ ...PREVIA, preScoringIdentity: IDENTIDAD });
    expect(efectiva.fullName).toBe('María Fernanda Ruiz');
    expect(efectiva.documentType).toBe('cc');
    expect(efectiva.documentNumber).toBe('1020304050');
    expect(efectiva.email).toBe('maria@ejemplo.co');
    expect(efectiva.vieneDelEstudio).toBe(true);
    expect(efectiva.lockedFields).toEqual(
      new Set(['fullName', 'documentType', 'documentNumber', 'email']),
    );
  });

  it('un campo null en la identidad cae a la postulación anterior, no se pierde', () => {
    const efectiva = identidadEfectiva({
      ...PREVIA,
      preScoringIdentity: { ...IDENTIDAD, fullName: null, email: null },
    });
    expect(efectiva.fullName).toBe('Nombre Viejo');
    expect(efectiva.email).toBe('viejo@ejemplo.co');
    // documentNumber/documentType still come from the study — they were non-null
    expect(efectiva.documentNumber).toBe('1020304050');
  });

  it('sin identidad del estudio, se usan los valores de la postulación anterior sin bloqueo', () => {
    const efectiva = identidadEfectiva(PREVIA);
    expect(efectiva.fullName).toBe('Nombre Viejo');
    expect(efectiva.vieneDelEstudio).toBe(false);
    expect(efectiva.lockedFields.size).toBe(0);
  });

  it('sin postulación previa NI identidad, todo queda null', () => {
    const efectiva = identidadEfectiva({ hasPreviousApplication: false });
    expect(efectiva.fullName).toBeNull();
    expect(efectiva.vieneDelEstudio).toBe(false);
  });

  it('identidad del estudio presente aunque no haya postulación anterior (ortogonal)', () => {
    const prefill: ApplicationPrefill = {
      hasPreviousApplication: false,
      preScoringIdentity: IDENTIDAD,
    };
    const efectiva = identidadEfectiva(prefill);
    expect(efectiva.fullName).toBe('María Fernanda Ruiz');
    expect(efectiva.vieneDelEstudio).toBe(true);
  });

  it('lockedFields ausente en la identidad no bloquea nada (no hay lista fija)', () => {
    const efectiva = identidadEfectiva({
      ...PREVIA,
      preScoringIdentity: { ...IDENTIDAD, lockedFields: undefined },
    });
    expect(efectiva.lockedFields.size).toBe(0);
  });
});

describe('aplicarPrefill — precedencia de identidad', () => {
  it('la identidad del estudio gana sobre los valores de la postulación anterior', () => {
    const app = aplicarPrefill(createEmptyApplication('prop-1'), {
      ...PREVIA,
      preScoringIdentity: IDENTIDAD,
    });
    expect(app.personal.fullName).toBe('María Fernanda Ruiz');
    expect(app.personal.documentNumber).toBe('1020304050');
    expect(app.personal.documentType).toBe('cc');
    expect(app.personal.email).toBe('maria@ejemplo.co');
    // Fields not covered by the identity block still come from the previous app
    expect(app.personal.phone).toBe('3105551234');
    expect(app.preScoringIdentityApplied).toBe(true);
    expect(app.previousApplicationDataApplied).toBe(true);
    expect(app.preScoringLockedFields).toEqual(['fullName', 'documentType', 'documentNumber', 'email']);
    expect(app.preScoringOrderId).toBe('order-1');
  });

  it('aplica la identidad del estudio aunque no haya postulación previa', () => {
    const app = aplicarPrefill(createEmptyApplication('prop-1'), {
      hasPreviousApplication: false,
      preScoringIdentity: IDENTIDAD,
    });
    expect(app.personal.fullName).toBe('María Fernanda Ruiz');
    expect(app.personal.documentNumber).toBe('1020304050');
    expect(app.preScoringIdentityApplied).toBe(true);
    expect(app.previousApplicationDataApplied).toBe(false);
    // Fields the study doesn't cover stay empty — nothing to fall back to
    expect(app.personal.phone).toBe('');
  });

  it('sin identidad del estudio, el comportamiento previo se mantiene intacto', () => {
    const app = aplicarPrefill(createEmptyApplication('prop-1'), PREVIA);
    expect(app.personal.fullName).toBe('Nombre Viejo');
    expect(app.personal.documentNumber).toBe('999999');
    expect(app.preScoringIdentityApplied).toBe(false);
    expect(app.preScoringLockedFields).toEqual([]);
  });

  it('ya no mapea personalReferences — el campo no existe más en ReferenceInfo', () => {
    const app = aplicarPrefill(createEmptyApplication('prop-1'), PREVIA);
    expect(app.references).not.toHaveProperty('personalReferences');
  });
});

describe('documentosEnRanuras — sólo cédula y extracto tienen ranura', () => {
  it('mapea ID_DOCUMENT y BANK_STATEMENT', () => {
    const r = documentosEnRanuras([
      { type: 'ID_DOCUMENT', originalName: 'cedula.pdf', size: 1, uploadedAt: '2026-01-01T00:00:00.000Z' },
      { type: 'BANK_STATEMENT', originalName: 'extracto.pdf', size: 1, uploadedAt: '2026-01-01T00:00:00.000Z' },
    ]);
    expect(r.idDocument?.fileName).toBe('cedula.pdf');
    expect(r.bankStatement?.fileName).toBe('extracto.pdf');
  });

  it('un tipo que ya no tiene ranura (EMPLOYMENT_LETTER) se ignora, no rompe', () => {
    const r = documentosEnRanuras([
      { type: 'EMPLOYMENT_LETTER', originalName: 'contrato.pdf', size: 1, uploadedAt: '2026-01-01T00:00:00.000Z' },
      { type: 'INCOME_PROOF', originalName: 'ingresos.pdf', size: 1, uploadedAt: '2026-01-01T00:00:00.000Z' },
      { type: 'PAY_STUB', originalName: 'colilla.pdf', size: 1, uploadedAt: '2026-01-01T00:00:00.000Z' },
      { type: 'CREDIT_REPORT', originalName: 'reporte.pdf', size: 1, uploadedAt: '2026-01-01T00:00:00.000Z' },
    ]);
    expect(r).toEqual({});
  });
});

describe('aplicarIdentidadDelEstudio — flujo de corrección (modo update, NEEDS_INFO)', () => {
  it('bloquea y sobrescribe los 4 campos de identidad sobre una postulación EXISTENTE', () => {
    const existente = {
      ...createEmptyApplication('prop-1'),
      personal: {
        fullName: 'Nombre Mal Tipeado',
        documentType: 'ce' as const,
        documentNumber: '000000',
        email: 'otro@ejemplo.co',
        phone: '3009998877',
        currentAddress: 'Calle 1 # 2-3',
      },
    };

    const app = aplicarIdentidadDelEstudio(existente, {
      hasPreviousApplication: false,
      preScoringIdentity: IDENTIDAD,
    });

    expect(app.personal.fullName).toBe('María Fernanda Ruiz');
    expect(app.personal.documentType).toBe('cc');
    expect(app.personal.documentNumber).toBe('1020304050');
    expect(app.personal.email).toBe('maria@ejemplo.co');
    expect(app.preScoringIdentityApplied).toBe(true);
    expect(app.preScoringLockedFields).toEqual(['fullName', 'documentType', 'documentNumber', 'email']);
    expect(app.preScoringOrderId).toBe('order-1');
  });

  it('NUNCA usa el fallback a la postulación anterior — sólo el bloque del estudio', () => {
    const existente = {
      ...createEmptyApplication('prop-1'),
      personal: { fullName: 'Lo Que Ya Había', phone: '3001112233', currentAddress: 'Calle Real 100' },
    };

    // PREVIA trae hasPreviousApplication: true con datos de OTRA persona/postulación.
    // aplicarIdentidadDelEstudio debe ignorarlos por completo — sólo preScoringIdentity puede ganar.
    const app = aplicarIdentidadDelEstudio(existente, { ...PREVIA, preScoringIdentity: IDENTIDAD });

    expect(app.personal.fullName).toBe('María Fernanda Ruiz'); // del estudio, no de PREVIA
    expect(app.personal.phone).toBe('3001112233'); // intacto — PREVIA.phone NUNCA se aplica acá
    expect(app.personal.currentAddress).toBe('Calle Real 100'); // intacto
  });

  it('no toca employment/income/references/documents — sólo los 4 campos de identidad', () => {
    const existente = {
      ...createEmptyApplication('prop-1'),
      employment: { employmentStatus: 'employed' as const, companyName: 'Mi Empresa' },
      income: { monthlySalary: 5_000_000, totalMonthlyIncome: 5_000_000, monthlyObligations: 0, availableForRent: 5_000_000 },
    };

    const app = aplicarIdentidadDelEstudio(existente, {
      hasPreviousApplication: false,
      preScoringIdentity: IDENTIDAD,
    });

    expect(app.employment).toEqual(existente.employment);
    expect(app.income).toEqual(existente.income);
    expect(app.references).toEqual(existente.references);
    expect(app.documents).toEqual(existente.documents);
  });

  it('sin preScoringIdentity, la postulación no cambia en absoluto', () => {
    const existente = {
      ...createEmptyApplication('prop-1'),
      personal: { fullName: 'Nombre Real', documentNumber: '123456' },
    };

    const app = aplicarIdentidadDelEstudio(existente, PREVIA); // PREVIA no trae preScoringIdentity

    expect(app).toBe(existente); // no-op real, ni siquiera un objeto nuevo
  });

  it('un campo null en la identidad no borra lo que ya había en el formulario', () => {
    const existente = {
      ...createEmptyApplication('prop-1'),
      personal: { fullName: 'Nombre Que Ya Estaba', email: 'correo@ejemplo.co' },
    };

    const app = aplicarIdentidadDelEstudio(existente, {
      hasPreviousApplication: false,
      preScoringIdentity: { ...IDENTIDAD, fullName: null, email: null },
    });

    expect(app.personal.fullName).toBe('Nombre Que Ya Estaba');
    expect(app.personal.email).toBe('correo@ejemplo.co');
    // documentNumber/documentType sí vienen del estudio (no eran null)
    expect(app.personal.documentNumber).toBe('1020304050');
  });

  it('no marca prefilledAt — eso es sólo del prefill de postulación anterior en modo create', () => {
    const existente = createEmptyApplication('prop-1');
    const app = aplicarIdentidadDelEstudio(existente, {
      hasPreviousApplication: false,
      preScoringIdentity: IDENTIDAD,
    });
    expect(app.prefilledAt).toBeUndefined();
  });
});

