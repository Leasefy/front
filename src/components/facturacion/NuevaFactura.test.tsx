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
    cuotaId: 'cu-i-2026-09',
    contractId: 'ct-1',
    mes: '2026-09',
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
    // Septiembre es el mes en curso de estas pruebas: se puede emitir.
    emitible: true,
    motivoNoEmitible: null,
    avisos: [],
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
  const totalesInquilinos = lado({
    porEmitir: inquilinos.length,
    totalCop: 1_800_000,
  });
  const totalesPropietarios = lado({
    porEmitir: propietarios.length,
    totalCop: 180_000,
  });
  return {
    desde: '2026-09',
    hasta: '2026-09',
    mes: '2026-09',
    inquilinos,
    propietarios,
    omitidos: over.omitidos ?? [],
    meses: over.meses ?? [
      {
        mes: '2026-09',
        nombre: 'Septiembre de 2026',
        emitible: true,
        motivoNoEmitible: null,
        inquilinos: totalesInquilinos,
        propietarios: totalesPropietarios,
      },
    ],
    porContrato: over.porContrato ?? [],
    totales: {
      contratos: 1,
      meses: 1,
      emitiblesHoy: inquilinos.length + propietarios.length,
      totalEmitibleHoyCop: 1_980_000,
      inquilinos: totalesInquilinos,
      propietarios: totalesPropietarios,
    },
    resolucion: resolucionVigente(),
    ...over,
  };
}

let host: HTMLDivElement;
let root: Root;

const irAResolucion = vi.fn();

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<NuevaFactura onIrAResolucion={irAResolucion} />);
  });
}

/** Escribir en un input controlado por React. */
async function escribir(sel: string, texto: string) {
  const input = q(sel) as HTMLInputElement;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!;
    setter.call(input, texto);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function clic(sel: string) {
  await act(async () => {
    (q(sel) as HTMLElement | null)?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
  });
}

beforeEach(() => {
  porGenerarMock.mockReset().mockResolvedValue(respuesta());
  generarMock.mockReset();
  irAResolucion.mockReset();
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
        meses: [],
        totales: {
          contratos: 0,
          meses: 0,
          emitiblesHoy: 0,
          totalEmitibleHoyCop: 0,
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
            mes: '2026-09',
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
            mes: '2026-09',
            destinatario: 'PROPIETARIO',
            motivo: 'El mandato no pactó comisión de administración.',
          },
        ],
      }),
    );
    await montar();
    const bloque = q('[data-testid="facturacion-omitidos"]')!;
    expect(bloque.textContent).toContain('1 cuota no genera factura');
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

    /*
     * 🔴 19-09 · Visto en el navegador con los datos reales de QA: el botón
     * decía «Generar 208 facturas» y justo encima, en la misma tarjeta,
     * «50 números disponibles». La pantalla tenía los dos números y no sacaba
     * la cuenta. Probado contra el back el 19-09: numera las que alcanzan y
     * las demás fallan con «rango agotado», así que apretar dejaba 50
     * emitidas, 158 errores y a alguien preguntándose qué pasó.
     */
    it('🔴 avisa ANTES si la selección no cabe en el rango de la resolución', async () => {
      porGenerarMock.mockResolvedValue(
        respuesta({ resolucion: resolucionVigente({ disponibles: 1 }) }),
      );
      await montar();
      const aviso = q('[data-testid="facturacion-rango-corto"]')!;
      expect(aviso).not.toBeNull();
      expect(aviso.textContent).toContain('sólo tiene 1');
      expect(aviso.textContent).toContain('rango agotado');
    });

    it('🔴 avisar NO es apagar: emitir las que caben es trabajo legítimo', async () => {
      // Apagar el botón obligaría a deseleccionar a mano las que no caben.
      porGenerarMock.mockResolvedValue(
        respuesta({ resolucion: resolucionVigente({ disponibles: 1 }) }),
      );
      await montar();
      expect(
        (q('[data-testid="facturacion-generar"]') as HTMLButtonElement).disabled,
      ).toBe(false);
    });

    it('si el rango alcanza, no hay aviso', async () => {
      await montar();
      expect(q('[data-testid="facturacion-rango-corto"]')).toBeNull();
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
  /**
   * 🔴 «Hasta el 31 de diciembre», y la línea que no se cruza.
   *
   * CEO (2026-09-13): «Si quiero mirar qué facturas tengo por generar hasta el
   * 31 de diciembre… Lo que NO se puede es enviarlas [antes de tiempo].» Lo que
   * se protege: que mirar más lejos no vuelva emitible un mes que no empezó, y
   * que la razón se diga.
   */
  describe('el rango y la línea entre mirar y emitir', () => {
    /** La misma respuesta, con diciembre pegado y todavía sin empezar. */
    const conDiciembre = () => {
      const diciembre = factura({
        clave: 'ct-1|2026-12|INQUILINO',
        cuotaId: 'cu-i-2026-12',
        mes: '2026-12',
        emitible: false,
        motivoNoEmitible:
          'Diciembre de 2026 todavía no empieza: faltan 3 meses. Se puede ver la prefactura, no emitirla.',
      });
      const base = respuesta();
      return respuesta({
        desde: '2026-09',
        hasta: '2026-12',
        inquilinos: [...base.inquilinos, diciembre],
        meses: [
          ...base.meses,
          {
            mes: '2026-12',
            nombre: 'Diciembre de 2026',
            emitible: false,
            motivoNoEmitible:
              'Diciembre de 2026 todavía no empieza: faltan 3 meses. Se puede ver la prefactura, no emitirla.',
            inquilinos: lado({ porEmitir: 1, totalCop: 1_800_000 }),
            propietarios: lado(),
          },
        ],
        porContrato: [
          {
            contractId: 'ct-1',
            destinatario: 'INQUILINO',
            codigo: 1839,
            numeroExterno: '1686',
            inmueble: 'Cra 76 #45-12 apto 302',
            terceroNombre: 'Nubia Amparo David',
            cantidad: 10,
            totalCop: 18_000_000,
            valorTipicoCop: 1_800_000,
            valorParejo: true,
            primerMes: '2026-09',
            ultimoMes: '2027-06',
            terminaEnElRango: false,
            terminaEl: null,
          },
        ],
        totales: {
          contratos: 1,
          meses: 2,
          emitiblesHoy: 2,
          totalEmitibleHoyCop: 1_980_000,
          inquilinos: lado({ porEmitir: 2, totalCop: 3_600_000 }),
          propietarios: lado({ porEmitir: 1, totalCop: 180_000 }),
        },
      });
    };

    it('con un solo mes NO aparece el bloque del rango: la pantalla de siempre', async () => {
      await montar();
      expect(q('[data-testid="prefacturas-del-rango"]')).toBeNull();
    });

    it('«Hasta diciembre» estira la consulta hasta el 31 de diciembre', async () => {
      await montar();
      await act(async () => {
        (
          q('[data-testid="facturacion-hasta-fin-de-anio"]') as HTMLButtonElement
        ).click();
      });
      const ultima = porGenerarMock.mock.calls.at(-1)?.[0] as {
        desde: string;
        hasta: string;
      };
      expect(ultima.hasta).toMatch(/^\d{4}-12$/);
      expect(ultima.desde).toBe(ultima.hasta.slice(0, 4) + '-09');
    });

    it('🔴 la factura de un mes que no empezó NO entra a la selección', async () => {
      porGenerarMock.mockResolvedValue(conDiciembre());
      await montar();
      // Diciembre existe en la respuesta y NO suma al botón: siguen siendo las
      // dos de septiembre.
      const boton = q('[data-testid="facturacion-generar"]')!;
      expect(boton.textContent).toContain('Generar 2 facturas');
    });

    it('🔴 y el mes dice POR QUÉ todavía no se emite, con las palabras del back', async () => {
      porGenerarMock.mockResolvedValue(conDiciembre());
      await montar();
      const motivo = q('[data-testid="rango-motivo-2026-12"]');
      expect(motivo?.textContent).toContain('todavía no empieza');
      expect(q('[data-testid="rango-no-emitible-2026-12"]')).not.toBeNull();
      expect(q('[data-testid="rango-emitible-2026-09"]')).not.toBeNull();
    });

    it('🔴 «10 facturas de un millón»: el agrupado por contrato se ve', async () => {
      porGenerarMock.mockResolvedValue(conDiciembre());
      await montar();
      const grupo = q('[data-testid="rango-contrato-ct-1-INQUILINO"]')!;
      expect(grupo.textContent).toContain('10');
      expect(grupo.textContent).toContain('1.800.000');
    });

    it('la tabla del mes elegido NO trae las filas de los otros meses', async () => {
      porGenerarMock.mockResolvedValue(conDiciembre());
      await montar();
      const tabla = q('[data-testid="facturacion-inquilinos"]')!;
      expect(tabla.querySelector('[data-testid="factura-ct-1|2026-09|INQUILINO"]')).not.toBeNull();
      expect(tabla.querySelector('[data-testid="factura-ct-1|2026-12|INQUILINO"]')).toBeNull();
    });
  });

  /**
   * 🔴 La plata que la factura NO lleva, dicha en voz alta.
   *
   * Cuando la cuota ya es cartera y no hay con qué liquidar el interés, el back
   * manda un `aviso` en vez de inventar el número — y la pantalla lo muestra.
   */
  describe('los avisos de la fila', () => {
    it('una cuota en mora que nadie pudo liquidar lo reclama en la fila', async () => {
      porGenerarMock.mockResolvedValue(
        respuesta({
          inquilinos: [
            factura({
              avisos: [
                'Esta cuota está en mora hace 42 días y la factura NO lleva intereses. La inmobiliaria no tiene reglas de mora activas.',
              ],
            }),
          ],
        }),
      );
      await montar();
      const aviso = q('[data-testid="aviso-ct-1|2026-09|INQUILINO"]');
      expect(aviso?.textContent).toContain('NO lleva intereses');
    });

    it('sin avisos no se pinta ninguna advertencia', async () => {
      await montar();
      expect(q('[data-testid="aviso-ct-1|2026-09|INQUILINO"]')).toBeNull();
    });
  });

  /**
   * 🔴 EL INTERÉS DE MORA, Y CON QUÉ AUTORIDAD.
   *
   * Nico: «el interés sí se va cargando a la factura cada vez que se genera.»
   * `del cobro` es un número escrito que no se mueve; `sobre la cuota` es el
   * motor corriendo hoy y CRECE cada día hasta que se emita. Pintarlos igual
   * hace que la persona decida con información falsa.
   */
  describe('el interés de mora', () => {
    const conMora = (over: Partial<FacturaDelMes['mora'] & object> = {}) =>
      factura({
        totalCop: 1_841_000,
        mora: {
          esCartera: true,
          diasDeMora: 41,
          recargosCop: 41_000,
          origen: 'CUOTA',
          motivo: null,
          ...over,
        },
      });

    it('🔴 muestra el valor, los días y que se calculó SOBRE LA CUOTA', async () => {
      porGenerarMock.mockResolvedValue(respuesta({ inquilinos: [conMora()] }));
      await montar();
      const mora = q('[data-testid="mora-ct-1|2026-09|INQUILINO"]');
      expect(mora?.textContent).toContain('41.000');
      expect(mora?.textContent).toContain('41 días');
      expect(mora?.textContent).toContain('sobre la cuota');
    });

    it('🔴 un interés que ya liquidó el cobro se marca «del cobro»', async () => {
      porGenerarMock.mockResolvedValue(
        respuesta({ inquilinos: [conMora({ origen: 'COBRO' })] }),
      );
      await montar();
      const mora = q('[data-testid="mora-ct-1|2026-09|INQUILINO"]');
      expect(mora?.textContent).toContain('del cobro');
      expect(mora?.textContent).not.toContain('sobre la cuota');
    });

    it('el encabezado totaliza la mora aparte de la base y el IVA', async () => {
      porGenerarMock.mockResolvedValue(respuesta({ inquilinos: [conMora()] }));
      await montar();
      const total = q('[data-testid="facturacion-inquilinos-mora"]');
      expect(total?.textContent).toContain('41.000');
      expect(total?.textContent).toContain('1 factura');
    });

    it('el total se rotula «Recargos», no «Interés»: suma también el gasto administrativo', async () => {
      porGenerarMock.mockResolvedValue(respuesta({ inquilinos: [conMora()] }));
      await montar();
      const total = q('[data-testid="facturacion-inquilinos-mora"]');
      expect(total?.textContent).toContain('Recargos de mora');
      expect(total?.textContent).not.toContain('Interés de mora');
    });

    it('sin mora no se pinta la línea ni el total', async () => {
      await montar();
      expect(q('[data-testid="mora-ct-1|2026-09|INQUILINO"]')).toBeNull();
      expect(q('[data-testid="facturacion-inquilinos-mora"]')).toBeNull();
    });

    it('una cuota en cartera con recargo en CERO no pinta una línea vacía', async () => {
      porGenerarMock.mockResolvedValue(
        respuesta({
          inquilinos: [
            conMora({ recargosCop: 0, origen: null, motivo: 'Sin reglas.' }),
          ],
        }),
      );
      await montar();
      expect(q('[data-testid="mora-ct-1|2026-09|INQUILINO"]')).toBeNull();
    });

    it('un back anterior sin el campo `mora` no rompe la fila', async () => {
      porGenerarMock.mockResolvedValue(
        respuesta({ inquilinos: [factura({ mora: undefined })] }),
      );
      await montar();
      expect(q('[data-testid="factura-ct-1|2026-09|INQUILINO"]')).not.toBeNull();
      expect(q('[data-testid="mora-ct-1|2026-09|INQUILINO"]')).toBeNull();
    });
  });
});

/**
 * 🔴 Lo que Nico pidió el 18-09 de noche, mirando 730 contratos en pantalla:
 *
 *   «Selecciono sólo una y no da el poder generar factura de sólo esa, y
 *    agrega un buscador a la tabla.»
 *
 * NO contradice el pedido del 12 («no que me ponga a escoger una»): ahí
 * rechazó una pantalla que OBLIGABA a elegir un contrato para poder ver algo.
 * La lista completa y premarcada se queda; lo que faltaba era poder actuar
 * sobre UNA fila y poder encontrarla. Este bloque es el que impide que
 * arreglar una de las dos cosas rompa la otra.
 */
describe('una sola factura, y cómo llegar a ella (Nico, 18-09-2026)', () => {
  const DOS = () =>
    respuesta({
      inquilinos: [
        factura({
          clave: 'ct-1|2026-09|INQUILINO',
          terceroNombre: 'Miguel Lorenzo Ramirez',
          terceroDocumento: '94476481',
          inmueble: 'CL 52 A SUR 67 - 16 SAN ANTONIO',
        }),
        factura({
          clave: 'ct-2|2026-09|INQUILINO',
          codigo: 3,
          terceroNombre: 'J y C Papas S.A.S',
          terceroDocumento: '901559008',
          inmueble: 'CL 129 SUR 56 53 LC 01 MEDELLÍN',
        }),
      ],
    });

  it('🔴 «Generar esta» emite ESA fila y ninguna otra', async () => {
    porGenerarMock.mockResolvedValue(DOS());
    generarMock.mockResolvedValue({
      mes: '2026-09',
      emitidas: 1,
      yaEstaban: 0,
      totalCop: 1_800_000,
      facturas: [],
    });
    await montar();
    await clic('[data-testid="generar-una-ct-2|2026-09|INQUILINO"]');
    expect(generarMock).toHaveBeenCalledTimes(1);
    const [mes, claves] = generarMock.mock.calls[0] as [string, string[]];
    expect(mes).toBe('2026-09');
    // UNA, aunque las tres estén marcadas: no hay que limpiar la selección
    // primero, que era exactamente lo que no se podía hacer.
    expect(claves).toEqual(['ct-2|2026-09|INQUILINO']);
  });

  it('el buscador deja la fila que se busca, sin desmarcar nada', async () => {
    porGenerarMock.mockResolvedValue(DOS());
    await montar();
    expect(qa('[data-testid^="factura-ct-"]')).toHaveLength(3);
    await escribir('[data-testid="facturacion-inquilinos-buscar"]', 'papas');
    expect(q('[data-testid="factura-ct-2|2026-09|INQUILINO"]')).not.toBeNull();
    expect(q('[data-testid="factura-ct-1|2026-09|INQUILINO"]')).toBeNull();
    // 🔴 Buscar ESCONDE, nunca desmarca: perder 700 facturas por escribir en
    // un campo sería mucho peor que no tener buscador.
    expect(q('[data-testid="facturacion-generar"]')?.textContent).toContain(
      'Generar 3 facturas',
    );
  });

  it('busca por documento, por inmueble y sin tildes', async () => {
    porGenerarMock.mockResolvedValue(DOS());
    await montar();
    for (const [texto, clave] of [
      ['901559008', 'ct-2|2026-09|INQUILINO'],
      ['medellin', 'ct-2|2026-09|INQUILINO'],
      ['san antonio', 'ct-1|2026-09|INQUILINO'],
    ] as const) {
      await escribir('[data-testid="facturacion-inquilinos-buscar"]', texto);
      expect(q(`[data-testid="factura-${clave}"]`), texto).not.toBeNull();
    }
  });

  it('las cifras del mes NO se mueven con la búsqueda, y se dice cuántas se ven', async () => {
    porGenerarMock.mockResolvedValue(DOS());
    await montar();
    await escribir('[data-testid="facturacion-inquilinos-buscar"]', 'papas');
    const alcance = q('[data-testid="facturacion-inquilinos-alcance"]')!;
    expect(alcance.textContent).toContain('1 de 2 facturas');
    // La cabecera de la tarjeta sigue hablando del mes completo.
    expect(q('[data-testid="facturacion-inquilinos"]')!.textContent).toContain(
      '2 facturas',
    );
  });

  it('🔴 la casilla de la cabecera LIMPIA cuando hay algo marcado', async () => {
    // Antes «si están TODAS, quita»: estando en 726 de 730 apretarla subía a
    // 730, y para dejar una sola había que apretarla dos veces adivinando el
    // orden. Es media explicación de «selecciono sólo una y no da».
    porGenerarMock.mockResolvedValue(DOS());
    await montar();
    expect(q('[data-testid="facturacion-generar"]')?.textContent).toContain('3 facturas');

    /*
     * 🔴 EL CASO QUE DISCRIMINA: una desmarcada a mano — el estado real de
     * Nico, 726 de 730 —. Con la regla vieja («si están TODAS, quita») esto
     * SUBÍA a 3; con la nueva («si hay ALGUNA, quita») baja a 1, que es lo que
     * cualquiera espera de una casilla a medias. Sin este paso, el test pasaba
     * con las dos reglas y no probaba nada.
     */
    await clic(
      '[data-testid="factura-ct-1|2026-09|INQUILINO"] [role="checkbox"], ' +
        '[data-testid="factura-ct-1|2026-09|INQUILINO"] input[type="checkbox"]',
    );
    expect(q('[data-testid="facturacion-generar"]')?.textContent).toContain('2 facturas');
    await clic('[data-testid="facturacion-inquilinos-todas"]');
    // Se fueron las dos de inquilinos; queda la del propietario.
    expect(q('[data-testid="facturacion-generar"]')?.textContent).toContain('1 factura');
    // Y volver a apretarla las marca de nuevo.
    await clic('[data-testid="facturacion-inquilinos-todas"]');
    expect(q('[data-testid="facturacion-generar"]')?.textContent).toContain('3 facturas');
  });

  it('con búsqueda puesta, marcar toca SÓLO lo que se ve', async () => {
    porGenerarMock.mockResolvedValue(DOS());
    await montar();
    await clic('[data-testid="facturacion-inquilinos-todas"]'); // limpia las dos
    await escribir('[data-testid="facturacion-inquilinos-buscar"]', 'papas');
    await clic('[data-testid="facturacion-inquilinos-todas"]'); // marca la encontrada
    expect(q('[data-testid="facturacion-generar"]')?.textContent).toContain('2 facturas');
  });
});

describe('🔴 un botón apagado tiene que decir por qué, y al lado', () => {
  /*
   * Nico apretó «Generar», no pasó nada, y lo leyó como «no da el poder
   * generar factura». Estaba apagado con razón —la inmobiliaria no tiene
   * resolución de la DIAN para «Canon del inquilino»— pero el porqué vivía
   * en un banner arriba de todo, a media pantalla del botón.
   */
  const SIN_RESOLUCION = () =>
    respuesta({
      resolucion: resolucionVigente({
        puedeNumerar: false,
        motivo: 'SIN_RESOLUCION',
        explicacion:
          'La inmobiliaria no tiene ninguna resolución de facturación que numere «Canon del inquilino».',
        siguiente: null,
      }),
    });

  it('el motivo está AL LADO del botón, no sólo arriba de todo', async () => {
    porGenerarMock.mockResolvedValue(SIN_RESOLUCION());
    await montar();
    expect((q('[data-testid="facturacion-generar"]') as HTMLButtonElement).disabled).toBe(true);
    expect(q('[data-testid="facturacion-motivo-apagado"]')!.textContent).toContain(
      'no tiene ninguna resolución',
    );
  });

  it('y la salida LLEVA a la resolución, no sólo la nombra', async () => {
    porGenerarMock.mockResolvedValue(SIN_RESOLUCION());
    await montar();
    await clic('[data-testid="facturacion-ir-a-resolucion"]');
    expect(irAResolucion).toHaveBeenCalledTimes(1);
  });

  it('«Generar esta» también se apaga, y con el mismo motivo en el title', async () => {
    porGenerarMock.mockResolvedValue(SIN_RESOLUCION());
    await montar();
    const boton = q('[data-testid="generar-una-ct-1|2026-09|INQUILINO"]') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(boton.getAttribute('title')).toContain('no tiene ninguna resolución');
    // Y no manda nada al back aunque alguien lo dispare igual.
    await clic('[data-testid="generar-una-ct-1|2026-09|INQUILINO"]');
    expect(generarMock).not.toHaveBeenCalled();
  });

  it('con resolución vigente no hay motivo que mostrar', async () => {
    await montar();
    expect(q('[data-testid="facturacion-motivo-apagado"]')).toBeNull();
    expect((q('[data-testid="facturacion-generar"]') as HTMLButtonElement).disabled).toBe(false);
  });
});
