'use client';

/**
 * ¿La hace la inmobiliaria o el propietario? (reunión con Portofino, 22-10-2026)
 *
 * Nico: «para tiempos más laxos, "la puede hacer usted"; de crítico urgente,
 * sólo la inmobiliaria». Dentro de la tarjeta de la reparación:
 *   · si el propietario la está haciendo: quién lo decidió, desde cuándo, su
 *     nota y «La retoma la inmobiliaria» (si no la hizo a tiempo);
 *   · si ya avisó que quedó: lo dice;
 *   · si se le puede dejar (Media o Baja, antes de aprobar): «Que la haga el
 *     propietario», para cuando él lo pidió por teléfono;
 *   · si la prioridad no lo deja (Alta o Emergencia): la frase del porqué.
 * El propietario también puede responder «La hago yo» desde su portal.
 */

import { Info, UserCircle } from '@phosphor-icons/react';
import { Presence, StatusBadge } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { confirmar } from '@/components/ui/confirmar';
import { toast } from '@/components/ui/toast';
import { diasDeCalendarioDesde } from '@/lib/fechas/dias-de-calendario';
import { aprobacionesDeReparacionApi } from '@/lib/api/aprobaciones-de-reparacion.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria';

function haceCuanto(iso: string): string {
  const d = diasDeCalendarioDesde(iso);
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`;
}

/** Un campo de nota dentro del diálogo: se lee al confirmar. */
function CampoDeNota({
  id,
  etiqueta,
  ejemplo,
  alEscribir,
}: {
  id: string;
  etiqueta: string;
  ejemplo: string;
  alEscribir: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5 text-left">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {etiqueta} <span className="font-normal text-fg-muted">(opcional)</span>
      </label>
      <Textarea
        id={id}
        rows={3}
        maxLength={500}
        placeholder={ejemplo}
        onChange={(e) => alEscribir(e.target.value)}
      />
    </div>
  );
}

export function QuienHaceLaReparacion({
  solicitud,
  onCambio,
}: {
  solicitud: SolicitudMantenimiento;
  /** Después de dejársela al propietario o de retomarla: releer la tarjeta. */
  onCambio?: () => void | Promise<void>;
}) {
  const laHace = solicitud.laHaceElPropietario ?? null;
  const antesDeAprobar = solicitud.status === 'reported' || solicitud.status === 'quoted';

  const dejarselaAlPropietario = async () => {
    let nota = '';
    const esperaAlPropietario = solicitud.aprobacionDelPropietario?.estado === 'PENDIENTE';
    await confirmar({
      titulo: '¿La hace el propietario por su cuenta?',
      descripcion: (
        <>
          No se le descuenta nada: él le paga directo a quien la haga. La tarjeta pasa a «En arreglo», al inquilino le
          avisamos que la arregla el propietario y al propietario que quedamos en eso.
          {esperaAlPropietario ? ' La aprobación que esperaba su respuesta se retira.' : ''} El plazo sigue corriendo: si
          no la hace a tiempo, la puedes retomar.
        </>
      ),
      detalle: (
        <CampoDeNota
          id="nota-la-hace-el-propietario"
          etiqueta="Nota"
          ejemplo="Ej.: Lo hablamos por teléfono; la hace su plomero de confianza."
          alEscribir={(v) => (nota = v)}
        />
      ),
      accion: 'Dejársela al propietario',
      icono: <UserCircle weight="bold" />,
      alConfirmar: async () => {
        try {
          await aprobacionesDeReparacionApi.laHaceElPropietario(solicitud.id, nota);
        } catch (e) {
          toast.error('No se la pudimos dejar al propietario', {
            description: mensajeParaLaPersona(e, { accion: 'dejarle la reparación al propietario' }),
          });
          throw e;
        }
        toast.success('La reparación quedó en manos del propietario', {
          description: 'Le avisamos al inquilino y al propietario.',
        });
        await onCambio?.();
      },
    });
  };

  const retomar = async () => {
    let motivo = '';
    await confirmar({
      titulo: '¿La retoma la inmobiliaria?',
      descripcion:
        'El propietario ya no la tiene que hacer. La tarjeta vuelve a «Cotizada» si tiene cotizaciones, o a «Reportada», y les avisamos a los dos.',
      detalle: (
        <CampoDeNota
          id="motivo-la-retoma"
          etiqueta="Por qué"
          ejemplo="Ej.: Pasaron tres días y no la ha hecho."
          alEscribir={(v) => (motivo = v)}
        />
      ),
      tipo: 'advertencia',
      accion: 'Retomarla',
      alConfirmar: async () => {
        try {
          await aprobacionesDeReparacionApi.laRetomaLaInmobiliaria(solicitud.id, motivo);
        } catch (e) {
          toast.error('No se pudo retomar la reparación', {
            description: mensajeParaLaPersona(e, { accion: 'retomar la reparación' }),
          });
          throw e;
        }
        toast.success('La inmobiliaria retomó la reparación');
        await onCambio?.();
      },
    });
  };

  if (laHace) {
    const quien =
      laHace.loDecidio === 'PROPIETARIO'
        ? `El propietario respondió «La hago yo» ${haceCuanto(laHace.desde)}.`
        : `Se la dejaron al propietario ${haceCuanto(laHace.desde)}.`;
    if (laHace.terminadaAt) {
      return (
        // Glow up 23-10: en arena dentro del cajón (sin tarjeta con borde) y el estado por su punto y su palabra.
        <Presence show direction="up" className="space-y-2 rounded-xl bg-surface-muted p-4" data-testid="la-hizo-el-propietario">
          <StatusBadge tone="success">La hizo el propietario</StatusBadge>
          <p className="text-body-sm text-fg-muted">
            {quien} Avisó que quedó lista {haceCuanto(laHace.terminadaAt)}
            {laHace.terminadaNota ? `: «${laHace.terminadaNota}»` : '.'}
          </p>
        </Presence>
      );
    }
    return (
      <Presence
        show
        direction="up"
        className="space-y-3 rounded-xl bg-surface-muted p-4"
        data-testid="la-hace-el-propietario"
      >
        <div className="space-y-2">
          <StatusBadge tone="warning">La hace el propietario</StatusBadge>
          <p className="text-body-sm text-fg-muted">
            {quien}
            {laHace.nota ? ` «${laHace.nota}»` : ''} No se le descuenta nada. Cuando quede, él lo avisa desde su portal.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={retomar} data-testid="retomar-la-reparacion">
          La retoma la inmobiliaria
        </Button>
      </Presence>
    );
  }

  if (!antesDeAprobar) return null;

  if (solicitud.puedeHacerlaElPropietario) {
    return (
      <Presence
        show
        direction="up"
        className="flex flex-col gap-3 rounded-xl bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between"
        data-testid="se-la-puede-dejar"
      >
        <p className="text-body-sm text-fg-muted">
          ¿El propietario la va a hacer por su cuenta, con su plomero o él mismo?
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0"
          onClick={dejarselaAlPropietario}
          data-testid="dejarsela-al-propietario"
        >
          Que la haga el propietario
        </Button>
      </Presence>
    );
  }

  if (solicitud.porQueNoLaPuedeHacerElPropietario) {
    return (
      <p className="flex items-start gap-2 text-body-sm text-fg-muted" data-testid="solo-la-inmobiliaria">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {solicitud.porQueNoLaPuedeHacerElPropietario}
      </p>
    );
  }
  return null;
}
