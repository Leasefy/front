/**
 * La presentación de cada agente — qué se dice y con qué ícono (PRESENTACIONES,
 * 05-10-2026; Nico eligió la dirección A «Escenario» a las 19:10).
 *
 * Aquí viven las CLAVES de i18n y los íconos; los textos están en es.json y
 * en.json:
 *   · cada agente, en `inmobiliaria.ai.intro.<agente>.*` (`title` es el nombre
 *     y `description` la promesa: las mismas claves de siempre, con el texto
 *     corregido);
 *   · el piloto automático, en `inmobiliaria.piloto.novedad.*` (las de
 *     `PilotoNovedad`);
 *   · lo común, en `inmobiliaria.ai.presentacion.*`, y el nombre de cada modo,
 *     en `inmobiliaria.piloto.flota.modo.*` (el de la píldora).
 *
 * 🔴 Cada frase es VERDAD en el código («nada de promesas que no existan»):
 *   · el modo y lo que hace en cada uno: la tabla de verdad del micro
 *     (`wt-agent-bugs/src/piloto/que-hace-cada-modo.ts`), su arranque
 *     (`piloto/autonomia.ts`: ningún agente nace en Automático; sin elección,
 *     Copiloto) y `piloto/piloto-activo.ts` (sin piloto activo, nada actúa
 *     solo: rige Copiloto);
 *   · lo que hace y lo que no: `src/lib/agentes/equipo.ts`;
 *   · el «¿Cómo funciona?»: los pasos que verificó COMO-FUNCIONA contra el
 *     código (`inmobiliaria.ai.workspace.pages.<x>.comoFunciona.*`);
 *   · lo que necesita: el asistente o la pantalla donde se hace.
 * Lo que los textos viejos prometían y el código no hacía quedó en la entrega
 * del 05-10 (`scratchpad/presentaciones`).
 */

import type { Icon } from '@phosphor-icons/react'
import {
  ArrowsClockwise,
  ArrowsLeftRight,
  Bank,
  Buildings,
  CalendarCheck,
  ChartBar,
  ChatCircleText,
  CheckCircle,
  ClipboardText,
  CreditCard,
  EnvelopeSimple,
  FileMagnifyingGlass,
  Fingerprint,
  Handshake,
  HouseLine,
  IdentificationCard,
  Lightbulb,
  Lightning,
  ListChecks,
  Phone,
  Power,
  Ranking,
  Robot,
  Scales,
  SealCheck,
  ShareNetwork,
  ShieldCheck,
  SlidersHorizontal,
  Table,
  Tray,
  UploadSimple,
  UserCheck,
  UsersThree,
} from '@phosphor-icons/react'

import type { QuienLoHace } from '@/components/ui/pasos-explicados'
import type { AutonomiaModo } from '@/lib/api/piloto'
import type { IdDeAgente } from '@/lib/agentes/equipo'

/** Los agentes que tienen presentación (y el piloto automático, con el orbe de Ori). */
export type IdDePresentacion =
  | 'conciliacion'
  | 'cobranza'
  | 'avaluos'
  | 'cotizador'
  | 'estudio'
  | 'matching'
  | 'piloto'

export const PRESENTACIONES: readonly IdDePresentacion[] = [
  'conciliacion',
  'cobranza',
  'avaluos',
  'cotizador',
  'estudio',
  'matching',
  'piloto',
]

/** Una capacidad: su ícono y las claves de su título y su texto. */
export interface Capacidad {
  icono: Icon
  titulo: string
  texto: string
}

/** Lo que necesita: su ícono y la clave del texto. */
export interface LoQueNecesita {
  icono: Icon
  texto: string
}

/**
 * Un paso del «¿Cómo funciona?». Con `clave`, el texto sale de
 * `<ns>.comoFunciona.<clave>.{title,desc,tuParte}` (los pasos de la pantalla
 * del agente); sin ella, de las claves `titulo`, `explicacion` y `tuParte`.
 */
export interface PasoDelComoFunciona {
  icono: Icon
  quien?: QuienLoHace
  clave?: string
  /** Con `clave`: lleva «Lo que haces tú» (`<clave>.tuParte`). */
  conTuParte?: boolean
  titulo?: string
  explicacion?: string
  tuParte?: string
}

export interface ComoFunciona {
  /** Espacio de i18n de la pantalla del agente. */
  ns?: string
  /** Claves propias (el piloto automático, que no tiene pantalla con pasos). */
  titulo?: string
  descripcion?: string
  pasos: PasoDelComoFunciona[]
}

/**
 * Cómo se porta con el modo. `gobierna: false` = el modo no cambia lo que hace
 * (trabaja a pedido): se dice así en vez de inventar un Copiloto.
 */
export type ModoDelAgente =
  | { gobierna: true; queHace: Record<AutonomiaModo, string> }
  | { gobierna: false; aPedido: string }

export interface FichaDePresentacion {
  id: IdDePresentacion
  /** El agente del registro: su orbe. */
  agente: IdDeAgente
  /** Clave del nombre que se pinta (y que anuncia el modal). */
  nombre: string
  /** Clave del rol (el rótulo mono de arriba del nombre). */
  rol: string
  /** Clave de la promesa: una línea, qué hace por la inmobiliaria. */
  promesa: string
  capacidades: [Capacidad, Capacidad, Capacidad]
  necesita: LoQueNecesita[]
  modo: ModoDelAgente
  comoFunciona: ComoFunciona
  /** Clave del llamado principal. */
  empezar: string
}

/** Lo común, en `inmobiliaria.ai.presentacion.*`. */
const COMUN = 'inmobiliaria.ai.presentacion'
export const CLAVES_COMUNES = {
  comoFunciona: `${COMUN}.comoFunciona`,
  loQueHace: `${COMUN}.loQueHace`,
  loQueNecesita: `${COMUN}.loQueNecesita`,
  modo: `${COMUN}.modo`,
  aPedido: `${COMUN}.aPedido`,
  sinPilotoActivo: `${COMUN}.sinPilotoActivo`,
} as const

/** El nombre de cada modo: el mismo de la píldora del piloto automático. */
export const claveDelModo = (m: AutonomiaModo) => `inmobiliaria.piloto.flota.modo.${m}`

/** El orden en que se pintan los tres. */
export const MODOS: readonly AutonomiaModo[] = ['sombra', 'copiloto', 'autonomo']

/**
 * Con qué modo arranca un agente: Copiloto, para todos (`autonomia.ts`: «desde
 * el 23-09-2026 no hay agente que nazca en automático»).
 */
export const MODO_CON_EL_QUE_ARRANCA: AutonomiaModo = 'copiloto'

const PAGES = 'inmobiliaria.ai.workspace.pages'

/** Las claves de un agente, todas en `inmobiliaria.ai.intro.<id>`. */
function delAgente(
  id: Exclude<IdDePresentacion, 'piloto'>,
  agente: IdDeAgente,
  iconos: { capacidades: [Icon, Icon, Icon]; necesita: Icon[] },
  gobierna: boolean,
  comoFunciona: ComoFunciona,
): FichaDePresentacion {
  const ns = `inmobiliaria.ai.intro.${id}`
  return {
    id,
    agente,
    nombre: `${ns}.title`,
    rol: `${ns}.rol`,
    promesa: `${ns}.description`,
    capacidades: iconos.capacidades.map((icono, i) => ({
      icono,
      titulo: `${ns}.hace.c${i + 1}.titulo`,
      texto: `${ns}.hace.c${i + 1}.texto`,
    })) as [Capacidad, Capacidad, Capacidad],
    necesita: iconos.necesita.map((icono, i) => ({ icono, texto: `${ns}.necesita.n${i + 1}` })),
    modo: gobierna
      ? {
          gobierna: true,
          queHace: { sombra: `${ns}.modo.sombra`, copiloto: `${ns}.modo.copiloto`, autonomo: `${ns}.modo.autonomo` },
        }
      : { gobierna: false, aPedido: `${ns}.modo.aPedido` },
    comoFunciona,
    empezar: `${ns}.empezar`,
  }
}

const NOVEDAD = 'inmobiliaria.piloto.novedad'

export const FICHAS: Record<IdDePresentacion, FichaDePresentacion> = {
  // micro: conciliacion (CONDUCTA), reconciliation-matcher. front: conciliacion/page.tsx
  // (CargarExtracto: CSV o Excel, la cuenta es obligatoria).
  conciliacion: delAgente(
    'conciliacion',
    'conciliacion',
    { capacidades: [ArrowsLeftRight, Fingerprint, CheckCircle], necesita: [UploadSimple, Bank] },
    true,
    {
      ns: `${PAGES}.conciliacion`,
      pasos: [
        { clave: 'step1', icono: UploadSimple, quien: 'tu', conTuParte: true },
        { clave: 'step2', icono: ArrowsClockwise, quien: 'agente' },
        { clave: 'step3', icono: CheckCircle, quien: 'tu', conTuParte: true },
      ],
    },
  ),

  // micro: cobranza (CONDUCTA), vallasDe('cobranza') (Ley 2300 y T-323). CR-31: sin días de
  // plazo no corre la mora. La llamada y el WhatsApp los activa Leasefy (COMO-FUNCIONA).
  cobranza: delAgente(
    'cobranza',
    'cobranza',
    { capacidades: [Phone, Handshake, Scales], necesita: [CalendarCheck, Phone, Tray] },
    true,
    {
      ns: `${PAGES}.cobranza`,
      pasos: [
        { clave: 'step1', icono: ClipboardText, quien: 'leasefy' },
        { clave: 'step2', icono: ChatCircleText, quien: 'agente' },
        { clave: 'step3', icono: CreditCard, quien: 'agente' },
        { clave: 'step4', icono: UsersThree, quien: 'tu', conTuParte: true },
      ],
    },
  ),

  // micro: avaluos (CONDUCTA: la vacancia y el canon; nunca propone un precio).
  // avalúos: `avaluo/src/lib/avaluo/intake.schema.ts` (matrícula y fotos opcionales); se paga
  // en línea antes de estimar; el asistente se abre en otra pestaña.
  avaluos: delAgente(
    'avaluos',
    'avaluos',
    { capacidades: [SealCheck, ListChecks, HouseLine], necesita: [HouseLine, CreditCard] },
    true,
    {
      ns: `${PAGES}.avaluos`,
      pasos: [
        { clave: 'step1', icono: ShareNetwork, quien: 'tu', conTuParte: true },
        { clave: 'step2', icono: CreditCard },
        { clave: 'step3', icono: SealCheck, quien: 'leasefy' },
        { clave: 'step4', icono: EnvelopeSimple, quien: 'leasefy', conTuParte: true },
      ],
    },
  ),

  // micro: cotizador (CONDUCTA: cotiza a pedido), quote-orchestrator (Sura, Mapfre, Bolívar y
  // Fianly en paralelo), explainability/** y counterfactual/**.
  cotizador: delAgente(
    'cotizador',
    'cotizador',
    { capacidades: [Lightning, Table, Lightbulb], necesita: [IdentificationCard, HouseLine] },
    false,
    {
      ns: `${PAGES}.cotizador`,
      pasos: [
        { clave: 'step1', icono: ClipboardText, quien: 'tu', conTuParte: true },
        { clave: 'step2', icono: Lightning, quien: 'agente' },
        { clave: 'step3', icono: ShieldCheck, quien: 'agente' },
        { clave: 'step4', icono: CheckCircle, quien: 'tu', conTuParte: true },
      ],
    },
  ),

  // micro: estudio (CONDUCTA: corre cuando alguien lo pide), tenant-scoring. Nico 04-10: el
  // estudio es OPCIONAL y lo pide el candidato.
  estudio: delAgente(
    'estudio',
    'estudio',
    { capacidades: [FileMagnifyingGlass, ChartBar, UserCheck], necesita: [ClipboardText, UserCheck] },
    false,
    {
      ns: `${PAGES}.estudio`,
      pasos: [
        { clave: 'step1', icono: ClipboardText, quien: 'candidato' },
        { clave: 'step2', icono: FileMagnifyingGlass, quien: 'agente' },
        { clave: 'step3', icono: ChartBar, quien: 'tu', conTuParte: true },
        { clave: 'step4', icono: CheckCircle, quien: 'leasefy' },
      ],
    },
  ),

  // micro: matching (CONDUCTA: lista corta y opciones al interesado nuevo), smart-matching,
  // suggestion-email; back: MatchingDelPilotoScheduler.
  matching: delAgente(
    'matching',
    'matching',
    { capacidades: [Buildings, Ranking, EnvelopeSimple], necesita: [Buildings, CheckCircle] },
    true,
    {
      ns: `${PAGES}.matching`,
      pasos: [
        { clave: 'step1', icono: UserCheck },
        { clave: 'step2', icono: Buildings, quien: 'agente' },
        { clave: 'step3', icono: Ranking, quien: 'tu', conTuParte: true },
      ],
    },
  ),

  // El piloto automático, con el orbe de Ori. NO es el chat (memoria
  // chat-no-es-piloto-automatico). micro: piloto-activo.ts (lo activa un administrador con
  // segundo factor; prueba de 30 días; al vencer vuelve a Copiloto), perilla.ts (lo que
  // siempre pide una persona). Usa las claves de `PilotoNovedad`.
  piloto: {
    id: 'piloto',
    agente: 'orquestador',
    nombre: `${NOVEDAD}.titulo`,
    rol: `${NOVEDAD}.rol`,
    promesa: `${NOVEDAD}.descripcion`,
    capacidades: [
      { icono: Robot, titulo: `${NOVEDAD}.paso1.titulo`, texto: `${NOVEDAD}.paso1.texto` },
      { icono: Tray, titulo: `${NOVEDAD}.paso2.titulo`, texto: `${NOVEDAD}.paso2.texto` },
      { icono: SlidersHorizontal, titulo: `${NOVEDAD}.paso3.titulo`, texto: `${NOVEDAD}.paso3.texto` },
    ],
    necesita: [
      { icono: Power, texto: `${NOVEDAD}.necesita.n1` },
      { icono: Tray, texto: `${NOVEDAD}.necesita.n2` },
    ],
    modo: {
      gobierna: true,
      queHace: { sombra: `${NOVEDAD}.modo.sombra`, copiloto: `${NOVEDAD}.modo.copiloto`, autonomo: `${NOVEDAD}.modo.autonomo` },
    },
    comoFunciona: {
      titulo: `${NOVEDAD}.comoFunciona.titulo`,
      descripcion: `${NOVEDAD}.comoFunciona.descripcion`,
      pasos: [
        {
          icono: Power,
          quien: 'tu',
          titulo: `${NOVEDAD}.comoFunciona.p1.titulo`,
          explicacion: `${NOVEDAD}.comoFunciona.p1.explicacion`,
          tuParte: `${NOVEDAD}.comoFunciona.p1.tuParte`,
        },
        {
          icono: SlidersHorizontal,
          quien: 'tu',
          titulo: `${NOVEDAD}.comoFunciona.p2.titulo`,
          explicacion: `${NOVEDAD}.comoFunciona.p2.explicacion`,
        },
        {
          icono: Robot,
          quien: 'agente',
          titulo: `${NOVEDAD}.comoFunciona.p3.titulo`,
          explicacion: `${NOVEDAD}.comoFunciona.p3.explicacion`,
        },
        {
          icono: Tray,
          quien: 'tu',
          titulo: `${NOVEDAD}.comoFunciona.p4.titulo`,
          explicacion: `${NOVEDAD}.comoFunciona.p4.explicacion`,
          tuParte: `${NOVEDAD}.comoFunciona.p4.tuParte`,
        },
      ],
    },
    empezar: `${NOVEDAD}.cta`,
  },
}

/** La ficha de un agente del registro (`null` si no tiene presentación, como Pagos). */
export function fichaDelAgente(id: string): FichaDePresentacion | null {
  return (PRESENTACIONES as readonly string[]).includes(id) && id !== 'piloto' ? FICHAS[id as IdDePresentacion] : null
}

/** Todas las claves que usa una ficha (para la prueba de que existen en es y en). */
export function clavesDeLaFicha(f: FichaDePresentacion): string[] {
  const modo = f.modo.gobierna ? Object.values(f.modo.queHace) : [f.modo.aPedido]
  const como = f.comoFunciona.ns
    ? f.comoFunciona.pasos.flatMap((p) => [
        `${f.comoFunciona.ns}.comoFunciona.${p.clave}.title`,
        `${f.comoFunciona.ns}.comoFunciona.${p.clave}.desc`,
      ])
    : [
        f.comoFunciona.titulo,
        f.comoFunciona.descripcion,
        ...f.comoFunciona.pasos.flatMap((p) => [p.titulo, p.explicacion, p.tuParte]),
      ]
  return [
    f.nombre,
    f.rol,
    f.promesa,
    f.empezar,
    ...f.capacidades.flatMap((c) => [c.titulo, c.texto]),
    ...f.necesita.map((n) => n.texto),
    ...modo,
    ...como,
  ].filter((k): k is string => Boolean(k))
}
