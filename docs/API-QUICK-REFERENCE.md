# API Quick Reference

Referencia rápida de todos los endpoints que el backend necesita implementar.

**Última actualización:** 2026-02-07
**Total endpoints:** 95+

---

## Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/send-otp` | Enviar OTP a email |
| POST | `/auth/verify-otp` | Verificar OTP y obtener token |
| POST | `/auth/logout` | Cerrar sesión |
| GET | `/auth/me` | Obtener usuario actual |
| POST | `/auth/google` | Login con Google |
| POST | `/auth/apple` | Login con Apple |

---

## Usuarios y Onboarding

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/users/me` | Perfil del usuario |
| PUT | `/users/me` | Actualizar perfil |
| GET | `/users/me/onboarding` | Estado de onboarding |
| PUT | `/users/me/onboarding` | Guardar paso de onboarding |
| POST | `/users/me/onboarding/complete` | Completar onboarding |

---

## Propiedades

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/properties` | Listar propiedades (filtros) |
| GET | `/properties/:id` | Detalle de propiedad |
| POST | `/properties` | Crear propiedad |
| PUT | `/properties/:id` | Actualizar propiedad |
| DELETE | `/properties/:id` | Eliminar propiedad |
| POST | `/properties/:id/images` | Subir imágenes |
| GET | `/properties/:id/availability` | Disponibilidad para visitas |
| PUT | `/properties/:id/availability` | Actualizar disponibilidad |
| GET | `/properties/:id/tenant-requirements` | Requisitos de inquilino |
| PUT | `/properties/:id/tenant-requirements` | Actualizar requisitos |

**Query Params para listado:**
- `city`, `neighborhood`, `minPrice`, `maxPrice`
- `bedrooms`, `bathrooms`, `type`, `amenities`
- `limit`, `offset`, `sortBy`

---

## Dashboard Propietario

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/landlord/properties` | Mis propiedades + resumen |
| GET | `/landlord/properties/:id` | Propiedad + candidatos |
| GET | `/dashboard/landlord` | Dashboard completo |

---

## Aplicaciones (Inquilino)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/applications` | Mis aplicaciones |
| POST | `/applications` | Crear borrador |
| GET | `/applications/:id` | Detalle aplicación |
| PUT | `/applications/:id` | Guardar progreso |
| POST | `/applications/:id/submit` | Enviar aplicación |
| POST | `/applications/:id/withdraw` | Retirar aplicación |
| POST | `/applications/:id/documents` | Subir documentos |

---

## Candidatos (Propietario)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/candidates` | Listar candidatos |
| GET | `/candidates/:id` | Detalle candidato |
| GET | `/candidates/:id/risk-score` | Score de riesgo |
| POST | `/candidates/:id/decision` | Tomar decisión |
| POST | `/candidates/:id/notes` | Agregar nota |
| GET | `/candidates/:id/notes` | Obtener notas |

**Decision Body:**
```json
{
  "decision": "pre-approved|approved|rejected|more-info",
  "notes": "string",
  "conditions": ["string"]
}
```

---

## Visitas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/visits` | Listar visitas |
| POST | `/visits` | Solicitar visita |
| GET | `/visits/:id` | Detalle visita |
| PUT | `/visits/:id/confirm` | Confirmar visita |
| PUT | `/visits/:id/cancel` | Cancelar visita |
| PUT | `/visits/:id/reschedule` | Reprogramar |
| PUT | `/visits/:id/complete` | Marcar completada |
| PUT | `/visits/:id/no-show` | Marcar no-show |

---

## Contratos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/contracts/templates` | Obtener plantillas |
| POST | `/contracts` | Crear contrato |
| GET | `/contracts/:id` | Obtener contrato |
| PUT | `/contracts/:id` | Actualizar términos |
| POST | `/contracts/:id/send` | Enviar para firma |
| POST | `/contracts/:id/sign/send-otp` | Enviar OTP para firma |
| POST | `/contracts/:id/sign` | Firmar contrato |
| GET | `/contracts/:id/audit-trail` | Historial de auditoría |
| GET | `/contracts/:id/pdf` | Generar PDF |

**Sign Body:**
```json
{
  "signerId": "string",
  "otp": "string",
  "signature": "string",
  "acceptedClauses": ["string"],
  "ipAddress": "string",
  "userAgent": "string"
}
```

---

## Arriendos (Leases)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/leases` | Mis arriendos |
| GET | `/leases/:id` | Detalle arriendo |
| GET | `/leases/:id/payments` | Historial de pagos |
| POST | `/leases/:id/payments` | Registrar pago |
| POST | `/leases/:id/renew` | Iniciar renovación |
| POST | `/leases/:id/terminate` | Terminar anticipado |

---

## Pagos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/payments/process` | Procesar pago |
| POST | `/payments/webhook` | Webhook de confirmación |
| POST | `/payments/:id/reminder` | Enviar recordatorio |
| GET | `/payments/:id/receipt` | Descargar recibo |

---

## Notificaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/notifications` | Listar notificaciones |
| PUT | `/notifications/:id/read` | Marcar como leída |
| PUT | `/notifications/read-all` | Marcar todas leídas |
| DELETE | `/notifications/:id` | Eliminar |
| GET | `/notifications/preferences` | Preferencias |
| PUT | `/notifications/preferences` | Actualizar preferencias |

---

## Suscripciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/plans` | Planes disponibles |
| GET | `/subscriptions/current` | Suscripción actual |
| POST | `/subscriptions` | Crear suscripción |
| PUT | `/subscriptions/:id` | Upgrade/Downgrade |
| POST | `/subscriptions/:id/cancel` | Cancelar |
| POST | `/coupons/validate` | Validar cupón |

---

## Cuentas de Pago

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/payment-accounts` | Listar cuentas |
| POST | `/payment-accounts/bank` | Agregar banco |
| POST | `/payment-accounts/wallet` | Agregar billetera |
| PUT | `/payment-accounts/:id` | Actualizar cuenta |
| DELETE | `/payment-accounts/:id` | Eliminar cuenta |
| PUT | `/payment-accounts/:id/default` | Establecer default |
| GET | `/payment-accounts/assignments` | Asignaciones |
| PUT | `/payment-accounts/assignments` | Actualizar asignaciones |

---

## Equipo

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/team` | Listar miembros |
| POST | `/team/invite` | Invitar miembro |
| PUT | `/team/:id` | Actualizar rol |
| DELETE | `/team/:id` | Eliminar miembro |
| POST | `/team/accept` | Aceptar invitación |
| POST | `/team/:id/resend` | Reenviar invitación |

---

## Mensajes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/messages/conversations` | Listar conversaciones |
| GET | `/messages/conversations/:id` | Mensajes de conversación |
| POST | `/messages` | Enviar mensaje |
| PUT | `/messages/conversations/:id/read` | Marcar como leído |

---

## Documentos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/documents` | Subir documento |
| GET | `/documents/:id` | Obtener documento |
| DELETE | `/documents/:id` | Eliminar documento |
| POST | `/documents/:id/verify` | Verificar documento |

---

## Formatos de Respuesta

### Respuesta Exitosa
```json
{
  "data": { ... },
  "meta": {
    "total": 100,
    "hasMore": true
  }
}
```

### Respuesta de Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Campo requerido",
    "field": "email"
  }
}
```

---

## Códigos de Error

| Código | HTTP | Descripción |
|--------|------|-------------|
| `VALIDATION_ERROR` | 400 | Input inválido |
| `UNAUTHORIZED` | 401 | No autenticado |
| `FORBIDDEN` | 403 | No autorizado |
| `NOT_FOUND` | 404 | Recurso no encontrado |
| `CONFLICT` | 409 | Duplicado o conflicto |
| `RATE_LIMITED` | 429 | Límite excedido |
| `SERVER_ERROR` | 500 | Error interno |

---

## Formato de Moneda

Todos los valores monetarios en **COP (Pesos Colombianos)** como enteros:
- `2500000` = $2,500,000 COP
- `149900` = $149,900 COP

---

## Formato de Fecha

ISO 8601: `2026-02-07T14:30:00Z`

---

## Paginación

- `limit`: Items por página (default 20, max 100)
- `offset`: Saltar items (default 0)
- `page`: Alternativa a offset (page * limit = offset)

Respuesta incluye:
```json
{
  "meta": {
    "total": 156,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

---

## Filtros Comunes

### Propiedades
```
?city=bogota
&neighborhood=chapinero
&minPrice=1500000
&maxPrice=3000000
&bedrooms=2
&type=apartment
&amenities=gym,pool
&sortBy=price_asc
```

### Candidatos
```
?propertyId=xxx
&status=pending
&riskLevel=A,B
&minScore=70
&sortBy=score_desc
```

### Pagos
```
?leaseId=xxx
&status=pending,late
&year=2026
&month=2
```

---

## Autenticación de Requests

Todas las rutas protegidas requieren:
```
Authorization: Bearer <jwt_token>
```

---

*Referencia rápida para desarrollo backend*
