'use client';

/**
 * 🔴 El cambio de la cuenta bancaria del propietario (17-09), desde su ficha.
 *
 * «Certificación bancaria a nombre del propietario + confirmación del
 * propietario por otro canal (correo o código); el siguiente giro a la cuenta
 * nueva queda retenido hasta que lo apruebe un administrador. Además (Nico):
 * queda el registro en la bitácora del contrato con el archivo de aprobación
 * anexo.»
 *
 * La tarjeta muestra el último cambio con su paso (esperando confirmación →
 * retenido esperando aprobación → aprobado) y la acción que toca en cada uno.
 * Aprobar y rechazar uno confirmado son del ADMINISTRADOR; el back también lo
 * exige. El correo al propietario respeta `EMAIL_DELIVERY_ENABLED`: en local no
 * sale y la pantalla lo dice.
 */

import { useCallback, useEffect, useState } from 'react';
import { Chip, RadioGroup, RadioGroupItem } from '@leasefy/cadence';
import { Bank, CheckCircle, Paperclip, ShieldWarning, WarningCircle } from '@phosphor-icons/react';

import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { mapBankCodeToWire } from '@/lib/api/inmobiliaria.service';
import {
  mandatoApi,
  type CambioDeCuenta,
  type CambiosDeCuentaDelPropietario,
  type CuentaBancaria,
  type CuentaDelReparto,
} from '@/lib/api/mandato.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { ESTADO_DEL_CAMBIO_DE_CUENTA } from '@/lib/mandato/textos';
import { COLOMBIAN_BANKS, type BankCode } from '@/lib/types/payment-accounts';
import { useI18n } from '@/lib/i18n';
import {
  revisarDocumentoDelTitular,
  titularEnUnaLinea,
  titularInicial,
} from '@/lib/propietarios/titular-de-la-cuenta';
import {
  TitularDeLaCuentaCampos,
  erroresDelTitular,
  type ErroresDelTitular,
  type ValorDelTitular,
} from '@/components/inmobiliaria/TitularDeLaCuentaCampos';
import {
  RepartoDeCuentasCampos,
  cuentaVacia,
  type CuentaDelFormulario,
  type ErroresDeLaCuenta,
} from '@/components/inmobiliaria/mandato/RepartoDeCuentasCampos';
import {
  cuentaDelRepartoEnUnaLinea,
  esCuentaVigente,
  porcentajeEntero,
  problemaDelReparto,
} from '@/lib/propietarios/reparto-de-cuentas';

function cuentaCorta(c: { bankName: string | null; bankAccountType: string | null; bankAccountNumber: string | null }) {
  const numero = c.bankAccountNumber ? `•••• ${c.bankAccountNumber.slice(-4)}` : 'sin número';
  return [c.bankName, c.bankAccountType, numero].filter(Boolean).join(' · ');
}

/**
 * ¿El cambio guarda la certificación de CADA cuenta del reparto? (23-09) Las
 * solicitudes de antes traen una sola para todo: esas se siguen abriendo con
 * el botón «Certificación» de siempre.
 */
function certificacionesPorCuenta(cuenta: CuentaBancaria): boolean {
  return !!cuenta.reparto && cuenta.reparto.length > 1 && cuenta.reparto.some((c) => 'certificacion' in c);
}

/**
 * La cuenta de un cambio en pantalla: una línea, o una por cuenta cuando el
 * cambio reparte la plata (22-09: «50 % · Bancolombia · Ahorros · •••• 4521»).
 * 23-09: con `onAbrirCertificacion`, cada cuenta nueva trae el botón de SU
 * certificación y las que ya estaban vigentes dicen «ya certificada».
 */
function CuentasDelCambio({
  cuenta,
  onAbrirCertificacion,
}: {
  cuenta: CuentaBancaria;
  onAbrirCertificacion?: (indice: number) => void;
}) {
  const { t } = useI18n();
  if (cuenta.reparto && cuenta.reparto.length > 1) {
    const conCertificaciones = !!onAbrirCertificacion && certificacionesPorCuenta(cuenta);
    return (
      <ul className="space-y-1" data-testid="reparto-del-cambio">
        {cuenta.reparto.map((c, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-2">
            <span className="font-mono">{cuentaDelRepartoEnUnaLinea(c)}</span>
            {conCertificaciones && c.certificacion ? (
              <Button
                variant="ghost"
                size="sm"
                hideArrow
                onClick={() => onAbrirCertificacion(i)}
                aria-label={t('inmobiliaria.propietario.cambioDeCuenta.certificacionDeLaCuentaN', { n: i + 1 })}
                title={c.certificacion.nombre}
                data-testid={`abrir-certificacion-${i}`}
              >
                <Paperclip className="w-4 h-4 mr-1" aria-hidden="true" />
                {t('inmobiliaria.propietario.cambioDeCuenta.certificacionUnica')}
              </Button>
            ) : null}
            {conCertificaciones && c.certificacion === null ? (
              <span className="text-sm text-muted-foreground" data-testid={`ya-certificada-${i}`}>
                {t('inmobiliaria.propietario.cambioDeCuenta.sinCertificacionNueva')}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }
  return <span className="font-mono">{cuentaCorta(cuenta)}</span>;
}

/** «Banco de Bogota» (back) → `bogota`: sin tildes ni mayúsculas. */
function codigoDelBanco(nombre: string | null): BankCode | '' {
  const llave = (nombre ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (!llave) return '';
  const limpio = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const banco = COLOMBIAN_BANKS.find(
    (b) => limpio(b.name) === llave || limpio(b.shortName) === llave || llave.includes(limpio(b.shortName)),
  );
  return banco?.code ?? '';
}

/** Una cuenta vigente, lista para editar en el reparto. */
function cuentaDelFormularioDe(
  c: CuentaDelReparto,
  propietario: { nombre: string; documento: string } | undefined,
  conPorcentaje: boolean,
): CuentaDelFormulario {
  const titular = titularInicial({
    nombreDelPropietario: propietario?.nombre ?? '',
    documentoDelPropietario: propietario?.documento ?? '',
    nombreDelTitular: c.bankAccountHolder,
    documentoDelTitular: c.bankAccountHolderDocument,
  });
  return cuentaVacia({
    titular:
      titular === 'TERCERO'
        ? {
            titular: 'TERCERO',
            nombre: c.bankAccountHolder ?? '',
            tipo: (c.bankAccountHolderDocumentType ?? '') as ValorDelTitular['tipo'],
            numero: c.bankAccountHolderDocument ?? '',
          }
        : { titular: 'PROPIETARIO', nombre: '', tipo: '', numero: '' },
    banco: codigoDelBanco(c.bankName),
    tipo: /corriente|checking/i.test(c.bankAccountType ?? '') ? 'CORRIENTE' : 'AHORROS',
    numero: (c.bankAccountNumber ?? '').replace(/\D/g, ''),
    porcentaje: conPorcentaje ? String(c.porcentaje) : '',
  });
}

/**
 * A nombre de quién está una cuenta del cambio (22-09): «El propietario» o
 * «Carlos Restrepo · CC 80012345». Con la regla de `titular-de-la-cuenta.ts`.
 */
function titularCorto(
  c: CambioDeCuenta['cuentaNueva'],
  propietario: { nombre: string; documento: string } | undefined,
): string {
  const elegido = titularInicial({
    nombreDelPropietario: propietario?.nombre ?? '',
    documentoDelPropietario: propietario?.documento ?? '',
    nombreDelTitular: c.bankAccountHolder,
    documentoDelTitular: c.bankAccountHolderDocument,
  });
  if (elegido === 'PROPIETARIO') return 'El propietario';
  return (
    titularEnUnaLinea({
      nombre: c.bankAccountHolder,
      tipoDocumento: c.bankAccountHolderDocumentType,
      numeroDocumento: c.bankAccountHolderDocument,
    }) || 'Otra persona, sin datos'
  );
}

export function CambioDeCuentaBancaria({
  propietarioId,
  tieneCuenta,
  puedeEditar,
  onCuentaCambiada,
  propietario,
}: {
  propietarioId: string;
  /**
   * Nombre y documento del propietario (22-09): para decir si la cuenta es suya
   * o de otra persona, y para no dejar pedir «otra persona» con su cédula.
   */
  propietario?: { nombre: string; documento: string };
  /** La ficha ya tiene una cuenta: el cambio va por acá, no por «Editar». */
  tieneCuenta: boolean;
  puedeEditar: boolean;
  /** La cuenta de la ficha cambió (confirmado o rechazado): relee al propietario. */
  onCuentaCambiada: () => void;
}) {
  const { isAdmin } = usePermissions();
  const [datos, setDatos] = useState<CambiosDeCuentaDelPropietario | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const [aprobando, setAprobando] = useState<CambioDeCuenta | null>(null);
  const [cerrando, setCerrando] = useState<CambioDeCuenta | null>(null);
  const [codigo, setCodigo] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [enlaceDePrueba, setEnlaceDePrueba] = useState<string | null>(null);

  const [errorDeCarga, setErrorDeCarga] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await mandatoApi.cambiosDeCuenta(propietarioId));
      setErrorDeCarga(null);
    } catch (e) {
      setErrorDeCarga(e);
    }
  }, [propietarioId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!datos) {
    // Un fallo no se pinta como «no hay cambios»: se dice y se puede reintentar.
    return errorDeCarga ? (
      <FalloDeCarga
        error={errorDeCarga}
        queEs="el cambio de cuenta bancaria"
        onReintentar={cargar}
      />
    ) : null;
  }
  const ultimo = datos.cambios[0] ?? null;
  const vivo = ultimo && (ultimo.estado === 'PENDIENTE_CONFIRMACION' || ultimo.estado === 'CONFIRMADO') ? ultimo : null;

  async function confirmarConCodigo(c: CambioDeCuenta) {
    setTrabajando(true);
    try {
      await mandatoApi.confirmarCambioConCodigo(propietarioId, c.id, codigo.trim());
      toast.success('Cambio confirmado.', {
        description: 'La cuenta nueva ya está en la ficha. Su próximo giro queda retenido hasta que un administrador lo apruebe.',
      });
      setCodigo('');
      onCuentaCambiada();
      await cargar();
    } catch (e) {
      toast.error('No se pudo confirmar.', { description: mensajeDelFallo(e, 'Intenta de nuevo.') });
      await cargar();
    } finally {
      setTrabajando(false);
    }
  }

  async function abrirArchivo(c: CambioDeCuenta, cual: 'certificacion' | 'aprobacion' | number) {
    try {
      const { url } = await mandatoApi.archivoDelCambio(propietarioId, c.id, cual);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      toast.error('No se pudo abrir el archivo.', { description: mensajeDelFallo(e, '') });
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 space-y-3" data-testid="cambio-de-cuenta">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bank className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-base font-semibold text-foreground">Cambio de cuenta bancaria</h3>
        </div>
        {puedeEditar && datos.disponible && tieneCuenta && !vivo ? (
          <Button variant="ghost" size="sm" hideArrow onClick={() => setPidiendo(true)} data-testid="pedir-cambio-de-cuenta">
            Cambiar cuenta
          </Button>
        ) : null}
      </div>

      {datos.cuentasVigentes && datos.cuentasVigentes.length > 1 ? (
        <div className="text-sm" data-testid="reparto-vigente">
          <p className="text-muted-foreground">Recibe en {datos.cuentasVigentes.length} cuentas:</p>
          <ul className="mt-1 space-y-0.5">
            {datos.cuentasVigentes.map((c, i) => (
              <li key={i} className="font-mono">
                {cuentaDelRepartoEnUnaLinea(c)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!datos.disponible ? (
        <p className="text-xs text-muted-foreground">{datos.motivo}</p>
      ) : !ultimo ? (
        <p className="text-sm text-muted-foreground">
          {tieneCuenta
            ? 'Cambiar la cuenta pide la certificación bancaria, la confirmación del propietario y la aprobación de un administrador.'
            : 'La primera cuenta se registra en «Editar». Los cambios después pasan por acá.'}
        </p>
      ) : (
        <div className="space-y-3">
          {ultimo.retieneElGiro ? (
            <div className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning flex gap-2" data-testid="giro-retenido">
              <ShieldWarning className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>Giro retenido: la cuenta nueva no recibe plata hasta que un administrador apruebe el cambio.</span>
            </div>
          ) : null}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Estado</dt>
            <dd className="text-foreground font-medium" data-testid="estado-del-cambio">
              {ESTADO_DEL_CAMBIO_DE_CUENTA[ultimo.estado]}
            </dd>
            <dt className="text-muted-foreground">
              {ultimo.cuentaNueva.reparto && ultimo.cuentaNueva.reparto.length > 1 ? 'Reparto nuevo' : 'Cuenta nueva'}
            </dt>
            <dd>
              <CuentasDelCambio
                cuenta={ultimo.cuentaNueva}
                onAbrirCertificacion={(i) => abrirArchivo(ultimo, i)}
              />
            </dd>
            <dt className="text-muted-foreground">A nombre de</dt>
            <dd data-testid="titular-del-cambio">{titularCorto(ultimo.cuentaNueva, propietario)}</dd>
            <dt className="text-muted-foreground">Antes</dt>
            <dd>
              <CuentasDelCambio cuenta={ultimo.cuentaAnterior} />
            </dd>
            {ultimo.destinoEnmascarado ? (
              <>
                <dt className="text-muted-foreground">Confirmación</dt>
                <dd>
                  Por correo a {ultimo.destinoEnmascarado}
                  {ultimo.envioEstado === 'SIMULADO' ? ' (simulado: el envío de correos está apagado)' : ''}
                  {ultimo.envioEstado === 'FALLIDO' ? ' (no salió: pídele el código por teléfono o anula y vuelve a pedir)' : ''}
                </dd>
              </>
            ) : null}
            {ultimo.motivoDeCierre ? (
              <>
                <dt className="text-muted-foreground">Motivo</dt>
                <dd>{ultimo.motivoDeCierre}</dd>
              </>
            ) : null}
          </dl>
          <div className="flex flex-wrap gap-2">
            {/* Con una certificación por cuenta, cada una va al lado de su cuenta. */}
            {certificacionesPorCuenta(ultimo.cuentaNueva) ? null : (
              <Button
                variant="ghost"
                size="sm"
                hideArrow
                onClick={() => abrirArchivo(ultimo, 'certificacion')}
                data-testid="abrir-certificacion"
              >
                <Paperclip className="w-4 h-4 mr-1" aria-hidden="true" />
                Certificación
              </Button>
            )}
            {ultimo.tieneSoporteDeAprobacion ? (
              <Button variant="ghost" size="sm" hideArrow onClick={() => abrirArchivo(ultimo, 'aprobacion')}>
                <Paperclip className="w-4 h-4 mr-1" aria-hidden="true" />
                Soporte de la aprobación
              </Button>
            ) : null}
          </div>

          {enlaceDePrueba ? (
            <p className="text-xs text-muted-foreground break-all">
              Enlace de prueba (sólo en desarrollo): <a className="underline" href={enlaceDePrueba}>{enlaceDePrueba}</a>
            </p>
          ) : null}

          {puedeEditar && ultimo.estado === 'PENDIENTE_CONFIRMACION' ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="codigo-del-propietario">Código que dicta el propietario</Label>
                <Input
                  id="codigo-del-propietario"
                  inputMode="numeric"
                  maxLength={6}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                  className="w-32 font-mono"
                />
              </div>
              <Button size="sm" hideArrow disabled={codigo.length !== 6 || trabajando} onClick={() => confirmarConCodigo(ultimo)}>
                Confirmar
              </Button>
              <Button variant="ghost" size="sm" hideArrow onClick={() => setCerrando(ultimo)}>
                Anular
              </Button>
            </div>
          ) : null}

          {ultimo.estado === 'CONFIRMADO' ? (
            isAdmin ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" hideArrow onClick={() => setAprobando(ultimo)} data-testid="aprobar-cambio-de-cuenta">
                  <CheckCircle className="w-4 h-4 mr-1" aria-hidden="true" />
                  Aprobar el giro a la cuenta nueva
                </Button>
                <Button variant="ghost" size="sm" hideArrow onClick={() => setCerrando(ultimo)}>
                  Rechazar
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Lo aprueba o lo rechaza un administrador.</p>
            )
          ) : null}
        </div>
      )}

      {pidiendo ? (
        <PedirCambioDeCuenta
          propietarioId={propietarioId}
          propietario={propietario}
          cuentasVigentes={datos.cuentasVigentes ?? []}
          repartoDisponible={datos.repartoDisponible ?? false}
          motivoDelReparto={datos.motivoDelReparto ?? null}
          onCerrar={() => setPidiendo(false)}
          onPedido={async (enlace) => {
            setPidiendo(false);
            setEnlaceDePrueba(enlace ?? null);
            await cargar();
          }}
        />
      ) : null}

      {aprobando ? (
        <AprobarCambio
          propietarioId={propietarioId}
          propietario={propietario}
          cambio={aprobando}
          onAbrirCertificacion={(i) => abrirArchivo(aprobando, i)}
          onCerrar={() => setAprobando(null)}
          onAprobado={async () => {
            setAprobando(null);
            await cargar();
          }}
        />
      ) : null}

      {cerrando ? (
        <CerrarCambio
          propietarioId={propietarioId}
          cambio={cerrando}
          onCerrar={() => setCerrando(null)}
          onCerrado={async () => {
            setCerrando(null);
            onCuentaCambiada();
            await cargar();
          }}
        />
      ) : null}
    </section>
  );
}

function PedirCambioDeCuenta({
  propietarioId,
  propietario,
  cuentasVigentes,
  repartoDisponible,
  motivoDelReparto,
  onCerrar,
  onPedido,
}: {
  propietarioId: string;
  propietario?: { nombre: string; documento: string };
  /** Las cuentas de hoy: con reparto, el formulario arranca en ellas. */
  cuentasVigentes: CuentaDelReparto[];
  repartoDisponible: boolean;
  motivoDelReparto: string | null;
  onCerrar: () => void;
  onPedido: (enlaceDePrueba?: string) => void;
}) {
  const { t } = useI18n();
  /*
   * 🔴 22-09: ¿en cuántas cuentas recibe? Con reparto vigente se arranca en
   * «Varias» con sus cuentas cargadas: cambiar un porcentaje no puede obligar a
   * reescribir las tres cuentas. Volver a «Una» termina el reparto al confirmar.
   */
  const yaReparte = cuentasVigentes.length > 1;
  const [modo, setModo] = useState<'UNA' | 'VARIAS'>(yaReparte && repartoDisponible ? 'VARIAS' : 'UNA');
  const [cuentas, setCuentas] = useState<CuentaDelFormulario[]>(() =>
    yaReparte
      ? cuentasVigentes.map((c) => cuentaDelFormularioDe(c, propietario, true))
      : [
          ...cuentasVigentes.slice(0, 1).map((c) => cuentaDelFormularioDe(c, propietario, false)),
          ...Array.from({ length: Math.max(0, 2 - cuentasVigentes.slice(0, 1).length) }, () => cuentaVacia()),
        ],
  );
  const [erroresDelReparto, setErroresDelReparto] = useState<ErroresDeLaCuenta[]>([]);
  const [banco, setBanco] = useState<BankCode | ''>('');
  const [tipo, setTipo] = useState<'AHORROS' | 'CORRIENTE'>('AHORROS');
  const [numero, setNumero] = useState('');
  /*
   * 🔴 «¿A quién pertenece la cuenta?» (22-09), la misma pregunta que la ficha.
   * Arranca en «Del propietario»: la cuenta NUEVA se declara de cero.
   */
  const [titular, setTitular] = useState<ValorDelTitular>({ titular: 'PROPIETARIO', nombre: '', tipo: '', numero: '' });
  const [erroresTitular, setErroresTitular] = useState<ErroresDelTitular>({});
  const [archivo, setArchivo] = useState<File | null>(null);
  /*
   * 🔴 23-09 (Nico: «que el reparto pida una certificación por cada cuenta
   * nueva»): un banco certifica UNA cuenta. Cada cuenta nueva del reparto
   * lleva SU archivo, junto a ella; las que ya reciben hoy (mismo banco,
   * número y titular) dicen «ya certificada» y no piden nada. Por la llave
   * estable de la cuenta, no por la posición: quitar la cuenta 2 no le pasa
   * su archivo a la 3.
   */
  const [certificaciones, setCertificaciones] = useState<Record<string, File | null>>({});
  const vigentesDelFormulario = cuentasVigentes.map((c) => cuentaDelFormularioDe(c, propietario, false));
  const esNueva = (c: CuentaDelFormulario) => !esCuentaVigente(c, vigentesDelFormulario);
  const sinCertificacion = cuentas
    .map((c, i) => (esNueva(c) && !certificaciones[c.llave] ? i : null))
    .filter((i): i is number => i !== null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problema = modo === 'VARIAS' ? problemaDelReparto(cuentas.map((c) => ({ banco: c.banco, numero: c.numero, porcentaje: c.porcentaje }))) : null;
  const listo =
    !guardando &&
    (modo === 'UNA'
      ? !!archivo && !!banco && numero.length >= 4
      : problema === null && sinCertificacion.length === 0);

  async function pedirReparto() {
    const errores: ErroresDeLaCuenta[] = cuentas.map((c) => {
      const e: ErroresDeLaCuenta = {};
      const delTitular = erroresDelTitular(t, c.titular, (tipoDoc, numeroDoc) =>
        revisarDocumentoDelTitular(tipoDoc, numeroDoc, propietario?.documento),
      );
      if (Object.keys(delTitular).length > 0) e.titular = delTitular;
      if (!c.banco) e.banco = 'Escoge el banco.';
      if (c.numero.length < 4) e.numero = 'Escribe el número de la cuenta.';
      if (porcentajeEntero(c.porcentaje) === null) e.porcentaje = 'Un número entero entre 1 y 100.';
      return e;
    });
    setErroresDelReparto(errores);
    if (errores.some((e) => Object.keys(e).length > 0) || problema || sinCertificacion.length > 0) return;
    setGuardando(true);
    setError(null);
    try {
      const r = await mandatoApi.solicitarCambioDeCuenta(propietarioId, {
        reparto: cuentas.map((c) => {
          const tercero = c.titular.titular === 'TERCERO';
          return {
            bankCode: mapBankCodeToWire(c.banco as BankCode),
            bankAccountType: c.tipo,
            bankAccountNumber: c.numero,
            titularDeLaCuenta: c.titular.titular,
            ...(tercero
              ? {
                  bankAccountHolder: c.titular.nombre.replace(/\s+/g, ' ').trim(),
                  bankAccountHolderDocument: c.titular.numero.trim(),
                  bankAccountHolderDocumentType: c.titular.tipo || undefined,
                }
              : {}),
            porcentaje: porcentajeEntero(c.porcentaje) ?? 0,
          };
        }),
        // En la posición de cada cuenta: el back empareja por `certificacion_<i>`.
        certificacionesPorCuenta: cuentas.map((c) => (esNueva(c) ? (certificaciones[c.llave] ?? null) : null)),
      });
      toast.success('Reparto pedido.', {
        description:
          r.cambio.envioEstado === 'SIMULADO'
            ? 'El envío de correos está apagado en este entorno: no le llegó nada al propietario.'
            : `Le pedimos confirmar el reparto al propietario por correo (${r.cambio.destinoEnmascarado ?? ''}).`,
      });
      onPedido(r.enlaceDePrueba);
    } catch (e) {
      setError(mensajeDelFallo(e, 'No se pudo pedir el reparto.'));
    } finally {
      setGuardando(false);
    }
  }

  async function pedir() {
    if (modo === 'VARIAS') return pedirReparto();
    if (!banco || !archivo) return;
    const errores = erroresDelTitular(t, titular, (tipoDoc, numeroDoc) =>
      revisarDocumentoDelTitular(tipoDoc, numeroDoc, propietario?.documento),
    );
    setErroresTitular(errores);
    if (Object.keys(errores).length > 0) return;
    const tercero = titular.titular === 'TERCERO';
    setGuardando(true);
    setError(null);
    try {
      const r = await mandatoApi.solicitarCambioDeCuenta(propietarioId, {
        bankCode: mapBankCodeToWire(banco),
        bankAccountType: tipo,
        bankAccountNumber: numero,
        titularDeLaCuenta: titular.titular,
        ...(tercero
          ? {
              bankAccountHolder: titular.nombre.replace(/\s+/g, ' ').trim(),
              bankAccountHolderDocument: titular.numero.trim(),
              bankAccountHolderDocumentType: titular.tipo || undefined,
            }
          : {}),
        certificacion: archivo,
      });
      toast.success('Cambio pedido.', {
        description:
          r.cambio.envioEstado === 'SIMULADO'
            ? 'El envío de correos está apagado en este entorno: no le llegó nada al propietario.'
            : `Le pedimos confirmar al propietario por correo (${r.cambio.destinoEnmascarado ?? ''}).`,
      });
      onPedido(r.enlaceDePrueba);
    } catch (e) {
      setError(mensajeDelFallo(e, 'No se pudo pedir el cambio.'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-lg" data-testid="pedir-cambio">
        <DialogHeader>
          <DialogTitle>Cambiar la cuenta bancaria</DialogTitle>
          <DialogDescription>
            Con la certificación bancaria a nombre del titular de la cuenta. El propietario confirma el cambio por
            correo y el primer giro a la cuenta nueva queda retenido hasta que un administrador lo apruebe.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p id="cuantas-cuentas" className="text-sm font-medium text-fg">
              ¿En cuántas cuentas recibe?
            </p>
            <div role="radiogroup" aria-labelledby="cuantas-cuentas" className="flex gap-3">
              <Chip
                type="button"
                role="radio"
                aria-checked={modo === 'UNA'}
                selected={modo === 'UNA'}
                onClick={() => setModo('UNA')}
                className="flex-1 justify-center"
                data-testid="modo-una-cuenta"
              >
                En una cuenta
              </Chip>
              <Chip
                type="button"
                role="radio"
                aria-checked={modo === 'VARIAS'}
                selected={modo === 'VARIAS'}
                disabled={!repartoDisponible}
                onClick={() => setModo('VARIAS')}
                className="flex-1 justify-center"
                data-testid="modo-varias-cuentas"
              >
                Repartido en varias
              </Chip>
            </div>
            {!repartoDisponible && motivoDelReparto ? (
              <p className="text-sm text-muted-foreground">{motivoDelReparto}</p>
            ) : null}
            {modo === 'UNA' && yaReparte ? (
              <p className="text-sm text-muted-foreground">
                Hoy recibe en {cuentasVigentes.length} cuentas: al confirmar, todo pasa a esta cuenta.
              </p>
            ) : null}
          </div>

          {modo === 'VARIAS' ? (
            <RepartoDeCuentasCampos
              cuentas={cuentas}
              onCambiar={(v) => {
                setCuentas(v);
                setErroresDelReparto([]);
              }}
              errores={erroresDelReparto}
              nombreDelPropietario={propietario?.nombre ?? ''}
              pieDeCuenta={(c, i) =>
                esNueva(c) ? (
                  <div className="space-y-1.5">
                    <Label htmlFor={`reparto-${i}-certificacion`}>
                      {t('inmobiliaria.propietario.cambioDeCuenta.certificacionDeLaCuenta')}
                    </Label>
                    <Input
                      id={`reparto-${i}-certificacion`}
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const elegido = e.target.files?.[0] ?? null;
                        setCertificaciones((antes) => ({ ...antes, [c.llave]: elegido }));
                      }}
                      data-testid={`certificacion-cuenta-${i}`}
                    />
                  </div>
                ) : (
                  <p className="flex gap-2 text-sm text-muted-foreground" data-testid={`cuenta-ya-certificada-${i}`}>
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    {t('inmobiliaria.propietario.cambioDeCuenta.yaCertificada')}
                  </p>
                )
              }
            />
          ) : (
          <>
          {/* Primero de quién es la cuenta; después, la cuenta (Nico, 22-09). */}
          <TitularDeLaCuentaCampos
            valor={titular}
            onCambiar={(v) => {
              setTitular(v);
              setErroresTitular({});
            }}
            errores={erroresTitular}
            nombreDelPropietario={propietario?.nombre ?? ''}
          />
          <div className="space-y-1.5">
            <Label htmlFor="banco-nuevo">Banco</Label>
            <select
              id="banco-nuevo"
              className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
              value={banco}
              onChange={(e) => setBanco(e.target.value as BankCode)}
            >
              <option value="">Escoge el banco</option>
              {COLOMBIAN_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <RadioGroup
            className="flex gap-x-5 gap-y-2"
            value={tipo}
            onValueChange={(v) => setTipo(v as typeof tipo)}
          >
            {(['AHORROS', 'CORRIENTE'] as const).map((t) => (
              <label
                key={t}
                className="flex cursor-pointer items-center gap-2.5 text-body-sm text-fg"
              >
                <RadioGroupItem value={t} />
                <span>{t === 'AHORROS' ? 'Ahorros' : 'Corriente'}</span>
              </label>
            ))}
          </RadioGroup>
          <div className="space-y-1.5">
            <Label htmlFor="numero-nuevo">Número de cuenta</Label>
            <Input
              id="numero-nuevo"
              inputMode="numeric"
              className="font-mono"
              value={numero}
              onChange={(e) => setNumero(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>
          </>
          )}
          {modo === 'UNA' ? (
            <div className="space-y-1.5">
              <Label htmlFor="certificacion">Certificación bancaria (PDF o foto, obligatoria)</Label>
              <Input
                id="certificacion"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                data-testid="archivo-certificacion"
              />
            </div>
          ) : problema === null && sinCertificacion.length > 0 ? (
            // El botón apagado dice por qué.
            <p className="text-sm text-muted-foreground" data-testid="faltan-certificaciones">
              {t('inmobiliaria.propietario.cambioDeCuenta.faltanCertificaciones', {
                cuentas: sinCertificacion
                  .map((i) => t('inmobiliaria.propietario.cambioDeCuenta.cuentaN', { n: i + 1 }))
                  .join(', '),
              })}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-danger flex gap-2" role="alert">
              <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={pedir} disabled={!listo} isLoading={guardando} data-testid="enviar-cambio">
            {modo === 'VARIAS' ? 'Pedir el reparto' : 'Pedir el cambio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AprobarCambio({
  propietarioId,
  propietario,
  cambio,
  onAbrirCertificacion,
  onCerrar,
  onAprobado,
}: {
  propietarioId: string;
  propietario?: { nombre: string; documento: string };
  cambio: CambioDeCuenta;
  /** 23-09: bajar la certificación de la cuenta i del reparto. */
  onAbrirCertificacion: (indice: number) => void;
  onCerrar: () => void;
  onAprobado: () => void;
}) {
  const { t } = useI18n();
  const [soporte, setSoporte] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function aprobar() {
    setGuardando(true);
    setError(null);
    try {
      await mandatoApi.aprobarCambioDeCuenta(propietarioId, cambio.id, soporte);
      toast.success('Giro liberado.', {
        description: 'Quedó en la bitácora de sus contratos con el archivo de la aprobación.',
      });
      onAprobado();
    } catch (e) {
      setError(mensajeDelFallo(e, 'No se pudo aprobar.'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Aprobar el giro a la cuenta nueva</DialogTitle>
          <DialogDescription>
            {cambio.cuentaNueva.reparto && cambio.cuentaNueva.reparto.length > 1
              ? `Reparto en ${cambio.cuentaNueva.reparto.length} cuentas: ${cambio.cuentaNueva.reparto
                  .map(cuentaDelRepartoEnUnaLinea)
                  .join('; ')}.${
                  certificacionesPorCuenta(cambio.cuentaNueva) ? '' : ' Revisa las certificaciones antes de aprobar.'
                } Desde este momento los giros se reparten así.`
              : `${cuentaCorta(cambio.cuentaNueva)}, a nombre de ${titularCorto(cambio.cuentaNueva, propietario)}. Revisa la certificación antes de aprobar: desde este momento los giros salen a esta cuenta.`}
          </DialogDescription>
        </DialogHeader>
        {certificacionesPorCuenta(cambio.cuentaNueva) ? (
          <div className="space-y-1.5 text-sm" data-testid="certificaciones-a-revisar">
            <p className="font-medium text-foreground">
              {t('inmobiliaria.propietario.cambioDeCuenta.certificacionesDelReparto')}
            </p>
            <p className="text-muted-foreground">{t('inmobiliaria.propietario.cambioDeCuenta.revisarCertificaciones')}</p>
            <CuentasDelCambio cuenta={cambio.cuentaNueva} onAbrirCertificacion={onAbrirCertificacion} />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="soporte-aprobacion">Soporte de la aprobación (opcional)</Label>
          <Input
            id="soporte-aprobacion"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setSoporte(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">
            Sin soporte, la bitácora anexa la certificación sobre la que se aprobó.
          </p>
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={aprobar} isLoading={guardando}>
            Aprobar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CerrarCambio({
  propietarioId,
  cambio,
  onCerrar,
  onCerrado,
}: {
  propietarioId: string;
  cambio: CambioDeCuenta;
  onCerrar: () => void;
  onCerrado: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rechazo = cambio.estado === 'CONFIRMADO';

  async function cerrar() {
    setGuardando(true);
    setError(null);
    try {
      await mandatoApi.cerrarCambioDeCuenta(propietarioId, cambio.id, motivo.trim());
      toast.success(rechazo ? 'Cambio rechazado: volvió la cuenta anterior.' : 'Cambio anulado.');
      onCerrado();
    } catch (e) {
      setError(mensajeDelFallo(e, 'No se pudo cerrar el cambio.'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rechazo ? 'Rechazar el cambio de cuenta' : 'Anular el cambio de cuenta'}</DialogTitle>
          <DialogDescription>
            {rechazo
              ? 'La ficha vuelve a la cuenta anterior y el giro deja de estar retenido.'
              : 'El enlace y el código dejan de servir. Nada cambia en la ficha.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="motivo-de-cierre">Motivo</Label>
          <Textarea id="motivo-de-cierre" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={cerrar} disabled={motivo.trim().length < 3} isLoading={guardando}>
            {rechazo ? 'Rechazar' : 'Anular'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
