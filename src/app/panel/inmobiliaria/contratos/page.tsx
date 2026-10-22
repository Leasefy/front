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

import { useFilasMarcadas } from '@/lib/hooks/use-filas-marcadas';
import { CasillaDeLaFila, CasillaDeLaPagina } from '@/components/masivas/CasillasDeLaTabla';
import { ContratosMarcados } from '@/components/contratos/ContratosMarcados';
import { useEffect, useState, useMemo, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { MagnifyingGlass, ArrowUp, ArrowDown } from '@phosphor-icons/react';
import {
  filtrarContratos,
  hayFiltros,
  FILTROS_INICIALES,
  type CampoDeOrden,
  type EstadoDeFiltro,
  type FiltrosDeContratos,
  vencidoSinRenovar,
  filtrosALaUrl,
  filtrosDesdeLaUrl,
  filtrosDeLaPestana,
  FILTROS_AL_ENTRAR,
  PESTANAS_DE_CONTRATOS,
  ESTADOS_POR_FIRMAR,
  type PestanaDeContratos,
} from '@/lib/contratos/filtrar-contratos';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { useEstadoEnLaUrl } from '@/lib/hooks/use-estado-en-la-url';
import { numeroDelContrato } from '@/lib/contratos/numero-del-contrato';
import { ContratoFilters } from '@/components/contratos/ContratoFilters';
import { formatearVigencia } from '@/lib/contratos/fecha-de-vigencia';
import { estadoParaMostrar } from '@/lib/contratos/estado-para-mostrar';
import { useRouter } from 'next/navigation';
import { fmtCop } from './format';
import {
  FileText,
  CaretRight,
  House,
  User,
  GearSix,
  UploadSimple,
  ListPlus,
} from '@phosphor-icons/react';

import {
  colorDeVigencia,
  vigenciaDelContrato,
} from '@/lib/contratos/vigencia';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh';
import { PageGuard } from '@/components/auth/PageGuard';
import { Button } from '@/components/ui/button';
import { Avatar } from '@leasefy/cadence';
import { sinMayusculasSostenidas } from '@/lib/inmuebles/titulo-de-la-ficha';
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';

import { SinDatos } from '@/components/estado/SinDatos';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableBodyAnimado,
  TableRowAnimada,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { tiempoHastaElFin } from '@/lib/inmuebles/tiempo-hasta-el-fin';
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
import { useAccesoDeLaPantalla } from '@/components/auth/acceso-de-la-pantalla';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { clasificarFallo } from '@/lib/errores/clasificar';
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_COLORS,
  type Contract,
} from '@/lib/types/contract';

// ── Format helpers ───────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined, locale: string): string {
  return formatearVigencia(iso, locale);
}

/** El dueño del inmueble que trae la fila (cuando el back lo manda en la lista). */
function propietarioDeLaFila(c: Contract): string | null {
  const varios = c.propietariosDelContrato?.propietarios ?? [];
  if (varios.length > 1) {
    const principal = varios.find((p) => p.esPrincipal) ?? varios[0]!;
    return `${principal.name} y ${varios.length - 1} más`;
  }
  return varios[0]?.name ?? c.propietarioDeLaConsignacion?.name ?? null;
}

// ── Stat card ────────────────────────────────────────────────────────────────


// ── Celda del número ─────────────────────────────────────────────────────────

/*
 * 🔴 Nico, 2026-09-12: «estás tergiversando los números de contrato». Vio el
 * «#1839» acá, lo buscó en su sistema anterior y era OTRA persona. El dato
 * estaba bien: #1839 es NUESTRO consecutivo y el suyo es 1686. La celda lee
 * grande el número que la inmobiliaria conoce y, debajo, el nuestro con su
 * dueño; desde el 16-09 nuestro consecutivo ya no se muestra (Nico: «ese código de Leasefy no lo dejemos»). Un contrato nativo
 * sigue mostrando `#code` solo. Sin ninguno ⇒ celda VACÍA: nunca «—», nunca
 * «#0» (`numero-del-contrato.ts`).
 */
function CeldaDeNumero({ contrato }: { contrato: Contract }) {
  const numero = numeroDelContrato(contrato);
  return (
    <div className="min-w-0">
      <span className="font-mono tabular-nums text-sm text-foreground">{numero.principal ?? ''}</span>
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

  const { contracts, stats, isLoading, error, errorCrudo, refetch } = useContracts();
  /*
   * 🔴 QA-CONT-95 (CR-33, H-07): la lista es el dato PRINCIPAL de la pantalla.
   * Si el servidor la NIEGA (sin permiso, sin segundo factor), se apaga la
   * pantalla entera con el cartel —como hace `EstadoDeDatos principal`—: antes
   * el cartel salía dentro de la tabla y «Nuevo contrato» y el engranaje
   * quedaban vivos. Un 500 no apaga nada.
   */
  const accesoDeLaPantalla = useAccesoDeLaPantalla();
  const denegarLaPantalla = accesoDeLaPantalla?.denegar;
  const pantallaYaDenegada = Boolean(accesoDeLaPantalla?.denegado);
  useEffect(() => {
    const fallo = errorCrudo ?? error;
    if (!fallo || !denegarLaPantalla || pantallaYaDenegada) return;
    const tipo = clasificarFallo(fallo, { queEs: 'los contratos' }).tipo;
    if (tipo === 'sinPermiso' || tipo === 'sinSegundoFactor') {
      denegarLaPantalla({ error: fallo, queEs: 'los contratos' });
    }
  }, [error, errorCrudo, denegarLaPantalla, pantallaYaDenegada]);
  // Contratos migrados que existen y no cobran (sin inmueble o sin
  // propietario). Vivía en la página de migración, que ya no existe: se dice
  // acá, que es donde la persona está mirando sus contratos.
  const deuda = useMigracionConDeuda();
  /*
   * 🔴 QA-CONT-95 (MC-15): migrar es ESCRIBIR contratos. Quien sólo los ve (el
   * contador, el de sólo lectura) no recibe un enlace que lo lleva a una
   * pantalla negada: el aviso se le dice igual, sin el botón que rebota.
   */
  const { canAccess, isAdmin } = usePermissions();
  const puedeMigrar = isAdmin || canAccess('contratos', 'create');

  useAutoRefresh(refetch);
  const sinDato = tx('No se pudo traer', "Couldn't load");

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
  // 21-10 (DESIGN §25.1, 6b): los filtros viven también en la URL — abrir un
  // contrato y volver ya no los pierde, y un enlace puede traer «los por firmar».
  // Abre en «Activos» (revisión de diseño 21-10): los terminados son la mitad de
  // la lista y no son trabajo de hoy; están a un toque, en su pestaña.
  const [filtros, setFiltros] = useEstadoEnLaUrl<FiltrosDeContratos>(FILTROS_AL_ENTRAR, {
    leer: (p) => filtrosDesdeLaUrl(p, FILTROS_AL_ENTRAR),
    escribir: (f, p) => filtrosALaUrl(f, p, FILTROS_AL_ENTRAR),
  });
  const contratosFiltrados = useMemo(
    () => filtrarContratos(contracts, filtros),
    [contracts, filtros],
  );
  // QA-CONT-95 (A-03): los vencidos sin renovar tampoco son «Activos» (la fila
  // dice «Vencido»); se cuentan aparte, como los por empezar.
  const vencidosSinRenovar = useMemo(
    () => contracts.filter((c) => vencidoSinRenovar(c)).length,
    [contracts],
  );
  /*
   * 🔴 21-10 (revisión de diseño): las cinco cifras grandes —dos casi siempre en
   * 0, «Total» dicho tres veces— pasan a PESTAÑAS de estado con su conteo dentro
   * de la tarjeta. Cada conteo sale de la MISMA lista con los demás filtros
   * puestos, así que la pestaña dice exactamente cuántas filas va a mostrar.
   */
  const pestanaActual: PestanaDeContratos =
    (filtros.vigencia === 'vencido_sin_renovar' || filtros.vigencia === 'por_empezar') && filtros.estado === 'all'
      ? filtros.vigencia
      : filtros.vigencia === 'all' && (PESTANAS_DE_CONTRATOS as readonly string[]).includes(filtros.estado)
        ? (filtros.estado as PestanaDeContratos)
        : ('otro' as PestanaDeContratos);
  const conteoPorPestana = useMemo(() => {
    const sinVista = { ...filtros, estado: 'all' as EstadoDeFiltro, vigencia: 'all' as const };
    const cuantos = (p: PestanaDeContratos) => filtrarContratos(contracts, { ...sinVista, ...filtrosDeLaPestana(p) }).length;
    return Object.fromEntries(PESTANAS_DE_CONTRATOS.map((p) => [p, cuantos(p)])) as Record<PestanaDeContratos, number>;
  }, [contracts, filtros]);
  const verPestana = (p: PestanaDeContratos) => setFiltros((f) => ({ ...f, ...filtrosDeLaPestana(p) }));
  /** La pestaña no es un filtro: «Limpiar» y «con filtros» miran lo demás. */
  const deLaPestana = pestanaActual === ('otro' as PestanaDeContratos) ? {} : filtrosDeLaPestana(pestanaActual);
  const conFiltros = hayFiltros({ ...filtros, ...(pestanaActual === ('otro' as PestanaDeContratos) ? {} : filtrosDeLaPestana('all')) });
  const limpiarFiltros = () =>
    // El orden no es un filtro, y la pestaña tampoco: se conservan.
    setFiltros({ ...FILTROS_INICIALES, ...deLaPestana, campo: filtros.campo, sentido: filtros.sentido });
  /** Lo que toca, sobre la lista entera (no sobre lo filtrado): sale arriba sólo si hay algo. */
  const porFirmar = useMemo(
    () => contracts.filter((c) => c.status && ESTADOS_POR_FIRMAR.includes(c.status)).length,
    [contracts],
  );

  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(contratosFiltrados, {
    // 25 filas: con 743 activos, 10 por página eran 75 páginas (revisión 21-10).
    initialPageSize: 25,
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
  // Ronda 18: una flecha de un solo sentido (el ícono de orden se leía «⇅»).
  const SortIcon = filtros.sentido === 'asc' ? ArrowUp : ArrowDown;

  /*
   * Las columnas, con el campo por el que ordena cada una (las que ordenan).
   * El esqueleto y el `colSpan` del vacío leen `COLUMNS.length`: repetir el
   * conteo a mano es cómo se produjo la deriva de T-0040.
   */
  /*
   * Revisión de diseño (21-10): en una pestaña de un solo estado («Activos», «Por
   * firmar»…) la columna Estado decía lo mismo en cada fila. Va sólo donde las
   * filas mezclan estados (Terminados, Todos); la terminación programada de un
   * activo se dice en «Vence».
   */
  // Nico (22-10): «a esta sí le dejaría la columna de Estado» → va en todas las pestañas.
  const conEstado = true;
  const estadoDeLaFila = (c: Contract) => {
    const v = vigenciaDelContrato({
      status: c.status,
      endDate: c.endDate,
      terminadoEn: c.terminadoEn ?? null,
      startDate: c.startDate ?? null,
      fechaDeCartera: c.fechaDeCartera ?? null,
    });
    return {
      v,
      estado: estadoParaMostrar({
        contrato: c,
        vigencia: v,
        etiquetaDelEstado: CONTRACT_STATUS_LABELS[c.status] ?? c.status,
        locale,
      }),
    };
  };
  const COLUMNS: { label: string; campo?: CampoDeOrden; casilla?: true; derecha?: true }[] = [
    // Acciones masivas (Nico, 10-10-2026): la casilla de la página.
    { label: '', casilla: true },
    // El número que se LEE: el de la inmobiliaria si lo hay, si no el nuestro
    // (`CeldaDeNumero`). Angosta y a la izquierda de todo, igual que el código
    // de inmueble en `ConsignacionTable`.
    { label: tx('Código', 'Code'), campo: 'numero' },
    { label: tx('Inquilino', 'Tenant'), campo: 'tenantName' },
    { label: tx('Inmueble', 'Property') },
    { label: tx('Canon', 'Rent'), campo: 'monthlyRent', derecha: true },
    { label: tx('Vence', 'Ends'), campo: 'endDate' },
    ...(conEstado ? [{ label: tx('Estado', 'Status') }] : []),
    { label: '' },
  ];

  const openContract = (c: Contract) => router.push(`/panel/inmobiliaria/contratos/${c.id}`);

  // ── Acciones masivas (Nico, 10-10-2026) ─────────────────────────────────
  // Con otros filtros, lo marcado que ya no se ve se suelta.
  const { marcadas, marcar, quitar: quitarLaSeleccion } = useFilasMarcadas(
    JSON.stringify({ ...filtros, campo: undefined, sentido: undefined }),
  );
  const contratosMarcados = useMemo(
    () => contracts.filter((c) => marcadas.has(c.id)),
    [contracts, marcadas],
  );
  /** El estado como lo dice el chip de la fila, para el Excel. */
  const textoDelEstado = (c: Contract) =>
    estadoParaMostrar({
      contrato: c,
      vigencia: vigenciaDelContrato({
        status: c.status,
        endDate: c.endDate,
        terminadoEn: c.terminadoEn ?? null,
        startDate: c.startDate ?? null,
        fechaDeCartera: c.fechaDeCartera ?? null,
      }),
      etiquetaDelEstado: CONTRACT_STATUS_LABELS[c.status] ?? c.status,
      locale,
    }).texto;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      {/* Responsive (Nico, 2026-09-02): a anchos medios el título y las
          acciones iban lado a lado desde `sm` y las acciones se partían en
          dos filas contra el subtítulo. Ahora van apiladas hasta `lg`, y la
          fila de acciones no se envuelve nunca: son dos controles. */}
      {/* GLOW UP 21-10: el encabezado de todas las pantallas. La tarjeta de la tabla repetía
          «Contratos» con un ícono: su pista («toca uno…») pasó a esta línea. El engranaje (migrar y
          conceptos) sigue siendo configuración, callado; la única azul es «Nuevo contrato». */}
      <EncabezadoDePantalla
        seccion={tx('Operación', 'Operations')}
        titulo={tx('Contratos', 'Contracts')}
        descripcion={tx(
          'Tus contratos, empezando por los que vencen primero.',
          'Your contracts, starting with the ones that end first.',
        )}
        acciones={
          <DropdownList>
            <DropdownListTrigger asChild>
              {/* Un engranaje solo no dice qué hay adentro (revisión 21-10): «Configurar» con su texto. */}
              <Button
                variant="secondary"
                size="sm"
                hideArrow
                aria-label={tx('Configuración de contratos', 'Contract settings')}
                data-testid="contratos-configuracion"
              >
                <GearSix className="h-4 w-4" />
                {/* Ronda 15 (390): con su texto también en el celular (el engranaje solo no se entendía). */}
                <span>{tx('Configurar', 'Settings')}</span>
              </Button>
            </DropdownListTrigger>
            <DropdownListContent align="end" className="w-56">
              {puedeMigrar && (
                <DropdownListItem asChild data-testid="accion-migrar-contratos">
                  <Link href="/panel/inmobiliaria/contratos/migrar">
                    <UploadSimple className="w-4 h-4" />
                    <span className="text-sm">{tx('Migrar contratos', 'Migrate contracts')}</span>
                  </Link>
                </DropdownListItem>
              )}
              <DropdownListItem asChild data-testid="accion-agregar-conceptos">
                <Link href="/panel/inmobiliaria/contratos/conceptos">
                  <ListPlus className="w-4 h-4" />
                  <span className="text-sm">{tx('Agregar conceptos', 'Add concepts')}</span>
                </Link>
              </DropdownListItem>
            </DropdownListContent>
          </DropdownList>
        }
        accionPrincipal={<NuevoContratoBoton />}
      />

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
          accion={puedeMigrar ? {
            
            label: tx('Completarlos en la migración', 'Complete them in the migration'),
            href: '/panel/inmobiliaria/contratos/migrar',
          } : undefined}
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
            deuda.pendientes === 1
              ? '1 fila de tu migración nunca se activó: no existe como contrato.'
              : `${deuda.pendientes} filas de tu migración nunca se activaron: no existen como contrato.`,
            `${deuda.pendientes} rows of your migration were never activated: they do not exist as contracts.`,
          )}
          accion={puedeMigrar ? {
            
            label: tx('Revisar las filas', 'Review the rows'),
            href: '/panel/inmobiliaria/contratos/migrar',
          } : undefined}
          data-testid="alerta-migracion-sin-activar"
        >
          {tx(
            'Les falta algo del archivo —el inmueble, el inquilino o los datos del contrato— y hasta que no se complete no se crea el contrato.',
            'Something from the file is missing —the property, the tenant or the contract data— and until it is complete no contract is created.',
          )}
        </AlertaAccionable>
      ) : null}

      {/* Lo que toca, en UNA línea y sólo si hay algo (21-10, revisión de diseño):
          antes era la quinta cifra, a la derecha, con el mismo peso que «Borradores 0». */}
      {!isLoading && !error && (vencidosSinRenovar > 0 || porFirmar > 0) ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-fg" data-testid="contratos-lo-que-toca">
          <span className="h-2 w-2 shrink-0 rounded-full bg-warning-500" aria-hidden="true" />
          {vencidosSinRenovar > 0 ? (
            <button type="button" className="underline-offset-2 hover:underline" onClick={() => verPestana('vencido_sin_renovar')}>
              {vencidosSinRenovar === 1
                ? tx('1 contrato venció y nadie lo renovó', '1 contract ended and was not renewed')
                : tx(`${vencidosSinRenovar} contratos vencieron y nadie los renovó`, `${vencidosSinRenovar} contracts ended and were not renewed`)}
            </button>
          ) : null}
          {vencidosSinRenovar > 0 && porFirmar > 0 ? <span className="text-fg-subtle" aria-hidden="true">·</span> : null}
          {porFirmar > 0 ? (
            <button type="button" className="underline-offset-2 hover:underline" onClick={() => verPestana('por_firmar')}>
              {porFirmar === 1 ? tx('1 espera una firma', '1 awaits a signature') : tx(`${porFirmar} esperan una firma`, `${porFirmar} await a signature`)}
            </button>
          ) : null}
        </p>
      ) : null}

      {/* Table */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        {/*
          🔴 19-09-2026 · Las cuatro cifras viven DENTRO de la tarjeta.
          
          Estaban sueltas encima, sobre el fondo de la página, y es
          literalmente lo que Nico señaló con el dedo en Pagos el 18: «esto
          tiene que hacer parte de la tabla». Una cifra que habla de la lista
          y flota fuera de la lista obliga a mirar dos bloques y adivinar que
          se refieren a lo mismo — y cuando el filtro achica la tabla, quedan
          arriba unos números que ya no coinciden con nada de lo que se ve, sin
          nada que diga de qué hablan. Aquí dentro se lee como lo que es: el
          encabezado de esta tabla.

          Un cero que en realidad es «no lo pudimos traer» afirma algo falso
          («no tienes contratos activos») y encima tranquiliza. Cuando la
          consulta falló va una raya, y se dice por qué.
        */}
        {/* GLOW UP 21-10: las cifras FILTRAN la tabla (como en Postulaciones, PQRS y Documentos): un
            toque y la lista muestra esos; otro toque (o «Total»), la lista entera. Los vencidos sin
            renovar dejan de ser un enlace escondido debajo de «Activos»: son su propia cifra, con el
            punto ámbar, y sólo cuando hay alguno. */}
        <div className="space-y-3 border-b border-border px-4 pb-3 pt-4">
          {isLoading || error ? (
            <p className="text-caption text-fg-muted" data-testid="resumen-de-contratos">
              {isLoading ? tx('Cargando los contratos…', 'Loading contracts…') : sinDato}
            </p>
          ) : (
            <PestanasDeEstado<PestanaDeContratos>
              etiqueta={tx('Estado de los contratos', 'Contract status')}
              data-testid="resumen-de-contratos"
              valor={pestanaActual}
              onCambio={verPestana}
              pestanas={[
                { valor: 'active', etiqueta: tx('Activos', 'Active'), cuantos: conteoPorPestana.active, fija: true, testid: 'contratos-kpi' },
                { valor: 'por_empezar', etiqueta: tx('Por empezar', 'Not started yet'), cuantos: conteoPorPestana.por_empezar, testid: 'contratos-kpi' },
                { valor: 'vencido_sin_renovar', etiqueta: tx('Vencidos sin renovar', 'Ended, not renewed'), cuantos: conteoPorPestana.vencido_sin_renovar, tono: 'aviso', testid: 'ver-vencidos-sin-renovar' },
                { valor: 'por_firmar', etiqueta: tx('Por firmar', 'Awaiting signature'), cuantos: conteoPorPestana.por_firmar, tono: 'aviso', testid: 'contratos-kpi' },
                { valor: 'draft', etiqueta: tx('Borradores', 'Drafts'), cuantos: conteoPorPestana.draft, testid: 'contratos-kpi' },
                { valor: 'terminados', etiqueta: tx('Terminados', 'Ended'), cuantos: conteoPorPestana.terminados, testid: 'contratos-kpi' },
                { valor: 'all', etiqueta: tx('Todos', 'All'), cuantos: conteoPorPestana.all, fija: true, testid: 'contratos-kpi' },
              ]}
            />
          )}
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
            conFiltros={conFiltros}
            onLimpiar={limpiarFiltros}
          />
        )}

        {/*
          🔴 QA-CONT C-17: a 1440 la tabla «no cabía entera» (direcciones y la
          flecha cortadas) y a 390 se corría de lado. Ahora: la vigencia va en
          dos renglones, el propietario va bajo la dirección (C-16) y las celdas
          son más angostas; bajo `md` cada fila es una tarjeta apilada (la misma
          fila, otro dibujo: sin duplicar el DOM) y el encabezado se esconde.
        */}
        <Table className="max-md:block">
          <TableHeader className="max-md:hidden">
            <TableRow>
              {COLUMNS.map((col, i) => col.casilla ? (
                <TableHead key={i} className="w-10 py-4 pl-4 pr-0">
                  <CasillaDeLaPagina
                    ids={pageItems.map((c) => c.id)}
                    marcadas={marcadas}
                    onMarcar={marcar}
                    queSon="contratos"
                  />
                </TableHead>
              ) : (
                <TableHead
                  key={i}
                  className={cn('whitespace-nowrap px-4', col.derecha && 'text-right')}
                  /*
                   * C-18: `aria-sort` va en el `th` (el encabezado de la
                   * columna), no en el botón: un lector de pantalla lo anuncia
                   * desde la celda. Sin orden propio, «none» en las que ordenan.
                   */
                  aria-sort={
                    col.campo
                      ? filtros.campo === col.campo
                        ? filtros.sentido === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                >
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
                      className={cn('flex items-center gap-1.5 uppercase hover:text-fg', col.derecha && 'ml-auto flex-row-reverse')}
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
          <TableBody className="max-md:block">
            {isLoading && contracts.length === 0 && <TableSkeleton cells={COLUMNS.length} />}

            {/* El fallo ocupa el mismo hueco que el vacío: es la misma pantalla
                en otro estado. Antes era un cartel rojo a mano con el mensaje
                crudo del backend y «Reintentar» siempre, incluso sobre un 403 o
                un 404, donde reintentar no cambia nada. `FalloDeCarga` recibe el
                error ENTERO y decide solo. */}
            {!isLoading && error && (
              <TableRow>
                <TableCell colSpan={COLUMNS.length} className="p-0">
                  <FalloDeCarga
                    error={errorCrudo ?? error}
                    queEs="los contratos"
                    onReintentar={refetch}
                    enmarcado={false}
                  />
                </TableCell>
              </TableRow>
            )}

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
                      'Cuando cierres un arriendo, su contrato aparece aquí con su estado y sus fechas.',
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
          </TableBody>
          {/* Las filas de datos van en su propio cuerpo animado: entran
              escalonadas (techo de 320 ms) y, al buscar, filtrar o cambiar de
              página, las que se van salen en su lugar (`key` = el id). */}
          <TableBodyAnimado className="max-md:block">
            {pageItems.map((c) => (
              <TableRowAnimada
                key={c.id}
                onClick={() => openContract(c)}
                /* CR-20: la fila se abre también con el teclado (Enter o espacio). */
                tabIndex={0}
                role="link"
                aria-label={`Abrir el contrato ${numeroDelContrato(c).principal ?? ''} de ${c.tenantName || 'sin inquilino'}`}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openContract(c);
                  }
                }}
                className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-center max-md:gap-x-3 max-md:gap-y-1.5 max-md:px-4 max-md:py-3.5"
                data-testid="fila-de-contrato"
              >
                <TableCell className="w-10 py-4 pl-4 pr-0 max-md:hidden" onKeyDown={(e) => e.stopPropagation()}>
                  <CasillaDeLaFila
                    id={c.id}
                    nombre={`el contrato de ${c.tenantName || 'sin inquilino'}`}
                    marcadas={marcadas}
                    onMarcar={marcar}
                  />
                </TableCell>
                <TableCell className="px-4 py-4 max-md:order-5 max-md:block max-md:p-0 max-md:text-right">
                  <CeldaDeNumero contrato={c} />
                </TableCell>
                <TableCell className="px-4 py-4 max-w-[240px] max-md:order-1 max-md:block max-md:max-w-none max-md:p-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Cadence 2: la persona con sus iniciales y SU tono (el mismo en todo el panel), no un muñequito igual para todos. */}
                    {c.tenantName ? (
                      <Avatar name={c.tenantName} size="sm" className="max-md:hidden" />
                    ) : (
                      <div className="grid place-items-center w-8 h-8 rounded-full bg-muted flex-shrink-0 max-md:hidden">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      {/* El correo va en la ficha del contrato: en la fila era ruido (revisión 21-10). */}
                      <p className="font-medium text-foreground truncate" title={c.tenantEmail || undefined}>{c.tenantName || '—'}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4 max-w-[240px] max-md:order-3 max-md:col-span-2 max-md:block max-md:max-w-none max-md:p-0">
                  <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                    <House className="w-3.5 h-3.5 flex-shrink-0" />
                    {c.propertyId === null ? (
                      <span className="truncate" title="Sin inmueble">
                        Sin inmueble
                      </span>
                    ) : (
                      <span className="truncate" title={`${c.propertyAddress}, ${c.propertyCity}`}>
                        {/* Glow up 22-10: la dirección migrada viene en MAYÚSCULAS; se lee con
                            mayúscula inicial (el texto entero sigue en el título). */}
                        {sinMayusculasSostenidas(c.propertyAddress ?? '')}
                        {c.propertyCity ? `, ${sinMayusculasSostenidas(c.propertyCity)}` : ''}
                      </span>
                    )}
                  </div>
                  {/* C-16: de quién es el inmueble (también se busca por ahí). */}
                  {propietarioDeLaFila(c) ? (
                    <p className="mt-0.5 truncate pl-5 text-caption text-fg-subtle" data-testid="propietario-de-la-fila">
                      {/* Ronda 12: el nombre en gris basta; «Propietario:» delante gastaba el ancho. */}
                      <span className="sr-only">{tx('Propietario', 'Owner')}: </span>
                      {propietarioDeLaFila(c)}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="px-4 py-4 text-right tabular-nums font-mono whitespace-nowrap text-foreground max-md:order-4 max-md:block max-md:p-0 max-md:text-left">
                  {fmtCop(c.monthlyRent)}
                </TableCell>
                {/*
                  «Vence»: la fecha de fin y cuánto falta (revisión 21-10), en vez de
                  «inicio → fin» en dos renglones. El inicio queda en el `title`. Un
                  activo con terminación programada lo dice aquí.
                */}
                <TableCell
                  className="px-4 py-4 whitespace-nowrap tabular-nums max-md:order-6 max-md:col-span-2 max-md:block max-md:p-0 max-md:text-caption"
                  title={c.startDate ? `${tx('Desde', 'Since')} ${fmtDate(c.startDate, locale)}` : undefined}
                >
                  {(() => {
                    const { estado } = estadoDeLaFila(c);
                    const fin = c.endDate ? tiempoHastaElFin(c.endDate, locale) : null;
                    return (
                      <>
                        {/* Ronda 17: en la tabla, la fecha corta («1 nov 2026»). */}
                        <span className="text-foreground md:block">{locale === 'en' ? fmtDate(c.endDate, locale) : fechaCorta(c.endDate)}</span>
                        <span className="md:hidden"> · </span>
                        {estado.clave === 'TERMINA' ? (
                          // Ronda 15: «termina hoy» es lo más urgente → rojo, no el mismo naranja de «en 17 días».
                          <span className="text-caption font-medium text-danger md:block">{estado.texto}</span>
                        ) : fin ? (
                          <span
                            className={cn(
                              'text-caption md:block',
                              // Ronda 16: el color es gravedad → rojo hoy, vencido o ≤ 7 días; naranja hasta 30; después neutro.
                              fin.tono === 'vencido' || fin.dias <= 7
                                ? 'font-medium text-danger'
                                : fin.dias <= 30
                                  ? 'font-medium text-warning'
                                  : 'text-muted-foreground',
                            )}
                          >
                            {fin.texto}
                          </span>
                        ) : null}
                      </>
                    );
                  })()}
                </TableCell>
                {conEstado ? (
                <TableCell className="px-4 py-4 max-md:order-2 max-md:block max-md:p-0 max-md:text-right">
                  {/*
                    🔴 El chip lo decide la VIGENCIA, no el estado crudo
                    (auditoría 2026-09-13, N2). Un contrato `active` cuya
                    fecha de fin ya pasó decía «Activo» en verde para
                    siempre, mientras se le seguían generando cobros.
                  */}
                  {(() => {
                    const v = vigenciaDelContrato({
                      status: c.status,
                      endDate: c.endDate,
                      terminadoEn: c.terminadoEn ?? null,
                      startDate: c.startDate ?? null,
                      fechaDeCartera: c.fechaDeCartera ?? null,
                    });
                    /*
                     * C-05 / C-01 (Nico): «Empieza el 1 de nov» y «Activo ·
                     * Termina el 31 de oct», con las mismas palabras que la ficha.
                     */
                    const estado = estadoParaMostrar({
                      contrato: c,
                      vigencia: v,
                      etiquetaDelEstado: CONTRACT_STATUS_LABELS[c.status] ?? c.status,
                      locale,
                    });
                    return (
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                          estado.clave === 'POR_EMPEZAR'
                            ? 'bg-plan-status-blue-bg text-primary'
                            : colorDeVigencia(
                                v,
                                CONTRACT_STATUS_COLORS[c.status] ?? 'bg-muted text-muted-foreground',
                              ),
                        )}
                        title={estado.titulo ?? v.leyenda}
                        data-testid={
                          estado.clave === 'POR_EMPEZAR'
                            ? 'contrato-por-empezar'
                            : v.vencidoSinRenovar
                              ? 'contrato-vencido'
                              : undefined
                        }
                      >
                        {estado.texto}
                      </span>
                    );
                  })()}
                </TableCell>
                ) : null}
                <TableCell className="px-3 py-4 text-right max-md:hidden">
                  <CaretRight className="w-4 h-4 text-muted-foreground inline-block" />
                </TableCell>
              </TableRowAnimada>
            ))}
          </TableBodyAnimado>
        </Table>

        {/* Acciones masivas: el pie de la MISMA tabla donde se marca. */}
        {contracts.length > 0 && (
          <ContratosMarcados
            marcados={contratosMarcados}
            onQuitar={quitarLaSeleccion}
            puedeCompartir={isAdmin || canAccess('cobros', 'view')}
            puedeInvitar={isAdmin || canAccess('contratos', 'create')}
            estadoDe={textoDelEstado}
          />
        )}

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
