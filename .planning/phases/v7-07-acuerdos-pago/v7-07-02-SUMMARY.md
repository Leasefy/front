---
phase: v7-07-acuerdos-pago
plan: 02
subsystem: contract e-signature / OTP
tags: [otp, ley-527, additive-generalization, acuerdos, adapter-seam]
requires:
  - contractsApi.sendOtp / verifyOtp (existing contract OTP transport)
  - ContractOtpRole (contracts.types.ts)
provides:
  - OtpAdapter interface (injectable send/verify transport)
  - resolveOtpAdapter() pure transport selector
  - OTPVerification `adapter?` prop (contractId/role now optional)
affects:
  - src/components/contract/OTPVerification.tsx (generalized, additive)
  - src/components/contract/SignatureForm.tsx (call site preserved, UNCHANGED)
  - v7-07-05 acuerdo accept (will inject an acuerdo OTP adapter — gated until endpoints exist)
tech-stack:
  added: []          # zero new npm packages
  patterns:
    - "Injected transport adapter + pure resolver for a shared, compliance-bound UI flow"
key-files:
  created:
    - src/components/contract/OTPVerification.test.ts
  modified:
    - src/components/contract/OTPVerification.tsx
decisions:
  - "Generalize (not fork) the Ley 527/1999 OTP flow via an injected OtpAdapter so acuerdo acceptance reuses one compliant flow"
  - "resolveOtpAdapter is pure + total: throws when neither adapter nor contractId+role given (never a silent verification bypass)"
  - "Rename the 6-digit state array otp->digits so the adapter can be named `otp` (plan-specified naming) without a shadowing collision — behavior-preserving"
metrics:
  duration: "~20 min"
  completed: 2026-07-20
  tasks: 2
  files: 2
  commits: 2
---

# Phase v7-07 Plan 02: Generalize OTPVerification (OTP transport seam) Summary

Additive generalization of the contract-signing OTP modal into an entity-agnostic Ley 527/1999 flow via an injected `OtpAdapter` + a pure `resolveOtpAdapter` transport selector, with the shipped contract-signing path left byte-for-byte unchanged in behavior. This is the ACUE-02 enabler: the acuerdo accept flow (v7-07-05) can now inject its own OTP transport and reuse the exact compliant flow instead of forking a second OTP component. No new npm packages.

## What was built

### Task 1 — `OTPVerification` generalized (`OTPVerification.tsx`) · commit `4a1915ba`
- **`export interface OtpAdapter { send(): Promise<{sentTo, cooldownSeconds}>; verify(code): Promise<{verificationToken}> }`** — the injectable transport.
- **`export function resolveOtpAdapter({ adapter?, contractId?, role? }): OtpAdapter`** — pure + total selector:
  - `adapter` present → returned verbatim.
  - else `contractId && role` → builds the EXISTING contract transport (`contractsApi.sendOtp(contractId,{role})` / `verifyOtp(contractId,{role,code})`), defaulting `cooldownSeconds ?? 60`.
  - else → `throw` (never a silent no-op).
- **Props:** `adapter?: OtpAdapter` added; `contractId?`/`role?` made optional (required only when no adapter). No other prop removed/renamed.
- **Body:** `const otp = useMemo(() => resolveOtpAdapter({ adapter, contractId, role }), [adapter, contractId, role])`; the two inline `contractsApi.*` calls became `await otp.send()` / `await otp.verify(code)`; the two `useCallback` dep arrays updated to `[otp]` and `[otp, onVerified]`.
- **UNCHANGED:** Dialog shell, 6-digit inputs, cooldown countdown, paste handling, verified/error states, and the **Ley 527/1999** note — all intact.

### Task 2 — pure `resolveOtpAdapter` unit test (`OTPVerification.test.ts`) · commit `b3ef283b`
7 passing specs, no React Testing Library (pure function), `contractsApi` mocked with `vi.mock`:
- default transport `send()` forwards exact args `('c1', { role: 'tenant' })`, returns `{ sentTo, cooldownSeconds }`;
- `cooldownSeconds` defaults to `60` when the API omits it (proves the `?? 60` fallback);
- default transport `verify('123456')` forwards `('c1', { role: 'tenant', code: '123456' })`, returns `{ verificationToken }`;
- injected adapter returned by identity (`toBe`) and `contractsApi` never called (incl. when contractId+role are also passed — adapter wins);
- throws when `{}` and when `contractId` present but `role` missing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Adapter variable name collided with the existing 6-digit state array**
- **Found during:** Task 1.
- **Issue:** The plan prescribes `const otp = useMemo(() => resolveOtpAdapter(...))` and the Task-1 grep gate requires literal `otp.send()` / `otp.verify(`. But the component already declared `const [otp, setOtp] = useState<string[]>` for the 6 OTP digits — declaring a second `const otp` is a shadowing/redeclaration compile error.
- **Fix:** Renamed the digit-array state `otp`/`setOtp` → `digits`/`setDigits` (9 references: state decl, resets, `setDigits((prevOtp)=>…)`, paste, `handleKeyDown` `!digits[index]` + dep, JSX `digits.map`). Purely mechanical, behavior-identical; frees `otp` for the adapter so the plan's naming + grep gate are satisfied with correct, collision-free code.
- **Files modified:** `src/components/contract/OTPVerification.tsx`.
- **Commit:** `4a1915ba`.

**2. [Naming — per executor instruction] Test-only task committed with `feat(v7-07):` prefix**
- Task 2 is a test-only file (conventionally `test(...)`), but the executor instruction mandated a `feat(v7-07):` prefix on every commit; followed that directive.

No other deviations — the transport re-route is otherwise exactly as specified.

## Additive / regression evidence
- **`SignatureForm.tsx` is UNCHANGED** across this plan (`git diff --name-only HEAD~2 HEAD` → not listed). It still passes `contractId` + `role` (no adapter), so `resolveOtpAdapter` selects the contract transport and the contract-signing OTP behavior is identical.
- **Default transport parity is unit-proven:** the test asserts the resolver forwards the exact same `contractsApi.sendOtp/verifyOtp` args the old inline code used.
- **`tsc` clean** on both touched files (`OTPVerification` / `SignatureForm`).

## Acuerdo-OTP gating (honest)
This plan only lands the transport **seam**. The acuerdo OTP send/verify endpoints do not exist yet; the acuerdo OTP adapter (which degrades honestly — no fabricated OTP success) and its wiring land in plan 05. Nothing here fabricates OTP success on any path.

## Verification results
- `pnpm build` → **EXIT 0** (`✓ Compiled successfully`) — contract-signing flow still compiles.
- `pnpm test -- src/components/contract/OTPVerification.test.ts` → **7/7 green**.
- `pnpm test` (full) → **687 passed / 7 failed**. The 7 failures are the documented pre-existing baseline, all in unrelated areas (`ai/asegurabilidad/nueva`, `inmobiliaria/ai/EquipoAgentes`, `inmobiliaria/ai/WorkItemDetalle`, `cotizador/CarrierRegistryTable`, `constants/risk-levels`) — **0 in `src/components/contract/`, 0 new failures**.
- Task 1 grep gate: `GATE_OK` (OtpAdapter + resolveOtpAdapter + `adapter?: OtpAdapter` + `otp.send()` + `otp.verify(` + `Ley 527` all present).
- Task 2 grep gate: `GATE_OK` (`resolveOtpAdapter` present in test).

## Threat model outcomes
- **T-v7-07-05 (Spoofing/Repudiation):** MITIGATED — the one-use `verificationToken` semantics are preserved (not reimplemented); the adapter swaps only the transport endpoint. Contract flow byte-unchanged (regression-gated by tsc + build + preserved SignatureForm call site).
- **T-v7-07-06 (Tampering):** MITIGATED — `resolveOtpAdapter` is pure + total; missing-both throws (unit-tested), never a silent bypass.
- **T-v7-07-SC (supply chain):** N/A — zero new dependencies.

## Self-Check: PASSED
- `src/components/contract/OTPVerification.tsx` — FOUND
- `src/components/contract/OTPVerification.test.ts` — FOUND
- commit `4a1915ba` — FOUND
- commit `b3ef283b` — FOUND
- `SignatureForm.tsx` UNCHANGED (additive gate) — OK
