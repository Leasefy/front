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
 * ── La corrección del 2026-09-15 ────────────────────────────────────────────
 * Este diálogo decía «no debe nada» con el contrato vigente y no ofrecía forma
 * de adelantar. Nico:
 *
 *   «¿Por qué sigue apareciendo acá que no debe? Desde que él comience el
 *    contrato ya debe. No tienes que esperar que se cumpla la fecha.»
 *   «El puede hasta adelantar dinero sobre el contrato que tiene y pagar dos
 *    meses o lo que sea, para bajarle a lo adeudado.»
 *
 * Tres consecuencias acá adentro:
 *   · la deuda se muestra PARTIDA (vencido / todavía no vence) y el monto se
 *     prellena con lo VENCIDO, no con la deuda entera del contrato — que puede
 *     ser un año de canon y nadie lo recibe de una;
 *   · se puede emitir aunque no haya nada vencido: eso es ADELANTAR, y hay un
 *     atajo para pagar toda la deuda cuando se quiere;
 *   · «no debe nada» sólo aparece cuando no queda ninguna cuota pendiente.
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
 * 5. 🔴 (2026-09-16) La FECHA manda sobre la vista previa. El interés de mora
 *    se liquida hasta el día del recibo, así que al cambiar «¿Qué día entró?»
 *    la cartera se vuelve a pedir con esa fecha (`useCarteraDelCliente`) y no
 *    se emite mientras los números a la vista sean de otro día. Prueba en vivo
 *    en QA, contrato #69: con la fecha en 2026-08-20 el diálogo seguía
 *    mostrando el interés de hoy.
 *
 * 6. 🔴 (2026-09-16, tarde) La fecha NO tiene piso. Nico y Juan Camilo: «¡No!
 *    El recibo de caja debe quedar con la fecha en la que se recibió». El
 *    campo acepta cualquier día pasado; sólo el futuro sigue cerrado.
 *
 * 7. 🔴 (2026-09-16, tarde) Cuando el monto alcanza cuotas que todavía no
 *    vencen, caja ELIGE la forma del adelanto (Juan Camilo): registrarlo todo
 *    ya —abona a esas cuotas— o dejarlo como anticipo del contrato, que se
 *    descuenta con un recibo el día de pago de cada mes. Se pregunta sólo si
 *    el back puede guardar el anticipo (`anticipoDelContratoDisponible`); si
 *    no, el pago se registra como siempre y no hay nada que elegir.
 *
 * ⚠️ Decisión de producto tomada al pie de la letra: el campo REFERENCIA salió
 * del formulario. Nico enumeró los campos y cerró con «y nada más». El back lo
 * sigue aceptando (lo usa la conciliación bancaria), así que devolverlo es
 * agregar el input de vuelta; no hay nada más que deshacer.
 */

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
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
import { generarIdempotencyKey } from '@/lib/contratos/idempotencia';
import { SinDatos } from '@/components/estado/SinDatos';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import type { Cobro } from '@/lib/types/inmobiliaria';
import type {
  ConciliacionDePagoAnterior,
  FormaDelAdelanto,
  NuevoReciboPorCliente,
  RespuestaDeRecibo,
  RespuestaDeReciboPorCliente,
} from '@/lib/api/recibos-de-caja.types';
import {
  mesesQueSeAdelantan,
  seOfreceElegirLaForma,
  type MesQueSeAdelanta,
} from '@/lib/recibos/forma-del-adelanto';
import { nombreDelMes } from '@/lib/utils/mes';
import { useMediosDePago } from '@/lib/hooks/use-medios-de-pago';
import { finanzasApi } from '@/lib/api/finanzas.service';
import { sinLosApagados } from '@/lib/finanzas/medios';
import {
  faltaElPagador,
  PAGA_EL_CLIENTE,
  pagadorParaElBack,
  QuienPaga,
  type QuienPagaValor,
} from './aseguradoras/QuienPaga';
import { ICONO_DEL_TIPO } from './medios-de-pago/legible';
import {
  AvisoSinConciliar,
  CarteraDelClientePanel,
  ElegirCliente,
  PlanDeImputacion,
  periodosSinConciliar,
  soloSePuedeAdelantar,
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
 * hay ninguno, la lista fija de arriba.
 *
 * 🔴 QA 22-09 (P0): el valor que viajaba era el NOMBRE del medio. «Efectivo en
 * la oficina» llegaba al back como `EFECTIVO_EN_LA_OFICINA`, que no está en la
 * lista de apagados, y el recibo en efectivo entraba aunque la regla de la
 * inmobiliaria diga «sólo transferencia y pasarela». Ahora:
 *   · lo que viaja en `medio` es el TIPO (`codigo`), que es lo que la regla
 *     juzga; el nombre que la persona de caja reconoce va en las notas;
 *   · los medios cuyo tipo la inmobiliaria APAGÓ no se ofrecen (`apagados`,
 *     de `GET /inmobiliaria/finanzas/medios`). Sin esa lista —no se pudo leer—
 *     no se filtra: el back rechaza igual lo apagado, con el motivo.
 * `valor` es sólo la identidad del chip: dos cuentas de transferencia son dos
 * chips con el mismo código.
 */
export function mediosParaElegir(
  configurados: { nombre: string; tipo: keyof typeof ICONO_DEL_TIPO; activo: boolean }[] | null | undefined,
  apagados: readonly string[] = [],
): {
  valor: string;
  codigo: string;
  /** El nombre configurado, para las notas del recibo. `null` en la lista fija. */
  nombre: string | null;
  etiqueta: string | null;
  clave: string | null;
  icono: typeof Bank;
}[] {
  const activos = (configurados ?? []).filter((m) => m.activo);
  if (activos.length === 0) {
    return sinLosApagados(
      MEDIOS.map((m) => ({ valor: m.valor, codigo: m.valor, nombre: null, etiqueta: null, clave: m.clave, icono: m.icono })),
      (m) => m.codigo,
      apagados,
    );
  }
  return sinLosApagados(
    activos.map((m) => ({
      valor: `${m.tipo}|${m.nombre.trim()}`,
      codigo: m.tipo,
      nombre: m.nombre.trim().slice(0, LARGO_MAXIMO_DEL_MEDIO),
      etiqueta: m.nombre,
      clave: null,
      icono: ICONO_DEL_TIPO[m.tipo] ?? DotsThree,
    })),
    (m) => m.codigo,
    apagados,
  );
}

/**
 * «octubre de 2026, noviembre de 2026 y parte de diciembre de 2026»: los meses
 * que el adelanto alcanza, como los lee quien está en caja.
 */
export function mesesEnPalabras(
  meses: readonly MesQueSeAdelanta[],
  idioma: 'es' | 'en',
  parteDe: (mes: string) => string,
): string {
  const nombres = meses.map((m) =>
    m.completo ? nombreDelMes(m.month, idioma) : parteDe(nombreDelMes(m.month, idioma)),
  );
  if (nombres.length <= 1) return nombres.join('');
  const y = idioma === 'en' ? ' and ' : ' y ';
  return `${nombres.slice(0, -1).join(', ')}${y}${nombres[nombres.length - 1]}`;
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
  const { t, formatCurrency, locale } = useI18n();
  const idioma = locale === 'en' ? 'en' : 'es';
  const { medios: mediosConfigurados } = useMediosDePago({ enabled: isOpen });
  // Qué tipos apagó la inmobiliaria. Falla ABIERTO: sin la lista (sin permiso
  // de configuración, red caída) no se filtra y el back decide.
  const [apagados, setApagados] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (!isOpen) return;
    let vivo = true;
    finanzasApi
      .medios()
      .then((r) => {
        if (vivo) setApagados(r.apagados ?? []);
      })
      .catch(() => {
        if (vivo) setApagados([]);
      });
    return () => {
      vivo = false;
    };
  }, [isOpen]);
  const opcionesDeMedio = React.useMemo(
    () => mediosParaElegir(mediosConfigurados, apagados),
    [mediosConfigurados, apagados],
  );

  /**
   * Hoy EN BOGOTÁ, no en UTC.
   *
   * 🔴 `new Date().toISOString().split('T')[0]` es la fecha UTC: a las 7 de la
   * tarde en Colombia ya es el día siguiente en UTC, así que «qué día entró»
   * venía prellenado con MAÑANA —y el `max` del campo dejaba elegirlo—. Visto
   * en el navegador a las 19:03: el recibo salió fechado el 13 de septiembre.
   * Es el mismo criterio de `mesActual` en `lib/recaudo/meses.ts` y el mismo
   * que usa el back cuando no le mandan fecha.
   */
  const hoy = React.useMemo(
    () =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()),
    [],
  );

  const [tenantId, setTenantId] = React.useState<string | null>(null);
  const [monto, setMonto] = React.useState<number>(NaN);
  /**
   * 🔴 QA 22-09: con un dedo de más el campo quedó en $7.480.366.500.000, el
   * diálogo dijo «superan TODA la deuda… quedan a su favor» y dejó pulsar
   * «Emitir». Pagar de más es legítimo (CEO, 15-09) y no se le pone un tope
   * inventado; lo que no puede pasar es que ocurra sin que nadie lo decida.
   * Guarda el monto que se confirmó: si el monto cambia, la confirmación se va.
   */
  const [aFavorConfirmado, setAFavorConfirmado] = React.useState<number | null>(null);
  const [medio, setMedio] = React.useState('');
  const [fecha, setFecha] = React.useState(hoy);
  const [saludos, setSaludos] = React.useState('');
  const opcionElegida = opcionesDeMedio.find((m) => m.valor === medio) ?? null;
  /*
   * El nombre del medio configurado («Cuenta Bancolombia 1234») va a las notas:
   * `medio` ya es el tipo, y sin esto el recibo perdería por cuál de las dos
   * cuentas de transferencia entró la plata.
   */
  const prefijoDelMedio = opcionElegida?.nombre ? `Medio: ${opcionElegida.nombre}` : null;
  // El back topa las notas en 380: lo que ocupa el nombre se le descuenta al campo.
  const largoDeLosSaludos = LARGO_MAXIMO_DE_SALUDOS - (prefijoDelMedio ? prefijoDelMedio.length + 3 : 0);
  const notasDelRecibo = [prefijoDelMedio, saludos.trim().slice(0, largoDeLosSaludos) || null]
    .filter(Boolean)
    .join(' · ');
  /** La forma del adelanto que eligió caja. Sólo viaja si se le preguntó. */
  const [forma, setForma] = React.useState<FormaDelAdelanto>('ABONAR_A_LAS_CUOTAS');
  /** 🔴 D11: quién paga. Casi siempre el cliente; a veces una aseguradora (siniestro). */
  const [quienPaga, setQuienPaga] = React.useState<QuienPagaValor>(PAGA_EL_CLIENTE);
  const [enviando, setEnviando] = React.useState(false);
  const [errorDelBack, setErrorDelBack] = React.useState<string | null>(null);
  /** El rótulo del banner de error: los 409 de configuración no son «no se emitió». */
  const [tituloDelError, setTituloDelError] = React.useState<string | null>(null);
  const [tocado, setTocado] = React.useState(false);

  /*
   * 🔴 La fecha con la que se pide la VISTA PREVIA (2026-09-16). No es `fecha`
   * a secas: mientras la persona escribe, o si elige un día fuera de rango, la
   * cartera no se vuelve a pedir — se queda la del último día válido y el
   * campo dice qué pasa. `null` = hoy.
   */
  const [fechaDeLaVistaPrevia, setFechaDeLaVistaPrevia] = React.useState<string | null>(null);

  /**
   * De dónde salió el monto, para saber si sigue a la cartera cuando cambia la
   * fecha. 🔴 «Paga toda la deuda» con una fecha pasada mandaba el total de HOY,
   * que trae más interés del que el recibo cobra: un 400, o un saldo a favor que
   * nadie quiso. Si el monto lo puso un atajo, se recalcula con la cartera
   * nueva; si lo escribió la persona, no se toca.
   */
  const origenDelMonto = React.useRef<'vencido' | 'todo' | 'manual'>('manual');

  /*
   * 🔴 R1: UNA llave por apertura del formulario.
   *
   * Sin llave, un timeout seguido de «Emitir» otra vez dejaba DOS juegos de
   * recibos: el primero sí había entrado, sólo que la respuesta no llegó. Con
   * la misma llave el servidor devuelve el recibo de la primera vez.
   *
   * Por eso se REUSA al reintentar tras un fallo —aunque se haya cambiado el
   * monto: si el primero entró, emitir otro con llave nueva es justo el
   * duplicado— y se descarta sólo cuando el recibo salió o el modal se cierra.
   */
  const llaveDelRecibo = React.useRef<string | null>(null);
  React.useEffect(() => {
    llaveDelRecibo.current = isOpen ? generarIdempotencyKey() : null;
  }, [isOpen]);
  const llaveDeEsteRecibo = React.useCallback(() => {
    if (!llaveDelRecibo.current) llaveDelRecibo.current = generarIdempotencyKey();
    return llaveDelRecibo.current;
  }, []);

  // Conciliación: se enciende con el 409 y guarda el mensaje del back tal cual.
  const [conciliando, setConciliando] = React.useState<
    { cobroId: string; mensaje: string } | null
  >(null);
  const [origen, setOrigen] = React.useState('');
  const [enviandoConciliacion, setEnviandoConciliacion] = React.useState(false);
  const [errorDeConciliacion, setErrorDeConciliacion] = React.useState<string | null>(null);

  const cobroId = cobroDeEntrada?.id ?? null;
  const {
    cartera,
    cargando,
    recalculando,
    error,
    errorDeLaFecha,
    fechaDeLaCartera,
    cargaDeLaPersona,
    recargar,
  } = useCarteraDelCliente(tenantId, cobroId, isOpen, fechaDeLaVistaPrevia);
  const plan = usePlanDeImputacion(cartera, monto);
  const sinConciliar = React.useMemo(
    () => periodosSinConciliar(cartera, plan),
    [cartera, plan],
  );
  /**
   * 🔴 Lo que el pago le abona a cuotas que todavía no vencen, y si hay que
   * preguntar cómo registrarlo. Con la forma (b) esas cuotas NO bajan: la plata
   * queda como anticipo del contrato y el back la descuenta el día de pago.
   */
  const adelanto = React.useMemo(() => mesesQueSeAdelantan(cartera, plan), [cartera, plan]);
  const ofrecerForma = seOfreceElegirLaForma(cartera, plan);
  const mesesDelAdelanto = mesesEnPalabras(adelanto.meses, idioma, (mes) =>
    t('recibos.form.forma.parteDe', { mes }),
  );

  /**
   * El tope es TODA la deuda del contrato: lo vencido más lo que no vence.
   * Adelantar es abonar a esas cuotas futuras, así que toparlo en lo vencido
   * sería prohibir justo lo que el CEO pidió habilitar.
   */
  const maximo = cartera?.total ?? 0;
  /** Lo que la inmobiliaria reclama HOY. Es el default del campo. */
  const vencido = cartera?.vencidoCop ?? 0;
  const futuro = cartera?.futuroCop ?? 0;
  const sePuedeAdelantar = soloSePuedeAdelantar(cartera);
  const montoValido = Number.isFinite(monto) && monto > 0;
  /*
   * 🔴 Pagar de MÁS dejó de ser un error (CEO, 2026-09-15): «yo le pude haber
   * hecho un recibo de caja de 15 millones y los 15 los concilio con los
   * meses». Lo que sobra queda a favor del cliente y se consume solo.
   *
   * Sigue siendo un error cuando la base no tiene la migración del anticipo
   * (`anticipoDisponible: false`): ahí el back responde 400 y topar el monto
   * acá es decírselo antes de que pierda el formulario lleno.
   */
  const puedeGuardarAFavor = cartera?.anticipoDisponible === true;
  const excedente = montoValido ? Math.max(0, monto - maximo) : 0;
  // 🔴 D11: la plata de una aseguradora nunca queda a favor del inquilino.
  const seExcede = excedente > 0 && (!puedeGuardarAFavor || quienPaga.tipo === 'ASEGURADORA');

  const errorDeMonto = !tocado
    ? null
    : !Number.isFinite(monto) || monto === 0
      ? t('recibos.form.montoRequerido')
      : monto < 0
        ? t('recibos.form.montoPositivo')
        : seExcede
          ? t('recibos.form.montoExcede', { monto: formatCurrency(maximo) })
          : null;

  /**
   * Qué le pasa al día elegido, antes de preguntarle nada al servidor.
   *
   * 🔴 Ya no hay «antes del piso» (2026-09-16): «el recibo de caja debe quedar
   * con la fecha en la que se recibió». Hasta ese día el campo no dejaba fechar
   * antes del 1.º del período vencido más viejo, y ese piso era artificial: la
   * plata del 28 de julio entró el 28 de julio. Lo único cerrado es el futuro,
   * que es también lo único que el back rechaza (`FECHA_FUTURA`).
   */
  const problemaDeLaFecha: 'vacia' | 'futura' | null =
    fecha === '' ? 'vacia' : fecha > hoy ? 'futura' : null;

  /*
   * La vista previa sigue a la fecha sólo cuando la fecha es válida. Un día
   * fuera de rango no se pregunta: el campo ya sabe decir por qué no sirve.
   */
  React.useEffect(() => {
    if (problemaDeLaFecha !== null) return;
    setFechaDeLaVistaPrevia(fecha === hoy ? null : fecha);
  }, [fecha, hoy, problemaDeLaFecha]);

  /**
   * 🔴 ¿Lo que se ve es la cartera del día elegido? Mientras la nueva no llega
   * (la espera de la fecha, o la petición en camino) los números a la vista son
   * de OTRO día: se muestran —sin parpadear— pero no se emite con ellos.
   */
  const fechaElegida = problemaDeLaFecha === null ? (fecha === hoy ? null : fecha) : undefined;
  const carteraAlDia =
    fechaElegida !== undefined &&
    fechaDeLaCartera === fechaElegida &&
    fechaDeLaVistaPrevia === fechaElegida &&
    !recalculando;

  const puedeEnviar =
    cartera !== null &&
    // Sin deuda se puede recibir plata SÓLO si hay dónde guardarla a favor.
    (cartera.total > 0 || puedeGuardarAFavor) &&
    montoValido &&
    !seExcede &&
    (excedente === 0 || aFavorConfirmado === monto) &&
    medio !== '' &&
    !faltaElPagador(quienPaga) &&
    problemaDeLaFecha === null &&
    carteraAlDia &&
    errorDeLaFecha === null;

  /**
   * Al cambiar de cliente, el formulario arranca con lo VENCIDO.
   *
   * 🔴 Antes arrancaba con `cartera.total`, y eso servía mientras la cartera
   * eran sólo los cobros emitidos. Desde que la deuda se lee del contrato, el
   * total puede ser un año entero de canon: prellenarlo es ofrecerle a la
   * persona de caja un recibo por $24 M que nadie va a pagar de una. Lo que se
   * recibe normalmente es lo vencido; adelantar es una decisión explícita y
   * tiene su propio atajo («Paga toda la deuda»).
   *
   * Sin nada vencido el campo queda VACÍO: el monto de un adelanto no lo
   * adivina la pantalla, lo dice quien trae la plata.
   *
   * 🔴 (2026-09-16) «Al cambiar de cliente» quiere decir eso y nada más: una
   * carga de PERSONA (`cargaDeLaPersona`). Antes el reinicio colgaba de
   * `cartera.total`, y desde que la cartera se vuelve a pedir con la fecha, el
   * total cambia con cada fecha: el formulario se borraba y la fecha volvía a
   * hoy — que pedía otra cartera, que volvía a borrar. Con la misma persona y
   * otros números (otra fecha, o después de conciliar) sólo se mueve el monto
   * que puso un atajo.
   */
  const personaAtendida = React.useRef(-1);
  React.useEffect(() => {
    if (!cartera) return;
    const vencidoDeLaCartera = cartera.vencidoCop ?? 0;
    if (personaAtendida.current !== cargaDeLaPersona) {
      personaAtendida.current = cargaDeLaPersona;
      origenDelMonto.current = vencidoDeLaCartera > 0 ? 'vencido' : 'manual';
      setMonto(vencidoDeLaCartera > 0 ? vencidoDeLaCartera : NaN);
      setMedio('');
      setFecha(hoy);
      setFechaDeLaVistaPrevia(null);
      setSaludos('');
      setForma('ABONAR_A_LAS_CUOTAS');
      setQuienPaga(PAGA_EL_CLIENTE);
      setErrorDelBack(null);
      setTituloDelError(null);
      setTocado(false);
      setConciliando(null);
      setOrigen('');
      setErrorDeConciliacion(null);
      return;
    }
    if (origenDelMonto.current === 'vencido') {
      setMonto(vencidoDeLaCartera > 0 ? vencidoDeLaCartera : NaN);
    } else if (origenDelMonto.current === 'todo') {
      setMonto(cartera.total);
    }
  }, [cartera, cargaDeLaPersona, hoy]);

  const cerrar = React.useCallback(() => {
    llaveDelRecibo.current = null;
    setTenantId(null);
    setMonto(NaN);
    origenDelMonto.current = 'manual';
    setMedio('');
    setFecha(hoy);
    setFechaDeLaVistaPrevia(null);
    setSaludos('');
    setForma('ABONAR_A_LAS_CUOTAS');
    setQuienPaga(PAGA_EL_CLIENTE);
    setErrorDelBack(null);
    setTituloDelError(null);
    setTocado(false);
    setConciliando(null);
    setOrigen('');
    setErrorDeConciliacion(null);
    onClose();
  }, [hoy, onClose]);

  const emitir = React.useCallback(async () => {
    setTocado(true);
    if (!puedeEnviar) return;

    setEnviando(true);
    setErrorDelBack(null);
    setTituloDelError(null);
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
        // El TIPO, no el nombre: es lo que juzga la regla de medios (QA 22-09).
        medio: opcionElegida?.codigo ?? medio,
        ...(notasDelRecibo ? { notas: notasDelRecibo } : {}),
        idempotencyKey: llaveDeEsteRecibo(),
        // Sólo si se le preguntó a caja: si no, el back abona a las cuotas.
        // 🔴 D11: la plata de una aseguradora no queda como anticipo.
        ...(ofrecerForma && quienPaga.tipo === 'CLIENTE' ? { formaDelAdelanto: forma } : {}),
        ...(pagadorParaElBack(quienPaga) ? { pagador: pagadorParaElBack(quienPaga) } : {}),
      });

      // Salió: el próximo recibo es otro y lleva otra llave.
      llaveDelRecibo.current = null;

      const numeros = res.recibos.map((r) => String(r.numero)).join(', ');
      const anticipo = res.anticipoDelContratoCop ?? 0;
      const saldo =
        res.deudaRestante > 0
          ? t('recibos.form.emitidoQuedaSaldo', {
              monto: formatCurrency(res.totalCop),
              saldo: formatCurrency(res.deudaRestante),
            })
          : t('recibos.form.emitidoSinSaldo', { monto: formatCurrency(res.totalCop) });
      /*
       * 🔴 (2026-09-16) Qué quedó facturado: la factura de cada mes que tocó el
       * pago, generada y pendiente de emitir ante la DIAN (o ya emitida), con lo
       * que le falta. Nada se numera al recibir.
       */
      const facturas = res.facturas ?? [];
      const pendientesDeEmitir = facturas.filter((f) => f.estado === 'GENERADA');
      const lineaDeFacturas =
        facturas.length === 0
          ? ''
          : ` ${t('recibos.form.facturasDelPago', {
              meses: facturas.map((f) => nombreDelMes(f.mes, idioma)).join(', '),
              saldo: formatCurrency(facturas.reduce((s, f) => s + f.saldoCop, 0)),
            })}${pendientesDeEmitir.length > 0 ? ` ${t('recibos.form.facturasSinEmitir')}` : ''}`;
      // Los intereses pagados con la factura del mes ya emitida: factura aparte.
      const deIntereses = facturas.flatMap((f) => f.facturasDeIntereses ?? []);
      const lineaDeIntereses =
        deIntereses.length > 0
          ? ` ${t('recibos.form.facturaDeIntereses', {
              valor: formatCurrency(deIntereses.reduce((s, f) => s + f.totalCop, 0)),
            })}`
          : '';
      // Un desfase de hasta $1.000 no abona ni queda como anticipo: se dice.
      const lineaDelAjuste =
        (res.ajusteAlPesoCop ?? 0) > 0
          ? ` ${t('recibos.form.ajusteAlPeso', { valor: formatCurrency(res.ajusteAlPesoCop ?? 0) })}`
          : '';
      toast.success(
        // Con la forma (b) y nada vencido no sale ningún recibo hoy: sale el anticipo.
        res.recibos.length === 0 && anticipo > 0
          ? t('recibos.form.anticipoRegistrado')
          : res.recibos.length > 1
            ? t('recibos.form.emitidoVarios', { numeros, count: res.recibos.length })
            : t('recibos.form.emitido', { numero: numeros }),
        {
          description:
            (anticipo > 0
              ? `${saldo} ${t('recibos.form.emitidoConAnticipo', { anticipo: formatCurrency(anticipo) })}`
              : saldo) +
            lineaDelAjuste +
            lineaDeFacturas +
            lineaDeIntereses,
        },
      );
      cerrar();
    } catch (e) {
      /*
       * 🔴 `PLATA_SIN_RECIBO` (409): un período tiene plata registrada que
       * nunca pasó por un recibo. Le pasa a TODO cobro anterior al recibo de
       * caja y a los de PSE, así que sin esta rama el módulo no sirve sobre la
       * cartera viva. El back manda el `cobroId` del período trabado.
       *
       * 🔴 Se exige el CÓDIGO y no sólo el 409: desde el 2026-09-15 hay tres
       * conflictos distintos en este endpoint (`PLATA_SIN_RECIBO`,
       * `DEUDA_MAS_VIEJA` y `CONTRATO_SIN_MANDATO`), y el atajo viejo
       * —«409 y algún período sin conciliar a mano»— mandaba los otros dos al
       * panel de conciliación, que no arregla ninguno de los dos. Un back
       * anterior que no manda `code` sigue entrando por el `cobroId` del
       * cuerpo, que sólo `PLATA_SIN_RECIBO` trae.
       */
      if (e instanceof ApiError && e.status === 409) {
        const esPlataSinRecibo =
          e.code === 'PLATA_SIN_RECIBO' || (!e.code && typeof e.detalle?.cobroId === 'string');
        const trabado =
          typeof e.detalle?.cobroId === 'string' ? e.detalle.cobroId : sinConciliar[0]?.id;
        if (esPlataSinRecibo && trabado) {
          setConciliando({ cobroId: trabado, mensaje: e.message });
          setErrorDelBack(null);
          return;
        }
      }
      /*
       * El resto se muestra TAL CUAL, con su título propio:
       *   · 400 del sobrepago → trae el máximo abonable;
       *   · 409 `DEUDA_MAS_VIEJA` → dice cuánto y de qué inmueble es la deuda
       *     que va primero;
       *   · 409 `CONTRATO_SIN_MANDATO` → el inmueble no tiene mandato y el
       *     recibo necesita uno para poder emitir el documento. Es un problema
       *     de configuración, no del pago, y por eso se rotula distinto: quien
       *     está en caja tiene que saber que la salida es asignar el mandato.
       *   · 409 `CUOTA_Y_COBRO_NO_CUADRAN` (2026-09-16) → los DOCUMENTOS del
       *     período no cuadran: dos cobros para el mismo mes, un cobro de otro
       *     contrato del inmueble (cambio de inquilino), o una cuota con plata
       *     que el cobro no conoce. No es el pago ni la persona, y un «no se
       *     emitió» genérico hace pensar que reintentar sirve. El back manda el
       *     `message` ya escrito para caja (mes, de quién es, qué hacer, sin
       *     ids) y trae `cobroId` en el cuerpo: por eso el chequeo de arriba
       *     exige el CÓDIGO, si no este 409 caería al panel de conciliación.
       */
      const sinMandato = e instanceof ApiError && e.code === 'CONTRATO_SIN_MANDATO';
      const noCuadran = e instanceof ApiError && e.code === 'CUOTA_Y_COBRO_NO_CUADRAN';
      setTituloDelError(
        sinMandato
          ? t('recibos.form.sinMandato')
          : noCuadran
            ? t('recibos.form.cuotaYCobroNoCuadran')
            : null,
      );
      setErrorDelBack(e instanceof Error ? e.message : t('recibos.form.fallo'));
    } finally {
      setEnviando(false);
    }
  }, [
    cerrar,
    cobroId,
    fecha,
    forma,
    formatCurrency,
    idioma,
    llaveDeEsteRecibo,
    medio,
    monto,
    notasDelRecibo,
    opcionElegida,
    ofrecerForma,
    onSubmit,
    puedeEnviar,
    quienPaga,
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

  /*
   * Con qué se dibuja el formulario.
   *
   * `cartera.total` ya incluye las cuotas que todavía no vencen, así que un
   * contrato vigente SIEMPRE llega acá con deuda y el formulario se dibuja:
   * adelantar es abonarle a esas cuotas, no un saldo a favor. El
   * `anticipoDisponible` quedó para el único caso que sobrevive —plata que no
   * calza con ningún contrato— y es lo que deja recibir con la deuda en cero.
   */
  const hayCartera =
    cartera !== null && (cartera.total > 0 || cartera.anticipoDisponible === true);

  return (
    <Dialog open={isOpen} onOpenChange={(abierto) => !abierto && cerrar()}>
      <DialogContent className="max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {t('recibos.form.titulo')}
          </DialogTitle>
          <DialogDescription>
            {/* Sin nada vencido el encabezado deja de prometer un cobro y
                nombra lo que de verdad se puede hacer: adelantar. */}
            {!cartera
              ? t('recibos.form.elegirClienteAyuda')
              : sePuedeAdelantar
                ? t('recibos.form.descripcionAdelanto')
                : t('recibos.form.descripcion')}
          </DialogDescription>
        </DialogHeader>

        <>
          {/* 1. El cliente. Con cobro de entrada la persona ya está resuelta. */}
          {!cobroId && conciliando === null && (
            <ElegirCliente
              value={tenantId}
              onChange={(id) => {
                // Otra persona arranca de cero y a hoy, como cualquier recibo.
                setTenantId(id);
                setFecha(hoy);
                setFechaDeLaVistaPrevia(null);
              }}
            />
          )}

          {/* 2. Su cartera */}
          {conciliando === null && cargando && (
            <div className="flex items-center gap-2 py-3 text-sm text-fg-muted" data-testid="cartera-cargando">
              <Spinner size="sm" variant="muted" />
              {t('recibos.form.cartera.cargando')}
            </div>
          )}

          {/*
            R3 (auditoría 13-09): el mensaje crudo del back —en inglés, a veces
            un stack— se pintaba tal cual. `FalloDeCarga` lo clasifica y decide
            si reintentar tiene sentido; sin marco, porque esto vive dentro del
            diálogo y un borde dentro de otro borde parece un error del error.
          */}
          {conciliando === null && !cargando && error !== null && (
            <FalloDeCarga
              error={error || t('recibos.form.cartera.fallo')}
              queEs="la cartera del cliente"
              onReintentar={() => recargar()}
              enmarcado={false}
            />
          )}

          {/*
            🔴 «No debe nada» sólo puede aparecer cuando de verdad NO queda
            ninguna cuota pendiente — ni vencida ni futura. Antes salía con el
            contrato vigente porque la deuda se leía de los cobros emitidos, y
            ése fue el defecto que originó todo este cambio. El pie se dibuja
            igual, con «Cerrar»: sin eso el modal quedaba sin botones.
          */}
          {conciliando === null && !cargando && cartera !== null && !hayCartera && (
            <div data-testid="cliente-sin-deuda">
              <SinDatos
                queSon="cuotas pendientes"
                icono={Receipt}
                titulo={t('recibos.form.cartera.sinDeuda', { nombre: cartera.nombre })}
                descripcion="No le queda ninguna cuota pendiente: ni vencida ni por vencer. Cuando su contrato genere la siguiente vas a poder recibírsela, incluso antes de que venza."
              />
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="monto-recibo" className="text-sm font-medium text-foreground">
                    {t('recibos.form.montoLabel')}
                  </label>
                  {/* Dos atajos, no uno: recibir lo vencido es la operación
                      normal; pagar toda la deuda es adelantar, y se elige. */}
                  <div className="flex items-center gap-3">
                    {vencido > 0 && vencido !== maximo && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        hideArrow
                        className="h-auto p-0 text-xs"
                        onClick={() => {
                          origenDelMonto.current = 'vencido';
                          setMonto(vencido);
                        }}
                        data-testid="atajo-vencido"
                      >
                        {t('recibos.form.pagaLoVencido')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      hideArrow
                      className="h-auto p-0 text-xs"
                      onClick={() => {
                        origenDelMonto.current = 'todo';
                        setMonto(maximo);
                      }}
                      data-testid="atajo-todo"
                    >
                      {t('recibos.form.abonarTodo')}
                    </Button>
                  </div>
                </div>
                <CurrencyInput
                  id="monto-recibo"
                  value={Number.isFinite(monto) ? monto : undefined}
                  onChange={(v) => {
                    // El campo avisa también al perder el foco, con el mismo
                    // valor: eso no es escribir un monto.
                    const mismo = v === monto || (Number.isNaN(v) && Number.isNaN(monto));
                    if (!mismo) origenDelMonto.current = 'manual';
                    setMonto(v);
                    setTocado(true);
                  }}
                  invalid={Boolean(errorDeMonto)}
                  className="h-12 text-lg font-semibold"
                />
                <p className="text-xs text-fg-muted">
                  {/* Con anticipo habilitado NO es un máximo —se puede pagar de
                      más y queda a favor—: llamarlo «Máximo abonable» mentía. */}
                  {puedeGuardarAFavor && quienPaga.tipo !== 'ASEGURADORA'
                    ? t('recibos.form.deudaTotal', { monto: formatCurrency(maximo) })
                    : t('recibos.form.maximo', { monto: formatCurrency(maximo) })}
                  {/* El máximo ya trae la mora adentro: se dice cuánto es. */}
                  {(cartera.interesCop ?? 0) > 0 && (
                    <span data-testid="maximo-con-intereses">
                      {' · '}
                      {t('recibos.form.cartera.deLosCualesIntereses', {
                        monto: formatCurrency(cartera.interesCop ?? 0),
                      })}
                    </span>
                  )}
                </p>
                {/* Por encima de lo vencido la plata baja cuotas que todavía no
                    vencen. Es legítimo y es lo que el CEO pidió, pero tiene que
                    estar dicho ANTES de emitir, no descubrirse en el recibo. */}
                {vencido > 0 && futuro > 0 && (
                  <p className="text-xs text-fg-muted" data-testid="aviso-adelanto-monto">
                    {t('recibos.form.adelantoDesde', {
                      vencido: formatCurrency(vencido),
                      futuro: formatCurrency(futuro),
                    })}
                  </p>
                )}
                {/* Decir a dónde va el excedente ANTES de emitir: si no, la
                    plata «desaparece» de la cartera y nadie sabe dónde quedó. */}
                {excedente > 0 && puedeGuardarAFavor && (
                  <p className="text-xs text-fg-muted" data-testid="aviso-a-favor">
                    {formatCurrency(excedente)} superan TODA la deuda de {cartera?.nombre ?? 'el cliente'}
                    {' '}—vencida y futura— y quedan a su favor: se aplican solos a las cuotas que
                    vayan apareciendo, de la más vieja a la más nueva.
                  </p>
                )}
                {excedente > 0 && puedeGuardarAFavor && !seExcede && (
                  <label className="flex items-start gap-2 text-sm text-fg" data-testid="confirmar-a-favor">
                    <Checkbox
                      className="mt-0.5"
                      checked={aFavorConfirmado === monto}
                      onCheckedChange={(v) => setAFavorConfirmado(v === true ? monto : null)}
                      data-testid="confirmar-a-favor-casilla"
                    />
                    <span>
                      {t('recibos.form.confirmarAFavor', {
                        monto: formatCurrency(excedente),
                        nombre: cartera?.nombre ?? 'el cliente',
                      })}
                    </span>
                  </label>
                )}
                {errorDeMonto && <p className="text-xs text-destructive">{errorDeMonto}</p>}
              </div>

              {/* 🔴 A dónde va la plata. El punto del cambio entero. */}
              <PlanDeImputacion
                cartera={cartera}
                plan={plan}
                comoAnticipo={ofrecerForma && forma === 'ANTICIPO_DEL_CONTRATO'}
              />
              <AvisoSinConciliar periodos={sinConciliar} />

              {/*
                🔴 La forma del adelanto (Juan Camilo, 2026-09-16). Aparece sólo
                cuando el monto alcanza cuotas que no vencen y el back puede
                guardar el anticipo. Cada opción dice qué pasa y cuántos meses
                cubre, ANTES de emitir: es plata que no se ve bajar en el acto.
              */}
              {ofrecerForma && quienPaga.tipo === 'CLIENTE' && (
                <div className="space-y-2" data-testid="forma-del-adelanto">
                  <p className="text-sm font-medium text-fg">{t('recibos.form.forma.titulo')}</p>
                  <p className="text-xs text-fg-muted">
                    {t('recibos.form.forma.ayuda', { meses: mesesDelAdelanto })}
                  </p>
                  <div
                    role="radiogroup"
                    aria-label={t('recibos.form.forma.titulo')}
                    className="space-y-2"
                  >
                    {(
                      [
                        {
                          valor: 'ABONAR_A_LAS_CUOTAS',
                          titulo: t('recibos.form.forma.abonarTitulo'),
                          ayuda: t('recibos.form.forma.abonarAyuda', {
                            monto: formatCurrency(adelanto.valorCop),
                            meses: mesesDelAdelanto,
                          }),
                        },
                        {
                          valor: 'ANTICIPO_DEL_CONTRATO',
                          titulo: t('recibos.form.forma.anticipoTitulo'),
                          ayuda: t('recibos.form.forma.anticipoAyuda', {
                            monto: formatCurrency(adelanto.valorCop),
                          }),
                        },
                      ] as const
                    ).map((o) => (
                      <button
                        key={o.valor}
                        type="button"
                        role="radio"
                        aria-checked={forma === o.valor}
                        onClick={() => setForma(o.valor)}
                        className={cn(
                          'w-full rounded-lg border p-3 text-left transition-colors',
                          forma === o.valor
                            ? 'border-primary bg-primary-soft'
                            : 'border-border bg-surface hover:bg-surface-muted',
                        )}
                        data-testid={`forma-${o.valor}`}
                      >
                        <p className="text-sm font-medium text-fg">{o.titulo}</p>
                        <p className="mt-1 text-xs text-fg-muted">{o.ayuda}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 🔴 D11: quién paga — el cliente o una aseguradora (siniestro). */}
              <QuienPaga valor={quienPaga} onChange={setQuienPaga} />

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
                  /*
                   * Sólo techo (`hoy`). El piso que puso R4 (auditoría 13-09)
                   * se quitó el 2026-09-16: el recibo lleva la fecha en la que
                   * se recibió la plata, sea cual sea.
                   */
                  max={hoy}
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  aria-invalid={
                    (problemaDeLaFecha !== null && problemaDeLaFecha !== 'vacia') ||
                    errorDeLaFecha !== null ||
                    (tocado && !fecha)
                  }
                  className={cn(
                    'w-full',
                    (tocado && !fecha) ||
                      problemaDeLaFecha === 'futura' ||
                      errorDeLaFecha !== null
                      ? 'border-destructive'
                      : '',
                  )}
                />
                {tocado && !fecha && (
                  <p className="text-xs text-destructive">{t('recibos.form.fechaRequerida')}</p>
                )}
                {problemaDeLaFecha === 'futura' && (
                  <p className="text-xs text-destructive" data-testid="fecha-futura">
                    {t('recibos.form.fechaFutura')}
                  </p>
                )}
                {/* El rechazo del back sobre ESTA fecha, tal cual: dice qué hacer. */}
                {problemaDeLaFecha === null && errorDeLaFecha !== null && (
                  <p className="text-xs text-destructive" data-testid="error-de-la-fecha">
                    {errorDeLaFecha.mensaje || t('recibos.form.cartera.fallo')}
                  </p>
                )}
                {/*
                  Los números a la vista son de otro día mientras llega la
                  cartera nueva: se dice, y el botón espera.
                */}
                {problemaDeLaFecha === null && errorDeLaFecha === null && !carteraAlDia && (
                  <p
                    className="flex items-center gap-1.5 text-xs text-fg-muted"
                    data-testid="recalculando-interes"
                    aria-live="polite"
                  >
                    <Spinner size="sm" variant="muted" />
                    {t('recibos.form.recalculandoInteres')}
                  </p>
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
                  maxLength={largoDeLosSaludos}
                  value={saludos}
                  onChange={(e) => setSaludos(e.target.value)}
                  placeholder={t('recibos.form.saludosPlaceholder')}
                  className="w-full resize-none"
                />
              </div>

              {/* El rechazo del back, tal cual */}
              {errorDelBack && (
                <Banner
                  variant="danger"
                  title={tituloDelError ?? t('recibos.form.fallo')}
                  data-testid="error-del-back"
                >
                  {errorDelBack}
                </Banner>
              )}
            </form>
          )}
        </>

        {/* Pie fijo: en un modal alto los botones no se pueden ir con el scroll. */}
        {(hayCartera || conciliando !== null || (!cargando && cartera !== null)) && (
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
            ) : !hayCartera ? (
              <Button type="button" variant="outline" onClick={cerrar} data-testid="cerrar-sin-deuda">
                Cerrar
              </Button>
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
