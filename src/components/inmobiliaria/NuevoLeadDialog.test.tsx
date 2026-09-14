/**
 * Cargar un lead a mano: lo que se manda, y qué se ve cuando el back dice que no.
 *
 * El caso que lo motiva (P2): un pipeline sin leads no tenía cómo empezar.
 * Y la regla de la casa: un 400 que explica va al lado de su campo, no a un
 * «Intenta de nuevo».
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import * as React from 'react';

const { crear, toastSuccess } = vi.hoisted(() => ({
  crear: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  pipelineApi: { create: crear },
}));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: toastSuccess, error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/components/ui/dialog', () => {
  const Pasa = ({ children, ...rest }: React.ComponentProps<'div'>) => <div {...rest}>{children}</div>;
  return {
    Dialog: ({ open, children }: { open: boolean; children?: React.ReactNode }) =>
      open ? <div>{children}</div> : null,
    DialogContent: Pasa,
    DialogHeader: Pasa,
    DialogFooter: Pasa,
    DialogTitle: Pasa,
    DialogDescription: Pasa,
  };
});
// El Select de Radix no se abre en happy-dom: cada opción es un botón.
vi.mock('@/components/ui/select', async () => {
  const R = await import('react');
  const Elegir = R.createContext<(v: string) => void>(() => {});
  return {
    Select: ({ children, onValueChange }: { children?: React.ReactNode; onValueChange: (v: string) => void }) => (
      <Elegir.Provider value={onValueChange}>{children}</Elegir.Provider>
    ),
    SelectTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    SelectItem: function Opcion({ value, children }: { value: string; children?: React.ReactNode }) {
      const elegir = R.useContext(Elegir);
      return (
        <button type="button" data-testid={`opcion-${value}`} onClick={() => elegir(value)}>
          {children}
        </button>
      );
    },
  };
});

import { NuevoLeadDialog, erroresDelLead } from './NuevoLeadDialog';
import { ApiError } from '@/lib/api/client';
import type { Consignacion } from '@/lib/types/inmobiliaria';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CONSIGNACIONES = [
  { id: 'cons-1', propertyTitle: 'Apartamento 402 · Laureles' },
  { id: 'cons-2', propertyTitle: 'Casa 12 · Envigado' },
] as unknown as Consignacion[];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  crear.mockReset();
  toastSuccess.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function montar(props: Partial<React.ComponentProps<typeof NuevoLeadDialog>> = {}) {
  const onCreado = vi.fn();
  act(() => {
    root.render(
      <NuevoLeadDialog
        abierto
        consignaciones={CONSIGNACIONES}
        onCerrar={() => {}}
        onCreado={onCreado}
        {...props}
      />,
    );
  });
  return { onCreado };
}

const $ = <T extends HTMLElement>(sel: string) => container.querySelector(sel) as T;

async function escribir(id: string, valor: string) {
  const input = $<HTMLInputElement>(`#${id}`);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function llenarLoMinimo() {
  await act(async () => {
    $<HTMLButtonElement>('[data-testid="opcion-cons-1"]').click();
  });
  await escribir('nuevo-lead-nombre', '  Ana Restrepo ');
}

const guardar = () => $<HTMLButtonElement>('[data-testid="nuevo-lead-guardar"]');

describe('NuevoLeadDialog', () => {
  it('no deja guardar sin inmueble y sin nombre', async () => {
    montar();
    expect(guardar().disabled).toBe(true);
    await escribir('nuevo-lead-nombre', 'Ana');
    // Falta el inmueble.
    expect(guardar().disabled).toBe(true);
  });

  it('manda lo que el back exige, sin campos vacíos, y avisa al crear', async () => {
    crear.mockResolvedValue({ id: 'nuevo' });
    const { onCreado } = montar();
    await llenarLoMinimo();
    await escribir('nuevo-lead-telefono', '300 123 4567');

    await act(async () => {
      guardar().click();
    });

    expect(crear).toHaveBeenCalledWith({
      consignacionId: 'cons-1',
      candidateName: 'Ana Restrepo',
      candidatePhone: '300 123 4567',
    });
    expect(onCreado).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('un correo mal escrito se dice antes de mandar nada', async () => {
    montar();
    await llenarLoMinimo();
    await escribir('nuevo-lead-correo', 'ana@');
    expect(guardar().disabled).toBe(true);
    expect(container.textContent).toContain('Ese correo no es válido.');
  });

  it('el 400 del back va al lado de SU campo, y no cierra', async () => {
    crear.mockRejectedValue(new ApiError(400, ['candidateEmail must be an email']));
    const { onCreado } = montar();
    await llenarLoMinimo();
    await escribir('nuevo-lead-correo', 'ana@correo.co');

    await act(async () => {
      guardar().click();
    });

    expect($('[data-testid="error-candidateEmail"]')?.textContent).toBe('Ese correo no es válido.');
    expect(onCreado).not.toHaveBeenCalled();
  });

  it('un 404 dice que el inmueble ya no está, al lado del inmueble', async () => {
    crear.mockRejectedValue(new ApiError(404, 'Consignacion with ID x not found in this agency'));
    montar();
    await llenarLoMinimo();

    await act(async () => {
      guardar().click();
    });

    expect($('[data-testid="error-consignacionId"]')?.textContent).toContain('ya no está consignado');
  });

  it('una caída de red pide reintentar (ahí sí sirve)', async () => {
    crear.mockRejectedValue(new TypeError('Failed to fetch'));
    montar();
    await llenarLoMinimo();

    await act(async () => {
      guardar().click();
    });

    expect($('[data-testid="nuevo-lead-error"]')?.textContent).toContain('intenta de nuevo');
  });

  it('un doble clic manda UN lead', async () => {
    let resolver: (() => void) | undefined;
    crear.mockImplementation(() => new Promise<void>((r) => { resolver = r; }));
    montar();
    await llenarLoMinimo();

    await act(async () => {
      guardar().click();
      guardar().click();
    });
    expect(crear).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolver?.();
    });
  });

  it('sin inmuebles consignados explica por qué no se puede', () => {
    montar({ consignaciones: [] });
    expect($('[data-testid="nuevo-lead-sin-inmuebles"]')).not.toBeNull();
    expect(guardar().disabled).toBe(true);
  });
});

describe('erroresDelLead', () => {
  it('reparte los mensajes del ValidationPipe por campo y deja sueltos los demás', () => {
    const r = erroresDelLead(
      new ApiError(400, ['candidateName must be a string', 'algo más que no es de un campo']),
    );
    expect(r.porCampo.candidateName).toBe('Escribe el nombre de la persona.');
    expect(r.general).toBe('algo más que no es de un campo');
  });

  it('un 409 con mensaje del back se muestra tal cual', () => {
    const r = erroresDelLead(new ApiError(409, 'Ese candidato ya está en el pipeline de ese inmueble.'));
    expect(r.general).toBe('Ese candidato ya está en el pipeline de ese inmueble.');
  });
});
