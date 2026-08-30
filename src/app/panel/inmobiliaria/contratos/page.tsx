'use client';

/**
 * Contratos — list/index page for the agency's rental contracts.
 *
 * This is the destination for the "Contratos" sidebar item, the InsightsPanel
 * cards (contratos_por_vencer / firma_pendiente) and the contract-detail back
 * action — all of which router.push('/panel/inmobiliaria/contratos'). Until now
 * the index page did not exist, so every one of those navigations 404'd.
 *
 * Data: useContracts() → GET {NEXT_PUBLIC_BACKEND_URL}/contracts (getMine).
 * Fully theme-aware via semantic tokens (bg-card / border-border / text-* /
 * CONTRACT_STATUS_COLORS already ship dark variants).
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fmtCop } from './format';
import {
  FileText,
  Warning,
  CaretRight,
  House,
  User,
} from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh';
import { PageGuard } from '@/components/auth/PageGuard';
import { Button } from '@/components/ui/button';
import { Eyebrow } from '@leasefy/cadence';
import { SinDatos } from '@/components/estado/SinDatos';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { useContracts } from '@/lib/hooks/useContracts';
import { NuevoContratoBoton } from '@/components/inmobiliaria/SelectorPostulacion';
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_COLORS,
  type Contract,
} from '@/lib/types/contract';

// ── Format helpers ───────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, dot }: { label: string; value: number | string; dot: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dot)} />
        <span className="text-caption text-muted-foreground truncate">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-medium tabular-nums text-foreground">{value}</p>
    </div>
  );
}

// ── Skeleton row ─────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0 animate-pulse">
          {Array.from({ length: 5 }).map((__, j) => (
            <td key={j} className="px-5 py-4">
              <div className="h-4 rounded bg-muted w-20" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Content ──────────────────────────────────────────────────────────────────

function ContratosContent() {
  const { locale } = useI18n();
  const router = useRouter();
  const tx = (es: string, en: string) => (locale === 'en' ? en : es);

  const { contracts, stats, isLoading, error, refetch } = useContracts();

  useAutoRefresh(refetch);

  /**
   * Paginado de presentación: `useContracts()` trae el portafolio entero y una
   * inmobiliaria real tiene cientos de contratos. No hay filtros en esta
   * pantalla, así que no hace falta `resetKey`.
   */
  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(contracts);

  const COLUMNS = [
    // T-0040 — el consecutivo, columna angosta y a la izquierda de todo, igual
    // que el código de inmueble en `ConsignacionTable`. Es puramente aditiva:
    // esta tabla no mostraba NINGÚN identificador, ni siquiera un UUID cortado,
    // así que no hay nada que migrar ni nada que los usuarios hayan aprendido a
    // citar.
    tx('Código', 'Code'),
    tx('Inquilino', 'Tenant'),
    tx('Propiedad', 'Property'),
    tx('Canon', 'Rent'),
    tx('Vigencia', 'Term'),
    tx('Estado', 'Status'),
    '',
  ];

  const openContract = (c: Contract) => router.push(`/panel/inmobiliaria/contratos/${c.id}`);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <Eyebrow>{tx('Portafolio', 'Portfolio')}</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{tx('Contratos', 'Contracts')}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {tx(
              'Gestiona los contratos de arrendamiento de tu inmobiliaria: firma, vigencia y estado.',
              'Manage your agency rental contracts: signing, term and status.',
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild hideArrow>
            <Link href="/panel/inmobiliaria/contratos/migrar">
              {tx('Migrar', 'Migrate')}
            </Link>
          </Button>
          <Button variant="outline" asChild hideArrow>
            <Link href="/panel/inmobiliaria/contratos/conceptos">
              {tx('Conceptos', 'Concepts')}
            </Link>
          </Button>
          {/* Antes navegaba a /contratos/nuevo a secas, y esa pantalla exige
              `?applicationId=`: el botón principal de Contratos mostraba
              "Falta el parámetro applicationId" en vez de crear nada. Ahora
              pregunta sobre qué postulación aprobada se arma el contrato. */}
          <NuevoContratoBoton />
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={tx('Total', 'Total')} value={isLoading ? '—' : stats.total} dot="bg-fg-subtle" />
        <StatCard label={tx('Activos', 'Active')} value={isLoading ? '—' : stats.active} dot="bg-success" />
        <StatCard
          label={tx('Pendientes de firma', 'Pending signature')}
          value={isLoading ? '—' : stats.pendingLandlord + stats.pendingTenant}
          dot="bg-warning"
        />
        <StatCard label={tx('Borradores', 'Drafts')} value={isLoading ? '—' : stats.draft} dot="bg-fg-subtle" />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft/40 p-4 flex items-start gap-2.5">
          <Warning className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" weight="fill" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-danger">
              {tx('Error cargando contratos', 'Error loading contracts')}
            </p>
            <p className="text-xs text-danger/90 mt-0.5">{error}</p>
          </div>
          <Button
            onClick={() => void refetch()}
            variant="outline"
            size="sm"
            hideArrow
            className="shrink-0"
          >
            {tx('Reintentar', 'Retry')}
          </Button>
        </div>
      )}

      {/* Table */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-muted flex items-center justify-center flex-shrink-0">
              <FileText className="w-[18px] h-[18px] text-fg-muted" weight="duotone" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{tx('Contratos', 'Contracts')}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tx('Toca un contrato para ver el detalle y la firma.', 'Tap a contract to see detail and signing.')}
              </p>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((col, i) => (
                <TableHead key={i} className="whitespace-nowrap">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && contracts.length === 0 && <TableSkeleton />}

            {!isLoading && !error && contracts.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMNS.length} className="p-0">
                  {/* No hay filtros en esta pantalla: un vacío acá siempre
                      significa «todavía no hay ninguno», y lo útil es poder
                      crear el primero desde el mismo lugar donde falta. */}
                  <SinDatos
                    queSon="contratos"
                    icono={FileText}
                    titulo={tx('Sin contratos aún', 'No contracts yet')}
                    descripcion={tx(
                      'Cuando cierres un arriendo, su contrato aparece acá con su estado y sus fechas.',
                      "When you close a lease, its contract shows up here with its status and dates.",
                    )}
                    /* ⚠️ Acá había un enlace a `/contratos/nuevo` a secas, y esa
                       pantalla EXIGE `?applicationId=`: el botón mostraba
                       «Falta el parámetro applicationId» en vez de crear nada.
                       Es el mismo defecto que ya estaba resuelto arriba con
                       `NuevoContratoBoton`, que pregunta sobre qué postulación
                       aprobada se arma el contrato. Un contrato no se crea de
                       cero: nace de una postulación. */
                    accion={<NuevoContratoBoton />}
                  />
                </TableCell>
              </TableRow>
            )}

            {pageItems.map((c) => (
                <TableRow
                  key={c.id}
                  onClick={() => openContract(c)}
                  className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  {/*
                    T-0040 — `#{code}`, `font-mono tabular-nums`, sin ceros a la
                    izquierda. Ausente ⇒ celda VACÍA: nunca `—`, nunca `#0`. La
                    única forma de que falte es un `back` anterior a T-0040, y
                    la degradación congelada para ese caso es no renderizar
                    nada.
                  */}
                  <TableCell className="px-5 py-4">
                    <span className="font-mono tabular-nums text-fg-muted text-sm">
                      {c.code != null ? `#${c.code}` : ''}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="grid place-items-center w-8 h-8 rounded-full bg-muted flex-shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{c.tenantName || '—'}</p>
                        <p className="text-caption text-muted-foreground truncate">{c.tenantEmail}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 max-w-[220px]">
                    <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                      <House className="w-3.5 h-3.5 flex-shrink-0" />
                      {c.propertyId === null ? (
                        <span className="truncate" title="Sin inmueble">
                          Sin inmueble
                        </span>
                      ) : (
                        <span className="truncate" title={`${c.propertyAddress}, ${c.propertyCity}`}>
                          {c.propertyAddress}
                          {c.propertyCity ? `, ${c.propertyCity}` : ''}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 tabular-nums font-mono whitespace-nowrap text-foreground">
                    {fmtCop(c.monthlyRent)}
                  </TableCell>
                  <TableCell className="px-5 py-4 whitespace-nowrap text-muted-foreground tabular-nums">
                    {fmtDate(c.startDate, locale)} <span className="opacity-50">→</span> {fmtDate(c.endDate, locale)}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                        CONTRACT_STATUS_COLORS[c.status] ?? 'bg-muted text-muted-foreground',
                      )}
                    >
                      {CONTRACT_STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right">
                    <CaretRight className="w-4 h-4 text-muted-foreground inline-block" />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {/* Pie: sólo si hay más de una página. */}
        {shouldPaginate && (
          <div className="border-t border-border px-4 py-3">
            <TablePagination
              total={total}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </section>
    </div>
  );
}

export default function ContratosPage() {
  return (
    <PageGuard module="portafolio">
      <ContratosContent />
    </PageGuard>
  );
}
