/**
 * El certificado anual: el criterio se elige y se explica, el detalle mes a mes
 * se abre en la fila, y emitir FIJA número y fecha.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { CertificadoDeRetenciones } from '@/lib/api/finanzas.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ certificado: vi.fn(), emitir: vi.fn(), pdf: vi.fn() }));

vi.mock('@/lib/api/finanzas.service', () => ({
  finanzasApi: { certificado: h.certificado, emitirCertificado: h.emitir, pdfDelCertificado: h.pdf },
  codigoSinMigrar: () => null,
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

// CB-17 (03-10-2026): los selectores son el `Select` del DS (Radix), que no se
// abre en happy-dom. Este doble lo vuelve un `<select>` nativo con el MISMO
// `data-testid` del disparador, su valor y sus opciones: lo que estas pruebas
// miran no cambió.
vi.mock('@/components/ui/select', async () => {
  const React = await import('react');
  type Ctx = { value?: string; onValueChange?: (v: string) => void; trigger: Record<string, unknown> };
  const Contexto = React.createContext<Ctx>({ trigger: {} });
  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value?: string;
      onValueChange?: (v: string) => void;
      children?: React.ReactNode;
    }) => {
      const trigger = React.useRef<Record<string, unknown>>({}).current;
      return <Contexto.Provider value={{ value, onValueChange, trigger }}>{children}</Contexto.Provider>;
    },
    SelectTrigger: (props: Record<string, unknown>) => {
      Object.assign(React.useContext(Contexto).trigger, props);
      return null;
    },
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: React.ReactNode }) => {
      const ctx = React.useContext(Contexto);
      return (
        <select
          data-testid={ctx.trigger['data-testid'] as string | undefined}
          aria-label={ctx.trigger['aria-label'] as string | undefined}
          disabled={Boolean(ctx.trigger.disabled)}
          value={ctx.value ?? ''}
          onChange={(e) => ctx.onValueChange?.(e.target.value)}
        >
          {children}
        </select>
      );
    },
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
      <option value={value}>{children}</option>
    ),
    SelectGroup: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    SelectLabel: () => null,
    SelectSeparator: () => null,
  };
});

import {
  CertificadoDeRetencionesPanel,
  QUE_MIDE_EL_CRITERIO,
  aniosDisponibles,
} from './CertificadoDeRetenciones';

function certificado(extra: Partial<CertificadoDeRetenciones> = {}): CertificadoDeRetenciones {
  return {
    anio: 2026,
    criterio: 'CAUSADO',
    filas: [
      {
        propietarioId: 'p-1',
        nombre: 'Jorge Restrepo',
        documento: '71.234.567',
        baseCop: 36_000_000,
        retefuenteCop: 1_260_000,
        reteIvaCop: 0,
        reteIcaCop: 120_000,
        totalRetenidoCop: 1_380_000,
        periodos: 12,
        porMes: [
          { mes: '2026-01', baseCop: 3_000_000, retefuenteCop: 105_000, reteIvaCop: 0, reteIcaCop: 10_000 },
          { mes: '2026-02', baseCop: 3_000_000, retefuenteCop: 105_000, reteIvaCop: 0, reteIcaCop: 10_000 },
        ],
      },
      {
        propietarioId: 'p-2',
        nombre: 'Sin documento S.A.S.',
        documento: '',
        baseCop: 12_000_000,
        retefuenteCop: 420_000,
        reteIvaCop: 0,
        reteIcaCop: 0,
        totalRetenidoCop: 420_000,
        periodos: 4,
        porMes: [],
      },
    ],
    totales: {
      baseCop: 48_000_000,
      retefuenteCop: 1_680_000,
      reteIvaCop: 0,
      reteIcaCop: 120_000,
      totalRetenidoCop: 1_800_000,
      propietarios: 2,
    },
    avisos: [
      '1 propietario(s) no tienen documento en su ficha: el certificado sale sin NIT/cédula y no sirve para declarar.',
    ],
    emitidos: [],
    ...extra,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.certificado.mockReset().mockResolvedValue(certificado());
  h.emitir.mockReset().mockResolvedValue({ id: 'c-1', numero: 'RET-2026-0001', emitidoAt: '2027-02-01T10:00:00.000Z' });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function pintar() {
  await act(async () => {
    root.render(<CertificadoDeRetencionesPanel />);
  });
}

function texto(testId: string): string {
  return document.body.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '';
}

describe('certificado de retenciones', () => {
  it('lista cada propietario con su base y las tres retenciones', async () => {
    await pintar();
    const fila = document.body.querySelector('[data-testid="fila-p-1"]')!;
    expect(fila.textContent).toContain('Jorge Restrepo');
    expect(fila.textContent).toContain('36.000.000');
    expect(fila.textContent).toContain('1.260.000');
    expect(fila.textContent).toContain('120.000');
    expect(fila.textContent).toContain('12 períodos');
  });

  it('marca a quien no tiene documento: ese certificado no sirve para declarar', async () => {
    await pintar();
    expect(document.body.querySelector('[data-testid="fila-p-2"]')?.textContent).toContain(
      'Sin documento',
    );
    expect(texto('avisos-del-certificado')).toContain('no sirve para declarar');
  });

  it('CAUSADO es el criterio por defecto y la pantalla explica qué mide', async () => {
    await pintar();
    const criterio = document.body.querySelector<HTMLSelectElement>(
      '[data-testid="selector-de-criterio"]',
    )!;
    expect(criterio.value).toBe('CAUSADO');
    expect(texto('que-mide-el-criterio')).toBe(QUE_MIDE_EL_CRITERIO.CAUSADO);
    expect(h.certificado).toHaveBeenLastCalledWith(expect.any(Number), 'CAUSADO');
  });

  it('cambiar a PAGADO vuelve a pedir el informe y cambia la explicación', async () => {
    await pintar();
    const criterio = document.body.querySelector<HTMLSelectElement>(
      '[data-testid="selector-de-criterio"]',
    )!;
    await act(async () => {
      criterio.value = 'PAGADO';
      criterio.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(h.certificado).toHaveBeenLastCalledWith(expect.any(Number), 'PAGADO');
    expect(texto('que-mide-el-criterio')).toBe(QUE_MIDE_EL_CRITERIO.PAGADO);
  });

  it('el detalle mes a mes se abre en la fila y no en otra pantalla', async () => {
    await pintar();
    expect(document.body.querySelector('[data-testid="detalle-p-1"]')).toBeNull();
    await act(async () => {
      document.body.querySelector<HTMLButtonElement>('[data-testid="abrir-p-1"]')!.click();
    });
    const detalle = document.body.querySelector('[data-testid="detalle-p-1"]')!;
    expect(detalle.textContent).toContain('enero de 2026');
    expect(detalle.textContent).toContain('febrero de 2026');
  });

  it('emitir fija número y fecha, y la fila pasa a mostrarlos', async () => {
    await pintar();
    await act(async () => {
      document.body.querySelector<HTMLButtonElement>('[data-testid="emitir-p-1"]')!.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    // 🔴 CB-32 (03-10-2026): antes de fijar el número se confirma.
    expect(h.emitir).not.toHaveBeenCalled();
    await act(async () => {
      document.body.querySelector<HTMLButtonElement>('[data-testid="confirmar-emision"]')!.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.emitir).toHaveBeenCalledWith(2026, 'p-1', 'CAUSADO');
  });

  it('lo ya emitido se ve con su número, y no se ofrece emitir de nuevo', async () => {
    h.certificado.mockResolvedValue(
      certificado({
        emitidos: [{ propietarioId: 'p-1', numero: 'RET-2026-0001', emitidoAt: '2027-02-01T10:00:00.000Z' }],
      }),
    );
    await pintar();
    expect(texto('emitido-p-1')).toContain('RET-2026-0001');
    // 🔴 CB-32 (03-10-2026): la fecha en palabras, no en ISO.
    expect(texto('emitido-p-1')).toContain('1 de febrero de 2027');
    expect(document.body.querySelector('[data-testid="emitir-p-1"]')).toBeNull();
  });

  it('un año sin retenciones lo dice con palabras, no con una tabla vacía', async () => {
    h.certificado.mockResolvedValue(
      certificado({
        filas: [],
        totales: { baseCop: 0, retefuenteCop: 0, reteIvaCop: 0, reteIcaCop: 0, totalRetenidoCop: 0, propietarios: 0 },
      }),
    );
    await pintar();
    expect(document.body.textContent).toContain('No hay certificados que emitir');
  });
});

describe('piezas puras', () => {
  it('ofrece el año actual y los cuatro anteriores, del más nuevo al más viejo', () => {
    expect(aniosDisponibles(2026)).toEqual([2026, 2025, 2024, 2023, 2022]);
  });

  it('cada criterio dice qué mide, y no son lo mismo', () => {
    expect(QUE_MIDE_EL_CRITERIO.CAUSADO).toContain('se hayan pagado o no');
    expect(QUE_MIDE_EL_CRITERIO.PAGADO).toContain('SALDADAS');
  });
});

describe('QA de Contabilidad (CB-17, 03-10-2026)', () => {
  it('🔴 «Propietarios» es un conteo: sin signo de pesos; la plata con el formato de la casa', async () => {
    await pintar();
    expect(texto('valor-propietarios')).not.toContain('$');
    expect(texto('valor-base')).toMatch(/^\$ \d/);
  });

  it('🔴 año y criterio son el Select del DS, no el <select> del navegador', async () => {
    // El doble del `Select` (arriba) sólo existe si la pantalla usa el del DS:
    // con un `<select>` propio, el disparador no tendría su `data-testid`.
    await pintar();
    expect(document.body.querySelector('[data-testid="selector-de-anio"]')!.tagName).toBe('SELECT');
    expect(document.body.querySelectorAll('select')).toHaveLength(2);
  });
});

describe('QA de Contabilidad (CB-R17, Nico 03-10-2026)', () => {
  it('🔴 cada fila trae «Descargar PDF» y baja el del propietario (back 26beefbc)', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    h.pdf.mockResolvedValue(blob);
    const crear = vi.fn(() => 'blob:x');
    const revocar = vi.fn();
    Object.assign(URL, { createObjectURL: crear, revokeObjectURL: revocar });
    await pintar();
    const boton = document.body.querySelector<HTMLButtonElement>('[data-testid="pdf-p-1"]')!;
    expect(boton.textContent).toContain('Descargar PDF');
    expect(boton.disabled).toBe(false);
    await act(async () => {
      boton.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.pdf).toHaveBeenCalledWith(2026, 'p-1', 'CAUSADO');
    expect(crear).toHaveBeenCalledWith(blob);
  });

  it('sin documento, el PDF se apaga con su porqué', async () => {
    await pintar();
    const boton = document.body.querySelector<HTMLButtonElement>('[data-testid="pdf-p-2"]')!;
    expect(boton.disabled).toBe(true);
    expect(texto('pdf-p-2-motivo')).toContain('no sirve para declarar');
  });

  it('🔴 con copropietarios, cada fila dice su parte', async () => {
    const datos = (await h.certificado()) as CertificadoDeRetenciones;
    h.certificado.mockResolvedValue({
      ...datos,
      filas: datos.filas.map((f, i) => (i === 0 ? { ...f, participacionPct: 70 } : f)),
    });
    await pintar();
    expect(texto('parte-p-1')).toContain('su parte: 70 %');
    expect(document.body.querySelector('[data-testid="parte-p-2"]')).toBeNull();
  });
});

describe('QA de Contabilidad (CB-32, 03-10-2026)', () => {
  it('🔴 la confirmación dice a quién, qué año, cuánto se le retuvo y que el número queda fijo', async () => {
    await pintar();
    await act(async () => {
      document.body.querySelector<HTMLButtonElement>('[data-testid="emitir-p-1"]')!.click();
    });
    const dialogo = document.body.querySelector('[data-testid="confirmar-emision-dialogo"]')!.textContent ?? '';
    expect(dialogo).toContain('2026');
    expect(dialogo).toContain('Jorge Restrepo');
    expect(dialogo).toMatch(/\$ [\d.]+/);
    expect(dialogo).toContain('queda con su número');
  });

  it('el número sólo cifra se dice «N.º 1»', async () => {
    const { numeroDelCertificado } = await import('./CertificadoDeRetenciones');
    expect(numeroDelCertificado('1')).toBe('N.º 1');
    expect(numeroDelCertificado('RET-2026-0001')).toBe('RET-2026-0001');
    // 🔴 Visto en el laboratorio: el back lo manda como número.
    expect(numeroDelCertificado(1 as unknown as string)).toBe('N.º 1');
  });
});
