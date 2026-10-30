import { describe, expect, it } from 'vitest';

import type { EventoAgenda } from '@/lib/api/agenda.types';
import type { PipelineItem } from '@/lib/types/inmobiliaria';
import { armarTuDia, celularParaMarcar, diaEnColombia, prepararLaLlamada } from './tu-dia';

// 28 de octubre, 10:00 a. m. en Colombia.
const AHORA = new Date('2026-10-28T15:00:00Z');
const item = (p: Partial<PipelineItem>): PipelineItem =>
  ({
    id: p.id ?? 'p1',
    consignacionId: 'c1',
    propertyId: 'i1',
    candidateId: 'k1',
    agenteId: 'a1',
    propertyTitle: 'Apartamento en Laureles',
    propertyAddress: 'Cra 76 # 34-21',
    monthlyRent: 2_800_000,
    candidateName: 'Camila Restrepo',
    candidateEmail: 'camila@correo.co',
    candidatePhone: '3001234567',
    stage: 'lead',
    enteredStageAt: '2026-10-28T10:00:00Z',
    daysInStage: 0,
    createdAt: '2026-10-28T10:00:00Z',
    updatedAt: '2026-10-28T10:00:00Z',
    ...p,
  }) as PipelineItem;
const visita = (fecha: string, estado: EventoAgenda['estado'] = 'confirmado'): EventoAgenda =>
  ({ id: fecha, tipo: 'visita', origen: 'sistema', estado, titulo: 'Visita', fecha }) as EventoAgenda;

describe('«Tu día»: a quién llamar hoy y por qué', () => {
  it('el día es el de Colombia: las 11 p. m. del 27 en Colombia son el 28 en UTC', () => {
    expect(diaEnColombia('2026-10-28T04:00:00Z')).toBe('2026-10-27');
  });

  it('primero quien escribió y nadie le ha respondido (más de 2 horas), después los seguimientos y lo quieto', () => {
    const dia = armarTuDia(
      [
        item({ id: 'nuevo', createdAt: '2026-10-28T12:00:00Z' }), // 3 h sin respuesta
        item({ id: 'recien', createdAt: '2026-10-28T14:30:00Z' }), // 30 min: todavía no
        item({ id: 'contactado', createdAt: '2026-10-27T10:00:00Z', lastContactDate: '2026-10-27T11:00:00Z' }),
        item({ id: 'seguir', stage: 'visit_done', nextAction: 'Mandar la postulación', nextActionDate: '2026-10-26T15:00:00Z' }),
        item({ id: 'quieto', stage: 'evaluation', daysInStage: 5 }),
        item({ id: 'arrendado', stage: 'completed', daysInStage: 9 }),
      ],
      [],
      AHORA,
    );
    expect(dia.llamadas.map((l) => l.item.id)).toEqual(['nuevo', 'seguir', 'quieto']);
    expect(dia.llamadas[0].porQue).toBe('Te escribió hace 3 horas y no le has respondido');
    expect(dia.llamadas[1].porQue).toBe('«Mandar la postulación» venció hace 2 días');
    expect(dia.llamadas[2].porQue).toBe('5 días en estudio sin moverse');
    expect(dia.cuantas).toEqual({ visitas: 0, sinRespuesta: 1, seguimientos: 1, quietos: 1 });
  });

  it('las visitas de hoy, en orden de hora, sin las canceladas ni las de otro día', () => {
    const dia = armarTuDia(
      [],
      [visita('2026-10-28T21:00:00Z'), visita('2026-10-28T14:00:00Z'), visita('2026-10-28T16:00:00Z', 'cancelado'), visita('2026-10-29T15:00:00Z')],
      AHORA,
    );
    expect(dia.visitas.map((v) => v.fecha)).toEqual(['2026-10-28T14:00:00Z', '2026-10-28T21:00:00Z']);
  });

  it('la preparación de la llamada depende de la etapa y deja listo el WhatsApp', () => {
    const p = prepararLaLlamada(item({}), 'Laura Gómez');
    expect(p.saludo).toBe('Hola Camila, te habla Laura. Te llamo por Apartamento en Laureles ($2.800.000 al mes).');
    expect(p.siguientePaso).toContain('Agendar la visita');
    expect(p.preguntas).toContain('¿Para cuándo necesita mudarse?');
    expect(p.whatsapp).toContain('¿Te queda bien visitarlo esta semana?');
    expect(prepararLaLlamada(item({ stage: 'approved' }), 'Laura').siguientePaso).toContain('contrato');
  });

  it('el celular para marcar: con el 57 de Colombia', () => {
    expect(celularParaMarcar('300 123 4567')).toBe('573001234567');
    expect(celularParaMarcar('+57 300 123 4567')).toBe('573001234567');
    expect(celularParaMarcar('')).toBeNull();
  });
});
