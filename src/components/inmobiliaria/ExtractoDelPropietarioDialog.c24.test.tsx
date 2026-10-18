/**
 * QA-PROP-95 C-24/F-08 (04-10-2026): un rol a medida con sólo
 * `dispersiones:view` veía el extracto Y lo mandaba por correo. Mandarlo pide
 * `dispersiones:edit` (igual que el back): sin él no se ofrece «Enviar».
 * (Arnés copiado de `ExtractoDelPropietarioDialog.test.tsx`.)
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { ExtractoPropietario as Extracto } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ getExtracto: vi.fn(), getExtractoPdf: vi.fn(), enviarExtracto: vi.fn() }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ propietariosApi: api }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// `t` estable, como el de la app (`useCallback`): el efecto que pide el extracto lo tiene en sus dependencias.
const i18n = vi.hoisted(() => ({ t: (k: string) => k, locale: 'es' }));
vi.mock('@/lib/i18n', () => ({ useI18n: () => i18n }));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: () => ({ propietarios: [{ id: 'p1', name: 'Rentas', email: 'pagos@rentas.co', phone: '601', documentType: 'CC', documentNumber: '9' }] }),
  useInmobiliariaConfig: () => ({ config: { agency: { name: 'Inmobiliaria', nit: '1', address: null, city: null } } }),
}));

import { ExtractoDelPropietarioDialog } from './ExtractoDelPropietarioDialog';

const EXTRACTO: Extracto = {
  propietarioId: 'p1',
  propietarioName: 'Rentas',
  month: '2026-10',
  generatedAt: '2026-10-03T18:00:00.000Z',
  // Con una propiedad: un extracto vacío no se ofrece para enviar (PROP-2).
  lineItems: [
    {
      cuotaId: 'q-1', cobroId: null, contractId: 'ct-1', consignacionId: 'c-1',
      propertyTitle: 'Apartamento en La Floresta', propertyAddress: 'Cra 42',
      tenantName: 'Mónica', rentAmount: 720_000, adminAmount: 0, totalAmount: 720_000, paidAmount: 720_000,
      status: 'PAID', commissionPercent: 0, commissionAmount: 0, netAmount: 720_000, rentCollected: 720_000,
      conceptosAFavor: 0, conceptosACargo: 0, deTerceros: 0,
      dispersionId: null, giradoCop: 0, enGiroCop: 0, porGirarCop: 720_000,
      estadoDelGiro: 'POR_GIRAR', renglones: [],
    },
  ],
  sinMovimiento: null,
  totals: {
    totalRent: 0, totalAdmin: 0, totalPaid: 0, totalCommission: 0, totalNet: 0,
    totalConceptosAFavor: 0, totalConceptosACargo: 0, totalDeTerceros: 0,
    totalGirado: 0, totalEnGiro: 0, totalPorGirar: 0,
  },
  bankInfo: { bankName: 'Bancolombia', bankAccountType: 'Ahorros', bankAccountNumber: '20345678912', bankAccountHolder: null },
};

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  api.getExtracto.mockReset().mockResolvedValue(EXTRACTO);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function abrir(puedeEnviar?: boolean) {
  await act(async () => {
    root.render(
      <ExtractoDelPropietarioDialog propietarioId="p1" propietarioName="Rentas" abierto onOpenChange={() => {}} puedeEnviar={puedeEnviar} />,
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('C-24/F-08 · ver el extracto no es mandarlo', () => {
  it('sin permiso para mandar: se ve y se descarga, pero no hay «Enviar»', async () => {
    await abrir(false);
    expect(document.body.querySelector('[data-testid="extracto-descargar"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="extracto-enviar"]')).toBeNull();
  });

  it('con permiso (o sin decirlo, como antes): sí está «Enviar»', async () => {
    await abrir(true);
    expect(document.body.querySelector('[data-testid="extracto-enviar"]')).not.toBeNull();
  });

  it('PROP-2 · un extracto sin propiedades (el mes que liquidó el sistema anterior) se ve, pero no se envía', async () => {
    api.getExtracto.mockReset().mockResolvedValue({ ...EXTRACTO, lineItems: [] });
    await abrir(true);
    expect(document.body.querySelector('[data-testid="extracto-descargar"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="extracto-enviar"]')).toBeNull();
  });
});
