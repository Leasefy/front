'use client';

/**
 * Recaudo — cuánto llegó, cuánto falta, cuánto salió y cuánto queda en la
 * mano, mes por mes.
 *
 * Antes esto estaba repartido: `/cobros` muestra el mes corriente, `/cartera`
 * la deuda por edad, `/dispersiones` lo que sale y `/tesoreria` explica el
 * neto con un ejemplo. Acá están las cuatro cifras juntas, y debajo de cada
 * una está escrito de qué se compone — la definición vive en el back
 * (`recaudo.service.ts`) y esta pantalla la repite, no la reinterpreta.
 *
 * ── Las listas son LA tabla de la casa (Nico, 2026-09-03) ───────────────────
 * «Esto no tiene las tablas de como lo manejamos nosotros.» Lo que el back
 * manda como lista —los doce meses de la serie y los recibos del mes por
 * medio de pago— se pinta con `Table` de `@/components/ui/table` dentro de
 * la tarjeta estándar, sin título encima (no se nombran las tablas), con el
 * vacío adentro del `<TableBody>` y carga/fallo por `EstadoDeDatos`.
 *
 * El endpoint (`GET /inmobiliaria/recaudo/{resumen,serie}`) devuelve
 * agregados: no hay una lista recibo por recibo ni giro por giro del mes.
 * Esa lista vive en `/cobros` (recibos) y en `/pagos/dispersiones` (giros).
 *
 * ── 🔴 Lo que cambió el 2026-09-16: la deuda ya no sale de los cobros ──────
 *
 * «Pendiente» decía *«Saldo de los N cobros del mes sin pagar»*. El back dejó
 * de contar cobros y pasó a contar CUOTAS del contrato, así que ese rótulo se
 * volvió una mentira aritmética: con 0 cobros emitidos habría dicho
 * **«0 cobros: $1.251 millones»**. La deuda nace con el contrato; el cobro es
 * el documento con el que finanzas reclama una parte de ella, y puede no
 * existir —en la inmobiliaria migrada no existe para ninguna de sus 30.951
 * cuotas—.
 *
 * De ahí tres cosas en esta pantalla:
 *
 *   1. «Se debe» reemplaza a «Facturado» como la cifra de referencia, y es el
 *      denominador de «% recaudado»: qué parte de lo que el mes hizo deber
 *      llegó. Sobre lo facturado, el porcentaje hablaba de los documentos
 *      emitidos, no del negocio.
 *   2. «Pendiente» y «En mora» se cuentan en CUOTAS (`cuotasPendientes`,
 *      `cuotasEnCartera`), no en cobros.
 *   3. Los cobros no desaparecen: siguen en su propia línea, rotulados como lo
 *      que son —documentos emitidos— y con el `0` dicho con palabras, porque
 *      «no hay documento» no significa «no se debe nada».
 *
 * Lo que la pantalla se niega a hacer:
 *   - Mostrar un mes futuro. No hay nada que ver ahí.
 *   - Confundir «no llegó nada» con «no pudimos preguntar».
 *   - Recortar un «disponible» negativo: si se giró plata que nunca pasó
 *     por un recibo, el número lo dice.
 *   - 🔴 Decir «nada que contar» sobre un mes que SÍ hace deber plata. Un mes
 *     sin cobros, sin recibos y sin giros pero con cuotas es un mes normal de
 *     la inmobiliaria migrada, no un mes vacío.
 *
 * ── La comparativa con el mes anterior (Nico, 2026-09-25) ───────────────────
 *
 * Debajo de cada cifra va el «% vs mes anterior» A LA MISMA FECHA (día N
 * contra día N), y después de las cifras el recaudo día a día de los dos meses
 * y la proyección del cierre. Todo sale de `GET …/recaudo/comparativa` por un
 * hook APARTE (`useComparativaDelRecaudo`): si esa lectura falla, las cifras
 * siguen y sólo la comparación dice «no se pudo leer». El detalle —qué nunca
 * se muestra como «0 %» ni «$ 0»— está en `ComparativaDelMes.tsx`.
 */

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, CaretLeft, CaretRight, Coins, Receipt } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import type { PuntoDeLaSerie, ResumenDeRecaudo } from '@/lib/api/recaudo.types';
import { formatCurrency } from '@/lib/format';
import { useRecaudo } from '@/lib/hooks/use-recaudo';
import { useComparativaDelRecaudo } from '@/lib/hooks/use-comparativa-del-recaudo';
import { esFuturo, mesActual, nombreDelMes, sumarMeses } from '@/lib/recaudo/meses';
import { cn } from '@/lib/utils';
import { GraficoDeRecaudo } from './GraficoDeRecaudo';
import { ComparativaDelMes, VsMesAnterior, type SentidoDeLaCifra } from './ComparativaDelMes';

const formateadorDeNumero = new Intl.NumberFormat('es-CO');

/** Un conteo con separador de miles: «30.951». */
function numero(n: number): string {
  return formateadorDeNumero.format(n);
}

/** El singular o el plural según el conteo. Una «1 cuotas» delata la plantilla. */
function plural(n: number, uno: string, varios: string): string {
  return n === 1 ? uno : varios;
}

/** «septiembre de 2026» → «Septiembre de 2026». `capitalize` de CSS ponía «De» en mayúscula. */
function conMayusculaInicial(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const NOMBRE_DEL_MEDIO: Record<string, string> = {
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  PSE: 'PSE',
  CHEQUE: 'Cheque',
  NEQUI: 'Nequi',
  DAVIPLATA: 'Daviplata',
  TARJETA: 'Tarjeta',
  WOMPI: 'Wompi',
  CONCILIACION: 'Conciliación de saldo anterior',
};

function nombreDelMedio(medio: string): string {
  return NOMBRE_DEL_MEDIO[medio] ?? medio;
}

/**
 * «No hay nada que contar» sólo cuando de verdad no hubo nada en el mes.
 *
 * 🔴 `deudaDelMesCop` y `cuotasDelMes` entraron el 2026-09-16 y son lo que
 * evita el error caro: un mes con 30.951 cuotas y $1.251 millones de deuda
 * pero sin un solo cobro emitido cumplía las cuatro condiciones viejas y se
 * anunciaba como «nada que contar». Es el mes típico de la inmobiliaria
 * migrada.
 */
export function mesSinMovimiento(r: ResumenDeRecaudo): boolean {
  return (
    r.deudaDelMesCop === 0 &&
    r.cuotasDelMes === 0 &&
    r.facturadoCop === 0 &&
    r.recaudadoCop === 0 &&
    r.dispersadoCop === 0 &&
    r.cobrosPagados + r.cobrosPendientes + r.cobrosEnMora === 0
  );
}

/**
 * La tasa de recaudo del mes, en entero, como la midió el BACK.
 *
 * 🔴 Esta pantalla dividía `recaudadoCop` —la plata que entró por caja en el
 * mes, de cualquier período— entre `deudaDelMesCop`: una tercera definición
 * de «tasa de recaudo» que no cuadraba ni con el Resumen ni con Cobros
 * emitidos. Ahora es la de la inmobiliaria (sobre lo causado por defecto, o
 * sobre lo emitido), calculada en `dashboard/tasa-de-recaudo.ts` del back, y
 * la columna dice con qué fórmula.
 *
 * `null` cuando no hubo contra qué medir: un 0 % sobre $0 afirma que no se
 * recaudó, y no había nada que recaudar.
 */
export function porcentajeRecaudado(p: Pick<PuntoDeLaSerie, 'tasaDeRecaudo'>): number | null {
  const pct = p.tasaDeRecaudo?.pct;
  return pct === null || pct === undefined ? null : Math.round(pct);
}

/** Lo que dice la celda cuando no hubo contra qué medir, según la fórmula. */
export function sinTasaQueMedir(p: Pick<PuntoDeLaSerie, 'tasaDeRecaudo'>): string {
  return p.tasaDeRecaudo?.base === 'EMITIDO' ? 'Sin cobros' : 'Sin deuda';
}

/** La serie para la tabla: el mes más reciente arriba, que es el que se mira. */
export function serieParaLaTabla(serie: readonly PuntoDeLaSerie[]): PuntoDeLaSerie[] {
  return [...serie].sort((a, b) => b.month.localeCompare(a.month));
}

export function Recaudo() {
  const [month, setMonth] = useState(() => mesActual());
  const { resumen, serie, cargando, error, recargar } = useRecaudo(month);
  const comparativaDelMes = useComparativaDelRecaudo(month);
  const { comparativa } = comparativaDelMes;
  const falloLaComparativa = Boolean(comparativaDelMes.error) && !comparativaDelMes.cargando;
  /** La línea «vs mes anterior» de una cifra. */
  const vs = (
    id: string,
    cifra: 'seDebe' | 'llego' | 'falta' | 'salio' | 'queda',
    sentido: SentidoDeLaCifra,
    valorMostrado: number,
  ) => (
    <VsMesAnterior
      id={id}
      comparativa={comparativa}
      cifra={cifra}
      sentido={sentido}
      fallo={falloLaComparativa}
      valorMostrado={valorMostrado}
    />
  );

  const siguiente = sumarMeses(month, 1);
  const puedeAvanzar = !esFuturo(siguiente);

  const puntos = useMemo(() => serieParaLaTabla(serie ?? []), [serie]);
  // Con qué fórmula se midió la columna: la del mes en foco, o la de la serie.
  const rotuloDeLaTasa =
    resumen?.tasaDeRecaudo?.rotulo ?? puntos[0]?.tasaDeRecaudo?.rotulo ?? 'Tasa de recaudo';
  const totalDeRecibos = useMemo(
    () =>
      (resumen?.porMedio ?? []).reduce(
        (acc, m) => ({ cantidad: acc.cantidad + m.cantidad, valorCop: acc.valorCop + m.valorCop }),
        { cantidad: 0, valorCop: 0 },
      ),
    [resumen],
  );

  return (
    <div className="space-y-6">
      {/* ── El mes ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2" data-testid="selector-de-mes">
          <Button
            variant="secondary"
            size="sm"
            hideArrow
            aria-label="Mes anterior"
            onClick={() => setMonth(sumarMeses(month, -1))}
          >
            <CaretLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <p className="min-w-[11rem] text-center font-mono text-sm tabular-nums" data-testid="mes-en-foco">
            {conMayusculaInicial(nombreDelMes(month))}
          </p>
          <Button
            variant="secondary"
            size="sm"
            hideArrow
            aria-label="Mes siguiente"
            disabled={!puedeAvanzar}
            onClick={() => puedeAvanzar && setMonth(siguiente)}
          >
            <CaretRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/pagos/cartera/cobros">Ver cobros del mes</Link>
          </Button>
          <Button asChild variant="secondary" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/pagos/cartera">Ver cartera</Link>
          </Button>
          <Button asChild variant="secondary" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/pagos/dispersiones/lotes">
              Lotes al banco
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Cargando → falló → vacío → cifras, en ese orden ───────────────
          `cargando && !resumen` deja pasar el refresco de fondo (cambiar de
          mes) sin blanquear lo que ya se está viendo. */}
      <EstadoDeDatos
        cargando={cargando && !resumen}
        error={error}
        queEs="el recaudo"
        onReintentar={recargar}
        esqueleto={
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        }
      >
        {/* Un mes sin movimiento NO esconde la pantalla: las cifras van en cero
            y las tablas de la casa siguen ahí con su vacío adentro (Nico,
            2026-09-08: «recaudo no tiene el tipo de tablas que manejamos»). Lo
            único que cambia es una línea que lo dice. */}
        {!resumen ? null : (
          <>
            {mesSinMovimiento(resumen) && (
              <p
                className="flex flex-wrap items-center gap-x-2 rounded-lg border border-border bg-surface-muted/40 px-4 py-3 text-sm text-fg-muted"
                data-testid="mes-sin-movimiento"
              >
                <span>
                  Nada que contar en {nombreDelMes(month)}: ningún contrato tiene cuota de este
                  mes, y no hubo cobros, recibos ni giros con fecha en él. Si la plata entró, se
                  registra con un recibo de caja.
                </span>
                <Link href="/panel/inmobiliaria/pagos" className="font-medium text-primary underline-offset-2 hover:underline">
                  Ir a la deuda del mes
                </Link>
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" data-testid="cifras">
              {/* 🔴 Primero lo que el mes HACE DEBER. Es la cifra de la que
                  cuelgan las demás, y la que existe desde que se firma cada
                  contrato: no hay que emitir nada para que haya deuda. */}
              <Cifra
                id="se-debe"
                etiqueta="Se debe"
                valor={resumen.deudaDelMesCop}
                comparacion={vs('se-debe', 'seDebe', 'neutro', resumen.deudaDelMesCop)}
                definicion={`Lo pactado en las ${numero(resumen.cuotasDelMes)} ${plural(resumen.cuotasDelMes, 'cuota', 'cuotas')} de ${nombreDelMes(month)}, pagadas o no. Nace con el contrato; nadie tiene que generarlo.`}
              />
              <Cifra
                id="llego"
                etiqueta="Llegó"
                valor={resumen.recaudadoCop}
                comparacion={vs('llego', 'llego', 'subirEsBueno', resumen.recaudadoCop)}
                definicion={`Recibos de caja con fecha en el mes. ${formatCurrency(resumen.recaudadoDelMesCop)} son de cobros de este mes; el resto, de meses anteriores.`}
              />
              <Cifra
                id="pendiente"
                etiqueta="Pendiente"
                valor={resumen.pendienteCop}
                tono={resumen.pendienteCop > 0 ? 'warning' : undefined}
                comparacion={vs('pendiente', 'falta', 'subirEsMalo', resumen.pendienteCop)}
                /* 🔴 CUOTAS, no cobros. Con 0 cobros emitidos esta línea decía
                   «Saldo de los 0 cobros del mes sin pagar» encima de $1.251
                   millones. Y la cartera se cuenta aparte porque no es lo
                   mismo: lo vencido dentro del plazo del contrato es deuda,
                   no cartera. */
                definicion={`Saldo de ${numero(resumen.cuotasPendientes)} ${plural(resumen.cuotasPendientes, 'cuota', 'cuotas')} de ${nombreDelMes(month)} sin pagar del todo. En cartera acumulada, con meses anteriores: ${formatCurrency(resumen.enMoraCop)} en ${numero(resumen.cuotasEnCartera)} ${plural(resumen.cuotasEnCartera, 'cuota', 'cuotas')}.`}
              />
              <Cifra
                id="dispersado"
                etiqueta="Dispersado"
                valor={resumen.dispersadoCop}
                comparacion={vs('dispersado', 'salio', 'neutro', resumen.dispersadoCop)}
                definicion={`Lotes pagados y giros uno a uno con fecha en el mes. La inmobiliaria se quedó ${formatCurrency(resumen.comisionesCop)} de comisión.`}
              />
              <Cifra
                id="disponible"
                etiqueta="Disponible"
                valor={resumen.disponibleCop}
                tono={resumen.disponibleCop < 0 ? 'danger' : undefined}
                comparacion={vs('disponible', 'queda', 'neutro', resumen.disponibleCop)}
                definicion={
                  resumen.disponibleCop < 0
                    ? 'Recaudado menos dispersado y comisiones, acumulado al cierre del mes. Negativo: se giró plata que nunca pasó por un recibo de caja.'
                    : 'Recaudado menos dispersado y comisiones, acumulado al cierre del mes: lo que hay en la mano y es de terceros.'
                }
              />
            </div>

            {/* 🔴 Los cobros EMITIDOS, rotulados como lo que son: el documento
                con el que finanzas reclama parte de la deuda. Cero cobros no es
                cero deuda, y por eso se dice con palabras en vez de dejar un
                «Facturado $0» al lado de la deuda del mes.

                Va PEGADO a las cinco cifras, no flotando entre ellas y el
                gráfico: suelto en medio de la página era uno más de los bloques
                que Nico no podía asociar a nada (21-09). */}
            <p
              className="-mt-2 border-l-2 border-border pl-3 text-xs text-fg-muted"
              data-testid="facturado"
            >
              {resumen.cobrosEmitidos === 0 ? (
                <>
                  Nadie emitió un cobro de {nombreDelMes(month)}. No hace falta: el inquilino
                  puede pagar su cuota sin que exista el documento.
                </>
              ) : (
                <span className="font-mono">
                  Cobros emitidos {formatCurrency(resumen.facturadoCop)} en{' '}
                  {numero(resumen.cobrosEmitidos)}{' '}
                  {plural(resumen.cobrosEmitidos, 'documento', 'documentos')} ·{' '}
                  {resumen.cobrosPagados} pagados · {resumen.cobrosPendientes} pendientes ·{' '}
                  {resumen.cobrosEnMora} en mora
                </span>
              )}
            </p>

            {/* 🔴 Este mes contra el anterior (Nico, 25-09): el día a día y la
                proyección del cierre. Va pegado a las cifras porque las explica;
                su propio estado de carga/fallo no toca el resto. */}
            <ComparativaDelMes
              month={month}
              comparativa={comparativa}
              cargando={comparativaDelMes.cargando}
              error={comparativaDelMes.error}
              onReintentar={() => void comparativaDelMes.recargar()}
            />

            {/* El gráfico sí lleva su nombre: es un gráfico, no una tabla. */}
            <section
              className="space-y-4 rounded-lg border border-border bg-surface p-6"
              aria-labelledby="ultimos-doce-meses"
            >
              <div className="space-y-1">
                <h2 id="ultimos-doce-meses" className="text-sm font-semibold text-fg">
                  Últimos doce meses
                </h2>
                <p className="text-xs text-fg-muted">
                  Lo que se pidió, lo que llegó y lo que salió, mes por mes hasta {nombreDelMes(month)}.
                </p>
              </div>
              {puntos.length > 0 ? (
                <GraficoDeRecaudo serie={serie ?? []} />
              ) : (
                <p className="text-body-sm text-fg-muted">Todavía no hay serie para graficar.</p>
              )}
            </section>

            {/* Los mismos doce meses, en la tabla de la casa. La fila del mes
                en foco va marcada y cualquier fila cambia el mes: es el
                selector de arriba, pero con los números a la vista. */}
            <section
              className="overflow-hidden rounded-lg border border-border bg-surface"
              aria-labelledby="serie-mensual-titulo"
            >
              {/* 🔴 CADA BLOQUE DICE QUÉ ES (Nico, 21-09: «pasa lo mismo con
                  esta de recaudo… es un vómito literal», «todo en esta pantalla
                  está como suelto, nada realmente se sabe que es de qué»).
                  «No nombramos las tablas» vale cuando la tarjeta que las
                  contiene ya lo dice —en «Deuda del mes» lo dicen el mes, las
                  pestañas y el buscador—; acá la tabla ERA la tarjeta entera y
                  no había nada que la nombrara. El gráfico de arriba ya llevaba
                  su nombre, y era el único de los cuatro bloques. */}
              <div className="space-y-1 border-b border-border px-6 py-4">
                <h2 id="serie-mensual-titulo" className="text-sm font-semibold text-fg">
                  Mes por mes, en números
                </h2>
                <p className="text-xs text-fg-muted">
                  Lo mismo que el gráfico de arriba, con las cifras exactas. La fila del mes
                  elegido va resaltada.
                </p>
              </div>
              <Table data-testid="serie-mensual">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Mes</TableHead>
                    {/* La columna era «Facturado» (cobros emitidos) y quedaba
                        en $0 en toda la serie de la inmobiliaria migrada. */}
                    <TableHead className="whitespace-nowrap text-right">Se debe</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Recaudado</TableHead>
                    {/* 🔴 El nombre de la fórmula, no «% recaudado»: «Recaudo sobre lo
                        causado» y «Pagado de lo emitido» son dos números distintos. */}
                    <TableHead className="whitespace-nowrap text-right" data-testid="rotulo-de-la-tasa">
                      {rotuloDeLaTasa}
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right">Dispersado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {puntos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <SinDatos
                          queSon="meses con movimiento"
                          icono={Coins}
                          titulo="Todavía no hay serie"
                          descripcion="Cuando haya cobros, recibos o giros en algún mes, aparece acá."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    puntos.map((p) => {
                      const enFoco = p.month === month;
                      const pct = porcentajeRecaudado(p);
                      return (
                        <TableRow
                          key={p.month}
                          onClick={() => setMonth(p.month)}
                          aria-current={enFoco ? 'true' : undefined}
                          className={cn('cursor-pointer', enFoco && 'bg-surface-muted')}
                          data-testid="serie-fila"
                          data-mes={p.month}
                        >
                          <TableCell className={cn('whitespace-nowrap', enFoco ? 'font-medium text-fg' : 'text-fg')}>
                            {conMayusculaInicial(nombreDelMes(p.month))}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                            {formatCurrency(p.deudaDelMesCop)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg">
                            {formatCurrency(p.recaudadoCop)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                            {/* Sin contra qué medir no hay porcentaje: un «0 %» diría que no se recaudó. */}
                            {pct === null ? sinTasaQueMedir(p) : `${pct} %`}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                            {formatCurrency(p.dispersadoCop)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </section>

            {/* Los recibos del mes, agrupados por medio de pago (así los manda
                el back). El pie suma: es la misma cifra que «Llegó». */}
            <section
              className="overflow-hidden rounded-lg border border-border bg-surface"
              aria-labelledby="por-medio-titulo"
            >
              <div className="space-y-1 border-b border-border px-6 py-4">
                <h2 id="por-medio-titulo" className="text-sm font-semibold text-fg">
                  Cómo entró la plata de {nombreDelMes(month)}
                </h2>
                <p className="text-xs text-fg-muted">
                  Los recibos de caja del mes, por medio de pago. El total es la misma cifra
                  que «Llegó» arriba.
                </p>
              </div>
              <Table data-testid="por-medio">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Medio de pago</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Recibos</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumen.porMedio.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="p-0" data-testid="sin-recibos">
                        <SinDatos
                          queSon="recibos de caja"
                          icono={Receipt}
                          titulo="Ningún recibo de caja en el mes"
                          descripcion={`Los recibos con fecha en ${nombreDelMes(month)} aparecen acá, agrupados por cómo entró la plata.`}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    resumen.porMedio.map((m) => (
                      <TableRow key={m.medio} data-testid="medio-fila">
                        <TableCell className="text-fg">{nombreDelMedio(m.medio)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-fg-muted">{m.cantidad}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-fg">
                          {formatCurrency(m.valorCop)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                {resumen.porMedio.length > 0 && (
                  <TableFooter>
                    <TableRow data-testid="medio-total">
                      <TableCell className="font-medium text-fg">Total</TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-fg-muted">
                        {totalDeRecibos.cantidad}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium tabular-nums text-fg">
                        {formatCurrency(totalDeRecibos.valorCop)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </section>
          </>
        )}
      </EstadoDeDatos>
    </div>
  );
}

function Cifra({
  id,
  etiqueta,
  valor,
  definicion,
  tono,
  comparacion,
}: {
  id: string;
  etiqueta: string;
  valor: number;
  definicion: string;
  tono?: 'warning' | 'danger';
  /** La línea «vs mes anterior», a la misma fecha. */
  comparacion?: ReactNode;
}) {
  return (
    <section
      className="space-y-2 rounded-lg border border-border bg-surface p-5"
      data-testid={`cifra-${id}`}
    >
      <p className="text-label text-fg-muted">{etiqueta}</p>
      <p
        className={cn(
          'font-mono text-2xl font-medium tabular-nums text-fg',
          tono === 'warning' && 'text-warning',
          tono === 'danger' && 'text-danger',
        )}
        data-testid={`valor-${id}`}
      >
        {formatCurrency(valor)}
      </p>
      {comparacion}
      <p className="text-xs leading-relaxed text-fg-muted">{definicion}</p>
    </section>
  );
}
