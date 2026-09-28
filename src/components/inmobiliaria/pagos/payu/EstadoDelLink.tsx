'use client';

/**
 * El estado del link de Cobri de UNA cuota: la pastilla (icono + palabra, nunca
 * sólo color), los tres avisos con cuáles ya salieron, y una línea que dice qué
 * significa. Sin «Enviar»: los links los manda el cron (decisión de Nico).
 */

import type { Icon } from '@phosphor-icons/react';
import {
  ArrowSquareOut,
  CheckCircle,
  Circle,
  ClockCountdown,
  MinusCircle,
  PaperPlaneTilt,
  XCircle,
} from '@phosphor-icons/react';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { instanteEnBogota } from '@/lib/payu/links-de-pago';
import { cn } from '@/lib/utils';
import {
  HITOS_DE_PAYU,
  type EstadoDelLinkDePago,
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

export function PastillaDelLink({ estado }: { estado: EstadoDelLinkDePago }) {
  const { t } = useI18n();
  const { variant, icon: Icono } = ASPECTO[estado];
  return (
    <Badge variant={variant} data-testid="estado-del-link" data-estado={estado}>
      <Icono className="h-3.5 w-3.5 flex-shrink-0" weight="bold" aria-hidden="true" />
      {t(`${P}.estado.${estado}`)}
    </Badge>
  );
}

/**
 * «En mora escribe sólo Laura» (Nico, 26-09): una cuota que pasó su «3 días
 * después» ya no es de Cobri. Se compara el día de hoy en Bogotá.
 */
function vencioHaceMasDe3Dias(fechaDeVencimiento: string): boolean {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
  const limite = new Date(`${fechaDeVencimiento}T00:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() + 3);
  return hoy > limite.toISOString().slice(0, 10);
}

/**
 * Qué decir de una cuota sin link. 🔴 QA 26-09: Cobri cobra la cuota MÁS VIEJA
 * con saldo del contrato, así que también deja fuera las cuotas nuevas de un
 * inquilino que debe una anterior en mora — mirando sólo la fecha de ESTA
 * cuota la pantalla les decía «Cobri todavía no le ha escrito». Manda `enMora`
 * del back (la misma regla que usa Cobri); sin el campo (back viejo), la fecha.
 */
function detalleSinLink(link: LinkDePagoDeCuota): 'ninguno' | 'enMora' | 'enMoraPorOtra' {
  const vencida = vencioHaceMasDe3Dias(link.fechaDeVencimiento);
  const enMora = link.enMora ?? vencida;
  if (!enMora) return 'ninguno';
  return vencida ? 'enMora' : 'enMoraPorOtra';
}

export function EstadoDelLink({ link }: { link: LinkDePagoDeCuota }) {
  const { t, locale } = useI18n();
  const { estado } = link;
  const enviados = new Set(link.hitosEnviados);

  const detalle =
    estado === 'pagado' && link.pagadoEn
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
      <PastillaDelLink estado={estado} />
      {estado !== 'ninguno' && (
        <ul
          aria-label={t('inmobiliaria.cobros.linksDePago.hitos.titulo')}
          className="flex flex-wrap gap-x-3 gap-y-1"
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
                className={cn('inline-flex items-center gap-1 text-caption', salio ? 'text-fg' : 'text-fg-subtle')}
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
  );
}
