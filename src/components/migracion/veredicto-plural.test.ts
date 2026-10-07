import { describe, it, expect } from 'vitest';
import es from '@/lib/i18n/locales/es.json';

/**
 * QA-INQ-95 (V-02, 04-10-2026): el vacío de Inquilinos con migración a medias
 * decía «1 sin inquilino · 1 filas sin activar». Cada línea del veredicto se
 * lee bien con 1 y con muchos.
 */
describe('veredicto de la migración — plurales', () => {
  const lineas = (es as unknown as { migracion: { veredicto: Record<string, { linea?: string }> } }).migracion?.veredicto;
  it('ninguna línea dice «1 filas», «1 contratos»…', () => {
    const textos = JSON.stringify(es).match(/"linea": ?"\{\{n\}\} [^"]*"/g) ?? [];
    expect(textos.length).toBeGreaterThan(0);
    for (const t of textos) expect(t.replace('{{n}}', '1')).not.toMatch(/"1 (filas|contratos|inmuebles|personas)\b/);
    void lineas;
  });
});
