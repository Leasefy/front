/**
 * Firmar contrato — lo que se dice DESPUÉS de firmar tiene que ser cierto.
 *
 * 🔴 Decía: «El inquilino ya fue notificado para que firme digitalmente».
 *
 * Es imposible. En este flujo la inmobiliaria firma ÚLTIMA:
 * `ContractsService.signAsLandlord` rechaza con «Tenant must sign first» si
 * `contract.tenantSignature` está vacío, y al pasar deja el contrato en
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

vi.mock('@/lib/hooks/useContracts', () => ({
  useContract: () => ({
    contract: CONTRATO,
    isLoading: false,
    error: null,
    setContract: vi.fn(),
  }),
  useContractPreview: () => ({ preview: null, isLoading: false }),
  useSignedPdfUrl: () => ({ url: null, isLoading: false }),
  useContractActions: () => ({ signAsLandlord: signAsLandlordMock, lastError: null }),
  isPermissionError: () => false,
}));

import FirmarContratoPage from './page';

void React;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
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
