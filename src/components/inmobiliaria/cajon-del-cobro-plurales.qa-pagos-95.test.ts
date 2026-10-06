import { describe, expect, it } from 'vitest';

import es from '@/lib/i18n/locales/es.json';

/**
 * 🔴 QA-PAGOS-95 r2 (PGR-16): el cajón del cobro decía «1 recordatorio(s)
 * enviado(s)». Ninguna frase del cajón lleva «(s)»: el singular tiene su clave.
 */
describe('el cajón del cobro, sin plurales a medias', () => {
  const detalle = (es as unknown as { inmobiliaria: { cobros: { detail: Record<string, unknown> } } }).inmobiliaria.cobros.detail;

  it('«1 recordatorio enviado» y «3 recordatorios enviados»', () => {
    expect(detalle.remindersCountOne).toBe('1 recordatorio enviado');
    expect(String(detalle.remindersCount).replace('{{count}}', '3')).toBe('3 recordatorios enviados');
  });

  it('ninguna frase del cajón lleva «(s)»', () => {
    const conS = Object.entries(detalle).filter(([, v]) => typeof v === 'string' && /\w\(s\)/.test(v));
    expect(conS).toEqual([]);
  });
});
