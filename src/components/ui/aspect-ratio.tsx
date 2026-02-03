'use client';

import * as React from 'react';
import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio';
import { cn } from '@/lib/utils';

// ============================================================================
// Aspect Ratio Component
// ============================================================================

export interface AspectRatioProps
  extends React.ComponentPropsWithoutRef<typeof AspectRatioPrimitive.Root> {
  ratio?: number;
}

const AspectRatio = React.forwardRef<
  React.ElementRef<typeof AspectRatioPrimitive.Root>,
  AspectRatioProps
>(({ className, ...props }, ref) => (
  <AspectRatioPrimitive.Root
    ref={ref}
    className={cn('relative w-full', className)}
    {...props}
  />
));
AspectRatio.displayName = AspectRatioPrimitive.Root.displayName;

// ============================================================================
// Common Aspect Ratio Presets
// ============================================================================

export const aspectRatios = {
  square: 1,
  video: 16 / 9,
  widescreen: 21 / 9,
  portrait: 3 / 4,
  landscape: 4 / 3,
  photo: 3 / 2,
  golden: 1.618,
  cinema: 2.35,
  ultrawide: 32 / 9,
} as const;

export type AspectRatioPreset = keyof typeof aspectRatios;

// ============================================================================
// Aspect Ratio with Image
// ============================================================================

export interface AspectRatioImageProps extends Omit<AspectRatioProps, 'children'> {
  src: string;
  alt: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

function AspectRatioImage({
  src,
  alt,
  ratio = aspectRatios.video,
  objectFit = 'cover',
  objectPosition = 'center',
  placeholder,
  onLoad,
  onError,
  className,
  ...props
}: AspectRatioImageProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  return (
    <AspectRatio ratio={ratio} className={cn('overflow-hidden', className)} {...props}>
      {isLoading && placeholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          {placeholder}
        </div>
      )}
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-sm text-muted-foreground">Failed to load image</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'absolute inset-0 h-full w-full',
            isLoading && 'opacity-0',
            'transition-opacity duration-300'
          )}
          style={{
            objectFit,
            objectPosition,
          }}
        />
      )}
    </AspectRatio>
  );
}

// ============================================================================
// Aspect Ratio with Video
// ============================================================================

export interface AspectRatioVideoProps extends Omit<AspectRatioProps, 'children'> {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  playsInline?: boolean;
}

function AspectRatioVideo({
  src,
  poster,
  ratio = aspectRatios.video,
  autoPlay = false,
  muted = true,
  loop = false,
  controls = true,
  playsInline = true,
  className,
  ...props
}: AspectRatioVideoProps) {
  return (
    <AspectRatio ratio={ratio} className={cn('overflow-hidden', className)} {...props}>
      <video
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        controls={controls}
        playsInline={playsInline}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </AspectRatio>
  );
}

// ============================================================================
// Aspect Ratio with Iframe (for embeds)
// ============================================================================

export interface AspectRatioIframeProps extends Omit<AspectRatioProps, 'children'> {
  src: string;
  title: string;
  allow?: string;
  allowFullScreen?: boolean;
}

function AspectRatioIframe({
  src,
  title,
  ratio = aspectRatios.video,
  allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
  allowFullScreen = true,
  className,
  ...props
}: AspectRatioIframeProps) {
  return (
    <AspectRatio ratio={ratio} className={cn('overflow-hidden', className)} {...props}>
      <iframe
        src={src}
        title={title}
        allow={allow}
        allowFullScreen={allowFullScreen}
        className="absolute inset-0 h-full w-full border-0"
      />
    </AspectRatio>
  );
}

export { AspectRatio, AspectRatioImage, AspectRatioVideo, AspectRatioIframe };
