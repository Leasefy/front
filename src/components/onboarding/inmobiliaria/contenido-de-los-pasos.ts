/**
 * Lo que dice cada paso del alta de la inmobiliaria: el título de la tarjeta y
 * la columna informativa de la derecha.
 *
 * 🔴 Todo lo de la columna informativa tiene que ser CIERTO en el producto de
 * hoy (pedido del 30-09: «que no prometa nada que el producto no hace»). De
 * dónde sale cada frase:
 *   - Agencia: los datos de la empresa se imprimen en contratos y cuentas de
 *     cobro (`SeccionPerfil`, «DATOS_DE_LA_EMPRESA»); al correo de la cuenta
 *     llegan los reportes y avisos (comentario de `AgencyStepForm`); se editan
 *     después en Configuración → Perfil (`SeccionPerfil`, «Editar»).
 *   - Miembros: correo con enlace, el rol elegido y «Configuración → Equipo»
 *     son los textos del propio paso (`MembersStepForm`); los roles son los de
 *     `MEMBER_ROLE_OPTIONS`.
 *   - Habeas Data: los términos (`TerminosContenido`): las obligaciones de
 *     quien contrata la plataforma y el §19, donde la inmobiliaria es la
 *     responsable del tratamiento y Leasefy el encargado.
 *   - Confirmar: lo que dice la celebración (`InmobiliariaCreada`) y lo que
 *     hace el paso cuando falta algo (`CompleteStepForm`, conflicto 409).
 * Si cambia el producto, cambia esto.
 *
 * Los títulos no van en negrita ni gigantes: los pinta `OnboardingStepTitle`.
 */

import {
  Buildings,
  ChartLineUp,
  Envelope,
  FileText,
  Handshake,
  IdentificationBadge,
  ListChecks,
  LockKey,
  NotePencil,
  PencilSimple,
  Signpost,
  UserCirclePlus,
  UsersThree,
  type Icon,
} from '@phosphor-icons/react'
import type { OnboardingWizardStep } from '@/lib/hooks/use-onboarding-session'

export interface ContenidoDelPaso {
  titulo: string
  subtitulo?: string
  informacion: {
    rotulo: string
    titulo: string
    razones: { icono: Icon; texto: string }[]
    pie?: { icono: Icon; texto: string }
  }
}

const AGENCIA: ContenidoDelPaso = {
  titulo: 'Datos de tu inmobiliaria',
  subtitulo: 'Dónde queda y cómo te contactamos.',
  informacion: {
    rotulo: 'Por qué te lo pedimos',
    titulo: 'Para qué usamos estos datos',
    razones: [
      { icono: FileText, texto: 'La razón social, el NIT y la dirección salen en tus contratos y cuentas de cobro.' },
      { icono: Envelope, texto: 'Al correo de la cuenta te llegan los reportes y avisos de Leasefy.' },
      { icono: PencilSimple, texto: 'Después los puedes revisar y editar en Configuración → Perfil.' },
    ],
  },
}

const MIEMBROS: ContenidoDelPaso = {
  titulo: 'Invita a tu equipo',
  informacion: {
    rotulo: 'Tu equipo',
    titulo: 'Qué pasa cuando invitas a alguien',
    razones: [
      { icono: UserCirclePlus, texto: 'Cada persona recibe un correo con su enlace para unirse a tu inmobiliaria.' },
      { icono: IdentificationBadge, texto: 'El rol define qué ve y qué hace: asesor comercial, contador, administrador o solo lectura.' },
      { icono: UsersThree, texto: 'Es opcional: puedes invitar a tu equipo después desde Configuración → Equipo.' },
    ],
  },
}

const HABEAS_DATA: ContenidoDelPaso = {
  titulo: 'Términos y tratamiento de datos',
  informacion: {
    rotulo: 'Habeas Data',
    titulo: 'Qué significa para tu inmobiliaria',
    razones: [
      { icono: Handshake, texto: 'Con los datos de tus propietarios e inquilinos, tu inmobiliaria es la responsable del tratamiento y Leasefy, el encargado.' },
      { icono: NotePencil, texto: 'Te corresponde contar con la autorización de las personas cuyos datos cargas en la plataforma.' },
      { icono: LockKey, texto: 'Leasefy los usa sólo para lo autorizado, los guarda con seguridad y te avisa si hay un incidente.' },
    ],
    pie: { icono: ListChecks, texto: 'Puedes leer los términos completos sin salir del registro.' },
  },
}

const CONFIRMAR: ContenidoDelPaso = {
  titulo: 'Revisa y crea tu inmobiliaria',
  informacion: {
    rotulo: 'Lo que sigue',
    titulo: 'Qué pasa al crearla',
    razones: [
      { icono: Buildings, texto: 'Creamos tu inmobiliaria con los datos de este resumen.' },
      { icono: ChartLineUp, texto: 'Entras a tu panel, donde te guiamos para traer tu operación: propietarios, inmuebles, contratos y pagos.' },
      { icono: Signpost, texto: 'Si falta algún paso, te decimos cuál y te llevamos ahí.' },
    ],
  },
}

/**
 * `payment_provider` y `policy` son pasos invisibles que se envían solos: en
 * la lista quedan sobre «Miembros» y la tarjeta sólo muestra que se está
 * preparando la cuenta.
 */
const PREPARANDO: ContenidoDelPaso = {
  ...MIEMBROS,
  titulo: 'Preparando tu cuenta',
}

export function contenidoDelPaso(paso: OnboardingWizardStep | null): ContenidoDelPaso {
  switch (paso) {
    case 'members':
      return MIEMBROS
    case 'payment_provider':
    case 'policy':
      return PREPARANDO
    case 'habeas_data':
      return HABEAS_DATA
    case 'complete':
      return CONFIRMAR
    default:
      return AGENCIA
  }
}
