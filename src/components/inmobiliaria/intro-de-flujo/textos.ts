/**
 * La explicación de la primera vez de cada flujo de «Nuevo» — la estructura
 * (íconos y cuántos pasos y cosas «antes de empezar» tiene cada uno). Los
 * textos están en es.json y en.json (`inmobiliaria.nuevo.flujos.<flujo>.intro.*`
 * y `inmobiliaria.nuevo.intro.*`); las claves las arma `flujoIntro()` de
 * `lib/inmobiliaria/flujos.ts`. PRESENTACIONES, 05-10-2026: Nico eligió la
 * dirección A «Héroe».
 *
 * 🔴 Cada paso es el que de verdad tiene el asistente donde aterriza el flujo:
 *   · consignación: `ConsignacionWizard.tsx` (6 pasos: propietario, propiedad,
 *     comisión, agente —sólo administrador—, inventario/fotos opcional,
 *     confirmar; en el paso 2 son obligatorios tipo, título, dirección,
 *     ciudad y canon, IN-16);
 *   · avalúo: el asistente del micro de avalúos (`AVALUO_WIZARD_URL`, otra
 *     pestaña); `avaluo/src/lib/avaluo/intake.schema.ts` (obligatorios
 *     dirección, ciudad, tipo, área, estrato, habitaciones y baños; la
 *     matrícula y las fotos, opcionales); se paga en línea antes de estimar;
 *   · asegurabilidad: `postulaciones/asegurabilidad/nueva` (cédula, nombre y
 *     ciudad; canon y tipo); el micro consulta a la vez a cada aseguradora
 *     activa e IGNORA la elección del paso de configuración;
 *   · contrato: `SelectorPostulacion` (aprobadas sin contrato, o «a mano») →
 *     `contratos/nuevo` (PDF propio o la plantilla de ley; fechas, canon, día
 *     de pago, depósito sólo en comercial, seguro opcional) → firma.
 */

import type { Icon } from '@phosphor-icons/react'
import {
  Buildings,
  CalendarBlank,
  ClipboardText,
  CreditCard,
  EnvelopeSimple,
  FilePlus,
  FileText,
  HouseLine,
  IdentificationCard,
  Lightning,
  ListChecks,
  Percent,
  Scales,
  SealCheck,
  ShieldCheck,
  Signature,
  User,
  UserCircle,
} from '@phosphor-icons/react'

import type { FlujoKey } from '@/lib/inmobiliaria/flujos'

export interface EstructuraDeLaIntro {
  /** El ícono grande del héroe. */
  icono: Icon
  /** Un ícono por paso, en orden (`intro.pasos.p1…`). */
  pasos: Icon[]
  /** Cuántas cosas hay en «Antes de empezar» (`intro.antes.a1…`). */
  antes: number
}

export const INTROS: Record<FlujoKey, EstructuraDeLaIntro> = {
  consignacion: { icono: Buildings, pasos: [User, HouseLine, Percent, UserCircle, ClipboardText], antes: 3 },
  avaluo: { icono: Scales, pasos: [FileText, CreditCard, SealCheck, EnvelopeSimple], antes: 3 },
  asegurabilidad: { icono: ShieldCheck, pasos: [IdentificationCard, HouseLine, Lightning, ListChecks], antes: 2 },
  contrato: { icono: FilePlus, pasos: [ListChecks, FileText, CalendarBlank, Signature], antes: 3 },
}

/** Lo común de la explicación, en `inmobiliaria.nuevo.intro.*`. */
const NS = 'inmobiliaria.nuevo.intro'
export const CLAVES_DE_LA_INTRO = {
  queVasAHacer: `${NS}.queVasAHacer`,
  antesDeEmpezar: `${NS}.necesitasTitulo`,
  soloUnaVez: `${NS}.soloPrimeraVez`,
  ahoraNo: `${NS}.ahoraNo`,
  empezar: `${NS}.empezar`,
  nuevaPestana: `${NS}.nuevaPestana`,
  listo: `${NS}.listo`,
  marcaLoQueTienes: `${NS}.marcaLoQueTienes`,
  momento: (grupo: string) => `${NS}.momento.${grupo}`,
} as const
