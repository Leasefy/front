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
import { IconButton, SearchInput, SegmentedControl } from '@leasefy/cadence';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import {
  arriendosVigentes,
  type ArriendoDeInquilino,
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

/** Cómo se pinta cada estado de `LeaseStatus`. Color + palabra, nunca color solo. */
export const TONO_DEL_ARRIENDO: Record<
  EstadoDeArriendo,
  { variant: 'success' | 'warning' | 'secondary'; clave: string }
> = {
  ACTIVE: { variant: 'success', clave: 'inquilinos.estados.activo' },
  ENDING_SOON: { variant: 'warning', clave: 'inquilinos.estados.porVencer' },
  ENDED: { variant: 'secondary', clave: 'inquilinos.estados.terminado' },
  TERMINATED: { variant: 'secondary', clave: 'inquilinos.estados.cancelado' },
};

export type CampoDeOrden = 'nombre' | 'arriendos' | 'canon';
type Sentido = 'asc' | 'desc';

/** El canon que la persona paga HOY: sólo lo vigente, nunca lo histórico. */
export function canonVigente(persona: Inquilino): number {
  return arriendosVigentes(persona).reduce((suma, a) => suma + a.canonCop, 0);
}

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

/** Ordena sin mutar. El nombre con `localeCompare` es-CO: «Ñ» va donde debe. */
export function ordenarInquilinos(
  inquilinos: readonly Inquilino[],
  campo: CampoDeOrden,
  sentido: Sentido,
): Inquilino[] {
  const signo = sentido === 'asc' ? 1 : -1;
  return [...inquilinos].sort((a, b) => {
    switch (campo) {
      case 'arriendos':
        return (a.arriendos.length - b.arriendos.length) * signo;
      case 'canon':
        return (canonVigente(a) - canonVigente(b)) * signo;
      default:
        return a.nombre.localeCompare(b.nombre, 'es-CO') * signo;
    }
  });
}

export interface BarraDeInquilinosProps {
  buscar: string;
  onBuscar: (valor: string) => void;
  estado: FiltroDeEstado;
  onEstado: (estado: FiltroDeEstado) => void;
}

/**
 * El buscador y las pestañas, ADENTRO de la tarjeta de la tabla.
 *
 * Va separada de `InquilinosTable` a propósito: cuando la búsqueda no
 * devuelve a nadie, la tabla no se pinta pero la barra TIENE que seguir ahí
 * —si desaparece con el último resultado, la persona se queda encerrada en
 * una búsqueda que ya no puede borrar—. La página la pone arriba del vacío.
 */
export function BarraDeInquilinos({ buscar, onBuscar, estado, onEstado }: BarraDeInquilinosProps) {
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
          { value: 'activos', label: t('inquilinos.filtros.activos') },
          { value: 'terminados', label: t('inquilinos.filtros.terminados') },
          { value: 'todos', label: t('inquilinos.filtros.todos') },
        ]}
      />
    </div>
  );
}

export interface InquilinosTableProps {
  inquilinos: readonly Inquilino[];
  /** Abre el cajón de detalle. La fila entera, y el nombre por teclado. */
  onAbrir: (persona: Inquilino) => void;
}

export function InquilinosTable({ inquilinos, onAbrir }: InquilinosTableProps) {
  const { t } = useI18n();
  const [campo, setCampo] = useState<CampoDeOrden>('nombre');
  const [sentido, setSentido] = useState<Sentido>('asc');
  const [desplegados, setDesplegados] = useState<Set<string>>(new Set());

  const ordenados = useMemo(
    () => ordenarInquilinos(inquilinos, campo, sentido),
    [inquilinos, campo, sentido],
  );

  const ordenarPor = (siguiente: CampoDeOrden) => {
    if (siguiente === campo) {
      setSentido((s) => (s === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setCampo(siguiente);
    // Nombre se lee A→Z; los números interesan de mayor a menor.
    setSentido(siguiente === 'nombre' ? 'asc' : 'desc');
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
      <TableHead className="p-4 text-left">
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
        <TableBody>
          {ordenados.map((persona) => (
            <FilaDeInquilino
              key={persona.tenantId}
              persona={persona}
              desplegada={desplegados.has(persona.tenantId)}
              onAlternar={() => alternar(persona.tenantId)}
              onAbrir={() => onAbrir(persona)}
            />
          ))}
        </TableBody>
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
  const tono = principal ? TONO_DEL_ARRIENDO[principal.estado] : undefined;
  const sinContacto = !persona.email && !persona.telefono;
  /*
   * Cargada a mano o traída por el paso «Terceros» de la migración, todavía
   * sin contrato. No es un caso raro: es el estado en el que nace toda
   * persona creada desde «Nuevo inquilino».
   */
  const sinArriendo = persona.arriendos.length === 0;

  return (
    <>
      <TableRow
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
            className="block min-w-0 max-w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-testid="inquilino-abrir"
          >
            <span className="block truncate font-medium text-fg group-hover:text-primary">
              {persona.nombre}
            </span>
            <span className="block truncate text-sm text-fg-muted">
              {persona.email ?? t('inquilinos.tabla.sinCorreo')}
            </span>
          </button>
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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAlternar();
              }}
              className="text-sm text-primary underline-offset-2 hover:underline"
            >
              {t('inquilinos.tabla.variosInmuebles', { n: persona.arriendos.length })}
            </button>
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
                href={RUTA_DEL_CONTRATO_MANUAL}
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
              {t('inquilinos.tabla.nVigentes', { n: vigentes.length })}
            </span>
          ) : principal ? (
            <Badge variant={tono?.variant ?? 'secondary'}>
              {/* Un estado que el back agregue mañana se muestra crudo, no se
                  esconde: mejor una etiqueta rara que una fila que miente. */}
              {tono ? t(tono.clave) : principal.estado}
            </Badge>
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
              <div>{formatDate(principal.desde)}</div>
              <div className="text-fg-subtle">→ {formatDate(principal.hasta)}</div>
            </div>
          )}
        </TableCell>

      </TableRow>

      {varios && desplegada && (
        <TableRow data-testid="inquilino-arriendos">
          <TableCell colSpan={7} className="bg-surface-muted/50 p-4">
            <ul className="space-y-2">
              {persona.arriendos.map((a) => (
                <li key={a.leaseId}>
                  <RenglonDeArriendo arriendo={a} />
                </li>
              ))}
            </ul>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/** Un arriendo en una línea. Se usa en el despliegue y en la ficha. */
export function RenglonDeArriendo({ arriendo }: { arriendo: ArriendoDeInquilino }) {
  const { t, formatCurrency, formatDate } = useI18n();
  const tono = TONO_DEL_ARRIENDO[arriendo.estado];

  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-surface px-3 py-2')}>
      <Badge variant={tono?.variant ?? 'secondary'}>
        {tono ? t(tono.clave) : arriendo.estado}
      </Badge>

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
        {formatDate(arriendo.desde)} — {formatDate(arriendo.hasta)}
      </span>
    </div>
  );
}
