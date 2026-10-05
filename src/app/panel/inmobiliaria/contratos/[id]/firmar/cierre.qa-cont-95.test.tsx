/**
 * QA-CONT-95 (04-10-2026) — firmar contrato con el estado REAL después de firmar.
 *
 * 🔴 En el navegador, al firmar la admin, la pantalla decía «Este contrato no
 * está pendiente de tu firma · Está en Activo»: `setContract(updated)` dejaba
 * el contrato en `active`/`signed` y el aviso de «no pendiente» iba antes que
 * el éxito. La prueba vieja no lo veía porque su `setContract` no cambiaba nada.
 *
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
  const R = await vi.importActual<typeof import('react')>('react');
  return {
    ...real,
    useContract: () => {
      const [contract, setContract] = R.useState<Record<string, unknown>>(contratoEnPantalla);
      return { contract, isLoading: false, error: null, setContract };
    },
    useContractPreview: () => ({ preview: null, isLoading: false }),
    useSignedPdfUrl: () => ({ url: null, isLoading: false }),
    useContractActions: () => ({ signAsLandlord: signAsLandlordMock, lastError: null }),
  };
});

import FirmarContratoPage from './page';
import { toast } from 'sonner';

void React;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  contratoEnPantalla = CONTRATO;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('QA-CONT-95 · firmar como propietario con el estado que devuelve la firma', () => {
  it('🔴 si la firma deja el contrato ACTIVO, se ve el éxito (no «no está pendiente de tu firma») y el toast no dice «Proceso completado»', async () => {
    signAsLandlordMock.mockReset().mockResolvedValue({ ...CONTRATO, status: 'active' });
    act(() => root.render(<FirmarContratoPage />));
    await act(async () => {
      (container.querySelector('[data-testid="firmar"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="firmar-no-pendiente"]')).toBeNull();
    expect(container.querySelector('[data-testid="firmado-cierre"]')!.textContent).toContain('ya está activo');
    expect(vi.mocked(toast.success).mock.calls.flat().join(' ')).not.toContain('Proceso completado');
  });

  it('si queda FIRMADO por activar, dice que se activa en su fecha de inicio', async () => {
    signAsLandlordMock.mockReset().mockResolvedValue({ ...CONTRATO, status: 'signed' });
    act(() => root.render(<FirmarContratoPage />));
    await act(async () => {
      (container.querySelector('[data-testid="firmar"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="firmar-no-pendiente"]')).toBeNull();
    expect(container.querySelector('[data-testid="firmado-cierre"]')!.textContent).toContain('se activa en su fecha de inicio');
  });
});
