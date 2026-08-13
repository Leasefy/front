'use client'

/**
 * PostulacionEnviadaModal — el momento en que la postulación quedó enviada.
 *
 * Es un modal y no una pantalla a propósito: **detrás queda el inmueble al que
 * te postulaste.** Una pantalla nueva borra el contexto y obliga a recordar a
 * cuál de los inmuebles correspondía este "listo"; el modal lo deja a la vista.
 *
 * ── Por qué el final es una bifurcación y no una salida ─────────────────────
 *
 * Desde que los documentos se reutilizan, postularse a un segundo inmueble
 * cuesta una pantalla. Terminar con un solo botón "Ver mi postulación" trata el
 * envío como el final del camino, cuando para la mayoría es el primero de
 * varios. Por eso el pie ofrece las dos: seguir buscando, o ir a ver ésta.
 *
 * ── Ninguna salida deja a la persona varada ─────────────────────────────────
 *
 * Cerrar con ✕, Escape o clic afuera **navega**, no descubre la pantalla de
 * atrás. Atrás quedó el formulario que se acaba de enviar, con su botón de
 * "Postularme": volver ahí invita a apretarlo otra vez y chocar con un 409.
 * Escape sigue funcionando —es obligatorio— pero significa lo mismo que el
 * botón principal.
 */

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Buildings,
  Check,
  CheckCircle,
  Copy,
  EnvelopeSimple,
  MagnifyingGlass,
  MapPin,
  ShieldCheck,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { codigoDeSeguimiento } from '@/lib/api/applications.service'
import { formatCurrency } from '@/lib/format'
import type { Property } from '@/lib/types/property'

interface Props {
  property: Property
  /**
   * El id real de la postulación creada: de ahí sale el código de seguimiento.
   * Puede venir vacío si el estado "enviada" se restauró de localStorage sin
   * él — en ese caso no se inventa un código, simplemente no se muestra.
   */
  applicationId: string
  /** Postulación de invitado: todavía no tiene cuenta ni panel que mirar. */
  esInvitado?: boolean
  correoInvitado?: string
}

export function PostulacionEnviadaModal({
  property,
  applicationId,
  esInvitado = false,
  correoInvitado,
}: Props) {
  const router = useRouter()
  const [copiado, setCopiado] = useState(false)

  const codigo = applicationId ? codigoDeSeguimiento(applicationId) : null

  const verPostulacion = applicationId
    ? `/inquilino/aplicaciones/${applicationId}`
    : '/inquilino/aplicaciones'

  /*
   * Quien no tiene cuenta no puede entrar a `/inquilino`: mandarlo ahí sería
   * devolverlo al login. Su siguiente paso real está en el correo, así que la
   * única salida del modal es seguir mirando inmuebles.
   */
  const destinoSeguro = esInvitado ? '/propiedades' : verPostulacion

  const copiar = useCallback(() => {
    if (!codigo) return
    void navigator.clipboard?.writeText(codigo)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }, [codigo])

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) router.push(destinoSeguro)
      }}
    >
      <DialogContent
        className="max-w-xl"
        data-testid="postulacion-enviada"
        // El contenido de atrás ya no es interactivo; que el foco arranque en
        // el modal y no en la ✕ evita que lo primero que se anuncie sea "cerrar".
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Ya te postulaste</DialogTitle>
          <DialogDescription>
            La inmobiliaria ya tiene tu postulación y tus documentos.
          </DialogDescription>
        </DialogHeader>

        {/* Qué pasó, y sobre cuál inmueble */}
        <div className="flex items-start gap-4 rounded-lg border border-success/30 bg-success-soft p-4">
          <CheckCircle
            className="mt-0.5 h-8 w-8 shrink-0 text-success"
            weight="fill"
            aria-hidden="true"
          />
          <div className="min-w-0 space-y-1">
            <p className="text-base font-semibold text-foreground">
              {property.title}
            </p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {property.neighborhood || property.city}
              </span>
            </p>
            <p className="text-sm font-medium text-foreground">
              {formatCurrency(property.monthlyRent)} /mes
            </p>
          </div>
        </div>

        {/* El código, que ahora sí sirve para buscarla */}
        {codigo ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Código de seguimiento</p>
              <p
                className="font-mono text-lg font-semibold tracking-wider text-foreground"
                data-testid="codigo-seguimiento"
              >
                {codigo}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              hideArrow
              onClick={copiar}
              aria-label="Copiar código de seguimiento"
            >
              {copiado ? (
                <>
                  <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Copiar
                </>
              )}
            </Button>
          </div>
        ) : null}

        {/* Qué sigue — es una secuencia de verdad, por eso va numerada */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">¿Qué sigue?</h3>
          <ol className="space-y-3">
            {esInvitado ? (
              <Paso
                numero={1}
                icono={EnvelopeSimple}
                titulo="Revisá tu correo"
                texto={
                  correoInvitado
                    ? `Te mandamos un enlace a ${correoInvitado} para crear tu cuenta y subir tus documentos.`
                    : 'Te mandamos un enlace por correo para crear tu cuenta y subir tus documentos.'
                }
              />
            ) : (
              <Paso
                numero={1}
                icono={MagnifyingGlass}
                titulo="Revisión de documentos"
                texto="La inmobiliaria revisa lo que enviaste."
              />
            )}
            <Paso
              numero={2}
              icono={ShieldCheck}
              titulo="Estudio de asegurabilidad"
              texto="La aseguradora define si respalda este arriendo."
            />
            <Paso
              numero={3}
              icono={Bell}
              titulo="Respuesta"
              texto="Te avisamos por correo, y queda en tu panel."
              ultimo
            />
          </ol>
        </div>

        {/* Postularse a otro ya no cuesta llenar nada: decirlo acá es lo que
            convierte el final en una bifurcación. */}
        {!esInvitado ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Buildings className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Podés postularte a otros inmuebles sin volver a llenar nada: ya
              tenemos tus datos y tus documentos.
            </span>
          </p>
        ) : null}

        <DialogFooter>
          {esInvitado ? (
            <Button onClick={() => router.push('/propiedades')} hideArrow>
              Seguir buscando
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => router.push('/propiedades')}
                hideArrow
              >
                Seguir buscando
              </Button>
              <Button onClick={() => router.push(verPostulacion)} hideArrow>
                Ver mi postulación
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Paso({
  numero,
  icono: Icono,
  titulo,
  texto,
  ultimo = false,
}: {
  numero: number
  icono: React.ComponentType<{ className?: string }>
  titulo: string
  texto: string
  ultimo?: boolean
}) {
  return (
    <li className="relative flex gap-3">
      {!ultimo ? (
        <div
          className="absolute left-[15px] top-8 bottom-0 w-px bg-border"
          aria-hidden="true"
        />
      ) : null}
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-medium text-primary">
        {numero}
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Icono className="h-4 w-4 text-muted-foreground" />
          {titulo}
        </p>
        <p className="text-sm text-muted-foreground">{texto}</p>
      </div>
    </li>
  )
}
