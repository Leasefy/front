/**
 * @vitest-environment happy-dom
 *
 * El asistente de dispersión — «Recaudado» sobre un canon que nadie pagó.
 *
 * 🔴 El paso «Netos» decía «Recaudado» sobre el canon de la vista previa, y el
 * back liquida por defecto con base CAUSADO: el canon de la cuota del mes, haya
 * pagado el inquilino o no. El rótulo sigue a `previa.base`; ningún número
 * cambia. Se recorren los cuatro primeros pasos, que son los que muestran el
 * canon, con el desglose por inmueble real.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({
          children,
          whileHover,
          whileTap,
          initial,
          animate,
          exit,
          transition,
          layout,
          ...rest
        }: Record<string, unknown> & { children?: React.ReactNode }) => {
          void whileHover; void whileTap; void initial; void animate; void exit; void transition; void layout;
          return React.createElement(tag, rest, children);
        },
    },
  ),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('@/components/ui/toast', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), info: vi.fn(), loading: vi.fn() }),
}));

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useDispersiones: () => ({ dispersiones: [] }),
}));

const preview = vi.fn();
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  dispersionesApi: {
    preview: (m: string) => preview(m),
    generate: vi.fn(),
  },
}));

import { DispersionWizard } from './DispersionWizard';

function vistaPrevia(base?: 'CAUSADO' | 'RECAUDADO') {
  return {
    month: '2026-09',
    ...(base ? { base } : {}),
    totalPropietarios: 1,
    yaGenerados: 0,
    totalAGirar: 1_800_000,
    totalComisiones: 200_000,
    propietarios: [
      {
        propietarioId: 'p-1',
        propietarioName: 'Jorge Restrepo',
        propietarioBankName: 'Bancolombia',
        propietarioBankAccount: '123456',
        yaExiste: false,
        totalCollected: 2_000_000,
        totalCommission: 200_000,
        totalConceptosAFavor: 0,
        totalConceptosACargo: 0,
        totalDeTerceros: 0,
        netToPropietario: 1_800_000,
        items: [
          {
            cobroId: null,
            cuotaId: 'cuota-1',
            propertyTitle: 'Apto 302 · Laureles',
            rentCollected: 2_000_000,
            commissionPercent: 10,
            commissionAmount: 200_000,
            netAmount: 1_800_000,
            conceptosAFavor: 0,
            conceptosACargo: 0,
            deTerceros: 0,
          },
        ],
      },
    ],
  };
}

let host: HTMLDivElement;
let root: Root;

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<DispersionWizard initialMonth="2026-09" onComplete={vi.fn()} />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function siguiente() {
  const avanzar = Array.from(host.querySelectorAll('button')).find(
    (el) => el.textContent?.includes('Siguiente') || el.textContent?.includes('Elegir a quién'),
  );
  if (!avanzar) throw new Error('No hay botón para avanzar de paso');
  await act(async () => {
    (avanzar as HTMLButtonElement).click();
  });
}

/** Abre el desglose por inmueble del paso 3, que arranca plegado. */
async function desplegarElDesglose() {
  const desplegar = Array.from(host.querySelectorAll('button[aria-expanded="false"]')).find((b) =>
    b.textContent?.includes('propiedad'),
  );
  if (!desplegar) throw new Error('No está el desglose por inmueble');
  await act(async () => {
    (desplegar as HTMLButtonElement).click();
  });
}

const q = (testid: string) => host.querySelector(`[data-testid="${testid}"]`);

beforeEach(() => {
  preview.mockReset();
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
});

describe('DispersionWizard — el canon dice su base', () => {
  it('🔴 con base CAUSADO ningún paso dice «recaudado» ni «recibido»', async () => {
    preview.mockResolvedValue(vistaPrevia('CAUSADO'));
    await montar();

    await siguiente(); // 2 · Cuotas
    expect(host.textContent).toContain('No depende de que el inquilino haya pagado.');
    expect(host.textContent).not.toMatch(/recaud|recibid/i);

    await siguiente(); // 3 · Comisiones
    await desplegarElDesglose();
    expect(q('desglose-columna-canon')?.textContent?.trim()).toBe('Canon causado');
    expect(host.textContent).not.toMatch(/recaud|recibid/i);

    await siguiente(); // 4 · Netos
    expect(q('asistente-rotulo-canon')?.textContent).toBe('Canon causado');
    expect(host.textContent).not.toMatch(/recaud|recibid/i);
  });

  it('🔴 sin `base` en la vista previa es la del back por defecto: CAUSADO', async () => {
    preview.mockResolvedValue(vistaPrevia());
    await montar();

    await siguiente();
    await siguiente();
    await siguiente();
    expect(q('asistente-rotulo-canon')?.textContent).toBe('Canon causado');
    expect(host.textContent).not.toMatch(/recaud|recibid/i);
  });

  it('con base RECAUDADO dice «Canon recaudado», y el paso 2 no promete que no depende del pago', async () => {
    preview.mockResolvedValue(vistaPrevia('RECAUDADO'));
    await montar();

    await siguiente();
    expect(host.textContent).not.toContain('No depende de que el inquilino haya pagado.');

    await siguiente();
    await siguiente();
    expect(q('asistente-rotulo-canon')?.textContent).toBe('Canon recaudado');
  });
});
