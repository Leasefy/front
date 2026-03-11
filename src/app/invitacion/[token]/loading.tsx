export default function InvitacionLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-[#111113] p-4">
      <div className="w-full max-w-md animate-pulse space-y-4">
        {/* Header skeleton */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-6 w-48 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>
        {/* Card skeleton */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-6 space-y-4">
          <div className="h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-4 w-2/3 rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>
        {/* Buttons skeleton */}
        <div className="space-y-3">
          <div className="h-11 rounded-xl bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-11 rounded-xl bg-neutral-200 dark:bg-neutral-700" />
        </div>
      </div>
    </div>
  );
}
