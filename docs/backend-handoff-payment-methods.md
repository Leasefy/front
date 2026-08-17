# Backend handoff — Landlord Payment Methods

> Origen: API audit `feature/mvp-1-1` (2026-08-17). El módulo de cuentas de pago del landlord
> (`/panel` → Settings → "Cuentas de pago") se construyó contra un mock y **no coincide con el
> contrato real** del back. El front **no se va a tocar hasta cerrar el contrato de abajo**.

## Estado actual (roto en prod)

Front: `src/lib/api/payment-methods.service.ts`, `src/lib/types/payment-accounts.ts`,
`src/components/settings/PaymentAccountsSection.tsx`.

Back real (verificado): `back/src/tenant-payments/landlord-payment-methods/*` + Prisma
`LandlordPaymentMethod` (`schema.prisma:1164`).

**Contrato real del back** (`/landlords/me/payment-methods`, rol LANDLORD):
`POST /` · `GET /` · `GET /:id` · `PATCH /:id` · `DELETE /:id`. Devuelve el Prisma crudo:

| Campo | Tipo |
|---|---|
| `bankName` | string (texto libre, NO enum) |
| `accountType` | `AHORROS` \| `CORRIENTE` |
| `accountNumber` | string |
| `holderName` | string |
| `holderDocumentNumber` | string \| null (en create DTO es **requerido**, 6–12 dígitos) |
| `phoneNumber` | string \| null (opcional, `3XXXXXXXXX`) |
| `methodType` | `PSE` \| `BANK_TRANSFER` \| `CASH` \| `NEQUI` \| `DAVIPLATA` \| `CHECK` (requerido) |
| `instructions` | string \| null |
| `isActive` | boolean |

## El gap (front asume ≠ back tiene)

| Front asume | Back tiene | Efecto hoy |
|---|---|---|
| Discriminante `type: 'bank' \| 'wallet'` | (no existe; se infiere de `methodType`) | `isBankAccount/isDigitalWallet` nunca matchean → **lista no renderiza** |
| `bankCode` / `walletCode` (enums) | `bankName` string libre | — |
| `accountType: 'savings' \| 'checking'` | `AHORROS` \| `CORRIENTE` | mismatch de valores |
| `accountHolderName` / `accountHolderDocument` | `holderName` / `holderDocumentNumber` | nombres de campo distintos |
| **`isDefault`** (estrella, "principal", guard de borrado) | **no existe** | `update({isDefault})` se dropea/400; el "principal" es mentira visual |
| **Asignación inmueble→cuenta** (`POST :id/assign`, tags, `getAssignments`) | **no existe ninguna ruta** | `assignProperty` en cada create → **404** |
| Pestaña **Billetera** (solo pide walletCode+phone+nombre) | create DTO exige `accountNumber`+`accountType`+`holderDocumentNumber` siempre | crear billetera → **400** aunque se arregle el path |

## Lo que necesitamos del back (decidir contrato)

### 1. Cuenta principal / de dispersión (`isDefault`)
El front deja marcar una cuenta como "principal" y las dispersiones deberían salir a esa.
Hoy no hay dónde persistirlo. **Opciones — elegir una:**
- **(a)** Agregar `isDefault Boolean @default(false)` a `LandlordPaymentMethod` + invariante
  "exactamente una principal por landlord" (al setear una, apagar las otras). El `PATCH :id`
  actual ya podría aceptarlo, o un endpoint dedicado `PUT :id/default`.
- **(b)** Confirmar que la cuenta de dispersión se elige en **otro módulo** (¿dispersiones /
  liquidación por inmueble?) y NO en `LandlordPaymentMethod`. En ese caso el front saca la
  estrella de acá y la mueve a donde viva.

### 2. Asignación inmueble → cuenta
El front permite asignar N inmuebles a una cuenta (para saber a qué cuenta va cada arriendo).
No hay endpoints. **Opciones — elegir una:**
- **(a)** Endpoints de asignación:
  `GET /landlords/me/payment-methods/assignments` → `[{ propertyId, accountId }]`;
  `POST /landlords/me/payment-methods/:id/assign` body `{ propertyId }`;
  `DELETE /landlords/me/payment-methods/:id/assign/:propertyId`.
- **(b)** Un campo `payoutMethodId` en `Property`/`Lease` (fuente de verdad la propiedad, no la cuenta).
- **(c)** Declararlo fuera de alcance del MVP → el front esconde toda la UI de asignación.

### 3. Billeteras (Nequi/Daviplata)
El create DTO es banco-céntrico (exige `accountNumber`/`accountType`/`holderDocumentNumber`),
así que una billetera no se puede crear como la UI la pide. **Opciones — elegir una:**
- **(a)** Relajar el DTO: cuando `methodType ∈ {NEQUI, DAVIPLATA}`, `accountNumber`/`accountType`
  no requeridos y `phoneNumber` requerido; agregar `provider`/`walletName` si aplica.
- **(b)** Declarar que las billeteras **no** se soportan en el MVP → el front elimina la pestaña
  "Billetera" y deja solo cuenta bancaria (`methodType = BANK_TRANSFER`).

### 4. (Independiente) Response schema para codegen
El controller no declara `@ApiResponse({ type })`, así que el spec sale con `content?: never` y
el front no puede adoptar tipos generados. Agregar un DTO de respuesta + `@ApiResponse` permitiría
que el front consuma `generated/back.ts` en vez de tipos a mano (previene exactamente esta clase
de drift — ver `docs/API-AUDIT-mvp-1-1.md` §4).

## Plan del front (una vez cerrado el contrato)
Mapper wire↔display (adoptando el tipo real / generado), `create` con el shape correcto, y
mantener/eliminar isDefault + asignación + billetera según las decisiones 1–3. Todo con tests (TDD).

## ⚠️ Riesgo mientras tanto
Hasta implementar esto, la pantalla de cuentas de pago del landlord queda **rota en prod**
(lista no renderiza, "asignar" 404, "principal" no persiste). Si se quiere un parche interino
mínimo (mapear solo la lectura para que la lista muestre las cuentas + esconder los botones rotos),
es un cambio chico y aislado — pedirlo aparte.
</content>
