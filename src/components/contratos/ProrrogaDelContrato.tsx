'use client';

/**
 * 🔴 D5 · Qué pasa con este contrato cuando llega su fecha de fin (Nico, 17-09).
 *
 *   · Sin aviso de NO renovación, se PRORROGA: vivienda por el mismo término
 *     inicial (Ley 820 art. 6), local comercial lo pactado o mes a mes. Las
 *     cuotas se extienden y el canon sube en el aniversario (IPC en vivienda).
 *   · Con aviso de no renovación, NO se prorroga: si sigue activo al vencer,
 *     queda en alerta y decides (renovar por los días ocupados o por el término
 *     inicial, o terminarlo).
 *
 * El plan lo calcula el BACK (`GET /contracts/:id/prorroga`) con la misma regla
 * que corre el proceso diario: esta pantalla no recalcula nada.
 */

import { useCallback, useEffect, useState } from 'react';
import { ArrowsClockwise, Info, WarningCircle } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import {
  cicloDeVidaApi,
  type ParteQueAvisa,
  type PlanDeLaProrroga,
} from '@/lib/api/ciclo-de-vida.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import type { Contract } from '@/lib/types/contract';

const PARTES: { valor: ParteQueAvisa; nombre: string }[] = [
  { valor: 'INQUILINO', nombre: 'El inquilino' },
  { valor: 'PROPIETARIO', nombre: 'El propietario' },
  { valor: 'INMOBILIARIA', nombre: 'La inmobiliaria' },
];

const REGLA: Record<string, string> = {
  LEY_820_ART_6: 'por el mismo término inicial (Ley 820, art. 6)',
  PACTADA: 'por lo pactado',
  MES_A_MES: 'mes a mes (el contrato no pacta prórroga)',
};

const HISTORIAL: Record<string, string> = {
  LEY_820_ART_6: 'Prórroga por ley',
  PACTADA: 'Prórroga pactada',
  MES_A_MES: 'Prórroga mes a mes',
  DIAS_OCUPADOS: 'Renovado por los días ocupados',
  TERMINO_INICIAL: 'Renovado por el término inicial',
};

export function ProrrogaDelContrato({
  contract,
  puedeEditar,
  onCambio,
}: {
  contract: Pick<Contract, 'id'>;
  puedeEditar: boolean;
  onCambio?: () => void;
}) {
  const [plan, setPlan] = useState<PlanDeLaProrroga | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [ocupado, setOcupado] = useState(false);
  const [dialogo, setDialogo] = useState(false);
  const [meses, setMeses] = useState('');

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const r = await cicloDeVidaApi.prorroga(contract.id);
      setPlan(r);
      setMeses(r.prorrogaMeses != null ? String(r.prorrogaMeses) : '');
    } catch (e) {
      setError(e);
    }
  }, [contract.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const hacer = async (op: () => Promise<unknown>, exito: string) => {
    setOcupado(true);
    try {
      const r = await op();
      if (r && typeof r === 'object' && 'accion' in (r as object)) {
        setPlan(r as PlanDeLaProrroga);
      } else {
        await cargar();
      }
      toast.success(exito);
      onCambio?.();
    } catch (e) {
      toast.error('No se pudo guardar.', { description: mensajeDelFallo(e, 'Intenta de nuevo.') });
    } finally {
      setOcupado(false);
    }
  };

  if (error) {
    return (
      <section className="rounded-lg border border-border bg-card p-5" data-testid="prorroga-del-contrato">
        <FalloDeCarga error={error} queEs="la prórroga de este contrato" onReintentar={cargar} enmarcado={false} />
      </section>
    );
  }
  if (!plan) return null;
  if (plan.accion === 'NO_APLICA') return null;

  const editable = puedeEditar && plan.disponible && !ocupado;
  const conAlerta = plan.accion.startsWith('ALERTA_');

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-5" data-testid="prorroga-del-contrato">
      <div className="flex items-center gap-2">
        <ArrowsClockwise className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-base font-semibold text-foreground">Prórroga</h3>
      </div>

      {plan.accion === 'NO_VENCIDO' && (
        <p className="text-sm" data-testid="prorroga-frase">
          Rige hasta el <strong>{plan.ultimoDia}</strong>.{' '}
          {plan.aviso
            ? 'Hay aviso de no renovación: no se prorroga. Si ese día sigue activo, queda en alerta para que decidas.'
            : plan.regla && plan.finNuevo
              ? `Si nadie avisa que no renueva, se prorroga ${REGLA[plan.regla]} hasta el ${plan.finNuevo}.`
              : plan.porQue}
        </p>
      )}

      {plan.accion === 'PRORROGAR' && (
        <div className="space-y-2 rounded-lg border border-plan-status-yellow/40 bg-plan-status-yellow/5 p-3" data-testid="prorroga-por-hacer">
          <p className="text-sm">{plan.porQue}</p>
          {plan.tramos.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Son {plan.tramos.length} términos seguidos: se crean de una vez las cuotas de todos. El proceso diario no
              lo hace solo.
            </p>
          )}
          {!plan.automaticaPrendida && plan.tramos.length === 1 && (
            <p className="text-xs text-muted-foreground">
              La prórroga automática está apagada para tu inmobiliaria: nada la hace sola.
            </p>
          )}
          {editable && (
            <Button
              size="sm"
              onClick={() =>
                void hacer(
                  () => cicloDeVidaApi.prorrogar(contract.id),
                  `Contrato prorrogado hasta el ${plan.finNuevo}. Las cuotas se extienden.`,
                )
              }
              data-testid="prorrogar"
            >
              Prorrogar hasta el {plan.finNuevo}
            </Button>
          )}
        </div>
      )}

      {conAlerta && (
        <p
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          data-testid={`prorroga-${plan.accion}`}
        >
          <WarningCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{plan.porQue}</span>
        </p>
      )}

      {plan.aviso ? (
        <div className="space-y-1 text-sm" data-testid="aviso-de-no-renovacion">
          <p>
            <strong>
              {PARTES.find((p) => p.valor === plan.aviso?.por)?.nombre ?? 'Una de las partes'} avisó que no renueva
            </strong>{' '}
            ({plan.aviso.at.slice(0, 10)}).
          </p>
          {plan.aviso.motivo && <p className="text-xs text-muted-foreground">Motivo: {plan.aviso.motivo}</p>}
          {editable && plan.aviso.fuente === 'CONTRATO' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                void hacer(
                  () => cicloDeVidaApi.retirarAvisoDeNoRenovacion(contract.id),
                  'Aviso retirado: el contrato vuelve a prorrogarse.',
                )
              }
            >
              Retirar el aviso
            </Button>
          )}
          {plan.aviso.fuente === 'RENOVACION' && (
            <p className="text-xs text-muted-foreground">Se registró en la renovación del inmueble: se retira desde ahí.</p>
          )}
        </div>
      ) : (
        editable &&
        (plan.accion === 'NO_VENCIDO' || plan.accion === 'PRORROGAR') && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Si alguna de las partes avisa que no renueva, regístralo: es lo único que frena la prórroga.
            </p>
            <Button size="sm" variant="outline" onClick={() => setDialogo(true)} data-testid="abrir-aviso">
              Registrar aviso de no renovación
            </Button>
          </div>
        )
      )}

      {plan.uso && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs" htmlFor="meses-de-prorroga">
            {plan.uso === 'COMERCIAL'
              ? 'Prórroga pactada, en meses (vacío = mes a mes)'
              : 'Término inicial confirmado, en meses (vacío = el del contrato)'}
            <Input
              id="meses-de-prorroga"
              inputMode="numeric"
              value={meses}
              onChange={(e) => setMeses(e.target.value)}
              disabled={!editable}
              className="mt-1 w-28"
              data-testid="meses-de-prorroga"
            />
          </label>
          <Button
            size="sm"
            variant="outline"
            disabled={!editable}
            onClick={() => {
              const n = meses.trim() === '' ? null : Number(meses);
              if (n !== null && (!Number.isInteger(n) || n < 1 || n > 120)) {
                toast.error('El término va de 1 a 120 meses.');
                return;
              }
              void hacer(() => cicloDeVidaApi.fijarMesesDeProrroga(contract.id, n), 'Término de la prórroga guardado.');
            }}
          >
            Guardar término
          </Button>
        </div>
      )}

      {!plan.disponible && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground" data-testid="prorroga-sin-migracion">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          Falta una actualización de la base: el plan se calcula, pero todavía no se puede prorrogar ni registrar el
          aviso desde el contrato.
        </p>
      )}

      {plan.historial.length > 0 && (
        <ul className="space-y-1 border-t border-border pt-2 text-xs text-muted-foreground" data-testid="historial-de-prorrogas">
          {plan.historial.map((h) => (
            <li key={`${h.finAnterior}-${h.createdAt}`}>
              {HISTORIAL[h.regla] ?? h.regla}: {h.finAnterior} → {h.finNuevo}
              {h.origen === 'AUTOMATICA' ? ' (automática)' : ''}
            </li>
          ))}
        </ul>
      )}

      <DialogoDeAviso
        abierto={dialogo}
        guardando={ocupado}
        onCerrar={() => setDialogo(false)}
        onConfirmar={(parte, motivo) => {
          setDialogo(false);
          void hacer(
            () => cicloDeVidaApi.registrarAvisoDeNoRenovacion(contract.id, { parte, motivo }),
            'Aviso registrado: este contrato no se prorroga.',
          );
        }}
      />
    </section>
  );
}

function DialogoDeAviso({
  abierto,
  guardando,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean;
  guardando: boolean;
  onCerrar: () => void;
  onConfirmar: (parte: ParteQueAvisa, motivo: string) => void;
}) {
  const [parte, setParte] = useState<ParteQueAvisa>('INQUILINO');
  const [motivo, setMotivo] = useState('');
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="sm:max-w-md" data-testid="dialogo-aviso-de-no-renovacion">
        <DialogHeader>
          <DialogTitle>Aviso de no renovación</DialogTitle>
          <DialogDescription>
            Con el aviso, el contrato no se prorroga. Si al llegar su fecha de fin sigue activo, queda en alerta y
            decides: renovarlo por los días ocupados o por el término inicial, o terminarlo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>¿Quién avisa?</Label>
            <div className="flex flex-wrap gap-2">
              {PARTES.map((p) => (
                <Button
                  key={p.valor}
                  type="button"
                  size="sm"
                  variant={parte === p.valor ? 'default' : 'outline'}
                  onClick={() => setParte(p.valor)}
                  data-testid={`aviso-parte-${p.valor}`}
                >
                  {p.nombre}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-del-aviso">Motivo</Label>
            <Textarea
              id="motivo-del-aviso"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              data-testid="aviso-motivo"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={motivo.trim().length < 3 || guardando}
            onClick={() => onConfirmar(parte, motivo.trim())}
            data-testid="aviso-confirmar"
          >
            Registrar el aviso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
