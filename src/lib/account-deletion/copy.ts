/**
 * Canonical account-deletion copy — SINGLE SOURCE OF TRUTH.
 *
 * Owner rule: deleted accounts keep a 30-day recovery window (signing in
 * again reactivates the account with all data; afterwards it is locked and
 * only Leasefy support can help). Every delete-account flow must tell the
 * user this with the SAME words.
 *
 * Consumers (all five deletion flows):
 * - src/app/inquilino/perfil/page.tsx            (locale ternaries)
 * - src/app/inquilino/configuracion/page.tsx     (locale ternaries)
 * - src/app/panel/(landlord)/perfil/page.tsx     (locale ternaries)
 * - src/app/panel/(landlord)/configuracion/page.tsx (i18n keys — the
 *   `landlordSettings.modals.deleteAccount.*` / `landlordSettings.toasts.*`
 *   values in es.json/en.json MUST mirror this module; copy.test.ts enforces
 *   the equality)
 * - src/app/panel/inmobiliaria/perfil/page.tsx   (locale ternaries)
 *
 * Page-specific content (per-role "what gets deleted" lists, the tenant
 * active-lease warning) intentionally stays in each page — only the shared
 * deletion strings live here.
 */

export interface AccountDeletionCopy {
  /** Modal window title ("Eliminar cuenta") */
  modalTitle: string
  /** Warning headline ("¿Eliminar tu cuenta?") */
  warningTitle: string
  /** The canonical 30-day recovery explanation (also the warning subtitle) */
  recovery: string
  /** Config-style modal body: what is deleted + the recovery explanation */
  warningBody: string
  /** The word the user must type to confirm */
  confirmWord: string
  /** One-line instruction ("Escribe ELIMINAR para confirmar") */
  confirmInstruction: string
  /** Long instruction, split so pages can render the word in bold */
  confirmInstructionPrefix: string
  confirmInstructionSuffix: string
  /** Short split used by banner-style modals and the i18n keys */
  confirmShortPrefix: string
  confirmShortSuffix: string
  /** Confirm-input placeholder */
  inputPlaceholder: string
  /** In-flight button label */
  deleting: string
  /** Destructive button label */
  deleteButton: string
  /** Post-delete success toast */
  successToast: string
  /** Goodbye screen */
  goodbyeTitle: string
  goodbyeBody: string
  /** Generic error fallback (real backend messages take precedence) */
  errorFallback: string
}

const RECOVERY_ES =
  'Tu cuenta se eliminará definitivamente en 30 días. Si inicias sesión antes de ese plazo, se recuperará automáticamente con todos tus datos.'
const RECOVERY_EN =
  'Your account will be permanently deleted in 30 days. If you sign in before then, it will be automatically recovered with all your data.'

export const ACCOUNT_DELETION_COPY: Record<'es' | 'en', AccountDeletionCopy> = {
  es: {
    modalTitle: 'Eliminar cuenta',
    warningTitle: '¿Eliminar tu cuenta?',
    recovery: RECOVERY_ES,
    warningBody: `Todos tus datos, documentos e historial serán eliminados. ${RECOVERY_ES}`,
    confirmWord: 'ELIMINAR',
    confirmInstruction: 'Escribe ELIMINAR para confirmar',
    confirmInstructionPrefix: 'Para confirmar la eliminación de tu cuenta, escribe',
    confirmInstructionSuffix: 'en el campo de abajo:',
    confirmShortPrefix: 'Escribe',
    confirmShortSuffix: 'para confirmar',
    inputPlaceholder: 'Escribe ELIMINAR',
    deleting: 'Eliminando...',
    deleteButton: 'Eliminar cuenta',
    successToast: RECOVERY_ES,
    goodbyeTitle: 'Cuenta eliminada',
    goodbyeBody: `${RECOVERY_ES} Gracias por usar Leasefy.`,
    errorFallback: 'No se pudo eliminar la cuenta. Intenta de nuevo.',
  },
  en: {
    modalTitle: 'Delete account',
    warningTitle: 'Delete your account?',
    recovery: RECOVERY_EN,
    warningBody: `All your data, documents, and history will be deleted. ${RECOVERY_EN}`,
    confirmWord: 'DELETE',
    confirmInstruction: 'Type DELETE to confirm',
    confirmInstructionPrefix: 'To confirm account deletion, type',
    confirmInstructionSuffix: 'in the field below:',
    confirmShortPrefix: 'Type',
    confirmShortSuffix: 'to confirm',
    inputPlaceholder: 'Type DELETE',
    deleting: 'Deleting...',
    deleteButton: 'Delete account',
    successToast: RECOVERY_EN,
    goodbyeTitle: 'Account deleted',
    goodbyeBody: `${RECOVERY_EN} Thank you for using Leasefy.`,
    errorFallback: 'Could not delete the account. Please try again.',
  },
}

/** Locale-aware accessor following the app's `locale === 'es'` convention. */
export function accountDeletionCopy(locale: string): AccountDeletionCopy {
  return locale === 'es' ? ACCOUNT_DELETION_COPY.es : ACCOUNT_DELETION_COPY.en
}
