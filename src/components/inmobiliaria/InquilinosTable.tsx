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

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CaretDown,
  CaretRight,
  Plus,
  SortAscending,
  SortDescending,
  Warning,
} from '@phosphor-icons/react';
import { IconButton, SearchInput, SegmentedControl, Stagger, StaggerItem } from '@leasefy/cadence';

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
import { useIsMobile } from '@/hooks/use-mobile';
import { DatosPorCompletar } from '@/components/inmobiliaria/DatosPorCompletar';
import { useI18n } from '@/lib/i18n';
import {
  canonVigente,
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
  type FiltroDeEstado,
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
  estado: FiltroDeEstado;
  onEstado: (estado: FiltroDeEstado) => void;
  /**
   * Cuántas personas hay detrás de cada pestaña. `null` = sin número (todavía
   * no llegaron, o el conteo falló): un número equivocado es peor que ninguno.
   */
  conteos?: ConteosDeInquilinos | null;
}

const NUMERO = new Intl.NumberFormat('es-CO');

/**
 * Una pestaña con su número al lado.
 *
 * 🔴 20-09 · Sin número, para saber si hay inquilinos terminados había que
 * clickear —lo que dispara otra consulta— y si no había ninguno la pantalla
 * quedaba vacía sin decir que esa pestaña nunca tuvo a nadie. El cero se dice
 * igual que cualquier otro número: es la respuesta a por qué está vacío.
 */
function ConNumero({ etiqueta, cuantos }: { etiqueta: string; cuantos?: number }) {
  if (cuantos === undefined) return <>{etiqueta}</>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {etiqueta}
      <span className="rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums">
        {NUMERO.format(cuantos)}
      </span>
    </span>
  );
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
}: BarraDeInquilinosProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <SearchInput
        value={buscar}
        onChange={(e) => onBuscar(e.target.value)}
        onClear={() => onBuscar('')}
        placeholder={t('inquilinos.buscarPlaceholder')}
        inputSize="md"
        className="w-full sm:max-w-md"
        data-testid="inquilinos-buscar"
      />
      <SegmentedControl<FiltroDeEstado>
        value={estado}
        onChange={onEstado}
        aria-label={t('inquilinos.filtroEstado')}
        options={[
          {
            value: 'activos',
            label: (
              <ConNumero
                etiqueta={t('inquilinos.filtros.activos')}
                cuantos={conteos?.activos}
              />
            ),
            ariaLabel: conteos
              ? `${t('inquilinos.filtros.activos')}: ${conteos.activos}`
              : t('inquilinos.filtros.activos'),
          },
          {
            value: 'terminados',
            label: (
              <ConNumero
                etiqueta={t('inquilinos.filtros.terminados')}
                cuantos={conteos?.terminados}
              />
            ),
            ariaLabel: conteos
              ? `${t('inquilinos.filtros.terminados')}: ${conteos.terminados}`
              : t('inquilinos.filtros.terminados'),
          },
          {
            value: 'todos',
            label: (
              <ConNumero etiqueta={t('inquilinos.filtros.todos')} cuantos={conteos?.todos} />
            ),
            ariaLabel: conteos
              ? `${t('inquilinos.filtros.todos')}: ${conteos.todos}`
              : t('inquilinos.filtros.todos'),
          },
        ]}
      />
    </div>
  );
}

export interface InquilinosTableProps {
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
}

export function InquilinosTable({ inquilinos, onAbrir, orden, onOrdenar }: InquilinosTableProps) {
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
      <Table className="min-w-[760px]" data-testid="inquilinos-tabla">
        <TableHeader>
          <TableRow className="border-b border-border bg-muted/30">
            <TableHead className="w-10 p-4" />
            <Ordenable campo="nombre">{t('inquilinos.tabla.inquilino')}</Ordenable>
            <TableHead className="p-4 text-left">{t('inquilinos.tabla.telefono')}</TableHead>
            <TableHead className="p-4 text-left">{t('inquilinos.tabla.inmueble')}</TableHead>
            <TableHead className="p-4 text-left">{t('inquilinos.tabla.estado')}</TableHead>
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
              persona={persona}
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
  persona,
  desplegada,
  onAlternar,
  onAbrir,
}: {
  persona: Inquilino;
  desplegada: boolean;
  onAlternar: () => void;
  onAbrir: () => void;
}) {
  const { t, formatCurrency, formatDate } = useI18n();
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

        {/* Nombre + correo, como en la tabla de propietarios — pero SIN el
            avatar: allá el ícono distingue persona de empresa, y acá todos
            los inquilinos son personas, así que serían 52 px que no dicen
            nada.

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
            className="block min-w-0 max-w-[20rem] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-testid="inquilino-abrir"
          >
            <span className="block truncate font-medium text-fg group-hover:text-primary">
              {persona.nombre}
            </span>
            <span className="block truncate text-sm text-fg-muted">
              {persona.email ?? t('inquilinos.tabla.sinCorreo')}
            </span>
          </button>
          {/* T-0128: creado por la migración sin documento. */}
          <DatosPorCompletar pendientes={persona.datosPendientes} className="mt-1 flex" />
        </TableCell>

        <TableCell className="p-4 align-middle">
          {persona.telefono ? (
            <span className="font-mono text-sm tabular-nums text-fg">{persona.telefono}</span>
          ) : sinContacto ? (
            /* Sin correo NI teléfono no es un detalle estético: es a quién no
               se le puede cobrar ni avisar. */
            <span className="inline-flex items-center gap-1.5 text-sm text-warning">
              <Warning className="h-4 w-4 shrink-0" />
              {t('inquilinos.sinContacto')}
            </span>
          ) : (
            <span className="text-sm text-fg-subtle">—</span>
          )}
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
              href={`/panel/inmobiliaria/inmuebles/${principal.inmueble.id}`}
              onClick={(e) => e.stopPropagation()}
              className="block max-w-[14rem] truncate text-sm text-fg hover:text-primary"
            >
              {principal.inmueble.address}
              <span className="text-fg-muted"> · {principal.inmueble.city}</span>
            </Link>
          ) : (
            /* Pasa de verdad: un contrato migrado sin inmueble asignado.
               Decirlo es lo que hace que alguien lo complete. */
            <span className="text-sm text-warning">{t('inquilinos.sinInmueble')}</span>
          )}
        </TableCell>

        <TableCell className="p-4 align-middle">
          {sinArriendo ? (
            /*
             * Las DOS cosas, no una: que no tiene arriendo —o sea que no se le
             * está cobrando nada— y por dónde dárselo. Decir sólo lo primero
             * deja a alguien mirando una fila que no explica qué hacer.
             */
            <div className="flex flex-col items-start gap-1">
              <Badge variant="secondary">{t('inquilinos.sinArriendo')}</Badge>
              <Link
                href={rutaDelContratoManualPara(persona)}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                data-testid="inquilino-crear-contrato"
              >
                <Plus className="h-3 w-3" weight="bold" aria-hidden="true" />
                {t('inquilinos.crearSuContrato')}
              </Link>
            </div>
          ) : varios ? (
            <span className="text-sm text-fg-muted tabular-nums">
              {textoDeVigentes(t, vigentes.length)}
            </span>
          ) : principal ? (
            <EstadoDelArriendo arriendo={principal} />
          ) : null}
        </TableCell>

        <TableCell className="p-4 align-middle">
          {sinArriendo ? (
            /* Un «$0» acá se lee como un inquilino que no paga, que es lo
               contrario de la verdad: todavía no hay nada que cobrarle. */
            <span className="text-sm text-fg-subtle">—</span>
          ) : (
            <span className="whitespace-nowrap font-mono text-sm tabular-nums text-fg">
              {formatCurrency(varios ? canonVigente(persona) : (principal?.canonCop ?? 0))}
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
          <TableCell colSpan={7} className="bg-surface-muted/50 p-4">
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
  const { t, formatCurrency, formatDate } = useI18n();

  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-surface px-3 py-2')}>
      <EstadoDelArriendo arriendo={arriendo} />

      {arriendo.inmueble ? (
        <Link
          href={`/panel/inmobiliaria/inmuebles/${arriendo.inmueble.id}`}
          className="min-w-0 flex-1 truncate text-sm text-fg hover:text-primary"
        >
          {arriendo.inmueble.address}
          <span className="text-fg-muted"> · {arriendo.inmueble.city}</span>
        </Link>
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm text-warning">
          {t('inquilinos.sinInmueble')}
        </span>
      )}

      <span className="font-mono text-sm tabular-nums text-fg">
        {formatCurrency(arriendo.canonCop)}
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
  const { t, formatCurrency, formatDate } = useI18n();
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
                <span className="min-w-0">
                  {/* El nombre se ajusta en dos renglones; nunca «Ana So…». */}
                  <span className="block break-words font-medium text-fg">{persona.nombre}</span>
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
                    <EstadoDelArriendo arriendo={principal} />
                  ) : null}
                </span>
              </span>
              {!sinArriendo ? (
                <span className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="whitespace-nowrap font-mono text-sm tabular-nums text-fg">
                    {formatCurrency(varios ? canonVigente(persona) : (principal?.canonCop ?? 0))}
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
            {sinArriendo ? (
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
