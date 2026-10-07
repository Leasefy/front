/**
 * 02-10-2026 · Los fallos del cajón del candidato, por el traductor. Antes se
 * pintaba `err.message` crudo y el 404 del análisis se adivinaba por el texto.
 */
import { describe, it, expect } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { mensajeDelAnalisis, mensajeDelMatching, noHayAnalisisTodavia } from './CandidateDrawer';

const quinientos = new ApiError(500, 'Internal server error', 'ERROR_INTERNO', {
  statusCode: 500,
  code: 'ERROR_INTERNO',
  message: 'Internal server error',
  referencia: '1a2b3c4d',
});

describe('CandidateDrawer — los fallos, en palabras', () => {
  it('🔴 el smart matching con un 5xx dice que es nuestro, con la referencia, y no el texto crudo', () => {
    const texto = mensajeDelMatching(quinientos);
    expect(texto).toContain('buscar inmuebles compatibles');
    expect(texto).toContain('de nuestro lado');
    expect(texto).toContain('1a2b3c4d');
    expect(texto).not.toContain('Internal server error');
    expect(texto.toLowerCase()).not.toContain('conexión');
  });

  it('🔴 sin respuesta (status 0) habla de la conexión', () => {
    expect(mensajeDelMatching(new ApiError(0, 'Failed to fetch')).toLowerCase()).toContain('conexión');
    expect(mensajeDelAnalisis(new TypeError('Failed to fetch')).toLowerCase()).toContain('conexión');
  });

  it('el análisis que no existe se reconoce por el 404, no por el texto', () => {
    expect(noHayAnalisisTodavia(new ApiError(404, 'No se encontró evaluación para esta solicitud'))).toBe(true);
    // Un 500 que dice «not found» en el texto NO es «todavía no hay análisis».
    expect(noHayAnalisisTodavia(new ApiError(500, 'Prisma: record not found'))).toBe(false);
  });

  it('un 4xx del análisis dice lo que mandó el back', () => {
    expect(mensajeDelAnalisis(new ApiError(403, 'No tienes acceso a esta evaluación.'))).toBe(
      'No tienes acceso a esta evaluación.',
    );
  });
});
