'use client';

/**
 * «Lo que falta del mes»: la tarjeta de arriba de los cuatro pasos de Giros a
 * propietarios (decisión 17 de Nico, 22-10-2026; reemplaza el riel de chulos,
 * que no se entendía y decía «hecho» con plata por girar al lado).
 *
 *   GIROS DE OCTUBRE DE 2026                         [Octubre de 2026 ▾]
 *   Falta girar $ 2.371.800 a 1 propietario
 *   ✓ 1 Liquidar            2 propietarios liquidados
 *   ● 2 Revisar y aprobar   1 giro por aprobar ($ 2.371.800)   [Revisar 1 giro]
 *   ○ 3 Archivo del banco   …
 *   ○ 4 Marcar pagado       …
 *
 * Los números salen del back (la liquidación del mes, los giros aprobados que
 * esperan lote y los lotes del mes); lo que no llega se dice, no se inventa.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTr } from '@/lib/i18n/use-tr';
import { buttonVariants } from '@/components/ui/button';
import { dispersionesApi } from '@/lib/api/inmobiliaria.service';
import { lotesDeDispersionApi, RECURSO_DE_LOTES } from '@/lib/api/lotes-de-dispersion.service';
import { useLotesDeDispersion } from '@/lib/hooks/use-lotes-de-dispersion';
import { useRefrescoAutomatico } from '@/lib/hooks/use-refresco-automatico';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { nombreDelMes } from '@/lib/utils/mes';
import { conElMes } from '@/lib/giros/meses-de-los-giros';
import { loQueFaltaDelMes } from '@/lib/giros/lo-que-falta-del-mes';
import type { LiquidacionDelMesCompleto } from '@/lib/liquidaciones/liquidacion-del-mes';
import type { PorGirarDelBack } from '@/lib/propietarios/por-girar';
import { PASOS_DE_LOS_GIROS, type PasoDeLosGiros } from './PasosDeLosGiros';
import { MesDeLosGiros } from './MesDeLosGiros';

const RAIZ = '/panel/inmobiliaria/pagos';

/** Adónde lleva la acción de cada paso. Liquidar se resuelve generando los giros. */
const DESTINO_DE_LA_ACCION: Record<PasoDeLosGiros, string> = {
  liquidar: `${RAIZ}/dispersiones/generar`,
  revisar: `${RAIZ}/dispersiones`,
  banco: `${RAIZ}/dispersiones/lotes`,
  pagado: `${RAIZ}/dispersiones/lotes?paso=pagado`,
};

interface DatosDelMes {
  liquidacion: LiquidacionDelMesCompleto | null;
  candidatos: { cantidad: number; totalCop: number } | null;
  porGirar: PorGirarDelBack | null;
}

/** Lee lo del mes. Cada fuente puede fallar sola (permisos, back anterior): falla a `null`, no tumba la tarjeta. */
function useDatosDelMes(mes: string) {
  const [datos, setDatos] = useState<DatosDelMes | null>(null);
  const leer = useCallback(async () => {
    const [liquidacion, candidatos, porGirar] = await Promise.allSettled([
      dispersionesApi.liquidacionDelMes(mes),
      lotesDeDispersionApi.candidatos({ month: mes }),
      dispersionesApi.porGirar(),
    ]);
    setDatos({
      liquidacion: liquidacion.status === 'fulfilled' ? liquidacion.value : null,
      candidatos:
        candidatos.status === 'fulfilled' ? { cantidad: candidatos.value.cantidad, totalCop: candidatos.value.totalCop } : null,
      porGirar: porGirar.status === 'fulfilled' && typeof porGirar.value?.porGirarCop === 'number' ? porGirar.value : null,
    });
  }, [mes]);
  useEffect(() => {
    let vivo = true;
    setDatos(null);
    void leer().catch(() => {
      if (vivo) setDatos({ liquidacion: null, candidatos: null, porGirar: null });
    });
    return () => {
      vivo = false;
    };
  }, [leer]);
  useRefrescoAutomatico(['dispersiones', RECURSO_DE_LOTES], leer);
  return datos;
}

export function LoQueFaltaDelMes({
  paso,
  mes,
  onCambiarMes,
  onCompleto,
  className,
}: {
  /** La pantalla en la que se está (su fila se marca). */
  paso: PasoDeLosGiros;
  mes: string;
  /** Sin él, la tarjeta va sin selector de mes. */
  onCambiarMes?: (mes: string) => void;
  /** Revisora r22 (Giros #3): avisa si el mes elegido está girado completo, para que «Por girar» diga que es de meses anteriores. */
  onCompleto?: (completo: boolean) => void;
  className?: string;
}) {
  const tr = useTr();
  const datos = useDatosDelMes(mes);
  const { lotes, cargando: cargandoLotes, error: errorDeLotes } = useLotesDeDispersion({ month: mes });
  const resultado = useMemo(
    () =>
      datos
        ? loQueFaltaDelMes({
            liquidacion: datos.liquidacion,
            candidatos: datos.candidatos,
            lotes: errorDeLotes ? null : lotes,
            plata: formatCurrency,
          })
        : null,
    [datos, lotes, errorDeLotes],
  );
  const cargando = datos === null || (cargandoLotes && lotes.length === 0);
  const completo = !cargando && Boolean(resultado?.completo);
  useEffect(() => {
    onCompleto?.(completo);
  }, [completo, onCompleto]);
  const delMes = nombreDelMes(mes);

  let respuesta: string;
  if (cargando || !resultado) respuesta = tr('Calculando lo que falta del mes…');
  else if (resultado.sinNadaQueGirar) respuesta = tr('{mes} no tiene giros', { mes: conMayuscula(delMes) });
  else if (resultado.completo) respuesta = tr('{mes} está girado completo', { mes: conMayuscula(delMes) });
  else if (resultado.faltaCop === null) respuesta = tr('No se pudo leer cuánto falta girar');
  else if (resultado.faltaCop === 0)
    respuesta = tr('Ya no falta plata por girar: queda cerrar el paso {n}', {
      n: PASOS_DE_LOS_GIROS.findIndex((p) => p.id === resultado.siguiente) + 1,
    });
  else
    respuesta = tr('Falta girar {plata} a {quien}', {
      plata: formatCurrency(resultado.faltaCop),
      quien:
        resultado.faltanPropietarios === 1
          ? tr('1 propietario')
          : tr('{n} propietarios', { n: (resultado.faltanPropietarios ?? 0).toLocaleString('es-CO') }),
    });

  // Con el mes completo, lo que el Tablero llama «Por girar» es de OTROS meses: se dice, para que no se lea como una contradicción.
  const deOtrosMeses =
    resultado?.completo && datos?.porGirar && datos.porGirar.porGirarCop > 0 ? datos.porGirar.porGirarCop : null;

  return (
    <section className={cn('rounded-lg border border-border bg-surface', className)} data-testid="lo-que-falta-del-mes">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="font-mono text-caption uppercase tracking-wide text-fg-muted">{tr('Giros de {mes}', { mes: delMes })}</p>
          <p
            className={cn('mt-1 text-xl font-normal text-fg', resultado?.completo && 'flex items-center gap-2')}
            data-testid="respuesta-del-mes"
            aria-live="polite"
          >
            {resultado?.completo ? <Check className="h-5 w-5 shrink-0 text-success" weight="bold" aria-hidden="true" /> : null}
            {respuesta}
          </p>
          {deOtrosMeses ? (
            /* Revisora r23 (Giros #2): «elige el mes arriba a la derecha» no decía cuál mes, no llevaba a él y a 390
               el selector ni está a la derecha. Propietarios sí sabe a quién: abre en «Por girar». */
            <p className="mt-1 text-body-sm text-fg-muted" data-testid="por-girar-de-otros-meses">
              {tr('Quedan {plata} de meses anteriores.', { plata: formatCurrency(deOtrosMeses) })}{' '}
              <Link
                href="/panel/inmobiliaria/propietarios"
                className="font-medium text-primary underline-offset-4 hover:underline"
                data-testid="ver-a-quien-de-otros-meses"
              >
                {tr('Ver a quién')}
              </Link>
            </p>
          ) : null}
        </div>
        {onCambiarMes ? (
          <div className="shrink-0">
            <MesDeLosGiros mes={mes} onCambiar={onCambiarMes} />
          </div>
        ) : null}
      </div>
      <ol className="divide-y divide-border-faint border-t border-border-faint">
        {PASOS_DE_LOS_GIROS.map((p, i) => {
          const delPaso = resultado?.pasos.find((x) => x.id === p.id);
          const aqui = p.id === paso;
          const toca = resultado?.siguiente === p.id;
          const hecho = delPaso?.estado === 'hecho';
          return (
            <li
              key={p.id}
              className={cn(
                'grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[1.75rem_minmax(0,1fr)_auto] sm:items-center sm:px-5',
                aqui && 'bg-surface-muted/60',
              )}
              data-testid={`paso-del-mes-${p.id}`}
              data-estado={delPaso?.estado ?? 'cargando'}
            >
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full font-mono text-caption tabular-nums',
                  hecho
                    ? 'bg-success-soft text-success'
                    : toca
                      ? 'bg-primary text-primary-fg'
                      : 'bg-surface-muted text-fg-muted',
                )}
                aria-hidden="true"
              >
                {hecho ? <Check className="h-3.5 w-3.5" weight="bold" /> : i + 1}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <Link
                    href={conElMes(p.href, mes)}
                    aria-current={aqui ? 'page' : undefined}
                    className="font-medium text-fg underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {tr(p.titulo)}
                  </Link>
                  {aqui ? <span className="font-mono text-caption uppercase tracking-wide text-fg-subtle">{tr('Estás aquí')}</span> : null}
                  {hecho ? <span className="sr-only">{tr('(hecho)')}</span> : null}
                </p>
                <p className={cn('text-body-sm', toca ? 'text-fg' : 'text-fg-muted')}>
                  {delPaso ? delPaso.detalle : cargando ? '…' : ''}
                </p>
              </div>
              {toca && delPaso?.accion && !aqui ? (
                <Link
                  href={conElMes(DESTINO_DE_LA_ACCION[p.id], mes)}
                  className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'col-start-2 w-fit sm:col-start-auto')}
                  data-testid={`accion-del-paso-${p.id}`}
                >
                  {delPaso.accion}
                </Link>
              ) : toca && aqui ? (
                <span className="col-start-2 text-caption text-fg-muted sm:col-start-auto">{tr('Es lo de esta pantalla')}</span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
