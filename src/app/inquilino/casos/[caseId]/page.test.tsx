/**
 * GLOW UP (21-10-2026): el detalle de un caso del inquilino en el orden del
 * trabajo — «¿en qué va mi solicitud y qué me toca?».
 *
 *  · el encabezado común: título, estado al lado, radicado y las acciones arriba;
 *  · lo que le toca (aprobar la cotización) antes que todo lo demás;
 *  · la vuelta lleva a la lista de donde se viene (Solicitudes o Mis casos).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, Suspense } from 'react';

import type { TenantCase } from '@/lib/types/tenant-case';

const { datos } = vi.hoisted(() => ({
  datos: {
    cases: [] as TenantCase[],
    isLoading: false,
    error: null as string | null,
    fuentesQueFallaron: [] as string[],
  },
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/hooks/use-tenant-cases', () => ({
  useTenantCases: () => ({
    cases: datos.cases,
    isLoading: datos.isLoading,
    error: datos.error,
    fuentesQueFallaron: datos.fuentesQueFallaron,
    todasFallaron: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/components/tenant/RespuestaYArchivosDelCaso', () => ({
  RespuestaYArchivosDelCaso: () => <div data-testid="caso-respuesta" />,
}));
vi.mock('@/components/tenant/CostoResponsabilidadCard', () => ({
  CostoResponsabilidadCard: () => <div data-testid="tarjeta-del-costo" />,
}));

import CaseDetailPage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function caso(parcial: Partial<TenantCase> = {}): TenantCase {
  return {
    id: 'c1',
    type: 'pqrs',
    titulo: 'Gotera en el baño',
    estadoLabel: 'En cotización',
    tone: 'info',
    responsable: 'Inmobiliaria',
    updatedAt: new Date().toISOString(),
    detailLink: '/inquilino/casos/c1',
    sourceLink: '/inquilino/solicitudes',
    events: [{ id: 'e1', label: 'Creada', timestamp: new Date().toISOString() }],
    solicitud: {
      estado: 'en_cotizacion',
      createdAt: new Date().toISOString(),
      radicado: 'PQR-2026-0042',
      costoResponsable: 'inquilino',
      cotizacionMonto: 180_000,
      respuesta: null,
      adjuntos: [],
    },
    ...parcial,
  } as TenantCase;
}

let root: Root | null = null;

async function montar(caseId = 'c1') {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  const params = Promise.resolve({ caseId });
  await act(async () => {
    root!.render(
      <Suspense fallback={null}>
        <CaseDetailPage params={params} />
      </Suspense>,
    );
  });
  await act(async () => {
    await params;
  });
}

const $ = (testid: string) => document.querySelector(`[data-testid="${testid}"]`);

function antes(a: Element | null, b: Element | null): boolean {
  if (!a || !b) throw new Error('falta un bloque');
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

beforeEach(() => {
  datos.cases = [caso()];
  datos.isLoading = false;
  datos.error = null;
  datos.fuentesQueFallaron = [];
  document.body.innerHTML = '';
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  root = null;
  document.body.innerHTML = '';
});

describe('Detalle del caso — en el orden del trabajo', () => {
  it('el encabezado común: título, estado al lado y el radicado', async () => {
    await montar();
    const encabezado = document.querySelector('header');
    expect(encabezado?.querySelector('h1')?.textContent).toBe('Gotera en el baño');
    expect(encabezado?.contains($('caso-estado'))).toBe(true);
    expect($('caso-estado')?.textContent).toContain('En cotización');
    expect($('caso-radicado')?.textContent).toBe('PQR-2026-0042');
    expect(encabezado?.contains($('caso-escribir'))).toBe(true);
    expect($('caso-escribir')?.getAttribute('href')).toBe('/inquilino/mensajes');
  });

  it('si le toca aprobar la cotización, eso va antes que «en qué va» y el historial', async () => {
    await montar();
    expect($('caso-te-toca-aprobar')).not.toBeNull();
    expect(antes($('caso-te-toca-aprobar'), $('caso-en-que-va'))).toBe(true);
    expect(antes($('caso-en-que-va'), $('caso-historial'))).toBe(true);
  });

  it('sin nada que aprobar, quién paga queda como consulta, después de la respuesta', async () => {
    datos.cases = [
      caso({
        solicitud: {
          estado: 'en_proceso',
          createdAt: new Date().toISOString(),
          costoResponsable: 'dueno',
          respuesta: { texto: 'Mañana va el plomero.', at: new Date().toISOString(), medio: 'portal' },
          adjuntos: [],
        } as TenantCase['solicitud'],
      }),
    ];
    await montar();
    expect($('caso-te-toca-aprobar')).toBeNull();
    expect(antes($('caso-respuesta'), $('caso-costo'))).toBe(true);
    expect(antes($('caso-costo'), $('caso-historial'))).toBe(true);
  });

  it('una solicitud vuelve a «Solicitudes», sin un «Ver en» que lleve al mismo lugar', async () => {
    await montar();
    expect($('caso-volver')?.querySelector('a')?.getAttribute('href')).toBe('/inquilino/solicitudes');
    expect($('caso-ver-en-origen')).toBeNull();
  });

  it('un pago vuelve a «Mis casos» y ofrece verlo en pagos', async () => {
    datos.cases = [
      caso({ type: 'pago', titulo: 'Pago de octubre', sourceLink: '/inquilino/pagos', solicitud: undefined }),
    ];
    await montar();
    expect($('caso-volver')?.querySelector('a')?.getAttribute('href')).toBe('/inquilino/casos');
    expect($('caso-ver-en-origen')?.getAttribute('href')).toBe('/inquilino/pagos');
  });

  it('si otra fuente falló pero el caso llegó, se muestra con el aviso de lo que faltó', async () => {
    datos.error = 'El asistente de Leasefy no está disponible';
    datos.fuentesQueFallaron = ['acuerdos'];
    await montar();
    expect(document.querySelector('header h1')?.textContent).toBe('Gotera en el baño');
    expect($('fuentes-caidas')?.textContent).toContain('tus acuerdos de pago');
  });

  it('si el caso no llegó y algo falló, dice el error (no «no encontrado»)', async () => {
    datos.error = 'El asistente de Leasefy no está disponible';
    datos.fuentesQueFallaron = ['solicitudes'];
    await montar('otro');
    expect(document.body.textContent).toContain('Error al cargar el caso');
    // Glow up 22-10: «Volver» ya está arriba; aquí la salida es volver a pedir.
    expect(Array.from(document.querySelectorAll('button')).some((b) => b.textContent?.includes('Reintentar'))).toBe(true);
  });

  it('un caso que no es suyo dice «Caso no encontrado» y vuelve a Mis casos', async () => {
    await montar('ajeno');
    expect(document.body.textContent).toContain('Caso no encontrado');
    expect($('caso-volver')?.querySelector('a')?.getAttribute('href')).toBe('/inquilino/casos');
  });
});
