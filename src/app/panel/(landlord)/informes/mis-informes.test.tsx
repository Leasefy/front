/**
 * «Mis informes» del propietario (21-09-2026).
 *
 * Lo que este archivo amarra:
 *
 *   1. Los años que se ofrecen son los que el back dice tener. Ofrecer un año
 *      vacío es ofrecer un certificado en blanco.
 *   2. 🔴 Lo que el certificado NO incluye se VE. Los períodos del sistema
 *      anterior no están, y un propietario migrado a mitad de año tiene que
 *      poder entender por qué su ingreso es más chico de lo que recuerda.
 *   3. Una reparación que no se le descontó dice «No se te descontó», nunca $0.
 *   4. Un descuento sin comprobante lo dice y no ofrece un botón muerto.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock } = vi.hoisted(() => ({
  api: {
    disponibles: vi.fn(),
    certificadoDeIngresos: vi.fn(),
    reparaciones: vi.fn(),
    comprobante: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api/informes-del-propietario.service', () => ({
  informesDelPropietarioApi: api,
}));
vi.mock('@/components/ui/toast', () => ({
  toast: toastMock,
  Toaster: () => null,
}));
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error }: { error: unknown }) => (
    <div data-testid="fallo">{error instanceof Error ? error.message : String(error)}</div>
  ),
}));

import MisInformesPage from './page';

const CERTIFICADO = {
  anio: 2025,
  ingresoBrutoCop: 24_000_000,
  ivaCop: 0,
  otrosConceptosCop: 0,
  comisionCop: 2_400_000,
  ivaComisionCop: 456_000,
  retencionesQueLePracticaronCop: 840_000,
  retencionesQueElPracticoCop: 96_000,
  periodos: 12,
  periodosDelSistemaAnterior: 4,
  periodosAnulados: 0,
  meses: [{ mes: '2025-01', ingresoBrutoCop: 2_000_000, ivaCop: 0, comisionCop: 200_000, retenidoCop: 70_000 }],
  inmuebles: [
    {
      contractId: 'ct-1',
      inmueble: 'Calle 10 # 5-20',
      ingresoBrutoCop: 24_000_000,
      comisionCop: 2_400_000,
      retenidoCop: 840_000,
    },
  ],
  advertencias: [
    'Las cifras de este certificado se calculan sobre los períodos CAUSADOS del año.',
    'Este certificado NO incluye 4 períodos del año que gestionó el sistema anterior de la inmobiliaria.',
  ],
  motivo: null,
};

const REPARACION = {
  id: 's-1',
  fecha: '2026-05-10',
  inmueble: 'Apto 301',
  titulo: 'Cambio de la bomba',
  descripcion: 'La bomba de agua dejó de funcionar.',
  estado: 'COMPLETED',
  aCargoDelPropietarioCop: 300_000,
  fotos: [{ nombre: 'Foto 1', url: 'https://x/1.jpg' }],
  comprobante: { deduccionId: 'ded-1', nombre: 'factura-bomba.pdf' },
  proveedor: 'Hidráulicos SAS',
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
    root!.render(<MisInformesPage />);
  });
  await esperar();
  await esperar();
}

const texto = () => document.body.textContent ?? '';
const boton = (etiqueta: string) =>
  [...document.querySelectorAll('button')].find((b) =>
    (b.textContent ?? '').includes(etiqueta),
  );

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  toastMock.error.mockReset();
  api.disponibles.mockResolvedValue({
    fichas: [{ propietarioId: 'p-1', agencyId: 'ag-1', agencia: 'Portofino' }],
    anios: [2025, 2024],
    motivo: null,
  });
  api.certificadoDeIngresos.mockResolvedValue(CERTIFICADO);
  api.reparaciones.mockResolvedValue({ reparaciones: [REPARACION], motivo: null });
  api.comprobante.mockResolvedValue({ url: 'https://firmado/x.pdf', nombre: 'x.pdf' });
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = '';
});

describe('el certificado de ingresos', () => {
  it('ofrece los años que el back dice tener, y arranca en el más nuevo', async () => {
    await montar();
    expect(texto()).toContain('2025');
    expect(texto()).toContain('2024');
    expect(api.certificadoDeIngresos).toHaveBeenCalledWith(2025);
  });

  it('🔴 un año que no ha empezado no se ofrece ni se abre (QA 22-09: abría 2027)', async () => {
    const siguiente = new Date().getFullYear() + 1;
    const este = new Date().getFullYear();
    api.disponibles.mockResolvedValue({
      fichas: [{ propietarioId: 'p-1', agencyId: 'ag-1', agencia: 'Portofino' }],
      anios: [siguiente, este],
      motivo: null,
    });
    await montar();
    const tira = document.querySelector('[data-testid="anios"]')?.textContent ?? '';
    expect(tira).not.toContain(String(siguiente));
    expect(api.certificadoDeIngresos).toHaveBeenCalledWith(este);
    expect(api.certificadoDeIngresos).not.toHaveBeenCalledWith(siguiente);
  });

  it('muestra el ingreso bruto, la comisión y lo retenido', async () => {
    await montar();
    expect(texto()).toContain('Ingreso bruto por arrendamiento');
    expect(texto()).toContain('Retenciones que te practicaron');
  });

  it('🔴 muestra lo que el certificado NO incluye', async () => {
    await montar();
    expect(texto()).toContain('sistema anterior de la inmobiliaria');
  });

  it('cambiar de año pide ese año', async () => {
    await montar();
    await act(async () => {
      boton('2024')!.click();
    });
    await esperar();
    expect(api.certificadoDeIngresos).toHaveBeenCalledWith(2024);
  });

  it('sin años no ofrece ninguno y dice el motivo del back', async () => {
    api.disponibles.mockResolvedValue({
      fichas: [],
      anios: [],
      motivo: 'No encontramos tu ficha de propietario con este correo.',
    });
    await montar();
    expect(texto()).toContain('No encontramos tu ficha de propietario');
    expect(api.certificadoDeIngresos).not.toHaveBeenCalled();
  });
});

describe('el historial de reparaciones', () => {
  it('muestra la reparación con su proveedor y el comprobante', async () => {
    await montar();
    expect(texto()).toContain('Cambio de la bomba');
    expect(texto()).toContain('Hidráulicos SAS');
    expect(boton('factura-bomba.pdf')).toBeDefined();
  });

  it('🔴 una reparación que no se le descontó dice «No se te descontó», nunca $0', async () => {
    api.reparaciones.mockResolvedValue({
      reparaciones: [{ ...REPARACION, aCargoDelPropietarioCop: null, comprobante: null }],
      motivo: null,
    });
    await montar();
    // Acotado a la LISTA de reparaciones: el certificado sí puede mostrar un
    // «$0» legítimo (un año sin IVA), y mirar todo el documento haría que esta
    // afirmación no significara nada.
    const lista =
      document.querySelector('[data-testid="reparaciones"]')?.textContent ?? '';
    expect(lista).toContain('No se te descontó');
    expect(lista).not.toContain('$0');
  });

  it('un descuento sin comprobante lo dice y no deja un botón muerto', async () => {
    api.reparaciones.mockResolvedValue({
      reparaciones: [{ ...REPARACION, comprobante: null }],
      motivo: null,
    });
    await montar();
    expect(texto()).toContain('no tiene comprobante cargado');
    expect(boton('Ver comprobante')).toBeUndefined();
  });

  it('abrir el comprobante lo pide firmado, no usa un enlace de la lista', async () => {
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    await montar();
    await act(async () => {
      boton('factura-bomba.pdf')!.click();
    });
    await esperar();
    expect(api.comprobante).toHaveBeenCalledWith('ded-1');
    expect(abrir).toHaveBeenCalledWith(
      'https://firmado/x.pdf',
      '_blank',
      'noopener,noreferrer',
    );
    abrir.mockRestore();
  });

  it('sin inmuebles en administración dice el motivo del back', async () => {
    api.reparaciones.mockResolvedValue({
      reparaciones: [],
      motivo: 'No tienes inmuebles en administración con esta inmobiliaria.',
    });
    await montar();
    expect(texto()).toContain('No tienes inmuebles en administración');
  });
});
