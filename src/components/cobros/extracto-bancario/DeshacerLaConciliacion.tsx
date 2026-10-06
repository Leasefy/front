'use client';

/**
 * «Deshacer» una línea conciliada (Nico, P11, 03-10-2026): «desvincular con
 * motivo y bitácora, sin anular el recibo. Sólo administrador o contador».
 *
 * La línea vuelve a pendientes y sus recibos SIGUEN VIVOS (la plata del
 * inquilino entró igual): quedan sin línea del banco y se concilian contra la
 * correcta con «Conciliar contra recibos ya emitidos». Lo que queda escrito
 * (quién, su rol, el motivo y cómo estaba) es la bitácora del back.
 *
 * El botón sólo se ve para ADMIN y CONTADOR, y nunca en el registro de un pago
 * en línea (no es una línea del banco). El back exige lo mismo.
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUUpLeft, Info } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { usePermissions } from '@/lib/hooks/usePermissions';
import type { MovimientoBancario } from '@/lib/api/conciliacion-bancaria.types';
import {
  deshacerLaConciliacionApi,
  MOTIVO_MAXIMO_PARA_DESHACER,
  MOTIVO_MINIMO_PARA_DESHACER,
  ROLES_QUE_DESHACEN,
  textoDeLoDeshecho,
} from '@/lib/api/deshacer-la-conciliacion';
import { diaLegible, plata } from './formato';
import { useAparecer } from './cuentas-del-extracto';
import { useSalidaDeLaFila } from './SalidasDelExtracto';

/** ¿Esta línea se puede deshacer, y esta persona puede hacerlo? */
export function sePuedeDeshacer(m: MovimientoBancario, rol: string | null | undefined): boolean {
  return (
    m.estado === 'CONCILIADO' &&
    // Una salida tiene su propio deshacer (la conciliación de salidas).
    m.valorCop > 0 &&
    !m.deLaPasarela &&
    m.extractoNombre !== 'Pasarela de pagos' &&
    !!rol &&
    ROLES_QUE_DESHACEN.has(rol)
  );
}

export function DeshacerLaConciliacion({
  movimiento: m,
  ocupado = false,
  onCambio,
}: {
  movimiento: MovimientoBancario;
  ocupado?: boolean;
  /** Ya se deshizo: la pantalla vuelve a leer lista y resumen. */
  onCambio: () => void;
}) {
  const { agencyRole } = usePermissions();
  // C2-SALIDAS: una línea con vínculo de salida (giro, egreso, gasto del banco,
  // reverso) tiene su propio «Deshacer» en la columna del cruce.
  const { salida } = useSalidaDeLaFila(m.id);
  const aparecer = useAparecer();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const conVinculoDeSalida = (salida?.vinculos.length ?? 0) > 0;
  if (conVinculoDeSalida || !sePuedeDeshacer(m, agencyRole)) {
    return <span className="text-fg-subtle">—</span>;
  }

  const largo = motivo.trim().length;
  const valido = largo >= MOTIVO_MINIMO_PARA_DESHACER && largo <= MOTIVO_MAXIMO_PARA_DESHACER;

  const cerrar = () => {
    if (enviando) return;
    setAbierto(false);
    setMotivo('');
    setError(null);
  };

  const deshacer = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await deshacerLaConciliacionApi.desvincular(m.id, motivo);
      toast.success(textoDeLoDeshecho(r));
      setAbierto(false);
      setMotivo('');
      onCambio();
    } catch (e) {
      // El motivo, debajo del motivo; lo demás (rol, estado, migración), al aviso.
      const { porCampo, sueltos } = repartirErroresDelServidor(e, {
        campos: ['motivo'] as const,
        porDefecto: 'No se pudo deshacer la conciliación.',
        accion: 'deshacer la conciliación',
      });
      if (porCampo.motivo) {
        setError(porCampo.motivo);
        document.getElementById(`motivo-deshacer-${m.id}`)?.focus();
      }
      if (sueltos.length > 0) toast.error(sueltos.join(' · '));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        hideArrow
        disabled={ocupado || enviando}
        onClick={() => setAbierto(true)}
        aria-label={`Deshacer la conciliación de «${m.descripcion}»`}
        data-testid={`deshacer-${m.id}`}
      >
        <ArrowUUpLeft className="h-4 w-4" aria-hidden="true" />
        Deshacer
      </Button>

      <Dialog open={abierto} onOpenChange={(v) => !v && cerrar()}>
        <DialogContent variant="confirm" icon={<ArrowUUpLeft weight="bold" />}>
          <DialogHeader>
            <DialogTitle>Deshacer esta conciliación</DialogTitle>
            <DialogDescription>
              «{m.descripcion}» del {diaLegible(m.fecha)}, por {plata(m.valorCop)}.
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence initial>
            <motion.div
              key="que-pasa"
              {...aparecer}
              className="flex gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-body-sm text-fg"
              data-testid={`que-pasa-al-deshacer-${m.id}`}
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
              <p>
                La línea vuelve a pendientes.{' '}
                {m.recibo
                  ? `El recibo N.º ${m.recibo.numero} (y los demás recibos de ese pago) no se anulan: `
                  : 'Los recibos no se anulan: '}
                quedan vivos, sin línea del banco, y los concilias contra la línea correcta. Queda escrito
                quién lo hizo y por qué.
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="space-y-2">
            <Label htmlFor={`motivo-deshacer-${m.id}`}>Motivo</Label>
            <Textarea
              id={`motivo-deshacer-${m.id}`}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setError(null);
              }}
              placeholder="Se concilió contra el recibo de otro inquilino."
              rows={3}
              maxLength={MOTIVO_MAXIMO_PARA_DESHACER}
              aria-invalid={error ? true : undefined}
              aria-describedby={`motivo-deshacer-${m.id}-error`}
            />
            <ErrorDelCampo
              id={`motivo-deshacer-${m.id}-error`}
              mensaje={error}
              pista={`Entre ${MOTIVO_MINIMO_PARA_DESHACER} y ${MOTIVO_MAXIMO_PARA_DESHACER} caracteres.`}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" hideArrow disabled={enviando} onClick={cerrar}>
              Cancelar
            </Button>
            <Button
              hideArrow
              disabled={!valido}
              isLoading={enviando}
              onClick={() => void deshacer()}
              data-testid={`confirmar-deshacer-${m.id}`}
            >
              Deshacer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
