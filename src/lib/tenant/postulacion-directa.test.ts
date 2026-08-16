import { describe, it, expect } from 'vitest'

import { evaluarPostulacionDirecta } from './postulacion-directa'
import { documentosEnRanuras } from './prefill-a-postulacion'
import type { Aprobacion } from '@/lib/api/aprobacion.service'
import type { ApplicationPrefillData } from '@/lib/api/applications.types'

/**
 * Saltarse el formulario es una decisión con consecuencias: si nos
 * equivocamos, la inmobiliaria recibe una postulación incompleta y se entera
 * cuando ya está evaluando. Cada test de acá fija una condición que, si
 * faltara, mandaría a alguien de largo sin tener con qué.
 */

const APROBADA: Aprobacion = {
  estado: 'aprobado',
  topeAprobadoCop: 2_600_000,
  aseguradoras: [{ nombre: 'Fianli', aprobada: true }],
  vigenteHasta: '2026-12-01T00:00:00.000Z',
  resueltoEn: '2026-08-01T00:00:00.000Z',
  condicionada: false,
  canonConsultadoCop: null,
}

const PREFILL_COMPLETO: ApplicationPrefillData = {
  hasPreviousApplication: true,
  fullName: 'María Fernanda Ruiz',
  documentType: 'cc',
  documentNumber: '1020304050',
  dateOfBirth: '1994-03-15',
  phone: '3105551234',
  email: 'maria@ejemplo.co',
  currentAddress: 'Calle 93 # 15-20, Bogotá',
  timeAtCurrentAddress: 24,
  maritalStatus: 'single',
  dependents: 0,
  employmentStatus: 'employed',
  companyName: 'Acme SAS',
  industry: 'Tecnología',
  position: 'Analista',
  contractType: 'indefinite',
  timeAtJob: 30,
  employerPhone: '3115551234',
  employerAddress: 'Carrera 7 # 71-21',
  monthlySalary: 6_000_000,
  additionalIncome: 0,
  additionalIncomeSource: '',
  totalMonthlyIncome: 6_000_000,
  monthlyObligations: 500_000,
  availableForRent: 2_500_000,
  references: {
    previousLandlords: [
      {
        name: 'Jorge Pérez',
        phone: '3125551234',
        address: 'Calle 100 # 10-10',
        duration: 24,
        relationship: 'Arrendador',
      },
    ],
    employmentReferences: [
      { name: 'Ana Gómez', phone: '3135551234', company: 'Acme SAS', relationship: 'Jefe' },
    ],
    personalReferences: [{ name: 'Luis Díaz', phone: '3145551234', relationship: 'Amigo' }],
  },
  hasCoSigner: false,
  coSigner: null,
  documents: [
    {
      type: 'ID_DOCUMENT',
      originalName: 'cedula.pdf',
      size: 377675,
      uploadedAt: '2026-06-01T10:00:00.000Z',
    },
    {
      type: 'BANK_STATEMENT',
      originalName: 'extracto.pdf',
      size: 131306,
      uploadedAt: '2026-06-01T10:01:00.000Z',
    },
    {
      type: 'EMPLOYMENT_LETTER',
      originalName: 'contrato.pdf',
      size: 540819,
      uploadedAt: '2026-06-01T10:02:00.000Z',
    },
  ],
}

function evaluar(over: Partial<Parameters<typeof evaluarPostulacionDirecta>[0]> = {}) {
  return evaluarPostulacionDirecta({
    haySesion: true,
    aprobacion: APROBADA,
    vigente: true,
    prefill: PREFILL_COMPLETO,
    canonCop: 2_000_000,
    ...over,
  })
}

describe('evaluarPostulacionDirecta', () => {
  it('con todo listo, no le pedimos nada', () => {
    expect(evaluar()).toEqual({ directa: true })
  })

  it('sin sesión no se sabe quién es — al formulario', () => {
    // Sin token, la ausencia de aprobación no prueba que no se haya estudiado.
    expect(evaluar({ haySesion: false })).toMatchObject({ motivo: 'sin_sesion' })
  })

  it('sin aprobación vigente, al formulario', () => {
    expect(evaluar({ aprobacion: null })).toMatchObject({ motivo: 'sin_aprobacion_vigente' })
    expect(evaluar({ vigente: false })).toMatchObject({ motivo: 'sin_aprobacion_vigente' })
    expect(evaluar({ aprobacion: { ...APROBADA, estado: 'en_proceso' } })).toMatchObject({
      motivo: 'sin_aprobacion_vigente',
    })
  })

  it('un canon por encima del tope no pasa de largo', () => {
    expect(evaluar({ canonCop: 3_000_000 })).toMatchObject({ motivo: 'fuera_del_tope' })
  })

  it('el canon exacto del tope sí entra', () => {
    expect(evaluar({ canonCop: 2_600_000 })).toEqual({ directa: true })
  })

  it('aprobada SIN tope no habilita el atajo — no saber no es que sí', () => {
    // Hay aseguradoras que respaldan sin comprometer techo. Sin ese número no
    // se puede afirmar que el inmueble le entra: se le pide lo de siempre.
    expect(evaluar({ aprobacion: { ...APROBADA, topeAprobadoCop: null } })).toMatchObject({
      motivo: 'tope_desconocido',
    })
  })

  it('sin el canon del inmueble tampoco', () => {
    expect(evaluar({ canonCop: undefined })).toMatchObject({ motivo: 'tope_desconocido' })
  })

  it('sin postulación previa, el formulario completo', () => {
    expect(evaluar({ prefill: { hasPreviousApplication: false } })).toMatchObject({
      motivo: 'sin_postulacion_previa',
    })
    expect(evaluar({ prefill: null })).toMatchObject({ motivo: 'sin_postulacion_previa' })
  })

  describe('datos incompletos — se pide sólo porque falta algo de verdad', () => {
    it('sin cédula adjunta no se postula sin más', () => {
      const sinCedula = {
        ...PREFILL_COMPLETO,
        documents: PREFILL_COMPLETO.documents!.filter((d) => d.type !== 'ID_DOCUMENT'),
      }
      expect(evaluar({ prefill: sinCedula })).toMatchObject({
        motivo: 'faltan_datos',
        pasosIncompletos: [5],
      })
    })

    it('sin NINGÚN documento tampoco (un back viejo que no manda el campo)', () => {
      const sinDocs = { ...PREFILL_COMPLETO, documents: undefined }
      expect(evaluar({ prefill: sinDocs })).toMatchObject({
        motivo: 'faltan_datos',
        pasosIncompletos: [5],
      })
    })

    it('contrato laboral O certificado de ingresos: con uno alcanza', () => {
      const conIngresos = {
        ...PREFILL_COMPLETO,
        documents: [
          ...PREFILL_COMPLETO.documents!.filter((d) => d.type !== 'EMPLOYMENT_LETTER'),
          {
            type: 'INCOME_PROOF',
            originalName: 'ingresos.pdf',
            size: 1000,
            uploadedAt: '2026-06-01T10:00:00.000Z',
          },
        ],
      }
      expect(evaluar({ prefill: conIngresos })).toEqual({ directa: true })
    })

    it('sin referencias, al formulario', () => {
      const sinRefs = { ...PREFILL_COMPLETO, references: null }
      expect(evaluar({ prefill: sinRefs })).toMatchObject({
        motivo: 'faltan_datos',
        pasosIncompletos: [4],
      })
    })

    it('un teléfono que no es colombiano invalida el paso 1', () => {
      const malTelefono = { ...PREFILL_COMPLETO, phone: '12345' }
      expect(evaluar({ prefill: malTelefono })).toMatchObject({
        motivo: 'faltan_datos',
        pasosIncompletos: [1],
      })
    })

    it('sin salario no se puede evaluar', () => {
      const sinSalario = { ...PREFILL_COMPLETO, monthlySalary: 0, totalMonthlyIncome: 0 }
      expect(evaluar({ prefill: sinSalario })).toMatchObject({
        motivo: 'faltan_datos',
        pasosIncompletos: [3],
      })
    })

    it('informa TODOS los pasos que faltan, no sólo el primero', () => {
      const casiVacio = {
        ...PREFILL_COMPLETO,
        fullName: null,
        employmentStatus: null,
        references: null,
      }
      const r = evaluar({ prefill: casiVacio })
      expect(r.pasosIncompletos).toEqual([1, 2, 4])
    })
  })
})

describe('documentosEnRanuras', () => {
  it('traduce los tipos del back a las ranuras del formulario', () => {
    const r = documentosEnRanuras(PREFILL_COMPLETO.documents)
    expect(r.idDocument?.fileName).toBe('cedula.pdf')
    expect(r.bankStatement?.fileName).toBe('extracto.pdf')
    expect(r.employmentLetter?.fileName).toBe('contrato.pdf')
  })

  it('un documento ya subido entra con file en null y su nombre real', () => {
    // Es la forma que tiene un documento que vive en el servidor: la validación
    // del wizard da por presente cualquiera de los dos campos.
    const r = documentosEnRanuras(PREFILL_COMPLETO.documents)
    expect(r.idDocument).toMatchObject({ file: null, fileName: 'cedula.pdf' })
    expect(r.idDocument?.uploadedAt).toBe('2026-06-01T10:00:00.000Z')
  })

  it('un tipo sin ranura (OTHER) se ignora en vez de romper', () => {
    const r = documentosEnRanuras([
      { type: 'OTHER', originalName: 'x.pdf', size: 1, uploadedAt: '2026-01-01T00:00:00.000Z' },
    ])
    expect(r).toEqual({})
  })

  it('sin documentos devuelve un objeto vacío, no undefined', () => {
    expect(documentosEnRanuras(undefined)).toEqual({})
    expect(documentosEnRanuras([])).toEqual({})
  })
})
