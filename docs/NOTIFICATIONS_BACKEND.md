# Sistema de Notificaciones - Documentación Backend

## Resumen

Este documento define todas las notificaciones del sistema Leasefy, incluyendo notificaciones web (in-app) y correos electrónicos para propietarios e inquilinos.

---

## Arquitectura

### Canales de Notificación
| Canal | Descripción | Prioridad |
|-------|-------------|-----------|
| **Web (In-App)** | Notificaciones en tiempo real en la plataforma | Todas |
| **Email** | Correos transaccionales y recordatorios | Críticas + Configurables |
| **Push** | Notificaciones móviles (futuro) | Críticas |

### Estructura Base de Notificación

```typescript
interface Notification {
  id: string;                          // UUID
  userId: string;                      // ID del usuario destinatario
  userType: 'landlord' | 'tenant';     // Tipo de usuario
  type: NotificationType;              // Tipo de notificación
  category: NotificationCategory;      // Categoría para filtros

  // Contenido
  title: string;                       // Título corto
  message: string;                     // Mensaje descriptivo

  // Contexto
  entityType?: 'property' | 'application' | 'contract' | 'lease' | 'payment' | 'visit' | 'message';
  entityId?: string;                   // ID de la entidad relacionada

  // Metadata
  metadata?: Record<string, any>;      // Datos adicionales (nombre inquilino, monto, etc.)

  // Estado
  read: boolean;                       // Leída
  readAt?: string;                     // Fecha de lectura

  // Acción
  actionUrl?: string;                  // URL para navegar
  actionLabel?: string;                // Texto del botón de acción

  // Timestamps
  createdAt: string;                   // Fecha de creación
  expiresAt?: string;                  // Fecha de expiración (opcional)
}
```

---

## Notificaciones para Propietarios (Landlords)

### Categorías
| Código | Nombre | Color | Icono |
|--------|--------|-------|-------|
| `payment` | Pagos | Verde (#10B981) | CurrencyDollar |
| `application` | Aplicaciones | Azul (#3B82F6) | UserPlus |
| `contract` | Contratos | Púrpura (#8B5CF6) | FileText |
| `lease` | Arriendos | Índigo (#6366F1) | House |
| `visit` | Visitas | Cyan (#06B6D4) | Calendar |
| `property` | Propiedades | Verde (#22C55E) | Buildings |
| `verification` | Verificaciones | Azul (#0EA5E9) | ShieldCheck |
| `maintenance` | Mantenimiento | Amarillo (#F59E0B) | Wrench |
| `message` | Mensajes | Azul (#3B82F6) | ChatCircle |
| `review` | Reseñas | Amarillo (#EAB308) | Star |
| `alert` | Alertas | Rojo (#EF4444) | Warning |
| `system` | Sistema | Neutral (#6B7280) | Info |

---

### Lista Completa de Notificaciones - Propietarios

#### 1. APLICACIONES

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `APP_NEW` | application | Nueva aplicación | {tenantName} aplicó para {propertyName} | ✅ | Ver aplicación |
| `APP_DOCS_UPLOADED` | application | Documentos recibidos | {tenantName} subió documentos para {propertyName} | ❌ | Ver documentos |
| `APP_DOCS_PENDING` | application | Documentos pendientes | {tenantName} tiene documentos pendientes | ❌ | Ver aplicación |
| `APP_WITHDRAWN` | application | Aplicación retirada | {tenantName} retiró su aplicación para {propertyName} | ❌ | Ver detalles |

```typescript
// Ejemplo: APP_NEW
{
  type: 'APP_NEW',
  category: 'application',
  title: 'Nueva aplicación',
  message: 'Carlos Rodríguez aplicó para Apartamento Chapinero',
  entityType: 'application',
  entityId: 'app-123',
  metadata: {
    tenantName: 'Carlos Rodríguez',
    tenantEmail: 'carlos@email.com',
    propertyName: 'Apartamento Chapinero',
    propertyId: 'prop-456',
    monthlyIncome: 5000000,
    score: 85
  },
  actionUrl: '/panel/prop-456?tab=candidates&app=app-123',
  actionLabel: 'Ver aplicación'
}
```

#### 2. VERIFICACIONES

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `VER_COMPLETED` | verification | Verificación completada | La verificación de {tenantName} está lista | ✅ | Ver resultado |
| `VER_SCORE_HIGH` | verification | Score alto detectado | {tenantName} tiene un score de {score}/100 | ❌ | Ver detalles |
| `VER_SCORE_LOW` | verification | Score bajo detectado | {tenantName} tiene un score de {score}/100 - Revisar | ✅ | Ver detalles |
| `VER_RED_FLAGS` | alert | Alertas detectadas | Se encontraron {count} alertas en la verificación de {tenantName} | ✅ | Ver alertas |
| `VER_INCOME_VERIFIED` | verification | Ingresos verificados | Los ingresos de {tenantName} fueron verificados | ❌ | Ver detalles |

```typescript
// Ejemplo: VER_COMPLETED
{
  type: 'VER_COMPLETED',
  category: 'verification',
  title: 'Verificación completada',
  message: 'La verificación de María García está lista',
  entityType: 'application',
  entityId: 'app-789',
  metadata: {
    tenantName: 'María García',
    score: 78,
    riskLevel: 'medium',
    verifiedAt: '2026-02-07T10:30:00Z'
  },
  actionUrl: '/panel/prop-456?tab=candidates&app=app-789',
  actionLabel: 'Ver resultado'
}
```

#### 3. CONTRATOS

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `CON_READY` | contract | Contrato listo | El contrato para {propertyName} está listo para firmar | ✅ | Ver contrato |
| `CON_TENANT_SIGNED` | contract | Inquilino firmó | {tenantName} firmó el contrato de {propertyName} | ✅ | Firmar contrato |
| `CON_COMPLETED` | contract | Contrato completado | El contrato de {propertyName} fue firmado por ambas partes | ✅ | Ver contrato |
| `CON_PENDING_SIGNATURE` | contract | Firma pendiente | El contrato de {propertyName} espera tu firma | ✅ | Firmar ahora |
| `CON_CANCELLED` | contract | Contrato cancelado | El contrato de {propertyName} fue cancelado | ✅ | Ver detalles |
| `CON_AMENDMENT` | contract | Modificación solicitada | {tenantName} solicitó una modificación al contrato | ❌ | Ver solicitud |

```typescript
// Ejemplo: CON_TENANT_SIGNED
{
  type: 'CON_TENANT_SIGNED',
  category: 'contract',
  title: 'Inquilino firmó contrato',
  message: 'Ana López firmó el contrato de Casa Usaquén',
  entityType: 'contract',
  entityId: 'con-321',
  metadata: {
    tenantName: 'Ana López',
    propertyName: 'Casa Usaquén',
    propertyId: 'prop-789',
    signedAt: '2026-02-07T14:00:00Z',
    pendingSignatures: ['landlord']
  },
  actionUrl: '/panel/prop-789/contract/con-321',
  actionLabel: 'Firmar contrato'
}
```

#### 4. PAGOS

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `PAY_RECEIVED` | payment | Pago recibido | Recibiste ${amount} de {tenantName} | ✅ | Ver pago |
| `PAY_DEPOSITED` | payment | Depósito realizado | ${amount} fue depositado en tu cuenta {accountLast4} | ✅ | Ver detalles |
| `PAY_OVERDUE` | payment | Pago vencido | El arriendo de {propertyName} está vencido ({days} días) | ✅ | Ver detalles |
| `PAY_PARTIAL` | payment | Pago parcial | {tenantName} realizó un pago parcial de ${amount} | ✅ | Ver pago |
| `PAY_FAILED` | alert | Pago fallido | El pago de {tenantName} fue rechazado | ✅ | Ver detalles |
| `PAY_REMINDER_SENT` | payment | Recordatorio enviado | Se envió recordatorio de pago a {tenantName} | ❌ | - |

```typescript
// Ejemplo: PAY_RECEIVED
{
  type: 'PAY_RECEIVED',
  category: 'payment',
  title: 'Pago recibido',
  message: 'Recibiste $2,500,000 de Carlos Rodríguez',
  entityType: 'payment',
  entityId: 'pay-555',
  metadata: {
    tenantName: 'Carlos Rodríguez',
    amount: 2500000,
    currency: 'COP',
    propertyName: 'Apartamento Chapinero',
    propertyId: 'prop-456',
    paymentMethod: 'PSE',
    period: '2026-02'
  },
  actionUrl: '/panel?tab=payments&pay=pay-555',
  actionLabel: 'Ver pago'
}
```

#### 5. ARRIENDOS

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `LEA_STARTED` | lease | Arriendo iniciado | El arriendo de {propertyName} comenzó | ✅ | Ver arriendo |
| `LEA_EXPIRING_90` | lease | Arriendo por vencer | El arriendo de {propertyName} vence en 90 días | ✅ | Ver opciones |
| `LEA_EXPIRING_30` | lease | Arriendo por vencer | El arriendo de {propertyName} vence en 30 días | ✅ | Ver opciones |
| `LEA_EXPIRED` | alert | Arriendo vencido | El arriendo de {propertyName} ha vencido | ✅ | Ver opciones |
| `LEA_RENEWED` | lease | Arriendo renovado | El arriendo de {propertyName} fue renovado | ✅ | Ver detalles |
| `LEA_TERMINATED` | lease | Arriendo terminado | El arriendo de {propertyName} ha terminado | ✅ | Ver detalles |
| `LEA_EARLY_TERMINATION` | lease | Terminación anticipada | {tenantName} solicitó terminar anticipadamente | ✅ | Ver solicitud |

```typescript
// Ejemplo: LEA_EXPIRING_30
{
  type: 'LEA_EXPIRING_30',
  category: 'lease',
  title: 'Arriendo por vencer',
  message: 'El arriendo de Apartamento Chapinero vence en 30 días',
  entityType: 'lease',
  entityId: 'lea-111',
  metadata: {
    propertyName: 'Apartamento Chapinero',
    propertyId: 'prop-456',
    tenantName: 'Carlos Rodríguez',
    expiresAt: '2026-03-07',
    daysRemaining: 30,
    canRenew: true
  },
  actionUrl: '/panel/leases?lease=lea-111',
  actionLabel: 'Ver opciones'
}
```

#### 6. VISITAS

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `VIS_SCHEDULED` | visit | Visita programada | {tenantName} agendó visita a {propertyName} | ✅ | Ver visita |
| `VIS_REMINDER` | visit | Recordatorio de visita | Tienes una visita en {propertyName} en {time} | ✅ | Ver detalles |
| `VIS_COMPLETED` | visit | Visita completada | La visita de {tenantName} a {propertyName} fue completada | ❌ | Ver detalles |
| `VIS_CANCELLED` | visit | Visita cancelada | {tenantName} canceló la visita a {propertyName} | ✅ | Ver detalles |
| `VIS_RESCHEDULED` | visit | Visita reprogramada | {tenantName} reprogramó la visita a {propertyName} | ✅ | Ver nueva fecha |
| `VIS_NO_SHOW` | alert | Inquilino no asistió | {tenantName} no asistió a la visita programada | ❌ | Reprogramar |

```typescript
// Ejemplo: VIS_SCHEDULED
{
  type: 'VIS_SCHEDULED',
  category: 'visit',
  title: 'Visita programada',
  message: 'Pedro Sánchez agendó visita a Casa Usaquén',
  entityType: 'visit',
  entityId: 'vis-222',
  metadata: {
    tenantName: 'Pedro Sánchez',
    tenantPhone: '+57 311 234 5678',
    propertyName: 'Casa Usaquén',
    propertyId: 'prop-789',
    scheduledAt: '2026-02-10T15:00:00Z',
    duration: 30
  },
  actionUrl: '/panel/visitas?visit=vis-222',
  actionLabel: 'Ver visita'
}
```

#### 7. PROPIEDADES

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `PRO_PUBLISHED` | property | Propiedad publicada | {propertyName} está ahora visible en Leasefy | ✅ | Ver publicación |
| `PRO_VIEWS_MILESTONE` | property | Hito de visitas | {propertyName} alcanzó {count} visitas | ❌ | Ver estadísticas |
| `PRO_FEATURED` | property | Propiedad destacada | {propertyName} aparece en propiedades destacadas | ❌ | Ver detalles |
| `PRO_EXPIRED` | property | Publicación expirada | La publicación de {propertyName} ha expirado | ✅ | Renovar |
| `PRO_DEACTIVATED` | property | Propiedad desactivada | {propertyName} fue desactivada | ❌ | Reactivar |
| `PRO_PRICE_SUGGESTION` | property | Sugerencia de precio | Basado en el mercado, sugerimos ajustar el precio de {propertyName} | ❌ | Ver análisis |

```typescript
// Ejemplo: PRO_PUBLISHED
{
  type: 'PRO_PUBLISHED',
  category: 'property',
  title: 'Propiedad publicada',
  message: 'Apartamento Chapinero está ahora visible en Leasefy',
  entityType: 'property',
  entityId: 'prop-456',
  metadata: {
    propertyName: 'Apartamento Chapinero',
    propertyType: 'apartment',
    price: 2500000,
    publishedAt: '2026-02-07T09:00:00Z'
  },
  actionUrl: '/propiedades/prop-456',
  actionLabel: 'Ver publicación'
}
```

#### 8. MENSAJES

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `MSG_NEW` | message | Nuevo mensaje | {senderName} te envió un mensaje | ✅ | Responder |
| `MSG_REPLY` | message | Nueva respuesta | {senderName} respondió tu mensaje | ❌ | Ver conversación |

```typescript
// Ejemplo: MSG_NEW
{
  type: 'MSG_NEW',
  category: 'message',
  title: 'Nuevo mensaje',
  message: 'Carlos Rodríguez te envió un mensaje',
  entityType: 'message',
  entityId: 'msg-333',
  metadata: {
    senderName: 'Carlos Rodríguez',
    senderId: 'user-123',
    preview: '¿Está disponible para una visita mañana?',
    propertyName: 'Apartamento Chapinero',
    propertyId: 'prop-456'
  },
  actionUrl: '/panel/mensajes?conv=msg-333',
  actionLabel: 'Responder'
}
```

#### 9. MANTENIMIENTO

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `MNT_REQUEST` | maintenance | Solicitud de mantenimiento | {tenantName} reportó un problema en {propertyName} | ✅ | Ver solicitud |
| `MNT_UPDATED` | maintenance | Mantenimiento actualizado | El mantenimiento de {propertyName} fue actualizado | ❌ | Ver estado |
| `MNT_COMPLETED` | maintenance | Mantenimiento completado | El mantenimiento de {propertyName} fue completado | ✅ | Ver detalles |

```typescript
// Ejemplo: MNT_REQUEST
{
  type: 'MNT_REQUEST',
  category: 'maintenance',
  title: 'Solicitud de mantenimiento',
  message: 'Carlos Rodríguez reportó un problema en Apartamento Chapinero',
  entityType: 'maintenance',
  entityId: 'mnt-444',
  metadata: {
    tenantName: 'Carlos Rodríguez',
    propertyName: 'Apartamento Chapinero',
    propertyId: 'prop-456',
    issueType: 'plumbing',
    priority: 'high',
    description: 'Fuga de agua en el baño principal'
  },
  actionUrl: '/panel?tab=maintenance&req=mnt-444',
  actionLabel: 'Ver solicitud'
}
```

#### 10. RESEÑAS

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `REV_RECEIVED` | review | Nueva reseña | {tenantName} dejó una reseña de {propertyName} | ✅ | Ver reseña |
| `REV_RESPONSE_NEEDED` | review | Responder reseña | Tienes reseñas sin responder | ❌ | Responder |

```typescript
// Ejemplo: REV_RECEIVED
{
  type: 'REV_RECEIVED',
  category: 'review',
  title: 'Nueva reseña',
  message: 'Ana López dejó una reseña de Casa Usaquén',
  entityType: 'review',
  entityId: 'rev-666',
  metadata: {
    tenantName: 'Ana López',
    propertyName: 'Casa Usaquén',
    propertyId: 'prop-789',
    rating: 4.5,
    preview: 'Excelente ubicación y muy buen trato...'
  },
  actionUrl: '/panel/propiedades?prop=prop-789&tab=reviews',
  actionLabel: 'Ver reseña'
}
```

#### 11. SISTEMA Y ALERTAS

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `SYS_SUBSCRIPTION_EXPIRING` | alert | Suscripción por vencer | Tu plan {planName} vence en {days} días | ✅ | Renovar |
| `SYS_SUBSCRIPTION_EXPIRED` | alert | Suscripción vencida | Tu plan {planName} ha vencido | ✅ | Renovar |
| `SYS_PAYMENT_METHOD_EXPIRING` | alert | Método de pago por vencer | Tu tarjeta terminada en {last4} vence pronto | ✅ | Actualizar |
| `SYS_SECURITY_ALERT` | alert | Alerta de seguridad | Nuevo inicio de sesión detectado desde {location} | ✅ | Revisar |
| `SYS_WELCOME` | system | ¡Bienvenido a Leasefy! | Completa tu perfil para empezar | ✅ | Completar perfil |
| `SYS_PROFILE_INCOMPLETE` | system | Perfil incompleto | Completa tu perfil para recibir más aplicaciones | ❌ | Completar |
| `SYS_NEW_FEATURE` | system | Nueva funcionalidad | Descubre la nueva función: {featureName} | ❌ | Ver más |
| `SYS_REPORT_READY` | system | Informe listo | Tu informe mensual de {month} está listo | ❌ | Ver informe |

---

## Notificaciones para Inquilinos (Tenants)

### Categorías
| Código | Nombre | Color | Icono |
|--------|--------|-------|-------|
| `payment` | Pagos | Esmeralda (#10B981) | CurrencyDollar |
| `application` | Aplicaciones | Verde (#22C55E) | FileText |
| `contract` | Contratos | Púrpura (#8B5CF6) | FileText |
| `lease` | Arriendo | Índigo (#6366F1) | House |
| `visit` | Visitas | Índigo (#6366F1) | Calendar |
| `document` | Documentos | Púrpura (#A855F7) | Folder |
| `message` | Mensajes | Azul (#3B82F6) | ChatCircle |
| `reminder` | Recordatorios | Ámbar (#F59E0B) | Bell |
| `property` | Propiedades | Verde (#22C55E) | Heart |
| `system` | Sistema | Neutral (#6B7280) | Info |

---

### Lista Completa de Notificaciones - Inquilinos

#### 1. APLICACIONES

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `APP_SUBMITTED` | application | Aplicación enviada | Tu aplicación para {propertyName} fue enviada | ✅ | Ver estado |
| `APP_PREAPPROVED` | application | ¡Pre-aprobado! | Fuiste pre-aprobado para {propertyName} | ✅ | Ver detalles |
| `APP_APPROVED` | application | ¡Aprobado! | Tu aplicación para {propertyName} fue aprobada | ✅ | Siguiente paso |
| `APP_REJECTED` | application | No aprobado | Tu aplicación para {propertyName} no fue aprobada | ✅ | Ver alternativas |
| `APP_DOCS_REQUESTED` | application | Documentos solicitados | {landlordName} solicitó documentos adicionales | ✅ | Subir documentos |
| `APP_UNDER_REVIEW` | application | En revisión | Tu aplicación para {propertyName} está siendo revisada | ❌ | Ver estado |

```typescript
// Ejemplo: APP_APPROVED
{
  type: 'APP_APPROVED',
  category: 'application',
  title: '¡Felicitaciones! Fuiste aprobado',
  message: 'Tu aplicación para Apartamento Chapinero fue aprobada',
  entityType: 'application',
  entityId: 'app-123',
  metadata: {
    propertyName: 'Apartamento Chapinero',
    propertyId: 'prop-456',
    landlordName: 'María González',
    nextStep: 'contract',
    approvedAt: '2026-02-07T10:00:00Z'
  },
  actionUrl: '/inquilino/aplicaciones/app-123',
  actionLabel: 'Siguiente paso'
}
```

#### 2. CONTRATOS

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `CON_READY` | contract | Contrato listo | El contrato de {propertyName} está listo para firmar | ✅ | Firmar contrato |
| `CON_PENDING_SIGNATURE` | contract | Firma pendiente | Tu firma está pendiente en el contrato de {propertyName} | ✅ | Firmar ahora |
| `CON_LANDLORD_SIGNED` | contract | Propietario firmó | {landlordName} firmó el contrato de {propertyName} | ✅ | Ver contrato |
| `CON_COMPLETED` | contract | Contrato completado | El contrato de {propertyName} está completo | ✅ | Ver contrato |
| `CON_CANCELLED` | contract | Contrato cancelado | El contrato de {propertyName} fue cancelado | ✅ | Ver detalles |

```typescript
// Ejemplo: CON_READY
{
  type: 'CON_READY',
  category: 'contract',
  title: 'Contrato listo para firmar',
  message: 'El contrato de Apartamento Chapinero está listo para firmar',
  entityType: 'contract',
  entityId: 'con-321',
  metadata: {
    propertyName: 'Apartamento Chapinero',
    propertyId: 'prop-456',
    landlordName: 'María González',
    monthlyRent: 2500000,
    startDate: '2026-03-01'
  },
  actionUrl: '/inquilino/aplicaciones/app-123?step=contract',
  actionLabel: 'Firmar contrato'
}
```

#### 3. PAGOS

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `PAY_CONFIRMED` | payment | Pago confirmado | Tu pago de ${amount} fue confirmado | ✅ | Ver recibo |
| `PAY_REMINDER_7` | reminder | Recordatorio de pago | Tu arriendo vence en 7 días | ✅ | Pagar ahora |
| `PAY_REMINDER_3` | reminder | Recordatorio de pago | Tu arriendo vence en 3 días | ✅ | Pagar ahora |
| `PAY_REMINDER_1` | reminder | Recordatorio de pago | Tu arriendo vence mañana | ✅ | Pagar ahora |
| `PAY_DUE_TODAY` | reminder | Pago vence hoy | Tu arriendo de {propertyName} vence hoy | ✅ | Pagar ahora |
| `PAY_OVERDUE` | alert | Pago vencido | Tu arriendo está vencido hace {days} días | ✅ | Pagar ahora |
| `PAY_FAILED` | alert | Pago fallido | Tu pago no pudo ser procesado | ✅ | Reintentar |
| `PAY_RECEIPT` | payment | Recibo disponible | Tu recibo de {month} está disponible | ❌ | Ver recibo |
| `PAY_AUTO_SCHEDULED` | payment | Pago programado | Tu pago automático de ${amount} será procesado el {date} | ❌ | Ver detalles |

```typescript
// Ejemplo: PAY_CONFIRMED
{
  type: 'PAY_CONFIRMED',
  category: 'payment',
  title: 'Pago confirmado',
  message: 'Tu pago de $2,500,000 fue confirmado',
  entityType: 'payment',
  entityId: 'pay-555',
  metadata: {
    amount: 2500000,
    currency: 'COP',
    propertyName: 'Apartamento Chapinero',
    propertyId: 'prop-456',
    period: '2026-02',
    paymentMethod: 'PSE - Bancolombia',
    receiptUrl: '/receipts/pay-555.pdf'
  },
  actionUrl: '/inquilino/pagos?pay=pay-555',
  actionLabel: 'Ver recibo'
}
```

#### 4. ARRIENDO

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `LEA_STARTED` | lease | ¡Arriendo iniciado! | Tu arriendo en {propertyName} comenzó | ✅ | Ver arriendo |
| `LEA_EXPIRING_90` | lease | Arriendo por vencer | Tu arriendo en {propertyName} vence en 90 días | ✅ | Ver opciones |
| `LEA_EXPIRING_30` | lease | Arriendo por vencer | Tu arriendo en {propertyName} vence en 30 días | ✅ | Ver opciones |
| `LEA_RENEWAL_OFFERED` | lease | Oferta de renovación | {landlordName} ofrece renovar tu arriendo | ✅ | Ver oferta |
| `LEA_RENEWED` | lease | Arriendo renovado | Tu arriendo en {propertyName} fue renovado | ✅ | Ver detalles |
| `LEA_TERMINATED` | lease | Arriendo terminado | Tu arriendo en {propertyName} ha terminado | ✅ | Ver detalles |
| `LEA_TERMINATION_APPROVED` | lease | Terminación aprobada | Tu solicitud de terminación fue aprobada | ✅ | Ver detalles |

```typescript
// Ejemplo: LEA_STARTED
{
  type: 'LEA_STARTED',
  category: 'lease',
  title: '¡Bienvenido a tu nuevo hogar!',
  message: 'Tu arriendo en Apartamento Chapinero comenzó',
  entityType: 'lease',
  entityId: 'lea-111',
  metadata: {
    propertyName: 'Apartamento Chapinero',
    propertyId: 'prop-456',
    propertyAddress: 'Calle 72 #10-34, Chapinero',
    landlordName: 'María González',
    landlordPhone: '+57 300 123 4567',
    startDate: '2026-03-01',
    endDate: '2027-02-28',
    monthlyRent: 2500000
  },
  actionUrl: '/inquilino/arriendo/lea-111',
  actionLabel: 'Ver arriendo'
}
```

#### 5. VISITAS

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `VIS_CONFIRMED` | visit | Visita confirmada | Tu visita a {propertyName} fue confirmada | ✅ | Ver detalles |
| `VIS_REMINDER_24H` | visit | Recordatorio de visita | Tu visita a {propertyName} es mañana | ✅ | Ver detalles |
| `VIS_REMINDER_1H` | visit | Visita en 1 hora | Tu visita a {propertyName} es en 1 hora | ✅ | Ver ubicación |
| `VIS_CANCELLED_BY_LANDLORD` | visit | Visita cancelada | {landlordName} canceló la visita a {propertyName} | ✅ | Reagendar |
| `VIS_RESCHEDULED` | visit | Visita reprogramada | Tu visita a {propertyName} fue reprogramada | ✅ | Ver nueva fecha |

```typescript
// Ejemplo: VIS_CONFIRMED
{
  type: 'VIS_CONFIRMED',
  category: 'visit',
  title: 'Visita confirmada',
  message: 'Tu visita a Apartamento Chapinero fue confirmada',
  entityType: 'visit',
  entityId: 'vis-222',
  metadata: {
    propertyName: 'Apartamento Chapinero',
    propertyId: 'prop-456',
    propertyAddress: 'Calle 72 #10-34, Chapinero',
    landlordName: 'María González',
    scheduledAt: '2026-02-10T15:00:00Z',
    duration: 30,
    contactPhone: '+57 300 123 4567'
  },
  actionUrl: '/inquilino/aplicaciones?visit=vis-222',
  actionLabel: 'Ver detalles'
}
```

#### 6. DOCUMENTOS

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `DOC_REQUESTED` | document | Documento solicitado | {landlordName} solicita: {documentName} | ✅ | Subir documento |
| `DOC_APPROVED` | document | Documento aprobado | Tu {documentName} fue aprobado | ❌ | Ver estado |
| `DOC_REJECTED` | document | Documento rechazado | Tu {documentName} necesita corrección | ✅ | Ver comentarios |
| `DOC_EXPIRING` | document | Documento por vencer | Tu {documentName} vence en {days} días | ✅ | Actualizar |
| `DOC_CONTRACT_READY` | document | Contrato disponible | Tu contrato firmado está disponible para descargar | ✅ | Descargar |

```typescript
// Ejemplo: DOC_REQUESTED
{
  type: 'DOC_REQUESTED',
  category: 'document',
  title: 'Documento solicitado',
  message: 'María González solicita: Certificado laboral',
  entityType: 'document',
  entityId: 'doc-777',
  metadata: {
    landlordName: 'María González',
    documentName: 'Certificado laboral',
    documentType: 'employment_certificate',
    propertyName: 'Apartamento Chapinero',
    applicationId: 'app-123',
    deadline: '2026-02-14'
  },
  actionUrl: '/inquilino/aplicaciones/app-123?tab=documents',
  actionLabel: 'Subir documento'
}
```

#### 7. MENSAJES

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `MSG_NEW` | message | Nuevo mensaje | {senderName} te envió un mensaje | ✅ | Responder |
| `MSG_REPLY` | message | Nueva respuesta | {senderName} respondió tu mensaje | ❌ | Ver conversación |

```typescript
// Ejemplo: MSG_NEW
{
  type: 'MSG_NEW',
  category: 'message',
  title: 'Nuevo mensaje',
  message: 'María González te envió un mensaje',
  entityType: 'message',
  entityId: 'msg-888',
  metadata: {
    senderName: 'María González',
    senderId: 'user-456',
    senderType: 'landlord',
    preview: 'Hola, bienvenido a tu nuevo hogar...',
    propertyName: 'Apartamento Chapinero',
    propertyId: 'prop-456'
  },
  actionUrl: '/inquilino/mensajes?conv=msg-888',
  actionLabel: 'Responder'
}
```

#### 8. PROPIEDADES GUARDADAS

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `FAV_PRICE_DROP` | property | ¡Precio rebajado! | {propertyName} bajó de precio: ${oldPrice} → ${newPrice} | ✅ | Ver propiedad |
| `FAV_AVAILABLE` | property | ¡Disponible de nuevo! | {propertyName} está disponible otra vez | ✅ | Ver propiedad |
| `FAV_ABOUT_TO_RENT` | property | ¡Casi arrendada! | {propertyName} tiene alta demanda | ❌ | Ver propiedad |
| `SEARCH_NEW_MATCH` | property | Nueva propiedad | Nueva propiedad en {zone} que puede interesarte | ❌ | Ver propiedad |

```typescript
// Ejemplo: FAV_PRICE_DROP
{
  type: 'FAV_PRICE_DROP',
  category: 'property',
  title: '¡Precio rebajado!',
  message: 'Apartamento Chapinero bajó de precio: $2,800,000 → $2,500,000',
  entityType: 'property',
  entityId: 'prop-456',
  metadata: {
    propertyName: 'Apartamento Chapinero',
    oldPrice: 2800000,
    newPrice: 2500000,
    discount: 300000,
    discountPercent: 10.7,
    propertyType: 'apartment',
    zone: 'Chapinero'
  },
  actionUrl: '/propiedades/prop-456',
  actionLabel: 'Ver propiedad'
}
```

#### 9. MANTENIMIENTO

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `MNT_RECEIVED` | maintenance | Solicitud recibida | Tu solicitud de mantenimiento fue recibida | ❌ | Ver estado |
| `MNT_IN_PROGRESS` | maintenance | En progreso | Tu solicitud de mantenimiento está en progreso | ❌ | Ver estado |
| `MNT_SCHEDULED` | maintenance | Visita programada | Un técnico visitará el {date} | ✅ | Ver detalles |
| `MNT_COMPLETED` | maintenance | Completado | Tu solicitud de mantenimiento fue resuelta | ✅ | Calificar |

```typescript
// Ejemplo: MNT_SCHEDULED
{
  type: 'MNT_SCHEDULED',
  category: 'maintenance',
  title: 'Visita de mantenimiento programada',
  message: 'Un técnico visitará el 10 de febrero',
  entityType: 'maintenance',
  entityId: 'mnt-999',
  metadata: {
    propertyName: 'Apartamento Chapinero',
    issueType: 'plumbing',
    scheduledAt: '2026-02-10T10:00:00Z',
    technicianName: 'Juan Pérez',
    technicianPhone: '+57 300 999 8888'
  },
  actionUrl: '/inquilino/arriendo/lea-111?tab=maintenance',
  actionLabel: 'Ver detalles'
}
```

#### 10. SISTEMA

| ID | Tipo | Título | Mensaje Template | Email | Acción |
|----|------|--------|------------------|-------|--------|
| `SYS_WELCOME` | system | ¡Bienvenido a Leasefy! | Completa tu perfil para empezar a buscar | ✅ | Completar perfil |
| `SYS_PROFILE_INCOMPLETE` | system | Completa tu perfil | Un perfil completo aumenta tus posibilidades | ❌ | Completar |
| `SYS_SCORE_UPDATED` | system | Score actualizado | Tu score de inquilino fue actualizado | ❌ | Ver score |
| `SYS_SECURITY_ALERT` | alert | Alerta de seguridad | Nuevo inicio de sesión desde {location} | ✅ | Revisar |
| `SYS_NEW_FEATURE` | system | Nueva funcionalidad | Descubre: {featureName} | ❌ | Ver más |

---

## Plantillas de Email

### Estructura Base

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="font-family: 'Inter', -apple-system, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <div style="background: #4F46E5; padding: 24px; text-align: center;">
      <img src="{{logoUrl}}" alt="Leasefy" height="32">
    </div>

    <!-- Content -->
    <div style="padding: 32px;">
      <h1 style="color: #111; font-size: 24px; margin: 0 0 16px;">{{title}}</h1>
      <p style="color: #666; font-size: 16px; line-height: 1.6;">{{message}}</p>

      {{#if actionUrl}}
      <div style="margin: 32px 0; text-align: center;">
        <a href="{{actionUrl}}" style="background: #4F46E5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          {{actionLabel}}
        </a>
      </div>
      {{/if}}

      {{#if details}}
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 24px 0;">
        {{details}}
      </div>
      {{/if}}
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 24px; text-align: center; font-size: 14px; color: #666;">
      <p>Este correo fue enviado por Leasefy</p>
      <p>
        <a href="{{unsubscribeUrl}}" style="color: #4F46E5;">Configurar notificaciones</a>
      </p>
    </div>
  </div>
</body>
</html>
```

### Plantillas por Categoría

#### 1. Nueva Aplicación (Propietario)
**Subject**: Nueva aplicación para {{propertyName}}
```
¡Tienes una nueva aplicación!

{{tenantName}} ha aplicado para arrendar {{propertyName}}.

📊 Score: {{score}}/100
💰 Ingresos: {{monthlyIncome}}
📧 Email: {{tenantEmail}}

[Ver Aplicación]
```

#### 2. Aplicación Aprobada (Inquilino)
**Subject**: ¡Felicitaciones! Tu aplicación fue aprobada
```
¡Buenas noticias!

Tu aplicación para {{propertyName}} fue aprobada por {{landlordName}}.

🏠 Propiedad: {{propertyName}}
💰 Arriendo mensual: {{monthlyRent}}
📅 Fecha de inicio: {{startDate}}

El siguiente paso es firmar el contrato de arrendamiento.

[Firmar Contrato]
```

#### 3. Pago Recibido (Propietario)
**Subject**: Pago recibido - {{propertyName}}
```
¡Pago confirmado!

Recibiste un pago de arriendo.

🏠 Propiedad: {{propertyName}}
👤 Inquilino: {{tenantName}}
💰 Monto: {{amount}}
📅 Periodo: {{period}}
🏦 Depositado en: {{accountLast4}}

[Ver Detalles]
```

#### 4. Recordatorio de Pago (Inquilino)
**Subject**: Recordatorio: Tu arriendo vence en {{days}} días
```
¡Hola {{tenantName}}!

Este es un recordatorio amigable de que tu arriendo vence pronto.

🏠 Propiedad: {{propertyName}}
💰 Monto: {{amount}}
📅 Fecha límite: {{dueDate}}

[Pagar Ahora]

---
Configurar recordatorios: {{settingsUrl}}
```

#### 5. Visita Programada
**Subject**: Visita confirmada - {{propertyName}}
```
Tu visita está confirmada

📍 {{propertyAddress}}
📅 {{scheduledDate}} a las {{scheduledTime}}
⏱️ Duración estimada: {{duration}} minutos

Contacto: {{contactName}} - {{contactPhone}}

💡 Tip: Llega 5 minutos antes y lleva tu identificación.

[Ver Ubicación]
```

#### 6. Contrato Listo para Firmar
**Subject**: Tu contrato está listo para firmar
```
¡Tu contrato está listo!

El contrato de arrendamiento para {{propertyName}} está listo para tu firma.

📄 Términos principales:
- Arriendo mensual: {{monthlyRent}}
- Duración: {{leaseDuration}}
- Fecha de inicio: {{startDate}}
- Depósito: {{depositAmount}}

Por favor revisa y firma el contrato antes del {{deadline}}.

[Revisar y Firmar]
```

---

## Configuración de Preferencias

### Preferencias por Usuario

```typescript
interface NotificationPreferences {
  userId: string;

  // Canales globales
  emailEnabled: boolean;
  pushEnabled: boolean;

  // Por categoría
  categories: {
    [category: string]: {
      web: boolean;      // Siempre true (no se puede desactivar)
      email: boolean;
      push: boolean;
    }
  };

  // Horarios
  quietHours: {
    enabled: boolean;
    start: string;       // "22:00"
    end: string;         // "08:00"
    timezone: string;    // "America/Bogota"
  };

  // Frecuencia de resumen
  digestFrequency: 'realtime' | 'daily' | 'weekly';
  digestTime: string;    // "09:00" para daily/weekly
  digestDay?: number;    // 0-6 para weekly (0 = domingo)
}
```

### Configuración por Defecto (Propietarios)

```typescript
const defaultLandlordPreferences = {
  emailEnabled: true,
  pushEnabled: true,
  categories: {
    payment: { web: true, email: true, push: true },
    application: { web: true, email: true, push: true },
    contract: { web: true, email: true, push: true },
    lease: { web: true, email: true, push: false },
    visit: { web: true, email: true, push: true },
    property: { web: true, email: false, push: false },
    verification: { web: true, email: true, push: false },
    maintenance: { web: true, email: true, push: true },
    message: { web: true, email: false, push: true },
    review: { web: true, email: false, push: false },
    system: { web: true, email: true, push: false },
  },
  quietHours: { enabled: false },
  digestFrequency: 'realtime'
};
```

### Configuración por Defecto (Inquilinos)

```typescript
const defaultTenantPreferences = {
  emailEnabled: true,
  pushEnabled: true,
  categories: {
    payment: { web: true, email: true, push: true },
    application: { web: true, email: true, push: true },
    contract: { web: true, email: true, push: true },
    lease: { web: true, email: true, push: false },
    visit: { web: true, email: true, push: true },
    document: { web: true, email: true, push: false },
    message: { web: true, email: false, push: true },
    reminder: { web: true, email: true, push: true },
    property: { web: true, email: false, push: false },
    system: { web: true, email: false, push: false },
  },
  quietHours: { enabled: true, start: '22:00', end: '08:00' },
  digestFrequency: 'realtime'
};
```

---

## API Endpoints

### Notificaciones

```
GET    /api/notifications                    # Listar notificaciones
GET    /api/notifications/:id                # Obtener una notificación
POST   /api/notifications/:id/read           # Marcar como leída
POST   /api/notifications/read-all           # Marcar todas como leídas
DELETE /api/notifications/:id                # Eliminar notificación
DELETE /api/notifications                    # Eliminar todas (query: ?read=true)

GET    /api/notifications/unread-count       # Contador de no leídas
GET    /api/notifications/preferences        # Obtener preferencias
PUT    /api/notifications/preferences        # Actualizar preferencias
```

### WebSocket Events

```typescript
// Servidor → Cliente
{
  event: 'notification:new',
  data: Notification
}

{
  event: 'notification:read',
  data: { id: string }
}

{
  event: 'notifications:count',
  data: { unread: number }
}

// Cliente → Servidor
{
  event: 'notification:mark-read',
  data: { id: string }
}
```

---

## Resumen de Notificaciones

### Propietarios (41 tipos)
| Categoría | Cantidad | Con Email |
|-----------|----------|-----------|
| Aplicaciones | 4 | 1 |
| Verificaciones | 5 | 3 |
| Contratos | 6 | 5 |
| Pagos | 6 | 5 |
| Arriendos | 7 | 6 |
| Visitas | 6 | 4 |
| Propiedades | 6 | 2 |
| Mensajes | 2 | 1 |
| Mantenimiento | 3 | 2 |
| Reseñas | 2 | 1 |
| Sistema | 8 | 4 |

### Inquilinos (38 tipos)
| Categoría | Cantidad | Con Email |
|-----------|----------|-----------|
| Aplicaciones | 6 | 5 |
| Contratos | 5 | 5 |
| Pagos | 9 | 7 |
| Arriendos | 7 | 6 |
| Visitas | 5 | 4 |
| Documentos | 5 | 3 |
| Mensajes | 2 | 1 |
| Propiedades | 4 | 1 |
| Mantenimiento | 4 | 2 |
| Sistema | 5 | 2 |

**Total: 79 tipos de notificaciones**

---

## Prioridades de Implementación

### Fase 1 - MVP (Críticas)
1. Nueva aplicación (landlord)
2. Aplicación aprobada/rechazada (tenant)
3. Contrato listo para firmar (ambos)
4. Pago recibido (landlord)
5. Pago confirmado (tenant)
6. Recordatorio de pago (tenant)
7. Visita programada (ambos)

### Fase 2 - Core
1. Verificación completada
2. Arriendo por vencer
3. Documentos solicitados
4. Mensajes nuevos
5. Todas las notificaciones de contrato

### Fase 3 - Completo
1. Propiedades (vistas, destacado)
2. Mantenimiento
3. Reseñas
4. Sistema (welcome, features)
5. Alertas de precio para guardados

---

## Notas de Implementación

1. **Idempotencia**: Cada notificación debe tener un ID único basado en tipo + entidad + timestamp para evitar duplicados.

2. **Rate Limiting**: Máximo 1 email por tipo por hora para evitar spam.

3. **Batching**: Agrupar notificaciones similares en un solo email si ocurren en un período corto.

4. **Localización**: Soportar español e inglés basado en preferencias del usuario.

5. **Fallback**: Si el envío de email falla, la notificación web siempre debe mostrarse.

6. **Tracking**: Registrar apertura de emails y clics en acciones para analytics.

7. **Cleanup**: Las notificaciones leídas más antiguas de 90 días pueden archivarse/eliminarse.
