'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Eye, Share2, ArrowRight, Sparkles, Building2, MapPin, DollarSign } from 'lucide-react';
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
        colors: ['#D4F934', '#000000', '#ffffff'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#D4F934', '#000000', '#ffffff'],
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full"
      >
        {/* Success card */}
        <div className="bg-white rounded-sm border border-black/5 shadow-xl overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-black p-8 text-center relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-plan-accent/20" />

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="relative z-10"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-plan-accent flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-black" />
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">
                Publicacion exitosa!
              </h1>
              <p className="text-white/70">
                Tu inmueble ya esta activo y visible
              </p>
            </motion.div>
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
                <DollarSign className="w-4 h-4 mx-auto text-black/40 mb-1" />
                <p className="text-sm font-semibold text-black">
                  {formatCurrency(draft.monthlyRent)}
                </p>
                <p className="text-xs text-black/50">/mes</p>
              </div>
              <div className="bg-black/5 p-3 rounded-sm text-center">
                <Building2 className="w-4 h-4 mx-auto text-black/40 mb-1" />
                <p className="text-sm font-semibold text-black">
                  {draft.bedrooms} hab
                </p>
                <p className="text-xs text-black/50">{draft.bathrooms} banos</p>
              </div>
              <div className="bg-plan-accent/20 p-3 rounded-sm text-center">
                <Sparkles className="w-4 h-4 mx-auto text-black/60 mb-1" />
                <p className="text-xs font-semibold text-black">
                  {draft.selectedPlan ? planLabels[draft.selectedPlan as keyof typeof planLabels] : 'Plan'}
                </p>
                <p className="text-xs text-black/50">Activo</p>
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
                className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-black text-white text-sm font-medium rounded-sm hover:bg-black/90 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Ver mi propiedad en el panel
              </Link>

              <button
                type="button"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-black/10 text-black/70 text-sm font-medium rounded-sm hover:border-black/20 hover:text-black transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Compartir anuncio
              </button>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-black/[0.02] border-t border-black/5">
            <div className="flex items-center justify-between">
              <Link
                href="/publicar"
                className="inline-flex items-center gap-2 text-sm text-black/60 hover:text-black transition-colors"
              >
                Publicar otro inmueble
                <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="text-xs text-black/40">
                Redirigiendo en {countdown}s...
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
