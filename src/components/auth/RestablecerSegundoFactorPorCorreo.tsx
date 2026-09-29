'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EnvelopeSimple } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { CasillasDeCodigo } from '@/components/ui/casillas-de-codigo';
import { ApiError } from '@/lib/api/client';
import { segundoFactorApi } from '@/lib/api/segundo-factor.service';
import { mensajeDelRestablecimiento } from '@/lib/auth/errores-del-segundo-factor';
import {
  leerRestablecimientoPendiente,
  marcarRestablecimientoPendiente,
  olvidarRestablecimientoPendiente,
} from '@/lib/auth/restablecimiento-pendiente';

/** Cuánto se espera para dejar pedir otro código. */
const ESPERA_PARA_REENVIAR_S = 60;

export interface RestablecerSegundoFactorPorCorreoProps {
  /** El correo de la cuenta, para decir a dónde llega el código. */
  correo?: string | null;
  /**
   * Quién lo pide: con él, el paso pedido se anota y sobrevive a que la página
   * se monte de nuevo (`restablecimiento-pendiente.ts`).
   */
  usuarioId?: string | null;
  /** El código sirvió: los factores ya no están. Toca inscribir uno nuevo. */
  onRestablecido: () => void;
  /** Tiene la app al final: vuelve a pedir el código de la app. */
  onVolver: () => void;
}

type Paso = 'ofrecer' | 'codigo';

/**
 * 🔴 Caso B del segundo factor (Nico, 29-09-2026): la persona pasó la
 * contraseña, tiene un factor verificado y NO tiene la app (la borró, cambió
 * de celular, o —el caso real— alguien le activó el factor en SU celular).
 *
 * Antes veía su factor «Activado» con un «Desactivar» que respondía «Error
 * 422»: Supabase exige `aal2` para quitar un factor verificado, y sin la app
 * no hay `aal2`. Quitarlo sólo con la contraseña sería un bypass, así que la
 * segunda prueba es un código que llega al CORREO de la cuenta
 * (`/auth/segundo-factor/restablecer/*` del back). Al confirmarlo, el back
 * borra los factores y la pantalla pasa a inscribir uno nuevo.
 */
export function RestablecerSegundoFactorPorCorreo({
  correo,
  usuarioId,
  onRestablecido,
  onVolver,
}: RestablecerSegundoFactorPorCorreoProps) {
  // Si el código ya salió (la página se montó de nuevo mientras la persona lo
  // buscaba en el correo), se arranca en las casillas del correo.
  const [pendiente] = useState(() => (usuarioId ? leerRestablecimientoPendiente(usuarioId) : null));
  const [paso, setPaso] = useState<Paso>(pendiente ? 'codigo' : 'ofrecer');
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Hasta cuándo no se puede pedir otro código (epoch ms). */
  const [reenviarDesde, setReenviarDesde] = useState(pendiente?.reenviarDesde ?? 0);
  const [ahora, setAhora] = useState(() => Date.now());
  /** Candado inmediato contra el doble envío (el estado tarda un render). */
  const confirmandoRef = useRef(false);

  // La cuenta regresiva sale de una hora fija, no de restar de a uno: un
  // reloj que se atrasa (pestaña en segundo plano) no alarga la espera.
  useEffect(() => {
    if (reenviarDesde <= Date.now()) return;
    const reloj = setInterval(() => {
      setAhora(Date.now());
      if (Date.now() >= reenviarDesde) clearInterval(reloj);
    }, 1000);
    return () => clearInterval(reloj);
  }, [reenviarDesde]);

  const esperaS = Math.max(0, Math.ceil((reenviarDesde - ahora) / 1000));
  const esperar = useCallback((segundos: number) => {
    setAhora(Date.now());
    setReenviarDesde(Date.now() + segundos * 1000);
  }, []);

  const pedirCodigo = useCallback(async () => {
    setEnviando(true);
    setError(null);
    try {
      await segundoFactorApi.solicitarRestablecimiento();
      setPaso('codigo');
      setCodigo('');
      esperar(ESPERA_PARA_REENVIAR_S);
      if (usuarioId) marcarRestablecimientoPendiente(usuarioId, Date.now() + ESPERA_PARA_REENVIAR_S * 1000);
    } catch (err) {
      setError(mensajeDelRestablecimiento(err));
      const espera = err instanceof ApiError ? err.detalle?.reintentarEnSegundos : undefined;
      if (typeof espera === 'number' && espera > 0) esperar(Math.ceil(espera));
    } finally {
      setEnviando(false);
    }
  }, [esperar, usuarioId]);

  const confirmar = useCallback(
    async (explicito?: string) => {
      const valor = explicito ?? codigo;
      if (valor.length !== 6 || confirmandoRef.current) return;
      confirmandoRef.current = true;
      setConfirmando(true);
      setError(null);
      try {
        await segundoFactorApi.confirmarRestablecimiento(valor);
        olvidarRestablecimientoPendiente();
        // Se queda bloqueado: la tarjeta cambia a la inscripción del nuevo.
        onRestablecido();
      } catch (err) {
        confirmandoRef.current = false;
        setConfirmando(false);
        setError(mensajeDelRestablecimiento(err));
        setCodigo('');
      }
    },
    [codigo, onRestablecido],
  );

  /** Tiene la app al final: lo pedido se olvida y vuelve al código de la app. */
  const volver = useCallback(() => {
    olvidarRestablecimientoPendiente();
    onVolver();
  }, [onVolver]);

  const destino = correo ? (
    <span className="font-medium text-fg">{correo}</span>
  ) : (
    'el correo de tu cuenta'
  );

  if (paso === 'ofrecer') {
    return (
      <div className="space-y-5" data-testid="restablecer-por-correo">
        <p className="text-pretty text-body-sm text-fg-muted">
          Sin la app no hay código, y el segundo factor no se puede quitar sólo con la
          contraseña. Te mandamos un código a {destino} para restablecerlo; enseguida lo
          activas de nuevo aquí mismo.
        </p>

        {error ? (
          <p role="alert" className="text-pretty text-body-sm text-danger">
            {error}
          </p>
        ) : null}

        <Button
          onClick={() => void pedirCodigo()}
          disabled={enviando || esperaS > 0}
          isLoading={enviando}
          hideArrow
          className="w-full"
        >
          <EnvelopeSimple className="h-4 w-4" />
          {enviando ? 'Enviando…' : 'Restablecer con un código a tu correo'}
        </Button>

        <div className="text-center">
          <Button variant="link" size="sm" onClick={volver} disabled={enviando}>
            Volver a escribir el código de la app
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="codigo-del-correo" aria-busy={confirmando}>
      <div className="space-y-1 text-center">
        <p className="text-body font-medium text-fg">Te mandamos un código a tu correo</p>
        <p className="text-pretty text-body-sm text-fg-muted">
          Escribe los seis dígitos que llegaron a {destino}. Vence en 10 minutos.
        </p>
      </div>

      <CasillasDeCodigo
        aria-label="Código de 6 dígitos del correo"
        value={codigo}
        onChange={(v) => {
          setCodigo(v);
          if (error) setError(null);
        }}
        onCompleto={(v) => void confirmar(v)}
        hayError={Boolean(error)}
        disabled={confirmando}
        autoFocus
      />

      {error ? (
        <p role="alert" className="text-pretty text-center text-body-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button
        onClick={() => void confirmar()}
        disabled={confirmando || codigo.length !== 6}
        isLoading={confirmando}
        hideArrow
        className="w-full"
      >
        {confirmando ? 'Confirmando…' : 'Confirmar'}
      </Button>

      <div className="flex flex-col items-center gap-1">
        <Button
          variant="link"
          size="sm"
          onClick={() => void pedirCodigo()}
          disabled={enviando || confirmando || esperaS > 0}
        >
          {esperaS > 0 ? `Reenviar código en ${esperaS} s` : 'Reenviar código'}
        </Button>
        <Button variant="link" size="sm" onClick={volver} disabled={confirmando}>
          Volver a escribir el código de la app
        </Button>
      </div>
    </div>
  );
}
