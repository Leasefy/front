'use client';

/**
 * 🔴 EL INQUILINO AVISA QUE NO VA A RENOVAR.
 *
 * ── Por qué esto faltaba, y por qué importa ────────────────────────────────
 *
 * Sin aviso, el contrato se PRORROGA SOLO (Ley 820). El aviso es lo único que
 * lo interrumpe — y hasta hoy el inquilino no tenía dónde darlo: podía pedir
 * la renovación y aceptar la propuesta, pero para decir que se iba tenía que
 * llamar y esperar a que alguien lo anotara en el panel de la inmobiliaria.
 * El dato (`Renovacion.avisoNoRenovarAt`) y la regla existían desde el 17-09;
 * lo que no existía era la puerta.
 *
 * ── Las tres cosas que esta pantalla tiene que hacer bien ──────────────────
 *
 * 1. **Decir ANTES si el aviso llega a tiempo.** La ley pide tres meses. Un
 *    aviso con veinte días se registra igual —esconderlo sería peor— pero la
 *    persona tiene que saber, antes de apretar, que puede no servir para esta
 *    vigencia. Quien decide eso es la inmobiliaria, no esta pantalla: acá se
 *    dice el número y se deja de adivinar.
 * 2. **Pedir el motivo.** No es burocracia: una mudanza por precio se negocia
 *    y un traslado de ciudad no, y a los seis meses alguien va a preguntar por
 *    qué se fue ese inquilino.
 * 3. **Dejarlo retirar.** La gente cambia de opinión, y un aviso que sólo se
 *    puede deshacer llamando es el mismo problema que esto vino a resolver.
 *    Sólo el suyo: si lo registró la inmobiliaria, se dice a quién pedírselo.
 */

import { useState } from 'react';
import { CalendarX, Warning } from '@phosphor-icons/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { leasesApi } from '@/lib/api/leases.service';
import type { Lease } from '@/lib/types/lease';

/**
 * Los tres meses de preaviso, en días.
 *
 * 🔴 Está también en el back (`prorroga-del-contrato.ts`), que es la
 * AUTORIDAD: su respuesta trae `aTiempo` y `preavisoDeLey`, y es lo que se
 * muestra DESPUÉS de registrar. Acá se repite para poder avisar ANTES de
 * apretar, que es cuando sirve. Si algún día se separan, manda el back.
 */
const DIAS_DE_PREAVISO = 90;

/** Días enteros entre hoy y el fin del contrato. Negativo = ya venció. */
export function diasHastaElFin(fin: string, hoy = new Date()): number {
  const f = new Date(fin);
  const finUtc = Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate());
  const hoyUtc = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((finUtc - hoyUtc) / (1000 * 60 * 60 * 24));
}

function fechaLarga(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface Props {
  lease: Lease;
  /** Para releer el arriendo cuando el aviso cambia. */
  onCambio: () => void;
}

export function NoVoyARenovar({ lease, onCambio }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [retirando, setRetirando] = useState(false);

  const aviso = lease.renovacion?.avisoNoRenovar ?? null;
  const dias = diasHastaElFin(lease.endDate);
  const aTiempo = dias >= DIAS_DE_PREAVISO;

  const avisar = async () => {
    if (motivo.trim().length < 3) return;
    setGuardando(true);
    try {
      const r = await leasesApi.avisarQueNoRenueva(lease.id, motivo.trim());
      // El mensaje sale de lo que respondió el BACK, no de la cuenta local:
      // si las dos se separaran, la que vale es la del servidor.
      toast.success(
        r.aTiempo
          ? 'Le avisamos a tu inmobiliaria que no vas a renovar.'
          : `Quedó registrado con la fecha de hoy. Ojo: son ${r.diasDeAnticipacion} días antes de que termine, y la ley pide ${r.preavisoDeLey}.`,
      );
      setAbierto(false);
      setMotivo('');
      onCambio();
    } catch (e: unknown) {
      toast.error('No pudimos registrar tu aviso', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  };

  const retirar = async () => {
    setRetirando(true);
    try {
      await leasesApi.retirarElAvisoDeNoRenovacion(lease.id);
      toast.success('Retiramos tu aviso: tu contrato sigue su curso normal.');
      onCambio();
    } catch (e: unknown) {
      toast.error('No pudimos retirar el aviso', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setRetirando(false);
    }
  };

  // ── Ya hay un aviso ───────────────────────────────────────────────────────
  if (aviso) {
    const esSuyo = aviso.por === 'INQUILINO';
    return (
      <div
        className="rounded-xl border border-warning/30 bg-warning-soft p-6 lg:p-8"
        data-testid="aviso-de-no-renovacion"
      >
        <div className="flex items-start gap-3">
          <CalendarX className="mt-0.5 h-5 w-5 shrink-0 text-warning" weight="fill" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-warning">
              {esSuyo
                ? 'Avisaste que no vas a renovar'
                : 'Este contrato no se va a renovar'}
            </p>
            <p className="max-w-lg text-sm text-fg-muted">
              {esSuyo ? (
                <>
                  Lo registramos el {fechaLarga(aviso.at)}. Tu contrato termina el{' '}
                  {fechaLarga(lease.endDate)} y no se prorroga.
                </>
              ) : (
                <>
                  Tu inmobiliaria registró el {fechaLarga(aviso.at)} que este contrato
                  termina el {fechaLarga(lease.endDate)} y no se prorroga. Si quieres
                  seguir, háblalo con ellos.
                </>
              )}
            </p>
            {aviso.motivo ? (
              <p className="text-sm text-fg-muted">
                <span className="text-fg-subtle">Motivo: </span>
                {aviso.motivo}
              </p>
            ) : null}
            {esSuyo ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                hideArrow
                className="mt-2"
                onClick={() => void retirar()}
                disabled={retirando}
                data-testid="retirar-aviso"
              >
                {retirando ? 'Retirando…' : 'Cambié de opinión, quiero seguir'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // ── Todavía no hay aviso: se ofrece darlo ────────────────────────────────
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-fg-muted">
          ¿No vas a seguir en este inmueble?
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => setAbierto(true)}
          data-testid="abrir-no-renovar"
        >
          Avisar que no voy a renovar
        </Button>
      </div>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Avisar que no vas a renovar</DialogTitle>
            <DialogDescription>
              Tu contrato termina el {fechaLarga(lease.endDate)}. Sin aviso se prorroga
              solo; con tu aviso, no.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 🔴 El plazo, ANTES de apretar. Va puesto en la pantalla y no
                detrás de un botón: es un requisito, no una explicación. */}
            {aTiempo ? (
              <p className="text-sm text-fg-muted" data-testid="plazo-ok">
                Avisas con {dias} días de anticipación. La ley pide {DIAS_DE_PREAVISO},
                así que llegas a tiempo.
              </p>
            ) : (
              <p
                className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-fg"
                data-testid="plazo-tarde"
              >
                <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" weight="fill" />
                <span>
                  {dias >= 0
                    ? `Faltan ${dias} días para que termine y la ley pide avisar con ${DIAS_DE_PREAVISO}.`
                    : 'Tu contrato ya pasó su fecha de terminación.'}{' '}
                  Igual lo registramos con la fecha de hoy, pero tu inmobiliaria puede no
                  aceptarlo para esta vigencia. Háblalo con ellos.
                </span>
              </p>
            )}

            <div className="space-y-1.5">
              <label htmlFor="motivo-no-renovar" className="text-sm font-medium text-fg">
                ¿Por qué no vas a renovar?
              </label>
              <Textarea
                id="motivo-no-renovar"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Me mudo de ciudad por trabajo, el canon se salió de mi presupuesto…"
                data-testid="motivo-no-renovar"
              />
              <p className="text-caption text-fg-subtle">
                Lo lee tu inmobiliaria. Si es algo que se pueda arreglar, puede que te
                propongan otra cosa.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="ghost"
                hideArrow
                onClick={() => setAbierto(false)}
                disabled={guardando}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                hideArrow
                onClick={() => void avisar()}
                disabled={guardando || motivo.trim().length < 3}
                title={motivo.trim().length < 3 ? 'Cuéntales por qué' : undefined}
                data-testid="confirmar-no-renovar"
              >
                {guardando ? 'Avisando…' : 'Avisar que no renuevo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default NoVoyARenovar;
