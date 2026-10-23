'use client';

/**
 * Las reparaciones que el PROPIETARIO hace por su cuenta (reunión con
 * Portofino, 22-10-2026): las que respondió «La hago yo» o que su inmobiliaria
 * le dejó. Cuando quede, avisa «Ya quedó» y la tarjeta de la inmobiliaria se
 * cierra. Las terminadas en los últimos 30 días se ven abajo, ya cerradas.
 * Sin ninguna, no se pinta nada.
 */

import { useState } from 'react';
import { CheckCircle, Clock } from '@phosphor-icons/react';
import { Presence, StatusBadge } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { diaEnColombia, fechaLarga } from '@/lib/fechas/fecha-de-la-casa';

import { aprobacionesDeReparacionApi } from '@/lib/api/aprobaciones-de-reparacion.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import type { ReparacionQueHagoYo } from '@/lib/types/deducciones';

/** «22 de octubre de 2026», en el día de Colombia. */
const fechaEnFrase = (iso: string | null) => fechaLarga(diaEnColombia(iso));

function UnaQueHagoYo({ r, onCambio }: { r: ReparacionQueHagoYo; onCambio: () => void }) {
  const [avisando, setAvisando] = useState(false);
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const terminada = r.terminadaAt !== null;
  const vencida = !terminada && r.venceAt !== null && new Date(r.venceAt).getTime() < Date.now();

  const yaQuedo = async () => {
    if (enviando) return;
    setEnviando(true);
    try {
      await aprobacionesDeReparacionApi.yaQuedo(r.solicitudId, nota);
      toast.success('Le avisamos a tu inmobiliaria que quedó lista', {
        description: 'También le avisamos al inquilino.',
      });
      onCambio();
    } catch (e) {
      toast.error('No pudimos guardar tu aviso', {
        description: mensajeParaLaPersona(e, { accion: 'avisar que la reparación quedó' }),
      });
      setEnviando(false);
    }
  };

  return (
    <Card className="space-y-3 p-5" data-testid={terminada ? 'reparacion-que-hice-yo' : 'reparacion-que-hago-yo'}>
      <div className="min-w-0 space-y-1">
        <p className="text-caption text-fg-muted">
          {r.inmobiliaria} · {r.inmueble}
        </p>
        <h3 className="text-base font-medium text-fg">{r.reparacion.titulo}</h3>
        {r.reparacion.descripcion && <p className="text-body-sm text-fg-muted">{r.reparacion.descripcion}</p>}
      </div>
      {terminada ? (
        // El estado por su punto y su palabra (Cadence 2), con la fecha al lado.
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="success">Lista</StatusBadge>
          <p className="text-body-sm text-fg-muted">Avisaste que quedó lista el {fechaEnFrase(r.terminadaAt)}.</p>
        </div>
      ) : (
        <>
          <p className="text-body-sm text-fg">
            {r.loDecidio === 'PROPIETARIO'
              ? `Respondiste que la haces tú el ${fechaEnFrase(r.desde)}.`
              : `Quedaste con tu inmobiliaria en que la haces tú (${fechaEnFrase(r.desde)}).`}
            {r.nota ? ` «${r.nota}»` : ''} No se te descuenta nada.
          </p>
          {r.venceAt && (
            <p className={vencida ? 'flex items-center gap-1.5 text-body-sm text-danger' : 'flex items-center gap-1.5 text-body-sm text-fg-muted'}>
              <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
              {vencida
                ? `Tu inmobiliaria la esperaba lista el ${fechaEnFrase(r.venceAt)}. Si no la puedes hacer, avísale: la retoma ella.`
                : `Tu inmobiliaria la espera lista a más tardar el ${fechaEnFrase(r.venceAt)}.`}
            </p>
          )}
          <Presence show={avisando} direction="down">
            <label htmlFor={`ya-quedo-${r.solicitudId}`} className="text-body-sm text-fg">
              ¿Algo que deba saber tu inmobiliaria? <span className="text-fg-muted">(opcional)</span>
            </label>
            <Textarea
              id={`ya-quedo-${r.solicitudId}`}
              className="mt-1.5"
              rows={2}
              maxLength={500}
              placeholder="Ej.: Se cambió el empaque y se selló la unión."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              data-testid="ya-quedo-nota"
            />
          </Presence>
          <div className="flex flex-wrap gap-2">
            {avisando ? (
              <Button hideArrow onClick={() => void yaQuedo()} disabled={enviando} data-testid="ya-quedo-confirmar">
                <CheckCircle className="h-4 w-4" />
                {enviando ? 'Avisando…' : 'Confirmar: ya quedó'}
              </Button>
            ) : (
              <Button hideArrow onClick={() => setAvisando(true)} data-testid="ya-quedo">
                <CheckCircle className="h-4 w-4" />
                Ya quedó
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

export function LasQueHagoYo({
  reparaciones,
  onCambio,
}: {
  reparaciones: ReparacionQueHagoYo[];
  onCambio: () => void;
}) {
  if (reparaciones.length === 0) return null;
  const porHacer = reparaciones.filter((r) => r.terminadaAt === null);
  const hechas = reparaciones.filter((r) => r.terminadaAt !== null);
  return (
    <section className="space-y-3" aria-label="Las que haces tú" data-testid="las-que-hago-yo">
      {/* El título de la sección como «Por aprobar»: liviano, sin ícono. */}
      <div className="space-y-0.5">
        <h2 className="text-sm font-medium text-fg">Las que haces tú</h2>
        <p className="text-caption text-fg-muted">
          Las haces por tu cuenta, con quien tú quieras. Cuando quede, avísale a tu inmobiliaria con «Ya quedó».
        </p>
      </div>
      {porHacer.map((r) => (
        <UnaQueHagoYo key={r.solicitudId} r={r} onCambio={onCambio} />
      ))}
      {hechas.map((r) => (
        <UnaQueHagoYo key={r.solicitudId} r={r} onCambio={onCambio} />
      ))}
    </section>
  );
}
