# PLAN-03: Wizard Steps 4-6 (Referencias, Documentos, Review)

**Phase**: 03-application-wizard
**Focus**: Final three wizard steps including document upload and review
**Estimated Scope**: ~6 files, ~900 LOC
**Depends on**: PLAN-01, PLAN-02

---

## Goal Statement

Complete the application wizard with references collection, drag-and-drop document upload, and a comprehensive review step with submission confirmation. The experience should feel premium and frictionless.

---

## Success Criteria

- [ ] Step 4 (Referencias) collects landlord, employment, and personal references
- [ ] Step 5 (Documentos) has drag-and-drop upload for required documents
- [ ] Step 6 (Review) shows all data with edit capability
- [ ] Submit action shows confirmation with next steps
- [ ] Document upload feels fast and minimal (no long explanations)
- [ ] Review step clearly shows what was submitted

---

## Files to Create

```
src/components/wizard/steps/StepReferences.tsx
src/components/wizard/steps/StepDocuments.tsx
src/components/wizard/steps/StepReview.tsx
src/components/wizard/DocumentUpload.tsx
src/components/wizard/ConfirmationScreen.tsx
```

---

## Step 4: References

### Fields Required for Verification

| Section | Fields | Purpose |
|---------|--------|---------|
| Previous Landlords | name, phone, address, duration | **Rental history verification** |
| Employment References | name, phone, company, relationship | Employment verification |
| Personal References | name, phone, relationship | Character references |

### UI Layout

```
┌────────────────────────────────────────┐
│ Referencias                            │
│ Personas que puedan verificar tu       │
│ historial                              │
├────────────────────────────────────────┤
│                                        │
│ 📋 Arrendadores Anteriores            │
│ ┌──────────────────────────────────┐   │
│ │ Nombre         Teléfono          │   │
│ │ [__________]   [__________]      │   │
│ │                                  │   │
│ │ Dirección      Duración (meses)  │   │
│ │ [__________]   [____]            │   │
│ └──────────────────────────────────┘   │
│ [+ Agregar otro arrendador]            │
│                                        │
│ 💼 Referencias Laborales              │
│ ┌──────────────────────────────────┐   │
│ │ Nombre         Teléfono          │   │
│ │ [__________]   [__________]      │   │
│ │                                  │   │
│ │ Empresa        Relación          │   │
│ │ [__________]   [__________]      │   │
│ └──────────────────────────────────┘   │
│ [+ Agregar otra referencia]            │
│                                        │
│ 👤 Referencias Personales             │
│ ┌──────────────────────────────────┐   │
│ │ Nombre         Teléfono          │   │
│ │ [__________]   [__________]      │   │
│ │                                  │   │
│ │ Relación                         │   │
│ │ [__________]                     │   │
│ └──────────────────────────────────┘   │
│ [+ Agregar otra referencia]            │
│                                        │
└────────────────────────────────────────┘
```

### Dynamic Arrays
- Start with 1 landlord reference (required)
- Start with 1 employment reference (required)
- Start with 1 personal reference (required)
- Allow adding more (max 3 each)
- Allow removing (except first)

---

## Step 5: Documents

### Required Documents

| Document | Accepted Formats | Purpose |
|----------|------------------|---------|
| Documento de identidad | PDF, JPG, PNG | Identity verification |
| Comprobante de ingresos | PDF, JPG, PNG | Income verification |

### Optional Documents

| Document | Accepted Formats | Purpose |
|----------|------------------|---------|
| Carta laboral | PDF | Employment verification |
| Extractos bancarios | PDF | Financial stability |
| Historial crediticio | PDF | Credit history |

### UI Layout - MINIMAL & FAST

```
┌────────────────────────────────────────┐
│ Documentos                             │
│ Sube los documentos para verificación  │
├────────────────────────────────────────┤
│                                        │
│ ▼ Documento de identidad *             │
│ ┌──────────────────────────────────┐   │
│ │                                  │   │
│ │     📄 Arrastra tu archivo       │   │
│ │     o haz clic para subir        │   │
│ │                                  │   │
│ │     PDF, JPG, PNG (max 5MB)      │   │
│ │                                  │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ▼ Comprobante de ingresos *            │
│ ┌──────────────────────────────────┐   │
│ │     cedula-scan.pdf ✓            │   │
│ │     [Ver] [Eliminar]             │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ▼ Carta laboral (opcional)             │
│ ┌──────────────────────────────────┐   │
│ │     📄 Arrastra tu archivo       │   │
│ └──────────────────────────────────┘   │
│                                        │
│ ▼ Extractos bancarios (opcional)       │
│ ┌──────────────────────────────────┐   │
│ │     📄 Arrastra tu archivo       │   │
│ └──────────────────────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

### DocumentUpload Component Features
- Drag and drop zone
- Click to browse
- File preview (name + size)
- Remove button
- Loading state during "upload"
- Success checkmark after "upload"
- Error state for invalid files
- Compact collapsed state after upload

---

## Step 6: Review

### UI Layout

```
┌────────────────────────────────────────┐
│ Revisa tu aplicación                   │
│ Verifica que todo esté correcto        │
├────────────────────────────────────────┤
│                                        │
│ ┌─ Información Personal ──────[Editar]─┐
│ │ Juan Pérez García                   │
│ │ CC 1234567890                       │
│ │ juan@email.com | 3001234567         │
│ │ Cra 7 #45-12, Bogotá               │
│ │ 24 meses en dirección actual        │
│ └─────────────────────────────────────┘
│                                        │
│ ┌─ Empleo ─────────────────[Editar]───┐
│ │ Empleado - Término indefinido       │
│ │ Tech Company S.A.S                  │
│ │ Desarrollador Senior                │
│ │ 36 meses de antigüedad              │
│ └─────────────────────────────────────┘
│                                        │
│ ┌─ Ingresos ───────────────[Editar]───┐
│ │ Salario: $5,000,000                 │
│ │ Adicional: $500,000                 │
│ │ Obligaciones: $800,000              │
│ │ ─────────────────────               │
│ │ Disponible: $4,700,000              │
│ └─────────────────────────────────────┘
│                                        │
│ ┌─ Referencias ────────────[Editar]───┐
│ │ 1 arrendador anterior               │
│ │ 1 referencia laboral                │
│ │ 2 referencias personales            │
│ └─────────────────────────────────────┘
│                                        │
│ ┌─ Documentos ─────────────[Editar]───┐
│ │ ✓ Documento de identidad            │
│ │ ✓ Comprobante de ingresos           │
│ │ ✓ Carta laboral                     │
│ └─────────────────────────────────────┘
│                                        │
│ ☐ Acepto los términos y condiciones   │
│ ☐ Autorizo verificación de datos      │
│                                        │
│        [Enviar Aplicación]             │
│                                        │
└────────────────────────────────────────┘
```

### Edit Functionality
- "Editar" button jumps to that step
- After editing, returns to Review step
- Unsaved warning if leaving mid-edit

---

## Confirmation Screen

### UI Layout

```
┌────────────────────────────────────────┐
│                                        │
│            ✓                           │
│                                        │
│   ¡Aplicación enviada!                 │
│                                        │
│   Tu aplicación para                   │
│   "Apartamento moderno en Chapinero"   │
│   ha sido recibida.                    │
│                                        │
├────────────────────────────────────────┤
│                                        │
│   📋 Qué sigue:                        │
│                                        │
│   1. Verificación de documentos        │
│      Revisaremos tus documentos en     │
│      las próximas 24 horas.            │
│                                        │
│   2. Evaluación AI                     │
│      Nuestro sistema evaluará tu       │
│      perfil de riesgo.                 │
│                                        │
│   3. Resultado                         │
│      Te contactaremos por email y      │
│      WhatsApp con la decisión.         │
│                                        │
│   Código de seguimiento: APP-XXXX      │
│                                        │
│        [Ver mis aplicaciones]          │
│        [Volver a propiedades]          │
│                                        │
└────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Create DocumentUpload component
Create `src/components/wizard/DocumentUpload.tsx`:
- Drag & drop zone with visual feedback
- File type validation (PDF, JPG, PNG)
- Size validation (max 5MB)
- Preview with filename and size
- Remove/replace functionality
- Mock upload (immediate success)
- Compact mode after upload

### Step 2: Create StepReferences component
Create `src/components/wizard/steps/StepReferences.tsx`:
- Dynamic array fields for each reference type
- Add/remove functionality
- Minimum 1 of each type required
- Maximum 3 of each type

### Step 3: Create StepDocuments component
Create `src/components/wizard/steps/StepDocuments.tsx`:
- Use DocumentUpload for each document type
- Required vs optional indication
- Validation: required docs must be uploaded

### Step 4: Create StepReview component
Create `src/components/wizard/steps/StepReview.tsx`:
- Summary cards for each section
- "Editar" buttons navigate to step
- Terms & conditions checkboxes
- Submit button
- Validation: all required fields + checkboxes

### Step 5: Create ConfirmationScreen component
Create `src/components/wizard/ConfirmationScreen.tsx`:
- Success animation (simple checkmark)
- Property name display
- "What's next" timeline
- Tracking code (mock)
- Navigation buttons

### Step 6: Integrate everything
Update wizard page:
- Add steps 4-6
- Handle submission
- Show confirmation screen
- Clear localStorage on success

---

## Validation Rules

### References Step
```typescript
const referencesSchema = z.object({
  previousLandlords: z.array(
    z.object({
      name: z.string().min(3),
      phone: z.string().regex(/^3\d{9}$/),
      address: z.string().min(10),
      duration: z.number().min(1),
    })
  ).min(1, 'Al menos 1 arrendador requerido'),
  employmentReferences: z.array(
    z.object({
      name: z.string().min(3),
      phone: z.string().regex(/^3\d{9}$/),
      company: z.string().min(2),
      relationship: z.string().min(2),
    })
  ).min(1, 'Al menos 1 referencia laboral requerida'),
  personalReferences: z.array(
    z.object({
      name: z.string().min(3),
      phone: z.string().regex(/^3\d{9}$/),
      relationship: z.string().min(2),
    })
  ).min(1, 'Al menos 1 referencia personal requerida'),
});
```

### Documents Step
```typescript
const documentsSchema = z.object({
  idDocument: z.custom<File>().refine(f => f !== null, 'Documento requerido'),
  incomeProof: z.custom<File>().refine(f => f !== null, 'Comprobante requerido'),
  employmentLetter: z.custom<File>().nullable(),
  bankStatements: z.custom<File>().nullable(),
  creditReport: z.custom<File>().nullable(),
});
```

### Review Step
```typescript
const reviewSchema = z.object({
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar los términos' }) }),
  authorizeVerification: z.literal(true, { errorMap: () => ({ message: 'Debes autorizar la verificación' }) }),
});
```

---

## Mock Behavior

### Document Upload
- Files stored in context as File objects (won't persist to localStorage)
- On page refresh, documents section resets (acceptable for MVP)
- Show "upload in progress" for 500ms, then success

### Submission
- Generate random tracking code: `APP-${random 4 digits}`
- Store submission in localStorage as "submitted" status
- Show confirmation screen
- Clear wizard data from localStorage

---

## Testing Checklist

- [ ] Step 4: Can add/remove landlord references
- [ ] Step 4: Minimum 1 of each reference type enforced
- [ ] Step 5: Drag and drop works
- [ ] Step 5: Click to browse works
- [ ] Step 5: Invalid file types rejected
- [ ] Step 5: File size limit enforced
- [ ] Step 5: Can remove uploaded file
- [ ] Step 6: All sections display correctly
- [ ] Step 6: Edit buttons navigate to correct step
- [ ] Step 6: Checkboxes required for submission
- [ ] Step 6: Submit shows confirmation
- [ ] Confirmation: Shows tracking code
- [ ] Confirmation: Navigation buttons work
- [ ] localStorage cleared after submission

---

## Notes

- Document files won't persist across refresh (browser limitation for File objects)
- Consider showing "Documents will need to be re-uploaded if you leave" warning
- Confirmation screen should feel celebratory but professional
- Keep all copy concise and action-oriented
