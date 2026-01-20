'use client';

import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { Testimonial } from '@/components/auth/Testimonial';

// Testimonial data for the auth page
const TESTIMONIAL = {
  quote:
    'Arriendo Facil me ayudo a encontrar el inquilino perfecto en solo 3 dias. El analisis de riesgo me dio la tranquilidad que necesitaba para tomar la mejor decision.',
  name: 'Maria Fernanda Rodriguez',
  role: 'Propietaria en Bogota',
  avatar:
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
};

// Property image for background
const PROPERTY_IMAGE =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=1600&fit=crop';

// Loading fallback for auth form
function AuthFormFallback() {
  return (
    <div className="w-full max-w-md animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-4 mx-auto w-48" />
      <div className="h-4 bg-gray-200 rounded mb-8 mx-auto w-32" />
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

/**
 * Auth page with split layout
 * Left: Property image with testimonial (desktop only)
 * Right: Auth form (login/register)
 */
export default function AuthPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Image with testimonial (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${PROPERTY_IMAGE})` }}
        />

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-between p-8 lg:p-12 w-full">
          {/* Logo on dark section */}
          <div>
            <a href="/" className="inline-block">
              <span className="text-xl font-semibold text-white">
                Arriendo Facil
              </span>
            </a>
          </div>

          {/* Testimonial card - positioned at bottom */}
          <div className="mb-8">
            <Testimonial
              quote={TESTIMONIAL.quote}
              name={TESTIMONIAL.name}
              role={TESTIMONIAL.role}
              avatar={TESTIMONIAL.avatar}
            />
          </div>

          {/* Stats row */}
          <div className="flex gap-8">
            <div>
              <p className="text-2xl font-semibold text-white">2,500+</p>
              <p className="text-sm text-white/70">Propiedades evaluadas</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">98%</p>
              <p className="text-sm text-white/70">Propietarios satisfechos</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">3 dias</p>
              <p className="text-sm text-white/70">Tiempo promedio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo - only visible on mobile */}
          <div className="lg:hidden text-center mb-8">
            <a href="/" className="inline-block">
              <span className="text-xl font-semibold text-foreground">
                Arriendo Facil
              </span>
            </a>
          </div>

          {/* Auth form - wrapped in Suspense for useSearchParams */}
          <Suspense fallback={<AuthFormFallback />}>
            <AuthForm />
          </Suspense>

          {/* Footer links */}
          <div className="mt-8 text-center">
            <p className="text-caption text-muted-foreground">
              Al continuar, aceptas nuestros{' '}
              <button className="text-foreground hover:underline">
                Terminos
              </button>{' '}
              y{' '}
              <button className="text-foreground hover:underline">
                Politica de Privacidad
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
