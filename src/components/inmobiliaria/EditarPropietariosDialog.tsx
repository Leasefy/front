'use client';

/**
 * EditarPropietariosDialog — quiénes son los dueños de un inmueble que YA
 * está consignado, y qué porcentaje del canon le toca a cada uno.
 *
 * ── Por qué existe (Nico, 2026-09-13) ─────────────────────────────────────
 * «¿Seguro que ya tienes la posibilidad de que exista el múltiple
 * propietario? … un inmueble puede tener múltiples propietarios con
 * diferentes % del canon.»
 *
 * Varios dueños se podían ELEGIR al crear el mandato (`SelectorDePropietarios`
 * + `RepartoEntreDuenos` en el wizard y en «Completar mandato»), pero un
 * mandato que ya existía no tenía dónde cambiarlos: la ficha del inmueble
 * mostraba la lista en solo lectura y la tarjeta «Partes» del contrato mandaba
 * a «corregirlos en el mandato» sin que hubiera un lugar para hacerlo. Peor: el
 * único botón que había, «Cambiar propietario», mandaba `{ propietarioId }` a
 * secas y el back lo leía como «ahora es uno solo al 100 %» — borraba a los
 * demás dueños sin avisar.
 *
 * ── Lo que hace ───────────────────────────────────────────────────────────
 * Reusa los dos componentes del alta y manda SIEMPRE la lista completa
 * (`PUT /inmobiliaria/consignaciones/:id { copropietarios }`), incluso con un
 * dueño solo: esa forma no deja nada a la interpretación del servidor. El
 * primero elegido es el principal y se lleva el resto del reparto, así que la
 * suma da 100 % por construcción; `motivoInvalido` dice, en español, por qué
 * todavía no se puede guardar (repetidos, ceros, un principal sin nada).
 *
 * Es el MISMO diálogo desde la ficha del inmueble y desde la tarjeta «Partes»
 * del contrato: un solo lugar donde se edita el mismo dato.
 */

import { useEffect, useMemo, useState } from 'react';
import { Warning } from '@phosphor-icons/react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { consignacionesApi, propietariosApi } from '@/lib/api/inmobiliaria.service';
import { BPS_TOTAL } from '@/lib/types/inmobiliaria';
import type { Consignacion, Propietario } from '@/lib/types/inmobiliaria';
import { SelectorDePropietarios, type PropietarioPendiente } from './SelectorDePropietarios';
import { RepartoEntreDuenos, repartoEnPartesIguales } from './RepartoEntreDuenos';
import { aListaDelCable, motivoInvalido, type FilaCopropietario } from './CopropietariosField';
import { persistPropietarioIfNeeded } from './CompletarMandatoDialog';

/** Un dueño con su tajada, tal como viaja al back. */
interface DuenoConParticipacion {
  propietarioId: string;
  participacionBps: number;
}

/**
 * Los dueños que el mandato tiene HOY, de mayor a menor.
 *
 * Contra un back viejo `copropietarios` viene vacío: ahí se cae a
 * `propietarioId` al 100 %, que es lo que el back tiene escrito en la columna
 * derivada. No se inventa una participación distinta de esa.
 */
export function duenosActuales(consignacion: Consignacion): DuenoConParticipacion[] {
  if (consignacion.copropietarios.length > 0) {
    return [...consignacion.copropietarios]
      .map((c) => ({ propietarioId: c.propietarioId, participacionBps: c.participacionBps }))
      .sort((a, b) => b.participacionBps - a.participacionBps || a.propietarioId.localeCompare(b.propietarioId));
  }
  return [{ propietarioId: consignacion.propietarioId, participacionBps: BPS_TOTAL }];
}

/** ¿Las dos listas nombran a los mismos dueños con los mismos porcentajes? */
export function mismoReparto(a: readonly DuenoConParticipacion[], b: readonly DuenoConParticipacion[]): boolean {
  if (a.length !== b.length) return false;
  const de = new Map(a.map((x) => [x.propietarioId, x.participacionBps]));
  return b.every((x) => de.get(x.propietarioId) === x.participacionBps);
}

/**
 * La lista completa para el cable a partir del estado del diálogo: el
 * principal con el resto y los demás con su casilla. Con un dueño solo es una
 * lista de uno al 100 % — se manda igual como lista, nunca como
 * `propietarioId` suelto (ver el encabezado).
 */
export function listaParaGuardar(filas: readonly FilaCopropietario[], principalId: string): DuenoConParticipacion[] {
  return aListaDelCable(filas, principalId) ?? [{ propietarioId: principalId, participacionBps: BPS_TOTAL }];
}

export interface EditarPropietariosDialogProps {
  open: boolean;
  consignacion: Consignacion;
  onClose: () => void;
  /** La consignación ya actualizada por el back; quien la muestra la reemplaza en su estado. */
  onGuardado: (consignacion: Consignacion) => void;
}

export function EditarPropietariosDialog({ open, consignacion, onClose, onGuardado }: EditarPropietariosDialogProps) {
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [cargando, setCargando] = useState(false);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [filas, setFilas] = useState<FilaCopropietario[]>([]);
  const [pendiente, setPendiente] = useState<PropietarioPendiente | undefined>();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actuales = useMemo(() => duenosActuales(consignacion), [consignacion]);

  // Cada apertura arranca desde lo que el mandato tiene guardado, no desde lo
  // que quedó a medias la vez anterior.
  useEffect(() => {
    if (!open) return;
    setSeleccion(actuales.map((d) => d.propietarioId));
    setFilas(actuales.slice(1).map((d) => ({ propietarioId: d.propietarioId, participacionBps: d.participacionBps })));
    setPendiente(undefined);
    setError(null);
    setCargando(true);
    propietariosApi
      .getAll()
      .then(setPropietarios)
      .catch(() => toast.error('No pudimos cargar los propietarios. Prueba de nuevo.'))
      .finally(() => setCargando(false));
  }, [open, actuales]);

  // Cambiar QUIÉNES son vuelve a repartir en partes iguales; los porcentajes
  // se afinan después en `RepartoEntreDuenos`.
  const cambiarSeleccion = (ids: string[]) => {
    setSeleccion(ids);
    setFilas(repartoEnPartesIguales(ids));
  };

  const nombreDe = (id: string) =>
    propietarios.find((p) => p.id === id)?.name ??
    consignacion.copropietarios.find((c) => c.propietarioId === id)?.propietario?.name ??
    (pendiente?.id === id ? pendiente.data.name : id);

  const principalId = seleccion[0] ?? null;
  const problema = principalId ? motivoInvalido(filas, principalId) : 'Elige al menos un propietario.';
  const sinCambio = !pendiente && principalId !== null && mismoReparto(listaParaGuardar(filas, principalId), actuales);

  const guardar = async () => {
    if (!principalId || problema || sinCambio || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      // El dueño nuevo (si lo hay) se crea primero y su id temporal se cambia
      // por el real donde aparezca: en el principal y en el reparto.
      const idReal = pendiente ? await persistPropietarioIfNeeded(pendiente.id, pendiente.data) : null;
      const real = (id: string) => (pendiente && idReal && id === pendiente.id ? idReal : id);
      const lista = listaParaGuardar(
        filas.map((f) => ({ ...f, propietarioId: f.propietarioId ? real(f.propietarioId) : f.propietarioId })),
        real(principalId),
      );
      const actualizada = await consignacionesApi.update(consignacion.id, { copropietarios: lista });
      onGuardado(actualizada);
      toast.success(lista.length > 1 ? 'Propietarios y reparto guardados' : 'Propietario guardado');
      onClose();
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : 'No pudimos guardar los propietarios. Prueba de nuevo en un momento.',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(abierto) => !abierto && !guardando && onClose()}>
      <DialogContent className="max-w-3xl" data-testid="editar-propietarios-dialog">
        <DialogHeader>
          <DialogTitle>¿De quién es este inmueble?</DialogTitle>
          <DialogDescription>
            Los dueños de «{consignacion.propertyTitle}» y qué porcentaje del canon le toca a cada uno.
            La comisión y las fechas del mandato no cambian; los giros futuros se reparten con estos
            porcentajes.
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <p className="py-6 text-center text-sm text-fg-muted">Cargando propietarios…</p>
        ) : (
          <div className="space-y-4">
            <SelectorDePropietarios
              propietarios={propietarios}
              seleccion={seleccion}
              onCambiarSeleccion={cambiarSeleccion}
              pendiente={pendiente}
              onPendiente={setPendiente}
            />
            <RepartoEntreDuenos seleccion={seleccion} nombreDe={nombreDe} filas={filas} onChange={setFilas} />
            {seleccion.length === 0 ? (
              <p role="alert" className="flex items-start gap-1.5 text-sm text-danger" data-testid="editar-propietarios-problema">
                <Warning className="mt-0.5 h-4 w-4 shrink-0" />
                {problema}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-danger" data-testid="editar-propietarios-error">
                {error}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" hideArrow onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            hideArrow
            onClick={() => void guardar()}
            disabled={!principalId || Boolean(problema) || sinCambio || guardando || cargando}
            isLoading={guardando}
            data-testid="editar-propietarios-guardar"
          >
            Guardar propietarios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
