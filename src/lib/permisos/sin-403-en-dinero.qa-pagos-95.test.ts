/**
 * 🔴 N-15 / H-02 (QA-PAGOS-95, 05-10-2026): «Contador: 0 respuestas 403 en una
 * vuelta por Dinero». En el navegador el contador recibía 403 en Cobros
 * emitidos (`/inmobiliaria/config`, `/inmobiliaria/consignaciones`), Reglas de
 * mora y Dispersiones (`/inmobiliaria/config`), Lotes (`/inmobiliaria/agentes`),
 * Auditoría de cobranza (`/inmobiliaria/agency/members`) y Disputas (el micro).
 * La pantalla se veía bien —el 403 se tragaba—, pero cada visita le pedía al
 * back algo que no le correspondía. Ahora esas lecturas se piden SÓLO con su
 * permiso.
 *
 * Los hooks se prueban montados; las páginas, por su texto (como los
 * guardianes de `src/app/panel/inmobiliaria/*.test.ts`): montarlas con sus
 * providers cuesta mucho más y falla por motivos que no son éste.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getAllAgentes, agentFetchMock, permisos } = vi.hoisted(() => ({
  getAllAgentes: vi.fn(async () => [{ userId: 'u-1', name: 'Ana Ruiz', email: 'ana@inmo.co' }]),
  agentFetchMock: vi.fn(async () => new Response('[]', { status: 200 })),
  permisos: { puede: false },
}))

vi.mock('@/lib/api/inmobiliaria.service', () => ({ agentesApi: { getAll: getAllAgentes } }))
vi.mock('@/lib/api/agent-fetch', () => ({ agentFetch: agentFetchMock }))
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ user: { id: 'u-1' }, agency: { id: 'ag-1' } }) }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'u-1' }, agency: { id: 'ag-1' } }) }))
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => permisos.puede, isLoading: false }),
}))

const { renderHook } = await import('@/lib/hooks/__test-utils__/render-hook')
const { useNombresDelEquipo } = await import('@/components/dispersiones/lotes/use-nombres-del-equipo')
const { useDisputes } = await import('@/lib/hooks/cobranza/use-disputes')

beforeEach(() => {
  getAllAgentes.mockClear()
  agentFetchMock.mockClear()
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test'
})

describe('N-15 · los hooks no piden lo que el rol no ve', () => {
  it('🔴 Lotes: sin `agentes:view` no se pide la lista de agentes (el nombre lo trae el back)', async () => {
    permisos.puede = false
    await renderHook(() => useNombresDelEquipo())
    expect(getAllAgentes).not.toHaveBeenCalled()

    permisos.puede = true
    await renderHook(() => useNombresDelEquipo())
    expect(getAllAgentes).toHaveBeenCalledTimes(1)
  })

  it('🔴 Disputas: `activo: false` no le pregunta al micro', async () => {
    const r = await renderHook(() => useDisputes({ activo: false }))
    expect(agentFetchMock).not.toHaveBeenCalled()
    expect(r.isLoading).toBe(false)

    await renderHook(() => useDisputes({}))
    expect(agentFetchMock).toHaveBeenCalled()
  })
})

const RAIZ = join(process.cwd(), 'src')
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf8')

describe('N-15 · las pantallas condicionan la lectura a su permiso', () => {
  it('🔴 Cobros emitidos: inmuebles y propietarios, cada uno con su permiso (la configuración ya no se pide: B-09)', () => {
    const p = leer('app/panel/inmobiliaria/pagos/cartera/cobros/page.tsx')
    expect(p).toMatch(/useConsignaciones\(undefined, \{\s*skip: !conPermiso\('portafolio'\)/)
    expect(p).toMatch(/usePropietarios\(undefined, \{\s*skip: !conPermiso\('propietarios'\)/)
    expect(p).not.toMatch(/useInmobiliariaConfig\(/)
  })

  it('🔴 Reglas de mora pide la configuración sólo con `configuracion:view`', () => {
    expect(leer('components/cobros/reglas-de-mora/ReglasDeMora.tsx')).toMatch(
      /useInmobiliariaConfig\(!permisosCargando && canAccess\('configuracion', 'view'\)\)/,
    )
  })

  it('🔴 el detalle de una dispersión ya no pide la configuración (no la usaba)', () => {
    expect(leer('components/inmobiliaria/DispersionDetail.tsx')).not.toMatch(/useInmobiliariaConfig\(/)
  })

  it('🔴 Auditoría de cobranza pide el equipo sólo con `configuracion:view`', () => {
    const p = leer('app/panel/inmobiliaria/pagos/cobranza/compliance/audit/page.tsx')
    expect(p).toMatch(/canAccess\('configuracion', 'view'\)/)
    expect(p).toMatch(/if \(!veElEquipo\) return/)
  })

  it('🔴 H-04: «Generar los cobros» se apaga sin `cobros:create` y el engranaje sin ser administrador (antes: prendidos y 403 al guardar)', () => {
    const p = leer('app/panel/inmobiliaria/pagos/cartera/cobros/page.tsx')
    const generar = p.slice(p.indexOf('data-testid="abrir-generar-cobros"') - 400, p.indexOf('data-testid="abrir-generar-cobros"'))
    expect(generar).toMatch(/disabled=\{!puedeHacerRecibo\}/)
    // B-09/N-28 (r2): el engranaje de «Configurar recordatorios» ya no existe.
    expect(p).not.toContain('data-testid="configuracion-de-cobros"')
  })

  it('🔴 Disputas no se piden sin `cobranza:intervene`', () => {
    expect(leer('app/panel/inmobiliaria/pagos/cobranza/disputas/page.tsx')).toMatch(
      /activo: !permisosCargando && puedeActuar/,
    )
  })
})
