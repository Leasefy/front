# Frontend Phases - Arriendo Facil MVP

## Resumen de Flujos (basado en MVP de referencia)

El MVP de referencia (https://ai-risk-scoring-rent-ui2l.bolt.host) tiene los siguientes flujos principales:

### Usuarios del Sistema
1. **Inquilino** - Busca propiedades, se postula, sigue su proceso
2. **Propietario** - Publica inmuebles, recibe y evalua candidatos
3. **Ambos** - Usuario con ambos roles activos

---

## FASE 1: Homepage & Landing (✅ COMPLETADA)
**Estado**: Implementado con diseño pixel-perfect Luxterra

### Componentes Implementados:
- Hero Section con búsqueda
- Stats animados (propiedades, clientes, ciudades, score)
- Featured Properties (scroll horizontal)
- Services Section (4 cards)
- Top Agents Section
- Testimonials Section
- Recent Insights (Blog)
- FAQ Section (accordion)
- CTA Section
- Footer completo

### Página de Propiedades:
- Grid de propiedades con filtros
- FilterSidebar con rangos de precio, habitaciones, etc.
- PropertyCard con badges y favoritos

---

## FASE 2: Autenticación
**Prioridad**: Alta | **Complejidad**: Media

### 2.1 Registro (`/registro`)
```
Campos:
- Nombre completo
- Email
- Contraseña
- Confirmar contraseña
- Tipo de cuenta: [Busco arriendo] [Tengo inmuebles] [Ambos]
- Checkbox términos y condiciones
```

### 2.2 Login (`/login`)
```
Campos:
- Email
- Contraseña
- Checkbox "Recordarme"
- Link "Olvidé mi contraseña"
```

### 2.3 Recuperar Contraseña (`/recuperar-contrasena`)
```
- Input email
- Enviar link de recuperación
```

### 2.4 Perfil (`/perfil`)
```
Campos:
- Avatar
- Nombre completo
- Email (readonly)
- Teléfono
- Selector de rol: [Encontrar arriendo] [Publicar inmuebles] [Ambos]
```

### Componentes Necesarios:
- `AuthLayout` - Layout para páginas de auth
- `LoginForm` - Formulario de login
- `RegisterForm` - Formulario de registro
- `ProfileForm` - Formulario de perfil
- `RoleSelector` - Selector de rol (inquilino/propietario/ambos)

---

## FASE 3: Detalle de Propiedad (Mejoras)
**Prioridad**: Alta | **Complejidad**: Baja

### Mejoras al detalle existente (`/propiedades/[id]`)
- Agregar botón "Postularme" (solo si logueado como inquilino)
- Agregar sección "Costos estimados"
- Agregar información del propietario
- Agregar reglas del inmueble

### Componentes Necesarios:
- `PropertyCosts` - Desglose de costos mensuales
- `PropertyRules` - Reglas del inmueble
- `OwnerInfo` - Info del propietario (foto, nombre, verificado)
- `ApplyButton` - Botón de postulación con validación de auth

---

## FASE 4: Flujo de Postulación (Inquilino)
**Prioridad**: Alta | **Complejidad**: Alta

### 4.1 Wizard de Postulación (`/postular/[propertyId]`)
Stepper de 6 pasos:

**Paso 1 - Contexto**
```
- Resumen del inmueble
- Explicación del proceso
- Tiempo estimado: 8-12 minutos
```

**Paso 2 - Identidad**
```
Campos:
- Nombre completo
- Tipo de documento: [Cédula ciudadanía] [Cédula extranjería] [Pasaporte]
- Número de documento
- Fecha de nacimiento
- Teléfono
- Dirección actual
- Ciudad actual
```

**Paso 3 - Ingresos**
```
Campos:
- Ingreso mensual neto
- Tipo de ingreso: [Empleado] [Independiente] [Empresa propia] [Estudiante] [Ingresos exterior]
- Deuda mensual
- Gastos fijos mensuales
- (Futuro: Upload de documentos)
```

**Paso 4 - Estabilidad**
```
Campos:
- Antigüedad laboral (meses)
- Tipo de contrato: [Indefinido] [Término fijo] [Prestación servicios] [No aplica]
- Tiempo en dirección actual (meses)
- Motivo mudanza: [Cambio trabajo] [Motivos familiares] [Más espacio] [Mejor ubicación] [Mejor precio] [Otro]
- Personas que vivirán
- Checkbox "Tengo mascotas"
```

**Paso 5 - Historial**
```
Campos:
- Checkbox "He tenido moras en últimos 24 meses"
- Arrendador anterior (opcional):
  - Nombre
  - Teléfono
  - Periodo aproximado
- Referencia personal/laboral:
  - Nombre
  - Teléfono
  - Relación
- Checkbox "Tengo codeudor disponible"
```

**Paso 6 - Confirmación**
```
- Resumen de la postulación
- Autorizaciones (checkboxes):
  - Autorizo verificación de identidad e ingresos
  - Autorizo compartir perfil con propietario
  - Acepto tratamiento de datos personales
- Botón "Enviar solicitud"
```

### Componentes Necesarios:
- `ApplicationWizard` - Container del wizard
- `ApplicationStepper` - Indicador de progreso
- `StepContext` - Paso 1
- `StepIdentity` - Paso 2
- `StepIncome` - Paso 3
- `StepStability` - Paso 4
- `StepHistory` - Paso 5
- `StepConfirm` - Paso 6
- `ApplicationSummary` - Resumen de datos
- `AuthorizationCheckboxes` - Checkboxes de autorización

---

## FASE 5: Dashboard Inquilino
**Prioridad**: Alta | **Complejidad**: Media

### 5.1 Mis Solicitudes (`/mis-solicitudes`)
```
Lista de postulaciones con:
- Imagen del inmueble
- Nombre y ubicación
- Estado: [Borrador] [Enviada] [En revisión] [Aprobada] [Rechazada]
- Precio mensual
- Fecha/tiempo desde última acción
- Acciones: [Ver detalle] [Continuar] (si borrador) [Retirar]
```

### 5.2 Detalle de Solicitud (`/solicitud/[id]`)
```
Secciones:
- Header: Título, fecha, estado
- Inmueble: Info básica del inmueble
- Tu información: Nombre, ingreso, antigüedad, contrato
- Estado de verificación: Identidad, Ingresos, Referencias
- Línea de tiempo: Historial de eventos
- Resultado del scoring (cuando disponible)
```

### 5.3 Guardados (`/guardados`)
```
Grid de propiedades guardadas como favoritos
```

### Componentes Necesarios:
- `ApplicationsList` - Lista de solicitudes
- `ApplicationCard` - Card de solicitud
- `ApplicationDetail` - Detalle completo
- `ApplicationTimeline` - Línea de tiempo
- `VerificationStatus` - Estado de verificaciones
- `ScoringResult` - Resultado del AI scoring (A, B, C, D)
- `SavedProperties` - Grid de favoritos

---

## FASE 6: Dashboard Propietario
**Prioridad**: Alta | **Complejidad**: Media

### 6.1 Mis Inmuebles (`/mis-inmuebles`)
```
Lista de propiedades publicadas:
- Imagen
- Nombre y ubicación
- Estado: [Activo] [Pausado] [Arrendado]
- Precio
- Cantidad de candidatos
- Acciones: [Ver] [Editar] [Pausar]
```

### 6.2 Publicar Inmueble (`/mis-inmuebles/nuevo`)
```
Formulario:
1. Información básica:
   - Título
   - Descripción
   - Ciudad: [Bogotá] [Medellín] [Cali] [Barranquilla] [Cartagena]
   - Barrio
   - Dirección (privada)

2. Precio y costos:
   - Arriendo mensual
   - Administración

3. Características:
   - Habitaciones
   - Baños
   - Área (m²)
   - Checkboxes: Pet friendly, Amoblado, Parqueadero

4. Imágenes:
   - URLs de imágenes (Pexels, Unsplash)
   - Preview de imágenes

5. Reglas del inmueble:
   - Textarea para políticas
```

### 6.3 Candidatos (`/mis-candidatos`)
```
Lista de postulaciones recibidas:
- Filtro por inmueble
- Card de candidato:
  - Nombre
  - Score AI: [A] [B] [C] [D]
  - Ingreso mensual
  - Antigüedad laboral
  - Estado de verificación
  - Acciones: [Ver perfil] [Aprobar] [Rechazar]
```

### 6.4 Detalle de Candidato (`/candidato/[id]`)
```
Información completa del candidato:
- Datos personales (verificados)
- Información financiera
- Estabilidad laboral
- Historial de arriendo
- Referencias
- Score AI con explicación
- Acciones: [Aprobar] [Rechazar] [Solicitar más info]
```

### Componentes Necesarios:
- `PropertiesList` - Lista de inmuebles del propietario
- `PropertyForm` - Formulario de crear/editar inmueble
- `ImageUploader` - Cargador de imágenes por URL
- `CandidatesList` - Lista de candidatos
- `CandidateCard` - Card de candidato con score
- `CandidateDetail` - Detalle completo del candidato
- `ScoreBadge` - Badge visual del score (A verde, B azul, C amarillo, D rojo)
- `ApprovalActions` - Botones de aprobar/rechazar

---

## FASE 7: AI Scoring & Resultados
**Prioridad**: Media | **Complejidad**: Alta

### 7.1 Proceso de Scoring
```
Cuando se envía una solicitud:
1. Estado: "Procesando"
2. AI analiza datos del candidato
3. Genera score (A, B, C, D)
4. Notifica a propietario e inquilino
```

### 7.2 Visualización del Score
```
Para Inquilino:
- Score obtenido con explicación general
- Recomendaciones de mejora

Para Propietario:
- Score detallado con breakdown
- Factores de riesgo identificados
- Recomendación de acción
```

### Componentes Necesarios:
- `ScoringProgress` - Indicador de procesamiento
- `ScoreDisplay` - Visualización del score
- `ScoreBreakdown` - Desglose de factores
- `RiskFactors` - Lista de factores de riesgo
- `Recommendations` - Recomendaciones

---

## Resumen de Páginas por Fase

| Fase | Páginas | Prioridad |
|------|---------|-----------|
| 1 | `/`, `/propiedades` | ✅ Completada |
| 2 | `/login`, `/registro`, `/perfil`, `/recuperar-contrasena` | Alta |
| 3 | `/propiedades/[id]` (mejoras) | Alta |
| 4 | `/postular/[propertyId]` | Alta |
| 5 | `/mis-solicitudes`, `/solicitud/[id]`, `/guardados` | Alta |
| 6 | `/mis-inmuebles`, `/mis-inmuebles/nuevo`, `/mis-candidatos`, `/candidato/[id]` | Alta |
| 7 | Componentes de scoring (integrado en fases 5-6) | Media |

---

## Estructura de Carpetas Propuesta

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── registro/page.tsx
│   │   └── recuperar-contrasena/page.tsx
│   ├── (dashboard)/
│   │   ├── perfil/page.tsx
│   │   ├── mis-solicitudes/page.tsx
│   │   ├── solicitud/[id]/page.tsx
│   │   ├── guardados/page.tsx
│   │   ├── mis-inmuebles/
│   │   │   ├── page.tsx
│   │   │   └── nuevo/page.tsx
│   │   ├── mis-candidatos/page.tsx
│   │   └── candidato/[id]/page.tsx
│   ├── postular/[propertyId]/page.tsx
│   └── propiedades/
│       ├── page.tsx (✅)
│       └── [id]/page.tsx (✅ mejorar)
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── ProfileForm.tsx
│   │   └── RoleSelector.tsx
│   ├── application/
│   │   ├── ApplicationWizard.tsx
│   │   ├── ApplicationStepper.tsx
│   │   ├── steps/
│   │   │   ├── StepContext.tsx
│   │   │   ├── StepIdentity.tsx
│   │   │   ├── StepIncome.tsx
│   │   │   ├── StepStability.tsx
│   │   │   ├── StepHistory.tsx
│   │   │   └── StepConfirm.tsx
│   │   └── ApplicationSummary.tsx
│   ├── dashboard/
│   │   ├── tenant/
│   │   │   ├── ApplicationsList.tsx
│   │   │   ├── ApplicationCard.tsx
│   │   │   ├── ApplicationDetail.tsx
│   │   │   └── ApplicationTimeline.tsx
│   │   └── landlord/
│   │       ├── PropertiesList.tsx
│   │       ├── PropertyForm.tsx
│   │       ├── CandidatesList.tsx
│   │       ├── CandidateCard.tsx
│   │       └── CandidateDetail.tsx
│   ├── scoring/
│   │   ├── ScoreBadge.tsx
│   │   ├── ScoreDisplay.tsx
│   │   ├── ScoreBreakdown.tsx
│   │   └── RiskFactors.tsx
│   └── ui/
│       └── ... (componentes base)
└── hooks/
    ├── useAuth.ts
    ├── useApplication.ts
    └── useScoring.ts
```

---

## Orden de Implementación Recomendado

### Sprint 1: Auth + Mejoras Detalle
1. Fase 2: Sistema de autenticación completo
2. Fase 3: Mejoras al detalle de propiedad

### Sprint 2: Flujo de Postulación
3. Fase 4: Wizard de postulación completo (6 pasos)

### Sprint 3: Dashboards
4. Fase 5: Dashboard inquilino
5. Fase 6: Dashboard propietario

### Sprint 4: AI Scoring
6. Fase 7: Integración de scoring y resultados

---

## Notas Técnicas

### Estado Global
- Usar Zustand o Context para:
  - Estado de autenticación
  - Rol actual del usuario
  - Datos del wizard de postulación
  - Favoritos/guardados

### Validación
- Usar Zod o Yup para validación de formularios
- React Hook Form para manejo de forms

### Persistencia
- LocalStorage para borradores de postulación
- Sync con backend cuando disponible

### Animaciones
- Framer Motion para transiciones del wizard
- Animaciones consistentes con diseño Luxterra
