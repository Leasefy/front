'use client';

/**
 * Qué condona «Total» en esta inmobiliaria — B-13 (QA-PAGOS-95 ronda 2; Nico,
 * 05-10-2026: «configurable, es lo que diga la inmobiliaria»).
 *
 * (a) `LO_DE_HOY` (el defecto): perdona lo que la cuota debe de intereses hoy;
 * si sigue sin pagarse, el interés vuelve a correr. (b) `DESDE_HOY_SIN_INTERES`:
 * desde ese día la cuota no liquida más interés (la cartera, la Deuda del mes,
 * el estado de cuenta, Laura y el Piloto lo respetan: lo lee el motor de mora).
 * Lo cambia un ADMINISTRADOR; los demás lo ven.
 */

import * as React from 'react';
import { Banner } from '@leasefy/cadence';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  condonacionesApi,
  type AjusteDeLaCondonacion as Ajuste,
  type AlcanceDelTotal,
} from '@/lib/api/condonaciones.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

const OPCIONES: { valor: AlcanceDelTotal; titulo: string; explicacion: string }[] = [
  {
    valor: 'LO_DE_HOY',
    titulo: 'Perdona lo de hoy',
    explicacion:
      'Condonar el total perdona lo que la cuota debe de intereses hoy. Si sigue sin pagarse, desde mañana vuelve a correr el interés sobre el capital vencido.',
  },
  {
    valor: 'DESDE_HOY_SIN_INTERES',
    titulo: 'La cuota queda sin interés',
    explicacion:
      'Condonar el total deja la cuota sin interés desde ese día: no vuelve a liquidar intereses de mora aunque siga sin pagarse.',
  },
];

export function AjusteDeLaCondonacion() {
  const { isAdmin } = usePermissions();
  const [ajuste, setAjuste] = React.useState<Ajuste | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [guardando, setGuardando] = React.useState<AlcanceDelTotal | null>(null);

  React.useEffect(() => {
    let vivo = true;
    condonacionesApi
      .ajuste()
      .then((a) => vivo && setAjuste(a))
      .catch((e) =>
        vivo &&
        setError(
          mensajeParaLaPersona(e, {
            porDefecto: 'No se pudo leer cómo condona esta inmobiliaria.',
          }),
        ),
      );
    return () => {
      vivo = false;
    };
  }, []);

  const elegir = async (valor: AlcanceDelTotal) => {
    if (!isAdmin || !ajuste || valor === ajuste.alcanceDelTotal) return;
    setGuardando(valor);
    try {
      setAjuste(await condonacionesApi.guardarAjuste(valor));
      toast.success('Quedó guardado cómo se condona el total.');
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo guardar.',
          accion: 'guardar cómo se condona el total',
        }),
      );
    } finally {
      setGuardando(null);
    }
  };

  return (
    <section
      className="space-y-3 rounded-md border border-border-faint p-4"
      data-testid="ajuste-de-la-condonacion"
      aria-labelledby="ajuste-de-la-condonacion-titulo"
    >
      <div>
        <h3 id="ajuste-de-la-condonacion-titulo" className="text-sm font-medium text-fg">
          Condonar intereses: qué hace «Total»
        </h3>
        <p className="text-caption text-fg-muted">
          Un administrador condona los intereses de una cuota desde el estado de cuenta, con motivo. Aquí se elige qué
          pasa cuando condona el total.
        </p>
      </div>
      {error && <Banner variant="danger">{error}</Banner>}
      {ajuste && !ajuste.disponible && (
        <Banner variant="warning">
          Condonar intereses todavía no está disponible: falta una actualización de la base.
        </Banner>
      )}
      {ajuste && (
        <div className="grid gap-2 md:grid-cols-2" role="radiogroup" aria-labelledby="ajuste-de-la-condonacion-titulo">
          {OPCIONES.map((o) => {
            const elegida = ajuste.alcanceDelTotal === o.valor;
            return (
              // Revisora r25 (Reglas de mora #3): un radio con borde azul y fondo suave, no un
              // botón primario lleno (era el segundo azul de la pantalla).
              <button
                key={o.valor}
                type="button"
                role="radio"
                aria-checked={elegida}
                disabled={!isAdmin || !ajuste.disponible || guardando !== null}
                aria-busy={guardando === o.valor || undefined}
                onClick={() => void elegir(o.valor)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  elegida ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:bg-surface-muted',
                )}
                data-testid={`condonacion-${o.valor}`}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    elegida ? 'border-primary' : 'border-border-strong',
                  )}
                  aria-hidden="true"
                >
                  {guardando === o.valor ? (
                    <Spinner size="xs" />
                  ) : elegida ? (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  ) : null}
                </span>
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-body-sm font-medium text-fg">
                    {o.titulo}
                    {o.valor === 'LO_DE_HOY' && !ajuste.elegidoPorLaInmobiliaria ? ' (el de siempre)' : ''}
                  </span>
                  <span className="block text-caption text-fg-muted">{o.explicacion}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {ajuste && !isAdmin && (
        <p className="text-caption text-fg-muted">Lo cambia un administrador.</p>
      )}
    </section>
  );
}
