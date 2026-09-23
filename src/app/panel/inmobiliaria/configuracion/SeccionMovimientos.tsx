'use client';

/**
 * 🔴 BITÁCORA DE MOVIMIENTOS: quién hizo qué en todo el panel, con su rol.
 *
 * Nico (22-09-2026): «cada uno de los features debería tener bitácora de
 * uso/movimiento, del usuario que haga algo, su rol, etc., porque eso es muy
 * importante y debe estar en todo lado».
 *
 * La escribe el back SOLO, después de cada acción (también las que se negaron
 * por permiso). Esta pantalla es de SÓLO LECTURA.
 *
 * El molde:
 *   · el resumen es UNA FRASE, afuera de la tarjeta;
 *   · mes + filtros + tabla = UNA tarjeta, y los filtros dicen que son filtros;
 *   · la fila abre un cajón con el detalle (y lo enviado, redactado), sin pedirle
 *     nada nuevo al back.
 *
 * ⚠️ Sin la migración la tabla sale VACÍA diciendo por qué: una bitácora vacía
 * sin explicación se lee como «nadie hizo nada», que es lo contrario de la
 * verdad.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SelectorDeMes } from '@/components/finanzas/SelectorDeMes';
import { CajonDelMovimiento } from '@/components/movimientos/CajonDelMovimiento';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  movimientosApi,
  type Movimiento,
  type OpcionesDeMovimientos,
  type PaginaDeMovimientos,
  type ResultadoDelMovimiento,
} from '@/lib/api/movimientos.service';
import {
  RESULTADO_EN_PALABRAS,
  cuandoEnBogota,
  fraseDelResumen,
  moduloEnPalabras,
  quienFue,
  rangoDelMes,
  resultadoDe,
  rolEnPalabras,
} from '@/lib/movimientos/en-palabras';
import { mesActual, nombreDelMes } from '@/lib/recaudo/meses';
import { EsqueletoDeSeccion } from './piezas';

const TODOS = 'todos';
const POR_PAGINA = 50;
const TONO = { exito: 'secondary', negado: 'warning', error: 'destructive' } as const;

interface Filtros {
  usuario: string;
  rol: string;
  modulo: string;
  resultado: string;
}

const SIN_FILTROS: Filtros = { usuario: TODOS, rol: TODOS, modulo: TODOS, resultado: TODOS };

const valor = (v: string) => (v === TODOS ? undefined : v);

function Filtro({
  etiqueta,
  value,
  onChange,
  testId,
  children,
}: {
  etiqueta: string;
  value: string;
  onChange: (v: string) => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="h-9 w-auto min-w-[9rem] gap-2 text-sm"
        aria-label={`Filtrar por ${etiqueta}`}
        data-testid={testId}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

export function SeccionMovimientos() {
  const [mes, setMes] = useState(mesActual());
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<PaginaDeMovimientos | null>(null);
  const [opciones, setOpciones] = useState<OpcionesDeMovimientos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [abierto, setAbierto] = useState<Movimiento | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { desde, hasta } = rangoDelMes(mes);
      setDatos(
        await movimientosApi.listar({
          desde,
          hasta,
          usuario: valor(filtros.usuario),
          rol: valor(filtros.rol),
          modulo: valor(filtros.modulo),
          resultado: valor(filtros.resultado) as ResultadoDelMovimiento | undefined,
          pagina,
          porPagina: POR_PAGINA,
        }),
      );
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [mes, filtros, pagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Las opciones de los filtros salen de la bitácora misma: una vez.
  useEffect(() => {
    movimientosApi
      .opciones()
      .then(setOpciones)
      .catch(() => setOpciones(null));
  }, []);

  const cambiar = (clave: keyof Filtros) => (v: string) => {
    setFiltros((f) => ({ ...f, [clave]: v }));
    setPagina(1);
  };
  const hayFiltros = useMemo(
    () => (Object.keys(filtros) as (keyof Filtros)[]).some((k) => filtros[k] !== TODOS),
    [filtros],
  );

  if (!datos && (cargando || error)) {
    return (
      <EstadoDeDatos
        cargando={cargando}
        error={error}
        onReintentar={cargar}
        queEs="la bitácora de movimientos"
        principal
        esqueleto={<EsqueletoDeSeccion filas={8} />}
      >
        <span />
      </EstadoDeDatos>
    );
  }
  if (!datos) return null;

  const paginas = Math.max(1, Math.ceil(datos.total / datos.porPagina));
  const cuando = `en ${nombreDelMes(mes)}`;

  return (
    <div className="space-y-4" data-testid="bitacora-de-movimientos">
      {datos.disponible ? (
        <p className="text-sm text-fg" data-testid="frase-del-resumen">
          {fraseDelResumen(datos, cuando)}
        </p>
      ) : (
        <p
          className="rounded-md border border-border bg-warning-soft px-3 py-2 text-sm text-fg"
          data-testid="movimientos-sin-migrar"
          title={datos.motivo ?? undefined}
        >
          La bitácora todavía no guarda movimientos: falta un paso de la base de datos que nuestro
          equipo está habilitando. Mientras tanto, lo que mueve plata sigue quedando en la bitácora
          de plata.
        </p>
      )}

      <section className="overflow-x-clip rounded-lg border border-border bg-surface">
        <div className="flex flex-col gap-3 border-b border-border p-4">
          <div className="flex flex-wrap items-center gap-2" data-testid="filtros-de-movimientos">
            <span className="text-sm text-fg-muted">Filtrar por</span>
            <SelectorDeMes
              mes={mes}
              onCambiar={(m) => {
                setMes(m);
                setPagina(1);
              }}
              testId="mes-de-movimientos"
            />
            <Filtro
              etiqueta="persona"
              value={filtros.usuario}
              onChange={cambiar('usuario')}
              testId="filtro-persona"
            >
              <SelectItem value={TODOS}>Todas las personas</SelectItem>
              {(opciones?.personas ?? []).map((p) => (
                <SelectItem key={p.userId} value={p.userId}>
                  {p.nombre ?? p.email ?? p.userId}
                </SelectItem>
              ))}
            </Filtro>
            <Filtro etiqueta="rol" value={filtros.rol} onChange={cambiar('rol')} testId="filtro-rol">
              <SelectItem value={TODOS}>Todos los roles</SelectItem>
              {(opciones?.roles ?? []).map((r) => (
                <SelectItem key={r} value={r}>
                  {rolEnPalabras(r)}
                </SelectItem>
              ))}
            </Filtro>
            <Filtro
              etiqueta="módulo"
              value={filtros.modulo}
              onChange={cambiar('modulo')}
              testId="filtro-modulo"
            >
              <SelectItem value={TODOS}>Todos los módulos</SelectItem>
              {(opciones?.modulos ?? []).map((m) => (
                <SelectItem key={m} value={m}>
                  {moduloEnPalabras(m)}
                </SelectItem>
              ))}
            </Filtro>
            <Filtro
              etiqueta="resultado"
              value={filtros.resultado}
              onChange={cambiar('resultado')}
              testId="filtro-resultado"
            >
              <SelectItem value={TODOS}>Cualquier resultado</SelectItem>
              <SelectItem value="exito">Hechos</SelectItem>
              <SelectItem value="negado">Negados por permiso</SelectItem>
              <SelectItem value="error">Fallidos</SelectItem>
            </Filtro>
            {hayFiltros ? (
              <Button
                variant="ghost"
                size="sm"
                hideArrow
                onClick={() => {
                  setFiltros(SIN_FILTROS);
                  setPagina(1);
                }}
                data-testid="quitar-filtros"
              >
                Quitar filtros
              </Button>
            ) : null}
          </div>
        </div>

        {datos.filas.length === 0 ? (
          <p className="p-8 text-center text-sm text-fg-muted" data-testid="movimientos-vacio">
            {datos.disponible
              ? hayFiltros
                ? 'Nada coincide con estos filtros en este mes.'
                : 'Nadie hizo nada en el panel este mes.'
              : 'Sin movimientos todavía.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuándo</TableHead>
                  <TableHead>Quién</TableHead>
                  <TableHead>Qué hizo</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datos.filas.map((m) => {
                  const r = resultadoDe(m.resultado);
                  return (
                    <TableRow
                      key={m.id}
                      data-testid={`movimiento-${m.id}`}
                      tabIndex={0}
                      aria-label={`Abrir: ${m.accion}`}
                      className="cursor-pointer focus-visible:bg-surface-muted"
                      onClick={() => setAbierto(m)}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault();
                          setAbierto(m);
                        }
                      }}
                    >
                      <TableCell className="whitespace-nowrap font-mono text-caption text-fg-muted">
                        {cuandoEnBogota(m.fecha)}
                      </TableCell>
                      <TableCell className="max-w-[14rem]">
                        <p className="truncate text-sm text-fg" title={quienFue(m)}>
                          {quienFue(m)}
                        </p>
                        <p className="text-caption text-fg-muted">{rolEnPalabras(m.actor.rol)}</p>
                      </TableCell>
                      <TableCell className="max-w-[22rem]">
                        <p className="truncate text-sm text-fg" title={m.accion}>
                          {m.accion}
                        </p>
                        <p className="text-caption text-fg-muted">{moduloEnPalabras(m.modulo)}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={TONO[r]}>{RESULTADO_EN_PALABRAS[r]}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {datos.total > datos.porPagina ? (
          <div
            className="flex items-center justify-between gap-3 border-t border-border px-4 py-3"
            data-testid="paginacion-de-movimientos"
          >
            <p className="text-sm text-fg-muted">
              Página <span className="font-mono">{datos.pagina}</span> de{' '}
              <span className="font-mono">{paginas}</span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                hideArrow
                disabled={datos.pagina <= 1 || cargando}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                hideArrow
                disabled={datos.pagina >= paginas || cargando}
                onClick={() => setPagina((p) => p + 1)}
                data-testid="pagina-siguiente"
              >
                Siguiente
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <CajonDelMovimiento movimiento={abierto} onCerrar={() => setAbierto(null)} />
    </div>
  );
}
