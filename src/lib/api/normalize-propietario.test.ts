/**
 * La ficha del propietario reventaba con «Cannot read properties of undefined
 * (reading 'bank')»: el back manda el banco en cuatro campos planos y la
 * pantalla espera `bankAccount`. Nico lo vio buscando un propietario recién
 * creado con IA (2026-09-02 12:47).
 */
import { describe, it, expect } from 'vitest'
import { normalizePropietario, codigoDeBanco } from './inmobiliaria.service'

const base = {
  id: 'po-1',
  name: 'Jorge Restrepo',
  email: null,
  phone: null,
  documentType: 'CC' as const,
  documentNumber: '71234567',
  createdAt: '2026-09-02',
  updatedAt: '2026-09-02',
}

describe('normalizePropietario', () => {
  it('arma bankAccount desde los campos planos del back y trae los totales', () => {
    const p = normalizePropietario({
      ...base,
      bankName: 'Bancolombia',
      bankAccountType: 'Corriente',
      bankAccountNumber: '91234567890',
      bankAccountHolder: 'JORGE RESTREPO',
      propertyCount: 2,
      activeLeases: 1,
      totalMonthlyRent: 1800000,
    })
    expect(p.bankAccount).toEqual({
      bank: 'bancolombia',
      bankName: 'Bancolombia',
      accountType: 'checking',
      accountNumber: '91234567890',
      accountHolder: 'JORGE RESTREPO',
    })
    expect(p.propertyCount).toBe(2)
    expect(p.activeLeases).toBe(1)
    expect(p.totalMonthlyRent).toBe(1800000)
    expect(p.pendingBalance).toBe(0)
  })

  it('sin datos bancarios ni totales no revienta: cuenta vacía y ceros', () => {
    const p = normalizePropietario({ ...base })
    expect(p.bankAccount.accountNumber).toBe('')
    expect(p.bankAccount.bank).toBe('')
    expect(p.propertyCount).toBe(0)
  })

  it('el banco se reconoce por nombre, y si no está en la lista queda vacío (no se inventa)', () => {
    expect(codigoDeBanco('Bancolombia S.A.')).toBe('bancolombia')
    expect(codigoDeBanco('Banco Desconocido del Sur')).toBe('')
    expect(codigoDeBanco(null)).toBe('')
  })

  it('reconoce el nombre sin tildes, como llega de una migración', () => {
    expect(codigoDeBanco('Banco de Bogota')).toBe('bogota')
    expect(codigoDeBanco('Itau')).toBe('itau')
  })

  it('una billetera que no está en el catálogo conserva su nombre para mostrarlo', () => {
    const p = normalizePropietario({ ...base, bankName: 'Nequi', bankAccountNumber: '3001234567' })
    expect(p.bankAccount.bank).toBe('')
    expect(p.bankAccount.bankName).toBe('Nequi')
  })
})
