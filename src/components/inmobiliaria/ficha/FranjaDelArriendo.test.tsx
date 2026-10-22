/**
 * La franja de la portada (revisión de diseño 21-10-2026): quién vive, hasta
 * cuándo y quién lo lleva. Heredó las pruebas de «Arriendo actual»
 * (`CurrentLeaseSection`, que se fue de la ficha) con sus mismas reglas:
 *
 * 🔴 Nico, 2026-09-12: «no veo como información en el inmueble al inquilino,
 * que también se debería de poder hablarle por mensajes de Leasefy».
 *
 * Lo que se fija acá:
 *  · El inquilino del contrato vigente manda sobre `currentTenantName`, que
 *    es una copia suelta que la activación escribe.
 *  · El botón de Leasefy sólo aparece con cuenta de portal — sin cuenta no
 *    hay a quién escribirle.
 *  · «Ver contrato» deja de ser un botón apagado: ahora se sabe CUÁL contrato.
 *  · Un back anterior al 2026-09-12 no manda `inquilino`, y la tarjeta tiene
 *    que seguir mostrando lo que siempre mostró.
 */

import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Consignacion, InquilinoDeLaConsignacion } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, formatDate: () => '31 dic 2026' }),
}));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

import { FranjaDelArriendo, type AsesorDeLaFicha } from './FranjaDelArriendo';

const INQUILINO: InquilinoDeLaConsignacion = {
  contractId: 'contract-9',
  nombre: 'Veronica Durango Montoya',
  documento: '1007102565',
  correo: 'veronica@example.com',
  telefono: '3014691688',
  cuentaDePortalId: 'user-veronica',
};

const consignacion = (over: Partial<Consignacion> = {}): Consignacion =>
  ({
    id: 'consig-1',
    availability: 'rented',
    currentTenantName: 'VERONICA DURANGO MONTOYA',
    monthlyRent: 1_500_000,
    leaseEndDate: '2026-12-31',
    ...over,
  }) as Consignacion;

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => container.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

// 21-10-2026: el día de la revisión. El fin del arriendo de las pruebas (31-12-2026) queda «en 2 meses».
const HOY = new Date(2026, 9, 21, 15, 0);

async function pintar(
  c: Consignacion,
  extra: { asesor?: AsesorDeLaFicha | null; onAsignarAsesor?: () => void; cargandoAsesor?: boolean; vacancia?: Parameters<typeof FranjaDelArriendo>[0]['vacancia'] } = {},
) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<FranjaDelArriendo consignacion={c} asesor={extra.asesor ?? null} hoy={HOY} {...extra} />);
  });
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
});

describe('<FranjaDelArriendo> — el inquilino', () => {
  it('🔴 muestra su nombre, su documento y las tres formas de hablarle', async () => {
    await pintar(consignacion({ inquilino: INQUILINO }));

    expect(q('inquilino-nombre')?.textContent).toBe('Veronica Durango Montoya');
    expect(container.querySelector('a[href="mailto:veronica@example.com"]')).not.toBeNull();
    expect(container.querySelector('a[href="tel:3014691688"]')).not.toBeNull();
    expect(q('contacto-inquilino')?.textContent).toContain('Mensaje');
  });

  /* «Documento» y no «CC»: el tipo no se guarda en ningún lado. */
  it('el documento acompaña al rótulo sin inventarle la sigla', async () => {
    await pintar(consignacion({ inquilino: INQUILINO }));

    expect(container.textContent).toContain('Documento 1007102565');
    expect(container.textContent).not.toContain('CC 1007102565');
  });

  /*
   * 🔴 Sin cuenta no se ofrece escribirle — y se DICE por qué. Un hueco se lee
   * como «falta la función», que es exactamente lo que le pasó a Nico con la
   * ficha del propietario el 2026-09-12. Son 16 de 730 en la cartera real.
   */
  it('sin cuenta de portal lo dice, y manda a donde se reenvía la invitación', async () => {
    await pintar(consignacion({ inquilino: { ...INQUILINO, cuentaDePortalId: null } }));

    expect(q('contacto-inquilino')?.textContent).not.toContain('Mensaje');
    expect(q('inquilino-sin-cuenta')?.textContent).toContain('Todavía no tiene cuenta');
    expect(q('inquilino-sin-cuenta')?.textContent).toContain('Reenviar la invitación');
    expect(
      q('inquilino-sin-cuenta')?.querySelector('a[href="/panel/inmobiliaria/inquilinos"]'),
    ).not.toBeNull();
    // Y el correo y el teléfono siguen: se puede llamar igual.
    expect(container.querySelector('a[href^="mailto:"]')).not.toBeNull();
  });

  it('con cuenta no aparece ningún aviso: no hay nada que explicar', async () => {
    await pintar(consignacion({ inquilino: INQUILINO }));

    expect(q('inquilino-sin-cuenta')).toBeNull();
  });

  /*
   * 🔴 Estuvo apagado con un «próximamente» desde siempre, no porque la
   * pantalla faltara sino porque acá no se sabía cuál contrato era.
   */
  it('«Ver contrato» lleva al contrato, y sabe de dónde se vino', async () => {
    await pintar(consignacion({ inquilino: INQUILINO }));

    const enlace = q('ver-contrato-del-inquilino') as HTMLAnchorElement | null;
    expect(enlace).not.toBeNull();
    expect(enlace!.getAttribute('href')).toBe(
      '/panel/inmobiliaria/contratos/contract-9?volver=' +
        encodeURIComponent('/panel/inmobiliaria/inmuebles/consig-1'),
    );
  });

  /*
   * El contrato es el hecho; `availability` es una columna que alguien pudo
   * dejar sin actualizar. Con contrato vigente hay inquilino igual.
   */
  it('con contrato vigente se muestra aunque la disponibilidad diga otra cosa', async () => {
    await pintar(consignacion({ availability: 'available', inquilino: INQUILINO }));

    expect(q('inquilino-nombre')?.textContent).toBe('Veronica Durango Montoya');
  });

  it('un back que todavía no manda el inquilino sigue mostrando el nombre suelto', async () => {
    await pintar(consignacion({ inquilino: null }));

    expect(q('inquilino-nombre')?.textContent).toBe('VERONICA DURANGO MONTOYA');
    // Y no inventa contacto donde no lo hay.
    expect(q('contacto-inquilino')).toBeNull();
    expect(q('ver-contrato-del-inquilino')).toBeNull();
  });

  it('un inmueble disponible y sin contrato dice que no hay inquilino', async () => {
    await pintar(
      consignacion({ availability: 'available', currentTenantName: undefined, inquilino: null }),
    );

    expect(q('inquilino-nombre')).toBeNull();
    expect(container.textContent).toContain('noTenant');
  });
});

describe('<FranjaDelArriendo> — hasta cuándo y quién lo lleva (revisión 21-10)', () => {
  it('el fin del arriendo dice la fecha y cuánto falta', async () => {
    await pintar(consignacion({ inquilino: INQUILINO }));
    expect(q('fin-del-arriendo')?.textContent).toBe('31 dic 2026');
    expect(q('falta-para-el-fin')?.textContent).toBe('en 2 meses');
  });

  it('sin inquilino no hay «Termina el», y la vacancia se dice', async () => {
    await pintar(consignacion({ availability: 'available', currentTenantName: undefined, inquilino: null }), {
      vacancia: { vacante: true, dias: 42, desde: '2026-09-09', fuente: 'FIN_DEL_CONTRATO' } as never,
    });
    expect(q('fin-del-arriendo')).toBeNull();
    expect(q('ficha-dias-vacante')?.textContent).toBe('Vacante hace 42 días');
  });

  it('sin nadie a cargo ofrece «Asignar asesor», y lo abre', async () => {
    const onAsignarAsesor = vi.fn();
    await pintar(consignacion({ inquilino: INQUILINO }), { asesor: null, onAsignarAsesor });
    expect(q('asesor-de-la-ficha')?.textContent).toContain('Nadie a cargo');
    act(() => q('asignar-asesor')?.click());
    expect(onAsignarAsesor).toHaveBeenCalledTimes(1);
  });

  it('con alguien a cargo dice quién y su rol; mientras se busca, no dice «nadie»', async () => {
    await pintar(consignacion({ inquilino: INQUILINO }), { asesor: { nombre: 'Laura Gómez', rol: 'Asesora' } });
    expect(q('asesor-de-la-ficha')?.textContent).toContain('Laura Gómez');
    expect(q('asesor-de-la-ficha')?.textContent).toContain('Asesora');
    act(() => root?.unmount());
    root = null;
    container.remove();
    await pintar(consignacion({ inquilino: INQUILINO }), { asesor: null, cargandoAsesor: true });
    expect(q('asesor-de-la-ficha')?.textContent).not.toContain('Nadie a cargo');
  });

  it('con el mandato terminado (sin onAsignarAsesor) no ofrece asignar', async () => {
    await pintar(consignacion({ inquilino: INQUILINO }), { asesor: null });
    expect(q('asignar-asesor')).toBeNull();
  });
});
