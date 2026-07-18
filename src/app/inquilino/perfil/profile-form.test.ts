/**
 * profile-form — changed-fields diffing for PATCH /users/me.
 *
 * Key contract: a field cleared to '' is sent as null (backend validators
 * reject empty strings; null passes @IsOptional and clears the column).
 */
import { describe, it, expect } from 'vitest'
import type { User } from '@/lib/auth'
import {
  buildChangedFields,
  formDataFromUser,
  editablePersonalFields,
  isRutLocked,
  PERSONAL_FIELDS,
  EMERGENCY_FIELDS,
} from './profile-form'

const USER: User = {
  id: 'u1',
  email: 'ana@ejemplo.com',
  name: 'Ana Rojas',
  firstName: 'Ana',
  lastName: 'Rojas',
  phone: '3001234567',
  rut: '1090525663',
  address: 'Calle 1 #2-3',
  birthDate: '1990-05-20T00:00:00.000Z',
  role: 'tenant',
}

describe('buildChangedFields', () => {
  it('sends only the fields that changed', () => {
    const form = { ...formDataFromUser(USER), firstName: 'Anita' }
    expect(buildChangedFields(PERSONAL_FIELDS, form, USER)).toEqual({
      firstName: 'Anita',
    })
  })

  it('sends null (not empty string) when a field is cleared', () => {
    const form = { ...formDataFromUser(USER), phone: '', birthDate: '' }
    expect(buildChangedFields(PERSONAL_FIELDS, form, USER)).toEqual({
      phone: null,
      birthDate: null,
    })
  })

  it('returns an empty payload when nothing changed', () => {
    const form = formDataFromUser(USER)
    expect(buildChangedFields(PERSONAL_FIELDS, form, USER)).toEqual({})
    expect(buildChangedFields(EMERGENCY_FIELDS, form, USER)).toEqual({})
  })

  it('does not treat an already-empty field as a change', () => {
    const emptyUser: User = { ...USER, phone: undefined }
    const form = formDataFromUser(emptyUser)
    expect(buildChangedFields(PERSONAL_FIELDS, form, emptyUser)).toEqual({})
  })
})

describe('rut immutability (support-request rule)', () => {
  it('locks only when the user already has a rut', () => {
    expect(isRutLocked(USER)).toBe(true)
    expect(isRutLocked({ ...USER, rut: undefined })).toBe(false)
    expect(isRutLocked(null)).toBe(false)
  })

  it('excludes rut from the editable fields when locked', () => {
    expect(editablePersonalFields(USER)).not.toContain('rut')
    expect(editablePersonalFields({ ...USER, rut: undefined })).toEqual(PERSONAL_FIELDS)
  })

  it('never includes rut in the PATCH payload when locked, even if the form value differs', () => {
    const form = { ...formDataFromUser(USER), rut: '999999999', phone: '3009999999' }
    expect(buildChangedFields(editablePersonalFields(USER), form, USER)).toEqual({
      phone: '3009999999',
    })
  })

  it('still allows the first-time set (no rut yet)', () => {
    const emptyRutUser: User = { ...USER, rut: undefined }
    const form = { ...formDataFromUser(emptyRutUser), rut: '1090525663' }
    expect(buildChangedFields(editablePersonalFields(emptyRutUser), form, emptyRutUser)).toEqual({
      rut: '1090525663',
    })
  })
})

describe('formDataFromUser', () => {
  it('keeps only the date part of the ISO birthDate', () => {
    expect(formDataFromUser(USER).birthDate).toBe('1990-05-20')
  })

  it('maps a null user to all-empty fields', () => {
    const form = formDataFromUser(null)
    expect(Object.values(form).every((v) => v === '')).toBe(true)
  })
})
