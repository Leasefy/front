/**
 * La pantalla de la resolución de la DIAN.
 *
 * Lo que se protege: que la primera línea responda «¿puedo facturar?» y que
 * cuando la respuesta es no diga POR QUÉ (no cargada, vencida, anulada, rango
 * agotado se arreglan distinto); que el formulario no deje mandar una
 * resolución a medias; que el prefijo pueda ir vacío; y que las fechas se
 * pinten en día civil, no corridas un día por la zona horaria.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { ResolucionesDeLaAgencia } from '@/lib/api/facturacion-por-mes.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const resolucionesMock = vi.fn();
const crearMock = vi.fn();
const anularMock = vi.fn();
const toastOk = vi.fn();
const toastErr = vi.fn();

vi.mock('@/lib/api/facturacion-por-mes.service', async () => {
  const real = await vi.importActual<
    typeof import('@/lib/api/facturacion-por-mes.service')
  >('@/lib/api/facturacion-por-mes.service');
  return {
    ...real,
    facturacionPorMesService: {
      resoluciones: (...a: unknown[]) => resolucionesMock(...a),
      crearResolucion: (...a: unknown[]) => crearMock(...a),
      anularResolucion: (...a: unknown[]) => anularMock(...a),
    },
  };
});

vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: (...a: unknown[]) => toastOk(...a),
    error: (...a: unknown[]) => toastErr(...a),
  },
}));

import { ResolucionDeFacturacion } from './ResolucionDeFacturacion';
import { ApiError } from '@/lib/api/client';
import { MENSAJES_DE_LA_FACTURACION } from '@/lib/facturacion/limites-de-la-facturacion';

function respuesta(
  over: Partial<ResolucionesDeLaAgencia> = {},
): ResolucionesDeLaAgencia {
  return {
    resoluciones: [
      {
        id: 'res-1',
        numero: '18764003394379',
        fechaResolucion: '2026-01-15T00:00:00.000Z',
        prefijo: 'FE',
        // `null` = numera cualquier tipo, que es lo de hoy (17-09-2026).
        tipoDeDocumento: null,
        tipoNombre: 'Cualquier tipo de documento',
        desde: 1,
        hasta: 5000,
        vigenteDesde: '2026-01-15T00:00:00.000Z',
        vigenteHasta: '2028-01-15T00:00:00.000Z',
        ultimoNumeroUsado: 1199,
        anulada: false,
        usados: 1199,
        disponibles: 3801,
        puedeNumerar: true,
        motivo: null,
        explicacion: null,
        siguiente: 'FE-1200',
      },
    ],
    vigente: {
      puedeNumerar: true,
      motivo: null,
      explicacion: null,
      numero: '18764003394379',
      prefijo: 'FE',
      desde: 1,
      hasta: 5000,
      vigenteHasta: '2028-01-15T00:00:00.000Z',
      disponibles: 3801,
      siguiente: 'FE-1200',
    },
    porTipoDisponible: true,
    porTipo: [
      {
        tipo: 'CANON_INQUILINO',
        nombre: 'Canon del inquilino',
        resolucionId: 'res-1',
        resolucionNumero: '18764003394379',
        prefijo: 'FE',
        puedeNumerar: true,
        porLaGeneral: true,
        disponibles: 3801,
        siguiente: 'FE-1200',
        explicacion: null,
      },
    ],
    umbrales: { numeros: 100, dias: 30 },
    avisos: [],
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
    root.render(<ResolucionDeFacturacion />);
  });
}

/**
 * 🔴 Todo lo del formulario se busca en `document`, no en `host`: desde el
 * 21-09 «Cargar una resolución» vive en el cajón de la casa, que Radix monta
 * en un PORTAL colgado de `document.body`. Buscando sólo dentro de `host` los
 * campos «no existen» y la prueba pasaría por la razón errada.
 */
function escribir(testid: string, valor: string) {
  const input = document.querySelector(`[data-testid="${testid}"]`) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )!.set!;
  setter.call(input, valor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  resolucionesMock.mockReset().mockResolvedValue(respuesta());
  crearMock.mockReset().mockResolvedValue({});
  anularMock.mockReset().mockResolvedValue({});
  toastOk.mockReset();
  toastErr.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const q = (s: string) => document.querySelector(s);

/**
 * 🔴 «Anular» vive en el kebab de la fila desde el 21-09: escrito al lado del
 * estado, la tabla no cabía y la pantalla avisaba «se corre a los lados».
 * El disparador de Radix abre con `pointerdown`, NO con `click`, y el menú se
 * monta en un portal colgado de `document.body`.
 */
async function abrirAcciones(id: string) {
  const kebab = q(`[data-testid="acciones-${id}"]`) as HTMLButtonElement;
  await act(async () => {
    kebab.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        button: 0,
        pointerId: 1,
      }),
    );
  });
}

/** El formulario ya no está puesto en la pantalla: lo abre su CTA. */
async function abrirCarga() {
  const boton = q('[data-testid="resolucion-abrir-carga"]') as HTMLButtonElement;
  await act(async () => {
    boton.click();
  });
}

describe('ResolucionDeFacturacion', () => {
  it('lo primero que dice es si hoy se puede facturar y con qué número sigue', async () => {
    await montar();
    const estado = q('[data-testid="resolucion-estado"]')!;
    expect(estado.textContent).toContain('18764003394379');
    expect(estado.textContent).toContain('FE-1200');
    expect(estado.textContent).toContain('3801');
    // 🔴 En día civil: `new Date('2028-01-15T00:00:00Z')` en Bogotá es el 14.
    expect(estado.textContent).toContain('15/01/2028');
  });

  it('🔴 sin resolución vigente dice el motivo, que es lo que se arregla', async () => {
    resolucionesMock.mockResolvedValue(
      respuesta({
        resoluciones: [],
        vigente: {
          puedeNumerar: false,
          motivo: 'VENCIDA',
          explicacion: 'La resolución 999 venció el 31/01/2026.',
          numero: '999',
          prefijo: 'FE',
          desde: 1,
          hasta: 100,
          vigenteHasta: '2026-01-31T00:00:00.000Z',
          disponibles: 0,
          siguiente: null,
        },
      }),
    );
    await montar();
    expect(q('[data-testid="resolucion-estado"]')!.textContent).toContain(
      'venció el 31/01/2026',
    );
    expect(q('[data-testid="sin-datos"]')).not.toBeNull();
  });

  it('el listado muestra rango, usados, disponibles y vigencia', async () => {
    await montar();
    const fila = q('[data-testid="resolucion-res-1"]')!;
    expect(fila.textContent).toContain('1–5000');
    expect(fila.textContent).toContain('1199');
    expect(fila.textContent).toContain('3801');
    expect(fila.textContent).toContain('15/01/2026 – 15/01/2028');
  });

  it('🔴 el botón no deja mandar una resolución a medias', async () => {
    await montar();
    await abrirCarga();
    const boton = q('[data-testid="resolucion-guardar"]') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);

    escribir('resolucion-campo-numero', '999');
    escribir('resolucion-campo-fecha', '2026-01-15');
    escribir('resolucion-campo-desde', '1');
    escribir('resolucion-campo-hasta', '100');
    escribir('resolucion-campo-vigente-desde', '2026-01-15');
    // Falta la vigencia final: sigue apagado.
    expect(
      (q('[data-testid="resolucion-guardar"]') as HTMLButtonElement).disabled,
    ).toBe(true);

    escribir('resolucion-campo-vigente-hasta', '2027-01-15');
    expect(
      (q('[data-testid="resolucion-guardar"]') as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('el prefijo puede ir vacío: hay resoluciones sin prefijo', async () => {
    await montar();
    await abrirCarga();
    escribir('resolucion-campo-numero', '999');
    escribir('resolucion-campo-fecha', '2026-01-15');
    escribir('resolucion-campo-desde', '1');
    escribir('resolucion-campo-hasta', '100');
    escribir('resolucion-campo-vigente-desde', '2026-01-15');
    escribir('resolucion-campo-vigente-hasta', '2027-01-15');
    await act(async () => {
      (q('[data-testid="resolucion-guardar"]') as HTMLButtonElement).click();
    });
    expect(crearMock).toHaveBeenCalledWith({
      numero: '999',
      fechaResolucion: '2026-01-15',
      prefijo: '',
      desde: 1,
      hasta: 100,
      vigenteDesde: '2026-01-15',
      vigenteHasta: '2027-01-15',
    });
    expect(toastOk).toHaveBeenCalled();
    // Se vuelve a pedir el listado: el estado de arriba tiene que reflejarlo.
    expect(resolucionesMock).toHaveBeenCalledTimes(2);
  });

  /**
   * F1 (auditoría 13-09): anular era un clic que dejaba a la inmobiliaria sin
   * poder numerar. Ahora abre un diálogo que dice qué se rompe y pide el
   * motivo, que el back exige.
   */
  describe('anular una resolución', () => {
    const enElDocumento = (s: string) => document.querySelector(s);

    function escribirMotivo(valor: string) {
      const area = enElDocumento('[data-testid="motivo-anulacion"]') as HTMLTextAreaElement;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value',
      )!.set!;
      setter.call(area, valor);
      area.dispatchEvent(new Event('input', { bubbles: true }));
    }

    async function abrirDialogo() {
      await abrirAcciones('res-1');
      await act(async () => {
        (q('[data-testid="anular-res-1"]') as HTMLElement).click();
      });
    }

    const confirmar = () =>
      enElDocumento('[data-testid="confirmar-anular"]') as HTMLButtonElement;

    it('🔴 el botón de la fila NO anula: abre el diálogo que dice qué se rompe', async () => {
      await montar();
      await abrirDialogo();
      expect(anularMock).not.toHaveBeenCalled();
      const consecuencia = enElDocumento('[data-testid="anular-resolucion-consecuencia"]')!;
      // Es la que numera hoy: sin ella no se factura.
      expect(consecuencia.textContent).toContain('no vas a poder numerar facturas');
      expect(consecuencia.textContent).toContain('no se deshace');
    });

    it('🔴 sin motivo no manda nada; sólo espacios tampoco', async () => {
      await montar();
      await abrirDialogo();
      expect(confirmar().disabled).toBe(true);

      await act(async () => {
        escribirMotivo('    ');
      });
      expect(confirmar().disabled).toBe(true);

      await act(async () => {
        confirmar().click();
      });
      expect(anularMock).not.toHaveBeenCalled();
    });

    it('con motivo manda { motivo } sin los espacios de los bordes y vuelve a leer', async () => {
      await montar();
      await abrirDialogo();
      await act(async () => {
        escribirMotivo('  La DIAN autorizó un rango nuevo.  ');
      });
      expect(confirmar().disabled).toBe(false);
      await act(async () => {
        confirmar().click();
      });
      expect(anularMock).toHaveBeenCalledWith('res-1', 'La DIAN autorizó un rango nuevo.');
      expect(toastOk).toHaveBeenCalled();
      expect(resolucionesMock).toHaveBeenCalledTimes(2);
      // Se cerró: la resolución quedó anulada.
      expect(enElDocumento('[data-testid="anular-resolucion-dialogo"]')).toBeNull();
    });

    it('si el back falla, lo dice y el diálogo sigue abierto con el motivo escrito', async () => {
      anularMock.mockRejectedValue(
        new Error('Escribe por qué anulas la resolución: sin ella la inmobiliaria no puede numerar facturas.'),
      );
      await montar();
      await abrirDialogo();
      await act(async () => {
        escribirMotivo('Rango nuevo');
      });
      await act(async () => {
        confirmar().click();
      });
      expect(toastErr).toHaveBeenCalledWith(
        'Escribe por qué anulas la resolución: sin ella la inmobiliaria no puede numerar facturas.',
      );
      expect(toastOk).not.toHaveBeenCalled();
      expect(
        (enElDocumento('[data-testid="motivo-anulacion"]') as HTMLTextAreaElement).value,
      ).toBe('Rango nuevo');
    });

    it('una resolución que ya no numeraba no amenaza con dejarte sin facturar', async () => {
      const base = respuesta();
      resolucionesMock.mockResolvedValue({
        ...base,
        resoluciones: [
          {
            ...base.resoluciones[0],
            puedeNumerar: false,
            motivo: 'VENCIDA',
            explicacion: 'La resolución 18764003394379 venció el 15/01/2026.',
          },
        ],
      });
      await montar();
      await abrirDialogo();
      const consecuencia = enElDocumento('[data-testid="anular-resolucion-consecuencia"]')!;
      expect(consecuencia.textContent).not.toContain('no vas a poder numerar');
      expect(consecuencia.textContent).toContain('venció el 15/01/2026');
    });
  });

  /**
   * 🔴 Nico, 21-09: «no entiendo esos filtros por allá abajo. Eso de carga
   * resolución ni se entiende, creo que eso debería ser un CTA». Este guardián
   * no deja que el formulario vuelva a quedar puesto en la pantalla: nueve
   * campos con fechas y rangos debajo de una tabla SE LEEN como sus filtros.
   */
  it('🔴 el formulario no está puesto en la pantalla: lo saca un CTA', async () => {
    await montar();
    expect(q('[data-testid="resolucion-campo-numero"]')).toBeNull();
    expect(q('[data-testid="resolucion-guardar"]')).toBeNull();
    // Y el vacío no manda «abajo», que era donde estaba.
    expect(q('[data-testid="resolucion-abrir-carga"]')).not.toBeNull();

    await abrirCarga();
    expect(q('[data-testid="resolucion-campo-numero"]')).not.toBeNull();
    expect(q('[data-testid="resolucion-guardar"]')).not.toBeNull();
  });

  it('🔴 «Nueva factura» manda acá con el cajón ya abierto, no a buscar el botón', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(<ResolucionDeFacturacion abrirCarga onCargaAbierta={() => {}} />);
    });
    expect(q('[data-testid="resolucion-campo-numero"]')).not.toBeNull();
  });

  it('un fallo al cargar se dice y no se pinta como éxito', async () => {
    crearMock.mockRejectedValue(new Error('Esa resolución ya está cargada.'));
    await montar();
    await abrirCarga();
    escribir('resolucion-campo-numero', '999');
    escribir('resolucion-campo-fecha', '2026-01-15');
    escribir('resolucion-campo-desde', '1');
    escribir('resolucion-campo-hasta', '100');
    escribir('resolucion-campo-vigente-desde', '2026-01-15');
    escribir('resolucion-campo-vigente-hasta', '2027-01-15');
    await act(async () => {
      (q('[data-testid="resolucion-guardar"]') as HTMLButtonElement).click();
    });
    expect(toastErr).toHaveBeenCalledWith('Esa resolución ya está cargada.');
    expect(toastOk).not.toHaveBeenCalled();
  });
});

/**
 * 🔴 F5 (auditoría 13-09): lo que está mal se dice AL LADO DEL CAMPO. El toast
 * del back se iba solo a los cinco segundos, justo cuando la persona baja la
 * vista al formulario para corregir, y nunca decía cuál de los seis campos era.
 */
describe('ResolucionDeFacturacion · lo que está mal, al lado del campo', () => {
  async function llenar(over: Record<string, string> = {}) {
    await montar();
    await abrirCarga();
    const valores: Record<string, string> = {
      'resolucion-campo-numero': '18764003394379',
      'resolucion-campo-fecha': '2026-01-15',
      'resolucion-campo-desde': '1',
      'resolucion-campo-hasta': '5000',
      'resolucion-campo-vigente-desde': '2026-01-15',
      'resolucion-campo-vigente-hasta': '2028-01-15',
      ...over,
    };
    for (const [testid, valor] of Object.entries(valores)) {
      if (document.querySelector(`[data-testid="${testid}"]`)) {
        await act(async () => escribir(testid, valor));
      }
    }
  }

  it('🔴 un rango que termina antes de empezar se dice en el campo y NO se manda', async () => {
    await llenar({ 'resolucion-campo-desde': '5000', 'resolucion-campo-hasta': '10' });

    const error = q('#resolucion-error-hasta');
    expect(error).not.toBeNull();
    expect(error?.textContent).toContain('termina antes de empezar');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(
      (q('[data-testid="resolucion-guardar"]') as HTMLButtonElement | null)?.disabled,
    ).toBe(true);

    await act(async () => {
      (q('[data-testid="resolucion-guardar"]') as HTMLButtonElement | null)?.click();
    });
    // No se gastó un viaje al back para recibir un aviso que se borra solo.
    expect(crearMock).not.toHaveBeenCalled();
  });

  it('🔴 una vigencia que termina antes de empezar, igual', async () => {
    await llenar({
      'resolucion-campo-vigente-desde': '2028-01-15',
      'resolucion-campo-vigente-hasta': '2026-01-15',
    });
    expect(q('#resolucion-error-vigente-hasta')?.textContent).toContain(
      'La vigencia termina antes de empezar',
    );
    expect(crearMock).not.toHaveBeenCalled();
  });

  it('bien escrita, no hay ningún aviso y el botón deja guardar', async () => {
    await llenar();
    expect(q('#resolucion-error-hasta')).toBeNull();
    expect(q('#resolucion-error-vigente-hasta')).toBeNull();
    expect(
      (q('[data-testid="resolucion-guardar"]') as HTMLButtonElement | null)?.disabled,
    ).toBe(false);
  });
});

/*
 * 02-10-2026 · La resolución con el sistema de errores. El error del campo es
 * `<ErrorDelCampo>` (se busca por su `id`, el de su `aria-describedby`); los
 * topes del DTO se atajan antes de mandar con la MISMA frase del back; lo que
 * el back diga de un campo va debajo de él con el foco; un 5xx dice «de
 * nuestro lado» con la referencia; «conexión», sólo sin respuesta.
 */
describe('ResolucionDeFacturacion · el sistema de errores (02-10)', () => {
  async function llenarYGuardar(over: Record<string, string> = {}) {
    await montar();
    await abrirCarga();
    const valores: Record<string, string> = {
      'resolucion-campo-numero': '18764003394379',
      'resolucion-campo-fecha': '2026-01-15',
      'resolucion-campo-desde': '1',
      'resolucion-campo-hasta': '5000',
      'resolucion-campo-vigente-desde': '2026-01-15',
      'resolucion-campo-vigente-hasta': '2028-01-15',
      ...over,
    };
    for (const [testid, valor] of Object.entries(valores)) {
      await act(async () => escribir(testid, valor));
    }
    await act(async () => {
      (q('[data-testid="resolucion-guardar"]') as HTMLButtonElement).click();
    });
  }

  it('🔴 un rango con ceros de más se ataja ANTES de mandar, con la frase del back', async () => {
    await llenarYGuardar({ 'resolucion-campo-hasta': '15000000000' });
    expect(crearMock).not.toHaveBeenCalled();
    expect(q('#resolucion-error-hasta')?.textContent).toBe(MENSAJES_DE_LA_FACTURACION.hastaMaximo);
    expect(q('#resolucion-hasta')?.getAttribute('aria-describedby')).toBe('resolucion-error-hasta');
  });

  it('🔴 una fecha de la resolución fuera de 2000–2100 se ataja con la frase del back', async () => {
    await llenarYGuardar({ 'resolucion-campo-fecha': '1999-12-31' });
    expect(crearMock).not.toHaveBeenCalled();
    expect(q('#resolucion-error-fecha')?.textContent).toBe(
      MENSAJES_DE_LA_FACTURACION.fechaDeLaResolucionFueraDeRango,
    );
  });

  it('🔴 el último número usado fuera del rango se ataja con la frase del back', async () => {
    await llenarYGuardar({ 'resolucion-campo-ultimo': '6000' });
    expect(crearMock).not.toHaveBeenCalled();
    expect(q('#resolucion-error-ultimo')?.textContent).toBe(
      'El último número usado (6000) tiene que estar entre 0 y 5000.',
    );
  });

  it('🔴 un 400 con campos pinta el error en SU campo y le da el foco, sin toast', async () => {
    const mensaje = 'El último número usado (5001) tiene que estar entre 0 y 5000.';
    crearMock.mockRejectedValue(
      new ApiError(400, [mensaje], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [mensaje],
        campos: [{ campo: 'ultimoNumeroUsado', regla: 'rango', mensaje }],
      }),
    );
    await llenarYGuardar();

    expect(crearMock).toHaveBeenCalled();
    expect(q('#resolucion-error-ultimo')?.textContent).toBe(mensaje);
    expect(document.activeElement?.id).toBe('resolucion-ultimo');
    expect(toastErr).not.toHaveBeenCalled();

    // Al corregir el campo, el error del back se va.
    await act(async () => escribir('resolucion-campo-ultimo', '10'));
    expect(q('#resolucion-error-ultimo')?.textContent ?? '').not.toContain(mensaje);
  });

  it('🔴 un 5xx dice que falló de nuestro lado, con la referencia, sin culpar a la conexión', async () => {
    crearMock.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'ab12cd34',
      }),
    );
    await llenarYGuardar();
    const texto = toastErr.mock.calls[0]?.[0] as string;
    expect(texto).toContain('No pudimos cargar la resolución: algo falló de nuestro lado');
    expect(texto).toContain('ab12cd34');
    expect(texto).not.toMatch(/conexi[oó]n/);
  });

  it('sin respuesta: ahí sí habla de la conexión', async () => {
    crearMock.mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    await llenarYGuardar();
    expect(toastErr.mock.calls[0]?.[0]).toMatch(/conexi[oó]n/);
  });
});

describe('ResolucionDeFacturacion · anular con el sistema de errores (02-10)', () => {
  async function anularCon(error: unknown) {
    anularMock.mockRejectedValue(error);
    await montar();
    const kebab = q('[data-testid="acciones-res-1"]') as HTMLButtonElement;
    await act(async () => {
      kebab.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }),
      );
    });
    await act(async () => {
      (q('[data-testid="anular-res-1"]') as HTMLElement).click();
    });
    const area = q('[data-testid="motivo-anulacion"]') as HTMLTextAreaElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!.call(area, 'Rango nuevo');
      area.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      (q('[data-testid="confirmar-anular"]') as HTMLButtonElement).click();
    });
  }

  it('🔴 un 400 sobre el motivo va DEBAJO del motivo, sin toast', async () => {
    const mensaje = 'El motivo de la anulación puede tener hasta 500 caracteres.';
    await anularCon(
      new ApiError(400, [mensaje], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        campos: [{ campo: 'motivo', regla: 'longitud_maxima', mensaje }],
      }),
    );
    expect(q('#motivo-anulacion-error')?.textContent).toBe(mensaje);
    expect(document.activeElement?.id).toBe('motivo-anulacion');
    expect(toastErr).not.toHaveBeenCalled();
  });

  it('🔴 un 5xx: «de nuestro lado» con la referencia', async () => {
    await anularCon(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        referencia: 'ab12cd34',
      }),
    );
    const texto = toastErr.mock.calls[0]?.[0] as string;
    expect(texto).toContain('No pudimos anular la resolución: algo falló de nuestro lado');
    expect(texto).toContain('ab12cd34');
  });
});
