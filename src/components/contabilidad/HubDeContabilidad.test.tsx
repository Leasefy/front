/**
 * La portada de Contabilidad con el API mockeado.
 *
 * Auditoría de casos de error 13-09:
 *   · CT1 — una consulta que falla lo dice en SU tarjeta («No cargó: …») con
 *     un «Reintentar» que vuelve a pedir sólo esa; y si cae una revisión que
 *     alimenta las alertas, la portada no se queda callada como si todo
 *     estuviera en orden.
 *   · CT2 — «Reprocesar» no escribe en el libro sin decir antes cuántos
 *     movimientos y de qué tipo va a asentar.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, gastos, exogena, toastMock } = vi.hoisted(() => ({
  api: {
    puc: { listar: vi.fn() },
    asientos: {
      listar: vi.fn(),
      cierre: vi.fn(),
      faltantes: vi.fn(),
      reprocesar: vi.fn(),
    },
    reportes: { balanceDePrueba: vi.fn() },
    mapeo: { rubros: vi.fn() },
  },
  /*
   * Las dos piezas del 18-09 que la portada consulta. Van mockeadas aunque el
   * test que las usa sea uno: sin esto, `gastosApi` y `exogenaApi` reales pegan
   * al `apiClient` y las OTRAS ocho pruebas de este archivo se caen por una
   * petición que no tiene nada que ver con lo que están probando.
   */
  gastos: { facturas: { listar: vi.fn() }, lotes: { listar: vi.fn() } },
  exogena: { resumen: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/lib/api/contabilidad.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/contabilidad.service')>()),
  contabilidadApi: api,
}));
vi.mock('@/lib/api/gastos.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/gastos.service')>()),
  gastosApi: gastos,
}));
vi.mock('@/lib/api/exogena.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/exogena.service')>()),
  exogenaApi: exogena,
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$ ${n}` }),
}));
vi.mock('./Monto', () => ({
  Monto: ({ valor }: { valor: number }) => <span>{valor}</span>,
}));
// El rango sale con su marca, para poder afirmar DÓNDE vive (en el cajón, no
// en la portada) sin montar los dos `<input type="date">` de verdad.
vi.mock('./RangoDeFechas', () => ({
  RangoDeFechas: () => <div data-testid="rango-de-fechas" />,
}));
vi.mock('./asientos/CierreDePeriodo', () => ({
  CierreDePeriodo: ({ fallo }: { fallo?: boolean }) => (
    <div data-testid="cierre" data-fallo={String(Boolean(fallo))} />
  ),
}));

import { HubDeContabilidad } from './HubDeContabilidad';

const SIN_FALTANTES = {
  recibos: 0,
  lotes: 0,
  cobros: 0,
  total: 0,
  mapeoCompleto: true,
  eventosSinCuenta: [],
};

let host: HTMLDivElement;
let root: Root;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<HubDeContabilidad />);
  });
  await esperar();
  await esperar();
}

const $ = (s: string) => document.querySelector<HTMLElement>(s);

async function clic(el: HTMLElement | null) {
  if (!el) throw new Error('no hay elemento para hacer clic');
  await act(async () => {
    el.click();
  });
  await esperar();
  await esperar();
}

beforeEach(() => {
  api.puc.listar.mockReset().mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }]);
  api.asientos.listar.mockReset().mockResolvedValue({ asientos: [], total: 0 });
  api.asientos.cierre.mockReset().mockResolvedValue({ cerradaHasta: null });
  api.asientos.faltantes.mockReset().mockResolvedValue(SIN_FALTANTES);
  api.asientos.reprocesar.mockReset();
  api.reportes.balanceDePrueba.mockReset().mockResolvedValue({ cuadra: true, diferenciaCop: 0 });
  // Las cuatro del 18-09, en «nada que reportar»: cada prueba las pisa si le
  // interesan. `disponible: false` = la pieza todavía no existe ⇒ sin alerta.
  api.mapeo.rubros
    .mockReset()
    .mockResolvedValue({ disponible: true, motivo: null, completo: true, faltantes: [], rubros: [] });
  gastos.facturas.listar.mockReset().mockResolvedValue({
    disponible: true,
    motivo: null,
    total: 0,
    limite: 1,
    desplazamiento: 0,
    totales: { subtotalCop: 0, ivaCop: 0, retencionesCop: 0, totalCop: 0, netoCop: 0 },
    facturas: [],
  });
  gastos.lotes.listar
    .mockReset()
    .mockResolvedValue({ disponible: true, motivo: null, total: 0, lotes: [] });
  exogena.resumen.mockReset().mockResolvedValue({
    anio: new Date().getFullYear() - 1,
    formatos: [],
    disponible: true,
    cuantiasMenores: { activa: false, topeCop: 0, nit: '222222222', filas: 0 },
  });
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  toastMock.warning.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

describe('HubDeContabilidad — CT1: cada tarjeta dice si no cargó', () => {
  it('🔴 la cifra que falló dice «No cargó» con su motivo; las demás cargan igual', async () => {
    api.puc.listar.mockRejectedValue(new ApiError(500, 'boom'));
    await montar();

    const linea = $('[data-testid="no-cargo-cuentas"]');
    expect(linea).not.toBeNull();
    expect(linea!.textContent).toContain('No cargó');
    expect(linea!.textContent).toContain('servidor');
    // Las otras dos cifras llegaron: no hay línea de fallo para ellas.
    expect($('[data-testid="no-cargo-delMes"]')).toBeNull();
    expect($('[data-testid="no-cargo-libro"]')).toBeNull();
  });

  it('🔴 «Reintentar» vuelve a pedir SÓLO esa consulta y, si responde, muestra el número', async () => {
    api.puc.listar.mockRejectedValueOnce(new ApiError(500, 'boom'));
    await montar();
    const listadosAntes = api.asientos.listar.mock.calls.length;

    await clic($('[data-testid="reintentar-cuentas"]'));

    expect(api.puc.listar).toHaveBeenCalledTimes(2);
    expect(api.asientos.listar.mock.calls.length).toBe(listadosAntes);
    expect($('[data-testid="no-cargo-cuentas"]')).toBeNull();
    expect(host.querySelector('[aria-label="Resumen del libro"]')!.textContent).toContain('2');
  });

  it('sobre un 403 no ofrece reintentar: da lo mismo', async () => {
    api.puc.listar.mockRejectedValue(new ApiError(403, 'Forbidden'));
    await montar();
    expect($('[data-testid="no-cargo-cuentas"]')!.textContent).toContain('tu rol');
    expect($('[data-testid="reintentar-cuentas"]')).toBeNull();
  });

  it('🔴 si cae una revisión de las alertas, lo dice: «ninguna alerta» no es «todo en orden»', async () => {
    api.asientos.faltantes.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    await montar();

    const bloque = $('[data-testid="revisiones-caidas"]');
    expect(bloque).not.toBeNull();
    expect(bloque!.textContent).toContain('no quiere decir que esté todo en orden');
    expect(bloque!.textContent).toContain('Si hay movimientos sin asiento');
    expect(bloque!.querySelector('[data-testid="reintentar-faltantes"]')).not.toBeNull();
  });

  it('el libro que no cargó lo dice en «Últimos asientos», con reintento', async () => {
    api.asientos.listar.mockImplementation(async (f: { limite?: number; desde?: string }) => {
      if (f.limite === 5) throw new ApiError(503, 'no');
      return { asientos: [], total: 0 };
    });
    await montar();
    // Aparece en la cifra «Asientos en el libro» y en la tarjeta de últimos.
    expect(document.querySelectorAll('[data-testid="no-cargo-libro"]').length).toBe(2);
  });

  it('el cierre que no cargó lo marca y ofrece reintentar', async () => {
    api.asientos.cierre.mockRejectedValue(new ApiError(500, 'boom'));
    await montar();
    expect($('[data-testid="cierre"]')!.getAttribute('data-fallo')).toBe('true');
    expect($('[data-testid="reintentar-cierre"]')).not.toBeNull();
  });
});

describe('HubDeContabilidad — CT2: reprocesar pide confirmación', () => {
  beforeEach(() => {
    api.asientos.faltantes.mockResolvedValue({
      ...SIN_FALTANTES,
      cobros: 2,
      recibos: 1,
      total: 3,
    });
  });

  it('🔴 el botón de la alerta NO escribe: abre un diálogo que dice cuántos y de qué tipo', async () => {
    await montar();
    await clic($('[data-testid="reprocesar-asientos"]'));

    expect(api.asientos.reprocesar).not.toHaveBeenCalled();
    const detalle = $('[data-testid="confirmar-reproceso-detalle"]')!;
    expect(document.body.textContent).toContain('¿Asentar 3 movimientos sin asiento?');
    expect(detalle.textContent).toContain('2 cobros y 1 recibo de caja');
    // Lo que el back hace de verdad: no reemplaza asientos existentes.
    expect(detalle.textContent).toContain('los asientos que ya existen no se tocan');
  });

  it('confirmar reprocesa una vez, avisa y vuelve a leer la portada', async () => {
    api.asientos.reprocesar.mockResolvedValue({ asentados: 3, sinResolver: 0, motivos: [] });
    await montar();
    const pedidosAntes = api.puc.listar.mock.calls.length;

    await clic($('[data-testid="reprocesar-asientos"]'));
    await clic($('[data-testid="confirmar-reproceso"]'));

    expect(api.asientos.reprocesar).toHaveBeenCalledTimes(1);
    expect(toastMock.success).toHaveBeenCalledWith('3 asientos generados.');
    expect(api.puc.listar.mock.calls.length).toBe(pedidosAntes + 1);
    expect($('[data-testid="confirmar-reproceso-dialogo"]')).toBeNull();
  });

  it('si reprocesar falla, lo dice y el diálogo sigue abierto', async () => {
    api.asientos.reprocesar.mockRejectedValue(new ApiError(500, 'El servidor no pudo.'));
    await montar();
    await clic($('[data-testid="reprocesar-asientos"]'));
    await clic($('[data-testid="confirmar-reproceso"]'));

    expect(toastMock.error).toHaveBeenCalledTimes(1);
    expect(toastMock.success).not.toHaveBeenCalled();
    expect($('[data-testid="confirmar-reproceso-dialogo"]')).not.toBeNull();
  });
});

/**
 * Las cuatro alertas y los cuatro destinos del 18-09 (§8).
 *
 * 🔴 La regla que este bloque protege: una pieza que todavía NO EXISTE
 * (`disponible: false`) no genera alerta **y tampoco entra a «No pude revisar
 * todo el libro»**. No hay nada que revisar, y un renglón rojo por una migración
 * que falta entrena a ignorar los renglones rojos — que es exactamente lo que
 * CT1 quería evitar. Un FALLO real (500, red caída) sí entra: ahí «no hay
 * alertas» deja de significar «está todo en orden».
 */
describe('HubDeContabilidad — la contabilidad completa del 18-09', () => {
  it('ofrece los cuatro destinos nuevos', async () => {
    await montar();
    const enlaces = [...document.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(enlaces).toContain('/panel/inmobiliaria/contabilidad/estados-financieros');
    expect(enlaces).toContain('/panel/inmobiliaria/contabilidad/gastos');
    expect(enlaces).toContain('/panel/inmobiliaria/contabilidad/egresos');
    expect(enlaces).toContain('/panel/inmobiliaria/contabilidad/exogena');
  });

  it('«Para el contador» nombra los informes nuevos', async () => {
    await montar();
    expect($('[data-testid="ir-al-pyg"]')).not.toBeNull();
    expect($('[data-testid="ir-al-balance-general"]')).not.toBeNull();
    expect($('[data-testid="ir-al-mayor"]')).not.toBeNull();
    expect($('[data-testid="ir-a-terceros"]')).not.toBeNull();
  });

  /**
   * 🔴 20-09 · EL DEFECTO QUE SÓLO SE VIO ABRIENDO LA PORTADA.
   *
   * La página tenía DOS navegaciones: los renglones de «Para el contador» y la
   * grilla de tarjetas de abajo. Y se pisaban a medias: «Deterioro de cartera»,
   * «Certificados de retención» y «Exógena» estaban en las dos, con el mismo
   * nombre y el mismo destino, mientras «Presupuesto» estaba sólo en la lista y
   * no tenía tarjeta. Dos listas con solape parcial son peores que una lista
   * larga: nadie sabe cuál manda, y quien no encuentra algo en una no sabe si
   * mirar la otra.
   *
   * La separación es por NATURALEZA del destino, no por gusto:
   *   · «Para el contador» = INFORMES (una pestaña dentro de una pantalla),
   *   · la grilla = PANTALLAS.
   * Esta prueba es lo que impide que vuelvan a mezclarse, y de paso obliga a
   * que una pantalla nueva de contabilidad entre a la grilla.
   */
  it('ningún destino aparece dos veces en la portada', async () => {
    await montar();
    // ⚠️ Dos trampas acá, las dos pagadas.
    //
    // 1) Escrito como `document.querySelectorAll('main a…')` pasa SIEMPRE: el
    //    test monta el componente suelto, no la página, así que no hay ningún
    //    `<main>` y el guardián mide cero enlaces. Va contra `host`.
    // 2) Comparar TODOS los enlaces de la portada es demasiado ancho y marca
    //    un falso: «Ver el libro», el «ver más» de la lista de últimos
    //    asientos, apunta a `/asientos`, igual que su tarjeta. Eso no es
    //    navegación duplicada, es el remate de un resumen.
    //
    // Lo que se prohíbe es que un mismo destino esté en las DOS listas de
    // navegación: los informes y la grilla de pantallas.
    const hrefs = (sel: string) =>
      [...host.querySelectorAll<HTMLAnchorElement>(`${sel} a`)].map(
        (a) => a.getAttribute('href') ?? '',
      );
    const informes = hrefs('[data-testid="informes-del-contador"]');
    const pantallas = new Set(hrefs('nav[aria-label="Secciones de contabilidad"]'));

    expect(informes.length).toBeGreaterThan(0);
    expect(pantallas.size).toBeGreaterThan(0);
    expect(informes.filter((h) => pantallas.has(h))).toEqual([]);
  });

  it('las once pantallas de contabilidad tienen su tarjeta en la grilla', async () => {
    await montar();
    const enGrilla = new Set(
      [...host.querySelectorAll('nav[aria-label="Secciones de contabilidad"] a')].map((a) =>
        a.getAttribute('href'),
      ),
    );
    for (const ruta of [
      'puc',
      'asientos',
      'reportes',
      'mapeo',
      'deterioro',
      'certificados',
      'estados-financieros',
      'gastos',
      'egresos',
      'exogena',
      'presupuesto',
      'copropiedades',
    ]) {
      expect(enGrilla).toContain(`/panel/inmobiliaria/contabilidad/${ruta}`);
    }
  });

  it('con todo en orden no aparece ninguna de las cuatro alertas', async () => {
    await montar();
    expect($('[data-testid="alerta-rubros-incompletos"]')).toBeNull();
    expect($('[data-testid="alerta-facturas-sin-causar"]')).toBeNull();
    expect($('[data-testid="alerta-lotes-por-aprobar"]')).toBeNull();
    expect($('[data-testid="alerta-exogena-sin-visto-bueno"]')).toBeNull();
  });

  it('el mapeo de rubros incompleto alerta con los NOMBRES de los rubros', async () => {
    api.mapeo.rubros.mockResolvedValue({
      disponible: true,
      motivo: null,
      completo: false,
      faltantes: ['nomina'],
      rubros: [
        {
          rubro: 'nomina',
          nombre: 'Nómina',
          naturaleza: 'COSTO',
          fuenteDelReal: 'CUENTAS_DEL_PUC',
          motivoSinReal: null,
          sugerido: true,
          cuentas: [],
          propuestas: [],
          codigosPropuestos: ['5105'],
        },
      ],
    });

    await montar();

    const alerta = $('[data-testid="alerta-rubros-incompletos"]')!.textContent!;
    expect(alerta).toContain('Nómina');
    expect(alerta).toContain('«—»');
  });

  it('las facturas sin causar alertan con su plata', async () => {
    gastos.facturas.listar.mockResolvedValue({
      disponible: true,
      motivo: null,
      total: 3,
      limite: 1,
      desplazamiento: 0,
      totales: {
        subtotalCop: 0,
        ivaCop: 0,
        retencionesCop: 0,
        totalCop: 1_200_000,
        netoCop: 0,
      },
      facturas: [],
    });

    await montar();

    const alerta = $('[data-testid="alerta-facturas-sin-causar"]')!.textContent!;
    expect(alerta).toContain('3 facturas de proveedor sin causar');
    expect(alerta).toContain('no está en el libro');
  });

  it('🔴 los lotes por aprobar dicen que los aprueba OTRA persona', async () => {
    gastos.lotes.listar.mockResolvedValue({
      disponible: true,
      motivo: null,
      total: 2,
      lotes: [
        { id: 'l1', estado: 'BORRADOR', totalCop: 12_480_000, cantidad: 9, egresos: [] },
        { id: 'l2', estado: 'PAGADO', totalCop: 999, cantidad: 1, egresos: [] },
      ],
    });

    await montar();

    const alerta = $('[data-testid="alerta-lotes-por-aprobar"]')!.textContent!;
    // Sólo el BORRADOR cuenta: el PAGADO ya pasó por ahí.
    expect(alerta).toContain('1 lote de egresos espera aprobación');
    expect(alerta).toContain('distinto de quien lo armó');
  });

  it('la exógena sin visto bueno alerta del año ANTERIOR, no del actual', async () => {
    const anioPasado = new Date().getFullYear() - 1;
    exogena.resumen.mockResolvedValue({
      anio: anioPasado,
      disponible: true,
      cuantiasMenores: { activa: false, topeCop: 0, nit: '222222222', filas: 0 },
      formatos: [
        {
          formato: '1001',
          nombre: 'Pagos',
          filas: 128,
          totalCop: 1,
          estado: 'GENERADA',
          aprobadoPorUserId: null,
          aprobadoAt: null,
          observaciones: null,
          bloqueos: ['12 movimientos sin tercero.'],
          avisos: [],
          necesitaContador: true,
        },
        // Uno vacío no cuenta: no se presenta y no hay qué aprobar.
        {
          formato: '1003',
          nombre: 'Retenciones',
          filas: 0,
          totalCop: 0,
          estado: 'GENERADA',
          aprobadoPorUserId: null,
          aprobadoAt: null,
          observaciones: null,
          bloqueos: [],
          avisos: [],
          necesitaContador: true,
        },
      ],
    });

    await montar();

    expect(exogena.resumen).toHaveBeenCalledWith(anioPasado);
    const alerta = $('[data-testid="alerta-exogena-sin-visto-bueno"]')!.textContent!;
    expect(alerta).toContain('1 formato de exógena');
    expect(alerta).toContain(String(anioPasado));
    expect(alerta).toContain('sin tercero');
  });

  it('🔴 una pieza sin migrar no alerta NI se reporta como revisión caída', async () => {
    api.mapeo.rubros.mockResolvedValue({
      disponible: false,
      motivo: 'Falta la migración 49.',
      completo: false,
      faltantes: [],
      rubros: [],
    });
    gastos.facturas.listar.mockResolvedValue({
      disponible: false,
      motivo: 'Falta la migración 50.',
      total: 0,
      limite: 1,
      desplazamiento: 0,
      totales: { subtotalCop: 0, ivaCop: 0, retencionesCop: 0, totalCop: 0, netoCop: 0 },
      facturas: [],
    });

    await montar();

    expect($('[data-testid="alerta-rubros-incompletos"]')).toBeNull();
    expect($('[data-testid="alerta-facturas-sin-causar"]')).toBeNull();
    // Y la portada NO dice que no pudo revisar: no hay nada que revisar.
    expect($('[data-testid="revisiones-caidas"]')).toBeNull();
  });

  it('🔴 un FALLO de una de las cuatro sí entra a «no pude revisar todo»', async () => {
    gastos.lotes.listar.mockRejectedValue(new Error('se cayó'));

    await montar();

    const caidas = $('[data-testid="revisiones-caidas"]')!.textContent!;
    expect(caidas).toContain('esperando aprobación');
    expect($('[data-testid="no-cargo-lotes"]')).not.toBeNull();
    expect($('[data-testid="reintentar-lotes"]')).not.toBeNull();
  });
});

/**
 * 🔴 Nico, 22-09, sobre esta portada: «esto también parece un vómito y tiene
 * cosas por un lado y por el otro que se podrían hacer de otra manera o hasta
 * con un CTA que luego pida el resto de información».
 */
describe('HubDeContabilidad · el resumen es una frase y el rango se pide después', () => {
  it('🔴 arriba va UNA frase, no tres fichas del mismo peso', async () => {
    await montar();
    const resumen = host.querySelector('[aria-label="Resumen del libro"]')!;
    const frase = resumen.querySelector('[data-testid="el-libro-en-una-frase"]')!;
    expect(frase).not.toBeNull();
    // Dice la RELACIÓN, no tres números sueltos.
    expect(frase.textContent).toMatch(/plan de|asiento/i);
    // Y ya no hay una rejilla de tres columnas de cifras.
    expect(resumen.querySelectorAll('dd')).toHaveLength(0);
  });

  it('🔴 el rango de fechas NO está puesto en la portada: lo pide el cajón', async () => {
    await montar();
    // Cerrado: el rango no está en ninguna parte de la portada.
    expect(document.querySelector('[data-testid="rango-de-fechas"]')).toBeNull();
    expect(document.querySelector('[data-testid="cajon-del-libro"]')).toBeNull();

    await clic($('[data-testid="descargar-csv"]'));

    // El cajón vive en un portal: se busca en el documento.
    const cajon = document.querySelector('[data-testid="cajon-del-libro"]')!;
    expect(cajon).not.toBeNull();
    expect(cajon.querySelector('[data-testid="rango-de-fechas"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="cajon-del-libro-descargar"]')).not.toBeNull();
  });
});
