'use client';

/**
 * El formulario del RECIBO DE CAJA.
 *
 * El componente conserva el nombre viejo porque es su único callsite y
 * renombrar el archivo no le cambia nada al usuario; lo que cambió es lo que se
 * lee en pantalla y a dónde va la petición: ya no es «registrar pago» contra
 * `POST /cobros/:id/payment`, es emitir un recibo de caja contra
 * `POST /inmobiliaria/recibos-de-caja`, y cada abono parcial queda como un
 * documento propio.
 *
 * Tres cosas que este formulario tiene que hacer bien o no sirve:
 *
 * 1. 🔴 El desglose a la vista MIENTRAS se hace el recibo. Sin él, la persona de
 *    facturación acepta un abono parcial creyendo que el cliente quedó al día.
 *
 * 2. 🔴 El monto se lee con `CurrencyInput` de cadence, no con un `<input>` de
 *    texto parseado a mano. El parser anterior hacía
 *    `parseFloat('1.800.000'.replace(',', '.'))` → **1.8**: el campo venía
 *    prellenado con el saldo formateado en es-CL (punto de miles), así que
 *    «pago total» registraba un peso con ochenta. `CurrencyInput` guarda el
 *    valor como entero y sólo formatea para mostrar.
 *
 * 3. 🔴 Los rechazos del back se muestran TAL CUAL, no como «hubo un error»:
 *    el 400 del sobrepago trae el máximo abonable y el 409 dice que hay plata
 *    vieja sin conciliar. Tragarlos deja al usuario sin saber qué hacer.
 */

import * as React from 'react';
import { toast } from 'sonner';
import {
  Bank,
  Buildings,
  Calendar,
  CreditCard,
  CurrencyCircleDollar,
  DotsThree,
  FileText,
  MapPin,
  Money,
  Note,
  Receipt,
  User,
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
import { Banner, Chip, CurrencyInput } from '@leasefy/cadence';
import { ApiError } from '@/lib/api/client';
import type { Cobro } from '@/lib/types/inmobiliaria';
import type {
  ConciliacionDePagoAnterior,
  NuevoReciboDeCaja,
  RespuestaDeRecibo,
} from '@/lib/api/recibos-de-caja.types';
import { useDetalleDeCobro } from '@/lib/hooks/useDetalleDeCobro';
import { useMediosDePago } from '@/lib/hooks/use-medios-de-pago';
import { ICONO_DEL_TIPO } from './medios-de-pago/legible';
import { DesgloseAdeudado } from './DesgloseAdeudado';

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
  cobro: Cobro | null;
  /** Cobros entre los que elegir cuando no viene uno preseleccionado. */
  cobrosList?: Cobro[];
  /**
   * Emite el recibo.
   * 🔴 Tiene que RELANZAR el error: el 400 del sobrepago y el 409 del pago sin
   * conciliar se resuelven acá adentro, no con un toast genérico afuera.
   */
  onSubmit: (datos: NuevoReciboDeCaja) => Promise<RespuestaDeRecibo>;
  /** Concilia la plata vieja del cobro. También tiene que relanzar. */
  onConciliar?: (
    cobroId: string,
    datos: ConciliacionDePagoAnterior,
  ) => Promise<RespuestaDeRecibo>;
}

export function RegistrarPagoModal({
  isOpen,
  onClose,
  cobro: cobroPreseleccionado,
  cobrosList,
  onSubmit,
  onConciliar,
}: RegistrarPagoModalProps) {
  const { t, formatCurrency, formatDate } = useI18n();
  const { medios: mediosConfigurados } = useMediosDePago({ enabled: isOpen });
  const opcionesDeMedio = React.useMemo(() => mediosParaElegir(mediosConfigurados), [mediosConfigurados]);

  const hoy = React.useMemo(() => new Date().toISOString().split('T')[0], []);

  const [cobroElegidoId, setCobroElegidoId] = React.useState<string | null>(null);
  const cobro =
    cobroPreseleccionado ?? cobrosList?.find((c) => c.id === cobroElegidoId) ?? null;

  const [monto, setMonto] = React.useState<number>(NaN);
  const [medio, setMedio] = React.useState('');
  const [fecha, setFecha] = React.useState(hoy);
  const [referencia, setReferencia] = React.useState('');
  const [notas, setNotas] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);
  const [errorDelBack, setErrorDelBack] = React.useState<string | null>(null);
  const [tocado, setTocado] = React.useState(false);

  // Conciliación: se enciende con el 409 y guarda el mensaje del back tal cual.
  const [conciliando, setConciliando] = React.useState<string | null>(null);
  const [origen, setOrigen] = React.useState('');
  const [enviandoConciliacion, setEnviandoConciliacion] = React.useState(false);
  const [errorDeConciliacion, setErrorDeConciliacion] = React.useState<string | null>(null);

  const { detalle, conceptos, cargando, falloDesglose, recargar } = useDetalleDeCobro(
    cobro?.id ?? null,
    isOpen && cobro !== null,
  );

  /**
   * El cobro fresco manda sobre la fila de la lista: si otro usuario abonó hace
   * un minuto, el máximo abonable de la lista está viejo y el back rechazaría
   * un monto que la pantalla dio por bueno.
   */
  const cobroVigente = detalle?.id === cobro?.id && detalle ? detalle : cobro;
  const maximo = cobroVigente?.pendingAmount ?? 0;

  const montoValido = Number.isFinite(monto) && monto > 0;
  const seExcede = montoValido && monto > maximo;
  const restante = montoValido ? Math.max(0, maximo - monto) : maximo;

  const errorDeMonto = !tocado
    ? null
    : !Number.isFinite(monto) || monto === 0
      ? t('recibos.form.montoRequerido')
      : monto < 0
        ? t('recibos.form.montoPositivo')
        : seExcede
          ? t('recibos.form.montoExcede', { monto: formatCurrency(maximo) })
          : null;

  const puedeEnviar = montoValido && !seExcede && medio !== '' && fecha !== '';

  // Al cambiar de cobro, el formulario arranca de cero con el saldo del nuevo.
  React.useEffect(() => {
    if (!cobro) return;
    setMonto(cobro.pendingAmount > 0 ? cobro.pendingAmount : NaN);
    setMedio('');
    setFecha(hoy);
    setReferencia('');
    setNotas('');
    setErrorDelBack(null);
    setTocado(false);
    setConciliando(null);
    setOrigen('');
    setErrorDeConciliacion(null);
  }, [cobro?.id, hoy]); // eslint-disable-line react-hooks/exhaustive-deps

  const cerrar = React.useCallback(() => {
    setCobroElegidoId(null);
    setMonto(NaN);
    setMedio('');
    setReferencia('');
    setNotas('');
    setErrorDelBack(null);
    setTocado(false);
    setConciliando(null);
    setOrigen('');
    setErrorDeConciliacion(null);
    onClose();
  }, [onClose]);

  const emitir = React.useCallback(async () => {
    if (!cobro) return;
    setTocado(true);
    if (!puedeEnviar) return;

    setEnviando(true);
    setErrorDelBack(null);
    try {
      const res = await onSubmit({
        cobroId: cobro.id,
        valorCop: Math.round(monto),
        fecha,
        medio,
        ...(referencia.trim() ? { referencia: referencia.trim() } : {}),
        ...(notas.trim() ? { notas: notas.trim() } : {}),
      });

      const saldo = res.cobro.pendingAmount;
      toast.success(t('recibos.form.emitido', { numero: String(res.recibo.numero) }), {
        description:
          saldo > 0
            ? t('recibos.form.emitidoQuedaSaldo', {
                monto: formatCurrency(res.recibo.valorCop),
                saldo: formatCurrency(saldo),
              })
            : t('recibos.form.emitidoSinSaldo', { monto: formatCurrency(res.recibo.valorCop) }),
      });
      cerrar();
    } catch (error) {
      /*
       * 🔴 409 = el cobro tiene plata registrada que nunca pasó por un recibo.
       * Le pasa a TODO cobro anterior al recibo de caja y a los de PSE, así que
       * sin esta rama el módulo no sirve sobre la cartera viva: el usuario ve
       * un error que no puede resolver desde ningún lado.
       */
      if (error instanceof ApiError && error.status === 409) {
        setConciliando(error.message);
        setErrorDelBack(null);
      } else {
        // El 400 del sobrepago trae el máximo: se muestra tal cual.
        setErrorDelBack(error instanceof Error ? error.message : t('recibos.form.fallo'));
      }
    } finally {
      setEnviando(false);
    }
  }, [
    cerrar,
    cobro,
    fecha,
    formatCurrency,
    medio,
    monto,
    notas,
    onSubmit,
    puedeEnviar,
    referencia,
    t,
  ]);

  const conciliar = React.useCallback(async () => {
    if (!cobro || !onConciliar) return;
    const limpio = origen.trim();
    if (limpio.length < ORIGEN_MINIMO) {
      setErrorDeConciliacion(t('recibos.conciliar.origenRequerido'));
      return;
    }
    setEnviandoConciliacion(true);
    setErrorDeConciliacion(null);
    try {
      const res = await onConciliar(cobro.id, { origen: limpio });
      toast.success(t('recibos.conciliar.conciliado'), {
        description: t('recibos.conciliar.conciliadoDesc', {
          numero: String(res.recibo.numero),
        }),
      });
      // Vuelve al formulario: la conciliación no es el trámite, es el permiso
      // para hacerlo. El saldo ya viene recompuesto en la respuesta.
      setConciliando(null);
      setOrigen('');
      setMonto(res.cobro.pendingAmount > 0 ? res.cobro.pendingAmount : NaN);
      recargar();
    } catch (error) {
      setErrorDeConciliacion(
        error instanceof Error ? error.message : t('recibos.conciliar.fallo'),
      );
    } finally {
      setEnviandoConciliacion(false);
    }
  }, [cobro, onConciliar, origen, recargar, t]);

  const cobrosConSaldo = React.useMemo(
    () => (cobrosList ?? []).filter((c) => c.status !== 'paid' && c.pendingAmount > 0),
    [cobrosList],
  );
  const mostrarSelector = !cobroPreseleccionado && !cobro && cobrosList !== undefined;

  if (!cobro && !cobrosList) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(abierto) => !abierto && cerrar()}>
      <DialogContent className="max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Receipt className="h-5 w-5 text-primary" />
            {t('recibos.form.titulo')}
          </DialogTitle>
          <DialogDescription>
            {cobro
              ? `${cobro.propertyTitle} · ${cobro.tenantName}`
              : t('recibos.form.elegirCobroAyuda')}
          </DialogDescription>
        </DialogHeader>

        {/* ── Elegir contra cuál cobro ─────────────────────────────────── */}
        <>
          {mostrarSelector && (
            <div className="space-y-3">
              <p className="text-sm text-fg-muted">{t('recibos.form.elegirCobroAyuda')}</p>
              <div
                className="max-h-64 space-y-2 overflow-y-auto"
                data-lenis-prevent
                style={{ overscrollBehavior: 'contain' }}
              >
                {cobrosConSaldo.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-fg-muted">
                    {t('recibos.form.sinCobros')}
                  </div>
                ) : (
                  cobrosConSaldo.map((c) => (
                    // allowlist: fila de lista rica (inmueble + inquilino + saldo)
                    // como UN solo objetivo de clic — Button no puede hospedarla.
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCobroElegidoId(c.id)}
                      className="w-full rounded-lg border border-border bg-background p-3 text-left transition-all hover:border-foreground/30"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {c.propertyTitle}
                          </p>
                          <p className="truncate text-xs text-fg-muted">{c.tenantName}</p>
                        </div>
                        <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-warning">
                          {formatCurrency(c.pendingAmount)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Conciliar la plata vieja (409) ───────────────────────────── */}
          {cobro && conciliando !== null && (
            <div className="space-y-4" data-testid="panel-conciliacion">
              <Banner variant="warning" title={t('recibos.conciliar.titulo')}>
                {t('recibos.conciliar.porQue')}
              </Banner>

              {/* El mensaje del back, tal cual: trae la cifra que no cuadra. */}
              <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
                {conciliando}
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

          {/* ── El recibo ────────────────────────────────────────────────── */}
          {cobro && conciliando === null && (
            <form
              id={ID_FORM}
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                void emitir();
              }}
            >
              <p className="text-sm text-fg-muted">{t('recibos.form.descripcion')}</p>

              {/* Inmueble e inquilino */}
              <div className="flex gap-4 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Buildings className="h-6 w-6 text-fg-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-medium text-foreground">
                    {cobro.propertyTitle}
                  </h4>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-fg-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {cobro.propertyAddress}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-muted">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    {cobro.tenantName}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {formatDate(new Date(cobro.dueDate), { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>

              {/* 🔴 El desglose acá adentro es el punto de todo el cambio. */}
              <DesgloseAdeudado
                cobro={cobroVigente ?? cobro}
                conceptos={conceptos}
                cargando={cargando}
                fallo={falloDesglose}
                onReintentar={recargar}
              />

              {/* Monto */}
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

              {/* Qué queda después de este abono */}
              {montoValido && !seExcede && (
                <Banner variant={restante > 0 ? 'warning' : 'success'}>
                  {restante > 0
                    ? t('recibos.form.quedaPendiente', { monto: formatCurrency(restante) })
                    : t('recibos.form.quedaEnCero')}
                </Banner>
              )}

              {/* Medio */}
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

              {/* Fecha */}
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

              {/* Referencia */}
              <div className="space-y-2">
                <label
                  htmlFor="referencia-recibo"
                  className="flex items-center gap-2 text-sm font-medium text-foreground"
                >
                  <Receipt className="h-4 w-4 text-fg-muted" />
                  {t('recibos.form.referenciaLabel')}
                  <span className="text-xs font-normal text-fg-muted">
                    ({t('recibos.form.opcional')})
                  </span>
                </label>
                <Input
                  id="referencia-recibo"
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder={t('recibos.form.referenciaPlaceholder')}
                  className="w-full"
                />
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <label
                  htmlFor="notas-recibo"
                  className="flex items-center gap-2 text-sm font-medium text-foreground"
                >
                  <Note className="h-4 w-4 text-fg-muted" />
                  {t('recibos.form.notasLabel')}
                  <span className="text-xs font-normal text-fg-muted">
                    ({t('recibos.form.opcional')})
                  </span>
                </label>
                <Textarea
                  id="notas-recibo"
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder={t('recibos.form.notasPlaceholder')}
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
        {cobro && (
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
