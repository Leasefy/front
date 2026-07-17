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

describe('formDataFromUser', () => {
  it('keeps only the date part of the ISO birthDate', () => {
    expect(formDataFromUser(USER).birthDate).toBe('1990-05-20')
  })

  it('maps a null user to all-empty fields', () => {
    const form = formDataFromUser(null)
    expect(Object.values(form).every((v) => v === '')).toBe(true)
  })
})
