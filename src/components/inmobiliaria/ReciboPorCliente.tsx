'use client';

/**
 * El recibo de caja se le hace a un CLIENTE, y la plata va a la deuda más vieja.
 *
 * Reemplaza a `ElegirCobroParaRecibo`, que empezaba por el INMUEBLE y ofrecía
 * dos caminos: elegir un cobro con saldo, o crear el cobro de un mes que
 * todavía no se había cobrado. Nico lo bajó el 2026-09-12, con estas palabras:
 *
 *   «El recibo de caja se le hace es a inquilinos. Al elegirlo quiero ver SU
 *    cartera: lo que me debe en ese momento. Tener que scrollear para elegir
 *    qué día entró me parece lento. Los campos son: qué día entró, cómo pagó,
 *    cuánto va a pagar, emitir recibo y los saludos.»
 *
 *   «Si Nico me debe 3 meses y este mes me ingresó 1 millón, ese ingreso va a
 *    la deuda vieja, no a la nueva. Es más: ni siquiera me debe permitir
 *    abonarle al mes actual.»
 *
 * ── La corrección del 2026-09-15: la deuda nace con el CONTRATO ─────────────
 * Nico, viendo este mismo diálogo decir «no debe nada» con el contrato vigente:
 *
 *   «¿Por qué sigue apareciendo acá que no debe? **Desde que él comience el
 *    contrato ya debe.** No tienes que esperar que se cumpla la fecha para
 *    entender que él debe.»
 *
 *   «El puede hasta **adelantar dinero** sobre el contrato que tiene y pagar
 *    dos meses o lo que sea, para bajarle a lo adeudado que está en el estado
 *    de cuenta de ese contrato.»
 *
 * De ahí salen las dos reglas que gobiernan este archivo:
 *
 *   1. 🔴 La deuda se muestra PARTIDA en dos: **lo vencido** y **lo que todavía
 *      no vence**. Son cosas distintas para quien recibe la plata —una se
 *      reclama, la otra se adelanta— y sumarlas en un solo número esconde
 *      justamente la pregunta que la persona de caja viene a responder. En dev
 *      el 72 % de la plata es deuda futura.
 *   2. 🔴 Se puede recibir plata aunque no haya NADA vencido. Eso es adelantar,
 *      y la pantalla lo dice con esa palabra: no es un saldo a favor, es abonar
 *      a cuotas del mismo contrato que todavía no vencieron.
 *
 * «No debe nada» quedó reservado para el único caso en que es verdad: no queda
 * ninguna cuota pendiente, ni vencida ni futura.
 *
 * ── Cómo se lee esta pantalla ───────────────────────────────────────────────
 *   1. `ElegirCliente` — el combobox sobre los inquilinos de la inmobiliaria.
 *      Cuando el recibo se abre desde la fila de un cobro, este paso no se ve:
 *      la persona sale del cobro (`cartera-por-cobro/:cobroId`).
 *   2. `CarteraDelClientePanel` — lo que debe AHORA, vencido primero y futuro
 *      después, con el inmueble de cada deuda y los dos totales. Un cliente con
 *      varios inmuebles la ve JUNTA: es una sola cartera, y el pago se imputa
 *      por antigüedad sin importar de qué inmueble sea cada mes.
 *      Cada período dice cuánto es CAPITAL y cuánto INTERÉS DE MORA (el back lo
 *      liquida con la misma regla de la cartera y la prefactura, también para
 *      la cuota que todavía no tiene cobro): pagar exacto los dos deja la cuota
 *      y su interés en cero.
 *   3. `PlanDeImputacion` — a qué meses y conceptos va a ir el dinero, ANTES de
 *      emitir, con los renglones de adelanto marcados. Se calcula acá para no
 *      ir al servidor en cada tecla, con una copia de la regla
 *      (`@/lib/recibos/imputar-pago`); la AUTORIDAD es el back, y lo que quede
 *      escrito es lo que él devuelve.
 *
 * ── Lo que NO está, y por qué ───────────────────────────────────────────────
 * No hay selector de mes ni botón de «crear el cobro de este mes». Elegir el
 * mes es justamente lo que la regla de imputación no permite, y crear un cobro
 * para poder recibir contra él era el atajo que Nico quiere sacar: la deuda ya
 * existía desde la firma, no hace falta ningún documento para poder cobrarla.
 */

import * as React from 'react';
import { Buildings, CalendarBlank, Receipt, User, Warning } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { inquilinosApi, type Inquilino } from '@/lib/api/inquilinos.service';
import { recibosDeCajaApi } from '@/lib/api/recibos-de-caja.service';
import type { CarteraDelCliente, PeriodoEnDeuda } from '@/lib/api/recibos-de-caja.types';
import {
  deudasDeLaCartera,
  imputarPago,
  type Imputacion,
} from '@/lib/recibos/imputar-pago';
import { mesEnTitulo } from '@/lib/utils/mes';

// ── Reglas puras (probadas solas en ReciboPorCliente.test.tsx) ───────────────

/**
 * Los clientes entre los que se elige, ordenados por nombre.
 *
 * Entran TODOS los que la inmobiliaria conoce, con arriendo vigente o sin él:
 * la deuda no se termina cuando se termina el contrato, y esconder a quien ya
 * se fue es esconder justo la cartera que cuesta cobrar.
 */
export function clientesParaRecibo(inquilinos: readonly Inquilino[]): Inquilino[] {
  return [...inquilinos].sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * El nombre, el documento y el correo juntos: el filtro del Combobox mira sólo
 * `label`, así que todo lo que se quiera buscar va acá.
 */
export function etiquetaDeCliente(i: Inquilino): string {
  const extras = [i.documento?.trim(), i.email?.trim()].filter(Boolean);
  return extras.length > 0 ? `${i.nombre} · ${extras.join(' · ')}` : i.nombre;
}

/**
 * Los conceptos de un período, en una línea, para decir a QUÉ va la plata.
 *
 * Los que RESTAN (prorrateo, retenciones) no se nombran: no son algo que el
 * inquilino esté pagando, y ponerlos al lado del canon en la misma lista hace
 * pensar que se le están cobrando.
 */
export function conceptosDelPeriodo(periodo: PeriodoEnDeuda): string[] {
  return (periodo.conceptos ?? []).filter((c) => !c.resta).map((c) => c.nombre);
}

/** ¿Algún período del plan tiene plata sin recibo? El back frena el pago ahí. */
export function periodosSinConciliar(
  cartera: CarteraDelCliente | null,
  plan: Imputacion,
): PeriodoEnDeuda[] {
  if (!cartera) return [];
  const tocados = new Set(plan.partes.map((p) => p.id));
  return cartera.cuotas.filter((c) => tocados.has(c.id) && c.sinRespaldo > 0);
}

/**
 * La deuda partida en dos: lo VENCIDO y lo que TODAVÍA NO VENCE.
 *
 * 🔴 No se mezclan nunca. Lo vencido es lo que la inmobiliaria reclama hoy; lo
 * futuro es deuda del contrato contra la que se puede ADELANTAR. Un solo número
 * esconde la diferencia, y la diferencia es el 72 % de la plata.
 *
 * Cada lista conserva el orden que trajo el back (del más viejo al más nuevo),
 * que es el mismo en que se va a imputar el pago.
 */
export function separarPorVencimiento(cuotas: readonly PeriodoEnDeuda[]): {
  vencidas: PeriodoEnDeuda[];
  futuras: PeriodoEnDeuda[];
} {
  const vencidas: PeriodoEnDeuda[] = [];
  const futuras: PeriodoEnDeuda[] = [];
  for (const c of cuotas) (c.vencida ? vencidas : futuras).push(c);
  return { vencidas, futuras };
}

/**
 * ¿Lo único que se puede hacer con esta persona es adelantarle?
 *
 * Debe —hay cuotas pendientes— pero ninguna venció todavía. Es el caso que Nico
 * describió: «puede pagar dos meses o lo que sea para bajarle a lo adeudado».
 * La pantalla tiene que decirlo con esa palabra, no callarse.
 */
export function soloSePuedeAdelantar(cartera: CarteraDelCliente | null): boolean {
  if (!cartera) return false;
  return (cartera.vencidoCop ?? 0) <= 0 && (cartera.futuroCop ?? 0) > 0;
}

/**
 * Capital e interés de un período, por separado. Con un back que no manda los
 * campos nuevos, todo lo pendiente es capital, que es lo que se veía antes.
 */
export function capitalEInteresDelPeriodo(periodo: PeriodoEnDeuda): {
  capital: number;
  interes: number;
} {
  const interes = Math.max(0, periodo.interesPendienteCop ?? 0);
  const capital = periodo.capitalPendienteCop ?? Math.max(0, periodo.pendingAmount - interes);
  return { capital, interes };
}

/** El día del vencimiento, tal cual: `dueDate` viaja como fecha ISO. */
export function diaDeVencimiento(dueDate: string): string {
  return String(dueDate ?? '').slice(0, 10);
}

// ── 1. Elegir al cliente ────────────────────────────────────────────────────

export interface ElegirClienteProps {
  value: string | null;
  onChange: (tenantId: string | null) => void;
}

export function ElegirCliente({ value, onChange }: ElegirClienteProps) {
  const { t } = useI18n();
  const k = (s: string) => `recibos.form.cliente.${s}`;

  const [clientes, setClientes] = React.useState<Inquilino[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const cargar = React.useCallback(async () => {
    setError(null);
    try {
      // `estado: 'todos'` y no sólo los activos: ver `clientesParaRecibo`.
      const lista = await inquilinosApi.listar({ estado: 'todos' });
      setClientes(clientesParaRecibo(lista));
    } catch (e) {
      setClientes([]);
      setError(e instanceof Error && e.message ? e.message : '');
    }
  }, []);

  React.useEffect(() => {
    void cargar();
  }, [cargar]);

  const opciones = React.useMemo<ComboboxOption[]>(
    () => (clientes ?? []).map((c) => ({ value: c.tenantId, label: etiquetaDeCliente(c) })),
    [clientes],
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-fg">{t(k('label'))}</p>

      {clientes === null ? (
        <div className="flex items-center gap-2 py-3 text-sm text-fg-muted" data-testid="clientes-cargando">
          <Spinner size="sm" variant="muted" />
          {t(k('cargando'))}
        </div>
      ) : error !== null ? (
        /*
         * R3 (auditoría 13-09): esto era `<p className="text-destructive">` con
         * el mensaje crudo del back —en inglés, a veces un stack— dentro de un
         * marco propio. `FalloDeCarga` lo CLASIFICA (sin red, sin permiso,
         * servidor caído) y decide si tiene sentido reintentar; `enmarcado`
         * va en false porque esto vive adentro del diálogo del recibo y un
         * borde dentro de otro borde se lee como un error del error.
         */
        <FalloDeCarga
          error={error || t(k('fallo'))}
          queEs="los clientes"
          onReintentar={() => cargar()}
          enmarcado={false}
        />
      ) : opciones.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-fg-muted"
          data-testid="sin-clientes"
        >
          {t(k('sinClientes'))}
        </div>
      ) : (
        <div data-testid="cliente-recibo">
          <Combobox
            value={value ?? undefined}
            onChange={(id) => onChange(id ?? null)}
            options={opciones}
            placeholder={t(k('placeholder'))}
            searchPlaceholder={t(k('buscar'))}
            // El Dialog vive en z-[300]; la lista del DS abre en z-50 y quedaba
            // DETRÁS del modal — se veía como si no abriera.
            contentClassName="z-[400]"
          />
        </div>
      )}
    </div>
  );
}

// ── 2. Su cartera ───────────────────────────────────────────────────────────

export interface CarteraDelClientePanelProps {
  cartera: CarteraDelCliente;
}

/** Una tarjeta de período. Se usa igual en el bloque vencido y en el futuro. */
function TarjetaDePeriodo({
  periodo,
  esLaMasVieja,
}: {
  periodo: PeriodoEnDeuda;
  esLaMasVieja: boolean;
}) {
  const { t, formatCurrency, locale } = useI18n();
  const idioma = locale === 'en' ? 'en' : 'es';
  const k = (x: string) => `recibos.form.cartera.${x}`;
  const conceptos = conceptosDelPeriodo(periodo);
  const { capital, interes } = capitalEInteresDelPeriodo(periodo);

  return (
    <div
      data-testid={`cartera-periodo-${periodo.month}`}
      data-vencida={periodo.vencida ? 'si' : 'no'}
      className={cn(
        'rounded-lg border border-border bg-surface p-3',
        // El más viejo es el que va a recibir la plata: se marca.
        esLaMasVieja && 'border-fg/30',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
            <CalendarBlank className="h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
            {mesEnTitulo(periodo.month, idioma)}
            {esLaMasVieja && (
              <Badge variant="warning" data-testid="cartera-mas-vieja">
                {t(k('masVieja'))}
              </Badge>
            )}
          </p>
          <p className="flex items-center gap-1.5 truncate text-xs text-fg-muted">
            <Buildings className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {periodo.propertyTitle}
          </p>
          {conceptos.length > 0 && (
            <p className="truncate text-xs text-fg-muted">{conceptos.join(' · ')}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p
            className={cn(
              'font-mono text-sm font-semibold tabular-nums',
              periodo.vencida ? 'text-warning' : 'text-fg',
            )}
          >
            {formatCurrency(periodo.pendingAmount)}
          </p>
          {/* 🔴 Capital e interés, por separado: es lo que caja está cobrando. */}
          {interes > 0 && (
            <span
              className="text-xs text-fg-muted"
              data-testid={`periodo-capital-e-interes-${periodo.month}`}
            >
              {t(k('capitalEInteres'), {
                capital: formatCurrency(capital),
                intereses: formatCurrency(interes),
              })}
            </span>
          )}
          {/*
            🔴 La insignia dejó de decir el estado del COBRO y dice si la cuota
            venció. El cobro es un documento que puede no existir (`status:
            null` en las 30.951 cuotas de la agencia migrada), y lo que la
            persona de caja necesita saber es si esto se reclama o se adelanta.
          */}
          {periodo.vencida ? (
            <Badge variant="destructive" data-testid="periodo-vencido">
              {periodo.daysLate > 0
                ? t(k('conMora'), { dias: periodo.daysLate })
                : t(k('vencida'))}
            </Badge>
          ) : (
            <Badge variant="default" data-testid="periodo-futuro">
              {t(k('noVenceAun'), { fecha: diaDeVencimiento(periodo.dueDate) })}
            </Badge>
          )}
          {periodo.paidAmount > 0 && (
            <span className="text-xs text-fg-muted">
              {t(k('abonado'), { monto: formatCurrency(periodo.paidAmount) })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function CarteraDelClientePanel({ cartera }: CarteraDelClientePanelProps) {
  const { t, formatCurrency } = useI18n();
  const k = (x: string) => `recibos.form.cartera.${x}`;

  const { vencidas, futuras } = React.useMemo(
    () => separarPorVencimiento(cartera.cuotas),
    [cartera.cuotas],
  );
  const vencidoCop = cartera.vencidoCop ?? 0;
  const futuroCop = cartera.futuroCop ?? 0;
  const interesCop =
    cartera.interesCop ??
    cartera.cuotas.reduce((s, c) => s + capitalEInteresDelPeriodo(c).interes, 0);
  const masVieja = cartera.cuotas[0]?.id ?? null;
  const adelantoSolo = soloSePuedeAdelantar(cartera);

  return (
    <div className="space-y-3" data-testid="cartera-del-cliente">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
          <User className="h-4 w-4 text-fg-muted" aria-hidden="true" />
          {cartera.nombre}
        </p>
        {cartera.inmuebles > 1 && (
          <span className="text-xs text-fg-muted" data-testid="cartera-varios-inmuebles">
            {t(k('variosInmuebles'), { count: cartera.inmuebles })}
          </span>
        )}
      </div>

      {/*
        🔴 Los dos números, separados y rotulados. Quien recibe la plata tiene
        que poder contestar «¿qué me debe HOY?» sin restar de cabeza el total
        menos lo que todavía no vence.
      */}
      <div className="grid grid-cols-2 gap-2" data-testid="cartera-partida">
        <div className="rounded-lg border border-border bg-surface px-3 py-2">
          <p className="text-xs text-fg-muted">{t(k('vencidoLabel'))}</p>
          <p
            className="font-mono text-base font-semibold tabular-nums text-warning"
            data-testid="cartera-vencido"
          >
            {formatCurrency(vencidoCop)}
          </p>
          {/* El interés sólo corre sobre lo vencido: se dice ahí. */}
          {interesCop > 0 && (
            <p className="text-xs text-fg-muted" data-testid="cartera-intereses">
              {t(k('deLosCualesIntereses'), { monto: formatCurrency(interesCop) })}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-surface px-3 py-2">
          <p className="text-xs text-fg-muted">{t(k('futuroLabel'))}</p>
          <p
            className="font-mono text-base font-semibold tabular-nums text-fg"
            data-testid="cartera-futuro"
          >
            {formatCurrency(futuroCop)}
          </p>
        </div>
      </div>

      {adelantoSolo && (
        <p
          className="rounded-lg border border-border bg-surface-muted p-3 text-xs text-fg"
          data-testid="aviso-adelanto"
        >
          {t(k('soloAdelanto'), { nombre: cartera.nombre })}
        </p>
      )}

      <div
        className="max-h-56 space-y-3 overflow-y-auto"
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain' }}
      >
        {vencidas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
              {t(k('grupoVencido'))}
            </p>
            {vencidas.map((c) => (
              <TarjetaDePeriodo key={c.id} periodo={c} esLaMasVieja={c.id === masVieja} />
            ))}
          </div>
        )}

        {futuras.length > 0 && (
          <div className="space-y-2" data-testid="grupo-futuro">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
              {t(k('grupoFuturo'))}
            </p>
            {futuras.map((c) => (
              <TarjetaDePeriodo key={c.id} periodo={c} esLaMasVieja={c.id === masVieja} />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-muted px-3 py-2">
        <span className="text-sm font-medium text-fg">{t(k('total'))}</span>
        <span
          className="font-mono text-base font-semibold tabular-nums text-fg"
          data-testid="cartera-total"
        >
          {formatCurrency(cartera.total)}
        </span>
      </div>
    </div>
  );
}

// ── 3. A dónde va la plata ──────────────────────────────────────────────────

export interface PlanDeImputacionProps {
  cartera: CarteraDelCliente;
  plan: Imputacion;
}

export function PlanDeImputacion({ cartera, plan }: PlanDeImputacionProps) {
  const { t, formatCurrency, locale } = useI18n();
  const idioma = locale === 'en' ? 'en' : 'es';
  const k = (s: string) => `recibos.form.plan.${s}`;

  if (plan.partes.length === 0) return null;

  const porId = new Map(cartera.cuotas.map((c) => [c.id, c]));
  /*
   * 🔴 Un renglón es ADELANTO cuando su cuota todavía no vencía. Sin decirlo,
   * el usuario ve plata bajando meses que él no reclamó y no entiende por qué:
   * es justo la operación que Nico pidió habilitar («pagar dos meses o lo que
   * sea para bajarle a lo adeudado»), así que se nombra.
   */
  const hayAdelanto = plan.partes.some((parte) => porId.get(parte.id)?.vencida === false);
  const aIntereses = plan.partes.reduce((s, parte) => s + parte.aIntereses, 0);

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface-muted p-3" data-testid="plan-de-imputacion">
      <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
        <Receipt className="h-4 w-4 text-fg-muted" aria-hidden="true" />
        {t(k('titulo'))}
      </p>
      <p className="text-xs text-fg-muted">{t(k('ayuda'))}</p>

      <ul className="space-y-2">
        {plan.partes.map((parte) => {
          const periodo = porId.get(parte.id);
          const conceptos = periodo ? conceptosDelPeriodo(periodo) : [];
          const esAdelanto = periodo?.vencida === false;
          return (
            <li key={parte.id} className="space-y-0.5" data-testid={`plan-parte-${parte.month}`}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="min-w-0 truncate font-medium text-fg">
                    {mesEnTitulo(parte.month, idioma)}
                    {periodo ? ` · ${periodo.propertyTitle}` : ''}
                  </span>
                  {esAdelanto && (
                    <Badge variant="default" data-testid={`plan-adelanto-${parte.month}`}>
                      {t(k('adelanto'))}
                    </Badge>
                  )}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-fg">
                  {formatCurrency(parte.valorCop)}
                </span>
              </div>
              {/* Art. 1653: dentro del mes, primero los intereses. Decirlo acá
                  es lo que evita la llamada «¿por qué no bajó el canon?». */}
              {parte.aIntereses > 0 && (
                <p className="text-xs text-fg-muted">
                  {t(k('intereses'), {
                    intereses: formatCurrency(parte.aIntereses),
                    capital: formatCurrency(parte.aCapital),
                  })}
                </p>
              )}
              {conceptos.length > 0 && (
                <p className="truncate text-xs text-fg-muted">{conceptos.join(' · ')}</p>
              )}
              {parte.quedaPendiente > 0 && (
                <p className="text-xs text-warning" data-testid={`plan-queda-${parte.month}`}>
                  {t(k('queda'), { monto: formatCurrency(parte.quedaPendiente) })}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {aIntereses > 0 && (
        <p className="text-xs text-fg-muted" data-testid="plan-interes-primero">
          {t('recibos.form.cartera.interesPrimero')}
        </p>
      )}

      {hayAdelanto && (
        <p className="text-xs text-fg-muted" data-testid="plan-hay-adelanto">
          {t(k('hayAdelanto'))}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
        <span className="text-fg-muted">{t(k('despues'))}</span>
        <span className="font-mono font-semibold tabular-nums text-fg" data-testid="plan-deuda-restante">
          {formatCurrency(plan.deudaRestante)}
        </span>
      </div>
    </div>
  );
}

// ── El pegamento: cargar la cartera ─────────────────────────────────────────

/**
 * La cartera de la persona, resuelta por su id o por un cobro suyo.
 *
 * `cobroId` gana sobre `tenantId`: es la entrada desde la fila de un cobro, y
 * ahí la persona la resuelve el back (un cobro migrado puede no tener cuenta).
 */
export function useCarteraDelCliente(
  tenantId: string | null,
  cobroId: string | null,
  activo: boolean,
) {
  const [cartera, setCartera] = React.useState<CarteraDelCliente | null>(null);
  const [cargando, setCargando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /** Se cambia de cliente antes de que conteste el anterior: la vieja no pisa. */
  const peticion = React.useRef(0);

  const cargar = React.useCallback(async () => {
    if (!activo || (!tenantId && !cobroId)) {
      peticion.current += 1;
      setCartera(null);
      setError(null);
      setCargando(false);
      return;
    }
    const mia = ++peticion.current;
    setCargando(true);
    setError(null);
    try {
      const res = cobroId
        ? await recibosDeCajaApi.carteraPorCobro(cobroId)
        : await recibosDeCajaApi.cartera(tenantId!);
      if (mia !== peticion.current) return;
      setCartera(res);
    } catch (e) {
      if (mia !== peticion.current) return;
      setCartera(null);
      setError(e instanceof Error && e.message ? e.message : '');
    } finally {
      if (mia === peticion.current) setCargando(false);
    }
  }, [activo, cobroId, tenantId]);

  React.useEffect(() => {
    void cargar();
  }, [cargar]);

  return { cartera, cargando, error, recargar: cargar };
}

/** El plan que se muestra antes de emitir. Memoizado: se recalcula al teclear. */
export function usePlanDeImputacion(
  cartera: CarteraDelCliente | null,
  monto: number,
): Imputacion {
  return React.useMemo(
    () => imputarPago(cartera ? deudasDeLaCartera(cartera.cuotas) : [], Math.round(monto)),
    [cartera, monto],
  );
}

// ── El aviso de que hay plata sin conciliar ─────────────────────────────────

export interface AvisoSinConciliarProps {
  periodos: readonly PeriodoEnDeuda[];
}

export function AvisoSinConciliar({ periodos }: AvisoSinConciliarProps) {
  const { t, formatCurrency, locale } = useI18n();
  const idioma = locale === 'en' ? 'en' : 'es';
  if (periodos.length === 0) return null;

  return (
    <div
      className="flex gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3"
      data-testid="aviso-sin-conciliar"
    >
      <Warning className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <div className="space-y-1 text-xs text-fg">
        <p>{t('recibos.form.plan.sinConciliar')}</p>
        <ul className="space-y-0.5">
          {periodos.map((p) => (
            <li key={p.id} className="text-fg-muted">
              {mesEnTitulo(p.month, idioma)} · {p.propertyTitle} · {formatCurrency(p.sinRespaldo)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ElegirCliente;
