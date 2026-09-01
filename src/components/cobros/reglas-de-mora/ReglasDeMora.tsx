'use client';

/**
 * Reglas de mora — la lista, el estado vacío con las dos plantillas, y el
 * editor.
 *
 * Los permisos son los del back: ver con `cobros/view`, crear con
 * `cobros/create`, editar y apagar con `cobros/edit`. Mientras los permisos
 * cargan se muestra todo; si después el back dice que no, devuelve 403 y el
 * mensaje se ve igual.
 *
 * Una regla no se borra: se apaga. Los cobros ya emitidos apuntan a ella y
 * ahí vive la explicación de por qué se cobró eso.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Info, PencilSimple, Percent, Plus, Receipt, Scales } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useInmobiliariaConfig } from '@/lib/hooks/useInmobiliaria';
import { ordenarReglas, reglasDeMoraApi } from '@/lib/api/reglas-de-mora.service';
import type { ReglaDeMora } from '@/lib/api/reglas-de-mora.types';
import { cn } from '@/lib/utils';
import { EditorDeRegla } from './EditorDeRegla';
import { PLANTILLAS, type PlantillaDeRegla, type ValoresDeRegla } from './esquema';
import { describirRegla, NOMBRE_DEL_CONCEPTO } from './legible';

const ICONO_DE_LA_PLANTILLA: Record<PlantillaDeRegla['id'], typeof Percent> = {
  'interes-diario': Percent,
  'gasto-administrativo': Receipt,
};

/**
 * Las plantillas que todavía no están entre las reglas. Se comparan por lo que
 * hace la regla (concepto + disparador + fórmula), no por el nombre: si alguien
 * la renombró, sigue siendo la misma regla.
 */
export function plantillasQueFaltan(reglas: readonly ReglaDeMora[]): PlantillaDeRegla[] {
  return PLANTILLAS.filter(
    (plantilla) =>
      !reglas.some(
        (regla) =>
          regla.concepto === plantilla.valores.concepto &&
          regla.disparador === plantilla.valores.disparador &&
          regla.formula === plantilla.valores.formula,
      ),
  );
}

function mensajeDe(error: unknown, siNo: string): string {
  return error instanceof Error && error.message ? error.message : siNo;
}

export function ReglasDeMora() {
  const { canAccess, isLoading: permisosCargando } = usePermissions();
  const puedeCrear = permisosCargando || canAccess('cobros', 'create');
  const puedeEditar = permisosCargando || canAccess('cobros', 'edit');
  // El dato vivo: `GET /inmobiliaria/config` trae la fila entera de la agencia,
  // con `motorDeCobrosV2`. Sin el dato (cargando o back viejo) se avisa en
  // neutro; nunca se afirma que está prendido sin verlo.
  const { config } = useInmobiliariaConfig();
  const motorPrendido = config?.agency?.motorDeCobrosV2;

  const [reglas, setReglas] = useState<ReglaDeMora[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorDeCarga, setErrorDeCarga] = useState<unknown>(null);
  const [editor, setEditor] = useState<{ abierto: boolean; regla: ReglaDeMora | null }>({
    abierto: false,
    regla: null,
  });
  const [ocupadas, setOcupadas] = useState<ReadonlySet<string>>(new Set());
  const [plantillaEnCurso, setPlantillaEnCurso] = useState<PlantillaDeRegla['id'] | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorDeCarga(null);
    try {
      setReglas(await reglasDeMoraApi.listar());
    } catch (error) {
      setErrorDeCarga(error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const ponerRegla = useCallback((regla: ReglaDeMora) => {
    setReglas((previas) => {
      const lista = previas ?? [];
      const existe = lista.some((r) => r.id === regla.id);
      return ordenarReglas(existe ? lista.map((r) => (r.id === regla.id ? regla : r)) : [...lista, regla]);
    });
  }, []);

  const marcarOcupada = (id: string, ocupada: boolean) => {
    setOcupadas((previas) => {
      const siguiente = new Set(previas);
      if (ocupada) siguiente.add(id);
      else siguiente.delete(id);
      return siguiente;
    });
  };

  const abrirNueva = () => setEditor({ abierto: true, regla: null });
  const abrirEdicion = (regla: ReglaDeMora) => setEditor({ abierto: true, regla });
  const cerrarEditor = () => setEditor((e) => ({ ...e, abierto: false }));

  /** Crear o guardar desde el editor. Relanza: el error se muestra adentro del modal. */
  const guardar = async (valores: ValoresDeRegla) => {
    if (editor.regla) {
      const regla = await reglasDeMoraApi.actualizar(editor.regla.id, valores);
      ponerRegla(regla);
      toast.success(`«${regla.nombre}» quedó guardada.`);
    } else {
      const regla = await reglasDeMoraApi.crear(valores);
      ponerRegla(regla);
      toast.success(`«${regla.nombre}» quedó creada.`);
    }
  };

  const usarPlantilla = async (plantilla: PlantillaDeRegla) => {
    setPlantillaEnCurso(plantilla.id);
    try {
      const regla = await reglasDeMoraApi.crear(plantilla.valores);
      ponerRegla(regla);
      toast.success(`«${regla.nombre}» quedó creada.`);
    } catch (error) {
      toast.error(mensajeDe(error, 'No se pudo crear la regla.'));
    } finally {
      setPlantillaEnCurso(null);
    }
  };

  const cambiarActiva = async (regla: ReglaDeMora, activa: boolean) => {
    marcarOcupada(regla.id, true);
    try {
      ponerRegla(await reglasDeMoraApi.actualizar(regla.id, { activa }));
    } catch (error) {
      toast.error(mensajeDe(error, activa ? 'No se pudo prender la regla.' : 'No se pudo apagar la regla.'));
    } finally {
      marcarOcupada(regla.id, false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2 text-xs text-fg-muted" data-testid="aviso-motor" data-motor={String(motorPrendido)}>
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {motorPrendido === true ? (
          <span>
            El motor de cobros con reglas está <strong className="font-medium text-fg">prendido</strong>: estas reglas
            se aplican en el recálculo de cada madrugada sobre los cobros vencidos.
          </span>
        ) : motorPrendido === false ? (
          <span>
            El motor de cobros con reglas está <strong className="font-medium text-fg">apagado</strong>: hoy se cobra el
            % mensual fijo de la configuración y estas reglas no le cambian un peso a nadie. Se pueden dejar
            listas y{' '}
            <Link href="/panel/inmobiliaria/configuracion" className="underline underline-offset-2 hover:text-fg">
              prenderlo en configuración
            </Link>
            .
          </span>
        ) : (
          <span>
            Se aplican sólo con el motor de cobros con reglas prendido en la inmobiliaria. Hasta entonces se
            pueden dejar listas y revisarlas en frío: no le cambian un peso a nadie.
          </span>
        )}
      </p>

      {cargando ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Spinner size="lg" />
          <p className="text-sm text-fg-muted">Cargando reglas...</p>
        </div>
      ) : errorDeCarga ? (
        <FalloDeCarga error={errorDeCarga} queEs="las reglas de mora" onReintentar={cargar} />
      ) : !reglas || reglas.length === 0 ? (
        <div className="space-y-5" data-testid="reglas-vacio">
          <EmptyState
            icon={Scales}
            title="Todavía no hay reglas de mora"
            description="Sin reglas, un cobro vencido no suma nada. Empezá con las dos que usa cualquier inmobiliaria, o armá la tuya."
            action={puedeCrear ? { label: 'Crear una regla', onClick: abrirNueva } : undefined}
          />
          {puedeCrear && (
            <div className="grid gap-4 md:grid-cols-2">
              {PLANTILLAS.map((plantilla) => (
                <TarjetaDePlantilla
                  key={plantilla.id}
                  plantilla={plantilla}
                  ocupada={plantillaEnCurso === plantilla.id}
                  deshabilitada={plantillaEnCurso !== null}
                  onUsar={() => usarPlantilla(plantilla)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-fg-muted">
              <span className="font-mono tabular-nums">{reglas.length}</span>{' '}
              {reglas.length === 1 ? 'regla' : 'reglas'}, en el orden en que se aplican
            </p>
            {puedeCrear && (
              <Button hideArrow size="sm" onClick={abrirNueva}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nueva regla
              </Button>
            )}
          </div>

          <ul className="divide-y divide-border rounded-lg border border-border bg-surface" data-testid="reglas-lista">
            {reglas.map((regla) => (
              <li
                key={regla.id}
                data-testid={`regla-${regla.id}`}
                className={cn(
                  'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4',
                  !regla.activa && 'opacity-70',
                )}
              >
                <span className="w-8 shrink-0 font-mono text-xs tabular-nums text-fg-muted">#{regla.orden}</span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-fg">{regla.nombre}</p>
                    <Badge variant="secondary">{NOMBRE_DEL_CONCEPTO[regla.concepto]}</Badge>
                    {!regla.activa && <Badge variant="outline">Apagada</Badge>}
                  </div>
                  <p className="text-sm text-fg-muted">{describirRegla(regla)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-fg-muted">
                    <Switch
                      checked={regla.activa}
                      onCheckedChange={(activa) => void cambiarActiva(regla, activa)}
                      disabled={!puedeEditar || ocupadas.has(regla.id)}
                      aria-label={`${regla.activa ? 'Apagar' : 'Prender'} «${regla.nombre}»`}
                      data-testid={`activa-${regla.id}`}
                    />
                    {regla.activa ? 'Activa' : 'Apagada'}
                  </label>
                  <Button
                    variant="secondary"
                    size="sm"
                    hideArrow
                    onClick={() => abrirEdicion(regla)}
                    disabled={!puedeEditar}
                    aria-label={`Editar «${regla.nombre}»`}
                  >
                    <PencilSimple className="h-4 w-4" aria-hidden="true" />
                    Editar
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {puedeCrear && plantillasQueFaltan(reglas).length > 0 && (
            <div className="space-y-3 pt-2" data-testid="reglas-sugerencias">
              <p className="text-xs uppercase tracking-wide text-fg-muted">Sugerencias que todavía no tenés</p>
              <div className="grid gap-4 md:grid-cols-2">
                {plantillasQueFaltan(reglas).map((plantilla) => (
                  <TarjetaDePlantilla
                    key={plantilla.id}
                    plantilla={plantilla}
                    ocupada={plantillaEnCurso === plantilla.id}
                    deshabilitada={plantillaEnCurso !== null}
                    onUsar={() => usarPlantilla(plantilla)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <EditorDeRegla abierto={editor.abierto} regla={editor.regla} onCerrar={cerrarEditor} onGuardar={guardar} />
    </div>
  );
}

function TarjetaDePlantilla({
  plantilla,
  ocupada,
  deshabilitada,
  onUsar,
}: {
  plantilla: PlantillaDeRegla;
  ocupada: boolean;
  deshabilitada: boolean;
  onUsar: () => void;
}) {
  const Icono = ICONO_DE_LA_PLANTILLA[plantilla.id];
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5"
      data-testid={`plantilla-${plantilla.id}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg">
          <Icono className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="font-medium text-fg">{plantilla.titulo}</p>
      </div>
      <p className="text-sm text-fg-muted">{plantilla.explicacion}</p>
      <p className="text-xs text-fg-muted">{describirRegla({ ...plantilla.valores, topeCop: plantilla.valores.topeCop ?? null })}</p>
      <div>
        <Button variant="secondary" size="sm" hideArrow onClick={onUsar} isLoading={ocupada} disabled={deshabilitada}>
          Usar esta regla
        </Button>
      </div>
    </div>
  );
}
