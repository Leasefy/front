/**
 * 🔴 ARREGLOS-3 (03-10-2026; Nico, la recomendada «a» de PRUEBAS-PAGOS): el acta
 * de devolución no se podía cerrar desde el producto — no había pantalla para
 * las FOTOS POR ESPACIO (obligatorias) ni manera de FIRMAR desde el panel ni un
 * camino para el inquilino.
 *
 * Lo que se cuida:
 *   · los espacios del inventario del acta salen para subirles fotos; subir manda
 *     la foto con SU espacio y SU clave; una foto que no sirve se dice sin subir;
 *   · «Firmar como asesor» abre el trazo y manda la firma dibujada; si con ella se
 *     cierra el acta, dice qué pasó con el cargo aparte (la cuota de cierre);
 *   · «Pedirle la firma» arma el enlace: lo muestra para copiar y dice si el
 *     correo salió (en este entorno, «apagado»: que lo copie);
 *   · con la firma del inquilino, las fotos ya no se pueden cambiar.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { ActaConSusArchivos } from '@/lib/api/firma-del-acta.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  api: {
    detalle: vi.fn(),
    subirFoto: vi.fn(),
    borrarFoto: vi.fn(),
    firmarComoAsesor: vi.fn(),
    enlaceDelInquilino: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  puede: true,
}));

vi.mock('@/lib/api/firma-del-acta.service', async (original) => ({
  ...(await original<typeof import('@/lib/api/firma-del-acta.service')>()),
  firmaDelActaApi: h.api,
}));
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }));
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => ({
    canAccess: (m: string, a: string) => h.puede && m === 'contratos' && a === 'edit',
  }),
}));
vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}));
// El lienzo de la firma: un botón que «dibuja» un PNG.
vi.mock('@/components/contract/SignaturePad', () => ({
  SignaturePad: ({ onChange }: { onChange: (d: string | null) => void }) => (
    <button type="button" data-testid="dibujar" onClick={() => onChange('data:image/png;base64,iVBORw0KGgo=')}>
      dibujar
    </button>
  ),
}));

import { FotosYFirmasDelActa } from './FotosYFirmasDelActa';

const ACTA = { id: 'acta-1', type: 'devolucion' as const, rooms: ['sala', 'cocina'] as never };

function detalle(over: Partial<ActaConSusArchivos> = {}): ActaConSusArchivos {
  return {
    id: 'acta-1',
    type: 'DEVOLUCION',
    status: 'ACTA_IN_PROGRESS',
    fotosDelActa: [],
    firmas: [],
    paraFirmar: {
      fotos: { completas: false, motivo: 'Faltan las fotos por espacio.', espacios: 0 },
      asesor: { firmo: false, nombre: null, firmadaEl: null },
      inquilino: { firmo: false, nombre: 'Pedro Prueba', firmadaEl: null, correo: 'p***@example.test' },
      enlace: { sePuede: false, porQueNo: 'Faltan las fotos por espacio. El inquilino firma lo que ve.' },
    },
    ...over,
  };
}

const CON_FOTOS = detalle({
  fotosDelActa: [{ espacio: 'Sala', clave: 'sala', fotos: [{ ruta: 'actas/a/acta-1/fotos/1.jpg', url: 'http://s/1.jpg' }] }],
  paraFirmar: {
    fotos: { completas: true, motivo: null, espacios: 1 },
    asesor: { firmo: false, nombre: null, firmadaEl: null },
    inquilino: { firmo: false, nombre: 'Pedro Prueba', firmadaEl: null, correo: 'p***@example.test' },
    enlace: { sePuede: true, porQueNo: null },
  },
});

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  Object.values(h.api).forEach((f) => f.mockReset());
  Object.values(h.toast).forEach((f) => f.mockReset());
  h.puede = true;
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function montar(onCambio = vi.fn()) {
  await act(async () => {
    root.render(<FotosYFirmasDelActa acta={ACTA} onCambio={onCambio} />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  return onCambio;
}

const q = (id: string, en: ParentNode = document) => en.querySelector<HTMLElement>(`[data-testid="${id}"]`);
const todos = (id: string) => Array.from(document.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`));
async function clic(el: Element | null) {
  expect(el).not.toBeNull();
  await act(async () => {
    (el as HTMLElement).click();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe('<FotosYFirmasDelActa> — las fotos por espacio', () => {
  it('🔴 los espacios del inventario del acta salen para subirles fotos, y dice cuáles faltan', async () => {
    h.api.detalle.mockResolvedValue(detalle());
    await montar();
    const espacios = todos('espacio-del-acta').map((e) => e.textContent ?? '');
    expect(espacios[0]).toContain('Sala');
    expect(espacios[1]).toContain('Cocina');
    expect(q('espacios-sin-fotos')?.textContent).toContain('Sala, Cocina');
    // Sin fotos no se firma: no se ofrece el botón del asesor ni el enlace.
    expect(q('firmar-como-asesor')).toBeNull();
    expect(q('enlace-por-que-no')?.textContent).toContain('Faltan las fotos');
  });

  it('🔴 subir manda la foto con SU espacio y SU clave, y pinta lo que devuelve el back', async () => {
    // Después de subir se vuelve a leer: con fotos, ya se puede firmar.
    h.api.detalle.mockResolvedValueOnce(detalle()).mockResolvedValue(CON_FOTOS);
    h.api.subirFoto.mockResolvedValue({
      ruta: 'actas/a/acta-1/fotos/2.jpg',
      fotosDelActa: [{ espacio: 'Cocina', clave: 'cocina', fotos: [{ ruta: 'actas/a/acta-1/fotos/2.jpg', url: 'http://s/2.jpg' }] }],
    });
    await montar();
    const input = todos('subir-foto-del-espacio')[1] as HTMLInputElement; // Cocina
    const foto = new File([new Uint8Array([1, 2, 3])], 'cocina.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [foto], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(h.api.subirFoto).toHaveBeenCalledWith('acta-1', foto, 'Cocina', 'cocina');
    // 🔴 Lo que falta para firmar se vuelve a leer (antes quedaba «faltan las fotos» y no aparecía «Firmar»).
    await act(async () => {
      await Promise.resolve();
    });
    expect(h.api.detalle).toHaveBeenCalledTimes(2);
    expect(q('firmar-como-asesor')).not.toBeNull();
  });

  it('una foto que no sirve (un PDF) se dice y no se sube', async () => {
    h.api.detalle.mockResolvedValue(detalle());
    await montar();
    const input = todos('subir-foto-del-espacio')[0] as HTMLInputElement;
    const pdf = new File([new Uint8Array([1])], 'sala.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [pdf], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(h.api.subirFoto).not.toHaveBeenCalled();
    expect(q('fotos-aviso')?.textContent).toContain('JPG, PNG o WebP');
  });

  it('🔴 con la firma del inquilino, las fotos ya no se cambian (ni subir ni borrar)', async () => {
    h.api.detalle.mockResolvedValue(
      detalle({
        ...CON_FOTOS,
        firmas: [{ papel: 'INQUILINO', nombre: 'Pedro Prueba', firmadaEl: '2026-10-03T15:00:00.000Z', firmaUrl: null }],
        paraFirmar: { ...CON_FOTOS.paraFirmar, inquilino: { ...CON_FOTOS.paraFirmar.inquilino, firmo: true } },
      }),
    );
    await montar();
    expect(q('subir-foto-del-espacio')).toBeNull();
    expect(q('borrar-foto')).toBeNull();
    expect(q('acta-fotos-por-espacio')?.textContent).toContain('El inquilino ya firmó con estas fotos');
  });
});

describe('<FotosYFirmasDelActa> — las firmas', () => {
  it('🔴 «Firmar como asesor» manda la firma DIBUJADA; si cierra el acta, dice qué pasó con la cuota de cierre', async () => {
    h.api.detalle.mockResolvedValue(CON_FOTOS);
    h.api.firmarComoAsesor.mockResolvedValue({
      ...CON_FOTOS,
      status: 'ACTA_COMPLETED',
      firmas: [
        { papel: 'INQUILINO', nombre: 'Pedro Prueba', firmadaEl: '2026-10-03T15:00:00.000Z' },
        { papel: 'ASESOR', nombre: 'Ana Admin', firmadaEl: '2026-10-03T15:05:00.000Z', firmaUrl: 'http://s/firma.png' },
      ],
      cargoAparte: {
        estado: 'CUOTA_DE_CIERRE',
        valorCop: 500_000,
        mensaje: '$500.000 en una cuota de cierre que vence el 8 de octubre.',
        vence: '2026-10-08',
      },
    });
    const onCambio = await montar();
    await clic(q('firmar-como-asesor'));
    // El botón del diálogo espera el trazo.
    expect((q('confirmar-firma-del-asesor') as HTMLButtonElement).disabled).toBe(true);
    await clic(q('dibujar'));
    await clic(q('confirmar-firma-del-asesor'));

    expect(h.api.firmarComoAsesor).toHaveBeenCalledWith('acta-1', 'data:image/png;base64,iVBORw0KGgo=');
    expect(q('acta-cerrada')?.textContent).toContain('cuota de cierre que vence el 8 de octubre');
    expect(h.toast.success).toHaveBeenCalledWith('El acta quedó cerrada', expect.anything());
    expect(onCambio).toHaveBeenCalled();
    expect(q('firma-del-asesor')?.querySelector('img')?.getAttribute('src')).toBe('http://s/firma.png');
  });

  it('el error de la firma se dice dentro del diálogo, con la frase del back', async () => {
    h.api.detalle.mockResolvedValue(CON_FOTOS);
    const { ApiError } = await import('@/lib/api/client');
    h.api.firmarComoAsesor.mockRejectedValue(
      new ApiError(409, 'El asesor ya firmó esta acta.', 'YA_FIRMO_EL_ASESOR', {
        statusCode: 409,
        code: 'YA_FIRMO_EL_ASESOR',
        message: 'El asesor ya firmó esta acta.',
      }),
    );
    await montar();
    await clic(q('firmar-como-asesor'));
    await clic(q('dibujar'));
    await clic(q('confirmar-firma-del-asesor'));
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('El asesor ya firmó esta acta.');
  });

  it('🔴 «Pedirle la firma» muestra el enlace para copiar y dice que el correo está apagado en este entorno', async () => {
    h.api.detalle.mockResolvedValue(CON_FOTOS);
    h.api.enlaceDelInquilino.mockResolvedValue({
      enlace: 'http://localhost:3099/firmar/acta/tok.abc',
      venceEl: '2026-10-10T15:00:00.000Z',
      enviadoA: 'p***@example.test',
      envio: 'SIMULADO',
    });
    await montar();
    expect(q('firma-del-inquilino')?.textContent).toContain('p***@example.test');
    await clic(q('pedir-firma-del-inquilino'));
    expect(h.api.enlaceDelInquilino).toHaveBeenCalledWith('acta-1');
    const enlace = q('enlace-del-inquilino')!;
    expect(enlace.querySelector('input')?.value).toBe('http://localhost:3099/firmar/acta/tok.abc');
    expect(enlace.textContent).toContain('Copia el enlace');
  });

  it('sin permiso para editar contratos no ofrece firmar ni pedir la firma', async () => {
    h.puede = false;
    h.api.detalle.mockResolvedValue(CON_FOTOS);
    await montar();
    expect(q('firmar-como-asesor')).toBeNull();
    expect(q('pedir-firma-del-inquilino')).toBeNull();
    expect(q('subir-foto-del-espacio')).toBeNull();
  });
});
