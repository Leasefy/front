'use client';

/**
 * El estado del link de Payu de UNA cuota: la pastilla (icono + palabra, nunca
 * sólo color), los tres avisos con cuáles ya salieron, y una línea que dice qué
 * significa. Sin «Enviar»: los links los manda el cron (decisión de Nico).
 */

import type { Icon } from '@phosphor-icons/react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowSquareOut,
  CheckCircle,
  Circle,
  ClockCountdown,
  MinusCircle,
  PaperPlaneTilt,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { instanteEnBogota } from '@/lib/payu/links-de-pago';
import { cn } from '@/lib/utils';
import {
  HITOS_DE_PAYU,
  type EstadoDelLinkDePago,
  type HitoDePayu,
  type LinkDePagoDeCuota,
} from '@/lib/types/payu';

const P = 'inmobiliaria.cobros.linksDePago';

const ASPECTO: Record<EstadoDelLinkDePago, { variant: NonNullable<BadgeProps['variant']>; icon: Icon }> = {
  ninguno: { variant: 'secondary', icon: MinusCircle },
  enviado: { variant: 'default', icon: PaperPlaneTilt },
  pagado: { variant: 'success', icon: CheckCircle },
  vencido: { variant: 'warning', icon: ClockCountdown },
  fallido: { variant: 'destructive', icon: XCircle },
};

/** El link se puede abrir mientras sirva para pagar: enviado, o tras un pago que no pasó. */
const LINK_ABRIBLE: ReadonlySet<EstadoDelLinkDePago> = new Set(['enviado', 'fallido']);

export function PastillaDelLink({
  estado,
  enRevision = false,
}: {
  estado: EstadoDelLinkDePago;
  /**
   * COBRI-12 (Nico, 16-10: «frenar a Mori y avisar»): el link se pagó pero el
   * pago no se aplicó a la cuota, que sigue debiéndose. Un «Pagado» verde
   * encima de «sigue debiéndose» se contradecía: es un pago en revisión.
   */
  enRevision?: boolean;
}) {
  const { t } = useI18n();
  const { variant, icon: Icono } = enRevision ? { variant: 'warning' as const, icon: WarningCircle } : ASPECTO[estado];
  return (
    <Badge
      variant={variant}
      data-testid="estado-del-link"
      data-estado={estado}
      data-en-revision={enRevision ? 'si' : undefined}
    >
      <Icono className="h-3.5 w-3.5 flex-shrink-0" weight="bold" aria-hidden="true" />
      {t(`${P}.estado.${enRevision ? 'enRevision' : estado}`)}
    </Badge>
  );
}

/**
 * «En mora escribe sólo Laura» (Nico, 26-09): una cuota que pasó su «3 días
 * después» ya no es de Payu. Se compara el día de hoy en Bogotá.
 */
function vencioHaceMasDe3Dias(fechaDeVencimiento: string): boolean {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
  const limite = new Date(`${fechaDeVencimiento}T00:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() + 3);
  return hoy > limite.toISOString().slice(0, 10);
}

/**
 * Qué decir de una cuota sin link. 🔴 QA 26-09: Payu cobra la cuota MÁS VIEJA
 * con saldo del contrato, así que también deja fuera las cuotas nuevas de un
 * inquilino que debe una anterior en mora — mirando sólo la fecha de ESTA
 * cuota la pantalla les decía «Payu todavía no le ha escrito». Manda `enMora`
 * del back (la misma regla que usa Payu); sin el campo (back viejo), la fecha.
 */
function detalleSinLink(link: LinkDePagoDeCuota): 'ninguno' | 'enMora' | 'enMoraPorOtra' | 'pagada' {
  // Ya paga (QA 08-10): ni «no le ha escrito» ni «en mora».
  if (link.pagada) return 'pagada';
  const vencida = vencioHaceMasDe3Dias(link.fechaDeVencimiento);
  const enMora = link.enMora ?? vencida;
  if (!enMora) return 'ninguno';
  return vencida ? 'enMora' : 'enMoraPorOtra';
}

export function EstadoDelLink({
  link,
  esperaEnLaBandeja,
}: {
  link: LinkDePagoDeCuota;
  /**
   * COBRI-4: el caso de la Bandeja del Piloto que espera aprobar el aviso de
   * esta cuota (Cobri en Copiloto). Sin él, la fila decía «Cobri todavía no le
   * ha escrito» y nadie sabía que faltaba un clic.
   */
  esperaEnLaBandeja?: string;
}) {
  const { t, locale } = useI18n();
  const { estado } = link;
  const enviados = new Set(link.hitosEnviados);
  // Un caso en la Bandeja para una cuota que no está paga: sin link todavía,
  // el aviso entero espera; con un link enviado o rechazado, espera el
  // siguiente aviso (que lleva el mismo link mientras siga vivo).
  const hayCasoEnLaBandeja = Boolean(esperaEnLaBandeja) && estado !== 'pagado' && !link.pagada;
  const esperaAprobacion = hayCasoEnLaBandeja && estado === 'ninguno';

  const detalle =
    esperaAprobacion
      ? t('inmobiliaria.cobros.linksDePago.detalle.esperaAprobacion')
      : estado === 'pagado' && link.pagadoEn
      ? t('inmobiliaria.cobros.linksDePago.pagadoEl', { fecha: instanteEnBogota(link.pagadoEn, locale) })
      : estado === 'enviado' && link.ultimoEnvioEn
        ? t('inmobiliaria.cobros.linksDePago.ultimoAviso', { fecha: instanteEnBogota(link.ultimoEnvioEn, locale) })
        : estado === 'ninguno'
          ? t(`inmobiliaria.cobros.linksDePago.detalle.${detalleSinLink(link)}`)
          : estado === 'vencido'
            ? t('inmobiliaria.cobros.linksDePago.detalle.vencido')
            : estado === 'fallido'
              ? t('inmobiliaria.cobros.linksDePago.detalle.fallido')
              : null;

  return (
    <div className="min-w-0 space-y-1.5">
      {/* Sin link pero ya paga: la pastilla dice «Pagado» (QA 08-10). */}
      <PastillaDelLink
        estado={estado === 'ninguno' && link.pagada ? 'pagado' : estado}
        enRevision={estado === 'pagado' && Boolean(link.pagoSinAplicar)}
      />
      {estado !== 'ninguno' && (
        <ul
          aria-label={t('inmobiliaria.cobros.linksDePago.hitos.titulo')}
          className="flex flex-wrap gap-x-3 gap-y-1 text-caption"
          data-testid="hitos-del-link"
        >
          {HITOS_DE_PAYU.map((hito) => {
            const salio = enviados.has(hito);
            const Icono = salio ? CheckCircle : Circle;
            return (
              <li
                key={hito}
                data-hito={hito}
                data-enviado={salio ? 'si' : 'no'}
                // El tamaño va en la lista: `cn` (twMerge sin configurar) toma
                // `text-caption` y el color por la misma clase y se queda con el
                // color, y en «Pagos fallidos» los avisos salían a 16 px.
                className={cn('inline-flex items-center gap-1', salio ? 'text-fg' : 'text-fg-subtle')}
              >
                <Icono
                  className={cn('h-3.5 w-3.5 flex-shrink-0', salio ? 'text-success' : 'text-fg-subtle')}
                  weight={salio ? 'fill' : 'regular'}
                  aria-hidden="true"
                />
                {t(`${P}.hitos.${hito}`)}
                <span className="sr-only">
                  :{' '}
                  {salio
                    ? t('inmobiliaria.cobros.linksDePago.hitos.enviado')
                    : t('inmobiliaria.cobros.linksDePago.hitos.sinEnviar')}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {detalle && <p className="text-caption text-fg-muted">{detalle}</p>}
      {/* COBRI-12: pagó por el link pero el pago no se aplicó a la cuota. */}
      {estado === 'pagado' && link.pagoSinAplicar && (
        <>
          <p className="flex items-start gap-1.5 text-caption text-fg" data-testid="pago-sin-aplicar">
            <WarningCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-danger" weight="bold" aria-hidden="true" />
            {t(`${P}.detalle.pagoSinAplicar`, { motivo: link.pagoSinAplicar.motivo })}
          </p>
          {/* Nico, 16-10: el caso espera en la Bandeja, con «Reintentar aplicar». */}
          {link.pagoSinAplicar.linkId && (
            <Link
              href={`/panel/inmobiliaria/piloto?item=${encodeURIComponent(`pagorev:${link.pagoSinAplicar.linkId}`)}`}
              className="inline-flex items-center gap-1 text-caption font-medium text-primary hover:underline"
              data-testid="resolver-pago-sin-aplicar"
            >
              {t(`${P}.resolverEnLaBandeja`)}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </>
      )}
      {/* COBRI-9: el último aviso que no salió, con su porqué (si la cuota debe). */}
      {link.noSalio && estado !== 'pagado' && !link.pagada && (
        <p className="flex items-start gap-1.5 text-caption text-fg" data-testid="aviso-no-salio">
          <WarningCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-warning" weight="bold" aria-hidden="true" />
          {t(`${P}.detalle.${link.noSalio.definitivo ? 'noSalioDefinitivo' : 'noSalio'}`, {
            hito: HITOS_DE_PAYU.includes(link.noSalio.hito as HitoDePayu)
              ? t(`${P}.hitos.${link.noSalio.hito}`)
              : link.noSalio.hito,
            porQue: link.noSalio.porQueNo,
          })}
        </p>
      )}
      {hayCasoEnLaBandeja && !esperaAprobacion && (
        <p className="text-caption text-fg-muted">{t(`${P}.detalle.siguienteEsperaAprobacion`)}</p>
      )}
      {((hayCasoEnLaBandeja && esperaEnLaBandeja) || (link.paymentUrl && LINK_ABRIBLE.has(estado))) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {hayCasoEnLaBandeja && esperaEnLaBandeja && (
            <Link
              href={`/panel/inmobiliaria/piloto?item=${encodeURIComponent(esperaEnLaBandeja)}`}
              className="inline-flex items-center gap-1 text-caption font-medium text-primary hover:underline"
              data-testid="revisar-y-aprobar"
            >
              {t('inmobiliaria.cobros.linksDePago.revisarYAprobar')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
          {link.paymentUrl && LINK_ABRIBLE.has(estado) && (
            <a
              href={link.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('inmobiliaria.cobros.linksDePago.verLinkAria', { inquilino: link.inquilino })}
              className="inline-flex items-center gap-1 text-caption font-medium text-primary hover:underline"
            >
              {t('inmobiliaria.cobros.linksDePago.verLink')}
              <ArrowSquareOut className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
