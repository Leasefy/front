/**
 * El propietario independiente → Giros con datos de ejemplo (el modo demo; Nico 30-10-2026: «tiene que haber videos…
 * y la posibilidad de… ver cómo quedaría pintada cada sección»). Leasefy le administra el apartamento de la demo de
 * Contratos (Cra 43A, canon $2.350.000, comisión del 10 %) y le gira el arriendo de cada mes el 8 del mes siguiente
 * (el de octubre, el 8 de noviembre: va en camino). Cuenta, referencias y cifras INVENTADAS.
 */
import type { CuentaDeGiro, GiroDelPropietario } from '@/lib/api/portal-del-propietario.service';
import type { LecturaDeLaDemo } from './index';

const NETO = 2_115_000;
/**
 * Hasta febrero de 2026 el apartamento lo tenía una empresa por $2.200.000, que le retenía el 3,5 % ($77.000): el giro
 * era $2.200.000 − $77.000 − $220.000 de comisión (la demo de Informes y la de Certificados dicen lo mismo).
 */
const NETO_DEL_CONTRATO_ANTERIOR = 2_200_000 - 77_000 - 220_000;

const CUENTA: CuentaDeGiro = {
  propietarioId: 'demo-pr-1',
  inmobiliaria: 'Leasefy',
  cuenta: { banco: 'Bancolombia', tipo: 'AHORROS', numero: '•••• 4821', titular: 'Carlos Mejía' },
  giroDevuelto: null,
  cambioEnCurso: null,
};

/** `AAAA-MM` → el mes siguiente: el arriendo de un mes se gira el 8 del siguiente. */
export function mesSiguiente(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  return m === 12 ? `${a! + 1}-01` : `${a}-${String(m! + 1).padStart(2, '0')}`;
}

/** Del más nuevo al más viejo: octubre va en camino; junio se devolvió y se volvió a girar. */
function giros(): GiroDelPropietario[] {
  const meses = ['2026-10', '2026-09', '2026-08', '2026-07', '2026-06', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01', '2025-12', '2025-11'];
  return meses.map((mes, i): GiroDelPropietario => {
    const giradoEl = `${mesSiguiente(mes)}-08T15:00:00.000Z`;
    const base = { inmobiliaria: 'Leasefy', mes, valorCop: mes >= '2026-03' ? NETO : NETO_DEL_CONTRATO_ANTERIOR, banco: 'Bancolombia', cuenta: '•••• 4821', referencia: `GIR-${mes.replace('-', '')}-0142` };
    if (i === 0) return { ...base, id: `demo-giro-${mes}`, estado: 'EN_CAMINO', giradoEl: null, referencia: null, devolucion: null };
    if (mes === '2026-06') return { ...base, id: `demo-giro-${mes}`, estado: 'REGIRADO', giradoEl: '2026-07-11T15:00:00.000Z', devolucion: { fecha: '2026-07-09', motivo: 'La cuenta estaba bloqueada por el banco' } };
    return { ...base, id: `demo-giro-${mes}`, estado: 'GIRADO', giradoEl, devolucion: null };
  });
}

export const GIROS_DEL_PROPIETARIO_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/portal\/propietario\/cuenta-de-giro(\?|$)/, respuesta: () => ({ fichas: [CUENTA] }) },
  { patron: /^\/portal\/propietario\/giros(\?|$)/, respuesta: () => ({ giros: giros() }) },
];
