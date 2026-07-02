# flows area — Cadence adoption ✅ COMPLETE (2026-06-30, opus by hand)

Area = `components/{layout,messages,onboarding,settings,wizard}` + `app/onboarding`. 40 tsx, 31 had native elements. All wired (verified importers; no dead-code). No old `@leasefy/ui` imports remained → pure native→adapter adoption. **Final gate (find|xargs): select/textarea/spinner = 0; input 2, button 48, eyebrow 6 — every residual hit is a documented allowlist reason. tsc --noEmit = 0.**

## ✅ Converted (real Cadence components)
### wizard/
- **WizardFormField.tsx** — `LightInput`→ wraps Cadence `Input`; `LightSelect`→ Cadence Radix `Select` (kept external value/onChange/options/icon/hasError API → cascades to all 4 steps untouched). **Deleted dead `DarkInput`/`DarkSelect`** (0 usages); dropped `CaretDown` import.
- **DocumentUpload.tsx** — remove-btn→`IconButton` (isDeleting→Spinner icon); uploading `SpinnerGap`→`Spinner`; "Intentar de nuevo"→`Button outline`.
- **WizardProgress.tsx** — stripped dead `uppercase tracking-wide font-mono` off completed step-circle (holds `<Check>`).
- **steps/StepReferences.tsx** — 3 delete→`IconButton`; `AddButton`→`Button outline`.
- **steps/StepReview.tsx** — 2 consent `<input type=checkbox>`→`Checkbox` (`onCheckedChange`); "Editar"→`Button ghost sm`.
- **steps/StepIncome.tsx** — `CurrencyInput` `<input>`→ Cadence `Input` (kept `$` adornment + pl padding).

### layout/
- **Footer.tsx** — "Suscribir" submit→`Button variant="white"` (rectangular `rounded-l-none rounded-r-xl` override).

### settings/
- **SettingToggle.tsx** — `<button role=switch>`→`Switch` (emerald accent via `data-[state=checked]:bg-[#2C7A53]`).
- **SettingLink.tsx** — badge→`Badge variant="default"` (row stays allowlist).
- **SettingsModal.tsx** — close→`IconButton`.
- **ChangePasswordModal.tsx** — close→`IconButton`; 3 password `<input>`→`Input`; 3 eye-toggles→`IconButton ghost` (hover:bg-transparent); Cancel→`Button outline`; inverse-ink submit→`Button secondary` + literal `bg-neutral-900 dark:bg-white …` + `isLoading`.
- **MfaSetupSection.tsx** — loader→`Spinner`; "Activada"→`Badge success`; Desactivar→`Button outline` + danger className; copy-secret→`IconButton`; 6-digit code `<input>`→`Input`; cancels→`Button outline`; Desactivar-2FA→`Button destructive isLoading`; Verificar/Activar (green solid)→`Button secondary` + literal `bg-[#2C7A53]` + conditional `Spinner`/icon.
- **PaymentAccountsSection.tsx** — add-account dashed→`Button outline`; 2 `<select>` (bank/wallet)→`Select`; 5 `<input>`→`Input` (error→`border-danger/40`); chip-remove X→`IconButton`; set-default `<input type=checkbox>`→`Checkbox`; 2 cancel→`Button outline`; add submit→`Button` + `Spinner`; delete submit→`Button destructive` + `Spinner`.
- **TeamManagementSection.tsx** — Invitar CTA→`Button`; role badge→`Badge` (default/secondary); 2 modal `<input>`→`Input`; 2 cancel→`Button outline`; 2 submit→`Button` + `Spinner`.

### onboarding/
- **OnboardingShell.tsx** — "Progreso" + "Paso X de Y" eyebrows→`MonoLabel`; Next-btn `SpinnerGap`→`Spinner`.
- **tenant/TenantOnboardingSuccess.tsx** — 2 `motion.button` mono-uppercase CTAs (old anti-pattern)→`motion.div`>`Button` (sentence-case, keeps entrance anim).
- **tenant/StepTenantWelcome.tsx** — 3 `<input>`→`Input`.
- **steps/StepWelcome.tsx** — 2 `<input>`→`Input`; stripped dead-mono off contact icon-circle.
- **steps/StepFirstProperty.tsx** — city `<select>`→`Select`; 2 `<input>`→`Input`.
- **steps/StepPayments.tsx** — bank `<select>`→`Select`; account `<input>`→`Input`; stripped dead-mono off method icon-circle.
- **tenant/StepHousingPreferences.tsx** — 5 `<input>`→`Input`; custom-zone remove X→`IconButton`; "Agregar"→`Button`.
- **app/onboarding/seleccionar-rol/page.tsx** — Continue spinner→`Spinner`.
- **app/onboarding/propietario/page.tsx** — 2 submit-btn `SpinnerGap`→`Spinner`.
- **app/onboarding/inmobiliaria/page.tsx** (biggest) — 5 `<input>`→`Input`; city `<select>`→`Select`; 2 spinners→`Spinner`; 3 back→`Button outline`; 4 continue/submit→`Button`; 2 password eye-toggles→`IconButton`.

### messages/
- **MessagesWidget.tsx** — search + message `<input>`→`Input` (pill); 7 icon-only (back/info/options/attach/image/emoji/info-close)→`IconButton`; "Acciones rápidas" eyebrow→`MonoLabel`.

## Allowlist (stayed native — by precedent)
- **Step-navigators** (wizard `WizardProgress`/`WizardShell` step circles+dots; `OnboardingShell`/`TenantOnboardingShell` vertical step-compass) — `aria-current`/disabled-unless-reachable; Cadence Stepper is a documented gap. Their mono numerals are LIVE (intentional).
- **Selectable tiles / option cards** — `seleccionar-rol` role cards; `propietario`/`inmobiliaria` property-type + portfolio + service tiles; `StepIdealTenant` (5) preference tiles; `StepPayments` method+day tiles; `StepWelcome` contact tiles; `StepHousingPreferences` pets + amenity tiles; PaymentAccounts account-type + role-picker tiles. (`w-full ... text-left` with selected-state border / radio dot.)
- **Filter chips** — `StepHousingPreferences` city chips (`rounded-full` multi-select toggles).
- **Inline text-link triggers** — `WizardShell` error-list jump-to-field; PaymentAccounts set-default/delete; TeamManagement Editar/Eliminar. (Cadence Button `link` carries the adapter's h-10 size-fidelity → breaks inline flow.)
- **Whole-row / menu-rows** — `SettingLink` row; PaymentAccounts property-dropdown checkbox-rows; MessagesWidget options-menu (Archive/Mute/Report) + quick-action rows; Navbar user-menu + mobile-menu logout rows.
- **Nav-chrome** — Navbar dropdown triggers (`aria-expanded/haspopup`) + hamburger + section labels; MobileNavBar tab-bar items + 9px mono micro-labels; MobileNavSheet close-row; Footer whole-`<footer>` mono brand block.
- **Bespoke segmented toggle** — PaymentAccounts bank|wallet icon+label track.
- **Bespoke multi-select combobox** — PaymentAccounts property-assignment dropdown trigger.
- **Hidden / on-color inputs** — `DocumentUpload` sr-only `type=file`; Footer dark on-cobalt newsletter `<input>` (joined `rounded-l`, white-on-color — Cadence Input is light-surface; Button is pill → can't adopt the joined rectangular pair).
- **Bespoke portal/framer-motion modals** kept as structure (SettingsModal/ChangePasswordModal/MFA modals); their close + form fields + footer buttons WERE converted.

## IDIOMS (area-specific, reusable)
- inverse/"ink" submit (dark-on-light → dark btn; light-on-dark → white btn): `Button variant="secondary"` + literal `bg-neutral-900 dark:bg-white text-white dark:text-neutral-900` + `isLoading`. (NOT tenant `bg-ink dark:bg-surface` — inverts wrong here.)
- green/colored solid submit (no DS variant): `Button variant="secondary"` + literal `bg-[#hex] text-white` + conditional `{isLoading ? <Spinner size="xs" variant="current"/> : <Icon/>}`.
- input-adornment IconButton (eye-toggle, emoji): `IconButton variant="ghost"` + `hover:bg-transparent`.
- `<select>`→Radix `Select`: icon goes INSIDE `<SelectTrigger className="relative pl-12">` as an absolute `<span>`; drop the manual chevron (Radix provides).
- error/warn input: `Input className={cn('h-12 rounded-xl', err && 'border-danger/40 focus-visible:ring-danger/20')}` (or `border-warning/40`).

GATE: `FILES=$(find src/components/layout src/components/messages src/components/onboarding src/components/settings src/components/wizard src/app/onboarding -name '*.tsx'); printf '%s\n' $FILES | xargs grep -nE '<button|<input|<select|<textarea|animate-spin|SpinnerGap|uppercase tracking'`
