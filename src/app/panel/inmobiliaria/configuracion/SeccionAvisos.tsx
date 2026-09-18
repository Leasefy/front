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
import { avisosApi } from '@/lib/api/avisos.service';
import type { AvisoAutomatico, EstadoDeLosAvisos } from '@/lib/api/avisos.service';
import { cn } from '@/lib/utils';
import { EsqueletoDeSeccion } from './piezas';

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
      toast.error('No se pudo cambiar el aviso', {
        description: e instanceof Error ? e.message : undefined,
      });
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
      toast.error('No se pudo ver el correo', {
        description: e instanceof Error ? e.message : undefined,
      });
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
        <p className="text-sm text-fg-muted">
          Esto es lo que les llega solo a tus inquilinos y a tus propietarios.
          Todo arranca <strong>apagado</strong>: nada sale hasta que lo prendas.
        </p>

        {!estado.disponible && (
          <p
            className="rounded-md border border-border bg-warning-soft px-3 py-2 text-xs text-fg"
            data-testid="avisos-sin-migrar"
          >
            {estado.motivo}
          </p>
        )}

        {grupos.map((grupo) => {
          const delGrupo = estado.avisos.filter((a) => a.grupo === grupo);
          if (delGrupo.length === 0) return null;
          return (
            <section key={grupo} className="space-y-3">
              <h3 className="text-sm font-semibold text-fg">
                {TITULO_DEL_GRUPO[grupo]}
              </h3>
              {delGrupo.map((aviso) => (
                <div
                  key={aviso.codigo}
                  className="rounded-lg border border-border bg-surface p-4"
                  data-testid={`aviso-${aviso.codigo}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-fg">{aviso.titulo}</p>
                      <p className="mt-1 text-xs text-fg-muted">
                        {A_QUIEN[aviso.destinatario]} · {aviso.cuando}
                      </p>
                      {!aviso.automatico && (
                        <p className="mt-1 text-xs text-fg-muted">
                          No sale solo: lo manda una persona.
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        hideArrow
                        onClick={() => void verPrevia(aviso)}
                        data-testid={`aviso-previa-${aviso.codigo}`}
                      >
                        Ver el correo
                      </Button>
                      <Button
                        hideArrow
                        variant={aviso.prendido ? 'outline' : 'default'}
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
                  <p
                    className={cn(
                      'mt-2 text-xs font-medium',
                      aviso.prendido ? 'text-success' : 'text-fg-muted',
                    )}
                    data-testid={`aviso-estado-${aviso.codigo}`}
                  >
                    {aviso.prendido ? 'Prendido' : 'Apagado'}
                  </p>
                  {!aviso.prendido && aviso.advertenciaAlApagar && (
                    <p
                      className="mt-2 rounded-md border border-border bg-warning-soft px-3 py-2 text-xs text-fg"
                      data-testid={`aviso-advertencia-${aviso.codigo}`}
                    >
                      {aviso.advertenciaAlApagar}
                    </p>
                  )}
                </div>
              ))}
            </section>
          );
        })}

        {previa && (
          <section className="space-y-2" data-testid="aviso-vista-previa">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-fg">
                {previa.aviso} — {previa.asunto}
              </h3>
              <Button variant="outline" hideArrow onClick={() => setPrevia(null)}>
                Cerrar
              </Button>
            </div>
            {/*
              El HTML lo arma el BACK con la misma función del envío real. Va en
              un `iframe` con `sandbox` vacío: es una previsualización, no una
              página que pueda ejecutar nada.
            */}
            <iframe
              title={`Vista previa de ${previa.aviso}`}
              sandbox=""
              srcDoc={previa.html}
              className="h-[540px] w-full rounded-lg border border-border bg-white"
            />
          </section>
        )}
    </div>
  );
}
