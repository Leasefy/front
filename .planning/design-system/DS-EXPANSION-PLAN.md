# Design System Expansion Plan
## Objetivo: Alcanzar nivel Material Design

### Estado Actual vs Objetivo

| Categoría | Actual | Material Design | Gap |
|-----------|--------|-----------------|-----|
| Core Components | 26 | 45+ | 19+ |
| Form Components | 5 | 12 | 7 |
| Navigation | 3 | 8 | 5 |
| Data Display | 4 | 10 | 6 |
| Feedback | 6 | 8 | 2 |
| Layout | 3 | 6 | 3 |

---

## FASE 1: Foundation (Crítico)

### 1.1 Token System Consolidation
- [ ] Crear `src/lib/design-system/tokens/index.ts` como single source of truth
- [ ] Extraer tipos TypeScript para todos los tokens
- [ ] Crear sistema de themes programático
- [ ] Documentar naming conventions

### 1.2 Core Missing Components
- [ ] **Toast/Sonner** - Sistema de notificaciones
- [ ] **Avatar** - Usuario, iniciales, fallback
- [ ] **Progress** - Linear + Circular
- [ ] **Spinner/Loader** - Estados de carga
- [ ] **Breadcrumb** - Navegación jerárquica

---

## FASE 2: Form System (Alto Impacto)

### 2.1 Form Infrastructure
- [ ] **Form** - Wrapper con react-hook-form + zod
- [ ] **FormField** - Field wrapper con label, error, hint
- [ ] **FormSection** - Agrupación de campos

### 2.2 Input Components
- [ ] **Slider** - Range input single/dual
- [ ] **Switch** - Mejorar el existente
- [ ] **RadioGroup** - Grupo de radios styled
- [ ] **DatePicker** - Selector de fecha
- [ ] **TimePicker** - Selector de hora
- [ ] **FileUpload** - Drag & drop upload
- [ ] **Combobox** - Autocomplete/search select
- [ ] **NumberInput** - Input numérico con +/-
- [ ] **PhoneInput** - Input teléfono con país
- [ ] **OTPInput** - Verificación códigos

---

## FASE 3: Navigation & Layout (Medio)

### 3.1 Navigation Components
- [ ] **Sidebar** - Navegación lateral colapsable
- [ ] **Stepper** - Wizard/multi-step
- [ ] **Pagination** - Paginación de datos
- [ ] **Tabs** - Mejorar variantes (underline, pills, vertical)
- [ ] **NavigationMenu** - Mega menu para navbar
- [ ] **CommandPalette** - Cmd+K search

### 3.2 Layout Components
- [ ] **AspectRatio** - Container con ratio
- [ ] **Stack** - Flexbox vertical/horizontal
- [ ] **Grid** - Grid system preset
- [ ] **Divider** - Separador con texto
- [ ] **ScrollArea** - Scrollable container styled
- [ ] **Collapsible** - Sección colapsable

---

## FASE 4: Data Display (Medio)

### 4.1 Table System
- [ ] **DataTable** - Tabla con sorting, filtering, pagination
- [ ] **Table** - Tabla básica styled
- [ ] **TableSkeleton** - Loading state para tablas

### 4.2 Display Components
- [ ] **List** - Lista con items interactivos
- [ ] **ListItem** - Item de lista con avatar, actions
- [ ] **DescriptionList** - Key-value pairs
- [ ] **StatCard** - Expandir PlanStatsCard
- [ ] **Timeline** - Vertical timeline
- [ ] **Calendar** - Calendario display
- [ ] **KPI** - Key Performance Indicator card

---

## FASE 5: Feedback & Overlay (Bajo)

### 5.1 Feedback Components
- [ ] **AlertBanner** - Banner persistente top/bottom
- [ ] **InlineAlert** - Alerta dentro de contenido
- [ ] **ProgressSteps** - Progress con steps
- [ ] **Rating** - Estrellas/puntuación

### 5.2 Overlay Components
- [ ] **Drawer** - Mejorar Sheet con más variantes
- [ ] **ContextMenu** - Right-click menu
- [ ] **HoverCard** - Card on hover
- [ ] **Lightbox** - Image viewer

---

## FASE 6: Advanced Patterns (Nice to Have)

### 6.1 Composition Patterns
- [ ] **Card variants** - Product, User, Stat, Action cards
- [ ] **Modal variants** - Confirm, Form, Info modals
- [ ] **Empty states** - Variantes para diferentes contextos
- [ ] **Error boundaries** - Error UI components

### 6.2 Animation Patterns
- [ ] **Skeleton variants** - Card, List, Table skeletons
- [ ] **Transition presets** - Page transitions
- [ ] **Micro-interactions** - Hover, click, focus effects

---

## Estructura de Archivos Propuesta

```
src/
├── lib/
│   └── design-system/
│       ├── tokens/
│       │   ├── colors.ts
│       │   ├── typography.ts
│       │   ├── spacing.ts
│       │   ├── shadows.ts
│       │   ├── animations.ts
│       │   └── index.ts
│       ├── themes/
│       │   ├── light.ts
│       │   ├── dark.ts
│       │   └── index.ts
│       └── index.ts
│
├── components/
│   └── ui/
│       ├── primitives/        # Base building blocks
│       │   ├── box.tsx
│       │   ├── text.tsx
│       │   └── icon.tsx
│       │
│       ├── forms/             # Form components
│       │   ├── form.tsx
│       │   ├── form-field.tsx
│       │   ├── input.tsx
│       │   ├── select.tsx
│       │   ├── checkbox.tsx
│       │   ├── radio-group.tsx
│       │   ├── slider.tsx
│       │   ├── switch.tsx
│       │   ├── date-picker.tsx
│       │   ├── file-upload.tsx
│       │   ├── combobox.tsx
│       │   └── otp-input.tsx
│       │
│       ├── feedback/          # Feedback components
│       │   ├── toast.tsx
│       │   ├── alert.tsx
│       │   ├── progress.tsx
│       │   ├── spinner.tsx
│       │   ├── skeleton.tsx
│       │   └── rating.tsx
│       │
│       ├── navigation/        # Navigation components
│       │   ├── breadcrumb.tsx
│       │   ├── pagination.tsx
│       │   ├── stepper.tsx
│       │   ├── tabs.tsx
│       │   ├── sidebar.tsx
│       │   └── command.tsx
│       │
│       ├── data-display/      # Data display components
│       │   ├── avatar.tsx
│       │   ├── badge.tsx
│       │   ├── card.tsx
│       │   ├── table.tsx
│       │   ├── data-table.tsx
│       │   ├── list.tsx
│       │   ├── timeline.tsx
│       │   └── calendar.tsx
│       │
│       ├── overlay/           # Overlay components
│       │   ├── dialog.tsx
│       │   ├── sheet.tsx
│       │   ├── popover.tsx
│       │   ├── tooltip.tsx
│       │   ├── dropdown-menu.tsx
│       │   └── context-menu.tsx
│       │
│       └── layout/            # Layout components
│           ├── stack.tsx
│           ├── grid.tsx
│           ├── divider.tsx
│           ├── scroll-area.tsx
│           ├── aspect-ratio.tsx
│           └── collapsible.tsx
```

---

## Prioridades de Implementación

### Sprint 1 (Semana 1) - Foundation
1. Toast system (Sonner integration)
2. Avatar component
3. Progress (linear + circular)
4. Spinner/Loader
5. Breadcrumb

### Sprint 2 (Semana 2) - Forms
1. Form wrapper with zod
2. FormField component
3. Slider component
4. RadioGroup styled
5. Combobox/Autocomplete

### Sprint 3 (Semana 3) - Navigation
1. Stepper/Wizard
2. Pagination
3. Tabs variants
4. Command palette (Cmd+K)

### Sprint 4 (Semana 4) - Data Display
1. DataTable with TanStack
2. List/ListItem
3. Timeline component
4. Calendar display

---

## Definition of Done

Cada componente debe tener:
- [ ] Implementación TypeScript con tipos exportados
- [ ] Variantes: size (sm/md/lg), variant (por contexto)
- [ ] Estados: default, hover, focus, active, disabled, loading
- [ ] Responsive: funciona en mobile/tablet/desktop
- [ ] Accesible: WCAG AA, keyboard navigation, ARIA labels
- [ ] Animaciones: entrada/salida suaves
- [ ] Dark mode: soportado via CSS variables
- [ ] Tests: unit tests básicos
- [ ] Docs: JSDoc comments con ejemplos
