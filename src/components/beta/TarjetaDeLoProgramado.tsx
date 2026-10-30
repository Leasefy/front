'use client';

/**
 * La tarjeta de LO PROGRAMADO en el chat de Ori (29-10-2026): «¿qué tengo
 * programado?». Cada orden con su cuándo, la próxima vez, el último disparo y
 * lo que espera el clic. Sus botones son MENSAJES del hilo (el micro manda la
 * frase): «Pausar», «Reanudar», «Cancelar» y «Hacer ahora» (que pide la orden
 * ya, con su tarjeta y su clic). Nada navega (DESIGN.md §13.6). Ningún botón en
 * voltaje: la acción de la respuesta es del chat, no de esta lista.
 *
 * Una vez que la persona escribió algo después, la tarjeta ya no es la de hoy:
 * los botones se apagan y se dice cómo verla al día.
 */

import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Collapse, StatusBadge, type SemanticTone } from '@leasefy/cadence';
import { CalendarCheck, HourglassMedium, PauseCircle, StopCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useAparecer } from '@/components/cobros/extracto-bancario/cuentas-del-extracto';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { useI18n } from '@/lib/i18n';
import { formatNumber } from '@/lib/format';
import { fechaDelDisparo, type EstadoDeLaProgramada, type ProgramadaEnLaTarjeta, type TarjetaDeLoProgramado as Tarjeta } from '@/lib/chat/programado-del-chat';
import type { ChatMessage } from '@/lib/types/beta-chat';
import { CajaDelChat } from './CajaDelChat';

/** Cuántas se ven de una; las demás, con «Ver todos» en el pie. */
const VISIBLES = 5;

const TONO: Record<EstadoDeLaProgramada, SemanticTone> = { activa: 'success', pausada: 'warning', terminada: 'neutral' };
const ICONO: Record<EstadoDeLaProgramada, ReactNode> = {
  activa: <CalendarCheck weight="duotone" className="size-4 shrink-0 text-fg-muted" aria-hidden />,
  pausada: <PauseCircle weight="duotone" className="size-4 shrink-0 text-fg-muted" aria-hidden />,
  terminada: <StopCircle weight="duotone" className="size-4 shrink-0 text-fg-muted" aria-hidden />,
};

export function TarjetaDeLoProgramado({ tarjeta, posteriores }: { tarjeta: Tarjeta; posteriores: ChatMessage[] }) {
  const { t } = useI18n();
  const [verTodas, setVerTodas] = useState(false);
  const vieja = posteriores.some((m) => m.role === 'user');
  const primeras = tarjeta.programadas.slice(0, VISIBLES);
  const resto = tarjeta.programadas.slice(VISIBLES);

  const pie =
    resto.length > 0 ? (
      <Button size="sm" variant="ghost" hideArrow aria-expanded={verTodas} onClick={() => setVerTodas((v) => !v)}>
        {verTodas ? t('beta.enElChat.lote.verMenos') : t('beta.enElChat.lote.verTodos', { n: formatNumber(tarjeta.programadas.length) })}
      </Button>
    ) : undefined;

  return (
    <CajaDelChat
      role="region"
      aria-label={t('beta.enElChat.programado.region')}
      data-testid="tarjeta-de-lo-programado"
      titulo={t('beta.enElChat.programado.titulo')}
      conteo={<span className="font-mono text-label uppercase text-fg-muted">{formatNumber(tarjeta.programadas.length)}</span>}
      pie={pie}
    >
      <p className="font-body text-body-sm text-fg-muted">
        {vieja ? t('beta.enElChat.programado.vieja') : tarjeta.hayListas ? t('beta.enElChat.programado.hayListas') : t('beta.enElChat.programado.nada')}
      </p>
      <ul aria-label={t('beta.enElChat.programado.region')} className="mt-2 divide-y divide-border-faint">
        {primeras.map((p) => (
          <Fila key={p.id} p={p} vieja={vieja} />
        ))}
      </ul>
      {resto.length > 0 && (
        <Collapse open={verTodas}>
          <ul className="divide-y divide-border-faint border-t border-border-faint">
            {resto.map((p) => (
              <Fila key={p.id} p={p} vieja={vieja} />
            ))}
          </ul>
        </Collapse>
      )}
    </CajaDelChat>
  );
}

function Fila({ p, vieja }: { p: ProgramadaEnLaTarjeta; vieja: boolean }) {
  const { t } = useI18n();
  const { sendMessage, isThinking, isStreaming, isAgentsRunning } = useBetaChatContext();
  const ocupado = isThinking || isStreaming || isAgentsRunning;
  const aparecer = useAparecer();
  const ultimo = p.ultimoDisparo ? fechaDelDisparo(p.ultimoDisparo.en) : null;

  return (
    <motion.li {...aparecer} data-testid="programada" data-estado={p.estado} className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="break-words font-body text-body text-fg">{p.que}</p>
          <p className="mt-0.5 break-words font-body text-body-sm text-fg-muted">{p.cuando}</p>
        </div>
        {/* El estado nunca sólo con color: ícono + palabra. */}
        <span className="inline-flex shrink-0 items-center gap-1.5">
          {ICONO[p.estado]}
          <StatusBadge tone={TONO[p.estado]}>{t(`beta.enElChat.programado.${p.estado}`)}</StatusBadge>
        </span>
      </div>

      <dl className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="font-mono text-label uppercase text-fg-subtle">{t('beta.enElChat.programado.proxima')}</dt>
          <dd className="font-body text-body-sm text-fg" data-testid="proxima">
            {p.proximaDicha ? p.proximaDicha.charAt(0).toUpperCase() + p.proximaDicha.slice(1) : '—'}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="font-mono text-label uppercase text-fg-subtle">{t('beta.enElChat.programado.ultimo')}</dt>
          <dd className="break-words font-body text-body-sm text-fg" data-testid="ultimo-disparo">
            {p.ultimoDisparo ? `${ultimo ? `${ultimo} · ` : ''}${p.ultimoDisparo.detalle}` : t('beta.enElChat.programado.nunca')}
          </dd>
        </div>
      </dl>

      {p.esperaClic && (
        <p className="mt-2 flex items-start gap-1.5 font-body text-body-sm text-fg" data-testid="espera-clic">
          <HourglassMedium weight="duotone" className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
          <span className="min-w-0 break-words">
            {t('beta.enElChat.programado.espera')}: {p.esperaClic.texto}
          </span>
        </p>
      )}

      {p.botones.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {p.botones.map((b) => (
            <Button
              key={b.tipo}
              size="sm"
              variant="outline"
              hideArrow
              disabled={ocupado || vieja}
              data-testid={`programado-${b.tipo}`}
              onClick={() => {
                if (!ocupado && !vieja) sendMessage(b.mensaje);
              }}
            >
              {b.etiqueta}
            </Button>
          ))}
        </div>
      )}
    </motion.li>
  );
}
