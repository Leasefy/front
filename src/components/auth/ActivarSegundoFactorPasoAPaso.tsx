'use client';

/**
 * Activar el segundo factor, paso a paso, para quien nunca usó una app de
 * autenticación.
 *
 * Nico (30-09-2026) sobre `/auth/mfa-enroll`: «EXPLIQUEMOSLE, QUE DEBE HACER,
 * eso ahí no se entiende nada, qué app posiblemente puede descargar para que
 * pueda realizar esa activación, con paso a paso». La pantalla mostraba la
 * fila de Configuración («Autenticación de dos factores · Activar») y, al
 * tocarla, un QR con un campo «000000» sin decir de dónde sale el código.
 *
 * Tres pasos y un cierre:
 *   1. Descargar la app (enlaces OFICIALES de cada tienda, verificados el
 *      30-09-2026 contra las páginas de Google y Microsoft).
 *   2. Escanear el QR, o copiar la clave si no se puede escanear (en el mismo
 *      celular no se puede: por eso ahí la clave va abierta y hay un botón que
 *      abre la app directo con el enlace `otpauth://` de Supabase).
 *   3. Escribir el código: las mismas casillas de `/auth/mfa-verify`, que se
 *      envían solas al sexto dígito, con el mismo candado contra el doble envío.
 *   Listo: confirmación. Quien monta esto decide a dónde se sale.
 *
 * ── 🔴 Por qué el primer código va por el SDK ─────────────────────────────
 *
 * Esto vive en el LOGIN (sesión `aal1`). Verificar por HTTP crudo dejaba la
 * sesión del SDK en `aal1` y el AuthProvider sin enterarse: `/auth/mfa-verify`
 * lo devolvía a `/auth/mfa-enroll`, ahí se pintaba la tarjeta «Activada ·
 * Desactivar» de Configuración, y al final pedía OTRO código (el rebote que
 * vio Nico el 30-09). Por el SDK sale `MFA_CHALLENGE_VERIFIED` y
 * `auth-context` apaga `mfaRequired` y `mfaEnrollRequired`. Es el mismo modo
 * `enElIngreso` de `MfaSetupSection`, con el mismo transporte
 * (`inscripcion-del-segundo-factor.ts`).
 *
 * Crear el factor, en cambio, sigue por HTTP: `mfa.enroll()` del SDK se colgaba
 * con el candado de auth tomado.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppleLogo,
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  Check,
  CheckCircle,
  Copy,
  DeviceMobile,
  EnvelopeSimple,
  GoogleLogo,
  GooglePlayLogo,
  Key,
  ShieldCheck,
  WarningCircle,
  WindowsLogo,
} from '@phosphor-icons/react';

import { Button, buttonVariants } from '@/components/ui/button';
import { CasillasDeCodigo } from '@/components/ui/casillas-de-codigo';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import { getAccessToken } from '@/lib/api/client';
import {
  crearFactorTotp,
  descartarFactorSinVerificar,
  factorTotpVerificado,
  verificarFactorNuevo,
  type FactorPorVerificar,
} from '@/lib/auth/inscripcion-del-segundo-factor';
import { cn } from '@/lib/utils';

/**
 * Las apps recomendadas, con sus fichas OFICIALES. Verificadas el 30-09-2026:
 * Google enlaza su ficha de Play desde support.google.com/accounts/answer/1066447
 * y Microsoft redirige a estas dos desde su página del Authenticator.
 */
export const APPS_RECOMENDADAS = [
  {
    id: 'google',
    nombre: 'Google Authenticator',
    de: 'de Google',
    Icono: GoogleLogo,
    appStore: 'https://apps.apple.com/app/google-authenticator/id388497605',
    googlePlay: 'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2',
  },
  {
    id: 'microsoft',
    nombre: 'Microsoft Authenticator',
    de: 'de Microsoft',
    Icono: WindowsLogo,
    appStore: 'https://apps.apple.com/app/microsoft-authenticator/id983156458',
    googlePlay: 'https://play.google.com/store/apps/details?id=com.azure.authenticator',
  },
] as const;

type Paso = 'app' | 'escanear' | 'codigo' | 'listo';
type Plataforma = 'ios' | 'android' | 'escritorio';

const PASOS: Array<{ paso: Exclude<Paso, 'listo'>; titulo: string }> = [
  { paso: 'app', titulo: 'Descarga la app' },
  { paso: 'escanear', titulo: 'Escanea el código' },
  { paso: 'codigo', titulo: 'Escribe el código' },
];

/** Se lee DESPUÉS de montar: en el servidor no hay navegador y el HTML tiene que coincidir. */
function detectarPlataforma(): Plataforma {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'escritorio';
}

/** «JBSW Y3DP EHPK 3PXP»: de a cuatro se copia a mano sin perderse. */
function claveEnBloques(clave: string): string {
  return clave.replace(/\s+/g, '').replace(/(.{4})(?=.)/g, '$1 ');
}

export interface ActivarSegundoFactorPasoAPasoProps {
  /**
   * Al abrir, la cuenta YA tenía un factor verificado (otra pestaña, otro
   * dispositivo). No hay nada que inscribir: quien monta decide a dónde va.
   */
  onYaTeniaFactor: () => void;
  /**
   * El primer código pasó por el SDK: la sesión ya es `aal2`. Se llama UNA vez,
   * justo cuando aparece el «Listo».
   */
  onActivado: (factorId: string) => void;
}

export function ActivarSegundoFactorPasoAPaso({
  onYaTeniaFactor,
  onActivado,
}: ActivarSegundoFactorPasoAPasoProps) {
  const [paso, setPaso] = useState<Paso>('app');
  const [plataforma, setPlataforma] = useState<Plataforma | null>(null);
  const [factor, setFactor] = useState<FactorPorVerificar | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [errorAlPreparar, setErrorAlPreparar] = useState<string | null>(null);
  const [claveAbierta, setClaveAbierta] = useState(false);
  const [copiada, setCopiada] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [errorDelCodigo, setErrorDelCodigo] = useState<string | null>(null);

  /**
   * 🔴 El candado de verdad contra el doble envío, como en `/auth/mfa-verify`:
   * `verificando` es estado de React y tarda un render en verse; el sexto
   * dígito más un clic alcanzaban a verificar dos veces el mismo código.
   */
  const verificandoRef = useRef(false);
  const tokenRef = useRef<string | null>(null);
  const factorRef = useRef<FactorPorVerificar | null>(null);
  factorRef.current = factor;
  const activadoRef = useRef(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const primerPasoRef = useRef(true);

  useEffect(() => {
    const p = detectarPlataforma();
    setPlataforma(p);
    // En el mismo celular de la app no hay cómo escanear la pantalla: la
    // clave va abierta desde el principio.
    if (p !== 'escritorio') setClaveAbierta(true);
  }, []);

  /**
   * ¿Ya tiene un factor verificado? Se pregunta al abrir, de fondo, sin tapar
   * el paso 1 con un spinner. La promesa queda guardada: «Ya la tengo»
   * la espera antes de crear otro factor.
   */
  const consultaRef = useRef<Promise<string | null> | null>(null);
  useEffect(() => {
    let vivo = true;
    const token = getAccessToken();
    tokenRef.current = token;
    const consulta = token ? factorTotpVerificado(token).catch(() => null) : Promise.resolve(null);
    consultaRef.current = consulta;
    void consulta.then((id) => {
      if (vivo && id) onYaTeniaFactor();
    });
    return () => {
      vivo = false;
    };
    // Sólo al montar, como el chequeo de `MfaSetupSection`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Si la persona se va a mitad de camino (cierra sesión, recarga), el factor
   * que se creó y no se verificó no queda colgado. Conserva la limpieza del
   * «Cancelar» de `MfaSetupSection`: de fondo, sin esperar a la red.
   */
  useEffect(
    () => () => {
      const pendiente = factorRef.current;
      const token = tokenRef.current;
      if (pendiente && token && !activadoRef.current) {
        descartarFactorSinVerificar(pendiente.factorId, token);
      }
    },
    [],
  );

  // Al cambiar de paso, el foco va al título: un lector de pantalla anuncia
  // dónde quedó la persona. En el paso del código lo toman las casillas.
  useEffect(() => {
    if (primerPasoRef.current) {
      primerPasoRef.current = false;
      return;
    }
    if (paso !== 'codigo') tituloRef.current?.focus();
  }, [paso]);

  const irAEscanear = useCallback(async () => {
    if (factorRef.current) {
      setPaso('escanear');
      return;
    }
    setPreparando(true);
    setErrorAlPreparar(null);
    try {
      const token = getAccessToken() ?? tokenRef.current;
      tokenRef.current = token;
      if (!token) throw new Error('Tu sesión se cerró. Vuelve a entrar con tu contraseña.');
      // Si al abrir ya tenía uno verificado, no se crea otro.
      if (await consultaRef.current) return;
      const nuevo = await crearFactorTotp(token);
      setFactor(nuevo);
      setPaso('escanear');
    } catch (err) {
      setErrorAlPreparar(
        (err as Error).message || 'No pudimos preparar tu código. Intenta de nuevo en un momento.',
      );
    } finally {
      setPreparando(false);
    }
  }, []);

  /** Recibe el código aparte del estado: al sexto dígito el estado aún trae cinco. */
  const verificar = useCallback(
    async (codigoCompleto: string) => {
      const actual = factorRef.current;
      if (!actual || codigoCompleto.length !== 6 || verificandoRef.current) return;
      verificandoRef.current = true;
      setVerificando(true);
      setErrorDelCodigo(null);
      try {
        await verificarFactorNuevo({
          factorId: actual.factorId,
          codigo: codigoCompleto,
          enElIngreso: true,
          token: getAccessToken() ?? tokenRef.current,
        });
      } catch (err) {
        verificandoRef.current = false;
        setVerificando(false);
        setCodigo('');
        setErrorDelCodigo(
          (err as Error).message || 'No pudimos verificar el código. Intenta con el siguiente.',
        );
        return;
      }
      // Salió bien: todo queda bloqueado hasta que la pantalla se vaya.
      activadoRef.current = true;
      setPaso('listo');
      onActivado(actual.factorId);
    },
    [onActivado],
  );

  const copiarClave = useCallback(async () => {
    if (!factor?.secret) return;
    try {
      await navigator.clipboard.writeText(factor.secret);
      setCopiada(true);
      setTimeout(() => setCopiada(false), 2500);
    } catch {
      // Sin permiso del portapapeles la clave sigue a la vista y seleccionable.
    }
  }, [factor]);

  if (paso === 'listo') {
    return (
      <div className="space-y-6 text-center" data-testid="segundo-factor-listo" role="status">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle className="h-9 w-9 text-success" weight="fill" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">Listo</p>
          <h1
            ref={tituloRef}
            tabIndex={-1}
            className="text-balance font-heading text-[28px] font-medium leading-[1.1] tracking-[-0.03em] text-fg outline-none"
          >
            Tu cuenta quedó protegida
          </h1>
          <p className="text-pretty text-body-sm text-fg-muted">
            Desde ahora, al entrar te pediremos tu contraseña y el código que muestra la app. No la
            borres de tu celular.
          </p>
        </div>
        <CargaDeMarca tamano="xs" tono="negro" texto="Te llevamos a tu cuenta…" />
      </div>
    );
  }

  const indice = PASOS.findIndex((p) => p.paso === paso);

  return (
    <div className="space-y-6">
      {/* Qué es y por qué, en una frase. */}
      <div className="space-y-3 text-center">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary-soft ring-1 ring-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" weight="fill" aria-hidden="true" />
          </div>
        </div>
        <h1 className="text-balance font-heading text-[30px] font-medium leading-[1.1] tracking-[-0.03em] text-fg">
          Activa tu segundo factor
        </h1>
        <p className="text-pretty text-body-sm text-fg-muted">
          Tu rol maneja plata: además de la contraseña pedimos un código que solo aparece en tu
          celular. Son tres pasos, unos dos minutos.
        </p>
      </div>

      <IndicadorDePasos actual={indice} />

      <section aria-labelledby="paso-titulo" className="space-y-5">
        <div className="space-y-1.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            Paso {indice + 1} de 3
          </p>
          <h2
            id="paso-titulo"
            ref={tituloRef}
            tabIndex={-1}
            className="text-balance text-[20px] font-semibold leading-tight tracking-[-0.015em] text-fg outline-none"
          >
            {paso === 'app'
              ? 'Descarga una app de autenticación en tu celular'
              : paso === 'escanear'
                ? 'Agrega tu cuenta en la app'
                : 'Escribe el código de 6 dígitos'}
          </h2>
        </div>

        {paso === 'app' ? (
          <PasoDescargar
            plataforma={plataforma}
            preparando={preparando}
            error={errorAlPreparar}
            onContinuar={() => void irAEscanear()}
          />
        ) : null}

        {paso === 'escanear' && factor ? (
          <div className="space-y-5" data-testid="paso-escanear">
            <ol className="space-y-2 text-body-sm text-fg-muted">
              <li className="flex gap-2.5">
                <NumeroDeInstruccion n={1} />
                <span>
                  Abre la app y toca <strong className="font-medium text-fg">«+»</strong>. En
                  Microsoft Authenticator elige <strong className="font-medium text-fg">«Otra cuenta»</strong>.
                </span>
              </li>
              <li className="flex gap-2.5">
                <NumeroDeInstruccion n={2} />
                <span>
                  Elige <strong className="font-medium text-fg">«Escanear un código QR»</strong> y apunta
                  la cámara a este código.
                </span>
              </li>
            </ol>

            <div className="flex justify-center">
              {/* 🔴 Blanco a propósito, en claro y en oscuro: las cámaras leen un
                  QR oscuro sobre fondo claro. No es decoración. */}
              <div className="rounded-md border border-border bg-white p-3 shadow-sm">
                {/* Un data URI con el SVG de Supabase: `next/image` no tiene nada que optimizar. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={factor.qrCode}
                  alt="Código QR para agregar tu cuenta de Leasefy en la app de autenticación"
                  className="h-52 w-52"
                  data-testid="qr-del-segundo-factor"
                />
              </div>
            </div>

            <div className="rounded-md border border-border-faint bg-surface-muted">
              <button
                type="button"
                onClick={() => setClaveAbierta((v) => !v)}
                aria-expanded={claveAbierta}
                aria-controls="clave-a-mano"
                className="flex w-full items-center gap-2.5 rounded-md px-4 py-3 text-left text-body-sm font-medium text-fg"
              >
                <Key className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
                {plataforma && plataforma !== 'escritorio'
                  ? '¿Estás en el mismo celular? Copia la clave'
                  : '¿No puedes escanearlo? Escribe la clave a mano'}
              </button>
              {claveAbierta ? (
                <div id="clave-a-mano" className="space-y-3 px-4 pb-4">
                  <div className="flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2.5">
                    <code
                      className="min-w-0 flex-1 break-all font-mono text-[13px] tabular-nums tracking-wide text-fg select-all"
                      data-testid="clave-del-segundo-factor"
                    >
                      {claveEnBloques(factor.secret)}
                    </code>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      hideArrow
                      onClick={() => void copiarClave()}
                      aria-label={copiada ? 'Clave copiada' : 'Copiar clave'}
                      data-testid="copiar-clave"
                    >
                      {copiada ? (
                        <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {copiada ? 'Copiada' : 'Copiar'}
                    </Button>
                  </div>
                  <p className="text-pretty text-caption text-fg-muted">
                    En la app elige «Ingresar una clave de configuración» (o «Ingresar código
                    manualmente»), ponle de nombre «Leasefy», pega la clave y deja el tipo «Basada en
                    el tiempo».
                  </p>
                  {plataforma && plataforma !== 'escritorio' && factor.uri ? (
                    <a
                      href={factor.uri}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full')}
                      data-testid="abrir-en-la-app"
                    >
                      <ArrowSquareOut className="h-4 w-4" aria-hidden="true" />
                      Abrir en mi app de autenticación
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                hideArrow
                onClick={() => setPaso('app')}
                className="sm:flex-none"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Atrás
              </Button>
              <Button
                type="button"
                hideArrow
                onClick={() => setPaso('codigo')}
                className="flex-1"
                data-testid="ya-lo-agregue"
              >
                Ya la agregué, continuar
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : null}

        {paso === 'codigo' ? (
          <div className="space-y-5" aria-busy={verificando} data-testid="paso-codigo">
            <p className="text-pretty text-body-sm text-fg-muted">
              En la app ya aparece tu cuenta nueva con un código de seis dígitos. Escríbelo acá: al
              completar el sexto dígito se revisa solo.
            </p>
            <CasillasDeCodigo
              aria-label="Código de 6 dígitos de tu app de autenticación"
              value={codigo}
              onChange={(v) => {
                setCodigo(v);
                if (errorDelCodigo) setErrorDelCodigo(null);
              }}
              onCompleto={(v) => void verificar(v)}
              hayError={Boolean(errorDelCodigo)}
              disabled={verificando}
              autoFocus
            />
            {errorDelCodigo ? (
              <p
                role="alert"
                className="flex items-start justify-center gap-2 text-pretty text-center text-body-sm text-danger"
                data-testid="error-del-codigo"
              >
                <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {errorDelCodigo}
              </p>
            ) : null}
            <Button
              type="button"
              hideArrow
              onClick={() => void verificar(codigo)}
              disabled={verificando || codigo.length !== 6}
              isLoading={verificando}
              className="w-full"
              data-testid="activar-segundo-factor"
            >
              {verificando ? 'Verificando…' : 'Activar segundo factor'}
            </Button>
            <p className="text-pretty text-center text-caption text-fg-subtle">
              El código cambia cada 30 segundos. Si te lo rechaza, espera al siguiente.
            </p>
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setPaso('escanear')}
                disabled={verificando}
              >
                Volver al código QR
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function NumeroDeInstruccion({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-muted font-mono text-[11px] tabular-nums text-fg-muted"
    >
      {n}
    </span>
  );
}

/** Tres círculos con su nombre debajo; cabe a 390 px. */
function IndicadorDePasos({ actual }: { actual: number }) {
  return (
    <ol aria-label="Pasos para activar el segundo factor" className="flex items-start">
      {PASOS.map((p, i) => {
        const hecho = i < actual;
        const esActual = i === actual;
        return (
          <li
            key={p.paso}
            className="relative flex flex-1 flex-col items-center gap-2 text-center"
            aria-current={esActual ? 'step' : undefined}
            data-testid={`indicador-${p.paso}`}
          >
            {i > 0 ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute right-1/2 top-3.5 mr-5 h-px w-[calc(100%-2.5rem)]',
                  i <= actual ? 'bg-primary' : 'bg-border',
                )}
              />
            ) : null}
            <span
              className={cn(
                'relative flex h-7 w-7 items-center justify-center rounded-full font-mono text-caption font-semibold tabular-nums transition-colors',
                hecho
                  ? 'bg-primary text-primary-fg'
                  : esActual
                    ? 'border-2 border-primary bg-surface text-primary'
                    : 'border border-border bg-surface text-fg-subtle',
              )}
            >
              {hecho ? <Check className="h-3.5 w-3.5" weight="bold" aria-hidden="true" /> : i + 1}
            </span>
            <span
              className={cn(
                'text-caption leading-tight',
                esActual ? 'font-medium text-fg' : hecho ? 'text-fg-muted' : 'text-fg-subtle',
              )}
            >
              {p.titulo}
              {hecho ? <span className="sr-only"> (hecho)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function PasoDescargar({
  plataforma,
  preparando,
  error,
  onContinuar,
}: {
  plataforma: Plataforma | null;
  preparando: boolean;
  error: string | null;
  onContinuar: () => void;
}) {
  const tienda = (
    href: string,
    etiqueta: 'App Store' | 'Google Play',
    app: string,
    resaltada: boolean,
  ) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Descargar ${app} en ${etiqueta} (se abre en otra pestaña)`}
      className={cn(
        buttonVariants({ variant: resaltada ? 'default' : 'outline', size: 'sm' }),
        'flex-1 justify-center gap-1.5 sm:flex-none',
      )}
    >
      {etiqueta === 'App Store' ? (
        <AppleLogo className="h-4 w-4" weight="fill" aria-hidden="true" />
      ) : (
        <GooglePlayLogo className="h-4 w-4" weight="fill" aria-hidden="true" />
      )}
      {etiqueta}
    </a>
  );

  return (
    <div className="space-y-5" data-testid="paso-descargar">
      <p className="text-pretty text-body-sm text-fg-muted">
        Es gratis y genera un código nuevo cada 30 segundos. Sirve cualquier app de códigos;
        estas dos son las más conocidas.
      </p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {APPS_RECOMENDADAS.map((app) => (
          <li
            key={app.id}
            className="rounded-md border border-border bg-surface p-4"
            data-testid={`app-${app.id}`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted">
                <app.Icono className="h-5 w-5 text-fg" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-body-sm font-medium text-fg">{app.nombre}</span>
                <span className="block text-caption text-fg-subtle">{app.de}</span>
              </span>
            </div>
            <div className="mt-3 flex gap-2 sm:flex-col">
              {plataforma !== 'android'
                ? tienda(app.appStore, 'App Store', app.nombre, plataforma === 'ios')
                : null}
              {plataforma !== 'ios'
                ? tienda(app.googlePlay, 'Google Play', app.nombre, plataforma === 'android')
                : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-2 text-pretty text-caption text-fg-muted">
        {plataforma === 'escritorio' ? (
          <p className="flex gap-2">
            <DeviceMobile className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              ¿Estás en el computador? Abre la tienda de tu celular y busca «Google Authenticator» o
              «Microsoft Authenticator».
            </span>
          </p>
        ) : null}
        <p className="flex gap-2">
          <EnvelopeSimple className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            ¿Cambias de celular o pierdes la app? Al entrar, toca «No tengo la app de autenticación» y
            lo restableces con un código que te mandamos al correo.
          </span>
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-body-sm text-danger"
          data-testid="error-al-preparar"
        >
          <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        hideArrow
        onClick={onContinuar}
        disabled={preparando}
        isLoading={preparando}
        className="w-full"
        data-testid="ya-tengo-la-app"
      >
        {preparando ? 'Preparando tu código…' : 'Ya tengo la app, continuar'}
        {preparando ? null : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </Button>
    </div>
  );
}
