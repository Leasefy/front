# Roadmap: Dashboard Inmobiliaria

## Resumen Ejecutivo

**Objetivo:** Crear un dashboard especializado para inmobiliarias que manejan 50-500+ propiedades con equipos de agentes y múltiples propietarios.

**Fases:** 10 fases
**Rutas nuevas:** ~15 páginas
**Componentes nuevos:** ~40 componentes
**Tipos nuevos:** ~15 interfaces

---

## Fase 1: Fundación y Modelos de Datos

### Objetivo
Establecer la base de datos, tipos TypeScript y estructura de rutas para el módulo de inmobiliaria.

### Entregables

#### 1.1 Tipos TypeScript (`src/lib/types/inmobiliaria.ts`)
```typescript
// Propietario (dueño de inmuebles)
interface Propietario {
  id: string;
  name: string;
  email: string;
  phone: string;
  documentType: 'CC' | 'CE' | 'NIT';
  documentNumber: string;
  bankAccount: {
    bank: BankCode;
    accountType: 'savings' | 'checking';
    accountNumber: string;
    accountHolder: string;
  };
  properties: string[]; // IDs de propiedades consignadas
  createdAt: string;
  notes?: string;
}

// Consignación (acuerdo inmobiliaria-propietario)
interface Consignacion {
  id: string;
  propertyId: string;
  propietarioId: string;
  agenteId: string;
  commissionPercent: number; // 8-12% típico
  contractDate: string;
  contractEndDate?: string;
  status: 'active' | 'terminated' | 'expired';
  terms?: string;
}

// Agente inmobiliario
interface Agente {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'agent' | 'coordinator' | 'director';
  assignedProperties: string[];
  hireDate: string;
  commissionSplit: number; // % que se lleva el agente de la comisión
  status: 'active' | 'inactive';
}

// Pipeline de arriendo
interface PipelineItem {
  id: string;
  propertyId: string;
  candidateId: string;
  agenteId: string;
  stage: PipelineStage;
  enteredStageAt: string;
  notes?: string;
  nextAction?: string;
  nextActionDate?: string;
}

type PipelineStage =
  | 'lead'           // Interesado
  | 'visit_scheduled' // Visita programada
  | 'visit_done'      // Visita realizada
  | 'application'     // Aplicación enviada
  | 'evaluation'      // En evaluación
  | 'approved'        // Aprobado
  | 'contract'        // Contrato en firma
  | 'handover'        // En entrega
  | 'completed';      // Arrendado

// Cobro mensual
interface Cobro {
  id: string;
  leaseId: string;
  propertyId: string;
  propietarioId: string;
  tenantId: string;
  month: string; // '2026-02'
  rentAmount: number;
  adminAmount?: number; // Administración PH
  totalAmount: number;
  status: 'pending' | 'paid' | 'partial' | 'late' | 'defaulted';
  dueDate: string;
  paidDate?: string;
  paidAmount?: number;
  paymentMethod?: string;
  lateFee?: number;
}

// Dispersión a propietario
interface Dispersion {
  id: string;
  propietarioId: string;
  month: string;
  cobros: string[]; // IDs de cobros incluidos
  totalCollected: number;
  commissionAmount: number;
  commissionPercent: number;
  netToPropietario: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transferDate?: string;
  transferReference?: string;
}

// Solicitud de mantenimiento
interface SolicitudMantenimiento {
  id: string;
  propertyId: string;
  propietarioId: string;
  tenantId: string;
  agenteId: string;
  type: 'plumbing' | 'electrical' | 'appliance' | 'structural' | 'other';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'reported' | 'quoted' | 'approved' | 'in_progress' | 'completed';
  estimatedCost?: number;
  approvedCost?: number;
  paidBy: 'owner' | 'tenant' | 'split';
  createdAt: string;
  completedAt?: string;
}
```

#### 1.2 Mock Data (`src/lib/data/mock-inmobiliaria.ts`)
- 10 propietarios de ejemplo
- 50 propiedades consignadas
- 8 agentes
- Pipeline con 20 items en diferentes etapas
- Historial de cobros 6 meses
- 5 solicitudes de mantenimiento

#### 1.3 Estructura de Rutas
```
/panel/inmobiliaria
├── page.tsx                    → Dashboard principal
├── propietarios/
│   ├── page.tsx               → Lista de propietarios
│   └── [id]/page.tsx          → Detalle propietario
├── consignaciones/
│   ├── page.tsx               → Propiedades consignadas
│   └── nueva/page.tsx         → Nueva consignación
├── agentes/
│   ├── page.tsx               → Lista de agentes
│   └── [id]/page.tsx          → Detalle agente
├── pipeline/page.tsx           → Kanban de arriendos
├── cobros/page.tsx             → Gestión de cobros
├── dispersiones/page.tsx       → Pagos a propietarios
├── reportes/
│   ├── page.tsx               → Centro de reportes
│   ├── extractos/page.tsx     → Extractos propietarios
│   └── cartera/page.tsx       → Reporte de cartera
├── mantenimiento/page.tsx      → Solicitudes
└── configuracion/page.tsx      → Config inmobiliaria
```

#### 1.4 Layout Inmobiliaria
- Sidebar específico con navegación del módulo
- Header con nombre de inmobiliaria
- Breadcrumbs

### Verificación Fase 1
- [ ] Tipos TypeScript compilan sin errores
- [ ] Mock data cargable
- [ ] Rutas básicas navegan correctamente
- [ ] Layout renderiza con sidebar

---

## Fase 2: CRM de Propietarios

### Objetivo
Gestionar la base de propietarios (dueños) que consignan propiedades a la inmobiliaria.

### Entregables

#### 2.1 Página Lista Propietarios
- Tabla con búsqueda y filtros
- Columnas: nombre, propiedades activas, cartera pendiente, último pago
- Acciones: ver, editar, nuevo
- Exportar a Excel

#### 2.2 Página Detalle Propietario
- Info personal y contacto
- Datos bancarios (para dispersiones)
- Lista de propiedades consignadas
- Historial de pagos recibidos
- Notas y seguimiento

#### 2.3 Modal Agregar/Editar Propietario
- Formulario con validación
- Campos bancarios con selector de banco colombiano
- Validación de cédula/NIT

#### 2.4 Componentes
- `PropietarioCard` - Card compacta
- `PropietarioTable` - Tabla con acciones
- `PropietarioForm` - Formulario completo
- `PropietarioBankInfo` - Sección datos bancarios
- `PropietarioStats` - KPIs del propietario

### Verificación Fase 2
- [ ] CRUD completo de propietarios
- [ ] Búsqueda y filtros funcionan
- [ ] Datos bancarios se guardan correctamente
- [ ] Propiedades asociadas se muestran

---

## Fase 3: Consignaciones

### Objetivo
Gestionar el proceso de consignación de propiedades y asignación a agentes.

### Entregables

#### 3.1 Página Lista Consignaciones
- Todas las propiedades del portafolio
- Filtros: estado, agente, propietario, zona
- Vista cards o tabla
- Estado: disponible, arrendada, en proceso

#### 3.2 Wizard Nueva Consignación
```
Paso 1: Seleccionar propietario (existente o nuevo)
Paso 2: Datos de la propiedad
Paso 3: Términos (comisión %, duración)
Paso 4: Asignar agente
Paso 5: Acta de entrega (fotos, inventario)
Paso 6: Confirmación
```

#### 3.3 Detalle Consignación
- Info de la propiedad
- Propietario asociado
- Agente asignado
- Historial de arriendos
- Documentos (contrato consignación, fotos)

#### 3.4 Componentes
- `ConsignacionCard` - Card de propiedad consignada
- `ConsignacionWizard` - Wizard multi-paso
- `ActaEntrega` - Formulario de inventario con fotos
- `ConsignacionTimeline` - Historial de la propiedad

### Verificación Fase 3
- [ ] Wizard completo funciona
- [ ] Propiedades se asignan a propietarios
- [ ] Agentes se asignan correctamente
- [ ] Fotos de acta se suben

---

## Fase 4: Gestión de Agentes

### Objetivo
Administrar el equipo de agentes con métricas de rendimiento.

### Entregables

#### 4.1 Página Lista Agentes
- Cards o tabla de agentes
- Métricas: propiedades activas, arriendos mes, comisiones
- Filtro por rol y estado
- Ranking de rendimiento

#### 4.2 Página Detalle Agente
- Perfil y contacto
- Propiedades asignadas
- Pipeline activo (leads, en proceso)
- Historial de cierres
- Comisiones generadas

#### 4.3 Asignación de Propiedades
- Reasignar propiedad a otro agente
- Historial de asignaciones
- Carga de trabajo por agente

#### 4.4 Componentes
- `AgenteCard` - Card con métricas
- `AgenteProfile` - Perfil completo
- `AgenteMetrics` - KPIs del agente
- `AgenteLeaderboard` - Ranking de agentes
- `AsignacionModal` - Reasignar propiedad

### Verificación Fase 4
- [ ] CRUD de agentes
- [ ] Métricas calculan correctamente
- [ ] Asignación de propiedades funciona
- [ ] Ranking se actualiza

---

## Fase 5: Pipeline de Arriendos (Kanban)

### Objetivo
Visualizar y gestionar el proceso de arriendo en formato Kanban.

### Entregables

#### 5.1 Página Pipeline Kanban
```
| Lead | Visita | Visita | Aplicación | Evaluación | Aprobado | Contrato | Entrega | Cerrado |
|      | Prog.  | Hecha  |            |            |          |          |         |         |
|------|--------|--------|------------|------------|----------|----------|---------|---------|
| Card | Card   | Card   | Card       | Card       | Card     | Card     | Card    | Card    |
| Card |        | Card   |            | Card       |          | Card     |         |         |
```

#### 5.2 Funcionalidades
- Drag & drop entre columnas
- Filtros: agente, propiedad, fecha
- Click para ver detalle
- Acciones rápidas por etapa
- Contador por columna
- Tiempo en cada etapa

#### 5.3 Card del Pipeline
- Propiedad (foto + dirección)
- Candidato (nombre + score)
- Agente asignado
- Días en esta etapa
- Próxima acción

#### 5.4 Componentes
- `PipelineBoard` - Tablero Kanban completo
- `PipelineColumn` - Columna con contador
- `PipelineCard` - Card draggable
- `PipelineFilters` - Filtros del pipeline
- `PipelineDetail` - Modal con detalle

### Verificación Fase 5
- [ ] Kanban renderiza correctamente
- [ ] Drag & drop funciona
- [ ] Filtros aplican
- [ ] Detalle muestra info completa

---

## Fase 6: Gestión de Cobros

### Objetivo
Rastrear y gestionar los cobros mensuales de arriendo.

### Entregables

#### 6.1 Página Cobros
- Vista mes actual por defecto
- Tabs: Pendientes, Pagados, En mora
- Filtros: propiedad, propietario, estado
- Totales: por cobrar, cobrado, mora

#### 6.2 Registro de Pago
- Modal para registrar pago manual
- Monto total o parcial
- Método de pago
- Fecha de pago
- Comprobante (opcional)

#### 6.3 Gestión de Mora
- Lista de morosos con días de atraso
- Calcular interés de mora
- Enviar recordatorio (email/SMS)
- Historial de gestión

#### 6.4 Recordatorios Automáticos
- Configurar secuencia: 5 días antes, día del vencimiento, 3 días después
- Templates de mensaje
- Log de envíos

#### 6.5 Componentes
- `CobroTable` - Tabla de cobros del mes
- `CobroCard` - Card individual
- `RegistrarPagoModal` - Registrar pago
- `MoraAlert` - Indicador de mora
- `RecordatorioConfig` - Configurar recordatorios
- `CobroResumen` - Totales del mes

### Verificación Fase 6
- [x] Cobros se generan automáticamente cada mes
- [x] Pagos se registran correctamente
- [x] Mora se calcula automáticamente
- [x] Recordatorios se pueden configurar

**Status:** ✅ Complete (2026-02-08)

---

## Fase 7: Dispersiones a Propietarios

### Objetivo
Gestionar los pagos mensuales a propietarios después de descontar comisión.

### Entregables

#### 7.1 Página Dispersiones
- Vista por mes
- Lista de dispersiones pendientes
- Estado: pendiente, procesando, completado
- Totales a dispersar

#### 7.2 Generación de Dispersiones
```
1. Seleccionar mes a dispersar
2. Ver cobros recibidos por propietario
3. Calcular comisión por propiedad
4. Generar neto a pagar
5. Aprobar dispersión
6. Marcar como pagado (con referencia)
```

#### 7.3 Detalle Dispersión
- Propietario
- Propiedades incluidas
- Desglose: canon, comisión, neto
- Datos bancarios destino
- Estado y fecha de pago

#### 7.4 Extracto del Propietario
- PDF/descargable
- Período
- Propiedades y cobros
- Comisiones descontadas
- Neto pagado

#### 7.5 Componentes
- `DispersionTable` - Tabla de dispersiones
- `DispersionDetail` - Detalle completo
- `DispersionWizard` - Generar dispersiones del mes
- `ExtractoPropietario` - Vista/PDF del extracto
- `ComisionDesglose` - Desglose de comisiones

### Verificación Fase 7
- [x] Dispersiones se calculan correctamente
- [x] Comisiones aplican por propiedad
- [x] Extracto se genera en PDF
- [x] Estado de dispersión se actualiza

**Status:** ✅ Complete (2026-02-08)

---

## Fase 8: Centro de Reportes

### Objetivo
Proveer reportes financieros y operativos para la inmobiliaria.

### Entregables

#### 8.1 Dashboard de Reportes
- Cards con reportes disponibles
- Filtros globales (período, zona)
- Favoritos/frecuentes

#### 8.2 Reportes Disponibles

| Reporte | Descripción | Exportable |
|---------|-------------|------------|
| **Extractos Propietarios** | Extracto mensual por propietario | PDF |
| **Cartera por Edades** | Mora 30/60/90+ días | Excel |
| **Comisiones por Agente** | Comisiones generadas | Excel |
| **Ocupación Portafolio** | % ocupación por zona | PDF |
| **Vencimientos** | Contratos por vencer | Excel |
| **Rendimiento Agentes** | KPIs comparativos | PDF |
| **Flujo de Caja** | Ingresos vs dispersiones | Excel |

#### 8.3 Componentes
- `ReporteCard` - Card de reporte
- `ReporteViewer` - Visualizador
- `ReportFilters` - Filtros de período
- `ExportButton` - Exportar PDF/Excel
- `CarteraEdades` - Tabla aging
- `OcupacionChart` - Gráfico de ocupación

### Verificación Fase 8
- [ ] Todos los reportes generan datos
- [ ] Filtros aplican correctamente
- [ ] PDFs se generan correctamente
- [ ] Excel exporta con formato

---

## Fase 9: Operaciones (Renovaciones, Mantenimiento, IPC)

### Objetivo
Gestionar operaciones recurrentes: renovaciones, mantenimiento e incrementos IPC.

### Entregables

#### 9.1 Renovaciones
- Lista de contratos por vencer (90/60/30 días)
- Workflow: notificar → negociar → renovar
- Cálculo automático de incremento IPC
- Generar nuevo contrato

#### 9.2 Incremento IPC
- Obtener IPC vigente (DANE)
- Calcular nuevo canon
- Aplicar masivamente
- Generar notificaciones

#### 9.3 Mantenimiento
- Lista de solicitudes activas
- Crear solicitud
- Cotizaciones (múltiples)
- Aprobación del propietario
- Seguimiento hasta cierre
- Fotos antes/después

#### 9.4 Componentes
- `RenovacionesTable` - Contratos por vencer
- `RenovacionWorkflow` - Proceso de renovación
- `IPCCalculator` - Calculadora IPC
- `MantenimientoList` - Lista de solicitudes
- `MantenimientoForm` - Nueva solicitud
- `CotizacionComparator` - Comparar cotizaciones

### Verificación Fase 9
- [ ] Renovaciones alertan correctamente
- [ ] IPC calcula según DANE
- [ ] Mantenimiento fluye hasta cierre
- [ ] Propietario puede aprobar cotización

---

## Fase 10: Operaciones Bulk y Configuración

### Objetivo
Permitir operaciones masivas y configuración del módulo.

### Entregables

#### 10.1 Operaciones Bulk
- Enviar recordatorios masivos
- Aplicar incremento IPC a múltiples propiedades
- Generar extractos de todos los propietarios
- Exportar cartera completa
- Reasignación masiva de agentes

#### 10.2 Configuración Inmobiliaria
- Datos de la inmobiliaria
- Comisión por defecto
- Cuentas bancarias para cobros
- Templates de mensajes
- Configuración de recordatorios
- Roles y permisos

#### 10.3 Onboarding Inmobiliaria
- Wizard de configuración inicial
- Importar propiedades existentes (CSV)
- Importar propietarios (CSV)
- Configurar equipo

#### 10.4 Componentes
- `BulkActionSelector` - Selector de acción masiva
- `BulkProgressBar` - Progreso de operación
- `ConfigInmobiliaria` - Página de configuración
- `ImportWizard` - Importar desde CSV
- `TemplateEditor` - Editar templates de mensajes

### Verificación Fase 10
- [ ] Operaciones bulk procesan correctamente
- [ ] Configuración persiste
- [ ] Import CSV funciona
- [ ] Templates se usan en notificaciones

---

## Resumen de Fases

| Fase | Nombre | Páginas | Componentes | Prioridad |
|------|--------|---------|-------------|-----------|
| 1 | Fundación y Modelos | 0 | 0 | Alta |
| 2 | CRM Propietarios | 2 | 5 | Alta |
| 3 | Consignaciones | 3 | 4 | Alta |
| 4 | Gestión Agentes | 2 | 5 | Alta |
| 5 | Pipeline Kanban | 1 | 5 | Alta |
| 6 | Gestión Cobros | 1 | 6 | Alta |
| 7 | Dispersiones | 1 | 5 | Alta |
| 8 | Centro Reportes | 3 | 6 | Media |
| 9 | Operaciones | 2 | 6 | Media |
| 10 | Bulk y Config | 2 | 5 | Media |

**Total:** 17 páginas, ~47 componentes nuevos

---

## Dependencias entre Fases

```
Fase 1 (Fundación)
    ↓
┌───┴───┬───────┐
↓       ↓       ↓
Fase 2  Fase 3  Fase 4
(Prop)  (Cons)  (Agent)
    ↓       ↓       ↓
    └───────┴───────┘
            ↓
        Fase 5 (Pipeline)
            ↓
        Fase 6 (Cobros)
            ↓
        Fase 7 (Dispersiones)
            ↓
    ┌───────┴───────┐
    ↓               ↓
Fase 8          Fase 9
(Reportes)      (Operaciones)
    └───────┬───────┘
            ↓
        Fase 10 (Bulk + Config)
```

---

## Estimación y Priorización

### MVP Inmobiliaria (Fases 1-7)
**Core funcional:** Propietarios + Consignaciones + Agentes + Pipeline + Cobros + Dispersiones

### Versión Completa (Fases 8-10)
**Operaciones avanzadas:** Reportes + Renovaciones/Mantenimiento + Bulk

---

## Consideraciones Técnicas

### Base de Datos (para Backend)
- Nuevas tablas: `propietarios`, `consignaciones`, `agentes`, `cobros`, `dispersiones`, `mantenimiento`
- Relaciones con tablas existentes: `properties`, `leases`, `users`

### Autenticación
- Nuevo rol: `inmobiliaria_admin`, `inmobiliaria_agent`
- Permisos granulares por módulo

### Integraciones Futuras
- PayU/Bloque para cobros automáticos
- DANE API para IPC
- Generación de PDFs para extractos

---

*Documento creado: 2026-02-07*
*Última actualización: 2026-02-07*
