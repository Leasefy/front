'use client'

import { motion } from 'framer-motion'
import { Buildings, House, Couch, Door, DoorOpen, MapPin, CurrencyDollar, Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { useOnboarding } from '@/lib/context/OnboardingContext'
import { COLOMBIAN_CITIES } from '@/lib/types/property'

const PROPERTY_TYPES = [
  {
    value: 'apartment',
    label: 'Apartamento',
    icon: Buildings,
    emoji: '🏢',
    description: 'Unidad en edificio',
  },
  {
    value: 'house',
    label: 'Casa',
    icon: House,
    emoji: '🏠',
    description: 'Vivienda independiente',
  },
  {
    value: 'studio',
    label: 'Estudio',
    icon: Couch,
    emoji: '🛋️',
    description: 'Espacio compacto',
  },
  {
    value: 'room',
    label: 'Habitación',
    icon: DoorOpen,
    emoji: '🚪',
    description: 'Cuarto individual',
  },
] as const

export function StepFirstProperty() {
  const { locale } = useI18n()
  const { draft, updateDraft } = useOnboarding()

  const formatPrice = (value: number | undefined) => {
    if (!value) return ''
    return new Intl.NumberFormat(locale === 'es' ? 'es-CL' : 'en-US').format(value)
  }

  const parsePrice = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '')
    return cleaned ? parseInt(cleaned, 10) : undefined
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pb-2"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-4">
          <House className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-2xl font-bold text-neutral-900">Tu primera propiedad</h3>
        <p className="text-neutral-500 mt-2 max-w-md mx-auto">
          Cuéntanos sobre el inmueble que quieres publicar. Podrás completar los detalles después.
        </p>
      </motion.div>

      {/* Property Type Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <label className="block text-sm font-semibold text-neutral-700 mb-3">
          Tipo de inmueble *
        </label>
        <div className="grid grid-cols-2 gap-3">
          {PROPERTY_TYPES.map((type, index) => {
            const isSelected = draft.propertyType === type.value

            return (
              <motion.button
                key={type.value}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                onClick={() => updateDraft({ propertyType: type.value })}
                className={cn(
                  'relative group p-5 rounded-xl border transition-all duration-200 text-left',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-500/10'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm'
                )}
              >
                {/* Selection indicator */}
                <div
                  className={cn(
                    'absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                    isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-neutral-300'
                  )}
                >
                  {isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </div>

                {/* Emoji */}
                <span className="text-3xl block mb-2">{type.emoji}</span>

                {/* Text */}
                <p
                  className={cn(
                    'font-semibold text-sm',
                    isSelected ? 'text-indigo-700' : 'text-neutral-700'
                  )}
                >
                  {type.label}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">{type.description}</p>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* City Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="block text-sm font-semibold text-neutral-700 mb-2">
          Ciudad *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <MapPin className="h-5 w-5 text-neutral-400" />
          </div>
          <select
            value={draft.propertyCity || ''}
            onChange={(e) => updateDraft({ propertyCity: e.target.value })}
            className={cn(
              'w-full pl-12 pr-4 py-4 text-base rounded-xl border bg-white appearance-none',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
              draft.propertyCity ? 'border-indigo-200 bg-indigo-50/30' : 'border-neutral-200'
            )}
          >
            <option value="">Selecciona una ciudad</option>
            {COLOMBIAN_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Address */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <label className="block text-sm font-semibold text-neutral-700 mb-2">
          Dirección o barrio
          <span className="font-normal text-neutral-400 ml-1">(opcional)</span>
        </label>
        <input
          type="text"
          value={draft.propertyAddress || ''}
          onChange={(e) => updateDraft({ propertyAddress: e.target.value })}
          placeholder="Ej: Chapinero Alto, Calle 72"
          className={cn(
            'w-full px-4 py-4 text-base rounded-xl border bg-white',
            'transition-all duration-200',
            'placeholder:text-neutral-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
            draft.propertyAddress ? 'border-indigo-200 bg-indigo-50/30' : 'border-neutral-200'
          )}
        />
      </motion.div>

      {/* Monthly Rent */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <label className="block text-sm font-semibold text-neutral-700 mb-2">
          Canon mensual *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-neutral-500 font-medium">$</span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={formatPrice(draft.rentPrice)}
            onChange={(e) => updateDraft({ rentPrice: parsePrice(e.target.value) })}
            placeholder="2.500.000"
            className={cn(
              'w-full pl-10 pr-16 py-4 text-base rounded-xl border bg-white',
              'transition-all duration-200',
              'placeholder:text-neutral-400',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
              draft.rentPrice ? 'border-indigo-200 bg-indigo-50/30' : 'border-neutral-200'
            )}
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <span className="text-neutral-400 text-sm">/mes</span>
          </div>
        </div>
        <p className="text-xs text-neutral-400 mt-2">
          Precio en pesos colombianos. Podrás ajustarlo después.
        </p>
      </motion.div>

      {/* Preview hint */}
      {draft.propertyType && draft.propertyCity && draft.rentPrice && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-200"
        >
          <p className="text-sm text-emerald-700">
            <span className="font-semibold">Vista previa:</span>{' '}
            {PROPERTY_TYPES.find((t) => t.value === draft.propertyType)?.label} en {draft.propertyCity}
            {' por '}
            <span className="font-semibold">${formatPrice(draft.rentPrice)}/mes</span>
          </p>
        </motion.div>
      )}
    </div>
  )
}
