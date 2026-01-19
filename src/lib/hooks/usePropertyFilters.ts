'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Property, PropertyType } from '@/lib/types/property';

/**
 * Property filter state
 */
export interface PropertyFilters {
  city: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
  propertyType: PropertyType | null;
}

const initialFilters: PropertyFilters = {
  city: null,
  minPrice: null,
  maxPrice: null,
  bedrooms: null,
  propertyType: null,
};

/**
 * Custom hook for managing property filter state and filtering logic
 * @param properties - Array of properties to filter
 * @returns Filter state, setters, and filtered properties
 */
export function usePropertyFilters(properties: Property[]) {
  const [filters, setFilters] = useState<PropertyFilters>(initialFilters);

  // Derive available cities from properties
  const availableCities = useMemo(() => {
    const cities = [...new Set(properties.map((p) => p.city))];
    return cities.sort();
  }, [properties]);

  // Filter setters
  const setCity = useCallback((city: string | null) => {
    setFilters((prev) => ({ ...prev, city }));
  }, []);

  const setPriceRange = useCallback(
    (minPrice: number | null, maxPrice: number | null) => {
      setFilters((prev) => ({ ...prev, minPrice, maxPrice }));
    },
    []
  );

  const setBedrooms = useCallback((bedrooms: number | null) => {
    setFilters((prev) => ({ ...prev, bedrooms }));
  }, []);

  const setPropertyType = useCallback((propertyType: PropertyType | null) => {
    setFilters((prev) => ({ ...prev, propertyType }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.city !== null ||
      filters.minPrice !== null ||
      filters.maxPrice !== null ||
      filters.bedrooms !== null ||
      filters.propertyType !== null
    );
  }, [filters]);

  // Memoized filtered properties
  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      // City filter
      if (filters.city && property.city !== filters.city) {
        return false;
      }

      // Min price filter
      if (filters.minPrice && property.monthlyRent < filters.minPrice) {
        return false;
      }

      // Max price filter
      if (filters.maxPrice && property.monthlyRent > filters.maxPrice) {
        return false;
      }

      // Bedrooms filter (4+ means 4 or more)
      if (filters.bedrooms !== null) {
        if (filters.bedrooms === 4) {
          if (property.bedrooms < 4) {
            return false;
          }
        } else if (property.bedrooms !== filters.bedrooms) {
          return false;
        }
      }

      // Property type filter
      if (filters.propertyType && property.type !== filters.propertyType) {
        return false;
      }

      return true;
    });
  }, [properties, filters]);

  return {
    filters,
    setCity,
    setPriceRange,
    setBedrooms,
    setPropertyType,
    resetFilters,
    filteredProperties,
    availableCities,
    hasActiveFilters,
  };
}
