'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bank, Check, CheckCircle, IdentificationCard, Receipt, type Icon } from '@phosphor-icons/react';
import { enterTransition, RadioCard, RadioCardGroup, usePrefersReducedMotion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneField } from '@/components/ui/phone-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { useAuth } from '@/lib/auth/use-auth';
import { agencyApi } from '@/lib/api/inmobiliaria.service';
import { mediosDePagoApi } from '@/lib/api/medios-de-pago.service';
import type { MedioDePago, TipoDeCuenta } from '@/lib/api/medios-de-pago.types';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { useInmobiliariaConfig } from '@/lib/hooks/useInmobiliaria';
import type { AgencyProfile } from '@/lib/types/inmobiliaria';
import { COLOMBIAN_BANKS } from '@/lib/types/payment-accounts';
import {
  PASOS_DEL_AGENTE,
  cuentaDelAgente,
  errorDeLaCedula,
  errorDeLaCuenta,
  errorDelCelular,
  errorDelCorreo,
  errorDelNit,
  errorDelNombre,
  nitDeLaCedula,
  pasosQueFaltan,
  soloDigitos,
  tocaPedirLosPasos,
  type PasoDelAgente,
} from '@/lib/conversion/pasos-del-agente';

/** Lo que dice cada paso en el riel de la izquierda y arriba del formulario. */
const PASO: Record<PasoDelAgente, { icono: Icon; corto: string; titulo: string; ayuda: string }> = {
  datos: {
    icono: IdentificationCard,
    corto: 'Tus datos',
    titulo: '¿Quién eres?',
    ayuda: 'Van en tus contratos y en lo que les mandas a tus clientes. Tal como aparecen en tu cédula.',
  },
  cuenta: {
    icono: Bank,
    corto: 'Tu cuenta',
    titulo: '¿Dónde recibes tu plata?',
    ayuda: 'Aquí te llegan tus comisiones. Sólo tú ves el número completo.',
  },
  factura: {
    icono: Receipt,
    corto: 'Tu factura',
    titulo: '¿A nombre de quién te facturamos?',
    ayuda: 'Con esto te llega la factura de Leasefy cada mes y salen bien tus propias facturas.',
  },
};

/** El modal sale solo una vez al día hasta que termine; con `?bienvenida=agente` (al pagar) sale de una. */
const llaveDelDia = (agencyId: string) => `leasefy-pasos-del-agente:${agencyId}:${new Date().toISOString().slice(0, 10)}`;
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
    return new URLSearchParams(window.location.search).get('bienvenida') === 'agente';
  } catch {
    return false;
  }
}

/**
 * Los tres pasos del agente inmobiliario después de pagar (Nico, 27-10-2026: «sus datos, cuenta y factura, tres pasos
 * cortos»). Sólo la cuenta de agente, pagada y su administrador. Sale sola al volver del pago y, mientras falte algo,
 * una vez al día; «Más tarde» la cierra por hoy. Todo lo que guarda se puede cambiar después en Configuración → «Tus
 * datos» y «Medios de pago».
 */
export function PasosDelAgente() {
  const { agency, agencyRole } = useAuth();
  const toca = tocaPedirLosPasos({ cuentaDeAgente: agency?.cuentaDeAgente, rol: agencyRole, estado: agency?.acceso?.estado ?? null });
  const { config, refetch } = useInmobiliariaConfig(toca);
  const perfil = config?.agency ?? null;
  const [medios, setMedios] = useState<MedioDePago[] | null>(null);
  const [abierto, setAbierto] = useState(false);

  const leerMedios = useCallback(async () => {
    try {
      setMedios(await mediosDePagoApi.listar());
    } catch {
      setMedios([]);
    }
  }, []);
  useEffect(() => {
    if (toca) void leerMedios();
  }, [toca, leerMedios]);

  const faltan = useMemo(() => (perfil && medios ? pasosQueFaltan(perfil, medios) : null), [perfil, medios]);

  useEffect(() => {
    if (!toca || !agency?.id || !faltan || faltan.length === 0 || abierto) return;
    const forzado = vieneDePagar();
    if (!forzado && yaSalioHoy(agency.id)) return;
    // Un respiro: que el panel cargue antes de pedir algo.
    const t = window.setTimeout(() => {
      marcarHoy(agency.id);
      setAbierto(true);
    }, forzado ? 600 : 1500);
    return () => window.clearTimeout(t);
    // `abierto` sólo para no reabrir; el resto decide cuándo.
  }, [toca, agency?.id, faltan, abierto]);

  if (!toca || !perfil || !medios || !faltan || !abierto) return null;
  return (
    <VentanaDeLosPasos
      perfil={perfil}
      medios={medios}
      faltanAlAbrir={faltan}
      alGuardar={async () => {
        await Promise.all([refetch(), leerMedios()]);
      }}
      alCerrar={() => setAbierto(false)}
    />
  );
}

interface VentanaProps {
  perfil: AgencyProfile;
  medios: MedioDePago[];
  faltanAlAbrir: PasoDelAgente[];
  alGuardar: () => Promise<void>;
  alCerrar: () => void;
}

export function VentanaDeLosPasos({ perfil, medios, faltanAlAbrir, alGuardar, alCerrar }: VentanaProps) {
  const reducido = usePrefersReducedMotion();
  const { user } = useAuth();
  // Empieza en el primero que falta; los ya hechos se ven con su ✓ y se pueden abrir para cambiarlos.
  const [paso, setPaso] = useState<PasoDelAgente | 'listo'>(faltanAlAbrir[0] ?? 'listo');
  const [hechos, setHechos] = useState<Set<PasoDelAgente>>(() => new Set(PASOS_DEL_AGENTE.filter((p) => !faltanAlAbrir.includes(p))));

  const nombreDeLaCuenta = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const terminar = (p: PasoDelAgente) => {
    const nuevos = new Set(hechos).add(p);
    setHechos(nuevos);
    setPaso(PASOS_DEL_AGENTE.find((x) => !nuevos.has(x)) ?? 'listo');
  };
  const numero = paso === 'listo' ? 3 : PASOS_DEL_AGENTE.indexOf(paso) + 1;

  return (
    <Dialog open onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent size="xl" className="overflow-hidden p-0" data-testid="pasos-del-agente">
        <div className="grid md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <RielDeLosPasos actual={paso} hechos={hechos} alElegir={setPaso} reducido={reducido} />
          <div className="min-w-0 p-6 md:p-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={paso}
                initial={reducido ? { opacity: 0 } : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reducido ? { opacity: 0 } : { opacity: 0, x: -16 }}
                transition={enterTransition(reducido)}
              >
                {paso === 'listo' ? (
                  <TodoListo alCerrar={alCerrar} reducido={reducido} />
                ) : (
                  <>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-primary" data-testid="paso-del-agente-numero">
                      Paso {numero} de 3 · {PASO[paso].corto}
                    </p>
                    <DialogTitle className="mt-2 text-h3 text-fg">{PASO[paso].titulo}</DialogTitle>
                    <DialogDescription className="mt-1.5 text-body text-fg-muted">{PASO[paso].ayuda}</DialogDescription>
                    <div className="mt-6">
                      {paso === 'datos' && (
                        <PasoDatos perfil={perfil} nombreDeLaCuenta={nombreDeLaCuenta} alCerrar={alCerrar} alTerminar={async () => { await alGuardar(); terminar('datos'); }} />
                      )}
                      {paso === 'cuenta' && (
                        <PasoCuenta perfil={perfil} medios={medios} nombreDeLaCuenta={nombreDeLaCuenta} alCerrar={alCerrar} alTerminar={async () => { await alGuardar(); terminar('cuenta'); }} />
                      )}
                      {paso === 'factura' && (
                        <PasoFactura perfil={perfil} correoDeLaCuenta={user?.email ?? ''} nombreDeLaCuenta={nombreDeLaCuenta} alCerrar={alCerrar} alTerminar={async () => { await alGuardar(); terminar('factura'); }} />
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RielDeLosPasos({
  actual,
  hechos,
  alElegir,
  reducido,
}: {
  actual: PasoDelAgente | 'listo';
  hechos: Set<PasoDelAgente>;
  alElegir: (p: PasoDelAgente) => void;
  reducido: boolean;
}) {
  return (
    <div className="relative overflow-hidden bg-primary-soft px-6 py-6 md:py-8">
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full border border-primary/15" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full border border-primary/15" />
      <p className="relative font-mono text-[11px] uppercase tracking-wider text-primary">Tu cuenta de agente</p>
      <p className="relative mt-2 text-[17px] font-medium leading-snug text-fg">Ya tienes Leasefy completo. Termina tu cuenta en tres pasos.</p>
      <ol className="relative mt-6 flex gap-2 md:flex-col md:gap-1" aria-label="Pasos">
        {PASOS_DEL_AGENTE.map((p, i) => {
          const { icono: Icono, corto } = PASO[p];
          const hecho = hechos.has(p);
          const esEste = actual === p;
          return (
            <li key={p} className="min-w-0 flex-1 md:flex-none">
              <button
                type="button"
                onClick={() => alElegir(p)}
                aria-current={esEste ? 'step' : undefined}
                data-testid={`riel-${p}`}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                  esEste ? 'bg-surface shadow-sm ring-1 ring-primary/15' : 'hover:bg-surface/60'
                }`}
              >
                <span
                  className={`relative inline-flex size-9 shrink-0 items-center justify-center rounded-full ${
                    hecho ? 'bg-primary text-primary-foreground' : esEste ? 'bg-surface text-primary ring-1 ring-primary/30' : 'bg-surface/70 text-fg-muted'
                  }`}
                >
                  <AnimatePresence initial={false} mode="wait">
                    {hecho ? (
                      <motion.span key="hecho" initial={reducido ? { opacity: 0 } : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={enterTransition(reducido)}>
                        <Check size={16} weight="bold" aria-hidden="true" />
                      </motion.span>
                    ) : (
                      <motion.span key="icono" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Icono size={18} weight="duotone" aria-hidden="true" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className="hidden min-w-0 md:block">
                  <span className="block text-[11px] text-fg-muted">Paso {i + 1}</span>
                  <span className={`block truncate text-sm ${esEste ? 'font-medium text-fg' : 'text-fg'}`}>{corto}</span>
                </span>
                <span className="sr-only">{hecho ? 'hecho' : 'por hacer'}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TodoListo({ alCerrar, reducido }: { alCerrar: () => void; reducido: boolean }) {
  return (
    <div className="flex flex-col items-center py-6 text-center" data-testid="pasos-del-agente-listos">
      <motion.span
        initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={enterTransition(reducido)}
        className="inline-flex size-20 items-center justify-center rounded-3xl bg-primary-soft text-primary"
      >
        <CheckCircle size={44} weight="duotone" aria-hidden="true" />
      </motion.span>
      <DialogTitle className="mt-5 text-h3 text-fg">Tu cuenta quedó lista</DialogTitle>
      <DialogDescription className="mt-2 max-w-sm text-body text-fg-muted">
        Ya puedes cobrar arriendos, firmar contratos y recibir tus comisiones. Si algo cambia, lo editas en Configuración → Tus datos.
      </DialogDescription>
      <Button className="mt-6" onClick={alCerrar} data-testid="pasos-del-agente-ir-al-panel">
        Ir a mi panel
      </Button>
    </div>
  );
}

// ── Las piezas de cada paso ───────────────────────────────────────────────────────────────────────────────────

function Campo({ id, etiqueta, error, children, pista }: { id: string; etiqueta: string; error?: string | null; pista?: string; children: ReactNode }) {
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

function PieDelPaso({ guardando, alCerrar, texto = 'Guardar y seguir', aviso }: { guardando: boolean; alCerrar: () => void; texto?: string; aviso?: string | null }) {
  return (
    <div className="mt-8 space-y-3">
      {aviso && (
        <p role="alert" className="text-sm text-danger" data-testid="pasos-del-agente-aviso">
          {aviso}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" hideArrow onClick={alCerrar} data-testid="pasos-del-agente-mas-tarde">
          Más tarde
        </Button>
        <Button type="submit" isLoading={guardando} data-testid="pasos-del-agente-seguir">
          {texto}
        </Button>
      </div>
    </div>
  );
}

type Errores<C extends string> = Partial<Record<C, string | null>>;

/** Guarda y reparte el 400 del back en sus campos; lo que no tiene campo queda en el aviso del pie. */
async function guardarCon<C extends string>(
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
    setAviso(sueltos[0] ?? (sinCampo ? mensajeParaLaPersona(error, { porDefecto: 'No pudimos guardar. Prueba de nuevo en un momento.', accion }) : null));
    return false;
  }
}

function PasoDatos({ perfil, nombreDeLaCuenta, alTerminar, alCerrar }: { perfil: AgencyProfile; nombreDeLaCuenta: string; alTerminar: () => Promise<void>; alCerrar: () => void }) {
  const [nombre, setNombre] = useState(perfil.legalRepresentative ?? (nombreDeLaCuenta || perfil.name || ''));
  const [cedula, setCedula] = useState(perfil.legalDocumentNumber ?? '');
  const [celular, setCelular] = useState(soloDigitos(perfil.phone ?? perfil.whatsapp ?? '').replace(/^57(?=3\d{9}$)/, ''));
  const [errores, setErrores] = useState<Errores<'nombre' | 'cedula' | 'celular'>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const locales = { nombre: errorDelNombre(nombre), cedula: errorDeLaCedula(cedula), celular: errorDelCelular(celular) };
    setErrores(locales);
    if (Object.values(locales).some(Boolean)) return;
    setGuardando(true);
    const ok = await guardarCon(
      'guardar tus datos',
      () =>
        agencyApi.updateAgency({
          legalRepresentative: nombre.trim(),
          legalDocumentNumber: soloDigitos(cedula),
          phone: soloDigitos(celular),
          whatsapp: soloDigitos(celular),
        }),
      ['nombre', 'cedula', 'celular'] as const,
      { legalRepresentative: 'nombre', legalDocumentNumber: 'cedula', phone: 'celular', whatsapp: 'celular' },
      setErrores,
      setAviso,
    );
    if (ok) await alTerminar();
    setGuardando(false);
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-4" data-testid="paso-datos">
      <Campo id="agente-nombre" etiqueta="Nombre completo" error={errores.nombre}>
        <Input id="agente-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" aria-invalid={Boolean(errores.nombre)} aria-describedby="agente-nombre-error" />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="agente-cedula" etiqueta="Cédula" error={errores.cedula}>
          <Input id="agente-cedula" value={cedula} onChange={(e) => setCedula(e.target.value)} inputMode="numeric" placeholder="1020304050" aria-invalid={Boolean(errores.cedula)} aria-describedby="agente-cedula-error" />
        </Campo>
        <Campo id="agente-celular" etiqueta="Celular" error={errores.celular} pista="Tus clientes te escriben aquí por WhatsApp.">
          <PhoneField id="agente-celular" value={celular} onChange={setCelular} invalid={Boolean(errores.celular)} />
        </Campo>
      </div>
      <PieDelPaso guardando={guardando} alCerrar={alCerrar} aviso={aviso} />
    </form>
  );
}

function PasoCuenta({
  perfil,
  medios,
  nombreDeLaCuenta,
  alTerminar,
  alCerrar,
}: {
  perfil: AgencyProfile;
  medios: MedioDePago[];
  nombreDeLaCuenta: string;
  alTerminar: () => Promise<void>;
  alCerrar: () => void;
}) {
  const existente = cuentaDelAgente(medios);
  const [banco, setBanco] = useState(existente?.banco ?? '');
  const [tipo, setTipo] = useState<TipoDeCuenta>((existente?.tipoDeCuenta as TipoDeCuenta) || 'AHORROS');
  const [numero, setNumero] = useState(existente?.numeroDeCuenta ?? '');
  const [titular, setTitular] = useState(existente?.titular ?? perfil.legalRepresentative ?? nombreDeLaCuenta);
  const [documento, setDocumento] = useState(existente?.documentoTitular ?? perfil.legalDocumentNumber ?? '');
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
      documento: errorDeLaCedula(documento),
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
        <Campo id="agente-banco" etiqueta="Banco" error={errores.banco}>
          <Select value={banco} onValueChange={setBanco}>
            <SelectTrigger id="agente-banco" aria-invalid={Boolean(errores.banco)} aria-describedby="agente-banco-error" data-testid="agente-banco">
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
        <Campo id="agente-numero" etiqueta="Número de cuenta" error={errores.numero}>
          <Input id="agente-numero" value={numero} onChange={(e) => setNumero(e.target.value)} inputMode="numeric" placeholder="00012345678" aria-invalid={Boolean(errores.numero)} aria-describedby="agente-numero-error" />
        </Campo>
      </div>
      <RadioCardGroup orientation="horizontal" className="grid grid-cols-2 gap-2" value={tipo} onValueChange={(v) => setTipo(v as TipoDeCuenta)} aria-label="Tipo de cuenta">
        <RadioCard value="AHORROS" label="Ahorros" data-testid="agente-ahorros" />
        <RadioCard value="CORRIENTE" label="Corriente" data-testid="agente-corriente" />
      </RadioCardGroup>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="agente-titular" etiqueta="A nombre de" error={errores.titular}>
          <Input id="agente-titular" value={titular} onChange={(e) => setTitular(e.target.value)} aria-invalid={Boolean(errores.titular)} aria-describedby="agente-titular-error" />
        </Campo>
        <Campo id="agente-documento" etiqueta="Cédula del titular" error={errores.documento}>
          <Input id="agente-documento" value={documento} onChange={(e) => setDocumento(e.target.value)} inputMode="numeric" aria-invalid={Boolean(errores.documento)} aria-describedby="agente-documento-error" />
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

function PasoFactura({
  perfil,
  correoDeLaCuenta,
  nombreDeLaCuenta,
  alTerminar,
  alCerrar,
}: {
  perfil: AgencyProfile;
  correoDeLaCuenta: string;
  nombreDeLaCuenta: string;
  alTerminar: () => Promise<void>;
  alCerrar: () => void;
}) {
  const [nit, setNit] = useState(perfil.nit ?? nitDeLaCedula(perfil.legalDocumentNumber ?? ''));
  const [nombre, setNombre] = useState(perfil.razonSocial ?? perfil.legalRepresentative ?? nombreDeLaCuenta);
  const [correo, setCorreo] = useState(perfil.email ?? correoDeLaCuenta);
  const [direccion, setDireccion] = useState(perfil.address ?? '');
  const [ciudad, setCiudad] = useState(perfil.city ?? '');
  const [iva, setIva] = useState<'no' | 'si' | ''>(perfil.responsableIva === true ? 'si' : perfil.responsableIva === false ? 'no' : '');
  const [errores, setErrores] = useState<Errores<'nit' | 'nombre' | 'correo' | 'direccion' | 'ciudad' | 'iva'>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const locales = {
      nit: errorDelNit(nit),
      nombre: nombre.trim() ? null : 'Escribe el nombre que va en la factura.',
      correo: errorDelCorreo(correo),
      direccion: direccion.trim() ? null : 'Escribe tu dirección.',
      ciudad: ciudad.trim() ? null : 'Escribe tu ciudad.',
      iva: iva ? null : 'Dinos si cobras IVA.',
    };
    setErrores(locales);
    if (Object.values(locales).some(Boolean)) return;
    setGuardando(true);
    const ok = await guardarCon(
      'guardar tus datos de facturación',
      () =>
        agencyApi.updateAgency({
          nit: nit.trim(),
          razonSocial: nombre.trim(),
          email: correo.trim().toLowerCase(),
          address: direccion.trim(),
          city: ciudad.trim(),
          responsableIva: iva === 'si',
        }),
      ['nit', 'nombre', 'correo', 'direccion', 'ciudad', 'iva'] as const,
      { nit: 'nit', razonSocial: 'nombre', email: 'correo', address: 'direccion', city: 'ciudad', responsableIva: 'iva' },
      setErrores,
      setAviso,
    );
    if (ok) await alTerminar();
    setGuardando(false);
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-4" data-testid="paso-factura">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="agente-nit" etiqueta="NIT de tu RUT" error={errores.nit} pista="Tu cédula con el dígito de verificación.">
          <Input id="agente-nit" value={nit} onChange={(e) => setNit(e.target.value)} placeholder="1020304050-7" aria-invalid={Boolean(errores.nit)} aria-describedby="agente-nit-error" />
        </Campo>
        <Campo id="agente-nombre-factura" etiqueta="Nombre en la factura" error={errores.nombre}>
          <Input id="agente-nombre-factura" value={nombre} onChange={(e) => setNombre(e.target.value)} aria-invalid={Boolean(errores.nombre)} aria-describedby="agente-nombre-factura-error" />
        </Campo>
      </div>
      <Campo id="agente-correo" etiqueta="Correo para las facturas" error={errores.correo}>
        <Input id="agente-correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="email" aria-invalid={Boolean(errores.correo)} aria-describedby="agente-correo-error" />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Campo id="agente-direccion" etiqueta="Dirección" error={errores.direccion}>
          <Input id="agente-direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} autoComplete="street-address" placeholder="Cra 43A # 1-50" aria-invalid={Boolean(errores.direccion)} aria-describedby="agente-direccion-error" />
        </Campo>
        <Campo id="agente-ciudad" etiqueta="Ciudad" error={errores.ciudad}>
          <Input id="agente-ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} autoComplete="address-level2" placeholder="Medellín" aria-invalid={Boolean(errores.ciudad)} aria-describedby="agente-ciudad-error" />
        </Campo>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-fg">¿Cobras IVA en tus facturas?</p>
        <RadioCardGroup orientation="horizontal" className="grid gap-2 sm:grid-cols-2" value={iva} onValueChange={(v) => setIva(v as 'no' | 'si')} aria-label="¿Cobras IVA?">
          <RadioCard value="no" label="No" description="No soy responsable de IVA (lo más común)" data-testid="agente-iva-no" />
          <RadioCard value="si" label="Sí" description="Soy responsable de IVA" data-testid="agente-iva-si" />
        </RadioCardGroup>
        <ErrorDelCampo id="agente-iva-error" mensaje={errores.iva ?? null} />
      </div>
      <PieDelPaso guardando={guardando} alCerrar={alCerrar} aviso={aviso} texto="Guardar y terminar" />
    </form>
  );
}
