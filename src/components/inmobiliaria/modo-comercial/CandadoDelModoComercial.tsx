'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle } from '@phosphor-icons/react';
import { Ilustracion, motionDuration, motionEase } from '@leasefy/cadence';

import { useAuth } from '@/lib/auth/use-auth';
import { Button } from '@/components/ui/button';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { BeneficiosEn3D, EscenaDeMarca, type BeneficioEn3D } from '@/components/conversion/EscenaDeMarca';
import { ModuloConDemo } from '@/components/venta/ModuloConDemo';
import { FranjaDeLaDemo } from '@/components/venta/FranjaDeLaDemo';
import { hayDatosDeEjemplo } from '@/lib/demo/datos-demo';
import { entrarAlModoDemo, useModoDemo } from '@/lib/demo/modo-demo';
import { abrirLaActivacion } from '@/lib/conversion/abrir-la-activacion';
import { moduloDeLaRuta } from '@/lib/nav/arquitectura-del-panel';
import { demoDeLaInmobiliaria, demoDelAgente } from '@/lib/venta/demos-del-panel';
import { enlaceDeWhatsApp } from '@/lib/venta/whatsapp-de-leasefy';
import {
  INICIO_DEL_MODO_COMERCIAL,
  RUTA_PARA_ACTIVAR,
  abiertaEnModoComercial,
  pideActivar,
  enModoComercial,
} from '@/lib/nav/modo-comercial';
import { conCandadoDelPlan, faltaActivarParaVerTodo, type AccesoDeLaCuenta } from '@/lib/conversion/acceso';

/** Lo que se abre al activar: lo que la persona todavía no ve. */
const LO_QUE_SE_ABRE = [
  'Contratos y firma electrónica',
  'Cobranza, recaudo y pagos a propietarios',
  'Contabilidad y facturación electrónica',
  'Los agentes de IA: avalúos, estudios, cobranza',
] as const;

/**
 * El candado del modo comercial (Juan y Nico, 19/20-10-2026). Envuelve el
 * contenido del panel:
 *   · el inicio del panel (el chat de los agentes) lleva a sus inmuebles;
 *   · una ruta cerrada muestra para qué sirve activar, con el botón;
 *   · la primera vez, una bienvenida que dice qué tiene y qué se abre al activar.
 * Fuera del modo comercial no hace nada.
 */
export function CandadoDelModoComercial({ children }: { children: ReactNode }) {
  const { agency, user } = useAuth();
  const pathname = usePathname() ?? '';
  const enDemo = useModoDemo();
  const router = useRouter();
  const comercial = enModoComercial(agency);
  // 27-10-2026 (Nico): en lo gratis lleva candado también la ya activada a la que se le acabó el mes gratis; en el
  // mes gratis (o pagando) sin activar, lo que usa a los agentes pide activar.
  const conCandado = conCandadoDelPlan(agency);
  const faltaActivar = faltaActivarParaVerTodo(agency);
  const esElInicio = (conCandado || faltaActivar) && pathname.replace(/\/+$/, '') === '/panel/inmobiliaria';

  useEffect(() => {
    if (esElInicio) router.replace(INICIO_DEL_MODO_COMERCIAL);
  }, [esElInicio, router]);

  if (!conCandado && !faltaActivar) return children;
  if (esElInicio) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <CargaDeMarca tamano="lg" />
      </div>
    );
  }
  // 🔴 Nico, 27-10-2026: en el mes gratis (o pagando) sin activar VE TODO; sólo los agentes y la plata piden activar.
  const abierta = faltaActivar ? !pideActivar(pathname) : abiertaEnModoComercial(pathname);
  // Con llaves: lo de adentro cambia de rama (abierta / activar / cerrada) y la bienvenida va al lado.
  return (
    <>
      <div key="contenido" className="contents">
        {abierta ? (
          children
        ) : !faltaActivar && enDemo && hayDatosDeEjemplo(moduloDeLaRuta(pathname)?.key) ? (
          // Nico 29-10-2026: «Ver con datos demo» pinta la sección de verdad con datos de ejemplo (sólo en lo cerrado).
          <>
            <FranjaDeLaDemo queEs={NOMBRES[moduloDeLaRuta(pathname)?.key ?? ''] ?? null} />
            {children}
          </>
        ) : faltaActivar ? (
          <ActivarTuCuenta acceso={agency?.acceso ?? null} />
        ) : (
          <ParteCerrada ruta={pathname} nombre={user?.firstName ?? null} empresa={agency?.name ?? null} esAgente={agency?.cuentaDeAgente === true} />
        )}
      </div>
      {/* La bienvenida comercial («lo demás lo ves en demo») es para lo gratis: a quien ve todo no se le dice. */}
      {comercial && conCandado ? <BienvenidaComercial key="bienvenida" agencyId={agency?.id ?? null} nombre={user?.firstName ?? null} empresa={agency?.name ?? null} /> : null}
    </>
  );
}

/**
 * Una parte cerrada (Nico, 20-10-2026): no se abre «gratis al activar»; se vende
 * el servicio. Qué hace, la demo y nuestro WhatsApp; «¿Ya eres cliente?» lleva a
 * completar el registro (NIT, razón social, segundo factor).
 */
function ParteCerrada({ ruta, nombre, empresa, esAgente = false }: { ruta: string; nombre: string | null; empresa: string | null; esAgente?: boolean }) {
  const modulo = moduloDeLaRuta(ruta);
  return (
    <ModuloConDemo
      // 27-10-2026 (Nico y Juan): la cuenta de un agente ve SU publicidad («administra tus propiedades tú solo»).
      demo={esAgente ? demoDelAgente(modulo?.key) : demoDeLaInmobiliaria(modulo?.key)}
      quien="inmobiliaria"
      nombre={nombre}
      empresa={empresa}
      queVio={modulo ? NOMBRES[modulo.key] ?? null : null}
      yaEsCliente={{ href: RUTA_PARA_ACTIVAR, texto: '¿Ya eres cliente? Activa tu cuenta' }}
      // 27-10-2026 (Nico: «pagar desde el panel»): el llamado principal es abrir todo pagando; WhatsApp al lado.
      pagar={{ href: '/panel/inmobiliaria/upgrade', texto: 'Abrir todo Leasefy', detalle: 'Desde $99.000 al mes más IVA' }}
      verConDatosDemo={hayDatosDeEjemplo(modulo?.key) ? entrarAlModoDemo : undefined}
    />
  );
}

/** Cómo se llama cada parte en el mensaje de WhatsApp. */
const NOMBRES: Record<string, string> = {
  cobranza: 'la cobranza',
  conciliacion: 'la conciliación bancaria',
  avaluos: 'los avalúos',
  asegurabilidad: 'el seguro de arrendamiento',
  matching: 'el cruce de interesados',
  estudio: 'el estudio del inquilino',
  retencion: 'la retención',
  contratos: 'los contratos',
  pagos: 'los pagos y giros',
  facturacion: 'la facturación electrónica',
  contabilidad: 'la contabilidad',
  nomina: 'la nómina',
  propietarios: 'los propietarios',
  inquilinos: 'los inquilinos',
  reportes: 'los reportes',
  mantenimientos: 'los mantenimientos',
  documentos: 'los documentos',
  'servicios-publicos': 'los servicios públicos',
  solicitudes: 'las solicitudes',
};

/** Lo que ve quien entra a una parte cerrada (antes del 20-10: activar gratis). */
export function ActivarTuCuenta({ acceso = null }: { acceso?: AccesoDeLaCuenta | null } = {}) {
  const enPrueba = acceso?.estado === 'prueba' && acceso.prueba;
  const titulo = enPrueba
    ? `${acceso.prueba?.aliado ? `${acceso.prueba.aliado} te regaló` : 'Tienes'} un mes de Leasefy completo`
    : acceso?.estado === 'pagado'
      ? 'Ya pagaste: falta activar tu cuenta'
      : 'Esto se abre al activar tu cuenta';
  // 27-10-2026 (Nico): se activa en tres pasos cortos (tus datos, dónde recibes la plata y tu factura).
  const texto = enPrueba
    ? 'Para usar esto, activa tu cuenta en tres pasos: tus datos, dónde recibes la plata y tu factura. Son 2 minutos y se abre todo mientras dure tu mes gratis.'
    : acceso?.estado === 'pagado'
      ? 'Activa tu cuenta en tres pasos: tus datos, dónde recibes la plata y tu factura. Son 2 minutos y se abre todo.'
      : 'Tu cuenta hoy es comercial: publicas, te llegan los interesados y agendas visitas. Al pagar la activas en tres pasos y se abre todo.';
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
      className="mx-auto my-10 max-w-[560px] rounded-lg border border-border bg-surface p-6 sm:p-8"
      data-testid="activar-tu-cuenta"
    >
      <Ilustracion nombre="cerradura" tamano={88} tono="auto" alt="" />
      <h1 className="mt-4 text-[24px] font-medium leading-tight tracking-[-0.02em] text-fg">{titulo}</h1>
      <p className="mt-2 text-[15px] text-fg-muted">{texto}</p>
      <ul className="mt-5 space-y-2">
        {LO_QUE_SE_ABRE.map((x) => (
          <li key={x} className="flex items-center gap-2 text-[14px] text-fg">
            <CheckCircle size={16} weight="fill" className="text-primary" aria-hidden="true" />
            {x}
          </li>
        ))}
      </ul>
      {/* 27-10-2026 (Nico): se activa en los tres pasos cortos (`PasosParaActivar`), nunca en el asistente largo. */}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button className="h-11 rounded-full px-6" onClick={abrirLaActivacion} data-testid="activar-mi-cuenta">
          Activar mi cuenta
        </Button>
        <Button asChild variant="secondary" className="h-11 rounded-full px-6">
          <Link href={INICIO_DEL_MODO_COMERCIAL}>Volver a mis inmuebles</Link>
        </Button>
      </div>
    </motion.section>
  );
}

/** Lo que la cuenta del marketplace ya tiene gratis, cada cosa con su 3D. */
const LO_QUE_YA_ES_TUYO: readonly BeneficioEn3D[] = [
  { ilustracion: 'casa', texto: 'Tus inmuebles en el marketplace' },
  { ilustracion: 'mensajes', texto: 'Los interesados que te escriben' },
  { ilustracion: 'portapapeles', texto: 'Postulaciones de inquilinos' },
  { ilustracion: 'visita', texto: 'Tu agenda de visitas' },
];

const CLAVE_BIENVENIDA = (agencyId: string) => `leasefy-bienvenida-comercial:${agencyId}`;

/** Una sola vez por inmobiliaria: qué tiene abierto y qué se abre al activar. */
function BienvenidaComercial({ agencyId, nombre, empresa }: { agencyId: string | null; nombre: string | null; empresa: string | null }) {
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    if (!agencyId) return;
    try {
      if (window.localStorage.getItem(CLAVE_BIENVENIDA(agencyId)) !== '1') setAbierta(true);
    } catch {
      // Sin almacenamiento: no se insiste.
    }
  }, [agencyId]);

  const cerrar = () => {
    setAbierta(false);
    if (!agencyId) return;
    try {
      window.localStorage.setItem(CLAVE_BIENVENIDA(agencyId), '1');
    } catch {
      // Sin almacenamiento: la próxima vez sale otra vez, y ya.
    }
  };

  return (
    <Dialog open={abierta} onOpenChange={(o) => (o ? setAbierta(true) : cerrar())}>
      <DialogContent size="lg" className="overflow-hidden p-0" data-testid="bienvenida-comercial">
        <DialogBody className="p-0 sm:p-0">
          {/* Nico, 28-10: «está ingresando a nuestra plataforma, celebrémosle eso». La escena de marca con la chispa. */}
          <EscenaDeMarca principal="bienvenida" acompanantes={['casa', 'megafono', 'mensajes', 'llaves']} celebrar={abierta} />
          <div className="space-y-5 p-6 sm:p-8">
            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-primary">{empresa ? `${empresa} ya está en Leasefy` : 'Ya estás en Leasefy'}</p>
              <DialogTitle className="text-h2 text-fg">{nombre ? `¡Bienvenido, ${nombre}!` : '¡Bienvenido a Leasefy!'}</DialogTitle>
              <DialogDescription className="text-body text-fg-muted">
                Tus inmuebles ya salen en el marketplace. Lo de abajo es tuyo, gratis y para siempre. Lo demás lo ves en demo para
                que conozcas cómo Leasefy maneja tu inmobiliaria en piloto automático.
              </DialogDescription>
            </div>
            <BeneficiosEn3D items={LO_QUE_YA_ES_TUYO} />
            <p className="flex items-center gap-2 text-body-sm text-fg-muted">
              <span className="inline-flex h-6 items-center rounded-full bg-surface-muted px-2.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                Demo
              </span>
              Contratos, cobranza, pagos a propietarios y contabilidad: míralos y ábrelos cuando quieras.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button asChild variant="ghost" hideArrow onClick={cerrar}>
                <a href={enlaceDeWhatsApp({ quien: 'inmobiliaria', nombre, empresa })} target="_blank" rel="noreferrer noopener">
                  Hablar con Leasefy
                </a>
              </Button>
              <Button onClick={cerrar} data-testid="bienvenida-seguir">
                Empezar
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
