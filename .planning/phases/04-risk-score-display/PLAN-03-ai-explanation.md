# PLAN-03: Conversational AI Explanation

---
phase: 4
plan: 3
title: Conversational AI Explanation
status: ready
estimated_tasks: 6
depends_on: PLAN-01, PLAN-02
---

## Objective

Create THE differentiator - the "asesor de confianza" narrative component. This is where Arriendo Facil stands apart from competitors. The AI explanation should feel like a trusted advisor giving their professional assessment, not a cold algorithm output.

## Must Be True When Done

- [ ] AIExplanation component displays pre-written narrative
- [ ] Typing animation effect creates conversational feel
- [ ] Key drivers shown as supporting bullet points
- [ ] Risk flags displayed as subtle warnings (not alarmist)
- [ ] Suggested conditions section shows recommendations
- [ ] Component integrates with ScoreCard for full experience
- [ ] Tone is warm, professional, trustworthy

## Design Philosophy

From FRONTEND-VISION.md:
- **"Asesor de confianza" tone** - professional but warm
- **Narrative leads**, badge is visual backup
- Example: "Basado en lo que veo, este candidato tiene buen perfil porque..."

The AI should feel like:
- A knowledgeable real estate advisor
- Someone who has reviewed the application carefully
- A trusted professional giving honest assessment
- NOT a cold algorithm or risk score generator

## Tasks

### Task 1: Create AIExplanation Component
**File**: `src/components/score/AIExplanation.tsx`

Main narrative display component:

```typescript
interface AIExplanationProps {
  explanation: string;
  drivers: string[];
  flags: RiskFlag[];
  suggestedConditions: SuggestedCondition[];
  animate?: boolean; // typing animation
  onAnimationComplete?: () => void;
}
```

Layout:
```
┌─────────────────────────────────────────────┐
│ 🤖 Analisis del Asesor                      │
│                                              │
│ "Basado en lo que veo, este candidato       │
│  tiene un perfil excelente. Su estabilidad  │
│  laboral de 3 años en la misma empresa..."  │
│                                              │
│ ────────────────────────────────────────────│
│                                              │
│ ✓ Puntos a favor:                           │
│   • Ingresos estables y verificables        │
│   • 3+ años en la misma empresa             │
│   • Historial de pagos positivo             │
│                                              │
│ ⚠ Aspectos a considerar:                    │
│   • Ratio de obligaciones algo elevado      │
│                                              │
│ 💡 Recomendaciones:                         │
│   • Solicitar copia de contrato laboral     │
│                                              │
└─────────────────────────────────────────────┘
```

**Verification**: Component renders all sections, layout correct

### Task 2: Implement Typing Animation
**File**: `src/components/score/useTypingAnimation.ts`

Custom hook for typing effect:

```typescript
interface UseTypingAnimationOptions {
  text: string;
  speed?: number; // chars per second
  delay?: number; // initial delay
  onComplete?: () => void;
}

function useTypingAnimation(options: UseTypingAnimationOptions): {
  displayText: string;
  isComplete: boolean;
  restart: () => void;
}
```

Implementation options:
1. CSS animation with `@keyframes` and `steps()` (simpler)
2. JavaScript interval-based typing (more control)
3. Framer Motion character animation (smoothest)

Recommend: JavaScript interval with configurable speed, can pause on punctuation for natural feel.

**Verification**: Animation plays smoothly, natural punctuation pauses

### Task 3: Create KeyDrivers Component
**File**: `src/components/score/KeyDrivers.tsx`

Display positive factors:

```typescript
interface KeyDriversProps {
  drivers: string[];
  level: RiskLevel;
  animate?: boolean;
  animationDelay?: number;
}
```

Design:
- Checkmark icon (✓) with level color
- Each driver on its own line
- Stagger animation if animated (appear one by one after main text)
- Bullet style consistent with explanation

**Verification**: Drivers display with correct icons and colors

### Task 4: Create RiskFlags Component
**File**: `src/components/score/RiskFlags.tsx`

Display warnings subtly:

```typescript
interface RiskFlagsProps {
  flags: RiskFlag[];
  animate?: boolean;
  animationDelay?: number;
}
```

Design:
- Warning icon (⚠) but muted color - amber, not red
- Severity indicated by icon intensity, not alarming colors
- Suggestions shown as helpful tips, not demands
- Tone: "Things to consider" not "RED FLAGS"

Severity styling:
- `low`: Gray text, subtle
- `medium`: Amber text, visible but not alarming
- `high`: Red-ish text, but still professional

**Verification**: Flags display appropriately without being alarmist

### Task 5: Create SuggestedConditions Component
**File**: `src/components/score/SuggestedConditions.tsx`

Display recommended conditions:

```typescript
interface SuggestedConditionsProps {
  conditions: SuggestedCondition[];
  animate?: boolean;
  animationDelay?: number;
}
```

Design:
- Lightbulb icon (💡) indicating helpful suggestion
- Condition text with reason in smaller text below
- Cards or list items with subtle background
- Actionable language: "Considere solicitar..." not "Debe requerir..."

Examples:
- "Solicitar copia de contrato laboral vigente"
- "Verificar referencias del arrendador anterior"
- "Considerar deposito adicional de seguridad"

**Verification**: Conditions display with helpful tone

### Task 6: Create Full RiskScoreDisplay Component
**File**: `src/components/score/RiskScoreDisplay.tsx`

Composite component combining all pieces:

```typescript
interface RiskScoreDisplayProps {
  candidate: Candidate;
  showAnimation?: boolean;
  variant?: 'compact' | 'full' | 'embedded';
}
```

Layout (full variant):
```
┌─────────────────────────────────────────────┐
│ ┌─────┐                                     │
│ │  A  │  Score: 92/100 - Excelente          │
│ └─────┘                                     │
│                                              │
│ 🤖 Analisis del Asesor                      │
│ ─────────────────────────────────           │
│ [AI Explanation with typing animation]       │
│                                              │
│ ✓ Puntos a favor                            │
│ [Key Drivers]                               │
│                                              │
│ ⚠ Aspectos a considerar                     │
│ [Risk Flags]                                │
│                                              │
│ 💡 Recomendaciones                          │
│ [Suggested Conditions]                      │
│                                              │
│ ▼ Ver desglose por categoria               │
│ [CategoryBreakdown - collapsed]             │
└─────────────────────────────────────────────┘
```

Variants:
- `compact`: Badge + short summary only
- `full`: Complete display with all sections
- `embedded`: For use within other pages (no border)

**Verification**: Full component works, animation sequence correct

## Dependencies

- PLAN-01: Types and mock data
- PLAN-02: Score card components
- Framer Motion (already installed) for animations

## Animation Sequence

When `showAnimation=true`:
1. Score badge appears (scale animation)
2. Short delay
3. AI explanation starts typing
4. On explanation complete, key drivers fade in (staggered)
5. Risk flags fade in (if any)
6. Suggested conditions fade in (if any)
7. Category breakdown accordion becomes visible

Total animation: ~5-8 seconds for full reveal

## Notes

- THIS IS THE MOST IMPORTANT FEATURE
- Tone must be warm, professional, trustworthy
- Animation should feel premium, not gimmicky
- Mobile experience is critical - landlords will view on phones
- Consider accessibility: animation can be disabled
- Test with all 4 levels to ensure tone works for each
