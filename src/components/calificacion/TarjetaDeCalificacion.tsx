'use client';

/**
 * La Calificación Leasefy en una tarjeta (18-10-2026): la letra, el puntaje,
 * qué quiere decir (¿se le arrienda fácil, con condiciones o no?), hasta qué
 * canon, por qué, y el desglose de lo que pesó. La usan «Mi calificación» (la
 * persona), la búsqueda de la inmobiliaria y el cajón del candidato.
 *
 * Una sola escala en toda la plataforma: A ≥ 80 · B ≥ 60 · C ≥ 40 · D < 40.
 */

import { CheckCircle, Info, ShieldWarning, Warning, type Icon } from '@phosphor-icons/react';
import { Presence, Stagger, StaggerItem } from '@leasefy/cadence';

import { useI18n } from '@/lib/i18n';
import { useTr } from '@/lib/i18n/use-tr';
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
 * Las frases de `explicacion` vienen del back en español. Las fijas se buscan
 * tal cual en `frases-en.ts`; la única con números («18 meses de historial en
 * Leasefy: el historial pesa 55 % y los documentos 45 %.») se reconoce y se
 * vuelve a armar con sus cifras para que también salga en inglés.
 */
const FRASE_DE_LOS_MESES = /^(\d+) (mes|meses) de historial en Leasefy: el historial pesa (\d+) % y los documentos (\d+) %\.$/;

export function fraseDelBack(tr: ReturnType<typeof useTr>, frase: string): string {
  const m = FRASE_DE_LOS_MESES.exec(frase);
  if (!m) return tr(frase);
  return m[2] === 'mes'
    ? tr('1 mes de historial en Leasefy: el historial pesa {h} % y los documentos {d} %.', { h: m[3], d: m[4] })
    : tr('{n} meses de historial en Leasefy: el historial pesa {h} % y los documentos {d} %.', { n: m[1], h: m[3], d: m[4] });
}

export function LetraDeLaCalificacion({ letra, grande }: { letra: Letra | null; grande?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-mono font-semibold tabular-nums',
        grande ? 'h-16 w-16 text-3xl' : 'h-8 w-8 text-sm',
        letra ? TONO_DE_LA_LETRA[letra] : 'bg-surface-muted text-fg-subtle',
      )}
      aria-label={letra ? `Letra ${letra}` : 'Sin letra'}
    >
      {letra ?? '—'}
    </span>
  );
}

function BarrasDelBloque<K extends string>({
  titulo,
  peso,
  bloque,
}: {
  titulo: string;
  peso: number | null;
  bloque: Bloque<K> | null;
}) {
  const tr = useTr();
  if (!bloque) return null;
  return (
    <div className="rounded-md border border-border bg-surface-muted/40 p-4 dark:border-border-strong">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-medium text-fg">{tr(titulo)}</h4>
        <span className="font-mono text-xs tabular-nums text-fg-muted">
          {peso !== null ? tr('pesa {p} %', { p: peso }) : ''}
          {bloque.puntaje !== null ? ` · ${bloque.puntaje}/100` : ''}
        </span>
      </div>
      <Stagger className="space-y-2.5">
        {bloque.desglose.map((r) => (
          <StaggerItem key={r.componente}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className={cn('text-fg', r.valor === null && 'text-fg-subtle')}>
                {tr(NOMBRE_DEL_COMPONENTE[r.componente as keyof typeof NOMBRE_DEL_COMPONENTE] ?? r.componente)}
              </span>
              <span className="font-mono tabular-nums text-fg-muted">
                {r.valor === null ? tr('sin dato') : `${Math.round(r.valor)}`}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted dark:bg-border">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${r.valor === null ? 0 : Math.max(2, r.valor)}%` }}
              />
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

export function TarjetaDeCalificacion({
  calificacion,
  className,
  sinDesglose,
}: {
  calificacion: Calificacion;
  className?: string;
  sinDesglose?: boolean;
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
              {c.explicacion[0] ? fraseDelBack(tr, c.explicacion[0]) : tr('Todavía no hay datos para calificar.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-border bg-surface p-6 dark:border-border-strong', className)}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <LetraDeLaCalificacion letra={c.letra} grande />
          <div className="space-y-1.5">
            <p className="font-mono text-xs uppercase tracking-wide text-fg-subtle">{tr('Calificación Leasefy')}</p>
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

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:min-w-[22rem]">
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
          <p className="mt-2 text-xs text-fg-subtle">
            {tr('Nunca un depósito en dinero: la Ley 820 lo prohíbe en vivienda.')}
          </p>
        </div>
      </Presence>

      {(c.frenos.length > 0 || c.revisiones.length > 0) && (
        <ul className="mt-4 space-y-1.5">
          {[...c.frenos, ...c.revisiones].map((f) => (
            <li key={f.codigo} className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-fg">
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              {tr(f.texto)}
            </li>
          ))}
        </ul>
      )}

      {c.explicacion.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-fg-muted">
          {c.explicacion
            .filter((e) => !c.frenos.some((f) => f.texto === e) && !c.revisiones.some((r) => r.texto === e))
            .map((e) => (
              <li key={e}>{fraseDelBack(tr, e)}</li>
            ))}
        </ul>
      )}

      {!sinDesglose && (
        <div
          className={cn(
            'mt-6 grid gap-4',
            // Columnas parejas: con un solo bloque, ocupa todo el ancho (sin hueco).
            c.mesesObservados > 0 && c.historial && c.documentos && 'lg:grid-cols-2',
          )}
        >
          <BarrasDelBloque
            titulo="Historial en Leasefy"
            peso={c.historial && c.mesesObservados > 0 ? pesoHistorial : null}
            bloque={c.mesesObservados > 0 ? c.historial : null}
          />
          <BarrasDelBloque
            titulo="Documentos"
            peso={c.documentos ? 100 - pesoHistorial : null}
            bloque={c.documentos}
          />
        </div>
      )}
    </div>
  );
}
