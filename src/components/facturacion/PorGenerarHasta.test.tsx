/**
 * «Ver por generar hasta <fecha>».
 *
 * Lo que se protege es el pedido del CEO (Juan Camilo López, 2026-09-13): «Si
 * quiero mirar qué facturas tengo por generar hasta el 31 de diciembre […]
 * muestra todas las posibles facturas hasta esa fecha; los contratos que
 * finalicen antes se van eliminando de la prefactura. Lo que NO se puede es
 * enviarlas todas en un solo mes.»
 *
 * Es decir: que se pida con LA fecha elegida, que la lista PLANA del back quede
 * agrupada por mes y separada en inquilinos y propietarios (eso lo hace el
 * front: el back manda `lado` fila por fila), que el aviso de «se generan por
 * mes» esté a la vista, que se diga que los contratos que terminan antes no
 * aparecen —sin inventar la lista de cuáles, que el back no manda—, que cambiar
 * la fecha vuelva a preguntar, y que el vacío y el fallo se digan en vez de
 * pintar una tabla en blanco.
 *
 * Sin testing-library en el repo: `createRoot` + `act`, como en
 * `NuevaFactura.test.tsx`.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type {
  PrefacturaDelMes,
  PrefacturasHasta,
} from '@/lib/types/estado-de-cuenta';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const prefacturasMock = vi.fn();

vi.mock('@/lib/api/estado-de-cuenta.service', async () => {
  const real = await vi.importActual<
    typeof import('@/lib/api/estado-de-cuenta.service')
  >('@/lib/api/estado-de-cuenta.service');
  return {
    ...real,
    estadoDeCuentaApi: {
      ...real.estadoDeCuentaApi,
      prefacturas: (...a: unknown[]) => prefacturasMock(...a),
    },
  };
});

import {
  PorGenerarHasta,
  agruparPorMes,
  finDeAnio,
  AVISO_SE_GENERAN_POR_MES,
  AVISO_CONTRATOS_QUE_TERMINAN,
} from './PorGenerarHasta';

function prefactura(over: Partial<PrefacturaDelMes> = {}): PrefacturaDelMes {
  return {
    cuotaId: 'cuota-1',
    contratoId: 'ct-1',
    contratoNumero: '1686',
    lado: 'INQUILINO',
    mes: '2026-10',
    desde: '2026-10-01',
    hasta: '2026-10-31',
    vencimiento: '2026-10-05',
    clienteNombre: 'Nubia Amparo David',
    clienteDocumento: '43123456',
    inmueble: 'Cra 76 #45-12 apto 302',
    baseCop: 1_800_000,
    ivaCop: 0,
    totalCop: 1_800_000,
    yaFacturada: false,
    ...over,
  };
}

/** Octubre con sus dos lados, noviembre sólo con inquilino. */
function respuesta(over: Partial<PrefacturasHasta> = {}): PrefacturasHasta {
  const prefacturas = over.prefacturas ?? [
    prefactura(),
    prefactura({
      cuotaId: 'cuota-2',
      lado: 'PROPIETARIO',
      clienteNombre: 'Jorge Restrepo',
      clienteDocumento: '71234567',
      baseCop: 180_000,
      totalCop: 180_000,
    }),
    prefactura({
      cuotaId: 'cuota-3',
      mes: '2026-11',
      desde: '2026-11-01',
      hasta: '2026-11-30',
      vencimiento: '2026-11-05',
    }),
  ];
  return {
    hasta: '2026-12-31',
    prefacturas,
    porMes: over.porMes ?? [
      { mes: '2026-10', cantidad: 2, totalCop: 1_980_000 },
      { mes: '2026-11', cantidad: 1, totalCop: 1_800_000 },
    ],
    totales: {
      cantidad: 3,
      baseCop: 3_780_000,
      ivaCop: 0,
      totalCop: 3_780_000,
    },
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
    root.render(<PorGenerarHasta />);
  });
}

const q = (s: string) => host.querySelector(s);
const qa = (s: string) => Array.from(host.querySelectorAll(s));

/** Abre el panel: la consulta es cara y sale cuando la persona la pide. */
async function verElListado() {
  await act(async () => {
    (q('[data-testid="prefacturas-ver"]') as HTMLButtonElement).click();
  });
}

/**
 * Cambiar la fecha del `<input type="date">`. React escucha `change` sobre el
 * value nativo, así que se escribe con el setter del prototipo.
 */
async function escribirFecha(valor: string) {
  const input = q('[data-testid="prefacturas-hasta"]') as HTMLInputElement;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(input, valor);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

beforeEach(() => {
  prefacturasMock.mockReset().mockResolvedValue(respuesta());
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

describe('PorGenerarHasta', () => {
  it('arranca en el 31 de diciembre del año en curso, que es la fecha que pidió el CEO', async () => {
    await montar();
    const input = q('[data-testid="prefacturas-hasta"]') as HTMLInputElement;
    expect(input.value).toBe(finDeAnio());
    expect(finDeAnio(new Date(2026, 5, 4))).toBe('2026-12-31');
  });

  it('🔴 muestra el aviso del CEO: se ven todas, pero se generan por mes', async () => {
    await montar();
    expect(host.textContent).toContain(AVISO_SE_GENERAN_POR_MES);
    expect(host.textContent).toContain(
      'Se muestran todas las facturas hasta esa fecha; se generan por mes.',
    );
  });

  it('🔴 dice que los contratos que terminan antes dejan de prefacturarse', async () => {
    await montar();
    expect(host.textContent).toContain(AVISO_CONTRATOS_QUE_TERMINAN);
    expect(host.textContent).toContain('dejan de prefacturarse');
  });

  it('pide el listado con LA fecha elegida', async () => {
    await montar();
    await verElListado();
    expect(prefacturasMock).toHaveBeenCalledTimes(1);
    expect(prefacturasMock.mock.calls[0][0]).toBe(finDeAnio());
  });

  it('🔴 agrupa la lista plana por mes y separa inquilinos de propietarios', async () => {
    await montar();
    await verElListado();

    const octubre = q('[data-testid="prefacturas-mes-2026-10"]')!;
    const noviembre = q('[data-testid="prefacturas-mes-2026-11"]')!;
    expect(octubre.textContent).toContain('octubre de 2026');
    expect(noviembre.textContent).toContain('noviembre de 2026');

    // Cada mes trae SUS dos lados, no una lista revuelta.
    expect(q('[data-testid="prefacturas-2026-10-inquilinos"]')!.textContent).toContain(
      'Nubia Amparo David',
    );
    expect(
      q('[data-testid="prefacturas-2026-10-propietarios"]')!.textContent,
    ).toContain('Jorge Restrepo');

    // Un lado vacío se dice en una línea, no con una tabla de encabezados sola.
    expect(
      q('[data-testid="prefacturas-2026-11-propietarios"]')!.textContent,
    ).toContain('Ninguna factura de propietarios este mes');
  });

  it('el encabezado del mes usa `porMes` del back, no la cuenta de las filas', async () => {
    await montar();
    await verElListado();
    // El back dice 2 y $1.980.000 para octubre: eso es lo que se muestra.
    const octubre = q('[data-testid="prefacturas-mes-2026-10"]')!;
    expect(octubre.textContent).toContain('2 facturas');
    expect(octubre.textContent).toContain('$ 1.980.000');
  });

  it('un mes que el back no nombró en `porMes` igual se muestra: no se pierden facturas', () => {
    const datos = respuesta({
      porMes: [{ mes: '2026-10', cantidad: 2, totalCop: 1_980_000 }],
    });
    const meses = agruparPorMes(datos);
    expect(meses.map((m) => m.mes)).toEqual(['2026-10', '2026-11']);
    expect(meses[1].inquilinos).toHaveLength(1);
  });

  it('los totales de arriba salen del back: cantidad, base, IVA y total', async () => {
    prefacturasMock.mockResolvedValue(
      respuesta({
        totales: {
          cantidad: 3,
          baseCop: 3_780_000,
          ivaCop: 718_200,
          totalCop: 4_498_200,
        },
      }),
    );
    await montar();
    await verElListado();
    expect(q('[data-testid="prefacturas-total-facturas"]')!.textContent).toBe('3');
    expect(q('[data-testid="prefacturas-total-base"]')!.textContent).toBe(
      '$ 3.780.000',
    );
    expect(q('[data-testid="prefacturas-total-iva"]')!.textContent).toBe('$ 718.200');
    expect(q('[data-testid="prefacturas-total-total"]')!.textContent).toBe(
      '$ 4.498.200',
    );
    // Cuántas de cada lado las cuenta la pantalla: el back manda `lado` por fila.
    expect(q('[data-testid="prefacturas-total-inquilinos"]')!.textContent).toBe('2');
    expect(q('[data-testid="prefacturas-total-propietarios"]')!.textContent).toBe('1');
  });

  it('la fila muestra contrato, cliente, inmueble, período, vencimiento y plata', async () => {
    await montar();
    await verElListado();
    const fila = q('[data-testid="prefactura-cuota-1"]')!;
    const texto = fila.textContent ?? '';
    expect(texto).toContain('1686');
    expect(texto).toContain('Nubia Amparo David');
    expect(texto).toContain('43123456');
    expect(texto).toContain('Cra 76 #45-12 apto 302');
    expect(texto).toContain('01/10/2026 → 31/10/2026');
    expect(texto).toContain('05/10/2026');
    expect(texto).toContain('$ 1.800.000');
  });

  it('lo ya facturado se ve y se marca — y no hay casillas: acá no se emite nada', async () => {
    prefacturasMock.mockResolvedValue(
      respuesta({ prefacturas: [prefactura({ yaFacturada: true })] }),
    );
    await montar();
    await verElListado();
    expect(q('[data-testid="prefactura-emitida-cuota-1"]')!.textContent).toContain(
      'Ya emitida',
    );
    expect(qa('[data-testid="prefacturas"] button[role="checkbox"]')).toHaveLength(0);
  });

  it('🔴 cambiar la fecha vuelve a pedir, con la fecha nueva', async () => {
    await montar();
    await verElListado();
    expect(prefacturasMock).toHaveBeenCalledTimes(1);

    await escribirFecha('2027-06-30');
    expect(prefacturasMock).toHaveBeenCalledTimes(2);
    expect(prefacturasMock.mock.calls[1][0]).toBe('2027-06-30');
  });

  it('tocar la fecha con el panel cerrado lo abre y consulta: el selector ES el pedido', async () => {
    await montar();
    expect(prefacturasMock).not.toHaveBeenCalled();
    await escribirFecha('2027-03-31');
    expect(prefacturasMock).toHaveBeenCalledTimes(1);
    expect(prefacturasMock.mock.calls[0][0]).toBe('2027-03-31');
    expect(q('[data-testid="prefacturas-totales"]')).not.toBeNull();
  });

  it('cerrar y volver a abrir con la MISMA fecha no repite la consulta cara', async () => {
    await montar();
    await verElListado();
    await verElListado(); // cerrar
    await verElListado(); // abrir de nuevo
    expect(prefacturasMock).toHaveBeenCalledTimes(1);
  });

  it('un tope sin facturas muestra el vacío, no una tabla en blanco', async () => {
    prefacturasMock.mockResolvedValue(
      respuesta({
        prefacturas: [],
        porMes: [],
        totales: { cantidad: 0, baseCop: 0, ivaCop: 0, totalCop: 0 },
      }),
    );
    await montar();
    await verElListado();
    expect(q('[data-testid="sin-datos"]')).not.toBeNull();
    expect(q('[data-testid="prefacturas-totales"]')).toBeNull();
  });

  it('un fallo se dice y deja reintentar — no se pinta una lista vacía', async () => {
    prefacturasMock.mockRejectedValue(new Error('El back no respondió.'));
    await montar();
    await verElListado();
    expect(q('[data-testid="prefacturas-totales"]')).toBeNull();
    expect(host.textContent).toContain('El back no respondió.');

    // El cartel es `FalloDeCarga`: su botón dice «Intentar de nuevo» y sólo
    // aparece cuando volver a pedirlo puede dar otro resultado.
    const reintentar = q('[data-testid="reintentar"]') as HTMLButtonElement | null;
    expect(reintentar).not.toBeNull();
    expect(reintentar!.textContent).toContain('Intentar de nuevo');

    prefacturasMock.mockResolvedValue(respuesta());
    await act(async () => {
      reintentar!.click();
    });
    expect(prefacturasMock).toHaveBeenCalledTimes(2);
    expect(q('[data-testid="prefacturas-totales"]')).not.toBeNull();
  });

  it('el listado no se pide solo al montar: la consulta sale cuando la persona la pide', async () => {
    await montar();
    expect(prefacturasMock).not.toHaveBeenCalled();
  });
});
