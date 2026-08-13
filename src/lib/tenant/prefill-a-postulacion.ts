/**
 * prefill-a-postulacion — cómo se convierte lo que ya nos dio una persona en
 * una postulación.
 *
 * Vivía suelto adentro de `ApplicationContext`, que era su único consumidor.
 * Ahora son dos: el wizard, que lo usa para rellenar los campos, y la
 * postulación directa, que lo usa para decidir si hay que preguntar algo.
 * Tienen que ser el MISMO mapeo — si difirieran, la pantalla diría "ya tenemos
 * todo" y el wizard después encontraría campos vacíos.
 */

import type { Application, DocumentInfo, DocumentUpload } from '@/lib/types/application'
import type { ApplicationPrefillData, DocumentoReutilizable } from '@/lib/api/applications.types'

/**
 * Los tipos del back, traducidos a las ranuras del formulario.
 * `OTHER` no tiene ranura: se ignora.
 */
const RANURA_POR_TIPO: Record<string, keyof DocumentInfo> = {
  ID_DOCUMENT: 'idDocument',
  BANK_STATEMENT: 'bankStatement',
  INCOME_PROOF: 'incomeProof',
  EMPLOYMENT_LETTER: 'employmentLetter',
  PAY_STUB: 'payStub',
  CREDIT_REPORT: 'creditReport',
}

/**
 * Los documentos que ya subió, puestos en las ranuras del formulario.
 *
 * `file: null` y `fileName` con el nombre real: es exactamente la forma que
 * tiene un documento que ya vive en el servidor. La validación del wizard
 * (`hasDocument`) da por presente cualquiera de los dos, así que un documento
 * reusado cuenta igual que uno recién subido — que es la verdad: está.
 */
export function documentosEnRanuras(
  documentos: DocumentoReutilizable[] | undefined,
): Partial<DocumentInfo> {
  const ranuras: Partial<DocumentInfo> = {}
  for (const d of documentos ?? []) {
    const ranura = RANURA_POR_TIPO[d.type]
    if (!ranura) continue
    const doc: DocumentUpload = {
      file: null,
      fileName: d.originalName,
      uploadedAt: d.uploadedAt,
    }
    ranuras[ranura] = doc
  }
  return ranuras
}

/**
 * Aplica el prefill sobre una postulación, sin pisar lo que ya tenga.
 *
 * `prefilledAt` queda marcado: los pasos NO se dan por confirmados. Un dato
 * traído de antes es una comodidad, no una confirmación — el wizard pide
 * revisarlo. La postulación directa es el caso aparte donde esa revisión se
 * reemplaza por una sola pantalla de confirmación.
 */
export function aplicarPrefill(prev: Application, data: ApplicationPrefillData): Application {
  return {
    ...prev,
    personal: {
      ...prev.personal,
      fullName: data.fullName ?? prev.personal.fullName ?? '',
      documentType:
        (data.documentType as Application['personal']['documentType']) ?? prev.personal.documentType,
      documentNumber: data.documentNumber ?? prev.personal.documentNumber ?? '',
      dateOfBirth: data.dateOfBirth ?? prev.personal.dateOfBirth ?? '',
      phone: data.phone ?? prev.personal.phone ?? '',
      email: data.email ?? prev.personal.email ?? '',
      currentAddress: data.currentAddress ?? prev.personal.currentAddress ?? '',
      timeAtCurrentAddress: data.timeAtCurrentAddress ?? prev.personal.timeAtCurrentAddress,
      maritalStatus:
        (data.maritalStatus as Application['personal']['maritalStatus']) ??
        prev.personal.maritalStatus,
      dependents: data.dependents ?? prev.personal.dependents,
    },
    employment: {
      ...prev.employment,
      employmentStatus:
        (data.employmentStatus as Application['employment']['employmentStatus']) ??
        prev.employment.employmentStatus,
      companyName: data.companyName ?? prev.employment.companyName ?? '',
      industry: data.industry ?? prev.employment.industry ?? '',
      position: data.position ?? prev.employment.position ?? '',
      contractType:
        (data.contractType as Application['employment']['contractType']) ??
        prev.employment.contractType,
      timeAtJob: data.timeAtJob ?? prev.employment.timeAtJob,
      employerPhone: data.employerPhone ?? prev.employment.employerPhone ?? '',
      employerAddress: data.employerAddress ?? prev.employment.employerAddress ?? '',
    },
    income: {
      ...prev.income,
      monthlySalary: data.monthlySalary ?? prev.income.monthlySalary ?? 0,
      additionalIncome: data.additionalIncome ?? prev.income.additionalIncome ?? 0,
      additionalIncomeSource:
        data.additionalIncomeSource ?? prev.income.additionalIncomeSource ?? '',
      totalMonthlyIncome: data.totalMonthlyIncome ?? prev.income.totalMonthlyIncome ?? 0,
      monthlyObligations: data.monthlyObligations ?? prev.income.monthlyObligations ?? 0,
      availableForRent: data.availableForRent ?? prev.income.availableForRent ?? 0,
    },
    references: data.references ?? prev.references,
    // Los documentos reusados entran como ya-presentes: el back los adjunta de
    // verdad con POST /applications/:id/documents/reuse.
    documents: { ...prev.documents, ...documentosEnRanuras(data.documents) },
    hasCoSigner: data.hasCoSigner ?? prev.hasCoSigner,
    coSigner: (data.coSigner as unknown as Application['coSigner']) ?? prev.coSigner,
    prefilledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
