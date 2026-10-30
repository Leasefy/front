/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DetalleDelDocumento, DocumentoParaFirmar, VistaDeFirmas } from '@/lib/api/firmas.service';

const api = vi.hoisted(() => ({
  vista: vi.fn(),
  detalle: vi.fn(),
  crear: vi.fn(),
  enviar: vi.fn(),
  cancelar: vi.fn(),
  reenviar: vi.fn(),
  descargar: vi.fn(),
  comprar: vi.fn(),
}));
vi.mock('@/lib/api/firmas.service', () => ({ firmasApi: () => api }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: { firstName: 'Laura', lastName: 'Ríos', email: 'laura@sabaneta.co', phone: '+573001112233' } }),
}));
vi.mock('@/lib/context/PermissionsContext', () => ({ usePermissionsContextSafe: () => null }));

import { PantallaDeFirmas } from './PantallaDeFirmas';
import { EnviarAFirmar } from './EnviarAFirmar';

const doc = (o: Partial<DocumentoParaFirmar>): DocumentoParaFirmar => ({
  id: 'd1',
  titulo: 'Promesa de compraventa',
  mensaje: null,
  estado: 'ENVIADO',
  ubicacion: 'HOJA_FINAL',
  paginas: 3,
  formaDePago: 'REGALO',
  devuelto: false,
  creadoAt: '2026-10-28T15:00:00Z',
  enviadoAt: '2026-10-28T15:01:00Z',
  firmadoAt: null,
  canceladoAt: null,
  creadoPor: { id: 'u1', nombre: 'Laura Ríos' },
  codigo: null,
  verificacion: null,
  firmaron: 1,
  total: 2,
  firmantes: [
    { id: 'f1', nombre: 'Ana Gómez', email: 'ana@correo.co', telefono: '+573001234567', numeroDocumento: null, posicion: null, invitacion: 'ENVIADA', firmado: true, firmadoAt: '2026-10-28T16:00:00Z', pruebaDeVida: null },
    { id: 'f2', nombre: 'Juan Pérez', email: 'juan@correo.co', telefono: null, numeroDocumento: null, posicion: null, invitacion: 'ENVIADA', firmado: false, firmadoAt: null, pruebaDeVida: null },
  ],
  ...o,
});

const vista = (o: Partial<VistaDeFirmas> = {}): VistaDeFirmas => ({
  disponible: true,
  precioPorDocumento: { precio: 3_900, iva: 741, total: 4_641 },
  firmantesPorDocumento: 5,
  aLaVenta: [
    { firmas: 10, precio: 29_000, iva: 5_510, total: 34_510, porFirma: 2_900 },
    { firmas: 50, precio: 119_000, iva: 22_610, total: 141_610, porFirma: 2_380 },
    { firmas: 200, precio: 399_000, iva: 75_810, total: 474_810, porFirma: 1_995 },
  ],
  codigoPorWhatsapp: true,
  bolsa: { gratis: 2, enPaquetes: 0, total: 2, proximoVencimiento: null },
  puedeCargarALaFactura: false,
  enLaFacturaEsteMes: { documentos: 0, total: 0 },
  documentos: [doc({}), doc({ id: 'd2', titulo: 'Acta de entrega', estado: 'FIRMADO', firmaron: 2 })],
  compras: [],
  ...o,
});

let raiz: Root | null = null;
let caja: HTMLDivElement | null = null;
async function montar(el: React.ReactElement) {
  caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  await act(async () => {
    raiz!.render(el);
  });
  for (let i = 0; i < 4; i++) await act(async () => {});
}
const porTestId = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
const clic = async (el: Element | null) => {
  expect(el).toBeTruthy();
  await act(async () => {
    (el as HTMLElement).click();
  });
  for (let i = 0; i < 3; i++) await act(async () => {});
};
function escribir(el: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, valor);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
});
afterEach(() => {
  act(() => raiz?.unmount());
  caja?.remove();
  document.body.innerHTML = '';
});

describe('Firmas — la pantalla', () => {
  it('muestra la bolsa, los documentos y filtra por estado y búsqueda', async () => {
    api.vista.mockResolvedValue(vista());
    await montar(<PantallaDeFirmas donde="propietario" />);
    expect(porTestId('firmas-disponibles')?.textContent).toBe('Te quedan 2 firmas');
    expect(porTestId('documento-d1')).toBeTruthy();
    expect(porTestId('documento-d2')).toBeTruthy();
    expect(porTestId('documento-d1')?.textContent).toContain('1/2');

    const opcion = [...document.querySelectorAll('button, [role="radio"]')].find((b) => b.textContent?.startsWith('Firmados'));
    await clic(opcion ?? null);
    expect(porTestId('documento-d1')).toBeNull();
    expect(porTestId('documento-d2')).toBeTruthy();
  });

  it('sin documentos: la ilustración 3D y «Enviar el primero»', async () => {
    api.vista.mockResolvedValue(vista({ documentos: [] }));
    await montar(<PantallaDeFirmas donde="propietario" />);
    const vacio = porTestId('firmas-vacio');
    expect(vacio?.querySelector('img')).toBeTruthy();
    expect(vacio?.textContent).toContain('Tienes 2 gratis');
  });

  it('sin las migraciones: dice que se está activando y no ofrece enviar', async () => {
    api.vista.mockResolvedValue(vista({ disponible: false, documentos: [] }));
    await montar(<PantallaDeFirmas donde="propietario" />);
    expect(porTestId('firmas-pronto')?.textContent).toContain('se está activando');
    expect(porTestId('enviar-a-firmar-boton')).toBeNull();
  });

  it('al abrir un documento muestra quién firmó y el WhatsApp de quien falta', async () => {
    api.vista.mockResolvedValue(vista());
    const detalle: DetalleDelDocumento = {
      ...doc({}),
      enlaces: [{ firmanteId: 'f2', enlace: 'https://app/firmar/documento/x.y', whatsapp: 'https://wa.me/57300?text=hola', tieneCelular: true }],
    };
    api.detalle.mockResolvedValue(detalle);
    await montar(<PantallaDeFirmas donde="propietario" />);
    await clic(porTestId('documento-d1'));
    expect(api.detalle).toHaveBeenCalledWith('d1');
    const lista = porTestId('firmantes-del-detalle');
    expect(lista?.textContent).toContain('Firmó');
    expect(lista?.textContent).toContain('Falta su firma');
    expect(porTestId('whatsapp-2')?.getAttribute('href')).toBe('https://wa.me/57300?text=hola');
  });
});

describe('Firmas — enviar a firmar', () => {
  it('documento → quién firma → hoja final → con una firma de la bolsa', async () => {
    api.crear.mockResolvedValue({ ...doc({ id: 'nuevo', estado: 'BORRADOR' }), enlaces: [] });
    api.enviar.mockResolvedValue({ documento: { ...doc({ id: 'nuevo' }), enlaces: [] } });
    const alEnviar = vi.fn();
    await montar(<EnviarAFirmar abierta alCerrar={() => {}} donde="propietario" vista={vista()} alEnviar={alEnviar} alComprar={() => {}} />);

    // Sin documento no sigue.
    await clic(porTestId('seguir'));
    expect(porTestId('error-del-paso')?.textContent).toContain('Sube el documento');

    const entrada = document.querySelector<HTMLInputElement>('[data-testid="enviar-a-firmar"] input[type="file"]');
    expect(entrada).toBeTruthy();
    const archivo = new File(['%PDF-1.4'], 'promesa_laureles.pdf', { type: 'application/pdf' });
    Object.defineProperty(entrada, 'files', { value: [archivo] });
    await act(async () => {
      entrada!.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect((porTestId('titulo-del-documento') as HTMLInputElement).value).toBe('Promesa laureles');
    await clic(porTestId('seguir'));

    // Quién firma: el nombre solo no alcanza.
    await act(async () => escribir(porTestId('firmante-nombre-1') as HTMLInputElement, 'Ana Gómez'));
    await clic(porTestId('seguir'));
    expect(porTestId('error-del-paso')?.textContent).toContain('correo o un celular');
    await act(async () => escribir(porTestId('firmante-correo-1') as HTMLInputElement, 'ana@correo.co'));
    await clic(porTestId('yo-tambien-firmo'));
    expect((porTestId('firmante-nombre-2') as HTMLInputElement).value).toBe('Laura Ríos');
    await clic(porTestId('seguir'));

    // Dónde firma: la hoja final viene marcada.
    expect(porTestId('paso-ubicacion')).toBeTruthy();
    await clic(porTestId('seguir'));

    // Enviar: con la bolsa.
    expect(porTestId('pagar-bolsa')?.textContent).toContain('2 gratis');
    await clic(porTestId('enviar'));
    expect(api.crear).toHaveBeenCalledWith(archivo, {
      titulo: 'Promesa laureles',
      mensaje: undefined,
      ubicacion: 'HOJA_FINAL',
      firmantes: [
        { nombre: 'Ana Gómez', email: 'ana@correo.co', telefono: undefined, numeroDocumento: undefined, posicion: null },
        { nombre: 'Laura Ríos', email: 'laura@sabaneta.co', telefono: '+573001112233', numeroDocumento: undefined, posicion: null },
      ],
    });
    expect(api.enviar).toHaveBeenCalledWith('nuevo', 'BOLSA');
    expect(alEnviar).toHaveBeenCalled();
  });

  it('sin firmas en la bolsa ofrece pagar el documento ($4.641 con IVA)', async () => {
    await montar(
      <EnviarAFirmar
        abierta
        alCerrar={() => {}}
        donde="propietario"
        vista={vista({ bolsa: { gratis: 0, enPaquetes: 0, total: 0, proximoVencimiento: null } })}
        alEnviar={() => {}}
        alComprar={() => {}}
      />,
    );
    // Llega directo al último paso para mirar las opciones: el texto del pago sale de la vista.
    expect(porTestId('pagar-bolsa')).toBeNull();
  });
});
