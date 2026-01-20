/**
 * Score components barrel export
 *
 * Components for displaying risk scores and category breakdowns.
 * Used in landlord dashboard and candidate evaluation views.
 *
 * Core components:
 * - LevelBadge: Circular badge showing A/B/C/D level
 * - ScoreCard: Compact/full score display with drivers
 * - ScoreProgressBar: Animated progress indicator
 * - CategoryBreakdown: Accordion with category details
 *
 * AI Explanation components:
 * - AIExplanation: Main narrative display with typing animation
 * - KeyDrivers: Positive factors list
 * - RiskFlags: Warning/concern indicators
 * - SuggestedConditions: Landlord recommendations
 * - RiskScoreDisplay: Full composite display
 *
 * Hooks:
 * - useTypingAnimation: Typewriter effect hook
 */

// Core components
export { LevelBadge, type LevelBadgeProps } from './LevelBadge';
export { ScoreCard, type ScoreCardProps } from './ScoreCard';
export { CategoryBreakdown, type CategoryBreakdownProps } from './CategoryBreakdown';
export { ScoreProgressBar, type ScoreProgressBarProps } from './ScoreProgressBar';

// AI Explanation components
export { AIExplanation, type AIExplanationProps } from './AIExplanation';
export { KeyDrivers, type KeyDriversProps } from './KeyDrivers';
export { RiskFlags, type RiskFlagsProps } from './RiskFlags';
export { SuggestedConditions, type SuggestedConditionsProps } from './SuggestedConditions';
export { RiskScoreDisplay, type RiskScoreDisplayProps } from './RiskScoreDisplay';

// Hooks
export { useTypingAnimation, type UseTypingAnimationOptions, type UseTypingAnimationReturn } from './useTypingAnimation';
