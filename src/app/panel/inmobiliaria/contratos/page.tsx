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

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MagnifyingGlass, SortAscending, SortDescending } from '@phosphor-icons/react';
import {
  filtrarContratos,
  hayFiltros,
  FILTROS_INICIALES,
  type CampoDeOrden,
  type FiltrosDeContratos,
} from '@/lib/contratos/filtrar-contratos';
import { numeroDelContrato } from '@/lib/contratos/numero-del-contrato';
import { ContratoFilters } from '@/components/contratos/ContratoFilters';
import { formatearVigencia } from '@/lib/contratos/fecha-de-vigencia';
import { useRouter } from 'next/navigation';
import { fmtCop } from './format';
import {
  FileText,
  Warning,
  CaretRight,
  House,
  User,
  GearSix,
  UploadSimple,
  ListPlus,
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
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { useMigracionConDeuda } from '@/lib/hooks/use-migracion-con-deuda';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_COLORS,
  type Contract,
} from '@/lib/types/contract';

// ── Format helpers ───────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined, locale: string): string {
  return formatearVigencia(iso, locale);
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, dot }: { label: string; value: number | string; dot: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dot)} />
        <span className="text-caption text-muted-foreground truncate">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-medium tabular-nums text-foreground">{value}</p>
    </div>
  );
}

// ── Celda del número ─────────────────────────────────────────────────────────

/*
 * 🔴 Nico, 2026-09-12: «estás tergiversando los números de contrato». Vio el
 * «#1839» acá, lo buscó en su sistema anterior y era OTRA persona. El dato
 * estaba bien: #1839 es NUESTRO consecutivo y el suyo es 1686. La celda lee
 * grande el número que la inmobiliaria conoce y, debajo, el nuestro con su
 * dueño («Leasefy #1839») para que se sepa cuál es cuál. Un contrato nativo
 * sigue mostrando `#code` solo. Sin ninguno ⇒ celda VACÍA: nunca «—», nunca
 * «#0» (`numero-del-contrato.ts`).
 */
function CeldaDeNumero({ contrato }: { contrato: Contract }) {
  const numero = numeroDelContrato(contrato);
  return (
    <div className="min-w-0">
      <span className="font-mono tabular-nums text-sm text-foreground">{numero.principal ?? ''}</span>
      {numero.secundario && (
        <p className="text-caption text-muted-foreground font-mono tabular-nums whitespace-nowrap">
          {numero.secundario}
        </p>
      )}
    </div>
  );
}

// ── Skeleton row ─────────────────────────────────────────────────────────────

/*
 * `cells` viene de `COLUMNS.length`, nunca de un número escrito acá. Este
 * componente tenía un `5` literal y `COLUMNS` creció a 7 al sumarse la columna
 * de código (T-0040): las filas de carga quedaron dos celdas más cortas que el
 * encabezado. Repetir el conteo en vez de derivarlo es exactamente cómo se
 * produjo esa deriva — el `<thead>` y el `colSpan` del vacío ya se ajustaban
 * solos porque los dos leen `COLUMNS.length`.
 */
function TableSkeleton({ cells }: { cells: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0 animate-pulse">
          {Array.from({ length: cells }).map((__, j) => (
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
  // Contratos migrados que existen y no cobran (sin inmueble o sin
  // propietario). Vivía en la página de migración, que ya no existe: se dice
  // acá, que es donde la persona está mirando sus contratos.
  const deuda = useMigracionConDeuda();

  useAutoRefresh(refetch);

  /*
   * 🔴 El buscador y los filtros (Nico, 2026-09-12: «esta tabla ¿por qué no
   * tiene buscador?» y, la misma noche, «con TODOS los filtros»). Era la única
   * de las cuatro del directorio sin uno, con 1.836 contratos paginados de a
   * 10: encontrar uno era pasar 184 páginas.
   *
   * Filtran la lista COMPLETA y recién después se pagina. Al revés —filtrando
   * lo que ya se paginó— el buscador miente: contesta «no se encontró» sobre
   * algo que está en la página 3. Ver `filtrar-contratos.ts`.
   */
  const [filtros, setFiltros] = useState<FiltrosDeContratos>(FILTROS_INICIALES);
  const contratosFiltrados = useMemo(
    () => filtrarContratos(contracts, filtros),
    [contracts, filtros],
  );
  const conFiltros = hayFiltros(filtros);
  const limpiarFiltros = () =>
    // El orden no es un filtro: se conserva.
    setFiltros({ ...FILTROS_INICIALES, campo: filtros.campo, sentido: filtros.sentido });

  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(contratosFiltrados, {
    // Cualquier cambio de filtro u orden vuelve a la página 1: filtrar desde
    // la página 4 dejaría la tabla vacía sobre un resultado que sí tiene filas.
    resetKey: JSON.stringify(filtros),
  });

  const ordenarPor = (campo: CampoDeOrden) =>
    setFiltros((f) =>
      f.campo === campo
        ? { ...f, sentido: f.sentido === 'asc' ? 'desc' : 'asc' }
        : { ...f, campo, sentido: 'asc' },
    );
  const SortIcon = filtros.sentido === 'asc' ? SortAscending : SortDescending;

  /*
   * Las columnas, con el campo por el que ordena cada una (las que ordenan).
   * El esqueleto y el `colSpan` del vacío leen `COLUMNS.length`: repetir el
   * conteo a mano es cómo se produjo la deriva de T-0040.
   */
  const COLUMNS: { label: string; campo?: CampoDeOrden }[] = [
    // El número que se LEE: el de la inmobiliaria si lo hay, si no el nuestro
    // (`CeldaDeNumero`). Angosta y a la izquierda de todo, igual que el código
    // de inmueble en `ConsignacionTable`.
    { label: tx('Código', 'Code'), campo: 'numero' },
    { label: tx('Inquilino', 'Tenant'), campo: 'tenantName' },
    { label: tx('Propiedad', 'Property') },
    { label: tx('Canon', 'Rent'), campo: 'monthlyRent' },
    { label: tx('Vigencia', 'Term'), campo: 'endDate' },
    { label: tx('Estado', 'Status') },
    { label: '' },
  ];

  const openContract = (c: Contract) => router.push(`/panel/inmobiliaria/contratos/${c.id}`);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      {/* Responsive (Nico, 2026-09-02): a anchos medios el título y las
          acciones iban lado a lado desde `sm` y las acciones se partían en
          dos filas contra el subtítulo. Ahora van apiladas hasta `lg`, y la
          fila de acciones no se envuelve nunca: son dos controles. */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <Eyebrow>{tx('Portafolio', 'Portfolio')}</Eyebrow>
          <h1 className="text-h2 text-fg">{tx('Contratos', 'Contracts')}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl line-clamp-2">
            {tx(
              'Gestiona los contratos de arrendamiento de tu inmobiliaria: firma, vigencia y estado.',
              'Manage your agency rental contracts: signing, term and status.',
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/*
           * Nico (2026-09-02): «Migrar» y «Conceptos» no son acciones del
           * día a día — son configuración. Un engranaje con la jerarquía del
           * botón secundario, y adentro las dos: migrar contratos y agregar
           * conceptos. El botón primario queda solo con «Nuevo contrato».
           */}
          <DropdownList>
            <DropdownListTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                hideArrow
                aria-label={tx('Configuración de contratos', 'Contract settings')}
                data-testid="contratos-configuracion"
              >
                <GearSix className="w-5 h-5" />
              </Button>
            </DropdownListTrigger>
            <DropdownListContent align="end" className="w-56">
              <DropdownListItem asChild data-testid="accion-migrar-contratos">
                <Link href="/panel/inmobiliaria/contratos/migrar">
                  <UploadSimple className="w-4 h-4" />
                  <span className="text-sm">{tx('Migrar contratos', 'Migrate contracts')}</span>
                </Link>
              </DropdownListItem>
              <DropdownListItem asChild data-testid="accion-agregar-conceptos">
                <Link href="/panel/inmobiliaria/contratos/conceptos">
                  <ListPlus className="w-4 h-4" />
                  <span className="text-sm">{tx('Agregar conceptos', 'Add concepts')}</span>
                </Link>
              </DropdownListItem>
            </DropdownListContent>
          </DropdownList>
          {/* Antes navegaba a /contratos/nuevo a secas, y esa pantalla exige
              `?applicationId=`: el botón principal de Contratos mostraba
              "Falta el parámetro applicationId" en vez de crear nada. Ahora
              pregunta sobre qué postulación aprobada se arma el contrato. */}
          <NuevoContratoBoton />
        </div>
      </header>

      {/*
        Dos deudas distintas, dos alertas distintas: la que existe y no cobra
        (activada sin inmueble o sin propietario) y la que ni siquiera llegó a
        ser contrato (filas sin activar). Decir la segunda con el texto de la
        primera daría «0 contratos migrados sin propietario».
      */}
      {deuda && deuda.sinInmueble + deuda.sinPropietario > 0 ? (
        <AlertaAccionable
          severidad="danger"
          titulo={
            deuda.sinInmueble > 0 && deuda.sinPropietario > 0
              ? tx(
                  `${deuda.sinInmueble} contratos migrados sin inmueble y ${deuda.sinPropietario} sin propietario: no generan cobros.`,
                  `${deuda.sinInmueble} migrated contracts without a property and ${deuda.sinPropietario} without an owner: they will not bill.`,
                )
              : deuda.sinInmueble > 0
                ? tx(
                    `${deuda.sinInmueble} ${deuda.sinInmueble === 1 ? 'contrato migrado' : 'contratos migrados'} sin inmueble: no ${deuda.sinInmueble === 1 ? 'genera' : 'generan'} cobros.`,
                    `${deuda.sinInmueble} migrated ${deuda.sinInmueble === 1 ? 'contract' : 'contracts'} without a property: will not bill.`,
                  )
                : tx(
                    `${deuda.sinPropietario} ${deuda.sinPropietario === 1 ? 'contrato migrado' : 'contratos migrados'} sin propietario: no ${deuda.sinPropietario === 1 ? 'genera' : 'generan'} cobros.`,
                    `${deuda.sinPropietario} migrated ${deuda.sinPropietario === 1 ? 'contract' : 'contracts'} without an owner: will not bill.`,
                  )
          }
          accion={{
            label: tx('Completarlos en la migración', 'Complete them in the migration'),
            href: '/panel/inmobiliaria/contratos/migrar',
          }}
          data-testid="alerta-migrados-sin-cobrar"
        >
          {tx(
            'El cobro sale de la consignación del inmueble. Desde la migración se les crea el inmueble que falta y se elige el propietario, de a uno o en masa.',
            'Billing comes from the property consignment. From the migration you can create the missing property and pick the owner, one by one or in bulk.',
          )}
        </AlertaAccionable>
      ) : null}

      {/* Filas que entraron con el archivo y nunca se activaron: no hay
          contrato, así que no aparecen ni en la tabla de abajo. */}
      {deuda && deuda.sinInmueble + deuda.sinPropietario === 0 && deuda.pendientes > 0 ? (
        <AlertaAccionable
          severidad="warning"
          titulo={tx(
            `${deuda.pendientes} filas de tu migración nunca se activaron: no existen como contrato.`,
            `${deuda.pendientes} rows of your migration were never activated: they do not exist as contracts.`,
          )}
          accion={{
            label: tx('Revisar las filas', 'Review the rows'),
            href: '/panel/inmobiliaria/contratos/migrar',
          }}
          data-testid="alerta-migracion-sin-activar"
        >
          {tx(
            'Les falta algo del archivo —el inmueble, el inquilino o los datos del contrato— y hasta que no se complete no se crea el contrato.',
            'Something from the file is missing —the property, the tenant or the contract data— and until it is complete no contract is created.',
          )}
        </AlertaAccionable>
      ) : null}

      {/* Stats */}
      {/* Cuatro en fila desde tablet: a 900 px, con el menú escondido, sobra
          ancho y las tarjetas en 2×2 salían enormes para un solo número. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        <div className="rounded-lg border border-danger/30 bg-danger-soft/40 p-4 flex items-start gap-2.5">
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
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-border">
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

        {/*
          La barra de búsqueda y filtros, debajo de la cabecera y encima de la
          tabla, como en propietarios e inmuebles: es el mismo gesto en las
          cuatro pantallas del directorio. Sólo con algo que filtrar — una
          barra sobre una lista vacía no puede encontrar nada.
        */}
        {contracts.length > 0 && (
          <ContratoFilters
            filtros={filtros}
            onFiltros={setFiltros}
            totalFiltrado={contratosFiltrados.length}
            total={contracts.length}
          />
        )}

        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((col, i) => (
                <TableHead key={i} className="whitespace-nowrap">
                  {col.campo ? (
                    /*
                      allowlist: disparador de orden — no hay primitiva en
                      Cadence. `uppercase` va explícito porque un `<button>`
                      trae `text-transform: none` del navegador y perdía las
                      mayúsculas del `TH`. Ver PropietarioTable.
                    */
                    <button
                      type="button"
                      onClick={() => ordenarPor(col.campo as CampoDeOrden)}
                      className="flex items-center gap-1.5 uppercase hover:text-fg"
                      aria-sort={
                        filtros.campo === col.campo
                          ? filtros.sentido === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                      data-testid={`ordenar-${col.campo}`}
                    >
                      {col.label}
                      {filtros.campo === col.campo && <SortIcon className="w-3.5 h-3.5" aria-hidden />}
                    </button>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && contracts.length === 0 && <TableSkeleton cells={COLUMNS.length} />}

            {/*
              🔴 Desde que hay buscador, un vacío ya NO significa siempre
              «todavía no hay ninguno»: puede ser «tu búsqueda no encontró
              nada», que es lo contrario — ahí lo útil no es crear un contrato
              sino borrar lo escrito. Ofrecer «Nuevo contrato» sobre una
              búsqueda fallida manda a crear algo que probablemente ya existe.
            */}
            {!isLoading && !error && contracts.length > 0 && contratosFiltrados.length === 0 && conFiltros && (
              <TableRow>
                <TableCell colSpan={COLUMNS.length} className="p-0">
                  <SinDatos
                    queSon="contratos"
                    icono={MagnifyingGlass}
                    titulo={tx('Sin resultados', 'No results')}
                    descripcion={
                      filtros.busqueda.trim()
                        ? tx(
                            `Ningún contrato coincide con «${filtros.busqueda}». Se buscó en los ${contracts.length} contratos, no sólo en esta página.`,
                            `No contract matches “${filtros.busqueda}”. All ${contracts.length} contracts were searched, not just this page.`,
                          )
                        : tx(
                            `Ningún contrato coincide con los filtros puestos. Se miraron los ${contracts.length} contratos, no sólo en esta página.`,
                            `No contract matches the filters. All ${contracts.length} contracts were checked, not just this page.`,
                          )
                    }
                    accion={
                      <Button variant="secondary" hideArrow onClick={limpiarFiltros}>
                        {filtros.busqueda.trim()
                          ? tx('Limpiar la búsqueda', 'Clear search')
                          : tx('Limpiar los filtros', 'Clear filters')}
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !error && contracts.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMNS.length} className="p-0">
                  {/* Sin ninguno cargado, lo útil sí es crear el primero desde
                      el mismo lugar donde falta. */}
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
                       aprobada se arma el contrato. O lo arma a mano, con un inmueble
                       consignado y el inquilino (`?modo=manual`). */
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
                  <TableCell className="px-5 py-4">
                    <CeldaDeNumero contrato={c} />
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
    <PageGuard module="contratos">
      <ContratosContent />
    </PageGuard>
  );
}
