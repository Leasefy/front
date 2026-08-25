'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, WarningCircle, Lock, Copy, Check, DownloadSimple, ShareNetwork, X } from '@phosphor-icons/react';
import { ProgressRing, RiskBadge, IconButton, type RiskGrade } from '@leasefy/cadence';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { RiskScore, RiskLevel } from '@/lib/types/risk-score';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useLenis } from '@/components/providers/SmoothScroll';

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
    bg: 'bg-success-soft',
    text: 'text-success',
    bar: 'bg-success',
  },
  B: {
    bg: 'bg-primary-soft',
    text: 'text-primary',
    bar: 'bg-primary',
  },
  C: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
    bar: 'bg-warning',
  },
  D: {
    bg: 'bg-danger-soft',
    text: 'text-danger',
    bar: 'bg-danger',
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
  const lenis = useLenis();
  const [copiedCode, setCopiedCode] = useState(false);

  // Pause Lenis smooth scroll while the sheet is open (DESIGN.md §8).
  useEffect(() => {
    if (open) lenis.stop();
    else lenis.start();
    return () => lenis.start();
  }, [open, lenis]);

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
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              {isPaid
                ? (locale === 'es' ? 'Tu evaluación' : 'Your evaluation')
                : (locale === 'es' ? 'Evaluación de inquilino' : 'Tenant evaluation')}
            </SheetTitle>
            <IconButton
              variant="ghost"
              onClick={onClose}
              className="w-8 h-8 rounded-md hover:bg-surface-muted"
              aria-label="Cerrar"
              icon={<X className="w-4 h-4" />}
            />
          </div>
          <SheetDescription className="sr-only">
            {locale === 'es' ? 'Detalle de evaluación de inquilino' : 'Tenant evaluation detail'}
          </SheetDescription>
        </SheetHeader>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-6 py-6"
          data-lenis-prevent
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
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
        <div className="flex-shrink-0 border-t border-border px-6 py-4">
          {!isPaid ? (
            /*
              Acá había un botón primario "Evaluar mi perfil" cableado a
              `purchaseEvaluation()`, que solo escribe una advertencia en
              consola: la evaluación de autoservicio del inquilino no existe
              todavía. Se tocaba y no pasaba absolutamente nada — ni aviso, ni
              error, ni navegación.

              La evaluación **sí** existe, pero la lanza la inmobiliaria sobre
              una postulación (`POST /evaluations/:applicationId`). Así que en
              vez de un botón muerto se dice cómo se consigue de verdad, y el
              paso siguiente es postularse.
            */
            <div className="space-y-3">
              <p className="text-sm text-fg-muted text-center">
                {locale === 'es'
                  ? 'Tu evaluación la hace la inmobiliaria cuando te postulas a una propiedad. No tienes que pedirla ni pagarla aparte.'
                  : 'Your evaluation is run by the agency when you apply to a property. You do not need to request or pay for it separately.'}
              </p>
              <Button asChild className="w-full" size="lg">
                <Link href="/inquilino/para-ti">
                  {locale === 'es' ? 'Ver propiedades para mí' : 'View properties for me'}
                </Link>
              </Button>
            </div>
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
          <div className="w-24 h-24 rounded-full bg-success-soft flex items-center justify-center mb-3">
            <span className="text-5xl font-bold text-success">A</span>
          </div>
          <p className="text-center text-lg font-semibold text-fg">92 / 100</p>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-xl bg-surface flex items-center justify-center">
            <Lock className="w-7 h-7 text-fg-subtle" />
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div>
        <h3 className="text-base font-semibold text-fg mb-2">
          {locale === 'es'
            ? '¿Qué es la evaluación de inquilino?'
            : 'What is the tenant evaluation?'}
        </h3>
        {/* Decía "Obtén tu evaluación", como si se pudiera pedir: no se puede,
            la lanza la inmobiliaria. Y "proceso de aplicación" está muerto
            (docs/VOCABULARIO.md). */}
        <p className="text-sm text-fg-muted leading-relaxed">
          {locale === 'es'
            ? 'Un score verificable que muestra tu confiabilidad como inquilino. La inmobiliaria lo genera al estudiar tu postulación, y queda acá para que lo compartas.'
            : 'A verifiable score that shows your reliability as a tenant. The agency generates it when reviewing your application, and it stays here for you to share.'}
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
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <p className="text-sm text-fg">
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
  const colors = LEVEL_COLORS[score.level];

  return (
    <div className="space-y-6">
      {/* Score Display */}
      <div className="flex flex-col items-center py-4">
        <div className={cn('w-20 h-20 rounded-full flex items-center justify-center mb-3', colors.bg)}>
          <span className={cn('text-4xl font-bold', colors.text)}>{score.level}</span>
        </div>
        <p className="text-2xl font-bold font-mono tabular-nums text-fg">{score.numericScore} / 100</p>
        <RiskBadge grade={score.level} showLabel className="mt-2" />
      </div>

      {/* AI Explanation */}
      <div className="rounded-xl bg-surface-muted p-4">
        <p className="text-sm text-fg-muted leading-relaxed">{score.aiExplanation}</p>
      </div>

      {/* Category Breakdown */}
      <div>
        <h4 className="text-sm font-semibold text-fg mb-3">
          {locale === 'es' ? 'Desglose por categoría' : 'Category breakdown'}
        </h4>
        <div className="space-y-4">
          {score.categories.map((cat) => (
            <div key={cat.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-fg">{cat.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-fg-muted">{Math.round(cat.weight * 100)}%</span>
                  <span className="text-sm font-semibold text-fg">{cat.score}</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
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
          <h4 className="text-sm font-semibold text-fg mb-3">
            {locale === 'es' ? 'Factores positivos' : 'Positive factors'}
          </h4>
          <div className="space-y-2">
            {score.drivers.map((driver, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                <p className="text-sm text-fg-muted">{driver}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flags */}
      {score.flags.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-fg mb-3">
            {locale === 'es' ? 'Puntos a considerar' : 'Points to consider'}
          </h4>
          <div className="space-y-2">
            {score.flags.map((flag) => (
              <div key={flag.id} className="flex items-start gap-2.5">
                <WarningCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-sm text-fg-muted">{flag.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Code */}
      {verificationCode && (
        <div>
          <h4 className="text-sm font-semibold text-fg mb-2">
            {locale === 'es' ? 'Código de verificación' : 'Verification code'}
          </h4>
          <button
            onClick={onCopyCode}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-surface-muted border border-border hover:border-border-strong transition-colors"
          >
            <span className="font-mono text-lg font-semibold tracking-wider text-fg">
              {verificationCode}
            </span>
            {copiedCode ? (
              <Check className="w-4 h-4 text-success flex-shrink-0" />
            ) : (
              <Copy className="w-4 h-4 text-fg-muted flex-shrink-0" />
            )}
          </button>
          <p className="text-xs text-fg-muted mt-1.5">
            {locale === 'es'
              ? 'Cualquier persona puede verificar tu evaluación con este código.'
              : 'Anyone can verify your evaluation with this code.'}
          </p>
        </div>
      )}
    </div>
  );
}
