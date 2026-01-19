import type { Property } from '@/lib/types/property';
import type { UserProfile } from '@/lib/context/UserProfileContext';

/**
 * Constants for affordability calculations
 */
export const AFFORDABILITY_THRESHOLD = 0.3; // Max 30% of available income for rent
export const IDEAL_AFFORDABILITY_RATIO = 0.22; // Ideal ratio is 20-25%

/**
 * Result of qualification calculation
 */
export interface QualificationResult {
  qualifies: boolean;
  score: number; // 0-100 match score
  reason?: string;
}

/**
 * Property with its qualification score
 */
export interface ScoredProperty {
  property: Property;
  qualification: QualificationResult;
}

/**
 * Calculate if a user qualifies for a property based on their financial profile
 * and how well the property matches their preferences
 */
export function calculateQualification(
  property: Property,
  userProfile: UserProfile
): QualificationResult {
  // If profile is incomplete, return neutral result
  if (!userProfile.hasCompletedProfile) {
    return {
      qualifies: true,
      score: 50,
      reason: 'Completa tu perfil para ver si calificas',
    };
  }

  const totalMonthlyRent = property.monthlyRent + property.adminFee;
  const affordabilityRatio = totalMonthlyRent / userProfile.availableForRent;

  // Must be <= 30% of available income
  if (affordabilityRatio > AFFORDABILITY_THRESHOLD) {
    const exceedAmount = Math.round(
      totalMonthlyRent - userProfile.maxAffordableRent
    );
    return {
      qualifies: false,
      score: Math.max(0, Math.round(100 - (affordabilityRatio - AFFORDABILITY_THRESHOLD) * 200)),
      reason: `Supera tu presupuesto en $${exceedAmount.toLocaleString('es-CO')}`,
    };
  }

  // Calculate match score based on multiple factors
  let score = 100;

  // Affordability factor (perfect if around 22% of income)
  const affordabilityScore = 100 - Math.abs(affordabilityRatio - IDEAL_AFFORDABILITY_RATIO) * 200;
  score = Math.min(score, Math.max(50, affordabilityScore));

  // City preference bonus
  if (userProfile.preferredCities.length > 0) {
    if (userProfile.preferredCities.includes(property.city)) {
      score += 10;
    } else {
      score -= 5;
    }
  }

  // Bedrooms preference bonus
  if (userProfile.preferredBedrooms !== null) {
    if (userProfile.preferredBedrooms === property.bedrooms) {
      score += 10;
    } else if (Math.abs(userProfile.preferredBedrooms - property.bedrooms) === 1) {
      score += 5;
    } else {
      score -= 5;
    }
  }

  // Property type preference bonus
  if (userProfile.preferredPropertyTypes.length > 0) {
    if (userProfile.preferredPropertyTypes.includes(property.type)) {
      score += 10;
    } else {
      score -= 5;
    }
  }

  return {
    qualifies: true,
    score: Math.min(100, Math.max(0, Math.round(score))),
  };
}

/**
 * Rank properties by their match score for a user profile
 * Returns only qualifying properties, sorted by score descending
 */
export function rankPropertiesByMatch(
  properties: Property[],
  userProfile: UserProfile,
  limit?: number
): ScoredProperty[] {
  const scored = properties.map((property) => ({
    property,
    qualification: calculateQualification(property, userProfile),
  }));

  // Filter to qualifying only and sort by score
  const qualifying = scored
    .filter((sp) => sp.qualification.qualifies)
    .sort((a, b) => b.qualification.score - a.qualification.score);

  return limit ? qualifying.slice(0, limit) : qualifying;
}

/**
 * Get all properties with their qualification status
 * Includes both qualifying and non-qualifying properties
 */
export function scoreAllProperties(
  properties: Property[],
  userProfile: UserProfile
): ScoredProperty[] {
  return properties.map((property) => ({
    property,
    qualification: calculateQualification(property, userProfile),
  }));
}

/**
 * Filter properties to only those the user can afford
 */
export function filterAffordableProperties(
  properties: Property[],
  userProfile: UserProfile
): Property[] {
  return properties.filter((property) => {
    const qualification = calculateQualification(property, userProfile);
    return qualification.qualifies;
  });
}
