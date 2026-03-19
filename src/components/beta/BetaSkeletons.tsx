'use client';

// ============================================================================
// Loading Skeletons for Beta Views
// ============================================================================
// Each skeleton matches the dimensions of its real component to prevent
// layout shift. Uses animate-pulse with neutral bars for dark mode compat.

/**
 * ConversationListSkeleton - Matches ConversationList item layout.
 * 5 items: title bar (w-3/4) + shorter preview bar (w-1/3) + tiny count bar.
 */
export function ConversationListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Group header */}
      <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-16 mx-1" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-3 py-2.5 space-y-1.5">
          <div className="h-3.5 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
          <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-1/2" />
          <div className="h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}

/**
 * ChatMessageSkeleton - 3 alternating bubbles (user right, assistant left).
 * Matches UserBubble/AssistantBubble widths for seamless transition.
 */
export function ChatMessageSkeleton() {
  return (
    <div className="space-y-4 px-4 py-6 animate-pulse">
      {/* User bubble - right aligned */}
      <div className="flex justify-end">
        <div className="w-2/3 space-y-1.5">
          <div className="h-4 bg-indigo-100 dark:bg-indigo-500/10 rounded-2xl w-full" />
          <div className="h-4 bg-indigo-100 dark:bg-indigo-500/10 rounded-2xl w-3/4 ml-auto" />
        </div>
      </div>

      {/* Assistant bubble - left aligned with avatar */}
      <div className="flex gap-2.5 items-start">
        <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0" />
        <div className="flex-1 space-y-1.5 max-w-[80%]">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full" />
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6" />
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3" />
        </div>
      </div>

      {/* User bubble - right aligned */}
      <div className="flex justify-end">
        <div className="w-1/2 space-y-1.5">
          <div className="h-4 bg-indigo-100 dark:bg-indigo-500/10 rounded-2xl w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * DecisionHistorySkeleton - 2 cards with title bar + 3 option bars.
 * Matches DecisionItem layout (title + category badge + status line).
 */
export function DecisionHistorySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Section header */}
      <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-24 mx-1" />
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-xl border border-neutral-200/60 dark:border-border/50 space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="h-3.5 bg-neutral-200 dark:bg-neutral-700 rounded flex-1" />
            <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded-full w-14 shrink-0" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * BriefingCardSkeleton - Card with date pill + title + 4 section bars.
 * Matches BriefingCard layout (header + greeting + section cards).
 */
export function BriefingCardSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Date pills row */}
      <div className="flex gap-1.5 pb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-full"
            style={{ width: i === 0 ? 48 : 56 }}
          />
        ))}
      </div>

      {/* Date label + greeting */}
      <div className="space-y-2">
        <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-32" />
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
        <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-full" />
        <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-2/3" />
      </div>

      {/* 4 section bars */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-neutral-200/60 dark:border-border/50 border-l-[3px] border-l-neutral-300 dark:border-l-neutral-600 p-3 space-y-2"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-neutral-200 dark:bg-neutral-700 shrink-0" />
            <div className="h-3.5 bg-neutral-200 dark:bg-neutral-700 rounded flex-1" />
          </div>
          <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-5/6" />
        </div>
      ))}
    </div>
  );
}

/**
 * PreferencesSkeleton - 3 settings sections with toggle-like bars.
 * Matches PreferencesPanel section layout (header + toggle rows).
 */
export function PreferencesSkeleton() {
  return (
    <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-8 animate-pulse">
      {/* Page header */}
      <div className="space-y-2">
        <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-32" />
        <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-64" />
      </div>

      {/* 3 sections */}
      {Array.from({ length: 3 }).map((_, sectionIdx) => (
        <div key={sectionIdx} className="space-y-4">
          {/* Section header */}
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-40" />

          {/* Toggle rows */}
          {Array.from({ length: 3 }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <div className="h-3.5 bg-neutral-200 dark:bg-neutral-700 rounded w-28" />
                <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-48" />
              </div>
              <div className="w-10 h-5 bg-neutral-200 dark:bg-neutral-700 rounded-full shrink-0" />
            </div>
          ))}

          {/* Divider */}
          {sectionIdx < 2 && (
            <div className="border-t border-neutral-200 dark:border-border" />
          )}
        </div>
      ))}
    </div>
  );
}
