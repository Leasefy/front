# Backend Integration Guide

**Last Updated:** 2026-02-07
**Frontend Status:** Complete (MVP Ready)
**Backend Status:** Pending Development
**Version:** 2.0

Este documento proporciona el contrato completo de API y modelos de datos necesarios para integrar el backend con el frontend existente.

---

## Tabla de Contenidos

1. [Resumen del Sistema](#resumen-del-sistema)
2. [Autenticación](#autenticación)
3. [Endpoints API](#endpoints-api)
4. [Modelos de Datos](#modelos-de-datos)
5. [Lógica de Negocio](#lógica-de-negocio)
6. [Flujos del Frontend](#flujos-del-frontend)
7. [Configuraciones Colombianas](#configuraciones-colombianas)

---

## Resumen del Sistema

### Stack Tecnológico (Frontend)
- **Framework:** Next.js 14 (App Router)
- **UI:** React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Estado:** React Context + localStorage (persistencia mock)
- **Mapas:** Mapbox GL + react-map-gl
- **Animaciones:** Framer Motion
- **Iconos:** Phosphor Icons
- **i18n:** Soporte ES/EN

### Lo que Backend Necesita Proveer
1. **REST API** en `/api/v1/`
2. **Autenticación** (email OTP + OAuth Google/Apple)
3. **Base de Datos** (PostgreSQL recomendado)
4. **Almacenamiento** (S3 o similar para imágenes y documentos)
5. **Motor de Scoring** (algoritmo de riesgo AI)
6. **Sistema de Notificaciones** (web + email + push)
7. **Procesador de Pagos** (PSE, tarjetas, Nequi, Daviplata)

### Entidades Principales

| Entidad | Descripción | Relaciones |
|---------|-------------|------------|
| User | Usuarios del sistema | 1:M Properties, 1:M Applications |
| Property | Propiedades en arriendo | 1:M Applications, 1:M Visits |
| Application | Solicitudes de arriendo | 1:1 Candidate, 1:1 Contract |
| Candidate | Vista propietario de aplicante | 1:1 RiskScore |
| Contract | Contratos de arriendo | 1:1 Lease |
| Lease | Arriendos activos | 1:M Payments |
| Payment | Pagos de arriendo | - |
| Visit | Visitas programadas | - |
| Notification | Notificaciones | - |
| Subscription | Suscripciones a planes | 1:1 User |
| PaymentAccount | Cuentas bancarias/billeteras | M:M Properties |
| TeamMember | Miembros de equipo | M:1 User |

---

## Autenticación

### Email Magic Link (OTP)

```
POST /api/v1/auth/send-otp
Body: { email: string }
Response: { success: true, message: string }

POST /api/v1/auth/verify-otp
Body: { email: string, code: string }
Response: {
  token: string,
  user: User,
  expiresAt: string
}

POST /api/v1/auth/logout
Headers: Authorization: Bearer <token>
Response: { success: true }

GET /api/v1/auth/me
Headers: Authorization: Bearer <token>
Response: User
```

### OAuth Social Login

```
POST /api/v1/auth/google
Body: { idToken: string }
Response: { token: string, user: User, isNewUser: boolean }

POST /api/v1/auth/apple
Body: { identityToken: string, authorizationCode: string }
Response: { token: string, user: User, isNewUser: boolean }
```

### Roles de Usuario
- `tenant` - Puede aplicar a propiedades, ver aplicaciones, gestionar arriendos
- `landlord` - Puede publicar propiedades, revisar candidatos, gestionar contratos

---

## Endpoints API

### 1. Usuarios y Onboarding

```
GET /api/v1/users/me
Response: User

PUT /api/v1/users/me
Body: Partial<User>
Response: User

GET /api/v1/users/me/onboarding
Response: {
  status: 'not_started' | 'in_progress' | 'completed',
  currentStep: number,
  totalSteps: number,
  data: OnboardingData
}

PUT /api/v1/users/me/onboarding
Body: {
  step: number,
  data: Partial<OnboardingData>
}
Response: { success: true, nextStep: number }

POST /api/v1/users/me/onboarding/complete
Response: { success: true }
```

### 2. Propiedades

```
# Listado público
GET /api/v1/properties
Query: city?, neighborhood?, minPrice?, maxPrice?, bedrooms?, type?, amenities?, limit?, offset?
Response: {
  properties: Property[],
  total: number,
  hasMore: boolean
}

# Detalle público
GET /api/v1/properties/:id
Response: Property

# Propiedades del propietario
GET /api/v1/landlord/properties
Response: {
  properties: LandlordProperty[],
  summary: DashboardSummary
}

# Publicar propiedad
POST /api/v1/properties
Body: CreatePropertyDTO
Response: Property

# Actualizar propiedad
PUT /api/v1/properties/:id
Body: UpdatePropertyDTO
Response: Property

# Eliminar propiedad
DELETE /api/v1/properties/:id
Response: { success: true }

# Subir imágenes
POST /api/v1/properties/:id/images
Body: FormData
Response: { urls: string[] }

# Disponibilidad para visitas
GET /api/v1/properties/:id/availability
Response: AvailabilitySchedule

PUT /api/v1/properties/:id/availability
Body: AvailabilitySchedule
Response: { success: true }

# Requisitos de inquilino
GET /api/v1/properties/:id/tenant-requirements
Response: TenantRequirements

PUT /api/v1/properties/:id/tenant-requirements
Body: TenantRequirements
Response: { success: true }
```

### 3. Aplicaciones (Inquilino)

```
# Listar mis aplicaciones
GET /api/v1/applications
Query: status?, page?, limit?
Response: {
  applications: TenantApplication[],
  total: number
}

# Detalle de aplicación
GET /api/v1/applications/:id
Response: TenantApplication

# Crear borrador de aplicación
POST /api/v1/applications
Body: { propertyId: string }
Response: { id: string, status: 'draft' }

# Guardar progreso
PUT /api/v1/applications/:id
Body: {
  step: number,
  data: Partial<ApplicationData>
}
Response: { success: true }

# Enviar aplicación
POST /api/v1/applications/:id/submit
Response: {
  success: true,
  trackingCode: string
}

# Retirar aplicación
POST /api/v1/applications/:id/withdraw
Response: { success: true }

# Subir documentos
POST /api/v1/applications/:id/documents
Body: FormData (file, type)
Response: { url: string, verified: boolean }
```

### 4. Candidatos (Propietario)

```
# Listar candidatos
GET /api/v1/candidates
Query: propertyId?, status?, riskLevel?, sortBy?, page?, limit?
Response: {
  candidates: LandlordCandidate[],
  total: number,
  stats: {
    total: number,
    pending: number,
    approved: number,
    rejected: number
  }
}

# Detalle de candidato
GET /api/v1/candidates/:id
Response: LandlordCandidate

# Obtener score de riesgo
GET /api/v1/candidates/:id/risk-score
Response: RiskScore

# Tomar decisión
POST /api/v1/candidates/:id/decision
Body: {
  decision: 'pre-approved' | 'approved' | 'rejected' | 'more-info',
  notes?: string,
  conditions?: string[]
}
Response: LandlordCandidate

# Agregar nota
POST /api/v1/candidates/:id/notes
Body: { content: string }
Response: { id: string, createdAt: string }

# Obtener notas
GET /api/v1/candidates/:id/notes
Response: Note[]
```

### 5. Visitas

```
# Listar visitas (propietario)
GET /api/v1/visits
Query: propertyId?, status?, dateFrom?, dateTo?, page?, limit?
Response: {
  visits: Visit[],
  total: number
}

# Solicitar visita (inquilino)
POST /api/v1/visits
Body: {
  propertyId: string,
  requestedDate: string,
  requestedTime: string,
  message?: string
}
Response: Visit

# Confirmar visita
PUT /api/v1/visits/:id/confirm
Body: {
  confirmedDate: string,
  confirmedTime: string,
  notes?: string
}
Response: Visit

# Cancelar visita
PUT /api/v1/visits/:id/cancel
Body: { reason: string }
Response: Visit

# Reprogramar visita
PUT /api/v1/visits/:id/reschedule
Body: {
  newDate: string,
  newTime: string,
  reason?: string
}
Response: Visit

# Marcar como completada
PUT /api/v1/visits/:id/complete
Body: { notes?: string }
Response: Visit

# Marcar como no-show
PUT /api/v1/visits/:id/no-show
Response: Visit
```

### 6. Contratos

```
# Obtener plantillas
GET /api/v1/contracts/templates
Response: ContractTemplate[]

# Crear contrato
POST /api/v1/contracts
Body: {
  candidateId: string,
  templateId: string,
  terms: {
    startDate: string,
    endDate: string,
    monthlyRent: number,
    adminFee: number,
    paymentDueDay: number,
    guaranteeType: 'poliza' | 'codeudor'
  },
  insuranceId?: string,
  customClauses?: ContractClause[]
}
Response: Contract

# Obtener contrato
GET /api/v1/contracts/:id
Response: Contract

# Enviar para firma
POST /api/v1/contracts/:id/send
Body: { signerId: 'landlord' | 'tenant' }
Response: { success: true }

# Enviar OTP para firma
POST /api/v1/contracts/:id/sign/send-otp
Body: { signerId: string }
Response: { success: true }

# Verificar OTP y firmar
POST /api/v1/contracts/:id/sign
Body: {
  signerId: string,
  otp: string,
  signature: string,
  acceptedClauses: string[],
  ipAddress: string,
  userAgent: string
}
Response: Contract

# Obtener audit trail
GET /api/v1/contracts/:id/audit-trail
Response: AuditEntry[]

# Generar PDF
GET /api/v1/contracts/:id/pdf
Response: { url: string }
```

### 7. Arriendos (Leases)

```
# Listar arriendos
GET /api/v1/leases
Query: status?, role? ('landlord' | 'tenant'), page?, limit?
Response: {
  leases: Lease[],
  stats: LeaseSummaryStats
}

# Detalle de arriendo
GET /api/v1/leases/:id
Response: Lease

# Historial de pagos
GET /api/v1/leases/:id/payments
Query: status?, year?, month?, page?, limit?
Response: {
  payments: Payment[],
  total: number
}

# Registrar pago (propietario)
POST /api/v1/leases/:id/payments
Body: {
  amount: number,
  concept: 'rent' | 'admin_fee' | 'late_fee' | 'repair',
  method: PaymentMethod,
  reference?: string,
  notes?: string
}
Response: Payment

# Iniciar renovación
POST /api/v1/leases/:id/renew
Body: {
  newEndDate: string,
  newRent?: number,
  terms?: string
}
Response: { renewalId: string }

# Terminar anticipadamente
POST /api/v1/leases/:id/terminate
Body: {
  reason: string,
  effectiveDate: string
}
Response: { success: true }
```

### 8. Pagos

```
# Procesar pago (inquilino)
POST /api/v1/payments/process
Body: {
  leaseId: string,
  amount: number,
  method: 'pse' | 'credit_card' | 'debit_card' | 'nequi' | 'daviplata',
  bankCode?: string
}
Response: {
  paymentId: string,
  redirectUrl?: string,
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

# Confirmar pago (webhook)
POST /api/v1/payments/webhook
Body: PaymentWebhookPayload
Response: { received: true }

# Enviar recordatorio
POST /api/v1/payments/:id/reminder
Response: { success: true }

# Descargar recibo
GET /api/v1/payments/:id/receipt
Response: { url: string }
```

### 9. Notificaciones

```
# Listar notificaciones
GET /api/v1/notifications
Query: category?, read?, page?, limit?
Response: {
  notifications: Notification[],
  unreadCount: number
}

# Marcar como leída
PUT /api/v1/notifications/:id/read
Response: { success: true }

# Marcar todas como leídas
PUT /api/v1/notifications/read-all
Response: { count: number }

# Eliminar notificación
DELETE /api/v1/notifications/:id
Response: { success: true }

# Obtener preferencias
GET /api/v1/notifications/preferences
Response: NotificationPreferences

# Actualizar preferencias
PUT /api/v1/notifications/preferences
Body: NotificationPreferences
Response: { success: true }
```

### 10. Suscripciones y Planes

```
# Listar planes
GET /api/v1/plans
Response: Plan[]

# Obtener suscripción actual
GET /api/v1/subscriptions/current
Response: Subscription | null

# Crear suscripción
POST /api/v1/subscriptions
Body: {
  planId: 'free' | 'pro' | 'business',
  billingCycle: 'monthly' | 'yearly',
  couponCode?: string
}
Response: Subscription

# Upgrade/Downgrade
PUT /api/v1/subscriptions/:id
Body: {
  planId: 'pro' | 'business',
  billingCycle?: 'monthly' | 'yearly'
}
Response: Subscription

# Cancelar suscripción
POST /api/v1/subscriptions/:id/cancel
Body: { reason?: string }
Response: { cancelAtPeriodEnd: true }

# Validar cupón
POST /api/v1/coupons/validate
Body: { code: string, planId?: string }
Response: {
  valid: boolean,
  coupon?: Coupon,
  discount?: number,
  message?: string
}
```

### 11. Cuentas de Pago (Propietario)

```
# Listar cuentas
GET /api/v1/payment-accounts
Response: PaymentAccount[]

# Agregar cuenta bancaria
POST /api/v1/payment-accounts/bank
Body: {
  bankCode: BankCode,
  accountType: 'savings' | 'checking',
  accountNumber: string,
  accountHolderName: string,
  accountHolderDocument: string,
  isDefault?: boolean
}
Response: BankAccount

# Agregar billetera digital
POST /api/v1/payment-accounts/wallet
Body: {
  walletCode: 'nequi' | 'daviplata' | 'dale' | 'movii' | 'rappipay',
  phoneNumber: string,
  holderName: string,
  isDefault?: boolean
}
Response: DigitalWallet

# Actualizar cuenta
PUT /api/v1/payment-accounts/:id
Body: Partial<PaymentAccount>
Response: PaymentAccount

# Eliminar cuenta
DELETE /api/v1/payment-accounts/:id
Response: { success: true }

# Establecer como default
PUT /api/v1/payment-accounts/:id/default
Response: { success: true }

# Obtener asignaciones
GET /api/v1/payment-accounts/assignments
Response: PropertyAccountAssignment[]

# Actualizar asignaciones
PUT /api/v1/payment-accounts/assignments
Body: PropertyAccountAssignment[]
Response: { success: true }
```

### 12. Equipo (Propietario)

```
# Listar miembros
GET /api/v1/team
Response: TeamMember[]

# Invitar miembro
POST /api/v1/team/invite
Body: {
  email: string,
  role: 'admin' | 'manager' | 'accountant' | 'viewer',
  message?: string
}
Response: TeamMember

# Actualizar rol
PUT /api/v1/team/:id
Body: { role: string }
Response: TeamMember

# Eliminar miembro
DELETE /api/v1/team/:id
Response: { success: true }

# Aceptar invitación
POST /api/v1/team/accept
Body: { token: string }
Response: { success: true }

# Reenviar invitación
POST /api/v1/team/:id/resend
Response: { success: true }
```

### 13. Dashboard

```
# Dashboard propietario
GET /api/v1/dashboard/landlord
Response: {
  summary: {
    totalProperties: number,
    activeLeases: number,
    pendingApplications: number,
    monthlyRevenue: number
  },
  urgentActions: UrgentAction[],
  upcomingEvents: UpcomingEvent[],
  recentActivity: ActivityItem[],
  riskDistribution: { A: number, B: number, C: number, D: number }
}

# Dashboard inquilino
GET /api/v1/dashboard/tenant
Response: {
  activeLeases: LeaseSummary[],
  pendingApplications: ApplicationSummary[],
  upcomingPayments: PaymentSummary[],
  savedProperties: number,
  notifications: number
}
```

### 14. Mensajes

```
# Listar conversaciones
GET /api/v1/messages/conversations
Query: search?, page?, limit?
Response: {
  conversations: Conversation[],
  total: number
}

# Obtener mensajes
GET /api/v1/messages/conversations/:id
Query: before?, limit?
Response: {
  messages: Message[],
  hasMore: boolean
}

# Enviar mensaje
POST /api/v1/messages
Body: {
  conversationId?: string,
  recipientId?: string,
  propertyId?: string,
  content: string,
  attachments?: string[]
}
Response: Message

# Marcar como leído
PUT /api/v1/messages/conversations/:id/read
Response: { success: true }
```

### 15. Documentos

```
# Subir documento
POST /api/v1/documents
Body: FormData (file, type, entityType, entityId)
Response: {
  id: string,
  url: string,
  type: string,
  verified: false
}

# Obtener documento
GET /api/v1/documents/:id
Response: Document

# Eliminar documento
DELETE /api/v1/documents/:id
Response: { success: true }

# Verificar documento (admin)
POST /api/v1/documents/:id/verify
Body: { verified: boolean, notes?: string }
Response: Document
```

---

## Modelos de Datos

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: 'tenant' | 'landlord';
  locale: 'es' | 'en';
  emailVerified: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### OnboardingData (Propietario)
```typescript
interface LandlordOnboardingData {
  // Paso 1: Perfil
  displayName: string;
  phone: string;
  preferredContact: 'email' | 'phone' | 'whatsapp';

  // Paso 2: Primera propiedad
  propertyType: 'apartment' | 'house' | 'studio' | 'room';
  propertyAddress: string;
  propertyCity: string;
  rentPrice: number;

  // Paso 3: Preferencias de inquilino
  minIncomeRatio: 2 | 3 | 4;
  acceptPets: boolean;
  minRiskLevel: 'A' | 'B' | 'C' | 'D';

  // Paso 4: Cobros
  bankAccount?: string;
  bankName?: string;
  acceptedPaymentMethods: PaymentMethod[];
  preferredPaymentDay: number;
}
```

### OnboardingData (Inquilino)
```typescript
interface TenantOnboardingData {
  // Paso 1: Perfil
  displayName: string;
  phone: string;

  // Paso 2: Empleo
  employmentType: 'employed' | 'self_employed' | 'freelancer' | 'student' | 'retired';
  companyName?: string;
  monthlyIncome: number;

  // Paso 3: Preferencias
  budgetMin: number;
  budgetMax: number;
  preferredZones: string[];
  moveInDate: string;
  hasPets: boolean;

  // Paso 4: Documentos
  hasIdDocument: boolean;
  hasIncomeProof: boolean;
  hasEmploymentLetter: boolean;
}
```

### Property
```typescript
interface Property {
  id: string;
  title: string;
  description: string;
  type: 'apartment' | 'house' | 'studio' | 'room';
  status: 'available' | 'rented' | 'pending';

  // Ubicación
  city: string;
  neighborhood: string;
  address: string;
  latitude: number;
  longitude: number;

  // Precios (COP)
  monthlyRent: number;
  adminFee: number;
  deposit: number;

  // Características
  bedrooms: number;
  bathrooms: number;
  area: number;
  floor?: number;
  parkingSpaces?: number;
  stratum?: number;
  yearBuilt?: number;

  // Amenidades
  amenities: PropertyAmenity[];

  // Imágenes
  images: string[];
  thumbnailUrl: string;

  // Disponibilidad
  availabilitySchedule?: AvailabilitySchedule;

  // Requisitos
  tenantRequirements?: TenantRequirements;

  // Metadata
  landlordId: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}
```

### TenantRequirements
```typescript
interface TenantRequirements {
  acceptedEmployment: EmploymentType[];
  employmentNonNegotiable: boolean;
  minIncomeRatio: 0 | 2 | 3 | 4;
  incomeNonNegotiable: boolean;
  petsPolicy: 'none' | 'small' | 'all' | '';
  petsNonNegotiable: boolean;
  smokingPolicy: 'none' | 'outside' | 'allowed' | '';
  smokingNonNegotiable: boolean;
  maxOccupants: number;
  occupantsNonNegotiable: boolean;
  childrenPolicy: 'yes' | 'no' | 'indifferent';
  minLeaseDuration: 0 | 6 | 12 | 24;
  leaseNonNegotiable: boolean;
  verifications: {
    creditCheck: boolean;
    backgroundCheck: boolean;
    employmentVerification: boolean;
    previousLandlordRef: boolean;
    guarantorRequired: boolean;
  };
  verificationsNonNegotiable: boolean;
}
```

### AvailabilitySchedule
```typescript
interface AvailabilitySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface DaySchedule {
  enabled: boolean;
  ranges: TimeRange[];
}

interface TimeRange {
  start: string; // HH:MM
  end: string;   // HH:MM
}
```

### Application (6 pasos)
```typescript
interface Application {
  id: string;
  propertyId: string;
  tenantId: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  currentStep: number;
  trackingCode?: string;

  // Paso 1: Información Personal
  personal: {
    fullName: string;
    documentType: 'cc' | 'ce' | 'passport';
    documentNumber: string;
    dateOfBirth: string;
    phone: string;
    email: string;
    currentAddress: string;
    timeAtCurrentAddress: number;
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
    dependents: number;
  };

  // Paso 2: Empleo
  employment: {
    employmentStatus: 'employed' | 'self-employed' | 'unemployed' | 'retired' | 'student';
    companyName?: string;
    industry?: string;
    position?: string;
    contractType?: 'indefinite' | 'fixed-term' | 'contractor' | 'freelance';
    timeAtJob?: number;
    employerPhone?: string;
    employerAddress?: string;
  };

  // Paso 3: Ingresos
  income: {
    monthlySalary: number;
    additionalIncome: number;
    additionalIncomeSource?: string;
    monthlyObligations: number;
  };

  // Paso 4: Referencias
  references: {
    previousLandlords: Reference[];
    employmentReferences: Reference[];
    personalReferences: Reference[];
  };

  // Paso 5: Documentos
  documents: {
    idDocument?: UploadedDocument;
    incomeProof?: UploadedDocument;
    employmentLetter?: UploadedDocument;
    bankStatements?: UploadedDocument;
  };

  // Co-firmante (opcional)
  hasCoSigner: boolean;
  coSigner?: Partial<Application>;

  // Timeline
  events: ApplicationEvent[];

  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}
```

### RiskScore
```typescript
interface RiskScore {
  level: 'A' | 'B' | 'C' | 'D';
  numericScore: number; // 0-100

  categories: {
    name: string;
    label: string;
    score: number;
    weight: number;
    factors: string[];
  }[];

  drivers: string[];

  flags: {
    id: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    suggestion?: string;
  }[];

  suggestedConditions: {
    id: string;
    condition: string;
    reason: string;
  }[];

  aiExplanation: string;

  calculatedAt: string;
}
```

### Contract
```typescript
interface Contract {
  id: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;
  templateId: string;
  type: 'basico' | 'amoblado' | 'compartido' | 'custom';
  status: 'draft' | 'pending_landlord' | 'pending_tenant' | 'active' | 'expired' | 'cancelled';

  // Partes
  landlordInfo: {
    name: string;
    email: string;
    phone: string;
    document: string;
  };
  tenantInfo: {
    name: string;
    email: string;
    phone: string;
    document: string;
  };
  propertyInfo: {
    address: string;
    city: string;
  };

  // Términos
  startDate: string;
  endDate: string;
  monthlyRent: number;
  adminFee: number;
  paymentDueDay: number;
  guaranteeType: 'poliza' | 'codeudor';
  guaranteeDetails?: string;

  // Cláusulas
  clauses: ContractClause[];
  specialConditions?: string;

  // Seguro
  insurance?: {
    tier: 'none' | 'basic' | 'premium';
    monthlyPremium: number;
    policyId?: string;
  };

  // Firmas
  landlordSignature?: Signature;
  tenantSignature?: Signature;

  // Documento
  documentUrl?: string;
  documentHash?: string;
  certificateId?: string;

  // Audit
  auditTrail: AuditEntry[];

  createdAt: string;
  updatedAt: string;
}

interface Signature {
  signedAt: string;
  signedBy: string;
  signerId: string;
  ipAddress: string;
  userAgent: string;
  otpVerified: boolean;
  otpVerifiedAt?: string;
}
```

### Lease
```typescript
interface Lease {
  id: string;
  contractId: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;
  status: 'active' | 'ending_soon' | 'ended' | 'terminated';

  // Términos
  monthlyRent: number;
  adminFee: number;
  guaranteeType: 'poliza' | 'codeudor';
  startDate: string;
  endDate: string;
  paymentDueDay: number;

  // Información desnormalizada
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  propertyThumbnail: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantAvatar?: string;
  landlordName: string;
  landlordEmail: string;
  landlordPhone: string;

  // Documentos
  contractUrl?: string;
  insuranceUrl?: string;
  inventoryUrl?: string;

  createdAt: string;
  updatedAt: string;
}
```

### Payment
```typescript
interface Payment {
  id: string;
  leaseId: string;
  amount: number;
  concept: 'rent' | 'admin_fee' | 'late_fee' | 'repair' | 'deposit';
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'late' | 'failed';
  method?: PaymentMethod;
  reference?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
}

type PaymentMethod = 'pse' | 'credit_card' | 'debit_card' | 'nequi' | 'daviplata' | 'cash' | 'transfer';
```

### Visit
```typescript
interface Visit {
  id: string;
  propertyId: string;
  candidateId: string;
  candidateName: string;
  candidatePhone: string;
  propertyTitle: string;
  requestedDate: string;
  requestedTime: string;
  confirmedDate?: string;
  confirmedTime?: string;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  candidateMessage?: string;
  landlordNotes?: string;
  cancellationReason?: string;
  rescheduledFrom?: string;
  createdAt: string;
}
```

### PaymentAccount
```typescript
interface BankAccount {
  id: string;
  type: 'bank';
  bankCode: BankCode;
  bankName: string;
  accountType: 'savings' | 'checking';
  accountNumber: string; // Últimos 4 dígitos visibles
  accountHolderName: string;
  accountHolderDocument: string;
  isDefault: boolean;
  createdAt: string;
}

interface DigitalWallet {
  id: string;
  type: 'wallet';
  walletCode: WalletCode;
  walletName: string;
  phoneNumber: string;
  holderName: string;
  isDefault: boolean;
  createdAt: string;
}

type PaymentAccount = BankAccount | DigitalWallet;

type BankCode = 'bancolombia' | 'davivienda' | 'bbva' | 'bogota' | 'popular' |
                'occidente' | 'colpatria' | 'cajasocial' | 'falabella' | 'itau';

type WalletCode = 'nequi' | 'daviplata' | 'dale' | 'movii' | 'rappipay';
```

### TeamMember
```typescript
interface TeamMember {
  id: string;
  userId?: string;
  email: string;
  name?: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'accountant' | 'viewer';
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitedAt: string;
  acceptedAt?: string;
  invitedBy: string;
}
```

### Subscription
```typescript
interface Subscription {
  id: string;
  userId: string;
  planId: 'free' | 'pro' | 'business';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string;
  appliedCoupon?: AppliedCoupon;
}

interface Plan {
  id: 'free' | 'pro' | 'business';
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: PlanFeature[];
  limits: {
    properties: number;
    contracts: number;
    teamMembers: number;
    aiScoring: boolean;
    apiAccess: boolean;
  };
  highlighted?: boolean;
}
```

---

## Lógica de Negocio

### Algoritmo de Risk Score

**Categorías y Pesos:**
| Categoría | Peso | Descripción |
|-----------|------|-------------|
| Integridad | 25% | Verificación de documentos, detección de fraude |
| Financiero | 35% | Ratio renta/ingresos, análisis de deudas |
| Estabilidad | 25% | Tiempo en empleo, historial de direcciones |
| Historial | 15% | Historial de pagos, referencias |

**Niveles:**
| Nivel | Rango | Recomendación |
|-------|-------|---------------|
| A | 85-100 | Recomendado |
| B | 70-84 | Recomendado |
| C | 50-69 | Condicional (requiere garantías) |
| D | 0-49 | No recomendado |

**Flags de Riesgo:**
- `HIGH_RENT_TO_INCOME` - Renta > 30% de ingresos
- `LOW_TENURE` - < 1 año en empleo actual
- `LATE_PAYMENTS` - Historial de pagos tardíos
- `MISSING_DOCS` - Documentos requeridos faltantes
- `INCOME_MISMATCH` - Ingresos declarados vs verificados difieren
- `FRAUD_SUSPECTED` - Inconsistencias detectadas

### Límites de Planes

| Plan | Propiedades | Contratos | AI Scoring | Equipo | API |
|------|-------------|-----------|------------|--------|-----|
| Free | 1 | 1 | No | No | No |
| Pro | 10 | Ilimitados | Sí | 3 | No |
| Business | Ilimitados | Ilimitados | Sí | Ilimitados | Sí |

**Precios (COP):**
- Free: $0
- Pro: $149,900/mes o $1,438,800/año (20% descuento)
- Business: $499,900/mes o $4,799,040/año (20% descuento)

---

## Configuraciones Colombianas

### Bancos Soportados
| Banco | Código | Tipos de Cuenta |
|-------|--------|-----------------|
| Bancolombia | `bancolombia` | Ahorros, Corriente |
| Davivienda | `davivienda` | Ahorros, Corriente |
| BBVA Colombia | `bbva` | Ahorros, Corriente |
| Banco de Bogotá | `bogota` | Ahorros, Corriente |
| Banco Popular | `popular` | Ahorros, Corriente |
| Banco de Occidente | `occidente` | Ahorros, Corriente |
| Scotiabank Colpatria | `colpatria` | Ahorros, Corriente |
| Banco Caja Social | `cajasocial` | Ahorros, Corriente |
| Banco Falabella | `falabella` | Ahorros, Corriente |
| Banco Itaú | `itau` | Ahorros, Corriente |

### Billeteras Digitales
| Billetera | Código | Identificador |
|-----------|--------|---------------|
| Nequi | `nequi` | Número celular |
| Daviplata | `daviplata` | Número celular |
| Dale! | `dale` | Número celular |
| Movii | `movii` | Número celular |
| Rappipay | `rappipay` | Número celular |

### Requisitos Legales
- **Sin depósitos:** Ley 820/2003 Art. 16 prohíbe depósitos
- **Garantías válidas:** Solo póliza de seguro o codeudor
- **Firma electrónica:** Válida bajo Ley 527/1999
- **Moneda:** Todo en COP (pesos colombianos)

### Ciudades Soportadas
- Bogotá
- Medellín
- Cali
- Barranquilla
- Cartagena
- Bucaramanga
- Santa Marta
- Pereira
- Manizales
- Cúcuta

---

## Notas para el Equipo Backend

1. **Moneda:** Todos los valores monetarios en COP como enteros
2. **Fechas:** Formato ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)
3. **IDs:** UUIDs recomendados
4. **Imágenes:** Retornar URLs de CDN, aceptar uploads multipart
5. **Paginación:** Usar patrón limit/offset, retornar total count
6. **Errores:** Formato consistente:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Campo requerido",
    "field": "email"
  }
}
```

### Variables de Entorno
```env
# API
API_BASE_URL=https://api.leasefy.co/v1

# Database
DATABASE_URL=postgresql://...

# Storage
AWS_S3_BUCKET=leasefy-uploads
AWS_REGION=us-east-1

# Auth
JWT_SECRET=...
OTP_EXPIRY_MINUTES=10

# Email
SENDGRID_API_KEY=...
EMAIL_FROM=noreply@leasefy.co

# Payments
PSE_MERCHANT_ID=...
WOMPI_PUBLIC_KEY=...
WOMPI_PRIVATE_KEY=...

# Notifications
FIREBASE_PROJECT_ID=...
```

---

*Documento actualizado: 2026-02-07*
