'use client';

/**
 * Los rubros del P&G y sus cuentas del PUC (contrato del 18-09, §1).
 *
 * ── Qué cierra esta pantalla ────────────────────────────────────────────────
 *
 * El «—» del real de `gastos` y `nomina` en el presupuesto. Nadie había dicho
 * qué cuenta del PUC es cada rubro, así que el presupuesto no tenía con qué
 * comparar (ver el encabezado de `components/finanzas/Presupuesto.tsx`, que
 * explica por qué ese guion es un guion y no un cero). Acá se dice, y el
 * presupuesto y el P&G ganan la columna de real del libro.
 *
 * ── Un rubro tiene VARIAS cuentas, y una de ellas puede ser mayor ───────────
 *
 * «Gastos = todo el 51» es lo que un contador quiere decir, y el back suma la
 * cuenta y todas sus hijas. Por eso el selector de acá NO filtra por imputable,
 * al contrario del del asiento manual, donde una cuenta mayor es un 400
 * (`CUENTA_MAYOR`). La pantalla marca las mayores con «suma sus hijas», porque
 * mapear a `51` y a `5105` da totales muy distintos y los dos son válidos: quien
 * elige tiene que saber cuál eligió.
 *
 * El `Combobox` del sistema de diseño es de selección única, así que el juego de
 * cuentas se arma sumando de a una y se muestra como fichas que se pueden
 * quitar. Cada cambio manda el juego COMPLETO (el `PUT` reemplaza): si mandara
 * sólo el delta, un rubro con tres cuentas del que se quita una quedaría con las
 * tres.
 *
 * ── 🔴 El mapeo NO reemplaza las fuentes propias ───────────────────────────
 *
 * `comisiones`, `intereses_y_gastos_de_cobranza` y `costos_de_la_plata` ya se
 * miden donde se medían. Sus filas lo dicen con `explicacionDeLaSegundaLectura`:
 * sin esa frase, ver dos números distintos en la misma fila del presupuesto
 * parece un bug del producto, cuando es justamente el control que se quería.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banner } from '@leasefy/cadence';
import { Sparkle, X } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import {
  contabilidadApi,
  type MapeoDeRubro,
  type MapeoDeRubros,
} from '@/lib/api/contabilidad.service';
import {
  NOMBRE_DE_LA_FUENTE,
  NOMBRE_DE_LA_NATURALEZA,
  avisosDelMapeoDeRubros,
  cuentasMayores,
  explicacionDeLaSegundaLectura,
  faltantesSugeridos,
  rubrosSembrables,
} from '@/lib/contabilidad/rubros-del-pyg';
import { Avisos } from '@/components/finanzas/piezas';
import { AccionConMotivo, FaltaLaMigracion, Nota } from '../piezas';
import { SelectorDeCuenta } from '../SelectorDeCuenta';
import { useCuentas } from '../use-cuentas';
import { usePuedeEscribir } from '../use-puede-escribir';

export function RubrosDelPyg() {
  const [mapeo, setMapeo] = useState<MapeoDeRubros | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  /** Qué rubros tienen un PUT en vuelo: se deshabilita sólo esa fila. */
  const [guardando, setGuardando] = useState<ReadonlySet<string>>(new Set());
  const [sembrando, setSembrando] = useState(false);
  const { cuentas, cargando: cuentasCargando } = useCuentas();
  const escritura = usePuedeEscribir();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setMapeo(await contabilidadApi.mapeo.rubros());
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /*
   * Los del back PRIMERO: son los dos casos que esta capa no puede deducir y que
   * producen un número que se ve razonable — una cuenta AMBIGUA (dos rubros la
   * reclaman, así que su plata se cuenta dos veces) y un código HUÉRFANO (el
   * rubro apunta a una cuenta que ya no existe, da cero, y ese cero no significa
   * «no se gastó»). Después los que sí se derivan de la forma del mapeo.
   */
  const avisos = useMemo(
    () => [...(mapeo?.avisos ?? []), ...(mapeo ? avisosDelMapeoDeRubros(mapeo) : [])],
    [mapeo],
  );
  const sembrables = useMemo(() => (mapeo ? rubrosSembrables(mapeo) : []), [mapeo]);
  const faltan = useMemo(() => (mapeo ? faltantesSugeridos(mapeo) : []), [mapeo]);

  const marcar = (rubro: string, activo: boolean) =>
    setGuardando((previo) => {
      const siguiente = new Set(previo);
      if (activo) siguiente.add(rubro);
      else siguiente.delete(rubro);
      return siguiente;
    });

  /** Manda el juego COMPLETO de cuentas del rubro: el PUT reemplaza. */
  const guardarCuentas = async (rubro: MapeoDeRubro, cuentaIds: string[], que: string) => {
    marcar(rubro.rubro, true);
    try {
      setMapeo(await contabilidadApi.mapeo.guardarRubro({ rubro: rubro.rubro, cuentaIds }));
      toast.success(que);
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo guardar el mapeo del rubro.'));
    } finally {
      marcar(rubro.rubro, false);
    }
  };

  const agregar = (rubro: MapeoDeRubro, cuentaId: string) => {
    if (!cuentaId) return;
    if (rubro.cuentas.some((c) => c.id === cuentaId)) {
      toast.info('Esa cuenta ya está en el rubro.');
      return;
    }
    const cuenta = cuentas.find((c) => c.id === cuentaId);
    void guardarCuentas(
      rubro,
      [...rubro.cuentas.map((c) => c.id), cuentaId],
      `«${rubro.nombre}» suma ${cuenta ? `${cuenta.codigo} · ${cuenta.nombre}` : 'la cuenta elegida'}.`,
    );
  };

  const quitar = (rubro: MapeoDeRubro, cuentaId: string) => {
    const cuenta = rubro.cuentas.find((c) => c.id === cuentaId);
    const quedan = rubro.cuentas.filter((c) => c.id !== cuentaId).map((c) => c.id);
    void guardarCuentas(
      rubro,
      quedan,
      quedan.length === 0
        ? `«${rubro.nombre}» quedó sin cuenta: su real del libro vuelve a «—».`
        : `«${rubro.nombre}» ya no incluye ${cuenta?.codigo ?? 'esa cuenta'}.`,
    );
  };

  const sembrar = async () => {
    setSembrando(true);
    try {
      const r = await contabilidadApi.mapeo.sembrarRubros();
      setMapeo(r.mapeo);
      if (r.asignados.length > 0) {
        toast.success(
          r.asignados.length === 1
            ? '1 rubro quedó con la cuenta propuesta.'
            : `${r.asignados.length} rubros quedaron con la cuenta propuesta.`,
        );
      }
      if (r.sinCuenta.length > 0) {
        toast.warning(
          `Sin cuenta en tu plan para ${r.sinCuenta.length}: falta ${r.sinCuenta
            .map((s) => s.codigos.join('/'))
            .join(', ')}.`,
        );
      }
      if (r.asignados.length === 0 && r.sinCuenta.length === 0) {
        toast.info('Todos los rubros ya tenían su cuenta: no se pisó nada.');
      }
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo sembrar el preset.'));
    } finally {
      setSembrando(false);
    }
  };

  if (cargando || cuentasCargando) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Spinner size="lg" />
        <p className="text-sm text-fg-muted">Cargando los rubros…</p>
      </div>
    );
  }
  if (error || !mapeo) {
    return <FalloDeCarga error={error} queEs="el mapeo de rubros del P&G" onReintentar={cargar} />;
  }

  // Sin la migración 49 no hay tabla `mapeos_de_rubro`: se explica qué falta y
  // no se dibuja nada editable, porque cada PUT sería un 503.
  if (!mapeo.disponible) {
    return (
      <div className="space-y-4" data-testid="rubros-del-pyg">
        <FaltaLaMigracion
          motivo={mapeo.motivo}
          queSeEspera="decir qué cuenta del PUC es cada rubro del P&G"
          mientrasTanto="El presupuesto sigue cargándose y comparándose igual; lo que queda en «—» es el real del libro de los rubros que no tienen una fuente propia."
          testId="rubros-sin-migracion"
        />
      </div>
    );
  }

  const puedeSembrar = escritura.puede && sembrables.length > 0;

  return (
    <div className="space-y-5" data-testid="rubros-del-pyg">
      {mapeo.completo ? (
        <Banner variant="success" title="Todos los rubros sugeridos tienen su cuenta">
          El presupuesto y el P&G pueden mostrar el real del libro al lado del presupuestado.
        </Banner>
      ) : (
        <Banner
          variant="warning"
          title={`Faltan ${faltan.length} de ${mapeo.rubros.filter((r) => r.sugerido).length}: sin cuenta, el real del libro sale en «—»`}
        >
          <p data-testid="rubros-que-hacer">
            Elige una o varias cuentas del PUC en cada rubro. Se puede mapear a una cuenta mayor
            (por ejemplo, todo el 51): el real suma esa cuenta y todas sus hijas, que es lo que un
            contador espera cuando dice «gastos = todo el 51».
          </p>
        </Banner>
      )}

      <Avisos avisos={avisos} testId="avisos-de-rubros" titulo="Lo que hay que resolver" />

      {sembrables.length > 0 ? (
        <AccionConMotivo
          puede={puedeSembrar}
          motivo={escritura.motivo}
          ocupado={sembrando}
          textoOcupado="Asignando…"
          onClick={() => void sembrar()}
          testId="sembrar-preset-de-rubros"
          variant="default"
          enLinea
        >
          <Sparkle className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Sembrar el preset ({sembrables.length})
        </AccionConMotivo>
      ) : null}

      <Nota testId="nota-del-preset">
        <p>
          El preset es lo que Leasefy propone por el código de la cuenta. No pisa nada de lo que ya
          esté asignado: sólo llena los rubros vacíos.
        </p>
      </Nota>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Rubro</TableHead>
                <TableHead>Naturaleza</TableHead>
                <TableHead className="min-w-[320px]">Cuentas del PUC</TableHead>
                <TableHead className="min-w-[240px]">Agregar una cuenta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mapeo.rubros.map((r) => {
                const segundaLectura = explicacionDeLaSegundaLectura(r);
                const mayores = cuentasMayores(r);
                const ocupada = guardando.has(r.rubro);
                return (
                  <TableRow key={r.rubro} data-testid={`rubro-${r.rubro}`}>
                    <TableCell className="max-w-[320px] align-top">
                      <p className="font-medium text-fg">{r.nombre}</p>
                      <p className="text-caption text-fg-muted">
                        {NOMBRE_DE_LA_FUENTE[r.fuenteDelReal]}
                        {!r.sugerido ? ' · rubro propio de la inmobiliaria' : ''}
                      </p>
                      {segundaLectura ? (
                        <p
                          className="mt-1 text-caption text-fg-subtle"
                          data-testid={`segunda-lectura-${r.rubro}`}
                        >
                          {segundaLectura}
                        </p>
                      ) : null}
                      {r.motivoSinReal ? (
                        <p className="mt-1 text-caption text-fg-subtle">{r.motivoSinReal}</p>
                      ) : null}
                    </TableCell>

                    <TableCell className="whitespace-nowrap align-top">
                      <Badge
                        variant={
                          r.naturaleza === 'MIXTO'
                            ? 'destructive'
                            : r.naturaleza === 'INGRESO'
                              ? 'secondary'
                              : 'outline'
                        }
                        data-testid={`naturaleza-${r.rubro}`}
                      >
                        {NOMBRE_DE_LA_NATURALEZA[r.naturaleza]}
                      </Badge>
                      {r.naturaleza === 'MIXTO' ? (
                        <p className="mt-1 max-w-[12rem] text-caption text-danger">
                          Cuentas de clases distintas: el total suma ingresos y gastos.
                        </p>
                      ) : null}
                    </TableCell>

                    <TableCell className="align-top">
                      {r.cuentas.length === 0 ? (
                        <p className="text-caption text-fg-muted" data-testid={`sin-cuenta-${r.rubro}`}>
                          Sin cuenta: el real del libro de este rubro sale en «—».
                          {r.codigosPropuestos.length > 0 && r.propuestas.length === 0
                            ? ` El preset propone ${r.codigosPropuestos.join(', ')}, que no está en tu plan.`
                            : ''}
                        </p>
                      ) : (
                        <>
                          <ul className="flex flex-wrap gap-1.5">
                            {r.cuentas.map((c) => (
                              <li key={c.id}>
                                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-muted py-0.5 pl-2 pr-1 font-mono text-xs text-fg">
                                  {c.codigo} · {c.nombre}
                                  {!c.imputable ? (
                                    <span
                                      className="font-sans text-caption text-fg-muted"
                                      title="Es una cuenta mayor: el real suma esta cuenta y todas sus hijas."
                                    >
                                      (suma sus hijas)
                                    </span>
                                  ) : null}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    hideArrow
                                    className="h-5 w-5"
                                    aria-label={`Quitar ${c.codigo} de ${r.nombre}`}
                                    disabled={!escritura.puede || ocupada}
                                    title={escritura.motivo ?? undefined}
                                    onClick={() => quitar(r, c.id)}
                                    data-testid={`quitar-${r.rubro}-${c.id}`}
                                  >
                                    <X className="h-3 w-3" aria-hidden="true" />
                                  </Button>
                                </span>
                              </li>
                            ))}
                          </ul>
                          {mayores > 0 ? (
                            <p className="mt-1 text-caption text-fg-muted">
                              {mayores === 1
                                ? '1 cuenta mayor: su real incluye todas las subcuentas.'
                                : `${mayores} cuentas mayores: su real incluye todas las subcuentas.`}
                            </p>
                          ) : null}
                        </>
                      )}
                    </TableCell>

                    <TableCell className="align-top">
                      {/* Sin `soloImputables`: una cuenta mayor acá es lo normal. */}
                      <SelectorDeCuenta
                        cuentas={cuentas}
                        value=""
                        onChange={(cuentaId) => agregar(r, cuentaId)}
                        disabled={!escritura.puede || ocupada}
                        placeholder="Agregar cuenta (mayor o imputable)"
                        className="w-full"
                      />
                      {!escritura.puede && escritura.motivo ? (
                        <p className="mt-1 text-caption text-fg-muted">{escritura.motivo}</p>
                      ) : r.propuestas.length > 0 && r.cuentas.length === 0 ? (
                        <p className="mt-1 text-caption text-fg-muted">
                          El preset propone {r.propuestas.map((p) => p.codigo).join(', ')}.
                        </p>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
