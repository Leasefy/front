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
 * 3. **Entregar el archivo sin el aviso.** Mientras nadie haya subido un
 *    archivo de ese formato al banco y visto que lo acepta, el nombre lleva
 *    `SIN-VERIFICAR` y acá se muestra ANTES de guardar. Un giro de mil
 *    millones con el layout equivocado no se corrige después.
 * 5. **Dejar elegir el formato al final.** Es el del banco elegido al armar
 *    el lote (Nico, 22-09): el archivo de un lote que otra persona aprobó para
 *    girar desde Bancolombia no puede salir con el layout de otro banco.
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
import { Checkbox } from '@/components/ui/checkbox';
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
  type ExtractosDeLosCompensados,
  type FacturacionDelLote,
  type LoteDeDispersion,
  type OrigenDelLote,
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
  guardarArchivo,
  motivoValido,
  NOMBRE_DEL_ESTADO,
  NOMBRE_DEL_FORMATO,
  pasoAlcanzado,
  PERMISO_DE_LA_ACCION,
  QUE_SIGUE,
  TONO_DEL_ESTADO,
  type AccionDelLote,
} from './estado-del-lote';
import { useNombresDelEquipo } from './use-nombres-del-equipo';
import { ArchivoDelLote, useArchivoDelLote } from './ArchivoDelLote';
import { descargarArchivoDelProceso } from '@/components/procesos/descargar-archivo-del-proceso';
import {
  AccionesDelGiro,
  MarcarDevueltoDialog,
  RegirarDialog,
  useGirosDevueltos,
} from './GirosDevueltos';
import { BitacoraDelRecurso } from '@/components/movimientos/BitacoraDelRecurso';
import { LoteEnWompi, useLoteEnWompi } from './LoteEnWompi';
import { AvisoDeArchivoAnulado } from './AvisoDeArchivoAnulado';
import { useI18n } from '@/lib/i18n';

type Dialogo =
  | 'pedirAprobacion'
  | 'aprobar'
  | 'generarArchivo'
  | 'marcarPagado'
  | 'anular'
  | null;

/**
 * 🔴 QUÉ PASÓ CON LA FACTURA AL PROPIETARIO.
 *
 * El CEO (2026-09-15): «archivo plano por banco, egreso, **factura ahora o
 * después**, correo al propietario». Hasta la segunda vuelta la casilla
 * guardaba un booleano y no emitía nada; ahora emite de verdad, y el resultado
 * tiene que verse acá y no en otra pantalla.
 *
 * Dos cosas que este bloque dice en voz alta y no se pueden suavizar:
 *
 *  · **Un fallo NO deshace el pago.** La plata ya salió del banco; el lote
 *    quedó PAGADO. Lo que falta es emitir, y se reintenta desde Facturación.
 *  · **«Ya estaban» no es un error.** Es la llave única de facturas haciendo
 *    su trabajo: nadie facturó dos veces la misma comisión.
 */
function ResultadoDeLaFacturacion({ r }: { r: FacturacionDelLote }) {
  if (!r.pedida) {
    if (r.candidatas === 0) return null;
    return (
      <Banner variant="info" title="La factura al propietario queda para después">
        <span data-testid="facturacion-del-lote-despues">
          {r.candidatas}{' '}
          {r.candidatas === 1 ? 'prefactura queda' : 'prefacturas quedan'}{' '}
          esperando en Facturación: es la comisión de la inmobiliaria sobre lo
          que este lote giró. Se emiten desde{' '}
          <Link
            href="/panel/inmobiliaria/facturacion"
            className="underline underline-offset-2"
          >
            Facturación
          </Link>
          .
        </span>
      </Banner>
    );
  }

  const hayFallas = r.fallas.length > 0;
  return (
    <Banner
      variant={hayFallas ? 'warning' : 'success'}
      title={
        hayFallas
          ? 'El lote quedó pagado; falta emitir parte de la facturación'
          : 'Facturación al propietario emitida'
      }
    >
      <div className="space-y-1" data-testid="facturacion-del-lote">
        <p>
          {r.emitidas}{' '}
          {r.emitidas === 1 ? 'factura emitida' : 'facturas emitidas'} por{' '}
          {formatCurrency(r.totalCop)}
          {r.yaEstaban > 0 &&
            ` · ${r.yaEstaban} ya ${r.yaEstaban === 1 ? 'estaba' : 'estaban'} emitida${r.yaEstaban === 1 ? '' : 's'}`}
          {r.sinNumero > 0 && ` · ${r.sinNumero} sin número`}
          {r.candidatas > 0 && ` · de ${r.candidatas}`}
        </p>
        {r.numeros.length > 0 && (
          <p className="font-mono text-xs text-fg-muted">
            {r.numeros.slice(0, 8).join(' · ')}
            {r.numeros.length > 8 && ` +${r.numeros.length - 8}`}
          </p>
        )}
        {hayFallas && (
          <ul className="space-y-0.5">
            {r.fallas.map((f) => (
              <li key={`${f.mes}-${f.motivo}`} data-testid={`falla-${f.mes}`}>
                {nombreDelMes(f.mes)}: {f.motivo}
              </li>
            ))}
          </ul>
        )}
        {hayFallas && (
          <p className="text-fg-muted">
            La plata ya salió del banco y el lote quedó PAGADO: lo que falta es
            emitir, y se reintenta desde{' '}
            <Link
              href="/panel/inmobiliaria/facturacion"
              className="underline underline-offset-2"
            >
              Facturación
            </Link>
            .
          </p>
        )}
      </div>
    </Banner>
  );
}

/**
 * 🔴 EL EXTRACTO A LOS QUE SE CERRARON EN $0.
 *
 * Nico y Juan Camilo (2026-09-16): el mes en que no se le gira nada, al
 * propietario se le factura la administración igual y se le manda su extracto
 * con las deducciones. Si alguno no salió, se dice a quién y por qué: el lote
 * quedó pagado y el extracto se reenvía desde su ficha.
 */
function ResultadoDeLosExtractos({ r }: { r: ExtractosDeLosCompensados }) {
  if (r.compensados === 0) return null;
  const hayFallas = r.fallas.length > 0;
  return (
    <Banner
      variant={hayFallas ? 'warning' : 'success'}
      title={
        hayFallas
          ? 'No a todos los que quedaron en $0 les salió el extracto'
          : r.enviados === 1
            ? 'Al propietario que quedó en $0 le salió su extracto'
            : `A los ${r.enviados} propietarios que quedaron en $0 les salió su extracto`
      }
    >
      <div className="space-y-1" data-testid="extractos-de-compensados">
        <p>
          {r.enviados} de {r.compensados}{' '}
          {r.compensados === 1 ? 'extracto enviado' : 'extractos enviados'}, con
          el detalle de las deducciones que explican por qué este mes no se les
          giró nada.
        </p>
        {hayFallas && (
          <ul className="space-y-0.5">
            {r.fallas.map((f) => (
              <li key={f.propietarioId} data-testid={`extracto-fallido-${f.propietarioId}`}>
                <span className="font-medium">{f.nombre}</span>: {f.motivo}
              </li>
            ))}
          </ul>
        )}
        {hayFallas && (
          <p className="text-fg-muted">
            El lote quedó PAGADO igual. El extracto se reenvía desde la ficha de
            cada propietario.
          </p>
        )}
      </div>
    </Banner>
  );
}

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
  /*
   * 🔴 Giros devueltos (contrato del 17-09, §8). El banco sólo puede devolver
   * plata que YA salió, así que la columna aparece cuando el lote está PAGADO.
   * La lectura falla abierto: si no hay migración o la petición se cae, el
   * detalle del lote se ve entero y sin la columna.
   */
  const [giroEnDialogo, setGiroEnDialogo] = useState<{
    accion: 'devolver' | 'regirar';
    dispersionId: string;
    nombreTitular: string;
    valorCop: number;
  } | null>(null);

  const puede = useCallback(
    (accion: AccionDelLote) => canAccess('dispersiones', PERMISO_DE_LA_ACCION[accion]),
    [canAccess],
  );

  const cerrar = useCallback(() => setDialogo(null), []);

  /** Un lote que vuelve entero del back reemplaza la vista sin volver a pedirla. */
  const aplicarLote = useCallback(
    (lote: LoteDeDispersion) => {
      if (!vista) return;
      // Las compensadas no cambian dentro de un lote: se reconocen por la
      // dispersión, no por el texto del motivo.
      const compensadas = new Set((vista.compensados ?? []).map((c) => c.dispersionId));
      setVista({
        ...vista,
        lote,
        excluidos: lote.items
          .filter((i) => i.motivoDeExclusion !== null && !compensadas.has(i.dispersionId))
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

  /*
   * 🔴 El archivo vive en el CENTRO DE PROCESOS (Nico, 22-09: «ese diseño de
   * carga de lotes es horrible»). «Descargar archivo» ya no abre un diálogo
   * con un spinner: baja la copia del centro, y si no la hay la vuelve a
   * preparar —cotejando el hash— como un proceso más. Antes de los returns
   * tempranos: es un hook.
   */
  const archivoDelLote = useArchivoDelLote(id, vista?.lote.estado ?? 'BORRADOR', guardar);

  // Igual que el de arriba: antes de los returns tempranos, porque un hook no
  // se puede llamar condicionalmente.
  const lotePagado = vista?.lote.estado === 'PAGADO';
  const giros = useGirosDevueltos(lotePagado);
  /*
   * 🔴 Wompi · Pagos a terceros (23-09). Falla abierto: si la lectura falla,
   * `wompi.vista` queda en `null` y el lote sigue por archivo como siempre.
   */
  const wompi = useLoteEnWompi(id, vista?.lote.estado ?? 'BORRADOR');
  // El contrato pide `dispersiones:edit` para marcar devuelto y para regirar.
  const puedeTocarGiros = canAccess('dispersiones', 'edit');

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
  const compensados = vista.compensados ?? [];
  const idsCompensados = new Set(compensados.map((c) => c.dispersionId));
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
      {/* 🔴 Sólo aparece después de marcar pagado en esta sesión: `facturacion`
          viene únicamente en la respuesta de `POST /:id/pagado`, nunca en el
          `ver`. Que no esté no significa que no se facturó — significa que esta
          pantalla no lo presenció. */}
      {lote.facturacion && (
        <ResultadoDeLaFacturacion r={lote.facturacion} />
      )}
      {lote.extractosDeCompensados && (
        <ResultadoDeLosExtractos r={lote.extractosDeCompensados} />
      )}
      {lote.estado === 'ESPERANDO_APROBACION' && soyElCreador && !bloqueado && (
        <Banner variant="info" title="Tú armaste este lote">
          La aprobación la tiene que dar otra persona con permiso de edición sobre dispersiones.
          Es el segundo par de ojos: quien arma un giro no lo aprueba.
        </Banner>
      )}

      {lote.estado !== 'ANULADO' && (
        <AvisoDeArchivoAnulado pagos={vista.salieronEnUnArchivoAnulado} />
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
            /* Con Wompi listo para este lote, la acción principal es «Enviar a
               Wompi» (abajo) y el archivo queda como alternativa. */
            <Button
              variant={wompi.vista?.sePuedeEnviar ? 'secondary' : 'default'}
              onClick={() => setDialogo('generarArchivo')}
              hideArrow
            >
              <FileText className="h-4 w-4" />
              {wompi.vista?.sePuedeEnviar ? 'Usar el archivo del banco' : 'Generar archivo'}
            </Button>
          )}
          {acciones.includes('descargarArchivo') && (
            <Button
              onClick={() => void archivoDelLote.descargar()}
              isLoading={archivoDelLote.preparando}
              hideArrow
            >
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

      {/* ── Wompi · Pagos a terceros ─────────────────────────────────────── */}
      <LoteEnWompi
        loteId={lote.id}
        estado={lote.estado}
        vista={wompi.vista}
        puedeEditar={canAccess('dispersiones', 'edit')}
        onCambio={(v) => {
          wompi.setVista(v);
          void refetch();
        }}
      />

      {/* ── Datos del cierre ────────────────────────────────────────────── */}
      {(vista.origen || lote.formatoArchivo || lote.referenciaBanco) && (
        <section className="grid gap-3 rounded-lg border border-border bg-surface p-4 text-sm shadow-sm sm:grid-cols-3">
          {vista.origen && (
            <div data-testid="origen-del-lote">
              <p className="text-caption text-fg-muted">Se gira desde</p>
              <p className="text-fg">{vista.origen.nombreDelBanco}</p>
              <p className="text-caption text-fg-muted">
                {vista.origen.tipoDeCuenta === 'CORRIENTE' ? 'Corriente' : 'Ahorros'}{' '}
                <span className="font-mono">{vista.origen.cuenta}</span>
              </p>
            </div>
          )}
          {lote.formatoArchivo && (
            <div>
              <p className="text-xs text-fg-muted">Formato del archivo</p>
              <p className="font-mono text-fg">
                {NOMBRE_DEL_FORMATO[lote.formatoArchivo] ?? lote.formatoArchivo}
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

      {/* ── El archivo al banco, con el componente del centro de procesos ── */}
      <ArchivoDelLote archivo={archivoDelLote} generadoAt={lote.archivoGeneradoAt} />

      {/* ── Excluidos ───────────────────────────────────────────────────── */}
      {excluidos.length > 0 && (
        <section className="space-y-3" data-testid="excluidos-del-lote">
          <Banner variant="warning" title={`${excluidos.length} ${excluidos.length === 1 ? 'pago no va' : 'pagos no van'} en el archivo`}>
            Les falta un dato bancario o no cuadra con el formato. Corrige la ficha del propietario y
            arma el lote de nuevo para que entren; este lote no los incluye.
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

      {/* ── Compensados: se cierran en $0 ───────────────────────────────── */}
      {compensados.length > 0 && (
        <section className="space-y-3" data-testid="compensados-del-lote">
          <Banner
            variant="info"
            title={`${compensados.length} ${compensados.length === 1 ? 'propietario se cierra' : 'propietarios se cierran'} en $0`}
          >
            Sus deducciones cubren el neto del mes: no se les gira nada y no van en el archivo del banco.
            Al marcar el lote pagado su liquidación se cierra, las deducciones quedan aplicadas y lo que
            falte pasa solo a su siguiente liquidación. La administración se les factura igual y a cada
            uno le sale su extracto con el detalle de las deducciones.
          </Banner>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Propietario</TableHead>
                  <TableHead className="text-right">Se gira</TableHead>
                  <TableHead className="text-right">Pasa al mes siguiente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compensados.map((c) => (
                  <TableRow key={c.dispersionId}>
                    <TableCell className="font-medium text-fg">{c.nombre}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatCurrency(0)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-warning">
                      {formatCurrency(c.saldoEnContraCop)}
                    </TableCell>
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
                  {lotePagado ? <TableHead>Giro</TableHead> : null}
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
                      ) : idsCompensados.has(item.dispersionId) ? (
                        <span className="text-fg-muted">Se cierra en $0</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-warning">
                          <X className="h-3.5 w-3.5" /> No
                        </span>
                      )}
                    </TableCell>
                    {lotePagado ? (
                      <TableCell>
                        <AccionesDelGiro
                          dispersionId={item.dispersionId}
                          nombreTitular={item.nombreTitular}
                          valorCop={item.valorCop}
                          giro={giros.porDispersion.get(item.dispersionId)}
                          puedeEditar={puedeTocarGiros}
                          disponible={giros.disponible}
                          onDevolver={() =>
                            setGiroEnDialogo({
                              accion: 'devolver',
                              dispersionId: item.dispersionId,
                              nombreTitular: item.nombreTitular,
                              valorCop: item.valorCop,
                            })
                          }
                          onRegirar={() =>
                            setGiroEnDialogo({
                              accion: 'regirar',
                              dispersionId: item.dispersionId,
                              nombreTitular: item.nombreTitular,
                              valorCop: item.valorCop,
                            })
                          }
                        />
                      </TableCell>
                    ) : null}
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

      {/* ── Movimientos: quién lo armó, aprobó, bajó el archivo, lo marcó
          pagado — con su rol, y también quién lo intentó sin permiso. ──── */}
      <BitacoraDelRecurso tipo="lote" id={lote.id} />

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
        abierto={dialogo === 'generarArchivo'}
        lote={lote}
        origen={vista.origen}
        guardar={guardar}
        onCerrar={cerrar}
        onGenerado={() => {
          void refetch();
          void archivoDelLote.refetch();
        }}
      />
      <MarcarPagadoDialog
        abierto={dialogo === 'marcarPagado'}
        lote={lote}
        onCerrar={cerrar}
        onListo={aplicarLote}
      />
      <AnularDialog abierto={dialogo === 'anular'} lote={lote} onCerrar={cerrar} onListo={aplicarLote} />

      {/* ── Giros devueltos (17-09) ─────────────────────────────────────── */}
      <MarcarDevueltoDialog
        abierto={giroEnDialogo?.accion === 'devolver'}
        dispersionId={giroEnDialogo?.dispersionId ?? null}
        nombreTitular={giroEnDialogo?.nombreTitular ?? ''}
        valorCop={giroEnDialogo?.valorCop ?? 0}
        onCerrar={() => setGiroEnDialogo(null)}
        onListo={() => void giros.recargar()}
      />
      <RegirarDialog
        abierto={giroEnDialogo?.accion === 'regirar'}
        giro={
          giroEnDialogo ? (giros.porDispersion.get(giroEnDialogo.dispersionId) ?? null) : null
        }
        nombreTitular={giroEnDialogo?.nombreTitular ?? ''}
        onCerrar={() => setGiroEnDialogo(null)}
        onListo={() => void giros.recargar()}
      />
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
  // Un lote que salió por Wompi no tuvo archivo: ese paso fue Wompi.
  const porWompi = lote.estado === 'EN_WOMPI' || (lote.referenciaBanco ?? '').startsWith('Wompi ');
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
              {porWompi && estado === 'ARCHIVO_GENERADO' ? 'En Wompi' : NOMBRE_DEL_ESTADO[estado]}
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
 * Generar el archivo (desde APROBADO).
 *
 * El POST del back devuelve JSON con el aviso del layout, los excluidos y las
 * advertencias — eso se ve ANTES de guardar. Volver a bajarlo (desde
 * ARCHIVO_GENERADO) ya no pasa por acá: es la sección «El archivo al banco»,
 * con el centro de procesos (`ArchivoDelLote.tsx`).
 */
function ArchivoDialog({
  abierto,
  lote,
  origen,
  guardar,
  onCerrar,
  onGenerado,
}: DialogoBase & {
  /**
   * El banco elegido al armar. `null` = el lote se armó sin preguntarlo y su
   * archivo no puede salir; `undefined` = un back anterior que no lo manda.
   */
  origen?: OrigenDelLote | null;
  guardar: (contenido: Blob | string, nombre: string) => void;
  onGenerado: () => void;
}) {
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<ArchivoGenerado | null>(null);

  const pedirAlBack = useCallback(async () => {
    setTrabajando(true);
    setError(null);
    try {
      // Sin formato: sale en el del banco elegido al armar el lote.
      const r = await lotesDeDispersionApi.generarArchivo(lote.id);
      setArchivo(r);
      if (!r.reenvio) onGenerado();
    } catch (e) {
      setError(mensajeDe(e, 'No se pudo generar el archivo.'));
    } finally {
      setTrabajando(false);
    }
  }, [lote.id, onGenerado]);

  useEffect(() => {
    if (!abierto) {
      setError(null);
      setArchivo(null);
      setTrabajando(false);
    }
  }, [abierto]);

  const guardarEnElEscritorio = async () => {
    if (!archivo) return;
    setTrabajando(true);
    try {
      // Del centro de procesos si el back lo dejó ahí (22-09); si no, tal cual
      // se sube al banco: los bytes del GET, no el JSON.
      if (archivo.procesoId) {
        try {
          await descargarArchivoDelProceso(archivo.procesoId);
          return;
        } catch {
          /* la copia no quedó en el storage: por el GET del lote */
        }
      }
      const blob = await lotesDeDispersionApi.descargarArchivo(lote.id);
      guardar(blob, archivo.nombreArchivo);
      toast.success('Archivo guardado', { description: archivo.nombreArchivo });
    } catch (e) {
      setError(mensajeDe(e, 'No se pudo descargar el archivo.'));
    } finally {
      setTrabajando(false);
    }
  };

  const esPlanilla = archivo?.entrega === 'PLANILLA';
  const deTercero = archivo?.entrega === 'ARCHIVO_DE_TERCERO';
  const sinVerificar =
    archivo && !esPlanilla ? esSinVerificar(archivo.nombreArchivo) || !archivo.layoutVerificado : false;

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-xl" data-testid="dialogo-archivo">
        <DialogHeader>
          <DialogTitle>
            {origen?.formato === 'PLANILLA_MANUAL'
              ? 'Generar la planilla para cargar a mano'
              : 'Generar el archivo plano'}
          </DialogTitle>
          <DialogDescription>
            Lote de {nombreDelMes(lote.month)} · {lote.cantidad} {lote.cantidad === 1 ? 'pago' : 'pagos'} por{' '}
            <span className="font-mono">{formatCurrency(lote.totalCop)}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4 text-sm">
          {!archivo && origen && origen.formato !== 'PLANILLA_MANUAL' && (
            <p className="text-fg" data-testid="archivo-del-banco">
              Sale el archivo de <span className="font-medium">{origen.nombreDelBanco}</span> (
              {NOMBRE_DEL_FORMATO[origen.formato] ?? origen.formato}), girando desde la cuenta{' '}
              {origen.tipoDeCuenta === 'CORRIENTE' ? 'corriente' : 'de ahorros'}{' '}
              <span className="font-mono">{origen.cuenta}</span>. Es el banco que se eligió al armar el lote.
            </p>
          )}

          {!archivo && origen?.formato === 'PLANILLA_MANUAL' && (
            <p className="text-fg" data-testid="archivo-del-banco">
              Sale la <span className="font-medium">planilla para cargar a mano</span> en{' '}
              <span className="font-medium">{origen.nombreDelBanco}</span>, girando desde la cuenta{' '}
              {origen.tipoDeCuenta === 'CORRIENTE' ? 'corriente' : 'de ahorros'}{' '}
              <span className="font-mono">{origen.cuenta}</span>. No es un archivo para subir al banco: trae los
              datos de cada pago para digitarlos en su portal.
            </p>
          )}

          {!archivo && origen === null && (
            <Banner variant="warning" title="Este lote no dice desde qué banco sale la plata">
              Se armó antes de que se preguntara el banco, y el archivo de cada banco lleva la cuenta desde
              la que se gira. Anúlalo y ármalo otra vez eligiendo el banco.
            </Banner>
          )}

          {archivo && (
            <div className="space-y-3" data-testid="archivo-listo">
              {esPlanilla ? (
                <div data-testid="es-planilla">
                  <Banner variant="info" title="Es una planilla para cargar a mano, no el archivo del banco">
                    {archivo.pendienteDeConfirmar.join(' ')}
                  </Banner>
                </div>
              ) : sinVerificar ? (
                <div className="space-y-2">
                  <Banner variant="warning" title="Este layout no se verificó contra un archivo real del banco">
                    {deTercero && archivo.fuente ? (
                      <>
                        Formato tomado de{' '}
                        <a
                          href={archivo.fuente.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {archivo.fuente.documento}
                        </a>
                        , no de un documento del banco. Sube primero un archivo de prueba al portal y revisa que lo
                        valide sin errores antes de autorizar el pago.
                      </>
                    ) : archivo.fuente ? (
                      <>
                        Está armado campo por campo con{' '}
                        <a
                          href={archivo.fuente.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          el instructivo oficial del banco
                        </a>{' '}
                        ({archivo.fuente.version}), pero todavía nadie ha subido uno al portal. La primera vez,
                        revisa que el banco lo valide sin errores antes de autorizar el pago.
                      </>
                    ) : (
                      'Revísalo antes de subirlo.'
                    )}{' '}
                    El nombre del archivo lleva <span className="font-mono">SIN-VERIFICAR</span> para que el aviso
                    viaje hasta el escritorio.
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
          {!archivo && (
            <Button
              onClick={() => void pedirAlBack()}
              isLoading={trabajando}
              hideArrow
              disabled={origen === null}
            >
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
  /**
   * El CEO (2026-09-15): «Con factura: se le puede facturar en ese momento o
   * después».
   *
   * 🔴 Tildado EMITE de verdad las facturas del lado propietario (la comisión
   * de la inmobiliaria y sus impuestos) de las cuotas que este lote giró. Sin
   * tildar quedan como prefactura pendiente en Facturación. Arranca apagado a
   * propósito: emitir consume números de la resolución de la DIAN y no se
   * deshace — una factura emitida se anula con nota crédito, no se borra.
   */
  const [facturarAhora, setFacturarAhora] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) {
      setReferencia('');
      setFacturarAhora(false);
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
      const pagado = await lotesDeDispersionApi.marcarPagado(
        lote.id,
        referencia,
        facturarAhora,
      );
      onListo(pagado);
      /*
       * El detalle pinta el resultado completo (`ResultadoDeLaFacturacion`);
       * el toast sólo resume, y NUNCA dice «emitidas» cuando hubo un fallo: la
       * plata salió igual, pero la factura no.
       */
      const f = pagado.facturacion;
      toast.success('Lote marcado como pagado', {
        description:
          f?.pedida === true
            ? f.fallas.length > 0
              ? `Se emitieron ${f.emitidas} facturas y ${f.fallas.length === 1 ? 'quedó 1 mes' : `quedaron ${f.fallas.length} meses`} sin facturar: mira el detalle.`
              : `${f.emitidas} ${f.emitidas === 1 ? 'factura emitida' : 'facturas emitidas'} al propietario.`
            : undefined,
      });
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

          <label className="flex items-start gap-2 pt-1" htmlFor="facturar-ahora">
            <Checkbox
              id="facturar-ahora"
              data-testid="facturar-ahora"
              checked={facturarAhora}
              onCheckedChange={(v) => setFacturarAhora(v === true)}
            />
            <span className="text-xs text-fg-muted">
              Facturarle ahora a los propietarios: se emite la comisión de la
              inmobiliaria sobre lo que este lote cierra —también a los que
              quedan en $0—, con su IVA y sus retenciones.{' '}
              <strong className="font-medium">
                Consume números de la resolución de la DIAN y no se deshace: una
                factura emitida se anula con nota crédito, no se borra.
              </strong>{' '}
              Sin tildar queda «después» y se emite desde Facturación.
            </span>
          </label>

          <p className="text-xs text-fg-muted">
            Al marcarlo pagado, a cada propietario le sale un correo con el valor, la referencia y
            el aviso de que el banco puede tardar 2 días hábiles en reflejarlo. A los que quedan en $0
            les sale su extracto. Su estado de cuenta queda con la dispersión descontada.
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
  const { t } = useI18n();
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /*
   * 🔴 Con el archivo YA generado, anular pide confirmar que ese archivo no se
   * procesó en el banco (back, 23-09-2026: 409
   * `CONFIRMA_QUE_EL_ARCHIVO_PUDO_LLEGAR_AL_BANCO` sin la confirmación). Sin
   * esta casilla el botón mandaba el cuerpo de siempre y el lote no se podía
   * anular nunca.
   */
  const conArchivo = lote.estado === 'ARCHIVO_GENERADO';
  const [confirmo, setConfirmo] = useState(false);

  useEffect(() => {
    if (!abierto) {
      setMotivo('');
      setError(null);
      setConfirmo(false);
    }
  }, [abierto]);

  const anular = async () => {
    if (!motivoValido(motivo)) {
      setError('Di por qué se anula, en 5 a 300 caracteres. Sin motivo no se anula.');
      return;
    }
    if (conArchivo && !confirmo) {
      setError(t('inmobiliaria.dispersiones.lote.anular.faltaConfirmar'));
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const anulado = await lotesDeDispersionApi.anular(lote.id, motivo, conArchivo && confirmo);
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
          {conArchivo && (
            <div className="space-y-2 pt-2" data-testid="confirmar-archivo-del-banco">
              <Banner variant="warning">{t('inmobiliaria.dispersiones.lote.anular.avisoArchivo')}</Banner>
              <label className="flex items-start gap-2">
                <Checkbox
                  data-testid="casilla-archivo-del-banco"
                  checked={confirmo}
                  onCheckedChange={(v) => setConfirmo(v === true)}
                />
                <span>{t('inmobiliaria.dispersiones.lote.anular.confirmaArchivo')}</span>
              </label>
            </div>
          )}
          {error && <Banner variant="danger">{error}</Banner>}
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => void anular()}
            isLoading={enviando}
            disabled={conArchivo && !confirmo}
            title={conArchivo && !confirmo ? t('inmobiliaria.dispersiones.lote.anular.faltaConfirmar') : undefined}
            hideArrow
            data-testid="boton-anular-lote"
          >
            <Prohibit className="h-4 w-4" />
            Anular lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
