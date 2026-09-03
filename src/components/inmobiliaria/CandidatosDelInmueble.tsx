'use client';

/**
 * Quién se postuló a ESTE inmueble.
 *
 * La pantalla del inmueble no lo decía por ningún lado: había que salir al
 * listado del portafolio y entrar por el menú de la fila. La pantalla de
 * candidatos existía —`/inmuebles/[id]/candidatos`— y desde adentro del
 * inmueble no la enlazaba nadie.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Users, ArrowRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { landlordApplicationsApi } from '@/lib/api/applications.service';
import { useDecisionDeCandidato } from '@/components/inmobiliaria/use-decision-de-candidato';
import type { LandlordCandidate, LandlordApplicationStatus } from '@/lib/api/applications.types';

/** Mismos rótulos que la tabla de Postulaciones: una postulación, un nombre. */
const ESTADO: Record<LandlordApplicationStatus, { label: string; bg: string; text: string }> = {
  DRAFT: { label: 'Borrador', bg: 'bg-surface-muted', text: 'text-fg-muted' },
  SUBMITTED: { label: 'Postulado', bg: 'bg-primary-soft', text: 'text-primary' },
  UNDER_REVIEW: { label: 'En revisión', bg: 'bg-primary-soft', text: 'text-primary' },
  APPROVED: { label: 'Aprobado', bg: 'bg-success-soft', text: 'text-success' },
  REJECTED: { label: 'Rechazado', bg: 'bg-danger-soft', text: 'text-danger' },
  NEEDS_INFO: { label: 'Pide info', bg: 'bg-warning-soft', text: 'text-warning' },
  WITHDRAWN: { label: 'Retirado', bg: 'bg-surface-muted', text: 'text-fg-muted' },
  CONTRACT_FAILED: { label: 'Contrato fallido', bg: 'bg-danger-soft', text: 'text-danger' },
};

/** Los que todavía esperan una decisión — es el número que importa. */
const ESPERANDO: LandlordApplicationStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFO'];

/** Cuántos se enseñan acá: la lista entera vive en su pantalla. */
const CUANTOS_SE_MUESTRAN = 3;

export function CandidatosDelInmueble({
  propertyId,
  consignacionId,
}: {
  /** Puede faltar: un mandato migrado de cartera nace sin inmueble. */
  propertyId?: string;
  consignacionId: string;
}) {
  const [candidatos, setCandidatos] = useState<LandlordCandidate[] | null>(null);
  const [fallo, setFallo] = useState(false);

  /*
   * Una sola lectura, y la última manda.
   *
   * La lista se relee después de decidir sobre alguien, así que puede haber
   * dos pedidos en vuelo: sin el contador, la respuesta vieja pisa a la nueva
   * y la tarjeta vuelve a mostrar el estado de antes de la decisión.
   */
  const peticion = useRef(0);
  const cargar = useCallback(async () => {
    if (!propertyId) return;
    const mia = ++peticion.current;
    try {
      const lista = await landlordApplicationsApi.getCandidates(propertyId);
      if (peticion.current !== mia) return;
      setCandidatos(lista);
      setFallo(false);
    } catch {
      if (peticion.current !== mia) return;
      setFallo(true);
    }
  }, [propertyId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /*
   * Decidir se puede desde acá mismo.
   *
   * Antes las filas eran texto: se veía quién se había postulado y para
   * abrirlo había que ir a la otra pantalla y buscarlo de nuevo. Como los
   * candidatos que se listan son todos del MISMO inmueble, se pasan como
   * `hermanos`: aprobar a uno acá avisa a los demás igual que en la lista
   * completa, en vez de dejarlos esperando.
   */
  const { abrir, cajon } = useDecisionDeCandidato({
    hermanos: candidatos ?? undefined,
    onCambio: cargar,
  });

  const href = `/panel/inmobiliaria/inmuebles/${consignacionId}/candidatos`;
  const esperando = candidatos?.filter((c) => ESPERANDO.includes(c.status)).length ?? 0;

  /*
   * Primero los que esperan decisión.
   *
   * El encabezado dice «1 espera tu decisión» y abajo se enseñan tres de
   * cinco: sin ordenar, esa persona podía quedar fuera de las tres y la
   * tarjeta pedía una acción sobre alguien que no mostraba. `sort` es estable,
   * así que dentro de cada grupo se respeta el orden que mandó el servidor.
   */
  const ordenados = candidatos
    ? [...candidatos].sort(
        (a, b) => Number(ESPERANDO.includes(b.status)) - Number(ESPERANDO.includes(a.status)),
      )
    : null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-surface-muted">
            <Users className="h-4 w-4 text-fg-muted" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-fg">Candidatos</h3>
            <p className="text-xs text-fg-muted">
              {candidatos === null
                ? fallo
                  ? 'No pudimos cargarlos'
                  : 'Cargando…'
                : candidatos.length === 0
                  ? 'Nadie se ha postulado todavía'
                  : esperando > 0
                    ? `${esperando} ${esperando === 1 ? 'espera' : 'esperan'} tu decisión`
                    : 'Ninguno espera decisión'}
            </p>
          </div>
        </div>
        {candidatos !== null && candidatos.length > 0 && (
          <span className="font-mono text-2xl font-semibold tabular-nums text-fg">
            {candidatos.length}
          </span>
        )}
      </div>

      {ordenados !== null && ordenados.length > 0 && (
        <ul className="divide-y divide-border">
          {/* Tres y el enlace: la lista completa vive en su pantalla, con
              comparador y acciones. Repetirla acá sería tener dos. */}
          {ordenados.slice(0, CUANTOS_SE_MUESTRAN).map((c) => {
            const est = ESTADO[c.status] ?? ESTADO.SUBMITTED;
            return (
              <li key={c.id}>
                {/* Un botón y no un `li` con onClick: así se alcanza con
                    teclado y se anuncia como accionable. El foco lo pinta la
                    regla global de `focus-visible` (docs/DESIGN.md §Focus). */}
                <button
                  type="button"
                  onClick={() => abrir(c)}
                  aria-label={`Ver la postulación de ${c.tenantName || 'este candidato'}`}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-muted"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-medium text-primary">
                    {(c.tenantName || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-fg">{c.tenantName}</span>
                    <span className="block truncate text-xs text-fg-muted">{c.tenantEmail}</span>
                  </span>
                  {c.riskScore && (
                    <span className="shrink-0 font-mono text-xs tabular-nums text-fg-muted">
                      {c.riskScore.totalScore} · {c.riskScore.level}
                    </span>
                  )}
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      est.bg,
                      est.text,
                    )}
                  >
                    {est.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {propertyId && (
        <Link
          href={href}
          className="flex items-center justify-center gap-1.5 border-t border-border px-5 py-3 text-sm font-medium text-primary transition-colors hover:bg-surface-muted"
        >
          {candidatos && candidatos.length > CUANTOS_SE_MUESTRAN
            ? `Ver los ${candidatos.length} candidatos`
            : 'Ver candidatos'}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      {cajon}
    </div>
  );
}
