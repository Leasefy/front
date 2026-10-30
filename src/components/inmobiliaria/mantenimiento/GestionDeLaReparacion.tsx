'use client';

/**
 * Quién gestiona la reparación y, si no es la inmobiliaria, su seguimiento por
 * avisos (reunión con Portofino, Nico 29-10-2026). Va en el cajón del detalle.
 *
 *   · La inmobiliaria: una línea («cotizas, apruebas…») y «Cambiar».
 *   · El propietario, la administración o el inquilino: por qué no hay
 *     cotizaciones, aprobación, costo final ni descuentos (una línea), la línea
 *     de tiempo de los pasos (visita, en arreglo, terminado, cada uno con su
 *     nota) y «Registrar el siguiente paso». `en_arreglo` y `terminado` mueven
 *     la tarjeta (lo hace el back).
 *   · «Cambiar» abre las cuatro opciones ahí mismo. A otro, sólo antes de
 *     aprobar una cotización (después lo dice). Si la hace el propietario por su
 *     cuenta (22-10), se retoma con «La retoma la inmobiliaria», que va como
 *     `children` debajo del resumen, no con «Cambiar».
 *
 * Sin `onCambio` (sin permiso de editar) sólo se lee.
 */

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, ListChecks, MagnifyingGlass, UsersThree, Wrench } from '@phosphor-icons/react';
import { Collapse, Presence, SegmentedControl, Stagger, StaggerItem } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { useI18n } from '@/lib/i18n';
import { useTr } from '@/lib/i18n/use-tr';
import { mantenimientoApi } from '@/lib/hooks/useInmobiliaria';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import {
  EJEMPLO_DE_LA_NOTA,
  ETAPAS_DEL_SEGUIMIENTO,
  ETIQUETA_DE_LA_ETAPA,
  GESTIONADO_POR,
  MAX_LARGO_NOTA_DEL_SEGUIMIENTO,
  POR_QUE_NO_SE_COTIZA,
  QUE_HACE_LA_ETAPA,
  etiquetaDeLaGestion,
  gestionDeLaSolicitud,
  porQueNoSePasaAOtro,
  seLeRegistraSeguimiento,
  seguimientoDeLaSolicitud,
  siguienteEtapa,
} from '@/lib/mantenimiento/gestionado-por';
import { cn } from '@/lib/utils';
import type { EtapaDelSeguimiento, GestionadoPor, SolicitudMantenimiento } from '@/lib/types/inmobiliaria';

import { ICONO_DE_LA_GESTION, SelectorDeGestion } from './QuienGestiona';

const ICONO_DE_LA_ETAPA: Record<EtapaDelSeguimiento, React.ElementType> = {
  visita: MagnifyingGlass,
  en_arreglo: Wrench,
  terminado: CheckCircle,
};

/** Lo que dice el aviso al cambiar quién la gestiona. */
const AHORA_LA_GESTIONA: Record<GestionadoPor, string> = {
  inmobiliaria: 'Listo: ahora la gestiona la inmobiliaria.',
  propietario: 'Listo: ahora la gestiona el propietario.',
  administracion: 'Listo: ahora la gestiona la administración.',
  inquilino: 'Listo: ahora la gestiona el inquilino.',
};

export function GestionDeLaReparacion({
  solicitud,
  onCambio,
  children,
}: {
  solicitud: SolicitudMantenimiento;
  /** Después de cambiar quién la gestiona o de registrar un paso: releer la solicitud. */
  onCambio?: () => void | Promise<void>;
  /** Lo de «La hace el propietario» (22-10), debajo del resumen. */
  children?: React.ReactNode;
}) {
  const tr = useTr();
  const { formatDate } = useI18n();
  const gestion = gestionDeLaSolicitud(solicitud);
  const otro = gestion !== 'inmobiliaria';
  const Icono = ICONO_DE_LA_GESTION[gestion];
  const abierta = solicitud.status !== 'completed' && solicitud.status !== 'cancelled';

  // «Cambiar»: abierta, con permiso y sin «la hace el propietario» de por medio (ésa se retoma).
  const puedeCambiar = Boolean(onCambio) && abierta && !solicitud.laHaceElPropietario;
  const [cambiando, setCambiando] = useState(false);
  const [elegida, setElegida] = useState<GestionadoPor>(gestion);
  const [guardando, setGuardando] = useState(false);
  const bloqueo = gestion === 'inmobiliaria' ? porQueNoSePasaAOtro(solicitud) : null;

  useEffect(() => {
    setElegida(gestion);
    setCambiando(false);
  }, [gestion, solicitud.id]);

  const guardarElCambio = async () => {
    if (elegida === gestion) return;
    setGuardando(true);
    try {
      await mantenimientoApi.cambiarGestion(solicitud.id, elegida);
    } catch (e) {
      // 409 con cotización aprobada, 503 sin la migración: la frase del back, por el traductor.
      toast.error(tr('No se pudo cambiar quién la gestiona'), {
        description: mensajeParaLaPersona(e, {
          porDefecto: 'Prueba de nuevo en un momento.',
          accion: 'cambiar quién gestiona la reparación',
        }),
      });
      setGuardando(false);
      return;
    }
    toast.success(tr(AHORA_LA_GESTIONA[elegida]));
    setGuardando(false);
    setCambiando(false);
    await onCambio?.();
  };

  return (
    <section className="space-y-3" data-testid="gestion-de-la-reparacion" data-gestion={gestion}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-medium text-fg">
          <UsersThree className="h-4 w-4" aria-hidden="true" />
          {tr('Quién la gestiona')}
        </h4>
        {puedeCambiar && !cambiando ? (
          <Button
            variant="link"
            size="sm"
            hideArrow
            className="h-auto p-0 text-sm"
            onClick={() => setCambiando(true)}
            data-testid="cambiar-gestion"
          >
            {tr('Cambiar')}
          </Button>
        ) : null}
      </div>

      <div className="space-y-1">
        <p className="flex items-center gap-2 text-body-sm text-fg" data-testid="quien-la-gestiona">
          <Icono className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
          {tr(etiquetaDeLaGestion(gestion))}
        </p>
        <p className="text-body-sm text-fg-muted" data-testid={otro ? 'por-que-no-se-cotiza' : undefined}>
          {otro
            ? tr(POR_QUE_NO_SE_COTIZA[gestion as Exclude<GestionadoPor, 'inmobiliaria'>])
            : tr('Cotizas, apruebas y se descuenta o cobra a quien corresponda, como siempre.')}
        </p>
      </div>

      {/* Cambiar ahí mismo, con las cuatro opciones a la vista. */}
      <Collapse open={cambiando}>
        <div className="space-y-3 rounded-xl bg-surface-muted p-4" data-testid="cambiar-gestion-panel">
          {bloqueo ? (
            <p className="text-body-sm text-fg-muted" data-testid="gestion-bloqueada">
              {tr(bloqueo)}
            </p>
          ) : null}
          <SelectorDeGestion
            valor={elegida}
            onCambiar={setElegida}
            deshabilitadas={bloqueo ? GESTIONADO_POR.filter((g) => g !== 'inmobiliaria') : []}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              hideArrow
              onClick={() => {
                setElegida(gestion);
                setCambiando(false);
              }}
              disabled={guardando}
            >
              {tr('Cancelar')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              hideArrow
              onClick={() => void guardarElCambio()}
              disabled={elegida === gestion || guardando}
              isLoading={guardando}
              data-testid="guardar-gestion"
            >
              {tr('Guardar el cambio')}
            </Button>
          </div>
        </div>
      </Collapse>

      {children}

      {otro ? <SeguimientoPorAvisos solicitud={solicitud} onCambio={onCambio} formatDate={formatDate} /> : null}
    </section>
  );
}

/** La línea de tiempo de los pasos y «Registrar el siguiente paso». */
function SeguimientoPorAvisos({
  solicitud,
  onCambio,
  formatDate,
}: {
  solicitud: SolicitudMantenimiento;
  onCambio?: () => void | Promise<void>;
  formatDate: (d: string) => string;
}) {
  const tr = useTr();
  const pasos = useMemo(() => seguimientoDeLaSolicitud(solicitud), [solicitud]);
  const sugerida = siguienteEtapa(pasos, solicitud.status);
  const puedeRegistrar = Boolean(onCambio) && seLeRegistraSeguimiento(solicitud) && sugerida !== null;

  const [etapa, setEtapa] = useState<EtapaDelSeguimiento>(sugerida ?? 'visita');
  const [nota, setNota] = useState('');
  const [registrando, setRegistrando] = useState(false);

  // Después de cada paso, el que sigue queda elegido y la nota vacía.
  useEffect(() => {
    setEtapa(sugerida ?? 'visita');
    setNota('');
  }, [sugerida, pasos.length, solicitud.id]);

  const registrar = async () => {
    setRegistrando(true);
    try {
      await mantenimientoApi.registrarSeguimiento(solicitud.id, etapa, nota);
    } catch (e) {
      // 400 de la nota, la cancelada o la que gestiona la inmobiliaria; 503 sin la migración.
      toast.error(tr('No se pudo registrar el paso'), {
        description: mensajeParaLaPersona(e, {
          porDefecto: 'Prueba de nuevo en un momento.',
          accion: 'registrar en qué va la reparación',
        }),
      });
      setRegistrando(false);
      return;
    }
    toast.success(tr('Listo: quedó registrado «{etapa}»', { etapa: tr(ETIQUETA_DE_LA_ETAPA[etapa]) }), {
      description: tr(QUE_HACE_LA_ETAPA[etapa]),
    });
    setRegistrando(false);
    await onCambio?.();
  };

  return (
    <div className="space-y-4 rounded-xl bg-surface-muted p-4" data-testid="seguimiento-por-avisos">
      <p className="flex items-center gap-2 font-mono text-label uppercase text-fg-subtle">
        <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
        {tr('Seguimiento')}
      </p>

      {pasos.length === 0 ? (
        <p className="text-body-sm text-fg-muted" data-testid="seguimiento-sin-pasos">
          {abiertaConPermiso(solicitud, onCambio)
            ? tr('Todavía no hay pasos. Registra el primero cuando te avisen en qué va.')
            : tr('No se registró ningún paso.')}
        </p>
      ) : (
        <Stagger as="ol" className="space-y-3" data-testid="seguimiento-pasos">
          {pasos.map((p, i) => {
            const IconoDelPaso = ICONO_DE_LA_ETAPA[p.etapa];
            const ultimo = i === pasos.length - 1;
            return (
              <StaggerItem
                as="li"
                key={`${p.etapa}-${p.fecha}-${i}`}
                className="flex gap-3"
                data-testid={`paso-${p.etapa}`}
              >
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      ultimo ? 'bg-surface text-fg shadow-susurro' : 'text-fg-muted',
                    )}
                  >
                    <IconoDelPaso className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {!ultimo ? <span className="my-1 w-px flex-1 bg-border" aria-hidden="true" /> : null}
                </div>
                <div className="min-w-0 pb-1">
                  <p className="text-body-sm text-fg">{tr(ETIQUETA_DE_LA_ETAPA[p.etapa])}</p>
                  <p className="text-caption text-fg-muted">{formatDate(p.fecha)}</p>
                  {p.nota ? <p className="mt-1 whitespace-pre-line break-words text-body-sm text-fg-muted">«{p.nota}»</p> : null}
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      <Presence show={puedeRegistrar} direction="up" distance="xs">
        <div className="space-y-3 border-t border-border-faint pt-4" data-testid="registrar-el-siguiente-paso">
          <p className="text-sm font-medium text-fg">{tr('Registrar el siguiente paso')}</p>
          <SegmentedControl<EtapaDelSeguimiento>
            value={etapa}
            onChange={setEtapa}
            fullWidth
            aria-label={tr('En qué va la reparación')}
            options={ETAPAS_DEL_SEGUIMIENTO.map((e) => ({ value: e, label: tr(ETIQUETA_DE_LA_ETAPA[e]) }))}
          />
          <p className="text-caption text-fg-muted">{tr(QUE_HACE_LA_ETAPA[etapa])}</p>
          <div className="space-y-1.5">
            <label htmlFor={`nota-del-paso-${solicitud.id}`} className="text-sm font-medium text-fg">
              {tr('Nota')} <span className="font-normal text-fg-muted">{tr('(opcional)')}</span>
            </label>
            <Textarea
              id={`nota-del-paso-${solicitud.id}`}
              rows={3}
              maxLength={MAX_LARGO_NOTA_DEL_SEGUIMIENTO}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder={tr(EJEMPLO_DE_LA_NOTA[etapa])}
              className="w-full resize-none bg-surface"
              data-testid="nota-del-paso"
            />
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              hideArrow
              onClick={() => void registrar()}
              disabled={registrando}
              isLoading={registrando}
              className="max-sm:w-full"
              data-testid="registrar-paso"
            >
              {tr('Registrar «{etapa}»', { etapa: tr(ETIQUETA_DE_LA_ETAPA[etapa]) })}
            </Button>
          </div>
        </div>
      </Presence>
    </div>
  );
}

function abiertaConPermiso(s: SolicitudMantenimiento, onCambio?: () => void | Promise<void>): boolean {
  return Boolean(onCambio) && seLeRegistraSeguimiento(s);
}
