# Estado de Integracion Frontend - Backend

Ultima actualizacion: 2026-02-17

## Resumen General

| Metrica | Valor |
|---------|-------|
| Total fases backend | 19+ |
| Fases integradas | 21 (Auth, Properties, Applications, Landlord Candidates, Documents, Scoring, Visits, Contracts, Leases & Payments, Dashboard Landlord, Subscriptions & Coupons, Notifications, Insurance, Payment Scoring, Payment Simulation, Wishlist, Recommendations, Inmobiliaria Pipeline, Inmobiliaria Full, Settings) |
| Fases pendientes | 0 |
| Archivos mock restantes | 7 (intencionales: 3 demo/tests + 4 beta AI) |
| Controllers backend | 42 |
| Progreso general | **100%** |

---

## Estado Actual por Fase

### INTEGRADAS

| Fase | Nombre | Estado | Detalle |
|------|--------|--------|---------|
| 2 | Auth & Users | **100%** | Google OAuth, `/users/me`, onboarding, edicion de perfil completos. |
| 3 | Properties | **100%** | Listado, detalle, busqueda, NLP, crear propiedad con fotos, edicion completos. |
| 3.1 | Property Visits | **100%** | CRUD completo: listar, crear, confirmar, cancelar, reagendar. 4 paginas migradas, 0 mock imports restantes. |
| 4 | Applications (submit + display) | **100%** | Enviar aplicacion + upload documentos + listar/detalle conectados. Timeline generada desde status (aceptable). Legacy context y mock eliminados. |
| 5 | Landlord Candidates | **100%** | landlordApi con getCandidates, getCandidate, getRiskScore, decideCandidate. Hooks: useCandidates, useCandidate, useRiskScore, useCandidateDecision. 3 paginas migradas. Aceptar/rechazar via API. |
| 6 | Documents Upload | **100%** | documentsApi con getById, getByApplication, upload, delete, getDownloadUrl. Hooks: useApplicationDocuments, useCandidateDocuments. 2 paginas migradas. |
| 7 | Scoring | **100%** | Usa landlordApi.getRiskScore() de I-5. CandidateCard y propiedades migradas. Score real del backend. |
| 8 | Contracts | **100%** | contractsApi con getMine, getById, create, sign, activate, cancel. 3 paginas migradas. Templates desde constants. |
| 9 | Leases & Payments | **100%** | Arriendos + pagos conectados. 7 archivos migrados, 0 mock-leases imports restantes. Pagos lazy-load en landlord. |
| 10 | Dashboard Landlord | **100%** | Dashboard `/panel` conectado a `GET /dashboard/landlord`. Stats, urgent actions, upcoming events, activity feed desde API real. formatCurrency migrado de mock a lib/format + useI18n. 3 mock files eliminados. |
| 11 | Subscriptions & Coupons | **100%** | Datos estaticos de planes extraidos a `constants/subscription-plans.ts`. Suscripcion del usuario via `GET /subscriptions/mine` (useMySubscription hook). Cupones validados via `POST /coupons/validate`. 12 archivos migrados, 3 archivos eliminados (mock-subscriptions.ts, mock-coupons.ts, coupon-validation.ts). |
| 12 | Notifications + Orphan Cleanup | **100%** | notificationsApi con getMine, markAsRead, markAllAsRead, delete. Hooks: useLandlordNotifications, useTenantNotifications. 2 paginas migradas. 4 mock files eliminados (mock-notifications.ts + 3 huerfanos: mock-leases.ts, mock-contracts.ts, mock-visits.ts). |
| 13 | Insurance | **100%** | Datos estaticos extraidos a `constants/insurance-policies.ts`. 2 componentes migrados (InsuranceSelector, ContractPreview). mock-insurance.ts eliminado. |
| 9 | Payment History Scoring | **100%** | Sin trabajo frontend propio. mock-leases.ts (que contenia los datos) ya fue eliminado en Fase 12. Backend endpoint listo. |
| 10 | Tenant Payment Simulation | **100%** | Sin UI dedicada ni mock file propio. Backend endpoint listo. |
| 14 | Wishlist & Favorites | **100%** | WishlistProvider migrado de localStorage-only a API-first con localStorage fallback. wishlists.service.ts creado (getMine, add, remove, check). Optimistic updates con fire-and-forget API sync. |
| 19 | Property Recommendations | **100%** | recommendationsApi creado (GET /recommendations). useRecommendations hook con fallback a scoring client-side. RecommendedProperties.tsx usa API first, fallback a getRecommendedProperties. |
| 20 | Inmobiliaria - Pipeline | **100%** | Pipeline page migrada a API. Hooks: usePipelineItems, useAgentes, useConsignaciones. pipelineApi.moveStage() para cambios de stage. Optimistic updates + refetch. 1 pagina migrada. |
| 21 | Inmobiliaria - Full | **100%** | Todas las ~14 paginas restantes migradas a hooks API. 7 mock-inmobiliaria files eliminados. generate-extracto-pdf.ts refactorizado para aceptar params. |
| 22 | Settings & Cleanup | **100%** | PaymentAccountsSection migrado a paymentMethodsApi. mock-team.ts → constants/team-data.ts. mock-search.ts → constants/search-data.ts. mock-properties.ts eliminado (0 imports). |

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

**Properties: COMPLETADO** - Listado, detalle, busqueda, NLP, crear con fotos, edicion conectados.

**Applications - Limpieza completada (2026-02-16):**
- Eliminado `TenantApplicationContext.tsx` (201 lineas, context legacy con localStorage + mock)
- Eliminado `mock-tenant-applications.ts` (373 lineas, datos mock huerfanos)
- Simplificado `mis-aplicaciones/layout.tsx` (removido TenantApplicationProvider wrapper)
- Limpiado barrel export de `ApplicationDetail` en `components/tenant/index.ts`
- Timeline de eventos se genera desde status (aceptable, no bloquea)

**Archivos creados en Fase 3.1 (Visits):**
- `src/lib/api/visits.types.ts` - Tipos del backend para visitas
- `src/lib/api/visits.service.ts` - visitsApi (getMine, getById, create, confirm, reject, cancel, reschedule)
- `src/lib/hooks/useVisits.ts` - Hooks: useVisits, useVisit, useVisitActions

**Paginas migradas a API real (Visits):**
- `/panel/visitas` - Lista de visitas con acciones (confirm, cancel, reschedule, complete, create)
- `/panel/[propertyId]` - Tab visitas por propiedad (getForProperty)
- `/panel` - Dashboard upcoming visits (getUpcoming)
- `/panel/configuracion` - Conteo de visitas pendientes (stats.requested)

**Archivos creados en Fase 7 (Contracts):**
- `src/lib/constants/contract-templates.ts` - Templates legales estaticos (Ley 820/2003) extraidos de mock
- `src/lib/api/contracts.types.ts` - Tipos del backend para contratos
- `src/lib/api/contracts.service.ts` - contractsApi (getMine, getById, create, sign, activate, cancel)
- `src/lib/hooks/useContracts.ts` - Hooks: useContracts, useContract, useContractActions

**Paginas migradas a API real (Contracts):**
- `/panel/contratos` - Lista contratos con tabs (pending, active, all) + loading/error states
- `/panel/[propertyId]` - Tab contratos por propiedad (getForProperty)
- `/panel/[propertyId]/contract/[candidateId]` - Flujo completo: crear contrato via API, firmar via API
- `ContractExpandableItem.tsx` - Templates desde constants (no mock)

**Nota:** `mock-contracts.ts` ya no tiene imports (mock-dashboard.ts eliminado en Fase 9). Candidato a eliminacion.

**Archivos creados en Fase 8 (Leases & Payments):**
- `src/lib/constants/payment-methods.ts` - PAYMENT_METHODS estaticos (PSE, Nequi, Daviplata, etc.)
- `src/lib/api/leases.types.ts` - Tipos del backend para arriendos y pagos
- `src/lib/api/leases.service.ts` - leasesApi (getMine, getById, getPayments, getMyPayments) con mapeo UPPERCASE->lowercase
- `src/lib/hooks/useLeases.ts` - Hooks: useLeases, useLease, useLeasePayments, useMyPayments

**Paginas migradas a API real (Leases & Payments):**
- `/inquilino/arriendo` - Lista arriendos del tenant (useLeases + useMyPayments)
- `/inquilino/arriendo/[leaseId]` - Detalle de arriendo + historial de pagos (useLease + useLeasePayments)
- `/inquilino/pagos` - Pagos consolidados del tenant (useLeases + useMyPayments)
- `/panel/leases` - Arriendos del landlord con tabs (useLeases + lazy-load payments via LeaseExpandableItem)
- `/panel/configuracion` - Check de arriendos activos (useLeases().getActive())
- `PaymentMethodSelector.tsx` - PAYMENT_METHODS de constants (no mock)
- `LeaseExpandableItem.tsx` - useLeasePayments con lazy-load cuando se expande

**Archivos modificados en Fase 9 (Dashboard Landlord):**
- `src/lib/api/landlord.types.ts` - Agregados display types: DashboardData, DashboardFinancialStats, DashboardUrgentAction, DashboardUpcomingEvent, DashboardActivity
- `src/lib/api/landlord.service.ts` - Agregados mappers backend->display + getDashboardForDisplay()
- `src/lib/hooks/useLandlord.ts` - useLandlordDashboard retorna DashboardData (mapeado) en vez de BackendLandlordDashboard

**Paginas migradas a API real (Dashboard):**
- `/panel` - Dashboard landlord completo (stats, urgent actions, upcoming events, activity feed)

**formatCurrency migrado de mock-dashboard a lib/format o useI18n:**
- `DashboardHeader.tsx` -> useI18n().formatCurrency
- `configuracion/page.tsx` -> formatCurrency de lib/format
- `StepReview.tsx` -> eliminado import no usado de mock-dashboard (ya usaba formatCurrency de lib/format)
- `StepPlan.tsx` -> formatCurrency de lib/format
- `PublishSuccess.tsx` -> formatCurrency de lib/format

**Tipos migrados de mock-dashboard/mock-activity a landlord.types:**
- `FinancialHeroSection.tsx` -> DashboardFinancialStats
- `RiskDistributionMini.tsx` -> inline RiskDistribution type
- `UrgentActionsBanner.tsx` -> DashboardUrgentAction
- `UpcomingEventsCard.tsx` -> DashboardUpcomingEvent
- `ActivityFeed.tsx` -> DashboardActivity

**Mock files eliminados (3):**
- ~~`src/lib/data/mock-activity.ts`~~ (ELIMINADO - 0 imports restantes)
- ~~`src/lib/data/mock-dashboard.ts`~~ (ELIMINADO - 0 imports restantes)
- ~~`src/lib/data/mock-landlord-data.ts`~~ (ELIMINADO - solo lo importaba mock-dashboard.ts)

**Nota:** Con la eliminacion de mock-dashboard.ts, `mock-contracts.ts` y `mock-leases.ts` ya no tienen imports directos y pueden eliminarse en futuras fases.

**Archivos creados en Fase 11 (Subscriptions & Coupons):**
- `src/lib/constants/subscription-plans.ts` - PLANS, AGENCY_PLANS, PLAN_FEATURES, PLAN_COMPARISON, MANAGEMENT_TIERS, ADD_ONS + utils (getPlanById, getYearlySavings, etc.)
- `src/lib/api/subscriptions.types.ts` - BackendSubscription, CreateSubscriptionDto, ValidateCouponDto, DisplaySubscription
- `src/lib/api/subscriptions.service.ts` - subscriptionsApi (getMySubscription, createSubscription, cancelSubscription, validateCoupon) con mappers
- `src/lib/hooks/useSubscription.ts` - Hooks: useMySubscription, useCouponValidation

**Archivos migrados en Fase 11 (12 archivos):**
- `StepPlan.tsx`, `StepReview.tsx`, `PublishSuccess.tsx`, `PricingTable.tsx`, `AddOnCard.tsx`, `ManagementTierCard.tsx` -> imports de constants/subscription-plans (datos estaticos)
- `checkout/page.tsx` -> getPlanById de constants/subscription-plans
- `DashboardSidebar.tsx`, `PlanHeader.tsx`, `layout.tsx`, `upgrade/page.tsx`, `configuracion/page.tsx` -> useMySubscription() hook (suscripcion real)
- `CouponInput.tsx` -> subscriptionsApi.validateCoupon() (validacion backend)
- `PriceSummary.tsx` -> calculos inline desde AppliedCoupon (sin mock lookup)

**Archivos eliminados en Fase 11 (3):**
- ~~`src/lib/data/mock-subscriptions.ts`~~ (ELIMINADO)
- ~~`src/lib/data/mock-coupons.ts`~~ (ELIMINADO)
- ~~`src/lib/utils/coupon-validation.ts`~~ (ELIMINADO - reemplazado por API + calculos inline)

**Archivos creados en Fase 12 (Notifications + Orphan Cleanup):**
- `src/lib/api/notifications.types.ts` - BackendNotification, mappers (mapToLandlordNotification, mapToTenantNotification)
- `src/lib/api/notifications.service.ts` - notificationsApi (getMine, getLandlordNotifications, getTenantNotifications, markAsRead, markAllAsRead, deleteNotification) + filter options + helpers
- `src/lib/hooks/useNotifications.ts` - Hooks: useLandlordNotifications, useTenantNotifications (optimistic updates)

**Paginas migradas a API real (Notifications):**
- `/panel/notificaciones` - Notificaciones landlord (useLandlordNotifications hook)
- `/inquilino/notificaciones` - Notificaciones tenant (useTenantNotifications hook)

**Mock files eliminados en Fase 12 (4):**
- ~~`src/lib/data/mock-notifications.ts`~~ (ELIMINADO - migrado a API)
- ~~`src/lib/data/mock-leases.ts`~~ (ELIMINADO - orphan, 0 imports)
- ~~`src/lib/data/mock-contracts.ts`~~ (ELIMINADO - orphan, 0 imports)
- ~~`src/lib/data/mock-visits.ts`~~ (ELIMINADO - orphan, 0 imports)

**Archivos creados en Fase 13 (Insurance):**
- `src/lib/constants/insurance-policies.ts` - INSURANCE_POLICIES, getInsuranceById, getRecommendedInsurance, getInsuranceByTier, getDefaultInsuranceSelection

**Archivos migrados en Fase 13 (2):**
- `InsuranceSelector.tsx` -> INSURANCE_POLICIES de constants/insurance-policies
- `ContractPreview.tsx` -> getInsuranceById de constants/insurance-policies

**Mock files eliminados en Fase 13 (1):**
- ~~`src/lib/data/mock-insurance.ts`~~ (ELIMINADO)

**Archivos creados en Fase 14 (Wishlist):**
- `src/lib/api/wishlists.service.ts` - wishlistsApi (getMine, add, remove, check)

**Archivos modificados en Fase 14:**
- `src/lib/stores/wishlist.tsx` - WishlistProvider ahora carga desde API si hay sesion autenticada, localStorage como fallback. toggle/add/remove hacen fire-and-forget API sync.

**Archivos creados en Fase 19 (Recommendations):**
- `src/lib/api/recommendations.service.ts` - recommendationsApi (getMine) con mappers BackendRecommendation -> RecommendedProperty
- `src/lib/hooks/useRecommendations.ts` - useRecommendations hook (API first, source indicator para fallback)

**Archivos modificados en Fase 19:**
- `src/components/tenant/RecommendedProperties.tsx` - Usa useRecommendations para intentar API first, fallback a client-side scoring con getRecommendedProperties

**Archivos creados en Fase 20 (Inmobiliaria - Pipeline):**
- `src/lib/api/inmobiliaria.service.ts` - API completa de inmobiliaria: propietariosApi, agentesApi, consignacionesApi, pipelineApi, cobrosApi, dispersionesApi, mantenimientoApi, renovacionesApi, reportesApi, analyticsApi, documentosApi, actasApi, inmobiliariaConfigApi, inmobiliariaDashboardApi
- `src/lib/hooks/useInmobiliaria.ts` - Hooks completos: usePropietarios, useAgentes, useConsignaciones, usePipelineItems, useCobros, useDispersiones, useMantenimientos, useRenovaciones, useReportes, useAnalytics, useDocumentTemplates, useActasEntrega, useInmobiliariaConfig + re-exports de API services

**Paginas migradas a API real (Fase 20 - Pipeline):**
- `/panel/inmobiliaria/pipeline` - Pipeline completo migrado a hooks (usePipelineItems, useAgentes, useConsignaciones). Optimistic updates en handleStageChange con pipelineApi.moveStage(). Loading state con Spinner. Stats calculados desde items. Filters funcionando con datos API.

**Archivos creados en Fase 21 (Inmobiliaria Full):**
- `src/lib/api/inmobiliaria.service.ts` - API actualizada: corregido apiClient.put → apiClient.patch, agregados metodos faltantes (mantenimientoApi.updateStatus, mantenimientoApi.approveQuote, renovacionesApi.updateStatus, renovacionesApi.addNote)

**Paginas migradas a API real (Fase 21 - Inmobiliaria Full, ~14 paginas):**
- `/panel/inmobiliaria/portafolio` - useConsignaciones + useAgentes + usePropietarios
- `/panel/inmobiliaria/portafolio/[id]` - useConsignaciones(id) + usePropietarios + useAgentes
- `/panel/inmobiliaria/portafolio/nuevo` - consignacionesApi.create + usePropietarios + useAgentes
- `/panel/inmobiliaria/propietarios` - usePropietarios
- `/panel/inmobiliaria/propietarios/[id]` - usePropietarios(id) + useConsignaciones + useDispersiones
- `/panel/inmobiliaria/agentes` - useAgentes
- `/panel/inmobiliaria/agentes/[id]` - useAgentes(id) + useConsignaciones
- `/panel/inmobiliaria/cobros` - useCobros + cobrosApi.registerPayment
- `/panel/inmobiliaria/dispersiones` - useDispersiones + usePropietarios
- `/panel/inmobiliaria/dispersiones/generar` - dispersionesApi.create + usePropietarios + useCobros
- `/panel/inmobiliaria/operaciones` - useMantenimientos + useRenovaciones
- `/panel/inmobiliaria/reportes` - useReportes + useInmobiliariaConfig
- `/panel/inmobiliaria/analytics` - useAnalytics
- `/panel/inmobiliaria/documentos` - useDocumentTemplates + useActasEntrega
- `/panel/inmobiliaria/configuracion` - useInmobiliariaConfig + inmobiliariaConfigApi.update
- `/panel/inmobiliaria/page.tsx` (dashboard) - inmobiliariaDashboardApi.get

**Utilidad refactorizada (Fase 21):**
- `src/lib/utils/generate-extracto-pdf.ts` - Cambiada firma para aceptar config y propietario como parametros (no puede usar hooks por ser funcion utilitaria)

**Mock files eliminados en Fase 21 (7):**
- ~~`src/lib/data/mock-inmobiliaria.ts`~~ (ELIMINADO)
- ~~`src/lib/data/mock-inmobiliaria-core.ts`~~ (ELIMINADO)
- ~~`src/lib/data/mock-inmobiliaria-operations.ts`~~ (ELIMINADO)
- ~~`src/lib/data/mock-inmobiliaria-reports.ts`~~ (ELIMINADO)
- ~~`src/lib/data/mock-inmobiliaria-settings.ts`~~ (ELIMINADO)
- ~~`src/lib/data/mock-inmobiliaria-documents.ts`~~ (ELIMINADO)
- ~~`src/lib/data/mock-inmobiliaria-analytics.ts`~~ (ELIMINADO)

**Archivos creados en Fase 22 (Settings & Cleanup):**
- `src/lib/api/payment-methods.service.ts` - paymentMethodsApi (getAll, getById, create, update, delete, getAssignments, assignProperty, unassignProperty)
- `src/lib/constants/team-data.ts` - getTeamMembers, getActiveTeamMembers, getPendingInvites (movido de mock-team.ts, sin endpoint backend)
- `src/lib/constants/search-data.ts` - searchData, groupSearchResults, getCategoryLabel, getRecentSearches, getQuickLinks (movido de mock-search.ts, utilidad de UI)

**Archivos migrados en Fase 22 (4):**
- `PaymentAccountsSection.tsx` → paymentMethodsApi + useMyProperties (API real)
- `TeamManagementSection.tsx` → import de constants/team-data (datos estaticos)
- `PlanHeader.tsx` → imports de constants/team-data + constants/search-data (datos estaticos)
- `src/lib/data/index.ts` → barrel actualizado (solo mock-explanations + mock-candidates)

**Mock files eliminados en Fase 22 (4):**
- ~~`src/lib/data/mock-payment-accounts.ts`~~ (ELIMINADO - migrado a API)
- ~~`src/lib/data/mock-team.ts`~~ (ELIMINADO - movido a constants/team-data.ts)
- ~~`src/lib/data/mock-search.ts`~~ (ELIMINADO - movido a constants/search-data.ts)
- ~~`src/lib/data/mock-properties.ts`~~ (ELIMINADO - 0 imports restantes)

---

### NO INTEGRADAS (usando mock data)

No quedan fases pendientes de integracion. Los 7 mock files restantes son:
- **Demo/Tests (3):** mock-candidates.ts, mock-explanations.ts, mock-users.ts - usados por demo/score page y tests
- **Beta AI (4):** mock-chat-responses.ts, mock-agent-executions.ts, mock-decisions.ts, mock-briefings.ts - usados por useBetaChat.ts

---

## Contextos con Datos Falsos (setTimeout)

| Contexto | Archivo | Estado |
|----------|---------|--------|
| PublishContext | `src/lib/context/PublishContext.tsx` | **CONECTADO** - usa `propertiesApi.create()` + `uploadImage()` |
| ApplicationContext | `src/lib/context/ApplicationContext.tsx` | **CONECTADO** - usa `applicationsApi.create()` + `uploadDocument()` |
| OnboardingContext | `src/lib/context/OnboardingContext.tsx` | Pendiente - ya usa API real en parte, pero tiene setTimeout residual |

---

## Mapa Completo: Mock Files -> Consumidores

### ~~mock-properties.ts~~ (ELIMINADO 2026-02-17)
Eliminado en Fase 22. PaymentAccountsSection migrado a paymentMethodsApi. Barrel export actualizado. 0 imports restantes.

### mock-candidates.ts
- `src/components/landlord/CandidateCard.tsx`
- `src/app/demo/score/page.tsx`
- `src/app/panel/(landlord)/candidatos/page.tsx`
- `src/app/panel/(landlord)/[propertyId]/page.tsx`
- `src/app/panel/(landlord)/[propertyId]/contract/[candidateId]/page.tsx`
- `src/lib/data/mock-landlord-data.ts`
- `src/lib/data/mock-contracts.ts`

### ~~mock-dashboard.ts~~ (ELIMINADO 2026-02-16)
Eliminado junto con mock-activity.ts y mock-landlord-data.ts. formatCurrency migrado a lib/format y useI18n. Tipos migrados a landlord.types.ts. 0 imports restantes.

### ~~mock-tenant-applications.ts~~ (ELIMINADO 2026-02-16)
Eliminado junto con TenantApplicationContext.tsx. 0 imports restantes.

### ~~mock-leases.ts~~ (ELIMINADO 2026-02-16)
Eliminado en Fase 12 (orphan cleanup). 0 imports restantes.

### ~~mock-contracts.ts~~ (ELIMINADO 2026-02-16)
Eliminado en Fase 12 (orphan cleanup). 0 imports restantes.

### ~~mock-visits.ts~~ (ELIMINADO 2026-02-16)
Eliminado en Fase 12 (orphan cleanup). 0 imports restantes.

### ~~mock-subscriptions.ts~~ (ELIMINADO 2026-02-16)
Eliminado. Datos estaticos de planes extraidos a `src/lib/constants/subscription-plans.ts`. Suscripcion del usuario via `useMySubscription` hook (GET /subscriptions/mine). 12 archivos migrados. 0 imports restantes.

### ~~mock-notifications.ts~~ (ELIMINADO 2026-02-16)
Eliminado en Fase 12. Notificaciones migradas a notificationsApi + useLandlordNotifications/useTenantNotifications. Filter options y helpers movidos a notifications.service.ts. 0 imports restantes.

### ~~mock-insurance.ts~~ (ELIMINADO 2026-02-16)
Eliminado en Fase 13. Datos estaticos extraidos a `src/lib/constants/insurance-policies.ts`. 2 componentes migrados. 0 imports restantes.

### ~~mock-activity.ts~~ (ELIMINADO 2026-02-16)
Eliminado. Tipo Activity migrado a DashboardActivity en landlord.types.ts. 0 imports restantes.

### ~~mock-landlord-data.ts~~ (ELIMINADO 2026-02-16)
Eliminado. Solo lo importaba mock-dashboard.ts (ya eliminado). 0 imports restantes.

### ~~mock-payment-accounts.ts~~ (ELIMINADO 2026-02-17)
Eliminado en Fase 22. PaymentAccountsSection migrado a paymentMethodsApi (API real). 0 imports restantes.

### ~~mock-team.ts~~ (ELIMINADO 2026-02-17)
Eliminado en Fase 22. Datos movidos a `src/lib/constants/team-data.ts` (sin endpoint backend). 0 imports restantes.

### ~~mock-search.ts~~ (ELIMINADO 2026-02-17)
Eliminado en Fase 22. Datos movidos a `src/lib/constants/search-data.ts` (utilidad de UI, no mock data). 0 imports restantes.

### ~~mock-coupons.ts~~ (ELIMINADO 2026-02-16)
Eliminado junto con `coupon-validation.ts`. Validacion de cupones migrada a `POST /coupons/validate` (subscriptionsApi.validateCoupon). PriceSummary.tsx calcula descuentos inline desde AppliedCoupon. 0 imports restantes.

### mock-chat-responses.ts, mock-agent-executions.ts, mock-decisions.ts, mock-briefings.ts
- `src/lib/hooks/useBetaChat.ts`
- `src/lib/api/mock.ts`

### ~~mock-inmobiliaria*.ts (7 archivos)~~ (ELIMINADOS 2026-02-17)
Eliminados en Fase 21. Todas las ~14 paginas y ~8 componentes migrados a hooks de useInmobiliaria.ts. generate-extracto-pdf.ts refactorizado. 0 imports restantes.

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

### FASE I-1: Completar Properties (Crear + Editar) ✅ COMPLETADA
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

### FASE I-2: Applications (Aplicar a propiedad) ✅ COMPLETADA
**Prioridad: CRITICA** | **Estado: 100% COMPLETADA**

**Que se hizo (submit - antes):**
1. Creado `src/lib/api/applications.types.ts` - tipos BackendApplication, CreateApplicationDto
2. Creado `src/lib/api/applications.service.ts` - applicationsApi con create, getMine, getById, getByProperty, withdraw, uploadDocument
3. Creado `src/lib/hooks/useApplications.ts` - useMyApplications, useApplication, usePropertyApplications
4. Conectado `ApplicationContext.submitApplication()` a `POST /applications` + upload documentos
5. Error handling con `submissionError`

**Que se hizo (display - 2026-02-15):**
6. Creado `TenantApplicationView` interface en applications.service.ts (tipo display con propiedad embebida)
7. Creado `STATUS_TO_TENANT_MAP` para mapear estados backend -> TenantApplicationStatus (incluyendo WITHDRAWN, PRE_APPROVED)
8. Creado `generateTrackingCode()` que genera "AF-" + id.slice(0,6) (backend no tiene trackingCode)
9. Creados metodos `getMineForDisplay()` y `getByIdForDisplay()` en applicationsApi
10. Creados hooks `useTenantApplications()` (con active/completed) y `useTenantApplication(id)` en useApplications.ts
11. Migrado `src/app/inquilino/aplicaciones/page.tsx` - eliminados imports de mock-tenant-applications y mock-properties, usa useTenantApplications()
12. Migrado `src/app/inquilino/aplicaciones/[applicationId]/page.tsx` - eliminados imports de mock-tenant-applications, mock-properties y mock-dashboard, usa useTenantApplication()
13. Migrado `src/components/tenant/ApplicationCard.tsx` - eliminada dependencia de mockProperties, ahora recibe property como prop

**Limpieza final (2026-02-16):**
- Eliminado `TenantApplicationContext.tsx` (legacy context con mock data)
- Eliminado `mock-tenant-applications.ts` (mock data huerfano)
- Simplificado `mis-aplicaciones/layout.tsx` (removido provider innecesario)
- Limpiado barrel export de `ApplicationDetail` en `components/tenant/index.ts`

**Test disponible:** Login como tenant -> Aplicar a propiedad -> Ver listado en /inquilino/aplicaciones con datos reales -> Click en aplicacion -> Ver detalle con datos reales

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

### FASE I-6: Visits (Agendar visitas) ✅ COMPLETADA
**Prioridad: MEDIA** | **Esfuerzo: Medio** | **Prerequisito: I-1**

**Completado:**
1. Creado `src/lib/api/visits.types.ts` - BackendVisit, CreateVisitDto, CancelVisitDto, RescheduleVisitDto
2. Creado `src/lib/api/visits.service.ts` - visitsApi (getMine, getById, create, confirm, reject, cancel, reschedule) con mapeo UPPERCASE->lowercase
3. Creado `src/lib/hooks/useVisits.ts` - useVisits (lista + stats + getUpcoming + getForProperty), useVisit, useVisitActions (confirm, reject, cancel, reschedule, create)
4. Migrado `src/app/panel/(landlord)/visitas/page.tsx` - reemplazado MOCK_VISITS y getVisitStats por useVisits + useVisitActions. Todos los handlers (confirmar, completar, cancelar, reagendar, crear) usan API real. ScheduleModal usa propiedades reales del landlord. Loading/error states agregados.
5. Migrado `src/app/panel/(landlord)/[propertyId]/page.tsx` - reemplazado getVisitsForProperty por useVisits().getForProperty
6. Migrado `src/app/panel/(landlord)/page.tsx` - reemplazado getUpcomingVisits por useVisits().getUpcoming
7. Migrado `src/app/panel/(landlord)/configuracion/page.tsx` - reemplazado getPendingVisitCount por useVisits().stats.requested

**Mock files reemplazado:** ~~mock-visits.ts~~ (0 imports restantes en panel)

**Test:** Landlord ve visitas reales -> Confirma/Cancela/Reagenda via API -> Dashboard muestra proximas visitas reales -> Config muestra conteo pendiente real

---

### FASE I-7: Contracts (Generar contratos) ✅ COMPLETADA
**Prioridad: MEDIA** | **Esfuerzo: Alto** | **Prerequisito: I-3**

**Que se hace:**
1. Crear `src/lib/api/contracts.service.ts`
2. Migrar `src/app/panel/(landlord)/contratos/page.tsx`
3. Migrar `src/app/panel/(landlord)/[propertyId]/contract/[candidateId]/page.tsx`
4. Conectar generacion de contrato, firma y activacion

**Mock files a reemplazar:** mock-contracts.ts

**Test:** Landlord acepta candidato -> Genera contrato -> Ambas partes firman -> Contrato se activa

---

### FASE I-8: Leases & Payments (Arriendos activos) ✅ COMPLETADA
**Prioridad: MEDIA** | **Esfuerzo: Alto** | **Prerequisito: I-7**

**Archivos creados:**
- `src/lib/constants/payment-methods.ts` - PAYMENT_METHODS extraido de mock-leases.ts (datos estaticos, no mock)
- `src/lib/api/leases.types.ts` - BackendLease, BackendPayment
- `src/lib/api/leases.service.ts` - leasesApi (getMine, getById, getPayments, getMyPayments)
- `src/lib/hooks/useLeases.ts` - useLeases, useLease, useLeasePayments, useMyPayments

**Paginas migradas:**
1. `src/components/lease/PaymentMethodSelector.tsx` - import de PAYMENT_METHODS movido a constants
2. `src/components/lease/LeaseExpandableItem.tsx` - ahora usa useLeasePayments(lease.id) con lazy-load (solo fetches when expanded)
3. `src/app/inquilino/arriendo/page.tsx` - useLeases + useMyPayments en vez de mock functions
4. `src/app/inquilino/arriendo/[leaseId]/page.tsx` - useLease + useLeasePayments + formatCurrency de useI18n
5. `src/app/inquilino/pagos/page.tsx` - useLeases + useMyPayments + formatCurrency de useI18n
6. `src/app/panel/(landlord)/leases/page.tsx` - useLeases con stats + LeaseExpandableItem sin prop payments
7. `src/app/panel/(landlord)/configuracion/page.tsx` - useLeases().getActive() en vez de MOCK_LEASES.filter

**Nota:** mock-leases.ts NO se elimina porque mock-dashboard.ts lo importa internamente (getLandlordStats, etc).

**Test:** Contrato activado crea lease -> Tenant ve su arriendo con datos reales -> Historial de pagos real -> Landlord ve arriendos con lazy-load de pagos

---

### FASE I-9: Dashboard Landlord (Datos reales) ✅ COMPLETADA
**Prioridad: MEDIA** | **Esfuerzo: Medio** | **Prerequisito: I-3, I-6, I-7**

**Que se hace:**
1. Integrar `GET /landlord/dashboard` para estadisticas
2. Integrar `GET /activities` para feed de actividad
3. Migrar todos los componentes del dashboard: FinancialHeroSection, UrgentActionsBanner, ActivityFeed, etc.

**Mock files a reemplazar:** mock-dashboard.ts, mock-activity.ts

**Nota:** formatCurrency de mock-dashboard se usa en ~15 archivos. Extraer a una utilidad independiente antes de eliminar el mock.

---

### FASE I-10: Subscriptions & Plans ✅ COMPLETADA
**Prioridad: MEDIA** | **Esfuerzo: Medio** | **Prerequisito: I-1**

**Que se hace:**
1. Crear `src/lib/api/subscriptions.service.ts`
2. Migrar flujo de publicacion (StepPlan, StepReview, checkout)
3. Migrar `src/app/panel/(landlord)/upgrade/page.tsx`
4. Integrar validacion de cupones con `POST /coupons/validate`

**Mock files a reemplazar:** mock-subscriptions.ts, mock-coupons.ts

---

### FASE I-11: Notifications ✅ COMPLETADA
**Prioridad: BAJA** | **Esfuerzo: Bajo** | **Prerequisito: Ninguno**

**Que se hace:**
1. Migrar `src/app/inquilino/notificaciones/page.tsx`
2. Migrar `src/app/panel/(landlord)/notificaciones/page.tsx`

**Mock files a reemplazar:** mock-notifications.ts

---

### FASE I-12: Wishlist Backend ✅ COMPLETADA
**Prioridad: BAJA** | **Esfuerzo: Bajo** | **Prerequisito: Ninguno**

**Que se hace:**
1. Crear `src/lib/api/wishlists.service.ts`
2. Reemplazar localStorage por API (`GET /wishlists`, `POST /wishlists`, `DELETE /wishlists/:id`)
3. Actualizar `src/lib/stores/wishlist.tsx`

---

### FASE I-13: Inmobiliaria / Agents ✅ COMPLETADA
**Prioridad: BAJA** | **Esfuerzo: MUY Alto** | **Prerequisito: I-1 a I-8**

**Que se hace:**
1. Conectar registro de inmobiliaria a `POST /inmobiliaria/agency/register`
2. Migrar ~15 paginas de `/panel/inmobiliaria/` a endpoints reales
3. Migrar ~8 componentes de `src/components/inmobiliaria/`

**Mock files a reemplazar:** mock-inmobiliaria*.ts (6 archivos), mock-inmobiliaria-core.ts, etc.

**Nota:** Esta es la integracion mas grande. El backend tiene 14 controllers dedicados a inmobiliaria. Recomendado hacer despues de que todo el flujo basico funcione.

---

### FASE I-14: Chat, Insurance, Recommendations, Tenant Payments ✅ COMPLETADA
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
