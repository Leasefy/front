import { describe, it, expect } from 'vitest';
import es from '@/lib/i18n/locales/es.json';
import { cifrasDeLaBandeja } from './cifras-de-la-bandeja';

/** `t` de verdad sobre es.json, con la interpolación `{{x}}` de la app. */
function t(clave: string, vars: Record<string, string | number> = {}): string {
  let v: unknown = es;
  for (const k of clave.split('.')) v = (v as Record<string, unknown>)?.[k];
  if (typeof v !== 'string') return clave;
  return v.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
}
const plano = (xs: string[]) => xs.map((x) => x.replace(/\s+/g, ' '));

describe('cifrasDeLaBandeja', () => {
  it('sin briefing o sin números, nada', () => {
    expect(cifrasDeLaBandeja(null, t)).toEqual([]);
    expect(cifrasDeLaBandeja(undefined, t)).toEqual([]);
    expect(cifrasDeLaBandeja({}, t)).toEqual([]);
  });

  it('nunca pinta un cero: el micro rellena con 0 un conteo que falló', () => {
    expect(cifrasDeLaBandeja({ pendientes: 0, llamadasHoy: 0, promesasCreadasHoy: 0, recuperadoMesCop: 0 }, t)).toEqual([]);
  });

  it('lo recuperado va en COP compacto y primero; los conteos con singular y plural', () => {
    const cifras = plano(
      cifrasDeLaBandeja({ recuperadoMesCop: 12_400_000, pendientes: 3, llamadasHoy: 1, promesasCreadasHoy: 2 }, t)
    );
    // El espacio tras «$» depende de la versión de ICU: se acepta con y sin.
    expect(cifras[0]).toMatch(/^\$ ?12,4 M recuperados este mes$/);
    expect(cifras.slice(1)).toEqual([
      '3 decisiones pendientes',
      '1 llamada hoy',
      '2 promesas de pago hoy',
    ]);
    expect(plano(cifrasDeLaBandeja({ pendientes: 1, llamadasHoy: 1250 }, t))).toEqual([
      '1 decisión pendiente',
      '1.250 llamadas hoy',
    ]);
  });
});
