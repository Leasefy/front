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

import { useCallback, useEffect, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowsClockwise, CalendarX, Info, WarningCircle } from '@phosphor-icons/react';

import { AunNoDisponible } from './AunNoDisponible';
import { fechaLegible } from '@/components/estado-de-cuenta/filas';
import { diaEnColombia } from '@/lib/fechas/fecha-de-la-casa';

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
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
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
  puedeAvisar = puedeEditar,
  onCambio,
}: {
  contract: Pick<Contract, 'id'>;
  puedeEditar: boolean;
  /** QA-CONT-95 (CR-30): el aviso de no renovación también lo registra quien decide renovaciones (operaciones). */
  puedeAvisar?: boolean;
  onCambio?: () => void;
}) {
  const [plan, setPlan] = useState<PlanDeLaProrroga | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [ocupado, setOcupado] = useState(false);
  const [dialogo, setDialogo] = useState(false);
  const [meses, setMeses] = useState('');
  const [errorDeLosMeses, setErrorDeLosMeses] = useState<string | undefined>(undefined);
  const [erroresDelAviso, setErroresDelAviso] = useState<Partial<Record<string, string>>>({});
  /*
   * El foco al campo con error, cuando ya se puede: al volver del back la
   * sección sigue apagada (`ocupado`) hasta el render siguiente, y `focus()`
   * sobre un campo apagado no hace nada.
   */
  const focoPendiente = useRef<string | null>(null);
  useEffect(() => {
    const id = focoPendiente.current;
    if (!id) return;
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el || el.disabled) return;
    el.focus();
    focoPendiente.current = null;
  });

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

  /**
   * Guarda. Lo que el back rechazó POR CAMPO vuelve en `porCampo` para pintarlo
   * debajo de su campo; al toast va SÓLO lo que no tiene campo (un 409, un 5xx
   * con su referencia, la red), por el traductor.
   */
  const hacer = async (
    op: () => Promise<unknown>,
    exito: string,
    queSeHacia: string,
    campos: readonly string[] = [],
  ): Promise<{ ok: boolean; porCampo: Partial<Record<string, string>> }> => {
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
      return { ok: true, porCampo: {} };
    } catch (e) {
      const { porCampo, sueltos } = repartirErroresDelServidor(e, {
        campos,
        porDefecto: `No pudimos ${queSeHacia}.`,
        accion: queSeHacia,
      });
      if (sueltos.length) toast.error('No se pudo guardar.', { description: sueltos.join(' · ') });
      return { ok: false, porCampo };
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
  const avisable = puedeAvisar && plan.disponible && !ocupado;
  const conAlerta = plan.accion.startsWith('ALERTA_');

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-5" data-testid="prorroga-del-contrato">
      <div className="flex items-center gap-2">
        <ArrowsClockwise className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-base font-semibold text-foreground">Prórroga</h3>
      </div>

      {plan.accion === 'NO_VENCIDO' && (
        <p className="text-sm" data-testid="prorroga-frase">
          {/* 🔴 «2027-08-20» es el formato de la base, no el de una persona
              (Nico, 18-09-2026). */}
          Rige hasta el <strong>{fechaLegible(plan.ultimoDia)}</strong>.{' '}
          {plan.aviso
            ? 'Hay aviso de no renovación: no se prorroga. Si ese día sigue activo, queda en alerta para que decidas.'
            : plan.regla && plan.finNuevo
              ? `Si nadie avisa que no renueva, se prorroga ${REGLA[plan.regla]} hasta el ${fechaLegible(plan.finNuevo)}.`
              : plan.porQue}
        </p>
      )}

      {plan.accion === 'PRORROGAR' && (
        <div className="space-y-2 rounded-lg border border-plan-status-yellow/40 bg-plan-status-yellow/5 p-3" data-testid="prorroga-por-hacer">
          <p className="text-sm">{plan.porQue}</p>
          {plan.puenteDeRenovacion && (
            <p className="text-caption text-muted-foreground" data-testid="puente-de-renovacion">
              Es un puente mientras se firma la renovación: se prorroga mes a mes para que la deuda del inquilino no
              desaparezca. Cuando la renovación se complete, ella manda y las cuotas se rehacen.
            </p>
          )}
          {plan.tramos.length > 1 && (
            <p className="text-caption text-muted-foreground">
              Son {plan.tramos.length} términos seguidos: se crean de una vez las cuotas de todos. El proceso diario no
              lo hace solo.
            </p>
          )}
          {!plan.automaticaPrendida && plan.tramos.length === 1 && (
            <p className="text-caption text-muted-foreground">
              La prórroga automática está apagada para tu inmobiliaria: nada la hace sola.
            </p>
          )}
          {editable && (
            <Button
              size="sm"
              onClick={() =>
                void hacer(
                  () => cicloDeVidaApi.prorrogar(contract.id),
                  // QA-CONT C-10: la fecha de la casa, no el ISO crudo.
                  `Contrato prorrogado hasta el ${fechaLegible(plan.finNuevo)}. Las cuotas se extienden.`,
                  'prorrogar el contrato',
                )
              }
              data-testid="prorrogar"
            >
              Prorrogar hasta el {fechaLegible(plan.finNuevo)}
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
            {/* QA-CONT-95: el aviso es un INSTANTE; cortado a 10 caracteres daba el día en UTC (a las 7 p. m. ya era «mañana»). */}
            ({fechaLegible(diaEnColombia(plan.aviso.at) ?? plan.aviso.at.slice(0, 10))}).
          </p>
          {plan.aviso.motivo && <p className="text-caption text-muted-foreground">Motivo: {plan.aviso.motivo}</p>}
          {avisable && plan.aviso.fuente === 'CONTRATO' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                void hacer(
                  () => cicloDeVidaApi.retirarAvisoDeNoRenovacion(contract.id),
                  'Aviso retirado: el contrato vuelve a prorrogarse.',
                  'retirar el aviso',
                )
              }
            >
              Retirar el aviso
            </Button>
          )}
          {plan.aviso.fuente === 'RENOVACION' && (
            <p className="text-caption text-muted-foreground">Se registró en la renovación del inmueble: se retira desde ahí.</p>
          )}
        </div>
      ) : (
        avisable &&
        (plan.accion === 'NO_VENCIDO' || plan.accion === 'PRORROGAR') && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-caption text-muted-foreground">
              Si alguna de las partes avisa que no renueva, regístralo: es lo único que frena la prórroga.
            </p>
            <Button size="sm" variant="outline" onClick={() => setDialogo(true)} data-testid="abrir-aviso">
              Registrar aviso de no renovación
            </Button>
          </div>
        )
      )}

      {/* 🔴 «No se prorroga» explícito (Nico, 17-09). Si la base todavía no lo
          soporta, NO se dibuja la casilla muerta: se dice el estado y ya. Una
          casilla que no se mueve se lee como rota (Nico, 18-09). */}
      {!plan.noSeProrrogaDisponible ? (
        <p className="text-sm text-fg-muted" data-testid="no-se-prorroga">
          <span className="font-medium text-fg">
            Este contrato {plan.noSeProrroga ? 'NO se prorroga' : 'se prorroga'} al vencer.
          </span>{' '}
          Por ahora no se puede cambiar desde acá.
        </p>
      ) : (
      <label className="flex items-start gap-2.5 text-sm" data-testid="no-se-prorroga">
        <Checkbox className="mt-1" checked={plan.noSeProrroga} disabled={!editable} onCheckedChange={(marcada: boolean) =>
            void hacer(
              () => cicloDeVidaApi.fijarNoSeProrroga(contract.id, marcada),
              marcada
                ? 'Este contrato ya no se prorroga: al vencer queda en alerta y no se generan cuotas nuevas.'
                : 'Este contrato vuelve a prorrogarse como diga la regla.',
              'guardar si el contrato se prorroga',
            )
          } data-testid="no-se-prorroga-casilla" />
        <span>
          <strong>Este contrato NO se prorroga al vencer.</strong> Queda en alerta y nadie genera cuotas nuevas: lo que
          siga se decide a mano (renovarlo o terminarlo con la fecha de entrega).
        </span>
      </label>
      )}

      {plan.uso && !plan.noSeProrroga && plan.disponible && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-caption" htmlFor="meses-de-prorroga">
            {plan.uso === 'COMERCIAL'
              ? 'Prórroga pactada, en meses (vacío = mes a mes)'
              : 'Término inicial confirmado, en meses (vacío = el del contrato)'}
            <Input
              id="meses-de-prorroga"
              inputMode="numeric"
              value={meses}
              onChange={(e) => {
                setMeses(e.target.value);
                setErrorDeLosMeses(undefined);
              }}
              disabled={!editable}
              className="mt-1 w-28"
              data-testid="meses-de-prorroga"
              aria-invalid={errorDeLosMeses ? true : undefined}
              aria-describedby="meses-de-prorroga-error"
            />
          </label>
          <Button
            size="sm"
            variant="outline"
            disabled={!editable}
            onClick={() => {
              const n = meses.trim() === '' ? null : Number(meses);
              // El rango de `MesesDeProrrogaDto`, dicho debajo del campo.
              if (n !== null && (!Number.isInteger(n) || n < 1 || n > 120)) {
                setErrorDeLosMeses('El término va de 1 a 120 meses.');
                focoPendiente.current = 'meses-de-prorroga';
                return;
              }
              void (async () => {
                const r = await hacer(
                  () => cicloDeVidaApi.fijarMesesDeProrroga(contract.id, n),
                  'Término de la prórroga guardado.',
                  'guardar el término de la prórroga',
                  ['meses'],
                );
                setErrorDeLosMeses(r.porCampo.meses);
                if (r.porCampo.meses) focoPendiente.current = 'meses-de-prorroga';
              })();
            }}
          >
            Guardar término
          </Button>
          <ErrorDelCampo id="meses-de-prorroga-error" mensaje={errorDeLosMeses} className="w-full" />
        </div>
      )}

      {!plan.disponible && (
        <AunNoDisponible
          testId="prorroga-sin-migracion"
          queNoSePuede="prorrogar ni registrar el aviso de no renovación desde acá"
          mientrasTanto="El plan que ves arriba sí está calculado y el contrato se prorroga como diga su regla."
        />
      )}

      {plan.historial.length > 0 && (
        <ul className="space-y-1 border-t border-border pt-2 text-caption text-muted-foreground" data-testid="historial-de-prorrogas">
          {plan.historial.map((h) => (
            <li key={`${h.finAnterior}-${h.createdAt}`}>
              {HISTORIAL[h.regla] ?? h.regla}: {fechaLegible(h.finAnterior)} → {fechaLegible(h.finNuevo)}
              {h.origen === 'AUTOMATICA' ? ' (automática)' : ''}
            </li>
          ))}
        </ul>
      )}

      <DialogoDeAviso
        abierto={dialogo}
        guardando={ocupado}
        errores={erroresDelAviso}
        onCerrar={() => {
          setDialogo(false);
          setErroresDelAviso({});
        }}
        onConfirmar={(parte, motivo) => {
          // El diálogo queda abierto hasta que el back responda: si rechaza el
          // motivo, se dice debajo del motivo y lo escrito no se pierde.
          void (async () => {
            const r = await hacer(
              () => cicloDeVidaApi.registrarAvisoDeNoRenovacion(contract.id, { parte, motivo }),
              'Aviso registrado: este contrato no se prorroga.',
              'registrar el aviso',
              ['parte', 'motivo'],
            );
            setErroresDelAviso(r.porCampo);
            if (r.ok) setDialogo(false);
            else if (r.porCampo.motivo) focoPendiente.current = 'motivo-del-aviso';
          })();
        }}
      />
    </section>
  );
}

function DialogoDeAviso({
  abierto,
  guardando,
  errores,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean;
  guardando: boolean;
  /** Lo que el back rechazó, por campo de `AvisoDeNoRenovacionDelContratoDto`. */
  errores: Partial<Record<string, string>>;
  onCerrar: () => void;
  onConfirmar: (parte: ParteQueAvisa, motivo: string) => void;
}) {
  const [parte, setParte] = useState<ParteQueAvisa>('INQUILINO');
  const [motivo, setMotivo] = useState('');
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !guardando && onCerrar()}>
      {/* Destructiva: con el aviso, el contrato deja de prorrogarse solo. */}
      <DialogContent
        variant="destructive"
        icon={<CalendarX weight="bold" />}
        size="sm"
        data-testid="dialogo-aviso-de-no-renovacion"
      >
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
            <ErrorDelCampo id="parte-del-aviso-error" mensaje={errores.parte} className="mt-0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-del-aviso">Motivo</Label>
            <Textarea
              id="motivo-del-aviso"
              rows={3}
              value={motivo}
              maxLength={2000}
              onChange={(e) => setMotivo(e.target.value)}
              data-testid="aviso-motivo"
              aria-invalid={errores.motivo ? true : undefined}
              aria-describedby="motivo-del-aviso-error"
            />
            <ErrorDelCampo id="motivo-del-aviso-error" mensaje={errores.motivo} className="mt-0" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" hideArrow onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            hideArrow
            disabled={motivo.trim().length < 3}
            isLoading={guardando}
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
