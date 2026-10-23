'use client';

/**
 * Soportes de candidatos — la cola de revisión, en LA tabla de la casa.
 *
 * Nico (2026-09-08): «esto tampoco está utilizando una tabla, no es la que
 * usamos nosotros». Lo que había eran tarjetas por candidato con una lista
 * `<ul>` de documentos adentro: otra forma de mostrar una lista, distinta de
 * Contratos, Postulaciones, Inquilinos y Agenda, que usan todas la misma
 * tabla. Ahora es una fila por documento —el candidato es una columna— con el
 * mismo contenedor, los mismos encabezados y el vacío DENTRO del cuerpo para
 * que las columnas se sigan viendo.
 */

import { FolderOpen, CheckCircle, XCircle, Eye } from '@phosphor-icons/react';
import { CifraHeroe, type TonoDelTramo } from '@/components/pantalla/CifraHeroe';
import type { Icon } from '@phosphor-icons/react';
import Link from 'next/link';
import { Badge, Button } from '@/components/ui';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { AnimatedNumber, CrossFade } from '@leasefy/cadence';

/** El número tal cual se escribía antes: sin separador de miles. */
const enteroTalCual = (n: number) => String(Math.round(n));
import {
  Table,
  TableBodyAnimado,
  TableRowAnimada,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { SinDatos } from '@/components/estado/SinDatos';
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { getReviewStatusLabel, reviewStatusBadgeVariant } from '@/lib/documents/review-status';
import type {
  ReviewQueueCounts,
  ReviewQueueItem,
  ReviewQueueDocument,
} from '@/lib/api/document-review.types';

// Minimal es-CO labels for the canonical backend document types. Unknown types
// fall back to a humanized version of the raw key.
const DOC_TYPE_LABELS: Record<string, string> = {
  ID_DOCUMENT: 'Documento de identidad',
  INCOME_PROOF: 'Comprobante de ingresos',
  EMPLOYMENT_LETTER: 'Carta laboral',
  BANK_STATEMENT: 'Extracto bancario',
  PAY_STUB: 'Desprendible de nómina',
  CREDIT_REPORT: 'Reporte crediticio',
  OTHER: 'Otro documento',
};

function docTypeLabel(type: string): string {
  return DOC_TYPE_LABELS[type] ?? type.replace(/_/g, ' ').toLowerCase();
}

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  return bytes > 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

const COLUMNAS = ['Candidato', 'Documento', 'Estado', ''] as const;

export interface DocumentReviewQueueViewProps {
  counts: ReviewQueueCounts;
  items: ReviewQueueItem[];
  isLoading: boolean;
  /**
   * El error ENTERO, no su mensaje: `FalloDeCarga` clasifica por status para
   * saber si reintentar sirve. Con un string todo caía en «problema nuestro».
   */
  error: unknown;
  /** Whether the current user may run review actions (manager roles only). */
  canReview: boolean;
  /** id of the document currently being mutated — disables its row buttons. */
  pendingDocId: string | null;
  onTakeToReview: (applicationId: string, documentId: string) => void;
  onApprove: (applicationId: string, documentId: string) => void;
  onReject: (item: ReviewQueueItem, doc: ReviewQueueDocument) => void;
  onRetry: () => void;
}

interface CountCard {
  key: keyof ReviewQueueCounts;
  label: string;
  icon: Icon;
}

/**
 * 🔴 Las cinco tarjetas grandes se fueron (18-09-2026). Con la cola vacía —que
 * es el estado normal la mayor parte del tiempo— ocupaban la primera pantalla
 * entera para decir cinco veces «0», y las cinco pesaban lo mismo aunque sólo
 * una sea trabajo: lo que hay POR REVISAR. Ahora la cifra que importa se dice
 * en una línea y el resto acompaña en chico; cuando no hay nada, no se dibuja
 * nada. (DESIGN: las tarjetas de número grande son para cuando la cifra ES el
 * punto de la pantalla; acá el punto es la cola.)
 */
const SECUNDARIOS: CountCard[] = [
  { key: 'inReview', label: 'en revisión', icon: Eye },
  { key: 'approved', label: 'aprobados', icon: CheckCircle },
  { key: 'rejected', label: 'rechazados', icon: XCircle },
];

/** Una fila por documento: el candidato es una columna, no un encabezado. */
interface Fila {
  item: ReviewQueueItem;
  doc: ReviewQueueDocument;
}

export function DocumentReviewQueueView({
  counts,
  items,
  isLoading,
  error,
  canReview,
  pendingDocId,
  onTakeToReview,
  onApprove,
  onReject,
  onRetry,
}: DocumentReviewQueueViewProps) {
  const filas: Fila[] = items.flatMap((item) => item.documents.map((doc) => ({ item, doc })));

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <EncabezadoDePantalla
        seccion="Captación y arriendo"
        titulo="Soportes de candidatos"
        descripcion="Los papeles que el candidato adjunta al postularse: ábrelos y decide si la postulación sigue."
        ayuda={
          <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="Cómo funciona: soportes de candidatos" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>
                Llegan los papeles que el candidato adjunta al postularse: cédula, comprobante de ingresos, carta
                laboral.
              </p>
              <p>
                «Tomar» lo marca en revisión para que nadie más de tu equipo lo revise a la vez. Si apruebas, su
                postulación sigue.
              </p>
              <p>
                Si rechazas, tienes que escribir el motivo: es el que él recibe para volver a mandarlo bien.
              </p>
              <p>Lo que se le pide a cada perfil lo defines en «Requisitos».</p>
            </div>
          </ParaEntenderMas>
        }
      />

      {/* Glow up 22-10 (la vara de Deuda del mes): LA RESPUESTA en una CifraHeroe —lo que falta
          revisar— con la barra de cómo va la cola; los otros tres acompañan en la leyenda. Con la
          consulta caída o cargando, «—»: no se afirma un cero que nadie trajo. */}
      <section
        className="rounded-lg border border-border bg-card px-5 py-5"
        data-testid="resumen-de-la-cola"
      >
        <CifraHeroe
          rotulo="Por revisar"
          cifra={
            <span data-testid="count-pending">
              {isLoading || error ? '—' : <AnimatedNumber value={counts.pending} format={enteroTalCual} />}
            </span>
          }
          contexto={counts.pending === 1 ? 'soporte por revisar' : 'soportes por revisar'}
          tramos={[
            { clave: 'pending', etiqueta: 'Por revisar', monto: isLoading || error ? 0 : counts.pending, tono: 'aviso' as const },
            ...SECUNDARIOS.map(({ key, label }) => ({
              clave: key,
              etiqueta: label.charAt(0).toUpperCase() + label.slice(1),
              monto: isLoading || error ? 0 : counts[key],
              tono: (key === 'approved' ? 'exito' : key === 'rejected' ? 'critico' : 'neutro') as TonoDelTramo,
              // Revisora r25: «En revisión 0 · Aprobados 0 · Rechazados 0» en la leyenda; los ceros no salen.
              'data-testid': `count-${key}`,
              cifra: isLoading || error ? '—' : <AnimatedNumber value={counts[key]} format={enteroTalCual} />,
            })),
          ].filter((t) => t.clave !== 'pending' || t.monto > 0)}
        />
      </section>

      {/* Body: esqueleto → tabla (o → fallo) con un fundido. */}
      <CrossFade swapKey={isLoading ? 'cargando' : error ? 'fallo' : 'tabla'}>
      {isLoading ? (
        <EsqueletoTabla columnas={COLUMNAS.length} filas={5} />
      ) : error ? (
        <FalloDeCarga
          error={error}
          queEs="la cola de revisión"
          onReintentar={onRetry}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* En el celular cada soporte es una tarjeta (patrón de Deuda del mes). */}
          <Table className="max-md:block">
            <TableHeader className="max-md:hidden">
              <TableRow>
                {COLUMNAS.map((c, i) => (
                  <TableHead
                    key={c || `acciones-${i}`}
                    className={c === '' ? 'whitespace-nowrap text-right' : 'whitespace-nowrap'}
                  >
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            {/* Tomar, aprobar o rechazar: la fila que sale de la cola se va y
                las demás suben. */}
            <TableBodyAnimado className="max-md:block">
              {filas.length === 0 ? (
                /* Sin filtros en esta pantalla: acá el vacío es siempre «todavía no
                   llegó nada», nunca «filtraste mal». Y no se crea desde aquí — los
                   soportes los sube quien se postula—, así que la salida útil es ir a
                   ver las postulaciones. */
                <TableRowAnimada key="vacio" className="max-md:block">
                  <TableCell colSpan={COLUMNAS.length} className="p-0 max-md:block">
                    <SinDatos
                      queSon="soportes por revisar"
                      icono={FolderOpen}
                      titulo="No hay soportes por revisar"
                      descripcion="No hay nada que revisar hasta que alguien se postule y adjunte sus papeles. Lo que se le pide a cada perfil lo defines en la pestaña «Requisitos»; apenas alguien mande los suyos, la cola aparece aquí."
                      accion={
                        <Button asChild variant="outline">
                          <Link href="/panel/inmobiliaria/postulaciones">Ver postulaciones</Link>
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRowAnimada>
              ) : (
                filas.map(({ item, doc }) => {
                  const busy = pendingDocId === doc.id;
                  const showTake = doc.reviewStatus === 'PENDING';
                  const showApprove = doc.reviewStatus !== 'APPROVED';
                  const showReject = doc.reviewStatus !== 'REJECTED';
                  return (
                    <TableRowAnimada
                      key={doc.id}
                      data-testid="review-doc"
                      className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-2 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4 max-md:last:border-0"
                    >
                      <TableCell className="align-top max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                        <p className="font-medium text-fg truncate">{item.tenant.fullName}</p>
                        {item.property?.title ? (
                          <p className="text-sm text-fg-muted truncate">{item.property.title}</p>
                        ) : null}
                      </TableCell>

                      <TableCell className="max-w-[320px] align-top max-md:col-span-2 max-md:row-start-2 max-md:block max-md:max-w-none max-md:p-0">
                        <p className="text-fg truncate">{docTypeLabel(doc.type)}</p>
                        <p className="text-caption text-fg-muted truncate">
                          {doc.originalName} · {formatSize(doc.size)}
                        </p>
                      </TableCell>

                      <TableCell className="align-top max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0 max-md:text-right">
                        <Badge variant={reviewStatusBadgeVariant(doc.reviewStatus)}>
                          {getReviewStatusLabel(doc.reviewStatus)}
                        </Badge>
                        {doc.reviewStatus === 'REJECTED' && doc.rejectionReason && (
                          <p className="mt-1 text-caption text-danger break-words max-w-[280px]">
                            Motivo: {doc.rejectionReason}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="align-top max-md:col-span-2 max-md:row-start-3 max-md:block max-md:p-0">
                        {canReview && (
                          <div className="flex flex-wrap items-center justify-end gap-2 max-md:justify-start">
                            {showApprove && (
                              <Button
                                size="sm"
                                variant="secondary"
                                hideArrow
                                disabled={busy}
                                isLoading={busy}
                                onClick={() => onApprove(item.applicationId, doc.id)}
                              >
                                Aprobar
                              </Button>
                            )}
                            {showReject && (
                              <Button
                                size="sm"
                                variant="ghost"
                                hideArrow
                                className="text-danger hover:text-danger"
                                disabled={busy}
                                onClick={() => onReject(item, doc)}
                              >
                                Rechazar
                              </Button>
                            )}
                            {/* Revisora r25: tomar es un paso previo que casi nadie necesita; va al
                                final y sin borde, después de lo que decide (Aprobar · Rechazar). */}
                            {showTake && (
                              <Button
                                size="sm"
                                variant="ghost"
                                hideArrow
                                disabled={busy}
                                onClick={() => onTakeToReview(item.applicationId, doc.id)}
                              >
                                Tomar a revisión
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRowAnimada>
                  );
                })
              )}
            </TableBodyAnimado>
          </Table>
        </div>
      )}
      </CrossFade>
    </div>
  );
}
