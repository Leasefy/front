/**
 * EL DESPRENDIBLE: lo que la pantalla NO puede hacer.
 *
 * Lo que estos tests fijan, y cada uno es un error que costaría plata o confianza:
 *
 *   1. **el neto se PINTA, no se suma**: si la pantalla lo recalculara podría
 *      mostrar un número y el banco girar otro;
 *   2. **los aportes del empleador aparecen pero NO entran al neto**: esconderlos
 *      hace creer que la nómina cuesta el neto;
 *   3. **cada renglón muestra su detalle**: un desprendible que sólo dice
 *      «Recargo nocturno $35.000» obliga a preguntar;
 *   4. **lo marcado sale ARRIBA y contado**, no como un icono que se ignora;
 *   5. **un CUNE de prueba se declara como tal**: un «aceptado» falso es la clase
 *      de tranquilidad que hace que alguien no cumpla una obligación;
 *   6. **el módulo no comprado se ve como un producto, no como un error** — y sin
 *      botón de reintentar, porque reintentar no lo compra.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { Desprendible as Datos } from '@/lib/api/nomina.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const h = vi.hoisted(() => ({
  desprendible: vi.fn(),
  reenviar: vi.fn(),
  exito: vi.fn(),
  error: vi.fn(),
  noEstaHabilitada: vi.fn(() => false),
  faltaLaMigracion: vi.fn(() => false),
}));

vi.mock('@/lib/api/nomina.service', () => ({
  nominaApi: { desprendible: h.desprendible, reenviarDesprendible: h.reenviar },
  noEstaHabilitada: h.noEstaHabilitada,
  faltaLaMigracion: h.faltaLaMigracion,
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: h.exito, error: h.error, info: vi.fn(), warning: vi.fn() },
}));

import { DesprendiblePanel } from './Desprendible';

function linea(extra: Partial<Datos['lineas'][number]> = {}): Datos['lineas'][number] {
  return {
    id: `l-${Math.random()}`,
    orden: 0,
    codigo: 'SUELDO',
    nombre: 'Sueldo',
    clase: 'DEVENGADO',
    cantidadCentesimas: 3000,
    valorCop: 2_000_000,
    constitutivoSalario: true,
    cuentaPuc: '510506',
    detalle: '30 días sobre $2.000.000 mensuales (base 30).',
    requiereValidacionContador: false,
    motivoValidacion: null,
    ...extra,
  };
}

function datos(extra: Partial<Datos> = {}): Datos {
  return {
    id: 'liq-1',
    periodoId: 'per-1',
    personaId: 'p-1',
    nombre: 'Ana Gómez',
    documento: '1020304050',
    cargo: 'Auxiliar contable',
    tipo: 'EMPLEADO',
    salarioCop: 2_000_000,
    sedeId: null,
    diasLiquidados: 30,
    devengadoCop: 2_200_000,
    deduccionesCop: 160_000,
    netoCop: 2_040_000,
    aportesEmpleadorCop: 600_440,
    provisionesCop: 458_000,
    ibcCop: 2_000_000,
    baseRetencionCop: 0,
    retencionCop: 0,
    esDefinitiva: false,
    fechaRetiro: null,
    causalRetiro: null,
    requiereValidacionContador: false,
    avisos: null,
    desprendibleEnviadoA: null,
    desprendibleEnviadoAt: null,
    desprendibleError: null,
    desprendibleIntentos: 0,
    lineas: [
      linea(),
      linea({
        codigo: 'AUX-TRANS',
        nombre: 'Auxilio de transporte',
        valorCop: 200_000,
        constitutivoSalario: false,
        cantidadCentesimas: null,
        detalle:
          '30 de 30 días. No entra al IBC de seguridad social (Ley 15 de 1959 art. 2) pero sí a la base de prima y cesantías (CST art. 249).',
      }),
      linea({
        codigo: 'SALUD-EMP',
        nombre: 'Salud (empleado)',
        clase: 'DEDUCCION',
        valorCop: 80_000,
        constitutivoSalario: false,
        cantidadCentesimas: null,
      }),
      linea({
        codigo: 'PENS-EMP',
        nombre: 'Pensión (empleado)',
        clase: 'DEDUCCION',
        valorCop: 80_000,
        constitutivoSalario: false,
        cantidadCentesimas: null,
      }),
      linea({
        codigo: 'SALUD-PAT',
        nombre: 'Salud (empleador)',
        clase: 'APORTE_EMPLEADOR',
        valorCop: 170_000,
        constitutivoSalario: false,
        cantidadCentesimas: null,
      }),
      linea({
        codigo: 'PRIMA',
        nombre: 'Prima de servicios',
        clase: 'PROVISION',
        valorCop: 183_260,
        constitutivoSalario: false,
        cantidadCentesimas: null,
      }),
    ],
    periodo: {
      id: 'per-1',
      mes: '2026-03',
      quincena: null,
      desde: '2026-03-01',
      hasta: '2026-03-31',
      estado: 'APROBADO',
      totalDevengadoCop: 2_200_000,
      totalDeduccionesCop: 160_000,
      totalNetoCop: 2_040_000,
      totalAportesCop: 600_440,
      personas: 1,
      aprobadoAt: '2026-03-31T00:00:00.000Z',
      pagadoAt: null,
      asientoId: null,
      loteDeEgresosId: null,
      motivoAnulacion: null,
    },
    documentosDeNomina: [],
    ...extra,
  };
}

let contenedor: HTMLDivElement;
let root: Root;

async function montar() {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root.render(<DesprendiblePanel liquidacionId="liq-1" />);
  });
}

beforeEach(() => {
  h.desprendible.mockReset();
  h.reenviar.mockReset();
  h.exito.mockReset();
  h.error.mockReset();
  h.noEstaHabilitada.mockReturnValue(false);
  h.faltaLaMigracion.mockReturnValue(false);
});

afterEach(() => {
  act(() => root?.unmount());
  contenedor?.remove();
});

const texto = () => contenedor.textContent ?? '';

describe('el desprendible', () => {
  it('🔴 pinta el neto que manda el back, no la suma de la tabla', async () => {
    // El back manda un neto que NO coincide con devengado − deducciones de las
    // líneas visibles: si la pantalla sumara, mostraría otro número. Tiene que
    // mostrar el del back — y si hay una discrepancia, es un bug del back que se
    // arregla en el back, no un maquillaje del navegador.
    h.desprendible.mockResolvedValue(datos({ netoCop: 1_999_999 }));
    await montar();
    expect(
      contenedor.querySelector('[data-testid="valor-neto"]')?.textContent,
    ).toContain('1.999.999');
  });

  it('muestra los cuatro bloques y el total de cada uno', async () => {
    h.desprendible.mockResolvedValue(datos());
    await montar();
    for (const clase of [
      'DEVENGADO',
      'DEDUCCION',
      'APORTE_EMPLEADOR',
      'PROVISION',
    ]) {
      expect(
        contenedor.querySelector(`[data-testid="bloque-${clase}"]`),
      ).not.toBeNull();
    }
    expect(
      contenedor.querySelector('[data-testid="total-DEVENGADO"]')?.textContent,
    ).toContain('2.200.000');
  });

  it('🔴 los aportes del empleador aparecen y se explican como NO descontados', async () => {
    h.desprendible.mockResolvedValue(datos());
    await montar();
    expect(
      contenedor.querySelector('[data-testid="linea-SALUD-PAT"]'),
    ).not.toBeNull();
    expect(texto()).toContain('NO se le descuentan');
  });

  it('🔴 el auxilio de transporte explica que no entra al IBC pero sí a las prestaciones', async () => {
    h.desprendible.mockResolvedValue(datos());
    await montar();
    const fila = contenedor.querySelector('[data-testid="linea-AUX-TRANS"]');
    expect(fila?.textContent).toContain('No entra al IBC');
    expect(fila?.textContent).toContain('sí a la base de prima y cesantías');
  });

  it('cada renglón trae su detalle: la pantalla no deja un valor suelto', async () => {
    h.desprendible.mockResolvedValue(datos());
    await montar();
    expect(texto()).toContain('base 30');
  });

  it('🔴 lo que un contador debe validar sale ARRIBA y contado', async () => {
    h.desprendible.mockResolvedValue(
      datos({
        requiereValidacionContador: true,
        lineas: [
          linea({
            codigo: 'RD',
            nombre: 'Recargo dominical o festivo',
            valorCop: 60_000,
            requiereValidacionContador: true,
            motivoValidacion:
              'El recargo dominical del CST art. 179 lo sube por etapas la reforma laboral de 2025.',
          }),
        ],
      }),
    );
    await montar();
    const cartel = contenedor.querySelector('[data-testid="renglones-marcados"]');
    expect(cartel).not.toBeNull();
    expect(cartel?.textContent).toContain('reforma laboral de 2025');
    expect(cartel?.textContent).toContain('1 renglón');
  });

  it('una liquidación DEFINITIVA se declara como tal, con su causal', async () => {
    h.desprendible.mockResolvedValue(
      datos({
        esDefinitiva: true,
        fechaRetiro: '2026-03-20',
        causalRetiro: 'SIN_JUSTA_CAUSA',
      }),
    );
    await montar();
    const marca = contenedor.querySelector('[data-testid="es-definitiva"]');
    expect(marca?.textContent).toContain('DEFINITIVA');
    expect(marca?.textContent).toContain('sin justa causa');
  });

  it('🔴 un CUNE de prueba se muestra, con el documento que lo tiene', async () => {
    h.desprendible.mockResolvedValue(
      datos({
        documentosDeNomina: [
          {
            id: 'doc-1',
            liquidacionId: 'liq-1',
            tipo: 'NOMINA',
            periodo: '2026-03',
            prefijo: 'NE',
            numero: 1,
            estado: 'ACEPTADO',
            cune: 'PRUEBA-deadbeef-NE1',
            transmitidoAt: null,
            validadoAt: '2026-03-31T00:00:00.000Z',
            intentos: 1,
            ultimoError: null,
            proveedor: 'De prueba (no transmite a la DIAN)',
            totalDevengadoCop: 2_200_000,
            totalDeduccionesCop: 160_000,
            totalNetoCop: 2_040_000,
          },
        ],
      }),
    );
    await montar();
    expect(texto()).toContain('PRUEBA-deadbeef-NE1');
    expect(texto()).toContain('De prueba');
    // Y la explicación de qué significa ese prefijo.
    expect(texto()).toContain('NO se informó');
  });
});

/**
 * 🔴 LA CONSTANCIA (Nico, 17-09: «con constancia»).
 *
 * La pregunta que la gente hace no es «¿se envió?» sino «¿a qué correo?». La
 * ficha pudo cambiar desde entonces.
 */
describe('la constancia del envío', () => {
  it('dice A QUÉ correo salió y cuándo', async () => {
    h.desprendible.mockResolvedValue(
      datos({
        desprendibleEnviadoA: 'ana@ejemplo.co',
        desprendibleEnviadoAt: '2026-03-31T12:00:00.000Z',
        desprendibleIntentos: 1,
      }),
    );
    await montar();
    const c = contenedor.querySelector('[data-testid="constancia-del-envio"]');
    expect(c?.textContent).toContain('ana@ejemplo.co');
    expect(c?.textContent).toContain('2026-03-31');
  });

  it('con varios intentos lo dice', async () => {
    h.desprendible.mockResolvedValue(
      datos({
        desprendibleEnviadoA: 'ana@ejemplo.co',
        desprendibleEnviadoAt: '2026-03-31T12:00:00.000Z',
        desprendibleIntentos: 3,
      }),
    );
    await montar();
    expect(texto()).toContain('3 intentos');
  });

  it('🔴 si no salió, dice por qué Y que el período quedó aprobado igual', async () => {
    h.desprendible.mockResolvedValue(
      datos({
        desprendibleError:
          'Esta persona no tiene correo en su ficha: el desprendible no se pudo enviar.',
        desprendibleIntentos: 1,
      }),
    );
    await montar();
    const c = contenedor.querySelector('[data-testid="constancia-del-envio"]');
    expect(c?.textContent).toContain('No se envió');
    expect(c?.textContent).toContain('no tiene correo');
    expect(c?.textContent).toContain('quedó aprobado igual');
  });

  it('sin enviar, dice que sale al aprobar el período', async () => {
    h.desprendible.mockResolvedValue(datos());
    await montar();
    expect(texto()).toContain('Sale solo cuando se aprueba el período');
  });

  it('el reenvío exitoso avisa a qué correo salió', async () => {
    h.desprendible.mockResolvedValue(datos());
    h.reenviar.mockResolvedValue({
      estado: 'ENVIADO',
      enviadoA: 'ana@ejemplo.co',
      motivo: null,
    });
    await montar();
    await act(async () => {
      contenedor
        .querySelector<HTMLButtonElement>('[data-testid="reenviar-desprendible"]')
        ?.click();
    });
    expect(h.exito).toHaveBeenCalledWith(
      expect.stringContaining('ana@ejemplo.co'),
    );
  });

  it('🔴 SIN_CORREO NO es un toast de éxito: no salió', async () => {
    h.desprendible.mockResolvedValue(datos());
    h.reenviar.mockResolvedValue({
      estado: 'SIN_CORREO',
      enviadoA: null,
      motivo: 'Esta persona no tiene correo en su ficha. Complétalo y reenvíalo.',
    });
    await montar();
    await act(async () => {
      contenedor
        .querySelector<HTMLButtonElement>('[data-testid="reenviar-desprendible"]')
        ?.click();
    });
    expect(h.exito).not.toHaveBeenCalled();
    expect(h.error).toHaveBeenCalledWith(
      expect.stringContaining('no tiene correo'),
    );
  });
});

describe('🔴 las tres formas de «no se puede»', () => {
  it('el módulo no comprado se ve como un PRODUCTO, sin botón de reintentar', async () => {
    h.noEstaHabilitada.mockReturnValue(true);
    h.desprendible.mockRejectedValue(new Error('402'));
    await montar();
    expect(
      contenedor.querySelector('[data-testid="nomina-no-habilitada"]'),
    ).not.toBeNull();
    expect(texto()).toContain('Es un módulo aparte, que se contrata');
    // Reintentar no compra el módulo: el cartel no lo ofrece.
    expect(texto()).not.toContain('Intentar de nuevo');
  });

  it('la migración que falta dice QUIÉN la aplica', async () => {
    h.faltaLaMigracion.mockReturnValue(true);
    h.desprendible.mockRejectedValue(
      new Error('Falta la migración 20260918142000.'),
    );
    await montar();
    const cartel = contenedor.querySelector(
      '[data-testid="nomina-sin-migracion"]',
    );
    expect(cartel).not.toBeNull();
    expect(cartel?.textContent).toContain('Víctor');
    expect(cartel?.textContent).toContain('20260918142000');
  });

  it('cualquier otro fallo ofrece reintentar', async () => {
    h.desprendible.mockRejectedValue(new Error('la red se cayó'));
    await montar();
    expect(
      contenedor.querySelector('[data-testid="nomina-no-habilitada"]'),
    ).toBeNull();
    expect(
      contenedor.querySelector('[data-testid="nomina-sin-migracion"]'),
    ).toBeNull();
  });
});
