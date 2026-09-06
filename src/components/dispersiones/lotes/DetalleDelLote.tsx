'use client';

/**
 * Un lote de pagos a propietarios: dónde está, qué se puede hacer y quién
 * lo hizo.
 *
 * ── Lo que esta pantalla se niega a hacer ───────────────────────────────────
 *
 * 1. **Ofrecer un botón que el back va a rechazar.** Las acciones salen de
 *    `accionesPara(estado)`, calcada de los `if` del servicio, y del permiso
 *    de cada una. Un botón que siempre falla enseña a ignorar los errores.
 * 2. **Dejar que quien armó el lote crea que puede aprobarlo.** El back lo
 *    prohíbe; acá se dice antes de que gaste un clic.
 * 3. **Entregar el archivo sin el aviso.** Mientras el layout no esté cotejado
 *    contra un archivo real del banco, el nombre lleva `SIN-VERIFICAR` y acá
 *    se muestra ANTES de guardar. Un giro de mil millones con el layout
 *    equivocado no se corrige después.
 * 4. **Reescribir el error del back.** Sus mensajes dicen por qué y qué hacer
 *    («Código incorrecto. 3 intentos antes de que el lote se bloquee»). Van
 *    tal cual.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/components/ui/toast';
import {
  CaretLeft,
  Check,
  DownloadSimple,
  FileText,
  PaperPlaneTilt,
  Prohibit,
  SealCheck,
  ShieldCheck,
  X,
} from '@phosphor-icons/react';
import { Banner } from '@leasefy/cadence';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';
import { SectionLabel } from '@/components/ui/section-label';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useLoteDeDispersion } from '@/lib/hooks/use-lotes-de-dispersion';
import {
  lotesDeDispersionApi,
  type ArchivoGenerado,
  type FormatoArchivoDePagos,
  type LoteDeDispersion,
  type SolicitudDeAprobacion,
  type VistaDelLote,
} from '@/lib/api/lotes-de-dispersion.service';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { formatDateTime } from '@/lib/format';
import { nombreDelMes } from '@/lib/utils/mes';
import { cn } from '@/lib/utils';
import {
  accionesPara,
  CAMINO_DEL_LOTE,
  codigoValido,
  esSinVerificar,
  FORMATOS,
  guardarArchivo,
  motivoValido,
  NOMBRE_DEL_ESTADO,
  pasoAlcanzado,
  PERMISO_DE_LA_ACCION,
  QUE_SIGUE,
  TONO_DEL_ESTADO,
  type AccionDelLote,
} from './estado-del-lote';
import { useNombresDelEquipo } from './use-nombres-del-equipo';

type Dialogo =
  | 'pedirAprobacion'
  | 'aprobar'
  | 'generarArchivo'
  | 'descargarArchivo'
  | 'marcarPagado'
  | 'anular'
  | null;

function mensajeDe(error: unknown, siNo: string): string {
  return error instanceof Error && error.message ? error.message : siNo;
}

function ultimos4(cuenta: string): string {
  const limpio = cuenta.replace(/\s+/g, '');
  if (limpio.length <= 4) return limpio || '—';
  return `•••• ${limpio.slice(-4)}`;
}

function horaDe(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** Referencia estable mientras el lote no llegó: el hook de paginado corre igual. */
const SIN_PAGOS: LoteDeDispersion['items'] = [];

export interface DetalleDelLoteProps {
  id: string;
  /** Reemplazable en tests: `URL.createObjectURL` no existe en el DOM de prueba. */
  guardar?: (contenido: Blob | string, nombre: string) => void;
}

export function DetalleDelLote({ id, guardar = guardarArchivo }: DetalleDelLoteProps) {
  const { vista, cargando, error, refetch, setVista } = useLoteDeDispersion(id);
  const { canAccess } = usePermissions();
  const { nombreDe, yo } = useNombresDelEquipo();
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  const puede = useCallback(
    (accion: AccionDelLote) => canAccess('dispersiones', PERMISO_DE_LA_ACCION[accion]),
    [canAccess],
  );

  const cerrar = useCallback(() => setDialogo(null), []);

  /** Un lote que vuelve entero del back reemplaza la vista sin volver a pedirla. */
  const aplicarLote = useCallback(
    (lote: LoteDeDispersion) => {
      if (!vista) return;
      setVista({
        ...vista,
        lote,
        excluidos: lote.items
          .filter((i) => i.motivoDeExclusion !== null)
          .map((i) => ({
            propietarioId: i.propietarioId,
            nombre: i.nombreTitular,
            valorCop: i.valorCop,
            motivo: i.motivoDeExclusion as string,
          })),
      });
    },
    [setVista, vista],
  );

  /*
   * Los pagos del lote son uno por propietario: un mes de una inmobiliaria
   * mediana ya son cientos. El hook va acá arriba —antes de los retornos
   * tempranos— porque no se puede llamar condicionalmente.
   */
  const pagos = useTablePagination(vista?.lote.items ?? SIN_PAGOS, { resetKey: id });

  if (cargando && !vista) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (error && !vista) {
    return (
      <FalloDeCarga
        error={error}
        queEs="el lote"
        onReintentar={refetch}
        volverA={{ label: 'Volver a los lotes', href: '/panel/inmobiliaria/pagos/dispersiones/lotes' }}
      />
    );
  }

  if (!vista) return null;

  const { lote, excluidos, intentosRestantes, bloqueado } = vista;
  const acciones = accionesPara(lote.estado).filter(puede);
  const soyElCreador = yo !== null && yo === lote.creadoPorUserId;
  const exigeCodigo = Boolean(lote.codigoHash) || Boolean(lote.codigoExpiraAt);

  return (
    <div className="space-y-6" data-testid="detalle-del-lote" data-estado={lote.estado}>
      <Button asChild variant="ghost" size="sm" hideArrow className="-ml-2">
        <Link href="/panel/inmobiliaria/pagos/dispersiones/lotes">
          <CaretLeft className="h-4 w-4" />
          Lotes al banco
        </Link>
      </Button>

      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <SectionLabel>Finanzas · Lote al banco</SectionLabel>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              Lote de {nombreDelMes(lote.month)}
            </h1>
            <Badge variant={TONO_DEL_ESTADO[lote.estado]} data-testid="estado-del-lote">
              {NOMBRE_DEL_ESTADO[lote.estado]}
            </Badge>
          </div>
          <p className="max-w-2xl text-sm text-fg-muted">{QUE_SIGUE[lote.estado]}</p>
        </div>
        <p className="font-mono text-xs text-fg-muted">
          Lote {lote.id.slice(0, 8)} · armado {formatDateTime(lote.createdAt)}
        </p>
      </header>

      {/* ── Avisos que cambian lo que se puede hacer ────────────────────── */}
      {lote.estado === 'ANULADO' && (
        <Banner variant="danger" title="Lote anulado">
          {lote.motivoDeLaAnulacion ?? 'Sin motivo registrado.'}
          {lote.anuladoAt ? ` — ${formatDateTime(lote.anuladoAt)}` : ''}
        </Banner>
      )}
      {bloqueado && lote.estado !== 'ANULADO' && (
        <Banner variant="danger" title="Lote bloqueado">
          Se agotaron los intentos del código de aprobación. Hay que anularlo y armarlo de nuevo.
        </Banner>
      )}
      {lote.estado === 'ESPERANDO_APROBACION' && soyElCreador && !bloqueado && (
        <Banner variant="info" title="Vos armaste este lote">
          La aprobación la tiene que dar otra persona con permiso de edición sobre dispersiones.
          Es el segundo par de ojos: quien arma un giro no lo aprueba.
        </Banner>
      )}

      {/* ── Línea de tiempo ────────────────────────────────────────────── */}
      <LineaDeTiempo lote={lote} />

      {/* ── Cifras ──────────────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra etiqueta="Total a girar" valor={formatCurrency(lote.totalCop)} destacada />
        <Cifra etiqueta="Pagos en el archivo" valor={String(lote.cantidad)} />
        <Cifra
          etiqueta="Excluidos"
          valor={String(excluidos.length)}
          tono={excluidos.length > 0 ? 'warning' : undefined}
        />
        <Cifra
          etiqueta="Aprobado por"
          valor={lote.aprobadoPorUserId ? nombreDe(lote.aprobadoPorUserId) : 'Nadie todavía'}
          mono={false}
          detalle={lote.aprobadoAt ? formatDateTime(lote.aprobadoAt) : undefined}
        />
      </section>

      {/* ── Acciones ────────────────────────────────────────────────────── */}
      {acciones.length > 0 && (
        <section
          className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-4 shadow-sm"
          data-testid="acciones-del-lote"
        >
          {acciones.includes('pedirAprobacion') && (
            <Button onClick={() => setDialogo('pedirAprobacion')} hideArrow disabled={bloqueado}>
              <PaperPlaneTilt className="h-4 w-4" />
              Pedir aprobación
            </Button>
          )}
          {acciones.includes('aprobar') && (
            <Button
              onClick={() => setDialogo('aprobar')}
              hideArrow
              disabled={soyElCreador || bloqueado}
              title={soyElCreador ? 'Quien arma el lote no puede aprobarlo' : undefined}
            >
              <ShieldCheck className="h-4 w-4" />
              Aprobar
            </Button>
          )}
          {acciones.includes('reenviarCodigo') && (
            <Button
              variant="secondary"
              hideArrow
              onClick={() => setDialogo('pedirAprobacion')}
              disabled={bloqueado}
            >
              Volver a mandar el código
            </Button>
          )}
          {acciones.includes('generarArchivo') && (
            <Button onClick={() => setDialogo('generarArchivo')} hideArrow>
              <FileText className="h-4 w-4" />
              Generar archivo
            </Button>
          )}
          {acciones.includes('descargarArchivo') && (
            <Button onClick={() => setDialogo('descargarArchivo')} hideArrow>
              <DownloadSimple className="h-4 w-4" />
              Descargar archivo
            </Button>
          )}
          {acciones.includes('marcarPagado') && (
            <Button variant="secondary" hideArrow onClick={() => setDialogo('marcarPagado')}>
              <SealCheck className="h-4 w-4" />
              Marcar pagado
            </Button>
          )}
          {acciones.includes('anular') && (
            <Button
              variant="ghost"
              hideArrow
              className="ml-auto text-danger"
              onClick={() => setDialogo('anular')}
            >
              <Prohibit className="h-4 w-4" />
              Anular
            </Button>
          )}
        </section>
      )}

      {/* ── Datos del cierre ────────────────────────────────────────────── */}
      {(lote.formatoArchivo || lote.referenciaBanco) && (
        <section className="grid gap-3 rounded-lg border border-border bg-surface p-4 text-sm shadow-sm sm:grid-cols-3">
          {lote.formatoArchivo && (
            <div>
              <p className="text-xs text-fg-muted">Formato del archivo</p>
              <p className="font-mono text-fg">
                {FORMATOS.find((f) => f.codigo === lote.formatoArchivo)?.nombre ?? lote.formatoArchivo}
              </p>
              {lote.archivoGeneradoAt && (
                <p className="text-xs text-fg-muted">{formatDateTime(lote.archivoGeneradoAt)}</p>
              )}
            </div>
          )}
          {lote.archivoHash && (
            <div className="min-w-0">
              <p className="text-xs text-fg-muted">Hash del archivo</p>
              <p className="truncate font-mono text-xs text-fg" title={lote.archivoHash}>
                {lote.archivoHash}
              </p>
              <p className="text-xs text-fg-muted">Para probar qué se subió al banco.</p>
            </div>
          )}
          {lote.referenciaBanco && (
            <div>
              <p className="text-xs text-fg-muted">Referencia del banco</p>
              <p className="font-mono text-fg">{lote.referenciaBanco}</p>
              {lote.pagadoAt && (
                <p className="text-xs text-fg-muted">Pagado {formatDateTime(lote.pagadoAt)}</p>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Excluidos ───────────────────────────────────────────────────── */}
      {excluidos.length > 0 && (
        <section className="space-y-3" data-testid="excluidos-del-lote">
          <Banner variant="warning" title={`${excluidos.length} ${excluidos.length === 1 ? 'pago no va' : 'pagos no van'} en el archivo`}>
            Les falta un dato bancario o no cuadra con el formato. Corregí la ficha del propietario y
            armá el lote de nuevo para que entren; este lote no los incluye.
          </Banner>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Propietario</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Por qué no entra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {excluidos.map((e) => (
                  <TableRow key={`${e.propietarioId}-${e.nombre}`}>
                    <TableCell className="font-medium text-fg">{e.nombre}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(e.valorCop)}
                    </TableCell>
                    <TableCell className="text-fg-muted">{e.motivo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* ── Los pagos, con los datos congelados ─────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-fg">Pagos del lote</h2>
          <p className="text-xs text-fg-muted">
            Datos bancarios congelados al armar el lote: la plata va adonde se aprobó.
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titular</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Entra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagos.pageItems.map((item) => (
                  <TableRow key={item.id} data-excluido={item.motivoDeExclusion !== null}>
                    <TableCell className="font-medium text-fg">{item.nombreTitular}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.tipoDocumento} {item.documento || '—'}
                    </TableCell>
                    <TableCell>{item.banco || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.tipoDeCuenta ? `${item.tipoDeCuenta} ` : ''}
                      {ultimos4(item.numeroDeCuenta)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(item.valorCop)}
                    </TableCell>
                    <TableCell>
                      {item.motivoDeExclusion === null ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Check className="h-3.5 w-3.5" /> Sí
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-warning">
                          <X className="h-3.5 w-3.5" /> No
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {pagos.shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={pagos.total}
                page={pagos.page}
                pageSize={pagos.pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={pagos.setPage}
                onPageSizeChange={pagos.setPageSize}
              />
            </div>
          )}
        </div>
        <p className="text-xs text-fg-muted">
          Armado por {nombreDe(lote.creadoPorUserId)} · {lote.items.length}{' '}
          {lote.items.length === 1 ? 'pago' : 'pagos'} en total.
        </p>
      </section>

      {/* ── Diálogos ────────────────────────────────────────────────────── */}
      <PedirAprobacionDialog
        abierto={dialogo === 'pedirAprobacion'}
        lote={lote}
        reenvio={lote.estado === 'ESPERANDO_APROBACION'}
        onCerrar={cerrar}
        onListo={(r) => aplicarLote({ ...lote, ...r.lote, items: lote.items })}
      />
      <AprobarDialog
        abierto={dialogo === 'aprobar'}
        lote={lote}
        exigeCodigo={exigeCodigo}
        intentosRestantes={intentosRestantes}
        onCerrar={cerrar}
        onListo={aplicarLote}
        onFallo={() => void refetch()}
      />
      <ArchivoDialog
        abierto={dialogo === 'generarArchivo' || dialogo === 'descargarArchivo'}
        modo={dialogo === 'descargarArchivo' ? 'descargar' : 'generar'}
        lote={lote}
        guardar={guardar}
        onCerrar={cerrar}
        onGenerado={() => void refetch()}
      />
      <MarcarPagadoDialog
        abierto={dialogo === 'marcarPagado'}
        lote={lote}
        onCerrar={cerrar}
        onListo={aplicarLote}
      />
      <AnularDialog abierto={dialogo === 'anular'} lote={lote} onCerrar={cerrar} onListo={aplicarLote} />
    </div>
  );
}

// ── Piezas ──────────────────────────────────────────────────────────────────

function Cifra({
  etiqueta,
  valor,
  detalle,
  destacada = false,
  mono = true,
  tono,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  destacada?: boolean;
  mono?: boolean;
  tono?: 'warning';
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs text-fg-muted">{etiqueta}</p>
      <p
        className={cn(
          'mt-1 truncate font-semibold text-fg',
          destacada ? 'text-2xl' : 'text-lg',
          mono && 'font-mono tabular-nums',
          tono === 'warning' && 'text-warning',
        )}
      >
        {valor}
      </p>
      {detalle && <p className="mt-0.5 text-xs text-fg-muted">{detalle}</p>}
    </div>
  );
}

/**
 * Los cinco pasos del camino, con la fecha en la que cada uno pasó. Un lote
 * anulado se muestra hasta donde llegó, con el paso en el que murió marcado.
 */
function LineaDeTiempo({ lote }: { lote: LoteDeDispersion }) {
  const alcanzado = pasoAlcanzado(lote);
  const anulado = lote.estado === 'ANULADO';
  const fechas: Record<string, string | null> = {
    BORRADOR: lote.createdAt,
    ESPERANDO_APROBACION: null,
    APROBADO: lote.aprobadoAt,
    ARCHIVO_GENERADO: lote.archivoGeneradoAt,
    PAGADO: lote.pagadoAt,
  };

  return (
    <ol
      className="grid grid-cols-5 gap-1 rounded-lg border border-border bg-surface p-4 shadow-sm"
      aria-label="Estado del lote"
      data-testid="linea-de-tiempo"
    >
      {CAMINO_DEL_LOTE.map((estado, i) => {
        const hecho = i < alcanzado || (i === alcanzado && !anulado && estado === 'PAGADO');
        const actual = i === alcanzado;
        const murioAca = anulado && actual;
        const fecha = fechas[estado];
        return (
          <li
            key={estado}
            className="flex min-w-0 flex-col items-center gap-2 text-center"
            aria-current={actual && !anulado ? 'step' : undefined}
            data-paso={estado}
            data-hecho={hecho}
          >
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-mono',
                hecho && 'border-primary bg-primary text-primary-fg',
                actual && !hecho && !murioAca && 'border-primary text-primary',
                murioAca && 'border-danger bg-danger-soft text-danger',
                !hecho && !actual && 'border-border text-fg-muted',
              )}
              aria-hidden="true"
            >
              {hecho ? <Check className="h-3.5 w-3.5" weight="bold" /> : murioAca ? <X className="h-3.5 w-3.5" weight="bold" /> : i + 1}
            </span>
            <span
              className={cn(
                'text-xs leading-tight',
                actual || hecho ? 'font-medium text-fg' : 'text-fg-muted',
              )}
            >
              {NOMBRE_DEL_ESTADO[estado]}
            </span>
            {(hecho || (actual && !anulado)) && fecha && (
              <span className="font-mono text-[10px] text-fg-muted">{formatDateTime(fecha)}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── Diálogos ────────────────────────────────────────────────────────────────

interface DialogoBase {
  abierto: boolean;
  lote: LoteDeDispersion;
  onCerrar: () => void;
}

function PedirAprobacionDialog({
  abierto,
  lote,
  reenvio,
  onCerrar,
  onListo,
}: DialogoBase & { reenvio: boolean; onListo: (r: SolicitudDeAprobacion) => void }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<SolicitudDeAprobacion | null>(null);

  useEffect(() => {
    if (!abierto) {
      setError(null);
      setResultado(null);
    }
  }, [abierto]);

  const pedir = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await lotesDeDispersionApi.solicitarAprobacion(lote.id);
      setResultado(r);
      onListo(r);
      toast.success(reenvio ? 'Código reenviado' : 'Lote enviado a aprobación');
    } catch (e) {
      setError(mensajeDe(e, 'No se pudo mandar el lote a aprobación.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-lg" data-testid="dialogo-pedir-aprobacion">
        <DialogHeader>
          <DialogTitle>{reenvio ? 'Volver a mandar el código' : 'Pedir aprobación'}</DialogTitle>
          <DialogDescription>
            {resultado
              ? 'Listo. Esto es lo que pasó.'
              : `Lote de ${nombreDelMes(lote.month)}: ${lote.cantidad} ${
                  lote.cantidad === 1 ? 'pago' : 'pagos'
                } por ${formatCurrency(lote.totalCop)}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-6 py-4 text-sm">
          {!resultado ? (
            <>
              <p className="text-fg-muted">
                Lo aprueba otra persona con permiso de edición sobre dispersiones. Si el monto supera
                el que la inmobiliaria configuró —o si tiene el PIN prendido para todos los lotes—,
                le llega un código de 6 dígitos por correo que vence a los 10 minutos.
              </p>
              {error && <Banner variant="danger">{error}</Banner>}
            </>
          ) : (
            <div className="space-y-3" data-testid="resultado-de-aprobacion">
              {resultado.exigeCodigo ? (
                <>
                  <Banner variant="info" title="El código salió por correo">
                    {resultado.motivoDelCodigo}
                  </Banner>
                  <div>
                    <p className="text-xs text-fg-muted">Le llegó a</p>
                    <ul className="mt-1 space-y-0.5 font-mono text-fg">
                      {resultado.enviadoA.map((correo) => (
                        <li key={correo}>{correo}</li>
                      ))}
                    </ul>
                  </div>
                  {resultado.expiraAt && (
                    <p className="text-fg-muted">
                      Vale hasta las <span className="font-mono text-fg">{horaDe(resultado.expiraAt)}</span>{' '}
                      ({formatDateTime(resultado.expiraAt)}). Después hay que volver a pedirlo.
                    </p>
                  )}
                </>
              ) : (
                <Banner variant="success" title="No exige código">
                  Está por debajo del monto que pide doble control. Igual lo tiene que aprobar otra
                  persona.
                </Banner>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!resultado ? (
            <>
              <Button variant="outline" hideArrow onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button onClick={() => void pedir()} isLoading={enviando} hideArrow>
                {reenvio ? 'Reenviar código' : 'Mandar a aprobación'}
              </Button>
            </>
          ) : (
            <Button onClick={onCerrar} hideArrow>
              Entendido
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AprobarDialog({
  abierto,
  lote,
  exigeCodigo,
  intentosRestantes,
  onCerrar,
  onListo,
  onFallo,
}: DialogoBase & {
  exigeCodigo: boolean;
  intentosRestantes: number;
  onListo: (lote: LoteDeDispersion) => void;
  /** Un código incorrecto gasta un intento: hay que volver a leer cuántos quedan. */
  onFallo: () => void;
}) {
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) {
      setCodigo('');
      setError(null);
    }
  }, [abierto]);

  const aprobar = async () => {
    if (exigeCodigo && !codigoValido(codigo)) {
      setError('El código son 6 dígitos, tal como llegó en el correo.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const aprobado = await lotesDeDispersionApi.aprobar(lote.id, exigeCodigo ? codigo : undefined);
      onListo(aprobado);
      toast.success('Lote aprobado', {
        description: 'El resumen salió por correo a quien lo armó y a quien lo aprobó.',
      });
      onCerrar();
    } catch (e) {
      // Tal cual: el back dice cuántos intentos quedan, o que se venció.
      setError(mensajeDe(e, 'No se pudo aprobar el lote.'));
      onFallo();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-md" data-testid="dialogo-aprobar">
        <DialogHeader>
          <DialogTitle>Aprobar el lote</DialogTitle>
          <DialogDescription>
            {lote.cantidad} {lote.cantidad === 1 ? 'pago' : 'pagos'} por{' '}
            <span className="font-mono">{formatCurrency(lote.totalCop)}</span>. Al aprobar, se puede
            generar el archivo para el banco.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-6 py-4 text-sm">
          {exigeCodigo ? (
            <div className="space-y-2">
              <Label htmlFor="codigo-de-aprobacion">Código de 6 dígitos</Label>
              <Input
                id="codigo-de-aprobacion"
                data-testid="codigo-de-aprobacion"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="font-mono text-lg tracking-[0.4em]"
                placeholder="000000"
                autoFocus
              />
              <p className="text-xs text-fg-muted">
                Te llegó por correo.{' '}
                <span className="font-mono">{intentosRestantes}</span>{' '}
                {intentosRestantes === 1 ? 'intento' : 'intentos'} antes de que el lote se bloquee.
              </p>
            </div>
          ) : (
            <p className="text-fg-muted">
              Este lote no exige código: está por debajo del monto que pide doble control. Tu
              aprobación es el segundo par de ojos.
            </p>
          )}
          {error && <Banner variant="danger">{error}</Banner>}
        </div>

        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={() => void aprobar()} isLoading={enviando} hideArrow>
            Aprobar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Generar (desde APROBADO) o descargar (desde ARCHIVO_GENERADO) el archivo.
 *
 * Las dos puntas pasan por el POST del back, que devuelve JSON con el aviso
 * del layout, los excluidos y las advertencias — eso se ve ANTES de guardar.
 * Al descargar, el POST además coteja el hash: si el contenido cambió por
 * debajo de un lote cerrado, el back no lo entrega y lo dice.
 */
function ArchivoDialog({
  abierto,
  modo,
  lote,
  guardar,
  onCerrar,
  onGenerado,
}: DialogoBase & {
  modo: 'generar' | 'descargar';
  guardar: (contenido: Blob | string, nombre: string) => void;
  onGenerado: () => void;
}) {
  const [formato, setFormato] = useState<FormatoArchivoDePagos>(
    lote.formatoArchivo ?? 'BANCOLOMBIA_PAB',
  );
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<ArchivoGenerado | null>(null);

  const pedirAlBack = useCallback(async () => {
    setTrabajando(true);
    setError(null);
    try {
      const r = await lotesDeDispersionApi.generarArchivo(
        lote.id,
        modo === 'generar' ? formato : undefined,
      );
      setArchivo(r);
      if (!r.reenvio) onGenerado();
    } catch (e) {
      setError(mensajeDe(e, 'No se pudo generar el archivo.'));
    } finally {
      setTrabajando(false);
    }
  }, [formato, lote.id, modo, onGenerado]);

  useEffect(() => {
    if (!abierto) {
      setError(null);
      setArchivo(null);
      setTrabajando(false);
      return;
    }
    // Al descargar no hay nada que elegir: se pide el archivo de una.
    if (modo === 'descargar') void pedirAlBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, modo]);

  const guardarEnElEscritorio = async () => {
    if (!archivo) return;
    setTrabajando(true);
    try {
      // Tal cual se sube al banco: los bytes del GET, no el JSON.
      const blob = await lotesDeDispersionApi.descargarArchivo(lote.id);
      guardar(blob, archivo.nombreArchivo);
      toast.success('Archivo guardado', { description: archivo.nombreArchivo });
    } catch (e) {
      setError(mensajeDe(e, 'No se pudo descargar el archivo.'));
    } finally {
      setTrabajando(false);
    }
  };

  const sinVerificar = archivo ? esSinVerificar(archivo.nombreArchivo) || !archivo.layoutVerificado : false;

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-xl" data-testid="dialogo-archivo">
        <DialogHeader>
          <DialogTitle>{modo === 'generar' ? 'Generar el archivo plano' : 'Descargar el archivo'}</DialogTitle>
          <DialogDescription>
            Lote de {nombreDelMes(lote.month)} · {lote.cantidad} {lote.cantidad === 1 ? 'pago' : 'pagos'} por{' '}
            <span className="font-mono">{formatCurrency(lote.totalCop)}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4 text-sm">
          {!archivo && modo === 'generar' && (
            <div role="radiogroup" aria-label="Formato del archivo" className="space-y-2">
              {FORMATOS.map((f) => {
                const elegido = formato === f.codigo;
                return (
                  <button
                    key={f.codigo}
                    type="button"
                    role="radio"
                    aria-checked={elegido}
                    disabled={!f.disponible}
                    data-testid={`formato-${f.codigo}`}
                    onClick={() => setFormato(f.codigo)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                      elegido ? 'border-primary bg-primary-soft/40' : 'border-border',
                      f.disponible ? 'hover:border-primary/40' : 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                        elegido ? 'border-primary' : 'border-border',
                      )}
                      aria-hidden="true"
                    >
                      {elegido && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-fg">{f.nombre}</span>
                      <span className="block text-xs text-fg-muted">{f.descripcion}</span>
                      {!f.disponible && (
                        <span className="mt-1 block text-xs text-warning">{f.porQueNo}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!archivo && modo === 'descargar' && !error && (
            <p className="flex items-center gap-2 text-fg-muted">
              <Spinner size="sm" variant="current" />
              Pidiendo el archivo y cotejando el hash…
            </p>
          )}

          {archivo && (
            <div className="space-y-3" data-testid="archivo-listo">
              {sinVerificar ? (
                <div className="space-y-2">
                  <Banner variant="danger" title="Este layout no se verificó contra un archivo real del banco">
                    Revisalo antes de subirlo. El nombre del archivo lleva{' '}
                    <span className="font-mono">SIN-VERIFICAR</span> para que el aviso viaje hasta el
                    escritorio.
                  </Banner>
                  {archivo.pendienteDeConfirmar.length > 0 && (
                    <div className="rounded-lg border border-border bg-surface-muted p-3">
                      <p className="text-xs font-medium text-fg">Qué falta confirmar contra el banco</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-fg-muted">
                        {archivo.pendienteDeConfirmar.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <Banner variant="success" title="Layout verificado contra un archivo real del banco">
                  El archivo se puede subir tal cual.
                </Banner>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-fg-muted">Archivo</p>
                  <p className="break-all font-mono text-xs text-fg" data-testid="nombre-del-archivo">
                    {archivo.nombreArchivo}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-fg-muted">Pagos</p>
                  <p className="font-mono text-fg">
                    {archivo.cantidad} · {formatCurrency(archivo.totalCop)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-fg-muted">Hash</p>
                  <p className="truncate font-mono text-xs text-fg" title={archivo.hash}>
                    {archivo.hash}
                  </p>
                </div>
              </div>

              {archivo.excluidos.length > 0 && (
                <div className="space-y-2">
                  <Banner
                    variant="warning"
                    title={`${archivo.excluidos.length} ${archivo.excluidos.length === 1 ? 'pago quedó' : 'pagos quedaron'} afuera del archivo`}
                  >
                    Les falta un dato o no cuadra con el formato. Se pagan aparte o en el próximo lote.
                  </Banner>
                  <ul className="space-y-0.5 rounded-lg border border-border p-3 text-xs text-fg-muted">
                    {archivo.excluidos.map((e) => (
                      <li key={`${e.propietarioId}-${e.nombre}`}>
                        <span className="font-medium text-fg">{e.nombre}</span> — {e.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {archivo.advertencias.length > 0 && (
                <div className="rounded-lg border border-border bg-surface-muted p-3">
                  <p className="text-xs font-medium text-fg">Advertencias</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-fg-muted">
                    {archivo.advertencias.map((a, i) => (
                      <li key={`${i}-${a}`}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {error && <Banner variant="danger">{error}</Banner>}
        </div>

        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={trabajando}>
            {archivo ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!archivo && modo === 'generar' && (
            <Button onClick={() => void pedirAlBack()} isLoading={trabajando} hideArrow>
              <FileText className="h-4 w-4" />
              Generar
            </Button>
          )}
          {archivo && (
            <Button onClick={() => void guardarEnElEscritorio()} isLoading={trabajando} hideArrow>
              <DownloadSimple className="h-4 w-4" />
              Guardar archivo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarcarPagadoDialog({
  abierto,
  lote,
  onCerrar,
  onListo,
}: DialogoBase & { onListo: (lote: LoteDeDispersion) => void }) {
  const [referencia, setReferencia] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) {
      setReferencia('');
      setError(null);
    }
  }, [abierto]);

  const marcar = async () => {
    if (!referencia.trim()) {
      setError('Hace falta la referencia con la que el banco confirmó el pago.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const pagado = await lotesDeDispersionApi.marcarPagado(lote.id, referencia);
      onListo(pagado);
      toast.success('Lote marcado como pagado');
      onCerrar();
    } catch (e) {
      setError(mensajeDe(e, 'No se pudo marcar el lote como pagado.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-md" data-testid="dialogo-pagado">
        <DialogHeader>
          <DialogTitle>Marcar el lote como pagado</DialogTitle>
          <DialogDescription>
            Cuando el banco confirme que giró los {lote.cantidad} pagos por{' '}
            <span className="font-mono">{formatCurrency(lote.totalCop)}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 px-6 py-4 text-sm">
          <Label htmlFor="referencia-del-banco">Referencia del banco</Label>
          <Input
            id="referencia-del-banco"
            data-testid="referencia-del-banco"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            maxLength={120}
            placeholder="BC-20260907-00123"
            className="font-mono"
            autoFocus
          />
          <p className="text-xs text-fg-muted">
            Un lote pagado ya no se anula: si algo salió mal, se corrige con una contrapartida.
          </p>
          {error && <Banner variant="danger">{error}</Banner>}
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={() => void marcar()} isLoading={enviando} hideArrow>
            <SealCheck className="h-4 w-4" />
            Marcar pagado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnularDialog({
  abierto,
  lote,
  onCerrar,
  onListo,
}: DialogoBase & { onListo: (lote: LoteDeDispersion) => void }) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) {
      setMotivo('');
      setError(null);
    }
  }, [abierto]);

  const anular = async () => {
    if (!motivoValido(motivo)) {
      setError('Decí por qué se anula, en 5 a 300 caracteres. Sin motivo no se anula.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const anulado = await lotesDeDispersionApi.anular(lote.id, motivo);
      onListo(anulado);
      toast.success('Lote anulado', {
        description: 'Sus dispersiones quedaron libres para entrar en otro lote.',
      });
      onCerrar();
    } catch (e) {
      setError(mensajeDe(e, 'No se pudo anular el lote.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-md" data-testid="dialogo-anular">
        <DialogHeader>
          <DialogTitle>Anular el lote</DialogTitle>
          <DialogDescription>
            Las {lote.items.length} dispersiones vuelven a quedar libres. El lote queda registrado como
            anulado, con el motivo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 px-6 py-4 text-sm">
          <Label htmlFor="motivo-de-anulacion">Por qué se anula</Label>
          <Textarea
            id="motivo-de-anulacion"
            data-testid="motivo-de-anulacion"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Dos propietarios cambiaron de cuenta después de armar el lote"
            autoFocus
          />
          {error && <Banner variant="danger">{error}</Banner>}
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => void anular()} isLoading={enviando} hideArrow>
            <Prohibit className="h-4 w-4" />
            Anular lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
