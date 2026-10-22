'use client';

/**
 * InquilinosTable — los inquilinos en la tabla del panel, no en tarjetas.
 *
 * ── Por qué existe (Nico, 2026-09-02) ─────────────────────────────────────
 * «Esto de inquilinos no deberías tenerlo así en card, sino mejor en una
 * tabla como las otras tablas que tenemos, con toda la información que tienes
 * igual, y con paginación.»
 *
 * ── Lo que la tabla NO puede perder ───────────────────────────────────────
 * La fila sigue siendo una PERSONA, no un arriendo (misma regla que traía la
 * lista de tarjetas: el back agrupa por `tenantId` y dos filas con el mismo
 * nombre es cómo alguien termina llamando dos veces al mismo inquilino).
 *
 * Pero una persona puede tener varios arriendos, y la tarjeta los mostraba
 * TODOS. Resolverlo con «el primero y listo» perdería información que hoy
 * está a la vista, así que:
 *   - con UN arriendo, sus datos van en las columnas de la fila;
 *   - con VARIOS, la fila resume y se despliega para verlos todos.
 * Nadie pierde un dato por el cambio de formato.
 *
 * ── Y lo del 2026-09-03 ───────────────────────────────────────────────────
 * «Nuestras tablas tienen el buscador y las tabs también asociadas a la
 * tabla, no fuera de ella» + «lo de "ver ficha" sobra, mejor que al dar clic
 * se abra un drawer».
 *
 * Por eso el buscador y las pestañas viven acá (`BarraDeInquilinos`), en la
 * misma tarjeta que la tabla — igual que `PropietarioTable` —, y la última
 * columna con el botón ya no existe: la fila entera abre el cajón.
 *
 * 🔴 Quitar ese botón dejaba el cajón sin camino de teclado (un `<tr>` con
 * `onClick` no se tabula). Por eso el NOMBRE es un `<button>` real: el mouse
 * usa toda la fila, el teclado usa el nombre. No es decoración.
 *
 * ── Y lo del 2026-09-04: la fila SIN arriendo ─────────────────────────────
 * Desde que se puede crear un inquilino solo, la lista trae personas con
 * `arriendos: []`. Esa fila tiene que decir dos cosas y no una: **que no
 * tiene arriendo** —porque sin contrato no se le cobra nada— y **por dónde
 * dárselo**. Una fila muda con el canon en $0 se lee como un inquilino que no
 * paga, que es lo contrario de lo que pasa.
 */

import { CasillaDeLaFila, CasillaDeLaPagina } from '@/components/masivas/CasillasDeLaTabla';
import { createContext, useContext, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CaretDown,
  CaretRight,
  Plus,
  SortAscending,
  SortDescending,
  Warning,
} from '@phosphor-icons/react';
import { Avatar, IconButton, SearchInput, Stagger, StaggerItem } from '@leasefy/cadence';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { conteosDeLasPestanas, type PestanaDeInquilinos } from '@/lib/inquilinos/pestanas';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBodyAnimado,
  TableRowAnimada,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { sinMayusculasSostenidas } from '@/lib/inmuebles/titulo-de-la-ficha';
import { useIsMobile } from '@/hooks/use-mobile';
import { DatosPorCompletar } from '@/components/inmobiliaria/DatosPorCompletar';
import { useI18n } from '@/lib/i18n';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import {
  canonVigente,
  canonDeLaFila,
  ordenarInquilinos,
  siguienteOrden,
  type CampoDeOrden,
  type OrdenDeInquilinos,
} from '@/lib/inquilinos/lista';
import {
  arriendosVigentes,
  estadoParaMostrar,
  hoyEnColombia,
  type ArriendoDeInquilino,
  type ConteosDeInquilinos,
  type EstadoDeArriendo,
  type Inquilino,
} from '@/lib/api/inquilinos.service';

/**
 * La única variante de `/contratos/nuevo` que carga sin postulación: a secas
 * esa ruta responde «Falta el parámetro applicationId». Vive acá porque la
 * usan la página (el botón secundario) y la fila sin arriendo.
 */
export const RUTA_DEL_CONTRATO_MANUAL =
  '/panel/inmobiliaria/contratos/nuevo?modo=manual';

/**
 * I-29 (QA-INQ, 03-10): «Crear su contrato» de UNA persona abre el contrato
 * manual con ella ya elegida. Antes llevaba al contrato en blanco y había que
 * volver a buscarla.
 */
export function rutaDelContratoManualPara(persona: Pick<Inquilino, 'tenantId'>): string {
  return `${RUTA_DEL_CONTRATO_MANUAL}&inquilino=${encodeURIComponent(persona.tenantId)}`;
}

/**
 * QA-INQ-95 ronda 2 (T-10): un contrato sin canon (o con el canon en cero, que
 * no es un canon) se pinta «—», nunca «$ 0»: «$ 0» se lee como un inquilino que
 * no paga.
 */
export function canonParaMostrar(
  canonCop: number | null | undefined,
  formatCurrency: (n: number) => string,
): string {
  return typeof canonCop === 'number' && Number.isFinite(canonCop) && canonCop > 0 ? formatCurrency(canonCop) : '—';
}

/** Cómo se pinta cada estado de `LeaseStatus`. Color + palabra, nunca color solo. */
export const TONO_DEL_ARRIENDO: Record<
  EstadoDeArriendo,
  { variant: 'success' | 'warning' | 'secondary' | 'outline'; clave: string }
> = {
  ACTIVE: { variant: 'success', clave: 'inquilinos.estados.activo' },
  ENDING_SOON: { variant: 'warning', clave: 'inquilinos.estados.porVencer' },
  ENDED: { variant: 'secondary', clave: 'inquilinos.estados.terminado' },
  TERMINATED: { variant: 'secondary', clave: 'inquilinos.estados.cancelado' },
  /* E-01: firmándose (o firmado sin arrancar) NO es «Terminado». */
  EN_FIRMA: { variant: 'outline', clave: 'inquilinos.estados.enFirma' },
  /* I-04: «Empieza el 1 de nov» — la fecha la pone `EstadoDelArriendo`. */
  POR_EMPEZAR: { variant: 'outline', clave: 'inquilinos.estados.porEmpezar' },
};

/**
 * La etiqueta de un arriendo: color + palabra, con la fecha cuando todavía no
 * empieza. Un estado que el back agregue mañana se muestra crudo, no se
 * esconde: mejor una etiqueta rara que una fila que miente.
 */
export function EstadoDelArriendo({ arriendo }: { arriendo: ArriendoDeInquilino }) {
  const { t, formatDate } = useI18n();
  const estado = estadoParaMostrar(arriendo);
  const tono = TONO_DEL_ARRIENDO[estado];
  const dia = diaDeVigencia(arriendo.desde);
  /* «Empieza el 1 de nov» (Nico): el año sólo si no es el de hoy. */
  const conAnio = dia !== null && dia.slice(0, 4) !== hoyEnColombia().slice(0, 4);
  return (
    <Badge variant={tono?.variant ?? 'secondary'} data-estado={estado} className="whitespace-nowrap">
      {estado === 'POR_EMPEZAR' && dia
        ? t('inquilinos.estados.empiezaEl', {
            fecha: formatDate(dia, { day: 'numeric', month: 'short', ...(conAnio ? { year: 'numeric' } : {}) }),
          })
        : tono
          ? t(tono.clave)
          : arriendo.estado}
    </Badge>
  );
}

/** «1 vigente», «0 vigentes», «2 vigentes» (I-08: decía «1 vigentes»). */
export function textoDeVigentes(
  t: (clave: string, p?: Record<string, string | number>) => string,
  n: number,
): string {
  return n === 1 ? t('inquilinos.tabla.nVigentesUno') : t('inquilinos.tabla.nVigentes', { n });
}

/*
 * El orden y el canon vigente viven en `lib/inquilinos/lista` desde el QA de
 * Inquilinos (03-10): la PÁGINA ordena la lista entera antes de paginar
 * (I-01). Se vuelven a exportar acá, donde siempre estuvieron.
 */
export {
  canonVigente,
  ordenarInquilinos,
  siguienteOrden,
  type CampoDeOrden,
  type OrdenDeInquilinos,
} from '@/lib/inquilinos/lista';

/**
 * Cuál de los arriendos representa a la persona en la fila.
 *
 * El vigente manda sobre el terminado: alguien que renovó tiene los dos, y el
 * que importa es el que está corriendo. Sin ninguno vigente (filtro
 * «terminados»), el primero que trajo el back.
 */
export function arriendoPrincipal(persona: Inquilino): ArriendoDeInquilino | undefined {
  return arriendosVigentes(persona)[0] ?? persona.arriendos[0];
}

/**
 * El DÍA de una vigencia, listo para `formatDate`.
 *
 * `desde` y `hasta` son días (`@db.Date`), pero `/inmobiliaria/inquilinos` los
 * manda a medianoche UTC (`2026-06-05T00:00:00.000Z`). `formatDate` sólo arma
 * en el calendario local un `YYYY-MM-DD` suelto; con hora lo toma por instante,
 * y en Bogotá eso es el 4 a las 19:00. La lista y el cajón decían «4 de jun» de
 * un arriendo que la ficha del contrato —bien— dice que empieza el 5.
 */
export function diaDeVigencia(fecha: string | null): string | null {
  return fecha === null ? null : fecha.slice(0, 10);
}

/**
 * Una fecha de vigencia, o un «—» si el contrato no la dice.
 *
 * 🔴 Desde el 20-09 los arriendos salen del CONTRATO y no del `Lease`: ahí las
 * dos fechas son opcionales —un contrato a término indefinido no tiene hasta
 * cuándo— y `formatDate(null)` pintaría «Invalid Date» en la tabla.
 */
function fechaOGuion(
  fecha: string | null,
  formatDate: (f: string | Date) => string,
): string {
  const dia = diaDeVigencia(fecha);
  return dia === null ? '—' : formatDate(dia);
}

export interface BarraDeInquilinosProps {
  buscar: string;
  onBuscar: (valor: string) => void;
  estado: PestanaDeInquilinos;
  onEstado: (estado: PestanaDeInquilinos) => void;
  /**
   * Cuántas personas hay detrás de cada pestaña. `null` = sin número (todavía
   * no llegaron, o el conteo falló): un número equivocado es peor que ninguno.
   */
  conteos?: ConteosDeInquilinos | null;
  /**
   * Pestañas por tarea (Nico, 22-10-2026): cuántos no tienen arriendo. Con el dato (número o
   * `null` si no se sabe) aparece «Sin arriendo» y «Activos» deja de contarlos. Sin la prop, las
   * tres pestañas de siempre.
   */
  sinArriendo?: number | null;
}

/**
 * El buscador y las pestañas, ADENTRO de la tarjeta de la tabla.
 *
 * Va separada de `InquilinosTable` a propósito: cuando la búsqueda no
 * devuelve a nadie, la tabla no se pinta pero la barra TIENE que seguir ahí
 * —si desaparece con el último resultado, la persona se queda encerrada en
 * una búsqueda que ya no puede borrar—. La página la pone arriba del vacío.
 */
export function BarraDeInquilinos({
  buscar,
  onBuscar,
  estado,
  onEstado,
  conteos = null,
  sinArriendo,
}: BarraDeInquilinosProps) {
  const { t } = useI18n();
  const conPestanaSinArriendo = sinArriendo !== undefined;
  const numeros = conPestanaSinArriendo
    ? conteosDeLasPestanas(conteos, sinArriendo)
    : { activos: conteos?.activos ?? null, sinArriendo: null, terminados: conteos?.terminados ?? null, todos: conteos?.todos ?? null };
  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Las pestañas por tarea, como en Contratos y Propietarios: el número de cada una es lo que
          se ve al tocarla. Activos, Terminados y Todos se ven aunque estén en cero (el cero
          responde por qué la pestaña está vacía); «Sin arriendo», sólo cuando hay alguien. */}
      <PestanasDeEstado<PestanaDeInquilinos>
        etiqueta={t('inquilinos.filtroEstado')}
        data-testid="pestanas-de-inquilinos"
        valor={estado}
        onCambio={onEstado}
        pestanas={[
          { valor: 'activos', etiqueta: t('inquilinos.filtros.activos'), cuantos: numeros.activos, fija: true, testid: 'pestana-activos' },
          ...(conPestanaSinArriendo
            ? [{ valor: 'sinArriendo' as const, etiqueta: t('inquilinos.filtros.sinArriendo'), cuantos: numeros.sinArriendo, tono: 'aviso' as const, testid: 'pestana-sin-arriendo' }]
            : []),
          { valor: 'terminados', etiqueta: t('inquilinos.filtros.terminados'), cuantos: numeros.terminados, fija: true, testid: 'pestana-terminados' },
          { valor: 'todos', etiqueta: t('inquilinos.filtros.todos'), cuantos: numeros.todos, fija: true, testid: 'pestana-todos' },
        ]}
      />
      <SearchInput
        value={buscar}
        onChange={(e) => onBuscar(e.target.value)}
        onClear={() => onBuscar('')}
        placeholder={t('inquilinos.buscarPlaceholder')}
        inputSize="md"
        className="w-full lg:max-w-sm"
        data-testid="inquilinos-buscar"
      />
    </div>
  );
}

/**
 * El formato de la plata de la página (glow up 22-10: la cifra de arriba decía
 * «,74» y la tabla no). Sin él, el de siempre.
 */
const FormatoDeLaPlata = createContext<((n: number) => string) | null>(null);

export interface InquilinosTableProps {
  /** El formato de la plata de la página; sin él, el de siempre. */
  formato?: (n: number) => string;
  inquilinos: readonly Inquilino[];
  /** Abre el cajón de detalle. La fila entera, y el nombre por teclado. */
  onAbrir: (persona: Inquilino) => void;
  /**
   * El orden, cuando lo maneja la página (I-01): la página ordena la lista
   * ENTERA y le pasa a la tabla sólo la página ya ordenada. Sin estas dos, la
   * tabla lo maneja sola, como antes (ordena lo que recibe).
   */
  orden?: OrdenDeInquilinos;
  onOrdenar?: (orden: OrdenDeInquilinos) => void;
  /**
   * Acciones masivas (Nico, 10-10-2026): con esto la tabla pinta las casillas
   * (por `tenantId`). Lo marcado y lo que se hace con ello lo lleva la página.
   */
  marcadas?: ReadonlySet<string>;
  onMarcar?: (ids: readonly string[], si: boolean) => void;
}

/**
 * QA-INQ-95 (E-19 / PR-02): «Crear su contrato» lleva a una pantalla que pide
 * `contratos:create`; al contador y al viewer les quedaba vivo un enlace que
 * rebota. Fuera del panel (pruebas) no hay contexto de permisos y se muestra.
 */
function usePuedeCrearContrato(): boolean {
  const permisos = usePermissionsContextSafe();
  return permisos ? permisos.canAccess('contratos', 'create') : true;
}

export function InquilinosTable({ formato, ...props }: InquilinosTableProps) {
  return (
    <FormatoDeLaPlata.Provider value={formato ?? null}>
      <TablaDeInquilinos {...props} />
    </FormatoDeLaPlata.Provider>
  );
}

function TablaDeInquilinos({ inquilinos, onAbrir, orden, onOrdenar, marcadas, onMarcar }: Omit<InquilinosTableProps, 'formato'>) {
  const { t } = useI18n();
  const [ordenPropio, setOrdenPropio] = useState<OrdenDeInquilinos>({ campo: 'nombre', sentido: 'asc' });
  const { campo, sentido } = orden ?? ordenPropio;
  const [desplegados, setDesplegados] = useState<Set<string>>(new Set());
  /*
   * I-27 (QA-INQ, 03-10): a 390 px la tabla se corría de lado y sólo se veía
   * el nombre. En el celular cada persona es una TARJETA con nombre, estado,
   * canon y vigencia a la vista. El primer pintado (servidor) es la tabla.
   */
  const esCelular = useIsMobile();

  const ordenados = useMemo(
    () => ordenarInquilinos(inquilinos, campo, sentido),
    [inquilinos, campo, sentido],
  );
  /*
   * Glow up 22-10 (rondas 13 y 14): la columna «Estado» sólo cuando alguna fila tiene algo que
   * decir —sin arriendo, varios arriendos, o uno que no es activo («Empieza el…», «En firma»)—.
   * En «Activos» quedaba vacía en 8 de cada 10 filas.
   */
  const conEstado = useMemo(
    () =>
      ordenados.some(
        (p) => p.arriendos.length !== 1 || estadoParaMostrar(arriendoPrincipal(p) ?? p.arriendos[0]) !== 'ACTIVE',
      ),
    [ordenados],
  );

  const ordenarPor = (siguiente: CampoDeOrden) => {
    const nuevo = siguienteOrden({ campo, sentido }, siguiente);
    if (onOrdenar) onOrdenar(nuevo);
    else setOrdenPropio(nuevo);
  };

  const alternar = (tenantId: string) =>
    setDesplegados((previos) => {
      const siguiente = new Set(previos);
      if (siguiente.has(tenantId)) siguiente.delete(tenantId);
      else siguiente.add(tenantId);
      return siguiente;
    });

  const Ordenable = ({ campo: propio, children }: { campo: CampoDeOrden; children: React.ReactNode }) => {
    const Icono = sentido === 'asc' ? SortAscending : SortDescending;
    return (
      <TableHead
        className="p-4 text-left"
        // I-11: el lector de pantalla también sabe por qué columna va ordenada.
        aria-sort={campo === propio ? (sentido === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {/* allowlist: disparador de orden — no hay primitiva en Cadence.
            `uppercase` explícito: un <button> trae text-transform:none del
            navegador y perdía las mayúsculas del TH. Ver PropietarioTable. */}
        <button
          type="button"
          onClick={() => ordenarPor(propio)}
          className="flex items-center gap-2 uppercase hover:text-fg"
          data-testid={`ordenar-${propio}`}
        >
          {children}
          {campo === propio && <Icono className="h-3.5 w-3.5" />}
        </button>
      </TableHead>
    );
  };

  if (esCelular) {
    return <TarjetasDeInquilinos inquilinos={ordenados} onAbrir={onAbrir} />;
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[760px] [&_td]:px-3 [&_th]:px-3" data-testid="inquilinos-tabla">
        <TableHeader>
          <TableRow className="border-b border-border bg-muted/30">
            {marcadas && onMarcar && (
              <TableHead className="w-10 py-4 pl-4 pr-0">
                <CasillaDeLaPagina
                  ids={ordenados.map((p) => p.tenantId)}
                  marcadas={marcadas}
                  onMarcar={onMarcar}
                  queSon="inquilinos"
                />
              </TableHead>
            )}
            <TableHead className="w-10 p-4" />
            <Ordenable campo="nombre">{t('inquilinos.tabla.inquilino')}</Ordenable>
            <TableHead className="p-4 text-left">{t('inquilinos.tabla.inmueble')}</TableHead>
            {conEstado ? <TableHead className="p-4 text-left">{t('inquilinos.tabla.estado')}</TableHead> : null}
            <Ordenable campo="canon">{t('inquilinos.tabla.canon')}</Ordenable>
            <TableHead className="p-4 text-left">{t('inquilinos.tabla.vigencia')}</TableHead>
          </TableRow>
        </TableHeader>
        {/* Las filas entran escalonadas (techo de 320 ms) y, al cambiar el
            filtro o la búsqueda, las que se van salen (`key` = la persona). */}
        <TableBodyAnimado>
          {ordenados.map((persona) => (
            <FilaDeInquilino
              key={persona.tenantId}
              casilla={
                marcadas && onMarcar ? (
                  <CasillaDeLaFila
                    id={persona.tenantId}
                    nombre={persona.nombre}
                    marcadas={marcadas}
                    onMarcar={onMarcar}
                  />
                ) : undefined
              }
              persona={persona}
              conEstado={conEstado}
              desplegada={desplegados.has(persona.tenantId)}
              onAlternar={() => alternar(persona.tenantId)}
              onAbrir={() => onAbrir(persona)}
            />
          ))}
        </TableBodyAnimado>
      </Table>
    </div>
  );
}

function FilaDeInquilino({
  casilla,
  persona,
  conEstado = true,
  desplegada,
  onAlternar,
  onAbrir,
}: {
  /** La casilla de las acciones masivas, si la tabla las tiene. */
  casilla?: React.ReactNode;
  persona: Inquilino;
  /** Sin la columna «Estado» (nadie en la página tiene algo que decir ahí). */
  conEstado?: boolean;
  desplegada: boolean;
  onAlternar: () => void;
  onAbrir: () => void;
}) {
  const { t, formatCurrency: formatoDeSiempre, formatDate } = useI18n();
  const formatCurrency = useContext(FormatoDeLaPlata) ?? formatoDeSiempre;
  const puedeCrearContrato = usePuedeCrearContrato();
  const vigentes = arriendosVigentes(persona);
  const varios = persona.arriendos.length > 1;
  const principal = arriendoPrincipal(persona);
  const sinContacto = !persona.email && !persona.telefono;
  /*
   * Cargada a mano o traída por el paso «Terceros» de la migración, todavía
   * sin contrato. No es un caso raro: es el estado en el que nace toda
   * persona creada desde «Nuevo inquilino».
   */
  const sinArriendo = persona.arriendos.length === 0;

  return (
    <>
      <TableRowAnimada
        className="group cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/50"
        onClick={onAbrir}
        data-testid="inquilino-fila"
        data-tenant-id={persona.tenantId}
      >
        {casilla !== undefined && <TableCell className="w-10 py-4 pl-4 pr-0 align-middle">{casilla}</TableCell>}
        {/* Desplegar: sólo tiene sentido con más de un arriendo. */}
        <TableCell className="p-4 align-middle">
          {varios ? (
            <IconButton
              variant="ghost"
              size="sm"
              icon={desplegada ? <CaretDown className="h-4 w-4" /> : <CaretRight className="h-4 w-4" />}
              aria-label={t(desplegada ? 'inquilinos.tabla.contraer' : 'inquilinos.tabla.desplegar', {
                nombre: persona.nombre,
              })}
              aria-expanded={desplegada}
              onClick={(e) => {
                e.stopPropagation();
                onAlternar();
              }}
              data-testid="inquilino-desplegar"
            />
          ) : null}
        </TableCell>

        {/* Nombre + correo, con su Avatar (GLOW UP 21-10). Antes iba SIN avatar porque el de
            entonces era el mismo muñequito para todos («52 px que no dicen nada»); el de Cadence 2
            lleva sus iniciales y un tono que sale del nombre —se reconoce a la persona de un
            vistazo— y es el mismo que la acompaña en Contratos y en Mensajes.

            allowlist: el nombre es un <button> porque es el ÚNICO camino de
            teclado al cajón desde que se fue la columna «Ver ficha» — un
            <tr onClick> no se tabula. `text-left` porque un botón centra por
            defecto y desalineaba la columna. */}
        <TableCell className="p-4 align-middle">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAbrir();
            }}
            // Un nombre de empresa de 80 letras no puede empujar el estado y el
            // canon fuera de la tabla: se corta a 20rem y el completo va en `title`.
            title={persona.nombre}
            className="flex min-w-0 max-w-[20rem] items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-testid="inquilino-abrir"
          >
            <Avatar name={persona.nombre} size="sm" className="shrink-0" />
            <span className="min-w-0">
              <span className="block truncate font-medium text-fg group-hover:text-primary" data-testid="nombre-del-inquilino">
                {persona.nombre}
              </span>
              <span className="block truncate text-sm text-fg-muted">
                {persona.email ?? t('inquilinos.tabla.sinCorreo')}
              </span>
            </span>
          </button>
          {/* Glow up 22-10: el teléfono va bajo el correo (su columna empujaba la vigencia fuera
              de la tabla a 1440, y un teléfono escrito a mano ocupaba tres renglones). */}
          {persona.telefono ? (
            <span
              className="ml-11 mt-0.5 block max-w-[18rem] truncate font-mono text-caption tabular-nums text-fg-muted"
              title={persona.telefono}
            >
              {persona.telefono}
            </span>
          ) : sinContacto ? (
            /* Sin correo NI teléfono no es un detalle estético: es a quién no
               se le puede cobrar ni avisar. */
            <span className="ml-11 mt-0.5 inline-flex items-center gap-1.5 text-caption text-warning">
              <Warning className="h-3.5 w-3.5 shrink-0" />
              {t('inquilinos.sinContacto')}
            </span>
          ) : null}
          {/* T-0128: creado por la migración sin documento. */}
          <DatosPorCompletar pendientes={persona.datosPendientes} className="mt-1 flex" />
        </TableCell>

        {/* Inmueble, estado, canon y vigencia describen el arriendo principal
            cuando hay uno solo; con varios resumen y el detalle se despliega. */}
        <TableCell className="p-4 align-middle">
          {sinArriendo ? (
            /* Ni «sin inmueble asignado» (eso es un contrato incompleto) ni un
               inmueble en blanco: no hay arriendo del cual colgar uno. */
            <span className="text-sm text-fg-subtle">—</span>
          ) : varios ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAlternar();
              }}
              className="h-auto px-0 text-sm text-primary"
            >
              {t('inquilinos.tabla.variosInmuebles', { n: persona.arriendos.length })}
            </Button>
          ) : principal?.inmueble ? (
            <Link
              href={`/panel/inmobiliaria/inmuebles/${principal.inmueble.id}?por=inmueble`}
              onClick={(e) => e.stopPropagation()}
              className="block max-w-[16rem] truncate text-sm text-fg hover:text-primary"
              title={principal.inmueble.address ?? undefined}
            >
              {sinMayusculasSostenidas(principal.inmueble.address ?? '')}
              <span className="text-fg-muted"> · {principal.inmueble.city}</span>
            </Link>
          ) : (
            /* Pasa de verdad: un contrato migrado sin inmueble asignado.
               Decirlo es lo que hace que alguien lo complete. */
            <span className="text-sm text-warning">{t('inquilinos.sinInmueble')}</span>
          )}
        </TableCell>

        {conEstado ? (
          <TableCell className="p-4 align-middle">
            {sinArriendo ? (
              /*
               * Las DOS cosas, no una: que no tiene arriendo —o sea que no se le
               * está cobrando nada— y por dónde dárselo. Decir sólo lo primero
               * deja a alguien mirando una fila que no explica qué hacer.
               */
              <div className="flex flex-col items-start gap-1">
                <Badge variant="secondary">{t('inquilinos.sinArriendo')}</Badge>
                {puedeCrearContrato ? (
                  <Link
                    href={rutaDelContratoManualPara(persona)}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                    data-testid="inquilino-crear-contrato"
                  >
                    <Plus className="h-3 w-3" weight="bold" aria-hidden="true" />
                    {t('inquilinos.crearSuContrato')}
                  </Link>
                ) : null}
              </div>
            ) : varios ? (
              <span className="text-sm text-fg-muted tabular-nums">
                {textoDeVigentes(t, vigentes.length)}
              </span>
            ) : principal ? (
              // Glow up 22-10 (ronda 12): un arriendo activo no lleva chip —«Activo» en cada
              // fila de la pestaña «Activos» no decía nada—; sólo lo que NO es activo se nombra.
              estadoParaMostrar(principal) === 'ACTIVE' ? (
                <span className="sr-only" data-estado="ACTIVE">{t('inquilinos.estados.activo')}</span>
              ) : (
                <EstadoDelArriendo arriendo={principal} />
              )
            ) : null}
          </TableCell>
        ) : null}

        <TableCell className="p-4 align-middle">
          {sinArriendo ? (
            /* Un «$0» acá se lee como un inquilino que no paga, que es lo
               contrario de la verdad: todavía no hay nada que cobrarle. */
            <span className="text-sm text-fg-subtle">—</span>
          ) : (
            <span className="whitespace-nowrap font-mono text-sm tabular-nums text-fg">
              {canonParaMostrar(canonDeLaFila(persona), formatCurrency)}
            </span>
          )}
        </TableCell>

        <TableCell className="p-4 align-middle">
          {varios || !principal ? (
            <span className="text-sm text-fg-subtle">—</span>
          ) : (
            /* Apiladas, no en una línea: «28 de feb de 2026 — 27 de feb de
               2027» son ~230 px y empujaban la última columna fuera de la
               pantalla. */
            <div className="whitespace-nowrap font-mono text-xs tabular-nums text-fg-muted">
              <div>{fechaOGuion(principal.desde, formatDate)}</div>
              <div className="text-fg-subtle">→ {fechaOGuion(principal.hasta, formatDate)}</div>
            </div>
          )}
        </TableCell>

      </TableRowAnimada>

      {/* El despliegue de los arriendos entra bajando su fila (la misma
          entrada de las filas); al contraer se va de una. */}
      {varios && desplegada && (
        <TableRowAnimada data-testid="inquilino-arriendos">
          <TableCell colSpan={(casilla !== undefined ? 7 : 6) - (conEstado ? 0 : 1)} className="bg-surface-muted/50 p-4">
            <ul className="space-y-2">
              {persona.arriendos.map((a) => (
                /* 🔴 La llave es el CONTRATO, no el `Lease`: desde el 20-09
                   un arriendo migrado puede no tener `Lease`, y dos `null`
                   como llave de React son la misma llave. */
                <li key={a.contractId}>
                  <RenglonDeArriendo arriendo={a} />
                </li>
              ))}
            </ul>
          </TableCell>
        </TableRowAnimada>
      )}
    </>
  );
}

/** Un arriendo en una línea. Se usa en el despliegue y en la ficha. */
export function RenglonDeArriendo({ arriendo }: { arriendo: ArriendoDeInquilino }) {
  const { t, formatCurrency: formatoDeSiempre, formatDate } = useI18n();
  const formatCurrency = useContext(FormatoDeLaPlata) ?? formatoDeSiempre;

  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-surface px-3 py-2')}>
      <EstadoDelArriendo arriendo={arriendo} />

      {arriendo.inmueble ? (
        <Link
          href={`/panel/inmobiliaria/inmuebles/${arriendo.inmueble.id}?por=inmueble`}
          className="min-w-0 flex-1 truncate text-sm text-fg hover:text-primary"
          title={arriendo.inmueble.address ?? undefined}
        >
          {sinMayusculasSostenidas(arriendo.inmueble.address ?? '')}
          <span className="text-fg-muted"> · {arriendo.inmueble.city}</span>
        </Link>
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm text-warning">
          {t('inquilinos.sinInmueble')}
        </span>
      )}

      <span className="font-mono text-sm tabular-nums text-fg">
        {canonParaMostrar(arriendo.canonCop, formatCurrency)}
      </span>
      <span className="font-mono text-xs tabular-nums text-fg-muted">
        {fechaOGuion(arriendo.desde, formatDate)} — {fechaOGuion(arriendo.hasta, formatDate)}
      </span>
    </div>
  );
}

/**
 * I-27: la lista en el celular. Una tarjeta por PERSONA (la misma regla que la
 * fila), con lo que en la tabla eran columnas: estado, canon y vigencia. Toda
 * la tarjeta abre el cajón; «Crear su contrato» va aparte (un enlace no puede
 * vivir dentro de un botón).
 */
function TarjetasDeInquilinos({
  inquilinos,
  onAbrir,
}: {
  inquilinos: readonly Inquilino[];
  onAbrir: (persona: Inquilino) => void;
}) {
  const { t, formatCurrency: formatoDeSiempre, formatDate } = useI18n();
  const formatCurrency = useContext(FormatoDeLaPlata) ?? formatoDeSiempre;
  const puedeCrearContrato = usePuedeCrearContrato();
  return (
    <Stagger as="ul" className="divide-y divide-border" data-testid="inquilinos-tarjetas">
      {inquilinos.map((persona) => {
        const vigentes = arriendosVigentes(persona);
        const varios = persona.arriendos.length > 1;
        const principal = arriendoPrincipal(persona);
        const sinArriendo = persona.arriendos.length === 0;
        return (
          <StaggerItem
            as="li"
            key={persona.tenantId}
            className="px-4 py-3.5"
            data-testid="inquilino-tarjeta"
            data-tenant-id={persona.tenantId}
          >
            <button
              type="button"
              onClick={() => onAbrir(persona)}
              className="block w-full min-w-0 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              data-testid="inquilino-abrir"
            >
              <span className="flex items-start justify-between gap-3">
                <Avatar name={persona.nombre} size="sm" className="mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  {/* El nombre se ajusta en dos renglones; nunca «Ana So…». */}
                  <span className="block break-words font-medium text-fg" data-testid="nombre-del-inquilino">{persona.nombre}</span>
                  <span className="block truncate text-sm text-fg-muted">
                    {persona.email ?? persona.telefono ?? t('inquilinos.tabla.sinCorreo')}
                  </span>
                </span>
                <span className="shrink-0">
                  {sinArriendo ? (
                    <Badge variant="secondary">{t('inquilinos.sinArriendo')}</Badge>
                  ) : varios ? (
                    <span className="text-sm text-fg-muted tabular-nums">
                      {textoDeVigentes(t, vigentes.length)}
                    </span>
                  ) : principal ? (
                    estadoParaMostrar(principal) === 'ACTIVE' ? (
                      <span className="sr-only">{t('inquilinos.estados.activo')}</span>
                    ) : (
                      <EstadoDelArriendo arriendo={principal} />
                    )
                  ) : null}
                </span>
              </span>
              {/* Glow up 22-10 (ronda 12): el inmueble es lo segundo con que se reconoce a un inquilino. */}
              {!varios && principal?.inmueble?.address ? (
                <span className="mt-1 block truncate text-caption text-fg-muted" title={principal.inmueble.address}>
                  {sinMayusculasSostenidas(principal.inmueble.address)}
                </span>
              ) : null}
              {!sinArriendo ? (
                <span className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="whitespace-nowrap font-mono text-sm tabular-nums text-fg">
                    {canonParaMostrar(canonDeLaFila(persona), formatCurrency)}
                  </span>
                  <span className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted">
                    {varios || !principal
                      ? t('inquilinos.tabla.variosInmuebles', { n: persona.arriendos.length })
                      : `${fechaOGuion(principal.desde, formatDate)} → ${fechaOGuion(principal.hasta, formatDate)}`}
                  </span>
                </span>
              ) : null}
            </button>
            <DatosPorCompletar pendientes={persona.datosPendientes} className="mt-1.5 flex" />
            {sinArriendo && puedeCrearContrato ? (
              <Link
                href={rutaDelContratoManualPara(persona)}
                className="mt-1.5 inline-flex items-center gap-1 text-caption text-primary underline-offset-2 hover:underline"
                data-testid="inquilino-crear-contrato"
              >
                <Plus className="h-3 w-3" weight="bold" aria-hidden="true" />
                {t('inquilinos.crearSuContrato')}
              </Link>
            ) : null}
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
