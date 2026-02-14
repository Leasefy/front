# Estado de Integracion Frontend - Backend

Ultima actualizacion: 2026-02-14

## Resumen General

| Metrica | Valor |
|---------|-------|
| Total fases backend | 19+ |
| Fases integradas | 6 (Auth, Properties, Applications submit, Landlord Candidates, Documents, Scoring) |
| Fases pendientes | 13 |
| Archivos mock restantes | 28 |
| Contextos con setTimeout | 1 (Onboarding) |
| Controllers backend | 42 |
| Progreso general | ~32% |

---

## Estado Actual por Fase

### INTEGRADAS

| Fase | Nombre | Estado | Detalle |
|------|--------|--------|---------|
| 2 | Auth & Users | 90% | Google OAuth, `/users/me`, onboarding completos. Falta `PATCH /users/me` para editar perfil. |
| 3 | Properties | 95% | Listado, detalle, busqueda, NLP, **crear propiedad con fotos**. Falta: edicion de propiedad. |
| 4 | Applications (submit) | 50% | Enviar aplicacion + upload documentos conectados. Falta: listar aplicaciones desde API (paginas aun usan mock). |

**Archivos creados en Fase 3:**
- `src/lib/api/properties.types.ts` - Tipos del backend
- `src/lib/api/properties.mapper.ts` - Conversor backend -> frontend
- `src/lib/api/properties.service.ts` - propertiesApi (list, getById, getMine, create, update, delete, images)
- `src/lib/hooks/useProperties.ts` - Hooks: useProperties, useProperty, useMyProperties, useFeaturedProperties

**Archivos creados en Fase 4:**
- `src/lib/api/applications.types.ts` - Tipos del backend para aplicaciones
- `src/lib/api/applications.service.ts` - applicationsApi (create, getMine, getById, getByProperty, withdraw, uploadDocument)
- `src/lib/hooks/useApplications.ts` - Hooks: useMyApplications, useApplication, usePropertyApplications

**Paginas migradas a API real (lectura):**
- `/propiedades` - Lista publica con filtros (useProperties)
- `/propiedades/[id]` - Detalle de propiedad (useProperty)
- `/panel/propiedades` - Propiedades del landlord (useMyProperties)
- Homepage - Propiedades destacadas (useFeaturedProperties)
- `/inquilino` - Dashboard tenant (useFeaturedProperties)
- `/aplicar/[propertyId]` - Wizard aplicacion (useProperty)
- `/inquilino/para-ti` - Recomendaciones (useProperties)
- `/inquilino/guardados` - Wishlist (useFeaturedProperties + filtro local)
- `RecommendedProperties.tsx` - Recomendaciones (useProperties)

**Flujos conectados a API real (escritura):**
- PublishContext.submitProperty() -> `propertiesApi.create()` + `propertiesApi.uploadImage()` (antes: setTimeout)
- ApplicationContext.submitApplication() -> `applicationsApi.create()` + `applicationsApi.uploadDocument()` (antes: setTimeout)

**Pendiente en Properties:**
- Edicion de propiedades no conectada (UI para editar ya existe pero no conecta a API)

**Pendiente en Applications:**
- `/inquilino/aplicaciones/page.tsx` - Aun usa `getActiveApplications()` de mock-tenant-applications.ts
- `/inquilino/aplicaciones/[applicationId]/page.tsx` - Aun usa mock
- `ApplicationCard.tsx` - Aun usa mockProperties para buscar propiedad

---

### NO INTEGRADAS (usando mock data)

| Fase | Nombre | Backend listo | Mock files principales | Consumidores |
|------|--------|:------------:|----------------------|:------------:|
| 2.1 | User Roles & Agents | SI | mock-inmobiliaria-*.ts (6 archivos) | ~20 paginas inmobiliaria |
| 3.1 | Property Visits | SI | mock-visits.ts | 5 archivos |
| 3.2 | Natural Search | SI | (integrado via `naturalQuery` param) | Ya migrado |
| 4 | Applications & Documents | SI | mock-tenant-applications.ts | 4 archivos |
| 5 | Scoring Engine | SI | mock-candidates.ts, mock-explanations.ts | 6 archivos |
| 6 | Landlord Features | SI | mock-landlord-data.ts, mock-dashboard.ts | 15+ archivos |
| 7 | Contracts | SI | mock-contracts.ts | 5 archivos |
| 8 | Leases & Payments | SI | mock-leases.ts | 7 archivos |
| 9 | Payment History Scoring | SI | (dentro de mock-leases.ts) | 0 archivos propios |
| 10 | Tenant Payment Simulation | SI | (no hay UI dedicada) | 0 archivos |
| 11 | Notifications | SI | mock-notifications.ts | 2 paginas |
| 12 | Subscriptions & Plans | SI | mock-subscriptions.ts | 8 archivos |
| 13 | Insurance | SI | mock-insurance.ts | 2 componentes |
| 14 | Wishlist & Favorites | SI | (localStorage, backend tiene `/wishlists`) | 1 store |
| 17 | Coupons & Discounts | SI | mock-coupons.ts | 2 archivos |
| 19 | Property Recommendations | SI | (UI existe, backend tiene `/recommendations`) | 2 componentes |

---

## Contextos con Datos Falsos (setTimeout)

| Contexto | Archivo | Estado |
|----------|---------|--------|
| PublishContext | `src/lib/context/PublishContext.tsx` | **CONECTADO** - usa `propertiesApi.create()` + `uploadImage()` |
| ApplicationContext | `src/lib/context/ApplicationContext.tsx` | **CONECTADO** - usa `applicationsApi.create()` + `uploadDocument()` |
| OnboardingContext | `src/lib/context/OnboardingContext.tsx` | Pendiente - ya usa API real en parte, pero tiene setTimeout residual |

---

## Mapa Completo: Mock Files -> Consumidores

### mock-properties.ts (PARCIALMENTE MIGRADO)
Ya no se usa en paginas de listado/detalle. Todavia importado por:
- `src/components/tenant/ApplicationCard.tsx`
- `src/components/settings/PaymentAccountsSection.tsx`
- `src/app/inquilino/aplicaciones/page.tsx`
- `src/app/inquilino/aplicaciones/[applicationId]/page.tsx`
- `src/app/panel/(landlord)/[propertyId]/contract/[candidateId]/page.tsx`
- `src/lib/data/mock-landlord-data.ts` (dependencia interna)
- `src/lib/data/mock-contracts.ts` (dependencia interna)
- `src/lib/data/index.ts` (barrel export)

### mock-candidates.ts
- `src/components/landlord/CandidateCard.tsx`
- `src/app/demo/score/page.tsx`
- `src/app/panel/(landlord)/candidatos/page.tsx`
- `src/app/panel/(landlord)/[propertyId]/page.tsx`
- `src/app/panel/(landlord)/[propertyId]/contract/[candidateId]/page.tsx`
- `src/lib/data/mock-landlord-data.ts`
- `src/lib/data/mock-contracts.ts`

### mock-dashboard.ts (formatCurrency + tipos)
- `src/components/publish/steps/StepReview.tsx` (formatCurrency)
- `src/components/publish/steps/StepPlan.tsx` (formatCurrency)
- `src/components/publish/PublishSuccess.tsx` (formatCurrency)
- `src/components/landlord/DashboardHeader.tsx`
- `src/components/landlord/FinancialHeroSection.tsx`
- `src/components/landlord/RiskDistributionMini.tsx`
- `src/components/landlord/UrgentActionsBanner.tsx`
- `src/components/landlord/UpcomingEventsCard.tsx`
- `src/app/inquilino/pagos/page.tsx`
- `src/app/inquilino/aplicaciones/[applicationId]/page.tsx`
- `src/app/inquilino/arriendo/[leaseId]/page.tsx`
- `src/app/panel/(landlord)/page.tsx`
- `src/app/panel/(landlord)/[propertyId]/page.tsx`
- `src/app/panel/(landlord)/candidatos/page.tsx`
- `src/app/panel/(landlord)/configuracion/page.tsx`

### mock-tenant-applications.ts
- `src/lib/context/TenantApplicationContext.tsx`
- `src/app/inquilino/aplicaciones/page.tsx`
- `src/app/inquilino/aplicaciones/[applicationId]/page.tsx`

### mock-leases.ts
- `src/components/lease/PaymentMethodSelector.tsx`
- `src/app/inquilino/pagos/page.tsx`
- `src/app/inquilino/arriendo/page.tsx`
- `src/app/inquilino/arriendo/[leaseId]/page.tsx`
- `src/app/panel/(landlord)/leases/page.tsx`
- `src/app/panel/(landlord)/configuracion/page.tsx`

### mock-contracts.ts
- `src/components/contract/ContractExpandableItem.tsx`
- `src/app/panel/(landlord)/contratos/page.tsx`
- `src/app/panel/(landlord)/[propertyId]/page.tsx`
- `src/app/panel/(landlord)/[propertyId]/contract/[candidateId]/page.tsx`

### mock-visits.ts
- `src/app/panel/(landlord)/visitas/page.tsx`
- `src/app/panel/(landlord)/[propertyId]/page.tsx`
- `src/app/panel/(landlord)/configuracion/page.tsx`
- `src/app/panel/(landlord)/page.tsx`

### mock-subscriptions.ts
- `src/components/publish/steps/StepReview.tsx`
- `src/components/publish/steps/StepPlan.tsx`
- `src/components/publish/PublishSuccess.tsx`
- `src/components/landlord/DashboardSidebar.tsx`
- `src/components/pricing/PricingTable.tsx`
- `src/components/ui/plan/PlanHeader.tsx`
- `src/app/panel/(landlord)/checkout/page.tsx`
- `src/app/panel/(landlord)/layout.tsx`
- `src/app/panel/(landlord)/configuracion/page.tsx`
- `src/app/panel/(landlord)/upgrade/page.tsx`

### mock-notifications.ts
- `src/app/inquilino/notificaciones/page.tsx`
- `src/app/panel/(landlord)/notificaciones/page.tsx`

### mock-insurance.ts
- `src/components/contract/InsuranceSelector.tsx`
- `src/components/contract/ContractPreview.tsx`

### mock-activity.ts
- `src/components/landlord/ActivityFeed.tsx`
- `src/app/panel/(landlord)/page.tsx`

### mock-landlord-data.ts
- `src/app/panel/(landlord)/[propertyId]/page.tsx`
- `src/app/panel/(landlord)/page.tsx`

### mock-payment-accounts.ts
- `src/components/settings/PaymentAccountsSection.tsx`

### mock-team.ts
- `src/components/settings/TeamManagementSection.tsx`
- `src/components/ui/plan/PlanHeader.tsx`

### mock-search.ts
- `src/components/ui/plan/PlanHeader.tsx`

### mock-coupons.ts
- `src/lib/utils/coupon-validation.ts`
- `src/components/pricing/PriceSummary.tsx`

### mock-chat-responses.ts, mock-agent-executions.ts, mock-decisions.ts, mock-briefings.ts
- `src/lib/hooks/useBetaChat.ts`
- `src/lib/api/mock.ts`

### mock-inmobiliaria*.ts (6 archivos)
- `src/app/panel/inmobiliaria/**/*` (todas las paginas de inmobiliaria, ~15 paginas)
- `src/components/inmobiliaria/**/*` (~8 componentes)
- `src/lib/utils/generate-extracto-pdf.ts`

### mock-users.ts
- `src/lib/data/__tests__/mock-users.test.ts` (solo tests)

---

## Endpoints Backend Completos (42 controllers)

### Core
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| AppController | `/` | GET / | Public |
| HealthController | `/health` | GET / | Public |

### Auth & Users (Fase 2)
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| UsersController | `/users` | GET /me, PATCH /me, POST /me/onboarding, GET /me/onboarding/status | Authenticated |

### Properties (Fase 3)
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| PropertiesController | `/properties` | GET /, GET /mine, GET /:id, POST /, PATCH /:id, DELETE /:id, POST /:id/images, DELETE /:id/images/:imageId, PATCH /:id/images/reorder | Mixed (GET public, POST/PATCH/DELETE = LANDLORD) |
| PropertyAccessController | `/property-access` | POST /assign, DELETE /revoke, GET /property/:id/agents, GET /my-properties | LANDLORD/AGENT |

### Visits (Fase 3.1)
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| VisitsController | `/visits` | POST /, GET /mine, GET /:id, PATCH /:id/confirm, PATCH /:id/reject, PATCH /:id/cancel, PATCH /:id/reschedule, POST /availability, PATCH /availability/:id, GET /property/:id/availability, GET /property/:id/slots | Mixed |

### Applications & Documents (Fase 4)
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| ApplicationsController | `/applications` | POST /, GET /mine, GET /property/:id, GET /:id, PATCH /:id/status, POST /:id/info-request, POST /:id/respond-info, POST /:id/withdraw | Mixed (TENANT/LANDLORD) |
| DocumentsController | `/documents` | POST /upload, GET /:id, DELETE /:id, GET /application/:id | Authenticated |

### Scoring (Fase 5)
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| ScoringController | `/scoring` | GET /application/:id, POST /application/:id/trigger, GET /application/:id/history | LANDLORD |

### Landlord Features (Fase 6)
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| LandlordController | `/landlord` | GET /candidates, GET /candidates/:id, PATCH /candidates/:id/status, GET /candidates/:id/documents, GET /stats | LANDLORD |
| LandlordDashboardController | `/landlord/dashboard` | GET / | LANDLORD |

### Contracts (Fase 7)
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| ContractsController | `/contracts` | POST /, GET /mine, GET /:id, PATCH /:id, POST /:id/sign, POST /:id/activate, PATCH /:id/cancel | Mixed |

### Leases & Payments (Fase 8)
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| LeasesController | `/leases` | GET /, GET /mine, GET /:id, POST /:id/payments | Authenticated |
| LeaseDocumentsController | `/leases` | POST /:id/documents, GET /:id/documents | Authenticated |

### Tenant Payments (Fase 10)
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| TenantPaymentsController | `/tenant-payments` | POST /, GET /mine, GET /:id, GET /lease/:id | TENANT |
| LandlordPaymentMethodsController | `/landlord-payment-methods` | POST /, GET /, GET /:id, PATCH /:id, DELETE /:id | LANDLORD |
| PseMockController | `/pse-mock` | GET /banks (public), POST /process (TENANT) | Mixed |
| DisputesController | `/disputes` | POST /, GET /:id, PATCH /:id | Mixed |
| PaymentValidationController | `/payment-validation` | POST /validate, POST /confirm, GET /:id/receipt-url | LANDLORD |

### Notifications (Fase 11)
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| NotificationTemplatesController | `/notification-templates` | POST /, GET /, GET /:id, PATCH /:id, DELETE /:id | ADMIN |

### Subscriptions (Fase 12)
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| SubscriptionPlansController | `/subscription-plans` | GET /, GET /:id, PATCH /:id/pricing | Mixed (GET public, PATCH ADMIN) |
| SubscriptionsController | `/subscriptions` | POST /, GET /mine, POST /mine/cancel, POST /:id/payment | Authenticated |

### Insurance (Fase 13)
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| InsuranceController | `/insurance` | GET /tiers, POST /calculate, POST /activate, GET /lease/:id | Mixed |

### Wishlist (Fase 14)
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| WishlistsController | `/wishlists` | GET /, POST /, DELETE /:propertyId, GET /check/:propertyId | Authenticated |

### Coupons (Fase 17)
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| CouponsAdminController | `/admin/coupons` | POST /, GET /, PATCH /:id, DELETE /:id | ADMIN |
| CouponsPublicController | `/coupons` | POST /validate | Authenticated |

### Recommendations (Fase 19)
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| RecommendationsController | `/recommendations` | GET /, GET /profile | Authenticated |

### Agents & Inmobiliaria (Fase 2.1)
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| AgentsController | `/agents` | POST /register, GET /mine, PATCH /mine | AGENT |
| AgencyController | `/inmobiliaria/agency` | POST /register, GET /mine, PATCH /mine | AGENT |
| InmobiliariaDashboardController | `/inmobiliaria/dashboard` | GET / | AGENT |
| PipelineController | `/inmobiliaria/pipeline` | GET /, PATCH /:id/stage | AGENT |
| PropietariosController | `/inmobiliaria/propietarios` | CRUD completo | AGENT |
| CobrosController | `/inmobiliaria/cobros` | CRUD + generar | AGENT |
| DispersionesController | `/inmobiliaria/dispersiones` | CRUD + ejecutar | AGENT |
| ConsignacionesController | `/inmobiliaria/consignaciones` | CRUD | AGENT |
| MantenimientoController | `/inmobiliaria/mantenimiento` | CRUD | AGENT |
| RenovacionesController | `/inmobiliaria/renovaciones` | CRUD + IPC | AGENT |
| ActasController | `/inmobiliaria/actas` | CRUD | AGENT |
| DocumentosController | `/inmobiliaria/documentos` | CRUD + upload | AGENT |
| ReportsController | `/inmobiliaria/reports` | GET varios informes | AGENT |
| AnalyticsController | `/inmobiliaria/analytics` | GET metricas | AGENT |

### Otros
| Controller | Ruta base | Endpoints | Auth |
|------------|-----------|-----------|------|
| ChatController | `/chat` | POST /send, GET /conversations, GET /:id/messages | Authenticated |
| ActivityLogController | `/activities` | GET / (feed paginado) | Authenticated |
| TenantDashboardController | `/tenant/dashboard` | GET / | TENANT |

---

## ROADMAP DE INTEGRACION

### Objetivo
Conectar progresivamente el frontend al backend real, priorizando los flujos que permitan **probar el ciclo completo de arriendo**: buscar propiedad -> aplicar -> evaluar candidato -> generar contrato -> arriendo activo.

---

### FASE I-1: Completar Properties (Crear + Editar) - COMPLETADA
**Prioridad: CRITICA** | **Estado: HECHO**

**Que se hizo:**
1. PublishContext.submitProperty() conectado a `propertiesApi.create()` + `propertiesApi.uploadImage()`
2. PropertyDraft se mapea directamente a los campos de create()
3. StepPhotos ahora guarda File objects (via addPhotoFiles/removePhotoFile/reorderPhotoFiles)
4. Error handling con `submissionError` y display en PublishShell
5. `createdPropertyId` disponible despues de crear

**Archivos modificados:**
- `src/lib/context/PublishContext.tsx` - API real con manejo de errores
- `src/components/publish/steps/StepPhotos.tsx` - guarda File objects para upload
- `src/components/publish/PublishShell.tsx` - muestra errores de submission

**Pendiente:** Edicion de propiedades (menor prioridad)

**Test:** Login como landlord -> Publicar propiedad con fotos -> Verificar que aparece en `/propiedades` y `/panel/propiedades`

---

### FASE I-2: Applications (Aplicar a propiedad) - PARCIALMENTE COMPLETADA
**Prioridad: CRITICA** | **Estado: 60% HECHO**

**Que se hizo:**
1. Creado `src/lib/api/applications.types.ts` - tipos BackendApplication, CreateApplicationDto
2. Creado `src/lib/api/applications.service.ts` - applicationsApi con create, getMine, getById, getByProperty, withdraw, uploadDocument
3. Creado `src/lib/hooks/useApplications.ts` - useMyApplications, useApplication, usePropertyApplications
4. Conectado `ApplicationContext.submitApplication()` a `POST /applications` + upload documentos
5. Error handling con `submissionError`

**Pendiente (paginas display):**
- Migrar `src/app/inquilino/aplicaciones/page.tsx` de mock -> useMyApplications (usa TenantApplication type)
- Migrar `src/app/inquilino/aplicaciones/[applicationId]/page.tsx` de mock -> useApplication
- Migrar `src/components/tenant/ApplicationCard.tsx` de mockProperties -> property data from backend

**Nota:** Las paginas de listado usan `TenantApplication` type (display) que es diferente de `Application` (wizard form). El backend retorna datos que deben mapearse a ambos.

**Test disponible:** Login como tenant -> Aplicar a una propiedad (wizard completo) -> Verificar en backend que la aplicacion llego con datos + documentos

---

### FASE I-3: Landlord Candidates (Ver y gestionar candidatos) ✅ COMPLETADA
**Prioridad: CRITICA** | **Esfuerzo: Alto** | **Prerequisito: I-2**

**Completado:**
1. Creado `src/lib/api/landlord.types.ts` - BackendCandidate, BackendRiskScore, BackendLandlordProperty, BackendLandlordDashboard, CandidateDecisionDto
2. Creado `src/lib/api/landlord.service.ts` - landlordApi con getCandidates, getCandidate, getRiskScore, decideCandidate, addNote, getNotes, getMyProperties, getMyProperty, getDashboard
3. Creado `src/lib/hooks/useLandlord.ts` - useCandidates, useCandidate, useRiskScore, useCandidateDecision, useCandidateNotes, useLandlordProperties, useLandlordProperty, useLandlordDashboard
4. Migrado `src/app/panel/(landlord)/candidatos/page.tsx` - reemplazado getAllCandidates/getCandidateById mock -> useCandidates hook + decide API
5. Migrado `src/app/panel/(landlord)/[propertyId]/page.tsx` - reemplazado getLandlordProperty/getCandidatesForProperty mock -> useLandlordProperty + useCandidates hooks + decide API
6. Migrado `src/app/panel/(landlord)/page.tsx` - reemplazado LANDLORD_PROPERTIES mock -> useLandlordProperties hook
7. Conectado aceptar/rechazar/pre-aprobar candidato a `POST /candidates/:id/decision`
8. Agregado formatCurrency local para eliminar dependencia de mock-dashboard en paginas migradas
9. Loading states y error handling en todas las paginas migradas

**Nota:** Visits y Contracts en [propertyId]/page.tsx todavia usan mock data (seran migrados en fases posteriores). Dashboard sidebar (activity, events) tambien usa mock data parcial.

**Test disponible:** Login como landlord -> Ver dashboard con propiedades reales -> Click en propiedad -> Ver candidatos de la API -> Aprobar/Rechazar candidato -> Verificar estado cambiado en backend

---

### FASE I-4: Documents Upload ✅ COMPLETADA
**Prioridad: ALTA** | **Esfuerzo: Medio** | **Prerequisito: I-2**

**Archivos creados:**
- `src/lib/api/documents.types.ts` - Tipos: BackendDocumentFull, UploadDocumentDto
- `src/lib/api/documents.service.ts` - documentsApi (getById, getByApplication, getByCandidateApplication, upload, delete, getDownloadUrl)
- `src/lib/hooks/useDocuments.ts` - Hooks: useApplicationDocuments, useCandidateDocuments, useDocumentUpload, useDocumentDelete

**Paginas migradas:**
1. `src/app/panel/(landlord)/[propertyId]/page.tsx` - Seccion documentos del candidato ahora usa useCandidateDocuments hook en vez de boolean flags (hasIdDocument, etc). Preview modal muestra imagen/PDF real con URL del backend. Download con link real.
2. `src/app/inquilino/documentos/page.tsx` - Completamente reescrita. Antes: 12 documentos mock hardcodeados (contratos, recibos). Ahora: Fetches documentos reales de todas las aplicaciones del tenant via useMyApplications + documentsApi.getByApplication. Preview con image/PDF viewer. Download con URL real.

**Nota:** Upload ya estaba integrado desde I-2 via ApplicationContext.submitApplication() -> applicationsApi.uploadDocument()

**Test disponible:** Tenant sube documentos en aplicacion -> Tenant ve documentos en /inquilino/documentos -> Landlord ve documentos del candidato en /panel/[propertyId] -> Ambos pueden previsualizar y descargar

---

### FASE I-5: Scoring (Scores reales) ✅ COMPLETADA
**Prioridad: ALTA** | **Esfuerzo: Medio** | **Prerequisito: I-3**

**Resultado:** No se necesita scoring.service.ts separado. `landlordApi.getRiskScore()` (creado en I-3) ya cubre el endpoint `GET /candidates/:id/risk-score`. El hook `useRiskScore` tambien ya existe en useLandlord.ts.

**Paginas migradas:**
1. `src/components/landlord/CandidateCard.tsx` - Eliminada dependencia de MOCK_CANDIDATES. Ahora acepta prop `fullCandidate?: Candidate` para mostrar metricas (income, employment, history). Score y riskLevel ya vienen del API via LandlordCandidate.
2. `src/app/panel/(landlord)/propiedades/page.tsx` - Eliminada dependencia de getCandidatesByProperty mock. Ahora usa useLandlordProperties que incluye candidateCount real del API.

**Nota:** demo/score page conserva mock data intencionalmente (es un demo). Contract page sera migrada en fase de contratos.

**Test:** Score de candidato se muestra desde API real. LevelBadge y numericScore del candidato son datos reales del backend.

---

### >>> CHECKPOINT DE PRUEBAS PRINCIPAL <<<

**Al completar I-1 a I-5 puedes probar el flujo completo:**
1. Landlord crea propiedad con fotos
2. Tenant busca propiedades (filtros + NLP)
3. Tenant aplica a propiedad (datos + documentos)
4. Landlord ve candidatos con scores reales
5. Landlord acepta/rechaza candidatos
6. Documentos se suben y descargan correctamente

---

### FASE I-6: Visits (Agendar visitas)
**Prioridad: MEDIA** | **Esfuerzo: Medio** | **Prerequisito: I-1**

**Que se hace:**
1. Crear `src/lib/api/visits.service.ts`
2. Crear `src/lib/hooks/useVisits.ts`
3. Migrar `src/app/panel/(landlord)/visitas/page.tsx`
4. Integrar slots disponibles y agendamiento

**Mock files a reemplazar:** mock-visits.ts

**Test:** Tenant agenda visita -> Landlord confirma/rechaza -> Ambos ven estado actualizado

---

### FASE I-7: Contracts (Generar contratos)
**Prioridad: MEDIA** | **Esfuerzo: Alto** | **Prerequisito: I-3**

**Que se hace:**
1. Crear `src/lib/api/contracts.service.ts`
2. Migrar `src/app/panel/(landlord)/contratos/page.tsx`
3. Migrar `src/app/panel/(landlord)/[propertyId]/contract/[candidateId]/page.tsx`
4. Conectar generacion de contrato, firma y activacion

**Mock files a reemplazar:** mock-contracts.ts

**Test:** Landlord acepta candidato -> Genera contrato -> Ambas partes firman -> Contrato se activa

---

### FASE I-8: Leases & Payments (Arriendos activos)
**Prioridad: MEDIA** | **Esfuerzo: Alto** | **Prerequisito: I-7**

**Que se hace:**
1. Crear `src/lib/api/leases.service.ts`
2. Migrar `src/app/inquilino/arriendo/` (paginas de arriendo)
3. Migrar `src/app/inquilino/pagos/page.tsx`
4. Migrar `src/app/panel/(landlord)/leases/page.tsx`
5. Conectar registro de pagos

**Mock files a reemplazar:** mock-leases.ts, mock-payment-accounts.ts

**Test:** Contrato activado crea lease -> Tenant ve su arriendo -> Registra pago -> Landlord confirma

---

### FASE I-9: Dashboard Landlord (Datos reales)
**Prioridad: MEDIA** | **Esfuerzo: Medio** | **Prerequisito: I-3, I-6, I-7**

**Que se hace:**
1. Integrar `GET /landlord/dashboard` para estadisticas
2. Integrar `GET /activities` para feed de actividad
3. Migrar todos los componentes del dashboard: FinancialHeroSection, UrgentActionsBanner, ActivityFeed, etc.

**Mock files a reemplazar:** mock-dashboard.ts, mock-activity.ts

**Nota:** formatCurrency de mock-dashboard se usa en ~15 archivos. Extraer a una utilidad independiente antes de eliminar el mock.

---

### FASE I-10: Subscriptions & Plans
**Prioridad: MEDIA** | **Esfuerzo: Medio** | **Prerequisito: I-1**

**Que se hace:**
1. Crear `src/lib/api/subscriptions.service.ts`
2. Migrar flujo de publicacion (StepPlan, StepReview, checkout)
3. Migrar `src/app/panel/(landlord)/upgrade/page.tsx`
4. Integrar validacion de cupones con `POST /coupons/validate`

**Mock files a reemplazar:** mock-subscriptions.ts, mock-coupons.ts

---

### FASE I-11: Notifications
**Prioridad: BAJA** | **Esfuerzo: Bajo** | **Prerequisito: Ninguno**

**Que se hace:**
1. Migrar `src/app/inquilino/notificaciones/page.tsx`
2. Migrar `src/app/panel/(landlord)/notificaciones/page.tsx`

**Mock files a reemplazar:** mock-notifications.ts

---

### FASE I-12: Wishlist Backend
**Prioridad: BAJA** | **Esfuerzo: Bajo** | **Prerequisito: Ninguno**

**Que se hace:**
1. Crear `src/lib/api/wishlists.service.ts`
2. Reemplazar localStorage por API (`GET /wishlists`, `POST /wishlists`, `DELETE /wishlists/:id`)
3. Actualizar `src/lib/stores/wishlist.tsx`

---

### FASE I-13: Inmobiliaria / Agents
**Prioridad: BAJA** | **Esfuerzo: MUY Alto** | **Prerequisito: I-1 a I-8**

**Que se hace:**
1. Conectar registro de inmobiliaria a `POST /inmobiliaria/agency/register`
2. Migrar ~15 paginas de `/panel/inmobiliaria/` a endpoints reales
3. Migrar ~8 componentes de `src/components/inmobiliaria/`

**Mock files a reemplazar:** mock-inmobiliaria*.ts (6 archivos), mock-inmobiliaria-core.ts, etc.

**Nota:** Esta es la integracion mas grande. El backend tiene 14 controllers dedicados a inmobiliaria. Recomendado hacer despues de que todo el flujo basico funcione.

---

### FASE I-14: Chat, Insurance, Recommendations, Tenant Payments
**Prioridad: BAJA** | **Esfuerzo: Variable** | **Prerequisito: Variable**

- **Chat:** Conectar `useBetaChat.ts` a `POST /chat/send` (reemplaza mock-chat-responses, mock-decisions, mock-briefings, mock-agent-executions)
- **Insurance:** Conectar InsuranceSelector a `GET /insurance/tiers` (reemplaza mock-insurance.ts)
- **Recommendations:** Ya tiene UI, conectar a `GET /recommendations` del backend
- **Tenant Payments:** Conectar flujo PSE mock a `POST /pse-mock/process`

---

## Recomendacion: Integracion Minima para Pruebas Completas

Para poder probar **crear propiedades, aplicar, buscar, postular, aceptar/rechazar, y cargar documentos**, necesitas completar:

| Fase | Nombre | Resultado |
|------|--------|-----------|
| I-1 | Completar Properties | Crear y editar propiedades reales |
| I-2 | Applications | Aplicar a propiedades con datos y documentos |
| I-3 | Landlord Candidates | Ver, aceptar y rechazar candidatos |
| I-4 | Documents Upload | Subir y descargar documentos |
| I-5 | Scoring | Ver scores reales de candidatos |

**Esto son las fases I-1 a I-5.** Con ellas tienes el flujo critico completo y puedes hacer pruebas end-to-end reales.

Si ademas quieres probar el flujo completo hasta firma de contrato, agrega I-7 (Contracts) y I-8 (Leases).

---

## Notas Tecnicas

- El `apiClient` auto-inyecta Bearer token desde Supabase session
- La paginacion del backend usa `?page=1&limit=10` y retorna `{ data, meta: { total, page, limit, totalPages, hasNext, hasPrev } }`
- Los archivos se suben como `FormData` (no JSON) a endpoints de imagenes/documentos
- Los IDs hardcoded (`'landlord-001'`, `'user-tenant-1'`) deben reemplazarse por `user.id` del AuthContext
- El mapper `mapBackendProperty()` convierte UPPERCASE -> lowercase enums automaticamente
- `formatCurrency()` de mock-dashboard.ts se usa en ~15 archivos - extraer a utilidad antes de eliminar el mock
- El backend usa `@Roles(Role.LANDLORD)` - los AGENT tienen acceso automatico a endpoints de LANDLORD via RolesGuard
