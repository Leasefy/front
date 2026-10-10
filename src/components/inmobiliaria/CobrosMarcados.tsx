'use client';

/**
 * Las acciones masivas de Cobros (Nico, 10-10-2026; eligió Cobro).
 *
 *  - «Mandar recordatorio» — el MISMO de la fila (sale por la secuencia de
 *    cobranza), a los marcados que todavía deben. Va en UNA petición que el
 *    back recorre en el centro de procesos: el back topa los envíos por persona.
 *  - «Anular» — con UN motivo para todos; cada cobro lo vuelve a validar el
 *    back (uno con recibos no se anula y se dice cuál). Anular no tiene tope:
 *    corre de a pocos en el centro (`hacerEnBloque`). La deuda de la cuota no
 *    cambia: anular quita el documento, no lo que se debe.
 */

import { useRef, useState } from 'react';
import { BellRinging, Prohibit } from '@phosphor-icons/react';

import { BarraDeAccionesMasivas } from '@/components/ui/acciones-masivas';
import { Button } from '@/components/ui/button';
import { confirmar } from '@/components/ui/confirmar';
import { toast } from '@/components/ui/toast';
import { cobrosApi } from '@/lib/api/inmobiliaria.service';
import { avisarDelBloque, enBloqueEnElServidor, hacerEnBloque } from '@/lib/masivas/en-bloque';
import type { Cobro } from '@/lib/types/inmobiliaria';

const plural = (n: number, uno: string, varios: string) => (n === 1 ? `1 ${uno}` : `${n} ${varios}`);
/** El motivo que pide el back para anular (MOTIVO_REQUERIDO). */
const MINIMO_DEL_MOTIVO = 5;

/** A cuáles les llega el recordatorio: los que todavía deben. Pura, para probarla. */
export function porRecordar(marcados: readonly Cobro[]): Cobro[] {
  return marcados.filter((c) => !c.anuladoAt && (c.pendingAmount ?? 0) > 0);
}

export function CobrosMarcados({
  marcados,
  onQuitar,
  puedeRecordar,
  puedeAnular,
  onAnulados,
}: {
  marcados: readonly Cobro[];
  onQuitar: () => void;
  puedeRecordar: boolean;
  puedeAnular: boolean;
  /** Para volver a leer la lista después de anular. */
  onAnulados: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const motivo = useRef('');
  const recordar = porRecordar(marcados);

  const mandarRecordatorios = async () => {
    const ok = await confirmar({
      titulo: `¿Les mandamos el recordatorio a ${plural(recordar.length, 'cobro', 'cobros')}?`,
      descripcion: `Sale por la secuencia de cobranza, como el de cada cobro.${
        marcados.length - recordar.length > 0
          ? ` ${plural(marcados.length - recordar.length, 'ya está pago o anulado y se salta', 'ya están pagos o anulados y se saltan')}.`
          : ''
      }`,
      accion: 'Mandar los recordatorios',
      icono: <BellRinging weight="bold" />,
    });
    if (!ok) return;
    setOcupado(true);
    try {
      const arranco = await enBloqueEnElServidor({
        titulo: `Recordatorio de ${plural(recordar.length, 'cobro', 'cobros')}`,
        pedir: () => cobrosApi.recordatoriosEnElCentro(recordar.map((c) => c.id)),
        accion: 'mandar los recordatorios',
        recursos: ['cobros'],
      });
      if (arranco) onQuitar();
    } finally {
      setOcupado(false);
    }
  };

  const anular = async () => {
    motivo.current = '';
    const ok = await confirmar({
      tipo: 'destructivo',
      titulo: `¿Anulamos ${plural(marcados.length, 'cobro', 'cobros')}?`,
      descripcion:
        'Se anula el documento, no la deuda: lo que se debe sigue en la cuota. Un cobro con recibos no se anula y el aviso dice cuál.',
      detalle: (
        <label className="block space-y-1.5 text-left">
          <span className="text-sm font-medium text-fg">Motivo (para todos)</span>
          <textarea
            className="w-full rounded-md border border-border bg-surface p-2 text-sm text-fg placeholder:text-fg-placeholder"
            rows={3}
            maxLength={500}
            placeholder="Por qué se anulan"
            onChange={(e) => {
              motivo.current = e.target.value;
            }}
            data-testid="motivo-de-anular-marcados"
          />
        </label>
      ),
      accion: `Anular ${plural(marcados.length, 'cobro', 'cobros')}`,
    });
    if (!ok) return;
    const elMotivo = motivo.current.trim();
    if (elMotivo.length < MINIMO_DEL_MOTIVO) {
      toast.error('Falta el motivo', { description: `Escribe por qué se anulan (al menos ${MINIMO_DEL_MOTIVO} letras).` });
      return;
    }
    setOcupado(true);
    try {
      const r = await hacerEnBloque({
        titulo: `Anular ${plural(marcados.length, 'cobro', 'cobros')}`,
        tipo: 'APROBACION_MASIVA',
        filas: marcados.map((c) => ({ id: c.id, nombre: c.tenantName || 'Sin inquilino' })),
        tarea: (f) => cobrosApi.anular(f.id, elMotivo),
        accion: 'anular el cobro',
        recursos: ['cobros'],
      });
      avisarDelBloque(r, { todas: 'Anulamos los cobros', ninguna: 'No se anuló ningún cobro' });
      onAnulados();
      onQuitar();
    } finally {
      setOcupado(false);
    }
  };

  const nada = marcados.length === 0;
  return (
    <BarraDeAccionesMasivas
      variant="pie"
      testid="cobros-marcados"
      className="max-md:hidden"
      marcadas={marcados.length}
      queSon={['cobro', 'cobros']}
      onQuitar={onQuitar}
      ocupado={ocupado}
      cuandoNoHayNada="Marca cobros para mandarles el recordatorio o anularlos."
    >
      {puedeAnular && (
        <Button variant="ghost" size="sm" hideArrow disabled={ocupado || nada} onClick={() => void anular()} data-testid="anular-marcados">
          <Prohibit className="h-4 w-4" />
          Anular
        </Button>
      )}
      {puedeRecordar && (
        <Button size="sm" hideArrow disabled={ocupado || recordar.length === 0} onClick={() => void mandarRecordatorios()} data-testid="recordar-marcados">
          <BellRinging className="h-4 w-4" />
          {recordar.length > 0 ? `Mandar ${plural(recordar.length, 'recordatorio', 'recordatorios')}` : 'Mandar recordatorio'}
        </Button>
      )}
    </BarraDeAccionesMasivas>
  );
}
