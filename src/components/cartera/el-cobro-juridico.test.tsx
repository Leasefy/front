/**
 * 🔴 EL COBRO JURÍDICO en pantalla (17-09-2026).
 *
 * «Los abogados se registran por inmobiliaria. UNA persona pasa el caso; el
 * sistema lo SUGIERE desde el día 90 sin póliza. Los honorarios van a cargo del
 * inquilino sólo si el contrato lo pacta, entran a su ESTADO DE CUENTA al pasar
 * el caso (un cargo de una vez, % de la deuda, con tope), y
 * son del abogado: cuenta por pagar.»
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { api, toastMock, permisos } = vi.hoisted(() => ({
  api: {
    abogados: vi.fn(),
    crearAbogado: vi.fn(),
    actualizarAbogado: vi.fn(),
    configuracion: vi.fn(),
    guardarConfiguracion: vi.fn(),
    sugeridos: vi.fn(),
    casos: vi.fn(),
    cerrar: vi.fn(),
    pasar: vi.fn(),
    pactarEnElContrato: vi.fn(),
    honorarios: vi.fn(),
    pagarHonorarios: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn() },
  permisos: { canAccess: vi.fn((_m: string, _a: string) => true), isLoading: false },
}));

vi.mock('@/lib/api/juridico.service', () => ({ juridicoApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }));
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error }: { error: unknown }) => (
    <div data-testid="fallo">{error instanceof Error ? error.message : String(error)}</div>
  ),
}));

import { CobroJuridico } from './CobroJuridico';
import { ApiError } from '@/lib/api/client';
import { MENSAJES_DEL_JURIDICO } from '@/lib/cartera/limites-del-juridico';

const ABOGADO = {
  id: 'ab-1',
  nombre: 'Martínez & Asociados',
  documento: '900123456',
  email: null,
  telefono: null,
  activo: true,
};

let root: Root | null = null;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<CobroJuridico />);
  });
  await esperar();
  await esperar();
}

function $(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`No se encontró ${selector}`);
  return el;
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
  await esperar();
  await esperar();
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  permisos.canAccess.mockReset();
  permisos.canAccess.mockReturnValue(true);
  api.abogados.mockResolvedValue([ABOGADO]);
  api.configuracion.mockResolvedValue({
    pactaHonorarios: true,
    honorariosPct: 10,
    honorariosTopeCop: 3_000_000,
  });
  api.sugeridos.mockResolvedValue([]);
  api.casos.mockResolvedValue([]);
  api.honorarios.mockResolvedValue([]);
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  root = null;
  document.body.innerHTML = '';
});

describe('el cobro jurídico', () => {
  it('🔴 el sugerido dice los días y la deuda, y pasar el caso manda el abogado elegido', async () => {
    api.sugeridos.mockResolvedValue([
      {
        contractId: 'ct-1',
        numero: '1686',
        tenantId: 'u-1',
        tenantName: 'Ana Pérez',
        direccion: 'Cra 76 #45-12',
        diasDeMora: 132,
        deudaCop: 4_000_000,
        pactaHonorarios: true,
      },
    ]);
    api.pasar.mockResolvedValue({ id: 'caso-1' });
    await montar();

    const fila = $('[data-testid="sugerido-ct-1"]');
    expect(fila.textContent).toContain('132 días');
    expect(fila.textContent).toContain('pacta honorarios');

    const select = fila.querySelector('select') as HTMLSelectElement;
    await act(async () => {
      select.value = 'ab-1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await clic($('[data-testid="pasar-ct-1"]'));

    expect(api.pasar).toHaveBeenCalledWith({
      contractId: 'ct-1',
      abogadoId: 'ab-1',
      motivo: '132 días de mora, sin póliza.',
    });
  });

  it('el caso en jurídico dice qué se pactó y deja cambiarlo por contrato', async () => {
    api.casos.mockResolvedValue([
      {
        id: 'caso-1',
        contractId: 'ct-1',
        tenantId: 'u-1',
        estado: 'EN_JURIDICO',
        pasadoAt: '2026-09-17T10:00:00.000Z',
        motivo: null,
        diasDeMora: 132,
        deudaAlPasarCop: 4_000_000,
        pactaHonorarios: true,
        honorariosPct: 10,
        honorariosTopeCop: 3_000_000,
        cerradoAt: null,
        motivoDeCierre: null,
        abogado: { id: 'ab-1', nombre: 'Martínez & Asociados', documento: null },
        honorariosCausadosCop: 100_000,
        honorariosPorPagarCop: 100_000,
      },
    ]);
    api.pactarEnElContrato.mockResolvedValue({ contractId: 'ct-1', pacta: false, efectivo: false });
    await montar();

    const caso = $('[data-testid="caso-caso-1"]');
    expect(caso.textContent).toContain('10 % de la deuda');
    expect(caso.textContent).toContain('causados');

    await clic($('[data-testid="pactar-ct-1"]'));
    expect(api.pactarEnElContrato).toHaveBeenCalledWith('ct-1', false);
    expect(toastMock.success).toHaveBeenCalledWith(
      'Este contrato NO le cobra honorarios al inquilino.',
    );
  });

  it('🔴 el honorario entra al ESTADO DE CUENTA del inquilino y es plata del abogado', async () => {
    api.honorarios.mockResolvedValue([
      {
        id: 'h-1',
        casoId: 'caso-1',
        contractId: 'ct-1',
        abogado: { id: 'ab-1', nombre: 'Martínez & Asociados' },
        origen: 'AL_PASAR',
        baseCop: 4_000_000,
        honorarioCop: 400_000,
        estado: 'POR_PAGAR_AL_ABOGADO',
        conceptoDeUnaVezId: 'cargo-1',
        reciboId: null,
        pagadoAt: null,
        createdAt: '2026-09-17T10:00:00.000Z',
      },
    ]);
    api.pagarHonorarios.mockResolvedValue({ pagados: 1 });
    await montar();

    const bloque = $('[data-testid="honorarios"]');
    expect(bloque.textContent).toContain('no es ingreso de la inmobiliaria');
    expect(bloque.textContent).toContain('al pasar cada caso');
    const fila = $('[data-testid="honorario-h-1"]');
    expect(fila.textContent).toContain('de deuda al pasar');
    expect(fila.textContent).toContain('cargado al estado de cuenta del inquilino');
    await clic($('[data-testid="pagar-h-1"]'));
    expect(api.pagarHonorarios).toHaveBeenCalledWith(['h-1']);
  });

  it('las filas VIEJAS (origen RECAUDO) se siguen leyendo igual', async () => {
    api.honorarios.mockResolvedValue([
      {
        id: 'h-viejo',
        casoId: 'caso-1',
        contractId: 'ct-1',
        abogado: { id: 'ab-1', nombre: 'Martínez & Asociados' },
        origen: 'RECAUDO',
        baseCop: 1_000_000,
        honorarioCop: 100_000,
        estado: 'POR_PAGAR_AL_ABOGADO',
        conceptoDeUnaVezId: null,
        reciboId: 'r-1',
        pagadoAt: null,
        createdAt: '2026-09-17T10:00:00.000Z',
      },
    ]);
    await montar();
    expect($('[data-testid="honorario-h-viejo"]').textContent).toContain('recaudados');
  });

  it('🔴 cerrar el caso SIN COBRO saca el cargo del estado de cuenta del inquilino', async () => {
    api.casos.mockResolvedValue([
      {
        id: 'caso-1',
        contractId: 'ct-1',
        tenantId: 'u-1',
        estado: 'EN_JURIDICO',
        pasadoAt: '2026-09-17T10:00:00.000Z',
        motivo: null,
        diasDeMora: 132,
        deudaAlPasarCop: 4_000_000,
        pactaHonorarios: true,
        honorariosPct: 10,
        honorariosTopeCop: null,
        cerradoAt: null,
        motivoDeCierre: null,
        abogado: { id: 'ab-1', nombre: 'Martínez & Asociados', documento: null },
        honorariosCausadosCop: 400_000,
        honorariosPorPagarCop: 400_000,
      },
    ]);
    api.cerrar.mockResolvedValue({});
    await montar();

    await clic($('[data-testid="cerrar-caso-1"]'));
    const motivo = $('#motivo-cierre') as HTMLTextAreaElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value',
      )!.set!.call(motivo, 'El propietario retiró la demanda.');
      motivo.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await clic($('[data-testid="cerrar-sin-cobro"]'));
    await clic($('[data-testid="confirmar-cerrar-caso"]'));

    expect(api.cerrar).toHaveBeenCalledWith(
      'caso-1',
      'El propietario retiró la demanda.',
      true,
    );
  });

  it('sin cobros:edit se ve todo pero no se mueve nada', async () => {
    permisos.canAccess.mockImplementation((_m: string, a: string) => a === 'view');
    api.sugeridos.mockResolvedValue([
      {
        contractId: 'ct-1',
        numero: '1686',
        tenantId: null,
        tenantName: 'Ana Pérez',
        direccion: 'Cra 76 #45-12',
        diasDeMora: 132,
        deudaCop: 4_000_000,
        pactaHonorarios: false,
      },
    ]);
    await montar();
    expect($('[data-testid="sugerido-ct-1"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="pasar-ct-1"]')).toBeNull();
    expect(document.querySelector('[data-testid="registrar-abogado"]')).toBeNull();
  });

  it('sin la migración el back responde 503 y la pantalla lo dice', async () => {
    api.abogados.mockRejectedValue(
      new Error('El cobro jurídico todavía no está disponible: falta la migración 20260917170000.'),
    );
    await montar();
    expect(document.body.textContent).toContain('20260917170000');
  });
});

/*
 * Tanda 2 del sistema de errores (02-10-2026). El jurídico tenía su propia
 * copia de `mensaje(e)` (el `error.message` crudo) y activar o desactivar un
 * abogado era un `void …then(cargar)` sin `catch`: si fallaba, nada. Ahora el
 * tope de los honorarios se ataja con la frase del back, un 400 va a su
 * campo, un 5xx dice que fue nuestro con la referencia, y el abogado avisa.
 */
describe('el cobro jurídico — los errores en palabras', () => {
  const cincoXX = () =>
    new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
      statusCode: 500,
      code: 'ERROR_INTERNO',
      message: 'Error interno del servidor',
      referencia: 'ab12cd34',
    });

  async function escribirYSalir(selector: string, valor: string) {
    const input = $(selector) as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
      setter.call(input, valor);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      input.focus();
      input.blur();
    });
    await esperar();
  }

  it('🔴 un tope con ceros de más se ataja debajo del campo, con la frase del back, y no viaja', async () => {
    await montar();
    await escribirYSalir('[data-testid="honorarios-tope"]', '30000000000');
    expect(api.guardarConfiguracion).not.toHaveBeenCalled();
    expect($('#honorarios-tope-error').textContent).toBe(MENSAJES_DEL_JURIDICO.topeMaximo);
    expect($('#honorarios-tope').getAttribute('aria-describedby')).toBe('honorarios-tope-error');
  });

  it('un porcentaje de más de 100 se ataja igual', async () => {
    await montar();
    await escribirYSalir('[data-testid="honorarios-pct"]', '150');
    expect(api.guardarConfiguracion).not.toHaveBeenCalled();
    expect($('#honorarios-pct-error').textContent).toBe(MENSAJES_DEL_JURIDICO.porcentajeMaximo);
  });

  it('🔴 un 400 con campos va a SU campo y le da el foco, no al aviso', async () => {
    api.guardarConfiguracion.mockRejectedValue(
      new ApiError(400, [MENSAJES_DEL_JURIDICO.topeMaximo], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [MENSAJES_DEL_JURIDICO.topeMaximo],
        campos: [{ campo: 'honorariosTopeCop', regla: 'maximo', mensaje: MENSAJES_DEL_JURIDICO.topeMaximo }],
      }),
    );
    await montar();
    await escribirYSalir('[data-testid="honorarios-tope"]', '5.000.000');
    expect(api.guardarConfiguracion).toHaveBeenCalledWith({ honorariosTopeCop: 5_000_000 });
    expect($('#honorarios-tope-error').textContent).toBe(MENSAJES_DEL_JURIDICO.topeMaximo);
    expect(document.activeElement?.id).toBe('honorarios-tope');
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it('🔴 un 5xx al guardar dice «de nuestro lado» con la referencia', async () => {
    api.guardarConfiguracion.mockRejectedValue(cincoXX());
    await montar();
    await escribirYSalir('[data-testid="honorarios-tope"]', '5000000');
    const descripcion = String(toastMock.error.mock.calls[0]![1]?.description);
    expect(descripcion).toContain('No pudimos guardar lo pactado: algo falló de nuestro lado');
    expect(descripcion).toContain('ab12cd34');
  });

  it('sin respuesta (la red): ahí sí se habla de la conexión', async () => {
    api.pagarHonorarios.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    api.honorarios.mockResolvedValue([
      {
        id: 'h-1',
        casoId: 'k-1',
        abogado: { id: 'ab-1', nombre: 'Martínez & Asociados' },
        reciboId: null,
        recaudoCop: null,
        honorarioCop: 400_000,
        origen: 'AL_PASAR',
        baseCop: 4_000_000,
        conceptoDeUnaVezId: 'cu-1',
        estado: 'POR_PAGAR_AL_ABOGADO',
        pagadoAt: null,
        createdAt: '2026-09-20T00:00:00.000Z',
      },
    ]);
    await montar();
    await clic($('[data-testid="pagar-h-1"]'));
    expect(String(toastMock.error.mock.calls[0]![1]?.description)).toMatch(/conexión/);
  });

  it('🔴 desactivar un abogado que falla AVISA (antes no decía nada)', async () => {
    api.actualizarAbogado.mockRejectedValue(cincoXX());
    await montar();
    const boton = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-testid="abogados"] button')).find(
      (b) => b.textContent?.trim() === 'Desactivar',
    )!;
    await clic(boton);
    expect(api.actualizarAbogado).toHaveBeenCalledWith('ab-1', { activo: false });
    expect(toastMock.error.mock.calls[0]![0]).toBe('No se pudo desactivar el abogado');
    expect(String(toastMock.error.mock.calls[0]![1]?.description)).toContain('ab12cd34');
  });
});
