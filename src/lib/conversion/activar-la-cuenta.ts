/**
 * ACTIVAR la cuenta que vino del marketplace (Nico, 27-10-2026: «si paga le aparecen esos pasos según lo que eligió;
 * aquí es para que publiquen»). La inmobiliaria o el agente del registro rápido nace en «modo comercial»: sin NIT y sin
 * avisar al micro de agentes. Al pagar (o en su mes gratis de aliado) se activa desde los PASOS CORTOS
 * (`PasosParaActivar`), nunca desde el asistente largo de `/onboarding/inmobiliaria`.
 *
 * Por debajo hace lo MISMO que el asistente, sin pantallas de más:
 *   1. Back: `POST /users/me/onboarding` con la razón social y el NIT → sale del modo comercial y el back le avisa al
 *      micro (sesión del asistente).
 *   2. Micro, paso a paso desde donde vaya la sesión: Agencia (sus datos) → Miembros (nadie: trabaja solo o invita
 *      después) → Pasarela (después) → Política de cobranza (la de Leasefy) → Habeas Data: la aceptación de los
 *      Términos que la persona marcó EN PANTALLA, con su versión (cierra el alta del micro).
 *
 * Se puede repetir: retoma en el paso donde quedó la sesión (un corte a la mitad no obliga a empezar de cero).
 */
import { postUsersOnboarding, type UsersMeOnboardingResponse } from '@/lib/api/onboarding-provisioning.service';
import {
  acceptTerms,
  resumeOnboarding,
  submitAgency,
  submitMembers,
  submitPaymentProvider,
  submitPolicy,
} from '@/lib/api/onboarding-session.service';
import { POLICY_STEP_DEFAULT_VALUES, toPolicyRequest } from '@/components/onboarding/inmobiliaria/policy-step-schema';

export interface DatosParaActivar {
  /** Quien se registra (va atado a su correo). */
  nombre: string;
  apellido: string;
  /** La razón social (la del agente: su nombre). */
  razonSocial: string;
  nit: string;
  representante: string;
  documentoDelRepresentante: string;
  /** Celular, sólo dígitos y sin indicativo. */
  celular: string;
  correo: string;
  direccion: string;
  ciudad: string;
  departamento: string;
}

export interface Dependencias {
  alta: (cuerpo: Parameters<typeof postUsersOnboarding>[0]) => Promise<UsersMeOnboardingResponse>;
  retomar: typeof resumeOnboarding;
  agencia: typeof submitAgency;
  miembros: typeof submitMembers;
  pasarela: typeof submitPaymentProvider;
  politica: typeof submitPolicy;
  terminos: typeof acceptTerms;
}

const REALES: Dependencias = {
  alta: postUsersOnboarding,
  retomar: resumeOnboarding,
  agencia: submitAgency,
  miembros: submitMembers,
  pasarela: submitPaymentProvider,
  politica: submitPolicy,
  terminos: acceptTerms,
};

/** El orden del asistente del micro. `start` es «antes de Agencia». */
export const PASOS_DEL_ASISTENTE = ['agency', 'members', 'payment_provider', 'policy', 'habeas_data'] as const;
type PasoDelAsistente = (typeof PASOS_DEL_ASISTENTE)[number];

/** El micro no respondió al alta: no hay sesión todavía (se puede reintentar). */
export class ActivacionSinSesionError extends Error {
  constructor() {
    super('El asistente de Leasefy no respondió. Tus datos quedaron guardados: vuelve a intentar en un momento.');
    this.name = 'ActivacionSinSesionError';
  }
}

function desde(paso: string | null | undefined): number {
  if (!paso || paso === 'start') return 0;
  if (paso === 'complete') return PASOS_DEL_ASISTENTE.length;
  const i = PASOS_DEL_ASISTENTE.indexOf(paso as PasoDelAsistente);
  return i < 0 ? 0 : i;
}

/** El paso al que el micro dice que hay que ir (409 con `requiredStep`), si lo dice. */
function pasoDelConflicto(err: unknown): string | null {
  const c = (err as { kind?: string; conflict?: { requiredStep?: string | null } } | null) ?? null;
  return c?.kind === 'conflict' ? (c.conflict?.requiredStep ?? null) : null;
}

export async function activarLaCuenta(d: DatosParaActivar, deps: Dependencias = REALES): Promise<void> {
  // 1. El back: sale del modo comercial y avisa al micro. Repetirlo no duplica nada (retoma la misma agencia).
  const { agentSessionId } = await deps.alta({
    firstName: d.nombre,
    lastName: d.apellido,
    phone: d.celular,
    userType: 'INMOBILIARIA',
    agency: {
      name: d.razonSocial,
      nit: d.nit,
      email: d.correo,
      legalRepresentative: d.representante,
      // El back los acepta en `agency` (legalDocumentNumber, city, phone); el tipo del front sólo nombra los de siempre.
      ...({ legalDocumentNumber: d.documentoDelRepresentante, city: d.ciudad, phone: d.celular } as object),
    },
  });
  if (!agentSessionId) throw new ActivacionSinSesionError();

  // 2. El micro, desde donde vaya la sesión.
  let i = desde((await deps.retomar(agentSessionId)).currentStep);
  for (let vueltas = 0; i < PASOS_DEL_ASISTENTE.length && vueltas < 12; vueltas += 1) {
    const paso = PASOS_DEL_ASISTENTE[i];
    try {
      if (paso === 'agency') {
        await deps.agencia(agentSessionId, {
          legalName: d.razonSocial,
          nit: d.nit,
          address: { calle: d.direccion, ciudad: d.ciudad, departamento: d.departamento },
          primaryContactEmail: d.correo,
          primaryContactPhone: d.celular,
          billingModel: 'standard',
        } as Parameters<Dependencias['agencia']>[1]);
      } else if (paso === 'members') {
        await deps.miembros(agentSessionId, { members: [] } as Parameters<Dependencias['miembros']>[1]);
      } else if (paso === 'payment_provider') {
        await deps.pasarela(agentSessionId, { skip: true } as Parameters<Dependencias['pasarela']>[1]);
      } else if (paso === 'policy') {
        await deps.politica(agentSessionId, toPolicyRequest(POLICY_STEP_DEFAULT_VALUES));
      } else {
        await deps.terminos(agentSessionId);
      }
      i += 1;
    } catch (err) {
      // El micro va en otro paso (un corte, otra pestaña): se sigue desde ése.
      const requerido = pasoDelConflicto(err);
      if (requerido === null) throw err;
      i = desde(requerido);
    }
  }
}
