'use client';

/**
 * 🔴 AVISOS AUTOMÁTICOS: qué le llega solo a tus clientes, y con qué texto.
 *
 * Nico (18-09-2026): «Avisos automáticos: TODOS — factura y cobro del día 1,
 * recordatorio antes de vencer, liquidación y aviso de giro al propietario,
 * vencimientos del contrato Y FALTA EL RECIBO DE CAJA al inquilino. Cada
 * inmobiliaria los prende; NADA SALE DESDE LOCAL.»
 *
 * ── Las tres cosas que esta pantalla tiene que dejar claras ──────────────
 *
 * 1. **Todo arranca APAGADO.** Una inmobiliaria que acaba de migrar no le
 *    manda nada a nadie hasta que lo prenda. Es la lección del 14-09, cuando
 *    salieron ~680 correos de cobro a clientes reales.
 * 2. **Apagar tiene consecuencias**, y se dicen ANTES: apagar el recibo de
 *    caja deja al inquilino sin ningún soporte de su pago (ya no puede subir
 *    la foto de su transferencia, L-04). El back devuelve esa advertencia y
 *    acá se muestra.
 * 3. **Se puede VER el correo antes de prenderlo.** La vista previa renderiza
 *    con la misma función que el envío real: lo que se ve es lo que llega.
 *
 * ⚠️ Esta pantalla NO manda nada y no puede mandar nada: el único endpoint que
 * toca es el de configuración y el de vista previa.
 */

import { useCallback, useEffect, useState } from 'react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { Button } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { avisosApi } from '@/lib/api/avisos.service';
import type { AvisoAutomatico, EstadoDeLosAvisos } from '@/lib/api/avisos.service';
import { cn } from '@/lib/utils';
import { EsqueletoDeSeccion } from './piezas';
import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon';

const TITULO_DEL_GRUPO: Record<AvisoAutomatico['grupo'], string> = {
  PLATA: 'Plata',
  COBRANZA: 'Cobranza',
  CONTRATO: 'Contrato',
};

const A_QUIEN: Record<AvisoAutomatico['destinatario'], string> = {
  INQUILINO: 'Al inquilino',
  PROPIETARIO: 'Al propietario',
  CODEUDOR: 'Al codeudor',
};

export function SeccionAvisos() {
  const [estado, setEstado] = useState<EstadoDeLosAvisos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [previa, setPrevia] = useState<{ aviso: string; asunto: string; html: string } | null>(
    null,
  );

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setEstado(await avisosApi.estado());
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const alternar = async (aviso: AvisoAutomatico) => {
    setGuardando(aviso.codigo);
    try {
      const r = await avisosApi.fijar(aviso.codigo, { prendido: !aviso.prendido });
      setEstado((actual) =>
        actual
          ? {
              ...actual,
              avisos: actual.avisos.map((a) =>
                a.codigo === aviso.codigo
                  ? { ...a, prendido: r.prendido, prendidoAt: r.prendidoAt }
                  : a,
              ),
            }
          : actual,
      );
      /*
       * 🔴 La advertencia de apagar sale como AVISO, no como éxito: apagar el
       * recibo de caja deja al inquilino sin soporte de su pago, y eso no es
       * una buena noticia aunque la acción haya funcionado.
       */
      if (r.advertencia) {
        toast.warning('Quedó apagado', { description: r.advertencia });
      } else {
        toast.success(r.prendido ? 'Aviso prendido' : 'Aviso apagado');
      }
    } catch (e) {
toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo cambiar el aviso. Prueba de nuevo en un momento.',
          accion: 'cambiar el aviso',
        }),
      );
    } finally {
      setGuardando(null);
    }
  };

  const verPrevia = async (aviso: AvisoAutomatico) => {
    try {
      const r = await avisosApi.vistaPrevia(aviso.codigo);
      setPrevia({ aviso: aviso.titulo, asunto: r.asunto, html: r.html });
      if (r.faltantes.length > 0) {
        toast.warning('Al correo le faltan datos', {
          description: `No llegaron: ${r.faltantes.join(', ')}.`,
        });
      }
    } catch (e) {
toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo ver el correo. Prueba de nuevo en un momento.',
          accion: 'armar la vista previa del correo',
        }),
      );
    }
  };

  if (cargando || error || !estado) {
    return (
      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={!cargando && !error && !estado}
        esqueleto={<EsqueletoDeSeccion filas={6} />}
      >
        <span />
      </EstadoDeDatos>
    );
  }

  const grupos: AvisoAutomatico['grupo'][] = ['PLATA', 'COBRANZA', 'CONTRATO'];

  return (
    <div className="space-y-6" data-testid="avisos-automaticos">
        {/* Glow up 22-10: «qué les llega solo y que arranca apagado» ya lo dice
            el marco de Configuración debajo del título: no se repite. */}

        {!estado.disponible && (
          <p
            className="rounded-md border border-border bg-warning-soft px-3 py-2 text-caption text-fg"
            data-testid="avisos-sin-migrar"
          >
            {estado.motivo}
          </p>
        )}

        {grupos.map((grupo) => {
          const delGrupo = estado.avisos.filter((a) => a.grupo === grupo);
          if (delGrupo.length === 0) return null;
          return (
            <section key={grupo} className="space-y-2">
              <h3 className="text-sm font-medium text-fg-muted">
                {TITULO_DEL_GRUPO[grupo]}
              </h3>
              {/* Glow up 22-10: UNA tarjeta por grupo con sus filas (antes una caja por aviso),
                  y ningún botón azul: prender un aviso es una perilla, no LA acción de la pantalla. */}
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {delGrupo.map((aviso) => (
                <div
                  key={aviso.codigo}
                  className="px-4 py-4"
                  data-testid={`aviso-${aviso.codigo}`}
                >
                  {/* A 390 px los dos botones bajan debajo del texto (QA 04-10: desbordaban). */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-fg">
                        {aviso.titulo}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 text-caption font-normal',
                            aviso.prendido ? 'text-success' : 'text-fg-muted',
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn('h-1.5 w-1.5 rounded-full', aviso.prendido ? 'bg-success' : 'bg-fg-subtle')}
                          />
                          <span data-testid={`aviso-estado-${aviso.codigo}`}>
                            {aviso.prendido ? 'Prendido' : 'Apagado'}
                          </span>
                        </span>
                      </p>
                      <p className="mt-1 text-caption text-fg-muted">
                        {A_QUIEN[aviso.destinatario]} · {aviso.cuando}
                        {!aviso.automatico ? ' · No sale solo: lo manda una persona.' : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        hideArrow
                        onClick={() => void verPrevia(aviso)}
                        data-testid={`aviso-previa-${aviso.codigo}`}
                      >
                        Ver el correo
                      </Button>
                      <Button
                        hideArrow
                        size="sm"
                        variant="outline"
                        disabled={!estado.disponible || guardando === aviso.codigo}
                        onClick={() => void alternar(aviso)}
                        data-testid={`aviso-alternar-${aviso.codigo}`}
                      >
                        {guardando === aviso.codigo
                          ? 'Guardando…'
                          : aviso.prendido
                            ? 'Apagar'
                            : 'Prender'}
                      </Button>
                    </div>
                  </div>
                  {!aviso.prendido && aviso.advertenciaAlApagar && (
                    <p
                      className="mt-3 rounded-md border border-border bg-warning-soft px-3 py-2 text-caption text-fg"
                      data-testid={`aviso-advertencia-${aviso.codigo}`}
                    >
                      {aviso.advertenciaAlApagar}
                    </p>
                  )}
                </div>
              ))}
              </div>
            </section>
          );
        })}

        {/* La vista previa en un cajón: antes aparecía al final de la página, lejos del botón. */}
        <Cajon abierto={previa !== null} onOpenChange={(a) => !a && setPrevia(null)} tamano="lg">
          {previa ? (
            <>
              <CajonCabecera titulo={previa.aviso} descripcion={previa.asunto} />
              <CajonCuerpo>
                <section data-testid="aviso-vista-previa">
                  <p className="sr-only">
                    {previa.aviso} — {previa.asunto}
                  </p>
                  {/*
                    El HTML lo arma el BACK con la misma función del envío real. Va en
                    un `iframe` con `sandbox` vacío: es una previsualización, no una
                    página que pueda ejecutar nada.
                  */}
                  <iframe
                    title={`Vista previa de ${previa.aviso}`}
                    sandbox=""
                    srcDoc={previa.html}
                    className="h-[70vh] w-full rounded-lg border border-border bg-white"
                  />
                </section>
              </CajonCuerpo>
            </>
          ) : null}
        </Cajon>
    </div>
  );
}
