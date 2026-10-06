/**
 * ConfigIpcPorAnio — el IPC de diciembre por año, en Configuración → Perfil (N3).
 *
 * La tabla del código no tiene el IPC de 2026; sin él, las renovaciones que
 * rigen en 2027 salían con el mismo canon. La inmobiliaria lo carga acá sin
 * esperar un despliegue. Lo que se protege: se guarda el mapa ENTERO (el back
 * lo reemplaza), se valida como el back (mayor que 0, hasta 100, dos
 * decimales), vaciar un año lo saca, un fallo deja el campo como estaba, y la
 * pantalla no sugiere ninguna cifra.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { AgencyProfile } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({
  toast: { error: toastError, success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { ConfigIpcPorAnio, ANCLA_IPC_POR_ANIO, aniosAOfrecer, leerIpcDelAnio } from './ConfigIpcPorAnio';
import { ApiError } from '@/lib/api/client';
import { MENSAJES_DEL_IPC } from '@/lib/configuracion/limites-del-ipc';

const HOY = new Date(2026, 8, 14);

const AGENCIA: AgencyProfile = {
  id: 'ag-1',
  name: 'Portofino',
  memberRole: 'ADMIN',
  ipcVigente: null,
  ipcPorAnio: {},
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  toastError.mockReset();
});

/** Un 400 del back con sus `campos`, como lo arma `apiClient`. */
function cuatrocientos(campos: Array<{ campo: string; mensaje: string }>) {
  return new ApiError(
    400,
    campos.map((c) => c.mensaje),
    'DATOS_INVALIDOS',
    {
      statusCode: 400,
      code: 'DATOS_INVALIDOS',
      message: campos.map((c) => c.mensaje),
      campos: campos.map((c) => ({ ...c, regla: 'otro' })),
    },
  );
}

type Props = Partial<React.ComponentProps<typeof ConfigIpcPorAnio>>;

async function montar(props: Props = {}) {
  const onSave = props.onSave ?? vi.fn().mockResolvedValue(undefined);
  await act(async () => {
    root.render(<ConfigIpcPorAnio agency={AGENCIA} hoy={HOY} {...props} onSave={onSave} />);
  });
  return onSave as ReturnType<typeof vi.fn>;
}

const campo = (anio: number) => container.querySelector<HTMLInputElement>(`[data-testid="ipc-anio-${anio}"]`);

async function escribirYSalir(input: HTMLInputElement | null, valor: string) {
  if (!input) throw new Error('no hay campo');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    // React mapea `onBlur` al `focusout` nativo (que sí burbujea).
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  });
}

describe('leerIpcDelAnio — lo mismo que acepta el back', () => {
  it('con coma o con punto', () => {
    expect(leerIpcDelAnio('5,3')).toBe(5.3);
    expect(leerIpcDelAnio('5.30')).toBe(5.3);
  });

  it('🔴 el tope es 100 % (Nico, 02-10-2026): 30,01 y 100 se cargan', () => {
    expect(leerIpcDelAnio('30,01')).toBe(30.01);
    expect(leerIpcDelAnio('100')).toBe(100);
  });

  it('vacío es «sin cargar»', () => {
    expect(leerIpcDelAnio('  ')).toBeNull();
  });

  it.each(['0', '0,00', '5,123', '100,01', '101', 'cinco', '-1'])('🔴 «%s» no es un IPC que se pueda cargar', (texto) => {
    expect(leerIpcDelAnio(texto)).toBeUndefined();
  });
});

describe('aniosAOfrecer', () => {
  it('el año actual y el anterior, del más nuevo al más viejo', () => {
    expect(aniosAOfrecer(HOY, {})).toEqual([2026, 2025]);
  });

  it('más los que ya estaban cargados', () => {
    expect(aniosAOfrecer(HOY, { '2019': 3.8 })).toEqual([2026, 2025, 2019]);
  });
});

describe('ConfigIpcPorAnio', () => {
  it('ofrece un campo por año y pinta lo guardado con coma', async () => {
    await montar({ agency: { ...AGENCIA, ipcPorAnio: { '2026': 5.3, '2019': 3.8 } } });
    expect(campo(2026)?.value).toBe('5,3');
    expect(campo(2025)?.value).toBe('');
    expect(campo(2019)?.value).toBe('3,8');
  });

  it('🔴 no sugiere ninguna cifra: el campo vacío no trae un número de ejemplo', async () => {
    await montar();
    expect(campo(2026)?.placeholder).not.toMatch(/\d/);
  });

  it('🔴 cargar el IPC de 2026 guarda el mapa ENTERO con ese año', async () => {
    const onSave = await montar({ agency: { ...AGENCIA, ipcPorAnio: { '2025': 5.1 } } });
    await escribirYSalir(campo(2026), '5,3');
    expect(onSave).toHaveBeenCalledWith({ ipcPorAnio: { '2025': 5.1, '2026': 5.3 } });
  });

  it('vaciar un año lo saca del mapa', async () => {
    const onSave = await montar({ agency: { ...AGENCIA, ipcPorAnio: { '2026': 5.3, '2025': 5.1 } } });
    await escribirYSalir(campo(2026), '');
    expect(onSave).toHaveBeenCalledWith({ ipcPorAnio: { '2025': 5.1 } });
  });

  it('escribir lo mismo que ya estaba no manda nada', async () => {
    const onSave = await montar({ agency: { ...AGENCIA, ipcPorAnio: { '2026': 5.3 } } });
    await escribirYSalir(campo(2026), '5.3');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('🔴 un cero o tres decimales no llegan al back: se avisa y el campo vuelve a lo guardado', async () => {
    const onSave = await montar();
    await escribirYSalir(campo(2026), '0');
    expect(onSave).not.toHaveBeenCalled();
    expect(container.querySelector('#ipc-anio-2026-error')?.textContent).toContain('mayor que 0');
    // La MISMA frase que el back (`limites-del-ipc.ts`).
    expect(container.querySelector('#ipc-anio-2026-error')?.textContent).toContain(MENSAJES_DEL_IPC.ipcPorAnio);
    expect(campo(2026)?.value).toBe('');

    await escribirYSalir(campo(2026), '5,123');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('🔴 si el guardado falla, el campo vuelve a lo guardado', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('403'));
    await montar({ onSave });
    await escribirYSalir(campo(2026), '5,3');
    expect(onSave).toHaveBeenCalled();
    expect(campo(2026)?.value).toBe('');
    // Sin campos (un 403) el aviso ya lo dio el padre: no se repite.
    expect(toastError).not.toHaveBeenCalled();
  });

  it('🔴 un 400 del back sobre ipcPorAnio se dice BAJO el año que se guardaba, sin toast', async () => {
    const onSave = vi
      .fn()
      .mockRejectedValue(cuatrocientos([{ campo: 'ipcPorAnio', mensaje: MENSAJES_DEL_IPC.ipcPorAnio }]));
    await montar({ onSave, agency: { ...AGENCIA, ipcPorAnio: { '2025': 5.1 } } });
    await escribirYSalir(campo(2026), '5,3');

    expect(onSave).toHaveBeenCalledWith({ ipcPorAnio: { '2025': 5.1, '2026': 5.3 } });
    expect(container.querySelector('#ipc-anio-2026-error')?.textContent).toContain(MENSAJES_DEL_IPC.ipcPorAnio);
    expect(campo(2026)?.getAttribute('aria-invalid')).toBe('true');
    expect(container.querySelector('#ipc-anio-2025-error')?.textContent ?? '').not.toContain(MENSAJES_DEL_IPC.ipcPorAnio);
    expect(campo(2026)?.value).toBe('');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('lo que el back dice de otro campo va a un toast', async () => {
    const frase = 'Algo de otro campo.';
    const onSave = vi.fn().mockRejectedValue(cuatrocientos([{ campo: 'ipcVigente', mensaje: frase }]));
    await montar({ onSave });
    await escribirYSalir(campo(2026), '5,3');

    expect(toastError).toHaveBeenCalledWith(frase);
    expect(container.querySelector('#ipc-anio-2026-error')?.textContent ?? '').not.toContain(frase);
  });

  it('sin ser ADMIN no se puede escribir', async () => {
    await montar({ canEdit: false });
    expect(campo(2026)?.disabled).toBe(true);
    expect(campo(2025)?.disabled).toBe(true);
  });

  it('tiene el ancla a la que apunta el aviso de Renovaciones', async () => {
    await montar();
    expect(ANCLA_IPC_POR_ANIO).toBe('ipc-por-anio');
    expect(container.querySelector(`#${ANCLA_IPC_POR_ANIO}`)).not.toBeNull();
  });
});
