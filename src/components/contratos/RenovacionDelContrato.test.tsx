/**
 * La sección de renovación de la ficha del contrato.
 *
 * Lo que se protege acá es que la sección no MIENTA:
 *   - dice la fecha del aviso, la del vencimiento y el canon nuevo tal cual
 *     los calculó el back (acá no se recalcula nada);
 *   - con la perilla de la agencia apagada lo DICE, en vez de prometer una
 *     renovación que el cron no va a hacer;
 *   - con un aviso registrado deja de prometer la prórroga y explica que el
 *     inmueble queda disponible;
 *   - el aviso pide quién y por qué, y sin motivo no se puede confirmar;
 *   - sin permiso de edición no se ofrece ningún botón.
 */
import * as React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const delContrato = vi.fn();
const registrarAviso = vi.fn();
const borrarAviso = vi.fn();

vi.mock('@/lib/api/renovacion-automatica.service', async () => {
  const real = await vi.importActual<
    typeof import('@/lib/api/renovacion-automatica.service')
  >('@/lib/api/renovacion-automatica.service');
  return {
    ...real,
    renovacionAutomaticaApi: {
      delContrato: (...a: unknown[]) => delContrato(...a),
      registrarAviso: (...a: unknown[]) => registrarAviso(...a),
      borrarAviso: (...a: unknown[]) => borrarAviso(...a),
    },
  };
});

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { RenovacionDelContrato } from './RenovacionDelContrato';
import { ApiError } from '@/lib/api/client';
import type { PlanDelContrato } from '@/lib/api/renovacion-automatica.service';

/** El ejemplo de Nico: contrato del 3 de septiembre, canon $1.000.000. */
const PLAN: PlanDelContrato = {
  contractId: 'contrato-1',
  renovacionId: 'renov-1',
  automaticaPrendida: true,
  plan: {
    accion: 'nada',
    porQue: 'Se renueva sola el 3 de septiembre de 2027 si nadie avisa antes del 3 de junio de 2027.',
    fechaDeAviso: '2027-06-03',
    finDeVigencia: '2027-09-03',
    nuevoVencimiento: '2028-09-03',
    mesesDeTermino: 12,
    canonActual: 1_000_000,
    canonNuevo: 1_052_000,
    incremento: 52_000,
    incrementoPct: 5.2,
    ipc: { rate: 5.2, anio: 2026 },
    seRenuevaSola: true,
  },
  aviso: null,
  propuestaEnviadaAt: null,
  sinPlanPorque: null,
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  delContrato.mockReset().mockResolvedValue(PLAN);
  registrarAviso.mockReset().mockResolvedValue(undefined);
  borrarAviso.mockReset().mockResolvedValue(undefined);
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
});

async function montar(puedeEditar = true) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <RenovacionDelContrato contract={{ id: 'contrato-1' }} puedeEditar={puedeEditar} />,
    );
  });
  return container;
}

const texto = (c: HTMLElement) => c.textContent ?? '';
const porTestId = (id: string) =>
  document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

describe('RenovacionDelContrato', () => {
  it('dice cuándo se renueva sola, con qué incremento y hasta cuándo se puede avisar', async () => {
    const c = await montar();
    const t = texto(c);
    expect(t).toContain('3 de septiembre de 2027');
    expect(t).toContain('3 de junio de 2027');
    expect(t).toContain('5,20 %');
    // `formatCurrency` escribe «$ 1.000.000» (con espacio): se compara el
    // número, no el formato de la moneda, que es del design system.
    expect(t).toContain('1.000.000');
    expect(t).toContain('1.052.000');
    // Y el término: se prorroga por 12 meses hasta 2028.
    expect(t).toContain('12 meses');
    expect(t).toContain('3 de septiembre de 2028');
    expect(t).toContain('IPC de 2026');
  });

  it('con la perilla de la agencia apagada lo dice, en vez de prometer lo que no va a pasar', async () => {
    delContrato.mockResolvedValue({ ...PLAN, automaticaPrendida: false });
    await montar();
    expect(porTestId('renovacion-automatica-apagada')).not.toBeNull();
  });

  it('con la perilla prendida no aparece ese aviso', async () => {
    await montar();
    expect(porTestId('renovacion-automatica-apagada')).toBeNull();
  });

  it('sin IPC cargado no inventa un aumento y explica qué hacer', async () => {
    delContrato.mockResolvedValue({
      ...PLAN,
      plan: {
        ...PLAN.plan!,
        ipc: null,
        canonNuevo: 1_000_000,
        incremento: 0,
        incrementoPct: 0,
      },
    });
    const c = await montar();
    expect(texto(c)).toContain('con el mismo canon');
    expect(porTestId('renovacion-sin-ipc')).not.toBeNull();
  });

  it('con un aviso registrado deja de prometer la prórroga y dice quién avisó', async () => {
    delContrato.mockResolvedValue({
      ...PLAN,
      aviso: { at: '2027-05-20T00:00:00.000Z', por: 'INQUILINO', motivo: 'Se muda' },
    });
    const c = await montar();
    expect(porTestId('renovacion-con-aviso')).not.toBeNull();
    const t = texto(c);
    expect(t).toContain('El inquilino avisó que no renueva');
    expect(t).toContain('queda disponible');
    expect(t).toContain('Se muda');
    expect(porTestId('renovacion-retirar-aviso')).not.toBeNull();
  });

  it('el aviso pide quién y por qué: sin motivo no se puede confirmar', async () => {
    await montar();
    await act(async () => {
      porTestId('renovacion-abrir-aviso')!.click();
    });
    const confirmar = porTestId('aviso-confirmar') as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);

    const motivo = porTestId('aviso-motivo') as HTMLTextAreaElement;
    await act(async () => {
      porTestId('aviso-parte-PROPIETARIO')!.click();
    });
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value',
      )!.set!;
      setter.call(motivo, 'Va a vender el inmueble');
      motivo.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect((porTestId('aviso-confirmar') as HTMLButtonElement).disabled).toBe(false);

    await act(async () => {
      porTestId('aviso-confirmar')!.click();
    });
    expect(registrarAviso).toHaveBeenCalledWith('renov-1', {
      parte: 'PROPIETARIO',
      motivo: 'Va a vender el inmueble',
    });
  });

  it('sin permiso de edición no se ofrece ningún botón', async () => {
    await montar(false);
    expect(porTestId('renovacion-abrir-aviso')).toBeNull();
    expect(porTestId('renovacion-retirar-aviso')).toBeNull();
  });

  it('un contrato sin fecha de fin no promete nada: dice qué falta', async () => {
    delContrato.mockResolvedValue({
      ...PLAN,
      plan: null,
      renovacionId: null,
      sinPlanPorque: 'SIN_VENCIMIENTO',
    });
    const c = await montar();
    expect(porTestId('renovacion-sin-plan')).not.toBeNull();
    expect(texto(c)).toContain('no tiene fecha de fin');
  });

  it('un fallo NO se pinta como «no se renueva»', async () => {
    delContrato.mockRejectedValue(new Error('back caído'));
    await montar();
    // El cartel de la casa, con reintentar: un 500 o la red sí pueden cambiar.
    expect(porTestId('fallo-de-carga')).not.toBeNull();
    expect(porTestId('reintentar')).not.toBeNull();
    expect(porTestId('renovacion-frase')).toBeNull();
  });

  it('sobre un 404 no ofrece reintentar: el contrato no va a aparecer', async () => {
    delContrato.mockRejectedValue(new ApiError(404, 'Contract not found'));
    await montar();
    expect(porTestId('fallo-de-carga')?.getAttribute('data-tipo')).toBe('noExiste');
    expect(porTestId('reintentar')).toBeNull();
  });
});
