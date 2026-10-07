/**
 * Perfil tributario del propietario — chips de tres estados que guardan.
 * `null` no es «no»: se ve distinto (borde punteado).
 *
 * 🔴 P-20 (QA-PROP, 03-10): un clic YA NO guarda. El chip abre un menú con
 * «Sí / No / Sin definir» (cada uno dice qué cambia en la próxima
 * liquidación); sólo se guarda lo que se elige, y el aviso trae «Deshacer» con
 * un id fijo para no apilarse. Las tres pruebas que hacían clic en el chip y
 * esperaban el PUT se cambiaron a «abrir el menú y elegir».
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Propietario } from '@/lib/types/inmobiliaria';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { updateMock, toast } = vi.hoisted(() => ({ updateMock: vi.fn(), toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es' }) }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ propietariosApi: { update: updateMock } }));

import { PerfilTributarioDelPropietario } from './PerfilTributarioDelPropietario';

const base = {
  id: 'p1', name: 'Rentas', email: null, phone: null, documentType: 'NIT', documentNumber: '9',
  bankAccount: { bank: 'bancolombia', accountType: 'savings', accountNumber: '1', accountHolder: 'R' },
  propertyCount: 0, activeLeases: 0, totalMonthlyRent: 0, pendingBalance: 0,
  createdAt: '2026-09-02', updatedAt: '2026-09-02',
  responsableIva: true, agenteRetenedorRenta: false, agenteRetenedorIva: null, agenteRetenedorIca: null,
} as unknown as Propietario;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); vi.clearAllMocks(); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

const estado = (id: string) => container.querySelector(`[data-testid="${id}"]`)?.getAttribute('data-estado');

/** Radix abre el menú con `pointerdown`, no con `click`; el menú va en un portal. */
async function abrir(chip: string) {
  const el = container.querySelector(`[data-testid="${chip}"]`) as HTMLButtonElement;
  await act(async () => {
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }));
  });
}
async function elegir(chip: string, opcion: 'si' | 'no' | 'vacio') {
  await abrir(chip);
  const item = document.body.querySelector(`[data-testid="${chip}-${opcion}"]`) as HTMLElement;
  await act(async () => {
    item.click();
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('<PerfilTributarioDelPropietario>', () => {
  it('muestra el tipo de persona y los tres estados: sí, no y sin definir', async () => {
    await act(async () => { root.render(<PerfilTributarioDelPropietario propietario={base} onActualizado={() => {}} />); });
    expect(container.querySelector('[data-testid="chip-tipo-persona"]')?.textContent).toBe('inmobiliaria.propietarios.detail.personaJuridica');
    expect(estado('chip-iva')).toBe('si');
    expect(estado('chip-retefuente')).toBe('no');
    expect(estado('chip-reteiva')).toBe('vacio');
    expect(container.querySelector('[data-testid="chip-reteiva"]')?.textContent).toBe('inmobiliaria.propietarios.detail.reteivaSinDefinir');
  });

  it('elegir en el menú define el dato (sin definir → sí) y guarda con PUT; otra elección lo pasa a no', async () => {
    const onActualizado = vi.fn();
    updateMock.mockImplementation(async (_id: string, data: Partial<Propietario>) => ({ ...base, ...data }));
    await act(async () => { root.render(<PerfilTributarioDelPropietario propietario={base} onActualizado={onActualizado} />); });

    await elegir('chip-reteiva', 'si');
    expect(updateMock).toHaveBeenCalledWith('p1', { agenteRetenedorIva: true });
    expect(onActualizado).toHaveBeenCalledWith(expect.objectContaining({ agenteRetenedorIva: true }));

    await elegir('chip-iva', 'no');
    expect(updateMock).toHaveBeenLastCalledWith('p1', { responsableIva: false });
  });

  it('si el guardado falla, lo dice y no afirma el cambio', async () => {
    const onActualizado = vi.fn();
    updateMock.mockRejectedValue(new Error('500'));
    await act(async () => { root.render(<PerfilTributarioDelPropietario propietario={base} onActualizado={onActualizado} />); });
    await elegir('chip-reteica', 'si');
    expect(onActualizado).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  async function fallaCon(error: unknown) {
    updateMock.mockRejectedValue(error);
    await act(async () => { root.render(<PerfilTributarioDelPropietario propietario={base} onActualizado={() => {}} />); });
    await elegir('chip-reteica', 'si');
    return String((toast.error.mock.calls[0][1] as { description: string }).description);
  }

  it('🔴 un 5xx dice «de nuestro lado» con la referencia, sin culpar a la conexión', async () => {
    const { ApiError } = await import('@/lib/api/client');
    const texto = await fallaCon(new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' }));
    expect(texto).toMatch(/^No pudimos guardar el perfil tributario: algo falló de nuestro lado/);
    expect(texto).toContain('ab12cd34');
    expect(texto).not.toMatch(/conexi[oó]n/);
  });

  it('un 400 dice lo que el back no aceptó', async () => {
    const { ApiError } = await import('@/lib/api/client');
    const texto = await fallaCon(
      new ApiError(400, ['Indica si practica ReteICA con sí o no.'], 'DATOS_INVALIDOS', {
        campos: [{ campo: 'agenteRetenedorIca', regla: 'tipo', mensaje: 'Indica si practica ReteICA con sí o no.' }],
      }),
    );
    expect(texto).toBe('Indica si practica ReteICA con sí o no.');
  });

  it('sin respuesta (la red) habla de la conexión', async () => {
    expect(await fallaCon(new TypeError('Failed to fetch'))).toMatch(/conexión/);
  });
});

describe('<PerfilTributarioDelPropietario> — P-20: nada cambia con un clic de más', () => {
  it('🔴 un clic en el chip NO guarda: abre el menú con Sí / No / Sin definir y qué cambia en cada uno', async () => {
    await act(async () => { root.render(<PerfilTributarioDelPropietario propietario={base} onActualizado={() => {}} />); });
    await act(async () => { (container.querySelector('[data-testid="chip-reteiva"]') as HTMLButtonElement).click(); });
    await abrir('chip-reteiva');
    expect(updateMock).not.toHaveBeenCalled();
    const opciones = ['si', 'no', 'vacio'].map((o) => document.body.querySelector(`[data-testid="chip-reteiva-${o}"]`));
    expect(opciones.every(Boolean)).toBe(true);
    // La marcada es la de hoy (sin definir), y cada opción dice qué pasa en la próxima liquidación.
    expect(opciones[2]!.getAttribute('aria-checked')).toBe('true');
    expect(opciones[0]!.getAttribute('aria-checked')).toBe('false');
    for (const o of opciones) expect(o!.textContent).toMatch(/perfil\.proximaLiquidacion/);
  });

  it('elegir la opción que ya tiene no guarda nada', async () => {
    await act(async () => { root.render(<PerfilTributarioDelPropietario propietario={base} onActualizado={() => {}} />); });
    await elegir('chip-iva', 'si');
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('🔴 el aviso trae «Deshacer» con un id fijo (reemplaza al anterior), y deshacer vuelve al valor de antes', async () => {
    const onActualizado = vi.fn();
    updateMock.mockImplementation(async (_id: string, data: Partial<Propietario>) => ({ ...base, ...data }));
    await act(async () => { root.render(<PerfilTributarioDelPropietario propietario={base} onActualizado={onActualizado} />); });

    await elegir('chip-retefuente', 'si');
    expect(updateMock).toHaveBeenLastCalledWith('p1', { agenteRetenedorRenta: true });
    const [, opciones] = toast.success.mock.calls[0] as [string, { id: string; action: { label: string; onClick: () => void } }];
    expect(opciones.id).toBe('perfil-tributario-p1');
    expect(opciones.action.label).toBe('inmobiliaria.propietarios.detail.perfil.deshacer');

    await act(async () => { opciones.action.onClick(); await new Promise((r) => setTimeout(r, 0)); });
    // Antes era «no» (false): deshacer lo devuelve a «no», con el mismo id de aviso.
    expect(updateMock).toHaveBeenLastCalledWith('p1', { agenteRetenedorRenta: false });
    const [, segundo] = toast.success.mock.calls[1] as [string, { id: string }];
    expect(segundo.id).toBe('perfil-tributario-p1');
  });

  it('el error también usa el id fijo: no se apila sobre el aviso anterior', async () => {
    updateMock.mockRejectedValue(new Error('x'));
    await act(async () => { root.render(<PerfilTributarioDelPropietario propietario={base} onActualizado={() => {}} />); });
    await elegir('chip-reteica', 'no');
    expect((toast.error.mock.calls[0][1] as { id: string }).id).toBe('perfil-tributario-p1');
  });

  it('🔴 sin permiso (asesor) es de sólo lectura: sin botones, sin menú, y dice quién lo cambia', async () => {
    await act(async () => { root.render(<PerfilTributarioDelPropietario propietario={base} puedeEditar={false} onActualizado={() => {}} />); });
    expect(container.querySelectorAll('[data-testid="perfil-tributario"] button')).toHaveLength(0);
    expect(estado('chip-iva')).toBe('si');
    expect(container.querySelector('[data-testid="perfil-tributario-solo-lectura"]')?.textContent).toBe(
      'inmobiliaria.propietarios.detail.perfil.soloLectura',
    );
  });
});
