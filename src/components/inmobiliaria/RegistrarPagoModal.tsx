'use client';

/**
 * El formulario del RECIBO DE CAJA — por CLIENTE, no por inmueble ni por mes.
 *
 * El componente conserva el nombre viejo porque es su único callsite y
 * renombrar el archivo no le cambia nada al usuario. Lo que cambió, el
 * 2026-09-12, es a quién se le hace el recibo y quién decide a dónde va la
 * plata. Palabras de Nico:
 *
 *   «El recibo de caja se le hace es a inquilinos. Al elegirlo quiero ver SU
 *    cartera: lo que me debe en ese momento. Los campos son: qué día entró,
 *    cómo pagó, cuánto va a pagar, emitir recibo y los saludos. Tener que
 *    scrollear para elegir qué día entró me parece lento.»
 *
 *   «Si Nico me debe 3 meses y este mes me ingresó 1 millón, ese ingreso va a
 *    la deuda vieja, no a la nueva. Es más: ni siquiera me debe permitir
 *    abonarle al mes actual.»
 *
 * Antes esta pantalla empezaba por el inmueble, ofrecía elegir contra cuál
 * cobro iba el recibo y, si no había ninguno con saldo, crear el cobro del mes
 * para poder recibir contra él. Las tres cosas se fueron: elegir el mes es
 * exactamente lo que la regla de imputación no permite.
 *
 * Cuatro cosas que este formulario tiene que hacer bien o no sirve:
 *
 * 1. 🔴 La CARTERA a la vista apenas se elige al cliente. Sin ella, quien
 *    recibe la plata no sabe si esa persona debe algo, que es lo primero que
 *    Nico pidió ver.
 *
 * 2. 🔴 El PLAN a la vista mientras se escribe el monto: a qué meses y a qué
 *    conceptos va. El destino no se elige, así que hay que poder verlo antes
 *    de emitir — si no, el recibo es una caja negra.
 *
 * 3. 🔴 El monto se lee con `CurrencyInput` de cadence, no con un `<input>` de
 *    texto parseado a mano. El parser anterior hacía
 *    `parseFloat('1.800.000'.replace(',', '.'))` → **1.8**.
 *
 * 4. 🔴 Los rechazos del back se muestran TAL CUAL: el 400 del sobrepago trae
 *    el máximo abonable y el 409 dice qué período tiene plata sin conciliar.
 *
 * ⚠️ Decisión de producto tomada al pie de la letra: el campo REFERENCIA salió
 * del formulario. Nico enumeró los campos y cerró con «y nada más». El back lo
 * sigue aceptando (lo usa la conciliación bancaria), así que devolverlo es
 * agregar el input de vuelta; no hay nada más que deshacer.
 */

import * as React from 'react';
import { toast } from '@/components/ui/toast';
import {
  Bank,
  Calendar,
  CreditCard,
  CurrencyCircleDollar,
  DotsThree,
  FileText,
  Money,
  Note,
  Receipt,
  Wallet,
} from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui';
import { Spinner } from '@/components/ui/spinner';
import { Banner, Chip, CurrencyInput } from '@leasefy/cadence';
import { ApiError } from '@/lib/api/client';
import type { Cobro } from '@/lib/types/inmobiliaria';
import type {
  ConciliacionDePagoAnterior,
  NuevoReciboPorCliente,
  RespuestaDeRecibo,
  RespuestaDeReciboPorCliente,
} from '@/lib/api/recibos-de-caja.types';
import { useMediosDePago } from '@/lib/hooks/use-medios-de-pago';
import { ICONO_DEL_TIPO } from './medios-de-pago/legible';
import {
  AvisoSinConciliar,
  CarteraDelClientePanel,
  ElegirCliente,
  PlanDeImputacion,
  periodosSinConciliar,
  useCarteraDelCliente,
  usePlanDeImputacion,
} from './ReciboPorCliente';

/**
 * Los medios de pago. `medio` viaja como `string` libre en el contrato del
 * back, así que estos son los valores que el front ya venía mandando como
 * `paymentMethod`: cambiarlos partiría el histórico en dos vocabularios.
 */
const MEDIOS = [
  { valor: 'transferencia', clave: 'recibos.form.medios.transferencia', icono: Bank },
  { valor: 'efectivo', clave: 'recibos.form.medios.efectivo', icono: Money },
  { valor: 'tarjeta', clave: 'recibos.form.medios.tarjeta', icono: CreditCard },
  { valor: 'cheque', clave: 'recibos.form.medios.cheque', icono: FileText },
  { valor: 'pse', clave: 'recibos.form.medios.pse', icono: Wallet },
  { valor: 'otro', clave: 'recibos.form.medios.otro', icono: DotsThree },
] as const;

const ORIGEN_MINIMO = 5;

/** El DTO del back acepta `medio` como texto libre de hasta 40 caracteres. */
const LARGO_MAXIMO_DEL_MEDIO = 40;

/** Los «saludos» topan en 380: el back le agrega el detalle del reparto. */
const LARGO_MAXIMO_DE_SALUDOS = 380;

/**
 * Los medios configurados por la inmobiliaria (activos), como chips. Si no
 * hay ninguno, la lista fija de arriba. El valor que viaja es el NOMBRE del
 * medio, recortado al largo del DTO: es lo que la persona de caja reconoce.
 */
export function mediosParaElegir(
  configurados: { nombre: string; tipo: keyof typeof ICONO_DEL_TIPO; activo: boolean }[] | null | undefined,
): { valor: string; etiqueta: string | null; clave: string | null; icono: typeof Bank }[] {
  const activos = (configurados ?? []).filter((m) => m.activo);
  if (activos.length === 0) {
    return MEDIOS.map((m) => ({ valor: m.valor, etiqueta: null, clave: m.clave, icono: m.icono }));
  }
  return activos.map((m) => ({
    valor: m.nombre.trim().slice(0, LARGO_MAXIMO_DEL_MEDIO),
    etiqueta: m.nombre,
    clave: null,
    icono: ICONO_DEL_TIPO[m.tipo] ?? DotsThree,
  }));
}

/** El pie del modal vive fuera del <form>; los enlaza el atributo `form`. */
const ID_FORM = 'form-recibo-de-caja';

export interface RegistrarPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Entrada desde la fila de un cobro. NO significa «el recibo va contra este
   * cobro»: el back resuelve de quién es y devuelve TODA su cartera, porque la
   * plata puede tener que ir a un mes más viejo. Sin cobro, se elige al
   * cliente acá adentro.
   */
  cobro: Cobro | null;
  /**
   * Emite el recibo del cliente.
   * 🔴 Tiene que RELANZAR el error: el 400 del sobrepago y el 409 del período
   * sin conciliar se resuelven acá adentro, no con un toast genérico afuera.
   */
  onSubmit: (datos: NuevoReciboPorCliente) => Promise<RespuestaDeReciboPorCliente>;
  /** Concilia la plata vieja de un cobro. También tiene que relanzar. */
  onConciliar?: (
    cobroId: string,
    datos: ConciliacionDePagoAnterior,
  ) => Promise<RespuestaDeRecibo>;
}

export function RegistrarPagoModal({
  isOpen,
  onClose,
  cobro: cobroDeEntrada,
  onSubmit,
  onConciliar,
}: RegistrarPagoModalProps) {
  const { t, formatCurrency } = useI18n();
  const { medios: mediosConfigurados } = useMediosDePago({ enabled: isOpen });
  const opcionesDeMedio = React.useMemo(() => mediosParaElegir(mediosConfigurados), [mediosConfigurados]);

  const hoy = React.useMemo(() => new Date().toISOString().split('T')[0], []);

  const [tenantId, setTenantId] = React.useState<string | null>(null);
  const [monto, setMonto] = React.useState<number>(NaN);
  const [medio, setMedio] = React.useState('');
  const [fecha, setFecha] = React.useState(hoy);
  const [saludos, setSaludos] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);
  const [errorDelBack, setErrorDelBack] = React.useState<string | null>(null);
  const [tocado, setTocado] = React.useState(false);

  // Conciliación: se enciende con el 409 y guarda el mensaje del back tal cual.
  const [conciliando, setConciliando] = React.useState<
    { cobroId: string; mensaje: string } | null
  >(null);
  const [origen, setOrigen] = React.useState('');
  const [enviandoConciliacion, setEnviandoConciliacion] = React.useState(false);
  const [errorDeConciliacion, setErrorDeConciliacion] = React.useState<string | null>(null);

  const cobroId = cobroDeEntrada?.id ?? null;
  const { cartera, cargando, error, recargar } = useCarteraDelCliente(
    tenantId,
    cobroId,
    isOpen,
  );
  const plan = usePlanDeImputacion(cartera, monto);
  const sinConciliar = React.useMemo(
    () => periodosSinConciliar(cartera, plan),
    [cartera, plan],
  );

  const maximo = cartera?.total ?? 0;
  const montoValido = Number.isFinite(monto) && monto > 0;
  const seExcede = montoValido && monto > maximo;

  const errorDeMonto = !tocado
    ? null
    : !Number.isFinite(monto) || monto === 0
      ? t('recibos.form.montoRequerido')
      : monto < 0
        ? t('recibos.form.montoPositivo')
        : seExcede
          ? t('recibos.form.montoExcede', { monto: formatCurrency(maximo) })
          : null;

  const puedeEnviar =
    cartera !== null && cartera.total > 0 && montoValido && !seExcede && medio !== '' && fecha !== '';

  /**
   * Al cambiar de cliente, el formulario arranca de cero con su deuda entera.
   * Es el default correcto: lo normal es recibir el pago completo, y el que
   * abona parcial escribe menos.
   */
  React.useEffect(() => {
    if (!cartera) return;
    setMonto(cartera.total > 0 ? cartera.total : NaN);
    setMedio('');
    setFecha(hoy);
    setSaludos('');
    setErrorDelBack(null);
    setTocado(false);
    setConciliando(null);
    setOrigen('');
    setErrorDeConciliacion(null);
  }, [cartera?.tenantId, cartera?.total, hoy]); // eslint-disable-line react-hooks/exhaustive-deps

  const cerrar = React.useCallback(() => {
    setTenantId(null);
    setMonto(NaN);
    setMedio('');
    setSaludos('');
    setErrorDelBack(null);
    setTocado(false);
    setConciliando(null);
    setOrigen('');
    setErrorDeConciliacion(null);
    onClose();
  }, [onClose]);

  const emitir = React.useCallback(async () => {
    setTocado(true);
    if (!puedeEnviar) return;

    setEnviando(true);
    setErrorDelBack(null);
    try {
      /*
       * De quién es el pago: el cobro de entrada si vino de una fila, si no la
       * persona elegida. Uno de los dos, NUNCA los dos — el back 400ea si
       * llegan juntos, y con razón: son dos formas de decir quién paga y
       * podrían contradecirse.
       */
      const res = await onSubmit({
        ...(cobroId ? { cobroId } : { tenantId: tenantId! }),
        valorCop: Math.round(monto),
        fecha,
        medio,
        ...(saludos.trim() ? { notas: saludos.trim() } : {}),
      });

      const numeros = res.recibos.map((r) => String(r.numero)).join(', ');
      toast.success(
        res.recibos.length > 1
          ? t('recibos.form.emitidoVarios', { numeros, count: res.recibos.length })
          : t('recibos.form.emitido', { numero: numeros }),
        {
          description:
            res.deudaRestante > 0
              ? t('recibos.form.emitidoQuedaSaldo', {
                  monto: formatCurrency(res.totalCop),
                  saldo: formatCurrency(res.deudaRestante),
                })
              : t('recibos.form.emitidoSinSaldo', { monto: formatCurrency(res.totalCop) }),
        },
      );
      cerrar();
    } catch (e) {
      /*
       * 🔴 409 = un período tiene plata registrada que nunca pasó por un
       * recibo. Le pasa a TODO cobro anterior al recibo de caja y a los de
       * PSE, así que sin esta rama el módulo no sirve sobre la cartera viva.
       * El back manda el `cobroId` del período trabado en el cuerpo.
       */
      if (e instanceof ApiError && e.status === 409) {
        const trabado =
          typeof e.detalle?.cobroId === 'string' ? e.detalle.cobroId : sinConciliar[0]?.id;
        if (trabado) {
          setConciliando({ cobroId: trabado, mensaje: e.message });
          setErrorDelBack(null);
          return;
        }
      }
      // El 400 del sobrepago trae el máximo: se muestra tal cual.
      setErrorDelBack(e instanceof Error ? e.message : t('recibos.form.fallo'));
    } finally {
      setEnviando(false);
    }
  }, [
    cerrar,
    cobroId,
    fecha,
    formatCurrency,
    medio,
    monto,
    onSubmit,
    puedeEnviar,
    saludos,
    sinConciliar,
    t,
    tenantId,
  ]);

  const conciliar = React.useCallback(async () => {
    if (!conciliando || !onConciliar) return;
    const limpio = origen.trim();
    if (limpio.length < ORIGEN_MINIMO) {
      setErrorDeConciliacion(t('recibos.conciliar.origenRequerido'));
      return;
    }
    setEnviandoConciliacion(true);
    setErrorDeConciliacion(null);
    try {
      const res = await onConciliar(conciliando.cobroId, { origen: limpio });
      toast.success(t('recibos.conciliar.conciliado'), {
        description: t('recibos.conciliar.conciliadoDesc', {
          numero: String(res.recibo.numero),
        }),
      });
      // Vuelve al formulario: la conciliación no es el trámite, es el permiso
      // para hacerlo. La cartera se relee porque ese período cambió de saldo.
      setConciliando(null);
      setOrigen('');
      await recargar();
    } catch (e) {
      setErrorDeConciliacion(e instanceof Error ? e.message : t('recibos.conciliar.fallo'));
    } finally {
      setEnviandoConciliacion(false);
    }
  }, [conciliando, onConciliar, origen, recargar, t]);

  const hayCartera = cartera !== null && cartera.total > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(abierto) => !abierto && cerrar()}>
      <DialogContent className="max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {t('recibos.form.titulo')}
          </DialogTitle>
          <DialogDescription>
            {cartera ? t('recibos.form.descripcion') : t('recibos.form.elegirClienteAyuda')}
          </DialogDescription>
        </DialogHeader>

        <>
          {/* 1. El cliente. Con cobro de entrada la persona ya está resuelta. */}
          {!cobroId && conciliando === null && (
            <ElegirCliente value={tenantId} onChange={setTenantId} />
          )}

          {/* 2. Su cartera */}
          {conciliando === null && cargando && (
            <div className="flex items-center gap-2 py-3 text-sm text-fg-muted" data-testid="cartera-cargando">
              <Spinner size="sm" variant="muted" />
              {t('recibos.form.cartera.cargando')}
            </div>
          )}

          {conciliando === null && !cargando && error !== null && (
            <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
              <p className="text-destructive">{error || t('recibos.form.cartera.fallo')}</p>
              <Button variant="secondary" size="sm" hideArrow onClick={() => void recargar()}>
                {t('recibos.form.cartera.reintentar')}
              </Button>
            </div>
          )}

          {conciliando === null && !cargando && cartera !== null && !hayCartera && (
            <div
              className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-fg-muted"
              data-testid="cliente-sin-deuda"
            >
              {t('recibos.form.cartera.sinDeuda', { nombre: cartera.nombre })}
            </div>
          )}

          {/* Conciliar la plata vieja (409) */}
          {conciliando !== null && (
            <div className="space-y-4" data-testid="panel-conciliacion">
              <Banner variant="warning" title={t('recibos.conciliar.titulo')}>
                {t('recibos.conciliar.porQue')}
              </Banner>

              {/* El mensaje del back, tal cual: trae la cifra que no cuadra. */}
              <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
                {conciliando.mensaje}
              </p>

              <p className="text-sm text-fg-muted">{t('recibos.conciliar.queVaAPasar')}</p>

              <div className="space-y-2">
                <label htmlFor="origen-conciliacion" className="text-sm font-medium text-foreground">
                  {t('recibos.conciliar.origenLabel')}
                </label>
                <Textarea
                  id="origen-conciliacion"
                  rows={2}
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                  placeholder={t('recibos.conciliar.origenPlaceholder')}
                  className="w-full resize-none"
                />
              </div>

              {errorDeConciliacion && <Banner variant="danger">{errorDeConciliacion}</Banner>}
            </div>
          )}

          {/* 3. El recibo */}
          {conciliando === null && hayCartera && cartera && (
            <form
              id={ID_FORM}
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                void emitir();
              }}
            >
              <CarteraDelClientePanel cartera={cartera} />

              {/* Cuánto va a pagar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="monto-recibo" className="text-sm font-medium text-foreground">
                    {t('recibos.form.montoLabel')}
                  </label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    hideArrow
                    className="h-auto p-0 text-xs"
                    onClick={() => setMonto(maximo)}
                  >
                    {t('recibos.form.abonarTodo')}
                  </Button>
                </div>
                <CurrencyInput
                  id="monto-recibo"
                  value={Number.isFinite(monto) ? monto : undefined}
                  onChange={(v) => {
                    setMonto(v);
                    setTocado(true);
                  }}
                  invalid={Boolean(errorDeMonto)}
                  className="h-12 text-lg font-semibold"
                />
                <p className="text-xs text-fg-muted">
                  {t('recibos.form.maximo', { monto: formatCurrency(maximo) })}
                </p>
                {errorDeMonto && <p className="text-xs text-destructive">{errorDeMonto}</p>}
              </div>

              {/* 🔴 A dónde va la plata. El punto del cambio entero. */}
              <PlanDeImputacion cartera={cartera} plan={plan} />
              <AvisoSinConciliar periodos={sinConciliar} />

              {/* Cómo pagó */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-foreground">
                  {t('recibos.form.medioLabel')}
                </span>
                <div className="flex flex-wrap gap-2">
                  {opcionesDeMedio.map((m) => {
                    const Icono = m.icono;
                    return (
                      <Chip
                        key={m.valor}
                        selected={medio === m.valor}
                        onClick={() => setMedio(m.valor)}
                        icon={<Icono className="h-4 w-4" />}
                      >
                        {m.etiqueta ?? t(m.clave!)}
                      </Chip>
                    );
                  })}
                </div>
                {tocado && !medio && (
                  <p className="text-xs text-destructive">{t('recibos.form.medioRequerido')}</p>
                )}
              </div>

              {/* Qué día entró */}
              <div className="space-y-2">
                <label
                  htmlFor="fecha-recibo"
                  className="flex items-center gap-2 text-sm font-medium text-foreground"
                >
                  <Calendar className="h-4 w-4 text-fg-muted" />
                  {t('recibos.form.fechaLabel')}
                </label>
                <Input
                  id="fecha-recibo"
                  type="date"
                  max={hoy}
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className={cn('w-full', tocado && !fecha ? 'border-destructive' : '')}
                />
                {tocado && !fecha && (
                  <p className="text-xs text-destructive">{t('recibos.form.fechaRequerida')}</p>
                )}
              </div>

              {/* Los saludos: el texto que sale impreso en el recibo */}
              <div className="space-y-2">
                <label
                  htmlFor="saludos-recibo"
                  className="flex items-center gap-2 text-sm font-medium text-foreground"
                >
                  <Note className="h-4 w-4 text-fg-muted" />
                  {t('recibos.form.saludosLabel')}
                  <span className="text-xs font-normal text-fg-muted">
                    ({t('recibos.form.opcional')})
                  </span>
                </label>
                <Textarea
                  id="saludos-recibo"
                  rows={2}
                  maxLength={LARGO_MAXIMO_DE_SALUDOS}
                  value={saludos}
                  onChange={(e) => setSaludos(e.target.value)}
                  placeholder={t('recibos.form.saludosPlaceholder')}
                  className="w-full resize-none"
                />
              </div>

              {/* El rechazo del back, tal cual */}
              {errorDelBack && (
                <Banner variant="danger" title={t('recibos.form.fallo')}>
                  {errorDelBack}
                </Banner>
              )}
            </form>
          )}
        </>

        {/* Pie fijo: en un modal alto los botones no se pueden ir con el scroll. */}
        {(hayCartera || conciliando !== null) && (
          <DialogFooter>
            {conciliando !== null ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={cerrar}
                  disabled={enviandoConciliacion}
                >
                  {t('recibos.conciliar.cancelar')}
                </Button>
                <Button
                  type="button"
                  hideArrow
                  onClick={conciliar}
                  disabled={
                    enviandoConciliacion || !onConciliar || origen.trim().length < ORIGEN_MINIMO
                  }
                  isLoading={enviandoConciliacion}
                >
                  {enviandoConciliacion
                    ? t('recibos.conciliar.conciliando')
                    : t('recibos.conciliar.confirmar')}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={cerrar} disabled={enviando}>
                  {t('recibos.form.cancelar')}
                </Button>
                {/* `form=` porque el pie vive FUERA del <form>: el DialogContent
                    reparte cabecera/cuerpo/pie y el pie no puede estar adentro. */}
                <Button
                  type="submit"
                  form={ID_FORM}
                  hideArrow
                  disabled={enviando || !puedeEnviar}
                  isLoading={enviando}
                >
                  <CurrencyCircleDollar className="h-4 w-4" />
                  {enviando ? t('recibos.form.emitiendo') : t('recibos.form.emitir')}
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RegistrarPagoModal;
