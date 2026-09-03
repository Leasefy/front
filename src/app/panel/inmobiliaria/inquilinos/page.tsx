'use client';

/**
 * Inquilinos — la sección que no existía.
 *
 * «Yo ni siquiera tengo sección de inquilinos» (reunión del 2026-08-31). Había
 * propietarios; el inquilino sólo se veía como un campo adentro de un
 * candidato o de un contrato, así que no había dónde buscarlo ni cómo saber
 * cuántos inmuebles tiene.
 *
 * ── Tres decisiones que la pantalla toma a propósito ────────────────────────
 *
 * 1. **La fila es una PERSONA, no un arriendo.** El back agrupa por `tenantId`
 *    y acá se respeta: alguien con dos inmuebles aparece una vez, con los dos
 *    adentro. Dos filas con el mismo nombre y sin decir por qué es cómo se
 *    termina llamando dos veces al mismo inquilino.
 * 2. **No hay «Agregar inquilino».** Un inquilino nace de un contrato o de la
 *    migración; el back ni siquiera expone un POST. Un botón que abre un
 *    formulario acá crearía gente sin arriendo y la lista dejaría de
 *    significar «a quién le administro un inmueble». El vacío ofrece las dos
 *    salidas reales: migrar o crear el contrato.
 * 3. **La búsqueda viaja al back.** Ver `use-inquilinos.ts`.
 *
 * ── Y una cuarta, del 2026-09-02 ────────────────────────────────────────────
 * 4. **Es una TABLA, no tarjetas** (Nico: «mejor en una tabla como las otras
 *    que tenemos, con toda la información que tienes igual, y con
 *    paginación»). La fila sigue siendo una persona; lo que la tarjeta
 *    mostraba anidado —cada arriendo con su estado, canon y vigencia— vive en
 *    las columnas cuando hay uno solo, y se despliega cuando hay varios. Ver
 *    `InquilinosTable`.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowSquareOut,
  Buildings,
  CurrencyDollar,
  MagnifyingGlass,
  UploadSimple,
  UserCircle,
  Users,
} from '@phosphor-icons/react';
import { SearchInput, SegmentedControl, KpiCard, Eyebrow } from '@leasefy/cadence';

import { PageGuard } from '@/components/auth/PageGuard';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { Button } from '@/components/ui/button';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination } from '@/lib/hooks/use-table-pagination';
import { InquilinosTable, RenglonDeArriendo } from '@/components/inmobiliaria/InquilinosTable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import { useInquilinos } from '@/lib/hooks/use-inquilinos';
import {
  arriendosVigentes,
  type FiltroDeEstado,
  type Inquilino,
} from '@/lib/api/inquilinos.service';

export default function InquilinosPage() {
  /*
   * `contratos`, que es el permiso con el que el back protege estos dos GET
   * (`@RequirePermission('contratos', 'view')`). Y por `view`, nunca por una
   * acción de escritura: `canAccess()` en false también es lo que devuelve
   * mientras el servicio de permisos no contesta, y el guard REDIRIGE — con
   * una acción más estricta la pantalla desaparecería para todos cada vez que
   * ese servicio esté caído.
   */
  return (
    <PageGuard module="contratos">
      <ContenidoDeInquilinos />
    </PageGuard>
  );
}

function ContenidoDeInquilinos() {
  const { t, formatCurrency } = useI18n();

  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState<FiltroDeEstado>('activos');
  const [abierto, setAbierto] = useState<Inquilino | null>(null);

  const { inquilinos, cargando, error, refrescar } = useInquilinos({ buscar, estado });

  /*
   * Paginación en el cliente: la lista viene entera del back (una fila por
   * persona, sin `page`), igual que propietarios y el portafolio. `resetKey`
   * la manda a la página 1 cuando cambia el filtro — si no, filtrar desde la
   * página 3 deja la tabla en blanco.
   */
  const { pageItems, total, page, pageSize, setPage, setPageSize } = useTablePagination(
    inquilinos,
    { initialPageSize: 10, resetKey: `${buscar}|${estado}` },
  );

  const totales = useMemo(() => {
    const vigentes = inquilinos.flatMap(arriendosVigentes);
    return {
      personas: inquilinos.length,
      vigentes: vigentes.length,
      canon: vigentes.reduce((suma, a) => suma + a.canonCop, 0),
    };
  }, [inquilinos]);

  const hayFiltros = buscar.trim().length > 0 || estado !== 'activos';

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="space-y-1">
        <Eyebrow>{t('inquilinos.eyebrow')}</Eyebrow>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {t('inquilinos.titulo')}
        </h1>
        <p className="max-w-2xl text-sm text-fg-muted">{t('inquilinos.subtitulo')}</p>
      </header>

      {/* Los tres números miden lo VIGENTE, no lo histórico: un canon que suma
          contratos terminados no es plata que entra este mes. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label={t('inquilinos.kpi.personas')}
          value={String(totales.personas)}
          icon={<Users />}
        />
        <KpiCard
          label={t('inquilinos.kpi.arriendosVigentes')}
          value={String(totales.vigentes)}
          icon={<Buildings />}
        />
        <KpiCard
          label={t('inquilinos.kpi.canonVigente')}
          value={formatCurrency(totales.canon)}
          icon={<CurrencyDollar />}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          onClear={() => setBuscar('')}
          placeholder={t('inquilinos.buscarPlaceholder')}
          inputSize="md"
          className="w-full sm:w-80"
        />
        <SegmentedControl<FiltroDeEstado>
          value={estado}
          onChange={setEstado}
          aria-label={t('inquilinos.filtroEstado')}
          options={[
            { value: 'activos', label: t('inquilinos.filtros.activos') },
            { value: 'terminados', label: t('inquilinos.filtros.terminados') },
            { value: 'todos', label: t('inquilinos.filtros.todos') },
          ]}
        />
      </div>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        queEs={t('inquilinos.queEs')}
        onReintentar={refrescar}
      >
        {inquilinos.length === 0 ? (
          <SinDatos
            hayFiltros={hayFiltros}
            queSon={t('inquilinos.queSon')}
            icono={UserCircle}
            descripcion={t('inquilinos.vacioDescripcion')}
            onLimpiarFiltros={
              hayFiltros
                ? () => {
                    setBuscar('');
                    setEstado('activos');
                  }
                : undefined
            }
            /*
             * No hay «crear»: un inquilino nace de un contrato o de la
             * migración, y el back ni siquiera expone un POST. Ofrecer un
             * formulario acá crearía gente sin arriendo.
             *
             * 🔴 Y el segundo botón NO puede ser `/contratos/nuevo`: esa ruta
             * sin `?applicationId=` responde «Falta el parámetro
             * applicationId» —un contrato nace de una postulación aprobada—.
             * Sería un botón que lleva a un error. Las dos salidas reales para
             * quien todavía no tiene inquilinos son las dos migraciones.
             */
            accion={
              hayFiltros ? undefined : (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button asChild hideArrow>
                    <Link href="/panel/inmobiliaria/migracion/terceros?tipo=inquilinos">
                      <UploadSimple className="mr-1.5 h-4 w-4" />
                      {t('inquilinos.vacioMigrar')}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" hideArrow>
                    <Link href="/panel/inmobiliaria/contratos/migrar">
                      {t('inquilinos.vacioContrato')}
                    </Link>
                  </Button>
                </div>
              )
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <InquilinosTable inquilinos={pageItems} onVerFicha={setAbierto} />
            {/* El pie sólo aparece cuando hay más de una página: un paginador
                sobre 3 filas es ruido. */}
            {total > pageSize && (
              <div className="border-t border-border bg-muted/10 px-4 py-3">
                <TablePagination
                  total={total}
                  page={page}
                  pageSize={pageSize}
                  pageSizeOptions={[10, 20, 50]}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </div>
        )}
      </EstadoDeDatos>

      <FichaDeInquilino persona={abierto} onCerrar={() => setAbierto(null)} />
    </div>
  );
}

/**
 * La ficha.
 *
 * Muestra TODOS los arriendos, incluidos los terminados — el back resuelve
 * `GET /:tenantId` con `estado: 'todos'`. Abrirla desde «activos» y no ver el
 * contrato del año pasado sería esconder justo lo que se vino a buscar.
 */
function FichaDeInquilino({
  persona,
  onCerrar,
}: {
  persona: Inquilino | null;
  onCerrar: () => void;
}) {
  const { t, formatCurrency } = useI18n();

  if (!persona) return null;

  const vigentes = arriendosVigentes(persona);
  const canon = vigentes.reduce((suma, a) => suma + a.canonCop, 0);

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{persona.nombre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Dato etiqueta={t('inquilinos.ficha.correo')} valor={persona.email} />
          <Dato etiqueta={t('inquilinos.ficha.telefono')} valor={persona.telefono} mono />
          <Dato
            etiqueta={t('inquilinos.ficha.canonVigente')}
            valor={formatCurrency(canon)}
            mono
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-fg">
            {t('inquilinos.ficha.arriendos', { n: persona.arriendos.length })}
          </p>
          <ul className="space-y-2">
            {persona.arriendos.map((a) => (
              <li key={a.leaseId} className="space-y-1">
                <RenglonDeArriendo arriendo={a} />
                <Link
                  href={`/panel/inmobiliaria/contratos/${a.contractId}`}
                  className="inline-flex items-center gap-1 px-3 text-xs text-primary hover:underline"
                >
                  {t('inquilinos.ficha.verContrato')}
                  <ArrowSquareOut className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" hideArrow>
            <Link href={`/panel/inmobiliaria/cobros?buscar=${encodeURIComponent(persona.nombre)}`}>
              <MagnifyingGlass className="mr-1.5 h-4 w-4" />
              {t('inquilinos.ficha.verCobros')}
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Dato({
  etiqueta,
  valor,
  mono,
}: {
  etiqueta: string;
  valor: string | null;
  mono?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border-faint pb-2">
      <span className="text-sm text-fg-muted">{etiqueta}</span>
      <span
        className={
          valor
            ? `text-sm text-fg${mono ? ' font-mono tabular-nums' : ''}`
            : 'text-sm text-fg-subtle'
        }
      >
        {/* «—» diría que el dato es vacío; «no registrado» dice que nadie lo
            cargó, que es lo que hay que arreglar. */}
        {valor || t('inquilinos.ficha.sinDato')}
      </span>
    </div>
  );
}
