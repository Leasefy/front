'use client';

import { useEffect, useState } from 'react';
import { LockSimple } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { apuntesDelInmuebleApi } from '@/lib/api/apuntes-del-inmueble.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

const TOPE = 5000;

/**
 * OBSERVACIONES INTERNAS del inmueble (Juan, 27-10-2026: «algo que se maneja mucho en esos CRM… observaciones que
 * sólo va a ver la inmobiliaria: la propiedad tiene una humedad en el techo… queda muy explícito que es únicamente
 * para la inmobiliaria»). Viven en el back aparte del aviso (`apuntes-del-inmueble`, columna con `@ignore`): ninguna
 * ruta pública las devuelve.
 */
export function ObservacionesInternas({ propertyId }: { propertyId: string }) {
  const [guardado, setGuardado] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [disponible, setDisponible] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    apuntesDelInmuebleApi
      .leer(propertyId)
      .then((a) => {
        if (!vivo) return;
        setDisponible(a.disponible);
        setGuardado(a.observacionesInternas ?? '');
        setTexto(a.observacionesInternas ?? '');
      })
      .catch(() => {
        if (vivo) setGuardado('');
      });
    return () => {
      vivo = false;
    };
  }, [propertyId]);

  const cambio = guardado !== null && texto.trim() !== (guardado ?? '').trim();

  const guardar = async () => {
    setGuardando(true);
    try {
      const a = await apuntesDelInmuebleApi.guardarObservaciones(propertyId, texto.trim());
      setGuardado(a.observacionesInternas ?? '');
      setTexto(a.observacionesInternas ?? '');
      toast.success('Observaciones guardadas', { description: 'Sólo las ve tu equipo.' });
    } catch (error) {
      toast.error('No pudimos guardar las observaciones', {
        description: mensajeParaLaPersona(error, { accion: 'guardar las observaciones' }),
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-surface p-5" data-testid="observaciones-internas">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[16px] font-medium text-fg">Observaciones internas</h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-caption text-fg-muted">
          <LockSimple className="h-3.5 w-3.5" weight="bold" aria-hidden="true" />
          Sólo las ve tu equipo · nunca salen en el aviso
        </span>
      </div>
      <p className="mt-1 text-sm text-fg-muted">
        Lo que tienes que recordar de este inmueble y no le dices al cliente.
      </p>
      {disponible ? (
        <>
          <Textarea
            className="mt-3 w-full"
            rows={5}
            maxLength={TOPE}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej.: Humedad en el techo del baño principal. El propietario prefiere que lo llamen en la tarde."
            aria-label="Observaciones internas"
            disabled={guardado === null}
            data-testid="observaciones-internas-texto"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-caption text-fg-subtle tabular-nums">
              {texto.length.toLocaleString('es-CO')} / {TOPE.toLocaleString('es-CO')}
            </span>
            <Button size="sm" hideArrow onClick={() => void guardar()} disabled={!cambio} isLoading={guardando} data-testid="observaciones-internas-guardar">
              Guardar
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-3 rounded-md bg-surface-muted p-3 text-sm text-fg-muted" data-testid="observaciones-internas-no-disponible">
          Todavía no se pueden guardar: estamos terminando de activarlas.
        </p>
      )}
    </section>
  );
}
