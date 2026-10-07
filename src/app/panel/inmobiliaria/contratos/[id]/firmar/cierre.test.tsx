/**
 * Firmar contrato — lo que se dice DESPUÉS de firmar tiene que ser cierto.
 *
 * 🔴 Decía: «El inquilino ya fue notificado para que firme digitalmente».
 *
 * Es imposible. En este flujo la inmobiliaria firma ÚLTIMA:
 * `ContractsService.signAsLandlord` rechaza con 400 `INQUILINO_NO_HA_FIRMADO`
 * si `contract.tenantSignature` está vacío, y al pasar deja el contrato en
 * SIGNED. O sea que cuando esta pantalla aparece, el inquilino YA firmó: no
 * hay nadie a quien notificar y no queda ningún paso. La pantalla anunciaba
 * como pendiente algo que ya había pasado, y dejaba a quien acababa de firmar
 * esperando una respuesta que no iba a llegar.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { signAsLandlordMock, pushMock } = vi.hoisted(() => ({
  signAsLandlordMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'c-1' }),
  useRouter: () => ({ push: pushMock, back: vi.fn() }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// El formulario de firma real trae OTP y canvas; acá sólo hace falta el disparo.
vi.mock('@/components/contract/SignatureForm', () => ({
  SignatureForm: ({ onSign }: { onSign: (a: unknown) => void }) => (
    <button
      data-testid="firmar"
      onClick={() => onSign({ otpVerified: true, signatureData: 'data:image/png;base64,x' })}
    >
      Firmar
    </button>
  ),
}));

const CONTRATO = {
  id: 'c-1',
  status: 'pending_landlord',
  landlordName: 'Inmobiliaria Prueba',
  tenantSignature: { at: '2026-09-01T10:00:00Z' },
  uploadedPdfPath: null,
};

// El contrato que ve la pantalla; cada prueba puede cambiarlo.
let contratoEnPantalla: Record<string, unknown> = CONTRATO;

// Los helpers que leen el error (`mensajeDelFallo`, `isPermissionError`) van
// REALES: son justamente lo que se prueba cuando el back rechaza.
vi.mock('@/lib/hooks/useContracts', async () => {
  const real = await vi.importActual<typeof import('@/lib/hooks/useContracts')>('@/lib/hooks/useContracts');
  return {
    ...real,
    useContract: () => ({
      contract: contratoEnPantalla,
      isLoading: false,
      error: null,
      setContract: vi.fn(),
    }),
    useContractPreview: () => ({ preview: null, isLoading: false }),
    useSignedPdfUrl: () => ({ url: null, isLoading: false }),
    useContractActions: () => ({ signAsLandlord: signAsLandlordMock, lastError: null }),
  };
});

import FirmarContratoPage from './page';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';

void React;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  contratoEnPantalla = CONTRATO;
  signAsLandlordMock.mockReset().mockResolvedValue({ ...CONTRATO, status: 'signed' });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('Firmar contrato — el cierre', () => {
  it('no anuncia un paso del inquilino que ya ocurrió', async () => {
    act(() => root.render(<FirmarContratoPage />));

    await act(async () => {
      (container.querySelector('[data-testid="firmar"]') as HTMLButtonElement).click();
    });

    expect(signAsLandlordMock).toHaveBeenCalledTimes(1);
    const cierre = container.querySelector('[data-testid="firmado-cierre"]');
    expect(cierre).not.toBeNull();
    // La frase falsa, y cualquier variante que prometa una firma futura.
    expect(container.textContent).not.toContain('ya fue notificado');
    expect(cierre!.textContent).toContain('Firmaron las dos partes');
  });

  it('antes de firmar no dice que firmar «lo envía al inquilino»', () => {
    act(() => root.render(<FirmarContratoPage />));
    // El inquilino ya firmó: firmar acá cierra, no envía.
    expect(container.textContent).not.toContain('para enviarlo al inquilino');
    expect(container.textContent).toContain('El inquilino ya firmó');
  });
});

/**
 * 🔴 C26 — antes estas tres ramas eran inalcanzables: `signAsLandlord` nunca
 * lanzaba y `actions.lastError` se leía del render viejo. Todo rechazo decía
 * «No se pudo firmar el contrato. Intenta de nuevo.»
 */
describe('Firmar contrato — cuando el back rechaza, se dice el motivo', () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear();
  });

  async function firmar() {
    act(() => root.render(<FirmarContratoPage />));
    await act(async () => {
      (container.querySelector('[data-testid="firmar"]') as HTMLButtonElement).click();
      await Promise.resolve();
    });
  }

  it('🔴 400 `INQUILINO_NO_HA_FIRMADO` → la pantalla dice lo mismo que de entrada: aviso visible y botón apagado', async () => {
    const message = 'El inquilino todavía no firmó. Puedes firmar como arrendador cuando él lo haga.';
    signAsLandlordMock.mockReset().mockRejectedValue(
      new ApiError(400, message, 'INQUILINO_NO_HA_FIRMADO', {
        statusCode: 400,
        code: 'INQUILINO_NO_HA_FIRMADO',
        message,
      }),
    );
    await firmar();
    // Ni toast que se va ni el genérico: el aviso queda en la pantalla.
    expect(toast.error).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="firmado-cierre"]')).toBeNull();
    const bloqueo = container.querySelector('[data-testid="firma-bloqueada"]');
    expect(bloqueo).not.toBeNull();
    expect(bloqueo!.textContent).toContain('El inquilino todavía no ha firmado');
    const boton = container.querySelector('[data-testid="firmar-como-arrendador-apagado"]') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    // El formulario que dispara la firma ya no está: no se puede reintentar a ciegas.
    expect(container.querySelector('[data-testid="firmar"]')).toBeNull();
    expect(container.textContent).not.toContain('El inquilino ya firmó');
  });

  it('🔴 se decide por el CÓDIGO, no por el texto: un 400 con la frase pero sin el código no apaga la firma', async () => {
    signAsLandlordMock
      .mockReset()
      .mockRejectedValue(new ApiError(400, 'El inquilino todavía no ha firmado. Tenant must sign first'));
    await firmar();
    expect(container.querySelector('[data-testid="firma-bloqueada"]')).toBeNull();
    expect(container.querySelector('[data-testid="firmar"]')).not.toBeNull();
    expect(toast.error).toHaveBeenCalledWith('No se pudo firmar el contrato.', expect.anything());
  });

  it('403 → dice que es de permisos', async () => {
    signAsLandlordMock.mockReset().mockRejectedValue(new ApiError(403, 'Forbidden resource'));
    await firmar();
    expect(toast.error).toHaveBeenCalledWith('No tienes permisos para esta acción.');
  });

  it('cualquier otro rechazo → el motivo del back en la descripción, no un genérico', async () => {
    signAsLandlordMock
      .mockReset()
      .mockRejectedValue(new ApiError(409, 'Este contrato no está pendiente de tu firma.'));
    await firmar();
    expect(toast.error).toHaveBeenCalledWith('No se pudo firmar el contrato.', {
      description: 'Este contrato no está pendiente de tu firma.',
    });
    expect(container.querySelector('[data-testid="firmado-cierre"]')).toBeNull();
  });

  it('🔴 02-10 · un 5xx dice que falló de nuestro lado, con la referencia, y no culpa a la conexión', async () => {
    signAsLandlordMock.mockReset().mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        referencia: 'f1e2d3c4',
      }),
    );
    await firmar();
    const [titulo, opciones] = vi.mocked(toast.error).mock.calls[0] as [string, { description: string }];
    expect(titulo).toBe('No se pudo firmar el contrato.');
    expect(opciones.description).toContain('No pudimos firmar el contrato: algo falló de nuestro lado.');
    expect(opciones.description).toContain('f1e2d3c4');
    expect(opciones.description).not.toContain('conexión');
  });

  it('🔴 02-10 · sin respuesta (status 0) habla de la conexión', async () => {
    signAsLandlordMock.mockReset().mockRejectedValue(new ApiError(0, 'Failed to fetch'));
    await firmar();
    const [, opciones] = vi.mocked(toast.error).mock.calls[0] as [string, { description: string }];
    expect(opciones.description).toContain('conexión');
  });
});

/**
 * 🔴 Nico (02-10-2026): si el inquilino todavía no ha firmado, el botón de
 * firmar como arrendador sale APAGADO y la pantalla lo explica ANTES de
 * intentar — no después del 400. Y un botón apagado necesita su motivo a la
 * vista, no sólo un `title` («un botón apagado puede tapar una trampa»).
 */
describe('Firmar contrato — el inquilino todavía no ha firmado', () => {
  function comprobarBloqueo() {
    const bloqueo = container.querySelector('[data-testid="firma-bloqueada"]');
    expect(bloqueo).not.toBeNull();
    const motivo = container.querySelector('#firma-bloqueada-motivo');
    expect(motivo).not.toBeNull();
    expect(motivo!.textContent).toContain('El inquilino todavía no ha firmado');
    const boton = container.querySelector('[data-testid="firmar-como-arrendador-apagado"]') as HTMLButtonElement;
    expect(boton).not.toBeNull();
    expect(boton.disabled).toBe(true);
    expect(boton.textContent).toContain('Firmar como arrendador');
    // El motivo está atado al botón y se ve: no vive en un `title`.
    expect(boton.getAttribute('aria-describedby')).toBe('firma-bloqueada-motivo');
    expect(boton.getAttribute('title')).toBeNull();
    // No hay forma de disparar la firma, y no se dice lo contrario.
    expect(container.querySelector('[data-testid="firmar"]')).toBeNull();
    expect(container.textContent).not.toContain('El inquilino ya firmó');
    expect(signAsLandlordMock).not.toHaveBeenCalled();
  }

  it('🔴 pendiente del arrendador pero sin la firma del inquilino → botón apagado y el motivo a la vista, sin pedir nada al back', () => {
    contratoEnPantalla = { ...CONTRATO, tenantSignature: null };
    act(() => root.render(<FirmarContratoPage />));
    comprobarBloqueo();
  });

  it('🔴 contrato pendiente del inquilino → lo mismo, en vez de «no está pendiente de tu firma»', () => {
    contratoEnPantalla = { ...CONTRATO, status: 'pending_tenant', tenantSignature: null };
    act(() => root.render(<FirmarContratoPage />));
    comprobarBloqueo();
    expect(container.querySelector('[data-testid="firmar-no-pendiente"]')).toBeNull();
  });

  it('con la firma del inquilino → el formulario de firma de siempre, sin el aviso', () => {
    act(() => root.render(<FirmarContratoPage />));
    expect(container.querySelector('[data-testid="firma-bloqueada"]')).toBeNull();
    expect(container.querySelector('[data-testid="firmar"]')).not.toBeNull();
  });

  it('un contrato ya firmado o en borrador sigue diciendo que no está pendiente de tu firma', () => {
    contratoEnPantalla = { ...CONTRATO, status: 'signed' };
    act(() => root.render(<FirmarContratoPage />));
    expect(container.querySelector('[data-testid="firmar-no-pendiente"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="firma-bloqueada"]')).toBeNull();
    act(() => root.unmount());
    root = createRoot(container);
    contratoEnPantalla = { ...CONTRATO, status: 'draft', tenantSignature: null };
    act(() => root.render(<FirmarContratoPage />));
    expect(container.querySelector('[data-testid="firmar-no-pendiente"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="firma-bloqueada"]')).toBeNull();
  });
});
