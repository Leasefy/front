'use client';

/**
 * Medios de pago de la inmobiliaria — la pestaña de configuración.
 *
 * Es lo que la inmobiliaria le muestra al inquilino («transferí acá», «pagá
 * por este enlace») y lo que alimenta el selector de medio del recibo de
 * caja. Un medio no se borra: se apaga, porque los recibos viejos lo nombran.
 *
 * Permisos: los del back — `configuracion/view` para ver, `configuracion/edit`
 * para tocar. Mientras cargan se muestra todo; si el back dice que no,
 * devuelve 403 y el mensaje se ve igual.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bank,
  CreditCard,
  Eye,
  EyeSlash,
  Info,
  Money,
  PencilSimple,
  Plus,
  Wallet,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { mediosDePagoApi, ordenarMedios } from '@/lib/api/medios-de-pago.service';
import type { MedioDePago, NuevoMedioDePago } from '@/lib/api/medios-de-pago.types';
import { cn } from '@/lib/utils';
import { EditorDeMedio } from './EditorDeMedio';
import {
  ICONO_DEL_TIPO,
  NOMBRE_DEL_TIPO,
  describirMedio,
  sugerencias,
  type SugerenciaDeMedio,
} from './legible';

export interface MediosDePagoProps {
  /** El perfil de la agencia, para prellenar titular y NIT de la sugerencia. */
  agencia?: { name?: string | null; razonSocial?: string | null; nit?: string | null } | null;
}

function mensajeDe(error: unknown, siNo: string): string {
  return error instanceof Error && error.message ? error.message : siNo;
}

export function MediosDePago({ agencia }: MediosDePagoProps) {
  const { canAccess, isLoading: permisosCargando } = usePermissions();
  const puedeEditar = permisosCargando || canAccess('configuracion', 'edit');

  const [medios, setMedios] = useState<MedioDePago[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorDeCarga, setErrorDeCarga] = useState<unknown>(null);
  const [ocupadas, setOcupadas] = useState<ReadonlySet<string>>(new Set());
  const [editor, setEditor] = useState<{
    abierto: boolean;
    medio: MedioDePago | null;
    inicial: NuevoMedioDePago | null;
  }>({ abierto: false, medio: null, inicial: null });
  const [sugerenciaEnCurso, setSugerenciaEnCurso] = useState<SugerenciaDeMedio['id'] | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorDeCarga(null);
    try {
      setMedios(await mediosDePagoApi.listar());
    } catch (error) {
      setErrorDeCarga(error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const marcarOcupada = (id: string, ocupada: boolean) =>
    setOcupadas((previas) => {
      const siguientes = new Set(previas);
      if (ocupada) siguientes.add(id);
      else siguientes.delete(id);
      return siguientes;
    });

  const reemplazar = (medio: MedioDePago) =>
    setMedios((previos) => ordenarMedios((previos ?? []).map((m) => (m.id === medio.id ? medio : m))));

  const abrirNuevo = () => setEditor({ abierto: true, medio: null, inicial: null });
  const abrirEdicion = (medio: MedioDePago) => setEditor({ abierto: true, medio, inicial: null });
  const cerrarEditor = () => setEditor((e) => ({ ...e, abierto: false }));

  const guardar = async (valores: NuevoMedioDePago) => {
    if (editor.medio) {
      const actualizado = await mediosDePagoApi.actualizar(editor.medio.id, valores);
      reemplazar(actualizado);
      toast.success(`«${actualizado.nombre}» quedó guardado.`);
    } else {
      const creado = await mediosDePagoApi.crear(valores);
      setMedios((previos) => ordenarMedios([...(previos ?? []), creado]));
      toast.success(`«${creado.nombre}» quedó creado.`);
    }
    cerrarEditor();
  };

  const usarSugerencia = async (sugerencia: SugerenciaDeMedio) => {
    if (!sugerencia.directa) {
      setEditor({ abierto: true, medio: null, inicial: sugerencia.valores });
      return;
    }
    setSugerenciaEnCurso(sugerencia.id);
    try {
      const creado = await mediosDePagoApi.crear(sugerencia.valores);
      setMedios((previos) => ordenarMedios([...(previos ?? []), creado]));
      toast.success(`«${creado.nombre}» quedó creado.`);
    } catch (error) {
      toast.error(mensajeDe(error, 'No se pudo crear el medio de pago.'));
    } finally {
      setSugerenciaEnCurso(null);
    }
  };

  const cambiarBandera = async (
    medio: MedioDePago,
    clave: 'activo' | 'visibleAlInquilino',
    valor: boolean,
  ) => {
    marcarOcupada(medio.id, true);
    try {
      reemplazar(await mediosDePagoApi.actualizar(medio.id, { [clave]: valor }));
    } catch (error) {
      toast.error(mensajeDe(error, 'No se pudo guardar el cambio.'));
    } finally {
      marcarOcupada(medio.id, false);
    }
  };

  const mover = async (indice: number, direccion: -1 | 1) => {
    if (!medios) return;
    const destino = indice + direccion;
    if (destino < 0 || destino >= medios.length) return;
    const copia = [...medios];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    const items = copia.map((m, i) => ({ id: m.id, orden: i }));
    setMedios(copia.map((m, i) => ({ ...m, orden: i })));
    try {
      setMedios(await mediosDePagoApi.reordenar(items));
    } catch (error) {
      toast.error(mensajeDe(error, 'No se pudo reordenar.'));
      setMedios(medios);
    }
  };

  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2 text-xs text-fg-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Los medios se muestran al inquilino en su portal, en «Cómo pagar», y alimentan el selector de
          medio del recibo de caja. El número de cuenta se le muestra siempre tapado: sólo los últimos cuatro.
        </span>
      </p>

      {cargando ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Spinner size="lg" />
          <p className="text-sm text-fg-muted">Cargando medios de pago...</p>
        </div>
      ) : errorDeCarga ? (
        <FalloDeCarga error={errorDeCarga} queEs="los medios de pago" onReintentar={cargar} />
      ) : !medios || medios.length === 0 ? (
        <div className="space-y-5" data-testid="medios-vacio">
          <EmptyState
            icon={Wallet}
            title="Todavía no tenés medios de pago"
            description="Sin medios, el inquilino no sabe a dónde pagarte y el recibo de caja usa la lista genérica. Empezá con los dos de siempre, o armá el tuyo."
            action={puedeEditar ? { label: 'Crear un medio', onClick: abrirNuevo } : undefined}
          />
          {puedeEditar && (
            <div className="grid gap-4 md:grid-cols-2">
              {sugerencias(agencia).map((s) => (
                <TarjetaDeSugerencia
                  key={s.id}
                  sugerencia={s}
                  ocupada={sugerenciaEnCurso === s.id}
                  deshabilitada={sugerenciaEnCurso !== null}
                  onUsar={() => usarSugerencia(s)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-fg-muted">
              <span className="font-mono tabular-nums">{medios.length}</span>{' '}
              {medios.length === 1 ? 'medio' : 'medios'}, en el orden en que se muestran
            </p>
            {puedeEditar && (
              <Button hideArrow size="sm" onClick={abrirNuevo}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nuevo medio
              </Button>
            )}
          </div>

          <ul className="divide-y divide-border rounded-lg border border-border bg-surface" data-testid="medios-lista">
            {medios.map((medio, indice) => {
              const Icono = ICONO_DEL_TIPO[medio.tipo];
              const ocupada = ocupadas.has(medio.id);
              return (
                <li
                  key={medio.id}
                  data-testid={`medio-${medio.id}`}
                  className={cn(
                    'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4',
                    !medio.activo && 'opacity-70',
                  )}
                >
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      className="rounded-full p-1 text-fg-muted hover:bg-surface-muted disabled:opacity-40"
                      aria-label={`Subir «${medio.nombre}»`}
                      disabled={!puedeEditar || indice === 0}
                      onClick={() => void mover(indice, -1)}
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full p-1 text-fg-muted hover:bg-surface-muted disabled:opacity-40"
                      aria-label={`Bajar «${medio.nombre}»`}
                      disabled={!puedeEditar || indice === medios.length - 1}
                      onClick={() => void mover(indice, 1)}
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
                    <Icono className="h-5 w-5 text-fg-muted" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-fg">{medio.nombre}</p>
                      <Badge variant="secondary">{NOMBRE_DEL_TIPO[medio.tipo]}</Badge>
                      {!medio.activo && <Badge variant="outline">Apagado</Badge>}
                      {!medio.visibleAlInquilino && (
                        <Badge variant="outline">
                          <EyeSlash className="mr-1 h-3 w-3" aria-hidden="true" />
                          Sólo interno
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-fg-muted">{describirMedio(medio)}</p>
                    {medio.instrucciones && <p className="text-xs text-fg-subtle">{medio.instrucciones}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-fg-muted">
                      <Switch
                        checked={medio.visibleAlInquilino}
                        onCheckedChange={(v) => void cambiarBandera(medio, 'visibleAlInquilino', v)}
                        disabled={!puedeEditar || ocupada}
                        aria-label={`${medio.visibleAlInquilino ? 'Ocultar' : 'Mostrar'} «${medio.nombre}» al inquilino`}
                        data-testid={`visible-${medio.id}`}
                      />
                      {medio.visibleAlInquilino ? (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <EyeSlash className="h-4 w-4" aria-hidden="true" />
                      )}
                    </label>
                    <label className="flex items-center gap-2 text-xs text-fg-muted">
                      <Switch
                        checked={medio.activo}
                        onCheckedChange={(v) => void cambiarBandera(medio, 'activo', v)}
                        disabled={!puedeEditar || ocupada}
                        aria-label={`${medio.activo ? 'Apagar' : 'Prender'} «${medio.nombre}»`}
                        data-testid={`activo-${medio.id}`}
                      />
                      {medio.activo ? 'Activo' : 'Apagado'}
                    </label>
                    <Button
                      variant="secondary"
                      size="sm"
                      hideArrow
                      onClick={() => abrirEdicion(medio)}
                      disabled={!puedeEditar}
                      aria-label={`Editar «${medio.nombre}»`}
                    >
                      <PencilSimple className="h-4 w-4" aria-hidden="true" />
                      Editar
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Lo que ya existe sin configurar nada, y lo que viene. */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted p-4" data-testid="fila-wompi">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface">
            <CreditCard className="h-5 w-5 text-fg-muted" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-fg">PSE por Wompi</p>
              <Badge variant="secondary">Integración de Leasefy</Badge>
            </div>
            <p className="text-sm text-fg-muted">
              El pago en línea del portal del inquilino. Viene con la plataforma; no se edita acá.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-border p-4 opacity-70" data-testid="tarjeta-cobre" aria-disabled="true">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
            <Bank className="h-5 w-5 text-fg-muted" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-fg">Cobre — recaudo y dispersión</p>
              <Badge variant="outline">Pendiente</Badge>
            </div>
            <p className="text-sm text-fg-muted">
              Requiere cuenta comercial en Cobre; cuando esté, entra como enlace de pago o como integración.
            </p>
          </div>
        </div>
      </div>

      <EditorDeMedio
        abierto={editor.abierto}
        medio={editor.medio}
        inicial={editor.inicial}
        onCerrar={cerrarEditor}
        onGuardar={guardar}
      />
    </div>
  );
}

function TarjetaDeSugerencia({
  sugerencia,
  ocupada,
  deshabilitada,
  onUsar,
}: {
  sugerencia: SugerenciaDeMedio;
  ocupada: boolean;
  deshabilitada: boolean;
  onUsar: () => void;
}) {
  const Icono = sugerencia.id === 'transferencia' ? Bank : Money;
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
      data-testid={`sugerencia-${sugerencia.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
          <Icono className="h-5 w-5 text-fg-muted" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-fg">{sugerencia.titulo}</p>
          <p className="text-sm text-fg-muted">{sugerencia.explicacion}</p>
        </div>
      </div>
      <div>
        <Button variant="secondary" size="sm" hideArrow isLoading={ocupada} disabled={deshabilitada} onClick={onUsar}>
          {sugerencia.directa ? 'Usar este medio' : 'Completar la cuenta'}
        </Button>
      </div>
    </div>
  );
}
