/**
 * Copy de las plantillas del chat + umbrales de la espera.
 *
 * Los dos salieron de mirar la pantalla, no el código: las plantillas se
 * mostraban sin tildes ni signo de apertura («Como van mis cobros este mes?»),
 * y el aviso «Sigo en ello — está tomando más de lo normal» aparecía a los 8 s
 * en TODOS los turnos cuando un turno normal tarda 20-25 s.
 */

import { describe, expect, it } from 'vitest';

import es from '@/lib/i18n/locales/es.json';
import { CHAT_TEMPLATES } from './ChatTemplates';
import {
  ESPERA_LEYENDO_S,
  ESPERA_MAS_DE_LO_NORMAL_S,
  faseDeEspera,
} from './TypingIndicator';

/** `beta.welcome.prompts.cobros_desc` → el texto de es.json. */
function texto(key: string): string {
  const valor = key
    .split('.')
    .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], es as unknown);
  expect(typeof valor).toBe('string');
  return valor as string;
}

describe('plantillas del chat — español correcto', () => {
  const textos = CHAT_TEMPLATES.flatMap((t) => [texto(t.titleKey), texto(t.descKey)]);

  it('hay 6 plantillas y todas tienen título y descripción', () => {
    expect(CHAT_TEMPLATES).toHaveLength(6);
    expect(textos.every((s) => s.trim().length > 0)).toBe(true);
  });

  it('toda pregunta abre con «¿»', () => {
    const sinApertura = textos.filter((s) => s.trim().endsWith('?') && !s.trim().startsWith('¿'));
    expect(sinApertura).toEqual([]);
  });

  it('no quedan palabras sin tilde (las tres que se vieron en pantalla)', () => {
    const malEscritas = [/\bComo\b/, /\bproximos?\b/i, /\bQue\b/, /\bCuando\b/, /\bDonde\b/];
    const fallos = textos.filter((s) => malEscritas.some((re) => re.test(s)));
    expect(fallos).toEqual([]);
  });

  it('las tres plantillas medidas quedaron bien', () => {
    expect(texto('beta.welcome.prompts.cobros_desc')).toBe('¿Cómo van mis cobros este mes?');
    expect(texto('beta.welcome.prompts.contratos_desc')).toBe('¿Hay contratos próximos a vencer?');
    expect(texto('beta.welcome.prompts.mantenimiento_desc')).toBe(
      '¿Qué solicitudes de mantenimiento hay?',
    );
  });
});

describe('faseDeEspera — «más de lo normal» tiene que ser de verdad más de lo normal', () => {
  it('un turno de 20-25 s (lo normal medido) NO dispara el aviso', () => {
    expect(faseDeEspera(20)).toBe('deciding');
    expect(faseDeEspera(25)).toBe('deciding');
  });

  it('el aviso aparece recién pasados los 35 s', () => {
    expect(ESPERA_MAS_DE_LO_NORMAL_S).toBeGreaterThanOrEqual(30);
    expect(faseDeEspera(ESPERA_MAS_DE_LO_NORMAL_S)).toBe('longer');
    expect(faseDeEspera(60)).toBe('longer');
  });

  it('los primeros segundos siguen diciendo que está leyendo', () => {
    expect(faseDeEspera(0)).toBe('reading');
    expect(faseDeEspera(ESPERA_LEYENDO_S - 0.1)).toBe('reading');
    expect(faseDeEspera(ESPERA_LEYENDO_S)).toBe('deciding');
  });
});
