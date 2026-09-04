'use client';

/**
 * IPCCalculator — el canon del año que viene, con el IPC vigente.
 *
 * Nico (2026-09-03): «eso de calcular el incremento no sirve» —el botón no
 * hacía nada con el campo vacío, y el placeholder «2.500.000» parecía un valor
 * ya cargado—; «esa interfaz… todo en scroll es muy jodido» —cuatro tarjetas
 * apiladas, 1.300 px de alto—; «esa tendencia debería verse mucho mejor, no se
 * entiende» —doce óvalos sin eje, sin valores y sin meses.
 *
 * Ahora: dos columnas —a la izquierda lo que se calcula, a la derecha el dato
 * y su historia—, el resultado se actualiza mientras escribís (no hay botón
 * que apretar ni estado «no pasó nada») y la tendencia es un gráfico con eje,
 * valores y meses. La tasa se puede personalizar; si supera la oficial se
 * avisa, porque la ley no lo permite (Ley 820 de 2003, art. 20).
 */

import { useState } from 'react';
import { ArrowRight, ArrowSquareOut, Info, TrendDown, TrendUp, Warning } from '@phosphor-icons/react';
import { Chip } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  IPC_HISTORICAL,
  calculateNewRent,
  etiquetaDelMesIPC,
  formatearTasaIPC,
  getCurrentIPC,
  type IPCRecord,
} from '@/lib/constants/inmobiliaria-data';
import { formatCurrency } from '@/lib/types/inmobiliaria';

export const URL_IPC_DANE =
  'https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-precios-al-consumidor-ipc';

// ============================================================================
// Helpers puros (exportados para los tests)
// ============================================================================

/** «2.500.000» → 2500000; vacío o cero → null. Sólo cuentan los dígitos. */
export function parsearCanon(texto: string): number | null {
  const digitos = texto.replace(/\D/g, '');
  if (!digitos) return null;
  const n = parseInt(digitos, 10);
  return n > 0 ? n : null;
}

/** Miles con punto mientras se escribe: «2500000» → «2.500.000». */
export function formatearMiles(n: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
}

/** «5,10» o «5.10» → 5.1; vacío, negativo o no numérico → null. */
export function parsearTasa(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** «2026-10-01» → Date local. `new Date('2026-10-01')` es UTC y en Colombia cae el 30 de septiembre. */
export function fechaLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Primer día del mes que viene, en formato `input[type=date]`. */
export function primerDiaDelMesQueViene(hoy = new Date()): string {
  const d = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Escala «linda» del eje: de 0,25 en 0,25 hasta de 5 en 5, con ≤5 tramos. */
export function escalaDelEje(valores: number[]): { min: number; max: number; paso: number } {
  const lo = Math.min(...valores);
  const hi = Math.max(...valores);
  for (const paso of [0.25, 0.5, 1, 2, 5, 10]) {
    const min = Math.floor((lo - paso * 0.2) / paso) * paso;
    const max = Math.ceil((hi + paso * 0.2) / paso) * paso;
    if ((max - min) / paso <= 5) return { min, max, paso };
  }
  return { min: Math.floor(lo), max: Math.ceil(hi), paso: 1 };
}

// ============================================================================
// Gráfico de tendencia (SVG, sin librería)
// ============================================================================

const ANCHO = 560;
const ALTO = 190;
const MARGEN = { arriba: 22, abajo: 22, izquierda: 40, derecha: 8 };

function GraficoDeTendencia({ serie, locale }: { serie: IPCRecord[]; locale: string }) {
  const { t } = useI18n();
  const { min, max, paso } = escalaDelEje(serie.map((r) => r.rate));
  const plotW = ANCHO - MARGEN.izquierda - MARGEN.derecha;
  const plotH = ALTO - MARGEN.arriba - MARGEN.abajo;
  const y = (v: number) => MARGEN.arriba + plotH - ((v - min) / (max - min)) * plotH;
  const columna = plotW / serie.length;
  const anchoBarra = columna * 0.6;

  const lineas: number[] = [];
  for (let v = min; v <= max + 1e-9; v += paso) lineas.push(Number(v.toFixed(2)));

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className="h-auto w-full"
      role="img"
      aria-label={t('inmobiliaria.finance.ipc.chartAria')}
      data-testid="ipc-grafico"
    >
      {lineas.map((v) => (
        <g key={v}>
          <line
            x1={MARGEN.izquierda}
            x2={ANCHO - MARGEN.derecha}
            y1={y(v)}
            y2={y(v)}
            stroke="currentColor"
            className="text-border"
            strokeDasharray={v === min ? undefined : '2 4'}
          />
          <text
            x={MARGEN.izquierda - 6}
            y={y(v)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={10}
            fill="currentColor"
            className="font-mono tabular-nums text-fg-subtle"
          >
            {formatearTasaIPC(v, locale).replace(' %', '')}
          </text>
        </g>
      ))}

      {serie.map((r, i) => {
        const esVigente = i === serie.length - 1;
        const cx = MARGEN.izquierda + columna * i + columna / 2;
        const top = y(r.rate);
        return (
          <g key={`${r.year}-${r.month}`} data-mes={r.month} data-vigente={esVigente || undefined}>
            <title>{`${etiquetaDelMesIPC(r, locale)} · ${formatearTasaIPC(r.rate, locale)}`}</title>
            <rect
              x={cx - anchoBarra / 2}
              y={top}
              width={anchoBarra}
              height={Math.max(2, MARGEN.arriba + plotH - top)}
              rx={3}
              fill="currentColor"
              className={cn('text-primary', esVigente ? '' : 'opacity-30')}
            />
            <text
              x={cx}
              y={top - 6}
              textAnchor="middle"
              fontSize={10}
              fill="currentColor"
              className={cn('font-mono tabular-nums', esVigente ? 'font-semibold text-fg' : 'text-fg-muted')}
            >
              {formatearTasaIPC(r.rate, locale).replace(' %', '')}
            </text>
            <text
              x={cx}
              y={ALTO - 6}
              textAnchor="middle"
              fontSize={10}
              fill="currentColor"
              className={esVigente ? 'font-medium text-fg' : 'text-fg-muted'}
            >
              {etiquetaDelMesIPC(r, locale, true)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================================
// Componente
// ============================================================================

interface IPCCalculatorProps {
  /** Canon con el que arranca la calculadora (p. ej. desde una renovación). */
  currentRent?: number;
}

export function IPCCalculator({ currentRent }: IPCCalculatorProps) {
  const { t, locale, formatDate } = useI18n();
  const vigente = getCurrentIPC();
  const anterior = IPC_HISTORICAL[1];
  // Los 12 meses que terminan en el vigente, de enero a diciembre.
  const serie = IPC_HISTORICAL.slice(0, 12).reverse();

  const [canonTexto, setCanonTexto] = useState(currentRent ? formatearMiles(currentRent) : '');
  const [tasaPropia, setTasaPropia] = useState(false);
  const [tasaTexto, setTasaTexto] = useState(vigente.rate.toFixed(2));
  const [desde, setDesde] = useState(primerDiaDelMesQueViene);

  const canon = parsearCanon(canonTexto);
  const tasa = tasaPropia ? parsearTasa(tasaTexto) : vigente.rate;
  const resultado =
    canon != null && tasa != null
      ? { nuevo: calculateNewRent(canon, tasa), incremento: calculateNewRent(canon, tasa) - canon }
      : null;
  const porEncimaDeLaLey = tasaPropia && tasa != null && tasa > vigente.rate;

  const variacion = vigente.rate - (anterior?.rate ?? vigente.rate);
  const baja = variacion < 0;
  const tendenciaBaja = serie.length > 1 && serie[serie.length - 1]!.rate < serie[0]!.rate;

  const cambiarCanon = (texto: string) => {
    const n = parsearCanon(texto);
    setCanonTexto(n == null ? texto.replace(/\D/g, '') : formatearMiles(n));
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2" data-testid="ipc-calculadora">
      {/* ── Izquierda: lo que se calcula ─────────────────────────────────── */}
      <section className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5">
        <div>
          <h2 className="text-base font-semibold text-fg">{t('inmobiliaria.finance.ipc.calculateIncrease')}</h2>
          <p className="mt-0.5 text-sm text-fg-muted">{t('inmobiliaria.finance.ipc.calculateDesc')}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ipc-canon" className="text-sm font-medium text-fg">
            {t('inmobiliaria.finance.ipc.currentRent')}
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted">$</span>
            <Input
              id="ipc-canon"
              inputMode="numeric"
              autoComplete="off"
              value={canonTexto}
              onChange={(e) => cambiarCanon(e.target.value)}
              placeholder="0"
              className="h-12 pl-9 text-lg font-medium"
              data-testid="ipc-canon"
              aria-describedby="ipc-resultado"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="ipc-tasa" className="text-sm font-medium text-fg">
              {t('inmobiliaria.finance.ipc.ipcRate')}
            </Label>
            <Chip size="sm" selected={tasaPropia} onClick={() => setTasaPropia((v) => !v)} data-testid="ipc-personalizar">
              {tasaPropia ? t('inmobiliaria.finance.ipc.useOfficial') : t('inmobiliaria.finance.ipc.customize')}
            </Chip>
          </div>
          {tasaPropia ? (
            <Input
              id="ipc-tasa"
              inputMode="decimal"
              value={tasaTexto}
              onChange={(e) => setTasaTexto(e.target.value)}
              className="h-12 text-lg font-medium"
              data-testid="ipc-tasa"
            />
          ) : (
            <div
              id="ipc-tasa"
              className="flex h-12 items-center justify-between rounded-md border border-border bg-surface-muted px-4"
              data-testid="ipc-tasa-oficial"
            >
              <span className="text-lg font-semibold text-fg">{formatearTasaIPC(vigente.rate, locale)}</span>
              <span className="text-xs text-fg-muted">
                {etiquetaDelMesIPC(vigente, locale)} · DANE
              </span>
            </div>
          )}
          {porEncimaDeLaLey && (
            <p className="flex items-start gap-2 text-xs text-warning" data-testid="ipc-tasa-aviso">
              <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0" weight="fill" aria-hidden="true" />
              {t('inmobiliaria.finance.ipc.aboveLegal', { rate: formatearTasaIPC(vigente.rate, locale) })}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ipc-desde" className="text-sm font-medium text-fg">
            {t('inmobiliaria.finance.ipc.effectiveDate')}
          </Label>
          <Input id="ipc-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-12" />
        </div>

        {/* El resultado vive acá, siempre: vacío dice qué falta; con canon, el número. */}
        <div
          id="ipc-resultado"
          className={cn(
            'mt-auto rounded-lg border p-4',
            resultado ? 'border-primary/30 bg-primary-soft' : 'border-dashed border-border bg-surface-muted',
          )}
          data-testid="ipc-resultado"
          aria-live="polite"
        >
          {resultado ? (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <p className="text-xs text-fg-muted">{t('inmobiliaria.finance.ipc.currentRent')}</p>
                  <p className="text-base font-medium text-fg">{formatCurrency(canon!)}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-primary" weight="bold" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs text-primary">{t('inmobiliaria.finance.ipc.newRent')}</p>
                  <p className="text-2xl font-semibold text-primary" data-testid="ipc-nuevo-canon">
                    {formatCurrency(resultado.nuevo)}
                  </p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-primary/20 pt-3 text-sm">
                <div>
                  <dt className="text-xs text-fg-muted">{t('inmobiliaria.finance.ipc.increase')}</dt>
                  <dd className="font-medium text-fg" data-testid="ipc-incremento">
                    +{formatCurrency(resultado.incremento)} · +{formatearTasaIPC(tasa!, locale)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-fg-muted">{t('inmobiliaria.finance.ipc.appliesFrom')}</dt>
                  <dd className="font-medium text-fg" data-testid="ipc-rige-desde">
                    {fechaLocal(desde) ? formatDate(fechaLocal(desde)!) : '—'}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-sm text-fg-muted" data-testid="ipc-resultado-vacio">
              {canonTexto && canon == null
                ? t('inmobiliaria.finance.ipc.invalidRent')
                : tasaPropia && tasa == null
                  ? t('inmobiliaria.finance.ipc.invalidRate')
                  : t('inmobiliaria.finance.ipc.emptyHint')}
            </p>
          )}
        </div>
      </section>

      {/* ── Derecha: el dato y su historia ───────────────────────────────── */}
      <div className="flex flex-col gap-5">
        <section className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted">
                {t('inmobiliaria.finance.ipc.currentTitle')}
              </p>
              <p className="mt-1 text-4xl font-semibold tracking-tight text-fg" data-testid="ipc-vigente">
                {formatearTasaIPC(vigente.rate, locale)}
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                {t('inmobiliaria.finance.ipc.currentDesc', {
                  month: etiquetaDelMesIPC(vigente, locale),
                  year: vigente.year + 1,
                })}
              </p>
            </div>
            {anterior && (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                  baja ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning',
                )}
                title={t('inmobiliaria.finance.ipc.vsPrevMonth')}
              >
                {baja ? <TrendDown className="h-3.5 w-3.5" weight="bold" /> : <TrendUp className="h-3.5 w-3.5" weight="bold" />}
                {`${baja ? '−' : '+'}${formatearTasaIPC(Math.abs(variacion), locale).replace(' %', '')} pts`}
              </span>
            )}
          </div>
          <a
            href={URL_IPC_DANE}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            data-testid="ipc-link-dane"
          >
            {t('inmobiliaria.finance.ipc.viewOfficialIPC')}
            <ArrowSquareOut className="h-4 w-4" aria-hidden="true" />
          </a>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-fg">
                {t('inmobiliaria.finance.ipc.trendTitle', { year: vigente.year })}
              </h3>
              <p className="text-xs text-fg-muted">{t('inmobiliaria.finance.ipc.trendCaption')}</p>
            </div>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                tendenciaBaja ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning',
              )}
              data-testid="ipc-tendencia"
            >
              {tendenciaBaja ? <TrendDown className="h-3.5 w-3.5" weight="bold" /> : <TrendUp className="h-3.5 w-3.5" weight="bold" />}
              {tendenciaBaja ? t('inmobiliaria.finance.ipc.decreasing') : t('inmobiliaria.finance.ipc.increasing')}
            </span>
          </div>
          <GraficoDeTendencia serie={serie} locale={locale} />
        </section>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-fg-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t('inmobiliaria.finance.ipc.legalInfo')}
        </p>
      </div>
    </div>
  );
}
