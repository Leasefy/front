/**
 * «Nueva factura»: el mes, las DOS listas completas, y generar lo elegido.
 *
 * Lo que se protege es el pedido de Nico: que la pantalla no obligue a elegir
 * una factura a la vez, que separe inquilinos de propietarios, que lo ya
 * emitido se vea (con su número y sin casilla) en vez de esconderse, y que
 * cambiar de mes vuelva a preguntar.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { FacturaDelMes, FacturasPorGenerar } from '@/lib/api/facturacion-por-mes.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const porGenerarMock = vi.fn();
const generarMock = vi.fn();
const toastOk = vi.fn();
const toastErr = vi.fn();

vi.mock('@/lib/api/facturacion-por-mes.service', async () => {
  const real = await vi.importActual<
    typeof import('@/lib/api/facturacion-por-mes.service')
  >('@/lib/api/facturacion-por-mes.service');
  return {
    ...real,
    facturacionPorMesService: {
      porGenerar: (...a: unknown[]) => porGenerarMock(...a),
      generar: (...a: unknown[]) => generarMock(...a),
    },
  };
});

vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: (...a: unknown[]) => toastOk(...a),
    error: (...a: unknown[]) => toastErr(...a),
  },
}));

import { NuevaFactura } from './NuevaFactura';

function factura(over: Partial<FacturaDelMes> = {}): FacturaDelMes {
  return {
    clave: 'ct-1|2026-09|INQUILINO',
    contractId: 'ct-1',
    codigo: 1839,
    numeroExterno: '1686',
    inmueble: 'Cra 76 #45-12 apto 302',
    destinatario: 'INQUILINO',
    terceroId: null,
    terceroNombre: 'Nubia Amparo David',
    terceroDocumento: '43123456',
    lineas: [
      { tipo: 'CANON', nombre: 'Canon de arrendamiento', valorCop: 1_800_000, resta: false },
    ],
    subtotalCop: 1_800_000,
    descuentoCop: 0,
    baseCop: 1_800_000,
    // Por defecto, el contrato del que NADIE confirmó el escenario: sin
    // impuestos y marcado. Es como sale hoy la inmensa mayoría de los
    // contratos migrados de Nico.
    ivaCop: 0,
    retencionesCop: 0,
    totalCop: 1_800_000,
    netoCop: 1_800_000,
    impuestos: [],
    impuestosSinConfirmar: true,
    notasTributarias: ['Falta saber si el propietario es responsable de IVA.'],
    escenario: null,
    estado: 'POR_EMITIR',
    numero: null,
    numeroDian: null,
    diasFacturados: 30,
    diasDelMes: 30,
    deduccionAlEgresoCop: 0,
    ...over,
  };
}

/** Un lado del resumen, con los totales tributarios en cero. */
function lado(over: Partial<FacturasPorGenerar['totales']['inquilinos']> = {}) {
  return {
    porEmitir: 0,
    emitidas: 0,
    totalCop: 0,
    baseCop: 0,
    ivaCop: 0,
    retencionesCop: 0,
    sinConfirmar: 0,
    conIva: 0,
    conRetenciones: 0,
    ...over,
  };
}

/** Una resolución vigente: sin ella el botón «Generar» está apagado. */
function resolucionVigente(
  over: Partial<FacturasPorGenerar['resolucion']> = {},
): FacturasPorGenerar['resolucion'] {
  return {
    puedeNumerar: true,
    motivo: null,
    explicacion: null,
    numero: '18764003394379',
    prefijo: 'FE',
    desde: 1,
    hasta: 5000,
    vigenteHasta: '2028-01-15',
    disponibles: 5000,
    siguiente: 'FE-1',
    ...over,
  };
}

function respuesta(over: Partial<FacturasPorGenerar> = {}): FacturasPorGenerar {
  const inquilinos = over.inquilinos ?? [factura()];
  const propietarios = over.propietarios ?? [
    factura({
      clave: 'ct-1|2026-09|PROPIETARIO',
      destinatario: 'PROPIETARIO',
      terceroNombre: 'Jorge Restrepo',
      terceroDocumento: '71234567',
      lineas: [
        { tipo: 'COMISION', nombre: 'Comisión de administración (10 %)', valorCop: 180_000, resta: false },
      ],
      subtotalCop: 180_000,
      baseCop: 180_000,
      totalCop: 180_000,
      netoCop: 180_000,
    }),
  ];
  return {
    mes: '2026-09',
    inquilinos,
    propietarios,
    omitidos: over.omitidos ?? [],
    totales: {
      contratosDelMes: 1,
      inquilinos: lado({ porEmitir: inquilinos.length, totalCop: 1_800_000 }),
      propietarios: lado({ porEmitir: propietarios.length, totalCop: 180_000 }),
    },
    resolucion: resolucionVigente(),
    ...over,
  };
}

let host: HTMLDivElement;
let root: Root;

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<NuevaFactura />);
  });
}

beforeEach(() => {
  porGenerarMock.mockReset().mockResolvedValue(respuesta());
  generarMock.mockReset();
  toastOk.mockReset();
  toastErr.mockReset();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

const q = (s: string) => host.querySelector(s);
const qa = (s: string) => Array.from(host.querySelectorAll(s));

describe('NuevaFactura', () => {
  it('pide el mes corriente al abrir y pinta las DOS listas', async () => {
    await montar();
    expect(porGenerarMock).toHaveBeenCalledTimes(1);
    expect(q('[data-testid="facturacion-inquilinos"]')).not.toBeNull();
    expect(q('[data-testid="facturacion-propietarios"]')).not.toBeNull();
    expect(host.textContent).toContain('Nubia Amparo David');
    expect(host.textContent).toContain('Jorge Restrepo');
  });

  it('🔴 todo lo que está por emitir arranca seleccionado: no se marcan 800 casillas a mano', async () => {
    await montar();
    const boton = q('[data-testid="facturacion-generar"]')!;
    expect(boton.textContent).toContain('Generar 2 facturas');
  });

  it('lo ya emitido se ve con su número y sin casilla, en vez de esconderse', async () => {
    porGenerarMock.mockResolvedValue(
      respuesta({
        inquilinos: [
          factura({ estado: 'EMITIDA', numero: 41, numeroDian: 'FE-41' }),
        ],
      }),
    );
    await montar();
    expect(host.textContent).toContain('FE-41');
    // La suya queda deshabilitada; sigue habiendo una del propietario.
    const boton = q('[data-testid="facturacion-generar"]')!;
    expect(boton.textContent).toContain('Generar 1 factura');
  });

  it('destildar una fila baja la cuenta del botón', async () => {
    await montar();
    const casilla = qa('[data-testid^="factura-"] button[role="checkbox"]')[0] as HTMLButtonElement;
    await act(async () => {
      casilla.click();
    });
    expect(q('[data-testid="facturacion-generar"]')!.textContent).toContain(
      'Generar 1 factura',
    );
  });

  it('generar manda el mes y las claves elegidas, y vuelve a pedir el listado', async () => {
    generarMock.mockResolvedValue({
      mes: '2026-09',
      emitidas: 2,
      yaEstaban: 0,
      totalCop: 1_980_000,
      facturas: [],
    });
    await montar();
    await act(async () => {
      (q('[data-testid="facturacion-generar"]') as HTMLButtonElement).click();
    });
    expect(generarMock).toHaveBeenCalledTimes(1);
    const [mes, claves] = generarMock.mock.calls[0] as [string, string[]];
    expect(mes).toBe('2026-09');
    expect(claves.sort()).toEqual(
      ['ct-1|2026-09|INQUILINO', 'ct-1|2026-09|PROPIETARIO'].sort(),
    );
    // Se recarga para que las recién emitidas aparezcan como emitidas.
    expect(porGenerarMock).toHaveBeenCalledTimes(2);
    expect(toastOk).toHaveBeenCalled();
  });

  it('«ya estaban emitidas» se dice, no se traga', async () => {
    generarMock.mockResolvedValue({
      mes: '2026-09',
      emitidas: 1,
      yaEstaban: 1,
      totalCop: 180_000,
      facturas: [],
    });
    await montar();
    await act(async () => {
      (q('[data-testid="facturacion-generar"]') as HTMLButtonElement).click();
    });
    expect(String(toastOk.mock.calls[0]?.[0])).toContain('1 ya estaban emitidas');
  });

  it('un fallo al generar se dice y no se pinta como éxito', async () => {
    generarMock.mockRejectedValue(new Error('Sólo el administrador o el contador pueden facturar.'));
    await montar();
    await act(async () => {
      (q('[data-testid="facturacion-generar"]') as HTMLButtonElement).click();
    });
    expect(toastErr).toHaveBeenCalledWith(
      'Sólo el administrador o el contador pueden facturar.',
    );
    expect(toastOk).not.toHaveBeenCalled();
  });

  it('un mes sin contratos muestra el vacío, no una tabla en blanco', async () => {
    porGenerarMock.mockResolvedValue(
      respuesta({
        inquilinos: [],
        propietarios: [],
        totales: {
          contratosDelMes: 0,
          inquilinos: lado(),
          propietarios: lado(),
        },
      }),
    );
    await montar();
    expect(q('[data-testid="sin-datos"]')).not.toBeNull();
  });

  it('🔴 el número de Nui va grande y el nuestro rotulado: nunca un «#1839» pelado', async () => {
    await montar();
    expect(host.textContent).toContain('1686');
    expect(host.textContent).toContain('Leasefy #1839');
  });

  it('un omitido migrado también se cita por el número de Nui, con el nuestro rotulado', async () => {
    porGenerarMock.mockResolvedValue(
      respuesta({
        omitidos: [
          {
            contractId: 'ct-9',
            codigo: 1839,
            numeroExterno: '1686',
            inmueble: 'Cra 76 #45-12 apto 302',
            destinatario: 'INQUILINO',
            motivo: 'No hay nada que cobrarle al inquilino este mes.',
          },
        ],
      }),
    );
    await montar();
    const bloque = q('[data-testid="facturacion-omitidos"]')!;
    expect(bloque.textContent).toContain('1686 · Leasefy #1839');
  });

  it('los contratos que NO generan factura se listan con su motivo', async () => {
    porGenerarMock.mockResolvedValue(
      respuesta({
        omitidos: [
          {
            contractId: 'ct-2',
            codigo: 94,
            inmueble: 'Casa en Laureles',
            destinatario: 'PROPIETARIO',
            motivo: 'El mandato no pactó comisión de administración.',
          },
        ],
      }),
    );
    await montar();
    const bloque = q('[data-testid="facturacion-omitidos"]')!;
    expect(bloque.textContent).toContain('1 contratos del mes no generan factura');
    expect(bloque.textContent).toContain('El mandato no pactó comisión de administración.');
  });

  it('🔴 dice que un escenario sin confirmar se factura SIN impuestos', async () => {
    await montar();
    expect(host.textContent).toContain('se factura SIN impuestos');
    // Y que numerar no es transmitir: la factura electrónica no está.
    expect(host.textContent).toContain('todavía no se transmite');
  });

  /**
   * Lo tributario, que es el pedido del 12 a las 22:50. Lo que se protege:
   * que la retención NO baje el total (baja el neto), que un cero y un «sin
   * confirmar» se distingan, y que el botón se apague sin resolución vigente.
   */
  describe('IVA, retenciones y numeración DIAN', () => {
    const conImpuestos = () =>
      factura({
        baseCop: 1_800_000,
        ivaCop: 342_000,
        retencionesCop: 63_000,
        totalCop: 2_142_000,
        netoCop: 2_079_000,
        impuestosSinConfirmar: false,
        notasTributarias: [],
        escenario: { codigo: 'E9', nombre: 'Escenario 9', certeza: 'CONFIRMADO' },
        impuestos: [
          {
            tipo: 'IVA',
            sobre: 'ARRENDAMIENTO',
            nombre: 'IVA sobre el canon',
            porcentaje: 19,
            baseCop: 1_800_000,
            valorCop: 342_000,
            suma: true,
            loPractica: 'PROPIETARIO',
            aCargoDe: 'INQUILINO',
            explicacion: '',
          },
        ],
      });

    it('la fila muestra base, IVA, retención y total — y el neto aparte', async () => {
      porGenerarMock.mockResolvedValue(
        respuesta({ inquilinos: [conImpuestos()], propietarios: [] }),
      );
      await montar();
      const fila = q('[data-testid="factura-ct-1|2026-09|INQUILINO"]')!;
      const texto = fila.textContent ?? '';
      expect(texto).toContain('$ 1.800.000');
      expect(texto).toContain('$ 342.000');
      // 🔴 La retención resta del NETO, no del total: se ve con signo menos y
      // el total sigue siendo base + IVA.
      expect(texto).toContain('−$ 63.000');
      expect(texto).toContain('$ 2.142.000');
      expect(texto).toContain('Neto $ 2.079.000');
    });

    it('🔴 una factura con el escenario sin confirmar se marca, no dice «$0»', async () => {
      await montar();
      expect(q('[data-testid="sin-confirmar-ct-1|2026-09|INQUILINO"]')).not.toBeNull();
    });

    it('la emitida muestra el número DIAN y el consecutivo interno debajo', async () => {
      porGenerarMock.mockResolvedValue(
        respuesta({
          inquilinos: [
            factura({ estado: 'EMITIDA', numero: 41, numeroDian: 'FE-41' }),
          ],
        }),
      );
      await montar();
      const fila = q('[data-testid="factura-ct-1|2026-09|INQUILINO"]')!;
      expect(fila.textContent).toContain('FE-41');
      expect(fila.textContent).toContain('interna N° 41');
    });

    it('con resolución vigente dice con qué número sigue', async () => {
      await montar();
      const pie = q('[data-testid="facturacion-siguiente-numero"]')!;
      expect(pie.textContent).toContain('FE-1');
      expect(pie.textContent).toContain('18764003394379');
      expect(pie.textContent).toContain('15/01/2028');
    });

    it('🔴 sin resolución vigente el botón se apaga y la pantalla dice por qué', async () => {
      porGenerarMock.mockResolvedValue(
        respuesta({
          resolucion: resolucionVigente({
            puedeNumerar: false,
            motivo: 'SIN_RESOLUCION',
            explicacion:
              'La inmobiliaria no tiene una resolución de facturación cargada.',
            siguiente: null,
            numero: null,
          }),
        }),
      );
      await montar();
      const aviso = q('[data-testid="facturacion-sin-resolucion"]')!;
      expect(aviso.textContent).toContain('no tiene una resolución');
      expect(
        (q('[data-testid="facturacion-generar"]') as HTMLButtonElement).disabled,
      ).toBe(true);
    });

    it('si el rango no alcanzó, se avisa aparte del éxito', async () => {
      generarMock.mockResolvedValue({
        mes: '2026-09',
        emitidas: 1,
        yaEstaban: 0,
        sinNumero: 1,
        motivo: 'La resolución 999 sólo tiene 1 números disponibles.',
        totalCop: 1_800_000,
        facturas: [],
      });
      await montar();
      await act(async () => {
        (q('[data-testid="facturacion-generar"]') as HTMLButtonElement).click();
      });
      expect(toastErr).toHaveBeenCalledWith(
        'La resolución 999 sólo tiene 1 números disponibles.',
      );
    });
  });

  /**
   * Auditoría de casos de error 13-09.
   *   · F3 — 3.824 facturas en un request colgaban la pantalla: ahora viajan
   *     en tandas de 200 con progreso y «Detener».
   *   · F2 — una corrida a medias decía «No se pudieron emitir» sobre las que
   *     sí salieron: ahora hay un informe con lo que salió, lo que no y qué
   *     hacer.
   */
  describe('F2 y F3 — la corrida en tandas y su informe', () => {
    const muchas = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        factura({ clave: `ct-${i}|2026-09|INQUILINO`, contractId: `ct-${i}` }),
      );
    const sale = async (mes: string, claves: string[]) => ({
      mes,
      emitidas: claves.length,
      yaEstaban: 0,
      sinNumero: 0,
      motivo: null,
      totalCop: claves.length * 1_000,
      facturas: [],
    });
    const soltarTareas = () =>
      act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
    const apretarGenerar = () =>
      act(async () => {
        (q('[data-testid="facturacion-generar"]') as HTMLButtonElement).click();
      });

    beforeEach(() => {
      porGenerarMock.mockResolvedValue(respuesta({ inquilinos: muchas(450), propietarios: [] }));
    });

    it('🔴 F3: 450 elegidas viajan en tres tandas de a lo sumo 200', async () => {
      generarMock.mockImplementation(sale);
      await montar();
      await apretarGenerar();
      await soltarTareas();

      expect(generarMock).toHaveBeenCalledTimes(3);
      expect(generarMock.mock.calls.map((c) => (c[1] as string[]).length)).toEqual([200, 200, 50]);
      const informe = q('[data-testid="facturacion-informe"]')!;
      expect(informe.getAttribute('data-corte')).toBe('completa');
      expect(informe.textContent).toContain('Se emitieron 450 facturas');
      // Sin pendientes no hay nada que reintentar: no se lo pide.
      expect(q('[data-testid="facturacion-informe-que-hacer"]')).toBeNull();
    });

    it('🔴 F3: dice en qué va y «Detener» corta al cerrar la tanda en curso', async () => {
      let soltar: () => void = () => {};
      generarMock.mockImplementationOnce(
        (mes: string, claves: string[]) =>
          new Promise((r) => {
            soltar = () => r(sale(mes, claves));
          }),
      );
      generarMock.mockImplementation(sale);
      await montar();
      await apretarGenerar();

      expect(q('[data-testid="facturacion-generar"]')!.textContent).toContain('Emitiendo 0 de 450');
      expect(q('[data-testid="facturacion-progreso"]')).not.toBeNull();

      await act(async () => {
        (q('[data-testid="facturacion-detener"]') as HTMLButtonElement).click();
      });
      await act(async () => {
        soltar();
      });
      await soltarTareas();

      expect(generarMock).toHaveBeenCalledTimes(1);
      const informe = q('[data-testid="facturacion-informe"]')!;
      expect(informe.getAttribute('data-corte')).toBe('detenida');
      expect(informe.textContent).toContain('Se emitieron 200 facturas');
      expect(informe.textContent).toContain('250 facturas no se enviaron porque detuviste la corrida');
      expect(informe.textContent).toContain('Vuelve a apretar «Generar»');
    });

    it('🔴 F2: una tanda caída a mitad no borra lo emitido y separa lo dudoso de lo no enviado', async () => {
      generarMock.mockImplementationOnce(sale).mockRejectedValueOnce(new Error('504 Gateway Timeout'));
      await montar();
      await apretarGenerar();
      await soltarTareas();

      const informe = q('[data-testid="facturacion-informe"]')!;
      expect(informe.getAttribute('data-corte')).toBe('fallo');
      expect(informe.textContent).toContain('Se emitieron 200 facturas');
      expect(q('[data-testid="facturacion-informe-sin-confirmar"]')!.textContent).toContain(
        '200 facturas de la tanda que falló no se pudieron confirmar',
      );
      expect(q('[data-testid="facturacion-informe-sin-confirmar"]')!.textContent).toContain(
        '504 Gateway Timeout',
      );
      expect(q('[data-testid="facturacion-informe-sin-enviar"]')!.textContent).toContain('50 facturas');
      expect(q('[data-testid="facturacion-informe-que-hacer"]')!.textContent).toContain(
        'las que salieron no se duplican',
      );
      // Lo emitido se dice como éxito; el fallo, aparte y con su mensaje.
      expect(String(toastOk.mock.calls[0]?.[0])).toContain('200 facturas emitidas');
      expect(toastErr).toHaveBeenCalledWith('504 Gateway Timeout');
      // Se recarga para que las emitidas aparezcan como emitidas.
      expect(porGenerarMock).toHaveBeenCalledTimes(2);
    });

    it('el informe se cierra', async () => {
      generarMock.mockImplementation(sale);
      await montar();
      await apretarGenerar();
      await soltarTareas();
      const cerrar = Array.from(
        q('[data-testid="facturacion-informe"]')!.querySelectorAll('button'),
      ).find((b) => b.textContent === 'Cerrar') as HTMLButtonElement;
      await act(async () => {
        cerrar.click();
      });
      expect(q('[data-testid="facturacion-informe"]')).toBeNull();
    });
  });
});
