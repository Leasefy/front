'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface TestimonialProps {
  quote: string;
  name: string;
  role: string;
  avatar?: string;
  className?: string;
}

/**
 * Testimonial component for auth page image panel
 * Positioned over dark overlay, provides social proof
 */
export function Testimonial({
  quote,
  name,
  role,
  avatar,
  className,
}: TestimonialProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-sm shadow-elevated p-6 max-w-md',
        className
      )}
    >
      {/* Quote mark */}
      <div className="text-primary text-4xl leading-none mb-3 font-serif">
        &ldquo;
      </div>

      {/* Quote text */}
      <p className="text-body text-foreground mb-4 leading-relaxed">
        {quote}
      </p>

      {/* Author */}
      <div className="flex items-center gap-3">
        {avatar ? (
          <div className="relative w-10 h-10 rounded-full overflow-hidden">
            <Image
              src={avatar}
              alt={name}
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-sm font-medium text-secondary-foreground">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="text-caption text-muted-foreground">{role}</p>
        </div>
      </div>
    </div>
  );
}
