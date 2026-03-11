'use client';

import { MapTrifold, List } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface MapToggleProps {
  showMap: boolean;
  onToggle: () => void;
}

/**
 * Toggle button to switch between list and map views on mobile
 * Fixed at bottom center, only visible on mobile/tablet
 */
export function MapToggle({ showMap, onToggle }: MapToggleProps) {
  return (
    <Button
      onClick={onToggle}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden shadow-lg gap-2"
      size="lg"
      aria-label={showMap ? 'Ver lista de propiedades' : 'Ver mapa de propiedades'}
    >
      {showMap ? (
        <>
          <List className="w-4 h-4" />
          Ver lista
        </>
      ) : (
        <>
          <MapTrifold className="w-4 h-4" />
          Ver mapa
        </>
      )}
    </Button>
  );
}
