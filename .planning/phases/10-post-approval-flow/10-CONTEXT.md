# Phase 10: Post-Approval Flow - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<vision>
## How This Should Work

Después de que el propietario aprueba un candidato, comienza el flujo de cierre del arriendo. El objetivo es llevar al candidato desde "aprobado" hasta "arrendatario activo" con un proceso fluido estilo Deel.

El flujo sigue estos pasos:
1. **Generación de contrato** - Templates pre-configurados que el propietario puede personalizar
2. **Firma secuencial** - Primero el propietario firma, luego el inquilino (como Deel)
3. **Selección de póliza** - El inquilino elige el nivel de protección
4. **Método de pago** - El inquilino configura cómo pagará la renta
5. **Inicio del arriendo** - Ambos ven sus dashboards de "arriendo activo"

El modelo de negocio es freemium + transaccional:
- **Gratis**: Post y filtros básicos
- **Pro**: Análisis AI completo, contratos ilimitados
- **Business**: Multi-propiedad, API access

</vision>

<essential>
## What Must Be Nailed

- **Flujo Deel-style** - Firma secuencial clara (propietario → inquilino)
- **Templates de contrato** - Básico, Amoblado, Compartido
- **Timeline visual** - El usuario siempre sabe en qué paso está
- **Póliza de seguro** - Integrado pero opcional (upsell)
- **Métodos de pago colombianos** - PSE, Tarjeta, Nequi
- **Dashboard post-contrato** - Vista diferente para propietario vs inquilino
- **Sistema de cupones** - Para trials y promociones
- **Pricing page** - Comparable con competencia pero diferenciado

</essential>

<specifics>
## Specific Design Elements

**Contract Signing (Deel-style):**
- Timeline vertical con pasos: Revisión → Firma Propietario → Firma Inquilino → Activo
- Cada paso con estado: pendiente (gris), actual (purple), completado (verde)
- Documento preview a la izquierda, acciones a la derecha
- Firma con checkbox de términos + botón "Firmar contrato"
- Progress bar en el header

**Insurance Selection:**
- 3 opciones: Sin póliza (0%), Básica ($X), Premium ($Y)
- Cards comparativas con features
- Recomendación destacada (Básica o Premium)
- Disclosure legal claro

**Payment Methods (Colombia):**
- PSE (transferencia bancaria)
- Tarjeta de crédito/débito
- Nequi / Daviplata
- Efectivo (próximamente - disabled)
- Cada método con logo y descripción

**Pricing Page:**
| Plan | Precio | Features |
|------|--------|----------|
| Free | $0 | Post property, basic search |
| Pro | $49.900/mes | AI scoring, unlimited contracts |
| Business | $149.900/mes | Multi-property, API, priority |

**Coupon System:**
- Tipos: PERCENTAGE, FIXED_AMOUNT, FREE_MONTHS, FULL_ACCESS
- Validaciones: fecha, uso máximo, plan específico
- UI: Input field con botón "Aplicar"
- Feedback: precio tachado, ahorro mostrado

**Post-Contract Dashboard - Propietario:**
- "Arrendatarios Activos" section
- Card por lease: inquilino, propiedad, renta, próximo pago
- Payment history table
- Quick actions: Message, Request payment, Report issue

**Post-Contract Dashboard - Inquilino:**
- "Mi Arriendo" hero card
- Contract details expandable
- Payment schedule timeline
- Documents section (contrato, póliza)
- Quick actions: Pay rent, Message landlord, Report issue

</specifics>

<notes>
## Additional Context

**Legal - Ley 527 de 1999:**
Las firmas electrónicas son válidas en Colombia. Necesitamos:
- Timestamp de cada firma
- IP address logging
- Checkbox explícito de aceptación
- PDF descargable del contrato firmado

**Pricing Strategy:**
- Free tier generous para growth
- Pro tier priced below competition (FincaRaiz Pro es ~$80k)
- Business tier para property managers

**Coupon Use Cases:**
- 100% discount = free trial completo
- 50% discount = promoción de lanzamiento
- FREE_MONTHS = "3 meses gratis" para early adopters
- FULL_ACCESS = access a todo sin límite de tiempo (para partnerships)

**Integration Points (Backend):**
- Contract PDF generation
- E-signature storage with metadata
- Payment gateway integration (Wompi, PayU, Stripe)
- Insurance provider API (if applicable)

</notes>

---

*Phase: 10-post-approval-flow*
*Context gathered: 2026-01-20*
*Research: POST_APPROVAL_STRATEGY.md*
