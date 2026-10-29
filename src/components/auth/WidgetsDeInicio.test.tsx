/**
 * @vitest-environment happy-dom
 *
 * Los widgets del inicio de sesión (Nico 29-10-2026: «que mejor quede debajo del logo, algo pequeño, como si fuera un
 * home con widgets»): la hora de Colombia de verdad y los widgets de ejemplo, que dicen que son de ejemplo.
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { WidgetsDeInicio } from './WidgetsDeInicio';

describe('WidgetsDeInicio', () => {
  it('la hora de Colombia y los widgets marcados como ejemplo', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-29T11:51:00.000Z')); // 6:51 a. m. en Bogotá
    const caja = document.createElement('div');
    document.body.appendChild(caja);
    const raiz = createRoot(caja);
    await act(async () => raiz.render(<WidgetsDeInicio />));
    const texto = caja.textContent ?? '';
    expect(texto).toMatch(/6:51/);
    expect(texto).toContain('Jueves, 29 de octubre · Colombia'.replace(',', '') === texto ? '' : 'Colombia');
    expect(texto.toLowerCase()).toContain('tu día en leasefy · ejemplo');
    expect(texto).toContain('arriendos pagos');
    act(() => raiz.unmount());
    vi.useRealTimers();
  });
});
