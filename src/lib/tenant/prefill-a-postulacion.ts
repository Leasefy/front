/**
 * prefill-a-postulacion — cómo se convierte lo que ya nos dio una persona en
 * una postulación.
 *
 * Vivía suelto adentro de `ApplicationContext`, que era su único consumidor.
 * Ahora son dos: el wizard, que lo usa para rellenar los campos, y la
 * postulación directa, que lo usa para decidir si hay que preguntar algo.
 * Tienen que ser el MISMO mapeo — si difirieran, la pantalla diría "ya tenemos
 * todo" y el wizard después encontraría campos vacíos.
 *
 * Desde T-0001/T-0020, el prefill trae además `preScoringIdentity`: la
 * identidad derivada del estudio de pre-scoring vigente. Es ORTOGONAL a
 * `hasPreviousApplication` — alguien sin postulación previa puede tener un
 * estudio vigente y de todas formas debe ver su identidad precargada y
 * bloqueada. Por eso `identidadEfectiva` recibe la unión completa
 * (`ApplicationPrefill`), no sólo el miembro con datos.
 */

import type { Application, DocumentInfo, DocumentUpload } from '@/lib/types/application'
import type {
  ApplicationPrefill,
  ApplicationPrefillData,
  DocumentoReutilizable,
} from '@/lib/api/applications.types'

/**
 * Los tipos del back, traducidos a las ranuras del formulario.
 * Sólo cédula y extracto tienen ranura — el resto (contrato laboral,
 * certificado de ingresos, colilla, reporte de crédito) ya no se pide en el
 * formulario, así que un documento reutilizable de esos tipos se ignora
 * igual que `OTHER`.
 */
const RANURA_POR_TIPO: Record<string, keyof DocumentInfo> = {
  ID_DOCUMENT: 'idDocument',
  BANK_STATEMENT: 'bankStatement',
}

/**
 * Los documentos que ya subió, puestos en las ranuras del formulario.
 *
 * `file: null` y `fileName` con el nombre real: es exactamente la forma que
 * tiene un documento que ya vive en el servidor. La validación del wizard
 * (`hasDocument`) da por presente cualquiera de los dos, así que un documento
 * reusado cuenta igual que uno recién subido — que es la verdad: está.
 *
 * `reusable: true` no es decorativo: es lo que separa "está en el servidor, hay
 * que copiarlo" de "se perdió el File al recargar". Sin la marca, el envío del
 * wizard se bloqueaba pidiendo adjuntar de nuevo justo los documentos que esta
 * pantalla acaba de dar por presentes.
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
      reusable: true,
    }
    ranuras[ranura] = doc
  }
  return ranuras
}

// ============================================================================
// Identidad del estudio de pre-scoring — precedencia sobre la postulación
// anterior (contract.md T-0001 §3.2)
// ============================================================================

export type CampoDeIdentidad = 'fullName' | 'documentType' | 'documentNumber' | 'email'

export interface IdentidadEfectiva {
  fullName: string | null
  documentType: string | null
  documentNumber: string | null
  email: string | null
  /** Derivado de `preScoringIdentity.lockedFields` — nunca una lista fija. */
  lockedFields: Set<CampoDeIdentidad>
  /** true cuando `preScoringIdentity` está presente en la respuesta. */
  vieneDelEstudio: boolean
  /** Sólo para correlación/telemetría — nunca se manda de vuelta en un body. */
  orderId: string | null
}

/**
 * Resuelve la identidad efectiva de un `GET /applications/prefill`, campo a
 * campo: `preScoringIdentity` gana cuando su valor no es null; si no, se cae
 * al valor de la postulación anterior (cuando `hasPreviousApplication` es
 * true); si tampoco hay, queda null.
 *
 * Recibe la unión completa a propósito: `preScoringIdentity` puede venir con
 * `hasPreviousApplication: false`, y esa combinación (primera postulación,
 * pero con estudio vigente) es exactamente el caso que este task viene a
 * arreglar.
 */
export function identidadEfectiva(prefill: ApplicationPrefill): IdentidadEfectiva {
  const identidad = prefill.preScoringIdentity ?? null
  const previa = prefill.hasPreviousApplication ? prefill : null

  return {
    fullName: identidad?.fullName ?? previa?.fullName ?? null,
    documentType: identidad?.documentType ?? previa?.documentType ?? null,
    documentNumber: identidad?.documentNumber ?? previa?.documentNumber ?? null,
    email: identidad?.email ?? previa?.email ?? null,
    lockedFields: new Set(identidad?.lockedFields ?? []),
    vieneDelEstudio: !!identidad,
    orderId: identidad?.orderId ?? null,
  }
}

/**
 * Aplica el prefill sobre una postulación, sin pisar lo que ya tenga.
 *
 * `prefilledAt` queda marcado: los pasos NO se dan por confirmados. Un dato
 * traído de antes es una comodidad, no una confirmación — el wizard pide
 * revisarlo. La postulación directa es el caso aparte donde esa revisión se
 * reemplaza por una sola pantalla de confirmación.
 *
 * La identidad del estudio (`preScoringIdentity`) gana sobre los valores de
 * la postulación anterior para los cuatro campos que cubre — ver
 * `identidadEfectiva`. El resto de `personal` (teléfono, dirección, etc.)
 * sigue viniendo únicamente de la postulación anterior, cuando existe.
 */
export function aplicarPrefill(prev: Application, prefill: ApplicationPrefill): Application {
  const identidad = identidadEfectiva(prefill)
  const previa: Partial<ApplicationPrefillData> | null = prefill.hasPreviousApplication
    ? prefill
    : null

  return {
    ...prev,
    personal: {
      ...prev.personal,
      fullName: identidad.fullName ?? prev.personal.fullName ?? '',
      documentType:
        (identidad.documentType as Application['personal']['documentType']) ??
        prev.personal.documentType,
      documentNumber: identidad.documentNumber ?? prev.personal.documentNumber ?? '',
      dateOfBirth: previa?.dateOfBirth ?? prev.personal.dateOfBirth ?? '',
      phone: previa?.phone ?? prev.personal.phone ?? '',
      email: identidad.email ?? prev.personal.email ?? '',
      currentAddress: previa?.currentAddress ?? prev.personal.currentAddress ?? '',
      timeAtCurrentAddress: previa?.timeAtCurrentAddress ?? prev.personal.timeAtCurrentAddress,
      maritalStatus:
        (previa?.maritalStatus as Application['personal']['maritalStatus']) ??
        prev.personal.maritalStatus,
      dependents: previa?.dependents ?? prev.personal.dependents,
    },
    employment: {
      ...prev.employment,
      employmentStatus:
        (previa?.employmentStatus as Application['employment']['employmentStatus']) ??
        prev.employment.employmentStatus,
      companyName: previa?.companyName ?? prev.employment.companyName ?? '',
    },
    income: {
      ...prev.income,
      monthlySalary: previa?.monthlySalary ?? prev.income.monthlySalary ?? 0,
      additionalIncome: previa?.additionalIncome ?? prev.income.additionalIncome ?? 0,
      additionalIncomeSource:
        previa?.additionalIncomeSource ?? prev.income.additionalIncomeSource ?? '',
      totalMonthlyIncome: previa?.totalMonthlyIncome ?? prev.income.totalMonthlyIncome ?? 0,
      monthlyObligations: previa?.monthlyObligations ?? prev.income.monthlyObligations ?? 0,
      availableForRent: previa?.availableForRent ?? prev.income.availableForRent ?? 0,
    },
    // Reconstruido campo a campo — no un passthrough — porque el back todavía
    // puede mandar `personalReferences` en el JSON legado y ese campo ya no
    // existe en `ReferenceInfo`.
    references: previa?.references
      ? {
          previousLandlords:
            previa.references.previousLandlords ?? prev.references.previousLandlords,
          employmentReferences:
            previa.references.employmentReferences ?? prev.references.employmentReferences,
        }
      : prev.references,
    // Los documentos reusados entran como ya-presentes: el back los adjunta de
    // verdad con POST /applications/:id/documents/reuse.
    documents: { ...prev.documents, ...documentosEnRanuras(previa?.documents) },
    hasCoSigner: previa?.hasCoSigner ?? prev.hasCoSigner,
    coSigner: (previa?.coSigner as unknown as Application['coSigner']) ?? prev.coSigner,
    preScoringOrderId: identidad.orderId ?? prev.preScoringOrderId,
    preScoringLockedFields: Array.from(identidad.lockedFields),
    preScoringIdentityApplied: identidad.vieneDelEstudio,
    previousApplicationDataApplied: !!previa,
    prefilledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
