'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  enterTransition,
  Ilustracion,
  motionSpring,
  PhoneInput,
  RadioCard,
  RadioCardGroup,
  usePrefersReducedMotion,
  type NombreIlustracion,
} from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { alPrimerCampo } from '@/lib/ui/al-primer-campo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { ActivarSegundoFactorPasoAPaso } from '@/components/auth/ActivarSegundoFactorPasoAPaso';
import { OnboardingStepList, type PasoDeLaLista } from '@/components/onboarding/wizard';
import { PAUSA_DEL_LISTO_MS } from '@/lib/auth/use-salida-del-segundo-factor';
import { useAuth } from '@/lib/auth/use-auth';
import { agencyApi } from '@/lib/api/inmobiliaria.service';
import { mediosDePagoApi } from '@/lib/api/medios-de-pago.service';
import type { MedioDePago, TipoDeCuenta } from '@/lib/api/medios-de-pago.types';
import { DEPARTAMENTO_NOMBRES, municipiosDe } from '@/lib/constants/colombia-geo';
import { camposDelError, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { ApiError } from '@/lib/api/client';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { useInmobiliariaConfig } from '@/lib/hooks/useInmobiliaria';
import type { AgencyProfile } from '@/lib/types/inmobiliaria';
import { COLOMBIAN_BANKS } from '@/lib/types/payment-accounts';
import { marcarActivacionEnCurso, marcarRecienActivada, recienActivada, useAlPedirLaActivacion } from '@/lib/conversion/abrir-la-activacion';
import { activarLaCuenta } from '@/lib/conversion/activar-la-cuenta';
import {
  PASOS_PARA_ACTIVAR,
  cuentaDondeRecibe,
  errorDeLaCedula,
  errorDeLaCuenta,
  errorDelCelular,
  errorDelCorreo,
  errorDelNit,
  errorDelNombre,
  nitDeLaCedula,
  pasosQueFaltan,
  quienSeActiva,
  soloDigitos,
  type PasoParaActivar,
  type PerfilQueSeActiva,
} from '@/lib/conversion/pasos-para-activar';

/** Lo que dice cada paso, según quién se activa. */
function textosDelPaso(paso: PasoParaActivar, perfil: PerfilQueSeActiva): { corto: string; titulo: string; ayuda: string; ilustracion: NombreIlustracion } {
  if (paso === 'datos') {
    return perfil === 'agente'
      ? { corto: 'Tus datos', titulo: '¿Quién eres?', ayuda: 'Van en tus contratos y en lo que les mandas a tus clientes. Tal como aparecen en tu cédula.', ilustracion: 'cedula' }
      : { corto: 'Tu empresa', titulo: 'Los datos de tu inmobiliaria', ayuda: 'Como están en el RUT y en la cámara de comercio. Van en tus contratos y en tus facturas.', ilustracion: 'edificio' };
  }
  if (paso === 'cuenta') {
    return {
      corto: 'Tu cuenta',
      titulo: '¿Dónde recibes la plata?',
      ayuda:
        perfil === 'agente'
          ? 'Aquí te llegan tus comisiones y, si quieres, el arriendo de tus inquilinos. Sólo tú ves el número completo.'
          : 'La cuenta donde te pagan tus inquilinos y recibes tu comisión. Sólo tu equipo ve el número completo.',
      ilustracion: 'banco',
    };
  }
  return {
    corto: 'Tu factura',
    titulo: '¿A nombre de quién te facturamos?',
    ayuda: 'Con esto te llega la factura de Leasefy cada mes, salen bien tus propias facturas y queda activa tu cuenta.',
    ilustracion: 'factura',
  };
}

/** Sale sola al volver del pago y, mientras falte algo, una vez al día; «Activar mi cuenta» la abre cuando quiera. */
const llaveDelDia = (agencyId: string) => `leasefy-pasos-para-activar:${agencyId}:${new Date().toISOString().slice(0, 10)}`;
function yaSalioHoy(agencyId: string): boolean {
  try {
    return window.localStorage.getItem(llaveDelDia(agencyId)) === '1';
  } catch {
    return false;
  }
}
function marcarHoy(agencyId: string) {
  try {
    window.localStorage.setItem(llaveDelDia(agencyId), '1');
  } catch {
    /* sin almacenamiento: puede volver a salir hoy, no rompe nada */
  }
}
function vieneDePagar(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('bienvenida') === 'activar';
  } catch {
    return false;
  }
}

/**
 * ACTIVAR la cuenta que vino del marketplace en tres pasos (Nico, 27-10-2026: «si paga le aparecen esos pasos según lo
 * que eligió, propietario, inmobiliaria y agente inmobiliario»). Reemplaza al asistente largo para estas cuentas:
 * nadie que vino a publicar vuelve a ver «Antes de comenzar» con su razón social y su NIT.
 *   · Se abre SOLA al pagar (`?bienvenida=activar`) y después una vez al día mientras falte algo.
 *   · «Activar mi cuenta» (una parte cerrada, el mes gratis del aliado) la abre cuando quiera.
 * Lo que guarda se cambia después en Configuración → «Tus datos» y «Medios de pago».
 */
export function PasosParaActivar() {
  const { agency, agencyRole, refreshAgency } = useAuth();
  const hechos = {
    cuentaDeAgente: agency?.cuentaDeAgente,
    vinoDelMarketplace: agency?.vinoDelMarketplace,
    rol: agencyRole,
    estado: agency?.acceso?.estado ?? null,
  };
  const sola = quienSeActiva(hechos, 'sola');
  const perfil = sola ?? quienSeActiva(hechos, 'aPedido');
  const modoComercial = agency?.modoComercial === true;
  const { config, refetch } = useInmobiliariaConfig(Boolean(perfil));
  const datos = config?.agency ?? null;
  const [medios, setMedios] = useState<MedioDePago[] | null>(null);
  const [abierto, setAbierto] = useState(false);
  // La cuenta quedó activa y la escena del segundo factor se llevó la ventana: al volver, la celebración primero.
  const [celebrarAlVolver, setCelebrarAlVolver] = useState(false);
  useEffect(() => {
    if (recienActivada()) setCelebrarAlVolver(true);
  }, []);

  const leerMedios = useCallback(async () => {
    try {
      setMedios(await mediosDePagoApi.listar());
    } catch {
      setMedios([]);
    }
  }, []);
  useEffect(() => {
    if (perfil) void leerMedios();
  }, [perfil, leerMedios]);
  useAlPedirLaActivacion(useCallback(() => setAbierto(true), []));

  const faltan = useMemo(
    () => (perfil && datos && medios ? pasosQueFaltan(datos, medios, perfil, modoComercial) : null),
    [perfil, datos, medios, modoComercial],
  );

  useEffect(() => {
    if (!sola || !agency?.id || !faltan || faltan.length === 0 || abierto) return;
    const forzado = vieneDePagar();
    if (!forzado && yaSalioHoy(agency.id)) return;
    // Un respiro: que el panel cargue antes de pedir algo.
    const t = window.setTimeout(
      () => {
        marcarHoy(agency.id);
        setAbierto(true);
      },
      forzado ? 600 : 1500,
    );
    return () => window.clearTimeout(t);
    // `abierto` sólo para no reabrir; lo demás decide cuándo.
  }, [sola, agency?.id, faltan, abierto]);

  /*
   * 🔴 La ventana se queda con lo que había AL ABRIR. Al activar, la cuenta sale del modo comercial, deja de estar
   * «pagado» y el back empieza a exigir el segundo factor: `perfil`, `datos` y `faltan` cambian o se caen (un 403) y
   * la ventana se desmontaba a mitad, sin el «quedó activa» (QA 28-10, paso 14).
   */
  const [abiertaCon, setAbiertaCon] = useState<{
    perfil: PerfilQueSeActiva;
    enPrueba: boolean;
    datos: AgencyProfile;
    medios: MedioDePago[];
    modoComercial: boolean;
    faltan: PasoParaActivar[];
  } | null>(null);
  if (abierto && !abiertaCon && perfil && datos && medios && faltan) {
    setAbiertaCon({ perfil, enPrueba: hechos.estado === 'prueba', datos, medios, modoComercial, faltan });
  }
  if (!abierto && abiertaCon) setAbiertaCon(null);

  if (celebrarAlVolver && !abierto) {
    return (
      <Dialog open onOpenChange={() => undefined}>
        <DialogContent size="lg" className="overflow-hidden p-0" data-testid="pasos-para-activar" hideClose>
          <DialogBody className="p-0 sm:p-0">
            <div className="p-6 md:p-8">
              <TodoListo perfil={agency?.cuentaDeAgente ? 'agente' : 'inmobiliaria'} recienActivada alCerrar={() => setCelebrarAlVolver(false)} reducido={false} />
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    );
  }
  if (!abierto || !abiertaCon) return null;
  return (
    <VentanaDeLosPasos
      perfil={abiertaCon.perfil}
      enPrueba={abiertaCon.enPrueba}
      datos={abiertaCon.datos}
      medios={abiertaCon.medios}
      modoComercial={abiertaCon.modoComercial}
      faltanAlAbrir={abiertaCon.faltan}
      alGuardar={async () => {
        await Promise.all([refetch(), leerMedios(), refreshAgency({ despuesDeUnCambio: true })]);
      }}
      alCerrar={() => setAbierto(false)}
    />
  );
}

/** Los pasos de la ventana: los tres de siempre y, si en esta ventana se activa la cuenta, el segundo factor. */
type PasoDeLaVentana = PasoParaActivar | 'seguridad';

/** «Protege tu cuenta»: lo que el back exige apenas la cuenta queda activa (mueve plata). */
const TEXTOS_DE_LA_SEGURIDAD = {
  corto: 'Tu seguridad',
  descripcion: 'Un código al entrar',
  titulo: 'Protege tu cuenta',
  ayuda: 'Tu cuenta ya mueve plata. Cada vez que entres te pediremos un código de 6 dígitos de tu celular. Es lo último.',
  ilustracion: 'escudo' as NombreIlustracion,
};

/** Una línea de qué se pide en cada paso, para la lista de la izquierda. */
function descripcionDelPaso(paso: PasoParaActivar, perfil: PerfilQueSeActiva): string {
  if (paso === 'datos') return perfil === 'agente' ? 'Nombre, cédula y celular' : 'Razón social y representante';
  if (paso === 'cuenta') return 'Donde recibes la plata';
  return 'NIT, dirección e IVA';
}

interface VentanaProps {
  perfil: PerfilQueSeActiva;
  enPrueba?: boolean;
  datos: AgencyProfile;
  medios: MedioDePago[];
  modoComercial: boolean;
  faltanAlAbrir: PasoParaActivar[];
  alGuardar: () => Promise<void>;
  alCerrar: () => void;
}

export function VentanaDeLosPasos({ perfil, enPrueba = false, datos, medios, modoComercial, faltanAlAbrir, alGuardar, alCerrar }: VentanaProps) {
  const reducido = usePrefersReducedMotion();
  const { user, setMfaVerified } = useAuth();
  /*
   * Si la cuenta se activa en ESTA ventana (venía en modo comercial), el back pide el segundo factor enseguida: va
   * como cuarto paso, aquí mismo, y no como un aviso suelto en el panel. Se decide al abrir y no cambia.
   */
  const [conSeguridad] = useState(modoComercial);
  // Mientras se activa aquí, el muro de la migración espera (no tapa el «quedó activa»).
  useEffect(() => {
    if (!conSeguridad) return;
    marcarActivacionEnCurso(true);
    return () => marcarActivacionEnCurso(false);
  }, [conSeguridad]);
  const pasos: PasoDeLaVentana[] = conSeguridad ? [...PASOS_PARA_ACTIVAR, 'seguridad'] : [...PASOS_PARA_ACTIVAR];
  // Empieza en el primero que falta; los hechos se ven con su ✓ y se pueden abrir para cambiarlos.
  const [paso, setPaso] = useState<PasoDeLaVentana | 'listo'>(() => (faltanAlAbrir[0] as PasoDeLaVentana | undefined) ?? (conSeguridad ? 'seguridad' : 'listo'));
  const [hechos, setHechos] = useState<Set<PasoDeLaVentana>>(() => new Set(PASOS_PARA_ACTIVAR.filter((p) => !faltanAlAbrir.includes(p))));
  // Lo que se guardó en los pasos de antes, para no pedirlo dos veces (el NIT sale de la cédula, el titular del nombre).
  const [vivo, setVivo] = useState<AgencyProfile>(datos);
  // Ya activa: a los pasos de datos no se vuelve (el paso 4 no tiene atrás).
  const [activada, setActivada] = useState(false);

  const nombreDeLaCuenta = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const terminar = (p: PasoDeLaVentana, cambios: Partial<AgencyProfile> = {}) => {
    setVivo((v) => ({ ...v, ...cambios }));
    const nuevos = new Set(hechos).add(p);
    setHechos(nuevos);
    setPaso(pasos.find((x) => !nuevos.has(x)) ?? 'listo');
  };
  const numero = paso === 'listo' ? pasos.length : pasos.indexOf(paso) + 1;
  const textos = paso === 'listo' ? null : paso === 'seguridad' ? TEXTOS_DE_LA_SEGURIDAD : textosDelPaso(paso, perfil);
  const enSeguridad = paso === 'seguridad';

  return (
    <Dialog open onOpenChange={(o) => !o && !enSeguridad && alCerrar()}>
      <DialogContent
        size="xl"
        className="overflow-hidden p-0"
        data-testid="pasos-para-activar"
        data-perfil={perfil}
        hideClose={enSeguridad}
        onOpenAutoFocus={alPrimerCampo}
      >
        {/* Nico, 28-10: el gris de la izquierda va A SANGRE (sin el relleno blanco del cuerpo del diálogo). */}
        <DialogBody className="p-0 sm:p-0">
        <div className="grid min-h-full lg:grid-cols-[minmax(0,16.5rem)_minmax(0,1fr)]">
          <RielDeLosPasos
            perfil={perfil}
            enPrueba={enPrueba}
            pasos={pasos}
            actual={paso}
            hechos={hechos}
            alElegir={activada ? undefined : (p) => setPaso(p)}
          />
          <div className="min-w-0 p-6 md:p-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={paso}
                initial={reducido ? { opacity: 0 } : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reducido ? { opacity: 0 } : { opacity: 0, x: -16 }}
                transition={enterTransition(reducido)}
              >
                {paso === 'listo' || !textos ? (
                  <TodoListo perfil={perfil} recienActivada={activada} alCerrar={alCerrar} reducido={reducido} />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] uppercase tracking-wider text-primary" data-testid="paso-para-activar-numero">
                          Paso {numero} de {pasos.length} · {textos.corto}
                        </p>
                        <DialogTitle className="mt-2 text-h3 text-fg">{textos.titulo}</DialogTitle>
                        <DialogDescription className="mt-1.5 text-body text-fg-muted">{textos.ayuda}</DialogDescription>
                      </div>
                      <motion.span
                        key={textos.ilustracion}
                        aria-hidden="true"
                        className="hidden shrink-0 sm:block"
                        initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.85, rotate: -6 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={enterTransition(reducido)}
                      >
                        <Ilustracion nombre={textos.ilustracion} tamano={80} tono="auto" alt="" />
                      </motion.span>
                    </div>
                    <div className="mt-6">
                      {paso === 'datos' && (
                        <PasoDatos
                          perfil={perfil}
                          datos={vivo}
                          nombreDeLaCuenta={nombreDeLaCuenta}
                          alCerrar={alCerrar}
                          alTerminar={async (c) => {
                            await alGuardar();
                            terminar('datos', c);
                          }}
                        />
                      )}
                      {paso === 'cuenta' && (
                        <PasoCuenta
                          datos={vivo}
                          medios={medios}
                          nombreDeLaCuenta={nombreDeLaCuenta}
                          alCerrar={alCerrar}
                          alTerminar={async () => {
                            await alGuardar();
                            terminar('cuenta');
                          }}
                        />
                      )}
                      {paso === 'factura' && (
                        <PasoFactura
                          perfil={perfil}
                          datos={vivo}
                          modoComercial={modoComercial}
                          nombre={user?.firstName ?? ''}
                          apellido={user?.lastName ?? ''}
                          correoDeLaCuenta={user?.email ?? ''}
                          nombreDeLaCuenta={nombreDeLaCuenta}
                          alCerrar={alCerrar}
                          alTerminar={async () => {
                            if (conSeguridad) {
                              // Recién activa: el back ya pide el segundo factor y volver a leer sería un 403.
                              // Se lee al terminar el paso 4.
                              setActivada(true);
                              marcarRecienActivada(true);
                              terminar('factura');
                              return;
                            }
                            await alGuardar();
                            terminar('factura');
                          }}
                        />
                      )}
                      {paso === 'seguridad' && (
                        <PasoSeguridad
                          alListo={async () => {
                            setMfaVerified();
                            try {
                              await alGuardar();
                            } catch {
                              /* lo que no se pudo leer ahora se lee al entrar al panel */
                            }
                            terminar('seguridad');
                          }}
                          alYaTenerFactor={() => terminar('seguridad')}
                        />
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Paso 4: la app de autenticación, con el MISMO paso a paso del panel (QR, clave, primer código y el mock fuera de
 * producción). Sin su encabezado: el de la ventana ya dice qué es y por qué. Su «Listo» se deja leer y sigue solo.
 */
function PasoSeguridad({ alListo, alYaTenerFactor }: { alListo: () => Promise<void>; alYaTenerFactor: () => void }) {
  const yaSiguio = useRef(false);
  const seguir = useCallback(
    (hacer: () => void | Promise<void>) => {
      if (yaSiguio.current) return;
      yaSiguio.current = true;
      void hacer();
    },
    [],
  );
  return (
    <div data-testid="paso-seguridad">
      <ActivarSegundoFactorPasoAPaso
        sinEncabezado
        onYaTeniaFactor={() => seguir(alYaTenerFactor)}
        onActivado={() => {
          window.setTimeout(() => seguir(alListo), PAUSA_DEL_LISTO_MS);
        }}
      />
    </div>
  );
}

/**
 * La lista de los pasos, como la del asistente de siempre (`OnboardingStepList`): número o ✓, la línea de tiempo y
 * la marca azul que se desliza al avanzar. En teléfono, la fila de círculos.
 */
function RielDeLosPasos({
  perfil,
  enPrueba,
  pasos,
  actual,
  hechos,
  alElegir,
}: {
  perfil: PerfilQueSeActiva;
  enPrueba: boolean;
  pasos: PasoDeLaVentana[];
  actual: PasoDeLaVentana | 'listo';
  hechos: Set<PasoDeLaVentana>;
  alElegir?: (p: PasoParaActivar) => void;
}) {
  const lista: PasoDeLaLista[] = pasos.map((p) => {
    const esEste = actual === p;
    const hecho = actual === 'listo' || (hechos.has(p) && !esEste);
    const navegable = Boolean(alElegir) && p !== 'seguridad' && !esEste;
    return {
      key: p,
      label: p === 'seguridad' ? TEXTOS_DE_LA_SEGURIDAD.corto : textosDelPaso(p, perfil).corto,
      descripcion: p === 'seguridad' ? TEXTOS_DE_LA_SEGURIDAD.descripcion : descripcionDelPaso(p, perfil),
      estado: esEste ? 'actual' : hecho ? 'hecho' : 'pendiente',
      onSelect: navegable ? () => alElegir?.(p as PasoParaActivar) : undefined,
      etiquetaDelBoton: `Ir a ${p === 'seguridad' ? TEXTOS_DE_LA_SEGURIDAD.corto : textosDelPaso(p, perfil).corto}`,
      testId: `riel-${p}`,
      testIdDelBoton: `riel-ir-${p}`,
    };
  });
  return (
    <div className="h-full border-b border-border bg-surface-muted px-6 py-6 lg:border-b-0 lg:border-r lg:px-7 lg:py-9">
      <p className="font-mono text-[11px] uppercase tracking-wider text-primary">{perfil === 'agente' ? 'Tu cuenta de agente' : 'Tu inmobiliaria'}</p>
      <p className="mt-2 text-body font-medium leading-snug text-fg">
        {enPrueba ? 'Actívala y usa todo en tu mes gratis.' : 'Ya tienes Leasefy completo. Actívalo aquí.'}
      </p>
      <OnboardingStepList
        className="mt-6"
        pasos={lista}
        etiqueta="Pasos para activar tu cuenta"
        nota="Cada paso queda guardado al seguir"
      />
    </div>
  );
}

/** Colores de la chispa sobre la ventana clara: el azul de la marca, el cielo y el ámbar. */
const COLORES_DE_LA_CELEBRACION = ['#2a3cff', '#5b6bff', '#a9d4f5', '#f4c46a', '#ffffff'];

function TodoListo({
  perfil,
  recienActivada,
  alCerrar,
  reducido,
}: {
  perfil: PerfilQueSeActiva;
  recienActivada: boolean;
  alCerrar: () => void;
  reducido: boolean;
}) {
  const figura = useRef<HTMLSpanElement>(null);
  // La chispa sale de la ilustración, una vez, cuando la cuenta queda activa aquí mismo.
  useEffect(() => {
    if (!recienActivada || reducido) return;
    const reloj = window.setTimeout(() => {
      const caja = figura.current?.getBoundingClientRect();
      const origen =
        caja && window.innerWidth > 0
          ? { x: (caja.left + caja.width / 2) / window.innerWidth, y: (caja.top + caja.height / 2) / window.innerHeight }
          : { x: 0.5, y: 0.4 };
      const comun = { origin: origen, colors: COLORES_DE_LA_CELEBRACION, zIndex: 120, disableForReducedMotion: true };
      void confetti({ ...comun, particleCount: 90, spread: 100, startVelocity: 38, gravity: 0.9, scalar: 0.9, ticks: 200 });
      void confetti({ ...comun, particleCount: 40, spread: 360, startVelocity: 18, gravity: 0.6, scalar: 0.6, shapes: ['circle'], ticks: 150 });
    }, 280);
    return () => {
      window.clearTimeout(reloj);
      confetti.reset();
    };
  }, [recienActivada, reducido]);

  const irAlPanel = () => {
    marcarRecienActivada(false);
    if (recienActivada) {
      // La cuenta cambió entera (activa, con segundo factor): el panel arranca de cero, sin los 403 de antes.
      window.location.assign('/panel/inmobiliaria');
      return;
    }
    alCerrar();
  };

  return (
    <div className="flex flex-col items-center py-6 text-center" data-testid="pasos-para-activar-listos">
      <motion.span
        ref={figura}
        initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={reducido ? enterTransition(reducido) : motionSpring.bouncy}
      >
        <Ilustracion nombre="pago_confirmado" tamano={128} tono="auto" alt="" />
      </motion.span>
      <p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-primary">Todo listo</p>
      <DialogTitle className="mt-2 text-h2 text-fg">{perfil === 'agente' ? 'Tu cuenta quedó activa' : 'Tu inmobiliaria quedó activa'}</DialogTitle>
      <DialogDescription className="mt-2 max-w-sm text-body text-fg-muted">
        Ya puedes cobrar arriendos, firmar contratos y recibir tu plata. Si algo cambia, lo editas en Configuración →{' '}
        {perfil === 'agente' ? 'Tus datos' : 'Tu inmobiliaria'}.
      </DialogDescription>
      <Button className="mt-7" onClick={irAlPanel} data-testid="pasos-para-activar-ir-al-panel">
        Ir a mi panel
      </Button>
      {/* Lo que sigue después de activar (Nico, 28-10-2026): la guía para facturar electrónicamente con Feel. */}
      <Button asChild variant="ghost" size="sm" hideArrow className="mt-2" data-testid="pasos-para-activar-facturacion">
        <a href="/panel/inmobiliaria/facturacion/activar">Siguiente: activa tu facturación electrónica</a>
      </Button>
    </div>
  );
}

// ── Las piezas de cada paso ───────────────────────────────────────────────────────────────────────────────────

export function Campo({ id, etiqueta, error, children, pista }: { id: string; etiqueta: string; error?: string | null; pista?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} required>
        {etiqueta}
      </Label>
      {children}
      <ErrorDelCampo id={`${id}-error`} mensaje={error ?? null} pista={pista} />
    </div>
  );
}

export function PieDelPaso({ guardando, alCerrar, texto = 'Guardar y seguir', aviso }: { guardando: boolean; alCerrar: () => void; texto?: string; aviso?: string | null }) {
  return (
    <div className="mt-8 space-y-3">
      {aviso && (
        <p role="alert" className="text-sm text-danger" data-testid="pasos-para-activar-aviso">
          {aviso}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" hideArrow onClick={alCerrar} data-testid="pasos-para-activar-mas-tarde">
          Más tarde
        </Button>
        <Button type="submit" isLoading={guardando} data-testid="pasos-para-activar-seguir">
          {texto}
        </Button>
      </div>
    </div>
  );
}

export type Errores<C extends string> = Partial<Record<C, string | null>>;

/** Guarda y reparte el 400 en sus campos; lo que no tiene campo queda en el aviso del pie. */
export async function guardarCon<C extends string>(
  accion: string,
  hacer: () => Promise<unknown>,
  campos: readonly C[],
  mapa: Record<string, C>,
  setErrores: (e: Errores<C>) => void,
  setAviso: (a: string | null) => void,
): Promise<boolean> {
  setAviso(null);
  try {
    await hacer();
    return true;
  } catch (error) {
    const { porCampo, sueltos } = repartirErroresDelServidor<C>(error, { mapa, campos });
    setErrores(porCampo);
    const sinCampo = Object.keys(porCampo).length === 0;
    setAviso(
      sueltos[0] ??
        (sinCampo
          ? error instanceof Error && error.name === 'ActivacionSinSesionError'
            ? error.message
            : mensajeParaLaPersona(error, { porDefecto: 'No pudimos guardar. Prueba de nuevo en un momento.', accion })
          : null),
    );
    return false;
  }
}

export function CampoDeCelular({ id, valor, alCambiar, error }: { id: string; valor: string; alCambiar: (v: string) => void; error?: string | null }) {
  return (
    <Campo id={id} etiqueta="Celular" error={error} pista="Tus clientes te escriben aquí por WhatsApp.">
      <PhoneInput
        id={id}
        aria-required
        countryCode="CO"
        autoComplete="tel"
        inputMode="numeric"
        placeholder="300 123 4567"
        value={valor}
        onChange={(v) => alCambiar(v.replace(/\D/g, ''))}
        invalid={Boolean(error)}
        aria-describedby={`${id}-error`}
      />
    </Campo>
  );
}

function PasoDatos({
  perfil,
  datos,
  nombreDeLaCuenta,
  alTerminar,
  alCerrar,
}: {
  perfil: PerfilQueSeActiva;
  datos: AgencyProfile;
  nombreDeLaCuenta: string;
  alTerminar: (cambios: Partial<AgencyProfile>) => Promise<void>;
  alCerrar: () => void;
}) {
  const esAgente = perfil === 'agente';
  const [razonSocial, setRazonSocial] = useState(datos.razonSocial ?? (esAgente ? '' : datos.name ?? ''));
  const [nombre, setNombre] = useState(datos.legalRepresentative ?? (nombreDeLaCuenta || (esAgente ? datos.name : '') || ''));
  const [cedula, setCedula] = useState(datos.legalDocumentNumber ?? '');
  const [celular, setCelular] = useState(soloDigitos(datos.phone ?? datos.whatsapp ?? '').replace(/^57(?=3\d{9}$)/, ''));
  const [errores, setErrores] = useState<Errores<'razonSocial' | 'nombre' | 'cedula' | 'celular'>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const locales = {
      razonSocial: esAgente || razonSocial.trim() ? null : 'Escribe la razón social, como está en el RUT.',
      nombre: errorDelNombre(nombre),
      cedula: errorDeLaCedula(cedula),
      celular: errorDelCelular(celular),
    };
    setErrores(locales);
    if (Object.values(locales).some(Boolean)) return;
    setGuardando(true);
    // El agente factura a su nombre: su razón social es su nombre.
    const cambios = {
      razonSocial: esAgente ? nombre.trim() : razonSocial.trim(),
      legalRepresentative: nombre.trim(),
      legalDocumentNumber: soloDigitos(cedula),
      phone: soloDigitos(celular),
      whatsapp: soloDigitos(celular),
    };
    const ok = await guardarCon(
      'guardar tus datos',
      () => agencyApi.updateAgency(cambios),
      ['razonSocial', 'nombre', 'cedula', 'celular'] as const,
      { razonSocial: 'razonSocial', legalRepresentative: 'nombre', legalDocumentNumber: 'cedula', phone: 'celular', whatsapp: 'celular' },
      setErrores,
      setAviso,
    );
    if (ok) await alTerminar(cambios);
    setGuardando(false);
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-4" data-testid="paso-datos">
      {!esAgente && (
        <Campo id="activar-razon-social" etiqueta="Razón social" error={errores.razonSocial}>
          <Input id="activar-razon-social" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} autoComplete="organization" placeholder="Arriendos del Valle S.A.S." aria-invalid={Boolean(errores.razonSocial)} aria-describedby="activar-razon-social-error" />
        </Campo>
      )}
      <Campo id="activar-nombre" etiqueta={esAgente ? 'Nombre completo' : 'Representante legal'} error={errores.nombre}>
        <Input id="activar-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" aria-invalid={Boolean(errores.nombre)} aria-describedby="activar-nombre-error" />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="activar-cedula" etiqueta={esAgente ? 'Cédula' : 'Cédula del representante'} error={errores.cedula}>
          <Input id="activar-cedula" value={cedula} onChange={(e) => setCedula(e.target.value)} inputMode="numeric" placeholder="1020304050" aria-invalid={Boolean(errores.cedula)} aria-describedby="activar-cedula-error" />
        </Campo>
        <CampoDeCelular id="activar-celular" valor={celular} alCambiar={setCelular} error={errores.celular} />
      </div>
      <PieDelPaso guardando={guardando} alCerrar={alCerrar} aviso={aviso} />
    </form>
  );
}

function PasoCuenta({
  datos,
  medios,
  nombreDeLaCuenta,
  alTerminar,
  alCerrar,
}: {
  datos: AgencyProfile;
  medios: MedioDePago[];
  nombreDeLaCuenta: string;
  alTerminar: () => Promise<void>;
  alCerrar: () => void;
}) {
  const existente = cuentaDondeRecibe(medios);
  const [banco, setBanco] = useState(existente?.banco ?? '');
  const [tipo, setTipo] = useState<TipoDeCuenta>((existente?.tipoDeCuenta as TipoDeCuenta) || 'AHORROS');
  const [numero, setNumero] = useState(existente?.numeroDeCuenta ?? '');
  const [titular, setTitular] = useState(existente?.titular ?? datos.razonSocial ?? datos.legalRepresentative ?? nombreDeLaCuenta);
  const [documento, setDocumento] = useState(existente?.documentoTitular ?? (datos.nit ? soloDigitos(datos.nit.split('-')[0]) : datos.legalDocumentNumber ?? ''));
  const [visible, setVisible] = useState(existente?.visibleAlInquilino ?? true);
  const [errores, setErrores] = useState<Errores<'banco' | 'numero' | 'titular' | 'documento'>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const locales = {
      banco: banco ? null : 'Elige tu banco.',
      numero: errorDeLaCuenta(numero),
      titular: titular.trim() ? null : 'Escribe a nombre de quién está la cuenta.',
      documento: errorDeLaCedula(documento) ? 'Escribe la cédula o el NIT del titular (de 6 a 10 dígitos).' : null,
    };
    setErrores(locales);
    if (Object.values(locales).some(Boolean)) return;
    setGuardando(true);
    const valores = {
      tipo: 'TRANSFERENCIA' as const,
      nombre: `${banco} · ${tipo === 'AHORROS' ? 'Ahorros' : 'Corriente'}`.slice(0, 80),
      banco,
      tipoDeCuenta: tipo,
      numeroDeCuenta: soloDigitos(numero),
      titular: titular.trim(),
      documentoTitular: soloDigitos(documento),
      visibleAlInquilino: visible,
    };
    const ok = await guardarCon(
      'guardar tu cuenta',
      () => (existente ? mediosDePagoApi.actualizar(existente.id, valores) : mediosDePagoApi.crear(valores)),
      ['banco', 'numero', 'titular', 'documento'] as const,
      { banco: 'banco', numeroDeCuenta: 'numero', titular: 'titular', documentoTitular: 'documento' },
      setErrores,
      setAviso,
    );
    if (ok) await alTerminar();
    setGuardando(false);
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-4" data-testid="paso-cuenta">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="activar-banco" etiqueta="Banco" error={errores.banco}>
          <Select value={banco} onValueChange={setBanco}>
            <SelectTrigger id="activar-banco" aria-invalid={Boolean(errores.banco)} aria-describedby="activar-banco-error" data-testid="activar-banco">
              <SelectValue placeholder="Elige tu banco" />
            </SelectTrigger>
            <SelectContent>
              {COLOMBIAN_BANKS.map((b) => (
                <SelectItem key={b.code} value={b.name}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo id="activar-numero" etiqueta="Número de cuenta" error={errores.numero}>
          <Input id="activar-numero" value={numero} onChange={(e) => setNumero(e.target.value)} inputMode="numeric" placeholder="00012345678" aria-invalid={Boolean(errores.numero)} aria-describedby="activar-numero-error" />
        </Campo>
      </div>
      <RadioCardGroup orientation="horizontal" className="grid grid-cols-2 gap-2" value={tipo} onValueChange={(v) => setTipo(v as TipoDeCuenta)} aria-label="Tipo de cuenta">
        <RadioCard value="AHORROS" label="Ahorros" data-testid="activar-ahorros" />
        <RadioCard value="CORRIENTE" label="Corriente" data-testid="activar-corriente" />
      </RadioCardGroup>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="activar-titular" etiqueta="A nombre de" error={errores.titular}>
          <Input id="activar-titular" value={titular} onChange={(e) => setTitular(e.target.value)} aria-invalid={Boolean(errores.titular)} aria-describedby="activar-titular-error" />
        </Campo>
        <Campo id="activar-documento" etiqueta="Cédula o NIT del titular" error={errores.documento}>
          <Input id="activar-documento" value={documento} onChange={(e) => setDocumento(e.target.value)} inputMode="numeric" aria-invalid={Boolean(errores.documento)} aria-describedby="activar-documento-error" />
        </Campo>
      </div>
      <label className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3">
        <span>
          <span className="block text-sm font-medium text-fg">Tus inquilinos también te pueden transferir aquí</span>
          <span className="block text-caption text-fg-muted">La ven en su portal, sin el número completo hasta que vayan a pagar.</span>
        </span>
        <Switch checked={visible} onCheckedChange={setVisible} aria-label="Mostrar la cuenta a mis inquilinos" />
      </label>
      <PieDelPaso guardando={guardando} alCerrar={alCerrar} aviso={aviso} />
    </form>
  );
}

/** Lo que se dice bajo el NIT cuando otra cuenta ya lo tiene (QA 28-10: salía «Ya existe un registro con esos datos»). */
export const NIT_YA_REGISTRADO = 'Otra cuenta de Leasefy ya tiene este NIT. Revísalo; si es tu empresa, escríbenos y te unimos a ella.';

/**
 * Activar, y si el back dice que el registro ya existe sin decir el campo, es el NIT: es lo único único que la persona
 * escribe al activar. Se devuelve como error del campo NIT para que salga bajo él.
 */
async function activarSinNitRepetido(d: Parameters<typeof activarLaCuenta>[0]) {
  try {
    await activarLaCuenta(d);
  } catch (err) {
    if (err instanceof ApiError && err.status === 409 && err.code === 'YA_EXISTE' && !camposDelError(err).length) {
      throw new ApiError(409, NIT_YA_REGISTRADO, 'YA_EXISTE', { campos: [{ campo: 'nit', regla: 'unico', mensaje: NIT_YA_REGISTRADO }] });
    }
    throw err;
  }
}

function PasoFactura({
  perfil,
  datos,
  modoComercial,
  nombre,
  apellido,
  correoDeLaCuenta,
  nombreDeLaCuenta,
  alTerminar,
  alCerrar,
}: {
  perfil: PerfilQueSeActiva;
  datos: AgencyProfile;
  modoComercial: boolean;
  nombre: string;
  apellido: string;
  correoDeLaCuenta: string;
  nombreDeLaCuenta: string;
  alTerminar: () => Promise<void>;
  alCerrar: () => void;
}) {
  const esAgente = perfil === 'agente';
  // El NIT del agente es su cédula con el dígito de la DIAN: se llena solo.
  const [nit, setNit] = useState(datos.nit ?? (esAgente ? nitDeLaCedula(datos.legalDocumentNumber ?? '') : ''));
  const [correo, setCorreo] = useState(datos.email ?? correoDeLaCuenta);
  const [direccion, setDireccion] = useState(datos.address ?? '');
  const [departamento, setDepartamento] = useState(datos.department ?? '');
  const [ciudad, setCiudad] = useState(datos.city ?? '');
  const [iva, setIva] = useState<'no' | 'si' | ''>(datos.responsableIva === true ? 'si' : datos.responsableIva === false ? 'no' : '');
  const [acepta, setAcepta] = useState(!modoComercial);
  const [errores, setErrores] = useState<Errores<'nit' | 'correo' | 'direccion' | 'departamento' | 'ciudad' | 'iva' | 'acepta'>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const nitFijo = !modoComercial && Boolean(datos.nit);
  const municipios = useMemo(() => (departamento ? municipiosDe(departamento).map((m) => ({ value: m, label: m })) : []), [departamento]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const locales = {
      nit: errorDelNit(nit),
      correo: errorDelCorreo(correo),
      direccion: direccion.trim() ? null : 'Escribe tu dirección.',
      departamento: departamento ? null : 'Elige el departamento.',
      ciudad: ciudad ? null : 'Elige el municipio.',
      iva: iva ? null : 'Dinos si cobras IVA.',
      acepta: acepta ? null : 'Para activar tu cuenta, acepta los Términos y la Política de datos.',
    };
    setErrores(locales);
    if (Object.values(locales).some(Boolean)) return;
    if (modoComercial && !(datos.legalRepresentative && datos.legalDocumentNumber && datos.phone)) {
      setAviso(`Antes de activar, completa el paso 1 («${esAgente ? 'Tus datos' : 'Tu empresa'}»).`);
      return;
    }
    setGuardando(true);
    const ok = await guardarCon(
      modoComercial ? 'activar tu cuenta' : 'guardar tus datos de facturación',
      async () => {
        // 🔴 El NIT no se guarda suelto mientras la cuenta está en modo comercial: con NIT y sin avisar al micro quedaría
        // a medias. Viaja en la activación, que hace las dos cosas juntas.
        await agencyApi.updateAgency({
          email: correo.trim().toLowerCase(),
          address: direccion.trim(),
          city: ciudad,
          department: departamento,
          responsableIva: iva === 'si',
          ...(modoComercial || nitFijo ? {} : { nit: nit.trim() }),
        });
        if (modoComercial) {
          await activarSinNitRepetido({
            nombre: nombre || nombreDeLaCuenta.split(' ')[0] || 'Administrador',
            apellido: apellido || nombreDeLaCuenta.split(' ').slice(1).join(' ') || '-',
            razonSocial: (datos.razonSocial || datos.legalRepresentative || datos.name || nombreDeLaCuenta).trim(),
            nit: nit.trim(),
            representante: (datos.legalRepresentative || nombreDeLaCuenta).trim(),
            documentoDelRepresentante: soloDigitos(datos.legalDocumentNumber ?? ''),
            celular: soloDigitos(datos.phone ?? ''),
            correo: correo.trim().toLowerCase(),
            direccion: direccion.trim(),
            ciudad,
            departamento,
          });
        }
      },
      ['nit', 'correo', 'direccion', 'departamento', 'ciudad', 'iva', 'acepta'] as const,
      { nit: 'nit', email: 'correo', primaryContactEmail: 'correo', address: 'direccion', calle: 'direccion', city: 'ciudad', ciudad: 'ciudad', department: 'departamento', departamento: 'departamento', responsableIva: 'iva' },
      setErrores,
      setAviso,
    );
    if (ok) await alTerminar();
    setGuardando(false);
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-4" data-testid="paso-factura">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="activar-nit" etiqueta={esAgente ? 'NIT de tu RUT' : 'NIT'} error={errores.nit} pista={esAgente ? 'Tu cédula con el dígito de verificación.' : 'Con el dígito de verificación.'}>
          <Input id="activar-nit" value={nit} onChange={(e) => setNit(e.target.value)} disabled={nitFijo} placeholder={esAgente ? '1020304050-7' : '900123456-8'} aria-invalid={Boolean(errores.nit)} aria-describedby="activar-nit-error" />
        </Campo>
        <Campo id="activar-correo" etiqueta="Correo para las facturas" error={errores.correo}>
          <Input id="activar-correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="email" aria-invalid={Boolean(errores.correo)} aria-describedby="activar-correo-error" />
        </Campo>
      </div>
      <Campo id="activar-direccion" etiqueta="Dirección" error={errores.direccion}>
        <Input id="activar-direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} autoComplete="street-address" placeholder="Carrera 43A # 1-50" aria-invalid={Boolean(errores.direccion)} aria-describedby="activar-direccion-error" />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="activar-departamento" etiqueta="Departamento" error={errores.departamento}>
          <Combobox
            value={departamento || undefined}
            onChange={(v) => {
              setDepartamento(v ?? '');
              setCiudad('');
            }}
            options={DEPARTAMENTO_NOMBRES.map((n) => ({ value: n, label: n }))}
            placeholder="Elige el departamento"
            searchPlaceholder="Buscar departamento…"
            invalid={Boolean(errores.departamento)}
            data-testid="activar-departamento"
          />
        </Campo>
        <Campo id="activar-ciudad" etiqueta="Municipio" error={errores.ciudad}>
          <Combobox
            value={ciudad || undefined}
            onChange={(v) => setCiudad(v ?? '')}
            options={municipios}
            placeholder={departamento ? 'Elige el municipio' : 'Primero el departamento'}
            searchPlaceholder="Buscar municipio…"
            disabled={!departamento}
            invalid={Boolean(errores.ciudad)}
            data-testid="activar-ciudad"
          />
        </Campo>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-fg">¿Cobras IVA en tus facturas?</p>
        <RadioCardGroup orientation="horizontal" className="grid gap-2 sm:grid-cols-2" value={iva} onValueChange={(v) => setIva(v as 'no' | 'si')} aria-label="¿Cobras IVA?">
          <RadioCard value="no" label="No" description={esAgente ? 'No soy responsable de IVA (lo más común)' : 'No somos responsables de IVA'} data-testid="activar-iva-no" />
          <RadioCard value="si" label="Sí" description={esAgente ? 'Soy responsable de IVA' : 'Somos responsables de IVA (lo más común en una S.A.S.)'} data-testid="activar-iva-si" />
        </RadioCardGroup>
        <ErrorDelCampo id="activar-iva-error" mensaje={errores.iva ?? null} />
      </div>
      {modoComercial && (
        <div className="space-y-1.5">
          <label className="flex items-start gap-3 text-sm text-fg" htmlFor="activar-acepta">
            <Checkbox id="activar-acepta" checked={acepta} onCheckedChange={(v) => setAcepta(v === true)} aria-describedby="activar-acepta-error" data-testid="activar-acepta" />
            <span>
              Acepto los{' '}
              <Link href="/terminos" target="_blank" className="text-primary underline-offset-2 hover:underline">
                Términos
              </Link>{' '}
              y la{' '}
              <Link href="/privacidad" target="_blank" className="text-primary underline-offset-2 hover:underline">
                Política de tratamiento de datos
              </Link>{' '}
              de Leasefy.
            </span>
          </label>
          <ErrorDelCampo id="activar-acepta-error" mensaje={errores.acepta ?? null} />
        </div>
      )}
      <PieDelPaso guardando={guardando} alCerrar={alCerrar} aviso={aviso} texto={modoComercial ? 'Activar mi cuenta' : 'Guardar y terminar'} />
    </form>
  );
}
