'use client'

/**
 * PostulacionDirecta — una pantalla en vez de seis pasos.
 *
 * Para quien ya se estudió, tiene la aprobación vigente, el inmueble le entra
 * en el tope y ya llenó una postulación completa: no hay nada que preguntarle.
 * Lo medimos en la base — de 77 documentos, 57 son la misma persona subiendo
 * algo que ya había subido; una cédula aparece 7 veces.
 *
 * Lo único que sí se pide, porque la ley lo exige y no es una formalidad: la
 * **autorización de tratamiento de datos**. La Ley 1581/2012 la pide previa,
 * expresa e informada y para una finalidad determinada, y cada inmueble puede
 * ser de otra inmobiliaria — otro responsable del tratamiento. Por eso el
 * prefill del back excluye a propósito los campos de consentimiento.
 *
 * Se muestra qué se va a mandar y **de cuándo es cada documento**, antes de
 * confirmar. Un extracto de hace ocho meses sigue siendo un archivo válido pero
 * no es el extracto que la aseguradora espera; reemplazarlo es decisión de la
 * persona, y para eso está la salida al formulario.
 */

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Buildings,
  Briefcase,
  CheckCircle,
  FileText,
  LockSimple,
  MapPin,
  User,
  Warning,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { applicationsApi } from '@/lib/api/applications.service'
import { ApiError } from '@/lib/api/client'
import { formatCurrency } from '@/lib/format'
import type { ApplicationPrefillData, DocumentoReutilizable } from '@/lib/api/applications.types'
import type { ConsentTextResponse } from '@/lib/api/legal.service'
import { DOCUMENT_TYPES } from '@/lib/types/application'
import { identidadEfectiva } from '@/lib/tenant/prefill-a-postulacion'
import type { Property } from '@/lib/types/property'

/** Los tipos del back con el nombre que la persona reconoce. */
const NOMBRE_DE_DOCUMENTO: Record<string, string> = {
  ID_DOCUMENT: 'Documento de identidad',
  BANK_STATEMENT: 'Extracto bancario',
  EMPLOYMENT_LETTER: 'Contrato laboral',
  INCOME_PROOF: 'Certificado de ingresos',
  PAY_STUB: 'Colilla de nómina',
  CREDIT_REPORT: 'Reporte de crédito',
}

/** Sin estos dos, la inmobiliaria no puede evaluar. Igual que en el wizard (T-0020). */
const REQUERIDOS = ['ID_DOCUMENT', 'BANK_STATEMENT']

/**
 * `cc` es cómo lo guarda la base, no cómo se llama. La misma lista que usa el
 * formulario en su desplegable — si se pintara el valor crudo, la pantalla que
 * dice "esto vamos a enviar" mostraría algo que la persona nunca escribió.
 */
function etiquetaDeDocumento(tipo: string | null): string {
  return DOCUMENT_TYPES.find((t) => t.value === tipo)?.label ?? ''
}

function fechaCorta(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface Props {
  property: Property
  prefill: ApplicationPrefillData
  /** Texto legal versionado. Sin él no se puede registrar un consentimiento válido. */
  consentText: ConsentTextResponse | null
  /** Se llama cuando la postulación quedó creada. */
  onPostulada: (applicationId: string) => void
  /** Salida al formulario completo. */
  hrefFormulario: string
}

export function PostulacionDirecta({
  property,
  prefill,
  consentText,
  onPostulada,
  hrefFormulario,
}: Props) {
  const [autoriza, setAutoriza] = useState(false)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const documentos = useMemo<DocumentoReutilizable[]>(
    () => (prefill.documents ?? []).filter((d) => NOMBRE_DE_DOCUMENTO[d.type]),
    [prefill.documents],
  )

  /*
   * La identidad del estudio de pre-scoring vigente gana, campo a campo,
   * sobre los valores de la postulación anterior (contract.md T-0001 §3.2).
   * Mismo mapeo que usa el wizard — `identidadEfectiva` — para que las dos
   * pantallas nunca desacuerden sobre qué identidad se está enviando.
   */
  const identidad = useMemo(() => identidadEfectiva(prefill), [prefill])

  /*
   * El back exige la versión del texto legal junto al consentimiento: sin ella
   * rechaza el envío. Si el texto no cargó, no se puede registrar una
   * autorización válida — y entonces no se ofrece marcarla.
   */
  const puedeAutorizar = Boolean(consentText?.version)
  const puedeEnviar = autoriza && aceptaTerminos && puedeAutorizar && !enviando

  const postular = useCallback(async () => {
    if (!puedeEnviar) return
    setEnviando(true)
    setError(null)

    try {
      const creada = await applicationsApi.create({
        propertyId: property.id,
        // La identidad viene de `identidadEfectiva`: el estudio de pre-scoring
        // vigente gana sobre la postulación anterior, campo a campo — el
        // mismo mapeo que usa el wizard.
        fullName: identidad.fullName ?? '',
        documentType: identidad.documentType ?? undefined,
        documentNumber: identidad.documentNumber ?? '',
        dateOfBirth: prefill.dateOfBirth ?? '',
        phone: prefill.phone ?? '',
        email: identidad.email ?? '',
        currentAddress: prefill.currentAddress ?? '',
        timeAtCurrentAddress: prefill.timeAtCurrentAddress ?? undefined,
        maritalStatus: prefill.maritalStatus ?? undefined,
        dependents: prefill.dependents ?? undefined,
        employmentStatus: prefill.employmentStatus ?? undefined,
        companyName: prefill.companyName ?? '',
        monthlySalary: prefill.monthlySalary ?? 0,
        additionalIncome: prefill.additionalIncome ?? 0,
        additionalIncomeSource: prefill.additionalIncomeSource ?? '',
        totalMonthlyIncome: prefill.totalMonthlyIncome ?? 0,
        monthlyObligations: prefill.monthlyObligations ?? 0,
        availableForRent: prefill.availableForRent ?? 0,
        references: {
          previousLandlords: prefill.references?.previousLandlords ?? [],
          employmentReferences: prefill.references?.employmentReferences ?? [],
        } as Record<string, unknown>,
        hasCoSigner: prefill.hasCoSigner ?? false,
        coSigner: prefill.coSigner ?? undefined,
        habeasDataConsent: true,
        authorizationVersion: consentText?.version,
      } as Parameters<typeof applicationsApi.create>[0])

      /*
       * Los documentos se adjuntan en un segundo paso. Si esto falla, la
       * postulación existe pero está incompleta — y hay que decirlo, no
       * mandarla a la pantalla de "listo". La inmobiliaria no puede evaluar
       * sin cédula, y enterarse después es peor.
       */
      const reuso = await applicationsApi.reuseDocuments(creada.id)
      const adjuntos = new Set([
        ...reuso.copiados.map((d) => d.type),
        ...reuso.yaEstaban,
      ])
      const faltan = REQUERIDOS.filter((t) => !adjuntos.has(t))

      if (faltan.length > 0) {
        setError(
          `Tu postulación quedó creada, pero no pudimos adjuntar ${faltan
            .map((t) => (NOMBRE_DE_DOCUMENTO[t] ?? t).toLowerCase())
            .join(' ni ')}. Abrí el formulario para subirlo.`,
        )
        setEnviando(false)
        return
      }

      onPostulada(creada.id)
    } catch (e) {
      // El back rechaza el envío cuando la identidad contradice el estudio de
      // pre-scoring vigente (contract.md T-0001 §3.3). Mensaje accionable,
      // sin diff de campos y sin reintento automático.
      if (e instanceof ApiError && e.code === 'IDENTIDAD_NO_COINCIDE') {
        setError(
          'Tu postulación debe presentarse con la identidad de tu estudio de arrendamiento vigente. Recargá la página para traer tus datos actualizados e intentá de nuevo.',
        )
      } else if (e instanceof ApiError && e.code === 'PROPIEDAD_EN_VENTA') {
        // T-0038 §3.3 (WU-2) — a stale client (an old tab, or the listing
        // switched RENT->SALE after this page rendered) can still reach
        // POST /applications. The 409's message is the exact contract
        // string, never retried. The "Volver al inmueble" link already on
        // this page takes the visitor back to the property detail, where
        // StickyCTA renders the real chat/visit CTA for a SALE listing —
        // no separate CTA-swap is built here.
        setError(e.message);
      } else {
        setError(
          e instanceof Error ? e.message : 'No pudimos enviar tu postulación. Intentá de nuevo.',
        )
      }
      setEnviando(false)
    }
  }, [puedeEnviar, property.id, prefill, identidad, consentText, onPostulada])

  return (
    <div className="min-h-screen bg-muted py-8 px-4">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <Link
          href={`/propiedades/${property.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inmueble
        </Link>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Qué inmueble */}
          <div className="border-b border-border p-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                <CheckCircle className="h-5 w-5 text-primary" weight="fill" />
              </div>
              <div className="min-w-0 space-y-1">
                <h1 className="text-xl font-semibold text-foreground">
                  Ya tenemos todo lo tuyo
                </h1>
                <p className="text-sm text-muted-foreground">
                  Estás aprobado y este inmueble entra en tu tope. No hace falta que
                  llenes nada otra vez: revisá lo que vamos a enviar y confirmá.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
              <Buildings className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium text-foreground">{property.title}</p>
                <p className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {property.neighborhood || property.city}
                  </span>
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {formatCurrency(property.monthlyRent)} /mes
                </p>
              </div>
            </div>
          </div>

          {/* Qué se manda */}
          <div className="space-y-5 p-6">
            <Bloque icono={User} titulo="Tus datos">
              {identidad.vieneDelEstudio ? (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <LockSimple className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Tu nombre y documento vienen de tu estudio de arrendamiento vigente.
                </p>
              ) : null}
              <Dato etiqueta="Nombre" valor={identidad.fullName} />
              <Dato
                etiqueta="Documento"
                valor={
                  identidad.documentNumber
                    ? `${etiquetaDeDocumento(identidad.documentType)} ${identidad.documentNumber}`.trim()
                    : null
                }
              />
              <Dato etiqueta="Teléfono" valor={prefill.phone} />
              <Dato etiqueta="Correo" valor={identidad.email} />
            </Bloque>

            <Bloque icono={Briefcase} titulo="Trabajo e ingresos">
              <Dato etiqueta="Empresa" valor={prefill.companyName} />
              <Dato
                etiqueta="Ingreso mensual"
                valor={
                  prefill.totalMonthlyIncome
                    ? formatCurrency(prefill.totalMonthlyIncome)
                    : null
                }
              />
            </Bloque>

            <Bloque icono={FileText} titulo="Documentos">
              {documentos.map((d) => (
                <div
                  key={d.type}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="text-foreground">{NOMBRE_DE_DOCUMENTO[d.type]}</span>
                  <span className="shrink-0 text-right text-xs text-muted-foreground">
                    {d.originalName}
                    <span className="ml-2 whitespace-nowrap">
                      subido el {fechaCorta(d.uploadedAt)}
                    </span>
                  </span>
                </div>
              ))}
            </Bloque>

            <Link
              href={hrefFormulario}
              className="inline-block text-sm text-foreground underline hover:no-underline"
            >
              Quiero revisar o cambiar algo
            </Link>
          </div>

          {/* Lo único que sí hay que pedir */}
          <div className="space-y-3 border-t border-border p-6">
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                id="acepta-terminos"
                checked={aceptaTerminos}
                onCheckedChange={(c) => setAceptaTerminos(c === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground/70">
                Acepto los{' '}
                <a href="/terminos" className="text-foreground underline hover:no-underline">
                  términos y condiciones
                </a>{' '}
                del servicio
              </span>
            </label>

            {consentText ? (
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="mb-1.5 text-xs font-medium text-foreground">
                  {consentText.title}
                </p>
                <div
                  className="max-h-32 overflow-y-auto pr-1 text-xs leading-relaxed text-muted-foreground"
                  data-lenis-prevent
                  data-testid="consent-text-body"
                >
                  {consentText.text}
                </div>
              </div>
            ) : null}

            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                id="autoriza-datos"
                checked={autoriza}
                disabled={!puedeAutorizar}
                onCheckedChange={(c) => setAutoriza(c === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground/70">
                He leído y autorizo el tratamiento de mis datos personales
              </span>
            </label>

            {!puedeAutorizar ? (
              <p className="text-xs text-muted-foreground">
                No pudimos cargar el texto de autorización de datos. Recargá la página
                para poder continuar.
              </p>
            ) : null}

            {error ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <Warning className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="space-y-2 text-sm text-foreground">
                  <p>{error}</p>
                  <Link
                    href={hrefFormulario}
                    className="inline-block text-sm text-foreground underline hover:no-underline"
                  >
                    Abrir el formulario
                  </Link>
                </div>
              </div>
            ) : null}

            <Button
              className="w-full"
              hideArrow
              onClick={() => void postular()}
              disabled={!puedeEnviar}
              isLoading={enviando}
            >
              Postularme a este inmueble
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Bloque({
  icono: Icono,
  titulo,
  children,
}: {
  icono: React.ComponentType<{ className?: string }>
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icono className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">{titulo}</h2>
      </div>
      <div className="space-y-1.5 pl-6">{children}</div>
    </div>
  )
}

/**
 * Un dato que no vino no se pinta. Antes que inventar un guion o un "—" que se
 * lee como si estuviera vacío a propósito, se omite la fila: la persona ve lo
 * que sí vamos a mandar.
 */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null | undefined }) {
  if (!valor) return null
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="truncate text-right text-foreground">{valor}</span>
    </div>
  )
}
