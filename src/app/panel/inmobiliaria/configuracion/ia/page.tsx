'use client'

/**
 * /panel/inmobiliaria/configuracion/ia — AI chat "self-learning lessons"
 * certification fence (F3).
 *
 * The assistant proposes heuristics it has learned from usage (routing /
 * approval). A human with OPERATOR+ role certifies them through a fail-closed
 * fence before they influence the chat. This page hosts that review.
 *
 * Data + role + fence handling live in ChatLessonsPanel / useChatLessons; this
 * file is just the route shell (breadcrumb + header + panel).
 */

import { Brain } from '@phosphor-icons/react'

import { MigaDePan } from '@/components/inmobiliaria/ai/MigaDePan'
import { ChatLessonsPanel } from '@/components/inmobiliaria/ai/lessons/ChatLessonsPanel'

export default function ChatLessonsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <MigaDePan
        backHref="/panel/inmobiliaria/configuracion"
        icon={Brain}
        crumbs={[
          { label: 'Configuración', href: '/panel/inmobiliaria/configuracion' },
          { label: 'Automatización IA' },
        ]}
      />

      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
            <Brain weight="duotone" className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
              Aprendizaje del asistente
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400">
              Revisa y certifica lo que el asistente aprendió. Solo las lecciones
              certificadas pueden influir en el chat.
            </p>
          </div>
        </div>
      </header>

      <ChatLessonsPanel />
    </div>
  )
}
