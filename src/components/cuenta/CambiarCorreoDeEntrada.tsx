'use client';

/**
 * El correo con que se ENTRA, en Mi perfil, con su «Cambiar» (21-10-2026, Nico:
 * «a ella la invitamos a su correo personal y luego debe pasar al de la
 * empresa»). Antes era sólo lectura y en ninguna parte se podía cambiar.
 *
 * Cómo funciona, de punta a punta:
 *  1. «Cambiar» abre la ventana: el correo nuevo y la contraseña actual.
 *  2. Le llega un enlace al correo nuevo (vence en 24 h) y un aviso al viejo.
 *     Hasta confirmar sigue entrando con el de siempre: la fila lo dice, con
 *     «Reenviar» y «Cancelar el cambio».
 *  3. El enlace abre `/cuenta/confirmar-correo`, que termina el cambio.
 *
 * Sirve igual en los tres perfiles (inmobiliaria, propietario, inquilino).
 */
import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react';
import { Envelope, PencilSimple } from '@phosphor-icons/react';

import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { Button, Input, Label } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import {
  cambioDeCorreoApi,
  type EstadoDelCambioDeCorreo,
} from '@/lib/api/cambio-de-correo.service';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface Props {
  /** El correo que ya pinta la pantalla (mientras el estado carga). */
  correo: string;
  /** Las clases de la caja de lectura del perfil, para que se vea igual. */
  className?: string;
  /** Lo que va pegado al correo, en su mismo renglón (el chulo de «Verificado» del glow up). */
  junto?: ReactNode;
}

function fechaYHora(iso: string, es: boolean): string {
  return new Date(iso).toLocaleString(es ? 'es-CO' : 'en-US', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Un correo que, si no cabe, se parte después de la «@» y antes de cada punto
 * («asesor@ / inmobiliaria-lab / .example.test»), nunca letra por letra.
 */
export function CorreoQueSeParte({ correo }: { correo: string }) {
  const trozos = correo.split(/(?<=@)|(?=\.)/);
  return (
    <>
      {trozos.map((t, i) => (
        <Fragment key={i}>
          {i > 0 ? <wbr /> : null}
          {t}
        </Fragment>
      ))}
    </>
  );
}

/** Cierra la frase con punto, salvo que ya termine en uno («7:41 p. m.»): nunca «p. m..». */
export function conPuntoFinal(texto: string): string {
  return texto.endsWith('.') ? texto : `${texto}.`;
}

export function CambiarCorreoDeEntrada({ correo, className, junto }: Props) {
  const { locale } = useI18n();
  const es = locale !== 'en';
  const [estado, setEstado] = useState<EstadoDelCambioDeCorreo | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [correoNuevo, setCorreoNuevo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errores, setErrores] = useState<{ correoNuevo?: string; contrasenaActual?: string; suelto?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const [ocupado, setOcupado] = useState<'reenviar' | 'cancelar' | null>(null);

  const cargar = useCallback(() => {
    cambioDeCorreoApi
      .estado()
      .then(setEstado)
      .catch(() => setEstado(null)); // sin el estado, la fila sigue mostrando el correo
  }, []);
  useEffect(() => cargar(), [cargar]);

  const pendiente = estado?.pendiente ?? null;
  const entraConContrasena = estado?.entraConContrasena ?? true;

  function cerrar() {
    if (enviando) return;
    setAbierto(false);
    setCorreoNuevo('');
    setContrasena('');
    setErrores({});
  }

  async function pedir() {
    setErrores({});
    setEnviando(true);
    try {
      const r = await cambioDeCorreoApi.pedir(correoNuevo.trim(), entraConContrasena ? contrasena : undefined);
      setAbierto(false);
      setCorreoNuevo('');
      setContrasena('');
      cargar();
      if (r.correoEnviado) {
        toast.success(es ? `Te mandamos un enlace a ${r.correoNuevo}` : `We sent a link to ${r.correoNuevo}`, {
          description: es
            ? 'Ábrelo para terminar el cambio. Mientras tanto sigues entrando con tu correo de siempre.'
            : 'Open it to finish the change. Until then you keep signing in with your current email.',
        });
      } else {
        toast.error(es ? 'No pudimos mandar el enlace' : 'We could not send the link', {
          description: es ? 'Prueba «Reenviar» en un momento.' : 'Try «Resend» in a moment.',
        });
      }
    } catch (e) {
      const reparto = repartirErroresDelServidor(e, {
        campos: ['correoNuevo', 'contrasenaActual'],
        porDefecto: es ? 'No se pudo pedir el cambio. Prueba de nuevo en un momento.' : 'Could not request the change. Try again in a moment.',
        accion: es ? 'pedir el cambio de correo' : 'request the email change',
      });
      setErrores({
        correoNuevo: reparto.porCampo.correoNuevo,
        contrasenaActual: reparto.porCampo.contrasenaActual,
        suelto: reparto.sueltos.join(' · ') || undefined,
      });
    } finally {
      setEnviando(false);
    }
  }

  async function reenviar() {
    setOcupado('reenviar');
    try {
      const r = await cambioDeCorreoApi.reenviar();
      cargar();
      toast.success(es ? `Te mandamos otro enlace a ${r.correoNuevo}` : `We sent another link to ${r.correoNuevo}`, {
        description: es ? 'El enlace anterior ya no sirve.' : 'The previous link no longer works.',
      });
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: es ? 'No se pudo reenviar.' : 'Could not resend.', accion: es ? 'reenviar el enlace' : 'resend the link' }));
    } finally {
      setOcupado(null);
    }
  }

  async function cancelar() {
    setOcupado('cancelar');
    try {
      await cambioDeCorreoApi.cancelar();
      cargar();
      toast.success(es ? 'Cancelaste el cambio de correo' : 'You cancelled the email change');
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: es ? 'No se pudo cancelar.' : 'Could not cancel.', accion: es ? 'cancelar el cambio' : 'cancel the change' }));
    } finally {
      setOcupado(null);
    }
  }

  const valido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoNuevo.trim()) && (!entraConContrasena || contrasena.length > 0);

  return (
    <div className="space-y-2" data-testid="correo-de-entrada">
      {/*
        El correo entero, aunque baje de renglón (cortado con «…» no se sabe cuál es). Si la
        columna es angosta, «Cambiar» baja a su propio renglón en vez de apretar el correo.
      */}
      <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
        <span className="flex min-w-0 flex-[1_1_12rem] items-center gap-3">
          <Envelope className="h-4 w-4 shrink-0 text-fg-muted" />
          <span className="min-w-0 break-words text-sm text-fg" data-testid="correo-actual">
            <CorreoQueSeParte correo={estado?.correo ?? correo ?? '—'} />
          </span>
          {junto}
        </span>
        {estado && entraConContrasena && !pendiente ? (
          <Button size="sm" variant="ghost" hideArrow onClick={() => setAbierto(true)} data-testid="cambiar-correo">
            <PencilSimple className="h-4 w-4" />
            {es ? 'Cambiar' : 'Change'}
          </Button>
        ) : null}
      </div>
      {estado && !entraConContrasena ? (
        <p className="text-caption text-fg-muted">
          {es ? 'Entras con Google: tu correo es el de tu cuenta de Google.' : 'You sign in with Google: your email is your Google account’s.'}
        </p>
      ) : null}
      {pendiente ? (
        <div className="rounded-lg border border-warning/40 bg-warning-soft p-3" role="status" data-testid="cambio-pendiente">
          <p className="break-words text-sm text-fg">
            {es ? (
              <>Te mandamos un enlace a <strong><CorreoQueSeParte correo={pendiente.correo} /></strong>. Ábrelo para terminar el cambio; vence el {conPuntoFinal(fechaYHora(pendiente.vence, es))}</>
            ) : (
              <>We sent a link to <strong><CorreoQueSeParte correo={pendiente.correo} /></strong>. Open it to finish the change; it expires on {conPuntoFinal(fechaYHora(pendiente.vence, es))}</>
            )}
          </p>
          <p className="mt-1 text-caption text-fg-muted">
            {es ? 'Mientras tanto sigues entrando con tu correo de siempre.' : 'Until then you keep signing in with your current email.'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" hideArrow isLoading={ocupado === 'reenviar'} disabled={ocupado !== null} onClick={() => void reenviar()} data-testid="reenviar-enlace-correo">
              {es ? 'Reenviar el enlace' : 'Resend the link'}
            </Button>
            <Button size="sm" variant="ghost" hideArrow isLoading={ocupado === 'cancelar'} disabled={ocupado !== null} onClick={() => void cancelar()} data-testid="cancelar-cambio-correo">
              {es ? 'Cancelar el cambio' : 'Cancel the change'}
            </Button>
          </div>
        </div>
      ) : null}

      <SettingsModal
        open={abierto}
        onClose={cerrar}
        title={es ? 'Cambiar tu correo' : 'Change your email'}
        description={
          es
            ? 'Es el correo con el que entras a Leasefy. Te mandamos un enlace al correo nuevo y el cambio se hace cuando lo abras.'
            : 'It is the email you use to sign in to Leasefy. We send a link to the new email and the change happens when you open it.'
        }
        footer={
          <Button hideArrow onClick={() => void pedir()} isLoading={enviando} disabled={enviando || !valido} data-testid="pedir-cambio-correo">
            {es ? 'Mandarme el enlace' : 'Send me the link'}
          </Button>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valido && !enviando) void pedir();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="correo-nuevo">{es ? 'Correo nuevo' : 'New email'}</Label>
            <Input
              id="correo-nuevo"
              type="email"
              autoComplete="email"
              value={correoNuevo}
              onChange={(e) => {
                setCorreoNuevo(e.target.value);
                setErrores((x) => ({ ...x, correoNuevo: undefined }));
              }}
              placeholder={es ? 'ana@tuempresa.co' : 'ana@yourcompany.com'}
              aria-invalid={errores.correoNuevo ? true : undefined}
              aria-describedby={errores.correoNuevo ? 'correo-nuevo-error' : undefined}
              data-testid="correo-nuevo"
            />
            <ErrorDelCampo id="correo-nuevo-error" mensaje={errores.correoNuevo} className="mt-0" />
          </div>
          {entraConContrasena ? (
            <div className="space-y-1.5">
              <Label htmlFor="contrasena-actual">{es ? 'Tu contraseña actual' : 'Your current password'}</Label>
              <Input
                id="contrasena-actual"
                type="password"
                autoComplete="current-password"
                value={contrasena}
                onChange={(e) => {
                  setContrasena(e.target.value);
                  setErrores((x) => ({ ...x, contrasenaActual: undefined }));
                }}
                aria-invalid={errores.contrasenaActual ? true : undefined}
                aria-describedby={errores.contrasenaActual ? 'contrasena-actual-error' : undefined}
                data-testid="contrasena-actual"
              />
              <ErrorDelCampo id="contrasena-actual-error" mensaje={errores.contrasenaActual} className="mt-0" />
            </div>
          ) : null}
          {errores.suelto ? (
            <p className="text-sm text-danger" role="alert" data-testid="error-cambio-correo">
              {errores.suelto}
            </p>
          ) : null}
          <p className="text-caption text-fg-muted">
            {es
              ? 'A tu correo actual le avisamos del cambio. Cuando confirmes, se cierran tus otras sesiones abiertas.'
              : 'We let your current email know. When you confirm, your other open sessions are closed.'}
          </p>
        </form>
      </SettingsModal>
    </div>
  );
}
