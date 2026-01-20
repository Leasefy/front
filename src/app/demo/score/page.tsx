'use client';

import { useState } from 'react';
import {
  LevelBadge,
  ScoreCard,
  CategoryBreakdown,
  ScoreProgressBar,
  AIExplanation,
  KeyDrivers,
  RiskFlags,
  SuggestedConditions,
  RiskScoreDisplay,
} from '@/components/score';
import { MOCK_CANDIDATES } from '@/lib/data/mock-candidates';
import type { RiskLevel } from '@/lib/types/risk-score';

/**
 * Demo page for score components
 *
 * Displays all score components with various configurations
 * to verify visual design and functionality.
 */
export default function ScoreDemoPage() {
  // Get one candidate of each level for comprehensive testing
  const levelACandidate = MOCK_CANDIDATES.find((c) => c.riskLevel === 'A')!;
  const levelBCandidate = MOCK_CANDIDATES.find((c) => c.riskLevel === 'B')!;
  const levelCCandidate = MOCK_CANDIDATES.find((c) => c.riskLevel === 'C')!;
  const levelDCandidate = MOCK_CANDIDATES.find((c) => c.riskLevel === 'D')!;

  const levels: RiskLevel[] = ['A', 'B', 'C', 'D'];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Score Components Demo
        </h1>
        <p className="text-slate-600 mb-8">
          Visual verification of all score display components.
        </p>

        {/* LevelBadge Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            1. LevelBadge Component
          </h2>
          <div className="bg-white rounded-sm border border-slate-200 p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-3">
              All sizes and levels:
            </h3>

            <div className="space-y-6">
              {/* Small badges */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Size: sm (24px)</p>
                <div className="flex items-end gap-6">
                  {levels.map((level) => (
                    <LevelBadge key={level} level={level} size="sm" />
                  ))}
                </div>
              </div>

              {/* Medium badges */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Size: md (32px)</p>
                <div className="flex items-end gap-6">
                  {levels.map((level) => (
                    <LevelBadge key={level} level={level} size="md" />
                  ))}
                </div>
              </div>

              {/* Large badges with labels */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Size: lg (48px) + label</p>
                <div className="flex items-end gap-8">
                  {levels.map((level) => (
                    <LevelBadge key={level} level={level} size="lg" showLabel />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ScoreProgressBar Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            2. ScoreProgressBar Component
          </h2>
          <div className="bg-white rounded-sm border border-slate-200 p-6">
            <div className="space-y-6">
              {/* Small size */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Size: sm (4px)</p>
                <div className="space-y-2 max-w-md">
                  <ScoreProgressBar score={92} level="A" size="sm" />
                  <ScoreProgressBar score={75} level="B" size="sm" />
                  <ScoreProgressBar score={58} level="C" size="sm" />
                  <ScoreProgressBar score={38} level="D" size="sm" />
                </div>
              </div>

              {/* Medium size with values */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Size: md (8px) + value</p>
                <div className="space-y-2 max-w-md">
                  <ScoreProgressBar score={92} level="A" size="md" showValue />
                  <ScoreProgressBar score={75} level="B" size="md" showValue />
                  <ScoreProgressBar score={58} level="C" size="md" showValue />
                  <ScoreProgressBar score={38} level="D" size="md" showValue />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ScoreCard Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            3. ScoreCard Component
          </h2>

          {/* Compact variant */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-600 mb-3">
              Compact Variant:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ScoreCard score={levelACandidate.riskScore} variant="compact" />
              <ScoreCard score={levelBCandidate.riskScore} variant="compact" />
              <ScoreCard score={levelCCandidate.riskScore} variant="compact" />
              <ScoreCard score={levelDCandidate.riskScore} variant="compact" />
            </div>
          </div>

          {/* Full variant */}
          <div>
            <h3 className="text-sm font-medium text-slate-600 mb-3">
              Full Variant:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ScoreCard
                score={levelACandidate.riskScore}
                candidateName={levelACandidate.fullName}
                variant="full"
              />
              <ScoreCard
                score={levelDCandidate.riskScore}
                candidateName={levelDCandidate.fullName}
                variant="full"
              />
            </div>
          </div>
        </section>

        {/* CategoryBreakdown Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            4. CategoryBreakdown Component
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Level A candidate */}
            <div className="bg-white rounded-sm border border-slate-200 p-4">
              <h3 className="text-sm font-medium text-slate-700 mb-3">
                {levelACandidate.fullName} (Nivel A)
              </h3>
              <CategoryBreakdown
                categories={levelACandidate.riskScore.categories}
                defaultExpanded
              />
            </div>

            {/* Level C candidate */}
            <div className="bg-white rounded-sm border border-slate-200 p-4">
              <h3 className="text-sm font-medium text-slate-700 mb-3">
                {levelCCandidate.fullName} (Nivel C)
              </h3>
              <CategoryBreakdown
                categories={levelCCandidate.riskScore.categories}
                defaultExpanded
              />
            </div>
          </div>
        </section>

        {/* Complete Example Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            5. Complete Score Display Example
          </h2>

          <div className="bg-white rounded-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">
                Evaluacion de Riesgo
              </h3>
              <p className="text-sm text-slate-500">
                {levelACandidate.fullName}
              </p>
            </div>

            <div className="p-6">
              {/* Score Card */}
              <div className="mb-6">
                <ScoreCard
                  score={levelACandidate.riskScore}
                  variant="full"
                />
              </div>

              {/* Category Breakdown */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">
                  Desglose por Categoria
                </h4>
                <CategoryBreakdown
                  categories={levelACandidate.riskScore.categories}
                  defaultExpanded
                />
              </div>
            </div>
          </div>
        </section>

        {/* AI Explanation Components Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            6. AI Explanation Components
          </h2>

          {/* KeyDrivers */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-600 mb-3">
              KeyDrivers Component:
            </h3>
            <div className="bg-white rounded-sm border border-slate-200 p-6">
              <KeyDrivers
                drivers={levelACandidate.riskScore.drivers}
                level="A"
              />
            </div>
          </div>

          {/* RiskFlags */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-600 mb-3">
              RiskFlags Component (Level C with flags):
            </h3>
            <div className="bg-white rounded-sm border border-slate-200 p-6">
              <RiskFlags flags={levelCCandidate.riskScore.flags} />
            </div>
          </div>

          {/* SuggestedConditions */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-600 mb-3">
              SuggestedConditions Component:
            </h3>
            <div className="bg-white rounded-sm border border-slate-200 p-6">
              <SuggestedConditions
                conditions={levelDCandidate.riskScore.suggestedConditions}
              />
            </div>
          </div>

          {/* Full AIExplanation */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-600 mb-3">
              AIExplanation Component (Complete):
            </h3>
            <AIExplanation
              explanation={levelBCandidate.riskScore.aiExplanation}
              drivers={levelBCandidate.riskScore.drivers}
              flags={levelBCandidate.riskScore.flags}
              suggestedConditions={levelBCandidate.riskScore.suggestedConditions}
              level="B"
            />
          </div>
        </section>

        {/* RiskScoreDisplay Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            7. RiskScoreDisplay Component
          </h2>

          {/* Compact variant */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-600 mb-3">
              Compact Variant:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RiskScoreDisplay candidate={levelACandidate} variant="compact" />
              <RiskScoreDisplay candidate={levelDCandidate} variant="compact" />
            </div>
          </div>

          {/* Full variant */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-600 mb-3">
              Full Variant (Level B - with flags and conditions):
            </h3>
            <div className="bg-white rounded-sm border border-slate-200">
              <RiskScoreDisplay candidate={levelBCandidate} variant="full" />
            </div>
          </div>

          {/* Full variant with animation toggle */}
          <FullDisplayWithAnimation candidate={levelCCandidate} />
        </section>

        {/* Mobile Test Note */}
        <div className="text-center text-sm text-slate-500 py-4">
          Resize the window to test mobile responsiveness.
        </div>
      </div>
    </div>
  );
}

/**
 * Sub-component for demonstrating animation toggle
 */
function FullDisplayWithAnimation({ candidate }: { candidate: typeof MOCK_CANDIDATES[0] }) {
  const [animationKey, setAnimationKey] = useState(0);
  const [animate, setAnimate] = useState(false);

  const handleReplayAnimation = () => {
    setAnimate(true);
    setAnimationKey((k) => k + 1);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-600">
          Full Variant with Animation (Level C):
        </h3>
        <button
          type="button"
          onClick={handleReplayAnimation}
          className="px-3 py-1 text-xs font-medium text-white bg-primary rounded-sm hover:bg-primary/90 transition-colors"
        >
          Replay Animation
        </button>
      </div>
      <div className="bg-white rounded-sm border border-slate-200">
        <RiskScoreDisplay
          key={animationKey}
          candidate={candidate}
          variant="full"
          showAnimation={animate}
        />
      </div>
    </div>
  );
}
