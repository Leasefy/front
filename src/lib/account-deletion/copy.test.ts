/**
 * Canonical account-deletion copy — single source of truth.
 *
 * Guards:
 * - both locales are complete (no empty strings);
 * - the canonical 30-day recovery sentence is present in both locales and in
 *   every message that must carry it (warning, toast, goodbye);
 * - the i18n-key-driven flow (landlord configuracion via
 *   `landlordSettings.modals.deleteAccount.*` / `landlordSettings.toasts.*`)
 *   emits EXACTLY the canonical strings — the JSON values must mirror this
 *   module, or the flows drift apart again.
 */

import { describe, it, expect } from 'vitest'
import {
  ACCOUNT_DELETION_COPY,
  accountDeletionCopy,
  type AccountDeletionCopy,
} from './copy'
import esLocale from '@/lib/i18n/locales/es.json'
import enLocale from '@/lib/i18n/locales/en.json'

const CANON_RECOVERY_ES =
  'Si inicias sesión en los próximos 30 días, la recuperas automáticamente con todos tus datos. Pasados 30 días, sólo el soporte de Leasefy puede recuperarla.'
const CANON_RECOVERY_EN =
  'If you sign in within the next 30 days, it is automatically recovered with all your data. After 30 days, only Leasefy support can recover it.'

describe('ACCOUNT_DELETION_COPY — completeness', () => {
  it.each(['es', 'en'] as const)('%s locale has every field non-empty', (locale) => {
    const copy = ACCOUNT_DELETION_COPY[locale]
    for (const [key, value] of Object.entries(copy)) {
      expect(value, `${locale}.${key}`).toBeTypeOf('string')
      expect((value as string).trim().length, `${locale}.${key}`).toBeGreaterThan(0)
    }
  })

  it('both locales expose the same field set', () => {
    expect(Object.keys(ACCOUNT_DELETION_COPY.es).sort()).toEqual(
      Object.keys(ACCOUNT_DELETION_COPY.en).sort(),
    )
  })
})

describe('ACCOUNT_DELETION_COPY — 30-day recovery sentence', () => {
  it('es carries the exact canonical recovery sentence', () => {
    expect(ACCOUNT_DELETION_COPY.es.recovery).toBe(CANON_RECOVERY_ES)
  })

  it('en carries the exact canonical recovery sentence', () => {
    expect(ACCOUNT_DELETION_COPY.en.recovery).toBe(CANON_RECOVERY_EN)
  })

  it.each(['es', 'en'] as const)(
    '%s: warning body, success toast and goodbye all contain the recovery sentence',
    (locale) => {
      const copy = ACCOUNT_DELETION_COPY[locale]
      for (const field of ['warningBody', 'successToast', 'goodbyeBody'] as const) {
        expect(copy[field], `${locale}.${field}`).toContain(copy.recovery)
      }
    },
  )
})

/*
 * `DELETE /users/me/account` sólo DESACTIVA la cuenta (`isActive: false`,
 * `deletedAt`) y cierra las sesiones: no borra nada. El cuerpo decía «Todos
 * tus datos, documentos e historial serán eliminados» y salía en la «Zona de
 * peligro» de Configuración. Nico, 02-10: que diga lo que pasa de verdad.
 */
describe('ACCOUNT_DELETION_COPY — dice lo que el back hace', () => {
  it('es: no promete borrar los datos, y dice que se cierran las sesiones y que los contratos quedan', () => {
    const { warningBody } = ACCOUNT_DELETION_COPY.es
    expect(warningBody).not.toMatch(/serán eliminad|se borrarán|se eliminarán/i)
    expect(warningBody).toContain('se cierran tus sesiones')
    expect(warningBody).toContain('quedan registrados')
  })

  it('en: no promete borrar los datos, y dice que se cierran las sesiones y que los contratos quedan', () => {
    const { warningBody } = ACCOUNT_DELETION_COPY.en
    expect(warningBody).not.toMatch(/will be deleted\. Your account/i)
    expect(warningBody).not.toMatch(/all your data, documents/i)
    expect(warningBody).toContain('sessions are closed')
    expect(warningBody).toContain('stay on record')
  })

  it.each([
    ['es', esLocale],
    ['en', enLocale],
  ] as const)('%s.json: la «Zona de peligro» tampoco lo promete', (_locale, json) => {
    const texto = JSON.stringify(
      (json as unknown as { landlordSettings: { dangerZone: unknown } }).landlordSettings.dangerZone,
    )
    expect(texto).not.toMatch(/serán eliminad|irreversible|is permanent|will be deleted/i)
  })
})

/*
 * Nico, 02-10-2026 (pregunta 14): decía «Tu cuenta se eliminará
 * definitivamente en 30 días», pero el back nunca la borra: pasados los 30
 * días la BLOQUEA (`SupabaseStrategy`, 401 «contacta al soporte de
 * Leasefy»). Ni el módulo ni ninguna clave de i18n puede volver a prometer
 * un borrado que no existe.
 */
describe('la ventana de 30 días dice lo que pasa de verdad', () => {
  it.each(['es', 'en'] as const)('%s: la recuperación nombra al soporte y no promete borrar', (locale) => {
    const { recovery } = ACCOUNT_DELETION_COPY[locale]
    expect(recovery).toMatch(locale === 'es' ? /sólo el soporte de Leasefy/ : /only Leasefy support/)
    expect(recovery).not.toMatch(/definitivamente|permanently deleted|se eliminará/i)
  })

  it.each([
    ['es', esLocale],
    ['en', enLocale],
  ] as const)('%s.json: ninguna clave dice que la cuenta se borra en 30 días', (_locale, json) => {
    const texto = JSON.stringify(json)
    expect(texto).not.toMatch(/se eliminará definitivamente en 30 días|will be permanently deleted in 30 days/)
  })
})

describe('accountDeletionCopy() locale accessor', () => {
  it("returns es for 'es' and en for anything else (app convention)", () => {
    expect(accountDeletionCopy('es')).toBe(ACCOUNT_DELETION_COPY.es)
    expect(accountDeletionCopy('en')).toBe(ACCOUNT_DELETION_COPY.en)
    expect(accountDeletionCopy('fr')).toBe(ACCOUNT_DELETION_COPY.en)
  })
})

describe('i18n mirror — landlord configuracion keys emit the canonical strings', () => {
  interface DeleteAccountKeys {
    title: string
    warning: string
    warningDesc: string
    typeToConfirm: string
    confirmWord: string
    toConfirm: string
    deleting: string
    deleteButton: string
  }
  interface LandlordSettingsSlice {
    landlordSettings: {
      modals: { deleteAccount: DeleteAccountKeys }
      toasts: { accountDeleted: string; typeToConfirm: string }
    }
  }

  const cases: Array<[string, LandlordSettingsSlice, AccountDeletionCopy]> = [
    ['es', esLocale as unknown as LandlordSettingsSlice, ACCOUNT_DELETION_COPY.es],
    ['en', enLocale as unknown as LandlordSettingsSlice, ACCOUNT_DELETION_COPY.en],
  ]

  it.each(cases)('%s.json mirrors the module', (_locale, json, copy) => {
    const modal = json.landlordSettings.modals.deleteAccount
    expect(modal.title).toBe(copy.modalTitle)
    expect(modal.warning).toBe(copy.warningTitle)
    expect(modal.warningDesc).toBe(copy.warningBody)
    expect(modal.typeToConfirm).toBe(copy.confirmShortPrefix)
    expect(modal.confirmWord).toBe(copy.confirmWord)
    expect(modal.toConfirm).toBe(copy.confirmShortSuffix)
    expect(modal.deleting).toBe(copy.deleting)
    expect(modal.deleteButton).toBe(copy.deleteButton)
    expect(json.landlordSettings.toasts.accountDeleted).toBe(copy.successToast)
    expect(json.landlordSettings.toasts.typeToConfirm).toBe(copy.confirmInstruction)
  })
})
