/**
 * 🔴 /inquilino/para-ti mostraba «No pudimos cargar esto» (SER-) a todo el que
 * entraba: el servicio leía `res.recommendations[].property`, y el back
 * devuelve `{ data, meta }` con el inmueble aplanado y las fotos como
 * `{ url, order }` (2026-09-15). Estos tests fijan la forma REAL del back
 * (`RecommendationsService.getRecommendations` en back-erp).
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

const getMock = vi.fn()
vi.mock('./client', async (importOriginal) => {
  const real = await importOriginal<typeof import('./client')>()
  return { ...real, apiClient: { ...real.apiClient, get: (...a: unknown[]) => getMock(...a) } }
})

const { recommendationsApi, MAX_RECOMENDACIONES } = await import('./recommendations.service')

afterEach(() => vi.clearAllMocks())

const FILA_DEL_BACK = {
  id: 'prop-1',
  landlordId: 'land-1',
  agencyId: 'ag-1',
  title: 'Apartamento en Laureles',
  description: 'Luminoso',
  type: 'APARTMENT',
  status: 'AVAILABLE',
  listingType: 'RENT',
  city: 'Medellín',
  department: 'Antioquia',
  neighborhood: 'Laureles',
  address: 'Cra 76 # 33-10',
  latitude: null,
  longitude: null,
  monthlyRent: 2500000,
  salePrice: null,
  adminFee: 0,
  deposit: 0,
  bedrooms: 3,
  bathrooms: 2,
  area: 85,
  floor: null,
  parkingSpaces: null,
  stratum: 4,
  yearBuilt: null,
  amenities: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  images: [
    { id: 'i2', url: 'https://x.supabase.co/b.jpg', order: 1 },
    { id: 'i1', url: 'https://x.supabase.co/a.jpg', order: 0 },
  ],
  matchScore: 82,
  acceptanceProbability: 'alta',
  matchFactors: {
    affordability: { score: 90, label: 'Te alcanza' },
    riskFit: { score: 80, label: 'Buen perfil' },
    profileStrength: { score: 70, label: 'Completo' },
    preferences: { score: 60, label: 'En tu ciudad' },
  },
  recommendation: 'Esta propiedad es una excelente opcion para ti.',
}

describe('recommendationsApi.getMine', () => {
  it('lee `data` (no `recommendations`) y arma el inmueble con sus fotos ordenadas', async () => {
    getMock.mockResolvedValue({
      data: [FILA_DEL_BACK],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false },
    })

    const [r] = await recommendationsApi.getMine()

    expect(r.property.id).toBe('prop-1')
    expect(r.property.images).toEqual(['https://x.supabase.co/a.jpg', 'https://x.supabase.co/b.jpg'])
    expect(r.property.thumbnailUrl).toBe('https://x.supabase.co/a.jpg')
    expect(r.property.bedrooms).toBe(3)
    expect(r.matchScore).toBe(82)
    expect(r.acceptanceProbability).toBe('alta')
    expect(r.matchFactors.affordability).toEqual({ score: 90, label: 'Te alcanza' })
    expect(r.recommendation).toContain('excelente')
  })

  it('pide el máximo que acepta el back: sin límite devolvía sólo 9 y el catálogo pagina en el cliente', async () => {
    getMock.mockResolvedValue({ data: [], meta: {} })
    await recommendationsApi.getMine()
    expect(getMock).toHaveBeenCalledWith(`/recommendations?limit=${MAX_RECOMENDACIONES}`)
  })

  it('nunca pide más de 50: el DTO del back responde 400', async () => {
    getMock.mockResolvedValue({ data: [], meta: {} })
    await recommendationsApi.getMine(500)
    expect(getMock).toHaveBeenCalledWith('/recommendations?limit=50')
  })
})
