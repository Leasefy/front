'use client';

/**
 * El detalle completo de una reparación, en un cajón (Nico, 12-10-2026: «con
 * la posibilidad de ver todo el detalle de lo que se hizo, con imágenes etc.»).
 *
 * Lo que se reportó con sus fotos, la cotización que se le pidió aprobar (sólo
 * ésa) con el nombre del proveedor (sin su contacto: pasa por la inmobiliaria),
 * a cargo de quién quedó y por qué, lo que se hizo con las fotos del trabajo y
 * la garantía, y lo que se le descontó. Las fotos se abren en grande con el
 * mismo visor de la ficha del inmueble.
 */
import { useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { VisorDeFotos } from '@/components/inmobiliaria/inmueble/VisorDeFotos';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { formatCurrency } from '@/lib/format';
import { diaEnColombia, fechaLarga } from '@/lib/fechas/fecha-de-la-casa';
import { TIPO_AL_BACK } from '@/lib/api/mantenimiento-enums';
import { MANTENIMIENTO_TYPES } from '@/lib/types/inmobiliaria';
import { aprobacionesDeReparacionApi } from '@/lib/api/aprobaciones-de-reparacion.service';
import type { DetalleDeLaReparacionEnElPortal, EstadoDeLaAprobacion } from '@/lib/types/deducciones';

export const ESTADO_CORTO: Record<EstadoDeLaAprobacion, { texto: string; tono: string }> = {
  PENDIENTE: { texto: 'Por aprobar', tono: 'bg-surface-muted text-fg-muted' },
  APROBADA: { texto: 'Aprobada', tono: 'bg-success-soft text-success' },
  RECHAZADA: { texto: 'Rechazada', tono: 'bg-danger-soft text-danger' },
  EMERGENCIA: { texto: 'Emergencia', tono: 'bg-warning-soft text-warning' },
  ANULADA: { texto: 'Retirada', tono: 'bg-surface-muted text-fg-muted' },
};

const QUE_PASO: Record<EstadoDeLaAprobacion, string> = {
  PENDIENTE: 'Está esperando tu respuesta.',
  APROBADA: 'La aprobaste: se descuenta de tu liquidación.',
  RECHAZADA: 'La rechazaste: no se te descuenta.',
  EMERGENCIA: 'Se hizo por emergencia: se descontó y se te avisó el mismo día.',
  ANULADA: 'Tu inmobiliaria la retiró: no se te descuenta.',
};

const ESTADO_DE_LA_SOLICITUD: Record<string, string> = {
  REPORTED: 'Reportada',
  QUOTED: 'Cotizada',
  MAINT_APPROVED: 'Aprobada, por empezar',
  IN_PROGRESS: 'En curso',
  MAINT_COMPLETED: 'Terminada',
  MAINT_CANCELLED: 'Cancelada',
};

const PRIORIDAD: Record<string, string> = {
  LOW: 'Prioridad baja',
  MEDIUM: 'Prioridad media',
  HIGH: 'Prioridad alta',
  EMERGENCY: 'Emergencia',
};

const QUIEN_PAGA: Record<NonNullable<DetalleDeLaReparacionEnElPortal['aCargoDe']>['quien'], string> = {
  PROPIETARIO: 'A tu cargo',
  INQUILINO: 'A cargo del inquilino',
  COMPARTIDA: 'Compartida con el inquilino',
  INMOBILIARIA: 'A cargo de tu inmobiliaria',
};

const SOBRECOSTO: Record<NonNullable<DetalleDeLaReparacionEnElPortal['sobrecosto']>['estado'], string> = {
  PENDIENTE: 'esperando tu respuesta',
  APROBADO: 'lo aprobaste',
  RECHAZADO: 'lo rechazaste: lo decide tu inmobiliaria',
  ANULADO: 'retirado',
};

/** El día en Colombia, dicho en palabras: un instante del back no se lee en UTC. */
function dia(iso: string | null | undefined): string {
  return fechaLarga(diaEnColombia(iso ?? null) ?? iso ?? null);
}

function tipoDeLaReparacion(tipo: string | null): string | null {
  if (!tipo) return null;
  const delFront = (Object.keys(TIPO_AL_BACK) as (keyof typeof TIPO_AL_BACK)[]).find((k) => TIPO_AL_BACK[k] === tipo);
  return MANTENIMIENTO_TYPES.find((t) => t.type === delFront)?.labelEs ?? null;
}

function Seccion({ titulo, children, testid }: { titulo: string; children: React.ReactNode; testid: string }) {
  return (
    <section className="space-y-2 border-t border-border-faint pt-5 first:border-t-0 first:pt-0" data-testid={testid}>
      <h3 className="text-sm font-semibold text-fg">{titulo}</h3>
      {children}
    </section>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption text-fg-muted">{etiqueta}</dt>
      <dd className="text-sm text-fg">{children}</dd>
    </div>
  );
}

function Fotos({ fotos, queSon, onAbrir }: { fotos: string[]; queSon: string; onAbrir: (indice: number) => void }) {
  if (fotos.length === 0) return <p className="text-sm text-fg-muted">Sin fotos {queSon}.</p>;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {fotos.map((url, i) => (
        // allowlist: image-tile button (miniatura que abre el visor) — hosts a fill image; Button can't.
        <button
          key={`${i}-${url}`}
          type="button"
          onClick={() => onAbrir(i)}
          aria-label={`Ver la foto ${i + 1} ${queSon}`}
          className="relative block aspect-square overflow-hidden rounded-md bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-testid="foto-de-la-reparacion"
        >
          <span className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-fg-subtle" aria-hidden="true" />
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage, sin dominio fijo para next/image */}
          <img
            src={url}
            alt={`Foto ${i + 1} ${queSon}`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </button>
      ))}
    </div>
  );
}

export function DetalleDeLaReparacion({ id, onCerrar }: { id: string | null; onCerrar: () => void }) {
  const [detalle, setDetalle] = useState<DetalleDeLaReparacionEnElPortal | null>(null);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState<unknown>(null);
  const [visor, setVisor] = useState<{
    fotos: string[];
    indice: number;
  } | null>(null);

  const cargar = useCallback(async () => {
    if (!id) return;
    setCargando(true);
    setFallo(null);
    try {
      setDetalle(await aprobacionesDeReparacionApi.detalleDelPortal(id));
    } catch (e) {
      setFallo(e);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    setDetalle(null);
    void cargar();
  }, [cargar]);

  const abrirSoporte = async () => {
    if (!detalle) return;
    try {
      const { url } = await aprobacionesDeReparacionApi.soporte(detalle.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error('No se pudo abrir el soporte', {
        description: mensajeParaLaPersona(error, {
          accion: 'abrir el soporte',
          porDefecto: 'Prueba de nuevo en un momento.',
        }),
      });
    }
  };

  const d = detalle;
  const estado = d ? ESTADO_CORTO[d.estado] : null;
  const tipo = d ? tipoDeLaReparacion(d.reparacion.tipo) : null;

  return (
    <>
      <Cajon
        abierto={id !== null}
        onOpenChange={(abierto) => {
          if (!abierto) onCerrar();
        }}
        tamano="lg"
        data-testid="detalle-de-la-reparacion"
      >
        <CajonCabecera
          titulo={d?.reparacion.titulo ?? 'Detalle de la reparación'}
          descripcion={d ? [d.inmueble, d.inmobiliaria].filter(Boolean).join(' · ') : undefined}
        >
          {estado && (
            <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-caption font-medium ${estado.tono}`}>
              {estado.texto}
            </span>
          )}
        </CajonCabecera>
        <CajonCuerpo className="space-y-5">
          <EstadoDeDatos
            cargando={cargando || (!d && !fallo)}
            error={fallo}
            queEs="el detalle de la reparación"
            onReintentar={cargar}
          >
            {d && (
              <div className="space-y-5">
                <Seccion titulo="Tu decisión" testid="detalle-decision">
                  <p className="text-sm text-fg">{QUE_PASO[d.estado]}</p>
                  <dl className="grid grid-cols-2 gap-3">
                    <Dato etiqueta="Te la pidieron el">{dia(d.pedidaAt)}</Dato>
                    {d.decididaAt && <Dato etiqueta="La decidiste el">{dia(d.decididaAt)}</Dato>}
                    {d.anuladaAt && <Dato etiqueta="Se retiró el">{dia(d.anuladaAt)}</Dato>}
                  </dl>
                  {d.motivoDeRechazo && <p className="text-sm text-fg-muted">Tu motivo: {d.motivoDeRechazo}</p>}
                  {d.motivoDeAnulacion && (
                    <p className="text-sm text-fg-muted">Motivo de tu inmobiliaria: {d.motivoDeAnulacion}</p>
                  )}
                  {d.estado === 'EMERGENCIA' && (
                    <div className="space-y-2 rounded-md bg-warning-soft p-3 text-sm text-fg">
                      {d.motivoDeEmergencia && <p>Por qué fue una emergencia: {d.motivoDeEmergencia}</p>}
                      {d.aviso && (
                        <details>
                          <summary className="cursor-pointer">{d.aviso.asunto}</summary>
                          <pre className="mt-2 whitespace-pre-wrap font-sans text-fg-muted">{d.aviso.cuerpo}</pre>
                        </details>
                      )}
                      {d.soporteNombre && (
                        <Button size="sm" variant="outline" hideArrow onClick={() => void abrirSoporte()}>
                          Ver el soporte ({d.soporteNombre})
                        </Button>
                      )}
                    </div>
                  )}
                </Seccion>

                <Seccion titulo="Lo que se reportó" testid="detalle-reporte">
                  {(tipo || d.reparacion.prioridad || d.reparacion.reportadaAt) && (
                    <p className="text-caption text-fg-muted">
                      {[
                        tipo,
                        d.reparacion.prioridad ? PRIORIDAD[d.reparacion.prioridad] : null,
                        d.reparacion.reportadaAt ? `Reportada el ${dia(d.reparacion.reportadaAt)}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                  {d.reparacion.descripcion && (
                    <p className="whitespace-pre-line text-sm text-fg">{d.reparacion.descripcion}</p>
                  )}
                  <Fotos
                    fotos={d.reparacion.fotos}
                    queSon="del reporte"
                    onAbrir={(indice) => setVisor({ fotos: d.reparacion.fotos, indice })}
                  />
                </Seccion>

                {d.cotizacion && (
                  <Seccion titulo="La cotización que se te pidió aprobar" testid="detalle-cotizacion">
                    <dl className="grid grid-cols-2 gap-3">
                      <Dato etiqueta="Proveedor">{d.cotizacion.proveedor}</Dato>
                      <Dato etiqueta="Valor">
                        <span className="font-mono tabular-nums">{formatCurrency(d.cotizacion.valorCop)}</span>
                      </Dato>
                      {d.cotizacion.diasEstimados !== null && (
                        <Dato etiqueta="Tiempo estimado">
                          {d.cotizacion.diasEstimados === 1 ? '1 día' : `${d.cotizacion.diasEstimados} días`}
                        </Dato>
                      )}
                    </dl>
                    {d.cotizacion.descripcion && (
                      <p className="whitespace-pre-line text-sm text-fg-muted">Incluye: {d.cotizacion.descripcion}</p>
                    )}
                  </Seccion>
                )}

                {d.aCargoDe && (
                  <Seccion titulo="Quién la paga" testid="detalle-quien-paga">
                    <p className="text-sm text-fg">
                      {QUIEN_PAGA[d.aCargoDe.quien]}
                      {d.aCargoDe.quien === 'COMPARTIDA' && d.aCargoDe.propietarioPct !== null
                        ? `: tú el ${d.aCargoDe.propietarioPct} % y el inquilino el ${d.aCargoDe.inquilinoPct ?? 100 - d.aCargoDe.propietarioPct} %`
                        : ''}
                    </p>
                    {d.aCargoDe.motivo && <p className="text-sm text-fg-muted">Por qué: {d.aCargoDe.motivo}</p>}
                  </Seccion>
                )}

                <Seccion titulo="Lo que se hizo" testid="detalle-trabajo">
                  {d.trabajo.terminadoAt ? (
                    <p className="text-caption text-fg-muted">Terminada el {dia(d.trabajo.terminadoAt)}</p>
                  ) : (
                    <p className="text-sm text-fg-muted">
                      {d.reparacion.estado === 'MAINT_CANCELLED'
                        ? 'La reparación se canceló.'
                        : `Todavía no se ha terminado${d.reparacion.estado ? ` (${(ESTADO_DE_LA_SOLICITUD[d.reparacion.estado] ?? '').toLowerCase()})` : ''}.`}
                    </p>
                  )}
                  {d.trabajo.notas && <p className="whitespace-pre-line text-sm text-fg">{d.trabajo.notas}</p>}
                  {(d.trabajo.terminadoAt || d.trabajo.fotos.length > 0) && (
                    <Fotos
                      fotos={d.trabajo.fotos}
                      queSon="del trabajo terminado"
                      onAbrir={(indice) => setVisor({ fotos: d.trabajo.fotos, indice })}
                    />
                  )}
                  {d.trabajo.garantiaHasta && (
                    <p className="text-sm text-fg">Garantía hasta el {fechaLarga(d.trabajo.garantiaHasta)}.</p>
                  )}
                </Seccion>

                <Seccion titulo="Lo que se te descontó" testid="detalle-descontado">
                  {d.estado === 'APROBADA' || d.estado === 'EMERGENCIA' ? (
                    <dl className="grid grid-cols-2 gap-3">
                      <Dato etiqueta={d.estado === 'EMERGENCIA' ? 'Valor de la emergencia' : 'Lo que aprobaste'}>
                        <span className="font-mono tabular-nums">{formatCurrency(d.valorCop)}</span>
                      </Dato>
                      <Dato etiqueta="Se te descuenta">
                        <span className="font-mono tabular-nums">{formatCurrency(d.descontadoCop ?? d.valorCop)}</span>
                      </Dato>
                    </dl>
                  ) : (
                    <p className="text-sm text-fg-muted">No se te descontó nada por esta reparación.</p>
                  )}
                  {d.sobrecosto && (
                    <p className="text-sm text-fg-muted" data-testid="detalle-sobrecosto">
                      El trabajo terminó costando {formatCurrency(d.sobrecosto.costoFinalCop)}: la diferencia de{' '}
                      {formatCurrency(d.sobrecosto.diferenciaCop)}, {SOBRECOSTO[d.sobrecosto.estado]}.
                    </p>
                  )}
                </Seccion>
              </div>
            )}
          </EstadoDeDatos>
        </CajonCuerpo>
      </Cajon>
      <VisorDeFotos
        fotos={visor?.fotos ?? []}
        indice={visor?.indice ?? null}
        onCerrar={() => setVisor(null)}
        onCambiar={(indice) => setVisor((v) => (v ? { ...v, indice } : v))}
        titulo={d?.reparacion.titulo}
      />
    </>
  );
}
