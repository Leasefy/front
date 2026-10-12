'use client';

/**
 * Las acciones masivas de Renovaciones (Nico, 10-10-2026; eligió Operación).
 *
 * «Mandar la propuesta con el IPC»: con UN IPC para todas, cada renovación
 * que todavía no se ha propuesto pasa a «Notificada» con su canon nuevo
 * (`calculateNewRent`, la misma cuenta del cajón, con la llave de centavos de
 * la renovación) y el mensaje de siempre. Es el mismo «Enviar propuesta» del
 * cajón, una por una en el centro de procesos; el back valida cada una (el
 * tope del art. 20 en vivienda, por ejemplo) y lo que no pasa se dice.
 */

import { useRef, useState } from 'react';
import { PaperPlaneTilt } from '@phosphor-icons/react';

import { BarraDeAccionesMasivas } from '@/components/ui/acciones-masivas';
import { Button } from '@/components/ui/button';
import { confirmar } from '@/components/ui/confirmar';
import { toast } from '@/components/ui/toast';
import { renovacionesApi } from '@/lib/api/inmobiliaria.service';
import { calculateNewRent } from '@/lib/constants/inmobiliaria-data';
import { useI18n } from '@/lib/i18n';
import { avisarDelBloque, hacerEnBloque } from '@/lib/masivas/en-bloque';
import { usePlataConCentavos } from '@/lib/plata/use-plata-con-centavos';
import { AREAS_DE_LA_RENOVACION } from '@/lib/renovaciones/reglas';
import { IPC_MAXIMO_DE_LA_RENOVACION } from '@/lib/renovaciones/limites-de-la-renovacion';
import type { Renovacion } from '@/lib/types/inmobiliaria';

const plural = (n: number, uno: string, varios: string) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`);

/** Las que todavía no se han propuesto. Pura, para probarla. */
export function porProponer(marcadas: readonly Renovacion[]): Renovacion[] {
  return marcadas.filter((r) => r.status === 'pending');
}

/** «4,5» o «4.5» → 4.5; fuera de (0, tope] o no numérico → null. */
export function leerIpc(texto: string): number | null {
  const n = Number(texto.trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n <= IPC_MAXIMO_DE_LA_RENOVACION ? n : null;
}

export function RenovacionesMarcadas({
  marcadas,
  onQuitar,
  onCambiaron,
}: {
  marcadas: readonly Renovacion[];
  onQuitar: () => void;
  onCambiaron: () => void;
}) {
  const { formatCurrency } = useI18n();
  const conCentavos = usePlataConCentavos(AREAS_DE_LA_RENOVACION);
  const [ocupado, setOcupado] = useState(false);
  const ipcEscrito = useRef('');
  const pendientes = porProponer(marcadas);

  const proponer = async () => {
    ipcEscrito.current = '';
    const ok = await confirmar({
      titulo: `¿Les mandamos la propuesta de renovación a ${plural(pendientes.length, 'inquilino', 'inquilinos')}?`,
      descripcion: `Cada canon sube con el IPC que escribas y la renovación pasa a «Notificada», como «Enviar propuesta» en su cajón.${
        marcadas.length - pendientes.length > 0
          ? ` ${plural(marcadas.length - pendientes.length, 'ya se propuso y se salta', 'ya se propusieron y se saltan')}.`
          : ''
      }`,
      detalle: (
        <label className="block space-y-1.5 text-left">
          <span className="text-sm font-medium text-fg">IPC (%)</span>
          <input
            inputMode="decimal"
            className="w-full rounded-md border border-border bg-surface p-2 text-sm text-fg placeholder:text-fg-placeholder"
            placeholder="Por ejemplo 5,2"
            onChange={(e) => {
              ipcEscrito.current = e.target.value;
            }}
            data-testid="ipc-de-los-marcados"
          />
        </label>
      ),
      accion: 'Mandar las propuestas',
      icono: <PaperPlaneTilt weight="bold" />,
    });
    if (!ok) return;
    const ipc = leerIpc(ipcEscrito.current);
    if (ipc === null) {
      toast.error('Falta el IPC', { description: `Escribe un porcentaje mayor que 0 y hasta ${IPC_MAXIMO_DE_LA_RENOVACION}.` });
      return;
    }
    setOcupado(true);
    try {
      const r = await hacerEnBloque({
        titulo: `Propuesta de renovación a ${plural(pendientes.length, 'inquilino', 'inquilinos')} (IPC ${String(ipc).replace('.', ',')} %)`,
        filas: pendientes.map((p) => ({ id: p.id, nombre: `${p.tenantName} · ${p.propertyTitle}`, actual: p.currentRent, inquilino: p.tenantName })),
        tarea: (f) => {
          const nuevo = calculateNewRent(f.actual, ipc, { conCentavos });
          return renovacionesApi.updateStage(f.id, {
            status: 'notified',
            negotiatedRent: nuevo,
            ipcRate: ipc,
            notificationMessage: `Hola ${f.inquilino}: tu contrato está por vencer y te proponemos renovarlo con un canon de ${formatCurrency(nuevo)} (IPC ${String(ipc).replace('.', ',')} %).`,
          });
        },
        accion: 'mandar la propuesta',
        recursos: ['renovaciones'],
      });
      avisarDelBloque(r, { todas: 'Mandamos las propuestas de renovación', ninguna: 'No salió ninguna propuesta' });
      onCambiaron();
      onQuitar();
    } finally {
      setOcupado(false);
    }
  };

  return (
    <BarraDeAccionesMasivas
      variant="pie"
      testid="renovaciones-marcadas"
      className="max-md:hidden"
      marcadas={marcadas.length}
      queSon={['renovación', 'renovaciones']}
      onQuitar={onQuitar}
      ocupado={ocupado}
      cuandoNoHayNada="Marca renovaciones para mandarles la propuesta con el IPC de una vez."
    >
      <Button size="sm" hideArrow disabled={ocupado || pendientes.length === 0} onClick={() => void proponer()} data-testid="proponer-marcadas">
        <PaperPlaneTilt className="h-4 w-4" />
        {pendientes.length > 0 ? `Mandar ${plural(pendientes.length, 'propuesta', 'propuestas')} con el IPC` : 'Mandar la propuesta con el IPC'}
      </Button>
    </BarraDeAccionesMasivas>
  );
}
