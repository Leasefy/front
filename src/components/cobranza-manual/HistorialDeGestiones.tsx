'use client'

/**
 * El historial de cobro de UNA persona: lo del equipo y lo del agente (Laura),
 * juntos y distinguidos (COBRANZA-MANUAL, 04-10-2026). Nico: «Historial de
 * gestiones visible en los tres lugares (las del agente Laura y las manuales
 * juntas, distinguidas)».
 *
 * Las palabras vienen del back (`tipoTexto`, `resultadoTexto`): ningún código
 * del micro llega a la persona.
 */
import * as React from 'react'
import { Robot, UserCircle } from '@phosphor-icons/react'
import { Stagger, StaggerItem } from '@leasefy/cadence'

import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n'
import { fechaLarga, diaEnColombia } from '@/lib/fechas/fecha-de-la-casa'
import {
  NOMBRE_DEL_ESTADO_DE_LA_PROMESA,
  type EntradaDelHistorial,
  type PromesaDelHistorial,
} from '@/lib/api/cobranza-manual.types'

/** «4 de octubre de 2026, 10:30 a. m.» en la hora de Colombia. */
export function cuandoParaLaPersona(iso: string): string {
  const dia = diaEnColombia(iso)
  const instante = new Date(iso)
  if (!dia || Number.isNaN(instante.getTime())) return iso
  const hora = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: 'numeric',
    minute: '2-digit',
  }).format(instante)
  return `${fechaLarga(dia)}, ${hora}`
}

const VARIANTE_DE_LA_PROMESA: Record<PromesaDelHistorial['estado'], 'secondary' | 'success' | 'destructive' | 'outline'> = {
  PENDIENTE: 'secondary',
  CUMPLIDA: 'success',
  INCUMPLIDA: 'destructive',
  // SO-17: la dejó una promesa nueva de la misma persona.
  REEMPLAZADA: 'outline',
}

function LaPromesa({ promesa }: { promesa: PromesaDelHistorial }) {
  const { formatCurrency } = useI18n()
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm" data-testid="historial-promesa">
      <Badge variant={VARIANTE_DE_LA_PROMESA[promesa.estado]}>
        Promesa {NOMBRE_DEL_ESTADO_DE_LA_PROMESA[promesa.estado].toLowerCase()}
      </Badge>
      <span className="text-fg">
        <span className="font-mono tabular-nums">{formatCurrency(promesa.montoCop)}</span> para el{' '}
        {fechaLarga(promesa.fecha)}
      </span>
      {promesa.estado === 'INCUMPLIDA' && promesa.abonadoCop !== null ? (
        <span className="text-fg-muted">
          {promesa.abonadoCop > 0
            ? `· abonó ${formatCurrency(promesa.abonadoCop)}, faltan ${formatCurrency(promesa.faltaCop ?? 0)}`
            : '· no entró ningún pago'}
        </span>
      ) : null}
      {promesa.estado === 'PENDIENTE' && promesa.abonadoCop && promesa.abonadoCop > 0 ? (
        <span className="text-fg-muted">· van {formatCurrency(promesa.abonadoCop)}</span>
      ) : null}
    </div>
  )
}

export function HistorialDeGestiones({
  entradas,
  vacio = 'Todavía no hay gestiones con esta persona.',
}: {
  entradas: readonly EntradaDelHistorial[]
  vacio?: string
}) {
  if (entradas.length === 0) {
    return (
      <p className="text-sm text-fg-muted" data-testid="historial-vacio">
        {vacio}
      </p>
    )
  }
  return (
    <Stagger as="ol" className="space-y-3" data-testid="historial-de-gestiones">
      {entradas.map((e) => {
        const delAgente = e.origen === 'agente'
        const Icono = delAgente ? Robot : UserCircle
        return (
          <StaggerItem
            key={e.id}
            as="li"
            className="rounded-md border border-border bg-surface p-3"
            data-testid="historial-entrada"
            data-origen={e.origen}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Icono className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
              <Badge variant={delAgente ? 'outline' : 'secondary'}>
                {delAgente ? 'Agente' : 'Equipo'}
              </Badge>
              <span className="text-sm font-medium text-fg">{e.tipoTexto}</span>
              {e.resultadoTexto ? <span className="text-sm text-fg-muted">· {e.resultadoTexto}</span> : null}
            </div>
            {e.comentario ? (
              <p className="mt-1.5 whitespace-pre-line text-sm text-fg">{e.comentario}</p>
            ) : null}
            {e.promesa ? <LaPromesa promesa={e.promesa} /> : null}
            <p className="mt-1.5 text-caption text-fg-subtle">
              {e.quien} · {cuandoParaLaPersona(e.cuando)}
            </p>
          </StaggerItem>
        )
      })}
    </Stagger>
  )
}

void React
