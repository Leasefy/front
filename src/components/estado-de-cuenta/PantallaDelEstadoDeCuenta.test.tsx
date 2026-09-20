/**
 * La pantalla: carga, filtros y el vacío que NO miente.
 *
 * El caso que más importa acá es el último: filtrar hasta dejar cero filas no
 * es «este cliente no tiene contratos». Decirlo así sería afirmar algo falso
 * sobre una persona, y encima deja sin salida a quien puso el filtro.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// El `Select` del panel monta su lista en un portal de Radix que happy-dom no
// abre con un clic: se reemplaza por botones planos con `data-opcion`, igual
// que en la prueba de la lista de contratos.
vi.mock('@/components/ui/select', async () => {
  const R = await import('react');
  const Ctx = R.createContext<(v: string) => void>(() => {});
  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (v: string) => void;
      children?: React.ReactNode;
    }) =>
      R.createElement(
        Ctx.Provider,
        { value: onValueChange },
        R.createElement('div', { 'data-select': value }, children),
      ),
    SelectTrigger: ({
      children,
      className,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) => {
      void className;
      return R.createElement('button', { type: 'button', ...props }, children);
    },
    SelectContent: ({ children }: { children?: React.ReactNode }) =>
      R.createElement('div', null, children),
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => {
      const elegir = R.useContext(Ctx);
      return R.createElement(
        'button',
        { type: 'button', 'data-opcion': value, onClick: () => elegir(value) },
        children,
      );
    },
  };
});

import { PantallaDelEstadoDeCuenta } from './PantallaDelEstadoDeCuenta';
import { cuantasFilas } from './filas';
import { contrato, estadoDeCuenta } from './ejemplo-de-prueba';
import type {
  EstadoDeCuenta,
  FiltrosDelEstadoDeCuenta,
} from '@/lib/types/estado-de-cuenta';

const HOY = '2026-09-13';

/**
 * 🔴 El BACK falso.
 *
 * Desde E4 el recorte no lo hace esta pantalla: lo hace el back, que es el
 * único punto por el que pasan tanto el panel como quien abre un enlace
 * compartido. Acá se imita lo justo para probar la pantalla —que manda el
 * filtro, que pinta lo que vuelve y que el «N de M» sigue contando contra el
 * documento entero—. La REGLA está probada donde vive:
 * `back-erp/.../filtrar-el-estado-de-cuenta.spec.ts`.
 */
function backFalso(doc: EstadoDeCuenta) {
  return vi.fn(async (f?: FiltrosDelEstadoDeCuenta | null) => {
    if (!f || (!f.soloPendientes && !f.desde && !f.hasta && !f.contrato)) return doc;
    const pasa = (x: { estado: string; fechaVencimiento: string }) => {
      if (f.soloPendientes && x.estado !== 'PENDIENTE') return false;
      const vence = x.fechaVencimiento.slice(0, 10);
      if (f.desde && vence < f.desde) return false;
      if (f.hasta && vence > f.hasta) return false;
      return true;
    };
    const contratos = doc.contratos
      .filter((c) => (f.contrato ? c.numero === f.contrato : true))
      .map((c) => {
        const arriendos = c.secciones.arriendos.filter(pasa);
        const otrosConceptos = c.secciones.otrosConceptos.filter(pasa);
        // Los totales del contrato salen de las filas que QUEDAN.
        const filas = [...arriendos, ...otrosConceptos];
        const suma = (p: (x: (typeof filas)[number]) => boolean) =>
          filas.filter(p).reduce((n, x) => n + (x.valorNeto ?? 0), 0);
        const cancelado = suma((x) => x.estado === 'CANCELADA');
        const pendiente = suma((x) => x.estado === 'PENDIENTE');
        return {
          ...c,
          secciones: { arriendos, otrosConceptos },
          totales: { cancelado, pendiente, restaPorPagar: pendiente },
        };
      })
      .filter(
        (c) => c.secciones.arriendos.length + c.secciones.otrosConceptos.length > 0,
      );
    /*
     * 🔴 El recorte también mueve los TOTALES, y el falso tiene que decirlo.
     *
     * Hasta el 19-09 devolvía `{ ...doc, contratos }`, o sea las filas
     * recortadas con los totales del documento entero. Un back falso que
     * miente así deja ciego al archivo entero: ninguna prueba de acá podía
     * fallar por un total mal calculado, porque el total nunca cambiaba. Es
     * justo lo que hizo que el primer intento de «el resumen no se mueve con
     * el filtro» pasara con el arreglo Y sin él.
     */
    const sumar = (cs: typeof contratos, campo: 'cancelado' | 'pendiente' | 'restaPorPagar') =>
      cs.reduce((n, c) => n + (c.totales?.[campo] ?? 0), 0);
    return {
      ...doc,
      contratos,
      totales: {
        cancelado: sumar(contratos, 'cancelado'),
        pendiente: sumar(contratos, 'pendiente'),
        restaPorPagar: sumar(contratos, 'restaPorPagar'),
      },
      filtro: f,
    };
  });
}

/**
 * Cambiar un filtro ya no recorta en el acto: se le PIDE al back, tras una
 * espera corta que junta dos toques seguidos en un solo viaje.
 */
async function esperarAlBack() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 320));
  });
}

let host: HTMLDivElement;
let root: Root;

async function montar(nodo: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(nodo);
  });
}

function clic(el: Element | null) {
  if (!el) throw new Error('no encontré el control');
  act(() => {
    (el as HTMLElement).click();
  });
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
});

describe('PantallaDelEstadoDeCuenta', () => {
  it('pide el documento y lo pinta', async () => {
    const cargar = vi.fn().mockResolvedValue(estadoDeCuenta());
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);
    expect(cargar).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[data-testid="estado-de-cuenta"]')).not.toBeNull();
    expect(host.textContent).toContain('J Y C PAPAS S.A.S');
  });

  it('si el back falla, ofrece reintentar en vez de un documento en blanco', async () => {
    const cargar = vi.fn().mockRejectedValue(new Error('caído'));
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);
    expect(host.querySelector('[data-testid="estado-de-cuenta"]')).toBeNull();
    expect(host.textContent?.length).toBeGreaterThan(0);
  });

  /**
   * E6 — «todavía no tiene contratos» no puede leerse como «no existe».
   *
   * El back responde 404 (al inquilino lo identifican sus contratos, no una
   * ficha propia) pero manda `code: SIN_CONTRATOS`. Es un vacío, no un fallo.
   */
  it('🔴 con SIN_CONTRATOS pinta el vacío, no «no existe» ni «Reintentar»', async () => {
    const error = Object.assign(new Error('Ese inquilino todavía no tiene contratos'), {
      status: 404,
      code: 'SIN_CONTRATOS',
    });
    const cargar = vi.fn().mockRejectedValue(error);
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);

    expect(host.querySelector('[data-testid="estado-sin-contratos-pantalla"]')).not.toBeNull();
    expect(host.textContent).toContain('no tiene contratos');
    expect(host.textContent).not.toContain('Reintentar');
    expect(host.textContent).not.toContain('no existe');
  });

  it('un 404 SIN código sigue siendo un fallo con reintento: no se traga cualquier 404', async () => {
    const error = Object.assign(new Error('No encontrado'), { status: 404 });
    const cargar = vi.fn().mockRejectedValue(error);
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);

    expect(host.querySelector('[data-testid="estado-sin-contratos-pantalla"]')).toBeNull();
  });

  it('«sólo lo pendiente» se le PIDE al back y se pinta lo que devuelve', async () => {
    const cargar = backFalso(estadoDeCuenta({ contratos: [contrato()] }));
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);

    expect(host.textContent).toContain('Cancelada');
    clic(host.querySelector('[data-testid="filtro-pendientes"]'));
    await esperarAlBack();

    // El filtro VIAJÓ: es lo que después queda guardado con el enlace.
    expect(cargar).toHaveBeenCalledTimes(2);
    expect(cargar.mock.calls[1]![0]).toMatchObject({ soloPendientes: true });
    expect(host.textContent).not.toContain('Cancelada');
    // Y la nota sale de lo que el BACK dice que recortó, no de los controles.
    expect(host.textContent).toContain('Los totales son de lo que estás viendo');
  });

  it('filtrar hasta cero filas NO dice «este cliente no tiene contratos»', async () => {
    const cargar = backFalso(estadoDeCuenta());
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);

    // El par desde/hasta aparece al elegir «Fechas exactas…» en el desplegable
    // del período: hasta entonces no está en pantalla.
    expect(host.querySelector('[data-testid="filtro-desde"]')).toBeNull();
    clic(host.querySelector('[data-testid="filtro-periodo"] ~ div [data-opcion="fechas"]'));
    const desde = host.querySelector<HTMLInputElement>('[data-testid="filtro-desde"]');
    expect(desde).not.toBeNull();
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(desde, '2030-01-01');
      desde?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await esperarAlBack();

    expect(host.querySelector('[data-testid="estado-sin-resultados"]')).not.toBeNull();
    expect(host.textContent).not.toContain('Este cliente no tiene contratos');
    // Y ofrece la salida: quitar los filtros.
    expect(host.textContent).toContain('Limpiar');
  });

  it('los atajos del período filtran por mes calendario y el conteo dice «N de M filas»', async () => {
    const cargar = backFalso(estadoDeCuenta({ contratos: [contrato()] }));
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);
    // `tbody tr` cuenta también la línea del punto de quiebre: el total de
    // FILAS es el del contrato.
    const total = host.querySelectorAll('tbody tr').length;
    const filas = cuantasFilas(contrato());
    const conteo = () => host.querySelector('[data-testid="filtro-conteo"]')?.textContent;
    // El conteo está siempre, como en las demás tablas: sin filtro dice M de M.
    expect(conteo()).toBe(`${filas} de ${filas} filas`);

    clic(host.querySelector('[data-testid="filtro-periodo"] ~ div [data-opcion="esteMes"]'));
    await esperarAlBack();

    // Un atajo NO abre desde/hasta: el desplegable dice el atajo y basta.
    expect(host.querySelector('[data-testid="filtro-desde"]')).toBeNull();
    expect(host.querySelector('[data-testid="filtro-periodo"]')?.textContent).toBe('Este mes');
    expect(conteo()).toMatch(/^\d+ de \d+ filas$/);
    expect(host.querySelectorAll('tbody tr').length).toBeLessThan(total);

    clic(host.querySelector('[data-testid="filtro-limpiar"]'));
    await esperarAlBack();
    expect(host.querySelector('[data-testid="filtro-limpiar"]')).toBeNull();
    expect(host.querySelector('[data-testid="filtro-periodo"]')?.textContent).toBe('Todo el período');
    expect(host.querySelectorAll('tbody tr').length).toBe(total);
  });

  it('el enlace de regreso dice A DÓNDE vuelve, leído de la ruta', async () => {
    const cargar = vi.fn().mockResolvedValue(estadoDeCuenta());
    await montar(
      <PantallaDelEstadoDeCuenta
        cargar={cargar}
        hoy={HOY}
        volverA={{ href: '/panel/inmobiliaria/contratos/abc-123' }}
      />,
    );
    // El doble de `next/link` de arriba sólo conserva `href` y los hijos.
    const volver = host.querySelector('a[href="/panel/inmobiliaria/contratos/abc-123"]');
    expect(volver).not.toBeNull();
    expect(volver?.textContent).toContain('Volver al contrato');
    // Y el título dice qué pantalla es, con el cliente en una línea.
    expect(host.querySelector('h1')?.textContent).toBe('Estado de cuenta');
    expect(host.querySelector('[data-testid="estado-subtitulo"]')?.textContent).toContain(
      'J Y C PAPAS S.A.S',
    );
  });

  it('el enlace público no lleva filtros: el cliente recibe su cuenta completa', async () => {
    const cargar = vi.fn().mockResolvedValue(estadoDeCuenta());
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} sinFiltros />);
    expect(host.querySelector('[data-testid="estado-filtros"]')).toBeNull();
  });

  it('las acciones reciben el documento RECORTADO y el filtro, que es lo que se comparte', async () => {
    const cargar = backFalso(estadoDeCuenta());
    const acciones = vi.fn().mockReturnValue(<span data-testid="acciones" />);
    await montar(
      <PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} acciones={acciones} />,
    );
    expect(host.querySelector('[data-testid="acciones"]')).not.toBeNull();
    expect(acciones.mock.calls[0]![0].contratos).toHaveLength(2);
    expect(acciones.mock.calls[0]![1]).toBeUndefined();

    clic(host.querySelector('[data-testid="filtro-pendientes"]'));
    await esperarAlBack();
    const ultima = acciones.mock.calls[acciones.mock.calls.length - 1]!;
    expect(ultima[1]).toContain('Los totales son de lo que estás viendo');
    // 🔴 El filtro también baja: es lo que viaja con el enlace para que el
    // cliente vea la MISMA vista, y no el documento entero.
    expect(ultima[2]).toMatchObject({ soloPendientes: true });
  });

  it('«Imprimir» apaga la paginación antes de abrir el diálogo', async () => {
    const cargar = vi.fn().mockResolvedValue(estadoDeCuenta());
    const print = vi.fn();
    vi.stubGlobal('print', print);
    const cuadros: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cuadros.push(cb);
      return cuadros.length;
    });

    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);
    clic(host.querySelector('[data-testid="imprimir-estado"]'));

    // Dos cuadros: pintar las filas escondidas, medirlas, y recién ahí imprimir.
    expect(print).not.toHaveBeenCalled();
    act(() => cuadros[0]!(0));
    expect(print).not.toHaveBeenCalled();
    act(() => cuadros[1]!(0));
    expect(print).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});

/**
 * 🔴 19-09-2026 · «¿Por qué no bajaste esto y lo pegaste a la tabla?» (Nico).
 *
 * La barra de filtros vivía arriba de la tarjeta, y entre ella y las filas que
 * filtra pasaban el membrete de la inmobiliaria, el nombre del cliente, el
 * resumen, la ficha del contrato y la barra de amortización: unos 700 px. Un
 * control a esa distancia de lo que controla no se lee como su control.
 *
 * Bajarla sola habría creado un defecto PEOR: el resumen se calculaba del
 * documento FILTRADO, así que al elegir «este mes» el rótulo «RESTA POR PAGAR»
 * pasaba del total del cliente a la cuota del mes — y con la barra abajo, ese
 * número habría cambiado ARRIBA del control que lo cambia. Por eso el resumen
 * pasa a leer el documento entero: «resta por pagar», «próxima cuota» y «al
 * día» son hechos del CLIENTE; el recorte lo dice la barra, con su «N de M».
 */
describe('la barra de filtros vive pegada a las tablas', () => {
  it('🔴 está DENTRO del documento, después del resumen y antes de los contratos', async () => {
    const cargar = backFalso(estadoDeCuenta({ contratos: [contrato()] }));
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);

    const hoja = host.querySelector('[data-testid="estado-de-cuenta"]')!;
    const barra = host.querySelector('[data-testid="estado-filtros"]')!;
    expect(hoja.contains(barra)).toBe(true);

    // Orden en el DOM: resumen → barra → primera tabla.
    const resumen = host.querySelector('[data-testid="resta-por-pagar"]')!;
    const primeraTabla = host.querySelector('table')!;
    const antes = (a: Node, b: Node) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(antes(resumen, barra)).toBe(true);
    expect(antes(barra, primeraTabla)).toBe(true);
  });

  it('🔴 filtrar NO mueve «resta por pagar»: es del cliente, no del recorte', async () => {
    const cargar = backFalso(estadoDeCuenta({ contratos: [contrato()] }));
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);

    const resta = () => host.querySelector('[data-testid="resta-por-pagar"]')?.textContent;
    const antes = resta();
    const filasAntes = host.querySelectorAll('tbody tr').length;

    clic(host.querySelector('[data-testid="filtro-periodo"] ~ div [data-opcion="esteMes"]'));
    await esperarAlBack();

    // La tabla SÍ se recorta…
    expect(host.querySelectorAll('tbody tr').length).toBeLessThan(filasAntes);
    // …y el número de arriba NO se mueve.
    expect(resta()).toBe(antes);
    // El recorte se dice donde corresponde: en la barra.
    expect(host.querySelector('[data-testid="filtro-conteo"]')?.textContent).toMatch(
      /^\d+ de \d+ filas$/,
    );
  });

  it('la barra sigue sin salir en papel', async () => {
    // `data-estado-barra` es lo que la esconde al imprimir: mudarla de lugar
    // no puede meterla en el PDF que recibe el cliente.
    const cargar = backFalso(estadoDeCuenta({ contratos: [contrato()] }));
    await montar(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} />);
    expect(host.querySelector('[data-testid="estado-filtros"]')?.hasAttribute('data-estado-barra')).toBe(
      true,
    );
  });
});
