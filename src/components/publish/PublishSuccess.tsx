'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Eye, ShareNetwork, ArrowRight, Sparkle, Buildings, MapPin, CurrencyDollar, UserPlus } from '@phosphor-icons/react';
import { usePublish } from '@/lib/context/PublishContext';
import { useAuth } from '@/lib/auth/use-auth';
import { AuthModal } from '@/components/auth/AuthModal';
import { formatCurrency } from '@/lib/format';
import { PLANS, AGENCY_PLANS } from '@/lib/constants/subscription-plans';
import confetti from 'canvas-confetti';

export function PublishSuccess() {
  const { draft } = usePublish();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [countdown, setCountdown] = useState(5);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Mark property as published in localStorage for onboarding progress
  useEffect(() => {
    // Update the getting started progress
    const saved = localStorage.getItem('plan_getting_started');
    let progress = { completedSteps: ['create_account'], isCollapsed: false };

    if (saved) {
      try {
        progress = JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing progress:', e);
      }
    }

    // Add publish_property to completed steps if not already there
    if (!progress.completedSteps.includes('publish_property')) {
      progress.completedSteps.push('publish_property');
      localStorage.setItem('plan_getting_started', JSON.stringify({
        ...progress,
        lastUpdated: new Date().toISOString(),
      }));
    }
  }, []);

  // Confetti effect on mount
  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#1A40FF', '#8A9CFF', '#ffffff'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#1A40FF', '#8A9CFF', '#ffffff'],
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Auto-redirect countdown (only for authenticated users)
  useEffect(() => {
    if (!isAuthenticated) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/panel/propiedades');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, isAuthenticated]);

  const planLabels = Object.fromEntries([
    ...PLANS.map((p) => [p.id, `Plan ${p.name}`]),
    ...AGENCY_PLANS.map((p) => [p.id, `Plan ${p.name}`]),
  ]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full"
      >
        {/* Success card */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          {/* Header */}
          <div className="relative px-8 pt-14 pb-10 text-center overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#1A40FF] via-[#1A40FF] to-[#1A40FF]" />
            {/* Subtle mesh overlay */}
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15) 0%, transparent 50%)',
            }} />
            {/* Robottom fade into card */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-surface to-transparent" />

            <div className="relative z-10">
              {/* Animated rings */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                  className="absolute inset-0 rounded-full border-2 border-white/10"
                  style={{ transform: 'scale(1.6)' }}
                />
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="absolute inset-0 rounded-full border border-white/15"
                  style={{ transform: 'scale(1.3)' }}
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 12 }}
                  className="relative w-24 h-24 rounded-full bg-white shadow-[0_8px_32px_rgba(0,0,0,0.15)] flex items-center justify-center"
                >
                  <Check className="w-10 h-10 text-[#1A40FF]" strokeWidth={2.5} />
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <h1 className="text-2xl font-bold text-white mb-1.5 tracking-tight">
                  ¡Publicación exitosa!
                </h1>
                <p className="text-white/70 text-[15px]">
                  Tu inmueble ya está activo y visible
                </p>
              </motion.div>
            </div>
          </div>

          {/* Property summary */}
          <div className="p-6 space-y-4">
            {/* Preview image */}
            {draft.photos.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="aspect-video rounded-xl overflow-hidden relative"
              >
                <img
                  src={draft.photos[0]}
                  alt={draft.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h2 className="text-white font-semibold truncate">{draft.title}</h2>
                  <div className="flex items-center gap-1 text-white/80 text-sm">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{draft.neighborhood}, {draft.city}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quick stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-3 gap-3"
            >
              <div className="bg-surface-muted p-3 rounded-xl text-center">
                <CurrencyDollar className="w-4 h-4 mx-auto text-fg-subtle mb-1" />
                <p className="text-sm font-semibold text-fg">
                  {formatCurrency(draft.monthlyRent)}
                </p>
                <p className="text-xs text-fg-subtle">/mes</p>
              </div>
              <div className="bg-surface-muted p-3 rounded-xl text-center">
                <Buildings className="w-4 h-4 mx-auto text-fg-subtle mb-1" />
                <p className="text-sm font-semibold text-fg">
                  {draft.bedrooms} hab
                </p>
                <p className="text-xs text-fg-subtle">
                  {draft.bathrooms} {draft.bathrooms === 1 ? 'baño' : 'baños'}
                </p>
              </div>
              <div className="bg-[#EEF1FF] dark:bg-[#1A40FF]/15 p-3 rounded-xl text-center">
                <Sparkle className="w-4 h-4 mx-auto text-[#1A40FF] dark:text-[#5570FF] mb-1" />
                <p className="text-xs font-semibold text-fg">
                  {draft.selectedPlan ? planLabels[draft.selectedPlan] ?? 'Plan' : 'Plan'}
                </p>
                <p className="text-xs text-fg-subtle">Activo</p>
              </div>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3 pt-2"
            >
              {isAuthenticated ? (
                <Link
                  href="/panel/propiedades"
                  className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-[#1A40FF] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Ver mi propiedad en el panel
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-[#1A40FF] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Ver mi propiedad en el panel
                </button>
              )}

              <button
                type="button"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-border text-fg-muted text-sm font-medium rounded-xl hover:border-border-strong hover:text-fg transition-colors"
              >
                <ShareNetwork className="w-4 h-4" />
                Compartir anuncio
              </button>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-surface-muted border-t border-border">
            <div className="flex items-center justify-between">
              <Link
                href="/publicar"
                className="inline-flex items-center gap-2 text-sm text-fg-subtle hover:text-fg transition-colors"
              >
                Publicar otro inmueble
                <ArrowRight className="w-4 h-4" />
              </Link>
              {isAuthenticated ? (
                <span className="text-xs text-fg-subtle">
                  Redirigiendo en {countdown}s...
                </span>
              ) : (
                <span className="text-xs text-fg-subtle">
                  Inicia sesion para acceder al panel
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <AuthModal
        isOpen={showAuthModal}
        onOpenChange={setShowAuthModal}
        defaultRole={draft.ownerType === 'inmobiliaria' ? 'agency' : 'landlord'}
        returnUrl={draft.ownerType === 'inmobiliaria' ? '/panel/inmobiliaria' : '/panel/propiedades'}
      />
    </div>
  );
}
