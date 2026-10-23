'use client';

/**
 * El cuadre DIARIO de la plata de terceros.
 *
 * ── Por qué esta pantalla existe ────────────────────────────────────────────
 *
 * En la cuenta de recaudo casi nada es de la inmobiliaria: es plata de
 * propietarios que todavía no se giró, plata que el inquilino adelantó, plata
 * que dejó en garantía de servicios, y plata que llegó sin nombre. Que el banco
 * diga un número y la contabilidad diga otro es el defecto que arruina a una
 * inmobiliaria, y sólo se ve si alguien lo mira TODOS LOS DÍAS.
 *
 * Nico (17-09): «saldo de la cuenta de recaudo = recaudado y no girado +
 * anticipos del inquilino + garantías de servicios + partidas por identificar;
 * si no cuadra, se muestra la diferencia a explicar.»
 *
 * ── Lo que esta pantalla se niega a hacer ───────────────────────────────────
 *
 * 1. **Decir «cuadra en $0» cuando no hay extracto.** Sin extracto cargado el
 *    back manda `diferenciaCop: null`, y eso es «no se pudo cuadrar». Un cero
 *    ahí es una afirmación que nadie midió.
 * 2. **Pintar de rojo una diferencia a favor.** Que el banco tenga MÁS de lo
 *    que se le debe a terceros es lo normal: la comisión de la inmobiliaria
 *    sigue en esa cuenta hasta que la traslade. Lo que va en rojo es lo
 *    contrario, `faltaPlataDeTerceros`, que es plata de otra gente que no está.
 * 3. **Esconder las explicaciones detrás de un «ver más».** Son lo que
 *    convierte «no cuadra» en «ya sé por qué».
 * 4. **Calcular nada.** La identidad, la diferencia y las explicaciones las
 *    arma el back (`finanzas/cuadre/cuadre-de-terceros.ts`). Acá se pinta.
 */

import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { Question } from '@phosphor-icons/react';
import Link from 'next/link';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { Avisos } from '@/components/finanzas/piezas';
import { CifraHeroe, type TramoDeLaCifra } from '@/components/pantalla/CifraHeroe';
import { Card } from '@/components/ui/card';
import { useTr } from '@/lib/i18n/use-tr';
import { explicacionEnLimpio } from './cuadre-en-limpio';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { finanzasApi } from '@/lib/api/finanzas.service';
import type { CuadreDeTerceros as Respuesta } from '@/lib/api/finanzas.types';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { plataPareja } from '@/lib/format';
// PG-13 (QA-PAGOS-95): «hasta el 4 de octubre de 2026», nunca «hasta el 2026-10-04».
import { fechaCorta, fechaLarga } from '@/lib/fechas/fecha-de-la-casa';
import { MasDetalles } from '@/components/pantalla/MasDetalles';
import { conLaPlataPegada } from '@/lib/plata/plata-pegada';
import { CampoDeDia } from '@/components/contabilidad/CampoDeDia';

/** N-14 (QA-PAGOS-95): «24 entradas», «1 garantía», nunca «entrada(s)». */
function cuantos(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** `YYYY-MM-DD` de hoy en Bogotá: la misma cuenta que hace el back. */
function hoyEnBogota(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * `encabezado`: la página pinta su `EncabezadoDePantalla` y recibe el campo del día para ponerlo en sus
 * acciones (revisora r24, Cuadre #5: «Día» no va solo en su renglón). Sin él, el campo va arriba, como antes.
 */
export function CuadreDeTercerosPanel({ encabezado }: { encabezado?: (campoDelDia: ReactNode) => ReactNode } = {}) {
  const tr = useTr();
  const [fecha, setFecha] = useState(hoyEnBogota);
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      setDatos(await finanzasApi.cuadre(fecha));
    } catch (error) {
      setFallo(error);
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const campo = (
    <CampoDeDia
      id="cuadre-fecha"
      value={fecha}
      onChange={(v) => setFecha(v)}
      max={hoyEnBogota()}
      className="w-44"
      testid="cuadre-fecha"
    />
  );

  return (
    <div className="space-y-6" data-testid="cuadre-de-terceros">
      {encabezado ? (
        encabezado(
          <div className="flex items-center gap-2">
            <Label htmlFor="cuadre-fecha" className="sr-only">{tr('Día del cuadre')}</Label>
            {campo}
          </div>,
        )
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="cuadre-fecha">{tr('Día')}</Label>
          {campo}
        </div>
      )}

      <EstadoDeDatos
        cargando={cargando && !datos}
        error={fallo}
        vacio={!cargando && !datos}
        onReintentar={cargar}
        queEs="el cuadre del día"
        esqueleto={<EsqueletoDelCuadre />}
      >
        {datos ? <Cuadre datos={datos} /> : null}
      </EstadoDeDatos>
    </div>
  );
}

/** El esqueleto con la forma de lo que llega: la cifra con su barra y la cuenta renglón por renglón. */
function EsqueletoDelCuadre() {
  const tr = useTr();
  const barra = (c: string) => <div className={cn('animate-pulse rounded-full bg-surface-muted', c)} aria-hidden="true" />;
  return (
    <div className="space-y-6" role="status" aria-label={tr('Cargando')} data-testid="cuadre-esqueleto">
      <Card className="space-y-4 px-5 py-5 sm:px-6">
        {barra('h-3 w-48')}
        {barra('h-9 w-64')}
        {barra('h-2 w-full')}
        <div className="flex gap-8">{barra('h-8 w-40')}{barra('h-8 w-40')}</div>
      </Card>
      <Card className="space-y-4 px-5 py-5 sm:px-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between gap-6">{barra('h-3 w-56')}{barra('h-3 w-24')}</div>
        ))}
      </Card>
    </div>
  );
}

/**
 * Los avisos que el veredicto NO dijo ya.
 *
 * 🔴 Nico, 21-09: «esto también parece un vómito, hay que mejorar muchísimo
 * esta pantalla también». Lo primero que se veía eran DOS cajas amarillas
 * pegadas diciendo lo mismo: el veredicto («No se pudo cuadrar: no hay extracto
 * bancario cargado hasta el 2026-09-21… Cárgalo en Conciliación») y, debajo, el
 * aviso del back («No hay extracto bancario cargado hasta esta fecha: el saldo
 * de la cuenta de recaudo es desconocido y el cuadre NO se puede hacer. Carga
 * el extracto en Conciliación»). Y una tercera vez en el `sinMedir` de la
 * tarjeta del saldo.
 *
 * Y no era sólo el caso sin extracto: con extracto cargado y descuadre pasa lo
 * mismo —el veredicto dice «Falta plata de terceros: $1.604.900» y el aviso del
 * back dice lo mismo con el mismo número, dos cajas seguidas.
 *
 * Los dos bloques tienen trabajos distintos —el veredicto dice si se le puede
 * creer a la pantalla, los avisos dicen qué NO cuentan estos números— y en los
 * dos estados de alarma acaban siendo la misma frase. Manda el veredicto: está
 * arriba, tiene el color y trae el enlace.
 *
 * 🔴 El aviso gemelo se reconoce por el NÚMERO, no por las palabras: el monto
 * de la diferencia es un dato, la redacción del back es suya y puede cambiar
 * mañana. Lo que NO se puede perder es un aviso que diga otra cosa.
 */
export function avisosQueElVeredictoNoDijo(datos: {
  haySaldoDelBanco: boolean;
  cuadra: boolean;
  diferenciaCop: number | null;
  avisos: readonly string[];
}): string[] {
  // Sin extracto: el veredicto ES «no hay extracto». Se cae el aviso gemelo.
  if (!datos.haySaldoDelBanco) {
    return datos.avisos.filter((a) => !a.toLowerCase().includes('extracto'));
  }
  /*
   * Con extracto y descuadre: el veredicto ya dio el titular CON el número
   * («Falta plata de terceros: $1.604.900»), y el back manda un aviso que dice
   * lo mismo con el mismo número. Se reconoce POR EL NÚMERO, no por las
   * palabras: el monto de la diferencia es un dato, la redacción del back es
   * suya y puede cambiar mañana.
   *
   * Los demás avisos pasan: «2 partidas por identificar ($2.101.235)» es otro
   * hecho, y es lo único que dice que hay plata sin dueño en esa cuenta.
   */
  if (!datos.cuadra && datos.diferenciaCop !== null && datos.diferenciaCop !== 0) {
    const monto = formatCurrency(Math.abs(datos.diferenciaCop));
    // Sin el «$» y sin espacios: el back puede escribirlo con otro formato.
    const digitos = monto.replace(/[^\d.]/g, '');
    return datos.avisos.filter(
      (a) => !a.includes(monto) && !(digitos.length > 0 && a.includes(digitos)),
    );
  }
  return [...datos.avisos];
}


/**
 * GLOW UP (revisora r24, Cuadre #1–#5). En el orden en que se trabaja:
 *   1. LA RESPUESTA: la diferencia del día en una cifra, partida en sus causas —lo tuyo sin trasladar y lo
 *      que todavía no tiene explicación—, cada una con su acción en la leyenda; debajo, por dónde buscar lo
 *      que no se explica y los avisos que el veredicto no dijo (un renglón).
 *   2. La cuenta renglón por renglón (UNA sola vez): nombre · signo · monto, la definición plegada en su «?».
 * Antes: un veredicto a mano sin barra, «Qué puede explicar la diferencia» aparte y «Ver cada término con su
 * fuente», que repetía cada número y cada definición. Las cifras y las frases las sigue armando el back.
 */
function Cuadre({ datos }: { datos: Respuesta }) {
  return (
    <div className="space-y-6">
      <Veredicto datos={datos} />
      <LaCuenta datos={datos} />
    </div>
  );
}

function Veredicto({ datos }: { datos: Respuesta }) {
  const tr = useTr();
  const estado = datos.faltaPlataDeTerceros
    ? 'falta'
    : !datos.haySaldoDelBanco
      ? 'sin-extracto'
      : datos.cuadra
        ? 'cuadra'
        : 'a-favor';
  const diferencia = Math.abs(datos.diferenciaCop ?? 0);
  // Las dos causas de una diferencia a favor: lo tuyo que sigue en la cuenta y lo que queda sin explicar.
  const tuyo = estado === 'a-favor' ? Math.min(datos.comisionEnLaCuentaCop, diferencia) : 0;
  const sinExplicar = estado === 'a-favor' ? Math.max(0, diferencia - tuyo) : 0;
  const plata = plataPareja([diferencia, tuyo, sinExplicar]);
  const hayTraslado = datos.comisionRetenidaCop > 0 && datos.comisionEnLaCuentaCop > 0;
  const hayPartidas = datos.partidasPorIdentificar > 0;
  const partidasEnElTramo = hayPartidas && sinExplicar > 0;
  const fecha = fechaLarga(datos.fecha);
  const fechaDelRotulo = fechaCorta(datos.fecha);
  // Lo que puede explicar la diferencia sólo hace falta cuando una parte no se explica sola.
  const explicaciones = estado === 'a-favor' && sinExplicar === 0 ? [] : datos.explicaciones;
  const avisos = avisosQueElVeredictoNoDijo(datos).map((a) => conLaPlataPegada(a));

  const botonDePartidas = hayPartidas ? (
    <Button asChild size="sm" variant="outline" hideArrow className="h-auto min-h-9 whitespace-normal py-1.5 text-left">
      <Link href="/panel/inmobiliaria/pagos/recaudo" data-testid="ir-a-identificar-partidas">
        {datos.partidasPorIdentificar === 1
          ? tr('Identificar la partida en Conciliación')
          : tr('Identificar las {n} partidas en Conciliación', { n: datos.partidasPorIdentificar })}
      </Link>
    </Button>
  ) : null;

  const tramos: TramoDeLaCifra[] =
    estado === 'a-favor'
      ? [
          {
            clave: 'tuyo',
            etiqueta: tr('Lo tuyo sin trasladar'),
            monto: tuyo,
            tono: 'neutro',
            cifra: plata(tuyo),
            'data-testid': 'cuadre-tramo-tuyo',
            extra: hayTraslado ? (
              <div className="pt-2">
                <Button asChild size="sm" hideArrow>
                  <Link href="/panel/inmobiliaria/pagos/traslados" data-testid="ir-a-traslados">
                    {tr('Proponer el traslado')}
                  </Link>
                </Button>
              </div>
            ) : null,
          },
          {
            clave: 'sin-explicar',
            etiqueta: tr('Sin explicación todavía'),
            monto: sinExplicar,
            tono: 'aviso',
            cifra: plata(sinExplicar),
            'data-testid': 'cuadre-tramo-sin-explicar',
            extra: partidasEnElTramo ? <div className="pt-2">{botonDePartidas}</div> : null,
          },
        ]
      : [];

  const punto =
    estado === 'falta' ? 'bg-error-500' : estado === 'sin-extracto' ? 'bg-warning-500' : 'bg-success-500';

  return (
    <Card
      className="px-5 py-5 sm:px-6"
      data-testid="cuadre-veredicto"
      data-estado={estado}
      role={estado === 'falta' ? 'alert' : 'status'}
    >
      <CifraHeroe
        // A 390 la leyenda va en una columna: cada causa con su botón entero.
        className="[&>ul]:grid-cols-1 sm:[&>ul]:grid-cols-2"
        rotulo={
          <span className="inline-flex items-center gap-2">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', punto)} aria-hidden="true" />
            {/* Revisora r25 (Cuadre #2): «Al 23 oct 2026» cabe a 390 (el día largo se partía). */}
            {estado === 'sin-extracto' ? tr('Cuadre del {fecha}', { fecha: fechaDelRotulo }) : tr('Diferencia al {fecha}', { fecha: fechaDelRotulo })}
          </span>
        }
        cifra={
          estado === 'sin-extracto' ? (
            '—'
          ) : estado === 'falta' ? (
            <span className="text-danger">− {plata(diferencia)}</span>
          ) : (
            plata(estado === 'cuadra' ? 0 : diferencia)
          )
        }
        contexto={
          estado === 'falta'
            ? tr('Falta plata de terceros en el banco')
            : estado === 'cuadra'
              ? tr('Cuadra exacto')
              : estado === 'a-favor'
                ? tr('de más en el banco')
                : tr('No se pudo cuadrar: falta el extracto del banco')
        }
        total={diferencia}
        // Una diferencia de $ 0 ES la respuesta («cuadra exacto»): no se pliega en una línea.
        esCero={false}
        tramos={tramos}
        pie={
          <div className="space-y-3">
            <p className="max-w-2xl text-body-sm text-fg-muted">
              {estado === 'falta'
                ? tr('En la cuenta de recaudo hay menos de lo que se le debe a propietarios e inquilinos. Revísalo hoy: esa plata no es de la inmobiliaria.')
                : estado === 'sin-extracto'
                  ? tr('Sin el extracto del {fecha}, el saldo de la cuenta de recaudo es desconocido.', { fecha })
                  : estado === 'cuadra'
                    ? tr('El saldo de la cuenta de recaudo es igual a la plata de terceros al {fecha}.', { fecha })
                    : datos.laDiferenciaEsLaComision
                      ? tr('No falta plata de nadie: es exactamente lo tuyo (comisión, su IVA, intereses y gastos de lo cobrado) que sigue en la cuenta de recaudo. Con el traslado, el cuadre da cero.')
                      : tr('No falta plata de nadie. Lo tuyo se va con el traslado; lo que queda sin explicar se busca en el extracto.')}
            </p>
            {estado === 'sin-extracto' ? (
              <Button asChild size="sm" hideArrow>
                <Link href="/panel/inmobiliaria/conciliacion/movimientos#upload" data-testid="cuadre-cargar-extracto">
                  {tr('Cargar el extracto en Conciliación')}
                </Link>
              </Button>
            ) : null}
            {/* Revisora r25 (Cuadre #1): plegado. Cada tramo de arriba ya trae su botón; esto se consulta. */}
            {explicaciones.length > 0 ? (
              <MasDetalles
                etiqueta={tr('Por dónde buscar la diferencia')}
                etiquetaAbierto={tr('Ocultar')}
                montadoSiempre
                className="text-body-sm"
              >
                <ul className="space-y-1 text-body-sm leading-relaxed text-fg-muted" data-testid="cuadre-explicaciones">
                  {explicaciones.map((e) => (
                    <li key={e} className="flex gap-2">
                      <span aria-hidden="true">·</span>
                      <span>{conLaPlataPegada(explicacionEnLimpio(e))}</span>
                    </li>
                  ))}
                </ul>
              </MasDetalles>
            ) : null}
            <Avisos avisos={avisos} testId="cuadre-avisos" />
            {hayPartidas && !partidasEnElTramo ? botonDePartidas : null}
          </div>
        }
      />
    </Card>
  );
}

interface RenglonVisible {
  clave: string;
  signo: '+' | '−' | '=' | '';
  etiqueta: string;
  valorCop: number | null;
  explicacion: string;
  testid: string;
  valorTestid?: string;
}

/** Con un back anterior (sin `renglones`), la misma cuenta armada con los términos que sí manda. */
function renglonesDeUnBackAnterior(datos: Respuesta): RenglonVisible[] {
  const conPropio = datos.propioRetenidoCop !== undefined;
  const fila = (clave: string, signo: RenglonVisible['signo'], etiqueta: string, valorCop: number | null, explicacion: string): RenglonVisible => ({
    clave, signo, etiqueta, valorCop, explicacion, testid: `cifra-${clave}`, valorTestid: `valor-${clave}`,
  });
  const filas: RenglonVisible[] = [
    fila('recaudado-no-girado', '+', 'Recaudado y no girado', datos.recaudadoYNoGiradoCop,
      `Lo que entró de inquilinos (${formatCurrency(datos.detalle.recaudadoCop)}) menos lo que salió a propietarios (${formatCurrency(datos.detalle.giradoCop)}). Adentro está lo tuyo (comisión, su IVA, intereses y gastos)${conPropio ? `: ${formatCurrency(datos.propioRetenidoCop ?? 0)} que se restan para llegar a la plata de terceros` : ', que es plata tuya'}.`),
    fila('anticipos', '+', 'Anticipos del inquilino', datos.anticiposDelInquilinoCop,
      'El saldo vivo de lo que los inquilinos adelantaron. Es de ellos hasta que se consume mes a mes.'),
    fila('garantias', '+', 'Garantías de servicios', datos.garantiasDeServiciosCop,
      `El saldo vivo de ${cuantos(datos.detalle.garantiasVivas, 'garantía', 'garantías')}. Es plata del inquilino hasta que se paga un servicio o se le devuelve.`),
    fila('por-identificar', '+', 'Partidas por identificar', datos.partidasPorIdentificarCop,
      `${cuantos(datos.partidasPorIdentificar, 'entrada', 'entradas')} del extracto que nadie asignó. Se quedan en el pasivo hasta que se les ponga inquilino y cuota: no se pasan a ingresos ni se devuelven solas.`),
    fila('plata-de-terceros', '=', 'Plata de terceros', datos.plataDeTercerosCop,
      'La suma de los términos de arriba: lo que no es de la inmobiliaria y tiene que estar en la cuenta de recaudo.'),
    fila('saldo-banco', '=', 'Saldo de la cuenta de recaudo', datos.haySaldoDelBanco ? datos.saldoDeLaCuentaCop : null,
      datos.haySaldoDelBanco
        ? `La suma de ${datos.detalle.movimientosDelExtracto === 1 ? 'el' : 'los'} ${cuantos(datos.detalle.movimientosDelExtracto, 'movimiento', 'movimientos')} del extracto hasta el ${fechaLarga(datos.fecha)}.`
        : 'No hay extracto bancario cargado hasta esta fecha: cárgalo en Conciliación para poder cuadrar.'),
    fila('diferencia', '=', 'Diferencia (saldo − plata de terceros)', datos.diferenciaCop,
      datos.diferenciaCop === null ? 'No se pudo cuadrar: falta el extracto del banco.' : 'Lo que hay en el banco menos la plata de terceros.'),
  ];
  if (datos.comisionRetenidaCop > 0) {
    filas.push(fila('comision-referencia', '', 'Tu comisión causada (referencia)', datos.comisionRetenidaCop,
      'No entra en la identidad: es plata tuya. Está aquí porque es la explicación más común de una diferencia a favor.'));
  }
  return filas;
}

/** La cuenta en palabras, renglón por renglón (N-38), como un recibo: el signo, el nombre con su «?», el monto. */
function LaCuenta({ datos }: { datos: Respuesta }) {
  const tr = useTr();
  const renglones: RenglonVisible[] =
    datos.renglones && datos.renglones.length > 0
      ? datos.renglones.map((r) => ({ ...r, testid: `renglon-${r.clave}` }))
      : renglonesDeUnBackAnterior(datos);
  // Los mismos decimales en toda la columna (revisión 22-10).
  const plata = plataPareja(renglones.map((r) => r.valorCop));
  const delBack = Boolean(datos.renglones && datos.renglones.length > 0);
  return (
    <section className="space-y-3" data-testid={delBack ? 'cuadre-renglones' : 'cuadre-terminos'}>
      <h2 className="text-[17px] font-[460] tracking-[-0.01em] text-fg">{tr('La cuenta, renglón por renglón')}</h2>
      <Card className="px-5 py-2 sm:px-6">
        <ol>
          {renglones.map((r) => (
            <RenglonDeLaCuenta key={r.clave} renglon={r} plata={plata} />
          ))}
        </ol>
      </Card>
    </section>
  );
}

function RenglonDeLaCuenta({ renglon: r, plata }: { renglon: RenglonVisible; plata: (n: number) => string }) {
  const tr = useTr();
  const [abierto, setAbierto] = useState(false);
  const id = useId();
  const esTotal = r.signo === '=';
  // Un término en cero no pesa: «—» atenuado (VOZ §4). Los totales sí dicen su cero.
  const enCero = !esTotal && r.valorCop === 0;
  return (
    <li
      className={cn(
        'py-3',
        esTotal ? 'border-t-2 border-fg/15' : 'border-t border-border-faint first:border-t-0 dark:border-border-strong',
      )}
      data-testid={r.testid}
    >
      {/* Revisora r25 (Cuadre #3): a 390 la plata baja bajo el nombre (le dejaba ≈120 px y lo partía en tres). */}
      <div className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 sm:grid-cols-[1rem_minmax(0,1fr)_auto]">
        <span className="font-mono text-body-sm text-fg-subtle" aria-hidden="true">{r.signo}</span>
        <p className={cn('flex min-w-0 items-center gap-1 text-body-sm', esTotal ? 'font-medium text-fg' : 'text-fg')}>
          <span className="min-w-0">{r.etiqueta}</span>
          <button
            type="button"
            aria-expanded={abierto}
            aria-controls={id}
            aria-label={tr('Qué es «{nombre}»', { nombre: r.etiqueta })}
            onClick={() => setAbierto((v) => !v)}
            className={cn(
              'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              abierto ? 'bg-surface-muted text-fg' : 'text-fg-subtle hover:bg-surface-muted hover:text-fg',
            )}
          >
            <Question className="h-4 w-4" aria-hidden="true" />
          </button>
        </p>
        <p
          className={cn(
            'col-start-2 shrink-0 text-right font-mono text-body-sm tabular-nums sm:col-start-auto',
            enCero || r.valorCop === null ? 'text-fg-subtle' : esTotal ? 'font-medium text-fg' : 'text-fg',
          )}
          data-testid={r.valorTestid}
        >
          {r.valorCop === null || enCero ? '—' : plata(r.valorCop)}
        </p>
      </div>
      <p id={id} hidden={!abierto} className={cn('pl-7 pt-1.5 text-caption leading-relaxed text-fg-muted', abierto && 'animate-rise-in')}>
        {conLaPlataPegada(explicacionEnLimpio(r.explicacion))}
      </p>
    </li>
  );
}
