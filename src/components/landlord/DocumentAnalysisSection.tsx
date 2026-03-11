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
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import { useDocumentAnalysis } from '@/lib/hooks/useDocumentAnalysis';
import { toast } from 'sonner';
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
  PENDING: { icon: Clock, color: 'text-neutral-400', bg: 'bg-neutral-50 dark:bg-neutral-800', label: 'Pendiente' },
  PROCESSING: { icon: SpinnerGap, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', label: 'Procesando...' },
  COMPLETED: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: 'Completado' },
  FAILED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Error' },
} as const;

const RISK_COLORS: Record<string, string> = {
  BAJO: 'text-emerald-600 dark:text-emerald-400',
  MEDIO: 'text-amber-600 dark:text-amber-400',
  ALTO: 'text-red-600 dark:text-red-400',
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
    <div className={cn('rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden', config.bg)}>
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
          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
            {getDocTypeLabel(result.documentType)}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
            <CaretDown className={cn('w-4 h-4 text-neutral-400 transition-transform', expanded && 'rotate-180')} />
          </div>
        )}

        {result.status === 'FAILED' && result.errorMessage && (
          <span className="text-xs text-red-500 truncate max-w-[150px]">{result.errorMessage}</span>
        )}
      </button>

      {/* Expanded details */}
      {expanded && result.status === 'COMPLETED' && (
        <div className="border-t border-neutral-200 dark:border-neutral-700 px-4 py-3 space-y-3 bg-white dark:bg-[#222224]">
          {/* Risk level */}
          {result.nivelRiesgo && (
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-500">Nivel de riesgo:</span>
              <span className={cn('text-sm font-medium', RISK_COLORS[result.nivelRiesgo] || 'text-neutral-900 dark:text-white')}>
                {result.nivelRiesgo}
              </span>
            </div>
          )}

          {/* Justification */}
          {result.justificacion && (
            <div>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Justificacion</p>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{result.justificacion}</p>
            </div>
          )}

          {/* Recommendation */}
          {result.recomendacion && (
            <div>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Recomendacion</p>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{result.recomendacion}</p>
            </div>
          )}

          {/* Flags */}
          {result.flags && Array.isArray(result.flags) && result.flags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Alertas</p>
              <div className="flex flex-wrap gap-1.5">
                {result.flags.map((flag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs rounded-md"
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
            <p className="text-[11px] text-neutral-400">
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
          <SpinnerGap className="w-4 h-4 text-neutral-400 animate-spin" />
          <span className="text-sm text-neutral-500">Cargando resultados...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with trigger button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-500" />
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
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
                <SpinnerGap className="w-3.5 h-3.5 mr-1.5 animate-spin" />
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
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-3 py-2">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Progress summary */}
      {isAnalyzing && summary && summary.total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-500">
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
        <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{summary.averageScore}</p>
            <p className="text-[11px] text-neutral-500">/100</p>
          </div>
          <div className="flex-1">
            <PlanProgressBar
              value={summary.averageScore}
              size="md"
              variant={summary.averageScore >= 70 ? 'success' : summary.averageScore >= 50 ? 'warning' : 'danger'}
            />
            <p className="text-xs text-neutral-500 mt-1">
              Score promedio &middot; {summary.completed} completado{summary.completed !== 1 && 's'}
              {summary.failed > 0 && <>, {summary.failed} fallido{summary.failed !== 1 && 's'}</>}
            </p>
          </div>
        </div>
      )}

      {/* Cross-validation */}
      {results?.crossValidation && (
        <div className={cn(
          'p-3 rounded-xl border',
          results.crossValidation.consistencyScore >= 80
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
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
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Inicia el analisis para verificar los documentos del candidato con inteligencia artificial.
        </p>
      )}
    </div>
  );
}
