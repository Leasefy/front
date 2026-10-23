import { describe, it, expect } from 'vitest';
import type { PipelineItem } from '@/lib/types/inmobiliaria';
import { paraHoy } from './para-hoy';

const item = (over: Partial<PipelineItem>): PipelineItem =>
  ({ id: over.id ?? 'x', stage: 'visit_scheduled', daysInStage: 0, candidateName: 'Ana', ...over }) as PipelineItem;

describe('«Para hoy» de Prospección (ronda 18)', () => {
  const HOY = '2026-10-22';

  it('pone primero lo vencido (lo más viejo arriba), después lo de hoy y al final lo quieto', () => {
    const r = paraHoy(
      [
        item({ id: 'quieto', nextActionDate: undefined, daysInStage: 9 }),
        item({ id: 'hoy', nextActionDate: '2026-10-22T15:00:00' }),
        item({ id: 'vencida-nueva', nextActionDate: '2026-10-21' }),
        item({ id: 'vencida-vieja', nextActionDate: '2026-10-19' }),
        item({ id: 'futura', nextActionDate: '2026-10-25' }),
        item({ id: 'reciente-sin-accion', daysInStage: 3 }),
      ],
      HOY,
    );
    expect(r.map((p) => p.item.id)).toEqual(['vencida-vieja', 'vencida-nueva', 'hoy', 'quieto']);
    expect(r.map((p) => p.porQue)).toEqual(['vencida', 'vencida', 'hoy', 'quieto']);
  });

  it('los cerrados nunca entran, aunque tengan una acción vencida', () => {
    expect(
      paraHoy(
        [item({ stage: 'completed', nextActionDate: '2026-10-01' }), item({ stage: 'lost', daysInStage: 30 })],
        HOY,
      ),
    ).toEqual([]);
  });
});
