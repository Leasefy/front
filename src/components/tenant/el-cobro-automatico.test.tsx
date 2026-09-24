/**
 * 🔴 EL COBRO AUTOMÁTICO DEL CANON (21-09-2026).
 *
 * Es la única pantalla donde alguien le da permiso al sistema para sacarle plata
 * sin mirar. Lo que este archivo amarra:
 *
 *   1. El texto que se autoriza lo manda el SERVIDOR y se muestra LITERAL. Si el
 *      front lo redactara, cambiar una palabra acá cambiaría el consentimiento.
 *   2. No se puede autorizar sin aceptar ese texto.
 *   3. El tope se PROPONE con holgura sobre el canon, no con el canon exacto: un
 *      tope justo se cae el primer mes que haya administración o un ajuste.
 *   4. Sin la migración o sin pasarela, la pantalla lo dice y no ofrece nada.
 *   5. El número de la tarjeta NO viaja a nuestro back: sólo el token.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, tokenizar, toastMock } = vi.hoisted(() => ({
  api: {
    estado: vi.fn(),
    comoSeTokeniza: vi.fn(),
    activar: vi.fn(),
    pausarOReactivar: vi.fn(),
    cancelar: vi.fn(),
    cobrarAhora: vi.fn(),
  },
  tokenizar: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api/autopago.service', () => ({
  autopagoApi: api,
  tokenizarTarjeta: tokenizar,
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error }: { error: unknown }) => (
    <div data-testid="fallo">{error instanceof Error ? error.message : String(error)}</div>
  ),
}));

import { AutopagoSection } from './AutopagoSection';

const TEXTO =
  'Autorizo a mi inmobiliaria a debitar automáticamente de este medio de pago el valor de mi canon.';

const TOKENIZACION = {
  disponible: true,
  motivo: null,
  llavePublica: 'pub_test_xyz',
  ambiente: 'sandbox' as const,
  textoDeAutorizacion: TEXTO,
};

const SIN_AUTOPAGO = {
  disponible: true,
  motivo: null,
  activo: false,
  autopago: null,
  cobros: [],
};

const ACTIVO = {
  disponible: true,
  motivo: null,
  activo: true,
  autopago: {
    id: 'ap-1',
    estado: 'ACTIVO' as const,
    metodo: 'CARD',
    marca: 'VISA',
    medioEnmascarado: '**** 4242',
    diaDelMes: 5,
    topeCop: 2_600_000,
    autorizadoAt: '2026-09-21T10:00:00.000Z',
    fallosSeguidos: 0,
    ultimoCobroAt: null,
    proximoCobro: '2026-10-05',
  },
  cobros: [
    {
      id: 'c-1',
      mes: '2026-09',
      montoCop: 2_000_000,
      estado: 'RECHAZADO',
      motivo: 'Fondos insuficientes',
      intentadoAt: '2026-09-05T11:00:00.000Z',
    },
  ],
};

let root: Root | null = null;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar(canon: number | null = 2_000_000) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<AutopagoSection contractId="ct-1" canonCop={canon} />);
  });
  await esperar();
  await esperar();
}

const texto = () => document.body.textContent ?? '';
const $ = (sel: string) => document.querySelector<HTMLElement>(sel);
const boton = (etiqueta: string) =>
  [...document.querySelectorAll('button')].find((b) =>
    (b.textContent ?? '').includes(etiqueta),
  );

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
  await esperar();
}

async function escribir(id: string, valor: string) {
  const input = document.querySelector<HTMLInputElement>(`#${id}`)!;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!;
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await esperar();
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  tokenizar.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  api.estado.mockResolvedValue(SIN_AUTOPAGO);
  api.comoSeTokeniza.mockResolvedValue(TOKENIZACION);
  api.activar.mockResolvedValue(ACTIVO);
  tokenizar.mockResolvedValue('tok_123');
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = '';
});

describe('cuando no está disponible', () => {
  it('sin la migración lo dice y no ofrece activarlo', async () => {
    api.estado.mockResolvedValue({
      disponible: false,
      motivo: 'El autopago todavía no está habilitado en esta inmobiliaria.',
      activo: false,
      autopago: null,
      cobros: [],
    });
    await montar();
    expect(texto()).toContain('todavía no está habilitado');
    expect(boton('Activar cobro automático')).toBeUndefined();
  });

  it('sin pasarela el botón está deshabilitado y dice por qué', async () => {
    api.comoSeTokeniza.mockResolvedValue({
      disponible: false,
      motivo: 'El cobro automático todavía no está configurado con la pasarela.',
      llavePublica: null,
      ambiente: null,
      textoDeAutorizacion: TEXTO,
    });
    await montar();
    expect(boton('Activar cobro automático')?.hasAttribute('disabled')).toBe(true);
    expect(texto()).toContain('no está configurado con la pasarela');
  });
});

describe('🔴 la autorización', () => {
  it('el texto sale del SERVIDOR y se muestra literal', async () => {
    await montar();
    await clic(boton('Activar cobro automático')!);
    expect($('[data-testid="autopago-autorizacion"]')?.textContent).toBe(TEXTO);
  });

  it('no se puede autorizar sin aceptar el texto', async () => {
    await montar();
    await clic(boton('Activar cobro automático')!);
    await escribir('autopago-nombre', 'ANA PEREZ');
    await escribir('autopago-numero', '4242424242424242');
    await escribir('autopago-mes', '12');
    await escribir('autopago-anio', '2030');
    await escribir('autopago-cvc', '123');
    expect(boton('Autorizar')?.hasAttribute('disabled')).toBe(true);
  });

  it('con el texto aceptado y los datos puestos, sí', async () => {
    await montar();
    await clic(boton('Activar cobro automático')!);
    await escribir('autopago-nombre', 'ANA PEREZ');
    await escribir('autopago-numero', '4242424242424242');
    await escribir('autopago-mes', '12');
    await escribir('autopago-anio', '2030');
    await escribir('autopago-cvc', '123');
    await clic($('#autopago-acepta')!);
    expect(boton('Autorizar')?.hasAttribute('disabled')).toBe(false);
    await clic(boton('Autorizar')!);
    expect(tokenizar).toHaveBeenCalledTimes(1);
    expect(api.activar).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: 'ct-1',
        token: 'tok_123',
        metodo: 'CARD',
        diaDelMes: 5,
        autorizacionTexto: TEXTO,
      }),
    );
  });

  it('🔴 el número de la tarjeta NO viaja a nuestro back: sólo el token', async () => {
    // Un CVC que no aparece en el token, para que la afirmación signifique algo.
    tokenizar.mockResolvedValue('tok_abc');
    await montar();
    await clic(boton('Activar cobro automático')!);
    await escribir('autopago-nombre', 'ANA PEREZ');
    await escribir('autopago-numero', '4242424242424242');
    await escribir('autopago-mes', '12');
    await escribir('autopago-anio', '2030');
    await escribir('autopago-cvc', '987');
    await clic($('#autopago-acepta')!);
    await clic(boton('Autorizar')!);
    const enviado = JSON.stringify(api.activar.mock.calls[0][0]);
    expect(enviado).not.toContain('4242424242424242');
    expect(enviado).not.toContain('987');
    expect(enviado).toContain('tok_abc');
    // Y la tarjeta sí llegó a la pasarela: si no, la prueba pasaría vacía.
    expect(tokenizar.mock.calls[0][2]).toMatchObject({
      numero: '4242424242424242',
      cvc: '987',
    });
  });

  it('una tarjeta que la pasarela rechaza no activa nada y dice el motivo de la pasarela', async () => {
    tokenizar.mockRejectedValue(new Error('Tarjeta inválida'));
    await montar();
    await clic(boton('Activar cobro automático')!);
    await escribir('autopago-nombre', 'ANA PEREZ');
    await escribir('autopago-numero', '4242424242424242');
    await escribir('autopago-mes', '12');
    await escribir('autopago-anio', '2030');
    await escribir('autopago-cvc', '123');
    await clic($('#autopago-acepta')!);
    await clic(boton('Autorizar')!);
    expect(api.activar).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith('Tarjeta inválida');
  });
});

describe('🔴 el tope', () => {
  it('se PROPONE con holgura sobre el canon, no con el canon exacto', async () => {
    await montar(2_000_000);
    await clic(boton('Activar cobro automático')!);
    const valor = document.querySelector<HTMLInputElement>('#autopago-tope')!.value;
    expect(Number(valor)).toBeGreaterThan(2_000_000);
  });

  it('y la pantalla explica por qué no se deja justo', async () => {
    await montar();
    await clic(boton('Activar cobro automático')!);
    expect(texto()).toContain('un tope justo lo dejaría por fuera');
  });

  it('sin canon conocido no se inventa un tope', async () => {
    await montar(null);
    await clic(boton('Activar cobro automático')!);
    expect(document.querySelector<HTMLInputElement>('#autopago-tope')!.value).toBe('');
  });
});

describe('cuando ya está activo', () => {
  it('muestra el medio, el día, el tope y el próximo cobro', async () => {
    api.estado.mockResolvedValue(ACTIVO);
    await montar();
    expect(texto()).toContain('**** 4242');
    expect(texto()).toContain('Cada día 5');
    expect(texto()).toContain('$2.600.000');
    expect(texto()).toContain('2026-10-05');
  });

  it('muestra los intentos con su motivo, incluidos los rechazados', async () => {
    api.estado.mockResolvedValue(ACTIVO);
    await montar();
    expect(texto()).toContain('Rechazado');
    expect(texto()).toContain('Fondos insuficientes');
  });

  it('se puede pausar, y pausado se puede reactivar', async () => {
    api.estado.mockResolvedValue(ACTIVO);
    api.pausarOReactivar.mockResolvedValue({
      ...ACTIVO,
      activo: false,
      autopago: { ...ACTIVO.autopago, estado: 'PAUSADO' as const, proximoCobro: null },
    });
    await montar();
    await clic(boton('Pausar')!);
    expect(api.pausarOReactivar).toHaveBeenCalledWith('ct-1', false);
    expect(boton('Reactivar')).toBeDefined();
  });

  it('pausado NO ofrece pagar ahora: no hay cobro que disparar sobre algo pausado', async () => {
    api.estado.mockResolvedValue({
      ...ACTIVO,
      activo: false,
      autopago: { ...ACTIVO.autopago, estado: 'PAUSADO' as const },
    });
    await montar();
    expect(boton('Pagar ahora con este medio')).toBeUndefined();
  });

  it('«pagar ahora» que no se puede muestra el motivo del back, no un éxito', async () => {
    api.estado.mockResolvedValue(ACTIVO);
    api.cobrarAhora.mockResolvedValue({
      cobrado: false,
      cobroId: null,
      montoCop: null,
      estado: 'NO_SE_INTENTO',
      motivo: 'No hay nada vencido por pagar en este contrato.',
      code: 'NADA_QUE_COBRAR',
    });
    await montar();
    await clic(boton('Pagar ahora con este medio')!);
    expect(toastMock.error).toHaveBeenCalledWith(
      'No hay nada vencido por pagar en este contrato.',
    );
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('avisa cuando hay intentos fallidos seguidos', async () => {
    api.estado.mockResolvedValue({
      ...ACTIVO,
      autopago: { ...ACTIVO.autopago, fallosSeguidos: 2 },
    });
    await montar();
    expect(texto()).toContain('2 intentos sin éxito');
  });
});

describe('sin contrato', () => {
  it('no pinta nada y no pregunta nada', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root!.render(<AutopagoSection contractId={null} />);
    });
    await esperar();
    expect(api.estado).not.toHaveBeenCalled();
    expect(host.textContent).toBe('');
  });
});
