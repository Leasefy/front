'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCircle, Copy, LinkSimple, Warning, WarningCircle, EnvelopeSimple, Clock } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { copiarAlPortapapeles } from './enlace-de-la-invitacion';
import { queDecirDelCorreo, type EstadoDelCorreo, type TonoDelEstado } from './estado-de-la-invitacion';
import { useMovimiento } from './movimiento';

/**
 * El enlace personal de la invitación que se acaba de crear o reenviar, con su
 * botón «Copiar» adentro de la fila (02-10-2026, la referencia que trajo Nico:
 * «Enlace para candidatos» con «Copiar» a la derecha).
 *
 * No hay un enlace abierto de la inmobiliaria: cada enlace es de UNA persona y
 * sólo sirve para su correo. Por eso este bloque sólo aparece después de
 * invitar o reenviar, y dice para quién es.
 */

export interface EnlaceVisible {
  memberId: string;
  email: string;
  nombre: string;
  enlace: string;
  correo: EstadoDelCorreo;
  /** Reenviar genera un token nuevo: el enlace anterior dejó de servir. */
  reenviado: boolean;
}

/** Ícono y color de cada tono: el estado nunca va sólo en color. */
export const ICONO_DEL_TONO: Record<TonoDelEstado, typeof Check> = {
  enviada: EnvelopeSimple,
  pendiente: Clock,
  aviso: Warning,
  peligro: WarningCircle,
};

export const COLOR_DEL_TONO: Record<TonoDelEstado, string> = {
  enviada: 'text-fg-muted',
  pendiente: 'text-fg-muted',
  aviso: 'text-warning',
  peligro: 'text-danger',
};

function primerNombre(nombre: string, email: string): string {
  const n = nombre.trim().split(/\s+/)[0];
  return n || email;
}

export const EnlaceDeInvitacion = forwardRef<HTMLButtonElement, { enlace: EnlaceVisible }>(
  function EnlaceDeInvitacion({ enlace }, copiarRef) {
    const [copiado, setCopiado] = useState(false);
    const textoRef = useRef<HTMLSpanElement>(null);
    const mov = useMovimiento();
    const estado = queDecirDelCorreo(enlace.correo, enlace.email);
    const IconoDelEstado = enlace.correo === 'sent' ? CheckCircle : ICONO_DEL_TONO[estado.tono];

    // Un enlace nuevo (otra persona, o el mismo reenviado) vuelve a «Copiar».
    useEffect(() => setCopiado(false), [enlace.enlace]);

    useEffect(() => {
      if (!copiado) return;
      const t = window.setTimeout(() => setCopiado(false), 2500);
      return () => window.clearTimeout(t);
    }, [copiado]);

    const copiar = async () => {
      if (await copiarAlPortapapeles(enlace.enlace)) {
        setCopiado(true);
        return;
      }
      // El navegador no dejó: el enlace queda seleccionado para copiarlo a mano.
      const nodo = textoRef.current;
      const seleccion = typeof window !== 'undefined' ? window.getSelection() : null;
      if (nodo && seleccion) {
        const rango = document.createRange();
        rango.selectNodeContents(nodo);
        seleccion.removeAllRanges();
        seleccion.addRange(rango);
      }
      toast.info('Cópialo a mano', {
        description: 'El navegador no nos dejó copiarlo. El enlace quedó seleccionado: usa Ctrl+C, o mantenlo presionado en el celular.',
      });
    };

    return (
      // Llega subiendo 8 px. La `key` es el enlace: el de otra persona (o el
      // mismo reenviado, que es otro token) vuelve a entrar, y se nota que cambió.
      <motion.section
        key={enlace.enlace}
        initial={mov.llega.initial}
        animate={mov.llega.animate}
        aria-labelledby="enlace-de-invitacion-titulo"
        className="space-y-2.5"
        data-testid="enlace-de-invitacion"
      >
        <h3 id="enlace-de-invitacion-titulo" className="text-sm font-medium text-fg">
          Enlace de invitación de {primerNombre(enlace.nombre, enlace.email)}
        </h3>
        <p
          // Sin `cn`: tailwind-merge toma `text-caption` y el color por el mismo
          // grupo y descarta el tamaño.
          className={`flex items-start gap-1.5 text-caption ${enlace.correo === 'sent' ? 'text-success' : COLOR_DEL_TONO[estado.tono]}`}
          role="status"
        >
          <IconoDelEstado className="mt-0.5 size-4 shrink-0" weight="fill" aria-hidden="true" />
          <span>
            {estado.texto}
            {enlace.reenviado && ' Es un enlace nuevo: el anterior ya no sirve.'}
          </span>
        </p>
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-4 pr-1.5">
          <LinkSimple className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
          <span
            ref={textoRef}
            className="min-w-0 flex-1 select-all truncate font-mono text-[13px] text-fg-muted"
            title={enlace.enlace}
            data-testid="enlace-de-invitacion-url"
          >
            {enlace.enlace}
          </span>
          <Button
            ref={copiarRef}
            type="button"
            size="sm"
            variant="secondary"
            className="relative shrink-0 rounded-full"
            onClick={() => void copiar()}
            aria-label={copiado ? 'Enlace copiado' : `Copiar el enlace de ${enlace.email}`}
          >
            {/* El ancho lo fija la palabra más larga, invisible: el botón no
                salta al pasar de «Copiar» a «Copiado». */}
            <span aria-hidden="true" className="invisible flex items-center gap-1.5">
              <Check className="size-4" weight="bold" />
              Copiado
            </span>
            {/* «Copiar» sale subiendo y «Copiado» llega desde abajo, con el
                visto que salta; a los 2,5 s vuelve igual. */}
            <AnimatePresence initial={false}>
              <motion.span
                key={copiado ? 'copiado' : 'copiar'}
                initial={mov.cambia.initial}
                animate={mov.cambia.animate}
                exit={mov.cambia.exit}
                className="absolute inset-0 flex items-center justify-center gap-1.5"
              >
                {copiado ? (
                  <motion.span initial={mov.salta.initial} animate={mov.salta.animate} className="inline-flex">
                    <Check className="size-4" weight="bold" aria-hidden="true" />
                  </motion.span>
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                {copiado ? 'Copiado' : 'Copiar'}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
        <p className="text-caption text-fg-muted">
          Mándaselo por WhatsApp si el correo no le llega. Sólo sirve para{' '}
          <span className="font-medium text-fg">{enlace.email}</span> y vence en 7 días.
        </p>
        <span className="sr-only" aria-live="polite">
          {copiado ? `Enlace de ${enlace.email} copiado` : ''}
        </span>
      </motion.section>
    );
  },
);
