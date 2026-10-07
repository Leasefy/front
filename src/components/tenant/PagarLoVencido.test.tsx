/**
 * PAGO-ONLINE (Nico, 04-10-2026): «Pagar» lo vencido — todo o las cuotas
 * escogidas, SIEMPRE de la más vieja a la más nueva, con el total antes de ir a
 * Wompi y sin sumar la comisión. Falla en HEAD: el componente no existía.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null;
let caja: HTMLDivElement | null = null;
function render(el: React.ReactElement) {
  caja = document.createElement('div');
  document.body.appendChild(caja);
  root = createRoot(caja);
  act(() => root!.render(el));
  return { unmount: () => { act(() => root!.unmount()); caja!.remove(); root = null; } };
}
afterEach(() => { if (root) act(() => root!.unmount()); caja?.remove(); root = null; });
const screen = {
  getByTestId: (id: string) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) throw new Error(`no está ${id}`);
    return el as HTMLElement;
  },
  getByText: (re: RegExp) => {
    if (!re.test(document.body.textContent ?? '')) throw new Error(`no está ${re}`);
    return true;
  },
};
const fireEvent = { click: (el: HTMLElement) => act(() => el.click()) };

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$ ${Math.round(n).toLocaleString('es-CO')}`, locale: 'es', t: (k: string) => k }),
}));

import { PagarLoVencido, mesEnPalabras, diaEnPalabras } from './PagarLoVencido';
import { totalDeLasMasViejas, type LoQueSePuedePagar } from '@/lib/api/pago-en-linea.service';

const cuota = (mes: string, valorCop: number) => ({ id: mes, cuotaId: mes, mes, vence: `${mes}-01`, vencida: true, valorCop, interesCop: 0 });
const datos = (extra: Partial<LoQueSePuedePagar> = {}): LoQueSePuedePagar => ({
  aplica: true,
  cuotas: [cuota('2026-08', 1_050_000), cuota('2026-09', 2_350_000), cuota('2026-10', 2_350_000)],
  totalVencidoCop: 5_750_000,
  enVerificacion: null,
  ultimoRechazo: null,
  ...extra,
});

describe('PagarLoVencido', () => {
  it('arranca con TODO lo vencido y el total exacto, sin comisión', () => {
    render(<PagarLoVencido leaseId="l-1" datos={datos()} />);
    expect(screen.getByTestId('pagar').textContent).toContain('5.750.000');
    expect(screen.getByText(/la comisión de la pasarela la asume la inmobiliaria/i)).toBeTruthy();
  });

  it('no se salta una vieja: quitar septiembre quita también octubre; marcar octubre marca las anteriores', () => {
    render(<PagarLoVencido leaseId="l-1" datos={datos()} />);
    fireEvent.click(screen.getByTestId('cuota-2026-09'));
    expect(screen.getByTestId('cuota-2026-09').getAttribute('aria-checked')).toBe('false');
    expect(screen.getByTestId('cuota-2026-10').getAttribute('aria-checked')).toBe('false');
    expect(screen.getByTestId('pagar').textContent).toContain('1.050.000');
    fireEvent.click(screen.getByTestId('cuota-2026-10'));
    expect(screen.getByTestId('cuota-2026-09').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByTestId('pagar').textContent).toContain('5.750.000');
    fireEvent.click(screen.getByTestId('cuota-2026-08'));
    expect((screen.getByTestId('pagar') as HTMLButtonElement).disabled).toBe(true);
  });

  it('confirma cuánto y qué cuotas antes de ir a Wompi', () => {
    render(<PagarLoVencido leaseId="l-1" datos={datos()} />);
    fireEvent.click(screen.getByTestId('pagar'));
    expect(screen.getByTestId('confirmar-pago').textContent).toContain('3 cuotas (agosto de 2026 a octubre de 2026)');
  });

  it('con un pago en verificación lo dice y no deja pagar otra vez; un rechazo se dice y deja reintentar', () => {
    const { unmount } = render(
      <PagarLoVencido leaseId="l-1" datos={datos({ enVerificacion: { solicitudId: 's', valorCop: 1_000, desde: '' } })} />,
    );
    expect(screen.getByTestId('pago-en-verificacion')).toBeTruthy();
    expect((screen.getByTestId('pagar') as HTMLButtonElement).disabled).toBe(true);
    unmount();
    render(<PagarLoVencido leaseId="l-1" datos={datos({ ultimoRechazo: { solicitudId: 's', valorCop: 1_000, motivo: null } })} />);
    expect(screen.getByTestId('pago-rechazado').textContent).toContain('puedes intentarlo de nuevo');
    expect((screen.getByTestId('pagar') as HTMLButtonElement).disabled).toBe(false);
  });

  it('el total y los meses, en palabras y al centavo', () => {
    expect(totalDeLasMasViejas(datos().cuotas, 2)).toBe(3_400_000);
    expect(totalDeLasMasViejas([cuota('2026-08', 0.1), cuota('2026-09', 0.2)], 2)).toBe(0.3);
    expect(mesEnPalabras('2026-10')).toBe('octubre de 2026');
    expect(diaEnPalabras('2026-10-01')).toBe('1 de octubre de 2026');
  });
});
