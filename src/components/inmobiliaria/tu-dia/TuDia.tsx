'use client';

/**
 * «Tu día» — a quién llamar hoy y con qué decirle (investigación de agentes, 27-10-2026). Se arma con el embudo de
 * Arrendamientos y la agenda (`lib/tu-dia/tu-dia.ts`); la preparación de cada llamada sale de la etapa, sin IA de pago
 * (no gasta la bolsa de preguntas). Es parte de Arrendamientos: también la tiene la cuenta gratis.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { CaretDown, ChatCircleText, Phone } from '@phosphor-icons/react';
import { Cifra, FranjaDeCifras, Ilustracion, StatusBadge, enterTransition, usePrefersReducedMotion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { VacioChico } from '@/components/estado/VacioChico';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { agendaApi } from '@/lib/api/agenda.service';
import type { AgendaListResponse, EventoAgenda } from '@/lib/api/agenda.types';
import { useAuth } from '@/lib/auth/use-auth';
import { usePipelineItems } from '@/lib/hooks/useInmobiliaria';
import { armarTuDia, celularParaMarcar, diaEnColombia, prepararLaLlamada, type Llamada } from '@/lib/tu-dia/tu-dia';
import { cn } from '@/lib/utils';

const MOTIVO: Record<Llamada['motivo'], { texto: string; tono: 'critical' | 'warning' | 'neutral' }> = {
  sin_respuesta: { texto: 'Sin responder', tono: 'critical' },
  seguimiento: { texto: 'Seguimiento', tono: 'warning' },
  quieto: { texto: 'Quieto', tono: 'neutral' },
};

function saludoDeLaHora(ahora = new Date()): string {
  const hora = Number(new Intl.DateTimeFormat('es-CO', { hour: 'numeric', hour12: false, timeZone: 'America/Bogota' }).format(ahora));
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const horaDe = (iso: string) => new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' }).format(new Date(iso));
const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

export function TuDia() {
  const { user } = useAuth();
  const reducido = usePrefersReducedMotion();
  const { pipelineItems, isLoading, error, refetch } = usePipelineItems();
  const hoy = diaEnColombia(new Date());
  const agenda = useAgendaDeHoy(hoy);
  const dia = useMemo(() => armarTuDia(pipelineItems, agenda.data?.eventos ?? []), [pipelineItems, agenda.data]);
  const quien = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  const fecha = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' }).format(new Date());

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="tu-dia">
      <EncabezadoDePantalla
        seccion="Arrendamientos"
        titulo="Tu día"
        descripcion={`${saludoDeLaHora()}${user?.firstName ? `, ${user.firstName}` : ''}. Hoy es ${fecha}: esto es lo que mueve tus arriendos.`}
      />

      <FranjaDeCifras columnas={4}>
        <Cifra etiqueta="Visitas hoy" valor={dia.cuantas.visitas} tono={dia.cuantas.visitas > 0 ? 'voltaje' : undefined} />
        <Cifra etiqueta="Sin responder" valor={dia.cuantas.sinRespuesta} tono={dia.cuantas.sinRespuesta > 0 ? 'peligro' : undefined} />
        <Cifra etiqueta="Seguimientos" valor={dia.cuantas.seguimientos} tono={dia.cuantas.seguimientos > 0 ? 'aviso' : undefined} />
        <Cifra etiqueta="Procesos quietos" valor={dia.cuantas.quietos} />
      </FranjaDeCifras>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section className="space-y-3" aria-labelledby="tu-dia-llamar">
          <h2 id="tu-dia-llamar" className="text-h4 text-fg">
            A quién llamar
          </h2>
          {error ? (
            <FalloDeCarga error={error} onReintentar={refetch} queEs="tus interesados" />
          ) : isLoading ? (
            <div className="space-y-2" aria-busy="true">
              {[0, 1, 2].map((k) => (
                <div key={k} className="h-24 animate-pulse rounded-2xl bg-surface-muted" />
              ))}
            </div>
          ) : dia.llamadas.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-10 text-center" data-testid="tu-dia-al-dia">
              <Ilustracion nombre="pago_confirmado" tamano={104} tono="auto" alt="" />
              <p className="mt-4 text-body font-medium text-fg">Estás al día: nadie te está esperando</p>
              <p className="mt-1 max-w-sm text-body-sm text-fg-muted">Cuando alguien te escriba por un inmueble o se quede quieto un proceso, aparece aquí con lo que le vas a decir.</p>
            </div>
          ) : (
            <ol className="space-y-2.5">
              {dia.llamadas.map((l, i) => (
                <motion.li
                  key={l.item.id}
                  initial={reducido ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...enterTransition(reducido), delay: reducido ? 0 : Math.min(i, 8) * 0.04 }}
                >
                  <TarjetaDeLlamada llamada={l} quienLlama={quien} />
                </motion.li>
              ))}
            </ol>
          )}
        </section>

        <section className="space-y-3" aria-labelledby="tu-dia-visitas">
          <h2 id="tu-dia-visitas" className="text-h4 text-fg">
            Visitas de hoy
          </h2>
          <div className="rounded-2xl border border-border bg-surface p-2">
            {agenda.error ? (
              <FalloDeCarga error={agenda.error} onReintentar={agenda.refetch} queEs="tu agenda" />
            ) : dia.visitas.length === 0 ? (
              <VacioChico className="px-3 py-4" titulo="Hoy no tienes visitas" detalle="Agéndalas desde cada interesado en Arrendamientos." ilustracion="calendario_pago" />
            ) : (
              <ul className="divide-y divide-border">
                {dia.visitas.map((v) => (
                  <FilaDeVisita key={v.id} visita={v} />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/** Las visitas de hoy (sólo las mías), una vez al montar y con «Reintentar». */
function useAgendaDeHoy(hoy: string) {
  const [data, setData] = useState<AgendaListResponse | null>(null);
  const [error, setError] = useState<unknown>(null);
  const leer = useCallback(async () => {
    setError(null);
    try {
      setData(await agendaApi.getAgenda({ desde: hoy, hasta: hoy, pageSize: 50, mias: true }));
    } catch (e) {
      setError(e);
    }
  }, [hoy]);
  useEffect(() => {
    void leer();
  }, [leer]);
  return { data, error, refetch: leer };
}

function TarjetaDeLlamada({ llamada, quienLlama }: { llamada: Llamada; quienLlama: string }) {
  const [abierta, setAbierta] = useState(false);
  const reducido = usePrefersReducedMotion();
  const { item } = llamada;
  const prep = prepararLaLlamada(item, quienLlama);
  const cel = celularParaMarcar(item.candidatePhone);
  const motivo = MOTIVO[llamada.motivo];
  return (
    <article className="rounded-2xl border border-border bg-surface p-4 transition-shadow duration-base hover:shadow-sm" data-testid={`llamada-${item.id}`} data-motivo={llamada.motivo}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-medium text-primary">
          {(item.candidateName || '?').trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-fg">{item.candidateName || 'Sin nombre'}</p>
            <StatusBadge tone={motivo.tono} pulse={llamada.motivo === 'sin_respuesta'}>
              {motivo.texto}
            </StatusBadge>
          </div>
          <p className="mt-0.5 text-body-sm text-fg-muted">{llamada.porQue}</p>
          <p className="mt-1 truncate text-caption text-fg-subtle">
            {item.propertyTitle || item.propertyAddress}
            {item.monthlyRent ? ` · ${pesos(item.monthlyRent)} al mes` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {cel ? (
            <>
              <Button asChild size="sm" hideArrow>
                <a href={`tel:+${cel}`} data-testid={`llamar-${item.id}`}>
                  <Phone size={15} weight="bold" aria-hidden="true" className="mr-1.5" />
                  Llamar
                </a>
              </Button>
              <Button asChild size="sm" variant="secondary" hideArrow>
                <a href={`https://wa.me/${cel}?text=${encodeURIComponent(prep.whatsapp)}`} target="_blank" rel="noreferrer noopener">
                  <ChatCircleText size={15} weight="bold" aria-hidden="true" className="mr-1.5" />
                  WhatsApp
                </a>
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setAbierta((a) => !a)}
        aria-expanded={abierta}
        className="mt-3 inline-flex items-center gap-1.5 text-body-sm font-medium text-primary hover:underline"
        data-testid={`preparar-${item.id}`}
      >
        {abierta ? 'Ocultar la preparación' : 'Preparar la llamada'}
        <CaretDown size={13} weight="bold" aria-hidden="true" className={cn('transition-transform duration-fast', abierta && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            initial={reducido ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reducido ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={enterTransition(reducido)}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 rounded-xl bg-surface-muted/70 p-4 text-body-sm" data-testid={`preparacion-${item.id}`}>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">Para empezar</p>
                <p className="mt-1 text-fg">«{prep.saludo}»</p>
              </div>
              {prep.preguntas.length > 0 && (
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">Pregúntale</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-fg">
                    {prep.preguntas.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">Para cerrar la llamada</p>
                <p className="mt-1 font-medium text-fg">{prep.siguientePaso}</p>
              </div>
              <Link href="/panel/inmobiliaria/pipeline" className="inline-block text-body-sm font-medium text-primary hover:underline">
                Ver en Arrendamientos
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function FilaDeVisita({ visita }: { visita: EventoAgenda }) {
  const cel = celularParaMarcar(visita.contactoTelefono);
  return (
    <li className="flex items-center gap-3 px-3 py-3" data-testid={`visita-${visita.id}`}>
      <span className="w-16 shrink-0 font-mono text-body-sm tabular-nums text-fg">{visita.hora ?? horaDe(visita.fecha)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium text-fg">{visita.titulo}</span>
        <span className="block truncate text-caption text-fg-subtle">
          {visita.modalidad === 'VIRTUAL' ? 'Virtual' : 'Presencial'}
          {visita.vinculoLabel ? ` · ${visita.vinculoLabel}` : ''}
        </span>
      </span>
      {cel ? (
        <a href={`tel:+${cel}`} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary-soft" aria-label={`Llamar por la visita de ${visita.hora ?? horaDe(visita.fecha)}`}>
          <Phone size={16} weight="bold" aria-hidden="true" />
        </a>
      ) : null}
    </li>
  );
}
