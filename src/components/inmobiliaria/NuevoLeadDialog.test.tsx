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

    expect($('#nuevo-lead-correo-error')?.textContent).toBe('Ese correo no es válido.');
    expect(onCreado).not.toHaveBeenCalled();
  });

  it('un 404 dice que el inmueble ya no está, al lado del inmueble', async () => {
    crear.mockRejectedValue(new ApiError(404, 'Consignacion with ID x not found in this agency'));
    montar();
    await llenarLoMinimo();

    await act(async () => {
      guardar().click();
    });

    expect($('#nuevo-lead-inmueble-error')?.textContent).toContain('ya no está consignado');
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

/**
 * 02-10-2026 · Sistema de errores: la frase del servidor va debajo de SU
 * campo (y el campo recibe el foco); un 5xx dice que es nuestro con la
 * referencia; sin respuesta, la conexión.
 */
function cuatrocientos(campos: Array<{ campo: string; regla: string; mensaje: string }>) {
  return new ApiError(
    400,
    campos.map((c) => c.mensaje),
    'DATOS_INVALIDOS',
    { statusCode: 400, code: 'DATOS_INVALIDOS', message: campos.map((c) => c.mensaje), campos },
  );
}

describe('NuevoLeadDialog — el sistema de errores', () => {
  it('🔴 un 400 con campos pinta la frase del servidor bajo su campo y le da el foco', async () => {
    const frase = 'El nombre puede tener hasta 200 caracteres.';
    crear.mockRejectedValue(cuatrocientos([{ campo: 'candidateName', regla: 'longitud_maxima', mensaje: frase }]));
    montar();
    await llenarLoMinimo();

    await act(async () => {
      guardar().click();
    });

    expect($('#nuevo-lead-nombre-error')?.textContent).toBe(frase);
    const nombre = $<HTMLInputElement>('#nuevo-lead-nombre');
    expect(nombre.getAttribute('aria-invalid')).toBe('true');
    expect(nombre.getAttribute('aria-describedby')).toBe('nuevo-lead-nombre-error');
    expect(document.activeElement).toBe(nombre);
    // No se repite al pie: ya está donde se corrige.
    expect($('[data-testid="nuevo-lead-error"]')).toBeNull();
  });

  it('🔴 un 5xx dice que falló de nuestro lado, con la referencia, sin culpar a la conexión', async () => {
    crear.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'a1b2c3d4',
      }),
    );
    montar();
    await llenarLoMinimo();

    await act(async () => {
      guardar().click();
    });

    const texto = $('[data-testid="nuevo-lead-error"]')?.textContent ?? '';
    expect(texto).toContain('de nuestro lado');
    expect(texto).toContain('a1b2c3d4');
    expect(texto.toLowerCase()).not.toContain('conexión');
  });

  it('🔴 status 0 (no hubo respuesta) habla de la conexión', async () => {
    crear.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    montar();
    await llenarLoMinimo();

    await act(async () => {
      guardar().click();
    });

    expect($('[data-testid="nuevo-lead-error"]')?.textContent).toContain('conexión');
  });
});

describe('erroresDelLead', () => {
  it('🔴 la frase del servidor pasa tal cual, también con los nombres de POST /inmobiliaria/leads', () => {
    const r = erroresDelLead(
      cuatrocientos([
        { campo: 'nombre', regla: 'longitud_maxima', mensaje: 'El nombre puede tener hasta 200 caracteres.' },
        { campo: 'telefono', regla: 'longitud_maxima', mensaje: 'El teléfono puede tener hasta 40 caracteres.' },
      ]),
    );
    expect(r.porCampo.candidateName).toBe('El nombre puede tener hasta 200 caracteres.');
    expect(r.porCampo.candidatePhone).toBe('El teléfono puede tener hasta 40 caracteres.');
    expect(r.general).toBeUndefined();
  });

  it('🔴 el presupuesto va bajo su campo; si el campo no se pinta (CRM sin habilitar), al pie', () => {
    const frase = 'El presupuesto no puede pasar de $2.000.000.000. Revisa que no sobren ceros.';
    const error = cuatrocientos([{ campo: 'presupuestoCop', regla: 'maximo', mensaje: frase }]);
    // Sin campo en pantalla → al pie: nunca se pierde.
    expect(erroresDelLead(error, { visibles: ['candidateName'] }).general).toBe(frase);
    // Con el campo «Presupuesto al mes» (Nico, 02-10-2026) → bajo el campo.
    expect(erroresDelLead(error).porCampo.presupuestoCop).toBe(frase);
  });


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
