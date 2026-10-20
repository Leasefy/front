/**
 * La barra de guardado de Configuración (Nico, 20-10-2026): «hago cambios aquí
 * y no hay botón de guardar … hay que mejorar la experiencia de guardado en
 * configuración, todo». Eligió: los campos se editan directo y abajo aparece
 * «N cambios sin guardar · Descartar · Guardar cambios».
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, useState } from 'react';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
const confirmar = vi.fn();
vi.mock('@/components/ui/confirmar', () => ({ confirmar: (...a: unknown[]) => confirmar(...a) }));

import { BarraDeGuardado, ProveedorDeCambiosPorGuardar, useCambiosPorGuardar } from './cambios-por-guardar';
import { ConfigPenalidadDeTerminacion } from '@/components/inmobiliaria/ConfigPenalidadDeTerminacion';
import { ConfigCicloDeVidaDelContrato } from '@/components/inmobiliaria/ConfigCicloDeVidaDelContrato';
import type { AgencyProfile, UpdateAgencyPayload } from '@/lib/types/inmobiliaria';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;
beforeEach(() => confirmar.mockReset().mockResolvedValue(true));
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

async function montar(ui: React.ReactNode) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <ProveedorDeCambiosPorGuardar>
        {ui}
        <BarraDeGuardado />
      </ProveedorDeCambiosPorGuardar>,
    );
  });
}

async function escribir(testId: string, valor: string) {
  const input = container!.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return input;
}

const barra = () => container!.querySelector('[data-testid="barra-de-guardado"]');
const cuantos = () => container!.querySelector('[data-testid="barra-de-guardado-cuantos"]')?.textContent;
const boton = (texto: string) =>
  [...container!.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto) ?? null;

/** Perfil de verdad: guardar relee la agencia y se la devuelve a TODAS las tarjetas. */
function PerfilDePrueba({ inicial, onSave }: { inicial: Partial<AgencyProfile>; onSave: (p: UpdateAgencyPayload) => void }) {
  const [agency, setAgency] = useState(inicial as AgencyProfile);
  const guardar = async (p: UpdateAgencyPayload) => {
    onSave(p);
    setAgency((a) => ({ ...a, ...p }) as AgencyProfile);
  };
  return (
    <>
      <ConfigPenalidadDeTerminacion agency={agency} onSave={guardar} />
      <ConfigCicloDeVidaDelContrato agency={agency} onSave={guardar} />
    </>
  );
}

describe('la barra de guardado de Configuración (Nico, 20-10)', () => {
  it('sin cambios no hay barra; la tarjeta no pinta su propio «Guardar»', async () => {
    await montar(<ConfigPenalidadDeTerminacion agency={{ penalidadTerminacionCanones: 3 } as AgencyProfile} onSave={vi.fn()} />);
    expect(barra()).toBeNull();
    expect(boton('Guardar')).toBeNull();
  });

  it('cambiar un campo muestra «1 cambio sin guardar» y «Guardar cambios» lo guarda', async () => {
    const onSave = vi.fn();
    await montar(<PerfilDePrueba inicial={{ penalidadTerminacionCanones: 3 }} onSave={onSave} />);
    await escribir('penalidad-por-defecto', '2,5');
    expect(cuantos()).toBe('1 cambio sin guardar');
    await act(async () => boton('Guardar cambios')!.click());
    expect(onSave).toHaveBeenCalledWith({ penalidadTerminacionCanones: 2.5 });
    expect(barra()?.getAttribute('data-estado')).toBe('guardado');
    expect(barra()?.textContent).toContain('Cambios guardados');
  });

  it('«Descartar» pregunta y vuelve a lo guardado', async () => {
    await montar(<ConfigPenalidadDeTerminacion agency={{ penalidadTerminacionCanones: 3 } as AgencyProfile} onSave={vi.fn()} />);
    const input = await escribir('penalidad-por-defecto', '7');
    await act(async () => boton('Descartar')!.click());
    expect(confirmar).toHaveBeenCalledWith(expect.objectContaining({ titulo: '¿Descartar los cambios?' }));
    expect(input.value).toBe('3');
    expect(cuantos()).toBeUndefined();
  });

  it('un dato que no se puede guardar deja la barra y dice que revisen', async () => {
    const onSave = vi.fn();
    await montar(<ConfigPenalidadDeTerminacion agency={{ penalidadTerminacionCanones: 3 } as AgencyProfile} onSave={onSave} />);
    await escribir('penalidad-por-defecto', '500');
    await act(async () => boton('Guardar cambios')!.click());
    expect(onSave).not.toHaveBeenCalled();
    expect(barra()?.textContent).toContain('No se guardó todo');
    expect(container!.textContent).toContain('La penalidad va en cánones, entre 0 y 99.');
  });

  it('🔴 guardar una tarjeta relee la agencia, y la otra NO pierde lo que tenía sin guardar', async () => {
    const onSave = vi.fn();
    await montar(
      <PerfilDePrueba inicial={{ penalidadTerminacionCanones: 3, diasAntesCartaIncremento: 30 }} onSave={onSave} />,
    );
    await escribir('penalidad-por-defecto', '2');
    await escribir('dias-antes-carta', '45');
    expect(cuantos()).toBe('2 cambios sin guardar');
    await act(async () => boton('Guardar cambios')!.click());
    expect(onSave).toHaveBeenCalledWith({ penalidadTerminacionCanones: 2 });
    expect(onSave).toHaveBeenCalledWith({ diasAntesCartaIncremento: 45 });
  });
});

describe('una confirmación propia de la tarjeta (Permisos)', () => {
  function ConConfirmacion({ onSave }: { onSave: () => void }) {
    const [abierta, setAbierta] = useState<((r: boolean | 'cancelado') => void) | null>(null);
    useCambiosPorGuardar({
      id: 'con-confirmacion',
      cambios: 1,
      guardar: () => new Promise((resolve) => setAbierta(() => resolve)),
      descartar: () => undefined,
    });
    return abierta ? (
      <div>
        <button type="button" onClick={() => abierta('cancelado')}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            onSave();
            abierta(true);
          }}
        >
          Confirmar
        </button>
      </div>
    ) : null;
  }

  it('cancelar deja la barra como estaba, sin decir que falló', async () => {
    const onSave = vi.fn();
    await montar(<ConConfirmacion onSave={onSave} />);
    await act(async () => {
      boton('Guardar cambios')!.click();
    });
    await act(async () => boton('Cancelar')!.click());
    expect(onSave).not.toHaveBeenCalled();
    expect(barra()?.getAttribute('data-estado')).toBe('quieto');
    expect(barra()?.textContent).not.toContain('No se guardó todo');
  });
});

describe('🔴 una tarjeta con cambios que se desmonta en medio de guardar (QA 20-10)', () => {
  function Tarjeta({ id, alGuardar }: { id: string; alGuardar: () => void }) {
    useCambiosPorGuardar({
      id,
      cambios: 1,
      guardar: async () => {
        alGuardar();
        return true;
      },
      descartar: () => undefined,
    });
    return <p>{id}</p>;
  }
  function DosTarjetas({ guardadas }: { guardadas: string[] }) {
    const [segunda, setSegunda] = useState(true);
    return (
      <>
        <Tarjeta
          id="primera"
          alGuardar={() => {
            guardadas.push('primera');
            setSegunda(false); // como Perfil cuando releía y pintaba el esqueleto
          }}
        />
        {segunda ? <Tarjeta id="segunda" alGuardar={() => guardadas.push('segunda')} /> : null}
      </>
    );
  }

  it('la barra NO dice «Cambios guardados»: lo de la que se fue no se guardó', async () => {
    const guardadas: string[] = [];
    await montar(<DosTarjetas guardadas={guardadas} />);
    expect(cuantos()).toBe('2 cambios sin guardar');
    await act(async () => boton('Guardar cambios')!.click());
    expect(guardadas).toEqual(['primera']);
    expect(barra()?.getAttribute('data-estado')).toBe('fallo');
    expect(barra()?.textContent).toContain('No se guardó todo');
  });
});

