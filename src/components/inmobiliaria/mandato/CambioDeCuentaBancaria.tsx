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
} from '@/lib/api/mandato.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { ESTADO_DEL_CAMBIO_DE_CUENTA } from '@/lib/mandato/textos';
import { COLOMBIAN_BANKS, type BankCode } from '@/lib/types/payment-accounts';

function cuentaCorta(c: { bankName: string | null; bankAccountType: string | null; bankAccountNumber: string | null }) {
  const numero = c.bankAccountNumber ? `•••• ${c.bankAccountNumber.slice(-4)}` : 'sin número';
  return [c.bankName, c.bankAccountType, numero].filter(Boolean).join(' · ');
}

export function CambioDeCuentaBancaria({
  propietarioId,
  tieneCuenta,
  puedeEditar,
  onCuentaCambiada,
}: {
  propietarioId: string;
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

  async function abrirArchivo(c: CambioDeCuenta, cual: 'certificacion' | 'aprobacion') {
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
            <dt className="text-muted-foreground">Cuenta nueva</dt>
            <dd className="font-mono">{cuentaCorta(ultimo.cuentaNueva)}</dd>
            <dt className="text-muted-foreground">Cuenta anterior</dt>
            <dd className="font-mono">{cuentaCorta(ultimo.cuentaAnterior)}</dd>
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
            <Button variant="ghost" size="sm" hideArrow onClick={() => abrirArchivo(ultimo, 'certificacion')}>
              <Paperclip className="w-4 h-4 mr-1" aria-hidden="true" />
              Certificación
            </Button>
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
          cambio={aprobando}
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
  onCerrar,
  onPedido,
}: {
  propietarioId: string;
  onCerrar: () => void;
  onPedido: (enlaceDePrueba?: string) => void;
}) {
  const [banco, setBanco] = useState<BankCode | ''>('');
  const [tipo, setTipo] = useState<'AHORROS' | 'CORRIENTE'>('AHORROS');
  const [numero, setNumero] = useState('');
  const [titular, setTitular] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listo = !!banco && numero.length >= 4 && !!archivo && !guardando;

  async function pedir() {
    if (!banco || !archivo) return;
    setGuardando(true);
    setError(null);
    try {
      const r = await mandatoApi.solicitarCambioDeCuenta(propietarioId, {
        bankCode: mapBankCodeToWire(banco),
        bankAccountType: tipo,
        bankAccountNumber: numero,
        bankAccountHolder: titular.trim() || undefined,
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
            Con la certificación bancaria a nombre del propietario. Él confirma el cambio por correo y el primer
            giro a la cuenta nueva queda retenido hasta que un administrador lo apruebe.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
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
          <div className="flex gap-3">
            {(['AHORROS', 'CORRIENTE'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input type="radio" name="tipo-de-cuenta" checked={tipo === t} onChange={() => setTipo(t)} />
                {t === 'AHORROS' ? 'Ahorros' : 'Corriente'}
              </label>
            ))}
          </div>
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
          <div className="space-y-1.5">
            <Label htmlFor="titular-nuevo">Titular (si no es el propietario)</Label>
            <Input id="titular-nuevo" value={titular} onChange={(e) => setTitular(e.target.value)} />
          </div>
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
            Pedir el cambio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AprobarCambio({
  propietarioId,
  cambio,
  onCerrar,
  onAprobado,
}: {
  propietarioId: string;
  cambio: CambioDeCuenta;
  onCerrar: () => void;
  onAprobado: () => void;
}) {
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
            {cuentaCorta(cambio.cuentaNueva)}. Revisa la certificación antes de aprobar: desde este momento los
            giros salen a esta cuenta.
          </DialogDescription>
        </DialogHeader>
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
