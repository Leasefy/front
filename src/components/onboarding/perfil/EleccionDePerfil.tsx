'use client'

import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { AnimatePresence, LayoutGroup, motion, type Transition } from 'framer-motion'
import {
  motionDistance,
  motionDuration,
  motionEase,
  motionScale,
  motionSpring,
  motionStagger,
  motionTransition,
} from '@leasefy/cadence'
import { ArrowRight, Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/use-auth'
import { useEnabledProfiles } from '@/lib/hooks/use-enabled-profiles'
import { rutaDeOnboarding } from '@/lib/auth/perfil-de-onboarding'
import { Spinner } from '@/components/ui/spinner'
import { LeasefyLogotype } from '@/components/brand'
import { SalirDelRegistro, type VolverDelRegistro } from '@/components/onboarding/SalirDelRegistro'
import { saludo } from '@/lib/onboarding/saludo'
import { desistirDelRegistroDeInmobiliaria } from '@/lib/api/onboarding-provisioning.service'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PERFILES, type OpcionDePerfil, type ValorDePerfil } from './perfiles'
import type { RegistroAMedias } from './PanelAntesDeComenzar'

/**
 * El resorte de las tarjetas al irse a la izquierda y al volver al centro: el
 * `soft` de Cadence (superficies que se acomodan, sin rebote).
 */
const RESORTE: Transition = motionSpring.soft

/**
 * La línea de apoyo bajo la pregunta: saluda por el nombre cuando lo hay y
 * dirige. El saludo genérico de `saludo()` no se usa acá porque ya diría
 * «Leasefy» dos veces seguidas con el titular.
 */
function apoyo(nombre: string | null | undefined): string {
  const s = saludo(nombre)
  return s.startsWith('Hola') ? `${s}. Elige tu perfil para empezar.` : 'Elige tu perfil para empezar.'
}

export interface EleccionDePerfilProps {
  /**
   * Arranca con «Inmobiliaria» elegida y el formulario abierto: quien llega
   * directo a `/onboarding/inmobiliaria` (un enlace, el botón atrás, o la
   * próxima entrada, que retoma en el perfil elegido).
   */
  abiertaAlInicio?: boolean
  /**
   * Lo que va a la derecha cuando se elige «Inmobiliaria». Recibe cómo
   * cerrarse, cómo avisar que está «Abriendo tu registro…» (ahí las
   * tarjetas se esconden y la carga queda sola, centrada) y cómo avisar si
   * todavía se puede cambiar de perfil (el «Salir» lo ofrece sólo entonces).
   */
  panelDeInmobiliaria: (
    cerrar: () => void,
    alAbrirRegistro: (abriendo: boolean) => void,
    alSaberSiPuedeCambiar: (puede: boolean) => void,
    alSaberDelRegistroAMedias: (registro: RegistroAMedias | null) => void,
  ) => ReactNode
  /**
   * El formulario se abrió desde el asistente para corregir los datos de la
   * inmobiliaria: el «Salir» ofrece volver al asistente en vez de volver a
   * elegir perfil (la inmobiliaria ya existe; cambiar de perfil no se puede).
   */
  volverAlAsistente?: () => void
}

/**
 * «Selecciona tu perfil» (Nico, 2026-09-30): «quizás unas cards mucho más
 * grandes, más tops», y después «quizás hasta ni necesitemos el botón de
 * continuar».
 *
 * Cada tarjeta ES la acción:
 *  - «Inquilino» (y «Propietario», si el admin lo prende) va directo a su
 *    onboarding, como hacía «Continuar».
 *  - «Inmobiliaria» no se va de la página: las tarjetas se corren a la
 *    izquierda, quedan quietas mostrando cuál se eligió, y a la derecha se
 *    abre «Antes de comenzar». Cerrarlo las devuelve al centro, habilitadas.
 *
 * La elección se guarda en `user_metadata.intended_role` (`elegirPerfil`),
 * no en nuestro back: se puede sobrescribir cuantas veces haga falta mientras
 * el onboarding no termine — el `role` real lo asigna el back al terminarlo.
 * Se guarda en segundo plano y sin retener a nadie: si falla, a lo sumo la
 * próxima entrada vuelve a este selector (Nico, 2026-09-07).
 */
export function EleccionDePerfil({
  abiertaAlInicio = false,
  panelDeInmobiliaria,
  volverAlAsistente,
}: EleccionDePerfilProps) {
  const router = useRouter()
  const { user, elegirPerfil } = useAuth()
  // El admin puede apagar perfiles (/admin/registration-profiles). Falla
  // abierto: si la config no responde, se muestran todos.
  const { isEnabled, esProvisional } = useEnabledProfiles()

  const [abierta, setAbierta] = useState(abiertaAlInicio)
  // Un toque y ya: mientras se navega, ninguna tarjeta recibe otro.
  const [yendoA, setYendoA] = useState<ValorDePerfil | null>(null)
  // «Abriendo tu registro…»: la carga queda sola y centrada, sin tarjetas.
  const [abriendoRegistro, setAbriendoRegistro] = useState(false)

  /*
   * Las tarjetas no se pintan hasta saber cuáles dejó el admin (Nico,
   * 2026-09-07: «Propietario» está apagado y se alcanzó a ver un instante).
   * Espera acotada: si la config no responde, se pintan todas igual — el
   * registro nunca se bloquea por esto.
   */
  const [esperaVencida, setEsperaVencida] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setEsperaVencida(true), 2500)
    return () => clearTimeout(id)
  }, [])
  const perfilesListos = !esProvisional || esperaVencida
  const visibles = PERFILES.filter((perfil) => isEnabled(perfil.bandera))

  // El foco: al abrir lo toma el primer campo (autoFocus del formulario); al
  // cerrar vuelve a la tarjeta que se había elegido.
  const tarjetaInmobiliaria = useRef<HTMLButtonElement>(null)
  const estabaAbierta = useRef(abiertaAlInicio)
  useEffect(() => {
    if (estabaAbierta.current && !abierta) tarjetaInmobiliaria.current?.focus()
    estabaAbierta.current = abierta
  }, [abierta])

  // La inmobiliaria a medias de esta persona, si la hay (lo dice el panel).
  const [registroAMedias, setRegistroAMedias] = useState<RegistroAMedias | null>(null)
  // El perfil que eligió con una inmobiliaria a medias: se pregunta antes.
  const [porConfirmar, setPorConfirmar] = useState<OpcionDePerfil | null>(null)
  const [dejandoDeLado, setDejandoDeLado] = useState(false)
  const [errorAlDejar, setErrorAlDejar] = useState<string | null>(null)

  const irAlPerfil = (opcion: OpcionDePerfil) => {
    void elegirPerfil(opcion.bandera).catch(() => undefined)
    if (opcion.valor === 'inmobiliaria') {
      setAbierta(true)
      return
    }
    setYendoA(opcion.valor)
    router.push(rutaDeOnboarding(opcion.bandera))
  }

  const elegir = (opcion: OpcionDePerfil) => {
    if (abierta || yendoA) return
    // Con una inmobiliaria a medias, otro perfil la deja de lado: se pregunta.
    if (opcion.valor !== 'inmobiliaria' && registroAMedias) {
      setErrorAlDejar(null)
      setPorConfirmar(opcion)
      return
    }
    irAlPerfil(opcion)
  }

  const dejarDeLadoYSeguir = async () => {
    const opcion = porConfirmar
    if (!opcion || dejandoDeLado) return
    setDejandoDeLado(true)
    setErrorAlDejar(null)
    try {
      await desistirDelRegistroDeInmobiliaria()
      // El back le cambió el rol y le devolvió el onboarding pendiente: una
      // carga completa arranca la sesión de cero con eso (permisos, agencia,
      // guardas), en vez de remendar el contexto en caliente.
      // Se espera poco: guardar el perfil elegido es cortesía (la ruta ya lo
      // dice) y nunca puede dejar a nadie esperando aquí.
      await Promise.race([
        elegirPerfil(opcion.bandera).catch(() => undefined),
        new Promise((resolver) => setTimeout(resolver, 1500)),
      ])
      setRegistroAMedias(null)
      setYendoA(opcion.valor)
      window.location.assign(rutaDeOnboarding(opcion.bandera))
    } catch (error) {
      // Nada se borró (el back se niega entero): se dice por qué y se queda aquí,
      // con la regla de oro del traductor (02-10-2026): un 409 dice lo que mandó
      // el back; un 5xx, que fue nuestro, con la referencia; la red, sólo sin respuesta.
      setErrorAlDejar(
        mensajeParaLaPersona(error, {
          accion: 'dejar de lado el registro',
          porDefecto: 'No pudimos dejar de lado el registro. Vuelve a intentarlo en un momento.',
        }),
      )
    } finally {
      setDejandoDeLado(false)
    }
  }

  const cerrar = () => setAbierta(false)

  // Lo dice el panel: mientras no exista la inmobiliaria.
  const [puedeCambiarDePerfil, setPuedeCambiarDePerfil] = useState(false)

  /*
   * Qué ofrece «Salir» además de salir, según dónde está la persona (Nico,
   * 01-10-2026): corrigiendo desde el asistente, volver al asistente; con el
   * formulario abierto y todavía sin inmobiliaria, volver a elegir perfil; con
   * las tarjetas a la vista ya está eligiendo perfil, así que sólo salir.
   */
  const volver: VolverDelRegistro | undefined = volverAlAsistente
    ? {
        etiqueta: 'Volver al asistente',
        descripcion: 'Puedes volver al asistente sin cambiar nada.',
        onVolver: volverAlAsistente,
      }
    : abierta && puedeCambiarDePerfil && !abriendoRegistro
      ? {
          etiqueta: 'Volver a elegir tu perfil',
          descripcion: 'Puedes volver a elegir tu perfil.',
          onVolver: cerrar,
        }
      : undefined

  return (
    <>
      {/* Sin `MotionConfig` propio: el `MotionProvider` del layout raíz ya
          respeta el movimiento reducido en toda la app. */}
      <div className="flex min-h-screen flex-col bg-bg">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
          {/* El mismo logotipo que la sidebar del panel y el header de los pasos — el cuadrado azul no es la marca (Nico, 2026-09-07). */}
          <LeasefyLogotype className="h-6 w-auto" />
          <SalirDelRegistro volver={volver} />
        </header>

        {/* flex-1 + justify-center: la escena se centra en el alto que sobra
            (Nico, 2026-09-30: «¿por qué queda tanto espacio abajo?»); si no
            sobra, la página crece y se desplaza como siempre. */}
        <main className="relative mx-auto flex w-full max-w-[960px] flex-1 flex-col justify-center px-4 pb-16 sm:px-6">
          <LayoutGroup>
            <AnimatePresence initial={false} mode="popLayout">
              {abierta ? null : (
                <motion.div
                  key="bienvenida"
                  layout="position"
                  initial={{ opacity: 0, y: -motionDistance.sm }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -motionDistance.sm, transition: motionTransition.exit }}
                  transition={motionTransition.enter}
                  className="mx-auto max-w-xl pb-8 pt-4 text-center sm:pb-12 sm:pt-10"
                >
                  {/* Los títulos de la casa: peso medio, nunca negrita, tracking cerrado (ver /auth). */}
                  <h1 className="text-balance font-heading text-[32px] font-medium leading-[1.08] tracking-[-0.03em] text-fg sm:text-[44px]">
                    ¿Cómo vas a usar Leasefy?
                  </h1>
                  <p className="mx-auto mt-3 max-w-md text-pretty text-[15px] leading-relaxed text-fg-subtle">
                    {apoyo(user?.name)}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div
              className={cn(
                'relative',
                abierta &&
                  !abriendoRegistro &&
                  'pt-2 sm:pt-6 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-8',
              )}
            >
              {perfilesListos ? (
                <motion.div
                  layout
                  transition={RESORTE}
                  role="group"
                  aria-label="Tu perfil"
                  className={cn(
                    'grid gap-4 sm:gap-6',
                    abriendoRegistro
                      ? 'hidden'
                      : abierta
                        ? 'hidden lg:grid lg:grid-cols-1 lg:gap-4'
                        : visibles.length >= 3
                          ? 'sm:grid-cols-2 lg:grid-cols-3'
                          : 'sm:grid-cols-2',
                  )}
                  data-testid="tarjetas-de-perfil"
                >
                  {visibles.map((perfil, indice) => (
                    <TarjetaDePerfil
                      key={perfil.valor}
                      ref={perfil.valor === 'inmobiliaria' ? tarjetaInmobiliaria : undefined}
                      opcion={perfil}
                      indice={indice}
                      elegida={abierta && perfil.valor === 'inmobiliaria'}
                      yendo={yendoA === perfil.valor}
                      deshabilitada={abierta || yendoA !== null}
                      compacta={abierta}
                      onElegir={() => elegir(perfil)}
                    />
                  ))}
                </motion.div>
              ) : (
                <div
                  className="grid gap-4 sm:grid-cols-2 sm:gap-6"
                  role="status"
                  aria-live="polite"
                  aria-label="Cargando los perfiles"
                  data-testid="perfiles-cargando"
                >
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="aspect-[4/5] animate-pulse rounded-xl bg-surface-muted sm:aspect-[3/4]"
                    />
                  ))}
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {abierta ? (
                  <motion.section
                    key="panel"
                    aria-label="Antes de comenzar"
                    initial={{ opacity: 0, x: motionDistance.lg }}
                    animate={{ opacity: 1, x: 0, transition: { ...RESORTE, delay: motionStagger.step * 2 } }}
                    exit={{ opacity: 0, x: motionDistance.lg, transition: motionTransition.exit }}
                    className={cn('min-w-0', abriendoRegistro && 'mx-auto w-full max-w-md')}
                  >
                    {panelDeInmobiliaria(
                      cerrar,
                      setAbriendoRegistro,
                      setPuedeCambiarDePerfil,
                      setRegistroAMedias,
                    )}
                  </motion.section>
                ) : null}
              </AnimatePresence>
            </div>
          </LayoutGroup>
        </main>
      </div>

      {/* Otro perfil con una inmobiliaria a medias: se pregunta antes de
          dejarla de lado (Nico, 01-10-2026). */}
      <AlertDialog
        open={porConfirmar !== null}
        onOpenChange={(abrir) => {
          if (!abrir && !dejandoDeLado) setPorConfirmar(null)
        }}
      >
        <AlertDialogContent data-testid="dejar-de-lado-la-inmobiliaria">
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Dejamos de lado el registro de {registroAMedias?.razonSocial ?? 'tu inmobiliaria'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Empezaste a registrar {registroAMedias?.razonSocial ?? 'tu inmobiliaria'} como inmobiliaria. Si
              sigues como {porConfirmar?.titulo.toLowerCase() ?? 'otro perfil'}, ese registro se borra con lo que
              llenaste de la inmobiliaria. Tu cuenta sigue siendo la misma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {errorAlDejar ? (
            <p role="alert" className="px-6 pb-2 text-body-sm text-danger" data-testid="error-al-dejar-de-lado">
              {errorAlDejar}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={dejandoDeLado}>Seguir con la inmobiliaria</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // Que el diálogo no se cierre antes de saber si se pudo.
                event.preventDefault()
                void dejarDeLadoYSeguir()
              }}
              disabled={dejandoDeLado}
            >
              {dejandoDeLado
                ? 'Dejándolo de lado...'
                : `Sí, seguir como ${porConfirmar?.titulo.toLowerCase() ?? 'otro perfil'}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface TarjetaDePerfilProps {
  opcion: OpcionDePerfil
  /** Su lugar en la fila, para la entrada escalonada: una tras otra. */
  indice: number
  /** La que quedó elegida mientras el formulario está abierto. */
  elegida: boolean
  /** Se tocó y se está yendo a su onboarding. */
  yendo: boolean
  deshabilitada: boolean
  /** En la columna de la izquierda: cuadrada, sólo la foto y el rol. */
  compacta: boolean
  onElegir: () => void
}

/**
 * Una tarjeta de perfil: la foto a sangre completa, el rol encima sobre un
 * degradé que la propia foto aguanta (las dos son oscuras abajo). No hay
 * «Continuar»: la tarjeta ES el botón, y el «Elegir» que asoma al pasar el
 * mouse lo dice (Nico, 2026-09-30: «he visto mejores» → foto entera, texto
 * superpuesto, hover que invite).
 *
 * Es un `<button>` nativo a propósito: Tab llega, Enter y Espacio la eligen,
 * y deshabilitada sale del orden de tabulación sin código extra. Lo elegido
 * en el producto es azul primary, sin excepciones.
 */
const TarjetaDePerfil = forwardRef<HTMLButtonElement, TarjetaDePerfilProps>(function TarjetaDePerfil(
  { opcion, indice, elegida, yendo, deshabilitada, compacta, onElegir },
  ref,
) {
  // Llegan después de cargar los perfiles (no están en el HTML del servidor):
  // una tras otra con el paso del escalonado del sistema y su techo.
  const entrada = Math.min(indice * motionStagger.step, motionStagger.max)
  // La atenuación va en el `animate` de framer, no en una clase: framer deja
  // `opacity` como estilo inline y una clase `opacity-45` nunca le gana.
  const atenuada = deshabilitada && !elegida && !yendo
  return (
    <motion.button
      ref={ref}
      layout
      type="button"
      onClick={onElegir}
      disabled={deshabilitada}
      aria-busy={yendo || undefined}
      initial={{ opacity: 0, y: motionDistance.md }}
      animate={{ opacity: atenuada ? 0.4 : 1, y: 0 }}
      transition={{
        ...RESORTE,
        opacity: { duration: motionDuration.slow, ease: motionEase.enter, delay: entrada },
        y: { ...RESORTE, delay: entrada },
      }}
      whileHover={deshabilitada ? undefined : { y: -motionDistance.xs }}
      whileTap={deshabilitada ? undefined : { scale: motionScale.press }}
      data-testid={`perfil-${opcion.valor}`}
      data-elegida={elegida || undefined}
      className={cn(
        'group relative flex w-full cursor-pointer flex-col overflow-hidden bg-surface text-left',
        'transition-[box-shadow,opacity] duration-slow ease-standard',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:cursor-default',
        compacta ? 'aspect-square rounded-lg' : 'aspect-[4/5] rounded-xl sm:aspect-[3/4]',
        elegida || yendo
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-bg'
          : 'shadow-[0_14px_36px_-22px_rgba(20,19,15,0.4)]',
        !deshabilitada &&
          'hover:shadow-[0_30px_60px_-24px_rgba(20,19,15,0.5)] hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-bg',
      )}
    >
      {/* La foto se lleva la mayor parte de la tarjeta; el texto vive abajo,
          sobre blanco (Nico, 2026-09-30: sobre la foto no se leía bien). */}
      <span className="relative block w-full flex-1 overflow-hidden bg-surface-muted">
        <Image
          src={opcion.imagen}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 460px, (min-width: 640px) 50vw, 100vw"
          className={cn(
            // Sólo `transform` se anima (el zoom lento del hover); el gris de la
            // atenuada se pone de una mientras la tarjeta se funde.
            'object-cover transition-transform duration-reveal ease-enter motion-safe:group-enabled:group-hover:scale-[1.04]',
            atenuada && 'grayscale-[0.5]',
          )}
          style={{ objectPosition: opcion.encuadre }}
        />

        {/* El «Elegir» que invita al clic. Decorativo (aria-hidden): el nombre del botón ya es el rol. */}
        {deshabilitada ? null : (
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/35 px-3.5 py-1.5',
              'text-[13px] font-medium text-white opacity-0 backdrop-blur-md transition-[opacity,transform] duration-slow ease-enter',
              'motion-safe:translate-y-1 group-hover:opacity-100 group-focus-visible:opacity-100',
              'motion-safe:group-hover:translate-y-0 motion-safe:group-focus-visible:translate-y-0',
            )}
          >
            Elegir
            <ArrowRight className="h-3.5 w-3.5" weight="bold" aria-hidden />
          </span>
        )}

        {elegida || yendo ? (
          <motion.span
            initial={{ scale: motionScale.pop, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={motionSpring.bouncy}
            className={cn(
              'absolute right-4 top-4 flex size-8 items-center justify-center rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)]',
              yendo ? 'bg-surface text-primary' : 'bg-primary text-primary-fg',
            )}
            data-testid={yendo ? 'perfil-yendo' : 'perfil-elegido'}
          >
            {yendo ? (
              <Spinner size="xs" variant="current" />
            ) : (
              <Check className="h-4 w-4" weight="bold" aria-hidden />
            )}
          </motion.span>
        ) : null}
      </span>

      <motion.span
        layout="position"
        transition={RESORTE}
        className={cn('block bg-surface', compacta ? 'px-4 py-3' : 'px-5 py-4 sm:px-6 sm:py-5')}
      >
        <span
          className={cn(
            'block font-heading font-medium leading-tight tracking-[-0.02em] text-fg',
            compacta ? 'text-[16px]' : 'text-[21px] sm:text-[23px]',
          )}
        >
          {opcion.titulo}
        </span>
        {compacta ? null : (
          <span className="mt-1 block max-w-[40ch] text-pretty text-[14px] leading-relaxed text-fg-muted">
            {opcion.descripcion}
          </span>
        )}
      </motion.span>
    </motion.button>
  )
})
