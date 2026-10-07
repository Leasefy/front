import type { PerfilDeOnboarding } from '@/lib/auth/perfil-de-onboarding'

export type ValorDePerfil = 'tenant' | 'landlord' | 'inmobiliaria'

export interface OpcionDePerfil {
  valor: ValorDePerfil
  /** La clave con la que el admin puede apagar el perfil en /admin/registration-profiles. */
  bandera: PerfilDeOnboarding
  titulo: string
  /** Qué va a poder hacer. Nada que el producto no tenga (Nico, 2026-09-07). */
  descripcion: string
  /**
   * Las definitivas de Nico (30-09) viven en `public/onboarding/` (1086×1448,
   * verticales, con el logo de Leasefy en azul). «Propietario» no tiene la
   * suya todavía y usa una foto de marca de `public/images/features`.
   */
  imagen: string
  /**
   * Dónde cae el encuadre (`object-position`): las fotos son verticales, la
   * tarjeta recorta en apaisado, y el logo tiene que quedar a la vista.
   */
  encuadre: string
}

/** El orden es el de la conversación: primero lo simple, al final lo que trae equipo. */
export const PERFILES: OpcionDePerfil[] = [
  {
    valor: 'tenant',
    bandera: 'tenant',
    titulo: 'Inquilino',
    descripcion: 'Encuentra dónde vivir, aplica a un arriendo y págalo desde un solo lugar.',
    imagen: '/onboarding/perfil-inquilino.jpg',
    // El cuadro con el logo ocupa el tercio superior; este encuadre lo deja
    // entero también en el recorte cuadrado de la columna compacta.
    encuadre: '50% 40%',
  },
  {
    valor: 'landlord',
    bandera: 'landlord',
    titulo: 'Propietario',
    descripcion: 'Arrienda tu propiedad con Leasefy.',
    imagen: '/images/features/leasefy-brand-14.jpg',
    encuadre: '50% 55%',
  },
  {
    valor: 'inmobiliaria',
    bandera: 'agency',
    titulo: 'Inmobiliaria',
    descripcion: 'Gestiona los inmuebles de tus propietarios con tu equipo: contratos, cobros y pagos.',
    imagen: '/onboarding/perfil-inmobiliaria.jpg',
    // El neón azul queda a media altura del muro; centrado apenas arriba
    // sobrevive al cuadrado de la columna compacta y a la miniatura de 44 px.
    encuadre: '50% 45%',
  },
]

export const PERFIL_INMOBILIARIA = PERFILES.find((perfil) => perfil.valor === 'inmobiliaria')!
