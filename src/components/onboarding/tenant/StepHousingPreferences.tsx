'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CurrencyDollar, MapPin, Calendar, PawPrint, WifiHigh, Car, Shield, Barbell, Tree, Warehouse, Waves, Sparkle, X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { useTenantOnboarding } from '@/lib/context/TenantOnboardingContext'

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

export function StepHousingPreferences() {
  const { locale } = useI18n()
  const { draft, updateDraft, canProceed } = useTenantOnboarding()
  const [customZone, setCustomZone] = useState('')

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

  const toggleZone = (zone: string) => {
    const currentZones = draft.preferredZones || []
    if (currentZones.includes(zone)) {
      updateDraft({ preferredZones: currentZones.filter((z) => z !== zone) })
    } else {
      updateDraft({ preferredZones: [...currentZones, zone] })
    }
  }

  const addCustomZone = () => {
    if (customZone.trim()) {
      const currentZones = draft.preferredZones || []
      if (!currentZones.includes(customZone.trim())) {
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

  return (
    <div className="space-y-6">
        {/* Budget Range */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Presupuesto mensual <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <CurrencyDollar className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                inputMode="numeric"
                id="budgetMin"
                aria-label="Presupuesto mínimo mensual"
                value={draft.budgetMin ? formatCurrency(draft.budgetMin).replace('COP', '').trim() : ''}
                onChange={handleBudgetMinChange}
                placeholder="Mínimo"
                className={cn(
                  'w-full h-12 pl-12 pr-4 rounded-xl border bg-white dark:bg-[#1a1a1c]',
                  'text-neutral-900 dark:text-white placeholder:text-neutral-400',
                  'transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                  draft.budgetMin
                    ? 'border-indigo-500 focus:border-indigo-500'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-indigo-500'
                )}
              />
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <CurrencyDollar className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                inputMode="numeric"
                id="budgetMax"
                aria-label="Presupuesto máximo mensual"
                value={draft.budgetMax ? formatCurrency(draft.budgetMax).replace('COP', '').trim() : ''}
                onChange={handleBudgetMaxChange}
                placeholder="Máximo"
                className={cn(
                  'w-full h-12 pl-12 pr-4 rounded-xl border bg-white dark:bg-[#1a1a1c]',
                  'text-neutral-900 dark:text-white placeholder:text-neutral-400',
                  'transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                  draft.budgetMax
                    ? 'border-indigo-500 focus:border-indigo-500'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-indigo-500'
                )}
              />
            </div>
          </div>
        </motion.div>

        {/* Preferred Zones */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Ciudades de interés
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {CITIES.map((city) => {
              const isSelected = draft.preferredZones?.includes(city)
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => toggleZone(city)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                    isSelected
                      ? 'bg-indigo-600 text-white uppercase tracking-wide font-mono'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  )}
                >
                  {city}
                </button>
              )
            })}
          </div>

          {/* Selected custom zones */}
          {draft.preferredZones && draft.preferredZones.filter(z => !CITIES.includes(z)).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {draft.preferredZones.filter(z => !CITIES.includes(z)).map((zone) => (
                <span
                  key={zone}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-sm"
                >
                  {zone}
                  <button
                    type="button"
                    onClick={() => toggleZone(zone)}
                    className="hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add custom zone */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <MapPin className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                value={customZone}
                onChange={(e) => setCustomZone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomZone()}
                placeholder="Agregar otro barrio o zona"
                className={cn(
                  'w-full h-12 pl-12 pr-4 rounded-xl border bg-white dark:bg-[#1a1a1c]',
                  'text-neutral-900 dark:text-white placeholder:text-neutral-400',
                  'transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-indigo-500'
                )}
              />
            </div>
            <button
              type="button"
              onClick={addCustomZone}
              disabled={!customZone.trim()}
              className={cn(
                'px-4 py-3 rounded-xl font-medium transition-all duration-200',
                'bg-indigo-600 text-white uppercase tracking-wide font-mono hover:bg-indigo-700',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Agregar
            </button>
          </div>
        </motion.div>

        {/* Move-in Date */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <label htmlFor="moveInDate" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            ¿Cuándo planeas mudarte?
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Calendar className="h-5 w-5 text-neutral-400" />
            </div>
            <input
              type="date"
              id="moveInDate"
              value={draft.moveInDate || ''}
              onChange={(e) => updateDraft({ moveInDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className={cn(
                'w-full h-12 pl-12 pr-4 rounded-xl border bg-white dark:bg-[#1a1a1c]',
                'text-neutral-900 dark:text-white placeholder:text-neutral-400',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                draft.moveInDate
                  ? 'border-indigo-500 focus:border-indigo-500'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-indigo-500'
              )}
            />
          </div>
        </motion.div>

        {/* Pets */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            ¿Tienes mascotas?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateDraft({ hasPets: false, petDetails: '' })}
              className={cn(
                'flex items-center justify-center gap-3 p-4 rounded-xl border transition-all duration-200',
                !draft.hasPets
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-sm'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#1a1a1c]'
              )}
            >
              <span className={cn('text-sm font-semibold', !draft.hasPets ? 'text-indigo-700 dark:text-indigo-400' : 'text-neutral-700 dark:text-neutral-300')}>
                No tengo mascotas
              </span>
            </button>
            <button
              type="button"
              onClick={() => updateDraft({ hasPets: true })}
              className={cn(
                'flex items-center justify-center gap-3 p-4 rounded-xl border transition-all duration-200',
                draft.hasPets
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-sm'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#1a1a1c]'
              )}
            >
              <PawPrint className={cn('h-5 w-5', draft.hasPets ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 dark:text-neutral-400')} />
              <span className={cn('text-sm font-semibold', draft.hasPets ? 'text-indigo-700 dark:text-indigo-400' : 'text-neutral-700 dark:text-neutral-300')}>
                Sí, tengo mascotas
              </span>
            </button>
          </div>

          {draft.hasPets && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3"
            >
              <input
                type="text"
                value={draft.petDetails || ''}
                onChange={(e) => updateDraft({ petDetails: e.target.value })}
                placeholder="Describe tus mascotas (tipo, tamaño, cantidad)"
                className={cn(
                  'w-full h-12 px-4 rounded-xl border bg-white dark:bg-[#1a1a1c]',
                  'text-neutral-900 dark:text-white placeholder:text-neutral-400',
                  'transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-indigo-500'
                )}
              />
            </motion.div>
          )}
        </motion.div>

        {/* Amenities */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Amenidades importantes para ti
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {AMENITIES.map((amenity) => {
              const Icon = amenity.icon
              const isSelected = draft.preferredAmenities?.includes(amenity.id)

              return (
                <button
                  key={amenity.id}
                  type="button"
                  onClick={() => toggleAmenity(amenity.id)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200',
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#1a1a1c]'
                  )}
                >
                  <Icon className={cn('h-5 w-5', isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 dark:text-neutral-400')} />
                  <span className={cn('text-xs font-medium text-center', isSelected ? 'text-indigo-700 dark:text-indigo-400' : 'text-neutral-600 dark:text-neutral-400')}>
                    {amenity.label}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>

      {/* Validation hint */}
      {!canProceed && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-xl"
        >
          Ingresa tu presupuesto mínimo y máximo para continuar
        </motion.p>
      )}
    </div>
  )
}
