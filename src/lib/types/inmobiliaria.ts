/**
 * Types for the Inmobiliaria (Real Estate Agency) module
 * Handles portfolio management, agents, property owners, and collections
 */

import type {
  CargoAlInquilino,
  DeduccionesDeLaLiquidacion,
  PropuestaDelAgente,
} from './deducciones';
import type { BankCode, AccountType } from './payment-accounts';
/*
 * El vocabulario de la cartera se declara UNA vez, en el tipo que espeja
 * `cartera.service.ts`. Copiarlo acá es cómo las dos pantallas de cartera
 * terminan llamando distinto a lo mismo.
 */
import type { CajonDeLaCuota, EstadoDeCuota } from '@/lib/api/cartera.types';
import type {
  BaseDeLaTasaDeRecaudo,
  MedidaDeLaTasa,
  TasaDeRecaudo,
} from '@/lib/tasa-de-recaudo';

// ============================================================================
// Propietario (Property Owner/Client)
// ============================================================================

export type DocumentType = 'CC' | 'CE' | 'TI' | 'NIT' | 'PASSPORT';

export interface PropietarioBankAccount {
  bank: BankCode;
  /**
   * El nombre del banco tal como llegó del back («Nequi», «Banco de Bogota»).
   * `bank` es el código del catálogo del front y queda vacío cuando el nombre
   * no está ahí (las billeteras no están); sin esto la ficha decía «Banco: »
   * en blanco para 8 de cada 60 propietarios.
   */
  bankName?: string;
  accountType: AccountType;
  accountNumber: string;
  accountHolder: string;
  /**
   * Documento del titular cuando la cuenta NO es del propietario (2026-09-07).
   * Bancolombia lo exige en el archivo de dispersión; sin él el lote usa el
   * documento del propietario. Sólo vienen cuando existen.
   */
  accountHolderDocument?: string;
  accountHolderDocumentType?: DocumentType;
}

export interface Propietario {
  id: string;
  name: string;
  /** Nullable in the DB (Prisma `String?`) — always guard before use. */
  email: string | null;
  /** Nullable in the DB (Prisma `String?`) — always guard before use. */
  phone: string | null;
  documentType: DocumentType;
  documentNumber: string;
  address?: string;
  city?: string;
  /** Departamento, aparte de la ciudad; lo parte la migración y lo edita el formulario. */
  department?: string | null;
  bankAccount: PropietarioBankAccount;
  /** Mandatos donde es el propietario PRINCIPAL (el de mayor participación). */
  propertyCount: number;
  /**
   * Mandatos donde es dueño con un porcentaje SIN ser el principal
   * (2026-09-13). Va aparte de `propertyCount` para no contar dos veces el
   * mismo inmueble. Opcional porque un back viejo no la manda; `normalizePropietario`
   * la deja en 0 en ese caso.
   */
  copropiedadesCount?: number;
  activeLeases: number;
  totalMonthlyRent: number;
  /**
   * Comisión mensual REAL de la agencia sobre los arrendados (Σ canon ×
   * porcentaje de cada mandato), calculada en el back. Opcional porque un
   * back viejo no la manda; sin ella no se estima nada (el «~10 %» que
   * salía antes era inventado).
   */
  totalCommission?: number;
  /** Lo que la inmobiliaria le debe: Σ neto de las dispersiones pendientes o en proceso. */
  pendingBalance: number;
  /** Última dispersión completada. */
  lastPaymentDate?: string | null;
  /** Canon de los arrendados menos la comisión: lo que recibe al mes. Del back. */
  netToOwner?: number;
  /**
   * Perfil tributario (2026-09-02). `null` = «no lo sabemos», que NO es «no»:
   * con null se cobra con el perfil por defecto del tipo de persona, y la
   * ficha lo dice. El tipo de persona sale de `documentType` (NIT = empresa).
   */
  responsableIva?: boolean | null;
  agenteRetenedorRenta?: boolean | null;
  agenteRetenedorIva?: boolean | null;
  agenteRetenedorIca?: boolean | null;
  /**
   * Su cuenta del portal (`User.id`), si tiene. La ficha del propietario es la
   * ficha COMERCIAL de la agencia y NO está relacionada con un usuario: el back
   * la resuelve por correo, que es único, así que o coincide exacto o esto es
   * null. Con null no se le puede escribir todavía, y la pantalla no lo ofrece.
   * Viene en el detalle (`GET /:id`) y también en la lista (`GET /`), porque es
   * la única forma de llegar a esta ficha desde una conversación, donde lo
   * único que se tiene de la persona es su `User.id`.
   */
  cuentaDePortalId?: string | null;
  /** El id que traía en el sistema del que se migró. Informativo, no es llave. */
  externalId?: string | null;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PropietarioFormData {
  name: string;
  email: string;
  phone: string;
  documentType: DocumentType;
  documentNumber: string;
  address?: string;
  city?: string;
  department?: string;
  bankCode: BankCode | '';
  accountType: AccountType | '';
  accountNumber: string;
  accountHolder: string;
  /** Documento del titular de la cuenta si no es el propietario; vacío = es el propietario. */
  accountHolderDocumentType?: DocumentType | '';
  accountHolderDocument?: string;
  notes?: string;
  /** Perfil tributario; `null` = sin definir. Van al back tal cual. */
  responsableIva?: boolean | null;
  agenteRetenedorRenta?: boolean | null;
  agenteRetenedorIva?: boolean | null;
  agenteRetenedorIca?: boolean | null;
}

// ============================================================================
// Agente Inmobiliario (Real Estate Agent)
// ============================================================================

export type AgenteRole = 'agent' | 'coordinator' | 'director';
// `invited` = lo invitaste y todavía no aceptó. No sale de `GET /agentes` (ese
// endpoint sólo devuelve miembros ACTIVE con usuario vinculado): es una fila de
// `agency_members` en INVITED, sin usuario todavía. Sin este estado la persona
// que acabas de invitar no existe en ninguna pantalla del módulo.
// Ver `useEquipo` en src/lib/hooks/useInmobiliaria.ts.
export type AgenteStatus = 'active' | 'inactive' | 'on_leave' | 'invited';

/**
 * 🔴 17-09 (Nico): «la comisión de los asesores va por FUERA de Leasefy». Acá
 * ya no hay pesos por asesor —`totalCommissions` y `commissionsThisMonth` se
 * quitaron del back y de la pantalla—: queda quién captó y quién arrendó.
 */
export interface AgenteMetrics {
  assignedProperties: number;
  activeLeases: number;
  closedThisMonth: number;
  closedThisYear: number;
  avgDaysToClose: number;
  /**
   * PORCENTAJE de 0 a 100 (dos decimales), como lo calcula el back
   * (`agentes.service.ts`: `completados / leads * 100`). NO es una fracción:
   * multiplicarlo por 100 pintaba «3333%».
   */
  conversionRate: number;
}

export interface Agente {
  /** Id de MIEMBRO de la agencia (`AgencyMember.id`). */
  id: string;
  /**
   * Id de USUARIO (`User.id`). No es el mismo que `id` y no son
   * intercambiables: `Consignacion.agenteUserId` guarda éste. Mandar el de
   * miembro donde va el de usuario no falla ni avisa — asigna a nadie.
   * Opcional porque hay respuestas viejas del back que todavía no lo traen.
   */
  userId?: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: AgenteRole;
  status: AgenteStatus;
  commissionSplit: number; // % of agency commission that goes to agent
  assignedPropertyIds: string[];
  hireDate: string;
  zone?: string; // Geographic zone they cover
  specialization?: 'apartment' | 'house' | 'studio' | 'room' | 'all';
  metrics: AgenteMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface AgenteFormData {
  name: string;
  email: string;
  phone: string;
  role: AgenteRole;
  commissionSplit: number;
  zone?: string;
  specialization?: 'apartment' | 'house' | 'studio' | 'room' | 'all';
}

// ============================================================================
// Consignacion (Property Consignment Agreement)
// ============================================================================

export type ConsignacionStatus = 'active' | 'terminated' | 'expired' | 'pending';
export type PropertyAvailability = 'available' | 'rented' | 'in_process' | 'maintenance';

/**
 * Un dueño del inmueble, con su tajada del mandato.
 *
 * `participacionBps` va en puntos básicos: 100 % = 10000, un tercio = 3333.
 * Entero y no decimal porque la invariante que importa es «suman 100», y sobre
 * enteros eso se verifica exacto (33.33 × 3 nunca da 100).
 */
export interface Copropietario {
  propietarioId: string;
  participacionBps: number;
  /** Lo que hace falta para mostrarlo sin ir a buscarlo. Viene del back. */
  propietario?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    documentNumber?: string | null;
  };
}

/** 100 % en puntos básicos — el mismo `BPS_TOTAL` del back. */
export const BPS_TOTAL = 10000;

/** `3333` → `"33,33 %"`. Sin decimales cuando son redondos: `5000` → `"50 %"`. */
export function formatParticipacion(bps: number): string {
  const pct = bps / 100;
  return `${pct.toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`;
}

export interface Consignacion {
  id: string;
  propertyId: string;
  /**
   * El propietario PRINCIPAL — el de mayor participación.
   *
   * Un inmueble puede tener más de un dueño (2026-09-03): la lista completa es
   * `copropietarios`. Este campo es DERIVADO del de mayor participación y se
   * mantiene porque es el que sigue leyendo todo el circuito de plata del back.
   * Para mostrar «de quién es el inmueble», usá `copropietarios` cuando tenga
   * más de uno.
   */
  propietarioId: string;
  /**
   * Todos los dueños con su participación, de mayor a menor.
   *
   * Vacío sólo contra un back viejo que todavía no manda el campo — en ese caso
   * hay que caer a `propietarioId`, nunca fabricar una participación.
   */
  copropietarios: Copropietario[];
  agenteId: string;

  // Property info (denormalized for convenience)
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  propertyZone: string;
  propertyType: 'apartment' | 'house' | 'studio' | 'commercial' | 'office' | 'warehouse' | 'parking' | 'land';
  propertyThumbnail?: string;
  /**
   * contract-addendum-2.md §A.2/§A.4/§A.9.1 — `null` on a SALE mandate.
   * Never `0` (C6). `Consignacion.monthlyRent` was NOT NULL before T-0038.
   */
  monthlyRent: number | null;
  adminFee?: number;

  /**
   * contract-addendum-2.md §A.1 — derived server-side from `Property.listingType`
   * at creation, NEVER accepted on either DTO. Absent on the wire (older back
   * build) degrades to `'rent'`. Unknown value → throw (C19), see
   * `normalizeConsignacion`.
   */
  listingType: 'rent' | 'sale';
  /**
   * contract-addendum-2.md §A.2/§A.3 — a DISTINCT field from `commissionPercent`.
   * `null` on a RENT mandate (normal) and on a pre-addendum SALE row. Render
   * `—`, never `0 %`.
   */
  saleCommissionPercent: number | null;
  /**
   * contract-addendum-2.md §A.9.1 — NEW, closes W3-c. `null` when the mandate
   * has no linked `propertyId` (a migrated cartera row). Never fabricate.
   */
  propertyCode: number | null;
  /**
   * 🔴 El estado del inmueble detrás del mandato. Dice si está EN CATÁLOGO:
   * `DRAFT` es lo único que significa «no publicado» y no entra al
   * denominador de la ocupación (Nico, 2026-09-12 — ver `lib/ocupacion.ts`).
   * `null` cuando el mandato no tiene inmueble (cartera migrada).
   */
  propertyStatus?: 'DRAFT' | 'AVAILABLE' | 'RENTED' | 'PENDING' | 'RESERVED' | null;
  /**
   * El «Código» de la inmobiliaria y la fecha de consignación del inmueble
   * detrás del mandato, planos como `propertyCode`. `GET /properties/:id` es
   * PUBLIC y no los trae; el cajón «Editar» se siembra de acá (2026-09-13).
   * `null` = no hay dato o no hay inmueble; ausente = back viejo.
   */
  propertyExternalId?: string | null;
  propertyConsignedAt?: string | null;
  /**
   * 🔴 Si el inmueble tiene un CONTRATO vigente. Es lo que decide «arrendado»
   * en todo el panel, no `availability`: un contrato migrado sin `Lease`
   * dejaba el mandato en «disponible» sobre un inmueble ocupado. `null` sin
   * inmueble detrás.
   */
  arrendado?: boolean | null;

  // Consignment terms
  /**
   * Agency commission (typically 8-12% on a RENT mandate). `0` on a SALE
   * mandate — see §A.3 for why that `0` is not a C6 violation (the row
   * carries `listingType: 'sale'` as an explicit discriminator). The front
   * MUST branch on `listingType` and render `saleCommissionPercent` instead
   * on a sale row.
   */
  commissionPercent: number;
  contractDate: string;
  contractEndDate?: string;
  minimumTerm?: number; // Minimum lease term in months

  // Status
  status: ConsignacionStatus;
  availability: PropertyAvailability;
  currentLeaseId?: string;
  currentTenantName?: string;
  /**
   * Quién vive HOY en el inmueble, sacado de su contrato vigente.
   *
   * 🔴 Distinto de `currentTenantName`, que es un texto suelto copiado al
   * activar: esto trae el contrato, el contacto y —lo que Nico pidió el
   * 2026-09-12— la cuenta a la que se le escribe por Leasefy.
   *
   * `null` en un inmueble disponible, y también contra un back anterior al
   * 2026-09-12 que todavía no manda el campo: en los dos casos la ficha cae a
   * `currentTenantName`, que sigue existiendo.
   */
  inquilino?: InquilinoDeLaConsignacion | null;
  leaseEndDate?: string;

  // Documents
  consignmentContractUrl?: string;
  actaEntregaUrl?: string;
  photosUrls?: string[];

  // Inventory
  inventoryItems?: InventoryItem[];

  createdAt: string;
  updatedAt: string;
}

/** El inquilino del contrato vigente, como lo manda el back. */
export interface InquilinoDeLaConsignacion {
  contractId: string;
  nombre: string;
  documento: string | null;
  correo: string | null;
  telefono: string | null;
  /**
   * Su cuenta del portal. `null` = el contrato guarda el nombre pero no quedó
   * asociado a un usuario: se muestran los datos que haya y no se ofrece
   * escribirle. Un botón que no puede hacer nada es peor que ninguno.
   */
  cuentaDePortalId: string | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  photoUrl?: string;
  /**
   * Dónde está («Cocina», «Alcoba principal»). Sólo lo usa el inventario por
   * versiones del inmueble; la lista vieja de la consignación no lo acepta.
   */
  espacio?: string;
}

export interface ConsignacionFormData {
  propietarioId: string;
  /**
   * Varios dueños con su participación. Excluyente con `propietarioId`: el back
   * 400ea si llegan los dos, así que `toConsignacionPayload` quita el suelto
   * cuando esta lista viene cargada. Ausente = un solo dueño, la forma vieja.
   */
  copropietarios?: { propietarioId: string; participacionBps: number }[];
  /**
   * El id temporal (`new-…`) del dueño que todavía no existe en el back.
   *
   * Con un solo dueño bastaba mirar `propietarioId`, pero desde que se pueden
   * elegir varios el pendiente puede ser un COPROPIETARIO y no el principal —
   * y sin este campo `persistOwnerIfNeeded` no sabría cuál de los ids de la
   * lista hay que crear. Se borra en cuanto el dueño se persiste.
   */
  duenoPendienteId?: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  propertyZone: string;
  propertyType: Consignacion['propertyType'];
  /**
   * contract-addendum-2.md §A.7 DTO deltas — OPTIONAL. Omitted (never `null`,
   * never `0`) on a sale mandate. Required in practice for a rent mandate
   * (enforced server-side by rule R1, and in the UI by not letting the
   * wizard/form advance without it).
   */
  monthlyRent?: number;
  adminFee?: number;
  commissionPercent: number;
  /**
   * contract-addendum-2.md §A.3/§A.7 — NEW, distinct from `commissionPercent`.
   * Required on a sale mandate (rule R3), forbidden on a rent one (rule R6).
   */
  saleCommissionPercent?: number;
  agenteId: string;
  minimumTerm?: number;
}

// ============================================================================
// Inmueble sin consignación (T-0030) — a Property with no mandate yet
// ============================================================================
//
// `GET /inmobiliaria/inmuebles/sin-consignacion` (contract.md T-0030 §3.1/§3.2).
// A read-only surface for properties (imported via link, or left mandate-less
// by an aborted manual wizard) that have no `Consignacion` in this agency, so
// they never appear in `GET /inmobiliaria/consignaciones`. Deliberately has
// no `id` — see `portafolioRowKey` below.

/** `PropertyType` (back) has 7 members; `ConsignacionPropertyType` has 6 — no `ROOM`. */
export type PropertyTypeAmplio = Consignacion['propertyType'] | 'room';

/** `Property.status` (Prisma `PropertyStatus`), lower-cased for the front. */
export type PropertyStatusSinConsignacion = 'draft' | 'available' | 'rented' | 'pending' | 'reserved';

/**
 * Raw shape of `GET /inmobiliaria/inmuebles/sin-consignacion`
 * (`InmuebleSinConsignacionResponseDto`, back, UPPER_SNAKE enums).
 * Hand-mirrored per `engineering/FRONTEND.md` §4 (mirror-and-map) — MUST NOT
 * be typed from `generated/back.ts` (contract.md T-0030 §4.1).
 */
export interface BackendInmuebleSinConsignacion {
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  /** May be `''` — DB allows an empty, non-null neighborhood. */
  propertyZone: string;
  propertyType: string;
  propertyThumbnail: string | null;
  /** contract.md T-0038 §3.2 — `null` on a SALE row. Never `0` (C6). */
  monthlyRent: number | null;
  adminFee: number;
  status: string;
  createdAt: string;
  /** contract.md T-0038 §3.2.1 — same degradation as `Property.department`. */
  propertyDepartment?: string | null;
  /** contract.md T-0038 §3.2.2 — absent (older back build) degrades to RENT. */
  propertyListingType?: string;
  /** contract.md T-0038 §3.2.3 — `null` → no sale price. Never `0` (C6). */
  propertySalePrice?: number | null;
  /**
   * contract.md T-0038 §3.2.5 — this route is already agency-guarded, so
   * unlike `Property.code` this key is always present (not absence-as-auth).
   */
  propertyCode?: number;
  /** contract.md T-0038 §3.2.6 — same route note as `propertyCode`. */
  propertyConsignedAt?: string | null;
}

/** Front-normalized row for a property with no mandate yet (lower-cased enums). */
export interface InmuebleSinConsignacion {
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  propertyZone: string;
  propertyType: PropertyTypeAmplio;
  propertyThumbnail: string | null;
  /** contract.md T-0038 §3.2 — `null` on a SALE row. Never `0` (C6). */
  monthlyRent: number | null;
  adminFee: number;
  status: PropertyStatusSinConsignacion;
  createdAt: string;
  department?: string | null;
  listingType?: 'rent' | 'sale';
  salePrice?: number | null;
  /** PORTFOLIO surface — this route is agency-guarded, so this is a real value, not an entitlement signal. */
  code?: number;
  /** `null` = entitled but unrecorded ("Sin fecha"); string = the date. */
  consignedAt?: string | null;
}

/**
 * The unified row the portfolio page renders — either a real mandate
 * (`Consignacion`) or a mandate-less property (`InmuebleSinConsignacion`).
 * `kind` is a front-only discriminator, stamped at merge time: the wire never
 * sends one on either source (contract §3.2 — "the front already knows which
 * array a row came from").
 */
export type PortafolioRow =
  | ({ kind: 'consignacion' } & Consignacion)
  | ({ kind: 'sinMandato' } & InmuebleSinConsignacion);

/**
 * Stable React key. Never bare `propertyId` for a mandate-less row — it would
 * read as a consignación id to the next maintainer (contract §3.2).
 */
export function portafolioRowKey(row: PortafolioRow): string {
  return row.kind === 'consignacion' ? row.id : `property:${row.propertyId}`;
}

// ============================================================================
// Pipeline de Arriendos (Rental Pipeline)
// ============================================================================

export type PipelineStage =
  | 'lead'              // Interesado - Initial contact
  | 'visit_scheduled'   // Visita programada
  | 'visit_done'        // Visita realizada
  | 'application'       // Aplicación enviada
  | 'evaluation'        // En evaluación
  | 'approved'          // Aprobado
  | 'contract'          // Contrato en firma
  | 'handover'          // En entrega
  | 'completed'         // Cerrado - Arrendado
  | 'lost';             // Perdido

export interface PipelineItem {
  id: string;
  consignacionId: string;
  propertyId: string;
  candidateId: string;
  agenteId: string;

  // Property info (denormalized)
  propertyTitle: string;
  propertyAddress: string;
  propertyThumbnail?: string;
  /**
   * `null` when the linked mandate has no canon — a SALE mandate, or none
   * linked at all. Render `—`, never `$ 0` (C6).
   */
  monthlyRent: number | null;

  // Candidate info (denormalized)
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateAvatar?: string;
  riskScore?: number;
  riskLevel?: 'A' | 'B' | 'C' | 'D' | 'E';

  // Pipeline tracking
  stage: PipelineStage;
  enteredStageAt: string;
  daysInStage: number;

  // Activity
  nextAction?: string;
  nextActionDate?: string;
  lastContactDate?: string;
  notes?: string;

  // Outcome
  lostReason?: string;
  completedLeaseId?: string;

  createdAt: string;
  updatedAt: string;
}

// Tech progression: in-progress = neutral gray, active step = info blue,
// positive milestones (approved/completed) = success, lost = critical.
const _STAGE_NEUTRAL = 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';
const _STAGE_INFO = 'bg-primary-soft text-primary';
const _STAGE_SUCCESS = 'bg-success-soft text-success';
const _STAGE_CRITICAL = 'bg-danger-soft text-danger';
export const PIPELINE_STAGES: { stage: PipelineStage; labelEs: string; labelEn: string; color: string }[] = [
  { stage: 'lead', labelEs: 'Interesado', labelEn: 'Lead', color: _STAGE_NEUTRAL },
  { stage: 'visit_scheduled', labelEs: 'Visita prog.', labelEn: 'Visit sched.', color: _STAGE_INFO },
  { stage: 'visit_done', labelEs: 'Visita hecha', labelEn: 'Visit done', color: _STAGE_NEUTRAL },
  { stage: 'application', labelEs: 'Aplicación', labelEn: 'Application', color: _STAGE_NEUTRAL },
  { stage: 'evaluation', labelEs: 'Evaluación', labelEn: 'Evaluation', color: _STAGE_INFO },
  { stage: 'approved', labelEs: 'Aprobado', labelEn: 'Approved', color: _STAGE_SUCCESS },
  { stage: 'contract', labelEs: 'Contrato', labelEn: 'Contract', color: _STAGE_INFO },
  { stage: 'handover', labelEs: 'Entrega', labelEn: 'Handover', color: _STAGE_INFO },
  { stage: 'completed', labelEs: 'Cerrado', labelEn: 'Completed', color: _STAGE_SUCCESS },
  { stage: 'lost', labelEs: 'Perdido', labelEn: 'Lost', color: _STAGE_CRITICAL },
];

// ============================================================================
// Cobros (Collections)
// ============================================================================

export type CobroStatus = 'pending' | 'paid' | 'partial' | 'late' | 'defaulted';

export interface Cobro {
  /** Con fecha = cobro ANULADO (nunca se borra). Sólo llega con el filtro «Anulados». */
  anuladoAt?: string | null;
  /** Por qué se anuló. */
  motivoDeLaAnulacion?: string | null;
  id: string;
  leaseId: string;
  consignacionId: string;
  propertyId: string;
  propietarioId: string;
  tenantId: string;
  agenteId: string;

  // Property info
  propertyTitle: string;
  propertyAddress: string;

  // Tenant info
  tenantName: string;
  tenantEmail: string | null;
  tenantPhone: string | null;

  // Amounts
  month: string; // '2026-02'
  rentAmount: number;
  adminAmount: number;
  totalAmount: number;
  lateFee: number;
  totalWithFees: number;

  // Payment info
  status: CobroStatus;
  dueDate: string;
  paidDate?: string;
  paidAmount: number;
  pendingAmount: number;
  paymentMethod?: string;
  paymentReference?: string;

  // Tracking
  daysLate: number;
  remindersSent: number;
  lastReminderDate?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CobroSummary {
  month: string;
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  totalLate: number;
  /**
   * 0–100, o `null` cuando el mes no tiene un solo cobro: sin nada esperado
   * no hay tasa que medir, y un 0 acá se pintaba como «0.0% · Bajo ↘».
   * Mismo contrato que `tasa_conciliacion` en Conciliación.
   */
  collectionRate: number | null;
  cobrosPaid: number;
  cobrosPending: number;
  cobrosLate: number;
  /**
   * 🔴 La tasa de recaudo del mes, medida como la eligió la inmobiliaria y con
   * su fórmula. `collectionRate` es su `pct`: la pantalla ya no la divide.
   */
  tasaDeRecaudo: TasaDeRecaudo | null;
}

// ============================================================================
// Dispersiones (Disbursements to Property Owners)
// ============================================================================

export type DispersionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DispersionItem {
  /**
   * 🔴 El documento, cuando existe. Es `null` en toda dispersión generada desde
   * el 16-09: la plata del propietario sale de su CUOTA, no de un cobro del
   * inquilino, y la inmobiliaria migrada no tiene un solo cobro contra 33.640
   * cuotas de propietario. Llavear una lista por esto colisiona todas las filas.
   */
  cobroId: string | null;
  /** La cuota del propietario que se gira. Es la identidad de la línea. */
  cuotaId: string | null;
  propertyTitle: string;
  /**
   * El canon liquidado, SIN la administración: ésa es de la copropiedad. 🔴 Con
   * la base CAUSADO (el default) es el canon del mes aunque el inquilino no haya
   * pagado: no es necesariamente plata recaudada.
   */
  rentCollected: number;
  commissionPercent: number;
  commissionAmount: number;
  netAmount: number;
  /** Conceptos del contrato que suman a favor del propietario. */
  conceptosAFavor: number;
  /** Conceptos que él paga: predial, reparaciones a su cargo. */
  conceptosACargo: number;
  /** Lo que entró y no es suyo: administración, seguros, mora. */
  deTerceros: number;

  /**
   * 🔴 D1 (17-09) — con qué modalidad entró este renglón. `null` o ausente = el
   * mandato no tiene modalidad y la liquidación es la de siempre.
   */
  modalidad?: ModalidadDelMandato | null;
  /** De dónde salió: del mandato del inmueble o del default de la inmobiliaria. */
  fuenteDeLaModalidad?: 'MANDATO' | 'INMOBILIARIA' | null;
  /**
   * El mes de la cuota, cuando NO es el de la liquidación: sobre recaudo, una
   * cuota que el inquilino pagó tarde entra en la liquidación siguiente.
   */
  mesDeLaCuota?: string | null;
  /**
   * Garantizado: lo que de este renglón el inquilino todavía no pagó. Es la
   * cuenta por cobrar al inquilino que la inmobiliaria recupera cuando pague.
   */
  sinRecaudoCop?: number;
  /**
   * D2: el recibo de caja cuyos intereses de mora y gastos de cobranza gira
   * este renglón (cuando son del propietario). Sin recibo, es un canon.
   */
  interesDelRecibo?: {
    reciboDeCajaId: string;
    reciboNumero: number | null;
    reciboFecha: string | null;
    destino: 'PROPIETARIO' | 'REPARTO';
    porcentajeAlPropietario: number;
    interesesCop: number;
    gastosDeCobranzaCop: number;
  } | null;
}

/** D1: con qué base se le gira al propietario. */
export type ModalidadDelMandato = 'GARANTIZADO' | 'SOBRE_RECAUDO';

export interface Dispersion {
  id: string;
  propietarioId: string;
  propietarioName: string;
  /**
   * `null` cuando el propietario no tiene cuenta registrada — un estado normal
   * que hay que poder mostrar. El back manda dos strings sueltos; el objeto lo
   * arma `adaptarDispersion`. Ver `lib/api/dispersion-adapter.ts`.
   */
  propietarioBankAccount: PropietarioBankAccount | null;

  month: string; // '2026-02'
  items: DispersionItem[];

  /**
   * Con qué base salió el canon (`totalCollected` y el `rentCollected` de cada
   * línea): `CAUSADO` —lo que el contrato cobra ese mes, haya pagado o no el
   * inquilino; el default— o `RECAUDADO` —lo que el inquilino pagó—. Rotula el
   * canon, no cambia ningún número. La resuelve `adaptarDispersion` con
   * `lib/propietarios/base-del-canon.ts::baseDeLaDispersion`.
   */
  baseDelCanon: 'CAUSADO' | 'RECAUDADO';

  // Totals
  /** Canon liquidado del mes, sin administración (causado o recaudado según `baseDelCanon`). */
  totalCollected: number;
  totalCommission: number;
  totalConceptosAFavor: number;
  totalConceptosACargo: number;
  totalDeTerceros: number;
  netToPropietario: number;
  /** Las deducciones de esta liquidación y lo que se gira. Opcional: back viejo. */
  conDeducciones?: DeduccionesDeLaLiquidacion;

  /**
   * D1 garantizado: de lo girado, lo que el inquilino todavía no pagó. Queda
   * como cuenta por cobrar al inquilino. Opcional: back anterior al 17-09.
   */
  cuentaPorCobrarAlInquilinoCop?: number;
  /** D2: intereses de mora y gastos de cobranza recaudados que se le giran. */
  interesesCop?: number;

  // Status
  status: DispersionStatus;
  approvedBy?: string;
  approvedAt?: string;
  processedAt?: string;
  transferReference?: string;
  failureReason?: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * Lo que `GET /dispersiones/preview` dice que pasaría al generar.
 *
 * Sale del MISMO cálculo que `generate`: lo que se muestra antes de apretar el
 * botón es lo que se va a guardar.
 */
/**
 * Por qué un mes no deja nada que girar, contado por el back en las cuotas del
 * lado PROPIETARIO (`dispersiones.service.ts::porQueElMesVieneVacio`). La
 * dispersión sale de esas cuotas —no de los cobros pagados— desde el 16-09.
 */
export interface PorQueElMesVieneVacio {
  /** Cuotas de propietario de ese mes, en cualquier estado. */
  cuotasDelMes: number;
  /** De ésas, las que ya quedaron en una dispersión (generada o girada). */
  enUnaDispersion: number;
  /** Sin dispersión, vivas y con saldo: las que se girarían. */
  porGirar: number;
  /** Sin dispersión y del sistema del que se migró. */
  delSistemaAnterior: number;
  /** Contratos vigentes (ACTIVE o SIGNED) de la inmobiliaria. */
  contratosVigentes: number;
}

/**
 * Las cuotas que llegaron TARDE a un mes que ya tiene la liquidación de ese
 * propietario: un contrato activado después, una tabla regenerada, la parte de
 * un copropietario. Antes se saltaban enteras; ahora, si la liquidación sigue
 * abierta, se le suman al generar, y si no, el back dice por qué no.
 */
export interface CuotasTardias {
  propietarioId: string;
  propietarioName: string;
  dispersionId: string;
  cuotas: number;
  netoCop: number;
  /** `true` = se le suman a su liquidación del mes al generar. */
  seSuman: boolean;
  /** Por qué no se pueden sumar. `null` si se suman. */
  motivo: string | null;
}

export interface VistaPreviaDeDispersiones {
  month: string;
  /**
   * Con qué regla se liquidó: `CAUSADO` (el default del back: el canon del mes,
   * haya pagado el inquilino o no) o `RECAUDADO` (sólo lo que el inquilino ya
   * pagó). Rotula el canon —«Canon causado» / «Canon recaudado»— y no cambia
   * ningún número. Ver `lib/propietarios/base-del-canon.ts`.
   */
  base?: 'CAUSADO' | 'RECAUDADO';
  totalPropietarios: number;
  /** Los que ya tienen dispersión de este mes: generar los saltaría. */
  yaGenerados: number;
  /**
   * De los que ya tienen dispersión, los que tienen cuotas que llegaron tarde.
   * Opcional: un back anterior no lo manda (y saltaba esas cuotas).
   */
  tardias?: CuotasTardias[];
  /**
   * Sin un solo borrador, la razón contada; con alguno, `null`. Opcional: un
   * back anterior al 16-09 no lo manda, y entonces la pantalla dice la frase
   * general.
   */
  vacio?: PorQueElMesVieneVacio | null;
  totalAGirar: number;
  totalComisiones: number;
  /** Lo que se descuenta este mes por deducciones. Opcional: back anterior al 2026-09-16. */
  totalDeducciones?: number;
  /** Lo que queda en contra y pasa a la siguiente liquidación. */
  totalSaldoEnContra?: number;
  /** D1 garantizado: lo que se giraría sin recaudo del inquilino. */
  totalCuentaPorCobrarAlInquilino?: number;
  /** D2: intereses de mora y gastos de cobranza del propietario que se girarían. */
  totalIntereses?: number;
  propietarios: {
    propietarioId: string;
    propietarioName: string;
    propietarioBankName: string | null;
    propietarioBankAccount: string | null;
    yaExiste: boolean;
    totalCollected: number;
    totalCommission: number;
    totalConceptosAFavor: number;
    totalConceptosACargo: number;
    totalDeTerceros: number;
    /** Con deducciones, el neto del mes MENOS ellas: puede ser negativo. */
    netToPropietario: number;
    /**
     * Las deducciones del mes y lo que se gira de verdad (`aGirarCop`, entero o
     * nada), calculados por el back con su regla única. Sin esto (back viejo),
     * el neto es el de siempre.
     */
    conDeducciones?: DeduccionesDeLaLiquidacion;
    items: DispersionItem[];
  }[];
}

export interface DispersionSummary {
  month: string;
  totalToDisburse: number;
  totalCommissions: number;
  dispersionsPending: number;
  dispersionsCompleted: number;
  dispersionsFailed: number;
}

// ============================================================================
// Mantenimiento (Maintenance Requests)
// ============================================================================

export type MantenimientoType = 'plumbing' | 'electrical' | 'appliance' | 'structural' | 'painting' | 'locks' | 'other';
export type MantenimientoPriority = 'low' | 'medium' | 'high' | 'emergency';
export type MantenimientoStatus = 'reported' | 'quoted' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
export type MantenimientoPaidBy = 'owner' | 'tenant' | 'split' | 'agency';

export interface MantenimientoQuote {
  id: string;
  providerName: string;
  providerPhone: string;
  amount: number;
  description: string;
  estimatedDays: number;
  createdAt: string;
}

/**
 * Lo que se manda para agregarle una cotización a una solicitud ya creada.
 *
 * Es el modelo `MantenimientoQuote` del back MENOS lo que él genera (`id`,
 * `createdAt`) y con el teléfono opcional, que es como está la columna
 * (`provider_phone` es nullable). No hay adjunto ni vigencia porque el modelo no
 * los guarda: un campo que la pantalla pide y la base tira es peor que no
 * pedirlo.
 */
export interface NuevaCotizacion {
  providerName: string;
  providerPhone?: string;
  amount: number;
  description: string;
  estimatedDays: number;
}

export interface SolicitudMantenimiento {
  id: string;
  consignacionId: string;
  propertyId: string;
  propietarioId: string;
  tenantId: string;
  agenteId: string;

  // Property & people info
  propertyTitle: string;
  propertyAddress: string;
  tenantName: string;
  propietarioName: string;

  // Request details
  type: MantenimientoType;
  priority: MantenimientoPriority;
  title: string;
  description: string;
  photoUrls?: string[];

  // Process
  status: MantenimientoStatus;
  quotes: MantenimientoQuote[];
  selectedQuoteId?: string;
  approvedAmount?: number;
  paidBy: MantenimientoPaidBy;

  // Completion
  completedAt?: string;
  completionNotes?: string;
  completionPhotoUrls?: string[];

  /**
   * Lo que dejó propuesto el agente de mantenimiento, esperando a una persona.
   * Ausente con un back anterior; `null` sin propuesta.
   */
  propuesta?: PropuestaDelAgente | null;
  /** El cargo vivo en el estado de cuenta del inquilino, si quedó a su cargo. */
  cargoAlInquilino?: CargoAlInquilino | null;

  createdAt: string;
  updatedAt: string;
}

export const MANTENIMIENTO_TYPES: { type: MantenimientoType; labelEs: string; labelEn: string; icon: string }[] = [
  { type: 'plumbing', labelEs: 'Plomería', labelEn: 'Plumbing', icon: '🚿' },
  { type: 'electrical', labelEs: 'Electricidad', labelEn: 'Electrical', icon: '⚡' },
  { type: 'appliance', labelEs: 'Electrodomésticos', labelEn: 'Appliances', icon: '🔧' },
  { type: 'structural', labelEs: 'Estructura', labelEn: 'Structural', icon: '🏗️' },
  { type: 'painting', labelEs: 'Pintura', labelEn: 'Painting', icon: '🎨' },
  { type: 'locks', labelEs: 'Cerrajería', labelEn: 'Locks', icon: '🔐' },
  { type: 'other', labelEs: 'Otro', labelEn: 'Other', icon: '📝' },
];

// ============================================================================
// Reportes (Reports)
// ============================================================================

/**
 * Un renglón de la liquidación: de dónde sale cada peso.
 *
 * Sin el motivo, un extracto sólo se puede revisar rehaciendo la cuenta a mano
 * — y entonces no sirve para reclamar.
 */
export interface RenglonDeLiquidacion {
  concepto: string;
  /** Positivo suma a lo que recibe el propietario; negativo lo descuenta. */
  valorCop: number;
  motivo: string;
}

/**
 * El extracto de un propietario, como lo manda
 * `GET /inmobiliaria/propietarios/:id/extracto`.
 *
 * ⚠️ Este tipo declaraba `properties` y `summary`, que el back NUNCA envió: la
 * respuesta trae `lineItems` y `totals`. Como la página lo cargaba en un
 * `useState<any>`, tsc no veía nada y el componente hacía
 * `extracto.properties.map(...)` sobre `undefined` — el modal reventaba al
 * abrirlo. Es el mismo defecto que ya había tenido CarteraItem, en el tipo de
 * al lado.
 */
/**
 * Huella de un envío del extracto mensual a un propietario
 * (GET /inmobiliaria/propietarios/:id/extractos, las últimas 12).
 */
export type EstadoDelExtractoEnviado = 'ENVIADO' | 'FALLIDO' | 'OMITIDO';
export type OrigenDelExtractoEnviado = 'automatico' | 'manual';

export interface ExtractoEnviado {
  id: string;
  /** 'YYYY-MM' */
  month: string;
  origen: OrigenDelExtractoEnviado;
  estado: EstadoDelExtractoEnviado;
  destinatario: string | null;
  /** Por qué falló o se omitió; null cuando salió. */
  motivo: string | null;
  enviadoAt: string | null;
  createdAt: string;
}

/** GET /inmobiliaria/propietarios/extractos/resumen?month=YYYY-MM */
export interface ResumenDeExtractos {
  month: string;
  enviados: number;
  fallidos: number;
  omitidos: number;
  ultimoEnvioAt: string | null;
  /** Propietarios con al menos un cobro en ese mes: los que recibirían extracto. */
  propietariosConActividad: number;
}

export interface DetalleDeEnvioDeExtracto {
  propietarioId: string;
  nombre: string;
  estado: EstadoDelExtractoEnviado;
  motivo?: string;
}

/** POST /inmobiliaria/propietarios/extractos/enviar-mes */
export interface ResultadoDeEnvioMasivo {
  month: string;
  enviados: number;
  fallidos: number;
  omitidos: number;
  detalle: DetalleDeEnvioDeExtracto[];
}

export interface ExtractoPropietario {
  propietarioId: string;
  propietarioName: string;
  month: string;
  generatedAt: string;

  /**
   * Las deducciones del mes (reparaciones, descuentos con soporte, saldo en
   * contra del mes anterior) y lo que se gira de verdad. Lo calcula el back con
   * la regla única; opcional para un back anterior al 2026-09-16.
   */
  conDeducciones?: DeduccionesDeLaLiquidacion;

  lineItems: {
    /**
     * 🔴 La identidad de la fila desde el 16-09: la deuda del dueño vive en su
     * CUOTA. `cobroId` es el documento del OTRO lado del contrato y viene
     * `null` en todo extracto nuevo — llavear la lista por él colisiona.
     */
    cuotaId: string | null;
    cobroId: string | null;
    contractId: string | null;
    consignacionId: string | null;
    propertyTitle: string;
    propertyAddress: string | null;
    tenantName: string | null;
    /**
     * Cuánto del inmueble es de este propietario (100 % = 10000). Con varios
     * dueños cada columna de plata ya viene partida a SU parte; sin estos dos
     * campos la fila se leía como si el inmueble entero fuera suyo.
     */
    participacionBps?: number;
    /** `40 %`. `null` con un solo dueño: ahí sobra en pantalla (lo mismo que el PDF). */
    participacionLabel?: string | null;
    /** Lo facturado al inquilino. */
    rentAmount: number;
    adminAmount: number;
    totalAmount: number;
    paidAmount: number;
    status: string;
    commissionPercent: number;
    commissionAmount: number;
    /** Lo que se le gira al propietario por este inmueble. */
    netAmount: number;
    /**
     * El canon de la liquidación, SIN la administración. 🔴 Pese al nombre, no
     * siempre es plata recaudada: lo dice `baseDelCanon`.
     */
    rentCollected: number;
    /**
     * `CAUSADO` en una línea de cuota (el canon del mes, pagado o no);
     * `RECAUDADO` en una línea vieja armada sobre un cobro. Opcional: un back
     * anterior al 2026-09-16 no la manda (ver `baseDeLaLinea`).
     */
    baseDelCanon?: 'CAUSADO' | 'RECAUDADO';
    /** Conceptos que suman a su favor (devoluciones, reajustes). */
    conceptosAFavor: number;
    /** Conceptos que él paga (predial, reparaciones a su cargo). */
    conceptosACargo: number;
    /** Lo que entró y no es suyo: administración, seguros, mora. */
    deTerceros: number;
    /** La dispersión que se llevó esta cuota, si ya salió. */
    dispersionId: string | null;
    /** Lo ya girado, lo que va en un lote sin pagar y lo que falta. Suman `netAmount`. */
    giradoCop: number;
    enGiroCop: number;
    porGirarCop: number;
    /**
     * `SIN_DATO` es una línea vieja armada sobre un cobro: el modelo anterior no
     * guardaba en qué iba el giro, y decir «por girar» afirmaría algo que no consta.
     */
    estadoDelGiro: 'GIRADO' | 'EN_GIRO' | 'POR_GIRAR' | 'SIN_DATO';
    renglones: RenglonDeLiquidacion[];
  }[];

  /**
   * Por qué el extracto viene sin líneas, cuando viene sin líneas. Sin esto la
   * pantalla no puede distinguir «este dueño no tiene inmuebles» de «este mes
   * no se movió nada», y las dos se leen igual: en blanco.
   */
  sinMovimiento: {
    codigo: 'SIN_INMUEBLES' | 'SIN_MOVIMIENTO_DEL_MES';
    mensaje: string;
  } | null;

  /**
   * La base del canon del extracto entero: `MIXTA` cuando conviven líneas de
   * cuotas y de cobros viejos. Opcional por los back anteriores al 2026-09-16.
   */
  baseDelCanon?: 'CAUSADO' | 'RECAUDADO' | 'MIXTA';

  totals: {
    totalRent: number;
    totalAdmin: number;
    totalPaid: number;
    totalCommission: number;
    totalNet: number;
    totalConceptosAFavor: number;
    totalConceptosACargo: number;
    totalDeTerceros: number;
    totalGirado: number;
    totalEnGiro: number;
    totalPorGirar: number;
  };

  bankInfo: {
    bankName: string | null;
    bankAccountType: string | null;
    bankAccountNumber: string | null;
    bankAccountHolder: string | null;
  };
}

/**
 * El INTERÉS DE MORA de una cuota, tal como lo manda el back
 * (`InteresEnPantalla`, en `back-erp/src/inmobiliaria/cartera/lo-que-liquida-el-interes.ts`).
 *
 * Es UNA lectura para todas las pantallas —la cartera por edad y por concepto,
 * la cartera del mes, el informe, el estado de cuenta y el recibo de caja—,
 * liquidada con la MISMA regla que la prefactura. El front no calcula un peso:
 * pinta esto. Capital e interés viajan SIEMPRE por separado.
 *
 * Donde una fila lo trae es opcional a propósito: un back anterior no lo manda,
 * y «no vino el interés» no es «el interés es cero».
 */
export interface InteresDeMora {
  /** Lo liquidado: interés diario y gasto administrativo de cobranza. */
  liquidadoCop: number;
  /** Lo ya abonado a intereses (la ley los pone antes que el capital). */
  abonadoCop: number;
  /** 🔴 Lo que falta de interés hoy. */
  pendienteCop: number;
  /** `COBRO` = ya liquidado y escrito; `CUOTA` = calculado hoy, crece mañana. */
  origen: 'COBRO' | 'CUOTA' | null;
  /** El capital ya se pagó, pero se pagó cuando la cuota ya era cartera. */
  pagadaEnMora: boolean;
  diasDeMora: number;
  /** Por qué está en mora y no lleva interés. `null` si lleva o no es cartera. */
  motivo: string | null;
  /** El motivo es que la inmobiliaria no tiene reglas de mora activas. */
  sinReglas: boolean;
}

/** Una fila cualquiera de cartera, con lo que el back le agrega de mora. */
export type ConInteres<T> = T & {
  interes?: InteresDeMora;
  /** Capital + interés pendiente de la fila. */
  totalConInteresCop?: number;
};

/**
 * Una fila del informe de cartera: UNA CUOTA de un contrato.
 *
 * 🔴 Cambió la UNIDAD y cambió la MEDIDA (back, 2026-09-16):
 *
 * · La unidad era el `Cobro`. Ahora es la CUOTA del contrato
 *   (`contrato_cuotas`). El cobro es el documento con el que finanzas reclama
 *   una parte de la deuda, y la inmobiliaria migrada no tiene ni uno: el
 *   informe salía en cero con $8.446,8 millones pendientes encima. Por eso
 *   `cuotaId` es la llave de la fila y `cobroId` puede ser `null`.
 * · `daysLate` se llama ahora `diasDeMora` y significa otra cosa: los días
 *   DESPUÉS del plazo del contrato, no los días desde el vencimiento. El
 *   nombre cambió a propósito para que ningún lector siga usando el viejo
 *   creyendo que mide lo mismo.
 *
 * El vocabulario es el de `@/lib/api/cartera.types` —el de «Cartera por
 * concepto»— para que las dos pantallas de cartera cuenten la misma historia
 * con las mismas palabras.
 */
export interface CarteraItem {
  /** 🔴 La identidad de la fila. Es la `key` de React, no `cobroId`. */
  cuotaId: string;
  /** El documento de cobro, si finanzas ya lo emitió. `null` es lo normal. */
  cobroId: string | null;
  contractId: string;
  /** El número que la inmobiliaria conoce (el suyo si el contrato es migrado). */
  contrato: string | null;
  /** Nuestro consecutivo, rotulado, sólo cuando `contrato` es el de ella. */
  contratoDeLeasefy: string | null;
  /** `null` cuando el contrato migrado no tiene inmueble cargado. */
  propertyId: string | null;
  /** `null` cuando el inmueble no tiene mandato en esta inmobiliaria. */
  consignacionId: string | null;
  propertyTitle: string;
  propertyAddress: string | null;
  tenantName: string | null;
  tenantPhone: string | null;
  tenantDocument: string | null;
  propietarioId: string | null;
  propietarioName: string | null;
  agenteId: string | null;
  agenteName: string | null;
  /** `YYYY-MM`: el período de la cuota. */
  month: string;
  /** `YYYY-MM-DD`: el día de cartera del período. De acá arranca el plazo. */
  vence: string;
  estado: EstadoDeCuota;
  /** 🔴 En cuál de los tres cajones cae. Los tres no se solapan. */
  cajon: CajonDeLaCuota;
  /** 🔴 Días DESPUÉS del plazo. `0` mientras el plazo del contrato corre. */
  diasDeMora: number;
  /** Los días de plazo que rigen para este contrato, ya resueltos. */
  diasDePlazo: number;
  /** El día de cartera ya pasó. Puede ser deuda vencida sin ser cartera. */
  esVencida: boolean;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  /**
   * Recordatorios efectivamente enviados. 🔴 `null` —y no `0`— cuando la cuota
   * no tiene cobro emitido: «no le hemos escrito» y «no hay documento desde el
   * cual escribirle» son dos cosas distintas, y un cero las tapa.
   */
  remindersSent: number | null;
  lastReminderDate: string | null;
  /** El interés de mora de la cuota. Ver `InteresDeMora`. */
  interes?: InteresDeMora;
  /** `pendingAmount + interes.pendienteCop`. */
  totalConInteresCop?: number;
}

/**
 * Las cinco cifras del informe. 🔴 NO se pueden sumar en una sola.
 *
 * Las tres del medio son una PARTICIÓN de `deudaTotalCop`: suman el total por
 * construcción. Son las mismas palabras y los mismos números que la franja de
 * «Cartera por concepto» (`TotalesDeCartera` en `@/lib/api/cartera.types`),
 * donde `enMoraCop` es esta `carteraCop`.
 */
export interface CarteraSummary {
  /** Toda la deuda pendiente del contrato, venza cuando venza. */
  deudaTotalCop: number;
  /** Todavía no vence. Es deuda, NO es cartera. */
  porVencerCop: number;
  /** Venció, pero el plazo del contrato sigue corriendo. Tampoco es cartera. */
  vencidaEnPlazoCop: number;
  /** 🔴 LA CARTERA: pasó el plazo. Siniestros incluidos. */
  carteraCop: number;
  /** Cartera − siniestros: lo que sigue siendo cobranza. Suman los tramos. */
  carteraVivaCop: number;
  enSiniestroCop: number;
  /** Los tramos por edad, sobre la mora REAL y sobre la cartera viva. */
  bucket0to30: number;
  bucket31to60: number;
  bucket61to90: number;
  bucket90plus: number;
  cuotas: number;
  cuotasPorVencer: number;
  cuotasVencidasEnPlazo: number;
  cuotasEnCartera: number;
  cuotasEnSiniestro: number;
  /** 🔴 El interés de mora que falta, sumado. Va aparte del capital. */
  interesCop?: number;
  /** De ese interés, el de los casos en siniestro. */
  interesEnSiniestroCop?: number;
  /** `carteraCop + interesCop`. */
  carteraConInteresCop?: number;
  /** `deudaTotalCop + interesCop`. */
  deudaTotalConInteresCop?: number;
  /** Cuotas ya pagadas que siguen debiendo el interés de su mora. */
  cuotasPagadasEnMora?: number;
}

/** Cuántas filas quedaron sin cada dato. Es el respaldo de `avisos`. */
export interface CarteraSinCamino {
  sinInmueble: number;
  sinMandato: number;
  sinPropietario: number;
  sinAgente: number;
  sinDireccion: number;
  sinTelefono: number;
}

export interface CarteraReport {
  generadoEn: string;
  /** `YYYY-MM-DD` en Bogotá: contra qué día se midieron los días de mora. */
  hoy: string;
  /** Los tres cajones. Los siniestros van aparte, en `siniestros`. */
  items: CarteraItem[];
  summary: CarteraSummary;
  byMonth?: CarteraMonthItem[];
  siniestros: CarteraSiniestros;
  sinCamino: CarteraSinCamino;
  /** Contratos vigentes sin tabla de amortización: su deuda NO está acá. */
  contratosSinCuotas: number;
  /** Lo que estos números NO cuentan, escrito para que lo lea una persona. */
  avisos: string[];
  /** La agencia no tiene reglas de mora activas y hay cartera: el 0 no es «sin mora». */
  sinReglasDeMora?: boolean;
}

/** Un caso en siniestro, con desde cuándo lo es. */
export interface CarteraSiniestro extends CarteraItem {
  /**
   * `YYYY-MM-DD`, DERIVADO de la regla (vencimiento + plazo +
   * `diasParaSiniestro`), no un sello de auditoría. El informe habla de la
   * regla, que es lo que se puede explicar y recalcular.
   */
  siniestroDesde: string;
  diasEnSiniestro: number;
}

export interface CarteraSiniestros {
  cantidad: number;
  totalCop: number;
  /** A los cuántos días de mora un caso pasa a siniestro en esta agencia. */
  diasParaSiniestro: number;
  items: CarteraSiniestro[];
}

// ============================================================================
// Ocupacion Report
// ============================================================================

export interface OcupacionPropertyItem {
  consignacionId: string;
  propertyTitle: string;
  propertyZone: string;
  availability: string;
  tenantName?: string;
  monthlyRent: number;
  /**
   * 🔴 Si el inmueble tiene un CONTRATO vigente. Es lo que decide la insignia
   * «Arrendado», no `availability` (Nico, 2026-09-12: «no me está relacionando
   * bien los inmuebles arrendados»). Opcional sólo para no romper una
   * respuesta vieja en caché; el back lo manda siempre.
   */
  arrendado?: boolean;
  /** Si esta fila entró al denominador de la tasa. */
  enCatalogo?: boolean;
}

export interface OcupacionTrendItem {
  month: string;
  /**
   * `null` cuando la serie no midió nada: la ocupación mensual se deriva de los
   * cobros, y una agencia recién migrada (o con el motor de cobros apagado) no
   * tiene ninguno. Doce ceros al lado de un encabezado que dice 83 % son la
   * misma pantalla afirmando dos cosas incompatibles.
   */
  rate: number | null;
}

export interface CarteraMonthItem {
  month: string;
  /** Lo pactado en las cuotas del mes (sin las anuladas ni las del sistema anterior). */
  total: number;
  collected: number;
  /** 🔴 Lo que pasó el plazo del contrato, no todo lo vencido. */
  overdue: number;
  /** Cuántas cuotas hay detrás del mes. Antes era `cobroCount`. */
  cuotas: number;
  collectionRate: number;
  /**
   * 🔴 La tasa del mes medida como la eligió la inmobiliaria, con su fórmula.
   * Sobre lo emitido, `collected`/`total` NO son su numerador ni su
   * denominador. Una respuesta de antes del 2026-09-16 no la trae.
   */
  tasaDeRecaudo?: TasaDeRecaudo;
}

/**
 * 🔴 Este tipo describía un endpoint que no existe.
 *
 * Declaraba `totalAvailable`, `totalInProcess`, y por zona `totalProperties`,
 * `inProcess`, `available` y `occupancyRate`. El back no manda ninguno de
 * esos seis campos, y como el tipo los daba por presentes y obligatorios,
 * `tsc` no tenía nada que objetar: `undefined + undefined` compila.
 *
 * En pantalla eso salió como «NaN Vacantes», «NaN% Tasa vacancia» y, por
 * zona, «Medellín 5/ (NaN%)» — el denominador directamente en blanco. Tres
 * componentes lo consumían (`OccupancyReport`, `OcupacionChart`,
 * `ReporteViewer`) y los tres mostraban la palabra NaN a un cliente que paga.
 *
 * Lo que sigue es lo que `ReportsService.getOcupacionReport()` devuelve de
 * verdad, campo por campo. Ojo con dos cosas al tocarlo:
 *
 *   · No hay `generatedAt`: el controller devuelve el objeto del servicio sin
 *     envolverlo.
 *   · No hay estado «en proceso». El back sólo distingue RENTED de todo lo
 *     demás, así que la partición honesta es de a dos: ocupado o vacante.
 */
export interface OcupacionZone {
  zone: string;
  /** Los inmuebles de la zona que están EN CATÁLOGO: el denominador. */
  total: number;
  occupied: number;
  vacant: number;
  /** Los de la zona que quedaron fuera del catálogo y no se miden. */
  outOfCatalog?: number;
  /** Porcentaje de ocupación de la zona, 0–100. */
  rate: number;
  /** Porcentaje de vacancia de la zona, 0–100. */
  vacancyRate: number;
}

export interface OcupacionReport {
  /**
   * 🔴 El DENOMINADOR: los inmuebles EN CATÁLOGO, no todo el portafolio. Nico,
   * 2026-09-12: «esa tasa de ocupación se debe medir contra el inmueble
   * disponible, no contra el no disponible, porque ya está fuera del
   * catálogo». Lo que quedó afuera viaja en `totalOutOfCatalog` para que la
   * pantalla lo diga en vez de esconderlo.
   */
  totalProperties: number;
  /** Inmuebles del portafolio que NO entran a la tasa. */
  totalOutOfCatalog?: number;
  totalOccupied: number;
  totalVacant: number;
  /** 0–100. El back ya lo devuelve en 0 cuando no hay inmuebles. */
  overallOccupancyRate: number;
  /** 0–100. */
  overallVacancyRate: number;
  zones: OcupacionZone[];
  byProperty?: OcupacionPropertyItem[];
  monthlyTrend?: OcupacionTrendItem[];
}

// ============================================================================
// Comisiones Agente Report
// ============================================================================

/**
 * El informe de comisiones, desde el 17-09: la comisión es de la
 * INMOBILIARIA (un solo total) y por asesor sólo quedan los arriendos
 * cerrados del embudo. Ni un peso atribuido a una persona.
 */
export interface ComisionesAgenteReport {
  period: string; // '2026-02'
  /** La comisión de administración causada del mes: es de la inmobiliaria. */
  comisionDeLaAgenciaCop: number;
  /** Contratos que generaron comisión ese mes. */
  contratosConComision: number;
  /** Arriendos cerrados del embudo, por asesor. Sin pesos. */
  agentes: { userId: string; closedDeals: number }[];
  totalClosedDeals: number;
  /** Quién cerró más. `null` si nadie cerró nada. */
  topAgentUserId: string | null;
}

/** `GET /inmobiliaria/agentes/captaciones-y-arriendos`: quién captó y quién arrendó. */
export interface CaptacionesYArriendos {
  desde: string;
  hasta: string;
  asesores: {
    userId: string;
    nombre: string;
    activo: boolean;
    captados: number;
    arrendados: number;
  }[];
  sinAsesor: { captados: number; arrendados: number };
  captaciones: {
    consignacionId: string;
    inmueble: string;
    propietario: string | null;
    fecha: string;
    agenteUserId: string | null;
    agenteNombre: string | null;
  }[];
  arriendos: {
    pipelineItemId: string;
    consignacionId: string | null;
    inmueble: string | null;
    inquilino: string;
    fecha: string;
    agenteUserId: string | null;
    agenteNombre: string | null;
  }[];
}

// ============================================================================
// Vencimientos Report
// ============================================================================

export type RenewalStatus = 'pending' | 'negotiating' | 'renewed' | 'terminating';

export interface VencimientoItem {
  consignacionId: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  tenantName: string;
  tenantPhone: string;
  propietarioName: string;
  contractEndDate: string;
  daysUntilExpiry: number;
  renewalStatus: RenewalStatus;
  bucket: '0-30' | '31-60' | '61-90' | '90+';
}

export interface VencimientosReport {
  generatedAt: string;
  items: VencimientoItem[];
  summary: {
    totalVencimientos: number;
    bucket0to30: number;
    bucket31to60: number;
    bucket61to90: number;
    bucket90plus: number;
  };
}

// ============================================================================
// Flujo de Caja Report
// ============================================================================

export interface FlujoCajaMonth {
  month: string; // '2026-02'
  ingresos: number;
  dispersiones: number;
  comisiones: number;
  balance: number;
}

export interface FlujoCajaReport {
  generatedAt: string;
  period: 'quarter' | 'semester' | 'year';
  months: FlujoCajaMonth[];
  totals: {
    totalIngresos: number;
    totalDispersiones: number;
    totalComisiones: number;
    netBalance: number;
  };
}

// ── Rentabilidad por inmueble ────────────────────────────────────────────────
//
// `GET /inmobiliaria/reports/rentabilidad?desde=YYYY-MM&hasta=YYYY-MM`. Los
// porcentajes vienen en 0-100 con dos decimales. `rentabilidadNetaAnualPct`
// en `null` significa «sin valor comercial registrado»: no se inventa.

/**
 * De dónde salió la ocupación: del historial de contratos o de las cuotas.
 *
 * 🔴 `'cuotas'` se llamaba `'cobros'` hasta el 2026-09-16, en los dos lados. El
 * respaldo —para cuando el inmueble no tiene arriendo registrado— dejó de ser
 * «tuvo cobro ese mes», que en una inmobiliaria migrada es SIEMPRE falso porque
 * no tiene ni un cobro emitido, y pasó a ser «tuvo cuota ese mes», que es el
 * rastro fechado que deja el contrato desde que se firma. Espejo de
 * `back-erp/src/inmobiliaria/reports/rentabilidad-por-inmueble.ts`.
 */
export type RentabilidadOcupacionFuente = 'leases' | 'cuotas';

export interface RentabilidadFila {
  consignacionId: string;
  propertyId: string | null;
  codigo: number | null;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  propertyZone: string | null;
  propietarioId: string;
  propietarioNombre: string;
  canonCop: number;
  canonDesconocido: boolean;
  mesesEnRango: number;
  mesesConCobro: number;
  esperadoCop: number;
  recaudadoCop: number;
  pendienteCop: number;
  enMoraCop: number;
  tasaDeRecaudoPct: number;
  comisionCop: number;
  retencionesYCargosCop: number;
  gastosMantenimientoCop: number;
  netoPropietarioCop: number;
  margenNetoPct: number;
  ocupacionPct: number;
  ocupacionFuente: RentabilidadOcupacionFuente;
  diasEnRango: number;
  diasVacantes: number;
  ingresoPerdidoPorVacanciaCop: number;
  valorInmuebleCop: number | null;
  rentabilidadBrutaAnualPct: number | null;
  rentabilidadNetaAnualPct: number | null;
  estado: 'ACTIVE' | 'TERMINATED' | 'EXPIRED' | 'PENDING';
  availability: 'AVAILABLE' | 'RENTED' | 'IN_PROCESS' | 'MAINTENANCE';
}

export interface RentabilidadTotales {
  inmuebles: number;
  esperadoCop: number;
  recaudadoCop: number;
  pendienteCop: number;
  enMoraCop: number;
  tasaDeRecaudoPct: number;
  comisionCop: number;
  retencionesYCargosCop: number;
  gastosMantenimientoCop: number;
  netoPropietarioCop: number;
  ocupacionPromedioPct: number;
  ingresoPerdidoPorVacanciaCop: number;
  /** Cuántos inmuebles tienen valor comercial registrado. */
  conValor: number;
  gastosDescontadosEnElReporte: true;
}

export interface RentabilidadReport {
  /** `YYYY-MM` */
  desde: string;
  /** `YYYY-MM` */
  hasta: string;
  meses: number;
  generatedAt: string;
  /**
   * Con qué fórmula se midió `tasaDeRecaudoPct`, en las filas y en los totales.
   * Una respuesta de antes del 2026-09-16 no la trae: era sobre lo causado.
   */
  medidaDeLaTasa?: MedidaDeLaTasa;
  /** Ordenadas por `netoPropietarioCop` descendente. */
  filas: RentabilidadFila[];
  totales: RentabilidadTotales;
  notas: string[];
}

// ============================================================================
// Dashboard KPIs
// ============================================================================

export interface InmobiliariaDashboardKPIs {
  // Portfolio
  totalProperties: number;
  propertiesAvailable: number;
  /**
   * 🔴 Inmuebles del CATÁLOGO con un contrato vigente. Lo dice el contrato, no
   * el estado del inmueble ni la disponibilidad del mandato — ver
   * `lib/ocupacion.ts` para las dos reglas y las palabras de Nico.
   */
  propertiesRented: number;
  propertiesInProcess: number;
  /** `propertiesRented / propertiesInCatalog`, 0–100. */
  occupancyRate: number;
  /** El DENOMINADOR de `occupancyRate`: lo que la inmobiliaria puede arrendar. */
  propertiesInCatalog?: number;
  /** Lo que quedó fuera del catálogo y por eso no se mide. */
  propertiesOutOfCatalog?: number;
  /** Arrendados que están fuera del catálogo: no entran ni arriba ni abajo. */
  propertiesRentedOutOfCatalog?: number;

  // Financial (current month)
  expectedRevenue: number;
  collectedRevenue: number;
  pendingCollections: number;
  lateCollections: number;
  collectionRate: number;
  /**
   * 🔴 La tasa de recaudo del mes medida como la eligió la inmobiliaria, con su
   * fórmula y sus dos cifras. Una respuesta de antes del 2026-09-16 no la trae:
   * ver `tasaDelTablero`.
   */
  tasaDeRecaudo?: TasaDeRecaudo;
  totalCommissions: number;

  // Trends (signed % change vs previous month)
  collectionTrend: number;
  commissionsTrend: number;

  // Pipeline
  activeLeads: number;
  scheduledVisits: number;
  pendingApplications: number;
  contractsInProgress: number;

  // Team
  totalAgents: number;
  closedThisMonth: number;
  avgDaysToClose: number;

  // Owners
  totalPropietarios: number;
  pendingDispersions: number;

  /**
   * La deuda del contrato, leída de las cuotas (back `dashboard/plata-del-mes.ts`).
   * Opcional: una respuesta de un back anterior al 16-09 no la trae.
   */
  deuda?: DeudaDelTablero;
}

/** Los tres cajones de una deuda: por vencer, vencida en plazo y cartera. */
export interface CajonesDeLaDeuda {
  totalCop: number;
  porVencerCop: number;
  vencidaEnPlazoCop: number;
  carteraCop: number;
  cuotas: number;
  cuotasPorVencer: number;
  cuotasVencidasEnPlazo: number;
  cuotasEnCartera: number;
}

/** `deuda` de `GET /inmobiliaria/analytics/kpis`. */
export interface DeudaDelTablero {
  month: string;
  hoy: string;
  /** Toda la deuda viva de la inmobiliaria. */
  total: CajonesDeLaDeuda;
  /** Sólo las cuotas del mes consultado. */
  delMes: CajonesDeLaDeuda;
  causadoDelMesCop: number;
  abonadoDelMesCop: number;
  /** Recibos de caja con fecha en el mes, estén o no imputados a una cuota. */
  recaudadoEnCajaCop: number;
  porGirarAPropietariosCop: number;
  cuotasDeInquilino: number;
  contratosSinCuotas: number;
  /** Lo que el back vio raro y hay que decir (p. ej. plata en caja sin imputar). */
  avisos: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getPipelineStageInfo(stage: PipelineStage) {
  return PIPELINE_STAGES.find(s => s.stage === stage);
}

export function getMantenimientoTypeInfo(type: MantenimientoType) {
  return MANTENIMIENTO_TYPES.find(t => t.type === type);
}

export function calculateCommission(amount: number, percent: number): number {
  return Math.round(amount * (percent / 100));
}

export function calculateNetToPropietario(collected: number, commissionPercent: number): number {
  const commission = calculateCommission(collected, commissionPercent);
  return collected - commission;
}

export function getCobroStatusColor(status: CobroStatus): string {
  const colors: Record<CobroStatus, string> = {
    pending: 'bg-warning-soft text-warning',
    paid: 'bg-success-soft text-success',
    partial: 'bg-primary-soft text-primary',
    late: 'bg-danger-soft text-danger',
    defaulted: 'bg-danger-soft text-danger',
  };
  return colors[status];
}

export function getDispersionStatusColor(status: DispersionStatus): string {
  const colors: Record<DispersionStatus, string> = {
    pending: 'bg-warning-soft text-warning',
    processing: 'bg-primary-soft text-primary',
    completed: 'bg-success-soft text-success',
    failed: 'bg-danger-soft text-danger',
  };
  return colors[status];
}

export function getDispersionStatusLabel(status: DispersionStatus): string {
  const labels: Record<DispersionStatus, string> = {
    pending: 'Pendiente',
    processing: 'Procesando',
    completed: 'Completada',
    failed: 'Fallida',
  };
  return labels[status];
}

export function formatCurrency(amount: number): string {
  // Colombian pesos (COP). es-CO grouping (dot thousands) with a literal "$"
  // prefix — `{ style:'currency', currency:'COP' }` would insert a space after
  // the "$", so the prefix keeps the exact existing visual ("$2.500.000",
  // negatives "$-2.500") while fixing the es-CL/CLP (Chile) misnomer.
  return (
    '$' +
    new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  );
}

export function getDaysLate(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/*
 * `getAgingBucket` vivía acá y no la llamaba nadie. Además metía en el mismo
 * tramo un cobro que aún no vencía (daysLate = 0) y uno con 29 días de mora.
 * La versión que sí se usa está en `src/lib/cartera/edades.ts` y los separa.
 */

// ============================================================================
// Report Definitions (Centro de Reportes)
// ============================================================================

export type ReportId =
  | 'extractos-propietarios'
  | 'cartera-edades'
  | 'comisiones-agente'
  | 'ocupacion-portafolio'
  | 'vencimientos'
  | 'rendimiento-agentes'
  | 'flujo-caja'
  | 'rentabilidad-inmueble';

export type ReportFormat = 'pdf' | 'excel';
export type ReportCategory = 'financiero' | 'operativo' | 'agentes';
export type ReportFrequency = 'monthly' | 'weekly' | 'daily' | 'on-demand';

export interface ReportDefinition {
  id: ReportId;
  title: string;
  description: string;
  icon: string; // Phosphor icon name
  category: ReportCategory;
  format: ReportFormat;
  frequency: ReportFrequency;
  lastGenerated?: string;
  isFavorite?: boolean;
  /** Reports marked premium require Pro+ agency plan */
  premium?: boolean;
}

export interface ReportFiltersState {
  period: {
    start: string;
    end: string;
  };
  zone?: string;
  propietarioId?: string;
  agenteId?: string;
}

// Helper functions for reports
export function getReportCategoryColor(category: ReportCategory): string {
  const colors: Record<ReportCategory, string> = {
    financiero: 'bg-success-soft text-success',
    operativo: 'bg-primary-soft text-primary',
    agentes: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  };
  return colors[category];
}

export function getReportCategoryLabel(category: ReportCategory): string {
  const labels: Record<ReportCategory, string> = {
    financiero: 'Financiero',
    operativo: 'Operativo',
    agentes: 'Agentes',
  };
  return labels[category];
}

export function getReportFormatColor(format: ReportFormat): string {
  const colors: Record<ReportFormat, string> = {
    pdf: 'bg-danger-soft text-danger',
    excel: 'bg-success-soft text-success',
  };
  return colors[format];
}

export function getReportFrequencyLabel(frequency: ReportFrequency): string {
  const labels: Record<ReportFrequency, string> = {
    monthly: 'Mensual',
    weekly: 'Semanal',
    daily: 'Diario',
    'on-demand': 'Bajo demanda',
  };
  return labels[frequency];
}

// ============================================================================
// Renovaciones (Contract Renewals)
// ============================================================================

export type RenovacionStatus =
  | 'pending'        // Hasn't started yet
  | 'notified'       // Tenant notified about renewal
  | 'negotiating'    // In negotiation (terms, price)
  | 'approved'       // Both parties agreed
  | 'signed'         // New contract signed
  | 'completed'      // Fully processed
  | 'terminated';    // Won't renew

/**
 * Un movimiento del historial, tal como lo guarda el back
 * (`renovacion_history`). La lista no lo trae; el detalle sí.
 */
export interface RenovacionHistoryItem {
  id?: string;
  /** 'notified' | 'note' | 'tenant_accepted' | 'tenant_requested' | el estado del back cuando la nota acompaña un cambio de etapa. */
  action: string;
  description?: string | null;
  actorName?: string | null;
  createdAt?: string;
}

export interface Renovacion {
  id: string;
  consignacionId: string;
  leaseId: string;
  propertyId: string;
  propietarioId: string;
  tenantId: string;
  agenteId: string;

  // Property info (denormalized)
  propertyTitle: string;
  propertyAddress: string;
  tenantName: string;
  /**
   * El contacto NO está en la fila de la renovación: el back lo saca del
   * contrato vivo del inmueble al leer, y puede no haberlo.
   */
  tenantPhone: string | null;
  tenantEmail: string | null;
  /**
   * `User.id` del inquilino cuando la renovación cuelga de un Lease con
   * cuenta en Leasefy. Null en un contrato migrado: ahí «enviar» llega sólo
   * al correo del contrato, y el inquilino no acepta desde ningún panel.
   */
  tenantUserId?: string | null;
  propietarioName: string;
  /** El contrato vivo del inmueble, resuelto por el back al leer. */
  contractId?: string | null;
  /** Nuestro consecutivo del mismo contrato vivo. Lo que se MUESTRA es `contractNumero`. */
  contractCode?: number | null;
  /**
   * El número que se lee: el de la inmobiliaria si el contrato es migrado
   * («1686»), si no «#code». Ausente con un back anterior: se arma «#code».
   */
  contractNumero?: string | null;

  // Current lease
  currentRent: number;
  leaseStartDate: string;
  leaseEndDate: string;
  /** Recalculado por el back en cada lectura desde `leaseEndDate`. */
  daysUntilExpiry: number;
  urgencyBucket: '0-30' | '31-60' | '61-90' | '90+';

  // IPC calculation
  ipcRate?: number;        // IPC rate applied
  proposedRent?: number;   // New rent after IPC
  negotiatedRent?: number; // If different from proposed

  // Building administration fee (administración del conjunto) — also rises
  currentAdminFee?: number;    // Admin fee before renewal
  negotiatedAdminFee?: number; // New admin fee set by the admin

  // Workflow
  status: RenovacionStatus;
  tenantAcceptedAt?: string | null;
  history: RenovacionHistoryItem[];
  notifiedAt?: string;
  approvedAt?: string;
  signedAt?: string;
  completedAt?: string;

  // New lease
  newLeaseId?: string;
  newLeaseStartDate?: string;
  newLeaseEndDate?: string;

  // Renewal document (agency-uploaded)
  documentName?: string;
  documentPath?: string;

  createdAt: string;
  updatedAt: string;
}

export function getRenovacionStatusColor(status: RenovacionStatus): string {
  const colors: Record<RenovacionStatus, string> = {
    pending: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    notified: 'bg-primary-soft text-primary',
    negotiating: 'bg-warning-soft text-warning',
    approved: 'bg-success-soft text-success',
    signed: 'bg-success-soft text-success',
    completed: 'bg-success-soft text-success',
    terminated: 'bg-danger-soft text-danger',
  };
  return colors[status];
}

export function getRenovacionStatusLabel(status: RenovacionStatus): string {
  const labels: Record<RenovacionStatus, string> = {
    pending: 'Pendiente',
    notified: 'Notificado',
    negotiating: 'Negociando',
    approved: 'Aprobado',
    signed: 'Firmado',
    completed: 'Completado',
    terminated: 'Terminado',
  };
  return labels[status];
}

export function getUrgencyColor(bucket: '0-30' | '31-60' | '61-90' | '90+'): string {
  // Son días HASTA vencer, no de mora: menos días = más crítico. Los mismos
  // tonos que los cajones de la tabla (Críticas / Urgentes / Próximas); antes
  // el pill iba al revés que los chips.
  const colors = {
    '0-30': 'bg-danger-soft text-danger',
    '31-60': 'bg-warning-soft text-warning',
    '61-90': 'bg-primary-soft text-primary',
    '90+': 'bg-muted text-muted-foreground',
  };
  return colors[bucket];
}

// ============================================================================
// Configuracion - Extended Agency Config
// ============================================================================

// NOTE: the old InmobiliariaConfig/InmobiliariaConfigExtended (top-level
// name/branding/contact/legal/defaults) shapes were removed — that response
// never existed in the backend. The real agency profile is `AgencyProfile`
// (see below) under the `agency` key of GET /inmobiliaria/config.

export interface AgencyBranding {
  primaryColor: string;    // Hex color '#rrggbb'
  secondaryColor: string;  // Hex color '#rrggbb'
}

/**
 * Agency social media links (stored in Agency.branding.socials). All optional
 * URL strings — a blank network is an empty string, not omitted, so partial
 * edits never drop other networks on save.
 */
export interface AgencySocials {
  instagram?: string;
  facebook?: string;
  x?: string;
  tiktok?: string;
  whatsapp?: string;
}

// Helper for default branding colors (used when the agency has none saved)
export function getDefaultBranding(): AgencyBranding {
  return {
    primaryColor: '#1A40FF',   // Electric Blue
    secondaryColor: '#6B6B6B', // Neutral Mid
  };
}

// Colombian departments for address selection
export const COLOMBIAN_DEPARTMENTS = [
  'Amazonas',
  'Antioquia',
  'Arauca',
  'Atlántico',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Caquetá',
  'Casanare',
  'Cauca',
  'Cesar',
  'Chocó',
  'Córdoba',
  'Cundinamarca',
  'Guainía',
  'Guaviare',
  'Huila',
  'La Guajira',
  'Magdalena',
  'Meta',
  'Nariño',
  'Norte de Santander',
  'Putumayo',
  'Quindío',
  'Risaralda',
  'San Andrés y Providencia',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca',
  'Vaupés',
  'Vichada',
] as const;

export type ColombianDepartment = typeof COLOMBIAN_DEPARTMENTS[number];

// ============================================================================
// Configuracion - Integrations
// ============================================================================

export type IntegrationCategory = 'payments' | 'accounting' | 'communications' | 'storage';

export type IntegrationStatus = 'active' | 'inactive' | 'pending' | 'error';

export interface AgencyIntegration {
  id: string;
  name: string;
  description: string;
  category: IntegrationCategory;
  icon: string;          // Phosphor icon name
  status: IntegrationStatus;
  isEnabled: boolean;
  configUrl?: string;
  apiKeyConfigured?: boolean;
  lastSyncAt?: string;
  errorMessage?: string;
}

// ============================================================================
// Configuracion - Billing
// ============================================================================

export type BillingPlan = 'starter' | 'professional' | 'enterprise';

export type BillingCycle = 'monthly' | 'annual';

export interface PlanLimits {
  maxProperties: number;
  maxUsers: number;
  maxAgents: number;
  includesReports: boolean;
  includesAnalytics: boolean;
  includesIntegrations: boolean;
  includesApi: boolean;
  supportLevel: 'email' | 'priority' | 'dedicated';
}

export interface AgencyBilling {
  plan: BillingPlan;
  cycle: BillingCycle;
  pricePerMonth: number;
  nextBillingDate: string;
  paymentMethod?: {
    type: 'card' | 'pse' | 'transfer';
    last4?: string;
    brand?: string;
    bankName?: string;
  };
  usage: {
    properties: number;
    users: number;
    agents: number;
  };
  limits: PlanLimits;
}

export interface BillingInvoice {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  pdfUrl?: string;
}

// ============================================================================
// Inmobiliaria Config endpoints — canonical shapes from the backend
// GET /inmobiliaria/config
// GET /inmobiliaria/config/billing
// GET /inmobiliaria/config/billing/invoices
// ============================================================================

/**
 * Agency row as returned by the backend (GET /inmobiliaria/agency and the
 * `agency` key of GET /inmobiliaria/config). Mirrors the Prisma `Agency`
 * model plus the caller's membership (memberRole/memberStatus).
 */
export interface AgencyProfile {
  id: string;
  name: string;
  nit?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  portfolioSize?: string | null;
  yearsInBusiness?: number | null;
  services?: string[] | null;
  razonSocial?: string | null;
  whatsapp?: string | null;
  matriculaInmobiliaria?: string | null;
  registroCamara?: string | null;
  department?: string | null;
  postalCode?: string | null;
  supportEmail?: string | null;
  /** Brand colors — hex '#rrggbb' only — plus optional social media links */
  branding?: {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    socials?: AgencySocials | null;
  } | null;
  defaultCommissionPercent?: number;
  defaultLateFeePercent?: number;
  paymentDueDay?: number;
  disbursementDay?: number;
  /** Stored as Json in the backend — arrays of day offsets */
  reminderDaysBefore?: number[];
  reminderDaysAfter?: number[];
  /** Cobros y mora: motor con reglas de mora (off = % fijo) y días de plazo. */
  motorDeCobrosV2?: boolean;
  diasDePlazo?: number;
  /** Días de mora con saldo a partir de los cuales un cobro pasa a siniestro (sólo con el motor prendido). */
  diasParaSiniestro?: number;
  /** Días de mora a partir de los cuales se avisa que hay que reportar el caso a la aseguradora (antes del siniestro). */
  diasParaAvisoAseguradora?: number;
  /** Dispersión: código en todos los lotes, y umbral COP para segundo aprobador (null = nunca). */
  dispersionExigePin?: boolean;
  dispersionMontoDobleAprobacion?: number | null;
  /** Extracto mensual al propietario: se manda solo cada mes (`extractoMensualDia`, 1..28). */
  extractoMensualAutomatico?: boolean;
  extractoMensualDia?: number;
  /** Renovación automática (Ley 820, arts. 20 y 22): el cron de las 00:20 propone, renueva y sube el canon. */
  renovacionAutomatica?: boolean;
  /** Cómo mide su tasa de recaudo. `null` o ausente = sobre lo causado (por defecto). */
  tasaDeRecaudoSobre?: BaseDeLaTasaDeRecaudo | null;
  /** Penalidad por defecto por terminación anticipada, en cánones (17-09). */
  penalidadTerminacionCanones?: number | null;
  /** IPC vigente en % (0..30). `null` = el IPC de diciembre del año anterior de la tabla de Leasefy. */
  ipcVigente?: number | null;
  /** IPC de diciembre POR AÑO que cargó la inmobiliaria: `{ "2026": 5.3 }`. Para ese año manda sobre `ipcVigente` y la tabla. */
  ipcPorAnio?: Record<string, number>;
  /** Tarifas tributarias (Decimal en el back: viaja como TEXTO; el formulario lo convierte). `reteicaPorMil` y la base mínima: null = no configurada. */
  ivaPorcentaje?: number | string;
  retefuenteArrendamientoPorcentaje?: number | string;
  retefuenteComisionPorcentaje?: number | string;
  reteicaPorMil?: number | string | null;
  reteivaPorcentaje?: number | string;
  baseMinimaRetefuenteCop?: number | null;
  /** Techo legal del interés de mora (% efectivo anual). `null` = sin validar.
   *  Decimal de Prisma: puede llegar como texto — pasar por `decimalANumero`. */
  topeInteresMoraEaPorcentaje?: number | string | null;
  legalRepresentative?: string | null;
  legalDocumentNumber?: string | null;
  /** Caller's membership in this agency */
  memberRole?: 'ADMIN' | 'AGENTE' | 'CONTADOR' | 'VIEWER';
  memberStatus?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Backend includes provisioning fields, _count, etc. we don't model */
  [key: string]: unknown;
}

/**
 * Body for PUT /inmobiliaria/agency (backend UpdateAgencyDto).
 * ONLY these fields are accepted — the backend runs ValidationPipe with
 * `forbidNonWhitelisted: true`, so any extra key is a 400.
 * reminderDaysBefore/After are arrays of day offsets (@IsArray + @IsInt each,
 * 0..30 per element; empty array allowed; scalars rejected).
 */
export interface UpdateAgencyPayload {
  name?: string;
  nit?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  website?: string;
  portfolioSize?: string;
  yearsInBusiness?: number;
  services?: string[];
  razonSocial?: string;
  whatsapp?: string;
  matriculaInmobiliaria?: string;
  registroCamara?: string;
  department?: string;
  postalCode?: string;
  supportEmail?: string;
  /**
   * Brand colors (hex '#rrggbb' only) + social links. The backend deep-merges
   * top-level branding keys, so sending only `{ socials }` preserves the
   * colors. Always send the COMPLETE socials object (all 5 keys) so partial
   * edits don't drop other networks.
   */
  branding?: { primaryColor?: string; secondaryColor?: string; socials?: AgencySocials };
  defaultCommissionPercent?: number;
  defaultLateFeePercent?: number;
  paymentDueDay?: number;
  disbursementDay?: number;
  /** Arrays of day offsets, 0..30 each; empty array allowed (= disabled) */
  reminderDaysBefore?: number[];
  reminderDaysAfter?: number[];
  motorDeCobrosV2?: boolean;
  /** 0..60 */
  diasDePlazo?: number;
  /** 1..365 */
  diasParaSiniestro?: number;
  /** 1..365 */
  diasParaAvisoAseguradora?: number;
  dispersionExigePin?: boolean;
  /** COP entero ≥ 0; `null` = nunca por monto */
  dispersionMontoDobleAprobacion?: number | null;
  extractoMensualAutomatico?: boolean;
  /** 1..28 */
  extractoMensualDia?: number;
  renovacionAutomatica?: boolean;
  /** Cómo mide la inmobiliaria su tasa de recaudo. `null` vuelve al valor por defecto (sobre lo causado). */
  tasaDeRecaudoSobre?: BaseDeLaTasaDeRecaudo | null;
  /** Penalidad por defecto por terminación anticipada, en cánones (17-09). */
  penalidadTerminacionCanones?: number | null;
  /**
   * D4 (17-09): si la inmobiliaria es responsable de IVA. Decide si la comisión
   * de administración lleva IVA (con `ivaPorcentaje`). `null` = no se sabe: sin IVA.
   */
  responsableIva?: boolean | null;
  /** IPC vigente en %, 0..30 con dos decimales. `null` = la tabla del DANE que trae Leasefy. */
  ipcVigente?: number | null;
  /** El mapa ENTERO de IPC por año (reemplaza al guardado): para quitar un año se manda sin él. */
  ipcPorAnio?: Record<string, number>;
  /** Tarifas tributarias, 0..100 (la reteICA es por mil). `null` = no configurada. */
  ivaPorcentaje?: number;
  retefuenteArrendamientoPorcentaje?: number;
  retefuenteComisionPorcentaje?: number;
  reteicaPorMil?: number | null;
  reteivaPorcentaje?: number;
  /** COP entero ≥ 0; `null` = sin mínimo */
  baseMinimaRetefuenteCop?: number | null;
  /** Techo legal del interés de mora (% efectivo anual). `null` = sin validar.
   *  Decimal de Prisma: puede llegar como texto — pasar por `decimalANumero`. */
  topeInteresMoraEaPorcentaje?: number | string | null;
  legalRepresentative?: string;
  legalDocumentNumber?: string;
}

export interface AgencyConfigPermissions {
  canManageBilling: boolean;
  canManageMembers: boolean;
  canManageIntegrations: boolean;
}

export interface AgencyConfigCounts {
  members: number;
  integrations: number;
  integrationsEnabled: number;
}

export interface AgencyConfigOverview {
  agency: AgencyProfile;
  counts: AgencyConfigCounts;
  /** Full subscription detail (null if caller is not admin) */
  subscription: import('../api/subscriptions.types').BackendSubscription | null;
  /** PlanEnforcementService summary (null if caller is not admin) */
  usage: Record<string, unknown> | null;
  permissions: AgencyConfigPermissions;
}

export interface AgencyBillingLimits {
  maxProperties: number; // -1 = unlimited
  maxScoringViews: number; // -1 = unlimited
  hasPremiumScoring: boolean;
  hasApiAccess: boolean;
}

export interface AgencyBillingDetail {
  subscription: import('../api/subscriptions.types').BackendSubscription;
  /** null if autoRenew is false or subscription is cancelled */
  nextCharge: {
    amount: number;
    date: string;
  } | null;
  limits: AgencyBillingLimits;
}

export interface AgencyInvoice {
  id: string;
  amount: number;
  cycle: 'MONTHLY' | 'ANNUAL';
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  pseTransactionId?: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  planName: string;
  planTier: 'STARTER' | 'PRO' | 'FLEX';
}

export interface AgencyInvoicesResponse {
  invoices: AgencyInvoice[];
  total: number;
}

// Helper functions for Integrations & Billing
export function getPlanLabel(plan: BillingPlan): string {
  const labels: Record<BillingPlan, string> = {
    starter: 'Starter',
    professional: 'Profesional',
    enterprise: 'Enterprise',
  };
  return labels[plan];
}

export function getPlanColor(plan: BillingPlan): string {
  const colors: Record<BillingPlan, string> = {
    starter: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    professional: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
    enterprise: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  };
  return colors[plan];
}

export function getIntegrationCategoryLabel(category: IntegrationCategory): string {
  const labels: Record<IntegrationCategory, string> = {
    payments: 'Pagos',
    accounting: 'Contabilidad',
    communications: 'Comunicaciones',
    storage: 'Almacenamiento',
  };
  return labels[category];
}

export function getIntegrationStatusColor(status: IntegrationStatus): string {
  const colors: Record<IntegrationStatus, string> = {
    active: 'bg-success-soft text-success',
    inactive: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    pending: 'bg-warning-soft text-warning',
    error: 'bg-danger-soft text-danger',
  };
  return colors[status];
}

export function getIntegrationStatusLabel(status: IntegrationStatus): string {
  const labels: Record<IntegrationStatus, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'Pendiente',
    error: 'Error',
  };
  return labels[status];
}

// Plan limits configuration
export const PLAN_LIMITS: Record<BillingPlan, PlanLimits> = {
  starter: {
    maxProperties: 20,
    maxUsers: 3,
    maxAgents: 2,
    includesReports: true,
    includesAnalytics: false,
    includesIntegrations: false,
    includesApi: false,
    supportLevel: 'email',
  },
  professional: {
    maxProperties: 100,
    maxUsers: 10,
    maxAgents: 5,
    includesReports: true,
    includesAnalytics: true,
    includesIntegrations: true,
    includesApi: false,
    supportLevel: 'priority',
  },
  enterprise: {
    maxProperties: -1, // unlimited
    maxUsers: -1,
    maxAgents: -1,
    includesReports: true,
    includesAnalytics: true,
    includesIntegrations: true,
    includesApi: true,
    supportLevel: 'dedicated',
  },
};

// ============================================================================
// Configuracion - Users & Permissions
// ============================================================================

export type AgencyRole = 'admin' | 'agente' | 'contador' | 'viewer';

export type PermissionModule =
  | 'dashboard'
  | 'propietarios'
  | 'portafolio'
  | 'pipeline'
  | 'agentes'
  | 'cobros'
  | 'dispersiones'
  | 'operaciones'
  | 'reportes'
  | 'configuracion'
  | 'documentos'
  | 'analytics'
  | 'contratos'
  | 'subscription'
  | 'avaluos';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

export interface RolePermission {
  module: PermissionModule;
  actions: PermissionAction[];
}

export interface RolePermissions {
  role: AgencyRole;
  permissions: RolePermission[];
}

export interface AgencyUser {
  id: string;
  email: string;
  name: string;
  role: AgencyRole;
  avatar?: string;
  phone?: string;
  status: 'active' | 'invited' | 'inactive';
  invitedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface UserInvite {
  email: string;
  name: string;
  role: AgencyRole;
  message?: string;
  // Extended fields used by AgenteFormModal and ConfigUsuarios
  phone?: string;
  zone?: string;
  specialization?: 'RESIDENTIAL' | 'COMMERCIAL' | 'BOTH';
  commissionSplit?: number;
  agentRole?: 'AGENT' | 'COORDINATOR' | 'DIRECTOR';
  position?: string;
}

// Helper functions for users/roles
// Neutral fallback color (a valid "bg-… text-…" pair so callers that
// `.split(' ')` the class string never crash on an unknown/undefined role).
const NEUTRAL_BADGE_COLOR =
  'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';

export function getRoleLabel(role: AgencyRole | null | undefined): string {
  const labels: Record<AgencyRole, string> = {
    admin: 'Administrador',
    agente: 'Agente',
    contador: 'Contador',
    viewer: 'Solo Lectura',
  };
  // Unknown/undefined role (e.g. an invited member with incomplete data) → '—'.
  return (role && labels[role]) || '—';
}

export function getRoleColor(role: AgencyRole | null | undefined): string {
  const colors: Record<AgencyRole, string> = {
    admin: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
    agente: 'bg-primary-soft text-primary',
    contador: 'bg-success-soft text-success',
    viewer: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400',
  };
  // Always a valid color-class string, even for an unknown/undefined role.
  return (role && colors[role]) || NEUTRAL_BADGE_COLOR;
}

export function getUserStatusColor(status: AgencyUser['status'] | null | undefined): string {
  const colors = {
    active: 'bg-success-soft text-success',
    invited: 'bg-warning-soft text-warning',
    inactive: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400',
  };
  return (status && colors[status]) || NEUTRAL_BADGE_COLOR;
}

export function getUserStatusLabel(status: AgencyUser['status'] | null | undefined): string {
  const labels = {
    active: 'Activo',
    invited: 'Invitado',
    inactive: 'Inactivo',
  };
  return (status && labels[status]) || '—';
}

export function getModuleLabel(module: PermissionModule): string {
  const labels: Record<PermissionModule, string> = {
    dashboard: 'Dashboard',
    propietarios: 'Propietarios',
    portafolio: 'Portafolio',
    pipeline: 'Pipeline',
    agentes: 'Agentes',
    cobros: 'Cobros',
    dispersiones: 'Dispersiones',
    operaciones: 'Operaciones',
    reportes: 'Reportes',
    configuracion: 'Configuracion',
    documentos: 'Documentos',
    analytics: 'Analitica',
    contratos: 'Contratos',
    subscription: 'Suscripción',
    avaluos: 'Avalúos',
  };
  return labels[module];
}

export function getActionLabel(action: PermissionAction): string {
  const labels: Record<PermissionAction, string> = {
    view: 'Ver',
    create: 'Crear',
    edit: 'Editar',
    delete: 'Eliminar',
    export: 'Exportar',
  };
  return labels[action];
}

// Default permissions by role
export const DEFAULT_ROLE_PERMISSIONS: Record<AgencyRole, RolePermissions> = {
  admin: {
    role: 'admin',
    permissions: [
      { module: 'dashboard', actions: ['view'] },
      { module: 'propietarios', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'portafolio', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'pipeline', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'agentes', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'cobros', actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { module: 'dispersiones', actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { module: 'operaciones', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'reportes', actions: ['view', 'export'] },
      { module: 'configuracion', actions: ['view', 'edit'] },
      { module: 'documentos', actions: ['view', 'create', 'edit', 'delete'] },
      { module: 'analytics', actions: ['view', 'export'] },
      { module: 'subscription', actions: ['view', 'edit'] },
      { module: 'avaluos', actions: ['view', 'create', 'edit', 'delete', 'export'] },
    ],
  },
  agente: {
    role: 'agente',
    permissions: [
      { module: 'dashboard', actions: ['view'] },
      { module: 'propietarios', actions: ['view'] },
      { module: 'portafolio', actions: ['view', 'edit'] },
      { module: 'pipeline', actions: ['view', 'create', 'edit'] },
      { module: 'agentes', actions: ['view'] },
      { module: 'cobros', actions: ['view'] },
      { module: 'operaciones', actions: ['view', 'edit'] },
      { module: 'documentos', actions: ['view'] },
      { module: 'avaluos', actions: ['view', 'create'] },
    ],
  },
  contador: {
    role: 'contador',
    permissions: [
      { module: 'dashboard', actions: ['view'] },
      { module: 'propietarios', actions: ['view'] },
      { module: 'cobros', actions: ['view', 'create', 'edit', 'export'] },
      { module: 'dispersiones', actions: ['view', 'create', 'edit', 'export'] },
      { module: 'reportes', actions: ['view', 'export'] },
      { module: 'analytics', actions: ['view', 'export'] },
      { module: 'subscription', actions: ['view'] },
    ],
  },
  viewer: {
    role: 'viewer',
    permissions: [
      { module: 'dashboard', actions: ['view'] },
      { module: 'propietarios', actions: ['view'] },
      { module: 'portafolio', actions: ['view'] },
      { module: 'cobros', actions: ['view'] },
      { module: 'reportes', actions: ['view'] },
    ],
  },
};

// All modules for permission matrix
export const ALL_PERMISSION_MODULES: PermissionModule[] = [
  'dashboard',
  'propietarios',
  'portafolio',
  'pipeline',
  'agentes',
  'cobros',
  'dispersiones',
  'operaciones',
  'reportes',
  'configuracion',
  'documentos',
  'analytics',
  'contratos',
  'subscription',
  'avaluos',
];

// All actions for permission matrix
export const ALL_PERMISSION_ACTIONS: PermissionAction[] = [
  'view',
  'create',
  'edit',
  'delete',
  'export',
];

// ============================================================================
// Documentos - Templates & Documents
// ============================================================================

export type DocumentCategory =
  | 'contrato'
  | 'acta'
  | 'inventario'
  | 'poliza'
  | 'carta'
  | 'otro';

export type DocumentStatus =
  | 'draft'
  | 'pending_signature'
  | 'signed'
  | 'expired'
  | 'cancelled';

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: DocumentCategory;
  icon: string;
  version: string;
  lastUpdated: string;
  usageCount: number;
  isDefault: boolean;
  previewUrl?: string;
  variables: string[];  // e.g., ['{{tenant_name}}', '{{property_address}}']
}

export interface PropertyDocument {
  id: string;
  templateId?: string;
  propertyId: string;
  propertyTitle: string;
  consignacionId?: string;
  tenantId?: string;
  tenantName?: string;
  propietarioId: string;
  propietarioName: string;

  name: string;
  category: DocumentCategory;
  status: DocumentStatus;

  fileUrl?: string;
  fileSize?: number;        // in bytes
  mimeType?: string;

  signatures?: {
    signerName: string;
    signerEmail: string;
    signedAt?: string;
    status: 'pending' | 'signed' | 'rejected';
  }[];

  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface DocumentGenerateRequest {
  templateId: string;
  propertyId: string;
  consignacionId?: string;
  tenantId?: string;
  variables: Record<string, string>;
}

// Helper functions for documents
export function getDocumentCategoryLabel(category: DocumentCategory): string {
  const labels: Record<DocumentCategory, string> = {
    contrato: 'Contrato',
    acta: 'Acta',
    inventario: 'Inventario',
    poliza: 'Poliza',
    carta: 'Carta',
    otro: 'Otro',
  };
  return labels[category];
}

export function getDocumentCategoryColor(category: DocumentCategory): string {
  const colors: Record<DocumentCategory, string> = {
    contrato: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
    acta: 'bg-success-soft text-success',
    inventario: 'bg-warning-soft text-warning',
    poliza: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
    carta: 'bg-primary-soft text-primary',
    otro: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400',
  };
  return colors[category];
}

export function getDocumentStatusLabel(status: DocumentStatus): string {
  const labels: Record<DocumentStatus, string> = {
    draft: 'Borrador',
    pending_signature: 'Pendiente Firma',
    signed: 'Firmado',
    expired: 'Vencido',
    cancelled: 'Cancelado',
  };
  return labels[status];
}

export function getDocumentStatusColor(status: DocumentStatus): string {
  const colors: Record<DocumentStatus, string> = {
    draft: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400',
    pending_signature: 'bg-warning-soft text-warning',
    signed: 'bg-success-soft text-success',
    expired: 'bg-danger-soft text-danger',
    cancelled: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400',
  };
  return colors[status];
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ============================================================================
// Onboarding Step (Checklist)
// ============================================================================

export interface OnboardingStep {
  key: string;
  label: string;
  completed: boolean;
  action?: {
    label: string;
    href: string;
  };
}

// ============================================================================
// Agency Member (extended AgencyUser with agency-level role info)
// ============================================================================

export interface AgencyMember extends AgencyUser {
  agencyRole?: string;
  joinedAt?: string;
  permissions?: Record<string, string[]> | null;
}

/**
 * Response of the invite (POST /inmobiliaria/agency/members) and resend
 * (POST .../:memberId/resend-invitation) endpoints: the created/updated
 * member row with an `emailDelivered` flag merged on top.
 * `emailDelivered === false` = the row persists but the email failed to send
 * (partial success — surface a warning, offer resend). Additive: existing
 * member-field reads are unaffected.
 */
export interface AgencyInviteResult extends AgencyMember {
  emailDelivered: boolean;
  /**
   * Por qué no salió, no sólo que no salió.
   *
   * `not_configured` = el servidor no tiene SMTP. Reintentar manda por el mismo
   * camino y no puede funcionar nunca, así que ofrecer «Reenviar invitación»
   * ahí es un consejo falso. `failed` = sí hay correo configurado y este envío
   * falló; ahí reintentar sí tiene sentido.
   *
   * Opcional: un backend viejo no lo manda, y en ese caso se cae al mensaje
   * genérico en vez de romper.
   */
  emailStatus?: 'sent' | 'not_configured' | 'failed';
  /**
   * El token de la invitación, para armar el enlace cuando el correo no salió.
   *
   * Estos dos endpoints devuelven la fila cruda de `agency_members` (no pasan
   * por un DTO), así que viene siempre. Verificado contra la respuesta real de
   * `POST /inmobiliaria/agency/members`. Opcional en el tipo porque el día que
   * el backend recorte la respuesta, esto se apaga solo en vez de romper.
   */
  invitationToken?: string;
}

// ============================================================================
// Agency Onboarding Status (backend response)
// ============================================================================

export interface AgencyOnboardingStatus {
  isComplete: boolean;
  completionPercent: number;
  steps: OnboardingStep[];
}

// ============================================================================
// Invitation Info (public invitation details for /invitacion/[token])
// ============================================================================

export interface InvitationInfo {
  token: string;
  email: string;
  name?: string;
  role: AgencyRole;
  agencyName?: string;
  agencyCity?: string;
  invitedBy?: string;
  invitedEmail?: string;
  expiresAt?: string;
}

// ============================================================================
// Rendimiento Agentes Report
// ============================================================================

export interface RendimientoAgente {
  userId: string;
  agenteName?: string;
  activeLeads: number;
  completedDeals: number;
  conversionRate: number;
  avgDaysToClose: number;
}

export interface RendimientoAgentesReport {
  generatedAt: string;
  period?: string;
  agentes: RendimientoAgente[];
}


// Helper to check if role has permission
export function hasPermission(
  permissions: RolePermissions,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  const modulePermission = permissions.permissions.find((p) => p.module === module);
  if (!modulePermission) return false;
  return modulePermission.actions.includes(action);
}

// Helper to clone and update permissions
export function updateRolePermission(
  permissions: RolePermissions,
  module: PermissionModule,
  action: PermissionAction,
  enabled: boolean
): RolePermissions {
  const newPermissions = { ...permissions };
  const moduleIndex = newPermissions.permissions.findIndex((p) => p.module === module);

  if (moduleIndex === -1) {
    if (enabled) {
      newPermissions.permissions = [
        ...newPermissions.permissions,
        { module, actions: [action] },
      ];
    }
  } else {
    const currentActions = newPermissions.permissions[moduleIndex].actions;
    if (enabled && !currentActions.includes(action)) {
      newPermissions.permissions[moduleIndex] = {
        ...newPermissions.permissions[moduleIndex],
        actions: [...currentActions, action],
      };
    } else if (!enabled && currentActions.includes(action)) {
      const newActions = currentActions.filter((a) => a !== action);
      if (newActions.length === 0) {
        newPermissions.permissions = newPermissions.permissions.filter((_, i) => i !== moduleIndex);
      } else {
        newPermissions.permissions[moduleIndex] = {
          ...newPermissions.permissions[moduleIndex],
          actions: newActions,
        };
      }
    }
  }

  return newPermissions;
}

// ============================================================================
// Documentos - Actas de Entrega
// ============================================================================

export type ActaType = 'entrega' | 'devolucion';

export type ItemCondition = 'excelente' | 'bueno' | 'regular' | 'malo' | 'no_aplica';

export type RoomType =
  | 'sala'
  | 'comedor'
  | 'cocina'
  | 'habitacion_principal'
  | 'habitacion_2'
  | 'habitacion_3'
  | 'bano_principal'
  | 'bano_2'
  | 'estudio'
  | 'balcon'
  | 'terraza'
  | 'garaje'
  | 'cuarto_util'
  | 'otro';

export interface ActaInventoryItem {
  id: string;
  room: RoomType;
  name: string;
  description?: string;
  quantity: number;
  condition: ItemCondition;
  conditionNotes?: string;
  photos?: string[];        // Base64 or URLs
  hasDefects: boolean;
  defectDescription?: string;
}

export interface MeterReading {
  type: 'agua' | 'luz' | 'gas';
  reading: string;
  unit: string;
  photoUrl?: string;
}

export interface KeyDelivered {
  type: string;         // "Llave principal", "Control garaje", etc.
  quantity: number;
  notes?: string;
}

export interface ActaSignature {
  party: 'tenant' | 'owner' | 'agent';
  name: string;
  cedula: string;
  signatureData?: string;  // Base64 signature image
  signedAt?: string;
  ipAddress?: string;
}

export interface ActaDeduction {
  concept: string;
  amount: number;
  notes?: string;
}

export interface ActaEntrega {
  id: string;
  type: ActaType;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  consignacionId: string;
  leaseId: string;

  // Parties
  tenantId: string;
  tenantName: string;
  tenantCedula: string;
  tenantPhone: string;
  tenantEmail: string;
  propietarioId: string;
  propietarioName: string;
  agenteId: string;
  agenteName: string;

  // Delivery info
  deliveryDate: string;
  deliveryTime?: string;

  // Inventory
  rooms: RoomType[];
  items: ActaInventoryItem[];

  // Meters
  meterReadings: MeterReading[];

  // Keys
  keysDelivered: KeyDelivered[];

  // General observations
  generalCondition: ItemCondition;
  generalObservations?: string;

  // Signatures
  signatures: ActaSignature[];

  // For devolucion type
  depositAmount?: number;
  deductions?: ActaDeduction[];
  depositToReturn?: number;

  status: 'draft' | 'in_progress' | 'pending_signatures' | 'completed';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  pdfUrl?: string;
}

// Helper functions for Acta de Entrega
export function getRoomLabel(room: RoomType): string {
  const labels: Record<RoomType, string> = {
    sala: 'Sala',
    comedor: 'Comedor',
    cocina: 'Cocina',
    habitacion_principal: 'Habitacion Principal',
    habitacion_2: 'Habitacion 2',
    habitacion_3: 'Habitacion 3',
    bano_principal: 'Bano Principal',
    bano_2: 'Bano 2',
    estudio: 'Estudio',
    balcon: 'Balcon',
    terraza: 'Terraza',
    garaje: 'Garaje',
    cuarto_util: 'Cuarto Util',
    otro: 'Otro',
  };
  return labels[room];
}

export function getConditionLabel(condition: ItemCondition): string {
  const labels: Record<ItemCondition, string> = {
    excelente: 'Excelente',
    bueno: 'Bueno',
    regular: 'Regular',
    malo: 'Malo',
    no_aplica: 'No Aplica',
  };
  return labels[condition];
}

export function getConditionColor(condition: ItemCondition): string {
  const colors: Record<ItemCondition, string> = {
    excelente: 'bg-success-soft text-success',
    bueno: 'bg-success-soft text-success',
    regular: 'bg-warning-soft text-warning',
    malo: 'bg-danger-soft text-danger',
    no_aplica: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400',
  };
  return colors[condition];
}

export function getActaTypeLabel(type: ActaType): string {
  return type === 'entrega' ? 'Acta de Entrega' : 'Acta de Devolucion';
}

export function getActaStatusLabel(status: ActaEntrega['status']): string {
  const labels: Record<ActaEntrega['status'], string> = {
    draft: 'Borrador',
    in_progress: 'En Progreso',
    pending_signatures: 'Pendiente Firmas',
    completed: 'Completado',
  };
  return labels[status];
}

export function getActaStatusColor(status: ActaEntrega['status']): string {
  const colors: Record<ActaEntrega['status'], string> = {
    draft: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400',
    in_progress: 'bg-primary-soft text-primary',
    pending_signatures: 'bg-warning-soft text-warning',
    completed: 'bg-success-soft text-success',
  };
  return colors[status];
}

// Default rooms for a typical apartment
export const DEFAULT_ROOMS: RoomType[] = [
  'sala',
  'comedor',
  'cocina',
  'habitacion_principal',
  'bano_principal',
];

// All available room types
export const ALL_ROOM_TYPES: RoomType[] = [
  'sala',
  'comedor',
  'cocina',
  'habitacion_principal',
  'habitacion_2',
  'habitacion_3',
  'bano_principal',
  'bano_2',
  'estudio',
  'balcon',
  'terraza',
  'garaje',
  'cuarto_util',
  'otro',
];

// Common inventory items per room
export const COMMON_ITEMS_BY_ROOM: Record<RoomType, string[]> = {
  sala: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Puertas', 'Tomas electricos', 'Interruptores'],
  comedor: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Lampara'],
  cocina: ['Piso', 'Paredes', 'Meson', 'Lavaplatos', 'Estufa', 'Horno', 'Campana extractora', 'Gabinetes', 'Grifo'],
  habitacion_principal: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Closet', 'Puertas', 'Tomas electricos'],
  habitacion_2: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Closet', 'Puertas'],
  habitacion_3: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Closet', 'Puertas'],
  bano_principal: ['Piso', 'Paredes', 'Sanitario', 'Lavamanos', 'Ducha', 'Grifo', 'Espejo', 'Gabinete'],
  bano_2: ['Piso', 'Paredes', 'Sanitario', 'Lavamanos', 'Ducha', 'Grifo'],
  estudio: ['Piso', 'Paredes', 'Techo', 'Ventanas', 'Tomas electricos'],
  balcon: ['Piso', 'Barandas', 'Techo'],
  terraza: ['Piso', 'Barandas', 'Drenaje'],
  garaje: ['Piso', 'Paredes', 'Puerta', 'Iluminacion'],
  cuarto_util: ['Piso', 'Paredes', 'Conexiones lavadora', 'Lavadero'],
  otro: ['Piso', 'Paredes', 'Techo'],
};

// All item conditions
export const ALL_ITEM_CONDITIONS: ItemCondition[] = [
  'excelente',
  'bueno',
  'regular',
  'malo',
  'no_aplica',
];

// ============================================================================
// Analytics - Trends & Forecasting
// ============================================================================

export type TrendDirection = 'up' | 'down' | 'stable';
export type ComparisonPeriod = 'previous_period' | 'previous_year' | 'custom';

export interface PeriodComparison {
  current: {
    label: string;
    startDate: string;
    endDate: string;
    value: number;
  };
  previous: {
    label: string;
    startDate: string;
    endDate: string;
    value: number;
  };
  change: {
    absolute: number;
    percentage: number;
    direction: TrendDirection;
  };
}

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
  isProjected?: boolean;
}

export interface SeasonalPattern {
  month: number;
  monthName: string;
  averageValue: number;
  deviation: number;
  isHighSeason: boolean;
  notes?: string;
}

export interface TrendAnomaly {
  date: string;
  value: number;
  expectedValue: number;
  deviationPercent: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface TrendAnalysis {
  metricId: string;
  metricLabel: string;
  data: TrendDataPoint[];
  comparison: PeriodComparison;
  seasonalPatterns: SeasonalPattern[];
  anomalies: TrendAnomaly[];
  trendLine: {
    slope: number;
    direction: TrendDirection;
    confidence: number;
  };
  insights: string[];
}

export interface ForecastDataPoint {
  date: string;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface ForecastScenario {
  id: string;
  name: string;
  description: string;
  assumptions: string[];
  data: ForecastDataPoint[];
  probability: number;
}

export interface ForecastData {
  metricId: string;
  metricLabel: string;
  unit: string;
  historical: TrendDataPoint[];
  baseline: ForecastDataPoint[];
  scenarios: ForecastScenario[];
  factors: {
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }[];
  lastUpdated: string;
}

// Helper functions for trends & forecasting
export function getAnomalySeverityColor(severity: TrendAnomaly['severity']): string {
  const colors = {
    low: 'bg-warning-soft text-warning',
    medium: 'bg-danger-soft text-danger',
    high: 'bg-danger-soft text-danger',
  };
  return colors[severity];
}

export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(0)}% confianza`;
}

export function getSeasonColor(isHighSeason: boolean): string {
  return isHighSeason
    ? 'bg-success-soft text-success'
    : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400';
}

export function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month - 1] || '';
}

export function getTrendDirectionColor(direction: TrendDirection): string {
  const colors = {
    up: 'text-success',
    down: 'text-danger',
    stable: 'text-neutral-600 dark:text-neutral-400',
  };
  return colors[direction];
}

export function getImpactColor(impact: 'positive' | 'negative' | 'neutral'): string {
  const colors = {
    positive: 'text-success',
    negative: 'text-danger',
    neutral: 'text-neutral-600 dark:text-neutral-400',
  };
  return colors[impact];
}

export function getScenarioColor(id: string): string {
  const colors: Record<string, string> = {
    optimistic: 'bg-success',
    conservative: 'bg-primary',
    pessimistic: 'bg-danger',
    baseline: 'bg-neutral-500 dark:bg-neutral-400',
  };
  return colors[id] || colors.baseline;
}

// ============================================================================
// Analytics - Advanced KPIs & Dashboard
// ============================================================================

export type AnalyticsPeriod = 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface TrendData {
  direction: TrendDirection;
  percentage: number;
  previousValue: number;
  currentValue: number;
}

export interface SparklinePoint {
  date: string;
  value: number;
}

export interface AdvancedKPI {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  unit?: string;
  /**
   * La variación contra el período anterior. OPCIONAL a propósito: si no hay
   * un período anterior con qué comparar, no hay tendencia — y una tarjeta que
   * pinta «+0,0 %» con una flecha está afirmando una medición que nadie hizo.
   * Sin `trend`, la tarjeta no dibuja la insignia.
   */
  trend?: TrendData;
  sparkline: SparklinePoint[];
  target?: number;
  targetLabel?: string;
  category: 'financial' | 'operational' | 'performance';
  description?: string;
}

export interface TimeSeriesData {
  date: string;
  [key: string]: string | number;
}

export interface ChartDataset {
  label: string;
  data: number[];
  color: string;
  type?: 'line' | 'bar' | 'area';
}

export interface AnalyticsChart {
  id: string;
  title: string;
  description?: string;
  type: 'line' | 'bar' | 'area' | 'pie' | 'donut';
  labels: string[];
  datasets: ChartDataset[];
  period: AnalyticsPeriod;
}

export interface AnalyticsFilters {
  period: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  propertyType?: string;
  zone?: string;
  agentId?: string;
}

export interface AnalyticsData {
  kpis: AdvancedKPI[];
  charts: AnalyticsChart[];
  lastUpdated: string;
}

// Analytics helper functions
export function getTrendColor(direction: TrendDirection, isPositiveGood: boolean = true): string {
  if (direction === 'stable') return 'text-neutral-500 dark:text-neutral-400';
  const isGood = isPositiveGood ? direction === 'up' : direction === 'down';
  return isGood ? 'text-success' : 'text-danger';
}

export function getTrendBgColor(direction: TrendDirection, isPositiveGood: boolean = true): string {
  if (direction === 'stable') return 'bg-neutral-100 dark:bg-neutral-800';
  const isGood = isPositiveGood ? direction === 'up' : direction === 'down';
  return isGood ? 'bg-success-soft' : 'bg-danger-soft';
}

export function getTrendIcon(direction: TrendDirection): string {
  const icons = {
    up: 'TrendUp',
    down: 'TrendDown',
    stable: 'Minus',
  };
  return icons[direction];
}

export function formatPercentageChange(percentage: number): string {
  const prefix = percentage > 0 ? '+' : '';
  return `${prefix}${percentage.toFixed(1)}%`;
}

export function getCategoryColor(category: AdvancedKPI['category']): string {
  const colors = {
    financial: 'bg-white border-neutral-200 dark:bg-[#1a1a1c] dark:border-neutral-800',
    operational: 'bg-white border-neutral-200 dark:bg-[#1a1a1c] dark:border-neutral-800',
    performance: 'bg-white border-neutral-200 dark:bg-[#1a1a1c] dark:border-neutral-800',
  };
  return colors[category];
}

export function getCategoryIconColor(category: AdvancedKPI['category']): string {
  const colors = {
    financial: 'text-primary',
    operational: 'text-primary',
    performance: 'text-primary',
  };
  return colors[category];
}

export function getCategoryBgColor(category: AdvancedKPI['category']): string {
  const colors = {
    financial: 'bg-neutral-100 dark:bg-neutral-800',
    operational: 'bg-neutral-100 dark:bg-neutral-800',
    performance: 'bg-neutral-100 dark:bg-neutral-800',
  };
  return colors[category];
}

export function getCategoryLabel(category: AdvancedKPI['category']): string {
  const labels = {
    financial: 'Financiero',
    operational: 'Operacional',
    performance: 'Rendimiento',
  };
  return labels[category];
}

export function getPeriodLabel(period: AnalyticsPeriod): string {
  const labels: Record<AnalyticsPeriod, string> = {
    week: 'Semana',
    month: 'Mes',
    quarter: 'Trimestre',
    year: 'Ano',
    custom: 'Personalizado',
  };
  return labels[period];
}
