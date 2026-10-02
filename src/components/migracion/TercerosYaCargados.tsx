'use client';

/**
 * Lo que ya está en Leasefy, en el paso de propietarios o de inquilinos.
 *
 * Nico, 01-10: «si yo ya subí el archivo y pasé a inquilinos y me quiero
 * devolver a propietarios, ¿por qué no me muestra esa información que ya subí?
 * E igual la opción de subir archivo, porque pues ya los subí: debería poder
 * verlos, quizás en una tabla con paginación, y hasta poder editarlos si
 * quiero y ver su información completa».
 *
 * El paso terminado volvía a abrir en la zona de subida, como si no hubiera
 * nada: la carga se aplicó, las fichas existen, y la pantalla no las nombraba.
 * Ahora, si ya hay personas, el paso abre con ELLAS — una tabla paginada con
 * buscador — y subir otro archivo pasa a ser un botón, no lo primero que se ve.
 *
 * La fuente son las FICHAS (`GET /propietarios`, `GET /inquilinos`), no las
 * filas de la carga: después de crearse, lo que se edita es la persona, y una
 * fila del archivo ya aplicada no se puede corregir. Las que siguen en
 * revisión tienen su propio camino arriba («Tienes una carga sin terminar»).
 *
 * Inquilinos se VE (el mismo cajón de la pantalla Inquilinos) pero no se edita:
 * el back no tiene todavía cómo editar a un inquilino — sólo crearlo.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { UploadSimple } from '@phosphor-icons/react';
import { SearchInput } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { TablePagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { DatosPorCompletar } from '@/components/inmobiliaria/DatosPorCompletar';
import { InquilinoDrawer } from '@/components/inmobiliaria/InquilinoDrawer';
import { usePropietarios } from '@/lib/hooks/useInmobiliaria';
import { useInquilinos } from '@/lib/hooks/use-inquilinos';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { arriendosVigentes, type Inquilino } from '@/lib/api/inquilinos.service';
import type { TipoDeTercero } from '@/lib/api/migracion-terceros.service';
import { documentoConTipo } from '@/lib/propietarios/datos-por-completar';
import { FILTROS_INICIALES, filtrarPropietarios } from '@/lib/propietarios/filtrar-propietarios';
import type { Propietario } from '@/lib/types/inmobiliaria';
import { COLOMBIAN_BANKS } from '@/lib/types/payment-accounts';
import { cn } from '@/lib/utils';

import { FichaDelPropietario } from './FichaDelPropietario';

const POR_PAGINA = 10;
const TAMANOS_DE_PAGINA = [10, 25, 50];

/**
 * Qué sabe el paso de lo ya cargado, para decidir si la subida va abierta.
 * `cargando` sólo hasta la PRIMERA respuesta: un refresco posterior (guardar
 * una ficha, buscar) no puede esconder una subida que ya estaba a la vista.
 */
export type EstadoDeLoCargado =
  | { cargando: true }
  | { cargando: false; fallo: boolean; total: number };

interface PropsDeLoCargado {
  /** Abre la subida de otro archivo en el paso. */
  onSubirOtro: () => void;
  /** `true` mientras la subida ya está abierta: el botón sobra. */
  subiendoOtro: boolean;
  onEstado: (estado: EstadoDeLoCargado) => void;
}

export function TercerosYaCargados({ tipo, ...props }: PropsDeLoCargado & { tipo: TipoDeTercero }) {
  return tipo === 'PROPIETARIO' ? (
    <PropietariosYaCargados {...props} />
  ) : (
    <InquilinosYaCargados {...props} />
  );
}

/** Avisa al paso la primera vez que se supo algo, y cada vez que cambia el total. */
function useAvisarEstado(
  onEstado: (e: EstadoDeLoCargado) => void,
  cargando: boolean,
  fallo: boolean,
  total: number,
) {
  const yaRespondio = useRef(false);
  if (!cargando) yaRespondio.current = true;
  const sinRespuesta = cargando && !yaRespondio.current;
  useEffect(() => {
    onEstado(sinRespuesta ? { cargando: true } : { cargando: false, fallo, total });
  }, [onEstado, sinRespuesta, fallo, total]);
}

// ═══ Propietarios ═══════════════════════════════════════════════════════════

function PropietariosYaCargados({ onSubirOtro, subiendoOtro, onEstado }: PropsDeLoCargado) {
  const { propietarios, isLoading, errorCrudo, refetch } = usePropietarios();
  // Sin proveedor (la pantalla suelta, una prueba) se ofrece: el back decide igual.
  const permisos = usePermissionsContextSafe();
  const puedeEditar = permisos === null || permisos.canAccess('propietarios', 'edit');

  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(POR_PAGINA);
  const [abierto, setAbierto] = useState<Propietario | null>(null);

  // Filtrar → ordenar por nombre → paginar, sobre la lista COMPLETA: un
  // buscador que sólo mira la página actual miente (ver `filtrar-propietarios`).
  const filtrados = useMemo(
    () => filtrarPropietarios(propietarios, { ...FILTROS_INICIALES, busqueda }),
    [propietarios, busqueda],
  );
  const incompletos = useMemo(
    () => propietarios.filter((p) => (p.datosPendientes?.length ?? 0) > 0).length,
    [propietarios],
  );
  const visibles = filtrados.slice((pagina - 1) * porPagina, pagina * porPagina);

  useAvisarEstado(onEstado, isLoading, Boolean(errorCrudo), propietarios.length);

  // Vacío de verdad (llegó la lista y no hay nadie): el paso abre en la subida.
  if (!isLoading && !errorCrudo && propietarios.length === 0) return null;

  return (
    <>
      <MarcoDeLoCargado
        tipo="PROPIETARIO"
        total={propietarios.length}
        incompletos={incompletos}
        cargando={isLoading && propietarios.length === 0}
        puedeEditar={puedeEditar}
        busqueda={busqueda}
        onBusqueda={(b) => {
          setBusqueda(b);
          setPagina(1);
        }}
        onSubirOtro={onSubirOtro}
        subiendoOtro={subiendoOtro}
        paginacion={{
          total: filtrados.length,
          pagina,
          porPagina,
          onPagina: setPagina,
          onPorPagina: (n) => {
            setPorPagina(n);
            setPagina(1);
          },
        }}
      >
        <EstadoDeDatos
          cargando={isLoading}
          error={errorCrudo}
          queEs="los propietarios"
          onReintentar={refetch}
          conservarContenido
        >
          {filtrados.length === 0 ? (
            <SinCoincidencias busqueda={busqueda} queSon="propietarios" />
          ) : (
            <Table data-testid="ya-cargados-tabla">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Propietario</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Cuenta para girarle</TableHead>
                  <TableHead className="pr-6">Código en tu sistema</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((p) => (
                  <FilaDeLoCargado
                    key={p.id}
                    nombre={p.name}
                    correo={p.email}
                    telefono={p.phone}
                    pendientes={p.datosPendientes}
                    onAbrir={() => setAbierto(p)}
                  >
                    <Celda mono>
                      {p.documentNumber ? documentoConTipo(p.documentType, p.documentNumber, ' ') : null}
                    </Celda>
                    <Celda>{cuentaCorta(p)}</Celda>
                    <Celda mono>{p.externalId}</Celda>
                  </FilaDeLoCargado>
                ))}
              </TableBody>
            </Table>
          )}
        </EstadoDeDatos>
      </MarcoDeLoCargado>

      <FichaDelPropietario propietario={abierto} onCerrar={() => setAbierto(null)} />
    </>
  );
}

/** «Bancolombia ···1234». `null` = no hay cuenta, o el rol no la ve. */
function cuentaCorta(p: Propietario): string | null {
  if (p.datosBancariosOcultos) return null;
  const cuenta = p.bankAccount;
  const ultimos = cuenta?.ultimos4 || cuenta?.accountNumber?.slice(-4);
  if (!cuenta || !ultimos) return null;
  const banco = COLOMBIAN_BANKS.find((b) => b.code === cuenta.bank)?.name || cuenta.bankName || cuenta.bank;
  return `${banco} ···${ultimos}`;
}

// ═══ Inquilinos ═════════════════════════════════════════════════════════════

function InquilinosYaCargados({ onSubirOtro, subiendoOtro, onEstado }: PropsDeLoCargado) {
  const [busqueda, setBusqueda] = useState('');
  // `todos`: en la migración se cargan personas, con contrato o sin él.
  const { inquilinos, cargando, error, refrescar } = useInquilinos({ buscar: busqueda, estado: 'todos' });

  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(POR_PAGINA);
  const [abierto, setAbierto] = useState<Inquilino | null>(null);

  const visibles = inquilinos.slice((pagina - 1) * porPagina, pagina * porPagina);
  const incompletos = useMemo(
    () => inquilinos.filter((p) => (p.datosPendientes?.length ?? 0) > 0).length,
    [inquilinos],
  );

  /*
   * El total que decide si el paso abre en la subida es el de la lista SIN
   * buscar. Con una búsqueda puesta, cero resultados no es «no hay nadie».
   */
  const [totalSinBuscar, setTotalSinBuscar] = useState(0);
  useEffect(() => {
    if (!cargando && !error && busqueda.trim() === '') setTotalSinBuscar(inquilinos.length);
  }, [cargando, error, busqueda, inquilinos.length]);

  useAvisarEstado(onEstado, cargando, Boolean(error), totalSinBuscar);

  if (!cargando && !error && busqueda.trim() === '' && inquilinos.length === 0) return null;

  return (
    <>
      <MarcoDeLoCargado
        tipo="INQUILINO"
        total={totalSinBuscar}
        incompletos={busqueda.trim() === '' ? incompletos : null}
        cargando={cargando && totalSinBuscar === 0}
        puedeEditar={false}
        busqueda={busqueda}
        onBusqueda={(b) => {
          setBusqueda(b);
          setPagina(1);
        }}
        onSubirOtro={onSubirOtro}
        subiendoOtro={subiendoOtro}
        paginacion={{
          total: inquilinos.length,
          pagina,
          porPagina,
          onPagina: setPagina,
          onPorPagina: (n) => {
            setPorPagina(n);
            setPagina(1);
          },
        }}
      >
        <EstadoDeDatos
          cargando={cargando}
          error={error}
          queEs="los inquilinos"
          onReintentar={refrescar}
          conservarContenido
        >
          {inquilinos.length === 0 ? (
            <SinCoincidencias busqueda={busqueda} queSon="inquilinos" />
          ) : (
            <Table data-testid="ya-cargados-tabla">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Inquilino</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead className="pr-6">Contratos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((p) => (
                  <FilaDeLoCargado
                    key={p.tenantId}
                    nombre={p.nombre}
                    correo={p.email}
                    telefono={p.telefono}
                    pendientes={p.datosPendientes}
                    onAbrir={() => setAbierto(p)}
                  >
                    <Celda mono>{p.documento}</Celda>
                    <Celda vacio="Sin contrato">{contratosCorto(p)}</Celda>
                  </FilaDeLoCargado>
                ))}
              </TableBody>
            </Table>
          )}
        </EstadoDeDatos>
      </MarcoDeLoCargado>

      <InquilinoDrawer persona={abierto} onCerrar={() => setAbierto(null)} />
    </>
  );
}

/** «2 · 1 vigente». `null` = sin contrato todavía. */
function contratosCorto(p: Inquilino): string | null {
  const n = p.arriendos.length;
  if (n === 0) return null;
  const vigentes = arriendosVigentes(p).length;
  return `${n} · ${vigentes} ${vigentes === 1 ? 'vigente' : 'vigentes'}`;
}

// ═══ Piezas comunes ═════════════════════════════════════════════════════════

const PALABRAS: Record<TipoDeTercero, { titulo: string; uno: string; varios: string }> = {
  PROPIETARIO: { titulo: 'Tus propietarios en Leasefy', uno: 'propietario', varios: 'propietarios' },
  INQUILINO: { titulo: 'Tus inquilinos en Leasefy', uno: 'inquilino', varios: 'inquilinos' },
};

function MarcoDeLoCargado({
  tipo,
  total,
  incompletos,
  cargando,
  puedeEditar,
  busqueda,
  onBusqueda,
  onSubirOtro,
  subiendoOtro,
  paginacion,
  children,
}: {
  tipo: TipoDeTercero;
  total: number;
  /** `null` = no se sabe (hay una búsqueda puesta en una lista que filtra el back). */
  incompletos: number | null;
  cargando: boolean;
  puedeEditar: boolean;
  busqueda: string;
  onBusqueda: (b: string) => void;
  onSubirOtro: () => void;
  subiendoOtro: boolean;
  paginacion: {
    total: number;
    pagina: number;
    porPagina: number;
    onPagina: (p: number) => void;
    onPorPagina: (n: number) => void;
  };
  children: React.ReactNode;
}) {
  const palabras = PALABRAS[tipo];

  return (
    <section
      className="overflow-hidden rounded-lg border border-border-faint bg-surface shadow-sm"
      data-testid="ya-cargados"
      data-tipo={tipo}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pb-4 pt-5">
        <div className="min-w-0 space-y-1">
          <h2 className="text-sm font-medium text-fg">{palabras.titulo}</h2>
          <p className="max-w-prose text-sm text-fg-muted" data-testid="ya-cargados-resumen">
            {cargando ? (
              'Buscando lo que ya cargaste…'
            ) : (
              <>
                <span className="text-fg">
                  <span className="font-mono tabular-nums">{total.toLocaleString('es-CO')}</span>{' '}
                  {total === 1 ? palabras.uno : palabras.varios}
                </span>
                {incompletos ? (
                  <>
                    {' · '}
                    <span className="text-warning">
                      <span className="font-mono tabular-nums">{incompletos.toLocaleString('es-CO')}</span>{' '}
                      con datos por completar
                    </span>
                  </>
                ) : null}
                {'. '}
                {puedeEditar
                  ? 'Abre uno para ver su ficha completa o editarla.'
                  : 'Abre uno para ver su ficha completa.'}
              </>
            )}
          </p>
        </div>
        {subiendoOtro ? null : (
          <Button
            size="sm"
            variant="outline"
            hideArrow
            onClick={onSubirOtro}
            data-testid="subir-otro-archivo"
          >
            <UploadSimple className="h-4 w-4" />
            Subir otro archivo
          </Button>
        )}
      </div>

      <div className="border-t border-border-faint px-6 py-3">
        <SearchInput
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
          onClear={() => onBusqueda('')}
          placeholder="Busca por nombre, documento, correo o teléfono"
          inputSize="md"
          className="w-full sm:max-w-md"
          aria-label={`Buscar ${palabras.varios}`}
          data-testid="ya-cargados-buscar"
        />
      </div>

      <div className="border-t border-border-faint">{children}</div>

      {paginacion.total > paginacion.porPagina ? (
        <div className="border-t border-border-faint px-4 py-3">
          <TablePagination
            total={paginacion.total}
            page={paginacion.pagina}
            pageSize={paginacion.porPagina}
            pageSizeOptions={TAMANOS_DE_PAGINA}
            onPageChange={(p) =>
              paginacion.onPagina(
                Math.max(1, Math.min(p, Math.ceil(paginacion.total / paginacion.porPagina))),
              )
            }
            onPageSizeChange={paginacion.onPorPagina}
          />
        </div>
      ) : null}
    </section>
  );
}

/**
 * La fila entera abre la ficha; el NOMBRE es un `<button>` real porque un
 * `<tr onClick>` no se tabula (mismo arreglo que la tabla de Inquilinos).
 */
function FilaDeLoCargado({
  nombre,
  correo,
  telefono,
  pendientes,
  onAbrir,
  children,
}: {
  nombre: string;
  correo: string | null;
  telefono: string | null;
  pendientes: readonly string[] | null | undefined;
  onAbrir: () => void;
  children: React.ReactNode;
}) {
  return (
    <TableRow
      className="cursor-pointer transition-colors hover:bg-surface-hover"
      onClick={onAbrir}
      data-testid="ya-cargados-fila"
    >
      <TableCell className="py-3 pl-6 align-top">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAbrir();
          }}
          className="block min-w-0 max-w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="block truncate text-sm font-medium text-fg">{nombre}</span>
          {/* El contacto va debajo del nombre y no en columnas propias: en el
              muro la tabla tiene la mitad del ancho y se corría a los lados. */}
          <span className="block truncate text-caption text-fg-muted">
            <span className={correo ? undefined : 'text-fg-subtle'}>{correo || 'Sin correo'}</span>
            {telefono ? (
              <>
                {' · '}
                <span className="font-mono tabular-nums">{telefono}</span>
              </>
            ) : null}
          </span>
        </button>
        <DatosPorCompletar pendientes={pendientes} className="mt-1.5 inline-flex" />
      </TableCell>
      {children}
    </TableRow>
  );
}

/** Un dato que falta se dice, con la misma frase en toda la tabla. */
function Celda({
  children,
  mono,
  vacio = 'Sin registrar',
}: {
  children: string | null | undefined;
  mono?: boolean;
  vacio?: string;
}) {
  const texto = children?.trim();
  return (
    <TableCell className="py-3 align-top">
      <span
        className={cn(
          // «CC 80123456» y «Bancolombia ···4321» son un dato: no se parten.
          'whitespace-nowrap text-sm',
          texto ? 'text-fg' : 'text-fg-subtle',
          texto && mono && 'font-mono tabular-nums',
        )}
      >
        {texto || vacio}
      </span>
    </TableCell>
  );
}

function SinCoincidencias({ busqueda, queSon }: { busqueda: string; queSon: string }) {
  return (
    <p className="px-6 py-10 text-center text-sm text-fg-muted" data-testid="ya-cargados-sin-coincidencias">
      {busqueda.trim()
        ? `Ningún ${queSon === 'propietarios' ? 'propietario' : 'inquilino'} coincide con «${busqueda.trim()}».`
        : `Todavía no hay ${queSon}.`}
    </p>
  );
}
