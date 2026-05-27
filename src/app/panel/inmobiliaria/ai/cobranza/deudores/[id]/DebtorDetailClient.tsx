'use client'

/**
 * DebtorDetailClient — Phase 31 plan 31-09 (COBR-UI-03, COBR-UI-14).
 *
 * Orchestrator for /panel/inmobiliaria/ai/cobranza/deudores/[id]:
 *  - Single useDebtorDetail() call → feeds header + sidebar
 *  - Lazy-mount tabs per D-31-09 (non-active tab unmounts, hooks idle)
 *  - sm: bottom-drawer tab switcher + sidebar collapsed to sticky bottom bar
 *  - md+: horizontal tab nav + sticky right sidebar
 *  - PIIRevealContextProvider wraps everything; single shared PIIRevealModal
 *    lifted to this level (Task 6 wiring)
 *  - ?tab=… deep links read on mount and written on tab change (shallow)
 */

import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { useI18n } from '@/lib/i18n'
import { stageColorClasses } from '@/lib/cartera'
import { useDebtorDetail } from '@/lib/hooks/cobranza/use-debtor-detail'
import {
  PIIRevealContextProvider,
  type PIIFieldKey,
} from '@/lib/context/PIIRevealContext'
import { PIIRevealModal } from '@/components/inmobiliaria/cobranza/PIIRevealModal'

import { DebtorSidebar } from './DebtorSidebar'
import { TimelineTab } from './tabs/TimelineTab'
import { LlamadasTab } from './tabs/LlamadasTab'
import { MemosTab } from './tabs/MemosTab'
import { CompromisosTab } from './tabs/CompromisosTab'
import { AccionesTab } from './tabs/AccionesTab'

void React

type TabKey = 'timeline' | 'llamadas' | 'memos' | 'compromisos' | 'acciones'
const TAB_KEYS: TabKey[] = ['timeline', 'llamadas', 'memos', 'compromisos', 'acciones']

function isTabKey(s: string | null): s is TabKey {
  return s !== null && (TAB_KEYS as string[]).includes(s)
}

function daysBadgeClasses(days: number): string {
  if (days <= 3) {
    return 'bg-green-50 text-green-700 ring-1 ring-green-200 dark:bg-green-950/30 dark:text-green-400 dark:ring-green-800'
  }
  if (days <= 7) {
    return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-800'
  }
  return 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-800'
}

interface DebtorDetailClientProps {
  debtorId: string
}

export default function DebtorDetailClient({ debtorId }: DebtorDetailClientProps) {
  return (
    // Provider must remount cleanly when debtorId changes — React keying.
    <PIIRevealContextProvider key={debtorId} debtorId={debtorId}>
      <DebtorDetailInner debtorId={debtorId} />
    </PIIRevealContextProvider>
  )
}

function DebtorDetailInner({ debtorId }: DebtorDetailClientProps) {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialTab: TabKey = isTabKey(searchParams.get('tab'))
    ? (searchParams.get('tab') as TabKey)
    : 'timeline'

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [tabSwitcherOpen, setTabSwitcherOpen] = useState<boolean>(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false)

  // Single shared PII reveal modal — driven by lifted state (Task 6).
  const [revealModal, setRevealModal] = useState<{ field: PIIFieldKey } | null>(null)

  const { data, isLoading, error, refetch } = useDebtorDetail({ debtorId })
  const debtorName = data?.fullName ?? ''

  const onRevealRequest = useCallback((field: PIIFieldKey) => {
    setRevealModal({ field })
  }, [])

  // Write back ?tab=… on tab change (shallow).
  const onTabChange = useCallback(
    (tab: TabKey) => {
      setActiveTab(tab)
      setTabSwitcherOpen(false)
      const qs = new URLSearchParams(searchParams.toString())
      qs.set('tab', tab)
      router.replace(`?${qs.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  useEffect(() => {
    // Re-sync if URL changes externally.
    const fromUrl = searchParams.get('tab')
    if (isTabKey(fromUrl) && fromUrl !== activeTab) setActiveTab(fromUrl)
  }, [searchParams, activeTab])

  const stageColors = useMemo(
    () => (data ? stageColorClasses(data.currentStage) : null),
    [data],
  )

  return (
    <main className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <header className="mb-5">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            {debtorName || t('inmobiliaria.ai.cobranza.detail.title')}
          </h1>
          <div className="flex items-center gap-2">
            {data && stageColors && (
              <span
                className={
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ' +
                  stageColors.bg +
                  ' ' +
                  stageColors.text +
                  ' ' +
                  stageColors.border +
                  ' border'
                }
              >
                {t('inmobiliaria.ai.cobranza.detail.header.stage')}: {data.currentStage}
              </span>
            )}
            {data && (
              <span
                className={
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ' +
                  daysBadgeClasses(data.daysInStage)
                }
              >
                {data.daysInStage} d
              </span>
            )}
            {data?.isPaused && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                {t('inmobiliaria.ai.cobranza.detail.header.paused')}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 mb-4 flex items-center justify-between">
          <p className="text-sm text-red-700 dark:text-red-400">
            {t('inmobiliaria.ai.cobranza.detail.error')}: {error}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-sm font-medium px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            {t('inmobiliaria.ai.cobranza.detail.errorRetry')}
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Main content */}
        <section className="flex-1 min-w-0">
          {/* Tab nav — md+ horizontal */}
          <nav
            role="tablist"
            aria-label="Debtor detail tabs"
            className="hidden md:flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-800 mb-4"
          >
            {TAB_KEYS.map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={activeTab === k}
                onClick={() => onTabChange(k)}
                data-testid={`tab-${k}`}
                className={
                  'px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ' +
                  (activeTab === k
                    ? 'border-violet-600 text-violet-700 dark:text-violet-300'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200')
                }
              >
                {t(`inmobiliaria.ai.cobranza.detail.tabs.${k}`)}
              </button>
            ))}
          </nav>

          {/* Tab switcher — sm bottom-drawer trigger */}
          <div className="md:hidden mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setTabSwitcherOpen(true)}
              data-testid="tab-switcher-button"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200"
            >
              <span>{t(`inmobiliaria.ai.cobranza.detail.tabs.${activeTab}`)}</span>
              <span className="text-xs text-neutral-400">▾</span>
            </button>
          </div>

          {/* Tab switcher drawer */}
          {tabSwitcherOpen && (
            <div
              className="md:hidden fixed inset-0 z-40 flex items-end"
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                aria-label={t('inmobiliaria.ai.cobranza.detail.tabs.closeSwitcher')}
                onClick={() => setTabSwitcherOpen(false)}
                className="absolute inset-0 bg-black/40"
              />
              <div className="relative w-full bg-white dark:bg-neutral-900 rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {t('inmobiliaria.ai.cobranza.detail.tabs.switcher')}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setTabSwitcherOpen(false)}
                    className="text-sm text-neutral-500"
                  >
                    {t('inmobiliaria.ai.cobranza.detail.tabs.closeSwitcher')}
                  </button>
                </div>
                <ul className="space-y-1">
                  {TAB_KEYS.map((k) => (
                    <li key={k}>
                      <button
                        type="button"
                        onClick={() => onTabChange(k)}
                        className={
                          'w-full text-left px-3 py-2 rounded-md text-sm font-medium ' +
                          (activeTab === k
                            ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300'
                            : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800')
                        }
                      >
                        {t(`inmobiliaria.ai.cobranza.detail.tabs.${k}`)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Lazy-mount per active tab (D-31-09): non-active tabs unmount,
              so their data hooks do not poll until activated. */}
          {activeTab === 'timeline' && <TimelineTab debtorId={debtorId} />}
          {activeTab === 'llamadas' && <LlamadasTab debtorId={debtorId} />}
          {activeTab === 'memos' && <MemosTab debtorId={debtorId} />}
          {activeTab === 'compromisos' && <CompromisosTab debtorId={debtorId} />}
          {activeTab === 'acciones' && (
            <AccionesTab
              debtorId={debtorId}
              debtorName={debtorName}
              currentStage={data?.currentStage ?? 'S0'}
              prefill={{
                nombre: debtorName,
              }}
              onIntervention={() => {
                void refetch()
              }}
            />
          )}
        </section>

        {/* Sidebar — md+ sticky right */}
        <aside className="hidden md:block md:w-80 md:shrink-0 md:sticky md:top-4 md:self-start">
          <DebtorSidebar
            data={data}
            isLoading={isLoading}
            onRevealRequest={onRevealRequest}
          />
        </aside>

        {/* Sticky bottom bar — sm */}
        {data?.sidebar?.nextAction && (
          <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                {t('inmobiliaria.ai.cobranza.detail.sidebar.nextAction')}
              </p>
              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                {data.sidebar.nextAction.channel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="ml-3 text-sm font-medium text-violet-600 dark:text-violet-400"
              data-testid="mobile-sidebar-open"
            >
              {t('inmobiliaria.ai.cobranza.detail.sidebar.openSidebar')} ›
            </button>
          </div>
        )}

        {/* Mobile sidebar drawer */}
        {mobileSidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 flex items-end"
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              aria-label={t('inmobiliaria.ai.cobranza.detail.sidebar.closeSidebar')}
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute inset-0 bg-black/40"
            />
            <div className="relative w-full bg-white dark:bg-neutral-900 rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                  {t('inmobiliaria.ai.cobranza.detail.sidebar.title')}
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="text-sm text-neutral-500"
                >
                  {t('inmobiliaria.ai.cobranza.detail.sidebar.closeSidebar')}
                </button>
              </div>
              <DebtorSidebar
                data={data}
                isLoading={isLoading}
                onRevealRequest={onRevealRequest}
              />
            </div>
          </div>
        )}
      </div>

      {/* Shared PII reveal modal — single instance lifted here */}
      <PIIRevealModal
        open={revealModal !== null}
        field={revealModal?.field ?? null}
        debtorName={debtorName}
        onClose={() => setRevealModal(null)}
      />
    </main>
  )
}
