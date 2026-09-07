'use client';

import { useState } from 'react';
import {
  Brain,
  CheckCircle,
  XCircle,
  SpinnerGap,
  Clock,
  Warning,
  Shield,
  CaretDown,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import { useDocumentAnalysis } from '@/lib/hooks/useDocumentAnalysis';
import { toast } from '@/components/ui/toast';
import type { DocumentAnalysisResult } from '@/lib/api/ai-analysis.service';

// ============================================================================
// Types
// ============================================================================

interface DocumentAnalysisSectionProps {
  applicationId: string;
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

const STATUS_CONFIG = {
  PENDING: { icon: Clock, color: 'text-fg-subtle', bg: 'bg-surface-muted', label: 'Pendiente' },
  PROCESSING: { icon: SpinnerGap, color: 'text-primary', bg: 'bg-primary-soft dark:bg-[#1A40FF]/15', label: 'Procesando...' },
  COMPLETED: { icon: CheckCircle, color: 'text-success', bg: 'bg-success-soft dark:bg-[#2C7A53]/15', label: 'Completado' },
  FAILED: { icon: XCircle, color: 'text-danger', bg: 'bg-danger-soft dark:bg-[#C4503B]/15', label: 'Error' },
} as const;

const RISK_COLORS: Record<string, string> = {
  BAJO: 'text-success dark:text-[#3EAE70]',
  MEDIO: 'text-warning dark:text-[#D2992F]',
  ALTO: 'text-danger dark:text-[#E0664D]',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  ID_DOCUMENT: 'Cedula',
  CEDULA: 'Cedula',
  EMPLOYMENT_LETTER: 'Carta laboral',
  PAY_STUB: 'Desprendible de pago',
  BANK_STATEMENT: 'Extracto bancario',
  INCOME_PROOF: 'Comprobante de ingresos',
  OTHER: 'Otro documento',
};

function getDocTypeLabel(type: string): string {
  return DOC_TYPE_LABELS[type] || type;
}

// ============================================================================
// Sub-components
// ============================================================================

function DocumentResultCard({ result }: { result: DocumentAnalysisResult }) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[result.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = config.icon;

  return (
    <div className={cn('rounded-lg border border-border overflow-hidden', config.bg)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => result.status === 'COMPLETED' && setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left',
          result.status === 'COMPLETED' && 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
        )}
      >
        <StatusIcon
          className={cn('w-5 h-5 flex-shrink-0', config.color, result.status === 'PROCESSING' && 'animate-spin')}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-fg truncate">
            {getDocTypeLabel(result.documentType)}
          </p>
          <p className="text-xs text-fg-muted">
            {config.label}
            {result.status === 'COMPLETED' && result.scoreFinal !== null && (
              <> &middot; Score: <span className="font-medium">{result.scoreFinal}/100</span></>
            )}
          </p>
        </div>

        {/* Score badge */}
        {result.status === 'COMPLETED' && result.scoreFinal !== null && (
          <div className="flex items-center gap-2">
            <div className="w-12">
              <PlanProgressBar
                value={result.scoreFinal}
                size="sm"
                variant={result.scoreFinal >= 70 ? 'success' : result.scoreFinal >= 50 ? 'warning' : 'danger'}
              />
            </div>
            <CaretDown className={cn('w-4 h-4 text-fg-subtle transition-transform', expanded && 'rotate-180')} />
          </div>
        )}

        {result.status === 'FAILED' && result.errorMessage && (
          <span className="text-xs text-danger truncate max-w-[150px]">{result.errorMessage}</span>
        )}
      </button>

      {/* Expanded details */}
      {expanded && result.status === 'COMPLETED' && (
        <div className="border-t border-border px-4 py-3 space-y-3 bg-surface">
          {/* Risk level */}
          {result.nivelRiesgo && (
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-fg-subtle" />
              <span className="text-sm text-fg-muted">Nivel de riesgo:</span>
              <span className={cn('text-sm font-medium', RISK_COLORS[result.nivelRiesgo] || 'text-fg')}>
                {result.nivelRiesgo}
              </span>
            </div>
          )}

          {/* Justification */}
          {result.justificacion && (
            <div>
              <p className="text-xs font-medium text-fg-muted mb-1">Justificacion</p>
              <p className="text-sm text-fg-muted leading-relaxed">{result.justificacion}</p>
            </div>
          )}

          {/* Recommendation */}
          {result.recomendacion && (
            <div>
              <p className="text-xs font-medium text-fg-muted mb-1">Recomendacion</p>
              <p className="text-sm text-fg-muted leading-relaxed">{result.recomendacion}</p>
            </div>
          )}

          {/* Flags */}
          {result.flags && Array.isArray(result.flags) && result.flags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-fg-muted mb-1">Alertas</p>
              <div className="flex flex-wrap gap-1.5">
                {result.flags.map((flag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-warning-soft dark:bg-[#B7791F]/15 text-warning dark:text-[#D2992F] text-xs rounded-sm"
                  >
                    <Warning className="w-3 h-3" />
                    {String(flag)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Processing time */}
          {result.processingTimeMs && (
            <p className="text-[11px] text-fg-subtle">
              Procesado en {(result.processingTimeMs / 1000).toFixed(1)}s
              {result.confidence !== null && <> &middot; Confianza OCR: {result.confidence}%</>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DocumentAnalysisSection({ applicationId, className }: DocumentAnalysisSectionProps) {
  const { results, isAnalyzing, isLoading, error, triggerAnalysis } = useDocumentAnalysis(applicationId);
  const [triggering, setTriggering] = useState(false);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await triggerAnalysis();
      toast.success('Analisis de documentos iniciado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar analisis');
    } finally {
      setTriggering(false);
    }
  };

  const summary = results?.summary;
  const hasResults = results && results.results.length > 0;
  const allDone = summary && summary.total > 0 && summary.completed + summary.failed >= summary.total;

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2">
          <Spinner size="sm" variant="muted" />
          <span className="text-sm text-fg-muted">Cargando resultados...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with trigger button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h4 className="text-sm font-semibold text-fg">
            Analisis IA de documentos
          </h4>
        </div>

        {(!hasResults || allDone) && (
          <Button
            size="sm"
            variant={hasResults ? 'outline' : 'default'}
            onClick={handleTrigger}
            disabled={triggering || isAnalyzing}
            className="text-xs"
          >
            {triggering || isAnalyzing ? (
              <>
                <Spinner size="xs" variant="current" className="mr-1.5" />
                Analizando...
              </>
            ) : hasResults ? (
              'Reanalizar'
            ) : (
              <>
                <Brain className="w-3.5 h-3.5 mr-1.5" />
                Analizar documentos
              </>
            )}
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-danger-soft dark:bg-[#C4503B]/15 border border-danger/30 dark:border-[#C4503B]/40 px-3 py-2">
          <p className="text-sm text-danger dark:text-[#E0664D]">{error}</p>
        </div>
      )}

      {/* Progress summary */}
      {isAnalyzing && summary && summary.total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span>Progreso: {summary.completed + summary.failed}/{summary.total} documentos</span>
            <span>{Math.round(((summary.completed + summary.failed) / summary.total) * 100)}%</span>
          </div>
          <PlanProgressBar
            value={summary.completed + summary.failed}
            max={summary.total}
            size="md"
            variant="default"
          />
        </div>
      )}

      {/* Average score (when done) */}
      {allDone && summary.averageScore !== null && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-muted border border-border">
          <div className="text-center">
            <p className="text-2xl font-bold text-fg">{summary.averageScore}</p>
            <p className="text-[11px] text-fg-muted">/100</p>
          </div>
          <div className="flex-1">
            <PlanProgressBar
              value={summary.averageScore}
              size="md"
              variant={summary.averageScore >= 70 ? 'success' : summary.averageScore >= 50 ? 'warning' : 'danger'}
            />
            <p className="text-xs text-fg-muted mt-1">
              Score promedio &middot; {summary.completed} completado{summary.completed !== 1 && 's'}
              {summary.failed > 0 && <>, {summary.failed} fallido{summary.failed !== 1 && 's'}</>}
            </p>
          </div>
        </div>
      )}

      {/* Cross-validation */}
      {results?.crossValidation && (
        <div className={cn(
          'p-3 rounded-lg border',
          results.crossValidation.consistencyScore >= 80
            ? 'bg-success-soft dark:bg-[#2C7A53]/15 border-success/30 dark:border-[#2C7A53]/40'
            : 'bg-warning-soft dark:bg-[#B7791F]/15 border-warning/30 dark:border-[#B7791F]/40'
        )}>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">
              Consistencia entre documentos: {results.crossValidation.consistencyScore}%
            </span>
          </div>
          {results.crossValidation.inconsistencies.length > 0 && (
            <ul className="text-xs space-y-1 mt-2">
              {results.crossValidation.inconsistencies.map((inc, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <Warning className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{inc.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Document results list */}
      {hasResults && (
        <div className="space-y-2">
          {results.results.map((result) => (
            <DocumentResultCard key={result.id} result={result} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!hasResults && !isAnalyzing && !error && (
        <p className="text-sm text-fg-muted">
          Inicia el analisis para verificar los documentos del candidato con inteligencia artificial.
        </p>
      )}
    </div>
  );
}
