/**
 * 🔴 LEASEFY NO INVENTA EL SALARIO MÍNIMO.
 *
 * Es la prueba más importante de todo el módulo de nómina. El salario mínimo, el
 * auxilio de transporte y la UVT los fija el Estado cada año; ponerlos en cero o
 * adivinarlos produce nóminas mal pagadas y retenciones mal practicadas, y el
 * error aparece cuando un empleado reclama o cuando la DIAN cruza.
 *
 * Lo que estos tests fijan:
 *
 *   1. las tres cifras salen VACÍAS, no en cero, cuando el back las manda nulas;
 *   2. la del año anterior se muestra como REFERENCIA, marcada como tal;
 *   3. al guardar, un campo vacío viaja como `null` — nunca como `0`;
 *   4. los avisos de los factores que hay que confirmar (recargo dominical,
 *      divisor de la hora, exoneración del 114-1) se muestran;
 *   5. la exoneración del art. 114-1 arranca APAGADA;
 *   6. «confirmado por el contador» es un acto aparte del guardado.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { ParametrosDelAnio } from '@/lib/api/nomina.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const h = vi.hoisted(() => ({
  parametros: vi.fn(),
  guardar: vi.fn(),
  noEstaHabilitada: vi.fn(() => false),
  faltaLaMigracion: vi.fn(() => false),
}));

vi.mock('@/lib/api/nomina.service', () => ({
  nominaApi: { parametros: h.parametros, guardarParametros: h.guardar },
  noEstaHabilitada: h.noEstaHabilitada,
  faltaLaMigracion: h.faltaLaMigracion,
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { ParametrosDeNominaPanel } from './ParametrosDeNomina';

const FACTORES = {
  recargoNocturnoBps: 3_500,
  recargoDominicalBps: 7_500,
  extraDiurnaBps: 2_500,
  extraNocturnaBps: 7_500,
  extraDominicalDiurnaBps: 10_000,
  extraDominicalNocturnaBps: 15_000,
  horasMes: 240,
  saludEmpleadoBps: 400,
  saludEmpleadorBps: 850,
  pensionEmpleadoBps: 400,
  pensionEmpleadorBps: 1_200,
  cajaCompensacionBps: 400,
  senaBps: 200,
  icbfBps: 300,
  exoneracion1141: false,
  ibcTopeSmlmv: 25,
  primaBps: 833,
  cesantiasBps: 833,
  interesesCesantiasBps: 100,
  vacacionesBps: 417,
};

const AVISOS = {
  recargoDominicalBps:
    'CST art. 179 dice 75 %, pero la reforma laboral de 2025 lo sube por etapas.',
  horasMes:
    'La Ley 2101 de 2021 baja la jornada máxima sin bajar el salario: el divisor lo define tu contador.',
  exoneracion1141:
    'Art. 114-1 del Estatuto Tributario: viene APAGADA; prenderla sin confirmarlo calcularía aportes de menos.',
};

function sinCargar(): ParametrosDelAnio {
  return {
    disponible: true,
    motivo: null,
    anio: 2026,
    guardado: null,
    propuesta: {
      anio: 2026,
      ...FACTORES,
      salarioMinimoCop: null,
      auxilioTransporteCop: null,
      uvtCop: null,
      fuente: 'Pendiente de cargar.',
      motivoSiFalta:
        'El salario mínimo y el auxilio de transporte de 2026 los decreta el Gobierno en diciembre de 2025, y la UVT la fija la DIAN por resolución.',
      referencia: {
        anio: 2025,
        salarioMinimoCop: 1_423_500,
        auxilioTransporteCop: 200_000,
        uvtCop: 49_799,
        fuente: 'Decreto de salario mínimo 2025. VALIDAR.',
      },
    },
    cargadoPor: null,
    confirmadoPor: null,
    avisos: AVISOS,
    completos: false,
    queFalta: [
      'el salario mínimo del año',
      'el auxilio de transporte del año',
      'la UVT del año',
    ],
  };
}

let contenedor: HTMLDivElement;
let root: Root;

async function montar() {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root.render(<ParametrosDeNominaPanel anio={2026} />);
  });
}

beforeEach(() => {
  h.parametros.mockReset();
  h.guardar.mockReset();
  h.guardar.mockResolvedValue({ queFalta: [] });
  h.noEstaHabilitada.mockReturnValue(false);
  h.faltaLaMigracion.mockReturnValue(false);
});

afterEach(() => {
  act(() => root?.unmount());
  contenedor?.remove();
});

const campo = (id: string) =>
  contenedor.querySelector<HTMLInputElement>(`[data-testid="campo-${id}"]`);

/**
 * Escribir en un input CONTROLADO de React.
 *
 * `input.value = x` no alcanza: React 18 sobreescribe el setter de `value` para
 * detectar cambios programáticos, así que asignarlo directo actualiza su tracker
 * y `onChange` nunca corre — el test pasaría a verde con el campo vacío. Se usa
 * el setter nativo, igual que `CarteraCompleta.test.tsx`.
 */
function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )!.set!;
  setter.call(input, valor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
const texto = () => contenedor.textContent ?? '';

describe('🔴 las tres cifras que Leasefy no inventa', () => {
  it('salen VACÍAS, no en cero', async () => {
    h.parametros.mockResolvedValue(sinCargar());
    await montar();
    expect(campo('salarioMinimoCop')?.value).toBe('');
    expect(campo('auxilioTransporteCop')?.value).toBe('');
    expect(campo('uvtCop')?.value).toBe('');
    // Y ninguna dice «0».
    expect(campo('salarioMinimoCop')?.value).not.toBe('0');
  });

  it('el cartel dice CUÁLES faltan y quién las fija', async () => {
    h.parametros.mockResolvedValue(sinCargar());
    await montar();
    const cartel = contenedor.querySelector('[data-testid="faltan-cifras"]');
    expect(cartel?.textContent).toContain('el salario mínimo del año');
    expect(cartel?.textContent).toContain('la UVT del año');
    expect(cartel?.textContent).toContain('Gobierno');
    expect(cartel?.textContent).toContain('DIAN');
  });

  it('la del año pasado se muestra como REFERENCIA, no como valor', async () => {
    h.parametros.mockResolvedValue(sinCargar());
    await montar();
    const ref = contenedor.querySelector('[data-testid="ref-salarioMinimoCop"]');
    expect(ref?.textContent).toContain('En 2025 fue');
    expect(ref?.textContent).toContain('1.423.500');
    expect(ref?.textContent).toContain('referencia, no se usa sola');
    // Pero el CAMPO sigue vacío: la referencia no se copia sola.
    expect(campo('salarioMinimoCop')?.value).toBe('');
  });

  it('🔴 al guardar, un campo vacío viaja como `null` — nunca como 0', async () => {
    h.parametros.mockResolvedValue(sinCargar());
    await montar();
    const boton = contenedor.querySelector<HTMLButtonElement>(
      '[data-testid="guardar-parametros"]',
    );
    await act(async () => {
      boton?.click();
    });
    expect(h.guardar).toHaveBeenCalledTimes(1);
    const [, dto] = h.guardar.mock.calls[0]!;
    expect(dto.salarioMinimoCop).toBeNull();
    expect(dto.auxilioTransporteCop).toBeNull();
    expect(dto.uvtCop).toBeNull();
    expect(dto.salarioMinimoCop).not.toBe(0);
  });

  it('cuando se escriben, viajan como enteros', async () => {
    h.parametros.mockResolvedValue(sinCargar());
    await montar();
    const input = campo('salarioMinimoCop')!;
    await act(async () => {
      escribir(input, '1623500');
    });
    await act(async () => {
      contenedor
        .querySelector<HTMLButtonElement>('[data-testid="guardar-parametros"]')
        ?.click();
    });
    const [, dto] = h.guardar.mock.calls[0]!;
    expect(dto.salarioMinimoCop).toBe(1_623_500);
  });
});

describe('los factores que hay que confirmar', () => {
  it('sus avisos se muestran, con la norma', async () => {
    h.parametros.mockResolvedValue(sinCargar());
    await montar();
    expect(texto()).toContain('reforma laboral de 2025');
    expect(texto()).toContain('Ley 2101 de 2021');
    expect(texto()).toContain('114-1');
  });

  it('el aviso va pegado a SU campo, no suelto en la página', async () => {
    h.parametros.mockResolvedValue(sinCargar());
    await montar();
    expect(
      contenedor.querySelector('[data-testid="validar-recargoDominicalBps"]'),
    ).not.toBeNull();
    expect(
      contenedor.querySelector('[data-testid="validar-horasMes"]'),
    ).not.toBeNull();
  });

  it('🔴 la exoneración del art. 114-1 arranca APAGADA', async () => {
    h.parametros.mockResolvedValue(sinCargar());
    await montar();
    const casilla = contenedor.querySelector<HTMLInputElement>(
      '[data-testid="campo-exoneracion1141"]',
    );
    expect(casilla?.checked).toBe(false);
  });

  it('los porcentajes se muestran en % además de en bps', async () => {
    h.parametros.mockResolvedValue(sinCargar());
    await montar();
    // 400 bps = 4,00 %.
    expect(texto()).toContain('4.00 %');
  });
});

describe('confirmar es un acto aparte', () => {
  it('guardar NO confirma', async () => {
    h.parametros.mockResolvedValue(sinCargar());
    await montar();
    await act(async () => {
      contenedor
        .querySelector<HTMLButtonElement>('[data-testid="guardar-parametros"]')
        ?.click();
    });
    expect(h.guardar.mock.calls[0]![1].confirmado).toBe(false);
  });

  it('«guardar y confirmar» sí, y queda con nombre y fecha', async () => {
    h.parametros.mockResolvedValue(sinCargar());
    await montar();
    await act(async () => {
      contenedor
        .querySelector<HTMLButtonElement>('[data-testid="guardar-y-confirmar"]')
        ?.click();
    });
    expect(h.guardar.mock.calls[0]![1].confirmado).toBe(true);
  });

  it('🔴 sin confirmar, la pantalla dice que cada desprendible lo va a repetir', async () => {
    h.parametros.mockResolvedValue({
      ...sinCargar(),
      completos: true,
      queFalta: [],
      guardado: {
        id: 'p-1',
        anio: 2026,
        ...FACTORES,
        salarioMinimoCop: 1_623_500,
        auxilioTransporteCop: 200_000,
        uvtCop: 52_000,
        cargadoPorUserId: 'u-1',
        cargadoAt: '2026-01-05T00:00:00.000Z',
        confirmadoPorUserId: null,
        confirmadoAt: null,
        notas: null,
      },
      cargadoPor: { id: 'u-1', nombre: 'Ana Gómez' },
      confirmadoPor: null,
    });
    await montar();
    const cartel = contenedor.querySelector('[data-testid="sin-confirmar"]');
    expect(cartel?.textContent).toContain('Nadie ha confirmado');
    expect(cartel?.textContent).toContain('cada desprendible');
  });
});

/**
 * 🔴 «Quién lo cargó y cuándo» (Nico, 17-09).
 *
 * Es el número con el que se paga la nómina de todo el mundo: cuando alguien
 * pregunte «¿de dónde salió este salario mínimo?», la respuesta tiene que estar
 * en la misma pantalla y no en un log.
 */
describe('quién cargó las cifras y cuándo', () => {
  function guardadas(extra: Partial<ParametrosDelAnio> = {}): ParametrosDelAnio {
    return {
      ...sinCargar(),
      completos: true,
      queFalta: [],
      guardado: {
        id: 'p-1',
        anio: 2026,
        ...FACTORES,
        salarioMinimoCop: 1_623_500,
        auxilioTransporteCop: 200_000,
        uvtCop: 52_000,
        cargadoPorUserId: 'u-1',
        cargadoAt: '2026-01-05T00:00:00.000Z',
        confirmadoPorUserId: 'u-2',
        confirmadoAt: '2026-01-07T00:00:00.000Z',
        notas: null,
      },
      cargadoPor: { id: 'u-1', nombre: 'Ana Gómez' },
      confirmadoPor: { id: 'u-2', nombre: 'Carlos Ruiz' },
      ...extra,
    };
  }

  it('dice quién las cargó, cuándo, y quién las confirmó', async () => {
    h.parametros.mockResolvedValue(guardadas());
    await montar();
    const bloque = contenedor.querySelector('[data-testid="quien-y-cuando"]');
    expect(bloque?.textContent).toContain('2026-01-05');
    expect(bloque?.textContent).toContain('Ana Gómez');
    expect(bloque?.textContent).toContain('2026-01-07');
    expect(bloque?.textContent).toContain('Carlos Ruiz');
  });

  it('🔴 cargar y confirmar se muestran por SEPARADO: son dos actos distintos', async () => {
    h.parametros.mockResolvedValue(
      guardadas({
        guardado: {
          ...guardadas().guardado!,
          confirmadoPorUserId: null,
          confirmadoAt: null,
        },
        confirmadoPor: null,
      }),
    );
    await montar();
    const bloque = contenedor.querySelector('[data-testid="quien-y-cuando"]');
    expect(bloque?.textContent).toContain('Ana Gómez');
    expect(bloque?.textContent).toContain('Sin confirmar');
  });

  it('si el usuario ya no está, muestra la fecha sin el nombre', async () => {
    h.parametros.mockResolvedValue(
      guardadas({ cargadoPor: { id: 'u-1', nombre: null } }),
    );
    await montar();
    const bloque = contenedor.querySelector('[data-testid="quien-y-cuando"]');
    expect(bloque?.textContent).toContain('2026-01-05');
    expect(bloque?.textContent).toContain('no se pudo resolver quién');
  });

  it('sin nada cargado, lo dice', async () => {
    h.parametros.mockResolvedValue(sinCargar());
    await montar();
    expect(
      contenedor.querySelector('[data-testid="quien-y-cuando"]')?.textContent,
    ).toContain('Todavía nadie ha cargado');
  });

  it('🔴 con cifras YA cargadas, la referencia del año conocido SIGUE a la vista', async () => {
    // La propuesta viaja siempre justo para esto: quien corrige una cifra tiene
    // que poder ver contra qué compararla.
    h.parametros.mockResolvedValue(guardadas());
    await montar();
    expect(
      contenedor.querySelector('[data-testid="ref-salarioMinimoCop"]')
        ?.textContent,
    ).toContain('En 2025 fue');
  });

  it('🔴 y el campo trae lo GUARDADO, no la referencia', async () => {
    h.parametros.mockResolvedValue(guardadas());
    await montar();
    expect(campo('salarioMinimoCop')?.value).toBe('1623500');
  });
});

describe('las tres formas de «no se puede»', () => {
  it('el módulo no comprado se ve como un producto', async () => {
    h.noEstaHabilitada.mockReturnValue(true);
    h.parametros.mockRejectedValue(new Error('402'));
    await montar();
    expect(
      contenedor.querySelector('[data-testid="nomina-no-habilitada"]'),
    ).not.toBeNull();
  });

  it('la migración que falta dice quién la aplica', async () => {
    h.faltaLaMigracion.mockReturnValue(true);
    h.parametros.mockRejectedValue(new Error('falta 20260918141000'));
    await montar();
    expect(
      contenedor.querySelector('[data-testid="nomina-sin-migracion"]')
        ?.textContent,
    ).toContain('Víctor');
  });
});
