'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Check, MapPin, PawPrint, Plus, WifiHigh, Car, Shield, Barbell, Tree, Warehouse, Waves, Sparkle, X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { DatePicker, IconButton, Presence } from '@leasefy/cadence'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { useI18n } from '@/lib/i18n'
import { useTenantOnboarding, type ErroresDelServidor } from '@/lib/context/TenantOnboardingContext'
import { aFechaIso, fechaLocal, hoyLocal } from '@/lib/fechas-locales'
import {
  MAX_AMENIDADES,
  MAX_LARGO_AMENIDAD,
  MAX_LARGO_MASCOTAS,
  MAX_LARGO_ZONA,
  MAX_ZONAS,
  MENSAJES_DEL_PERFIL,
  revisarPreferenciasDelInquilino,
  type CampoDePreferencias,
} from '@/lib/onboarding/preferencias-del-inquilino'
import { useIntentosDeAvanzar } from './intento-de-avanzar'

const CITIES = [
  'Bogotá',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Pereira',
  'Manizales',
  'Santa Marta',
  'Ibagué',
]

const AMENITIES = [
  { id: 'wifi', label: 'Internet incluido', icon: WifiHigh },
  { id: 'parking', label: 'Parqueadero', icon: Car },
  { id: 'security', label: 'Vigilancia 24h', icon: Shield },
  { id: 'gym', label: 'Gimnasio', icon: Barbell },
  { id: 'garden', label: 'Zonas verdes', icon: Tree },
  { id: 'storage', label: 'Depósito', icon: Warehouse },
  { id: 'pool', label: 'Piscina', icon: Waves },
  { id: 'furnished', label: 'Amoblado', icon: Sparkle },
]

const IDS_DE_AMENIDADES = AMENITIES.map((a) => a.id)

/** Dónde se pone el foco cuando un campo tiene error (el primero, en este orden). */
const FOCO_DEL_CAMPO: Record<CampoDePreferencias, string> = {
  budgetMin: 'budgetMin',
  budgetMax: 'budgetMax',
  preferredZones: 'otraZona',
  moveInDate: 'moveInDate',
  petDetails: 'petDetails',
  preferredAmenities: 'otraAmenidad',
}
const ORDEN_DE_LOS_CAMPOS = Object.keys(FOCO_DEL_CAMPO) as CampoDePreferencias[]

/*
 * Estilos de las opciones que se marcan (ciudades, mascotas, amenidades,
 * «Aún no lo sé»), con los tokens de la casa: antes cada una repetía a mano
 * `#1A40FF` / `#EEF1FF` y su versión oscura.
 */
const OPCION_BASE =
  'border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
const OPCION_MARCADA = 'border-primary/40 bg-primary-soft text-primary'
const OPCION_LIBRE = 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg'

/** El rótulo de un grupo de opciones (`<legend>`): el mismo trazo que `FormLabel`. */
function Rotulo({ children, requerido }: { children: ReactNode; requerido?: boolean }) {
  return (
    <legend className="mb-2.5 flex items-center gap-0.5 text-caption font-semibold text-fg">
      {children}
      {requerido ? (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      ) : null}
    </legend>
  )
}

/** Aparece despacio y en orden; con «reducir movimiento», sólo el fundido. */
function Seccion({ children, orden }: { children: ReactNode; orden: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * orden, duration: 0.24 }}
    >
      {children}
    </motion.section>
  )
}

/** Sin proveedor que los traiga (las pruebas de cada paso), no hay errores del servidor. */
const SIN_ERRORES_DEL_SERVIDOR: ErroresDelServidor = {}

export function StepHousingPreferences() {
  const { locale } = useI18n()
  const { draft, updateDraft, erroresDelServidor = SIN_ERRORES_DEL_SERVIDOR } = useTenantOnboarding()
  const intentos = useIntentosDeAvanzar()
  const presupuestoRef = useRef<HTMLInputElement>(null)

  /*
   * Los errores salen bajo su campo, con el estilo de error de la casa:
   *  · los del cliente (las MISMAS reglas y frases que el back, en
   *    `preferencias-del-inquilino`), cuando la persona intenta completar el
   *    perfil con algo mal — nunca desde que se abre el paso;
   *  · los del servidor (02-10-2026), en cuanto llegan, hasta que se edite
   *    ese campo.
   */
  const delCliente = revisarPreferenciasDelInquilino(draft)
  const errorDe = (campo: CampoDePreferencias): string | undefined =>
    erroresDelServidor[campo] ?? (intentos > 0 ? delCliente[campo] : undefined)

  const errorMinimo = errorDe('budgetMin')
  const errorMaximo = errorDe('budgetMax')
  const errorDelPresupuesto = errorMinimo ?? errorMaximo ?? null
  // «Falta el presupuesto» marca los dos; un tope o el cruce, sólo el suyo.
  const ambos = errorDelPresupuesto === MENSAJES_DEL_PERFIL.faltaPresupuesto

  const primeroConError = ORDEN_DE_LOS_CAMPOS.find((c) => errorDe(c))

  useEffect(() => {
    if (intentos === 0 || !primeroConError) return
    if (primeroConError === 'budgetMin' || (primeroConError === 'budgetMax' && ambos)) presupuestoRef.current?.focus()
    else document.getElementById(FOCO_DEL_CAMPO[primeroConError])?.focus()
    // Sólo al intentar: no robar el foco mientras la persona escribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentos])

  useEffect(() => {
    // Lo que rechazó el servidor: foco en el primero, una vez por respuesta.
    const primero = ORDEN_DE_LOS_CAMPOS.find((c) => erroresDelServidor[c])
    if (primero) document.getElementById(FOCO_DEL_CAMPO[primero])?.focus()
  }, [erroresDelServidor])
  const [customZone, setCustomZone] = useState('')
  /*
   * «Otra amenidad» (Nico, 2026-09-15): las ocho de la lista no son todas las
   * que le importan a alguien. Lo que escribe se guarda tal cual en
   * `preferredAmenities`, junto a los ids de la lista — el back acepta texto
   * libre —, y se reconoce por no ser uno de esos ids.
   */
  const amenidadesPropias = (draft.preferredAmenities || []).filter((a) => !IDS_DE_AMENIDADES.includes(a))
  const [otraAbierta, setOtraAbierta] = useState(amenidadesPropias.length > 0)
  const [otraAmenidad, setOtraAmenidad] = useState('')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(locale === 'es' ? 'es-CL' : 'en-US', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const handleBudgetMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    updateDraft({ budgetMin: value ? parseInt(value) : undefined })
  }

  const handleBudgetMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    updateDraft({ budgetMax: value ? parseInt(value) : undefined })
  }

  const zonasLlenas = (draft.preferredZones || []).length >= MAX_ZONAS

  const toggleZone = (zone: string) => {
    const currentZones = draft.preferredZones || []
    if (currentZones.includes(zone)) {
      updateDraft({ preferredZones: currentZones.filter((z) => z !== zone) })
    } else if (currentZones.length < MAX_ZONAS) {
      // El back guarda hasta 10 (`preferred_cities`): la 11.ª no se agrega.
      updateDraft({ preferredZones: [...currentZones, zone] })
    }
  }

  const addCustomZone = () => {
    if (customZone.trim()) {
      const currentZones = draft.preferredZones || []
      if (!currentZones.includes(customZone.trim()) && currentZones.length < MAX_ZONAS) {
        updateDraft({ preferredZones: [...currentZones, customZone.trim()] })
      }
      setCustomZone('')
    }
  }

  const toggleAmenity = (amenityId: string) => {
    const currentAmenities = draft.preferredAmenities || []
    if (currentAmenities.includes(amenityId)) {
      updateDraft({ preferredAmenities: currentAmenities.filter((a) => a !== amenityId) })
    } else {
      updateDraft({ preferredAmenities: [...currentAmenities, amenityId] })
    }
  }

  const addOtraAmenidad = () => {
    const texto = otraAmenidad.trim().replace(/\s+/g, ' ')
    if (!texto) return
    const actuales = draft.preferredAmenities || []
    const clave = texto.toLocaleLowerCase('es')
    // Si escribe una que ya está en la lista («piscina»), se marca esa: no
    // queda «Piscina» dos veces, una como tarjeta y otra como texto.
    const deLaLista = AMENITIES.find((a) => a.label.toLocaleLowerCase('es') === clave)
    const valor = deLaLista ? deLaLista.id : texto
    const yaEsta = actuales.some((a) => a.toLocaleLowerCase('es') === valor.toLocaleLowerCase('es'))
    if (!yaEsta && actuales.length < MAX_AMENIDADES) {
      updateDraft({ preferredAmenities: [...actuales, valor] })
    }
    setOtraAmenidad('')
  }

  const zonasPropias = (draft.preferredZones || []).filter((z) => !CITIES.includes(z))

  return (
    <div className="space-y-7">
      {/* Budget Range */}
      <Seccion orden={0}>
        <fieldset aria-describedby={errorDelPresupuesto ? 'presupuesto-error' : undefined}>
          <Rotulo requerido>Presupuesto mensual</Rotulo>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { id: 'budgetMin', etiqueta: 'Presupuesto mínimo mensual', placeholder: 'Mínimo', valor: draft.budgetMin, onChange: handleBudgetMinChange, ref: presupuestoRef, conError: ambos || !!errorMinimo },
                { id: 'budgetMax', etiqueta: 'Presupuesto máximo mensual', placeholder: 'Máximo', valor: draft.budgetMax, onChange: handleBudgetMaxChange, ref: undefined, conError: ambos || (!errorMinimo && !!errorMaximo) },
              ] as const
            ).map((campo) => (
              <div key={campo.id} className="relative">
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-body-sm text-fg-subtle"
                >
                  $
                </span>
                <Input
                  ref={campo.ref}
                  type="text"
                  inputMode="numeric"
                  id={campo.id}
                  aria-label={campo.etiqueta}
                  aria-invalid={campo.conError ? true : undefined}
                  invalid={campo.conError}
                  value={campo.valor ? formatCurrency(campo.valor).replace('COP', '').trim() : ''}
                  onChange={campo.onChange}
                  placeholder={campo.placeholder}
                  className="pl-8 tabular-nums"
                />
              </div>
            ))}
          </div>
          <ErrorDelCampo
            id="presupuesto-error"
            mensaje={errorDelPresupuesto}
            pista="En pesos colombianos, lo que pagarías al mes."
          />
        </fieldset>
      </Seccion>

      {/* Preferred Zones */}
      <Seccion orden={1}>
        <fieldset>
          <Rotulo>Ciudades de interés</Rotulo>
          <div className="mb-3 flex flex-wrap gap-2">
            {CITIES.map((city) => {
              const isSelected = !!draft.preferredZones?.includes(city)
              return (
                <button
                  key={city}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleZone(city)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-body-sm font-medium',
                    OPCION_BASE,
                    isSelected ? OPCION_MARCADA : OPCION_LIBRE,
                  )}
                >
                  {isSelected ? <Check className="h-3.5 w-3.5" weight="bold" aria-hidden /> : null}
                  {city}
                </button>
              )
            })}
          </div>

          {/* Selected custom zones */}
          {zonasPropias.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {zonasPropias.map((zone) => (
                <span
                  key={zone}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-3 pr-1 text-body-sm text-primary"
                >
                  {zone}
                  <IconButton
                    type="button"
                    variant="ghost"
                    aria-label="Quitar zona"
                    onClick={() => toggleZone(zone)}
                    icon={<X className="h-3 w-3" />}
                    className="min-h-0 rounded-full p-1 text-primary hover:bg-primary/10"
                  />
                </span>
              ))}
            </div>
          )}

          {/* Add custom zone */}
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <MapPin
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
              />
              <Input
                type="text"
                id="otraZona"
                aria-label="Otro barrio o zona"
                aria-invalid={errorDe('preferredZones') ? true : undefined}
                aria-describedby={errorDe('preferredZones') ? 'zonas-error' : undefined}
                invalid={!!errorDe('preferredZones')}
                maxLength={MAX_LARGO_ZONA}
                value={customZone}
                onChange={(e) => setCustomZone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomZone()}
                placeholder="Agregar otro barrio o zona"
                className="pl-10"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              hideArrow
              onClick={addCustomZone}
              disabled={!customZone.trim() || zonasLlenas}
              className="h-11 shrink-0"
            >
              Agregar
            </Button>
          </div>
          <ErrorDelCampo id="zonas-error" mensaje={errorDe('preferredZones')} />
          <Presence show={zonasLlenas && !errorDe('preferredZones')} direction="down" distance="xs">
            <p className="mt-1.5 text-caption text-fg-subtle">{MENSAJES_DEL_PERFIL.zonasMaximas}</p>
          </Presence>
        </fieldset>
      </Seccion>

      {/* Move-in Date */}
      <Seccion orden={2}>
        <label htmlFor="moveInDate" className="mb-2.5 inline-flex text-caption font-semibold text-fg">
          ¿Cuándo planeas mudarte?
        </label>
        {/* El calendario de cadence y no el nativo del navegador (que salía en
            inglés), y una salida para quien todavía no sabe: la fecha nunca
            fue obligatoria, pero el campo sólo ofrecía el calendario
            (Nico, 2026-09-15). Elegir una opción apaga la otra. */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <DatePicker
            id="moveInDate"
            value={fechaLocal(draft.moveInDate)}
            onChange={(d) => updateDraft({ moveInDate: aFechaIso(d), moveInDateUnknown: false })}
            minDate={hoyLocal()}
            placeholder="Elige una fecha"
            className={cn(
              'h-11 w-full min-w-0 px-4 text-body-sm',
              draft.moveInDate && 'border-primary/40',
              errorDe('moveInDate') && 'border-danger',
            )}
          />
          <button
            type="button"
            data-testid="mudanza-sin-fecha"
            aria-pressed={!!draft.moveInDateUnknown}
            onClick={() =>
              updateDraft({ moveInDate: '', moveInDateUnknown: !draft.moveInDateUnknown })
            }
            className={cn(
              'h-11 rounded-[12px] px-5 text-body-sm font-medium',
              OPCION_BASE,
              draft.moveInDateUnknown ? OPCION_MARCADA : OPCION_LIBRE,
            )}
          >
            Aún no lo sé
          </button>
        </div>
        <ErrorDelCampo id="mudanza-error" mensaje={errorDe('moveInDate')} />
      </Seccion>

      {/* Pets */}
      <Seccion orden={3}>
        <fieldset>
          <Rotulo>¿Tienes mascotas?</Rotulo>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={!draft.hasPets}
              onClick={() => updateDraft({ hasPets: false, petDetails: '' })}
              className={cn(
                'flex min-h-11 items-center justify-center gap-2 rounded-[12px] px-3 py-2.5 text-body-sm font-medium',
                OPCION_BASE,
                !draft.hasPets ? OPCION_MARCADA : OPCION_LIBRE,
              )}
            >
              No tengo mascotas
            </button>
            <button
              type="button"
              aria-pressed={!!draft.hasPets}
              onClick={() => updateDraft({ hasPets: true })}
              className={cn(
                'flex min-h-11 items-center justify-center gap-2 rounded-[12px] px-3 py-2.5 text-body-sm font-medium',
                OPCION_BASE,
                draft.hasPets ? OPCION_MARCADA : OPCION_LIBRE,
              )}
            >
              <PawPrint className="h-4 w-4 shrink-0" aria-hidden />
              Sí, tengo mascotas
            </button>
          </div>

          {draft.hasPets && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2"
            >
              <Input
                type="text"
                id="petDetails"
                aria-label="Describe tus mascotas"
                aria-invalid={errorDe('petDetails') ? true : undefined}
                aria-describedby={errorDe('petDetails') ? 'mascotas-error' : undefined}
                invalid={!!errorDe('petDetails')}
                maxLength={MAX_LARGO_MASCOTAS}
                value={draft.petDetails || ''}
                onChange={(e) => updateDraft({ petDetails: e.target.value })}
                placeholder="Describe tus mascotas (tipo, tamaño, cantidad)"
              />
            </motion.div>
          )}
          <ErrorDelCampo id="mascotas-error" mensaje={errorDe('petDetails')} />
        </fieldset>
      </Seccion>

      {/* Amenities */}
      <Seccion orden={4}>
        <fieldset>
          <Rotulo>Amenidades importantes para ti</Rotulo>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {AMENITIES.map((amenity) => {
              const Icon = amenity.icon
              const isSelected = !!draft.preferredAmenities?.includes(amenity.id)

              return (
                <button
                  key={amenity.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleAmenity(amenity.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-[12px] px-2 py-3',
                    OPCION_BASE,
                    isSelected ? OPCION_MARCADA : OPCION_LIBRE,
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  <span className="text-center text-caption font-medium leading-tight">{amenity.label}</span>
                </button>
              )
            })}
            {/* Una fila entera y no una novena tarjeta: con cuatro columnas la
                novena quedaba sola en su fila. */}
            <button
              type="button"
              data-testid="otra-amenidad"
              aria-expanded={otraAbierta}
              onClick={() => setOtraAbierta((v) => !v)}
              className={cn(
                'col-span-2 flex items-center justify-center gap-2 rounded-[12px] border-dashed p-3 sm:col-span-4',
                OPCION_BASE,
                otraAbierta || amenidadesPropias.length > 0 ? OPCION_MARCADA : OPCION_LIBRE,
              )}
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span className="text-caption font-medium">Otra amenidad</span>
            </button>
          </div>

          {amenidadesPropias.length > 0 && (
            <div data-testid="amenidades-propias" className="mt-3 flex flex-wrap gap-2">
              {amenidadesPropias.map((amenidad) => (
                <span
                  key={amenidad}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pl-3 pr-1 text-body-sm text-primary"
                >
                  {amenidad}
                  <IconButton
                    type="button"
                    variant="ghost"
                    aria-label={`Quitar ${amenidad}`}
                    onClick={() => toggleAmenity(amenidad)}
                    icon={<X className="h-3 w-3" />}
                    className="min-h-0 rounded-full p-1 text-primary hover:bg-primary/10"
                  />
                </span>
              ))}
            </div>
          )}

          {otraAbierta && (
            <div className="mt-3 flex gap-2">
              <Input
                type="text"
                id="otraAmenidad"
                invalid={!!errorDe('preferredAmenities')}
                aria-label="Otra amenidad importante para ti"
                value={otraAmenidad}
                maxLength={MAX_LARGO_AMENIDAD}
                onChange={(e) => setOtraAmenidad(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addOtraAmenidad()
                  }
                }}
                placeholder="¿Cuál? Ej.: ascensor, terraza, cerca al metro"
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                hideArrow
                onClick={addOtraAmenidad}
                disabled={!otraAmenidad.trim()}
                className="h-11 shrink-0"
              >
                Agregar
              </Button>
            </div>
          )}
          <ErrorDelCampo id="amenidades-error" mensaje={errorDe('preferredAmenities')} />
        </fieldset>
      </Seccion>
    </div>
  )
}
