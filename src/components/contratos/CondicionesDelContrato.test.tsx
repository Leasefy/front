/**
 * Las condiciones del contrato (Nico, 17-09): D9 gastos de cobranza, seguro
 * opcional con aceptación expresa, póliza y administración de la copropiedad.
 *
 * Lo que no puede fallar: que un seguro se cobre sin que el inquilino lo haya
 * aceptado (con fecha y quién), y que la administración de la copropiedad diga
 * quién la paga.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: {
    condiciones: vi.fn(),
    fijarGastosDeCobranza: vi.fn(),
    aceptarSeguroOpcional: vi.fn(),
    retirarSeguroOpcional: vi.fn(),
    registrarPoliza: vi.fn(),
    fijarAdministracionDeLaCopropiedad: vi.fn(),
  },
}));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
/* Con valor por defecto: el resto del archivo no habla de copropiedades y no
   tiene por qué configurarlo. */
const listarCopropiedades = vi.fn(async () => ({
  faltaLaMigracion: false,
  migracion: 'm',
  copropiedades: [] as unknown[],
}));
const asignarAMandato = vi.fn();
vi.mock('@/lib/api/copropiedades.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/copropiedades.service')>(
    '@/lib/api/copropiedades.service',
  );
  return {
    ...real,
    copropiedadesApi: {
      listar: () => listarCopropiedades(),
      asignarAMandato: (...a: unknown[]) => asignarAMandato(...a),
      crear: vi.fn(),
    },
  };
});

import { cicloDeVidaApi, type CondicionesDelContrato as Condiciones } from '@/lib/api/ciclo-de-vida.service';
import { CondicionesDelContrato } from './CondicionesDelContrato';

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function condiciones(overrides: Partial<Condiciones> = {}): Condiciones {
  return {
    contractId: 'c1',
    gastosDeCobranza: { disponible: true, delContrato: null, deLaAgencia: null, resuelto: null },
    seguroOpcional: {
      disponible: true,
      porcentajeDisponible: true,
      oferta: { plan: 'BASIC', nombre: 'Seguro básico', primaCop: 45_000, pct: null },
      aceptado: null,
      pctPorPlan: {},
    },
    poliza: {
      disponible: true,
      aseguradora: null,
      numero: null,
      cobertura: null,
      vigenciaDesde: null,
      vigenciaHasta: null,
    },
    administracion: {
      disponible: true,
      modalidad: null,
      modalidadElegida: null,
      porRespaldo: false,
      valorCop: null,
      delMandatoCop: 250_000,
      consignacionId: 'cons-1',
      copropiedad: null,
      sePuedeDeclararLaCopropiedad: true,
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
});

async function montar(puedeEditar = true) {
  await act(async () => {
    root!.render(<CondicionesDelContrato contractId="c1" puedeEditar={puedeEditar} />);
  });
}

const $ = (id: string) => container!.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

async function escribir(input: HTMLInputElement, valor: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('<CondicionesDelContrato> (17-09)', () => {
  it('🔴 D9: marcar que no pacta gastos de cobranza lo guarda y lo dice', async () => {
    api.condiciones.mockResolvedValue(condiciones());
    api.fijarGastosDeCobranza.mockResolvedValue(
      condiciones({ gastosDeCobranza: { disponible: true, delContrato: false, deLaAgencia: null, resuelto: false } }),
    );
    await montar();
    await act(async () => ($('pacta-gastos-NO') as HTMLInputElement).click());
    expect(api.fijarGastosDeCobranza).toHaveBeenCalledWith('c1', false);
    expect($('gastos-no-pactados')!.textContent).toContain('no causa gastos de cobranza');
  });

  it('D9: «lo que diga la inmobiliaria» manda null, no false', async () => {
    api.condiciones.mockResolvedValue(
      condiciones({ gastosDeCobranza: { disponible: true, delContrato: false, deLaAgencia: true, resuelto: false } }),
    );
    api.fijarGastosDeCobranza.mockResolvedValue(condiciones());
    await montar();
    await act(async () => ($('pacta-gastos-HEREDA') as HTMLInputElement).click());
    expect(api.fijarGastosDeCobranza).toHaveBeenCalledWith('c1', null);
  });

  it('🔴 el seguro opcional NO se cobra sin aceptación expresa: hay que marcarla, con quién y cuándo', async () => {
    api.condiciones.mockResolvedValue(condiciones());
    api.aceptarSeguroOpcional.mockResolvedValue(
      condiciones({
        seguroOpcional: {
          disponible: true,
          porcentajeDisponible: true,
          oferta: { plan: 'BASIC', nombre: 'Seguro básico', primaCop: 45_000, pct: null },
          aceptado: {
            nombre: 'Seguro básico',
            primaCop: 45_000,
            pct: null,
            aceptadoEl: '2026-09-17',
            aceptadoPor: 'Ana Díaz',
          },
          pctPorPlan: {},
        },
      }),
    );
    await montar();
    // Sin marcar la casilla no hay ni dónde escribir quién aceptó.
    expect($('seguro-quien')).toBeNull();
    expect(container!.textContent).toContain('No se cobra mientras el inquilino no lo acepte');

    await act(async () => ($('acepta-seguro') as HTMLInputElement).click());
    const guardar = $('guardar-seguro') as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);
    await escribir($('seguro-quien') as HTMLInputElement, 'Ana Díaz');
    await act(async () => ($('guardar-seguro') as HTMLButtonElement).click());

    expect(api.aceptarSeguroOpcional).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ aceptadoPor: 'Ana Díaz', primaCop: 45000 }),
    );
    expect(container!.textContent).toContain('Aceptado por Ana Díaz el 2026-09-17');
  });

  it('la póliza del contrato se registra y no le cobra al inquilino', async () => {
    api.condiciones.mockResolvedValue(condiciones());
    api.registrarPoliza.mockResolvedValue(condiciones());
    await montar();
    expect($('poliza-del-contrato')!.textContent).toContain('no se le cobra al inquilino');
    const campos = $('poliza-del-contrato')!.querySelectorAll('input');
    await escribir(campos[0] as HTMLInputElement, 'Sura');
    await escribir(campos[1] as HTMLInputElement, 'POL-9');
    await act(async () => ($('guardar-poliza') as HTMLButtonElement).click());
    expect(api.registrarPoliza).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ aseguradora: 'Sura', numero: 'POL-9' }),
    );
  });

  it('🔴 administración: «la paga la inmobiliaria» exige su valor y lo manda', async () => {
    api.condiciones.mockResolvedValue(condiciones());
    api.fijarAdministracionDeLaCopropiedad.mockResolvedValue(
      condiciones({
        administracion: {
          disponible: true,
          modalidad: 'LA_PAGA_LA_INMOBILIARIA',
          modalidadElegida: 'LA_PAGA_LA_INMOBILIARIA',
          porRespaldo: false,
          valorCop: 300_000,
          delMandatoCop: 250_000,
          consignacionId: 'cons-1',
          copropiedad: null,
          sePuedeDeclararLaCopropiedad: true,
        },
      }),
    );
    await montar();
    await act(async () => ($('modalidad-LA_PAGA_LA_INMOBILIARIA') as HTMLInputElement).click());
    expect(($('guardar-administracion') as HTMLButtonElement).disabled).toBe(true);
    await escribir($('valor-administracion') as HTMLInputElement, '300.000');
    await act(async () => ($('guardar-administracion') as HTMLButtonElement).click());
    expect(api.fijarAdministracionDeLaCopropiedad).toHaveBeenCalledWith('c1', {
      modalidad: 'LA_PAGA_LA_INMOBILIARIA',
      valorCop: 300000,
    });
  });

  it('«incluida en el canon» se guarda sin valor', async () => {
    api.condiciones.mockResolvedValue(condiciones());
    api.fijarAdministracionDeLaCopropiedad.mockResolvedValue(condiciones());
    await montar();
    await act(async () => ($('modalidad-INCLUIDA_EN_CANON') as HTMLInputElement).click());
    await act(async () => ($('guardar-administracion') as HTMLButtonElement).click());
    expect(api.fijarAdministracionDeLaCopropiedad).toHaveBeenCalledWith('c1', { modalidad: 'INCLUIDA_EN_CANON' });
  });

  it('sin migración lo dice y no ofrece guardar', async () => {
    api.condiciones.mockResolvedValue(
      condiciones({
        gastosDeCobranza: { disponible: false, delContrato: null, deLaAgencia: null, resuelto: null },
        seguroOpcional: {
        disponible: false,
        porcentajeDisponible: false,
        oferta: null,
        aceptado: null,
        pctPorPlan: {},
      },
        poliza: {
          disponible: false,
          aseguradora: null,
          numero: null,
          cobertura: null,
          vigenciaDesde: null,
          vigenciaHasta: null,
        },
        administracion: {
          disponible: false,
          modalidad: null,
          modalidadElegida: null,
          porRespaldo: false,
          valorCop: null,
          delMandatoCop: null,
          consignacionId: 'cons-1',
          copropiedad: null,
          sePuedeDeclararLaCopropiedad: true,
        },
      }),
    );
    await montar();
    // 🔴 El aviso ya no es una notita gris de 11 px repetida bajo cada
    // control: va una vez por bloque, con peso, y los controles muertos no se
    // dibujan (Nico, 18-09-2026: «se ven muy pequeñas y ni funcionan»).
    expect(container!.textContent).toContain('Todavía no puedes');
    expect(container!.textContent).not.toContain('Falta una actualización de la base');
    expect($('guardar-poliza')).toBeNull();
    expect($('guardar-administracion')).toBeNull();
  });

  it('sin permiso de editar se lee pero no se cambia nada', async () => {
    api.condiciones.mockResolvedValue(condiciones());
    await montar(false);
    expect($('condiciones-del-contrato')).not.toBeNull();
    expect($('acepta-seguro')).toBeNull();
    expect($('guardar-administracion')).toBeNull();
  });

  it('🔴 el seguro opcional es un % del canon: no se digita la prima, y lo dice', async () => {
    api.condiciones.mockResolvedValue(
      condiciones({
        seguroOpcional: {
          disponible: true,
          porcentajeDisponible: true,
          oferta: { plan: 'BASIC', nombre: 'Seguro básico', primaCop: 30_000, pct: 1.5 },
          aceptado: null,
          pctPorPlan: { BASIC: 1.5 },
        },
      }),
    );
    api.aceptarSeguroOpcional.mockResolvedValue(condiciones());
    await montar();

    expect(container!.textContent).toContain('1.5 % del canon de hoy');
    await act(async () => ($('acepta-seguro') as HTMLInputElement).click());
    // Con % no se digita la prima: la calcula el sistema.
    expect($('seguro-prima-por-porcentaje')).toBeTruthy();
    await escribir($('seguro-quien') as HTMLInputElement, 'Ana Díaz');
    await act(async () => ($('guardar-seguro') as HTMLButtonElement).click());
    expect(api.aceptarSeguroOpcional).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ aceptadoPor: 'Ana Díaz' }),
    );
    const cuerpo = api.aceptarSeguroOpcional.mock.calls[0][1] as Record<string, unknown>;
    expect('primaCop' in cuerpo).toBe(false);
  });

  it('sin % configurado se sigue digitando la prima fija, como hasta hoy', async () => {
    api.condiciones.mockResolvedValue(condiciones());
    await montar();
    await act(async () => ($('acepta-seguro') as HTMLInputElement).click());
    expect($('seguro-prima-por-porcentaje')).toBeNull();
    expect(container!.textContent).toContain('no le puso un porcentaje del canon');
  });

  it('🔴 un migrado con administración se lee como «la paga la inmobiliaria», y lo dice', async () => {
    api.condiciones.mockResolvedValue(
      condiciones({
        administracion: {
          disponible: true,
          modalidad: 'LA_PAGA_LA_INMOBILIARIA',
          modalidadElegida: null,
          porRespaldo: true,
          valorCop: 250_000,
          delMandatoCop: 250_000,
          consignacionId: 'cons-1',
          copropiedad: null,
          sePuedeDeclararLaCopropiedad: true,
        },
      }),
    );
    await montar();
    const aviso = $('administracion-por-respaldo');
    expect(aviso).toBeTruthy();
    expect(aviso!.textContent).toContain('viene del sistema anterior');
    // La casilla marcada es la que de verdad está rigiendo hoy, para que
    // «Guardar» la deje por escrito con un clic.
    expect(($('modalidad-LA_PAGA_LA_INMOBILIARIA') as HTMLInputElement).checked).toBe(true);
    expect(($('modalidad-HOY') as HTMLInputElement).checked).toBe(false);
  });
});

/**
 * 🔴 20-09 · A QUÉ COPROPIEDAD.
 *
 * Este bloque de la ficha hablaba de «la administración de la copropiedad» y
 * nunca decía cuál. Sin ese dato la cuota se asienta en el libro SIN TERCERO:
 * es lo que tenía a la cuenta 2815 con 1.241 líneas sin dueño y la exógena
 * trabada por ellas.
 */
describe('a qué copropiedad pertenece el inmueble', () => {
  beforeEach(() => {
    listarCopropiedades.mockClear();
    asignarAMandato.mockReset();
    listarCopropiedades.mockResolvedValue({
      faltaLaMigracion: false,
      migracion: 'm',
      copropiedades: [
        { id: 'co-1', nombre: 'Torre Verde', nit: '900123456', digitoVerificacion: 7, direccion: null, activa: true, inmuebles: 3 },
      ],
    });
    asignarAMandato.mockResolvedValue({ consignacionId: 'cons-1', copropiedadId: 'co-1' });
  });

  it('🔴 sin copropiedad declarada avisa que esa plata entra sin dueño', async () => {
    api.condiciones.mockResolvedValue(condiciones());
    await montar();
    expect(document.querySelector('[data-testid="copropiedad-sin-declarar"]')).not.toBeNull();
    expect(document.body.textContent).toContain('traba la exógena');
  });

  it('elegir una la guarda contra el MANDATO, no contra el contrato', async () => {
    api.condiciones.mockResolvedValue(condiciones());
    await montar();
    const select = document.querySelector<HTMLSelectElement>('[data-testid="elegir-copropiedad"]')!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLSelectElement.prototype,
        'value',
      )!.set!;
      setter.call(select, 'co-1');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(asignarAMandato).toHaveBeenCalledWith('cons-1', 'co-1');
  });

  it('sin la migración lo dice y no ofrece elegir', async () => {
    const base = condiciones();
    api.condiciones.mockResolvedValue({
      ...base,
      administracion: { ...base.administracion, sePuedeDeclararLaCopropiedad: false },
    });
    await montar();
    expect(document.querySelector('[data-testid="elegir-copropiedad"]')).toBeNull();
    expect(document.querySelector('[data-testid="copropiedad-sin-migracion"]')).not.toBeNull();
  });
});
