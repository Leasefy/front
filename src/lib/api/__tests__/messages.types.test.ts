/**
 * messages.types.test.ts — T-0038 WU-6, contract-addendum-2.md §B.3/§B.4.
 *
 * `GET /messages/conversations` breaks the live inbox in a way that produces
 * no error: `applicationId` goes `string` -> `string | null`, and `kind` /
 * `propertyId` are new. These tests pin the mapper's degradation rules
 * (throw-on-unknown `kind`, `null` applicationId passed through verbatim,
 * `propertyId` falls back to `property.id` on an older back build) so a
 * regression here is caught before it reaches `MessagesWidget`.
 */

import { describe, it, expect } from 'vitest';
import {
  formatTime,
  mapToConversation,
  resolveConversationKind,
  type BackendConversation,
} from '../messages.types';

function backendConversation(overrides: Partial<BackendConversation> = {}): BackendConversation {
  return {
    id: 'conv-1',
    applicationId: 'app-1',
    property: { id: 'prop-1', title: 'Depto Chicó' },
    otherParticipant: {
      id: 'user-1',
      firstName: 'Ana',
      lastName: 'Gómez',
      role: 'LANDLORD',
      email: 'ana@test.com',
    },
    lastMessage: null,
    unreadCount: 0,
    updatedAt: '2026-08-29T00:00:00.000Z',
    ...overrides,
  };
}

describe('resolveConversationKind — throw-on-unknown (C19)', () => {
  it('defaults to APPLICATION when absent (older back build)', () => {
    expect(resolveConversationKind(undefined)).toBe('APPLICATION');
  });

  it('passes APPLICATION and PROPERTY_INQUIRY through', () => {
    expect(resolveConversationKind('APPLICATION')).toBe('APPLICATION');
    expect(resolveConversationKind('PROPERTY_INQUIRY')).toBe('PROPERTY_INQUIRY');
  });

  it('throws on an unrecognised kind instead of defaulting', () => {
    expect(() => resolveConversationKind('SOMETHING_ELSE')).toThrow();
  });
});

describe('mapToConversation — the breaking-change surface (contract-addendum-2.md §B.3/§B.4)', () => {
  it('a PROPERTY_INQUIRY thread maps applicationId to null, never "" or "null"', () => {
    const result = mapToConversation(
      backendConversation({ kind: 'PROPERTY_INQUIRY', applicationId: null }),
    );
    expect(result.applicationId).toBeNull();
    expect(result.kind).toBe('PROPERTY_INQUIRY');
  });

  it('an APPLICATION thread keeps applicationId as a real string', () => {
    const result = mapToConversation(backendConversation({ kind: 'APPLICATION', applicationId: 'app-1' }));
    expect(result.applicationId).toBe('app-1');
    expect(result.kind).toBe('APPLICATION');
  });

  it('defaults kind to APPLICATION when absent (older back build)', () => {
    const result = mapToConversation(backendConversation({ kind: undefined }));
    expect(result.kind).toBe('APPLICATION');
  });

  it('throws on an unrecognised kind rather than silently defaulting', () => {
    expect(() => mapToConversation(backendConversation({ kind: 'BOGUS' }))).toThrow();
  });

  it('uses the top-level propertyId when present', () => {
    const result = mapToConversation(
      backendConversation({ propertyId: 'prop-top-level', property: { id: 'prop-nested', title: 'X' } }),
    );
    expect(result.propertyId).toBe('prop-top-level');
  });

  it('falls back to property.id when the top-level propertyId is absent (older back build)', () => {
    const result = mapToConversation(
      backendConversation({ propertyId: undefined, property: { id: 'prop-nested', title: 'X' } }),
    );
    expect(result.propertyId).toBe('prop-nested');
  });

  it('the id field is always the conversation uuid — the selection key', () => {
    const result = mapToConversation(backendConversation({ id: 'conv-xyz' }));
    expect(result.id).toBe('conv-xyz');
  });
});

// ============================================================================
// Hilo DIRECTO — inmobiliaria ↔ persona, sin inmueble
// ============================================================================

describe('mapToConversation — hilo directo', () => {
  it('reconoce el tipo nuevo', () => {
    expect(resolveConversationKind('DIRECT')).toBe('DIRECT');
  });

  it('cuando del otro lado está la inmobiliaria, la nombra a ella y marca el perfil AGENCY', () => {
    const conv = mapToConversation(
      backendConversation({
        kind: 'DIRECT',
        applicationId: null,
        property: null,
        propertyId: undefined,
        otherParticipant: null,
        agency: { id: 'ag-1', name: 'Inmobiliaria Prueba', logoUrl: null },
      }),
    );

    expect(conv.name).toBe('Inmobiliaria Prueba');
    expect(conv.perfil).toBe('AGENCY');
    expect(conv.role).toBe('Inmobiliaria');
  });

  it('sin inmueble, property y propertyId quedan vacíos — nunca la cadena "null"', () => {
    const conv = mapToConversation(
      backendConversation({
        kind: 'DIRECT',
        applicationId: null,
        property: null,
        propertyId: undefined,
        otherParticipant: null,
        agency: { id: 'ag-1', name: 'Inmobiliaria Prueba', logoUrl: null },
      }),
    );

    expect(conv.property).toBe('');
    expect(conv.propertyId).toBe('');
  });

  it('cuando del otro lado hay una persona, el perfil sale de SU rol', () => {
    const conv = mapToConversation(
      backendConversation({
        kind: 'DIRECT',
        applicationId: null,
        property: null,
        propertyId: undefined,
        agency: { id: 'ag-1', name: 'Inmobiliaria Prueba', logoUrl: null },
        otherParticipant: {
          id: 'user-9',
          firstName: 'Beto',
          lastName: 'Gil',
          role: 'TENANT',
          email: 'beto@test.com',
        },
      }),
    );

    expect(conv.name).toBe('Beto Gil');
    expect(conv.perfil).toBe('TENANT');
    expect(conv.role).toBe('Inquilino');
  });

  it('un rol que no conocemos se dice, no se disfraza de otro', () => {
    const conv = mapToConversation(
      backendConversation({
        otherParticipant: {
          id: 'user-9',
          firstName: 'Zoe',
          lastName: null,
          role: 'MARCIANO',
          email: 'zoe@test.com',
        },
      }),
    );

    expect(conv.perfil).toBe('DESCONOCIDO');
  });
});

/**
 * 🔴 «Ayer» es un día del calendario, no 24 horas.
 *
 * `formatTime` dividía la diferencia en milisegundos por 86.400.000. Con eso,
 * un mensaje de anoche a las 23:00 mirado hoy a las 09:00 (10 h de
 * diferencia) daba `diffDays === 0` y salía como una hora suelta —«11:00 p.
 * m.»—, indistinguible de un mensaje de esta mañana; y uno de ayer a las 08:00
 * mirado hoy a las 09:00 (25 h) sí decía «Ayer». Dos mensajes del MISMO día se
 * etiquetaban distinto según la hora en que abrieras la bandeja, que es
 * exactamente lo que una fecha no puede hacer.
 */
describe('formatTime — días de calendario, no ventanas de 24 h', () => {
  const ahora = new Date(2026, 8, 5, 9, 0, 0); // sábado 5 de septiembre, 09:00

  it('lo de anoche a las 23:00 es de AYER, aunque hayan pasado 10 horas', () => {
    expect(formatTime(new Date(2026, 8, 4, 23, 0, 0).toISOString(), ahora)).toBe('Ayer');
  });

  it('lo de esta madrugada es de HOY: muestra la hora', () => {
    const r = formatTime(new Date(2026, 8, 5, 0, 30, 0).toISOString(), ahora);
    expect(r).not.toBe('Ayer');
    expect(r).toMatch(/\d/);
  });

  it('lo de ayer temprano —25 h— sigue siendo «Ayer», no un día de la semana', () => {
    expect(formatTime(new Date(2026, 8, 4, 8, 0, 0).toISOString(), ahora)).toBe('Ayer');
  });

  it('hace tres días es un día de la semana, no «Ayer»', () => {
    const r = formatTime(new Date(2026, 8, 2, 23, 30, 0).toISOString(), ahora);
    expect(r).not.toBe('Ayer');
    expect(r).not.toMatch(/^\d{1,2}:/);
  });

  it('una fecha ilegible no rompe la fila: queda vacía', () => {
    expect(formatTime('no-es-una-fecha', ahora)).toBe('');
  });
});
