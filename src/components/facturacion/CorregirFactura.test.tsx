/**
 * Corregir una factura emitida: nota crédito PARCIAL y nota DÉBITO.
 *
 * Lo que protege esta prueba es la regla de negocio del 17-09, no el dibujo:
 *
 *  · los botones SÓLO aparecen cuando el back dice que se puede; cuando no, se
 *    muestra la razón — un botón que va a fallar es peor que no tenerlo;
 *  · el tope de la parcial está a la vista ANTES de escribir, y un valor que se
 *    pasa no deja emitir;
 *  · el motivo es obligatorio de verdad (10 caracteres), igual que en la
 *    anulación total;
 *  · lo ya acreditado y el saldo se ven en la fila.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { emitirNotaCreditoParcial, emitirNotaDebito } = vi.hoisted(() => ({
  emitirNotaCreditoParcial: vi.fn(),
  emitirNotaDebito: vi.fn(),
}));

vi.mock('@/lib/api/facturacion-electronica.service', async () => {
  const real =
    await vi.importActual<
      typeof import('@/lib/api/facturacion-electronica.service')
    >('@/lib/api/facturacion-electronica.service');
  return {
    ...real,
    facturacionElectronicaService: {
      emitirNotaCreditoParcial,
      emitirNotaDebito,
    },
  };
});

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { CorregirFactura, motivoSuficienteParaCorregir } from './CorregirFactura';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { MENSAJES_DE_LA_FACTURACION } from '@/lib/facturacion/limites-de-la-facturacion';
import type { FacturaEmitida } from '@/lib/api/facturacion-por-mes.service';

function factura(correccion: Record<string, unknown> = {}): FacturaEmitida {
  return {
    id: 'f-1',
    numero: 3,
    numeroDian: 'FE-1042',
    destinatario: 'INQUILINO',
    terceroNombre: 'Nubia Amparo David',
    terceroDocumento: '43123456',
    inmueble: 'Apartamento 302',
    contractId: 'ct-1',
    mes: '2026-09',
    baseCop: 1_000_000,
    ivaCop: 0,
    retencionesCop: 0,
    totalCop: 1_000_000,
    netoCop: 1_000_000,
    createdAt: '2026-09-01T12:00:00.000Z',
    notaCredito: null,
    notasCredito: [],
    anulacion: { puede: true, bloqueo: null, explicacion: null },
    correccion: {
      saldoCop: 1_000_000,
      acreditadoCop: 0,
      puedeAnular: true,
      puedeParcial: true,
      maximoParcialCop: 1_000_000,
      puedeNotaDebito: true,
      bloqueo: null,
      explicacion: null,
      ...correccion,
    },
  } as unknown as FacturaEmitida;
}

let host: HTMLDivElement;
let root: Root;
const onHecho = vi.fn();

function pintar(f: FacturaEmitida) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(<CorregirFactura factura={f} onHecho={onHecho} />);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  host = document.createElement('div');
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host.remove();
});

/** El diálogo de Radix se monta en `document.body`, no dentro del host. */
const q = (s: string) =>
  host.querySelector(s) ?? document.body.querySelector(s);

async function escribir(sel: string, valor: string) {
  const el = q(sel) as HTMLInputElement | HTMLTextAreaElement;
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
  await act(async () => {
    setter.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('CorregirFactura', () => {
  it('motivoSuficienteParaCorregir es la misma regla del back (10 caracteres)', () => {
    expect(motivoSuficienteParaCorregir('corto')).toBe(false);
    expect(motivoSuficienteParaCorregir('   nueve  ')).toBe(false);
    expect(motivoSuficienteParaCorregir('se cobró de más')).toBe(true);
  });

  it('ofrece las dos correcciones cuando el back dice que se puede', () => {
    pintar(factura());
    expect(q('[data-testid="nota-parcial-3"]')).not.toBeNull();
    expect(q('[data-testid="nota-debito-3"]')).not.toBeNull();
  });

  it('🔴 con la factura ya anulada no hay botones: está la razón', () => {
    pintar(
      factura({
        puedeAnular: false,
        puedeParcial: false,
        puedeNotaDebito: false,
        bloqueo: 'YA_ANULADA',
        explicacion:
          'Esta factura ya se anuló por completo con la nota crédito NC-7.',
      }),
    );
    expect(q('[data-testid="nota-parcial-3"]')).toBeNull();
    expect(q('[data-testid="nota-debito-3"]')).toBeNull();
    expect(q('[data-testid="sin-corregir-3"]')!.textContent).toContain('NC-7');
  });

  it('muestra lo ya acreditado y el saldo cuando hay parciales encima', () => {
    pintar(
      factura({
        acreditadoCop: 400_000,
        saldoCop: 600_000,
        maximoParcialCop: 600_000,
        puedeAnular: false,
        explicacion: 'Esta factura ya tiene notas crédito parciales…',
      }),
    );
    const marca = q('[data-testid="acreditado-3"]')!;
    expect(marca.textContent).toContain('400.000');
    expect(marca.textContent).toContain('600.000');
  });

  it('🔴 el tope de la parcial está a la vista y un valor que se pasa no deja emitir', async () => {
    pintar(factura({ maximoParcialCop: 600_000, saldoCop: 600_000 }));
    await act(async () => {
      (q('[data-testid="nota-parcial-3"]') as HTMLButtonElement).click();
    });
    expect(q('[data-testid="corregir-dialogo"]')!.textContent).toContain(
      '600.000',
    );

    await escribir('[data-testid="corregir-valor"]', '700000');
    await escribir(
      '[data-testid="corregir-motivo"]',
      'se cobró el parqueadero y el contrato no lo tiene',
    );
    // Desde el 02-10 el error es `<ErrorDelCampo>` (FormError de Cadence): por su id.
    // FA-R28 (03-10): la plata con un solo formato, «$ 1».
    expect(q('#corregir-valor-error')?.textContent).toContain('Escribe un valor entre $\u00a01 y');
    expect(
      (q('[data-testid="corregir-confirmar"]') as HTMLButtonElement).disabled,
    ).toBe(true);

    await escribir('[data-testid="corregir-valor"]', '600000');
    expect(q('[data-testid="corregir-valor"]')?.getAttribute('aria-invalid')).toBeNull();
    emitirNotaCreditoParcial.mockResolvedValue({
      id: 'nc-1',
      numeroDeLaNota: 'NC-3',
      valorCop: 600_000,
    });
    await act(async () => {
      (q('[data-testid="corregir-confirmar"]') as HTMLButtonElement).click();
    });
    expect(emitirNotaCreditoParcial).toHaveBeenCalledWith('f-1', {
      concepto: 'REBAJA',
      motivo: 'se cobró el parqueadero y el contrato no lo tiene',
      valorCop: 600_000,
    });
    expect(onHecho).toHaveBeenCalled();
  });

  it('🔴 un motivo corto no emite nada', async () => {
    pintar(factura());
    await act(async () => {
      (q('[data-testid="nota-parcial-3"]') as HTMLButtonElement).click();
    });
    await escribir('[data-testid="corregir-valor"]', '100000');
    await escribir('[data-testid="corregir-motivo"]', 'error');
    expect(
      (q('[data-testid="corregir-confirmar"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(emitirNotaCreditoParcial).not.toHaveBeenCalled();
  });

  it('la nota DÉBITO pide concepto y lo manda', async () => {
    pintar(factura());
    await act(async () => {
      (q('[data-testid="nota-debito-3"]') as HTMLButtonElement).click();
    });
    expect(q('[data-testid="corregir-concepto"]')).not.toBeNull();
    await escribir('[data-testid="corregir-valor"]', '25000');
    await escribir(
      '[data-testid="corregir-motivo"]',
      'intereses de mora de septiembre',
    );
    emitirNotaDebito.mockResolvedValue({ numeroInterno: 'ND-1' });
    await act(async () => {
      (q('[data-testid="corregir-confirmar"]') as HTMLButtonElement).click();
    });
    expect(emitirNotaDebito).toHaveBeenCalledWith('f-1', {
      concepto: 'INTERESES_DE_MORA',
      motivo: 'intereses de mora de septiembre',
      valorCop: 25_000,
    });
  });
});

/*
 * 02-10-2026 · Las notas con el sistema de errores: el valor de la nota débito
 * con ceros de más se ataja con la MISMA frase del back ($2.000.000.000); lo
 * que el back diga de un campo va debajo de él con el foco; un 5xx dice «de
 * nuestro lado» con la referencia; «conexión», sólo sin respuesta.
 */
describe('CorregirFactura · el sistema de errores (02-10)', () => {
  async function debitoCon(valor: string) {
    pintar(factura());
    await act(async () => {
      (q('[data-testid="nota-debito-3"]') as HTMLButtonElement).click();
    });
    await escribir('[data-testid="corregir-valor"]', valor);
    await escribir('[data-testid="corregir-motivo"]', 'intereses de mora de septiembre');
  }

  async function confirmar() {
    await act(async () => {
      (q('[data-testid="corregir-confirmar"]') as HTMLButtonElement).click();
    });
  }

  it('🔴 QA-FACT ronda 3: el aviso dice cuánto, el IVA que puso el back y qué hizo en la deuda', async () => {
    emitirNotaDebito.mockResolvedValue({
      numeroInterno: 'ND-3',
      valorCop: 11_900,
      baseCop: 10_000,
      ivaCop: 1_900,
      deuda: { explicacion: 'La deuda de la cuota de octubre sube en $ 11.900.' },
    });
    await debitoCon('11900');
    await confirmar();
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
      'Nota débito ND-3 emitida por $\u00a011.900 (IVA $\u00a01.900). La deuda de la cuota de octubre sube en $ 11.900.',
    );
  });

  it('🔴 una nota débito con ceros de más se ataja con la frase del back y no se manda', async () => {
    await debitoCon('15000000000');
    expect(q('#corregir-valor-error')?.textContent).toBe(MENSAJES_DE_LA_FACTURACION.valorDeLaNotaMaximo);
    expect((q('[data-testid="corregir-confirmar"]') as HTMLButtonElement).disabled).toBe(true);
    await confirmar();
    expect(emitirNotaDebito).not.toHaveBeenCalled();
  });

  it('el tope exacto sí se manda', async () => {
    emitirNotaDebito.mockResolvedValue({ numeroInterno: 'ND-1' });
    await debitoCon('2000000000');
    await confirmar();
    expect(emitirNotaDebito).toHaveBeenCalled();
  });

  it('🔴 un 400 con campos pinta el error en su campo y le da el foco, sin toast', async () => {
    const mensaje = MENSAJES_DE_LA_FACTURACION.valorDeLaNotaMaximo;
    emitirNotaDebito.mockRejectedValue(
      new ApiError(400, [mensaje], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        campos: [{ campo: 'valorCop', regla: 'maximo', mensaje }],
      }),
    );
    await debitoCon('25000');
    await confirmar();
    expect(q('#corregir-valor-error')?.textContent).toBe(mensaje);
    expect(document.activeElement?.id).toBe('corregir-valor');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('🔴 un 5xx dice «de nuestro lado» con la referencia, sin culpar a la conexión', async () => {
    emitirNotaDebito.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        referencia: 'ab12cd34',
      }),
    );
    await debitoCon('25000');
    await confirmar();
    const texto = vi.mocked(toast.error).mock.calls[0]?.[0] as string;
    expect(texto).toContain('No pudimos emitir la nota débito: algo falló de nuestro lado');
    expect(texto).toContain('ab12cd34');
    expect(texto).not.toMatch(/conexi[oó]n/);
  });

  it('sin respuesta: ahí sí habla de la conexión', async () => {
    emitirNotaCreditoParcial.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    pintar(factura());
    await act(async () => {
      (q('[data-testid="nota-parcial-3"]') as HTMLButtonElement).click();
    });
    await escribir('[data-testid="corregir-valor"]', '100000');
    await escribir('[data-testid="corregir-motivo"]', 'se cobró el parqueadero de más');
    await confirmar();
    expect(vi.mocked(toast.error).mock.calls[0]?.[0]).toMatch(/conexi[oó]n/);
  });
});

/**
 * 🔴 FA-25 (QA-FACT, 03-10-2026): la nota parcial pide el concepto DIAN como la
 * total (antes iba fijo «Rebaja») y el valor se escribe en el campo de plata
 * de la casa, que agrupa los miles (antes `type="number"`).
 */
describe('CorregirFactura · FA-25', () => {
  it('la parcial ofrece el concepto (sin «Anulación») y el valor agrupa los miles', async () => {
    pintar(factura());
    await act(async () => {
      (q('[data-testid="nota-parcial-3"]') as HTMLButtonElement).click();
    });
    const concepto = q('[data-testid="corregir-concepto-parcial"]')!;
    expect(concepto.getAttribute('role')).toBe('combobox');
    await escribir('[data-testid="corregir-valor"]', '100000');
    const valor = q('[data-testid="corregir-valor"]') as HTMLInputElement;
    expect(valor.type).toBe('text');
    expect(valor.value).toBe('100.000');
  });
});
