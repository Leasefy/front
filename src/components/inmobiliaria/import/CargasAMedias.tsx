'use client';

/**
 * CargasAMedias — «Tienes una carga a medias» (T-0130).
 *
 * El lote vive en el servidor desde la primera tanda que llega, así que una
 * carga cortada —subiendo, ubicando direcciones, con filas que fallaron al
 * crearse— no se pierde: esta tarjeta la ofrece en CUALQUIER paso del asistente,
 * también con un archivo ya leído, y dice cuánto va. Nunca se empieza de cero
 * habiendo un lote.
 *
 * Tres salidas por carga: Continuar (la etapa en la que quedó), Reintentar (job
 * muerto o filas fallidas) y Descartar (con confirmación: es lo único destructivo).
 *
 * 🔴 «¿Cuál de esos retomo?» (Nico, 2026-09-11, con cinco cargas del mismo
 * archivo): cada fila dice cuándo se subió, cuánto avanzó y si frena el paso.
 */

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/toast';
import { asegurarSesionVigente } from '@/lib/api/client';
import {
  inmueblesImportacionApi,
  type EstadoDeLoteInmuebles,
} from '@/lib/api/inmuebles-importacion.service';
import { describirCargaAbierta, ubicacionCompleta } from './lib/describirCargaAbierta';
import { leerClaveDeCarga, olvidarClaveDeCarga } from './lib/claveDeCarga';
import { mensajeDeCarga } from './lib/mensajeDeCarga';

export function CargasAMedias({
  lotes,
  onRetomar,
  onDescartada,
  onCambio,
}: {
  lotes: readonly EstadoDeLoteInmuebles[];
  /** Entrar a la carga, en la etapa en que quedó. */
  onRetomar: (lote: EstadoDeLoteInmuebles) => void;
  /** La carga ya no existe: el asistente suelta el lote si era el suyo. */
  onDescartada: (lote: string) => void;
  /** Algo cambió en el servidor: volver a leer la lista. */
  onCambio: () => void;
}) {
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [aDescartar, setADescartar] = useState<EstadoDeLoteInmuebles | null>(null);

  const reintentar = useCallback(
    async (l: EstadoDeLoteInmuebles, omitirUbicacion = false) => {
      setTrabajando(l.lote);
      try {
        await asegurarSesionVigente();
        const r = await inmueblesImportacionApi.reintentar(l.lote, { omitirUbicacion });
        toast.success(
          r.accion === 'FILAS_LIBERADAS'
            ? `${r.filasLiberadas} ${r.filasLiberadas === 1 ? 'fila liberada' : 'filas liberadas'}`
            : omitirUbicacion
              ? 'Seguimos sin ubicar el resto en el mapa'
              : 'Retomamos la carga donde quedó',
          {
            description:
              r.accion === 'FILAS_LIBERADAS'
                ? 'Quedaron listas: entra a la carga y toca «Crear todas» para intentarlas de nuevo.'
                : 'Entra a la carga para ver cómo avanza.',
          },
        );
        onCambio();
        onRetomar(r.lote);
      } catch (e) {
        toast.error(mensajeDeCarga(e, 'No pudimos reintentar esta carga.', 'reintentar esta carga'));
        onCambio();
      } finally {
        setTrabajando(null);
      }
    },
    [onCambio, onRetomar],
  );

  const descartar = useCallback(
    async (l: EstadoDeLoteInmuebles) => {
      setTrabajando(l.lote);
      try {
        await asegurarSesionVigente();
        const r = await inmueblesImportacionApi.descartarLote(l.lote);
        olvidarClaveDeCarga(l.lote);
        onDescartada(l.lote);
        toast.success('Carga descartada', {
          description: `${r.descartadas} ${r.descartadas === 1 ? 'fila quedó fuera' : 'filas quedaron fuera'}. Los inmuebles que ya se habían creado no se tocan.`,
        });
      } catch (e) {
        // `LOTE_EN_PROCESO` NO es un fallo de la persona: es «espera», y se dice.
        toast.error(mensajeDeCarga(e, 'No pudimos descartar esa carga.', 'descartar esa carga'));
      } finally {
        setTrabajando(null);
        setADescartar(null);
      }
    },
    [onDescartada],
  );

  /*
   * T-0131 — el servidor deja una carga TERMINADA a la vista 24 h para que quien
   * vuelve vea cómo acabó. NO está «a medias»: va aparte, como resumen.
   */
  const abiertas = lotes.filter((l) => l.fase !== 'TERMINADA');
  const terminadas = lotes.filter((l) => l.fase === 'TERMINADA');
  if (lotes.length === 0) return null;

  return (
    <>
    {terminadas.length > 0 ? (
      <section
        className="mb-6 space-y-3 rounded-lg border border-border bg-surface-muted p-5"
        data-testid="lotes-inmuebles-terminados"
        aria-label="Cargas terminadas"
      >
        {terminadas.map((l) => {
          const d = describirCargaAbierta(l, new Date());
          const ocupada = trabajando === l.lote;
          return (
            <div
              key={l.lote}
              className="flex flex-wrap items-center justify-between gap-3"
              data-testid={`carga-terminada-${l.lote}`}
            >
              <p className="min-w-0 text-sm text-fg">
                {d.cuando ? <span className="font-medium">{d.cuando}</span> : null}
                {d.cuando ? ' · ' : null}
                <span className="font-mono tabular-nums" data-testid={`avance-${l.lote}`}>
                  {d.avance}
                </span>
                {d.porRevisar > 0 ? (
                  <span className="text-fg-muted">
                    {' '}
                    · {d.porRevisar.toLocaleString('es-CO')} por revisar
                  </span>
                ) : null}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {d.fallidas > 0 && d.puedeReintentar ? (
                  <Button
                    size="sm"
                    variant="outline"
                    hideArrow
                    disabled={ocupada}
                    isLoading={ocupada}
                    data-testid={`reintentar-${l.lote}`}
                    onClick={() => void reintentar(l)}
                  >
                    Reintentar las fallidas
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  hideArrow
                  disabled={ocupada}
                  data-testid={`retomar-${l.lote}`}
                  onClick={() => onRetomar(l)}
                >
                  Ver resumen
                </Button>
              </div>
            </div>
          );
        })}
      </section>
    ) : null}

    {abiertas.length > 0 ? (
    <section
      className="mb-6 space-y-4 rounded-lg border border-primary/30 bg-surface p-5 shadow-sm"
      data-testid="lotes-inmuebles-abiertos"
      aria-label="Cargas a medias"
    >
      <p className="text-sm font-medium text-fg">
        {abiertas.length === 1
          ? 'Tienes una carga a medias'
          : `Tienes ${abiertas.length} cargas a medias`}
      </p>

      {abiertas.map((l) => {
        const d = describirCargaAbierta(l, new Date());
        const ocupada = trabajando === l.lote;
        // Seguir subiendo exige la clave con la que se abrió la carga; sin ella
        // (otro navegador, almacenamiento borrado) sólo queda descartarla.
        const sinClave = d.etapa === 'subiendo' && leerClaveDeCarga(l.lote) === null;
        const falla = l.estado === 'FALLIDO';
        return (
          <div
            key={l.lote}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-border-faint pt-4 first:border-t-0 first:pt-0"
            data-testid={`carga-${l.lote}`}
          >
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm text-fg">
                {d.cuando ? <span className="font-medium">{d.cuando}</span> : null}
                {d.cuando ? ' · ' : null}
                <span className="font-mono tabular-nums" data-testid={`avance-${l.lote}`}>
                  {d.avance}
                </span>
              </p>
              <p className="text-sm text-fg-muted">
                {d.etapa === 'subiendo' ? (
                  sinClave ? (
                    'Se cortó en otro navegador y no se puede seguir subiendo desde acá. Descártala y sube el archivo otra vez.'
                  ) : (
                    'Selecciona el mismo archivo y seguimos desde la fila donde quedó.'
                  )
                ) : d.etapa === 'ubicando' ? (
                  'Faltan direcciones por ubicar en el mapa: esta página tiene que quedar abierta mientras se buscan.'
                ) : falla ? (
                  <span className="text-danger">
                    {l.error ?? 'La carga se detuvo por un error.'}
                  </span>
                ) : d.queHacer === 'creando' ? (
                  'Las estamos creando en el servidor. Puedes cerrar esta página: las seguimos creando.'
                ) : d.queHacer === 'procesando' ? (
                  'Todavía procesándose en el servidor'
                ) : d.queHacer === 'frena' ? (
                  <>
                    <span className="font-mono tabular-nums">{d.frena}</span> listos sin
                    activar — <span className="text-warning">frenan este paso</span>
                  </>
                ) : d.queHacer === 'terminada' ? (
                  'Sin nada que activar'
                ) : (
                  'Sin filas listas · no frena este paso'
                )}
                {d.etapa === 'revision' && d.fallidas > 0 ? (
                  <span className="text-warning"> · {d.fallidas} no se pudieron crear</span>
                ) : null}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Descartar es destructivo: `ghost` y a la izquierda del primario. */}
              <Button
                size="sm"
                variant="ghost"
                hideArrow
                disabled={ocupada || d.enVuelo || d.etapa === 'creando'}
                data-testid={`descartar-${l.lote}`}
                onClick={() => setADescartar(l)}
              >
                Descartar
              </Button>

              {d.etapa === 'ubicando' && l.puedeOmitirUbicacion !== false && !ubicacionCompleta(l) ? (
                <Button
                  size="sm"
                  variant="outline"
                  hideArrow
                  disabled={ocupada}
                  data-testid={`sin-ubicar-${l.lote}`}
                  onClick={() => void reintentar(l, true)}
                >
                  Continuar sin ubicar en el mapa
                </Button>
              ) : null}

              {d.etapa === 'revision' && d.puedeReintentar && !falla ? (
                <Button
                  size="sm"
                  variant="outline"
                  hideArrow
                  disabled={ocupada}
                  isLoading={ocupada}
                  data-testid={`reintentar-${l.lote}`}
                  onClick={() => void reintentar(l)}
                >
                  Reintentar las fallidas
                </Button>
              ) : null}

              {falla && d.puedeReintentar ? (
                <Button
                  size="sm"
                  hideArrow
                  disabled={ocupada}
                  isLoading={ocupada}
                  data-testid={`reintentar-${l.lote}`}
                  onClick={() => void reintentar(l)}
                >
                  Reintentar
                </Button>
              ) : null}

              {!falla && !sinClave ? (
                <Button
                  size="sm"
                  hideArrow
                  disabled={ocupada || d.enVuelo}
                  data-testid={`retomar-${l.lote}`}
                  // Con todas ubicadas, «Continuar» da el paso a la revisión.
                  onClick={() => (ubicacionCompleta(l) ? void reintentar(l, true) : onRetomar(l))}
                >
                  {d.etapa === 'subiendo'
                    ? 'Continuar subiendo'
                    : d.etapa === 'creando'
                      ? 'Ver cómo va'
                      : d.etapa === 'ubicando'
                      ? ubicacionCompleta(l)
                        ? 'Continuar'
                        : 'Continuar ubicando'
                      : 'Continuar'}
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-fg-subtle">
        Si en cambio subes el mismo archivo de nuevo, los inmuebles se duplican.
      </p>
    </section>
    ) : null}

      <AlertDialog
        open={aDescartar !== null}
        onOpenChange={(a) => !a && trabajando === null && setADescartar(null)}
      >
        <AlertDialogContent variant="destructive" data-testid="dialogo-descartar-carga">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar esta carga?</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Las filas que todavía no son inmuebles quedan fuera y no se pueden recuperar.
              Los inmuebles que ya se crearon no se tocan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={trabajando !== null}>Volver</AlertDialogCancel>
            {/* Abierto mientras descarta (antes se podía volver a apretar). */}
            <AlertDialogAction
              loading={aDescartar !== null && trabajando === aDescartar.lote}
              data-testid="confirmar-descartar-carga"
              onClick={(e) => {
                e.preventDefault();
                if (aDescartar) void descartar(aDescartar);
              }}
            >
              Descartar la carga
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
