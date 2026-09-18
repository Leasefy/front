'use client'

/**
 * MandatoDelInmueble — los papeles del mandato y su firma, en la ficha.
 *
 * ── Qué contesta (C-05 y «las dos formas» de firma, 17 y 18-09-2026) ───────
 *
 *   · C-05: antes de PUBLICAR hacen falta cédula, certificado de tradición de
 *     máximo 30 días y mandato firmado; antes del PRIMER GIRO, certificación
 *     bancaria y RUT.
 *   · La firma del mandato: electrónica desde Leasefy con enlace y rastro, **o**
 *     cargar el PDF ya firmado.
 *
 * ── Las dos decisiones de presentación ─────────────────────────────────────
 *
 *   1. 🔴 **las dos puertas se muestran por separado, con lo que falta en cada
 *      una**. Una sola lista de «documentos pendientes» hace que el funcionario
 *      crea que no puede publicar porque le falta el RUT — que es de la otra
 *      puerta, la del primer giro. Son dos riesgos distintos y dos momentos
 *      distintos.
 *   2. **el certificado de tradición muestra los días que le quedan**, no sólo
 *      si está. Vale 30 días desde que se EXPIDIÓ, y el que lo sube no siempre
 *      es el que lo pidió: «le quedan 3 días» es accionable, «está» no.
 *
 * Va en la columna derecha de la ficha, al lado del inventario: es el mismo
 * tipo de dato (lo que el mandato necesita para poder operar).
 */

import { useState } from 'react'
import { FileText, Lock } from '@phosphor-icons/react'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { captacionApi } from '@/lib/api/crm.service'
import { invalidar } from '@/lib/api/refresco-de-datos'
import { useCrm } from '@/lib/hooks/use-crm'

interface Props {
  consignacionId: string
  /** El nombre del propietario, para la firma electrónica. */
  propietarioNombre?: string | null
  puedeEditar?: boolean
}

function Puerta({
  titulo,
  cuando,
  completo,
  falta,
}: {
  titulo: string
  cuando: string
  completo: boolean
  falta: { tipo: string; nombre: string; porQue: string; detalle: string }[]
}) {
  return (
    <div className="space-y-1.5" data-testid={`puerta-${titulo}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{cuando}</p>
        <Badge variant={completo ? 'secondary' : 'outline'}>
          {completo ? 'Listo' : `Faltan ${falta.length}`}
        </Badge>
      </div>
      {falta.length > 0 ? (
        <ul className="text-muted-foreground space-y-1 text-sm">
          {falta.map((f) => (
            <li key={`${f.tipo}-${f.nombre}`}>
              <span className={f.porQue === 'VENCIDO' ? 'text-destructive' : ''}>
                {f.nombre}
                {f.porQue === 'VENCIDO' ? ' (vencido)' : ''}
              </span>
              : {f.detalle}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function MandatoDelInmueble({
  consignacionId,
  propietarioNombre,
  puedeEditar = false,
}: Props) {
  const documentos = useCrm(
    () => captacionApi.documentos(consignacionId),
    [consignacionId],
    ['portafolio'],
  )
  const firmas = useCrm(
    () => captacionApi.firmas(consignacionId),
    [consignacionId],
    ['portafolio'],
  )
  const [pidiendo, setPidiendo] = useState(false)
  const [enlace, setEnlace] = useState<string | null>(null)

  const laFirma = (firmas.datos?.firmas ?? []).find(
    (f) => f.estado === 'PENDIENTE' || f.estado === 'FIRMADA',
  )

  async function pedirFirma() {
    setPidiendo(true)
    try {
      const r = await captacionApi.pedirFirmaElectronica(consignacionId, {
        firmanteNombre: propietarioNombre ?? 'Propietario',
      })
      // 🔴 El token sale UNA vez. Se muestra para copiarlo y ya: no se guarda
      // en ninguna parte del front ni vuelve en las lecturas.
      setEnlace(`${window.location.origin}/mandato/firma/${r.token}`)
      invalidar('portafolio')
    } finally {
      setPidiendo(false)
    }
  }

  return (
    <Card data-testid="mandato-del-inmueble">
      <CardHeader>
        <CardTitle className="text-base">El mandato</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {documentos.noHabilitado ? (
          <p
            className="text-muted-foreground text-sm"
            data-testid="mandato-no-habilitado"
          >
            Próximamente: {documentos.noHabilitado}
          </p>
        ) : (
          <EstadoDeDatos
            cargando={documentos.cargando}
            error={documentos.errorCrudo}
            queEs="los documentos del mandato"
            onReintentar={documentos.refetch}
            conservarContenido
          >
            {documentos.datos ? (
              <div className="space-y-4">
                {/* 🔴 Dos puertas, separadas: son dos riesgos distintos. */}
                <Puerta
                  titulo="publicar"
                  cuando="Antes de publicar"
                  completo={documentos.datos.paraPublicar.completo}
                  falta={documentos.datos.paraPublicar.falta}
                />
                <Puerta
                  titulo="giro"
                  cuando="Antes del primer giro"
                  completo={documentos.datos.paraElPrimerGiro.completo}
                  falta={documentos.datos.paraElPrimerGiro.falta}
                />

                {documentos.datos.documentos.filter((d) => !d.reemplazadoEl)
                  .length > 0 ? (
                  <ul className="divide-y" data-testid="documentos-del-mandato">
                    {documentos.datos.documentos
                      .filter((d) => !d.reemplazadoEl)
                      .map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between gap-2 py-2 text-sm"
                          data-testid={`documento-${d.tipo}`}
                        >
                          <span className="flex items-center gap-1.5">
                            <FileText className="text-muted-foreground h-4 w-4" />
                            {d.nombreDelTipo}
                          </span>
                          {/* Los días que le quedan al certificado: es lo
                              accionable, no «está». */}
                          {d.diasQueLeQuedan !== null ? (
                            <Badge
                              variant={
                                d.diasQueLeQuedan <= 0
                                  ? 'destructive'
                                  : d.diasQueLeQuedan <= 7
                                    ? 'outline'
                                    : 'secondary'
                              }
                            >
                              {d.diasQueLeQuedan <= 0
                                ? 'Vencido'
                                : `${d.diasQueLeQuedan} días`}
                            </Badge>
                          ) : null}
                        </li>
                      ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </EstadoDeDatos>
        )}

        {/* La firma del mandato */}
        {!firmas.noHabilitado ? (
          <div className="space-y-2 border-t pt-4" data-testid="firma-del-mandato">
            <p className="text-sm font-medium">Firma del mandato</p>
            {laFirma ? (
              <p className="text-muted-foreground text-sm">
                {laFirma.estado === 'FIRMADA'
                  ? `Firmado por ${laFirma.firmanteNombre}${
                      laFirma.firmadaEl
                        ? ` el ${laFirma.firmadaEl.slice(0, 10)}`
                        : ''
                    }${laFirma.forma === 'PDF_CARGADO' ? ' (PDF cargado)' : ''}.`
                  : `Enlace de firma pendiente${
                      laFirma.venceEl
                        ? `, vence el ${laFirma.venceEl.slice(0, 10)}`
                        : ''
                    }.`}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Todavía no está firmado. Puedes mandar el enlace de firma o
                cargar el PDF ya firmado.
              </p>
            )}

            {puedeEditar && !laFirma ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void pedirFirma()}
                disabled={pidiendo}
                data-testid="pedir-firma"
              >
                {pidiendo ? 'Creando…' : 'Crear enlace de firma'}
              </Button>
            ) : null}

            {enlace ? (
              <div className="space-y-1" data-testid="enlace-de-firma">
                <p className="flex items-center gap-1.5 text-xs font-medium">
                  <Lock className="h-3.5 w-3.5" />
                  Cópialo ahora: el enlace no se vuelve a mostrar.
                </p>
                <code className="block break-all rounded border p-2 text-xs">
                  {enlace}
                </code>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
