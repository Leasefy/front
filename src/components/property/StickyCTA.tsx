'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Share2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface StickyCTAProps {
  propertyId: string;
  price: number;
  adminFee?: number;
  isWishlisted?: boolean;
  onWishlistToggle?: () => void;
  className?: string;
}

/**
 * StickyCTA - Luxterra-style sticky card with lead capture and CTA
 * Stays visible while scrolling for easy conversion
 */
export function StickyCTA({
  propertyId,
  price,
  adminFee = 0,
  isWishlisted = false,
  onWishlistToggle,
  className,
}: StickyCTAProps) {
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');

  // Build application link with lead info
  const applicationLink =
    leadName || leadEmail
      ? `/aplicar/${propertyId}?name=${encodeURIComponent(leadName)}&email=${encodeURIComponent(leadEmail)}`
      : `/aplicar/${propertyId}`;

  return (
    <div className={cn('lg:sticky lg:top-28', className)}>
      {/* CTA Card - Luxterra style */}
      <div className="bg-white border border-black/10 p-6">
        {/* Agent/Contact Header */}
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-black/10">
          <div>
            <p className="text-sm font-medium text-black">Arriendo Facil</p>
            <p className="text-xs text-black/50 mt-0.5">Respuesta en menos de 24h</p>
          </div>
          <div className="flex gap-2">
            {onWishlistToggle && (
              <button
                onClick={onWishlistToggle}
                className={cn(
                  'min-w-[44px] min-h-[44px] w-10 h-10 flex items-center justify-center border transition-colors',
                  isWishlisted
                    ? 'border-red-200 bg-red-50 text-red-500'
                    : 'border-black/10 hover:bg-black/5 text-black/60'
                )}
                aria-label={isWishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                aria-pressed={isWishlisted}
              >
                <Heart className={cn('w-5 h-5', isWishlisted && 'fill-current')} aria-hidden="true" />
              </button>
            )}
            <button
              className="min-w-[44px] min-h-[44px] w-10 h-10 flex items-center justify-center border border-black/10 hover:bg-black/5 text-black/60 transition-colors"
              aria-label="Compartir propiedad"
            >
              <Share2 className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Price Display */}
        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-black">
              {formatCurrency(price)}
            </span>
            <span className="text-sm text-black/50">/mes</span>
          </div>
          {adminFee > 0 && (
            <p className="text-sm text-black/50 mt-1">
              + {formatCurrency(adminFee)} administracion
            </p>
          )}
        </div>

        {/* Lead Capture Form */}
        <div className="space-y-3 mb-4">
          <Input
            type="text"
            placeholder="Tu nombre"
            value={leadName}
            onChange={(e) => setLeadName(e.target.value)}
            className="h-11 rounded-sm border-black/10 text-sm placeholder:text-black/40 focus:border-black/30 focus:ring-0"
          />
          <Input
            type="email"
            placeholder="Tu correo electronico"
            value={leadEmail}
            onChange={(e) => setLeadEmail(e.target.value)}
            className="h-11 rounded-sm border-black/10 text-sm placeholder:text-black/40 focus:border-black/30 focus:ring-0"
          />
        </div>

        {/* CTA Button */}
        <Link href={applicationLink} className="block">
          <button className="w-full py-4 bg-black text-white text-sm font-medium tracking-tight hover:bg-black/90 transition-colors">
            Postularme a esta propiedad
          </button>
        </Link>

        <p className="text-xs text-black/40 text-center mt-4">
          Sin codeudor. Completa tu solicitud en minutos.
        </p>
      </div>
    </div>
  );
}

/**
 * MobileStickyCTA - Fixed bottom CTA for mobile devices
 */
export function MobileStickyCTA({
  propertyId,
  price,
}: {
  propertyId: string;
  price: number;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 p-4 lg:hidden z-30">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-lg font-medium text-black">
            {formatCurrency(price)}
            <span className="text-sm font-normal text-black/50">/mes</span>
          </p>
        </div>
        <Link href={`/aplicar/${propertyId}`}>
          <button className="min-h-[44px] px-6 py-3 bg-black text-white text-sm font-medium tracking-tight hover:bg-black/90 transition-colors">
            Postularme
          </button>
        </Link>
      </div>
    </div>
  );
}
