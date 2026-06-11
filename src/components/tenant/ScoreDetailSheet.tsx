'use client';

import { useState } from 'react';
import { Shield, CheckCircle, WarningCircle, Lock, Copy, Check, DownloadSimple, ShareNetwork } from '@phosphor-icons/react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RISK_LEVELS, getRiskBadgeVariant } from '@/lib/types/risk-score';
import type { RiskScore, RiskLevel } from '@/lib/types/risk-score';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface ScoreDetailSheetProps {
  open: boolean;
  onClose: () => void;
  isPaid: boolean;
  score: RiskScore | null;
  verificationCode: string | null;
  onPurchase: () => void;
  onDownloadPDF: () => void;
  onShare: () => void;
}

const LEVEL_COLORS: Record<RiskLevel, { bg: string; text: string; bar: string }> = {
  A: {
    bg: 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
    text: 'text-[#2C7A53] dark:text-[#3EAE70]',
    bar: 'bg-[#2C7A53]',
  },
  B: {
    bg: 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
    text: 'text-[#1A40FF] dark:text-[#5570FF]',
    bar: 'bg-[#1A40FF]',
  },
  C: {
    bg: 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
    text: 'text-[#B7791F] dark:text-[#D2992F]',
    bar: 'bg-[#B7791F]',
  },
  D: {
    bg: 'bg-[#F8EAE7] dark:bg-[#C4503B]/15',
    text: 'text-[#C4503B] dark:text-[#E0664D]',
    bar: 'bg-[#C4503B]',
  },
};

export function ScoreDetailSheet({
  open,
  onClose,
  isPaid,
  score,
  verificationCode,
  onPurchase,
  onDownloadPDF,
  onShare,
}: ScoreDetailSheetProps) {
  const { locale } = useI18n();
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = async () => {
    if (!verificationCode) return;
    await navigator.clipboard.writeText(verificationCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 flex flex-col overflow-hidden"
        hideCloseButton
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              {isPaid
                ? (locale === 'es' ? 'Tu evaluación' : 'Your evaluation')
                : (locale === 'es' ? 'Evaluación de inquilino' : 'Tenant evaluation')}
            </SheetTitle>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <span className="sr-only">Cerrar</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <SheetDescription className="sr-only">
            {locale === 'es' ? 'Detalle de evaluación de inquilino' : 'Tenant evaluation detail'}
          </SheetDescription>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {!isPaid ? (
            <LockedContent locale={locale} />
          ) : score ? (
            <UnlockedContent
              score={score}
              verificationCode={verificationCode}
              copiedCode={copiedCode}
              onCopyCode={handleCopyCode}
              locale={locale}
            />
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-800 px-6 py-4">
          {!isPaid ? (
            <Button onClick={onPurchase} className="w-full" size="lg">
              {locale === 'es' ? 'Evaluar mi perfil' : 'Evaluate my profile'}
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button variant="outline" onClick={onDownloadPDF} hideArrow className="flex-1">
                <DownloadSimple className="w-4 h-4" />
                {locale === 'es' ? 'Descargar PDF' : 'Download PDF'}
              </Button>
              <Button variant="outline" onClick={onShare} hideArrow className="flex-1">
                <ShareNetwork className="w-4 h-4" />
                {locale === 'es' ? 'Compartir' : 'Share'}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// Locked Content (not paid)
// ============================================================================

function LockedContent({ locale }: { locale: string }) {
  return (
    <div className="space-y-6">
      {/* Blurred decorative score */}
      <div className="relative flex flex-col items-center py-8">
        <div className="blur-md select-none pointer-events-none">
          <div className="w-24 h-24 rounded-full bg-[#E8F3EC] dark:bg-[#2C7A53]/15 flex items-center justify-center mb-3">
            <span className="text-5xl font-bold text-[#2C7A53]">A</span>
          </div>
          <p className="text-center text-lg font-semibold text-neutral-900 dark:text-white">92 / 100</p>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-xl bg-white dark:bg-[#2a2a2c] flex items-center justify-center">
            <Lock className="w-7 h-7 text-neutral-400 dark:text-neutral-500" />
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          {locale === 'es'
            ? '¿Qué es la evaluación de inquilino?'
            : 'What is the tenant evaluation?'}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {locale === 'es'
            ? 'Obtén tu evaluación para compartir con propietarios e inmobiliarias. Un score verificable que demuestra tu confiabilidad como inquilino y acelera el proceso de aplicación.'
            : 'Get your evaluation to share with landlords and agencies. A verifiable score that demonstrates your reliability as a tenant and speeds up the application process.'}
        </p>
      </div>

      {/* Benefits */}
      <div className="space-y-3">
        {[
          {
            es: 'Score verificable con código único',
            en: 'Verifiable score with unique code',
          },
          {
            es: 'PDF descargable para compartir',
            en: 'Downloadable PDF to share',
          },
          {
            es: 'Válido por 90 días',
            en: 'Valid for 90 days',
          },
          {
            es: 'Compartible por WhatsApp y email',
            en: 'Shareable via WhatsApp and email',
          },
        ].map((benefit, i) => (
          <div key={i} className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-[#2C7A53] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              {locale === 'es' ? benefit.es : benefit.en}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Unlocked Content (paid)
// ============================================================================

function UnlockedContent({
  score,
  verificationCode,
  copiedCode,
  onCopyCode,
  locale,
}: {
  score: RiskScore;
  verificationCode: string | null;
  copiedCode: boolean;
  onCopyCode: () => void;
  locale: string;
}) {
  const info = RISK_LEVELS[score.level];
  const colors = LEVEL_COLORS[score.level];

  return (
    <div className="space-y-6">
      {/* Score Display */}
      <div className="flex flex-col items-center py-4">
        <div className={cn('w-20 h-20 rounded-full flex items-center justify-center mb-3', colors.bg)}>
          <span className={cn('text-4xl font-bold', colors.text)}>{score.level}</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{score.numericScore} / 100</p>
        <Badge variant={getRiskBadgeVariant(score.level)} className="mt-2">
          {info.label}
        </Badge>
      </div>

      {/* AI Explanation */}
      <div className="rounded-xl bg-neutral-50 dark:bg-neutral-900 p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{score.aiExplanation}</p>
      </div>

      {/* Category Breakdown */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">
          {locale === 'es' ? 'Desglose por categoría' : 'Category breakdown'}
        </h4>
        <div className="space-y-4">
          {score.categories.map((cat) => (
            <div key={cat.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-foreground">{cat.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{Math.round(cat.weight * 100)}%</span>
                  <span className="text-sm font-semibold text-foreground">{cat.score}</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', colors.bar)}
                  style={{ width: `${cat.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drivers */}
      {score.drivers.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">
            {locale === 'es' ? 'Factores positivos' : 'Positive factors'}
          </h4>
          <div className="space-y-2">
            {score.drivers.map((driver, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#2C7A53] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{driver}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flags */}
      {score.flags.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">
            {locale === 'es' ? 'Puntos a considerar' : 'Points to consider'}
          </h4>
          <div className="space-y-2">
            {score.flags.map((flag) => (
              <div key={flag.id} className="flex items-start gap-2.5">
                <WarningCircle className="w-4 h-4 text-[#B7791F] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{flag.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Code */}
      {verificationCode && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">
            {locale === 'es' ? 'Código de verificación' : 'Verification code'}
          </h4>
          <button
            onClick={onCopyCode}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
          >
            <span className="font-mono text-lg font-semibold tracking-wider text-foreground">
              {verificationCode}
            </span>
            {copiedCode ? (
              <Check className="w-4 h-4 text-[#2C7A53] flex-shrink-0" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
          </button>
          <p className="text-xs text-muted-foreground mt-1.5">
            {locale === 'es'
              ? 'Cualquier persona puede verificar tu evaluación con este código.'
              : 'Anyone can verify your evaluation with this code.'}
          </p>
        </div>
      )}
    </div>
  );
}
