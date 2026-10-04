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
 *
 * Abajo, la venta del inmueble (C-10, 02-10-2026): «Registrar la venta» y la
 * comisión de venta, viva o anulada (`VentaDelInmueble`).
 */

import { useState } from 'react'
import { toast } from '@/components/ui/toast'
import { errorEnCristiano, motivoEnCristiano } from '@/lib/errores/en-cristiano'
import { FileText, Lock } from '@phosphor-icons/react'

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { captacionApi } from '@/lib/api/crm.service'
import { invalidar } from '@/lib/api/refresco-de-datos'
import { useCrm } from '@/lib/hooks/use-crm'

import { VentaDelInmueble } from './VentaDelInmueble'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { diaLegible } from '@/lib/mandato/textos'

interface Props {
  consignacionId: string
  /** El nombre del propietario, para la firma electrónica. */
  propietarioNombre?: string | null
  /**
   * El correo de la ficha del propietario: a ése manda el servidor el enlace
   * (IN-12, QA 04-10: se muestra ANTES de mandar, en el cajón de confirmar).
   */
  propietarioCorreo?: string | null
  /** La dirección del inmueble, para decir qué documento se firma. */
  direccionDelInmueble?: string | null
  puedeEditar?: boolean
}

function Puerta({
  titulo,
  cuando,
  completo,
  falta,
  soloElNumero = false,
}: {
  titulo: string
  cuando: string
  completo: boolean
  falta: { tipo: string; nombre: string; porQue: string; detalle: string }[]
  /** «2» en vez de «Faltan 2» cuando el rótulo ya dice «Documentos que faltan». */
  soloElNumero?: boolean
}) {
  return (
    <div className="space-y-1.5" data-testid={`puerta-${titulo}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{cuando}</p>
        {/* 🔴 «Faltan 0» no es un estado (Nico, 18-09-2026). Pasa cuando el
            back dice «incompleto» pero devuelve la lista de faltantes vacía
            —por ejemplo sin la migración—, y en pantalla queda una cuenta que
            no significa nada. Si no sabemos qué falta, se dice. */}
        <Badge variant={completo ? 'secondary' : 'outline'}>
          {completo
            ? 'Listo'
            : falta.length === 0
              ? 'Sin revisar'
              : soloElNumero
                ? String(falta.length)
                : `Faltan ${falta.length}`}
        </Badge>
      </div>
      {!completo && falta.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Todavía no pudimos revisar qué papeles faltan para este paso.
        </p>
      ) : null}
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
  propietarioCorreo,
  direccionDelInmueble,
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
  // IN-12 (QA 04-10): «Crear enlace de firma» mandaba el correo de una, sin
  // decir a quién ni qué. Ahora abre un cajón con el correo y el documento, y
  // el enlace sale sólo al confirmar.
  const [confirmando, setConfirmando] = useState(false)
  const [envio, setEnvio] = useState<{
    enviadoA: string
    envio: 'ENVIADO' | 'SIMULADO' | 'FALLIDO'
    enlaceDePrueba?: string
  } | null>(null)

  const yaHuboGiros = documentos.datos?.yaHuboGiros === true

  const laFirma = (firmas.datos?.firmas ?? []).find(
    (f) => f.estado === 'PENDIENTE' || f.estado === 'FIRMADA',
  )

  const [descargando, setDescargando] = useState(false)

  // El mandato firmado, con la huella comprobada por el back: si el archivo no
  // es el que firmó el propietario, el back no da el enlace y se dice por qué.
  async function descargarFirmado(firmaId: string) {
    setDescargando(true)
    try {
      const r = await captacionApi.mandatoFirmado(firmaId)
      window.open(r.url, '_blank', 'noopener')
    } catch (e) {
      toast.error(errorEnCristiano(e, 'No pudimos abrir el mandato firmado.'))
    } finally {
      setDescargando(false)
    }
  }

  async function pedirFirma() {
    setPidiendo(true)
    try {
      const r = await captacionApi.pedirFirmaElectronica(consignacionId, {
        firmanteNombre: propietarioNombre ?? 'Propietario',
      })
      // 🔴 Auditoría 23-09-2026: el enlace ya NO pasa por la inmobiliaria. Lo
      // manda el servidor al correo de la ficha del propietario y el token no
      // vuelve acá (antes se mostraba para copiarlo, y con él cualquiera del
      // equipo podía firmar por el propietario). Sólo en local, con el correo
      // simulado, llega un `enlaceDePrueba` para poder probar el flujo.
      setEnvio({
        enviadoA: r.enviadoA,
        envio: r.envio,
        enlaceDePrueba: r.enlaceDePrueba,
      })
      setConfirmando(false)
      invalidar('portafolio')
    } catch (e) {
      // 🔴 Acá no había `catch` (Nico, 18-09-2026: «cuando uno le da lo de
      // firmar no sirve, tira error»). El `void pedirFirma()` del onClick se
      // tragaba el rechazo y lo convertía en un unhandled rejection: el botón
      // volvía a su sitio y nadie se enteraba de por qué no pasó nada — o
      // saltaba el overlay de error de Next. El motivo del back se muestra.
      toast.error(
        errorEnCristiano(e, 'No pudimos crear el enlace de firma. Vuelve a intentar.'),
      )
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
            {motivoEnCristiano(documentos.noHabilitado)}
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
                {/* IN-14 (QA 04-10): a un inmueble que ya gira hace meses le
                    seguía diciendo «Antes del primer giro — Faltan 2». Si ya
                    hubo giros, son «Documentos que faltan» y punto. */}
                <Puerta
                  titulo="giro"
                  cuando={yaHuboGiros ? 'Documentos que faltan' : 'Antes del primer giro'}
                  soloElNumero={yaHuboGiros}
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
            {/* 🔴 Antes sólo decía «todavía no está firmado», sin decir quién
                firma ni por qué (Nico, 18-09-2026). Sin eso, el botón es un
                trámite sin dueño. */}
            <p className="text-muted-foreground text-sm">
              Lo firma <span className="text-foreground font-medium">
                {propietarioNombre ?? 'el propietario'}
              </span>: es el documento con el que te autoriza a administrar y
              arrendar el inmueble.{yaHuboGiros ? '' : ' Va antes del primer giro de su plata.'}
            </p>
            {laFirma ? (
              <p className="text-muted-foreground text-sm">
                {laFirma.estado === 'FIRMADA'
                  ? `Firmado por ${laFirma.firmanteNombre}${
                      laFirma.firmadaEl
                        ? ` el ${diaLegible(laFirma.firmadaEl)}`
                        : ''
                    }${laFirma.forma === 'PDF_CARGADO' ? ' (PDF cargado)' : ''}.`
                  : `Enlace de firma pendiente${
                      laFirma.venceEl
                        ? `, vence el ${diaLegible(laFirma.venceEl)}`
                        : ''
                    }.`}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Todavía no está firmado. Puedes mandar el enlace de firma o
                cargar el PDF ya firmado.
              </p>
            )}

            {laFirma?.estado === 'FIRMADA' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void descargarFirmado(laFirma.id)}
                disabled={descargando}
                data-testid="descargar-mandato-firmado"
              >
                {descargando ? 'Abriendo…' : 'Ver el mandato firmado'}
              </Button>
            ) : null}

            {puedeEditar && !laFirma ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmando(true)}
                disabled={pidiendo}
                data-testid="pedir-firma"
              >
                Crear enlace de firma
              </Button>
            ) : null}

            <Cajon abierto={confirmando} onOpenChange={(a) => !pidiendo && setConfirmando(a)} tamano="sm" data-testid="cajon-enlace-de-firma">
              <CajonCabecera
                titulo="Mandar el enlace de firma"
                descripcion="Revisa a quién le llega y qué va a firmar antes de mandarlo."
              />
              <CajonCuerpo className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs text-fg-muted">Le llega a</p>
                  <p className="text-sm font-medium text-fg">{propietarioNombre ?? 'El propietario'}</p>
                  {propietarioCorreo ? (
                    <p className="font-mono text-sm text-fg" data-testid="correo-destino">{propietarioCorreo}</p>
                  ) : (
                    <p className="text-sm text-danger" data-testid="sin-correo-destino">
                      La ficha del propietario no tiene correo. Agrégalo en su ficha para poder mandarle el enlace.
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-fg-muted">El documento</p>
                  <p className="flex items-start gap-2 text-sm text-fg">
                    <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-fg-muted" aria-hidden="true" />
                    <span>
                      Mandato de administración y arrendamiento
                      {direccionDelInmueble ? ` de ${direccionDelInmueble}` : ''}: con él te autoriza a
                      administrar y arrendar el inmueble.
                    </span>
                  </p>
                </div>
                <p className="text-sm text-fg-muted">
                  Le enviamos un correo con el enlace. Para firmar, le pedimos un código que le llega a ese
                  mismo correo. Nadie del equipo ve el enlace.
                </p>
              </CajonCuerpo>
              <CajonPie
                izquierda={
                  <Button variant="ghost" size="sm" hideArrow onClick={() => setConfirmando(false)} disabled={pidiendo}>
                    Cancelar
                  </Button>
                }
              >
                <Button
                  size="sm"
                  hideArrow
                  onClick={() => void pedirFirma()}
                  disabled={pidiendo || !propietarioCorreo}
                  isLoading={pidiendo}
                  data-testid="confirmar-enlace-de-firma"
                >
                  {pidiendo ? 'Mandando…' : 'Mandar el enlace'}
                </Button>
              </CajonPie>
            </Cajon>

            {envio ? (
              <div className="space-y-1" data-testid="enlace-de-firma">
                {/* IN-13: el texto va en UN solo hijo del flex; antes cada
                    pedazo era una columna angosta. */}
                <p className="flex items-start gap-1.5 text-sm">
                  <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span className="min-w-0">
                  {envio.envio === 'FALLIDO' ? (
                    <>
                      No pudimos mandarle el correo a{' '}
                      <span className="font-mono">{envio.enviadoA}</span>. Anula
                      este enlace y vuelve a intentarlo.
                    </>
                  ) : (
                    <>
                      Le enviamos el enlace a{' '}
                      <span className="font-mono">{envio.enviadoA}</span>. Para
                      firmar, le pediremos un código que le llega a ese correo.
                    </>
                  )}
                  </span>
                </p>
                {envio.enlaceDePrueba ? (
                  <a
                    href={envio.enlaceDePrueba}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground block break-all text-sm underline"
                    data-testid="enlace-de-prueba"
                  >
                    Enlace de prueba (sólo en local, el correo no salió)
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* 🔴 C-10 (Nico, 02-10-2026): «Registrar la venta» y la comisión de
            venta del mandato, viva o anulada con su motivo. */}
        <VentaDelInmueble consignacionId={consignacionId} />
      </CardContent>
    </Card>
  )
}
