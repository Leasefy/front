/**
 * MigrarAsientos.test.tsx — el camino B del paso 5 cuando aplicar falla.
 *
 * Lo que se congela: que un fallo al aplicar DICE que reintentar no duplica
 * (es un hecho del back: llave de idempotencia por fila + re-preparación), y
 * que un informe con filas que no se pudieron escribir trae su botón de
 * reintentar en vez de ser un callejón sin salida.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type {
  CargaAbierta,
  InformeDeMigracion,
  RevisionDeLote,
} from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({
  parseSpreadsheetFile: vi.fn(),
}));

const { api } = vi.hoisted(() => ({
  api: { migracion: { revisar: vi.fn(), aplicar: vi.fn() } },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: { ...actual.contabilidadApi, ...api } };
});

import { parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile';
import { MigrarAsientos } from './MigrarAsientos';

const REVISION: RevisionDeLote = {
  lote: 'asientos-prueba',
  total: 2,
  listas: 2,
  rechazadas: 0,
  yaMigradas: 0,
  cuentasFaltantes: [],
  motivos: [],
  filas: [],
};

const INFORME_CON_FALLAS: InformeDeMigracion = {
  lote: 'asientos-prueba',
  total: 2,
  aplicados: 1,
  omitidos: 1,
  yaMigrados: 0,
  primerNumero: 10,
  ultimoNumero: 10,
  cuentasFaltantes: [],
  motivos: [],
  fallasAlEscribir: [{ fila: 2, motivo: 'timeout de la base' }],
};

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar(
  extra: Partial<React.ComponentProps<typeof MigrarAsientos>> = {},
) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<MigrarAsientos onAplicado={() => undefined} {...extra} />);
  });
  await act(async () => {});
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

function boton(texto: string): HTMLButtonElement | undefined {
  return [...container.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(texto),
  ) as HTMLButtonElement | undefined;
}

async function click(el: Element | null | undefined) {
  if (!el) throw new Error('no está el botón');
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {});
}

/** Sube un CSV mínimo por el input oculto del dropzone. */
async function subirArchivo(
  archivo?: { rows: Record<string, unknown>[]; headers: string[] },
) {
  vi.mocked(parseSpreadsheetFile).mockResolvedValue({
    rows: archivo?.rows ?? [
      { Fecha: '2026-01-15', Descripcion: 'Apertura', Cuenta: '110505', Debito: '100' },
      { Fecha: '2026-01-15', Descripcion: 'Apertura', Cuenta: '310505', Credito: '100' },
    ],
    headers: archivo?.headers ?? ['Fecha', 'Descripcion', 'Cuenta', 'Debito', 'Credito'],
    sheetNames: ['Hoja1'],
  } as never);
  const input = q('dropzone-asientos')?.querySelector('input') as HTMLInputElement;
  const file = new File(['x'], 'diario.csv', { type: 'text/csv' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
  });
  await act(async () => {});
}

beforeEach(() => {
  api.migracion.revisar.mockResolvedValue(REVISION);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container.remove();
  vi.clearAllMocks();
});

describe('aplicar que falla', () => {
  it('el error dice que reintentar no duplica, y el botón de aplicar sigue ahí', async () => {
    api.migracion.aplicar.mockRejectedValue(new Error('No pudimos conectarnos al servidor.'));

    await pintar();
    await subirArchivo();
    await click(q('revisar-asientos'));
    expect(q('revision-asientos')).not.toBeNull();

    await click(q('aplicar-asientos'));

    const alerta = container.querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('no se duplican');
    expect(q('aplicar-asientos')).not.toBeNull();
  });
});

describe('informe con filas que no se pudieron escribir', () => {
  it('🔴 no es un callejón: ofrece reintentar sólo esas, y reintenta el MISMO lote', async () => {
    api.migracion.aplicar.mockResolvedValue(INFORME_CON_FALLAS);

    await pintar();
    await subirArchivo();
    await click(q('revisar-asientos'));
    await click(q('aplicar-asientos'));

    expect(q('informe-asientos')).not.toBeNull();
    const reintentar = q('reintentar-fallas');
    expect(reintentar).not.toBeNull();
    expect(reintentar?.textContent).toContain('1');

    const informeOk: InformeDeMigracion = {
      ...INFORME_CON_FALLAS,
      aplicados: 1,
      omitidos: 0,
      yaMigrados: 1,
      fallasAlEscribir: [],
    };
    api.migracion.aplicar.mockResolvedValue(informeOk);
    await click(reintentar);

    // Mismo lote en las dos llamadas: la idempotencia depende de eso.
    const lotes = api.migracion.aplicar.mock.calls.map(
      (c) => (c[0] as { lote: string }).lote,
    );
    expect(new Set(lotes).size).toBe(1);
    // Con el reintento limpio, el botón desaparece.
    expect(q('reintentar-fallas')).toBeNull();
  });

  it('el informe sin fallas no ofrece reintentar', async () => {
    api.migracion.aplicar.mockResolvedValue({
      ...INFORME_CON_FALLAS,
      aplicados: 2,
      omitidos: 0,
      fallasAlEscribir: [],
    });

    await pintar();
    await subirArchivo();
    await click(q('revisar-asientos'));
    await click(q('aplicar-asientos'));

    expect(q('informe-asientos')).not.toBeNull();
    expect(q('reintentar-fallas')).toBeNull();
  });
});

/*
 * 🔴 Nico, 2026-09-12, con el export de comprobantes metido en «Subir el
 * libro diario»: «primero eso no es un feedback de decir que si no el back
 * rechaza todas las filas, los usuarios ni saben qué es el back; y segundo,
 * ¿qué es código de cuenta? ¿y por qué no lo trae o qué pasa ahí con eso?».
 *
 * No lo traía porque su archivo no puede traerlo. Y la puerta correcta estaba
 * al lado sin que nada se lo dijera.
 */
describe('el archivo en la puerta equivocada', () => {
  /* Los encabezados REALES de su archivo, leídos de la captura. Las filas son
     inventadas: el archivo tiene datos de personas de verdad. */
  const COMPROBANTES = {
    headers: [
      'Prefijo', 'Consecutivo', 'Tipo Doc', 'Fecha', 'Concepto', 'Debitos',
      'Creditos', 'Balance', 'Descuadrado', 'Anulado', '¿Es anticipo?',
      'Nombre Tercero Anticipo', '¿anticipo aplicado?',
      'Valor Restante del Anticipo', 'Creado por', 'Fecha creación',
    ],
    rows: [
      { Prefijo: 'CE', Consecutivo: '1', Fecha: '2026-01-15', Concepto: 'Pago', Debitos: '100' },
    ],
  };

  it('lo reconoce, explica POR QUÉ no trae código de cuenta, y abre la puerta correcta', async () => {
    const irAComprobantes = vi.fn();

    await pintar({ onIrAComprobantes: irAComprobantes });
    await subirArchivo(COMPROBANTES);

    const aviso = q('asientos-archivo-de-comprobantes');
    expect(aviso).not.toBeNull();
    expect(aviso!.textContent).toContain('son comprobantes, no el libro diario');
    // El porqué, no sólo el veredicto.
    expect(aviso!.textContent).toContain('la cuenta vive en cada línea del asiento');
    // Y con qué columnas lo dedujo: un veredicto sin evidencia no se discute.
    expect(aviso!.textContent).toContain('Prefijo');

    await click(q('ir-a-comprobantes'));
    expect(irAComprobantes).toHaveBeenCalledTimes(1);
  });

  it('con un libro diario de verdad no dice nada de esto', async () => {
    await pintar();
    await subirArchivo();

    expect(q('asientos-archivo-de-comprobantes')).toBeNull();
    expect(q('asientos-sin-mapear')).toBeNull();
  });

  /* Que deje de avisar cuando alguien mapea el código de cuenta a mano se
     prueba sobre `hayQueAvisarDeOtraPuerta`, que es donde vive la decisión:
     manejar el `Select` de Radix desde happy-dom probaría el mock, no la
     regla. Ver `que-archivo-contable-es.test.ts`. */
});

describe('la columna que falta, en idioma de persona', () => {
  it('🔴 no nombra «el back» y dice qué es la columna y qué pasa sin ella', async () => {
    await pintar();
    // Un libro diario al que le falta justo la cuenta.
    await subirArchivo({
      headers: ['Fecha', 'Descripcion', 'Debito', 'Credito'],
      rows: [{ Fecha: '2026-01-15', Descripcion: 'Apertura', Debito: '100' }],
    });

    const aviso = q('asientos-sin-mapear');
    expect(aviso).not.toBeNull();
    const texto = aviso!.textContent!;

    expect(texto).toContain('Código de cuenta');
    // Qué ES la columna, con su ejemplo.
    expect(texto).toContain('110505');
    // Y qué pasa si falta, sin nombrar una pieza interna.
    expect(texto).toContain('no entraría ninguna fila');
    expect(texto).not.toContain('back');
  });
});

/*
 * T-0125 · «si cierro el navegador a mitad, ¿pierdo el trabajo?». No: lo escrito
 * está en el back y la carga queda ABIERTA. Continuarla es subir el mismo
 * archivo con el MISMO nombre de lote — con otro, el back abre una carga nueva
 * y la vieja se queda abierta para siempre.
 */
describe('continuar una carga que quedó a medias', () => {
  const CARGA: CargaAbierta = {
    lote: 'asientos-2026-09-29-0900',
    esperados: 1,
    procesados: 0,
    creadaAt: '2026-09-29T09:00:00Z',
    actualizadaAt: '2026-09-29T09:20:00Z',
  };

  it('🔴 reusa el lote de la carga —no el nombre del reloj— al revisar y al aplicar', async () => {
    api.migracion.aplicar.mockResolvedValue({ ...INFORME_CON_FALLAS, fallasAlEscribir: [], aplicados: 1 });

    await pintar({ continuar: CARGA });
    await subirArchivo();

    const campo = q('nombre-del-lote-asientos') as HTMLInputElement;
    expect(campo.value).toBe(CARGA.lote);
    // Cambiar el nombre abriría OTRA carga: el campo no se puede tocar.
    expect(campo.disabled).toBe(true);

    await click(q('revisar-asientos'));
    await click(q('aplicar-asientos'));

    expect((api.migracion.revisar.mock.calls[0]![0] as { lote: string }).lote).toBe(CARGA.lote);
    const aplicado = api.migracion.aplicar.mock.calls[0]![0] as {
      lote: string;
      totalDelArchivo?: number;
      desde?: number;
    };
    expect(aplicado.lote).toBe(CARGA.lote);
    // Y sigue declarando el avance: es lo que mantiene el prefijo al día.
    expect(aplicado.totalDelArchivo).toBe(1);
    expect(aplicado.desde).toBe(0);
  });

  it('sin carga que continuar, el nombre sigue siendo el del reloj y se puede editar', async () => {
    await pintar();
    await subirArchivo();

    const campo = q('nombre-del-lote-asientos') as HTMLInputElement;
    expect(campo.value).toMatch(/^asientos-\d{4}-\d{2}-\d{2}-\d{4}$/);
    expect(campo.disabled).toBe(false);
    expect(q('asientos-continuando')).toBeNull();
  });

  it('dice qué carga se continúa, cuánto lleva, y que hay que subir el MISMO archivo', async () => {
    await pintar({ continuar: { ...CARGA, esperados: 116_262, procesados: 10_000 } });

    const aviso = q('asientos-continuando');
    expect(aviso).not.toBeNull();
    const texto = aviso!.textContent ?? '';
    expect(texto).toContain(CARGA.lote);
    expect(texto).toContain('10.000 de 116.262');
    expect(texto).toContain('mismo archivo');
    expect(texto).toContain('no se duplica');
  });

  it('«Empezar una carga nueva» devuelve el control: el padre deja de continuar', async () => {
    const dejar = vi.fn();
    await pintar({ continuar: CARGA, onDejarDeContinuar: dejar });

    await click(q('asientos-continuar-nueva'));

    expect(dejar).toHaveBeenCalledTimes(1);
  });

  it('al terminar la carga («Subir otro archivo») deja de continuarla; si sigue abierta, la conserva', async () => {
    const dejar = vi.fn();
    api.migracion.aplicar.mockResolvedValue({
      ...INFORME_CON_FALLAS,
      fallasAlEscribir: [],
      aplicados: 1,
      carga: { lote: CARGA.lote, esperados: 1, procesados: 1, estado: 'COMPLETA' },
    });
    await pintar({ continuar: CARGA, onDejarDeContinuar: dejar });
    await subirArchivo();
    await click(q('revisar-asientos'));
    await click(q('aplicar-asientos'));

    await click(boton('Subir otro archivo'));
    expect(dejar).toHaveBeenCalledTimes(1);
  });

  it('con la carga todavía ABIERTA, «Subir otro archivo» no suelta la continuación', async () => {
    const dejar = vi.fn();
    api.migracion.aplicar.mockResolvedValue({
      ...INFORME_CON_FALLAS,
      fallasAlEscribir: [],
      aplicados: 1,
      carga: { lote: CARGA.lote, esperados: 9, procesados: 1, estado: 'ABIERTA' },
    });
    await pintar({ continuar: CARGA, onDejarDeContinuar: dejar });
    await subirArchivo();
    await click(q('revisar-asientos'));
    await click(q('aplicar-asientos'));

    await click(boton('Subir otro archivo'));
    expect(dejar).not.toHaveBeenCalled();
  });

  it('un archivo de otro tamaño que la carga avisa, sin bloquear', async () => {
    await pintar({ continuar: { ...CARGA, esperados: 5 } });
    await subirArchivo(); // arma 1 asiento

    const aviso = q('asientos-otro-tamano');
    expect(aviso).not.toBeNull();
    expect(aviso!.textContent).toContain('1');
    expect(aviso!.textContent).toContain('5');
    // Corregir un asiento ya cargado NO es «sin duplicar»: entra como nuevo.
    expect(aviso!.textContent).toContain('asiento nuevo');
    expect(aviso!.textContent).not.toContain('si lo corregiste, puedes seguir');
    expect((q('revisar-asientos') as HTMLButtonElement).disabled).toBe(false);
  });

  it('un archivo del mismo tamaño no dice nada', async () => {
    await pintar({ continuar: CARGA });
    await subirArchivo();
    expect(q('asientos-otro-tamano')).toBeNull();
  });
});

describe('el informe cuando parte del archivo ya estaba', () => {
  it('🔴 lo que ya estaba se lee como «ya estaba cargado», no como un fallo', async () => {
    api.migracion.aplicar.mockResolvedValue({
      ...INFORME_CON_FALLAS,
      aplicados: 0,
      omitidos: 0,
      yaMigrados: 2,
      fallasAlEscribir: [],
    });

    await pintar();
    await subirArchivo();
    await click(q('revisar-asientos'));
    await click(q('aplicar-asientos'));

    const texto = q('informe-asientos')!.textContent ?? '';
    expect(texto).toContain('2 ya estaban cargados');
    // Y la regla contable, para quien corrigió un asiento y lo volvió a subir:
    // el corregido entra como NUEVO y hay que reversar el original.
    expect(texto).toMatch(/revers/i);
    expect(texto).toContain('entra como un asiento nuevo');
    expect(texto).not.toContain('no lo reescribe');
  });

  it('con la carga abierta dice que el avance quedó guardado y cómo seguir', async () => {
    api.migracion.aplicar.mockResolvedValue({
      ...INFORME_CON_FALLAS,
      fallasAlEscribir: [],
      aplicados: 1,
      carga: { lote: 'asientos-prueba', esperados: 4, procesados: 1, estado: 'ABIERTA' },
    });

    await pintar();
    await subirArchivo();
    await click(q('revisar-asientos'));
    await click(q('aplicar-asientos'));

    const guardado = q('asientos-avance-guardado');
    expect(guardado).not.toBeNull();
    expect(guardado!.textContent).toContain('1 de 4');
    expect(guardado!.textContent).toContain('mismo archivo');
  });

  it('🔴 sin `carga` en la respuesta no se muestra ningún avance guardado', async () => {
    api.migracion.aplicar.mockResolvedValue({ ...INFORME_CON_FALLAS, fallasAlEscribir: [], aplicados: 1 });

    await pintar();
    await subirArchivo();
    await click(q('revisar-asientos'));
    await click(q('aplicar-asientos'));

    expect(q('asientos-avance-guardado')).toBeNull();
  });

  it('una carga COMPLETA se dice completa, sin pedir que se continúe', async () => {
    api.migracion.aplicar.mockResolvedValue({
      ...INFORME_CON_FALLAS,
      fallasAlEscribir: [],
      aplicados: 1,
      carga: { lote: 'asientos-prueba', esperados: 1, procesados: 1, estado: 'COMPLETA' },
    });

    await pintar();
    await subirArchivo();
    await click(q('revisar-asientos'));
    await click(q('aplicar-asientos'));

    expect(q('asientos-avance-guardado')).toBeNull();
    expect(q('informe-asientos')!.textContent).toContain('Carga completa');
  });
});

describe('un corte en pleno aplicar', () => {
  it('🔴 dice que el avance está guardado y cómo continuar, no sólo «reintenta»', async () => {
    api.migracion.aplicar.mockRejectedValue(new Error('No pudimos conectarnos al servidor.'));

    await pintar();
    await subirArchivo();
    await click(q('revisar-asientos'));
    await click(q('aplicar-asientos'));

    const texto = container.querySelector('[role="alert"]')?.textContent ?? '';
    expect(texto).toContain('avance está guardado');
    expect(texto).toContain('mismo archivo');
  });
});

/*
 * T-0125 · el bucle de aplicar vive en el navegador: cerrar la pestaña a mitad
 * corta la carga. El aviso nativo se registra sólo mientras hay algo que perder.
 */
describe('aviso antes de cerrar la pestaña', () => {
  function intentarSalir(): boolean {
    const evento = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(evento);
    return evento.defaultPrevented;
  }

  it('🔴 sin archivo no hay nada que perder: cerrar no pregunta', async () => {
    await pintar();
    expect(intentarSalir()).toBe(false);
  });

  it('con el archivo leído pero sin aplicar, cerrar pregunta', async () => {
    await pintar();
    await subirArchivo();
    expect(intentarSalir()).toBe(true);
  });

  it('🔴 mientras se aplica, cerrar pregunta', async () => {
    api.migracion.aplicar.mockReturnValue(new Promise(() => undefined)); // nunca termina
    await pintar();
    await subirArchivo();
    await click(q('revisar-asientos'));
    await click(q('aplicar-asientos'));
    expect(intentarSalir()).toBe(true);
  });

  it('terminado el informe ya no pregunta', async () => {
    api.migracion.aplicar.mockResolvedValue({ ...INFORME_CON_FALLAS, fallasAlEscribir: [], aplicados: 2 });
    await pintar();
    await subirArchivo();
    await click(q('revisar-asientos'));
    await click(q('aplicar-asientos'));
    expect(q('informe-asientos')).not.toBeNull();
    expect(intentarSalir()).toBe(false);
  });

  it('descartar el archivo («Subir otro») suelta el aviso', async () => {
    await pintar();
    await subirArchivo();
    expect(intentarSalir()).toBe(true);
    await click(q('archivo-de-asientos-descartar'));
    expect(intentarSalir()).toBe(false);
  });
});


/*
 * Sistema de errores (02-10-2026): un 5xx al revisar dice «de nuestro lado»
 * con la referencia; lo que el back dice del nombre del lote va bajo el campo.
 */
describe('revisar que falla · la regla de oro', () => {
  it('🔴 un 5xx dice «de nuestro lado» con la referencia', async () => {
    const { ApiError } = await import('@/lib/api/client');
    api.migracion.revisar.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: '5ca1ab1e',
      }),
    );
    await pintar();
    await subirArchivo();
    await click(q('revisar-asientos'));

    const alerta = container.querySelector('[role="alert"]');
    expect(alerta?.textContent).toMatch(/No pudimos revisar el archivo: algo falló de nuestro lado/);
    expect(alerta?.textContent).toContain('5ca1ab1e');
  });

  it('🔴 un 400 con `campos` en `lote` va bajo el nombre del lote', async () => {
    const { ApiError } = await import('@/lib/api/client');
    const mensaje = 'El nombre del lote puede tener hasta 60 caracteres.';
    api.migracion.revisar.mockRejectedValue(
      new ApiError(400, [mensaje], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [mensaje],
        campos: [{ campo: 'lote', regla: 'longitud_maxima', mensaje }],
      }),
    );
    await pintar();
    await subirArchivo();
    await click(q('revisar-asientos'));

    const campo = q('nombre-del-lote-asientos') as HTMLInputElement;
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(container.querySelector('#lote-asientos-error')?.textContent).toBe(mensaje);
  });
});
