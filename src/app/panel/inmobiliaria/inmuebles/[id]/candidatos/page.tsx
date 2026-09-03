'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { User, Sparkle, ArrowUpRight, Scales, X as XIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh';
import { Button, Textarea, EmptyState, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { Checkbox } from '@/components/ui/checkbox';
import { MAXIMO_A_COMPARAR, MINIMO_A_COMPARAR } from '@/lib/inmobiliaria/comparacion';
import { BackButton } from '@leasefy/cadence';
import { landlordApplicationsApi } from '@/lib/api/applications.service';
import { propertiesApi } from '@/lib/api/properties.service';
import { consignacionesApi } from '@/lib/api/inmobiliaria.service';
import { PageGuard } from '@/components/auth/PageGuard';
import { type ActionType } from '@/components/inmobiliaria/AccionDePostulacion';
import { useDecisionDeCandidato } from '@/components/inmobiliaria/use-decision-de-candidato';
import { RecorridoHilo } from '@/components/inmobiliaria/recorrido/RecorridoHilo';
import { useContracts } from '@/lib/hooks/useContracts';
import type { LandlordCandidate, LandlordApplicationStatus } from '@/lib/api/applications.types';
import type { Property } from '@/lib/types/property';
import type { Contract } from '@/lib/types/contract';

// ─── Status display ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  LandlordApplicationStatus,
  { label: string; bg: string; text: string }
> = {
  DRAFT:           { label: 'Borrador',          bg: 'bg-surface-muted',  text: 'text-fg-muted' },
  SUBMITTED:       { label: 'Postulado',         bg: 'bg-primary-soft',   text: 'text-primary' },
  UNDER_REVIEW:    { label: 'En revisión',       bg: 'bg-primary-soft',   text: 'text-primary' },
  APPROVED:        { label: 'Aprobado',          bg: 'bg-success-soft',   text: 'text-success' },
  REJECTED:        { label: 'Rechazado',         bg: 'bg-danger-soft',    text: 'text-danger' },
  NEEDS_INFO:      { label: 'Pide info',         bg: 'bg-warning-soft',   text: 'text-warning' },
  WITHDRAWN:       { label: 'Retirado',          bg: 'bg-surface-muted',  text: 'text-fg-muted' },
  CONTRACT_FAILED: { label: 'Contrato fallido',  bg: 'bg-danger-soft',    text: 'text-danger' },
};

const FALLBACK_STATUS = { label: 'Desconocido', bg: 'bg-surface-muted', text: 'text-fg-muted' };

// Status → Cadence Badge variant (mirrors STATUS_CONFIG tints).
const STATUS_VARIANT: Record<
  LandlordApplicationStatus,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  DRAFT: 'secondary',
  SUBMITTED: 'default',
  UNDER_REVIEW: 'default',
  APPROVED: 'success',
  REJECTED: 'destructive',
  NEEDS_INFO: 'warning',
  WITHDRAWN: 'secondary',
  CONTRACT_FAILED: 'destructive',
};

const SCORE_COLORS: Record<string, string> = {
  A: 'text-success bg-success-soft',
  B: 'text-primary bg-primary-soft',
  C: 'text-warning bg-warning-soft',
  D: 'text-danger bg-danger-soft',
};

// ─── Row actions ──────────────────────────────────────────────────────────────

// Touch-only (pointer: coarse) hit-area expansion to >=44px for the
// approve/reject action chips. The visual chip stays 26px tall; an invisible
// ::after pseudo-element extends the tap target. Desktop (fine pointer) is
// untouched.
const COARSE_HIT_AREA =
  "relative [@media(pointer:coarse)]:after:absolute [@media(pointer:coarse)]:after:-inset-y-2.5 [@media(pointer:coarse)]:after:-inset-x-0.5 [@media(pointer:coarse)]:after:content-['']";

function CandidateActions({
  candidate,
  existingContract,
  onAction,
}: {
  candidate: LandlordCandidate;
  existingContract?: Contract | null;
  onAction: (type: ActionType, candidate: LandlordCandidate) => void;
}) {
  const { status } = candidate;

  // SUBMITTED cannot legally move to APPROVED (application-state-machine.ts) — no
  // "Aprobar" chip here. Same affordances as before, minus the deleted preapprove chip.
  if (status === 'SUBMITTED') {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => onAction('request-info', candidate)}
          className={cn(COARSE_HIT_AREA, 'bg-warning-soft text-warning hover:bg-warning-soft/80 whitespace-nowrap')}
        >
          Pedir info
        </Button>
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => onAction('reject', candidate)}
          className={cn(COARSE_HIT_AREA, 'bg-danger-soft text-danger hover:bg-danger-soft/80 whitespace-nowrap')}
        >
          Rechazar
        </Button>
      </div>
    );
  }

  if (status === 'UNDER_REVIEW') {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => onAction('approve', candidate)}
          className={cn(COARSE_HIT_AREA, 'bg-success-soft text-success hover:bg-success-soft/80 whitespace-nowrap')}
        >
          Aprobar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          onClick={() => onAction('reject', candidate)}
          className={cn(COARSE_HIT_AREA, 'bg-danger-soft text-danger hover:bg-danger-soft/80 whitespace-nowrap')}
        >
          Rechazar
        </Button>
      </div>
    );
  }

  if (status === 'APPROVED') {
    // Si ya existe un contrato para esta aplicación, llevamos al detalle del contrato.
    // Si no, al formulario de creación.
    if (existingContract) {
      return (
        <Button
          asChild
          variant="outline"
          size="sm"
          hideArrow
          className={cn(COARSE_HIT_AREA, 'border-success/30 text-success hover:bg-success-soft whitespace-nowrap')}
        >
          <Link href={`/panel/inmobiliaria/contratos/${existingContract.id}`}>
            Ver contrato
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </Button>
      );
    }
    return (
      <Button
        asChild
        size="sm"
        hideArrow
        className={cn(COARSE_HIT_AREA, 'bg-success text-white hover:opacity-90 whitespace-nowrap')}
      >
        <Link href={`/panel/inmobiliaria/contratos/nuevo?applicationId=${candidate.id}`}>
          Crear contrato
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </Button>
    );
  }

  if (status === 'CONTRACT_FAILED') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-danger-soft text-danger text-xs font-medium whitespace-nowrap">
        Proceso cerrado
      </span>
    );
  }

  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function CandidatosContent() {
  const params = useParams();
  const router = useRouter();
  /**
   * `[id]` es el id de la CONSIGNACIÓN, igual que en `/inmuebles/[id]`.
   *
   * Antes esta pantalla vivía en `/propiedades/[id]/candidatos` y leía un id de
   * inmueble. Al unificar las dos secciones el mismo hueco de la URL habría
   * significado dos cosas —mandato en una ruta, inmueble en la de al lado—, que
   * es exactamente la confusión que la unificación viene a quitar. El inmueble
   * se resuelve desde el mandato, que es donde vive el vínculo.
   */
  const consignacionId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [candidates, setCandidates] = useState<LandlordCandidate[]>([]);
  /**
   * Paginado de presentación: `getCandidates(propertyId)` trae todos los
   * postulantes del inmueble y un aviso con demanda real junta decenas. Sin
   * filtros en esta pantalla (la selección para comparar no filtra) ⇒ sin
   * `resetKey`.
   */
  const {
    pageItems: candidatosPagina,
    total: totalCandidatos,
    page: paginaCandidatos,
    pageSize: porPaginaCandidatos,
    setPage: setPaginaCandidatos,
    setPageSize: setPorPaginaCandidatos,
    shouldPaginate: paginarCandidatos,
  } = useTablePagination(candidates);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  // Paso 9 del recorrido: comparar. Se limita a 4 porque más no entra sin
  // scroll horizontal, y comparar con scroll no es comparar.
  const [paraComparar, setParaComparar] = useState<Set<string>>(() => new Set());

  // Cargamos contratos del landlord/agencia para saber cuáles aplicaciones ya tienen contrato.
  // Permite mostrar "Ver contrato" en vez de "Crear contrato" en la fila correspondiente.
  const { getByApplicationId: getContractByApplicationId } = useContracts();

  // Once content has loaded, background refresh failures must NOT swap the
  // page for the full failure card (silent auto-refresh contract).
  const hasLoadedRef = useRef(false);

  const [propertyId, setPropertyId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // `getByIdOrPropertyId` y no `getById`: por acá entran enlaces que sólo
      // tienen el id del INMUEBLE —Postulaciones es uno— y con `getById` caían
      // en «No encontramos esa propiedad» teniendo el mandato en la base.
      const consignacion = await consignacionesApi.getByIdOrPropertyId(consignacionId);
      // Un mandato puede no tener inmueble todavía —los de la migración de
      // cartera nacen así—, y sin inmueble no hay a quién postularse. Se dice,
      // en vez de pedir candidatos de `undefined` y pintar «no hay ninguno».
      if (!consignacion.propertyId) {
        setPropertyId(null);
        setProperty(null);
        setCandidates([]);
        hasLoadedRef.current = true;
        return;
      }
      setPropertyId(consignacion.propertyId);
      const [propertyData, candidatesData] = await Promise.all([
        propertiesApi.getById(consignacion.propertyId),
        landlordApplicationsApi.getCandidates(consignacion.propertyId),
      ]);
      setProperty(propertyData);
      setCandidates(candidatesData);
      hasLoadedRef.current = true;
    } catch (err) {
      // Sólo el primer intento pinta la pantalla de fallo: un refresco de
      // fondo que falla no debe borrar lo que ya se está viendo.
      if (!hasLoadedRef.current) {
        // Se guarda el error ENTERO, no su mensaje: el status es lo que
        // distingue «no existe» de «no pudimos cargar».
        setError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [consignacionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useAutoRefresh(fetchData);

  /**
   * El cajón y las cuatro decisiones — los mismos que monta la tarjeta
   * «Candidatos» dentro del inmueble. `hermanos` son todos los postulantes de
   * ESTA propiedad: es lo que hace que aprobar a uno le avise a los demás.
   */
  const { abrir, pedirAccion, cajon } = useDecisionDeCandidato({
    hermanos: candidates,
    onCambio: fetchData,
  });

  /**
   * Llegar directo a una persona: `?candidato=<id>` abre su cajón apenas
   * cargan los candidatos.
   *
   * Sin esto, tocar a alguien en `/postulaciones` te dejaba en la lista de la
   * propiedad y tenías que volver a buscarlo — la pantalla decía "haz clic en
   * una para revisarla" y el clic no revisaba nada. Si el id no está en la
   * lista no se fuerza nada: queda la lista, que es un destino honesto.
   *
   * `abiertoPorUrl` evita reabrir el cajón cuando el auto-refresh vuelve a
   * traer los candidatos después de que la persona lo cerró.
   */
  const candidatoDeLaUrl = useSearchParams().get('candidato');
  const abiertoPorUrl = useRef(false);
  useEffect(() => {
    if (!candidatoDeLaUrl || abiertoPorUrl.current || candidates.length === 0) return;
    const encontrado = candidates.find((c) => c.id === candidatoDeLaUrl);
    if (!encontrado) return;
    abiertoPorUrl.current = true;
    abrir(encontrado);
  }, [candidatoDeLaUrl, candidates, abrir]);

  // Stats — solo dos destinos posibles: en revisión o aprobado (docs/VOCABULARIO.md).
  const activeCount   = candidates.filter(
    (c) => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW',
  ).length;
  const approvedCount = candidates.filter((c) => c.status === 'APPROVED').length;

  // Solo bloquea la vista en el primer load — los auto-refresh son silenciosos.
  const alternarComparar = useCallback((id: string) => {
    setParaComparar((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else if (siguiente.size < MAXIMO_A_COMPARAR) siguiente.add(id);
      return siguiente;
    });
  }, []);

  if (isLoading && !property) {
    return (
      <div className="p-4 md:p-6">
        <EsqueletoTabla columnas={4} filas={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <FalloDeCarga
          error={error}
          queEs="esa propiedad"
          onReintentar={fetchData}
          volverA={{ label: 'Volver a inmuebles', href: '/panel/inmobiliaria/inmuebles' }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <BackButton
          label="Volver a propiedades"
          onClick={() => router.push('/panel/inmobiliaria/inmuebles')}
        />

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">Candidatos</h1>
            {property && (
              <p className="text-sm text-fg-muted max-w-2xl">
                {property.title} · {property.neighborhood}, {property.city}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recorrido del inquilino: acá se comparan (paso 9) y se decide (10).
          Las dos rutas cuelgan de esta misma pantalla, así que se pasan por
          `hrefs` — `pasos.ts` no puede hardcodear una ruta con [id]. */}
      <RecorridoHilo
        paso="comparacion"
        hrefs={{
          // Comparar arranca acá: hay que marcar a quiénes antes de poder
          // compararlos, así que el paso apunta a esta misma lista.
          comparacion: `/panel/inmobiliaria/inmuebles/${consignacionId}/candidatos`,
          decision: `/panel/inmobiliaria/inmuebles/${consignacionId}/candidatos`,
        }}
      />

      {/* Stats */}
      {candidates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CandidateStatTile value={activeCount} label="En revisión" tone="info" />
          <CandidateStatTile value={approvedCount} label="Aprobados" tone="ok" />
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {candidates.length === 0 ? (
          <EmptyState
            icon={User}
            title="Sin candidatos"
            description="Aún no hay postulaciones para esta propiedad"
          />
        ) : (
          <div className="overflow-x-auto overscroll-contain">
            <Table className="w-full min-w-[580px] [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
              <TableHeader>
                <TableRow className="border-b border-border bg-surface-muted">
                  <TableHead className="w-10 pl-4">
                    <span className="sr-only">Comparar</span>
                  </TableHead>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="p-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidatosPagina.map((candidate) => {
                  const statusCfg = STATUS_CONFIG[candidate.status] ?? FALLBACK_STATUS;
                  const initials = candidate.tenantName
                    ? candidate.tenantName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
                    : '?';

                  return (
                    <TableRow
                      key={candidate.id}
                      onClick={() => abrir(candidate)}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      {/* Comparar — el clic acá NO abre la ficha */}
                      <TableCell className="w-10 pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={paraComparar.has(candidate.id)}
                          onCheckedChange={() => alternarComparar(candidate.id)}
                          disabled={
                            !paraComparar.has(candidate.id) &&
                            paraComparar.size >= MAXIMO_A_COMPARAR
                          }
                          aria-label={`Comparar a ${candidate.tenantName || 'este candidato'}`}
                          data-testid={`comparar-${candidate.id}`}
                        />
                      </TableCell>

                      {/* Tenant */}
                      <TableCell className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                            <span className="text-sm font-medium text-primary">
                              {initials}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-fg flex items-center gap-1.5">
                              {candidate.tenantName || '—'}
                              <Sparkle className="w-3 h-3 text-primary" aria-label="Ver análisis IA" />
                            </p>
                            <p className="text-xs text-fg-muted">
                              {candidate.tenantEmail || '—'}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Score */}
                      <TableCell className="p-4">
                        {candidate.riskScore ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold',
                                SCORE_COLORS[candidate.riskScore.level] ?? 'text-fg-muted bg-surface-muted'
                              )}
                            >
                              {candidate.riskScore.level}
                            </span>
                            <span className="text-sm font-semibold text-fg tabular-nums">
                              {candidate.riskScore.totalScore}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                            <Sparkle className="w-3 h-3" />
                            Ver resultado
                          </span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="p-4">
                        <Badge variant={STATUS_VARIANT[candidate.status] ?? 'secondary'}>
                          {statusCfg.label}
                        </Badge>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="p-4">
                        <span className="text-sm text-fg-muted">
                          {new Date(candidate.submittedAt).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="p-4" onClick={(e) => e.stopPropagation()}>
                        <CandidateActions
                          candidate={candidate}
                          existingContract={getContractByApplicationId(candidate.id)}
                          onAction={pedirAccion}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pie: sólo si hay más de una página. */}
            {paginarCandidatos && (
              <div className="border-t border-border px-4 py-3">
                <TablePagination
                  total={totalCandidatos}
                  page={paginaCandidatos}
                  pageSize={porPaginaCandidatos}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageChange={setPaginaCandidatos}
                  onPageSizeChange={setPorPaginaCandidatos}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barra de comparación — sólo existe cuando hay algo que comparar.
          Fija abajo porque la decisión se toma después de recorrer la lista,
          y para entonces el encabezado ya no está en pantalla. */}
      {paraComparar.size > 0 && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 py-3 shadow-overlay md:px-6"
          role="region"
          aria-label="Comparar candidatos"
          data-testid="barra-comparar"
        >
          <div className="mx-auto flex max-w-5xl items-center gap-4">
            <p className="min-w-0 flex-1 text-sm text-fg">
              <span className="font-medium tabular-nums">{paraComparar.size}</span>{' '}
              {paraComparar.size === 1 ? 'seleccionado' : 'seleccionados'}
              {paraComparar.size < MINIMO_A_COMPARAR && (
                <span className="text-fg-muted"> · elegí al menos {MINIMO_A_COMPARAR}</span>
              )}
              {paraComparar.size >= MAXIMO_A_COMPARAR && (
                <span className="text-fg-muted"> · es el máximo</span>
              )}
            </p>
            <Button
              variant="ghost"
              size="sm"
              hideArrow
              onClick={() => setParaComparar(new Set())}
              className="gap-1.5"
            >
              <XIcon className="h-3.5 w-3.5" />
              Quitar
            </Button>
            <Button
              size="sm"
              hideArrow
              disabled={paraComparar.size < MINIMO_A_COMPARAR}
              onClick={() =>
                router.push(
                  `/panel/inmobiliaria/inmuebles/${consignacionId}/candidatos/comparar?ids=${Array.from(paraComparar).join(',')}`,
                )
              }
              className="gap-1.5"
              data-testid="ir-a-comparar"
            >
              <Scales className="h-4 w-4" />
              Comparar
            </Button>
          </div>
        </div>
      )}

      {/* El cajón con el análisis, las cuatro acciones y el paso 10 */}
      {cajon}
    </div>
  );
}

// KPI tile — número, label e ícono parejos; tint semántico por token.
const CANDIDATE_TILE_TONES = {
  neutral: 'bg-surface-muted text-fg-muted',
  ok: 'bg-success-soft text-success',
  info: 'bg-primary-soft text-primary',
  warn: 'bg-warning-soft text-warning',
  bad: 'bg-danger-soft text-danger',
} as const;

function CandidateStatTile({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: keyof typeof CANDIDATE_TILE_TONES;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', CANDIDATE_TILE_TONES[tone])}>
        <User className="w-5 h-5" weight="duotone" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold text-fg tabular-nums leading-none">{value}</p>
        <p className="text-xs text-fg-muted mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

export default function CandidatosPage() {
  return (
    <PageGuard module="portafolio">
      <CandidatosContent />
    </PageGuard>
  );
}
