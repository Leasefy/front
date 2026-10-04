/**
 * «Ventas» y «Notas» con el QA de Facturación (QA-FACT, 03-10-2026) y las
 * decisiones de Nico de ese día:
 *
 *  · la nota crédito BAJA la deuda: el diálogo dice eso y ya no «el neteo lo
 *    hace tu contador»; si el error era sólo del documento y el back lo ofrece,
 *    sale la corregida en el mismo paso (y la deuda queda igual);
 *  · «Notas (NC/ND)» trae las notas DÉBITO con su IVA y las notas crédito
 *    GENERADAS se emiten desde ahí;
 *  · «Nueva factura» → «Por facturar» (FA-05); la plata con un formato (FA-R28);
 *    el concepto con el `Select` del DS (FA-R30).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { emitidas, emitirNotaCredito, emitirNotaGenerada, notasDebito, confirmarMock, descargarUnaMock, notasDelMes, pdfDeLaNota } = vi.hoisted(() => ({
  notasDelMes: vi.fn(),
  pdfDeLaNota: vi.fn(),
  emitidas: vi.fn(),
  emitirNotaCredito: vi.fn(),
  emitirNotaGenerada: vi.fn(),
  notasDebito: vi.fn(),
  confirmarMock: vi.fn(),
  descargarUnaMock: vi.fn(),
}));

vi.mock('./useDescargarFacturas', () => ({
  useDescargarFacturas: () => ({
    descargarUna: (...a: unknown[]) => descargarUnaMock(...a),
    descargarLote: vi.fn(),
    descargando: null,
  }),
}));

vi.mock('@/lib/api/facturacion-por-mes.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/facturacion-por-mes.service')>(
    '@/lib/api/facturacion-por-mes.service',
  );
  return {
    ...real,
    facturacionPorMesService: { emitidas, emitirNotaCredito, emitirNotaGenerada, notasDelMes, pdfDeLaNota },
  };
});

vi.mock('@/lib/api/facturacion-electronica.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/facturacion-electronica.service')>(
    '@/lib/api/facturacion-electronica.service',
  );
  return { ...real, facturacionElectronicaService: { ...real.facturacionElectronicaService, notasDebito } };
});

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/confirmar', () => ({
  confirmar: (...a: unknown[]) => confirmarMock(...a),
}));

import { FacturasEmitidas } from './FacturasEmitidas';
import { toast } from '@/components/ui/toast';

function factura(over: Record<string, unknown> = {}) {
  return {
    id: 'f-1',
    numero: 3,
    numeroDian: 'LABQA-1',
    destinatario: 'INQUILINO',
    terceroNombre: 'Juliana Sin Correo Patiño',
    terceroDocumento: '43123456',
    inmueble: 'Apartamento 302',
    contractId: 'ct-26',
    mes: '2026-10',
    baseCop: 4_100_000,
    ivaCop: 0,
    retencionesCop: 0,
    totalCop: 4_100_000,
    netoCop: 4_100_000,
    createdAt: '2026-10-03T12:00:00.000Z',
    notaCredito: null,
    notasCredito: [],
    anulacion: { puede: true, bloqueo: null, explicacion: null },
    ...over,
  };
}

let host: HTMLDivElement;
let root: Root;

async function pintar(vista: 'ventas' | 'notas', respuesta: Record<string, unknown>) {
  emitidas.mockResolvedValue(respuesta);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<FacturasEmitidas mes="2026-10" vista={vista} />);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Por defecto, un back sin `notas/lista`: la pestaña Notas se arma como antes.
  notasDelMes.mockRejectedValue(new Error('404'));
  notasDebito.mockResolvedValue({ disponible: true, migracion: null, notas: [], explicacion: null });
  confirmarMock.mockResolvedValue(true);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
});

const q = (s: string) => host.querySelector(s) ?? document.body.querySelector(s);

async function escribirMotivo(texto: string) {
  const area = q('#nc-motivo') as HTMLTextAreaElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(area, texto);
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('FacturasEmitidas · QA-FACT', () => {
  it('🔴 FA-05: el vacío de Ventas manda a «Por facturar», no a «Nueva factura»', async () => {
    await pintar('ventas', { mes: '2026-10', anulacionDisponible: true, facturas: [] });
    expect(host.textContent).toContain('«Por facturar»');
    expect(host.textContent).not.toContain('Nueva factura');
  });

  it('🔴 ronda 3 (en el navegador): la factura anulada por completo lo dice UNA vez', async () => {
    await pintar('ventas', {
      mes: '2026-10',
      anulacionDisponible: true,
      facturas: [
        factura({
          anulacion: { puede: false, bloqueo: 'YA_ANULADA', explicacion: 'Esta factura ya se anuló con la nota crédito NC-3.' },
          correccion: {
            puedeAnular: false,
            puedeParcial: false,
            maximoParcialCop: 0,
            puedeNotaDebito: false,
            saldoCop: 0,
            acreditadoCop: 4_100_000,
            bloqueo: 'YA_ANULADA',
            explicacion: 'Esta factura ya se anuló por completo con la nota crédito NC-3. Para corregirla, emite la factura nueva.',
          },
        }),
      ],
    });
    const fila = q('[data-testid="factura-3"]')!;
    expect(q('[data-testid="sin-anular-3"]')!.textContent).toBe('Esta factura ya se anuló con la nota crédito NC-3.');
    expect(fila.textContent!.match(/ya se anuló/g)).toHaveLength(1);
    expect(q('[data-testid="acreditado-3"]')).toBeNull();
    expect(fila.textContent).not.toContain('emite la factura nueva');
  });

  it('🔴 FA-R28: el total con el formato de la casa, «$ 4.100.000»', async () => {
    await pintar('ventas', { mes: '2026-10', anulacionDisponible: true, facturas: [factura()] });
    expect(q('[data-testid="factura-3"]')!.textContent).toContain('$ 4.100.000');
  });

  it('🔴 FA-11 (Nico): anular dice que la DEUDA baja, no que el neteo lo hace el contador', async () => {
    emitirNotaCredito.mockResolvedValue({ id: 'nc-1', numeroDeLaNota: 'NC-2', valorCop: 4_100_000 });
    await pintar('ventas', { mes: '2026-10', anulacionDisponible: true, facturas: [factura()] });
    await act(async () => {
      (q('[data-testid="anular-3"]') as HTMLButtonElement).click();
    });
    const dialogo = document.body.textContent ?? '';
    expect(dialogo).toContain('La deuda de la cuota de octubre de 2026 baja en ese valor');
    expect(dialogo).not.toContain('el neteo lo hace tu contador');
    // FA-R30: el concepto es el Select del DS.
    expect(document.querySelector('select#nc-concepto')).toBeNull();
    expect(q('[data-testid="nc-concepto"]')!.getAttribute('role')).toBe('combobox');
    // Por defecto, «el cobro»: la deuda baja.
    expect(q('[data-testid="nc-mal-cobro"]')!.getAttribute('aria-checked')).toBe('true');

    await escribirMotivo('El contrato se terminó el 3 y el mes se facturó completo.');
    await act(async () => {
      (q('[data-testid="confirmar-nota-credito"]') as HTMLButtonElement).click();
    });
    // Bajar la deuda es lo que hace el back por defecto: no viaja `efecto`.
    expect(emitirNotaCredito).toHaveBeenCalledWith('f-1', {
      concepto: 'ANULACION',
      motivo: 'El contrato se terminó el 3 y el mes se facturó completo.',
    });
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
      'Nota crédito NC-2 por $ 4.100.000. La deuda de la cuota baja en ese valor.',
    );
  });

  it('«sólo un dato del documento» saca la corregida en el mismo paso (`efecto: SOLO_EL_DOCUMENTO`)', async () => {
    emitirNotaCredito.mockResolvedValue({
      id: 'nc-1',
      numeroDeLaNota: 'NC-2',
      valorCop: 4_100_000,
      facturaCorregida: { estado: 'EMITIDA', numeroDian: 'LABQA-3', motivo: null },
    });
    await pintar('ventas', { mes: '2026-10', anulacionDisponible: true, facturas: [factura()] });
    await act(async () => {
      (q('[data-testid="anular-3"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      (q('[data-testid="nc-mal-documento"]') as HTMLButtonElement).click();
    });
    expect(document.body.textContent).toContain('sale la factura corregida del mes, así que la deuda queda igual');
    await escribirMotivo('El nombre del inquilino salió mal escrito.');
    await act(async () => {
      (q('[data-testid="confirmar-nota-credito"]') as HTMLButtonElement).click();
    });
    expect(emitirNotaCredito.mock.calls[0][1]).toMatchObject({ efecto: 'SOLO_EL_DOCUMENTO' });
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
      'Nota crédito NC-2 por $ 4.100.000 y factura corregida LABQA-3. La deuda queda igual.',
    );
  });

  it('🔴 Q8: «Notas» trae las notas DÉBITO del mes con su IVA', async () => {
    notasDebito.mockResolvedValue({
      disponible: true,
      migracion: null,
      explicacion: null,
      notas: [
        {
          id: 'nd-1',
          numeroInterno: 'ND-1',
          numeroDian: 'LABQA-4',
          facturaId: 'f-1',
          contractId: 'ct-26',
          mes: '2026-10',
          estado: 'EMITIDA',
          concepto: 'AJUSTE_DE_PRECIO',
          conceptoNombre: 'Ajuste de precio',
          motivo: 'Faltó el parqueadero.',
          terceroNombre: 'Juliana Sin Correo Patiño',
          terceroDocumento: null,
          baseCop: 100_000,
          ivaCop: 19_000,
          valorCop: 119_000,
          createdAt: '2026-10-03T12:00:00.000Z',
          transmision: null,
        },
        { id: 'nd-otro-mes', numeroInterno: 'ND-2', numeroDian: null, facturaId: 'f-9', contractId: null, mes: '2026-09', estado: 'EMITIDA', concepto: 'OTROS', conceptoNombre: 'Otro', motivo: 'x', terceroNombre: 'Otro', terceroDocumento: null, baseCop: 1, ivaCop: 0, valorCop: 1, createdAt: '2026-09-03T12:00:00.000Z', transmision: null },
      ],
    });
    await pintar('notas', { mes: '2026-10', anulacionDisponible: true, facturas: [factura()] });
    const fila = q('[data-testid="nota-debito-nd-1"]')!;
    expect(fila.textContent).toContain('Nota débito');
    expect(fila.textContent).toContain('$ 119.000');
    expect(fila.textContent).toContain('IVA $ 19.000');
    expect(q('[data-testid="nota-debito-nd-otro-mes"]')).toBeNull();
  });

  it('🔴 Q6: una nota crédito GENERADA (sin número) se emite desde «Notas», con confirmación', async () => {
    emitirNotaGenerada.mockResolvedValue({ id: 'nc-9', numeroDeLaNota: 'NC-3', valorCop: 4_100_000 });
    const generada = {
      id: 'nc-9',
      numero: null,
      estado: 'GENERADA',
      concepto: 'ANULACION',
      motivo: 'Se anuló el cobro de octubre.',
      valorCop: 4_100_000,
      parcial: false,
      notaContable: null,
      createdAt: '2026-10-03T12:00:00.000Z',
    };
    await pintar('notas', {
      mes: '2026-10',
      anulacionDisponible: true,
      facturas: [factura({ notasCredito: [generada] })],
    });
    expect(q('[data-testid="nota-nc-9"]')!.textContent).toContain('Sin número');
    await act(async () => {
      (q('[data-testid="emitir-nota-nc-9"]') as HTMLButtonElement).click();
    });
    expect(confirmarMock).toHaveBeenCalledTimes(1);
    expect(emitirNotaGenerada).toHaveBeenCalledWith('nc-9');
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Nota crédito NC-3 emitida');
  });

  it('una nota crédito ya emitida no ofrece «Emitir»', async () => {
    const emitida = {
      id: 'nc-1',
      numero: 'NC-1',
      concepto: 'ANULACION',
      motivo: 'x'.repeat(12),
      valorCop: 4_100_000,
      parcial: false,
      notaContable: 'Reversada la causación.',
      createdAt: '2026-10-03T12:00:00.000Z',
    };
    await pintar('notas', { mes: '2026-10', anulacionDisponible: true, facturas: [factura({ notasCredito: [emitida] })] });
    expect(q('[data-testid="emitir-nota-nc-1"]')).toBeNull();
    expect(q('[data-testid="nota-NC-1"]')!.textContent).toContain('3 oct 2026');
  });
});

/** 🔴 FA-R30 (QA-FACT, 03-10-2026): Ventas con buscador, paginación y PDF por fila. */
describe('FacturasEmitidas · Ventas (FA-R30)', () => {
  const muchas = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      factura({ id: `f-${i + 1}`, numero: i + 1, numeroDian: `LABQA-${i + 1}`, terceroNombre: i === 4 ? 'Ramírez Ospina' : `Cliente ${i + 1}` }),
    );

  it('pagina de a 10 y busca sin tildes', async () => {
    await pintar('ventas', { mes: '2026-10', anulacionDisponible: true, facturas: muchas(14) });
    expect(host.querySelectorAll('[data-testid^="factura-"]').length).toBe(10);
    const input = q('[data-testid="ventas-buscar"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
      setter.call(input, 'ramirez');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.querySelectorAll('[data-testid^="factura-"]').length).toBe(1);
    expect(q('[data-testid="ventas-alcance"]')!.textContent).toBe('1 de 14 facturas');
  });

  it('cada factura con número baja su PDF desde la fila', async () => {
    await pintar('ventas', { mes: '2026-10', anulacionDisponible: true, facturas: [factura()] });
    await act(async () => {
      (q('[data-testid="ventas-pdf-3"]') as HTMLButtonElement).click();
    });
    expect(descargarUnaMock).toHaveBeenCalledWith('f-1', 'LABQA-1');
  });
});

/**
 * 🔴 La pestaña «Notas (NC/ND)» con `notas/lista` del back de QA-FACT: las notas
 * del mes en que se EMITIERON, crédito y débito, con lo que movieron en la deuda,
 * «Emitir» en las generadas y el PDF de la nota crédito.
 */
describe('FacturasEmitidas · Notas con `notas/lista`', () => {
  function nota(over: Record<string, unknown> = {}) {
    return {
      id: 'nc-2',
      tipo: 'NOTA_CREDITO',
      numero: 'NC-2',
      estado: 'EMITIDA',
      parcial: true,
      concepto: 'REBAJA',
      conceptoNombre: 'Rebaja o descuento',
      motivo: 'Nota parcial de prueba.',
      valorCop: 100_000,
      baseCop: null,
      ivaCop: null,
      deCobroAnulado: false,
      creadaAt: '2026-10-04T01:30:00.000Z',
      dia: '2026-10-03',
      factura: {
        id: 'f-3', numeroDian: 'LABQA-3', mes: '2026-10', destinatario: 'INQUILINO',
        terceroNombre: 'Juan Camilo Jaramillo', terceroDocumento: null, inmueble: 'Calle 15', contractId: 'ct-28',
      },
      enLaDeuda: { movimiento: 'BAJA', valorCop: 100_000, mes: '2026-10' },
      notaContable: null,
      transmision: null,
      entrega: null,
      puedeEmitir: false,
      porQueNoSePuedeEmitir: null,
      tienePdf: true,
      ...over,
    };
  }

  it('lista por el día de emisión (Bogotá), dice qué movió en la deuda y baja el PDF', async () => {
    notasDelMes.mockResolvedValue({ mes: '2026-10', disponible: true, notas: [nota()] });
    pdfDeLaNota.mockResolvedValue(new Blob(['%PDF']));
    await pintar('notas', { mes: '2026-10', anulacionDisponible: true, facturas: [] });
    expect(notasDelMes).toHaveBeenCalledWith('2026-10');
    expect(emitidas).not.toHaveBeenCalled();
    const fila = q('[data-testid="nota-del-mes-nc-2"]')!;
    // FA-21: emitida a las 8:30 p. m. del 3 de octubre en Colombia, no «4».
    expect(fila.textContent).toContain('3 oct 2026');
    expect(fila.textContent).toContain('Nota crédito · parcial');
    expect(q('[data-testid="nota-deuda-nc-2"]')!.textContent).toBe('Bajó la deuda de octubre de 2026');
    await act(async () => {
      (q('[data-testid="nota-pdf-nc-2"]') as HTMLButtonElement).click();
    });
    expect(pdfDeLaNota).toHaveBeenCalledWith('nc-2');
  });

  it('🔴 ronda 3 (en el navegador): bajo 768 px las notas son tarjetas, con su IVA, su PDF y «Emitir»', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((consulta: string) => ({
      matches: consulta.includes('max-width'),
      media: consulta,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
    try {
      notasDelMes.mockResolvedValue({
        mes: '2026-10',
        disponible: true,
        notas: [
          nota({ ivaCop: 1_900, valorCop: 11_900 }),
          nota({ id: 'nc-9', numero: null, estado: 'GENERADA', parcial: false, puedeEmitir: true, tienePdf: false, enLaDeuda: null }),
        ],
      });
      pdfDeLaNota.mockResolvedValue(new Blob(['%PDF']));
      await pintar('notas', { mes: '2026-10', anulacionDisponible: true, facturas: [] });
      expect(host.querySelector('table')).toBeNull();
      const tarjeta = q('[data-testid="nota-del-mes-nc-2"]')!;
      expect(tarjeta.tagName).toBe('LI');
      expect(tarjeta.textContent).toContain('$ 11.900');
      expect(tarjeta.textContent).toContain('IVA $ 1.900');
      expect(tarjeta.textContent).toContain('3 oct 2026');
      expect(q('[data-testid="nota-deuda-nc-2"]')).not.toBeNull();
      await act(async () => {
        (tarjeta.querySelector('[data-testid="nota-pdf-nc-2"]') as HTMLButtonElement).click();
      });
      expect(pdfDeLaNota).toHaveBeenCalledWith('nc-2');
      expect(q('[data-testid="nota-del-mes-nc-9"] [data-testid="emitir-nota-nc-9"]')).not.toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });

  it('🔴 ronda 3 (en el navegador): el PDF va en su columna, no pegado al texto del libro', async () => {
    notasDelMes.mockResolvedValue({
      mes: '2026-10',
      disponible: true,
      notas: [nota({ notaContable: 'Neteada en el libro: el asiento N.º 163 reversa la causación N.º 18.' })],
    });
    await pintar('notas', { mes: '2026-10', anulacionDisponible: true, facturas: [] });
    const celdas = Array.from(q('[data-testid="nota-del-mes-nc-2"]')!.querySelectorAll('td'));
    const delLibro = celdas.find((c) => c.textContent?.includes('Neteada en el libro'))!;
    expect(delLibro.querySelector('[data-testid="nota-pdf-nc-2"]')).toBeNull();
    expect(celdas[celdas.length - 1].querySelector('[data-testid="nota-pdf-nc-2"]')).not.toBeNull();
    // La cabecera tiene la columna de las acciones (para lectores de pantalla).
    expect(document.querySelectorAll('thead th').length).toBe(celdas.length);
  });

  it('🔴 Q6: la GENERADA de un cobro anulado se emite desde acá', async () => {
    notasDelMes.mockResolvedValue({
      mes: '2026-10',
      disponible: true,
      notas: [nota({ id: 'nc-9', numero: null, estado: 'GENERADA', parcial: false, deCobroAnulado: true, puedeEmitir: true, tienePdf: false, enLaDeuda: null })],
    });
    emitirNotaGenerada.mockResolvedValue({ id: 'nc-9', numeroDeLaNota: 'NC-4', valorCop: 100_000 });
    await pintar('notas', { mes: '2026-10', anulacionDisponible: true, facturas: [] });
    await act(async () => {
      (q('[data-testid="emitir-nota-nc-9"]') as HTMLButtonElement).click();
    });
    expect(String((confirmarMock.mock.calls[0][0] as { descripcion: string }).descripcion)).toContain(
      'el mes vuelve a «Por facturar»',
    );
    expect(emitirNotaGenerada).toHaveBeenCalledWith('nc-9');
  });

  it('🔴 ronda 3 (en el navegador): el 409 `NOTA_YA_EMITIDA` dice la frase del back y vuelve a leer la lista', async () => {
    notasDelMes.mockResolvedValue({
      mes: '2026-10',
      disponible: true,
      notas: [nota({ id: 'nc-9', numero: null, estado: 'GENERADA', parcial: false, puedeEmitir: true, tienePdf: false, enLaDeuda: null })],
    });
    const { ApiError } = await import('@/lib/api/client');
    emitirNotaGenerada.mockRejectedValue(
      new ApiError(409, 'Esta nota ya está emitida como NC-2.', 'NOTA_YA_EMITIDA', {
        statusCode: 409,
        code: 'NOTA_YA_EMITIDA',
        message: 'Esta nota ya está emitida como NC-2.',
      }),
    );
    await pintar('notas', { mes: '2026-10', anulacionDisponible: true, facturas: [] });
    const lecturas = notasDelMes.mock.calls.length;
    await act(async () => {
      (q('[data-testid="emitir-nota-nc-9"]') as HTMLButtonElement).click();
    });
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Esta nota ya está emitida como NC-2.');
    expect(notasDelMes.mock.calls.length).toBe(lecturas + 1);
  });
});

/**
 * 🔴 QA-FACT ronda 2 (Nico, la recomendada): a 390 px Ventas se corría de lado.
 * Por debajo de 768 px cada factura es una tarjeta con el cliente, el número y el
 * total, con su PDF y sus acciones; en escritorio sigue la tabla.
 */
describe('FacturasEmitidas · Ventas en el celular', () => {
  function conAncho(celular: boolean, prueba: () => Promise<void>) {
    return async () => {
      const original = window.matchMedia;
      window.matchMedia = ((consulta: string) => ({
        matches: celular && consulta.includes('max-width'),
        media: consulta,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      })) as unknown as typeof window.matchMedia;
      try {
        await prueba();
      } finally {
        window.matchMedia = original;
      }
    };
  }

  it(
    'bajo 768 px: tarjetas con cliente, número y total, el PDF y anular',
    conAncho(true, async () => {
      await pintar('ventas', { mes: '2026-10', anulacionDisponible: true, facturas: [factura()] });
      expect(host.querySelector('table')).toBeNull();
      const tarjeta = q('[data-testid="factura-3"]')!;
      expect(tarjeta.tagName).toBe('LI');
      expect(tarjeta.textContent).toContain('Juliana Sin Correo Patiño');
      expect(tarjeta.textContent).toContain('LABQA-1');
      expect(tarjeta.textContent).toContain('$ 4.100.000');
      expect(tarjeta.querySelector('[data-testid="anular-3"]')).not.toBeNull();
      await act(async () => {
        (tarjeta.querySelector('[data-testid="ventas-pdf-3"]') as HTMLButtonElement).click();
      });
      expect(descargarUnaMock).toHaveBeenCalledWith('f-1', 'LABQA-1');
    }),
  );

  it(
    'en escritorio sigue la tabla',
    conAncho(false, async () => {
      await pintar('ventas', { mes: '2026-10', anulacionDisponible: true, facturas: [factura()] });
      expect(host.querySelector('table')).not.toBeNull();
      expect(q('[data-testid="ventas-tarjetas"]')).toBeNull();
      expect(q('[data-testid="factura-3"]')!.tagName).toBe('TR');
    }),
  );
});
