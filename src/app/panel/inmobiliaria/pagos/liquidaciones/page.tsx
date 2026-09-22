'use client';

/**
 * Liquidaciones — el neto por propietario del mes, con datos REALES.
 *
 * Hasta el 2026-09-05 esta pantalla era una vitrina: una constante `EJEMPLO`
 * con un canon de $2.500.000 escrito a mano, la fórmula pintada sobre esa
 * constante con un badge «Ejemplo», y la tabla de egresos con un `EmptyState`
 * fijo — cero `fetch`. El back ya calculaba exactamente esto y nadie lo
 * llamaba: `GET /inmobiliaria/dispersiones/preview` devuelve, propietario por
 * propietario, el canon, la comisión, los conceptos a favor y a cargo, y el
 * neto a girar. Es la MISMA cuenta que `generate`, así que lo que se ve acá es
 * lo que se va a girar en Dispersiones — no una fórmula parecida.
 *
 * 🔴 El canon decía «Canon recibido», y con la base por defecto (CAUSADO) es lo
 * que los contratos cobran en el mes, haya pagado el inquilino o no: se puede
 * girar más de lo recaudado. El rótulo sigue a `vista.base` —«Canon causado» o
 * «Canon recaudado»— y ningún número cambia (`lib/propietarios/base-del-canon`).
 *
 * El desglose de IVA no se muestra: el back lo devuelve dentro de los conceptos
 * y separarlo acá sería una cuenta distinta de la del giro. La columna «IVA
 * com.» se retiró en vez de rellenarse con un cálculo del navegador.
 *
 * 🔴 Deducciones (2026-09-16): la liquidación del propietario es lo que el
 * contrato cobra MENOS sus deducciones (reparaciones a su cargo, descuentos con
 * soporte, saldo en contra del mes anterior). El back manda el bloque
 * `conDeducciones` con la regla única; acá se pinta: una columna con lo que se
 * descuenta y el neto que de verdad se gira, entero o nada. Si las deducciones
 * superan el neto, se gira $0 y se dice cuánto pasa al mes siguiente — no
 * «queda debiendo»: no hay cuenta de cobro. Con un back anterior, sin el
 * bloque, la pantalla es la de siempre.
 *
 * Un solo estado a la vez (auditoría 2026-09-13, L1): con el back caído la
 * pantalla decía TRES cosas juntas —el cartel de error, «este mes todavía no
 * hay nada que liquidar» y un neto de $0 en verde—. Ahora cargando, frenada,
 * falló, vacía y con datos se excluyen.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Wallet, CalendarBlank, DotsThreeVertical, MagnifyingGlass } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { SectionLabel } from '@/components/ui/section-label';
import { PestanasDeLiquidaciones } from '@/components/liquidaciones/PestanasDeLiquidaciones';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button, Badge } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { TablePagination } from '@/components/ui/pagination';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';
import { PageGuard } from '@/components/auth/PageGuard';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { EsqueletoIndicadores, EsqueletoTabla } from '@/components/estado/EsqueletoTabla';
import { AvisoLiquidacionFrenada } from '@/components/inmobiliaria/AvisoLiquidacionFrenada';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import type { VistaPreviaDeDispersiones } from '@/lib/types/inmobiliaria';
import { dispersionesApi } from '@/lib/api/inmobiliaria.service';
import { leerLiquidacionFrenada } from '@/lib/api/dispersiones-errores';
import { mesEnTitulo } from '@/lib/utils/mes';
import { baseDeLaLiquidacion } from '@/lib/propietarios/base-del-canon';

/**
 * Las columnas de la tabla de egresos.
 *
 * 🔴 `colComprobante` salió de acá el 21-09: era una columna entera para un
 * botón «Ver dispersiones», y la tabla ya no cabía a lo ancho («Esta tabla no
 * cabe entera: se corre a los lados»). La acción se fue al kebab de la fila,
 * que es donde Nico pidió que vivan las acciones — y de paso el nombre del
 * propietario recuperó el ancho que se partía en tres renglones.
 */
const COLUMNS = [
  'colPropietario', 'colCanon', 'colComision', 'colAFavor', 'colDescuentos', 'colDeducciones', 'colNeto', 'colCuenta', 'colEstado',
];

/** Cuántos meses hacia atrás ofrece el selector, contando el corriente. */
const MESES_EN_EL_SELECTOR = 12;

function claveDelMes(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

/** El mes en curso, en el formato que espera el back (`2026-02`). */
function mesEnCurso(): string {
  return claveDelMes(new Date());
}

/**
 * Los últimos meses, del corriente hacia atrás — el mismo selector que
 * Cobros y Dispersiones. Topado en el mes corriente: un mes futuro no tiene
 * cobros pagados y sólo mostraría un vacío que se lee como «no hay nada».
 */
function mesesRecientes(): { value: string; label: string }[] {
  const hoy = new Date();
  return Array.from({ length: MESES_EN_EL_SELECTOR }, (_, i) => {
    const value = claveDelMes(new Date(hoy.getFullYear(), hoy.getMonth() - i, 1));
    return { value, label: mesEnTitulo(value) };
  });
}

type Propietario = VistaPreviaDeDispersiones['propietarios'][number];

function TesoreriaContent() {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.tesoreria.${s}`;
  // Antes era `useState(mesEnCurso)` sin setter: el mes anterior —el que de
  // verdad se liquida los primeros días— no se podía ver.
  const [month, setMonth] = useState(mesEnCurso);
  const meses = useMemo(mesesRecientes, []);

  const [vista, setVista] = useState<VistaPreviaDeDispersiones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  // Si se cambia de mes mientras el anterior carga, gana el último pedido.
  const pedido = useRef(0);

  const cargar = useCallback(async () => {
    const este = ++pedido.current;
    setCargando(true);
    setError(null);
    try {
      const datos = await dispersionesApi.preview(month);
      if (este === pedido.current) setVista(datos);
    } catch (e) {
      if (este !== pedido.current) return;
      setError(e);
      setVista(null);
    } finally {
      if (este === pedido.current) setCargando(false);
    }
  }, [month]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /*
   * Un 400 con código es un DATO del inmueble, no una caída: reintentar da el
   * mismo 400. Va con su enlace al inmueble y sin «Reintentar». Cualquier otro
   * fallo lo clasifica `FalloDeCarga`, que ofrece reintentar sólo si puede
   * cambiar (red, servidor).
   */
  const frenada = leerLiquidacionFrenada(error);

  const propietarios: Propietario[] = vista?.propietarios ?? [];
  // Con qué regla liquidó el back: decide el rótulo del canon, nada más.
  const base = baseDeLaLiquidacion(vista);

  /*
   * 🔴 BUSCADOR Y PAGINACIÓN (21-09). Nico: «eso con scroll infinito es
   * horrible». Eran los 50 propietarios del mes —518 en la agencia migrada— en
   * una sola tabla sin cortar y sin manera de encontrar a uno.
   *
   * El resumen de arriba sigue hablando del MES COMPLETO, no de lo filtrado: es
   * la cuenta que tiene que cuadrar con lo que se va a girar.
   */
  const [busqueda, setBusqueda] = useState('');
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return propietarios;
    return propietarios.filter(
      (x) =>
        x.propietarioName.toLowerCase().includes(q) ||
        (x.propietarioBankAccount ?? '').toLowerCase().includes(q),
    );
  }, [propietarios, busqueda]);
  const paginado = useTablePagination(visibles, { resetKey: `${month}|${busqueda}` });
  const suma = (campo: keyof Propietario) =>
    propietarios.reduce((s, p) => s + (p[campo] as number), 0);

  // La fórmula, sobre la plata de VERDAD del mes. Las cuatro filas cierran
  // contra el neto por construcción: el back lo calcula igual.
  const resumen = [
    {
      labelKey: base === 'RECAUDADO' ? 'fCanonRecaudado' : 'fCanonCausado',
      value: suma('totalCollected'),
      sign: '',
      tone: 'text-fg',
    },
    { labelKey: 'fComision', value: suma('totalCommission'), sign: '−', tone: 'text-danger' },
    { labelKey: 'fAFavor', value: suma('totalConceptosAFavor'), sign: '+', tone: 'text-fg' },
    { labelKey: 'fACargo', value: suma('totalConceptosACargo'), sign: '−', tone: 'text-danger' },
  ];
  /*
   * 🔴 QA 22-09: con deducciones, `netToPropietario` ya viene RESTADO y la
   * pantalla las restaba otra vez debajo: «Neto $329.220.440 · Deducciones
   * −$2.000.000 · A girar $329.932.440» no sumaba. El neto de esta fila es el
   * del mes ANTES de deducciones (`conDeducciones.netoDelMesCop`); sin bloque,
   * el de siempre.
   */
  const neto = propietarios.reduce(
    (s, p) => s + (p.conDeducciones ? p.conDeducciones.netoDelMesCop : p.netToPropietario),
    0,
  );
  /*
   * Con deducciones el back manda el bloque de cada propietario. Lo que se
   * SUMA acá son totales de varios propietarios; lo que se gira a cada uno
   * (`aGirarCop`) y lo que le queda en contra ya vienen calculados.
   */
  const conDeducciones = propietarios.some((p) => p.conDeducciones);
  const sumaDelBloque = (campo: 'deduccionesCop' | 'aGirarCop' | 'saldoEnContraCop') =>
    propietarios.reduce((s, p) => s + (p.conDeducciones?.[campo] ?? 0), 0);
  const deduccionesDelMes = sumaDelBloque('deduccionesCop');
  const aGirarDelMes = sumaDelBloque('aGirarCop');
  const enContraDelMes = sumaDelBloque('saldoEnContraCop');
  const quedanEnCero = propietarios.filter((p) => (p.conDeducciones?.saldoEnContraCop ?? 0) > 0).length;
  /*
   * El back reparte en negativo cuando lo que paga el propietario (predial,
   * reparaciones) supera su canon del mes: el propietario queda DEBIENDO. Antes el
   * neto se pintaba siempre en verde, y un «−$300.000» verde se lee como plata
   * a favor. Con deducciones esto ya no es «deuda»: pasa a la siguiente
   * liquidación (`quedanEnCero`).
   */
  const quedanDebiendo = conDeducciones ? 0 : propietarios.filter((p) => p.netToPropietario < 0).length;

  const vacio = !cargando && !error && propietarios.length === 0;
  // El fallo y el vacío no traen tarjeta propia (van dentro del hueco de
  // contenido); acá ese hueco es la página, así que se la pone el contenedor.
  const huecoConTarjeta = !cargando && (Boolean(error) || vacio);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1.5">
          <SectionLabel>{t(k('label'))}</SectionLabel>
          <h1 className="text-h2 text-fg">{t(k('title'))}</h1>
          <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">{t(k('subtitle'))}</p>
        </div>
        {/* Sin «Procesar en Dispersiones» acá ni en el vacío: «la gente ya sabe
            que dispersiones es para dispersar» (Nico, 2026-09-08). La bajada
            sigue diciendo que el giro vive en Dispersiones.

            Y sin «Registrar factura». Nico (2026-09-08): «¿por qué existe
            registrar factura si tenemos una sección dedicada a facturación?».
            Registrar la factura de un proveedor —incluida la lectura desde
            foto— vive ahora en Facturación → Compras, que es esa sección.
            Acá se lee el neto de cada propietario, no se crean documentos. */}
      </header>

      {frenada ? (
        <AvisoLiquidacionFrenada frenada={frenada} despues="calcular el neto" />
      ) : (
        <div
          className={cn(huecoConTarjeta && 'rounded-lg border border-border bg-card')}
          data-testid="liquidaciones-hueco"
        >
          <EstadoDeDatos
            /* `&& !vista`: un cambio de mes refresca por debajo sin borrar lo
               que se está mirando. Sin esto, al cambiar de mes desaparecían las
               pestañas y el propio selector de mes — el control que acabás de
               tocar se va de la pantalla. */
            cargando={cargando && !vista}
            error={error}
            vacio={vacio}
            queEs="las liquidaciones del mes"
            onReintentar={cargar}
            esqueleto={
              /* 🔴 El esqueleto tiene que dibujar la disposición que va a
                 llegar. Éste seguía en el grid de 1/3 + 2/3 después de que la
                 pantalla pasó a una columna (Nico, 21-09: «esto cambió la
                 disposición y el skeleton sigue siendo el viejo»): la página
                 saltaba al cargar, que es justo lo que un esqueleto viene a
                 evitar. */
              <div className="space-y-6" data-testid="liquidaciones-cargando">
                <EsqueletoIndicadores cantidad={4} />
                {/* La fila de pestañas y mes también se dibuja: si el esqueleto
                    no la tiene, la tarjeta crece de golpe cuando llegan los
                    datos y la página salta. */}
                <div className="overflow-hidden rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
                    <div className="h-9 w-64 animate-pulse rounded-md bg-surface-muted" />
                    <div className="h-9 w-48 animate-pulse rounded-md bg-surface-muted" />
                  </div>
                  <EsqueletoTabla columnas={COLUMNS.length} className="border-0" />
                </div>
              </div>
            }
            cuandoVacio={
              <SinDatos
                queSon="liquidaciones"
                icono={Wallet}
                titulo={t(k('emptyTitle'))}
                descripcion={t(k(base === 'RECAUDADO' ? 'emptyDescRecaudado' : 'emptyDesc'))}
              />
            }
          >
            {/* 🔴 UNA COLUMNA (21-09). Era un grid de 1/3 + 2/3: el resumen se
                quedaba con un tercio del ancho y la tabla de DIEZ columnas con
                los dos tercios, así que no cabía y corría a los lados. Nico:
                «esta página también tiene unas cosas por un lado otras por
                otro… eso con scroll infinito es horrible». El resumen del mes
                va arriba, ancho, y la tabla se queda con la pantalla entera. */}
            <div className="space-y-6">
              {/* El mes en plata — sumas reales, no una fórmula de ejemplo */}
              <section className="rounded-lg border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <SectionLabel>{t(k('resumenLabel'))}</SectionLabel>
                  <Badge variant="secondary">{mesEnTitulo(month)}</Badge>
                </div>
                {/* En una fila cuando hay ancho: son los pasos de UNA cuenta
                    (canon − comisión + a favor − a cargo = neto), y en columna
                    ocupaban media pantalla de alto. */}
                <div className="space-y-2.5 lg:grid lg:grid-cols-4 lg:gap-x-8 lg:gap-y-2 lg:space-y-0">
                  {resumen.map((row, i) => (
                    <div key={row.labelKey}>
                      <div className="flex items-center justify-between text-sm">
                        <span
                          className="text-muted-foreground"
                          data-testid={i === 0 ? 'tesoreria-rotulo-canon' : undefined}
                        >
                          {t(k(row.labelKey))}
                        </span>
                        <span className={cn('font-mono tabular-nums', row.tone)}>
                          {row.sign}{formatCurrency(row.value)}
                        </span>
                      </div>
                      {/* Qué es ese canon, en una línea: «causado» no se
                          entiende solo, y es la diferencia con lo recaudado. */}
                      {i === 0 && (
                        <p className="mt-0.5 text-xs text-fg-muted" data-testid="tesoreria-que-es-el-canon">
                          {t(k(base === 'RECAUDADO' ? 'fCanonQueEsRecaudado' : 'fCanonQueEsCausado'))}
                        </p>
                      )}
                    </div>
                  ))}
                  <div className="border-t border-border pt-2.5 flex items-center justify-between lg:col-span-4">
                    <span className="text-sm font-semibold text-fg flex items-center gap-1.5">
                      <Wallet className={cn('w-4 h-4', neto < 0 ? 'text-danger' : 'text-success')} />
                      {t(k('fNeto'))}
                    </span>
                    <span
                      className={cn(
                        'font-mono tabular-nums font-semibold',
                        neto < 0 ? 'text-danger' : 'text-success',
                      )}
                      data-testid="tesoreria-neto-total"
                    >
                      {formatCurrency(neto)}
                    </span>
                  </div>
                  {deduccionesDelMes > 0 && (
                    <div className="flex items-center justify-between text-sm" data-testid="tesoreria-deducciones-total">
                      <span className="text-muted-foreground">{t(k('fDeducciones'))}</span>
                      <span className="font-mono tabular-nums text-danger">−{formatCurrency(deduccionesDelMes)}</span>
                    </div>
                  )}
                  {conDeducciones && (aGirarDelMes !== neto || enContraDelMes > 0) && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-fg">{t(k('fAGirar'))}</span>
                        <span className="font-mono font-semibold tabular-nums text-success" data-testid="tesoreria-a-girar-total">
                          {formatCurrency(aGirarDelMes)}
                        </span>
                      </div>
                      {enContraDelMes > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t(k('fSaldoEnContra'))}</span>
                          <span className="font-mono tabular-nums text-warning">{formatCurrency(enContraDelMes)}</span>
                        </div>
                      )}
                    </>
                  )}
                  {quedanEnCero > 0 && (
                    <p className="text-xs text-warning" data-testid="tesoreria-quedan-en-cero">
                      {quedanEnCero === 1
                        ? t('inmobiliaria.deducciones.liquidacion.quedanEnContraUno')
                        : t('inmobiliaria.deducciones.liquidacion.quedanEnContraVarios', { cuantos: quedanEnCero })}
                    </p>
                  )}
                  {quedanDebiendo > 0 && (
                    <p className="text-xs text-danger" data-testid="tesoreria-quedan-debiendo">
                      {/* Con base CAUSADO no se compara contra lo recaudado:
                          contra el canon del mes, pagado o no. */}
                      {quedanDebiendo === 1
                        ? `1 propietario queda debiendo este mes: lo que paga supera ${base === 'RECAUDADO' ? 'lo recaudado' : 'su canon causado'}.`
                        : `${quedanDebiendo} propietarios quedan debiendo este mes: lo que pagan supera ${base === 'RECAUDADO' ? 'lo recaudado' : 'su canon causado'}.`}
                    </p>
                  )}
                </div>
              </section>

              {/* 🔴 UNA SOLA COSA (Nico, 21-09): «de verdad eso del mes, switch
                  tab, y la tabla deberían ser una sola cosa, una sola tabla, y
                  por fuera esto [el resumen del mes]». Eran tres bloques
                  sueltos —las pestañas flotando bajo el título, el mes en la
                  esquina del encabezado y la tabla en su tarjeta—, y ninguno
                  decía que gobernaba a los otros dos.
                  Ahora la primera fila de la tarjeta de la tabla son las
                  pestañas y el mes: lo que cambia la lista vive pegado a la
                  lista. El resumen del mes se queda afuera, que es lo que él
                  pidió: es un resumen, no un filtro. */}
              <section className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                  <PestanasDeLiquidaciones />
                  {/* `w-56` y no `min-w`: el trigger del DS es `w-full`, así que
                      con sólo un mínimo se estiraba a todo el renglón y el mes
                      quedaba de banda, peor que antes. */}
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="w-56 gap-2" aria-label="Mes de la liquidación">
                      <CalendarBlank className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* El buscador DENTRO de la tarjeta de la tabla, con el alcance
                    a su lado: suelto arriba no diría qué está filtrando. */}
                <div className="flex flex-col gap-2 border-b border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:max-w-sm">
                    <MagnifyingGlass
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                      aria-hidden="true"
                    />
                    <Input
                      className="pl-9"
                      placeholder="Propietario o cuenta"
                      aria-label="Buscar un propietario en las liquidaciones del mes"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      data-testid="buscar-liquidacion"
                    />
                  </div>
                  <p className="text-xs text-fg-muted" data-testid="alcance-de-liquidaciones">
                    {visibles.length} de {propietarios.length}{' '}
                    {propietarios.length === 1 ? 'propietario' : 'propietarios'} de{' '}
                    {mesEnTitulo(month)}. Las cifras de arriba son las del mes completo.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {COLUMNS.map((c) => (
                          <TableHead
                            key={c}
                            className={cn(
                              'whitespace-nowrap',
                              // El nombre no se parte en tres renglones.
                              c === 'colPropietario' && 'min-w-[13rem]',
                            )}
                          >
                            {t(k(c))}
                          </TableHead>
                        ))}
                        {/* La del kebab. Sin rótulo: el icono ya lo dice. */}
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginado.pageItems.map((p) => (
                        <TableRow key={p.propietarioId} data-testid="tesoreria-fila">
                          <TableCell className="font-medium text-fg">{p.propietarioName}</TableCell>
                          <TableCell className="font-mono tabular-nums">{formatCurrency(p.totalCollected)}</TableCell>
                          <TableCell className="font-mono tabular-nums text-danger">−{formatCurrency(p.totalCommission)}</TableCell>
                          <TableCell className="font-mono tabular-nums">{p.totalConceptosAFavor > 0 ? `+${formatCurrency(p.totalConceptosAFavor)}` : '—'}</TableCell>
                          <TableCell className="font-mono tabular-nums text-danger">{p.totalConceptosACargo > 0 ? `−${formatCurrency(p.totalConceptosACargo)}` : '—'}</TableCell>
                          <TableCell className="font-mono tabular-nums text-danger" data-testid="tesoreria-deducciones-fila">
                            {p.conDeducciones && p.conDeducciones.deduccionesCop > 0
                              ? `−${formatCurrency(p.conDeducciones.deduccionesCop)}`
                              : '—'}
                          </TableCell>
                          {p.conDeducciones ? (
                            /* Lo que se gira de verdad: entero o $0. Si queda en
                               contra no es «queda debiendo»: pasa al mes siguiente. */
                            <TableCell
                              className={cn(
                                'font-mono tabular-nums font-semibold',
                                p.conDeducciones.aGirarCop > 0 ? 'text-success' : 'text-fg-muted',
                              )}
                              data-testid="tesoreria-neto-fila"
                            >
                              {formatCurrency(p.conDeducciones.aGirarCop)}
                              {p.conDeducciones.saldoEnContraCop > 0 && (
                                <span className="block text-[11px] font-normal font-sans text-warning" data-testid="tesoreria-en-contra-fila">
                                  {t('inmobiliaria.deducciones.liquidacion.enContraFila', {
                                    valor: formatCurrency(p.conDeducciones.saldoEnContraCop),
                                  })}
                                </span>
                              )}
                            </TableCell>
                          ) : (
                            <TableCell
                              className={cn(
                                'font-mono tabular-nums font-semibold',
                                p.netToPropietario < 0 ? 'text-danger' : 'text-success',
                              )}
                              data-testid="tesoreria-neto-fila"
                            >
                              {formatCurrency(p.netToPropietario)}
                              {p.netToPropietario < 0 && (
                                <span className="block text-[11px] font-normal font-sans">Queda debiendo</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-xs text-fg-muted whitespace-nowrap">
                            {p.propietarioBankAccount
                              ? `${p.propietarioBankName ?? ''} ${p.propietarioBankAccount}`.trim()
                              : t(k('sinCuenta'))}
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.yaExiste ? 'secondary' : 'outline'}>
                              {t(k(p.yaExiste ? 'estadoGenerada' : 'estadoPendiente'))}
                            </Badge>
                          </TableCell>
                          {/* 🔴 Las acciones, en el kebab de la derecha (Nico,
                              21-09). Era un botón de texto ocupando una columna
                              entera en una tabla que ya no cabía. */}
                          <TableCell className="w-10">
                            <DropdownList>
                              <DropdownListTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  hideArrow
                                  className="h-8 w-8"
                                  aria-label={`Acciones de la liquidación de ${p.propietarioName}`}
                                  data-testid="liquidacion-kebab"
                                >
                                  <DotsThreeVertical
                                    className="h-4 w-4"
                                    weight="bold"
                                    aria-hidden="true"
                                  />
                                </Button>
                              </DropdownListTrigger>
                              <DropdownListContent align="end" className="w-52">
                                <DropdownListItem asChild>
                                  <Link
                                    href={`/panel/inmobiliaria/pagos/dispersiones?mes=${month}`}
                                    data-testid="liquidacion-ver-dispersiones"
                                  >
                                    {t(k('verDispersiones'))}
                                  </Link>
                                </DropdownListItem>
                              </DropdownListContent>
                            </DropdownList>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {paginado.shouldPaginate && (
                  <div className="border-t border-border px-5 py-3">
                    <TablePagination
                      total={paginado.total}
                      page={paginado.page}
                      pageSize={paginado.pageSize}
                      pageSizeOptions={PAGE_SIZE_OPTIONS}
                      onPageChange={paginado.setPage}
                      onPageSizeChange={paginado.setPageSize}
                    />
                  </div>
                )}
              </section>
            </div>
          </EstadoDeDatos>
        </div>
      )}
    </div>
  );
}

export default function TesoreriaPage() {
  // El sidebar ofrece esta fila a ADMIN y CONTADOR (`CONTADOR_ROLES` en
  // `arquitectura-del-panel.ts`). Con `adminOnly` el contador la veía y rebotaba
  // al inicio sin explicación: una fila que se ve y no se puede abrir es una
  // promesa rota. El gate ahora dice lo mismo que la arquitectura.
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <TesoreriaContent />
    </PageGuard>
  );
}
