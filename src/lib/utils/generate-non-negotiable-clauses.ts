import type { ContractClause } from '@/lib/types/contract';
import type { TenantRequirements } from '@/lib/types/publish';

/**
 * Generate non-negotiable contract clauses from tenant requirements
 * These clauses are automatically included in the contract based on
 * the landlord's property listing requirements.
 */
export function generateNonNegotiableClauses(
  requirements: TenantRequirements,
  monthlyRent: number
): ContractClause[] {
  const clauses: ContractClause[] = [];
  let clauseIndex = 1;

  if (requirements.employmentNonNegotiable && requirements.acceptedEmployment.length > 0) {
    const types = requirements.acceptedEmployment.join(', ');
    clauses.push({
      id: `non-neg-${clauseIndex++}`,
      title: 'Requisito de empleo',
      content: `El arrendatario debe mantener empleo de tipo: ${types} durante la vigencia del contrato.`,
      required: true,
    });
  }

  if (requirements.incomeNonNegotiable && requirements.minIncomeRatio > 0) {
    const minIncome = monthlyRent * requirements.minIncomeRatio;
    clauses.push({
      id: `non-neg-${clauseIndex++}`,
      title: 'Requisito de ingresos',
      content: `El arrendatario debe demostrar ingresos mensuales mínimos de $${minIncome.toLocaleString('es-CO')} (${requirements.minIncomeRatio}x el canon de arrendamiento).`,
      required: true,
    });
  }

  if (requirements.petsNonNegotiable && requirements.petsPolicy) {
    const policyText = requirements.petsPolicy === 'none'
      ? 'No se permiten mascotas en el inmueble.'
      : requirements.petsPolicy === 'small'
        ? 'Solo se permiten mascotas pequeñas (menos de 10 kg).'
        : 'Se permiten mascotas con las condiciones establecidas.';
    clauses.push({
      id: `non-neg-${clauseIndex++}`,
      title: 'Política de mascotas',
      content: policyText,
      required: true,
    });
  }

  if (requirements.smokingNonNegotiable && requirements.smokingPolicy) {
    const smokingText = requirements.smokingPolicy === 'none'
      ? 'Queda estrictamente prohibido fumar dentro del inmueble y áreas comunes.'
      : requirements.smokingPolicy === 'outside'
        ? 'Se permite fumar únicamente en áreas exteriores del inmueble.'
        : 'Se permite fumar en las áreas designadas para tal fin.';
    clauses.push({
      id: `non-neg-${clauseIndex++}`,
      title: 'Política de fumadores',
      content: smokingText,
      required: true,
    });
  }

  if (requirements.occupantsNonNegotiable && requirements.maxOccupants > 0) {
    clauses.push({
      id: `non-neg-${clauseIndex++}`,
      title: 'Límite de ocupantes',
      content: `El número máximo de personas que pueden habitar el inmueble es de ${requirements.maxOccupants} persona(s).`,
      required: true,
    });
  }

  return clauses;
}
