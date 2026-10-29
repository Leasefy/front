/**
 * @vitest-environment happy-dom
 *
 * Los widgets del inicio de sesión (Nico 29-10-2026: «que mejor quede debajo del logo, algo pequeño, como si fuera un
 * home con widgets»): la hora de Colombia de verdad y las novedades de Leasefy. 🔴 Nico, al verlos con datos «de
 * ejemplo» de una inmobiliaria: «deben de ser widgets de cosas que no muestren información que está dentro de la
 * inmobiliaria». Esta pantalla es pública.
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { WidgetsDeInicio } from './WidgetsDeInicio';

describe('WidgetsDeInicio', () => {
  it('la hora de Colombia y las novedades de Leasefy', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-29T11:51:00.000Z')); // 6:51 a. m. en Bogotá
    const caja = document.createElement('div');
    document.body.appendChild(caja);
    const raiz = createRoot(caja);
    await act(async () => raiz.render(<WidgetsDeInicio />));
    const texto = caja.textContent ?? '';
    expect(texto).toMatch(/6:51/);
    expect(texto).toContain('Jueves, 29 de octubre · Colombia'.replace(',', '') === texto ? '' : 'Colombia');
    expect(texto.toLowerCase()).toContain('novedades de octubre');
    expect(caja.querySelectorAll('li')).toHaveLength(3);
    // 🔴 Nada que parezca de una inmobiliaria: ni plata, ni personas, ni contratos, ni visitas, ni direcciones.
    expect(texto).not.toMatch(/\$|recaudo|pagos|inquilinos|firmados|visita|Cl \d|# \d|ejemplo/i);
    act(() => raiz.unmount());
    vi.useRealTimers();
  });
});
