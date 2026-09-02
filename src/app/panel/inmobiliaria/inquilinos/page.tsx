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
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowSquareOut,
  Buildings,
  CurrencyDollar,
  Envelope,
  MagnifyingGlass,
  Phone,
  UploadSimple,
  UserCircle,
  Users,
} from '@phosphor-icons/react';
import { SearchInput, SegmentedControl, KpiCard, Eyebrow } from '@leasefy/cadence';

import { PageGuard } from '@/components/auth/PageGuard';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  type ArriendoDeInquilino,
  type EstadoDeArriendo,
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

/** Cómo se pinta cada estado de `LeaseStatus`. Color + palabra, nunca color solo. */
const TONO_DEL_ARRIENDO: Record<
  EstadoDeArriendo,
  { variant: 'success' | 'warning' | 'secondary'; clave: string }
> = {
  ACTIVE: { variant: 'success', clave: 'inquilinos.estados.activo' },
  ENDING_SOON: { variant: 'warning', clave: 'inquilinos.estados.porVencer' },
  ENDED: { variant: 'secondary', clave: 'inquilinos.estados.terminado' },
  TERMINATED: { variant: 'secondary', clave: 'inquilinos.estados.cancelado' },
};

function ContenidoDeInquilinos() {
  const { t, formatCurrency } = useI18n();

  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState<FiltroDeEstado>('activos');
  const [abierto, setAbierto] = useState<Inquilino | null>(null);

  const { inquilinos, cargando, error, refrescar } = useInquilinos({ buscar, estado });

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
          <div className="space-y-3">
            {inquilinos.map((persona) => (
              <TarjetaDeInquilino
                key={persona.tenantId}
                persona={persona}
                onAbrir={() => setAbierto(persona)}
              />
            ))}
          </div>
        )}
      </EstadoDeDatos>

      <FichaDeInquilino persona={abierto} onCerrar={() => setAbierto(null)} />
    </div>
  );
}

/**
 * Una persona con sus arriendos adentro.
 *
 * Se muestran TODOS los que trajo el filtro, no los primeros dos con un «+3
 * más»: la pregunta que trae a alguien a esta pantalla es «¿qué le administro
 * a esta persona?», y esconder la mitad la deja sin responder.
 */
function TarjetaDeInquilino({
  persona,
  onAbrir,
}: {
  persona: Inquilino;
  onAbrir: () => void;
}) {
  const { t } = useI18n();
  const vigentes = arriendosVigentes(persona).length;

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium text-fg">{persona.nombre}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
            {persona.email ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Envelope className="h-4 w-4 shrink-0" />
                <span className="truncate">{persona.email}</span>
              </span>
            ) : null}
            {persona.telefono ? (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-4 w-4 shrink-0" />
                <span className="font-mono tabular-nums">{persona.telefono}</span>
              </span>
            ) : null}
            {/* Sin correo NI teléfono: no es un detalle estético — es a quién
                no se le puede cobrar ni avisar. */}
            {!persona.email && !persona.telefono ? (
              <span className="text-warning">{t('inquilinos.sinContacto')}</span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm text-fg-muted">
            {t(
              persona.arriendos.length === 1
                ? 'inquilinos.conteoArriendoUno'
                : 'inquilinos.conteoArriendos',
              { n: persona.arriendos.length, vigentes },
            )}
          </span>
          <Button variant="outline" size="sm" hideArrow onClick={onAbrir}>
            {t('inquilinos.verFicha')}
          </Button>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {persona.arriendos.map((a) => (
          <li key={a.leaseId}>
            <RenglonDeArriendo arriendo={a} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function RenglonDeArriendo({ arriendo }: { arriendo: ArriendoDeInquilino }) {
  const { t, formatCurrency, formatDate } = useI18n();
  const tono = TONO_DEL_ARRIENDO[arriendo.estado];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-surface-muted px-3 py-2">
      <Badge variant={tono?.variant ?? 'secondary'}>
        {/* Un estado que el back agregue mañana se muestra crudo, no se
            esconde: mejor una etiqueta rara que una fila que miente. */}
        {tono ? t(tono.clave) : arriendo.estado}
      </Badge>

      {arriendo.inmueble ? (
        <Link
          href={`/panel/inmobiliaria/inmuebles/${arriendo.inmueble.id}`}
          className="min-w-0 flex-1 truncate text-sm text-fg hover:text-primary"
        >
          {arriendo.inmueble.address}
          <span className="text-fg-muted"> · {arriendo.inmueble.city}</span>
        </Link>
      ) : (
        /* Pasa de verdad: un contrato migrado sin inmueble asignado. Decirlo
           es lo que hace que alguien lo complete. */
        <span className="min-w-0 flex-1 truncate text-sm text-warning">
          {t('inquilinos.sinInmueble')}
        </span>
      )}

      <span className="font-mono text-sm tabular-nums text-fg">
        {formatCurrency(arriendo.canonCop)}
      </span>
      <span className="font-mono text-xs tabular-nums text-fg-muted">
        {formatDate(arriendo.desde)} — {formatDate(arriendo.hasta)}
      </span>
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
