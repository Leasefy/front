'use client';

/**
 * La Calificación Leasefy en una tarjeta (18-10-2026): la letra, el puntaje,
 * qué quiere decir (¿se le arrienda fácil, con condiciones o no?), hasta qué
 * canon, por qué, y el desglose de lo que pesó. La usan «Mi calificación» (la
 * persona), la búsqueda de la inmobiliaria y el cajón del candidato.
 *
 * Una sola escala en toda la plataforma: A ≥ 80 · B ≥ 60 · C ≥ 40 · D < 40.
 */

import { CheckCircle, CircleDashed, Info, ShieldWarning, Warning, type Icon } from '@phosphor-icons/react';
import {
  AnimatedNumber,
  Presence,
  Stagger,
  StaggerItem,
  motionDuration,
  motionEase,
  motionStagger,
  usePrefersReducedMotion,
} from '@leasefy/cadence';
import { motion } from 'framer-motion';

import { useI18n } from '@/lib/i18n';
import { useLocaleDelPanel, useTr } from '@/lib/i18n/use-tr';
import { cn } from '@/lib/utils';
import type {
  Bloque,
  Calificacion,
  ComponenteDeLosDocumentos,
  ComponenteDelHistorial,
  Letra,
  Veredicto,
} from '@/lib/api/calificacion-leasefy.service';

const TONO_DE_LA_LETRA: Record<Letra, string> = {
  A: 'bg-success-soft text-success',
  B: 'bg-primary-soft text-primary',
  C: 'bg-warning-soft text-warning',
  D: 'bg-danger-soft text-danger',
};

const VEREDICTO: Record<Veredicto, { texto: string; icono: Icon; tono: string }> = {
  FACIL: { texto: 'Se le arrienda fácil', icono: CheckCircle, tono: 'text-success' },
  CON_CONDICIONES: { texto: 'Se le arrienda con condiciones', icono: Info, tono: 'text-primary' },
  NO: { texto: 'No se recomienda arrendarle', icono: Warning, tono: 'text-danger' },
  REVISAR: { texto: 'Que una persona revise los documentos antes de decidir', icono: ShieldWarning, tono: 'text-warning' },
};

/**
 * El color de una barra o del anillo: el de la letra que le daría ese puntaje
 * (la misma escala de la letra grande: A ≥ 80 · B ≥ 60 · C ≥ 40 · D < 40).
 */
function letraDelPuntaje(v: number): Letra {
  if (v >= 80) return 'A';
  if (v >= 60) return 'B';
  if (v >= 40) return 'C';
  return 'D';
}

const RELLENO_DE_LA_LETRA: Record<Letra, string> = {
  A: 'bg-success',
  B: 'bg-primary',
  C: 'bg-warning',
  D: 'bg-danger',
};

const TRAZO_DE_LA_LETRA: Record<Letra, string> = {
  A: 'stroke-success',
  B: 'stroke-primary',
  C: 'stroke-warning',
  D: 'stroke-danger',
};

/** Dónde cambia de letra la barra: las marcas del riel. */
const CORTES_DE_LA_ESCALA = [40, 60, 80] as const;

/** Las letras de la escala, en el centro de su tramo. */
const TRAMOS_DE_LA_ESCALA: ReadonlyArray<{ letra: Letra; centro: number }> = [
  { letra: 'D', centro: 20 },
  { letra: 'C', centro: 50 },
  { letra: 'B', centro: 70 },
  { letra: 'A', centro: 90 },
];

/** Qué mide cada componente, en una línea (lo que calcula el back, `calificacion-leasefy/`). */
const QUE_MIDE: Record<ComponenteDelHistorial | ComponenteDeLosDocumentos, string> = {
  puntualidad: 'Cuotas pagadas a tiempo en Leasefy.',
  peorAtraso: 'El atraso más largo de los últimos 24 meses.',
  comoTermino: 'Si los entregó sin deuda y cómo los evaluó la inmobiliaria.',
  acuerdos: 'Los acuerdos de pago y las promesas que cumplió.',
  permanencia: 'Su arriendo más largo, frente a 24 meses.',
  solvencia: 'Su ingreso verificado frente al canon.',
  ingresoEstable: 'Si la plata le llega del mismo pagador cada mes.',
  capacidadDePago: 'Lo que le queda libre después de sus deudas y del canon.',
};

/** Lo mismo, de tú, para «Mi calificación» (la persona lee la suya). */
const QUE_MIDE_DE_TU: Record<ComponenteDelHistorial | ComponenteDeLosDocumentos, string> = {
  puntualidad: 'Cuotas pagadas a tiempo en Leasefy.',
  peorAtraso: 'Tu atraso más largo de los últimos 24 meses.',
  comoTermino: 'Si los entregaste sin deuda y cómo los evaluó la inmobiliaria.',
  acuerdos: 'Los acuerdos de pago y las promesas que cumpliste.',
  permanencia: 'Tu arriendo más largo, frente a 24 meses.',
  solvencia: 'Tu ingreso verificado frente al canon.',
  ingresoEstable: 'Si la plata te llega del mismo pagador cada mes.',
  capacidadDePago: 'Lo que te queda libre después de tus deudas y del canon.',
};

/** Qué es cada bloque, en una línea (de tú en «Mi calificación»). */
const QUE_ES_EL_BLOQUE = {
  historial: { el: 'Cómo le ha ido arrendando con Leasefy.', tu: 'Cómo te ha ido arrendando con Leasefy.' },
  documentos: { el: 'Lo que muestran sus documentos de ingresos.', tu: 'Lo que muestran tus documentos de ingresos.' },
} as const;

const NOMBRE_DEL_COMPONENTE: Record<ComponenteDelHistorial | ComponenteDeLosDocumentos, string> = {
  puntualidad: 'Puntualidad',
  peorAtraso: 'Peor atraso (24 meses)',
  comoTermino: 'Cómo terminaron sus contratos',
  acuerdos: 'Acuerdos y promesas',
  permanencia: 'Permanencia',
  solvencia: 'Solvencia (ingreso frente al canon)',
  ingresoEstable: 'Ingreso estable',
  capacidadDePago: 'Capacidad de pago',
};

/**
 * La persona lee SU calificación («Mi calificación»): el back escribe las
 * frases para la inmobiliaria («Tiene arriendo vencido…», «sus documentos»);
 * a la persona se le dicen de tú (QA del 19-10-2026). Se cambia la frase
 * entera, nunca palabra por palabra, y cada una tiene su inglés.
 */
const PARA_LA_PERSONA: Record<string, string> = {
  'Tiene arriendo vencido sin pagar hace más de 30 días.': 'Tienes arriendo vencido sin pagar hace más de 30 días.',
  'Quedó debiendo arriendo de un contrato que ya terminó.': 'Quedaste debiendo arriendo de un contrato que ya terminó.',
  'Tiene un cobro jurídico abierto por un arriendo.': 'Tienes un cobro jurídico abierto por un arriendo.',
  'Una inmobiliaria dio por perdida una deuda suya de arriendo en los últimos 4 años.':
    'Una inmobiliaria dio por perdida una deuda tuya de arriendo en los últimos 4 años.',
  'El nombre o el número de la cédula no coincide con el de los otros documentos: que lo revise una persona.':
    'El nombre o el número de tu cédula no coincide con el de tus otros documentos: una persona lo revisará antes de decidir.',
  'Un documento muestra señales de haber sido editado: que lo revise una persona antes de decidir.':
    'Uno de tus documentos muestra señales de haber sido editado: una persona lo revisará antes de decidir.',
  'Sólo con su historial en Leasefy: no hay un estudio de documentos de los últimos 6 meses, así que no se sabe hasta qué canon.':
    'Sólo con tu historial en Leasefy: no hay un estudio de tus documentos de los últimos 6 meses, así que no se sabe hasta qué canon.',
  'Sin historial en Leasefy todavía: la calificación sale de sus documentos.':
    'Sin historial en Leasefy todavía: tu calificación sale de tus documentos.',
  'Cómo terminaron sus contratos': 'Cómo terminaron tus contratos',
  'Con menos de 6 meses de historial y sin estudio de documentos, la calificación llega hasta B.':
    'Con menos de 6 meses de historial y sin estudio de tus documentos, tu calificación llega hasta B.',
};

/** La frase como se le dice a la persona (de tú); si no hay versión suya, la del back. */
export function paraLaPersona(frase: string): string {
  return PARA_LA_PERSONA[frase] ?? frase;
}

/**
 * Las frases de `explicacion` vienen del back en español. Las fijas se buscan
 * tal cual en `frases-en.ts`; la única con números («18 meses de historial en
 * Leasefy: el historial pesa 55 % y los documentos 45 %.») se reconoce y se
 * vuelve a armar con sus cifras para que también salga en inglés.
 */
const FRASE_DE_LOS_MESES = /^(\d+) (mes|meses) de historial en Leasefy: el historial pesa (\d+) % y los documentos (\d+) %\.$/;

export function fraseDelBack(tr: ReturnType<typeof useTr>, frase: string, deTu = false): string {
  const m = FRASE_DE_LOS_MESES.exec(frase);
  if (!m) return tr(deTu ? paraLaPersona(frase) : frase);
  return m[2] === 'mes'
    ? tr('1 mes de historial en Leasefy: el historial pesa {h} % y los documentos {d} %.', { h: m[3], d: m[4] })
    : tr('{n} meses de historial en Leasefy: el historial pesa {h} % y los documentos {d} %.', { n: m[1], h: m[3], d: m[4] });
}

/**
 * `etiqueta`: lo que lee un lector de pantalla. Sin ella, la del panel en su
 * idioma; la página pública (sin el idioma del panel) pasa la suya.
 */
export function LetraDeLaCalificacion({
  letra,
  grande,
  etiqueta,
}: {
  letra: Letra | null;
  grande?: boolean;
  etiqueta?: string;
}) {
  const tr = useTr();
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-mono font-semibold tabular-nums',
        grande ? 'h-16 w-16 text-3xl' : 'h-8 w-8 text-sm',
        letra ? TONO_DE_LA_LETRA[letra] : 'bg-surface-muted text-fg-subtle',
      )}
      aria-label={etiqueta ?? (letra ? tr('Letra {l}', { l: letra }) : tr('Sin letra'))}
    >
      {letra ?? '—'}
    </span>
  );
}

/** El anillo con el puntaje del bloque: se dibuja y la cifra cuenta al aparecer. */
function AnilloDelBloque({ puntaje, etiqueta }: { puntaje: number | null; etiqueta: string }) {
  const quieto = usePrefersReducedMotion();
  const r = 22;
  const largo = puntaje === null ? 0 : Math.max(0, Math.min(100, puntaje)) / 100;
  return (
    <div className="relative h-14 w-14 shrink-0" role="img" aria-label={etiqueta}>
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-surface-muted dark:stroke-border" />
        {puntaje !== null && (
          <motion.circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            className={TRAZO_DE_LA_LETRA[letraDelPuntaje(puntaje)]}
            initial={{ pathLength: quieto ? largo : 0 }}
            animate={{ pathLength: largo }}
            transition={{ duration: quieto ? 0 : motionDuration.reveal * 1.6, ease: motionEase.enter }}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-base font-semibold tabular-nums text-fg">
        {puntaje === null ? '—' : <AnimatedNumber value={Math.round(puntaje)} from={0} duration={motionDuration.reveal * 1.6} />}
      </span>
    </div>
  );
}

/**
 * La barra de un componente: el riel partido en los tramos de la escala
 * (D · C · B · A) y el relleno del color de su letra, que entra deslizándose
 * (sólo `transform`: la barra mide lo mismo de principio a fin).
 */
function BarraDelComponente({ valor, indice, etiqueta }: { valor: number; indice: number; etiqueta: string }) {
  const quieto = usePrefersReducedMotion();
  const v = Math.max(0, Math.min(100, valor));
  const hasta = `${-(100 - Math.max(2, v))}%`;
  return (
    <div
      className="relative mt-2 h-2 overflow-hidden rounded-full bg-surface-muted dark:bg-border"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={etiqueta}
    >
      <motion.div
        className={cn('absolute inset-0 rounded-full', RELLENO_DE_LA_LETRA[letraDelPuntaje(v)])}
        initial={{ x: quieto ? hasta : '-100%' }}
        animate={{ x: hasta }}
        transition={{
          duration: quieto ? 0 : motionDuration.reveal * 1.6,
          ease: motionEase.enter,
          delay: quieto ? 0 : 0.12 + indice * motionStagger.step * 2,
        }}
      />
      {CORTES_DE_LA_ESCALA.map((corte) => (
        <span
          key={corte}
          aria-hidden
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-surface"
          style={{ left: `${corte}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Un bloque del desglose (QA del buró, 19-10-2026, Nico: «ese historial de
 * Leasefy necesita un glow up… es nuestro»): el puntaje del bloque en un
 * anillo, qué mide cada componente y cuánto pesó de verdad (ya repartido), y
 * lo que todavía no tiene dato al final, en una línea (no cuenta como cero:
 * su peso se reparte entre lo que sí se midió).
 */
function BloqueDelDesglose<K extends string>({
  titulo,
  queEs,
  peso,
  bloque,
  deTu,
}: {
  titulo: string;
  queEs: string;
  peso: number | null;
  bloque: Bloque<K> | null;
  /** «Mi calificación»: los nombres y lo que mide cada uno, de tú. */
  deTu?: boolean;
}) {
  const tr = useTr();
  const locale = useLocaleDelPanel();
  if (!bloque) return null;
  const nombre = (k: string) => {
    const n = NOMBRE_DEL_COMPONENTE[k as keyof typeof NOMBRE_DEL_COMPONENTE] ?? k;
    return tr(deTu ? paraLaPersona(n) : n);
  };
  const queMide = deTu ? QUE_MIDE_DE_TU : QUE_MIDE;
  const medidos = bloque.desglose.filter((r) => r.valor !== null);
  const sinDato = bloque.desglose.filter((r) => r.valor === null);
  const lista = new Intl.ListFormat(locale === 'en' ? 'en' : 'es', { type: 'conjunction' }).format(
    sinDato.map((r) => nombre(r.componente)),
  );
  return (
    <section className="rounded-md border border-border bg-surface p-5 dark:border-border-strong" data-testid="bloque-del-desglose">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <AnilloDelBloque
          puntaje={bloque.puntaje}
          etiqueta={bloque.puntaje === null ? tr('Sin puntaje todavía') : tr('{p} de 100', { p: Math.round(bloque.puntaje) })}
        />
        <div className="min-w-0 flex-1">
          <h4 className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">{tr(titulo)}</h4>
          <p className="mt-1 text-sm text-fg-muted">{tr(queEs)}</p>
        </div>
        {peso !== null && (
          <span className="rounded-full border border-border px-3 py-1 font-mono text-caption tabular-nums text-fg-muted dark:border-border-strong">
            {tr('Pesa {p} % de la calificación', { p: peso })}
          </span>
        )}
      </header>

      {medidos.length > 0 && (
        <>
          <Stagger as="ul" className="mt-5 space-y-4">
            {medidos.map((r, i) => (
              <StaggerItem key={r.componente} as="li">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-fg">{nombre(r.componente)}</span>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-fg">
                    <AnimatedNumber value={Math.round(r.valor as number)} from={0} duration={motionDuration.reveal * 1.6} />
                    <span className="text-caption text-fg-subtle">/100</span>
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-3">
                  <span className="text-caption text-fg-muted">
                    {tr(queMide[r.componente as keyof typeof queMide] ?? '')}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-fg-subtle">
                    {tr('cuenta {p} %', { p: Math.round(r.pesoEfectivo) })}
                  </span>
                </div>
                <BarraDelComponente valor={r.valor as number} indice={i} etiqueta={nombre(r.componente)} />
              </StaggerItem>
            ))}
          </Stagger>
          <div className="relative mt-2 h-3" aria-hidden>
            {TRAMOS_DE_LA_ESCALA.map((t) => (
              <span
                key={t.letra}
                className="absolute -translate-x-1/2 font-mono text-[10px] leading-3 text-fg-subtle"
                style={{ left: `${t.centro}%` }}
              >
                {t.letra}
              </span>
            ))}
          </div>
        </>
      )}

      {sinDato.length > 0 && (
        <p
          className="mt-4 flex items-start gap-2 border-t border-dashed border-border pt-4 text-caption text-fg-muted dark:border-border-strong"
          data-testid="bloque-sin-dato"
        >
          <CircleDashed className="mt-px h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
          <span>
            {medidos.length > 0
              ? tr('Todavía sin dato: {lista}. Su peso se reparte entre lo que sí se midió.', { lista })
              : tr('Todavía sin dato: {lista}.', { lista })}
          </span>
        </p>
      )}
    </section>
  );
}

export function TarjetaDeCalificacion({
  calificacion,
  className,
  sinDesglose,
  compacta,
  deTu,
}: {
  calificacion: Calificacion;
  className?: string;
  sinDesglose?: boolean;
  /**
   * Para un lugar angosto (el cajón del candidato): todo apilado. Las columnas
   * de `lg:` miran el ancho de la PANTALLA, no el del cajón, y en un cajón con
   * pantalla grande partían el veredicto en tres renglones.
   */
  compacta?: boolean;
  /** La lee la persona misma («Mi calificación»): los avisos se le dicen de tú. */
  deTu?: boolean;
}) {
  const tr = useTr();
  const { formatCurrency } = useI18n();
  const c = calificacion;
  const v = c.veredicto ? VEREDICTO[c.veredicto] : null;
  const pesoHistorial = Math.round(c.pesoDelHistorial * 100);

  if (c.estado === 'SIN_DATOS') {
    return (
      <div className={cn('rounded-lg border border-border bg-surface p-6 dark:border-border-strong', className)}>
        <div className="flex items-start gap-4">
          <LetraDeLaCalificacion letra={null} grande />
          <div className="space-y-1">
            <p className="text-base font-medium text-fg">{tr('Todavía no hay calificación')}</p>
            <p className="max-w-xl text-sm text-fg-muted">
              {c.explicacion[0] ? fraseDelBack(tr, c.explicacion[0], deTu) : tr('Todavía no hay datos para calificar.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-border bg-surface p-6 dark:border-border-strong', className)}>
      <div className={cn('flex flex-col gap-6', !compacta && 'lg:flex-row lg:items-start lg:justify-between')}>
        <div className="flex items-start gap-4">
          <LetraDeLaCalificacion letra={c.letra} grande />
          <div className="space-y-1.5">
            <p className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">{tr('Calificación Leasefy')}</p>
            <p className="text-2xl font-medium text-fg">
              <span className="font-mono tabular-nums">{c.puntaje}</span>
              <span className="text-base text-fg-muted">/100</span>
            </p>
            {v && (
              <p className={cn('flex items-center gap-1.5 text-sm font-medium', v.tono)}>
                <v.icono className="h-4 w-4" weight="fill" aria-hidden />
                {tr(v.texto)}
              </p>
            )}
          </div>
        </div>

        <div className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3', !compacta && 'lg:min-w-[22rem]')}>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">{tr('Canon máximo')}</p>
            <p className="mt-1 font-mono text-sm tabular-nums text-fg">
              {c.canonMaximoCop !== null ? formatCurrency(c.canonMaximoCop) : tr('Sin ingreso verificado')}
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">{tr('Historial')}</p>
            <p className="mt-1 font-mono text-sm tabular-nums text-fg">
              {c.mesesObservados === 1 ? tr('1 mes') : c.mesesObservados > 0 ? tr('{n} meses', { n: c.mesesObservados }) : tr('Sin historial')}
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-fg-subtle">{tr('Pesa el historial')}</p>
            <p className="mt-1 font-mono text-sm tabular-nums text-fg">{tr('{p} %', { p: pesoHistorial })}</p>
          </div>
        </div>
      </div>

      <Presence show={c.condiciones.length > 0}>
        <div className="mt-5 rounded-md bg-primary-soft p-3 text-sm text-fg">
          <p className="font-medium">{tr('Condiciones sugeridas')}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-fg-muted">
            {c.condiciones.map((x) => (
              <li key={x}>{tr(x)}</li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-fg-subtle">
            {tr('Nunca un depósito en dinero: la Ley 820 lo prohíbe en vivienda.')}
          </p>
        </div>
      </Presence>

      {(c.frenos.length > 0 || c.revisiones.length > 0) && (
        <ul className="mt-4 space-y-1.5">
          {[...c.frenos, ...c.revisiones].map((f) => (
            <li key={f.codigo} className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-fg">
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              {tr(deTu ? paraLaPersona(f.texto) : f.texto)}
            </li>
          ))}
        </ul>
      )}

      {c.explicacion.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-fg-muted">
          {c.explicacion
            .filter((e) => !c.frenos.some((f) => f.texto === e) && !c.revisiones.some((r) => r.texto === e))
            .map((e) => (
              <li key={e}>{fraseDelBack(tr, e, deTu)}</li>
            ))}
        </ul>
      )}

      {!sinDesglose && (
        <div
          className={cn(
            'mt-6 grid gap-4',
            // Columnas parejas: con un solo bloque, ocupa todo el ancho (sin hueco).
            !compacta && c.mesesObservados > 0 && c.historial && c.documentos && 'lg:grid-cols-2',
          )}
        >
          <BloqueDelDesglose
            titulo="Historial en Leasefy"
            queEs={deTu ? QUE_ES_EL_BLOQUE.historial.tu : QUE_ES_EL_BLOQUE.historial.el}
            peso={c.historial && c.mesesObservados > 0 ? pesoHistorial : null}
            bloque={c.mesesObservados > 0 ? c.historial : null}
            deTu={deTu}
          />
          <BloqueDelDesglose
            titulo="Documentos"
            queEs={deTu ? QUE_ES_EL_BLOQUE.documentos.tu : QUE_ES_EL_BLOQUE.documentos.el}
            peso={c.documentos ? 100 - pesoHistorial : null}
            bloque={c.documentos}
            deTu={deTu}
          />
        </div>
      )}
    </div>
  );
}
