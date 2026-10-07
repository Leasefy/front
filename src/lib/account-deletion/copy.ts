/**
 * Canonical account-deletion copy — SINGLE SOURCE OF TRUTH.
 *
 * Owner rule: deleted accounts keep a 30-day recovery window (signing in
 * again reactivates the account with all data; afterwards it is locked —
 * never erased — and only Leasefy support can recover it). Every delete-account flow must tell the
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
  /** Config-style body: what the deletion does (deactivate + close sessions, nothing erased) + the recovery explanation */
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

/**
 * La ventana de recuperación, con lo que el back hace DE VERDAD (Nico,
 * 02-10-2026, pregunta 14). Decía «Tu cuenta se eliminará definitivamente en
 * 30 días», pero nada la borra nunca:
 *
 *  · `UsersService.deleteAccount` sólo la desactiva (`isActive: false`,
 *    `deletedAt`) y cierra las sesiones;
 *  · `SupabaseStrategy` la reactiva si la persona inicia sesión dentro de
 *    `ACCOUNT_RECOVERY_WINDOW_DAYS` (30) días;
 *  · pasados los 30 días la BLOQUEA (401 «Esta cuenta fue eliminada. Para
 *    recuperarla, contacta al soporte de Leasefy.»): sólo el soporte la abre.
 */
const RECOVERY_ES =
  'Si inicias sesión en los próximos 30 días, la recuperas automáticamente con todos tus datos. Pasados 30 días, sólo el soporte de Leasefy puede recuperarla.'
const RECOVERY_EN =
  'If you sign in within the next 30 days, it is automatically recovered with all your data. After 30 days, only Leasefy support can recover it.'

/**
 * What the deletion actually does, in one sentence. `DELETE /users/me/account`
 * (back `UsersService.deleteAccount`) only DEACTIVATES the user
 * (`isActive: false`, `deletedAt`) and revokes every session; it erases
 * nothing. This used to say «Todos tus datos, documentos e historial serán
 * eliminados» — a promise the back never kept. Same facts the three profile
 * modals list («Perderás» / «No se elimina»).
 */
const WHAT_HAPPENS_ES =
  'Pierdes el acceso a tu cuenta y se cierran tus sesiones en todos tus dispositivos. Tus contratos y pagos no se borran: quedan registrados.'
const WHAT_HAPPENS_EN =
  'You lose access to your account and your sessions are closed on every device. Your contracts and payments are not erased: they stay on record.'

export const ACCOUNT_DELETION_COPY: Record<'es' | 'en', AccountDeletionCopy> = {
  es: {
    modalTitle: 'Eliminar cuenta',
    warningTitle: '¿Eliminar tu cuenta?',
    recovery: RECOVERY_ES,
    warningBody: `${WHAT_HAPPENS_ES} ${RECOVERY_ES}`,
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
    warningBody: `${WHAT_HAPPENS_EN} ${RECOVERY_EN}`,
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
