import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LoDeLaEtapa } from '@/lib/api/embudo.service';
import type { PipelineItem } from '@/lib/types/inmobiliaria';

void React; // jsx-preserve

const etapa = vi.fn();
const entregaHecha = vi.fn();
const marcarHecha = vi.fn();

vi.mock('@/lib/api/embudo.service', () => ({
  embudoApi: {
    etapa: (...a: unknown[]) => etapa(...a),
    entregaHecha: (...a: unknown[]) => entregaHecha(...a),
    agendarEntrega: vi.fn(),
  },
}));
vi.mock('@/lib/api/agenda.service', () => ({
  agendaApi: { marcarHecha: (...a: unknown[]) => marcarHecha(...a), reprogramar: vi.fn() },
}));
vi.mock('@/components/inmobiliaria/estudios/AsegurabilidadManualDeLaPostulacion', () => ({
  AsegurabilidadManualDeLaPostulacion: () => <div data-testid="asegurabilidad" />,
}));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { LoQueTocaEnLaEtapa } from './LoQueTocaEnLaEtapa';

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  etapa.mockReset();
  entregaHecha.mockReset().mockResolvedValue({ stage: 'COMPLETED' });
  marcarHecha.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

const ITEM = {
  id: 'lead-1',
  stage: 'visit_scheduled',
  candidateName: 'Laura Gómez',
  consignacionId: 'cons-1',
  propertyId: 'prop-1',
  agenteId: 'asesor-1',
} as unknown as PipelineItem;

const VACIO: LoDeLaEtapa = {
  visita: null,
  postulacion: null,
  contratos: { arrendamiento: null, administracion: null, ambosFirmados: false },
  entrega: null,
};

async function montar(item: PipelineItem, datos: LoDeLaEtapa, extra: Partial<React.ComponentProps<typeof LoQueTocaEnLaEtapa>> = {}) {
  etapa.mockResolvedValue(datos);
  await act(async () => {
    raiz.render(
      <LoQueTocaEnLaEtapa item={item} puedeEditar equipo={[{ userId: 'asesor-1', nombre: 'Ana Ruiz', asesor: true } as never]} {...extra} />,
    );
  });
}

const porId = (id: string) => contenedor.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

describe('LoQueTocaEnLaEtapa (reunión con Juan, 31-10-2026)', () => {
  it('pasada la hora de la visita pregunta «¿Se hizo la visita?» y «Sí, se hizo» la marca hecha', async () => {
    const onCambio = vi.fn();
    await montar(
      ITEM,
      {
        ...VACIO,
        visita: { visitId: 'v-1', fecha: '2026-10-31', horaInicio: '10:00', horaFin: '10:30', modalidad: 'VIRTUAL', estado: 'ACCEPTED', asesorUserId: 'asesor-1', yaPaso: true },
      },
      { onCambio },
    );
    expect(contenedor.textContent).toContain('¿Se hizo la visita?');
    expect(contenedor.textContent).toContain('Virtual');
    expect(contenedor.textContent).toContain('Ana Ruiz');
    await act(async () => porId('visita-se-hizo')!.click());
    expect(marcarHecha).toHaveBeenCalledWith('v-1');
    expect(onCambio).toHaveBeenCalled();
  });

  it('antes de la hora no pregunta: sólo deja reprogramar', async () => {
    await montar(ITEM, {
      ...VACIO,
      visita: { visitId: 'v-1', fecha: '2026-11-30', horaInicio: '10:00', horaFin: '10:30', modalidad: 'IN_PERSON', estado: 'ACCEPTED', asesorUserId: null, yaPaso: false },
    });
    expect(porId('visita-se-hizo')).toBeNull();
    expect(contenedor.textContent).toContain('Reprogramar');
  });

  it('en «Postulación y evaluación»: documentos, la aseguradora a mano y «Aprobado» mueve a Aprobado', async () => {
    const onMover = vi.fn(() => Promise.resolve());
    await montar(
      { ...ITEM, stage: 'evaluation' } as PipelineItem,
      { ...VACIO, postulacion: { applicationId: 'app-1', estado: 'UNDER_REVIEW', documentos: 3, enviadaEl: '2026-10-28T15:00:00.000Z' } },
      { onMover },
    );
    expect(contenedor.textContent).toContain('3 cargados');
    expect(porId('asegurabilidad')).not.toBeNull();
    await act(async () => porId('postulacion-aprobada')!.click());
    expect(onMover).toHaveBeenCalledWith('approved');
  });

  it('«Rechazado» ofrece marcarlo perdido o ajustar y reintentar', async () => {
    const onMarcarPerdido = vi.fn();
    await montar(
      { ...ITEM, stage: 'application' } as PipelineItem,
      { ...VACIO, postulacion: { applicationId: 'app-1', estado: 'SUBMITTED', documentos: 0, enviadaEl: null } },
      { onMover: vi.fn(), onMarcarPerdido },
    );
    await act(async () => porId('postulacion-rechazada')!.click());
    expect(porId('postulacion-reintentar')).not.toBeNull();
    await act(async () => porId('postulacion-perdido')!.click());
    expect(onMarcarPerdido).toHaveBeenCalled();
  });

  it('en «Contrato»: los dos contratos con su firma y, firmados los dos, «listo para la entrega»', async () => {
    await montar({ ...ITEM, stage: 'contract' } as PipelineItem, {
      ...VACIO,
      postulacion: { applicationId: 'app-1', estado: 'APPROVED', documentos: 3, enviadaEl: null },
      contratos: {
        arrendamiento: { contractId: 'c-1', estado: 'SIGNED', firmado: true },
        administracion: { consignacionId: 'cons-1', estado: 'FIRMADA' },
        ambosFirmados: true,
      },
    });
    expect(contenedor.textContent).toContain('Los dos contratos están firmados: listo para la entrega.');
    expect(porId('contrato-arrendamiento')?.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/contratos/c-1');
    expect(porId('contrato-administracion')?.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles/cons-1?pestana=mandato');
    expect(porId('contratos-agendar-entrega')).not.toBeNull();
  });

  it('sin contrato de arrendamiento, lo genera desde la plantilla con su postulación', async () => {
    await montar({ ...ITEM, stage: 'approved' } as PipelineItem, {
      ...VACIO,
      postulacion: { applicationId: 'app-1', estado: 'APPROVED', documentos: 3, enviadaEl: null },
      contratos: { arrendamiento: null, administracion: { consignacionId: 'cons-1', estado: 'SIN_FIRMA' }, ambosFirmados: false },
    });
    expect(porId('contrato-arrendamiento')?.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/contratos/nuevo?applicationId=app-1');
    expect(contenedor.textContent).toContain('Sin firmar');
  });

  it('pasada la hora de la entrega, «Sí, cerrar como arrendado» la cierra', async () => {
    const onCambio = vi.fn();
    await montar(
      { ...ITEM, stage: 'handover' } as PipelineItem,
      { ...VACIO, entrega: { tareaId: 't-1', fecha: '2026-11-02', hora: '09:00', responsableUserId: 'asesor-1', estado: 'PENDIENTE', yaPaso: true } },
      { onCambio },
    );
    expect(contenedor.textContent).toContain('¿Se hizo la entrega?');
    await act(async () => porId('entrega-se-hizo')!.click());
    expect(entregaHecha).toHaveBeenCalledWith('lead-1');
    expect(onCambio).toHaveBeenCalled();
  });

  it('sin entrega agendada, pide el día, la hora y quién la hace', async () => {
    await montar({ ...ITEM, stage: 'handover' } as PipelineItem, VACIO);
    expect(porId('agendar-entrega')).not.toBeNull();
  });

  it('en las etapas sin tarea propia no pinta nada ni pregunta al back', async () => {
    await montar({ ...ITEM, stage: 'lead' } as PipelineItem, VACIO);
    expect(porId('lo-que-toca-en-la-etapa')).toBeNull();
    expect(etapa).not.toHaveBeenCalled();
  });
});
