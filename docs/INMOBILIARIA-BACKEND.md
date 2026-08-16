# Inmobiliaria Module - Backend Integration Guide

> **Version**: v3.0
> **Last Updated**: 2026-02-09
> **Module Status**: Frontend Complete (Mock Data)

This document provides comprehensive backend integration specifications for the Inmobiliaria (Real Estate Agency) module. All frontend components are functional with mock data and ready for API integration.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Models](#data-models)
4. [API Endpoints](#api-endpoints)
5. [Business Logic](#business-logic)
6. [Database Schema](#database-schema)
7. [Integration Checklist](#integration-checklist)

---

## Overview

The Inmobiliaria module enables real estate agencies to manage their complete operation:

| Feature Area | Description |
|-------------|-------------|
| **Propietarios** | Property owner management with banking info |
| **Portafolio** | Property consignment management |
| **Pipeline** | Candidate tracking through rental stages |
| **Agentes** | Agent management with performance metrics |
| **Cobros** | Rent collection and payment tracking |
| **Dispersiones** | Owner payment disbursement |
| **Operaciones** | Maintenance and contract renewals |
| **Documentos** | Templates and document generation |
| **Reportes** | Financial and operational reports |
| **Analytics** | KPIs, trends, and forecasting |
| **Configuracion** | Agency settings, users, billing |

### Frontend Routes

All routes are protected with `allowedRoles={['agency']}`:

```
/panel/inmobiliaria              → Dashboard
/panel/inmobiliaria/propietarios → Property Owners
/panel/inmobiliaria/inmuebles   → Consignaciones
/panel/inmobiliaria/pipeline     → Candidate Pipeline
/panel/inmobiliaria/agentes      → Agents
/panel/inmobiliaria/cobros       → Collections
/panel/inmobiliaria/dispersiones → Disbursements
/panel/inmobiliaria/operaciones  → Maintenance & Renewals
/panel/inmobiliaria/documentos   → Documents
/panel/inmobiliaria/reportes     → Reports
/panel/inmobiliaria/analytics    → Analytics
/panel/inmobiliaria/configuracion → Settings
/panel/inmobiliaria/mensajes     → Messages
```

---

## Architecture

### Multi-Tenancy Model

Each agency is a tenant with isolated data:

```
Agency (tenant)
├── Propietarios (property owners)
│   └── Consignaciones (properties)
│       └── Pipeline Items (candidates)
│       └── Leases (active contracts)
│           └── Cobros (rent payments)
│           └── Dispersiones (owner payments)
├── Agentes (agents)
├── Users (agency users with roles)
├── Documents & Templates
└── Configuration
```

### Key Relationships

```
Propietario (1) ─── (N) Consignacion
Consignacion (1) ─── (N) PipelineItem
Consignacion (1) ─── (N) Lease
Lease (1) ─── (N) Cobro
Propietario (1) ─── (N) Dispersion
Agente (1) ─── (N) Consignacion (assigned)
Consignacion (1) ─── (N) SolicitudMantenimiento
Consignacion (1) ─── (N) Renovacion
```

---

## Data Models

### 1. Propietario (Property Owner)

```typescript
interface Propietario {
  id: string;
  name: string;
  email: string;
  phone: string;
  documentType: 'CC' | 'NIT' | 'CE' | 'PP';
  documentNumber: string;
  address: string;
  city: string;

  // Banking - Required for disbursements
  bankAccount: {
    bank: 'bancolombia' | 'davivienda' | 'bbva' | 'bogota' |
          'occidente' | 'popular' | 'itau' | 'scotiabank' |
          'cajasocial' | 'avvillas' | 'nequi' | 'daviplata';
    accountType: 'savings' | 'checking';
    accountNumber: string;  // Store masked (****1234)
    accountHolder: string;
  };

  // Computed fields (calculate from related data)
  propertyCount: number;
  activeLeases: number;
  totalMonthlyRent: number;  // COP
  pendingBalance: number;    // COP (unpaid rent)
  lastPaymentDate?: string;  // ISO date

  notes?: string;
  tags?: string[];

  createdAt: string;
  updatedAt: string;
}
```

**API Requirements:**
- Full CRUD operations
- Search by name, email, document
- Filter by tags, city, pending balance
- Aggregate: property count, total rent, pending balance

---

### 2. Agente (Agent)

```typescript
interface Agente {
  id: string;
  name: string;
  email: string;
  phone: string;
  documentNumber: string;
  role: 'senior' | 'junior' | 'trainee';
  status: 'active' | 'inactive' | 'vacation';

  avatar?: string;

  // Performance metrics (calculated)
  metrics: {
    activeProperties: number;
    closedDeals: number;
    monthlyRevenue: number;       // COP
    averageDaysToClose: number;
    occupancyRate: number;        // 0-100
    collectionRate: number;       // 0-100
    satisfactionScore: number;    // 0-5
    renewalRate: number;          // 0-100
  };

  // Commission structure
  commissionRate: number;         // percentage (e.g., 10)

  hireDate: string;
  createdAt: string;
  updatedAt: string;
}
```

**Metric Calculations:**
- `activeProperties`: Count consignaciones where agenteId = agent.id AND status = 'active'
- `closedDeals`: Count leases created in period where agenteId = agent.id
- `monthlyRevenue`: Sum of cobros.amount in period for agent's properties
- `averageDaysToClose`: Avg(lease.createdAt - pipelineItem.createdAt) for agent's deals
- `occupancyRate`: (Active leases / Total consignaciones) * 100
- `collectionRate`: (Cobros paid on time / Total cobros) * 100

---

### 3. Consignacion (Property Consignment)

```typescript
interface Consignacion {
  id: string;
  propietarioId: string;
  agenteId: string;

  // Property details
  propertyTitle: string;
  propertyType: 'apartamento' | 'casa' | 'oficina' | 'local' |
                'bodega' | 'lote' | 'finca';
  address: string;
  neighborhood: string;
  city: string;
  stratum: 1 | 2 | 3 | 4 | 5 | 6;
  area: number;              // m²
  rooms: number;
  bathrooms: number;
  parking: number;

  // Financial
  monthlyRent: number;       // COP
  adminFee: number;          // COP
  depositAmount: number;     // COP (usually 1-2 months rent)

  // Commission (agency earnings)
  commissionPercent: number; // e.g., 10
  commissionType: 'first_month' | 'monthly' | 'mixed';

  // Status
  status: 'active' | 'pending' | 'rented' | 'maintenance' | 'terminated';

  // Current lease (if rented)
  currentLeaseId?: string;
  currentTenantName?: string;
  leaseEndDate?: string;

  // Media
  photos: string[];
  documents?: string[];

  // Timestamps
  consignmentDate: string;
  createdAt: string;
  updatedAt: string;
}
```

**Status Workflow:**
```
pending → active → rented → (maintenance) → terminated
                 ↓
              active (when lease ends)
```

---

### 4. PipelineItem (Candidate)

```typescript
type PipelineStage =
  | 'nuevo'           // New lead
  | 'contactado'      // Contacted
  | 'visita_programada' // Visit scheduled
  | 'visita_realizada'  // Visit completed
  | 'documentos'      // Documents requested
  | 'verificacion'    // Background check
  | 'aprobado'        // Approved
  | 'contrato'        // Contract stage
  | 'firmado'         // Signed - becomes lease
  | 'descartado';     // Rejected/Lost

interface PipelineItem {
  id: string;
  consignacionId: string;
  agenteId: string;

  // Candidate info
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateDocument?: string;

  // Pipeline tracking
  stage: PipelineStage;
  stageHistory: {
    stage: PipelineStage;
    enteredAt: string;
    notes?: string;
  }[];

  // Scheduling
  scheduledVisitDate?: string;
  visitCompletedDate?: string;

  // Evaluation
  score?: number;             // 0-100 (background check score)
  monthlyIncome?: number;     // COP
  employmentStatus?: 'empleado' | 'independiente' | 'pensionado' | 'otro';

  // Documents checklist
  documentsReceived: {
    cedula: boolean;
    laborCertificate: boolean;
    incomeProof: boolean;
    references: boolean;
    codeudor?: boolean;
  };

  notes?: string;
  rejectionReason?: string;

  createdAt: string;
  updatedAt: string;
}
```

**Pipeline Metrics:**
- Conversion rate per stage
- Average time per stage
- Drop-off rate per stage
- Agent performance comparison

---

### 5. Cobro (Rent Collection)

```typescript
type CobroStatus =
  | 'pending'      // Awaiting payment
  | 'partial'      // Partially paid
  | 'paid'         // Fully paid
  | 'late'         // Overdue
  | 'written_off'; // Bad debt

interface Cobro {
  id: string;
  leaseId: string;
  consignacionId: string;
  propietarioId: string;
  tenantId: string;

  // Period
  period: string;           // "2026-01" (YYYY-MM)
  dueDate: string;          // ISO date

  // Amounts (all in COP)
  rentAmount: number;
  adminFee: number;
  lateFee: number;          // Calculated if overdue
  otherCharges: number;
  totalAmount: number;      // Sum of above
  paidAmount: number;
  pendingAmount: number;    // totalAmount - paidAmount

  // Payment tracking
  status: CobroStatus;
  paymentDate?: string;
  paymentMethod?: 'transfer' | 'pse' | 'cash' | 'check' | 'nequi' | 'daviplata';
  paymentReference?: string;

  // Late fee calculation
  daysLate: number;
  lateFeePercent: number;   // e.g., 2% per day

  notes?: string;

  createdAt: string;
  updatedAt: string;
}
```

**Business Rules:**
- Generate cobros automatically at month start
- Apply late fee after grace period (configurable, default 5 days)
- Late fee formula: `rentAmount * (lateFeePercent / 100) * daysLate`
- Maximum late fee cap (configurable, e.g., 20%)

---

### 6. Dispersion (Owner Payment)

```typescript
type DispersionStatus =
  | 'pending'     // Ready to process
  | 'processing'  // In transit
  | 'completed'   // Successfully paid
  | 'failed';     // Payment failed

interface Dispersion {
  id: string;
  propietarioId: string;
  period: string;           // "2026-01"

  // Amounts (all in COP)
  grossAmount: number;      // Total collected rent
  commissionAmount: number; // Agency commission
  adminFeeRetained: number; // If agency keeps admin
  deductions: number;       // Maintenance, repairs, etc.
  netAmount: number;        // What owner receives

  // Deduction details
  deductionDetails?: {
    concept: string;
    amount: number;
    reference?: string;
  }[];

  // Payment info
  status: DispersionStatus;
  scheduledDate: string;    // When planned to pay
  processedDate?: string;   // When actually paid
  paymentMethod: 'transfer' | 'check';
  bankReference?: string;

  // Related cobros
  cobroIds: string[];       // Which payments are being dispersed

  notes?: string;

  createdAt: string;
  updatedAt: string;
}
```

**Disbursement Calculation:**
```
netAmount = grossAmount - commissionAmount - adminFeeRetained - deductions

Where:
- grossAmount = Sum of cobros.paidAmount for period
- commissionAmount = grossAmount * (commissionPercent / 100)
- adminFeeRetained = Sum of adminFee if agency retains it
- deductions = Approved maintenance costs, repairs, etc.
```

---

### 7. SolicitudMantenimiento (Maintenance Request)

```typescript
type MaintenanceStatus =
  | 'nueva'       // New request
  | 'asignada'    // Assigned to provider
  | 'en_proceso'  // Work in progress
  | 'completada'  // Work completed
  | 'cerrada';    // Closed after verification

type MaintenancePriority = 'baja' | 'media' | 'alta' | 'urgente';

type MaintenanceCategory =
  | 'plomeria' | 'electricidad' | 'cerrajeria' | 'pintura'
  | 'carpinteria' | 'electrodomesticos' | 'aire_acondicionado'
  | 'filtraciones' | 'plagas' | 'otro';

interface SolicitudMantenimiento {
  id: string;
  consignacionId: string;
  propietarioId: string;
  tenantId?: string;
  agenteId: string;

  // Request details
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;

  // Status tracking
  status: MaintenanceStatus;
  statusHistory: {
    status: MaintenanceStatus;
    timestamp: string;
    notes?: string;
    updatedBy: string;
  }[];

  // Assignment
  providerName?: string;
  providerPhone?: string;
  scheduledDate?: string;

  // Costs
  estimatedCost?: number;   // COP
  actualCost?: number;      // COP
  paidBy: 'propietario' | 'inquilino' | 'inmobiliaria';
  deductFromRent: boolean;

  // Evidence
  photos: string[];
  completionPhotos?: string[];

  // Satisfaction
  tenantRating?: number;    // 1-5
  tenantFeedback?: string;

  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
```

---

### 8. Renovacion (Contract Renewal)

```typescript
type RenovacionStatus =
  | 'pending'       // Upcoming renewal
  | 'notified'      // Tenant notified
  | 'negotiating'   // In negotiation
  | 'accepted'      // Terms accepted
  | 'rejected'      // Tenant will not renew
  | 'completed';    // New contract signed

interface Renovacion {
  id: string;
  leaseId: string;
  consignacionId: string;
  propietarioId: string;
  tenantId: string;

  // Current lease
  currentRent: number;        // COP
  currentEndDate: string;

  // Proposed renewal
  proposedRent: number;       // COP
  proposedStartDate: string;
  proposedEndDate: string;
  rentIncrease: number;       // Percentage

  // IPC adjustment (Colombian consumer price index)
  ipcRate: number;            // e.g., 5.2
  ipcBasedRent: number;       // currentRent * (1 + ipcRate/100)

  // Negotiation
  counterOfferRent?: number;
  finalRent?: number;

  // Status
  status: RenovacionStatus;
  notificationDate?: string;
  responseDeadline?: string;

  // History
  history: {
    action: string;
    timestamp: string;
    notes?: string;
    performedBy: string;
  }[];

  notes?: string;

  createdAt: string;
  updatedAt: string;
}
```

**IPC Calculation (Colombia):**
```
newRent = currentRent * (1 + (ipcRate / 100))

// Example:
// currentRent = 2,000,000 COP
// ipcRate = 5.2%
// newRent = 2,000,000 * 1.052 = 2,104,000 COP
```

---

### 9. DocumentTemplate & PropertyDocument

```typescript
type DocumentCategory =
  | 'contrato'    // Rental contract
  | 'acta'        // Delivery/return act
  | 'inventario'  // Inventory list
  | 'poliza'      // Insurance policy
  | 'carta'       // Letters (notifications, etc.)
  | 'otro';

type DocumentStatus =
  | 'draft'
  | 'pending_signature'
  | 'signed'
  | 'expired'
  | 'cancelled';

interface DocumentTemplate {
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

  // Template variables for substitution
  variables: string[];  // e.g., ['{{tenant_name}}', '{{property_address}}']

  // Template content (HTML or markdown)
  content: string;
}

interface PropertyDocument {
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
  fileSize?: number;      // bytes
  mimeType?: string;

  // E-signature support
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
```

---

### 10. ActaEntrega (Delivery/Return Act)

```typescript
type ActaType = 'entrega' | 'devolucion';

type ItemCondition = 'excelente' | 'bueno' | 'regular' | 'malo' | 'no_aplica';

type RoomType =
  | 'sala' | 'comedor' | 'cocina'
  | 'habitacion_principal' | 'habitacion_2' | 'habitacion_3'
  | 'bano_principal' | 'bano_2'
  | 'estudio' | 'balcon' | 'terraza' | 'garaje' | 'cuarto_util' | 'otro';

interface ActaInventoryItem {
  id: string;
  room: RoomType;
  name: string;
  description?: string;
  quantity: number;
  condition: ItemCondition;
  conditionNotes?: string;
  photos?: string[];
  hasDefects: boolean;
  defectDescription?: string;
}

interface MeterReading {
  type: 'agua' | 'luz' | 'gas';
  reading: string;
  unit: string;
  photoUrl?: string;
}

interface ActaEntrega {
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

  // Utility meters
  meterReadings: MeterReading[];

  // Keys
  keysDelivered: {
    type: string;
    quantity: number;
    notes?: string;
  }[];

  // General condition
  generalCondition: ItemCondition;
  generalObservations?: string;

  // Signatures (digital)
  signatures: {
    party: 'tenant' | 'owner' | 'agent';
    name: string;
    cedula: string;
    signatureData?: string;  // Base64
    signedAt?: string;
    ipAddress?: string;
  }[];

  // For devolucion: deposit handling
  depositAmount?: number;
  deductions?: {
    concept: string;
    amount: number;
    notes?: string;
  }[];
  depositToReturn?: number;

  status: 'draft' | 'in_progress' | 'pending_signatures' | 'completed';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  pdfUrl?: string;
}
```

---

### 11. Configuration Models

```typescript
// Agency configuration
interface InmobiliariaConfigExtended {
  id: string;
  name: string;
  nit: string;

  branding: {
    primaryColor: string;     // Hex
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
  };

  contact: {
    phone: string;
    email: string;
    website?: string;
    address: string;
    city: string;
    department: ColombianDepartment;
    whatsapp?: string;
  };

  legal: {
    nit: string;
    razonSocial: string;
    representanteLegal: string;
    representanteCedula: string;
    matriculaInmobiliaria?: string;
    registroCamara?: string;
  };

  defaults: {
    defaultCommissionPercent: number;
    defaultAdminFeePercent: number;
    defaultLateFeePercent: number;
    paymentDueDay: number;        // Day of month (1-28)
    disbursementDay: number;      // Day of month (1-28)
    gracePeriodDays: number;
    reminderDaysBefore: number[];
    reminderDaysAfter: number[];
  };

  collectionBankAccount: {
    bank: string;
    accountType: 'savings' | 'checking';
    accountNumber: string;
    accountHolder: string;
  };

  createdAt: string;
  updatedAt: string;
}

// User management
type AgencyRole = 'admin' | 'agente' | 'contador' | 'viewer';

interface AgencyUser {
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

// Permissions
type PermissionModule =
  | 'dashboard' | 'propietarios' | 'portafolio' | 'pipeline'
  | 'agentes' | 'cobros' | 'dispersiones' | 'operaciones'
  | 'reportes' | 'configuracion' | 'documentos' | 'analytics';

type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

interface RolePermission {
  module: PermissionModule;
  actions: PermissionAction[];
}

// Billing
type BillingPlan = 'starter' | 'professional' | 'enterprise';

interface AgencyBilling {
  plan: BillingPlan;
  cycle: 'monthly' | 'annual';
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
  limits: {
    maxProperties: number;    // -1 = unlimited
    maxUsers: number;
    maxAgents: number;
    includesReports: boolean;
    includesAnalytics: boolean;
    includesIntegrations: boolean;
    includesApi: boolean;
    supportLevel: 'email' | 'priority' | 'dedicated';
  };
}

// Integrations
interface AgencyIntegration {
  id: string;
  name: string;
  description: string;
  category: 'payments' | 'accounting' | 'communications' | 'storage';
  icon: string;
  status: 'active' | 'inactive' | 'pending' | 'error';
  isEnabled: boolean;
  configUrl?: string;
  apiKeyConfigured?: boolean;
  lastSyncAt?: string;
  errorMessage?: string;
}
```

---

### 12. Analytics Models

```typescript
// KPI with trend data
interface AdvancedKPI {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  unit?: string;
  trend: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    previousValue: number;
    currentValue: number;
  };
  sparkline: { date: string; value: number; }[];
  target?: number;
  targetLabel?: string;
  category: 'financial' | 'operational' | 'performance';
  description?: string;
}

// Trend analysis
interface TrendAnalysis {
  metricId: string;
  metricLabel: string;
  data: { date: string; value: number; label?: string; isProjected?: boolean; }[];
  comparison: {
    current: { label: string; startDate: string; endDate: string; value: number; };
    previous: { label: string; startDate: string; endDate: string; value: number; };
    change: { absolute: number; percentage: number; direction: 'up' | 'down' | 'stable'; };
  };
  seasonalPatterns: {
    month: number;
    monthName: string;
    averageValue: number;
    deviation: number;
    isHighSeason: boolean;
    notes?: string;
  }[];
  anomalies: {
    date: string;
    value: number;
    expectedValue: number;
    deviationPercent: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }[];
  trendLine: { slope: number; direction: 'up' | 'down' | 'stable'; confidence: number; };
  insights: string[];
}

// Forecasting
interface ForecastData {
  metricId: string;
  metricLabel: string;
  unit: string;
  historical: { date: string; value: number; }[];
  baseline: {
    date: string;
    predicted: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
  }[];
  scenarios: {
    id: string;
    name: string;
    description: string;
    assumptions: string[];
    data: { date: string; predicted: number; lowerBound: number; upperBound: number; confidence: number; }[];
    probability: number;
  }[];
  factors: { name: string; impact: 'positive' | 'negative' | 'neutral'; weight: number; }[];
  lastUpdated: string;
}
```

---

## API Endpoints

### Base URL
```
/api/v1/inmobiliaria
```

### Authentication
All endpoints require agency authentication with JWT token containing:
- `agencyId`: The tenant identifier
- `userId`: The logged-in user
- `role`: User's role for permission checks

---

### Propietarios

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/propietarios` | List all (paginated, filterable) |
| GET | `/propietarios/:id` | Get single |
| POST | `/propietarios` | Create |
| PUT | `/propietarios/:id` | Update |
| DELETE | `/propietarios/:id` | Delete (soft delete) |
| GET | `/propietarios/:id/consignaciones` | List properties |
| GET | `/propietarios/:id/cobros` | List payments |
| GET | `/propietarios/:id/dispersiones` | List disbursements |
| GET | `/propietarios/:id/extracto` | Generate statement |

**Query Parameters (GET /propietarios):**
```
?page=1
&limit=20
&search=carlos
&city=Bogotá
&tags=premium
&hasPendingBalance=true
&sortBy=name
&sortOrder=asc
```

---

### Agentes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/agentes` | List all |
| GET | `/agentes/:id` | Get with metrics |
| POST | `/agentes` | Create |
| PUT | `/agentes/:id` | Update |
| DELETE | `/agentes/:id` | Deactivate |
| GET | `/agentes/:id/consignaciones` | Agent's properties |
| GET | `/agentes/:id/pipeline` | Agent's pipeline |
| GET | `/agentes/:id/metrics` | Performance metrics |
| GET | `/agentes/leaderboard` | Ranked by performance |

---

### Consignaciones (Portafolio)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/consignaciones` | List all |
| GET | `/consignaciones/:id` | Get single |
| POST | `/consignaciones` | Create (multi-step wizard) |
| PUT | `/consignaciones/:id` | Update |
| DELETE | `/consignaciones/:id` | Terminate |
| POST | `/consignaciones/:id/photos` | Upload photos |
| DELETE | `/consignaciones/:id/photos/:photoId` | Remove photo |

**Query Parameters:**
```
?status=active,rented
&propertyType=apartamento
&propietarioId=prop-001
&agenteId=agent-001
&minRent=1000000
&maxRent=5000000
&stratum=4,5,6
```

---

### Pipeline

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pipeline` | All items (Kanban view) |
| GET | `/pipeline/:id` | Single item |
| POST | `/pipeline` | Create candidate |
| PUT | `/pipeline/:id` | Update |
| PUT | `/pipeline/:id/stage` | Move to stage |
| DELETE | `/pipeline/:id` | Remove |
| POST | `/pipeline/:id/convert` | Convert to lease |

**Stage Transition Payload:**
```json
{
  "newStage": "visita_programada",
  "notes": "Visita agendada para mañana 10am",
  "scheduledVisitDate": "2026-02-10T15:00:00Z"
}
```

---

### Cobros

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cobros` | List all |
| GET | `/cobros/:id` | Get single |
| POST | `/cobros` | Manual creation |
| PUT | `/cobros/:id` | Update |
| PUT | `/cobros/:id/pay` | Register payment |
| GET | `/cobros/summary` | Period summary |
| GET | `/cobros/pending` | Pending by due date |
| POST | `/cobros/generate` | Batch generate for period |
| POST | `/cobros/:id/reminder` | Send reminder |

**Register Payment Payload:**
```json
{
  "paidAmount": 2500000,
  "paymentDate": "2026-02-05",
  "paymentMethod": "transfer",
  "paymentReference": "TRF-123456"
}
```

---

### Dispersiones

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dispersiones` | List all |
| GET | `/dispersiones/:id` | Get single |
| POST | `/dispersiones` | Create |
| PUT | `/dispersiones/:id` | Update |
| PUT | `/dispersiones/:id/process` | Mark as processed |
| GET | `/dispersiones/preview` | Preview calculations |
| GET | `/dispersiones/:propietarioId/extracto` | Owner statement |

**Preview Payload:**
```json
{
  "propietarioId": "prop-001",
  "period": "2026-01",
  "deductions": [
    { "concept": "Reparación cocina", "amount": 350000 }
  ]
}
```

---

### Operaciones (Mantenimiento)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/mantenimiento` | List requests |
| GET | `/mantenimiento/:id` | Get single |
| POST | `/mantenimiento` | Create request |
| PUT | `/mantenimiento/:id` | Update |
| PUT | `/mantenimiento/:id/status` | Change status |
| POST | `/mantenimiento/:id/photos` | Add photos |
| GET | `/mantenimiento/kanban` | Kanban view data |

---

### Operaciones (Renovaciones)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/renovaciones` | List all |
| GET | `/renovaciones/:id` | Get single |
| POST | `/renovaciones` | Create |
| PUT | `/renovaciones/:id` | Update |
| PUT | `/renovaciones/:id/notify` | Send notification |
| PUT | `/renovaciones/:id/accept` | Mark accepted |
| PUT | `/renovaciones/:id/reject` | Mark rejected |
| GET | `/renovaciones/upcoming` | Due within 90 days |
| GET | `/renovaciones/ipc` | Current IPC rate |

---

### Documentos

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/templates` | List templates |
| GET | `/templates/:id` | Get template |
| POST | `/templates` | Create template |
| PUT | `/templates/:id` | Update template |
| GET | `/documents` | List documents |
| GET | `/documents/:id` | Get document |
| POST | `/documents/generate` | Generate from template |
| POST | `/documents/:id/sign` | Request signature |
| GET | `/documents/:id/download` | Download PDF |

---

### Actas de Entrega

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/actas` | List all |
| GET | `/actas/:id` | Get single |
| POST | `/actas` | Create |
| PUT | `/actas/:id` | Update |
| POST | `/actas/:id/items` | Add inventory items |
| POST | `/actas/:id/photos` | Add photos |
| PUT | `/actas/:id/sign` | Add signature |
| POST | `/actas/:id/complete` | Finalize and generate PDF |

---

### Reportes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reportes/cartera` | Cartera (receivables) |
| GET | `/reportes/ocupacion` | Occupancy rates |
| GET | `/reportes/comisiones` | Commissions |
| GET | `/reportes/vencimientos` | Upcoming expirations |
| GET | `/reportes/flujo-caja` | Cash flow |
| POST | `/reportes/export` | Export to PDF/Excel |

**Query Parameters:**
```
?startDate=2026-01-01
&endDate=2026-12-31
&propietarioId=prop-001
&agenteId=agent-001
&format=pdf|xlsx
```

---

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/kpis` | Current KPIs |
| GET | `/analytics/trends/:metricId` | Trend analysis |
| GET | `/analytics/forecast/:metricId` | Forecasting |
| GET | `/analytics/charts` | Chart data |

**Query Parameters:**
```
?period=month|quarter|year
&startDate=2025-01-01
&endDate=2026-01-31
&compare=previous_period|previous_year
```

---

### Configuracion

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/config` | Get agency config |
| PUT | `/config` | Update config |
| PUT | `/config/branding` | Update branding |
| PUT | `/config/defaults` | Update defaults |
| GET | `/config/users` | List users |
| POST | `/config/users/invite` | Invite user |
| PUT | `/config/users/:id` | Update user |
| DELETE | `/config/users/:id` | Remove user |
| GET | `/config/billing` | Billing info |
| PUT | `/config/billing/payment-method` | Update payment |
| GET | `/config/integrations` | List integrations |
| PUT | `/config/integrations/:id` | Toggle integration |

---

## Business Logic

### 1. Cobro Generation (Monthly)

```python
def generate_monthly_cobros(period: str):
    """
    Run on 1st of each month or on-demand
    """
    active_leases = get_active_leases()

    for lease in active_leases:
        cobro = Cobro(
            leaseId=lease.id,
            period=period,
            dueDate=f"{period}-{config.paymentDueDay}",
            rentAmount=lease.monthlyRent,
            adminFee=lease.adminFee,
            lateFee=0,
            otherCharges=0,
            totalAmount=lease.monthlyRent + lease.adminFee,
            paidAmount=0,
            pendingAmount=lease.monthlyRent + lease.adminFee,
            status='pending'
        )
        save(cobro)

        # Schedule reminders
        schedule_reminder(cobro, days_before=config.reminderDaysBefore)
```

### 2. Late Fee Calculation

```python
def calculate_late_fee(cobro: Cobro) -> int:
    """
    Calculate late fee based on days overdue
    """
    if cobro.status == 'paid':
        return 0

    today = date.today()
    due_date = parse_date(cobro.dueDate)
    grace_end = due_date + timedelta(days=config.gracePeriodDays)

    if today <= grace_end:
        return 0

    days_late = (today - grace_end).days
    late_fee = cobro.rentAmount * (config.lateFeePercent / 100) * days_late

    # Apply maximum cap (e.g., 20% of rent)
    max_fee = cobro.rentAmount * 0.20
    return min(late_fee, max_fee)
```

### 3. Dispersion Calculation

```python
def calculate_dispersion(propietario_id: str, period: str) -> DispersionPreview:
    """
    Calculate net amount for owner disbursement
    """
    # Get all paid cobros for owner's properties in period
    cobros = get_cobros(
        propietarioId=propietario_id,
        period=period,
        status='paid'
    )

    gross_amount = sum(c.paidAmount for c in cobros)

    # Calculate commission
    commission_pct = get_commission_rate(propietario_id)
    commission_amount = gross_amount * (commission_pct / 100)

    # Admin fee (if retained by agency)
    admin_retained = sum(c.adminFee for c in cobros) if config.retainAdminFee else 0

    # Get approved deductions (maintenance, repairs)
    deductions = get_approved_deductions(propietario_id, period)
    total_deductions = sum(d.amount for d in deductions)

    net_amount = gross_amount - commission_amount - admin_retained - total_deductions

    return DispersionPreview(
        grossAmount=gross_amount,
        commissionAmount=commission_amount,
        adminFeeRetained=admin_retained,
        deductions=total_deductions,
        netAmount=net_amount,
        deductionDetails=deductions
    )
```

### 4. IPC-Based Rent Adjustment

```python
def calculate_renewal_rent(current_rent: int, ipc_rate: float) -> int:
    """
    Calculate new rent based on Colombian IPC

    IPC = Índice de Precios al Consumidor (Consumer Price Index)
    Source: DANE (Departamento Administrativo Nacional de Estadística)
    """
    new_rent = current_rent * (1 + (ipc_rate / 100))

    # Round to nearest 10,000 COP
    return round(new_rent / 10000) * 10000
```

### 5. Pipeline Stage Transitions

```python
ALLOWED_TRANSITIONS = {
    'nuevo': ['contactado', 'descartado'],
    'contactado': ['visita_programada', 'descartado'],
    'visita_programada': ['visita_realizada', 'descartado'],
    'visita_realizada': ['documentos', 'descartado'],
    'documentos': ['verificacion', 'descartado'],
    'verificacion': ['aprobado', 'descartado'],
    'aprobado': ['contrato', 'descartado'],
    'contrato': ['firmado', 'descartado'],
    'firmado': [],  # Terminal state - converts to lease
    'descartado': []  # Terminal state
}

def transition_stage(item: PipelineItem, new_stage: str) -> PipelineItem:
    if new_stage not in ALLOWED_TRANSITIONS.get(item.stage, []):
        raise InvalidTransitionError(f"Cannot move from {item.stage} to {new_stage}")

    item.stageHistory.append({
        'stage': new_stage,
        'enteredAt': datetime.now().isoformat(),
        'previousStage': item.stage
    })
    item.stage = new_stage

    if new_stage == 'firmado':
        # Auto-create lease
        create_lease_from_pipeline(item)

    return item
```

### 6. Agent Performance Metrics

```python
def calculate_agent_metrics(agent_id: str, period: DateRange) -> AgentMetrics:
    properties = get_agent_properties(agent_id)
    leases = get_agent_leases(agent_id, period)
    cobros = get_cobros_for_properties(properties, period)

    return AgentMetrics(
        activeProperties=len([p for p in properties if p.status == 'active']),
        closedDeals=len(leases),
        monthlyRevenue=sum(c.paidAmount for c in cobros if c.status == 'paid'),
        averageDaysToClose=calculate_avg_days_to_close(leases),
        occupancyRate=calculate_occupancy(properties),
        collectionRate=calculate_collection_rate(cobros),
        satisfactionScore=calculate_satisfaction(agent_id, period),
        renewalRate=calculate_renewal_rate(agent_id, period)
    )

def calculate_occupancy(properties: List[Consignacion]) -> float:
    total = len(properties)
    if total == 0:
        return 0
    rented = len([p for p in properties if p.status == 'rented'])
    return (rented / total) * 100

def calculate_collection_rate(cobros: List[Cobro]) -> float:
    total = len(cobros)
    if total == 0:
        return 100
    on_time = len([c for c in cobros if c.status == 'paid' and c.daysLate == 0])
    return (on_time / total) * 100
```

---

## Database Schema

### PostgreSQL Schema Recommendations

```sql
-- Agency (tenant)
CREATE TABLE agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    nit VARCHAR(20) UNIQUE NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Property Owners
CREATE TABLE propietarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    document_type VARCHAR(10) NOT NULL,
    document_number VARCHAR(50) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    bank_account JSONB,
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(agency_id, document_number)
);

CREATE INDEX idx_propietarios_agency ON propietarios(agency_id);
CREATE INDEX idx_propietarios_search ON propietarios USING gin(to_tsvector('spanish', name || ' ' || email));

-- Agents
CREATE TABLE agentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    document_number VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    avatar_url TEXT,
    commission_rate DECIMAL(5,2) DEFAULT 10,
    hire_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(agency_id, email)
);

-- Properties (Consignaciones)
CREATE TABLE consignaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    propietario_id UUID NOT NULL REFERENCES propietarios(id),
    agente_id UUID REFERENCES agentes(id),

    property_title VARCHAR(255) NOT NULL,
    property_type VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    neighborhood VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    stratum SMALLINT CHECK (stratum BETWEEN 1 AND 6),
    area DECIMAL(10,2),
    rooms SMALLINT,
    bathrooms SMALLINT,
    parking SMALLINT DEFAULT 0,

    monthly_rent INTEGER NOT NULL,
    admin_fee INTEGER DEFAULT 0,
    deposit_amount INTEGER,
    commission_percent DECIMAL(5,2) DEFAULT 10,
    commission_type VARCHAR(20) DEFAULT 'monthly',

    status VARCHAR(20) DEFAULT 'pending',
    current_lease_id UUID,

    photos TEXT[],
    consignment_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consignaciones_agency ON consignaciones(agency_id);
CREATE INDEX idx_consignaciones_propietario ON consignaciones(propietario_id);
CREATE INDEX idx_consignaciones_status ON consignaciones(agency_id, status);

-- Leases
CREATE TABLE leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    consignacion_id UUID NOT NULL REFERENCES consignaciones(id),

    tenant_id UUID NOT NULL,
    tenant_name VARCHAR(255) NOT NULL,
    tenant_email VARCHAR(255),
    tenant_phone VARCHAR(50),
    tenant_document VARCHAR(50),

    monthly_rent INTEGER NOT NULL,
    admin_fee INTEGER DEFAULT 0,
    deposit_amount INTEGER,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',

    contract_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline Items
CREATE TABLE pipeline_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    consignacion_id UUID NOT NULL REFERENCES consignaciones(id),
    agente_id UUID REFERENCES agentes(id),

    candidate_name VARCHAR(255) NOT NULL,
    candidate_email VARCHAR(255),
    candidate_phone VARCHAR(50),
    candidate_document VARCHAR(50),

    stage VARCHAR(50) NOT NULL DEFAULT 'nuevo',
    stage_history JSONB DEFAULT '[]',

    scheduled_visit_date TIMESTAMPTZ,
    documents_received JSONB DEFAULT '{}',
    score INTEGER,
    monthly_income INTEGER,

    notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pipeline_agency_stage ON pipeline_items(agency_id, stage);

-- Cobros (Rent Payments)
CREATE TABLE cobros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    lease_id UUID NOT NULL REFERENCES leases(id),
    consignacion_id UUID NOT NULL REFERENCES consignaciones(id),
    propietario_id UUID NOT NULL REFERENCES propietarios(id),

    period CHAR(7) NOT NULL, -- 'YYYY-MM'
    due_date DATE NOT NULL,

    rent_amount INTEGER NOT NULL,
    admin_fee INTEGER DEFAULT 0,
    late_fee INTEGER DEFAULT 0,
    other_charges INTEGER DEFAULT 0,
    total_amount INTEGER NOT NULL,
    paid_amount INTEGER DEFAULT 0,
    pending_amount INTEGER NOT NULL,

    status VARCHAR(20) DEFAULT 'pending',
    payment_date DATE,
    payment_method VARCHAR(20),
    payment_reference VARCHAR(100),
    days_late INTEGER DEFAULT 0,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(lease_id, period)
);

CREATE INDEX idx_cobros_status ON cobros(agency_id, status);
CREATE INDEX idx_cobros_period ON cobros(agency_id, period);
CREATE INDEX idx_cobros_propietario ON cobros(propietario_id, period);

-- Dispersiones (Owner Payments)
CREATE TABLE dispersiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    propietario_id UUID NOT NULL REFERENCES propietarios(id),

    period CHAR(7) NOT NULL,

    gross_amount INTEGER NOT NULL,
    commission_amount INTEGER NOT NULL,
    admin_fee_retained INTEGER DEFAULT 0,
    deductions INTEGER DEFAULT 0,
    net_amount INTEGER NOT NULL,
    deduction_details JSONB DEFAULT '[]',

    status VARCHAR(20) DEFAULT 'pending',
    scheduled_date DATE NOT NULL,
    processed_date DATE,
    payment_method VARCHAR(20),
    bank_reference VARCHAR(100),

    cobro_ids UUID[] NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(propietario_id, period)
);

-- Maintenance Requests
CREATE TABLE solicitudes_mantenimiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    consignacion_id UUID NOT NULL REFERENCES consignaciones(id),
    propietario_id UUID NOT NULL REFERENCES propietarios(id),
    agente_id UUID REFERENCES agentes(id),

    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'media',

    status VARCHAR(20) DEFAULT 'nueva',
    status_history JSONB DEFAULT '[]',

    provider_name VARCHAR(255),
    provider_phone VARCHAR(50),
    scheduled_date DATE,

    estimated_cost INTEGER,
    actual_cost INTEGER,
    paid_by VARCHAR(20),
    deduct_from_rent BOOLEAN DEFAULT FALSE,

    photos TEXT[],
    completion_photos TEXT[],
    tenant_rating SMALLINT,
    tenant_feedback TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Renovaciones
CREATE TABLE renovaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    lease_id UUID NOT NULL REFERENCES leases(id),
    consignacion_id UUID NOT NULL REFERENCES consignaciones(id),
    propietario_id UUID NOT NULL REFERENCES propietarios(id),

    current_rent INTEGER NOT NULL,
    current_end_date DATE NOT NULL,

    proposed_rent INTEGER NOT NULL,
    proposed_start_date DATE NOT NULL,
    proposed_end_date DATE NOT NULL,
    rent_increase DECIMAL(5,2) NOT NULL,

    ipc_rate DECIMAL(5,2),
    ipc_based_rent INTEGER,

    counter_offer_rent INTEGER,
    final_rent INTEGER,

    status VARCHAR(20) DEFAULT 'pending',
    notification_date DATE,
    response_deadline DATE,

    history JSONB DEFAULT '[]',
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Templates
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),

    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(50),
    version VARCHAR(20) DEFAULT '1.0',

    content TEXT NOT NULL, -- HTML or markdown
    variables TEXT[],

    is_default BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Property Documents
CREATE TABLE property_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    template_id UUID REFERENCES document_templates(id),
    consignacion_id UUID REFERENCES consignaciones(id),
    propietario_id UUID NOT NULL REFERENCES propietarios(id),

    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',

    file_url TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),

    signatures JSONB DEFAULT '[]',

    expires_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actas de Entrega
CREATE TABLE actas_entrega (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),
    type VARCHAR(20) NOT NULL, -- 'entrega' | 'devolucion'

    consignacion_id UUID NOT NULL REFERENCES consignaciones(id),
    lease_id UUID NOT NULL REFERENCES leases(id),
    propietario_id UUID NOT NULL REFERENCES propietarios(id),
    agente_id UUID NOT NULL REFERENCES agentes(id),

    property_title VARCHAR(255) NOT NULL,
    property_address TEXT NOT NULL,

    tenant_name VARCHAR(255) NOT NULL,
    tenant_cedula VARCHAR(50) NOT NULL,
    tenant_phone VARCHAR(50),
    tenant_email VARCHAR(255),

    delivery_date DATE NOT NULL,
    delivery_time TIME,

    rooms TEXT[],
    items JSONB DEFAULT '[]',
    meter_readings JSONB DEFAULT '[]',
    keys_delivered JSONB DEFAULT '[]',

    general_condition VARCHAR(20),
    general_observations TEXT,

    signatures JSONB DEFAULT '[]',

    deposit_amount INTEGER,
    deductions JSONB DEFAULT '[]',
    deposit_to_return INTEGER,

    status VARCHAR(20) DEFAULT 'draft',
    pdf_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Agency Users
CREATE TABLE agency_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id),

    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,

    avatar_url TEXT,
    phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'invited',

    permissions JSONB DEFAULT '[]',

    invited_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(agency_id, email)
);

-- Row Level Security (RLS)
ALTER TABLE propietarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobros ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispersiones ENABLE ROW LEVEL SECURITY;

-- Example RLS policy
CREATE POLICY agency_isolation ON propietarios
    FOR ALL
    USING (agency_id = current_setting('app.current_agency_id')::uuid);
```

---

## Integration Checklist

### Phase 1: Core Infrastructure
- [ ] Set up multi-tenant database with RLS
- [ ] Implement agency authentication
- [ ] Create base CRUD for Propietarios
- [ ] Create base CRUD for Agentes
- [ ] Create base CRUD for Consignaciones

### Phase 2: Transaction Engine
- [ ] Implement Leases management
- [ ] Build Cobros generation system
- [ ] Implement late fee calculations
- [ ] Build Dispersiones calculation
- [ ] Create payment registration flow

### Phase 3: Pipeline & Operations
- [ ] Implement Pipeline with stage transitions
- [ ] Build conversion to lease flow
- [ ] Implement Mantenimiento workflow
- [ ] Implement Renovaciones with IPC

### Phase 4: Documents & Reports
- [ ] Create template system
- [ ] Implement document generation
- [ ] Build Actas de Entrega flow
- [ ] Create all report endpoints
- [ ] Implement PDF/Excel export

### Phase 5: Analytics & Config
- [ ] Build KPI calculation engine
- [ ] Implement trend analysis
- [ ] Build forecasting system
- [ ] Complete configuration endpoints
- [ ] Implement user management

### Phase 6: Integration
- [ ] Connect frontend to APIs
- [ ] Remove mock data
- [ ] Implement real-time updates (WebSocket/SSE)
- [ ] Add email notifications
- [ ] Add WhatsApp integration

---

## Colombian-Specific Considerations

1. **Currency**: All amounts in COP (Colombian Pesos), no decimals
2. **Documents**: CC (Cédula), NIT (Tax ID), CE (Foreign ID), PP (Passport)
3. **IPC**: Annual consumer price index from DANE for rent adjustments
4. **Banks**: Major Colombian banks (Bancolombia, Davivienda, BBVA, etc.)
5. **Departments**: Use `COLOMBIAN_DEPARTMENTS` constant for locations
6. **Date Formats**: ISO 8601 in backend, localized display in frontend
7. **Legal**: Ley 820 de 2003 governs urban leasing in Colombia

---

## Support

For questions about this integration guide, contact the development team.

**Frontend Components**: `src/components/inmobiliaria/`
**Type Definitions**: `src/lib/types/inmobiliaria.ts`
**Mock Data Reference**: `src/lib/data/mock-inmobiliaria.ts`
