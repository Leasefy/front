/**
 * El propietario independiente → Revisar el canon con datos de ejemplo (el modo demo; Nico 30-10-2026: «ver cómo
 * quedaría pintada cada sección»). Un local que lleva 75 días desocupado, con la cuenta de lo que le ha costado, y en
 * el historial el apartamento de la Cl 5 Sur: lo bajó de $3.400.000 a $3.100.000 y se arrendó (es el contrato que
 * espera la firma de Mariana Ochoa en la demo de Contratos). Las cuentas son las del back
 * (`comercial/precio/vacancia-y-canon.ts`); el inmueble y las cifras, INVENTADOS. Nadie le propone un precio (D-PV-02).
 */
import type { RevisionDelCanonEnElPortal } from '@/lib/api/revisiones-del-canon.service';
import { MESES_DEL_CONTRATO, loQueCuestaElCanonPedido } from '@/lib/precio/vacancia-y-canon';
import type { LecturaDeLaDemo } from './index';

const DIAS_DEL_MES = 30;

function revision(r: {
  id: string;
  estado: RevisionDelCanonEnElPortal['estado'];
  inmueble: string;
  canon: number;
  dias: number;
  desde: string;
  pedido: number | null;
  comentario: string | null;
  preguntada: string;
  respondida: string | null;
  aplicada: string | null;
}): RevisionDelCanonEnElPortal {
  return {
    id: r.id,
    estado: r.estado,
    inmobiliaria: 'Leasefy',
    inmueble: r.inmueble,
    canonActualCop: r.canon,
    diasVacante: r.dias,
    vacanteDesde: r.desde,
    costoDeLaVacanciaCop: Math.round((r.canon * r.dias) / DIAS_DEL_MES),
    siSigueVacio: [1, 2, 3].map((meses) => ({ meses, cuestaCop: r.canon * meses })),
    mesesDelContrato: MESES_DEL_CONTRATO,
    canonPedidoCop: r.pedido,
    loQueCuestaElCanonPedido: r.pedido === null ? null : loQueCuestaElCanonPedido(r.canon, r.pedido),
    comentario: r.comentario,
    preguntadaAt: r.preguntada,
    respondidaAt: r.respondida,
    aplicadaAt: r.aplicada,
  };
}

function revisiones(): { pendientes: RevisionDelCanonEnElPortal[]; historial: RevisionDelCanonEnElPortal[] } {
  return {
    pendientes: [
      revision({ id: 'demo-rc-1', estado: 'PENDIENTE', inmueble: 'Cra 30 # 9-12, local 101', canon: 4_500_000, dias: 75, desde: '2026-08-16', pedido: null, comentario: null, preguntada: '2026-10-28T14:00:00.000Z', respondida: null, aplicada: null }),
    ],
    historial: [
      revision({ id: 'demo-rc-2', estado: 'APLICADA', inmueble: 'Cl 5 Sur # 25-80, apto 902', canon: 3_400_000, dias: 48, desde: '2026-08-01', pedido: 3_100_000, comentario: 'Prefiero bajarlo un poco y arrendarlo antes de diciembre.', preguntada: '2026-09-18T14:00:00.000Z', respondida: '2026-09-19T01:30:00.000Z', aplicada: '2026-09-19T15:10:00.000Z' }),
    ],
  };
}

export const REVISAR_CANON_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/portal\/revisiones-del-canon(\?|$)/, respuesta: revisiones },
];
