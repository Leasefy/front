'use client';

import { useState } from 'react';
import {
  Brain,
  CheckCircle,
  XCircle,
  Clock,
  Warning,
  Shield,
  CaretDown,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Appear, Collapse } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlanProgressBar } from '@/components/ui/plan/PlanProgressBar';
import { useDocumentAnalysis } from '@/lib/hooks/useDocumentAnalysis';
import { toast } from '@/components/ui/toast';
import type { DocumentAnalysisResult } from '@/lib/api/ai-analysis.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';

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
  PROCESSING: { icon: Clock, color: 'text-fg-muted', bg: 'bg-surface-muted', label: 'Procesando…' },
  COMPLETED: { icon: CheckCircle, color: 'text-success', bg: 'bg-success-soft', label: 'Completado' },
  FAILED: { icon: XCircle, color: 'text-danger', bg: 'bg-danger-soft', label: 'Error' },
} as const;

const RISK_COLORS: Record<string, string> = {
  BAJO: 'text-success',
  MEDIO: 'text-warning',
  ALTO: 'text-danger',
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
    // La tarjeta en papel; el estado lo dicen el ícono y la línea gris (antes
    // la tarjeta entera se teñía del color del estado).
    <div className="rounded-lg border border-border overflow-hidden bg-surface">
      {/* Header */}
      <button
        type="button"
        onClick={() => result.status === 'COMPLETED' && setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left',
          result.status === 'COMPLETED' && 'cursor-pointer hover:bg-surface-muted'
        )}
      >
        <StatusIcon
          className={cn('w-5 h-5 flex-shrink-0', config.color)}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-fg truncate">
            {getDocTypeLabel(result.documentType)}
          </p>
          <p className="text-caption text-fg-muted">
            {config.label}
            {result.status === 'COMPLETED' && result.scoreFinal !== null && (
              <> &middot; Puntaje: <span className="font-mono text-fg">{result.scoreFinal}/100</span></>
            )}
          </p>
        </div>

        {/* Puntaje */}
        {result.status === 'COMPLETED' && result.scoreFinal !== null && (
          <div className="flex items-center gap-2">
            <div className="w-12">
              <PlanProgressBar
                value={result.scoreFinal}
                size="sm"
                variant={result.scoreFinal >= 70 ? 'success' : result.scoreFinal >= 50 ? 'warning' : 'danger'}
              />
            </div>
            <CaretDown className={cn('w-4 h-4 text-fg-subtle transition-transform duration-slow ease-emphasis', expanded && 'rotate-180')} />
          </div>
        )}

        {result.status === 'FAILED' && result.errorMessage && (
          <span className="text-caption text-danger truncate max-w-[150px]">{result.errorMessage}</span>
        )}
      </button>

      {/* Expanded details — se abre y se cierra con su altura; el chevrón gira
          con la misma curva. */}
      <Collapse open={expanded && result.status === 'COMPLETED'}>
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
              <p className="text-caption text-fg-subtle mb-1">Justificación</p>
              <p className="text-sm text-fg-muted leading-relaxed">{result.justificacion}</p>
            </div>
          )}

          {/* Recommendation */}
          {result.recomendacion && (
            <div>
              <p className="text-caption text-fg-subtle mb-1">Recomendación</p>
              <p className="text-sm text-fg-muted leading-relaxed">{result.recomendacion}</p>
            </div>
          )}

          {/* Flags */}
          {result.flags && Array.isArray(result.flags) && result.flags.length > 0 && (
            <div>
              <p className="text-caption text-fg-subtle mb-1">Alertas</p>
              <div className="flex flex-wrap gap-1.5">
                {result.flags.map((flag, i) => (
                  <Badge key={i} variant="warning">
                    {String(flag)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Processing time */}
          {result.processingTimeMs && (
            <p className="text-caption text-fg-subtle">
              Procesado en {(result.processingTimeMs / 1000).toFixed(1)}s
              {result.confidence !== null && <> &middot; Confianza OCR: {result.confidence}%</>}
            </p>
          )}
        </div>
      </Collapse>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DocumentAnalysisSection({ applicationId, className }: DocumentAnalysisSectionProps) {
  const { results, isAnalyzing, isLoading, error, falloAlCargar, recargar, triggerAnalysis } =
    useDocumentAnalysis(applicationId);
  const [triggering, setTriggering] = useState(false);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await triggerAnalysis();
      toast.success('Análisis de documentos iniciado');
    } catch (err) {
      // 02-10-2026: con la regla de oro del traductor (antes, `err.message` crudo).
      toast.error(
        mensajeParaLaPersona(err, {
          accion: 'iniciar el análisis de los documentos',
          porDefecto: 'No pudimos iniciar el análisis. Prueba de nuevo en un momento.',
        }),
      );
    } finally {
      setTriggering(false);
    }
  };

  const summary = results?.summary;
  const hasResults = results && results.results.length > 0;
  const allDone = summary && summary.total > 0 && summary.completed + summary.failed >= summary.total;

  if (isLoading) {
    return (
      // Esqueleto con la forma de la lista (antes una rueda con «Cargando…»).
      <div className={cn('space-y-2', className)} aria-busy="true" data-testid="analisis-cargando">
        <div className="h-5 w-48 animate-pulse rounded-full bg-surface-muted" />
        {[0, 1].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-muted" />
        ))}
      </div>
    );
  }

  /*
   * 02-10-2026 (Nico) · La carga falló con algo que NO es 404 (el 404 es
   * «todavía no hay análisis» y sigue como siempre): se dice con el traductor
   * —«conexión» sólo sin respuesta, un 4xx qué está mal, un 5xx «de nuestro
   * lado» con la referencia— y se ofrece reintentar. Sin el botón de analizar:
   * no sabemos si ya hay un análisis y no se pide uno a ciegas.
   */
  if (falloAlCargar) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-fg-muted" aria-hidden="true" />
          <h4 className="text-sm font-medium text-fg">
            Análisis IA de documentos
          </h4>
        </div>
        <Appear>
          <FalloDeCarga
            error={falloAlCargar}
            queEs="el análisis de los documentos"
            onReintentar={recargar}
            enmarcado={false}
            className="py-8"
          />
        </Appear>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with trigger button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-fg-muted" aria-hidden="true" />
          <h4 className="text-sm font-medium text-fg">
            Análisis IA de documentos
          </h4>
        </div>

        {(!hasResults || allDone) && (
          <Button
            size="sm"
            variant={hasResults ? 'outline' : 'default'}
            onClick={handleTrigger}
            disabled={triggering || isAnalyzing}
            isLoading={triggering || isAnalyzing}
          >
            {triggering || isAnalyzing ? (
              'Analizando…'
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
        <div className="rounded-md bg-danger-soft border border-danger/30 px-3 py-2">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* Progress summary */}
      {isAnalyzing && summary && summary.total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-caption text-fg-muted">
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
            <p className="text-2xl font-mono text-fg">{summary.averageScore}</p>
            <p className="text-caption text-fg-muted">/100</p>
          </div>
          <div className="flex-1">
            <PlanProgressBar
              value={summary.averageScore}
              size="md"
              variant={summary.averageScore >= 70 ? 'success' : summary.averageScore >= 50 ? 'warning' : 'danger'}
            />
            <p className="text-caption text-fg-muted mt-1">
              Puntaje promedio &middot; {summary.completed} completado{summary.completed !== 1 && 's'}
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
            ? 'bg-success-soft border-success/30'
            : 'bg-warning-soft border-warning/30'
        )}>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">
              Consistencia entre documentos: {results.crossValidation.consistencyScore}%
            </span>
          </div>
          {results.crossValidation.inconsistencies.length > 0 && (
            <ul className="text-caption space-y-1 mt-2">
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
          Inicia el análisis para verificar los documentos del candidato con inteligencia artificial.
        </p>
      )}
    </div>
  );
}
