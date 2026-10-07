/**
 * EC-05 (QA-INQ-95 ronda 2): el WhatsApp del estado de cuenta sale por el chat
 * de la CUENTA del portal. A quien no tiene cuenta (Daniela, Santiago: migrados
 * sin cuenta, ruta por documento) el ítem salía prendido; ahora la página le
 * pasa `personaId = null` y el menú lo apaga diciendo por qué.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ruta = vi.hoisted(() => ({ id: '1036900105' }));
const compartir = vi.hoisted(() => vi.fn());
const obtener = vi.hoisted(() => vi.fn());
const inquilino = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: ruta.id }),
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => `/panel/inmobiliaria/estado-de-cuenta/inquilino/${ruta.id}`,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => ({ isAdmin: true, canAccess: () => true }) }));
vi.mock('@/components/estado-de-cuenta/CompartirEstadoDeCuenta', () => ({
  CompartirEstadoDeCuenta: (props: { personaId?: string | null }) => {
    compartir(props.personaId);
    return null;
  },
}));
vi.mock('@/components/estado-de-cuenta/AnticipoDelContrato', () => ({ AnticipoDelContratoSeccion: () => null }));
vi.mock('@/components/estado-de-cuenta/SaldoAFavorAlTerminar', () => ({ SaldoAFavorAlTerminarSeccion: () => null }));
vi.mock('@/components/cobranza-manual/GestionesDeLaPersona', () => ({ GestionesDeLaPersona: () => null }));
vi.mock('@/components/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/api/estado-de-cuenta.service', () => ({ estadoDeCuentaApi: { inquilino } }));
vi.mock('@/lib/api/inquilinos.service', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/api/inquilinos.service')>();
  return { ...real, inquilinosApi: { obtener } };
});

import Pagina from './page';
import { I18nProvider } from '@/lib/i18n';
import { estadoDeCuenta } from '@/components/estado-de-cuenta/ejemplo-de-prueba';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  compartir.mockReset();
  obtener.mockReset();
  inquilino.mockReset().mockImplementation(async () => estadoDeCuenta());
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function abrir() {
  await act(async () => {
    root.render(
      <I18nProvider>
        <Pagina />
      </I18nProvider>,
    );
  });
  for (let i = 0; i < 5; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}

describe('EC-05 · el WhatsApp va por la cuenta del portal', () => {
  it('sin cuenta (ruta por documento): pide la ficha como doc:<n> y el menú recibe personaId = null', async () => {
    ruta.id = '1036900105';
    obtener.mockResolvedValue({ tenantId: 'doc:1036900105', tieneCuentaDelPortal: false });
    await abrir();
    expect(obtener).toHaveBeenCalledWith('doc:1036900105');
    expect(compartir).toHaveBeenLastCalledWith(null);
  });

  it('con cuenta: el menú recibe su User.id', async () => {
    ruta.id = 'u-ivan';
    obtener.mockResolvedValue({ tenantId: 'u-ivan', tieneCuentaDelPortal: true });
    await abrir();
    expect(compartir).toHaveBeenLastCalledWith('u-ivan');
  });

  it('si la ficha no responde, queda como antes (el back dirá SIN_CUENTA)', async () => {
    ruta.id = '1036900105';
    obtener.mockRejectedValue(new Error('403'));
    await abrir();
    expect(compartir).toHaveBeenLastCalledWith('1036900105');
  });
});
