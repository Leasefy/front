'use client';

/**
 * Reglas de mora — la tabla, el vacío, las sugerencias, y el editor.
 *
 * ── Por qué es una tabla (Nico, 2026-09-02) ───────────────────────────────
 * «Esto se ve raro, ahí se ve como un empty state pero también hay reglas
 * creadas, quizás mejor acá manejemos una tabla de las que usamos completas
 * para cuando haya reglas creadas.»
 *
 * El problema no era la lista: era que las dos PLANTILLAS —tarjetas con
 * botón «Usar esta regla»— quedaban justo debajo del vacío y se leían como
 * reglas ya creadas. Una plantilla no existe en la base, no tiene `id`, no
 * cobra un peso y no está en ningún orden de aplicación. Así que ahora:
 *
 *   - lo creado va en la TABLA de la casa (Table/TableHeader/…, celdas `p-4`,
 *     `overflow-x-auto`, fila clickeable, paginación con `useTablePagination`),
 *     igual que inquilinos y propietarios;
 *   - lo sugerido va en una zona aparte, con encabezado propio, borde
 *     punteado y chip «Sugerencia»: nada que se pueda confundir con una fila
 *     de datos.
 *
 * ── Permisos ──────────────────────────────────────────────────────────────
 * Los del back: ver con `cobros/view`, crear con `cobros/create`, editar y
 * apagar con `cobros/edit`. Mientras los permisos cargan se muestra todo; si
 * después el back dice que no, devuelve 403 y el mensaje se ve igual.
 *
 * Una regla no se borra: se apaga. Los cobros ya emitidos apuntan a ella y
 * ahí vive la explicación de por qué se cobró eso.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Info, Lightbulb, PencilSimple, Percent, Plus, Receipt, Scales } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { useI18n } from '@/lib/i18n';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useInmobiliariaConfig } from '@/lib/hooks/useInmobiliaria';
import { useTablePagination } from '@/lib/hooks/use-table-pagination';
import { ordenarReglas, reglasDeMoraApi } from '@/lib/api/reglas-de-mora.service';
import type { ReglaDeMora } from '@/lib/api/reglas-de-mora.types';
import { cn } from '@/lib/utils';
import { EditorDeRegla } from './EditorDeRegla';
import { PLANTILLAS, type PlantillaDeRegla, type ValoresDeRegla } from './esquema';
import {
  describirDisparador,
  describirFormula,
  describirRegla,
  describirTope,
  NOMBRE_DEL_CONCEPTO,
  NOMBRE_DEL_DISPARADOR,
  NOMBRE_DE_LA_FORMULA,
} from './legible';

const ICONO_DE_LA_PLANTILLA: Record<PlantillaDeRegla['id'], typeof Percent> = {
  'interes-diario': Percent,
  'gasto-administrativo': Receipt,
};

/** «desde el primer día de mora» → «Desde el primer día de mora». */
function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

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
  const { t } = useI18n();
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

  /** Identidad estable: `useTablePagination` recorta sobre esta lista. */
  const lista = useMemo(() => reglas ?? [], [reglas]);

  /*
   * Paginación en el cliente: el back devuelve las reglas de la agencia
   * enteras, sin `page`. Suelen ser dos o tres, así que el pie casi nunca
   * aparece —sólo cuando `total > pageSize`—; existe igual porque nada impide
   * que una inmobiliaria arme quince y entonces la tabla sí necesita cortarse.
   */
  const { pageItems, total, page, pageSize, setPage, setPageSize } = useTablePagination(lista, {
    initialPageSize: 10,
  });

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

  const faltantes = plantillasQueFaltan(lista);

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

      <EstadoDeDatos
        cargando={cargando}
        error={errorDeCarga}
        queEs={t('reglasDeMora.queEs')}
        onReintentar={cargar}
      >
        {lista.length === 0 ? (
          <div className="space-y-5" data-testid="reglas-vacio">
            {/* El vacío es la tabla sin filas: va encerrado en la misma tarjeta
                que la tabla, como todos los vacíos del panel (Nico, 2026-09-01). */}
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <SinDatos
                queSon={t('reglasDeMora.queSon')}
                icono={Scales}
                titulo={t('reglasDeMora.vacio.titulo')}
                descripcion={t('reglasDeMora.vacio.descripcion')}
                crear={puedeCrear ? { label: t('reglasDeMora.vacio.crear'), onClick: abrirNueva } : undefined}
              />
            </div>

            {/* 🔴 Fuera de la tarjeta y con encabezado propio: acá empieza otra
                cosa. Antes esto colgaba pelado del vacío y las dos tarjetas se
                leían como las reglas que la agencia ya tenía. */}
            {puedeCrear && (
              <Sugerencias
                titulo={t('reglasDeMora.sugerencias.vacioTitulo')}
                descripcion={t('reglasDeMora.sugerencias.vacioDescripcion')}
                plantillas={faltantes}
                enCurso={plantillaEnCurso}
                onUsar={usarPlantilla}
              />
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-fg-muted">
                  <span className="font-mono tabular-nums">{total}</span>{' '}
                  {t(total === 1 ? 'reglasDeMora.conteo.una' : 'reglasDeMora.conteo.varias')}
                </p>
                {puedeCrear && (
                  <Button hideArrow size="sm" onClick={abrirNueva}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Nueva regla
                  </Button>
                )}
              </div>

              <div className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="overflow-x-auto">
                  <Table className="min-w-[900px]" data-testid="reglas-lista">
                    <TableHeader>
                      <TableRow className="border-b border-border bg-muted/30">
                        <TableHead className="w-14 p-4 text-left">
                          {t('reglasDeMora.tabla.orden')}
                        </TableHead>
                        <TableHead className="p-4 text-left">{t('reglasDeMora.tabla.regla')}</TableHead>
                        <TableHead className="p-4 text-left">{t('reglasDeMora.tabla.disparo')}</TableHead>
                        <TableHead className="p-4 text-left">{t('reglasDeMora.tabla.cobro')}</TableHead>
                        <TableHead className="p-4 text-left">{t('reglasDeMora.tabla.tope')}</TableHead>
                        <TableHead className="p-4 text-left">{t('reglasDeMora.tabla.estado')}</TableHead>
                        <TableHead className="w-28 p-4 text-left">
                          <span className="sr-only">{t('reglasDeMora.tabla.acciones')}</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageItems.map((regla) => (
                        <FilaDeRegla
                          key={regla.id}
                          regla={regla}
                          puedeEditar={puedeEditar}
                          ocupada={ocupadas.has(regla.id)}
                          onEditar={() => abrirEdicion(regla)}
                          onCambiarActiva={(activa) => void cambiarActiva(regla, activa)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* El pie sólo aparece cuando hay más de una página: un
                    paginador sobre tres reglas es ruido. */}
                {total > pageSize && (
                  <div className="border-t border-border bg-muted/10 px-4 py-3">
                    <TablePagination
                      total={total}
                      page={page}
                      pageSize={pageSize}
                      pageSizeOptions={[10, 20, 50]}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                    />
                  </div>
                )}
              </div>
            </div>

            {puedeCrear && faltantes.length > 0 && (
              <Sugerencias
                titulo={t('reglasDeMora.sugerencias.conReglasTitulo')}
                descripcion={t('reglasDeMora.sugerencias.conReglasDescripcion')}
                plantillas={faltantes}
                enCurso={plantillaEnCurso}
                onUsar={usarPlantilla}
              />
            )}
          </div>
        )}
      </EstadoDeDatos>

      <EditorDeRegla abierto={editor.abierto} regla={editor.regla} onCerrar={cerrarEditor} onGuardar={guardar} />
    </div>
  );
}

function FilaDeRegla({
  regla,
  puedeEditar,
  ocupada,
  onEditar,
  onCambiarActiva,
}: {
  regla: ReglaDeMora;
  puedeEditar: boolean;
  ocupada: boolean;
  onEditar: () => void;
  onCambiarActiva: (activa: boolean) => void;
}) {
  const { t } = useI18n();

  return (
    <TableRow
      data-testid={`regla-${regla.id}`}
      // La frase entera sigue disponible al pasar el mouse: las columnas la
      // parten para poder comparar dos reglas de un vistazo, no para esconderla.
      title={describirRegla(regla)}
      onClick={puedeEditar ? onEditar : undefined}
      className={cn(
        'border-b border-border/50 transition-colors',
        puedeEditar && 'cursor-pointer hover:bg-muted/50',
        !regla.activa && 'opacity-70',
      )}
    >
      <TableCell className="p-4 align-middle">
        <span className="font-mono text-xs tabular-nums text-fg-muted">#{regla.orden}</span>
      </TableCell>

      <TableCell className="p-4 align-middle">
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{regla.nombre}</p>
          <p className="truncate text-sm text-fg-muted">{NOMBRE_DEL_CONCEPTO[regla.concepto]}</p>
        </div>
      </TableCell>

      <TableCell className="p-4 align-middle">
        <div className="min-w-0">
          <p className="text-sm text-fg">{capitalizar(describirDisparador(regla))}</p>
          <p className="text-xs text-fg-subtle">{NOMBRE_DEL_DISPARADOR[regla.disparador]}</p>
        </div>
      </TableCell>

      <TableCell className="p-4 align-middle">
        <div className="min-w-0">
          <p className="text-sm text-fg">{capitalizar(describirFormula(regla))}</p>
          <p className="text-xs text-fg-subtle">{NOMBRE_DE_LA_FORMULA[regla.formula]}</p>
        </div>
      </TableCell>

      <TableCell className="p-4 align-middle">
        <span className={cn('text-sm', regla.topeCop === null ? 'text-fg-subtle' : 'text-fg tabular-nums')}>
          {capitalizar(describirTope(regla.topeCop))}
        </span>
      </TableCell>

      {/* El switch y «Editar» son acciones propias: no deben disparar el clic
          de la fila, que abre el editor. */}
      <TableCell className="p-4 align-middle" onClick={(e) => e.stopPropagation()}>
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          <Switch
            checked={regla.activa}
            onCheckedChange={onCambiarActiva}
            disabled={!puedeEditar || ocupada}
            aria-label={`${regla.activa ? 'Apagar' : 'Prender'} «${regla.nombre}»`}
            data-testid={`activa-${regla.id}`}
          />
          {regla.activa ? t('reglasDeMora.tabla.activa') : t('reglasDeMora.tabla.apagada')}
        </label>
      </TableCell>

      <TableCell className="p-4 align-middle" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="secondary"
          size="sm"
          hideArrow
          onClick={onEditar}
          disabled={!puedeEditar}
          aria-label={`Editar «${regla.nombre}»`}
        >
          <PencilSimple className="h-4 w-4" aria-hidden="true" />
          {t('reglasDeMora.tabla.editar')}
        </Button>
      </TableCell>
    </TableRow>
  );
}

/**
 * La zona de sugerencias. Deliberadamente NO parece una tabla ni una fila:
 * encabezado propio, borde punteado y chip «Sugerencia» en cada tarjeta. Lo
 * que hay acá todavía no existe en la base de datos.
 */
function Sugerencias({
  titulo,
  descripcion,
  plantillas,
  enCurso,
  onUsar,
}: {
  titulo: string;
  descripcion: string;
  plantillas: readonly PlantillaDeRegla[];
  enCurso: PlantillaDeRegla['id'] | null;
  onUsar: (plantilla: PlantillaDeRegla) => void;
}) {
  if (plantillas.length === 0) return null;

  return (
    <section className="space-y-3" data-testid="reglas-sugerencias" aria-label={titulo}>
      <div className="flex items-start gap-2.5">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" weight="duotone" aria-hidden="true" />
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold text-fg">{titulo}</h2>
          <p className="max-w-2xl text-xs text-fg-muted">{descripcion}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {plantillas.map((plantilla) => (
          <TarjetaDePlantilla
            key={plantilla.id}
            plantilla={plantilla}
            ocupada={enCurso === plantilla.id}
            deshabilitada={enCurso !== null}
            onUsar={() => onUsar(plantilla)}
          />
        ))}
      </div>
    </section>
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
  const { t } = useI18n();
  const Icono = ICONO_DE_LA_PLANTILLA[plantilla.id];
  return (
    <div
      // Punteado y sin fondo de tarjeta: el borde discontinuo es lo que en
      // todo el panel significa «todavía no existe».
      className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-surface-muted/30 p-5"
      data-testid={`plantilla-${plantilla.id}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface text-fg-muted">
          <Icono className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {t('reglasDeMora.sugerencias.etiqueta')}
          </Badge>
          <p className="font-medium text-fg">{plantilla.titulo}</p>
        </div>
      </div>
      <p className="text-sm text-fg-muted">{plantilla.explicacion}</p>
      <p className="text-xs text-fg-subtle">
        {describirRegla({ ...plantilla.valores, topeCop: plantilla.valores.topeCop ?? null })}
      </p>
      <div>
        <Button variant="secondary" size="sm" hideArrow onClick={onUsar} isLoading={ocupada} disabled={deshabilitada}>
          {t('reglasDeMora.sugerencias.usar')}
        </Button>
      </div>
    </div>
  );
}
