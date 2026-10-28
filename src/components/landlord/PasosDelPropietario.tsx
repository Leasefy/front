'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { enterTransition, Ilustracion, RadioCard, RadioCardGroup, usePrefersReducedMotion, type NombreIlustracion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Campo, CampoDeCelular, PieDelPaso, guardarCon, type Errores } from '@/components/inmobiliaria/plan/PasosParaActivar';
import { useAuth } from '@/lib/auth/use-auth';
import { paymentMethodsApi } from '@/lib/api/payment-methods.service';
import type { AccesoDeLaCuenta } from '@/lib/conversion/acceso';
import { errorDeLaCedula, errorDeLaCuenta, errorDelCelular, errorDelNombre, soloDigitos } from '@/lib/conversion/pasos-para-activar';
import { COLOMBIAN_BANKS, type BankAccount, type PaymentAccount } from '@/lib/types/payment-accounts';

type Paso = 'datos' | 'cuenta' | 'factura';
const PASOS: readonly Paso[] = ['datos', 'cuenta', 'factura'];
const TEXTOS: Record<Paso, { corto: string; titulo: string; ayuda: string; ilustracion: NombreIlustracion }> = {
  datos: { corto: 'Tus datos', titulo: '¿Quién eres?', ayuda: 'Van en tus contratos de arriendo. Tal como aparecen en tu cédula.', ilustracion: 'cedula' },
  cuenta: { corto: 'Tu cuenta', titulo: '¿Dónde recibes el arriendo?', ayuda: 'Aquí te llega lo que pagan tus inquilinos. Sólo tú ves el número completo.', ilustracion: 'banco' },
  factura: { corto: 'Tu factura', titulo: '¿A dónde te llega la factura?', ayuda: 'La factura de Leasefy de cada mes sale a tu nombre y llega a tu correo.', ilustracion: 'factura' },
};

const lleno = (v: unknown) => typeof v === 'string' && v.trim() !== '';

/** Lo que le falta al propietario que ya pagó (puro, para probarlo). */
export function pasosQueLeFaltan(
  u: { firstName?: string | null; lastName?: string | null; rut?: string | null; phone?: string | null; address?: string | null } | null,
  cuentas: readonly PaymentAccount[] | null,
): Paso[] {
  if (!u) return [...PASOS];
  return PASOS.filter((p) =>
    p === 'datos'
      ? !(lleno(u.firstName) && lleno(u.lastName) && lleno(u.rut) && lleno(u.phone))
      : p === 'cuenta'
        ? !(cuentas ?? []).some((c) => c.type === 'bank')
        : !lleno(u.address),
  );
}

const llaveDelDia = (id: string) => `leasefy-pasos-del-propietario:${id}:${new Date().toISOString().slice(0, 10)}`;

/**
 * Los tres pasos del PROPIETARIO al pagar (Nico, 27-10-2026: «si paga le aparecen esos pasos según lo que eligió,
 * propietario, inmobiliaria y agente inmobiliario»): sus datos (nombre, cédula, celular), dónde recibe el arriendo y a
 * dónde le llega la factura. Van a su perfil (`PATCH /users/me`) y a sus cuentas (`/landlord/payment-methods`), lo que
 * ya leen sus contratos y sus giros. Sale sola al pagar y después una vez al día mientras falte algo.
 */
export function PasosDelPropietario({ acceso }: { acceso: AccesoDeLaCuenta | null }) {
  const { user } = useAuth();
  const pagado = acceso?.estado === 'pagado';
  const [cuentas, setCuentas] = useState<PaymentAccount[] | null>(null);
  const [abierto, setAbierto] = useState(false);
  const leerCuentas = useCallback(async () => {
    try {
      setCuentas(await paymentMethodsApi.getAll());
    } catch {
      setCuentas([]);
    }
  }, []);
  useEffect(() => {
    if (pagado) void leerCuentas();
  }, [pagado, leerCuentas]);
  const faltan = pagado && cuentas ? pasosQueLeFaltan(user ?? null, cuentas) : null;

  useEffect(() => {
    if (!user?.id || !faltan || faltan.length === 0 || abierto) return;
    const forzado = new URLSearchParams(window.location.search).get('bienvenida') === 'activar';
    try {
      if (!forzado && window.localStorage.getItem(llaveDelDia(user.id)) === '1') return;
      window.localStorage.setItem(llaveDelDia(user.id), '1');
    } catch {
      /* sin almacenamiento: puede volver a salir hoy */
    }
    const t = window.setTimeout(() => setAbierto(true), forzado ? 600 : 1500);
    return () => window.clearTimeout(t);
  }, [user?.id, faltan, abierto]);

  if (!abierto || !faltan || !cuentas) return null;
  return <VentanaDelPropietario faltanAlAbrir={faltan} cuentas={cuentas} alGuardar={leerCuentas} alCerrar={() => setAbierto(false)} />;
}

export function VentanaDelPropietario({
  faltanAlAbrir,
  cuentas,
  alGuardar,
  alCerrar,
}: {
  faltanAlAbrir: Paso[];
  cuentas: PaymentAccount[];
  alGuardar: () => Promise<void>;
  alCerrar: () => void;
}) {
  const reducido = usePrefersReducedMotion();
  const { user, updateProfile } = useAuth();
  const [paso, setPaso] = useState<Paso | 'listo'>(faltanAlAbrir[0] ?? 'listo');
  const [hechos, setHechos] = useState<Set<Paso>>(() => new Set(PASOS.filter((p) => !faltanAlAbrir.includes(p))));
  const terminar = (p: Paso) => {
    const nuevos = new Set(hechos).add(p);
    setHechos(nuevos);
    setPaso(PASOS.find((x) => !nuevos.has(x)) ?? 'listo');
  };
  const nombreCompleto = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

  return (
    <Dialog open onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent size="xl" className="overflow-hidden p-0" data-testid="pasos-del-propietario">
        <div className="grid md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <div className="relative overflow-hidden bg-primary-soft px-6 py-6 md:py-8">
            <p className="font-mono text-[11px] uppercase tracking-wider text-primary">Tu cuenta de propietario</p>
            <p className="mt-2 text-[17px] font-medium leading-snug text-fg">Ya tienes Leasefy completo. Termina tu cuenta en tres pasos.</p>
            <ol className="mt-6 flex gap-2 md:flex-col md:gap-1" aria-label="Pasos">
              {PASOS.map((p, i) => (
                <li key={p} className="min-w-0 flex-1 md:flex-none">
                  <button
                    type="button"
                    onClick={() => setPaso(p)}
                    aria-current={paso === p ? 'step' : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${paso === p ? 'bg-surface shadow-sm ring-1 ring-primary/15' : 'hover:bg-surface/60'}`}
                  >
                    <Ilustracion nombre={TEXTOS[p].ilustracion} tamano={40} tono="auto" alt="" />
                    <span className="hidden min-w-0 md:block">
                      <span className="block text-[11px] text-fg-muted">Paso {i + 1}{hechos.has(p) ? ' · listo' : ''}</span>
                      <span className="block truncate text-sm text-fg">{TEXTOS[p].corto}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
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
                  <div className="flex flex-col items-center py-6 text-center" data-testid="pasos-del-propietario-listos">
                    <Ilustracion nombre="pago_confirmado" tamano={112} tono="auto" alt="" />
                    <DialogTitle className="mt-4 text-h3 text-fg">Tu cuenta quedó lista</DialogTitle>
                    <DialogDescription className="mt-2 max-w-sm text-body text-fg-muted">
                      Ya puedes firmar contratos, cobrar el arriendo y recibirlo en tu cuenta. Si algo cambia, lo editas en Mi perfil.
                    </DialogDescription>
                    <Button className="mt-6" onClick={alCerrar}>
                      Ir a mi panel
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-primary">
                      Paso {PASOS.indexOf(paso) + 1} de 3 · {TEXTOS[paso].corto}
                    </p>
                    <DialogTitle className="mt-2 text-h3 text-fg">{TEXTOS[paso].titulo}</DialogTitle>
                    <DialogDescription className="mt-1.5 text-body text-fg-muted">{TEXTOS[paso].ayuda}</DialogDescription>
                    <div className="mt-6">
                      {paso === 'datos' && (
                        <DatosDelPropietario
                          inicial={{ nombre: nombreCompleto, cedula: user?.rut ?? '', celular: soloDigitos(user?.phone ?? '').replace(/^57(?=3\d{9}$)/, '') }}
                          guardar={(d) => updateProfile(d)}
                          alCerrar={alCerrar}
                          alTerminar={() => terminar('datos')}
                        />
                      )}
                      {paso === 'cuenta' && (
                        <CuentaDelPropietario
                          titular={nombreCompleto}
                          documento={user?.rut ?? ''}
                          existente={(cuentas.find((c) => c.type === 'bank') as BankAccount | undefined) ?? null}
                          alCerrar={alCerrar}
                          alTerminar={async () => {
                            await alGuardar();
                            terminar('cuenta');
                          }}
                        />
                      )}
                      {paso === 'factura' && (
                        <FacturaDelPropietario
                          correo={user?.email ?? ''}
                          direccion={user?.address ?? ''}
                          guardar={(d) => updateProfile(d)}
                          alCerrar={alCerrar}
                          alTerminar={() => terminar('factura')}
                        />
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

function DatosDelPropietario({
  inicial,
  guardar,
  alTerminar,
  alCerrar,
}: {
  inicial: { nombre: string; cedula: string; celular: string };
  guardar: (d: Record<string, string>) => Promise<unknown>;
  alTerminar: () => void;
  alCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(inicial.nombre);
  const [cedula, setCedula] = useState(inicial.cedula);
  const [celular, setCelular] = useState(inicial.celular);
  const [errores, setErrores] = useState<Errores<'nombre' | 'cedula' | 'celular'>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const locales = { nombre: errorDelNombre(nombre), cedula: errorDeLaCedula(cedula), celular: errorDelCelular(celular) };
    setErrores(locales);
    if (Object.values(locales).some(Boolean)) return;
    setGuardando(true);
    const [firstName, ...resto] = nombre.trim().split(/\s+/);
    const ok = await guardarCon(
      'guardar tus datos',
      () => guardar({ firstName, lastName: resto.join(' '), rut: soloDigitos(cedula), phone: soloDigitos(celular) }),
      ['nombre', 'cedula', 'celular'] as const,
      { firstName: 'nombre', lastName: 'nombre', rut: 'cedula', phone: 'celular' },
      setErrores,
      setAviso,
    );
    setGuardando(false);
    if (ok) alTerminar();
  };
  return (
    <form onSubmit={enviar} noValidate className="space-y-4" data-testid="propietario-paso-datos">
      <Campo id="propietario-nombre" etiqueta="Nombre completo" error={errores.nombre}>
        <Input id="propietario-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" aria-invalid={Boolean(errores.nombre)} aria-describedby="propietario-nombre-error" />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="propietario-cedula" etiqueta="Cédula" error={errores.cedula}>
          <Input id="propietario-cedula" value={cedula} onChange={(e) => setCedula(e.target.value)} inputMode="numeric" aria-invalid={Boolean(errores.cedula)} aria-describedby="propietario-cedula-error" />
        </Campo>
        <CampoDeCelular id="propietario-celular" valor={celular} alCambiar={setCelular} error={errores.celular} />
      </div>
      <PieDelPaso guardando={guardando} alCerrar={alCerrar} aviso={aviso} />
    </form>
  );
}

function CuentaDelPropietario({
  titular: titularInicial,
  documento: documentoInicial,
  existente,
  alTerminar,
  alCerrar,
}: {
  titular: string;
  documento: string;
  existente: BankAccount | null;
  alTerminar: () => Promise<void>;
  alCerrar: () => void;
}) {
  const [banco, setBanco] = useState(existente?.bankName ?? '');
  const [tipo, setTipo] = useState<'savings' | 'checking'>(existente?.accountType === 'checking' ? 'checking' : 'savings');
  const [numero, setNumero] = useState(existente?.accountNumber ?? '');
  const [titular, setTitular] = useState(existente?.accountHolderName ?? titularInicial);
  const [documento, setDocumento] = useState(existente?.accountHolderDocument ?? documentoInicial);
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
    const datos = {
      type: 'bank' as const,
      bankName: banco,
      accountType: tipo,
      accountNumber: soloDigitos(numero),
      accountHolderName: titular.trim(),
      accountHolderDocument: soloDigitos(documento),
    } as Partial<PaymentAccount>;
    const ok = await guardarCon(
      'guardar tu cuenta',
      () => (existente ? paymentMethodsApi.update(existente.id, datos) : paymentMethodsApi.create(datos)),
      ['banco', 'numero', 'titular', 'documento'] as const,
      { bankName: 'banco', accountNumber: 'numero', holderName: 'titular', holderDocumentNumber: 'documento' },
      setErrores,
      setAviso,
    );
    if (ok) await alTerminar();
    setGuardando(false);
  };
  return (
    <form onSubmit={enviar} noValidate className="space-y-4" data-testid="propietario-paso-cuenta">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="propietario-banco" etiqueta="Banco" error={errores.banco}>
          <Select value={banco} onValueChange={setBanco}>
            <SelectTrigger id="propietario-banco" aria-invalid={Boolean(errores.banco)} aria-describedby="propietario-banco-error" data-testid="propietario-banco">
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
        <Campo id="propietario-numero" etiqueta="Número de cuenta" error={errores.numero}>
          <Input id="propietario-numero" value={numero} onChange={(e) => setNumero(e.target.value)} inputMode="numeric" aria-invalid={Boolean(errores.numero)} aria-describedby="propietario-numero-error" />
        </Campo>
      </div>
      <RadioCardGroup orientation="horizontal" className="grid grid-cols-2 gap-2" value={tipo} onValueChange={(v) => setTipo(v as 'savings' | 'checking')} aria-label="Tipo de cuenta">
        <RadioCard value="savings" label="Ahorros" />
        <RadioCard value="checking" label="Corriente" />
      </RadioCardGroup>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="propietario-titular" etiqueta="A nombre de" error={errores.titular}>
          <Input id="propietario-titular" value={titular} onChange={(e) => setTitular(e.target.value)} aria-invalid={Boolean(errores.titular)} aria-describedby="propietario-titular-error" />
        </Campo>
        <Campo id="propietario-documento" etiqueta="Cédula del titular" error={errores.documento}>
          <Input id="propietario-documento" value={documento} onChange={(e) => setDocumento(e.target.value)} inputMode="numeric" aria-invalid={Boolean(errores.documento)} aria-describedby="propietario-documento-error" />
        </Campo>
      </div>
      <PieDelPaso guardando={guardando} alCerrar={alCerrar} aviso={aviso} />
    </form>
  );
}

function FacturaDelPropietario({
  correo,
  direccion: direccionInicial,
  guardar,
  alTerminar,
  alCerrar,
}: {
  correo: string;
  direccion: string;
  guardar: (d: Record<string, string>) => Promise<unknown>;
  alTerminar: () => void;
  alCerrar: () => void;
}) {
  const [direccion, setDireccion] = useState(direccionInicial);
  const [errores, setErrores] = useState<Errores<'direccion'>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const locales = { direccion: direccion.trim().length >= 6 ? null : 'Escribe tu dirección con la ciudad (Carrera 43A # 1-50, Medellín).' };
    setErrores(locales);
    if (locales.direccion) return;
    setGuardando(true);
    const ok = await guardarCon('guardar tu dirección', () => guardar({ address: direccion.trim() }), ['direccion'] as const, { address: 'direccion' }, setErrores, setAviso);
    setGuardando(false);
    if (ok) alTerminar();
  };
  return (
    <form onSubmit={enviar} noValidate className="space-y-4" data-testid="propietario-paso-factura">
      <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
        <span className="block text-fg-muted">La factura llega a</span>
        <span className="block font-medium text-fg">{correo}</span>
      </div>
      <Campo id="propietario-direccion" etiqueta="Tu dirección y ciudad" error={errores.direccion}>
        <Input id="propietario-direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} autoComplete="street-address" placeholder="Carrera 43A # 1-50, Medellín" aria-invalid={Boolean(errores.direccion)} aria-describedby="propietario-direccion-error" />
      </Campo>
      <PieDelPaso guardando={guardando} alCerrar={alCerrar} aviso={aviso} texto="Guardar y terminar" />
    </form>
  );
}
