'use client';

/**
 * Plantillas de mensaje en el compositor.
 *
 * Nico: «deberíamos de tener plantillas para que la inmobiliaria pueda
 * comunicarse mucho más rápido con los usuarios, múltiples plantillas».
 *
 * ── Las tres reglas que definen esta pantalla ───────────────────────────────
 *
 * 1. 🔴 **NO manda nada.** Elegir una plantilla llena el campo y ahí queda,
 *    editable. Un botón que envía sin dejar leer convierte un atajo en un
 *    riesgo: el texto lleva el nombre de una persona y un mes, y si algo salió
 *    mal el error ya está en el hilo de un cliente.
 * 2. **Lo que no se pudo reemplazar se DICE.** `resolverPlantilla` devuelve
 *    `sinResolver`; el compositor pinta un aviso con los nombres. Mandar
 *    «Hola {{nombre}}» es peor que no tener plantillas.
 * 3. **Vacío ≠ no disponible.** El endpoint se está construyendo mientras esto
 *    se prueba. Un 404 dice «todavía no está disponible»; sólo una respuesta
 *    real con cero filas ofrece instalar el catálogo sugerido.
 */

import { useCallback, useEffect, useState } from 'react';
import { ArrowClockwise, Notepad, Plus } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { usePanelFlotante } from '@/components/messages/usePanelFlotante';
import { endpointNoDisponible } from '@/components/messages/endpoint-no-disponible';
import {
  plantillasDeMensajeApi,
  resolverPlantilla,
  type PlantillaDeMensaje,
  type VariableDePlantilla,
} from '@/lib/api/plantillas-de-mensaje.service';

type Estado =
  | { fase: 'inicial' }
  | { fase: 'cargando' }
  | { fase: 'lista'; plantillas: PlantillaDeMensaje[] }
  | { fase: 'noDisponible' }
  | { fase: 'error' };

interface Props {
  locale: string;
  /** Con qué se resuelven las variables. Lo que no está, queda sin resolver. */
  datos: Partial<Record<VariableDePlantilla, string>>;
  /** El texto ya resuelto y qué variables quedaron sin reemplazar. */
  onElegir: (texto: string, sinResolver: string[]) => void;
  className?: string;
}

export function PlantillasDeMensajePopover({ locale, datos, onElegir, className }: Props) {
  const panel = usePanelFlotante<HTMLDivElement>();
  const [estado, setEstado] = useState<Estado>({ fase: 'inicial' });
  const [instalando, setInstalando] = useState(false);
  const es = locale === 'es';

  const traer = useCallback(async () => {
    setEstado({ fase: 'cargando' });
    try {
      const { plantillas } = await plantillasDeMensajeApi.listar();
      setEstado({ fase: 'lista', plantillas: plantillas ?? [] });
    } catch (err) {
      setEstado({ fase: endpointNoDisponible(err) ? 'noDisponible' : 'error' });
    }
  }, []);

  /* Se pide al ABRIR, no al montar: la bandeja no tiene por qué gastar una
     consulta por cada conversación que alguien mira sin usar plantillas. */
  const abierto = panel.abierto;
  useEffect(() => {
    if (abierto) void traer();
  }, [abierto, traer]);

  const instalarSugeridas = useCallback(async () => {
    setInstalando(true);
    try {
      await plantillasDeMensajeApi.instalarSugeridas();
      await traer();
    } catch (err) {
      setEstado({ fase: endpointNoDisponible(err) ? 'noDisponible' : 'error' });
    } finally {
      setInstalando(false);
    }
  }, [traer]);

  const elegir = useCallback(
    (plantilla: PlantillaDeMensaje) => {
      const { texto, sinResolver } = resolverPlantilla(plantilla.cuerpo, datos);
      onElegir(texto, sinResolver);
      panel.cerrar();
    },
    [datos, onElegir, panel],
  );

  return (
    <div ref={panel.ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={panel.alternar}
        aria-label={es ? 'Plantillas de mensaje' : 'Message templates'}
        title={es ? 'Plantillas de mensaje' : 'Message templates'}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        data-testid="abrir-plantillas"
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          abierto
            ? 'bg-primary-soft text-primary'
            : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
        )}
      >
        <Notepad className="h-5 w-5" aria-hidden="true" />
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label={es ? 'Plantillas de mensaje' : 'Message templates'}
          data-testid="panel-plantillas"
          className="absolute bottom-full left-0 z-50 mb-2 max-h-80 w-80 overflow-y-auto rounded-lg border border-border bg-surface p-3 shadow-lg"
        >
          <div className="mb-2">
            <p className="text-sm font-semibold text-fg">
              {es ? 'Plantillas' : 'Templates'}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              {es
                ? 'Se escribe en el campo para que la revises. No se manda sola.'
                : 'It fills the field for you to review. Nothing is sent on its own.'}
            </p>
          </div>

          {estado.fase === 'cargando' && (
            <p className="py-4 text-center text-sm text-fg-muted">
              {es ? 'Cargando…' : 'Loading…'}
            </p>
          )}

          {estado.fase === 'noDisponible' && (
            <p className="py-4 text-center text-sm text-fg-muted" data-testid="plantillas-no-disponible">
              {es
                ? 'Las plantillas todavía no están disponibles en tu cuenta.'
                : 'Templates are not available on your account yet.'}
            </p>
          )}

          {estado.fase === 'error' && (
            <div className="py-4 text-center">
              <p className="text-sm text-fg-muted">
                {es
                  ? 'No pudimos traer las plantillas.'
                  : "We couldn't load the templates."}
              </p>
              <button
                type="button"
                onClick={() => void traer()}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-primary-soft"
              >
                <ArrowClockwise className="h-4 w-4" aria-hidden="true" />
                {es ? 'Reintentar' : 'Retry'}
              </button>
            </div>
          )}

          {estado.fase === 'lista' && estado.plantillas.length === 0 && (
            <div className="py-4 text-center" data-testid="plantillas-vacio">
              <p className="text-sm text-fg-muted">
                {es
                  ? 'Todavía no tenés plantillas guardadas.'
                  : 'You have no saved templates yet.'}
              </p>
              <button
                type="button"
                onClick={() => void instalarSugeridas()}
                disabled={instalando}
                data-testid="instalar-plantillas-sugeridas"
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" weight="bold" aria-hidden="true" />
                {instalando
                  ? es
                    ? 'Instalando…'
                    : 'Installing…'
                  : es
                    ? 'Instalar las sugeridas'
                    : 'Install the suggested ones'}
              </button>
            </div>
          )}

          {estado.fase === 'lista' && estado.plantillas.length > 0 && (
            <ul className="space-y-0.5">
              {estado.plantillas.map((plantilla) => (
                <li key={plantilla.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => elegir(plantilla)}
                    data-testid="plantilla"
                    className="w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <span className="block text-sm font-medium text-fg">
                      {plantilla.titulo}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-fg-muted">
                      {plantilla.cuerpo}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
