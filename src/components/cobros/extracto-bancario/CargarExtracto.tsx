'use client';

/**
 * Cargar un extracto: el archivo se lee en el navegador (como todas las
 * importaciones), se mapean las columnas por sinónimos, se muestran cinco
 * filas de prueba y recién ahí se manda al back.
 *
 * 🔴 Fase 1 de la conciliación (02-10-2026):
 *   · la CUENTA es obligatoria (Nico, P3): sale de las cuentas de la
 *     inmobiliaria (Configuración → Medios de pago) y cada línea la guarda;
 *   · los saldos inicial y final (de la columna «Saldo» o escritos acá) y el
 *     período prueban que el extracto llegó completo: si no cuadra, entra
 *     igual y queda el aviso;
 *   · si el archivo parece de OTRA cuenta (409 `EXTRACTO_DE_OTRA_CUENTA`), se
 *     pregunta antes de duplicar nada.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Bank, UploadSimple, Warning, X } from '@phosphor-icons/react';
import { Banner } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { leerPrimerasFilas, parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile';
import { ApiError } from '@/lib/api/client';
import { conciliacionBancariaApi } from '@/lib/api/conciliacion-bancaria.service';
import type { CuentaDelExtracto, ResultadoDeCarga } from '@/lib/api/conciliacion-bancaria.types';
import {
  COLUMNAS_DE_EXTRACTO,
  armarFilasDeExtracto,
  detectarFilaDeEncabezado,
  faltantesDelMapeo,
  mapearColumnasDeExtracto,
  parsearValorCop,
  type CampoDeExtracto,
  type MapeoDeExtracto,
} from '@/lib/cobros/extracto-bancario';
import { errorDeLasFilasDelExtracto, leerSaldoEscrito } from '@/lib/cobros/limites-del-extracto';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { plata } from './formato';
import {
  RUTA_DE_LOS_MEDIOS_DE_PAGO,
  cuadreEnVivo,
  fraseDelCuadre,
  nombreDeLaCuenta,
  opcionDeLaCuenta,
  partesDelResultado,
  periodoDeLasFilas,
  traeLaColumnaDeSaldo,
  useAparecer,
} from './cuentas-del-extracto';

interface Props {
  onCargado: (resultado: ResultadoDeCarga) => void;
}

const SIN_MAPEAR = '__ninguna__';

/** El 409 de «este archivo parece de otra cuenta», con lo que hace falta para preguntar. */
interface DeOtraCuenta {
  mensaje: string;
}

export function CargarExtracto({ onCargado }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const mov = useAparecer();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [crudas, setCrudas] = useState<Record<string, unknown>[]>([]);
  const [mapeo, setMapeo] = useState<MapeoDeExtracto>({});
  const [leyendo, setLeyendo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDeCarga | null>(null);

  /**
   * 🔴 (02-10-2026, Nico P3) Las cuentas de la inmobiliaria. La cuenta es
   * obligatoria: sin ninguna registrada no se puede cargar, y se dice dónde
   * registrarla.
   */
  const [cuentas, setCuentas] = useState<CuentaDelExtracto[] | null>(null);
  const [errorDeCuentas, setErrorDeCuentas] = useState<unknown>(null);
  const [cuentaId, setCuentaId] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [saldoFinal, setSaldoFinal] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [deOtraCuenta, setDeOtraCuenta] = useState<DeOtraCuenta | null>(null);

  const leerCuentas = useCallback(async () => {
    setErrorDeCuentas(null);
    try {
      const r = await conciliacionBancariaApi.cuentas();
      const activas = r.cuentas.filter((c) => c.activa);
      setCuentas(activas);
      // Con UNA sola cuenta no hay nada que elegir: se preselecciona.
      if (activas.length === 1) setCuentaId(activas[0].id);
    } catch (error) {
      setErrorDeCuentas(error);
    }
  }, []);

  useEffect(() => {
    void leerCuentas();
  }, [leerCuentas]);

  const cuenta = cuentas?.find((c) => c.id === cuentaId) ?? null;
  /** La cuenta elegida recauda por ARCHIVO: su extracto no se puede cargar. */
  const laCuentaEntraPorArchivo = cuenta?.via === 'ARCHIVO' ? cuenta : null;

  const armadas = useMemo(() => armarFilasDeExtracto(crudas, mapeo), [crudas, mapeo]);
  const faltan = faltantesDelMapeo(mapeo);
  /** 🔁 Espejo del tope del back: más de 20.000 líneas no se mandan. */
  const demasiadas = errorDeLasFilasDelExtracto(armadas.filas.length);
  const periodoDeLasLineas = useMemo(() => periodoDeLasFilas(armadas.filas), [armadas.filas]);
  const conColumnaDeSaldo = traeLaColumnaDeSaldo(armadas.filas);

  const inicial = leerSaldoEscrito(saldoInicial, parsearValorCop);
  const final = leerSaldoEscrito(saldoFinal, parsearValorCop);
  const cuadre = cuadreEnVivo(armadas.filas, inicial.valor, final.valor);
  const periodoAlReves = !!desde && !!hasta && desde > hasta;

  // El período arranca en el de las líneas; la persona lo cambia si el extracto cubre más.
  useEffect(() => {
    setDesde(periodoDeLasLineas?.desde ?? '');
    setHasta(periodoDeLasLineas?.hasta ?? '');
  }, [periodoDeLasLineas?.desde, periodoDeLasLineas?.hasta]);

  const leer = async (f: File) => {
    setLeyendo(true);
    setResultado(null);
    try {
      // Los extractos traen arriba la cuenta y el rango de fechas: la fila
      // de encabezados hay que buscarla, no asumir que es la primera.
      const primeras = await leerPrimerasFilas(f);
      const filaDeEncabezado = detectarFilaDeEncabezado(primeras) ?? 0;
      const r = await parseSpreadsheetFile(f, undefined, { filaDeEncabezado });
      if (r.headers.length === 0) {
        toast.error('El archivo no tiene encabezados: no hay cómo saber qué columna es la fecha.');
        return;
      }
      setArchivo(f);
      setEncabezados(r.headers);
      setCrudas(r.rows as Record<string, unknown>[]);
      setMapeo(mapearColumnasDeExtracto(r.headers));
    } catch (error) {
      // Un fallo al LEER el archivo es del navegador, no del servidor.
      toast.error(mensajeParaLaPersona(error, { porDefecto: 'No se pudo leer el archivo.' }));
    } finally {
      setLeyendo(false);
    }
  };

  const limpiar = () => {
    setArchivo(null);
    setEncabezados([]);
    setCrudas([]);
    setMapeo({});
    setSaldoInicial('');
    setSaldoFinal('');
    if (input.current) input.current.value = '';
  };

  const cargar = async (aceptarIgualesDeOtraCuenta = false) => {
    if (!archivo || !cuenta || faltan.length > 0 || armadas.filas.length === 0) return;
    if (demasiadas) {
      toast.error(demasiadas);
      return;
    }
    setCargando(true);
    try {
      const r = await conciliacionBancariaApi.cargarExtracto(archivo.name, armadas.filas, {
        cuentaId: cuenta.id,
        saldoInicialCop: inicial.valor,
        saldoFinalCop: final.valor,
        // El período sólo viaja si la persona lo cambió: si no, el back lo saca
        // de las mismas líneas.
        desde: desde && desde !== periodoDeLasLineas?.desde ? desde : undefined,
        hasta: hasta && hasta !== periodoDeLasLineas?.hasta ? hasta : undefined,
        aceptarIgualesDeOtraCuenta,
      });
      setDeOtraCuenta(null);
      setResultado(r);
      onCargado(r);
      const detalle = [
        (r.conPropuestaDeLaPasarela ?? 0) > 0
          ? `${r.conPropuestaDeLaPasarela} ${r.conPropuestaDeLaPasarela === 1 ? 'puede ser un pago en línea' : 'pueden ser pagos en línea'}: ${r.conPropuestaDeLaPasarela === 1 ? 'quedó' : 'quedaron'} para que lo decidas.`
          : '',
        r.pendientes > 0
          ? `${r.pendientes} por conciliar${r.seguras > 0 ? `, ${r.seguras} con candidato seguro` : ''}.`
          : '',
      ]
        .filter(Boolean)
        .join(' ');
      toast.success(
        r.nuevas === 0
          ? 'Nada nuevo: todas las líneas ya estaban cargadas.'
          : `${r.nuevas} ${r.nuevas === 1 ? 'movimiento nuevo' : 'movimientos nuevos'} del extracto de ${nombreDeLaCuenta(cuenta)}.`,
        detalle ? { description: detalle } : undefined,
      );
      // 🔴 Los avisos no son un detalle del éxito: se muestran aparte.
      for (const aviso of r.avisos ?? []) toast.info(aviso);
      limpiar();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EXTRACTO_DE_OTRA_CUENTA') {
        setDeOtraCuenta({
          mensaje: mensajeParaLaPersona(error, {
            porDefecto: 'Buena parte de este archivo ya está cargada en otra cuenta.',
          }),
        });
        return;
      }
      // El 409 de la cuenta que recauda por archivo y los 400 traen su motivo
      // en palabras; un 5xx dice que fue nuestro, con la referencia.
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo cargar el extracto.',
          accion: 'cargar el extracto',
        }),
      );
    } finally {
      setCargando(false);
    }
  };

  const cambiarMapeo = (campo: CampoDeExtracto, encabezado: string) => {
    setMapeo((m) => {
      const nuevo: MapeoDeExtracto = { ...m };
      // Un encabezado va a un solo campo.
      for (const k of Object.keys(nuevo) as CampoDeExtracto[]) {
        if (nuevo[k] === encabezado) delete nuevo[k];
      }
      if (encabezado === SIN_MAPEAR) delete nuevo[campo];
      else nuevo[campo] = encabezado;
      return nuevo;
    });
  };

  const sinCuentas = cuentas !== null && cuentas.length === 0;
  const noSePuedeCargar =
    cargando ||
    !cuenta ||
    armadas.filas.length === 0 ||
    laCuentaEntraPorArchivo !== null ||
    demasiadas !== null ||
    !!inicial.error ||
    !!final.error ||
    periodoAlReves;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-5" data-testid="cargar-extracto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-fg">Cargar el extracto</h2>
          <p className="text-sm text-fg-muted">
            El CSV o Excel que exporta el banco, tal cual, de UNA cuenta. Las líneas que ya estaban
            cargadas no se duplican, así que se puede subir el mes entero cada vez; dos movimientos
            iguales el mismo día entran los dos.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={input}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv"
            className="sr-only"
            data-testid="archivo-de-extracto"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void leer(f);
            }}
          />
          <Button variant="secondary" hideArrow onClick={() => input.current?.click()} disabled={leyendo}>
            {leyendo ? <Spinner size="sm" /> : <UploadSimple className="h-4 w-4" aria-hidden="true" />}
            {archivo ? 'Otro archivo' : 'Elegir archivo'}
          </Button>
        </div>
      </div>

      {/* 🔴 (02-10-2026, Nico P3) La cuenta del extracto, obligatoria. */}
      <div className="space-y-2" data-testid="cuenta-del-extracto">
        {errorDeCuentas ? (
          <Banner variant="warning" title="No se pudieron leer las cuentas de la inmobiliaria">
            {mensajeParaLaPersona(errorDeCuentas, {
              porDefecto: 'Sin la cuenta no se puede cargar el extracto.',
            })}{' '}
            <button type="button" className="font-medium underline" onClick={() => void leerCuentas()}>
              Reintentar
            </button>
          </Banner>
        ) : cuentas === null ? (
          <p className="flex items-center gap-2 text-caption text-fg-muted">
            <Spinner size="sm" /> Leyendo las cuentas de la inmobiliaria…
          </p>
        ) : sinCuentas ? (
          <Banner variant="warning" title="Registra primero la cuenta del banco" data-testid="sin-cuentas">
            El extracto se carga en una cuenta de la inmobiliaria, y no hay ninguna registrada. Agrégala en{' '}
            <Link href={RUTA_DE_LOS_MEDIOS_DE_PAGO} className="font-medium underline">
              Configuración → Medios de pago
            </Link>{' '}
            (transferencia, Nequi o Daviplata). Si no tienes permiso para cambiar la configuración, pídeselo a
            un administrador.
          </Banner>
        ) : (
          <>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-fg">¿De qué cuenta es este extracto?</span>
              <select
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg sm:w-[28rem]"
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                data-testid="elegir-cuenta-del-extracto"
                aria-describedby="cuenta-del-extracto-ayuda"
              >
                <option value="">— elige la cuenta —</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {opcionDeLaCuenta(c)}
                  </option>
                ))}
              </select>
            </label>
            {laCuentaEntraPorArchivo ? (
              <Banner variant="warning" title="Esta cuenta recauda por el archivo del banco">
                La plata de {nombreDeLaCuenta(laCuentaEntraPorArchivo)} entra por el archivo del convenio «
                {laCuentaEntraPorArchivo.convenio}». Cargar además su extracto dejaría cada pago DOS veces en
                la cola, y conciliar los dos le emitiría al inquilino dos recibos por un pago que hizo una
                vez. Importa el archivo en Tesorería → Recaudo del banco.
              </Banner>
            ) : (
              <p id="cuenta-del-extracto-ayuda" className="text-caption text-fg-muted">
                La conciliación, el saldo y el cierre van por cuenta. ¿No está la cuenta? Regístrala en{' '}
                <Link href={RUTA_DE_LOS_MEDIOS_DE_PAGO} className="underline">
                  Medios de pago
                </Link>
                .
              </p>
            )}
          </>
        )}
      </div>

      <AnimatePresence initial={false}>
        {resultado && (
          <motion.div key="resultado" {...mov}>
            <Banner
              variant={resultado.saldos?.cuadra === false ? 'warning' : resultado.nuevas > 0 ? 'success' : 'info'}
              title={resultado.cuenta ? `Extracto cargado en ${nombreDeLaCuenta(resultado.cuenta)}` : 'Extracto cargado'}
              data-testid="resultado-de-la-carga"
            >
              {partesDelResultado(resultado).join(' · ')}. Quedan {resultado.pendientes} por conciliar
              {resultado.seguras > 0 ? `, ${resultado.seguras} con candidato seguro` : ''}.
              {resultado.saldos?.cuadra === true && (
                <> El saldo inicial más los movimientos da el saldo final: llegó completo.</>
              )}
              {resultado.saldos?.cuadra === false && resultado.saldos.diferenciaCop !== null && (
                <> No cuadra por {plata(Math.abs(resultado.saldos.diferenciaCop))}: revisa si el archivo trae todas las líneas.</>
              )}
              {(resultado.huecos?.length ?? 0) > 0 && (
                <>
                  {' '}
                  Falta el extracto de {resultado.huecos!.length === 1 ? 'un período' : `${resultado.huecos!.length} períodos`} de esta
                  cuenta.
                </>
              )}
            </Banner>
          </motion.div>
        )}
      </AnimatePresence>

      {archivo && (
        <div className="space-y-4" data-testid="vista-previa">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-fg">
              <span className="font-medium">{archivo.name}</span>{' '}
              <span className="text-fg-muted">
                · {crudas.length} {crudas.length === 1 ? 'fila' : 'filas'}
              </span>
            </p>
            <Button variant="ghost" size="sm" hideArrow onClick={limpiar} aria-label="Quitar el archivo">
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COLUMNAS_DE_EXTRACTO.map((c) => (
              <label key={c.campo} className="space-y-1 text-sm">
                <span className="font-medium text-fg">{c.titulo}</span>
                <select
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
                  value={mapeo[c.campo] ?? SIN_MAPEAR}
                  onChange={(e) => cambiarMapeo(c.campo, e.target.value)}
                  data-testid={`mapeo-${c.campo}`}
                >
                  <option value={SIN_MAPEAR}>— no viene —</option>
                  {encabezados.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <span className="block text-caption text-fg-muted">{c.ayuda}</span>
              </label>
            ))}
          </div>

          {faltan.length > 0 ? (
            <Banner variant="warning" title="Falta indicar una columna">
              Sin {faltan.join(', ')} no hay cómo cargar el extracto. Elige la columna del archivo que la trae.
            </Banner>
          ) : (
            <>
              {demasiadas ? (
                <Banner variant="warning" title="El extracto es muy largo" data-testid="extracto-muy-largo">
                  {demasiadas}
                </Banner>
              ) : null}

              {/* 🔴 (02-10-2026) Saldos y período: lo que prueba que el extracto llegó completo. */}
              <motion.fieldset
                {...mov}
                className="grid gap-3 rounded-md border border-border bg-surface-muted p-4 sm:grid-cols-2 lg:grid-cols-4"
                data-testid="saldos-y-periodo"
              >
                <legend className="px-1 text-sm font-medium text-fg">Saldos y período del extracto</legend>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-fg">Desde</span>
                  <input
                    type="date"
                    className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                    data-testid="periodo-desde"
                    aria-invalid={periodoAlReves || undefined}
                    aria-describedby={periodoAlReves ? 'periodo-desde-error' : undefined}
                  />
                  <ErrorDelCampo
                    id="periodo-desde-error"
                    mensaje={periodoAlReves ? 'La fecha de inicio va antes de la final.' : null}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-fg">Hasta</span>
                  <input
                    type="date"
                    className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                    data-testid="periodo-hasta"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-fg">Saldo inicial</span>
                  <input
                    inputMode="numeric"
                    className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm tabular-nums text-fg"
                    value={saldoInicial}
                    placeholder={conColumnaDeSaldo ? 'De la columna «Saldo»' : '$ 0'}
                    onChange={(e) => setSaldoInicial(e.target.value)}
                    data-testid="saldo-inicial"
                    aria-invalid={inicial.error ? true : undefined}
                    aria-describedby="saldo-inicial-error"
                  />
                  <ErrorDelCampo id="saldo-inicial-error" mensaje={inicial.error ?? null} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-fg">Saldo final</span>
                  <input
                    inputMode="numeric"
                    className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm tabular-nums text-fg"
                    value={saldoFinal}
                    placeholder={conColumnaDeSaldo ? 'De la columna «Saldo»' : '$ 0'}
                    onChange={(e) => setSaldoFinal(e.target.value)}
                    data-testid="saldo-final"
                    aria-invalid={final.error ? true : undefined}
                    aria-describedby="saldo-final-error"
                  />
                  <ErrorDelCampo id="saldo-final-error" mensaje={final.error ?? null} />
                </label>
                <p className="text-caption text-fg-muted sm:col-span-2 lg:col-span-4" data-testid="ayuda-de-los-saldos">
                  {conColumnaDeSaldo
                    ? 'El archivo trae la columna «Saldo»: el sistema lee de ahí el saldo inicial y el final y revisa que no falte ninguna línea. Escríbelos sólo si quieres corregirlos.'
                    : 'Escríbelos como salen en el extracto: con ellos el sistema comprueba que llegó completo. Si los dejas vacíos, el extracto entra igual, pero sin esa prueba.'}
                  {' '}El período sale de las fechas de las líneas; cámbialo si el extracto cubre más días (el mes
                  entero, por ejemplo).
                </p>
                <AnimatePresence initial={false}>
                  {cuadre && (
                    <motion.p
                      key={cuadre.diferenciaCop === 0 ? 'cuadra' : 'no-cuadra'}
                      {...mov}
                      className={
                        cuadre.diferenciaCop === 0
                          ? 'text-caption font-medium text-success sm:col-span-2 lg:col-span-4'
                          : 'flex items-center gap-1.5 text-caption font-medium text-warning sm:col-span-2 lg:col-span-4'
                      }
                      data-testid="cuadre-en-vivo"
                    >
                      {cuadre.diferenciaCop !== 0 && <Warning className="h-4 w-4" aria-hidden="true" />}
                      {fraseDelCuadre(cuadre)}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.fieldset>

              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      {conColumnaDeSaldo && <TableHead className="text-right">Saldo</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {armadas.filas.slice(0, 5).map((f, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono tabular-nums">{f.fecha}</TableCell>
                        <TableCell className="max-w-md truncate">{f.descripcion}</TableCell>
                        <TableCell className="font-mono text-fg-muted">{f.referencia ?? '—'}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{plata(f.valorCop)}</TableCell>
                        {conColumnaDeSaldo && (
                          <TableCell className="text-right font-mono tabular-nums text-fg-muted">
                            {typeof f.saldoCop === 'number' ? plata(f.saldoCop) : '—'}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-caption text-fg-muted">
                  {armadas.filas.length} {armadas.filas.length === 1 ? 'línea lista' : 'líneas listas'}
                  {armadas.descartadas.length > 0 && (
                    <>
                      {' '}
                      · {armadas.descartadas.length} descartadas:{' '}
                      {armadas.descartadas
                        .slice(0, 3)
                        .map((d) => `fila ${d.fila} (${d.motivo.replace(/\.$/, '')})`)
                        .join(', ')}
                      {armadas.descartadas.length > 3 ? '…' : ''}
                    </>
                  )}
                  {!cuenta && !sinCuentas && cuentas !== null && (
                    <span className="block text-warning" data-testid="falta-la-cuenta">
                      Elige arriba la cuenta del extracto para poder cargarlo.
                    </span>
                  )}
                </p>
                {/* 🔴 Con la cuenta marcada como «recauda por archivo», o sin cuenta,
                    el botón NO se aprieta: descubrirlo apretando es peor. */}
                <Button hideArrow onClick={() => void cargar()} disabled={noSePuedeCargar} data-testid="cargar">
                  {cargando ? <Spinner size="sm" /> : <UploadSimple className="h-4 w-4" aria-hidden="true" />}
                  Cargar {armadas.filas.length} {armadas.filas.length === 1 ? 'movimiento' : 'movimientos'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 🔴 El archivo parece de OTRA cuenta: se pregunta antes de duplicar nada. */}
      <Dialog open={deOtraCuenta !== null} onOpenChange={(abierto) => !abierto && setDeOtraCuenta(null)}>
        <DialogContent variant="confirm" icon={<Bank weight="bold" />}>
          <DialogHeader>
            <DialogTitle>¿Este extracto es de {cuenta ? nombreDeLaCuenta(cuenta) : 'esta cuenta'}?</DialogTitle>
            <DialogDescription data-testid="de-otra-cuenta">{deOtraCuenta?.mensaje}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" hideArrow disabled={cargando} onClick={() => setDeOtraCuenta(null)}>
              No, elijo otra cuenta
            </Button>
            <Button
              hideArrow
              isLoading={cargando}
              onClick={() => void cargar(true)}
              data-testid="confirmar-de-esta-cuenta"
            >
              Sí, es de esta cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
