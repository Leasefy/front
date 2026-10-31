/**
 * El propietario independiente → Escoger inquilino con datos de ejemplo (el modo demo; Nico 30-10-2026: «ver cómo
 * quedaría pintada cada sección»). Leasefy le pide escoger entre cuatro candidatos de su apartamento nuevo (tres en la
 * lista corta) y, en el historial, el de la Cl 5 Sur: escogió a Mariana Ochoa, la del contrato que espera su firma en
 * la demo de Contratos. Personas, oficios y cifras INVENTADAS. Las frases del estudio son las del back
 * (`fraseDelEstudio`).
 */
import type { CandidatoParaElPropietario, EleccionEnElPortal } from '@/lib/api/elecciones-de-inquilino.service';
import type { LecturaDeLaDemo } from './index';

const CANDIDATOS: readonly CandidatoParaElPropietario[] = [
  { applicationId: 'demo-ap-1', nombre: 'Daniela Cardona', deQueVive: 'Ingeniera de sistemas, empleada', ingresosCop: 9_800_000, personasACargo: 1, estudio: 'Tiene estudio de arrendamiento y el canon le cabe.', postuladoEl: '2026-10-24T14:10:00.000Z', enLaListaCorta: 1 },
  { applicationId: 'demo-ap-2', nombre: 'Sebastián Mesa', deQueVive: 'Médico general independiente', ingresosCop: 12_500_000, personasACargo: 2, estudio: 'Sin estudio de arrendamiento (es opcional).', postuladoEl: '2026-10-25T09:30:00.000Z', enLaListaCorta: 2 },
  { applicationId: 'demo-ap-3', nombre: 'Paula Andrea Gil', deQueVive: 'Docente universitaria', ingresosCop: 7_400_000, personasACargo: 0, estudio: 'Tiene estudio, pero el canon pasa lo que le respaldan ($3.000.000).', postuladoEl: '2026-10-26T18:45:00.000Z', enLaListaCorta: 3 },
  { applicationId: 'demo-ap-4', nombre: 'Esteban Rojas', deQueVive: 'Diseñador gráfico', ingresosCop: 4_900_000, personasACargo: 0, estudio: 'Su estudio de arrendamiento está en curso.', postuladoEl: '2026-10-28T11:05:00.000Z', enLaListaCorta: null },
];

function elecciones(): { pendientes: EleccionEnElPortal[]; historial: EleccionEnElPortal[] } {
  return {
    pendientes: [
      {
        id: 'demo-el-1',
        estado: 'PENDIENTE',
        inmobiliaria: 'Leasefy',
        inmueble: 'Cra 25 # 1A Sur 45, apto 1101',
        canonCop: 3_400_000,
        pedidaAt: '2026-10-29T15:00:00.000Z',
        decididaAt: null,
        escogido: null,
        motivo: null,
        candidatos: [...CANDIDATOS],
      },
    ],
    historial: [
      {
        id: 'demo-el-2',
        estado: 'ADJUDICADA',
        inmobiliaria: 'Leasefy',
        inmueble: 'Cl 5 Sur # 25-80, apto 902',
        canonCop: 3_100_000,
        pedidaAt: '2026-10-14T15:00:00.000Z',
        decididaAt: '2026-10-16T13:20:00.000Z',
        escogido: 'Mariana Ochoa',
        motivo: null,
        candidatos: [],
      },
    ],
  };
}

export const ESCOGER_INQUILINO_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/portal\/elecciones-de-inquilino(\?|$)/, respuesta: elecciones },
];
