'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Eye, Share2, ArrowRight, Sparkles, Building2, MapPin, DollarSign } from 'lucide-react';
import { usePublish } from '@/lib/context/PublishContext';
import { formatCurrency } from '@/lib/data/mock-dashboard';
import confetti from 'canvas-confetti';

export function PublishSuccess() {
  const { draft } = usePublish();
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

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
        colors: ['#5B5FEF', '#A6AAFF', '#ffffff'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#5B5FEF', '#A6AAFF', '#ffffff'],
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Auto-redirect countdown
  useEffect(() => {
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
  }, [router]);

  const planLabels = {
    free: 'Plan Gratis',
    pro: 'Plan Propietario',
    business: 'Plan Inmobiliaria',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full"
      >
        {/* Success card */}
        <div className="bg-card rounded-sm border border-border shadow-xl overflow-hidden">
          {/* Header */}
          <div className="relative px-8 pt-14 pb-10 text-center overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-600 via-indigo-500 to-indigo-400" />
            {/* Subtle mesh overlay */}
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15) 0%, transparent 50%)',
            }} />
            {/* Bottom fade into white card */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />

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
                  <Check className="w-10 h-10 text-indigo-600" strokeWidth={2.5} />
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
                className="aspect-video rounded-sm overflow-hidden relative"
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
              <div className="bg-black/5 p-3 rounded-sm text-center">
                <DollarSign className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(draft.monthlyRent)}
                </p>
                <p className="text-xs text-muted-foreground">/mes</p>
              </div>
              <div className="bg-black/5 p-3 rounded-sm text-center">
                <Building2 className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm font-semibold text-foreground">
                  {draft.bedrooms} hab
                </p>
                <p className="text-xs text-muted-foreground">{draft.bathrooms} banos</p>
              </div>
              <div className="bg-indigo-500/20 p-3 rounded-sm text-center">
                <Sparkles className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs font-semibold text-foreground">
                  {draft.selectedPlan ? planLabels[draft.selectedPlan as keyof typeof planLabels] : 'Plan'}
                </p>
                <p className="text-xs text-muted-foreground">Activo</p>
              </div>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3 pt-2"
            >
              <Link
                href="/panel/propiedades"
                className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-primary text-white text-sm font-medium rounded-sm hover:bg-primary/85 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Ver mi propiedad en el panel
              </Link>

              <button
                type="button"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-border text-foreground/70 text-sm font-medium rounded-sm hover:border-border hover:text-foreground transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Compartir anuncio
              </button>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-black/[0.02] border-t border-border">
            <div className="flex items-center justify-between">
              <Link
                href="/publicar"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Publicar otro inmueble
                <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="text-xs text-muted-foreground">
                Redirigiendo en {countdown}s...
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
