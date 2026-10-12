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

import { ANCHO_DEL_MENU_DE_ACCIONES } from '@/components/ui/ancho-del-menu-de-acciones';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Wallet, CalendarBlank, DotsThreeVertical, MagnifyingGlass } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { SectionLabel } from '@/components/ui/section-label';
import { PestanasDeLiquidaciones } from '@/components/liquidaciones/PestanasDeLiquidaciones';
import { CajonDeLaLiquidacion } from '@/components/liquidaciones/CajonDeLaLiquidacion';
import {
  Table,
  TableHeader,
  TableBodyAnimado,
  TableRow,
  TableRowAnimada,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { AnimatedNumber, Presence } from '@leasefy/cadence';
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
import { AvisoSinPorcentaje } from '@/components/inmobiliaria/AvisoSinPorcentaje';
import { PorGirarDeLaInmobiliaria } from '@/components/liquidaciones/PorGirarDeLaInmobiliaria';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import type { VistaPreviaDeDispersiones } from '@/lib/types/inmobiliaria';
import { dispersionesApi } from '@/lib/api/inmobiliaria.service';
import { leerLiquidacionFrenada } from '@/lib/api/dispersiones-errores';
import { mesEnTitulo } from '@/lib/utils/mes';
import { baseDeLaLiquidacion } from '@/lib/propietarios/base-del-canon';
import { maskAccountNumber } from '@/lib/types/payment-accounts';
import { ApiError } from '@/lib/api/client';
import {
  comoLiquidacionDeLaPantalla,
  NOMBRE_DEL_ESTADO,
  type LiquidacionParaLaPantalla,
  type PropietarioDeLaLiquidacion,
} from '@/lib/liquidaciones/liquidacion-del-mes';

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
  'colPropietario', 'colCanon', 'colComision', 'colAjustes', 'colNeto', 'colCuenta', 'colEstado',
];

/**
 * 🔴 PG-15 (QA de Pagos, 03-10-2026): la tabla seguía sin caber a 1440 px
 * («Esta tabla no cabe entera: se corre a los lados», y el Estado cortado).
 * Tres columnas que casi siempre dicen «—» —A favor, Descuentos, Deducciones—
 * se pliegan en UNA, «Ajustes», con un renglón por cada valor que no es cero
 * y su nombre; la cuenta destino va en dos renglones (banco y número
 * enmascarado) y los montos no se parten. A 390 px la tabla se corre DENTRO
 * de su tarjeta, nunca la página.
 */
function AjustesDeLaFila({
  aFavor,
  aCargo,
  deducciones,
  etiquetas,
}: {
  aFavor: number;
  aCargo: number;
  deducciones: number;
  etiquetas: { aFavor: string; aCargo: string; deducciones: string };
}) {
  const renglones = [
    aFavor > 0 ? { clave: 'a-favor', etiqueta: etiquetas.aFavor, valor: `+${formatCurrency(aFavor)}`, tono: 'text-fg' } : null,
    aCargo > 0 ? { clave: 'a-cargo', etiqueta: etiquetas.aCargo, valor: `−${formatCurrency(aCargo)}`, tono: 'text-danger' } : null,
  ].filter(Boolean) as { clave: string; etiqueta: string; valor: string; tono: string }[];
  // Cada ajuste en dos renglones (su nombre y la cifra): de lado a lado la
  // columna se llevaba 180 px y la tabla seguía sin caber.
  return (
    <div className="space-y-1 text-caption">
      {renglones.map((r) => (
        <p key={r.clave} className="whitespace-nowrap">
          <span className="block font-sans text-fg-subtle">{r.etiqueta}</span>
          <span className={cn('block font-mono tabular-nums', r.tono)}>{r.valor}</span>
        </p>
      ))}
      {/* Las deducciones conservan su marca: la prueba del neto que se gira la lee. */}
      <p
        className={cn('whitespace-nowrap', deducciones > 0 ? '' : renglones.length > 0 ? 'hidden' : '')}
        data-testid="tesoreria-deducciones-fila"
      >
        {deducciones > 0 ? (
          <>
            <span className="block font-sans text-fg-subtle">{etiquetas.deducciones}</span>
            <span className="block font-mono tabular-nums text-danger">−{formatCurrency(deducciones)}</span>
          </>
        ) : (
          <span className="font-mono text-fg-muted">—</span>
        )}
      </p>
    </div>
  );
}

/**
 * La cuenta destino como en la ficha (PG-06): el banco y `****8912`, nunca el
 * número entero en una tabla que se proyecta y se fotografía.
 */
function CuentaDestino({ banco, cuenta, sinCuenta }: { banco: string | null; cuenta: string | null; sinCuenta: string }) {
  if (!cuenta) return <span className="text-fg-muted">{sinCuenta}</span>;
  return (
    <>
      {banco ? <span className="block whitespace-nowrap">{banco}</span> : null}
      <span className="block whitespace-nowrap font-mono tabular-nums" data-testid="tesoreria-cuenta-fila">
        {maskAccountNumber(cuenta.replace(/\s+/g, ''))}
      </span>
    </>
  );
}

/** «Úsuga» y «usuga» son la misma persona para el buscador (PG-R19). */
function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

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
 * 🔴 PG-R18 (QA de Pagos, decisión de Nico 03-10-2026): cuántos meses por
 * venir ofrece el selector. Antes estaba topado en el mes corriente; con la
 * base CAUSADO (el default) la liquidación de un mes futuro existe —lo que los
 * contratos van a cobrar—, y «Por pagar a propietarios» ya llega al mes en
 * curso + 3. Lo mismo aquí.
 */
const MESES_HACIA_ADELANTE = 3;

/**
 * Los meses del selector, del más nuevo al más viejo: hasta el mes en curso
 * + 3 y doce hacia atrás (contando el corriente).
 */
function mesesRecientes(): { value: string; label: string }[] {
  const hoy = new Date();
  return Array.from({ length: MESES_EN_EL_SELECTOR + MESES_HACIA_ADELANTE }, (_, i) => {
    const value = claveDelMes(new Date(hoy.getFullYear(), hoy.getMonth() + MESES_HACIA_ADELANTE - i, 1));
    return { value, label: mesEnTitulo(value) };
  });
}

type Propietario = PropietarioDeLaLiquidacion;

/**
 * 🔴 PG-02 (QA de Pagos, 03-10-2026): el MES COMPLETO por propietario
 * (`GET /dispersiones/liquidacion-del-mes`), no la vista previa de lo que falta
 * generar. Con un back anterior la ruta no existe —contesta 404, o 400 porque
 * cae en `/:id`—: entonces la vista previa de siempre. Una liquidación frenada
 * (400 con código conocido) es un dato del inmueble y se dice tal cual.
 */
async function leerLiquidacion(month: string): Promise<LiquidacionParaLaPantalla> {
  try {
    return comoLiquidacionDeLaPantalla(await dispersionesApi.liquidacionDelMes(month));
  } catch (e) {
    const sinLaRuta =
      e instanceof ApiError &&
      (e.status === 404 || (e.status === 400 && e.code !== 'MES_INVALIDO' && !leerLiquidacionFrenada(e)));
    if (!sinLaRuta) throw e;
    return (await dispersionesApi.preview(month)) as VistaPreviaDeDispersiones as LiquidacionParaLaPantalla;
  }
}

function TesoreriaContent() {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.tesoreria.${s}`;
  // Antes era `useState(mesEnCurso)` sin setter: el mes anterior —el que de
  // verdad se liquida los primeros días— no se podía ver.
  const [month, setMonth] = useState(mesEnCurso);
  const meses = useMemo(mesesRecientes, []);

  const [vista, setVista] = useState<LiquidacionParaLaPantalla | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  // Si se cambia de mes mientras el anterior carga, gana el último pedido.
  const pedido = useRef(0);

  const cargar = useCallback(async () => {
    const este = ++pedido.current;
    setCargando(true);
    setError(null);
    try {
      const datos = await leerLiquidacion(month);
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
  /** La fila abre su cajón (el molde, regla 5); el kebab sigue actuando. */
  const [abierta, setAbierta] = useState<Propietario | null>(null);
  const visibles = useMemo(() => {
    // 🔴 PG-R19 (QA de Pagos, 03-10-2026): sin tildes ni mayúsculas, como el
    // resto del panel: «usuga» encuentra a «Ana Lucía Peña Úsuga».
    const q = sinTildes(busqueda);
    if (!q) return propietarios;
    return propietarios.filter(
      (x) =>
        sinTildes(x.propietarioName).includes(q) ||
        (x.propietarioBankAccount ?? '').toLowerCase().includes(q),
    );
  }, [propietarios, busqueda]);
  const paginado = useTablePagination(visibles, { resetKey: `${month}|${busqueda}` });
  const suma = (campo: keyof Propietario) =>
    propietarios.reduce((s, p) => s + ((p[campo] as number | undefined) ?? 0), 0);
  /*
   * 🔴 22-09 (Nico: «no estás teniendo en cuenta el IVA en la comisión»): el
   * IVA de la comisión y lo que el propietario le retiene a la comisión tienen
   * su propia línea entre la comisión y el neto. El back dejó de esconderlos en
   * los conceptos, así que sin estas líneas la cuenta no cerraría a la vista.
   */
  const ivaDelMes = suma('totalIvaComision');
  const retenidoDelMes = suma('totalRetencionesComision');

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
    ...(ivaDelMes > 0
      ? [{ labelKey: 'fIva', value: ivaDelMes, sign: '−', tone: 'text-danger' }]
      : []),
    ...(retenidoDelMes > 0
      ? [{ labelKey: 'fRetencionesComision', value: retenidoDelMes, sign: '+', tone: 'text-fg' }]
      : []),
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

      {/* 🔴 «Por girar» de la inmobiliaria: UNA sola cifra, hasta el mes en
          curso, la misma del Tablero y de «Cartera → Por pagar» (Nico,
          04-10-2026). La tabla de abajo es el neto de UN mes. */}
      <PorGirarDeLaInmobiliaria />

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
              {/* 🔴 Lo que NO se liquida porque al inmueble le falta el
                  porcentaje de cada propietario (copropiedad migrada sin %). */}
              <AvisoSinPorcentaje inmuebles={vista?.sinPorcentaje} />
              {/* El mes en plata — sumas reales, no una fórmula de ejemplo */}
              <section className="rounded-lg border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <SectionLabel>{t(k('resumenLabel'))}</SectionLabel>
                  <Badge variant="secondary">{mesEnTitulo(month)}</Badge>
                </div>
                {/* En una fila cuando hay ancho: son los pasos de UNA cuenta
                    (canon − comisión + a favor − a cargo = neto), y en columna
                    ocupaban media pantalla de alto. */}
                <div
                  className={cn(
                    'space-y-2.5 lg:grid lg:gap-x-8 lg:gap-y-2 lg:space-y-0',
                    // Con el IVA de la comisión (y lo retenido) la cuenta tiene
                    // más pasos: siguen en UNA fila.
                    resumen.length <= 4 ? 'lg:grid-cols-4' : resumen.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-6',
                  )}
                >
                  {resumen.map((row, i) => (
                    <div key={row.labelKey}>
                      {/* CE-07 (QA-PAGOS-95): a 1440 con seis pasos el «−» se iba
                          a una línea y la cifra a otra («Comisión- admin $ …»). El
                          rótulo se parte; el signo y la cifra, nunca. */}
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span
                          className="min-w-0 text-muted-foreground"
                          data-testid={i === 0 ? 'tesoreria-rotulo-canon' : undefined}
                        >
                          {t(k(row.labelKey))}
                        </span>
                        {/* Al cambiar de mes, las cifras cuentan desde las del
                            mes anterior (`AnimatedNumber`). */}
                        <span className={cn('shrink-0 whitespace-nowrap font-mono tabular-nums', row.tone)} data-testid="tesoreria-cifra-del-paso">
                          {row.sign}
                          <AnimatedNumber value={row.value} format={formatCurrency} />
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
                  <div className="border-t border-border pt-2.5 flex items-center justify-between lg:col-span-full">
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
                      <AnimatedNumber value={neto} format={formatCurrency} />
                    </span>
                  </div>
                  {deduccionesDelMes > 0 && (
                    <div className="flex items-center justify-between gap-2 text-sm" data-testid="tesoreria-deducciones-total">
                      <span className="text-muted-foreground">{t(k('fDeducciones'))}</span>
                      <span className="shrink-0 whitespace-nowrap font-mono tabular-nums text-danger">−{formatCurrency(deduccionesDelMes)}</span>
                    </div>
                  )}
                  {conDeducciones && (aGirarDelMes !== neto || enContraDelMes > 0) && (
                    <>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-semibold text-fg">{t(k('fAGirar'))}</span>
                        <span className="shrink-0 whitespace-nowrap font-mono font-semibold tabular-nums text-success" data-testid="tesoreria-a-girar-total">
                          <AnimatedNumber value={aGirarDelMes} format={formatCurrency} />
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
                  {/* Los avisos del mes entran y salen al cambiar de mes. */}
                  <Presence as="p" show={quedanEnCero > 0} initial={false} className="text-xs text-warning" data-testid="tesoreria-quedan-en-cero">
                      {quedanEnCero === 1
                        ? t('inmobiliaria.deducciones.liquidacion.quedanEnContraUno')
                        : t('inmobiliaria.deducciones.liquidacion.quedanEnContraVarios', { cuantos: quedanEnCero })}
                  </Presence>
                  <Presence as="p" show={quedanDebiendo > 0} initial={false} className="text-xs text-danger" data-testid="tesoreria-quedan-debiendo">
                      {/* Con base CAUSADO no se compara contra lo recaudado:
                          contra el canon del mes, pagado o no. */}
                      {quedanDebiendo === 1
                        ? `1 propietario queda debiendo este mes: lo que paga supera ${base === 'RECAUDADO' ? 'lo recaudado' : 'su canon causado'}.`
                        : `${quedanDebiendo} propietarios quedan debiendo este mes: lo que pagan supera ${base === 'RECAUDADO' ? 'lo recaudado' : 'su canon causado'}.`}
                  </Presence>
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
                    {/* Cuenta entero y sin separador de miles: el mismo `{n}` de antes. */}
                    <AnimatedNumber value={visibles.length} format={(n) => String(Math.round(n))} />{' '}
                    de {propietarios.length}{' '}
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
                              // El nombre no se parte en tres renglones (PG-15: dos sí,
                              // para que la tabla quepa a 1440 px).
                              c === 'colPropietario' && 'min-w-[11rem]',
                            )}
                          >
                            {t(k(c))}
                          </TableHead>
                        ))}
                        {/* La del kebab. Sin rótulo: el icono ya lo dice. */}
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    {/* Movimiento (ola 2, 03-10-2026): las filas entran
                        escalonadas (techo de 320 ms); al buscar, las que ya no
                        coinciden salen en su lugar (`key` = el propietario).
                        Otro mes u otra página monta un cuerpo nuevo. */}
                    <TableBodyAnimado key={`${month}|${paginado.page}|${paginado.pageSize}`}>
                      {paginado.pageItems.map((p) => (
                        <TableRowAnimada
                          key={p.propietarioId}
                          data-testid="tesoreria-fila"
                          onClick={() => setAbierta(p)}
                          className="cursor-pointer"
                          tabIndex={0}
                          role="button"
                          aria-label={`Ver la liquidación de ${p.propietarioName}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setAbierta(p);
                            }
                          }}
                        >
                          <TableCell className="font-medium text-fg">{p.propietarioName}</TableCell>
                          <TableCell className="whitespace-nowrap font-mono tabular-nums">{formatCurrency(p.totalCollected)}</TableCell>
                          <TableCell className="whitespace-nowrap font-mono tabular-nums text-danger">
                            −{formatCurrency(p.totalCommission)}
                            {/* El IVA de la comisión debajo, no en una columna
                                más: la tabla ya no cabía a lo ancho (21-09). */}
                            {(p.totalIvaComision ?? 0) > 0 && (
                              <span className="block text-caption" data-testid="tesoreria-iva-fila">
                                {t(k('colIva'))} −{formatCurrency(p.totalIvaComision ?? 0)}
                              </span>
                            )}
                            {(p.totalRetencionesComision ?? 0) > 0 && (
                              /* PG-15: el rótulo largo puede partirse; la cifra no. */
                              <span className="block text-caption text-fg-muted">
                                <span className="block max-w-[9rem] whitespace-normal font-sans">
                                  {t(k('fRetencionesComision'))}
                                </span>
                                +{formatCurrency(p.totalRetencionesComision ?? 0)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell data-testid="tesoreria-ajustes-fila">
                            <AjustesDeLaFila
                              aFavor={p.totalConceptosAFavor}
                              aCargo={p.totalConceptosACargo}
                              deducciones={p.conDeducciones?.deduccionesCop ?? 0}
                              etiquetas={{
                                aFavor: t(k('colAFavor')),
                                aCargo: t(k('colDescuentos')),
                                deducciones: t(k('colDeducciones')),
                              }}
                            />
                          </TableCell>
                          {p.conDeducciones ? (
                            /* Lo que se gira de verdad: entero o $0. Si queda en
                               contra no es «queda debiendo»: pasa al mes siguiente. */
                            <TableCell
                              className={cn(
                                'whitespace-nowrap font-mono tabular-nums font-semibold',
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
                                'whitespace-nowrap font-mono tabular-nums font-semibold',
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
                          <TableCell className="max-w-[9rem] text-xs text-fg-muted">
                            {/* PG-06: enmascarada, como en la ficha del propietario. */}
                            <CuentaDestino
                              banco={p.propietarioBankName ?? null}
                              cuenta={p.propietarioBankAccount ?? null}
                              sinCuenta={t(k('sinCuenta'))}
                            />
                          </TableCell>
                          <TableCell>
                            {p.liquidacion ? (
                              /* PG-02: el estado verdadero de la fila. «Dispersión
                                 generada» sólo con todo generado; en parte, cuánto
                                 se generó y cuánto falta. */
                              <>
                                <Badge
                                  variant={p.liquidacion.estado === 'POR_GENERAR' ? 'outline' : 'secondary'}
                                  className="whitespace-nowrap"
                                  data-testid="tesoreria-estado-fila"
                                >
                                  {NOMBRE_DEL_ESTADO[p.liquidacion.estado]}
                                </Badge>
                                {p.liquidacion.estado === 'GENERADA_EN_PARTE' &&
                                  p.liquidacion.generado &&
                                  p.liquidacion.pendiente && (
                                    <span
                                      className="mt-1 block max-w-[9rem] text-caption text-fg-muted"
                                      data-testid="tesoreria-en-parte-fila"
                                    >
                                      <span className="block">
                                        <span className="whitespace-nowrap font-mono tabular-nums">
                                          {formatCurrency(p.liquidacion.generado.canonCop)}
                                        </span>{' '}
                                        generado
                                      </span>
                                      <span className="block">
                                        <span className="whitespace-nowrap font-mono tabular-nums">
                                          {formatCurrency(p.liquidacion.pendiente.canonCop)}
                                        </span>{' '}
                                        por generar
                                      </span>
                                    </span>
                                  )}
                              </>
                            ) : (
                              <Badge variant={p.yaExiste ? 'secondary' : 'outline'} className="whitespace-nowrap">
                                {t(k(p.yaExiste ? 'estadoGenerada' : 'estadoPendiente'))}
                              </Badge>
                            )}
                          </TableCell>
                          {/* 🔴 Las acciones, en el kebab de la derecha (Nico,
                              21-09). Era un botón de texto ocupando una columna
                              entera en una tabla que ya no cabía. */}
                          {/* El kebab actúa; el clic no sube a la fila. */}
                          <TableCell className="w-10" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
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
                              <DropdownListContent align="end" className={ANCHO_DEL_MENU_DE_ACCIONES}>
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
                        </TableRowAnimada>
                      ))}
                    </TableBodyAnimado>
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
      <CajonDeLaLiquidacion
        propietario={abierta}
        mes={mesEnTitulo(month)}
        base={base === 'RECAUDADO' ? 'RECAUDADO' : 'CAUSADO'}
        onCerrar={() => setAbierta(null)}
      />
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
