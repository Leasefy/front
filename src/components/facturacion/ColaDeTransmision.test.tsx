/**
 * La cola de transmisión a la DIAN.
 *
 * Lo que protege esta prueba son las tres cosas que la pantalla NO puede
 * callar (Nico y Juan Camilo, 17-09):
 *
 *  · que sin proveedor tecnológico los documentos están numerados pero NO
 *    validados ante la DIAN;
 *  · que **el recaudo no se frena** por nada de acá;
 *  · que un RECHAZO de la DIAN no se reintenta solo: lo vuelve a encolar una
 *    persona, con el botón, y el motivo del rechazo está a la vista.
 *
 * Y la cuarta, la de siempre: sin la migración, la pantalla lo DICE en vez de
 * pintar una tabla vacía que parece «no tienes nada».
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { cola, reintentarTransmision, reintentarLosSinProveedor, estadoAnteLaDian, confirmar, saltosDeLaNumeracion } = vi.hoisted(
  () => ({
    cola: vi.fn(),
    reintentarTransmision: vi.fn(),
    reintentarLosSinProveedor: vi.fn(),
    // DIAN-FEEL: sin respuesta (back anterior), la cola dice lo de siempre.
    estadoAnteLaDian: vi.fn(),
    confirmar: vi.fn(),
    saltosDeLaNumeracion: vi.fn(),
  }),
);

vi.mock('@/lib/api/facturacion-electronica.service', async () => {
  const real =
    await vi.importActual<
      typeof import('@/lib/api/facturacion-electronica.service')
    >('@/lib/api/facturacion-electronica.service');
  return {
    ...real,
    facturacionElectronicaService: {
      cola,
      reintentarTransmision,
      reintentarLosSinProveedor,
      estadoAnteLaDian,
      saltosDeLaNumeracion,
    },
  };
});

vi.mock('@/components/ui/confirmar', () => ({ confirmar }));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { ColaDeTransmision } from './ColaDeTransmision';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';

function documento(over: Record<string, unknown> = {}) {
  return {
    id: 't-1',
    documentoTipo: 'FACTURA',
    documentoNombre: 'Factura de venta',
    documentoId: 'f-1',
    numeroDian: 'FE-1042',
    estado: 'POR_TRANSMITIR',
    estadoNombre: 'Por transmitir',
    intentos: 2,
    proximoIntentoAt: '2026-09-17T16:00:00.000Z',
    ultimoIntentoAt: '2026-09-17T15:00:00.000Z',
    ultimoError: null,
    cufe: null,
    cude: null,
    xmlUrl: null,
    pdfUrl: null,
    encoladaAt: '2026-09-17T12:00:00.000Z',
    transmitidaAt: null,
    aceptadaAt: null,
    rechazadaAt: null,
    proveedor: null,
    reintentable: false,
    ...over,
  };
}

function respuesta(over: Record<string, unknown> = {}) {
  return {
    disponible: true,
    migracion: null,
    proveedor: 'Sin proveedor tecnológico',
    proveedorConfigurado: false,
    resumen: { POR_TRANSMITIR: 1 },
    avisos: [],
    documentos: [documento()],
    explicacion: null,
    ...over,
  };
}

let host: HTMLDivElement;
let root: Root;

async function pintar(r: Record<string, unknown>) {
  cola.mockResolvedValue(r);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<ColaDeTransmision />);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  estadoAnteLaDian.mockResolvedValue(null);
  saltosDeLaNumeracion.mockResolvedValue({ saltos: [] });
  host = document.createElement('div');
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host.remove();
});

const q = (s: string) => host.querySelector(s);

describe('ColaDeTransmision', () => {
  it('🔴 sin proveedor lo dice, y dice que el recaudo no depende de esto', async () => {
    await pintar(respuesta());
    const aviso = q('[data-testid="cola-proveedor"]')!;
    expect(aviso.textContent).toContain('no hay proveedor tecnológico');
    expect(aviso.textContent).toContain('NO están validadas ante la DIAN');
    expect(aviso.textContent).toContain('recaudo no depende de esto');
  });

  it('con proveedor conectado dice cuál es, sin la advertencia', async () => {
    await pintar(
      respuesta({ proveedorConfigurado: true, proveedor: 'Proveedor X' }),
    );
    const aviso = q('[data-testid="cola-proveedor"]')!;
    expect(aviso.textContent).toContain('Proveedor X');
    expect(aviso.textContent).not.toContain('NO están validadas');
  });

  it('🔴 un RECHAZO muestra su motivo y ofrece volver a intentar (con proveedor)', async () => {
    await pintar(
      respuesta({
        // FA-R19 (03-10): sólo con proveedor conectado reintentar transmite algo.
        proveedorConfigurado: true,
        proveedor: 'FEEL',
        documentos: [
          documento({
            id: 't-rechazada',
            estado: 'RECHAZADA_DIAN',
            estadoNombre: 'Rechazada por la DIAN',
            ultimoError: 'NIT del adquirente inválido',
            reintentable: true,
          }),
        ],
      }),
    );
    const fila = q('[data-testid="transmision-t-rechazada"]')!;
    expect(fila.textContent).toContain('Rechazada por la DIAN');
    expect(fila.textContent).toContain('NIT del adquirente inválido');
    const boton = q(
      '[data-testid="transmision-reintentar-t-rechazada"]',
    ) as HTMLButtonElement;
    expect(boton).not.toBeNull();

    reintentarTransmision.mockResolvedValue({
      id: 't-rechazada',
      estado: 'POR_TRANSMITIR',
    });
    await act(async () => {
      boton.click();
    });
    expect(reintentarTransmision).toHaveBeenCalledWith('t-rechazada', {});
  });

  it('🔴 lo que TODAVÍA se reintenta solo no ofrece el botón', async () => {
    await pintar(respuesta());
    expect(q('[data-testid="transmision-reintentar-t-1"]')).toBeNull();
  });

  it('una ACEPTADA muestra su CUFE', async () => {
    await pintar(
      respuesta({
        documentos: [
          documento({
            id: 't-ok',
            estado: 'ACEPTADA_DIAN',
            estadoNombre: 'Aceptada por la DIAN',
            cufe: 'abc123cufe',
          }),
        ],
      }),
    );
    expect(q('[data-testid="transmision-t-ok"]')!.textContent).toContain(
      'abc123cufe',
    );
  });

  it('avisa lo que lleva demasiado tiempo, con las horas y los intentos', async () => {
    await pintar(
      respuesta({
        avisos: [
          {
            transmisionId: 't-1',
            documentoTipo: 'FACTURA',
            numeroDian: 'FE-1042',
            horas: 10,
            intentos: 6,
            ultimoError: 'timeout',
          },
        ],
      }),
    );
    const avisos = q('[data-testid="cola-avisos"]')!;
    expect(avisos.textContent).toContain('FE-1042');
    expect(avisos.textContent).toContain('10 horas');
    expect(avisos.textContent).toContain('timeout');
  });

  it('ofrece volver a encolar TODO lo que quedó sin proveedor, cuando ya hay proveedor', async () => {
    await pintar(
      respuesta({ resumen: { SIN_PROVEEDOR: 12 }, proveedorConfigurado: true, proveedor: 'FEEL' }),
    );
    const boton = q(
      '[data-testid="cola-reintentar-sin-proveedor"]',
    ) as HTMLButtonElement;
    expect(boton.textContent).toContain('12');
    reintentarLosSinProveedor.mockResolvedValue({ reencolados: 12 });
    await act(async () => {
      boton.click();
    });
    expect(reintentarLosSinProveedor).toHaveBeenCalled();
  });

  it('🔴 sin la migración lo DICE en vez de fingir un listado vacío', async () => {
    await pintar(
      respuesta({
        disponible: false,
        migracion: '20260918001000_cola_de_transmision_y_entrega',
        documentos: [],
        resumen: {},
        explicacion:
          'La cola de transmisión a la DIAN llega con la migración 20260918001000_cola_de_transmision_y_entrega, que todavía no está aplicada en esta base. Emitir, numerar y el recaudo funcionan igual.',
      }),
    );
    const aviso = q('[data-testid="cola-sin-migracion"]')!;
    // 🔴 FA-R27 (03-10): el id de la migración no le dice nada a quien factura.
    expect(aviso.textContent).not.toContain('20260918001000');
    expect(document.body.textContent).not.toContain('20260918001000');
    expect(aviso.textContent).toContain('el recaudo funcionan igual');
    // Y el vacío NO dice «no tienes nada».
    expect((q('[data-testid="sin-datos"]')?.textContent ?? '').toLowerCase()).not.toContain(
      'no tienes',
    );
  });
});

describe('ColaDeTransmision · QA-FACT (03-10-2026)', () => {
  it('🔴 FA-R19: sin proveedor conectado no ofrece «Volver a encolar» ni «Volver a intentar»', async () => {
    await pintar(
      respuesta({
        resumen: { SIN_PROVEEDOR: 1 },
        documentos: [
          documento({ id: 't-sp', estado: 'SIN_PROVEEDOR', estadoNombre: 'Sin proveedor configurado', reintentable: true }),
        ],
      }),
    );
    expect(q('[data-testid="cola-reintentar-sin-proveedor"]')).toBeNull();
    expect(q('[data-testid="transmision-reintentar-t-sp"]')).toBeNull();
    // Y el aviso no repite el nombre del «proveedor» que no hay.
    expect(q('[data-testid="cola-proveedor"]')!.textContent).toContain(
      'Todavía no hay proveedor tecnológico conectado. Tus facturas',
    );
  });

  it('🔴 FA-16: el filtro de estado es el Select del DS, no un <select> con los códigos', async () => {
    await pintar(respuesta());
    expect(q('select')).toBeNull();
    expect(q('[data-testid="cola-filtro"]')!.getAttribute('role')).toBe('combobox');
    expect(host.textContent).not.toMatch(/POR_TRANSMITIR|SIN_PROVEEDOR|ACEPTADA_DIAN/);
  });

  it('el aviso de lo que lleva demasiado dice «1 hora» y «1 intento», y no el código del documento', async () => {
    await pintar(
      respuesta({
        avisos: [
          { transmisionId: 't-9', documentoTipo: 'DOCUMENTO_SOPORTE', numeroDian: null, horas: 1, intentos: 1, ultimoError: null },
        ],
      }),
    );
    const avisos = q('[data-testid="cola-avisos"]')!;
    expect(avisos.textContent).toContain('Documento soporte: 1 hora y 1 intento.');
    expect(avisos.textContent).not.toContain('DOCUMENTO_SOPORTE');
  });
});

describe('ColaDeTransmision · el sistema de errores (02-10)', () => {
  it('🔴 volver a encolar con un 5xx dice «de nuestro lado» con la referencia', async () => {
    await pintar(
      respuesta({
        proveedorConfigurado: true,
        proveedor: 'FEEL',
        documentos: [
          documento({
            id: 't-rechazada',
            estado: 'RECHAZADA_DIAN',
            estadoNombre: 'Rechazada por la DIAN',
            ultimoError: 'NIT del adquirente inválido',
            reintentable: true,
          }),
        ],
      }),
    );
    reintentarTransmision.mockRejectedValue(new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'ab12cd34',
      }));
    await act(async () => {
      (q('[data-testid="transmision-reintentar-t-rechazada"]') as HTMLButtonElement).click();
    });
    const texto = vi.mocked(toast.error).mock.calls[0]?.[0] as string;
    expect(texto).toContain('No pudimos volver a encolar el documento: algo falló de nuestro lado');
    expect(texto).toContain('ab12cd34');
  });
});

/**
 * DIAN-FEEL (04-10-2026): «una sola cuenta FEEL de Leasefy». La cola dice qué le
 * falta a ESTA inmobiliaria, muestra el acuse (CUFE, PDF, QR) y no deja volver
 * a mandar a ciegas lo que se cortó sin respuesta.
 */
describe('ColaDeTransmision · DIAN-FEEL', () => {
  const FALTA_HABILITAR = {
    estado: 'FALTA_HABILITAR',
    titulo: 'Falta habilitar a FEEL como tu proveedor tecnológico',
    descripcion: 'Tus facturas se numeran y quedan en cola, pero todavía no se transmiten a la DIAN.',
    transmite: false,
    ambiente: null,
    pasos: [],
    avisos: [],
  };

  it('🔴 sin transmitir: dice qué le falta a ESTA inmobiliaria, sin pedir credenciales', async () => {
    estadoAnteLaDian.mockResolvedValue(FALTA_HABILITAR);
    await pintar(respuesta());
    const aviso = q('[data-testid="cola-proveedor"]')!;
    expect(aviso.textContent).toContain('Falta habilitar a FEEL como tu proveedor tecnológico');
    expect(aviso.textContent).toContain('recaudo no depende de esto');
    expect(aviso.textContent).not.toMatch(/token|contraseña|credencial/i);
  });

  it('lo validado muestra el CUFE, el número de la DIAN, el PDF y la consulta del QR', async () => {
    estadoAnteLaDian.mockResolvedValue({ ...FALTA_HABILITAR, estado: 'LISTA', transmite: true, ambiente: 'PRODUCCION' });
    await pintar(
      respuesta({
        proveedorConfigurado: true,
        proveedor: 'FEEL',
        documentos: [
          documento({
            id: 't-ok',
            estado: 'ACEPTADA_DIAN',
            estadoVisible: 'VALIDADA',
            estadoNombre: 'Validada por la DIAN',
            cufe: 'cufe-0123456789abcdef',
            documentoGenerado: 'SETP993500100',
            pdfUrl: 'https://feel.example/pdf/1',
            qrDatos: 'https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=cufe-0123456789abcdef',
          }),
        ],
      }),
    );
    const fila = q('[data-testid="transmision-t-ok"]')!;
    expect(fila.textContent).toContain('Validada por la DIAN');
    expect(fila.textContent).toContain('cufe-0123456789abcdef');
    expect(fila.textContent).toContain('SETP993500100');
    expect(q('[data-testid="pdf-dian-t-ok"]')!.getAttribute('href')).toBe('https://feel.example/pdf/1');
    expect(q('[data-testid="qr-dian-t-ok"]')!.getAttribute('href')).toContain('documentkey=cufe-');
    expect(q('[data-testid="cola-proveedor"]')!.textContent).toContain(
      'Leasefy transmite tus documentos a la DIAN con FEEL',
    );
  });

  it('el motivo en palabras del back gana sobre el error crudo', async () => {
    estadoAnteLaDian.mockResolvedValue({ ...FALTA_HABILITAR, estado: 'LISTA', transmite: true, ambiente: 'PRODUCCION' });
    await pintar(
      respuesta({
        proveedorConfigurado: true,
        documentos: [
          documento({
            id: 't-r',
            estado: 'RECHAZADA_DIAN',
            estadoNombre: 'Rechazada por la DIAN',
            ultimoError: 'Regla: FAU04, Rechazo: (R) Base Imponible es distinto',
            motivo: 'La DIAN la rechazó: Base Imponible es distinto (regla FAU04).',
            reintentable: true,
          }),
        ],
      }),
    );
    const fila = q('[data-testid="transmision-t-r"]')!;
    expect(fila.textContent).toContain('La DIAN la rechazó: Base Imponible es distinto (regla FAU04).');
    expect(fila.textContent).not.toContain('Regla: FAU04, Rechazo');
  });

  it('🔴 «Esperando confirmación»: volver a enviar pide confirmar que en FEEL no está', async () => {
    estadoAnteLaDian.mockResolvedValue({ ...FALTA_HABILITAR, estado: 'LISTA', transmite: true, ambiente: 'PRODUCCION' });
    await pintar(
      respuesta({
        proveedorConfigurado: true,
        documentos: [
          documento({
            id: 't-nc',
            documentoTipo: 'NOTA_CREDITO',
            numeroDian: 'NC-4',
            estado: 'TRANSMITIDA',
            estadoVisible: 'ESPERANDO_CONFIRMACION',
            estadoNombre: 'Esperando confirmación',
            proximoIntentoAt: null,
            reintentable: true,
            esperandoConfirmacion: true,
          }),
        ],
      }),
    );
    const boton = q('[data-testid="transmision-reintentar-t-nc"]') as HTMLButtonElement;
    expect(boton.textContent).toBe('Volver a enviar');

    // Dice que no: no se manda nada.
    confirmar.mockResolvedValueOnce(false);
    await act(async () => {
      boton.click();
    });
    expect(reintentarTransmision).not.toHaveBeenCalled();

    // Confirma: se manda con la confirmación.
    confirmar.mockResolvedValueOnce(true);
    reintentarTransmision.mockResolvedValue({ id: 't-nc', estado: 'POR_TRANSMITIR' });
    await act(async () => {
      boton.click();
    });
    expect(confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: '¿Revisaste en FEEL que no está?' }),
    );
    expect(reintentarTransmision).toHaveBeenCalledWith('t-nc', { confirmoQueNoLlego: true });
  });

  it('el aviso de lo que lleva demasiado dice el motivo en palabras, no el error crudo; «Reintentando» va en ámbar', async () => {
    estadoAnteLaDian.mockResolvedValue({ ...FALTA_HABILITAR, estado: 'LISTA', transmite: true, ambiente: 'PRODUCCION' });
    await pintar(
      respuesta({
        proveedorConfigurado: true,
        avisos: [
          {
            transmisionId: 't-1',
            documentoTipo: 'FACTURA',
            numeroDian: 'FE-1042',
            horas: 15,
            intentos: 3,
            ultimoError: 'FEEL no respondió tras 3 intentos: fetch failed',
            motivo: 'No se pudo conectar con FEEL. Se vuelve a intentar sola; no tienes que hacer nada.',
          },
        ],
        documentos: [documento({ estadoVisible: 'REINTENTANDO', estadoNombre: 'Reintentando' })],
      }),
    );
    const avisos = q('[data-testid="cola-avisos"]')!;
    expect(avisos.textContent).toContain('No se pudo conectar con FEEL');
    expect(avisos.textContent).not.toContain('fetch failed');
    const celda = [...q('[data-testid="transmision-t-1"]')!.querySelectorAll('td')].find(
      (td) => td.textContent === 'Reintentando',
    )!;
    expect(celda.className).toContain('text-warning');
  });

  it('🔴 un salto en la numeración (el LABQA-6 del laboratorio) se muestra con su explicación', async () => {
    saltosDeLaNumeracion.mockResolvedValue({
      saltos: [
        {
          resolucionId: 'r',
          resolucion: '18764000000001',
          numero: 'LABQA-6',
          numeroDian: 6,
          usadoPor: { tipo: 'NOTA_DEBITO', nombre: 'n.º 1' },
          explicacion: 'El LABQA-6 no es una factura: lo tomó la nota débito n.º 1.',
        },
      ],
    });
    await pintar(respuesta());
    const caja = q('[data-testid="cola-saltos"]')!;
    expect(caja.textContent).toContain('tiene 1 salto');
    expect(caja.textContent).toContain('LABQA-6');
    expect(caja.textContent).toContain('lo tomó la nota débito n.º 1');
  });

  it('sin saltos no se pinta la caja', async () => {
    await pintar(respuesta());
    expect(q('[data-testid="cola-saltos"]')).toBeNull();
  });
});
