'use client';

/**
 * NuevaTareaDrawer — una tarea propia en la agenda: qué hay que hacer, día,
 * hora opcional, a qué inmueble se ata y quién la lleva.
 *
 * Nico (2026-09-03): «le doy nueva tarea acá en agenda y no funciona nada».
 * Nico (2026-09-08): «que sea un textarea porque la tarea puede ser larga; que
 * día y hora usen los componentes de cadence y se sientan clicables». Va con
 * el cajón de la casa: cabecera fija, cuerpo con scroll, pie fijo.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import {
  FECHA_DE_LA_TAREA_DESDE,
  FECHA_DE_LA_TAREA_HASTA,
  MAX_LARGO_NOTA_DE_LA_TAREA,
  MAX_LARGO_TITULO_DE_LA_TAREA,
  MENSAJES_DE_LA_AGENDA,
  errorDeLaFecha,
} from '@/lib/agenda/limites-de-la-agenda';
import { DatePicker, TimePicker } from '@leasefy/cadence';
import { Button, Textarea } from '@/components/ui';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { useConsignaciones } from '@/lib/hooks/useInmobiliaria';
import { useEquipo, useMiUserId } from '@/lib/agenda/use-equipo';
import { loQueDiceUnSelector } from '@/lib/errores/lo-que-dice-un-selector';
import { ApiError } from '@/lib/api/client';
import { agendaApi } from '@/lib/api/agenda.service';
import { etiquetaDeInmueble } from '@/components/contratos/VincularInmueble';
import { aFechaIso, fechaLocal, hoyLocal } from '@/lib/fechas-locales';

interface Props {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  onCreada: () => void;
}

export interface TareaForm {
  titulo: string;
  fecha: string;
  hora: string;
  consignacionId: string;
  responsableUserId: string;
  nota: string;
}

export const TAREA_VACIA: TareaForm = {
  titulo: '',
  fecha: '',
  hora: '',
  consignacionId: '',
  responsableUserId: '',
  nota: '',
};

/** Tope del back (`CreateTareaDto.titulo`): lo largo va en la nota. */
export const TITULO_MAX = MAX_LARGO_TITULO_DE_LA_TAREA;

type CampoDeLaTarea = keyof TareaForm;

/** Los campos que el formulario muestra, en el orden en que se ven (el foco va al primero). */
const CAMPOS_DE_LA_TAREA: readonly CampoDeLaTarea[] = [
  'titulo',
  'fecha',
  'hora',
  'consignacionId',
  'responsableUserId',
  'nota',
];

/** Lo que el back llama distinto: el vínculo es el inmueble elegido. */
const MAPA_DEL_SERVIDOR: Partial<Record<string, CampoDeLaTarea>> = {
  vinculoId: 'consignacionId',
  vinculoLabel: 'consignacionId',
  vinculoTipo: 'consignacionId',
};

/**
 * Qué falta o está mal. Vacío = se puede guardar. Los topes y las frases son
 * los del back (`lib/agenda/limites-de-la-agenda.ts`).
 */
export function validarTarea(f: TareaForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.titulo.trim().length < 2) e.titulo = 'Escribe qué hay que hacer.';
  else if (f.titulo.trim().length > TITULO_MAX) e.titulo = MENSAJES_DE_LA_AGENDA.tituloLargo;
  if (!f.fecha) e.fecha = 'Elige el día.';
  else {
    const fecha = errorDeLaFecha(f.fecha, {
      desde: FECHA_DE_LA_TAREA_DESDE,
      hasta: FECHA_DE_LA_TAREA_HASTA,
      noEsUnDia: MENSAJES_DE_LA_AGENDA.fechaNoEsUnDia,
      fueraDeRango: MENSAJES_DE_LA_AGENDA.fechaFueraDeRango,
    });
    if (fecha) e.fecha = fecha;
  }
  if (f.nota.trim().length > MAX_LARGO_NOTA_DE_LA_TAREA) e.nota = MENSAJES_DE_LA_AGENDA.notaLarga;
  return e;
}

/** «Te falta el día» / «Te falta qué hay que hacer y el día». */
export function loQueFalta(errores: Record<string, string>): string | null {
  const partes: string[] = [];
  if (errores.titulo) partes.push('qué hay que hacer');
  if (errores.fecha) partes.push('el día');
  if (errores.nota) partes.push('acortar la nota');
  if (partes.length === 0) return null;
  return `Te falta ${partes.join(' y ')}.`;
}

/** Los pickers de cadence con la altura y el radio de los demás campos del cajón. */
const CAMPO_CLICABLE = 'h-11 w-full rounded-[12px] px-3.5';

export function NuevaTareaDrawer({ abierto, onOpenChange, onCreada, coordina = true }: Props & {
  /** AG-11: quien coordina asigna a cualquiera; la asesora, sólo a sí misma. */
  coordina?: boolean;
}) {
  const [form, setForm] = useState<TareaForm>(TAREA_VACIA);
  const [guardando, setGuardando] = useState(false);
  /**
   * Lo que rechazó el servidor, por campo (02-10-2026). Se pinta bajo SU campo
   * y se borra apenas la persona lo toca: el dato ya no es el que se rechazó.
   */
  const [delServidor, setDelServidor] = useState<Partial<Record<CampoDeLaTarea, string>>>({});
  const cuerpo = useRef<HTMLDivElement>(null);
  /* El error se lee (21-09): sin esto, con la lectura caída el selector se
     abría sobre una lista vacía sin decir por qué. */
  const {
    consignaciones,
    isLoading: cargandoInmuebles,
    errorCrudo: errorDeInmuebles,
  } = useConsignaciones();
  /*
   * AG-09 (04-10-2026): responsable = cualquier miembro ACTIVO del equipo
   * (antes sólo los asesores: ni el administrador ni el contador). AG-11: la
   * asesora crea tareas PARA SÍ; quien coordina (operaciones), para cualquiera.
   */
  const { equipo } = useEquipo(!abierto);
  const miUserId = useMiUserId();

  useEffect(() => {
    if (abierto) {
      setForm(TAREA_VACIA);
      setDelServidor({});
    }
  }, [abierto]);

  const inmuebles = useMemo<ComboboxOption[]>(
    () =>
      [...consignaciones]
        .sort((a, b) => a.propertyTitle.localeCompare(b.propertyTitle))
        .map((c) => ({ value: c.id, label: etiquetaDeInmueble(c) })),
    [consignaciones],
  );
  const responsables = useMemo<ComboboxOption[]>(
    () =>
      equipo
        .filter((m) => coordina || m.userId === miUserId)
        .map((m) => ({
          value: m.userId,
          label: m.userId === miUserId ? `${m.nombre} (tú)` : m.nombre,
        })),
    [equipo, coordina, miUserId],
  );

  const errores = validarTarea(form);
  const falta = loQueFalta(errores);
  const valido = !falta && !guardando;
  const set = <K extends keyof TareaForm>(k: K, v: TareaForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDelServidor((d) => (d[k] ? { ...d, [k]: undefined } : d));
  };
  /** El error que se ve bajo un campo: el del servidor primero, el del cliente si ya hay algo escrito. */
  const errorDe = (k: CampoDeLaTarea): string | undefined =>
    delServidor[k] ?? (form[k] ? errores[k] : undefined);

  const guardar = async () => {
    if (!valido) return;
    setGuardando(true);
    try {
      const inmueble = consignaciones.find((c) => c.id === form.consignacionId);
      await agendaApi.crearTarea({
        titulo: form.titulo.trim(),
        fecha: form.fecha,
        hora: form.hora || undefined,
        nota: form.nota.trim() || undefined,
        ...(inmueble
          ? { vinculoTipo: 'PROPIEDAD', vinculoId: inmueble.id, vinculoLabel: etiquetaDeInmueble(inmueble) }
          : {}),
        responsableUserId: form.responsableUserId || undefined,
      });
      toast.success('Tarea creada');
      onCreada();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      // 02-10-2026 · Lo del back va a SU campo (con el foco en el primero) y al
      // toast sólo lo que no tiene dónde ir, por el traductor: «conexión» sólo
      // si no hubo respuesta; un 5xx con su referencia. Antes un mensaje de
      // más de 160 caracteres se perdía entero.
      const reparto = repartirErroresDelServidor<CampoDeLaTarea>(err, {
        mapa: MAPA_DEL_SERVIDOR,
        campos: CAMPOS_DE_LA_TAREA,
        porDefecto: 'No se pudo crear la tarea. Prueba de nuevo en un momento.',
        accion: 'crear la tarea',
      });
      setDelServidor(reparto.porCampo);
      const primero = reparto.orden[0];
      if (primero) {
        cuerpo.current
          ?.querySelector<HTMLElement>(`[data-campo="${primero}"] :is(textarea, input, button)`)
          ?.focus();
      }
      if (reparto.sueltos.length > 0) {
        toast.error('No se pudo crear la tarea', { description: reparto.sueltos.join(' · ') });
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Cajon abierto={abierto} onOpenChange={onOpenChange} data-testid="nueva-tarea-cajon">
      <CajonCabecera
        titulo="Nueva tarea"
        descripcion="Algo que hay que hacer un día: queda en la agenda con su inmueble y su responsable."
      />
      <form
        className="contents"
        onSubmit={(e) => {
          e.preventDefault();
          void guardar();
        }}
        noValidate
      >
        <CajonCuerpo>
          <div className="space-y-5" data-testid="nueva-tarea" ref={cuerpo}>
            <Campo
              nombre="titulo"
              label="Qué hay que hacer"
              error={errorDe('titulo')}
              contador={`${form.titulo.length}/${TITULO_MAX}`}
            >
              <Textarea
                id="tarea-titulo"
                value={form.titulo}
                onChange={(e) => set('titulo', e.target.value)}
                placeholder="Recoger las llaves del 402 y dejarlas en portería"
                rows={2}
                maxLength={TITULO_MAX}
                aria-invalid={errorDe('titulo') ? true : undefined}
                aria-describedby={errorDe('titulo') ? 'tarea-titulo-error' : undefined}
                data-testid="tarea-titulo"
              />
            </Campo>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)]">
              <Campo nombre="fecha" label="Día" error={errorDe('fecha')}>
                <DatePicker
                  id="tarea-fecha"
                  value={fechaLocal(form.fecha)}
                  onChange={(d) => set('fecha', aFechaIso(d))}
                  minDate={hoyLocal()}
                  placeholder="Elige el día"
                  className={CAMPO_CLICABLE}
                />
              </Campo>
              <Campo nombre="hora" label="Hora" hint="Opcional" error={errorDe('hora')}>
                <TimePicker
                  id="tarea-hora"
                  value={form.hora || undefined}
                  onChange={(h) => set('hora', h)}
                  step={30}
                  className={CAMPO_CLICABLE}
                />
              </Campo>
            </div>

            <Campo nombre="consignacionId" label="Inmueble" hint="Opcional" error={errorDe('consignacionId')}>
              <Combobox
                value={form.consignacionId || undefined}
                onChange={(v) => set('consignacionId', v ?? '')}
                options={inmuebles}
                placeholder={loQueDiceUnSelector({
                  cargando: cargandoInmuebles,
                  error: errorDeInmuebles,
                  cuantos: inmuebles.length,
                  queSon: 'los inmuebles',
                  pista: 'Busca por código, título o dirección',
                  cuandoNoHay: 'Todavía no tienes inmuebles',
                })}
                searchPlaceholder="Escribe #código, título o dirección"
                contentClassName="z-[400]"
              />
            </Campo>

            <Campo nombre="responsableUserId" label="Responsable" hint="Opcional" error={errorDe('responsableUserId')}>
              <Combobox
                value={form.responsableUserId || undefined}
                onChange={(v) => set('responsableUserId', v ?? '')}
                options={responsables}
                placeholder={
                  responsables.length
                    ? coordina
                      ? 'Elige a alguien del equipo'
                      : 'Tú (sin elegir, queda para ti)'
                    : 'Sin personas activas en el equipo'
                }
                searchPlaceholder="Nombre"
                disabled={responsables.length === 0}
                contentClassName="z-[400]"
              />
            </Campo>

            <Campo nombre="nota" label="Nota" hint="Opcional" error={errorDe('nota')}>
              <Textarea
                id="tarea-nota"
                value={form.nota}
                onChange={(e) => set('nota', e.target.value)}
                rows={3}
                maxLength={MAX_LARGO_NOTA_DE_LA_TAREA}
                aria-invalid={errorDe('nota') ? true : undefined}
                aria-describedby={errorDe('nota') ? 'tarea-nota-error' : undefined}
                placeholder="Detalles, a quién llamar, qué llevar…"
              />
            </Campo>
          </div>
        </CajonCuerpo>

        <CajonPie ayuda={falta ? <span data-testid="tarea-falta">{falta}</span> : null}>
          <Button type="button" variant="outline" hideArrow onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" hideArrow disabled={!valido} isLoading={guardando} data-testid="tarea-guardar">
            Crear tarea
          </Button>
        </CajonPie>
      </form>
    </Cajon>
  );
}

/**
 * Un campo del cajón. El error entra suave bajo el campo (`ErrorDelCampo`,
 * el `FormError` de Cadence) y, si hay ayuda («Opcional»), se cruza con ella.
 */
function Campo({
  nombre,
  label,
  hint,
  error,
  contador,
  children,
}: {
  nombre: CampoDeLaTarea;
  label: string;
  hint?: string;
  error?: string;
  contador?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5" data-campo={nombre}>
      <div className="flex items-baseline justify-between">
        <label className="block text-sm font-medium text-fg" htmlFor={`tarea-${nombre}`}>
          {label}
        </label>
        {contador ? <span className="text-xs tabular-nums text-fg-muted">{contador}</span> : null}
      </div>
      {children}
      {error || hint ? (
        <ErrorDelCampo id={`tarea-${nombre}-error`} mensaje={error} pista={hint} className="mt-0" />
      ) : null}
    </div>
  );
}
