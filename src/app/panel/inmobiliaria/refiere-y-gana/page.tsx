'use client';

import { RefiereYGana } from '@/components/refiere-y-gana/RefiereYGana';

/**
 * /panel/inmobiliaria/refiere-y-gana — «Refiere y gana» de la inmobiliaria o del agente (Nico, 28-10-2026). Se llega
 * desde el menú de la cuenta y la tarjeta de «Tu plan». Lo ve todo el equipo (el enlace es de la inmobiliaria).
 */
export default function RefiereYGanaDeLaInmobiliariaPage() {
  return <RefiereYGana rutaDelPlan="/panel/inmobiliaria/upgrade" />;
}
