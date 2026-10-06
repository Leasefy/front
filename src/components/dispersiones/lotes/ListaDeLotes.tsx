'use client';

/**
 * Los lotes de pagos al banco, y el botón para armar el del mes.
 *
 * 🔴 22-09, Nico: «le doy ir a lotes y no aparece nada». Había 317
 * dispersiones de septiembre esperando por $794 M y la pantalla decía
 * «Todavía no hay lotes»: verdad, y nada que hacer con ella. Ahora lo primero
 * es el MES (con `SelectorDeMes`, no un `<input type="month">` que pinta el mes
 * en el idioma del navegador) y una frase con cuántas dispersiones de ese mes
 * esperan lote y por cuánto, con el botón de armarlo ahí mismo. La tabla de
 * lotes sólo aparece cuando hay lotes: un cajón vacío debajo de la frase decía
 * dos veces lo mismo.
 *
 * Un lote reemplaza el «exportar a Excel, pasarlo por el conversor del banco
 * y subir el plano» de cada mes. Acá se ve cada uno con su estado, cuánto
 * suma, cuántos pagos lleva y quién lo armó y lo aprobó. Lo demás —aprobar,
 * generar, descargar, marcar pagado— pasa en el detalle.
 *
 * Armar un lote NO gira nada: toma las dispersiones pendientes del mes y las
 * congela en un borrador. Por eso el botón vive acá sin más ceremonia que una
 * confirmación con el número y el total que va a tomar.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/toast';
import { ArrowRight, Bank, Plus } from '@phosphor-icons/react';
import { Banner, MotionIndicator } from '@leasefy/cadence';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { SelectorDeMes } from '@/components/finanzas/SelectorDeMes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBodyAnimado,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowAnimada,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useLotesDeDispersion } from '@/lib/hooks/use-lotes-de-dispersion';
import { lotesDeDispersionApi, type LoteResumen } from '@/lib/api/lotes-de-dispersion.service';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { formatDateTime } from '@/lib/format';
import { nombreDelMes } from '@/lib/utils/mes';
import { esMesValido, mesActual } from '@/lib/recaudo/meses';
import { cn } from '@/lib/utils';
import { NOMBRE_DEL_ESTADO, TONO_DEL_ESTADO } from './estado-del-lote';
import { useNombresDelEquipo } from './use-nombres-del-equipo';
import { ElegirAQuienPagarle, type EleccionDelLote } from './ElegirAQuienPagarle';
import { ElegirBancoDeOrigen, type EleccionDelBanco } from './ElegirBancoDeOrigen';
import { useI18n } from '@/lib/i18n';
import { APROBADO_POR_TI } from '@/lib/doble-control/el-administrador';

type Filtro = 'todos' | 'en_curso' | 'PAGADO' | 'ANULADO';

const FILTROS: Array<{ id: Filtro; nombre: string }> = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'en_curso', nombre: 'En curso' },
  { id: 'PAGADO', nombre: 'Pagados' },
  { id: 'ANULADO', nombre: 'Anulados' },
];

/**
 * Cuántas dispersiones del mes esperan lote. `candidatos` ya descuenta las que
 * están en un lote vivo, así que es exactamente «lo que falta armar».
 */
interface PendientesDelMes {
  /** Todas las que esperan, se puedan girar o no. */
  esperan: number;
  /** Las que tienen los datos para ir al banco. */
  girables: number;
  totalCop: number;
  /** Las que tienen un dato bancario por completar. */
  sinDatos: number;
  /**
   * 🔴 PG-05: las que no van al archivo, por QUÉ (sin las que se compensan).
   * `null` = un back anterior que no lo dice: queda la frase de siempre.
   */
  porTipo: Partial<Record<'RETENIDA_GIRO_DEVUELTO' | 'RETENIDA_CAMBIO_DE_CUENTA' | 'SIN_CUENTA' | 'DATO_BANCARIO', number>> | null;
}

/** Cuántas de cada exclusión, desde los candidatos (o `null` si el back no lo dice). */
export function exclusionesPorTipo(
  candidatos: readonly { motivoDeExclusion: string | null; seCompensa?: boolean; tipoDeExclusion?: string | null }[],
): PendientesDelMes['porTipo'] {
  const excluidas = candidatos.filter((c) => c.motivoDeExclusion !== null && !c.seCompensa);
  if (excluidas.some((c) => c.tipoDeExclusion === undefined)) return null;
  const cuenta: NonNullable<PendientesDelMes['porTipo']> = {};
  for (const c of excluidas) {
    const tipo = (c.tipoDeExclusion ?? 'DATO_BANCARIO') as keyof NonNullable<PendientesDelMes['porTipo']>;
    if (tipo === ('SE_COMPENSA' as string)) continue;
    cuenta[tipo] = (cuenta[tipo] ?? 0) + 1;
  }
  return cuenta;
}

/** Cada exclusión en palabras: «1 retenida: el banco devolvió el giro anterior…». */
export function frasesDeLasExclusiones(porTipo: NonNullable<PendientesDelMes['porTipo']>): string[] {
  const n = (k: keyof typeof porTipo) => porTipo[k] ?? 0;
  const frases: string[] = [];
  if (n('RETENIDA_GIRO_DEVUELTO') > 0) {
    frases.push(
      `${n('RETENIDA_GIRO_DEVUELTO')} ${n('RETENIDA_GIRO_DEVUELTO') === 1 ? 'retenida' : 'retenidas'}: el banco devolvió el giro anterior y falta aprobar la cuenta`,
    );
  }
  if (n('RETENIDA_CAMBIO_DE_CUENTA') > 0) {
    frases.push(
      `${n('RETENIDA_CAMBIO_DE_CUENTA')} ${n('RETENIDA_CAMBIO_DE_CUENTA') === 1 ? 'retenida' : 'retenidas'}: falta aprobar el cambio de cuenta`,
    );
  }
  if (n('SIN_CUENTA') > 0) {
    frases.push(`${n('SIN_CUENTA')} sin cuenta bancaria registrada`);
  }
  if (n('DATO_BANCARIO') > 0) {
    frases.push(
      `a ${n('DATO_BANCARIO')} ${n('DATO_BANCARIO') === 1 ? 'le falta un dato bancario' : 'les falta un dato bancario'}`,
    );
  }
  return frases;
}

/*
 * Los pasos de un lote (armar → aprobar → descargar → subir al banco → marcar
 * pagado) viven desde el 05-10-2026 en `ComoSaleUnLote.tsx` (`PASOS_DE_UN_LOTE`),
 * detrás del botón «¿Cómo funciona?» del encabezado. Lo que la persona no sabía
 * al entrar —que armar no gira nada y que el archivo lo sube ella al portal del
 * banco— sigue a la vista en la tarjeta del mes (`lote-no-gira-solo`).
 */

function pasaElFiltro(lote: LoteResumen, filtro: Filtro): boolean {
  if (filtro === 'todos') return true;
  if (filtro === 'en_curso') return lote.estado !== 'PAGADO' && lote.estado !== 'ANULADO';
  return lote.estado === filtro;
}

export function ListaDeLotes({ mesInicial }: { mesInicial?: string | null } = {}) {
  const router = useRouter();
  const { canAccess } = usePermissions();
  const { lotes, cargando, error, refetch } = useLotesDeDispersion({});
  const { nombreDe } = useNombresDelEquipo();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  // «Ir a Lotes» desde una dispersión trae su mes en `?mes=`.
  const [mes, setMes] = useState(() => (mesInicial && esMesValido(mesInicial) ? mesInicial : mesActual()));
  const [armando, setArmando] = useState(false);
  const [pendientes, setPendientes] = useState<PendientesDelMes | null>(null);
  const [errorDePendientes, setErrorDePendientes] = useState<string | null>(null);

  // Una firma y no el arreglo: `lotes` puede llegar como arreglo nuevo en cada
  // render, y como dependencia volvería a pedir los candidatos sin parar.
  const firmaDeLotes = lotes.map((l) => `${l.id}:${l.estado}`).join('|');

  useEffect(() => {
    let vigente = true;
    setPendientes(null);
    setErrorDePendientes(null);
    lotesDeDispersionApi
      .candidatos({ month: mes })
      .then((r) => {
        if (!vigente) return;
        const sinDatos = r.candidatos.filter((c) => c.motivoDeExclusion !== null && !c.seCompensa).length;
        setPendientes({
          esperan: r.candidatos.length,
          girables: r.cantidad,
          totalCop: r.totalCop,
          sinDatos,
          porTipo: exclusionesPorTipo(r.candidatos),
        });
      })
      .catch((e: unknown) => {
        // Con la regla de oro (02-10-2026): un 5xx dice «de nuestro lado» con la
        // referencia; «conexión», sólo sin respuesta. Antes iba `e.message` crudo.
        if (vigente) {
          setErrorDePendientes(
            mensajeParaLaPersona(e, {
              porDefecto: 'No se pudieron contar las dispersiones del mes.',
              accion: 'contar las dispersiones del mes',
            }),
          );
        }
      });
    return () => {
      vigente = false;
    };
    // Los lotes cambian cuando se arma o se anula uno: lo que espera también.
  }, [mes, firmaDeLotes]);

  const puedeArmar = canAccess('dispersiones', 'create');
  const visibles = useMemo(() => lotes.filter((l) => pasaElFiltro(l, filtro)), [lotes, filtro]);
  // Un lote por mes y por corrida: la lista crece sola y no tiene techo.
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(visibles, { resetKey: filtro });

  const irAlLote = useCallback(
    (id: string) => router.push(`/panel/inmobiliaria/pagos/dispersiones/lotes/${id}`),
    [router],
  );

  if (cargando && lotes.length === 0 && !error) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (error && lotes.length === 0) {
    return <FalloDeCarga error={error} queEs="los lotes" onReintentar={refetch} />;
  }

  return (
    <div className="space-y-6" data-testid="lista-de-lotes">
      <section
        className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-sm"
        data-testid="mes-de-los-lotes"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SelectorDeMes mes={mes} onCambiar={setMes} testId="mes-del-lote" />
          {puedeArmar && pendientes && pendientes.esperan > 0 && (
            <Button onClick={() => setArmando(true)} hideArrow data-testid="armar-lote-del-mes">
              <Plus className="h-4 w-4" />
              Armar el lote de {nombreDelMes(mes, 'es', 'short')}
            </Button>
          )}
        </div>
        <FraseDelMes mes={mes} pendientes={pendientes} error={errorDePendientes} />
        {/* COMO-FUNCIONA (05-10-2026): los cinco pasos dibujados que iban acá
            se fueron al botón «¿Cómo funciona?» del encabezado (`ComoSaleUnLote`).
            Queda a la vista sólo el aviso de seguridad, como la línea de Portales:
            armar no gira plata y el archivo lo sube una persona al banco. */}
        <p className="text-caption text-fg-muted" data-testid="lote-no-gira-solo">
          Armar el lote <span className="font-medium text-fg">no gira plata</span>: el archivo lo subes tú al
          portal del banco.
        </p>
      </section>

      {lotes.length > 0 && (
      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filtrar por estado">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filtro === f.id}
                onClick={() => setFiltro(f.id)}
                className={cn(
                  'relative isolate rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  filtro === f.id ? 'text-primary-fg' : 'text-fg-muted hover:bg-surface-muted',
                )}
              >
                {/* La píldora del filtro elegido SE DESLIZA al nuevo. */}
                {filtro === f.id ? (
                  <MotionIndicator layoutId="lotes-filtro" className="inset-0 -z-10 rounded-full bg-primary" />
                ) : null}
                {f.nombre}
              </button>
            ))}
          </div>
          <span className="font-mono text-xs text-fg-muted tabular-nums">
            {visibles.length} {visibles.length === 1 ? 'lote' : 'lotes'}
          </span>
        </div>

        {visibles.length === 0 ? (
          <EmptyState
            icon={Bank}
            title="Ningún lote con ese filtro"
            description="Prueba con otro estado."
            action={{ label: 'Ver todos', onClick: () => setFiltro('todos') }}
            className="m-4"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Pagos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Armado por</TableHead>
                  <TableHead>Aprobado por</TableHead>
                  <TableHead>Armado</TableHead>
                  <TableHead className="sr-only">Abrir</TableHead>
                </TableRow>
              </TableHeader>
              {/* Filas escalonadas con techo; cada filtro o página monta un
                  cuerpo nuevo. */}
              <TableBodyAnimado key={`${filtro}|${page}|${pageSize}`}>
                {pageItems.map((lote) => {
                  const enTotal = lote._count?.items ?? lote.cantidad;
                  return (
                    <TableRowAnimada
                      key={lote.id}
                      className="cursor-pointer"
                      onClick={() => irAlLote(lote.id)}
                      data-testid={`lote-${lote.id}`}
                    >
                      <TableCell className="font-medium text-fg">{nombreDelMes(lote.month)}</TableCell>
                      <TableCell>
                        <Badge variant={TONO_DEL_ESTADO[lote.estado]}>{NOMBRE_DEL_ESTADO[lote.estado]}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {lote.cantidad}
                        {enTotal !== lote.cantidad && (
                          <span className="text-fg-muted"> de {enTotal}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-fg">
                        {formatCurrency(lote.totalCop)}
                      </TableCell>
                      <TableCell className="text-fg-muted">{nombreDe(lote.creadoPorUserId, lote.creadoPorNombre)}</TableCell>
                      <TableCell className="text-fg-muted">
                        {lote.aprobadoPorUserId ? nombreDe(lote.aprobadoPorUserId, lote.aprobadoPorNombre) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-fg-muted">
                        {formatDateTime(lote.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" hideArrow onClick={(e) => e.stopPropagation()}>
                          <Link href={`/panel/inmobiliaria/pagos/dispersiones/lotes/${lote.id}`}>
                            Abrir
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRowAnimada>
                  );
                })}
              </TableBodyAnimado>
            </Table>
          </div>
        )}

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
      </div>
      )}

      <ArmarLoteDialog
        abierto={armando}
        mes={mes}
        onCerrar={() => setArmando(false)}
        onArmado={(id) => {
          setArmando(false);
          irAlLote(id);
        }}
      />
    </div>
  );
}

/**
 * La frase del mes: cuántas dispersiones esperan lote y por cuánto.
 *
 * Es UNA frase y no fichas sueltas (el molde de las pantallas del panel): se
 * lee de corrido lo que hay que hacer. Las que tienen un dato bancario por
 * completar se nombran aparte porque entran al lote pero no al archivo.
 */
function FraseDelMes({
  mes,
  pendientes,
  error,
}: {
  mes: string;
  pendientes: PendientesDelMes | null;
  error: string | null;
}) {
  const delMes = nombreDelMes(mes);
  if (error) {
    return (
      <p className="text-sm text-danger" data-testid="frase-del-mes">
        {error}
      </p>
    );
  }
  if (!pendientes) {
    return (
      <p className="flex items-center gap-2 text-sm text-fg-muted" data-testid="frase-del-mes">
        <Spinner size="sm" variant="current" />
        Contando las dispersiones de {delMes}…
      </p>
    );
  }
  if (pendientes.esperan === 0) {
    return (
      <p className="text-sm text-fg-muted" data-testid="frase-del-mes">
        Ninguna dispersión de {delMes} espera lote. Si todavía no las generaste, se generan en{' '}
        <Link href="/panel/inmobiliaria/pagos/dispersiones" className="text-primary underline-offset-4 hover:underline">
          Dispersiones
        </Link>
        .
      </p>
    );
  }
  const { esperan, girables, totalCop, sinDatos } = pendientes;
  return (
    <p className="text-body text-fg" data-testid="frase-del-mes">
      <span className="font-mono tabular-nums">{esperan}</span>{' '}
      {esperan === 1 ? 'dispersión' : 'dispersiones'} de {delMes} {esperan === 1 ? 'espera' : 'esperan'} lote
      {girables > 0 && (
        <>
          : {girables === esperan ? (girables === 1 ? 'se gira' : 'se giran') : (
            <>
              <span className="font-mono tabular-nums">{girables}</span> se pueden girar
            </>
          )}{' '}
          por <span className="font-mono tabular-nums">{formatCurrency(totalCop)}</span>
        </>
      )}
      .
      {sinDatos > 0 && pendientes.porTipo ? (
        /* 🔴 PG-05 (03-10-2026): cada exclusión con su porqué. Paula tiene
           cuenta; su giro anterior fue DEVUELTO y el siguiente queda retenido
           hasta aprobar la cuenta: no es «le falta un dato bancario». */
        <span className="text-fg-muted" data-testid="exclusiones-del-mes">
          {' '}
          No van al archivo del banco (entran al lote): {frasesDeLasExclusiones(pendientes.porTipo).join('; ')}.
        </span>
      ) : sinDatos > 0 ? (
        <span className="text-fg-muted">
          {' '}
          A <span className="font-mono tabular-nums">{sinDatos}</span>{' '}
          {sinDatos === 1 ? 'le falta un dato bancario: entra al lote' : 'les falta un dato bancario: entran al lote'} pero
          no al archivo.
        </span>
      ) : null}
    </p>
  );
}

/**
 * Elegir a quién pagarle y armar el lote.
 *
 * Antes este diálogo sólo contaba las pendientes y armaba el mes entero. El CEO
 * (2026-09-15) pidió lo contrario: varios lotes por mes, eligiendo a quién,
 * ordenando de menor a mayor y cortando por monto, mirando la plata que hay en
 * la cuenta. Toda esa decisión vive en `ElegirAQuienPagarle`; acá quedan el
 * marco y el botón.
 *
 * Sin nadie tildado se arma el MES ENTERO — es el comportamiento de siempre y
 * el que espera quien sólo quiere sacar todo junto—, y el botón lo dice con
 * esas palabras para que nadie lo descubra después.
 */
function ArmarLoteDialog({
  abierto,
  mes,
  onCerrar,
  onArmado,
}: {
  abierto: boolean;
  mes: string;
  onCerrar: () => void;
  onArmado: (loteId: string) => void;
}) {
  const [eleccion, setEleccion] = useState<EleccionDelLote>({
    dispersionIds: [],
    orden: 'MENOR_A_MAYOR',
    totalCop: 0,
    descubiertoCop: 0,
  });
  const [banco, setBanco] = useState<EleccionDelBanco>({ origen: null, listo: false });
  const { t } = useI18n();
  const { isAdmin } = usePermissions();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) setError(null);
  }, [abierto]);

  const elegidos = eleccion.dispersionIds.length;

  const armar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const { lote, excluidos, descubiertoCop, salieronEnUnArchivoAnulado, mismoPaso } = await lotesDeDispersionApi.armar({
        month: mes,
        // Lista vacía = el mes entero. El back rechaza un `[]` explícito
        // justamente para que «ninguno» y «todos» no sean el mismo cuerpo.
        dispersionIds: elegidos > 0 ? eleccion.dispersionIds : undefined,
        orden: eleccion.orden,
        // El banco desde el que se gira: el archivo del lote sale en su formato.
        origen: banco.origen ?? undefined,
      });
      const partes = [`${lote.cantidad} pagos por ${formatCurrency(lote.totalCop)}`];
      if (excluidos.length > 0) {
        partes.push(
          `${excluidos.length} ${excluidos.length === 1 ? 'excluido' : 'excluidos'} por datos bancarios incompletos`,
        );
      }
      if (descubiertoCop > 0) {
        partes.push(`${formatCurrency(descubiertoCop)} salen de plata de la inmobiliaria`);
      }
      /*
       * 🔴 P-4 aclarado (Nico, 24-09): lo que arma el ADMINISTRADOR vuelve del
       * back ya aprobado por él, sin código. Se dice aquí, no se le deja un
       * «pendiente de aprobación» que nunca llega.
       */
      const aprobadoAlArmar = lote.estado === 'APROBADO';
      toast.success(
        aprobadoAlArmar
          ? `Lote de ${nombreDelMes(mes)} armado y aprobado`
          : `Lote de ${nombreDelMes(mes)} armado`,
        {
          description: aprobadoAlArmar
            ? `${partes.join(' · ')}. ${APROBADO_POR_TI}: sin código y en el mismo paso.`
            : `${partes.join(' · ')}.`,
        },
      );
      // Administrador, pero la base todavía no lo admite: que no crea que quedó aprobado.
      if (mismoPaso?.porQueNo === 'FALTA_LA_MIGRACION') toast.warning(mismoPaso.nota);
      // 🔴 Pagos que ya salieron en el archivo de un lote anulado (23-09): el
      // detalle del lote lo muestra con nombres; acá se avisa de una vez.
      const yaSalieron = salieronEnUnArchivoAnulado?.length ?? 0;
      if (yaSalieron > 0) {
        toast.warning(
          t('inmobiliaria.dispersiones.lote.archivoAnulado.alArmar', { n: yaSalieron }),
        );
      }
      onArmado(lote.id);
    } catch (e) {
      setError(mensajeParaLaPersona(e, { porDefecto: 'No se pudo armar el lote.', accion: 'armar el lote' }));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent size="xl" data-testid="dialogo-armar-lote">
        <DialogHeader>
          <DialogTitle>Armar el lote de {nombreDelMes(mes)}</DialogTitle>
          <DialogDescription>
            Elige desde qué banco giras, a quién le pagas y cuánto. Se congelan las dispersiones con los
            datos bancarios de hoy; todavía no se gira nada.
            {isAdmin &&
              ' Como eres administrador, queda aprobado al armarlo, sin código (P-4): en la bitácora queda que fuiste la misma persona.'}
          </DialogDescription>
        </DialogHeader>
        {/* Sin scroll ni relleno propios: el cuerpo del modal ya scrollea
            (dos scrollers anidados se pelean el gesto). */}
        <div className="space-y-5 text-sm">
          {abierto && <ElegirBancoDeOrigen onCambio={setBanco} />}
          {abierto && <ElegirAQuienPagarle mes={mes} onCambio={setEleccion} />}
          {error && <Banner variant="danger">{error}</Banner>}
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={() => void armar()} isLoading={enviando} hideArrow disabled={!banco.listo}>
            {elegidos > 0
              ? `Armar lote con ${elegidos} ${elegidos === 1 ? 'propietario' : 'propietarios'}`
              : 'Armar lote con el mes entero'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
