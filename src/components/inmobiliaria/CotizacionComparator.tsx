'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Phone,
  Clock,
  CurrencyDollar,
  TrendDown,
  TrendUp,
  Star,
  Plus,
  Buildings,
  MapPin,
  Wrench,
  CheckCircle,
  Crown,
  Lightning,
  CalendarBlank,
  ArrowRight,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type {
  SolicitudMantenimiento,
  MantenimientoQuote,
} from '@/lib/types/inmobiliaria';
import { formatCurrency, getMantenimientoTypeInfo } from '@/lib/types/inmobiliaria';

// ============================================================================
// Types
// ============================================================================

export interface CotizacionComparatorProps {
  solicitud: SolicitudMantenimiento;
  onSelectQuote: (quoteId: string) => void;
  onRequestNewQuote?: () => void;
  selectedQuoteId?: string;
}

interface QuoteAnalysis {
  lowestPriceId: string;
  fastestId: string;
  bestValueId: string;
  avgPrice: number;
  avgDays: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateString: string, loc: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(loc === 'es' ? 'es-CL' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function calculatePriceDeviation(price: number, avgPrice: number): number {
  if (avgPrice === 0) return 0;
  return ((price - avgPrice) / avgPrice) * 100;
}

function analyzeQuotes(quotes: MantenimientoQuote[]): QuoteAnalysis | null {
  if (quotes.length === 0) return null;

  // Find lowest price
  const lowestPrice = Math.min(...quotes.map((q) => q.amount));
  const lowestPriceQuote = quotes.find((q) => q.amount === lowestPrice);

  // Find fastest delivery
  const fastestDays = Math.min(...quotes.map((q) => q.estimatedDays));
  const fastestQuote = quotes.find((q) => q.estimatedDays === fastestDays);

  // Calculate averages
  const avgPrice = quotes.reduce((sum, q) => sum + q.amount, 0) / quotes.length;
  const avgDays = quotes.reduce((sum, q) => sum + q.estimatedDays, 0) / quotes.length;

  // Best value: normalize price and time, find lowest combined score
  const normalized = quotes.map((q) => {
    const priceScore = q.amount / lowestPrice; // 1.0 for best price
    const timeScore = q.estimatedDays / fastestDays; // 1.0 for fastest
    const combined = priceScore * 0.6 + timeScore * 0.4; // Weight price more
    return { id: q.id, score: combined };
  });
  const bestValue = normalized.reduce((best, curr) =>
    curr.score < best.score ? curr : best
  );

  return {
    lowestPriceId: lowestPriceQuote?.id || '',
    fastestId: fastestQuote?.id || '',
    bestValueId: bestValue.id,
    avgPrice,
    avgDays,
  };
}

// ============================================================================
// Quote Card Component
// ============================================================================

interface QuoteCardProps {
  quote: MantenimientoQuote;
  analysis: QuoteAnalysis;
  isSelected: boolean;
  onSelect: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: string;
}

function QuoteCard({ quote, analysis, isSelected, onSelect, t, locale }: QuoteCardProps) {
  const isLowestPrice = analysis.lowestPriceId === quote.id;
  const isFastest = analysis.fastestId === quote.id;
  const isBestValue = analysis.bestValueId === quote.id;
  const priceDeviation = calculatePriceDeviation(quote.amount, analysis.avgPrice);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex-shrink-0 w-72 rounded-xl border transition-all',
        isSelected
          ? 'border-[#2C7A53]/30 bg-[#E8F3EC]/50 dark:bg-[#2C7A53]/20 shadow-[#2C7A53]/10'
          : 'border-border bg-card hover:border-[#1A40FF]/30 dark:hover:border-[#1A40FF]/30'
      )}
    >
      {/* Badges Row */}
      <div className="flex flex-wrap gap-1.5 p-3 pb-0">
        {isBestValue && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#F8F0E0] dark:bg-[#B7791F]/12 text-[#B7791F] dark:from-[#B7791F]/40 dark:to-[#B7791F]/40 dark:text-[#B7791F]">
            <Crown className="w-3 h-3" weight="fill" />
            {t('inmobiliaria.finance.quotes.bestValue')}
          </span>
        )}
        {isLowestPrice && !isBestValue && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70] dark:bg-[#2C7A53]/40 dark:text-[#2C7A53]">
            <TrendDown className="w-3 h-3" weight="bold" />
            {t('inmobiliaria.finance.quotes.cheapest')}
          </span>
        )}
        {isFastest && !isBestValue && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#EEF1FF] text-[#1A40FF] dark:bg-[#1A40FF]/15 dark:text-[#5570FF] dark:bg-[#1A40FF]/40 dark:text-[#1A40FF]">
            <Lightning className="w-3 h-3" weight="fill" />
            {t('inmobiliaria.finance.quotes.fastest')}
          </span>
        )}
        {isSelected && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70] dark:bg-[#2C7A53]/40 dark:text-[#2C7A53]">
            <CheckCircle className="w-3 h-3" weight="fill" />
            {t('inmobiliaria.finance.quotes.selected')}
          </span>
        )}
      </div>

      {/* Provider Info */}
      <div className="p-3 space-y-3">
        <div>
          <h4 className="font-semibold text-foreground">{quote.providerName}</h4>
          <a
            href={`tel:${quote.providerPhone}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1A40FF] dark:hover:text-[#1A40FF] transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            {quote.providerPhone}
          </a>
        </div>

        {/* Price */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {formatCurrency(quote.amount)}
            </span>
          </div>
          {priceDeviation !== 0 && (
            <div
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium',
                priceDeviation < 0
                  ? 'text-[#2C7A53] dark:text-[#3EAE70]'
                  : 'text-[#C4503B] dark:text-[#E0664D]'
              )}
            >
              {priceDeviation < 0 ? (
                <TrendDown className="w-3 h-3" />
              ) : (
                <TrendUp className="w-3 h-3" />
              )}
              {Math.abs(priceDeviation).toFixed(0)}% {t('inmobiliaria.finance.quotes.vsAverage')}
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {quote.description}
        </p>

        {/* Metrics */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-medium text-foreground">{quote.estimatedDays}</span>
            <span>{t('inmobiliaria.finance.quotes.days')}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <CalendarBlank className="w-4 h-4" />
            <span>{formatDate(quote.createdAt, locale)}</span>
          </div>
        </div>

        {/* Price Bar Visualization */}
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isLowestPrice
                  ? 'bg-[#2C7A53]'
                  : priceDeviation > 10
                  ? 'bg-[#C4503B]'
                  : 'bg-[#1A40FF]'
              )}
              style={{
                width: `${Math.min(100, Math.max(20, (analysis.avgPrice / quote.amount) * 50 + 50))}%`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t('inmobiliaria.finance.quotes.priceCompetitiveness')}
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={onSelect}
          disabled={isSelected}
          className={cn(
            'w-full py-2.5 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2',
            isSelected
              ? 'bg-[#2C7A53] text-white cursor-default'
              : 'bg-[#1A40FF] text-white hover:opacity-90'
          )}
        >
          {isSelected ? (
            <>
              <CheckCircle className="w-4 h-4" weight="fill" />
              {t('inmobiliaria.finance.quotes.selected')}
            </>
          ) : (
            <>
              <Check className="w-4 h-4" weight="bold" />
              {t('inmobiliaria.finance.quotes.select')}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * CotizacionComparator - Side-by-side quote comparison for maintenance requests
 * Highlights lowest price, fastest delivery, and best value options
 */
export function CotizacionComparator({
  solicitud,
  onSelectQuote,
  onRequestNewQuote,
  selectedQuoteId,
}: CotizacionComparatorProps) {
  const { t, locale } = useI18n();
  const typeInfo = getMantenimientoTypeInfo(solicitud.type);
  const analysis = useMemo(() => analyzeQuotes(solicitud.quotes), [solicitud.quotes]);

  // No quotes state
  if (solicitud.quotes.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-dashed border-border text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center">
          <CurrencyDollar className="w-7 h-7 text-muted-foreground" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{t('inmobiliaria.finance.quotes.noQuotes')}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {t('inmobiliaria.finance.quotes.noQuotesDesc')}
          </p>
        </div>
        {onRequestNewQuote && (
          <button
            onClick={onRequestNewQuote}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#1A40FF] text-white font-medium hover:opacity-90 transition-colors"
          >
            <Plus className="w-4 h-4" weight="bold" />
            {t('inmobiliaria.finance.quotes.requestQuote')}
          </button>
        )}
      </div>
    );
  }

  // Single quote
  if (solicitud.quotes.length === 1 || !analysis) {
    const quote = solicitud.quotes[0];
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">{quote.providerName}</h4>
              <a
                href={`tel:${quote.providerPhone}`}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[#1A40FF] transition-colors"
              >
                <Phone className="w-4 h-4" />
                {quote.providerPhone}
              </a>
              <p className="text-sm text-muted-foreground">{quote.description}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {quote.estimatedDays} {t('inmobiliaria.finance.quotes.days')}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(quote.amount)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(quote.createdAt, locale)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => onSelectQuote(quote.id)}
              disabled={selectedQuoteId === quote.id}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2',
                selectedQuoteId === quote.id
                  ? 'bg-[#2C7A53] text-white cursor-default'
                  : 'bg-[#1A40FF] text-white hover:opacity-90'
              )}
            >
              {selectedQuoteId === quote.id ? (
                <>
                  <CheckCircle className="w-4 h-4" weight="fill" />
                  {t('inmobiliaria.finance.quotes.selected')}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" weight="bold" />
                  {t('inmobiliaria.finance.quotes.select')}
                </>
              )}
            </button>
            {onRequestNewQuote && (
              <button
                onClick={onRequestNewQuote}
                className="py-2.5 px-4 rounded-md font-medium border border-border hover:bg-muted transition-colors text-foreground"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          {t('inmobiliaria.finance.quotes.requestMoreToCompare')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{typeInfo?.icon}</span>
            <h3 className="font-semibold text-foreground">{solicitud.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {solicitud.propertyTitle}
          </p>
        </div>
        {onRequestNewQuote && (
          <button
            onClick={onRequestNewQuote}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border hover:bg-muted transition-colors text-sm font-medium text-foreground"
          >
            <Plus className="w-4 h-4" />
            {t('inmobiliaria.finance.quotes.newQuote')}
          </button>
        )}
      </div>

      {/* Comparison Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-md bg-[#E8F3EC] dark:bg-[#2C7A53]/15 border border-[#2C7A53]/30 dark:border-[#2C7A53]/40">
          <div className="flex items-center gap-2 text-[#2C7A53] dark:text-[#3EAE70]">
            <TrendDown className="w-4 h-4" weight="bold" />
            <span className="text-xs font-medium">{t('inmobiliaria.finance.quotes.cheapest')}</span>
          </div>
          <p className="text-lg font-bold text-[#2C7A53] dark:text-[#3EAE70] mt-1">
            {formatCurrency(Math.min(...solicitud.quotes.map((q) => q.amount)))}
          </p>
        </div>
        <div className="p-3 rounded-md bg-[#EEF1FF] dark:bg-[#1A40FF]/15 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40">
          <div className="flex items-center gap-2 text-[#1A40FF] dark:text-[#5570FF]">
            <Lightning className="w-4 h-4" weight="fill" />
            <span className="text-xs font-medium">{t('inmobiliaria.finance.quotes.fastest')}</span>
          </div>
          <p className="text-lg font-bold text-[#1A40FF] dark:text-[#5570FF] mt-1">
            {Math.min(...solicitud.quotes.map((q) => q.estimatedDays))} {t('inmobiliaria.finance.quotes.days')}
          </p>
        </div>
        <div className="p-3 rounded-md bg-[#F8F0E0] dark:bg-[#B7791F]/15 border border-[#B7791F]/30 dark:border-[#B7791F]/40">
          <div className="flex items-center gap-2 text-[#B7791F] dark:text-[#D2992F]">
            <Crown className="w-4 h-4" weight="fill" />
            <span className="text-xs font-medium">{t('inmobiliaria.finance.quotes.bestValue')}</span>
          </div>
          <p className="text-lg font-bold text-[#B7791F] dark:text-[#D2992F] mt-1">
            {solicitud.quotes.find((q) => q.id === analysis.bestValueId)?.providerName?.split(' ')[0] || '-'}
          </p>
        </div>
      </div>

      {/* Quotes Horizontal Scroll */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <AnimatePresence mode="popLayout">
            {solicitud.quotes.map((quote) => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                analysis={analysis}
                isSelected={selectedQuoteId === quote.id}
                onSelect={() => onSelectQuote(quote.id)}
                t={t}
                locale={locale}
              />
            ))}
          </AnimatePresence>
        </div>
        {/* Scroll indicator for mobile */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-8 h-full bg-gradient-to-l from-background to-transparent" />
        </div>
      </div>

      {/* Selected Quote CTA */}
      {selectedQuoteId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-[#E8F3EC] dark:bg-[#2C7A53]/15 border border-[#2C7A53]/30 dark:border-[#2C7A53]/40"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E8F3EC] dark:bg-[#2C7A53]/15 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" weight="fill" />
              </div>
              <div>
                <p className="font-medium text-[#2C7A53] dark:text-[#3EAE70]">
                  {t('inmobiliaria.finance.quotes.quoteSelected')}
                </p>
                <p className="text-sm text-[#2C7A53] dark:text-[#3EAE70]">
                  {solicitud.quotes.find((q) => q.id === selectedQuoteId)?.providerName} -{' '}
                  {formatCurrency(
                    solicitud.quotes.find((q) => q.id === selectedQuoteId)?.amount || 0
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#2C7A53] dark:text-[#3EAE70] font-medium">
              <span>{t('inmobiliaria.finance.quotes.continueToApproval')}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
