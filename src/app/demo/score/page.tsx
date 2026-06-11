'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Info } from '@phosphor-icons/react';
import { RiskScoreDisplay } from '@/components/score';
import { CandidateSelector, DemoControls, type DisplayVariant } from '@/components/demo';
import { MOCK_CANDIDATES } from '@/lib/data/mock-candidates';
import { Button } from '@/components/ui/button';

/**
 * Risk Score Display - Interactive Demo Page
 *
 * Development testing playground for risk score components.
 * Features:
 * - Candidate selection dropdown (grouped by level)
 * - Variant toggle (compact/full/embedded)
 * - Animation controls with replay
 * - Responsive design verification
 *
 * Route: /demo/score
 * Note: This page is for development, not production users.
 */
export default function ScoreDemoPage() {
  // Selected candidate state
  const [selectedCandidateId, setSelectedCandidateId] = useState(MOCK_CANDIDATES[0].id);

  // Display controls state
  const [variant, setVariant] = useState<DisplayVariant>('full');
  const [animationEnabled, setAnimationEnabled] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Get selected candidate
  const selectedCandidate = MOCK_CANDIDATES.find((c) => c.id === selectedCandidateId);

  // Handle candidate change - reset animation
  const handleCandidateChange = useCallback((candidateId: string) => {
    setSelectedCandidateId(candidateId);
    // Reset animation key to trigger re-render with fresh animation
    if (animationEnabled) {
      setAnimationKey((k) => k + 1);
    }
  }, [animationEnabled]);

  // Handle variant change
  const handleVariantChange = useCallback((newVariant: DisplayVariant) => {
    setVariant(newVariant);
  }, []);

  // Handle animation toggle
  const handleAnimationToggle = useCallback(() => {
    setAnimationEnabled((prev) => !prev);
  }, []);

  // Handle replay animation
  const handleReplayAnimation = useCallback(() => {
    setAnimationKey((k) => k + 1);
  }, []);

  if (!selectedCandidate) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Candidato no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Risk Score Display
                </h1>
                <p className="text-sm text-muted-foreground">Demo interactivo</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>Página de desarrollo</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* Controls Section */}
        <section className="space-y-4">
          {/* Candidate Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Seleccionar candidato
            </label>
            <CandidateSelector
              candidates={MOCK_CANDIDATES}
              selectedId={selectedCandidateId}
              onChange={handleCandidateChange}
              className="max-w-md"
            />
          </div>

          {/* Display Controls */}
          <DemoControls
            variant={variant}
            onVariantChange={handleVariantChange}
            animationEnabled={animationEnabled}
            onAnimationToggle={handleAnimationToggle}
            onReplayAnimation={handleReplayAnimation}
          />
        </section>

        {/* Risk Score Display */}
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-foreground">
            Vista previa
          </h2>

          <div className="bg-card rounded-sm border border-border p-4 md:p-6">
            <RiskScoreDisplay
              key={animationKey}
              candidate={selectedCandidate}
              variant={variant}
              showAnimation={animationEnabled}
            />
          </div>
        </section>

        {/* Quick Level Compass */}
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-foreground">
            Saltar a nivel
          </h2>
          <div className="flex flex-wrap gap-2">
            {(['A', 'B', 'C', 'D'] as const).map((level) => {
              const levelCandidate = MOCK_CANDIDATES.find((c) => c.riskLevel === level);
              if (!levelCandidate) return null;

              const isSelected = selectedCandidate.riskLevel === level;

              return (
                <Button
                  key={level}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleCandidateChange(levelCandidate.id)}
                  className="gap-2"
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      level === 'A'
                        ? 'bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70]'
                        : level === 'B'
                        ? 'bg-[#EEF1FF] text-[#1A40FF] dark:bg-[#1A40FF]/15 dark:text-[#5570FF]'
                        : level === 'C'
                        ? 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]'
                        : 'bg-[#F8EAE7] text-[#C4503B] dark:bg-[#C4503B]/15 dark:text-[#E0664D]'
                    }`}
                  >
                    {level}
                  </span>
                  Nivel {level}
                </Button>
              );
            })}
          </div>
        </section>

        {/* Integration Notes */}
        <section className="mt-8 pt-6 border-t border-border">
          <h2 className="text-sm font-medium text-foreground mb-3">
            Notas de integración (Fase 5)
          </h2>
          <div className="bg-muted rounded-sm p-4 text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Import patterns:</strong>
            </p>
            <pre className="bg-card p-2 rounded text-xs overflow-x-auto">
{`// Para badge rápido en listas
import { LevelBadge } from '@/components/score';

// Para vista de detalle completa
import { RiskScoreDisplay } from '@/components/score';

// Para composiciones personalizadas
import {
  ScoreCard,
  AIExplanation,
  CategoryBreakdown,
} from '@/components/score';`}
            </pre>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground py-6 border-t border-border">
          <p>
            Esta página de demo valida que la Fase 4 está completa.
            <br />
            Siguiente: Fase 5 - Dashboard del Propietario
          </p>
        </footer>
      </main>
    </div>
  );
}
