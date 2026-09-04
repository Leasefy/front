/**
 * Perfil tributario del propietario — chips de tres estados que guardan.
 * `null` no es «no»: se ve distinto (borde punteado) y un clic lo define.
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

describe('<PerfilTributarioDelPropietario>', () => {
  it('muestra el tipo de persona y los tres estados: sí, no y sin definir', async () => {
    await act(async () => { root.render(<PerfilTributarioDelPropietario propietario={base} onActualizado={() => {}} />); });
    expect(container.querySelector('[data-testid="chip-tipo-persona"]')?.textContent).toBe('inmobiliaria.propietarios.detail.personaJuridica');
    expect(estado('chip-iva')).toBe('si');
    expect(estado('chip-retefuente')).toBe('no');
    expect(estado('chip-reteiva')).toBe('vacio');
    expect(container.querySelector('[data-testid="chip-reteiva"]')?.textContent).toBe('inmobiliaria.propietarios.detail.reteivaSinDefinir');
  });

  it('un clic define el dato (sin definir → sí) y guarda con PUT; el siguiente lo pasa a no', async () => {
    const onActualizado = vi.fn();
    updateMock.mockImplementation(async (_id: string, data: Partial<Propietario>) => ({ ...base, ...data }));
    await act(async () => { root.render(<PerfilTributarioDelPropietario propietario={base} onActualizado={onActualizado} />); });

    await act(async () => { (container.querySelector('[data-testid="chip-reteiva"]') as HTMLButtonElement).click(); await new Promise((r) => setTimeout(r, 0)); });
    expect(updateMock).toHaveBeenCalledWith('p1', { agenteRetenedorIva: true });
    expect(onActualizado).toHaveBeenCalledWith(expect.objectContaining({ agenteRetenedorIva: true }));

    await act(async () => { (container.querySelector('[data-testid="chip-iva"]') as HTMLButtonElement).click(); await new Promise((r) => setTimeout(r, 0)); });
    expect(updateMock).toHaveBeenLastCalledWith('p1', { responsableIva: false });
  });

  it('si el guardado falla, lo dice y no afirma el cambio', async () => {
    const onActualizado = vi.fn();
    updateMock.mockRejectedValue(new Error('500'));
    await act(async () => { root.render(<PerfilTributarioDelPropietario propietario={base} onActualizado={onActualizado} />); });
    await act(async () => { (container.querySelector('[data-testid="chip-reteica"]') as HTMLButtonElement).click(); await new Promise((r) => setTimeout(r, 0)); });
    expect(onActualizado).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});
