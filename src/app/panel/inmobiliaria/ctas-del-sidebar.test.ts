/**
 * Las dos tarjetas del pie del sidebar no pueden mandar a una pantalla que
 * rebote a quien las ve.
 *
 * · «Upgrade» apuntaba a `/panel/inmobiliaria/configuracion` — la RAÍZ, que es
 *   el perfil de la inmobiliaria: quien tocaba «mejorar el plan» aterrizaba en
 *   el formulario de NIT y dirección. La pantalla de planes con el cobro real
 *   (Wompi) es `/panel/inmobiliaria/upgrade`.
 * · Y se mostraba a todo miembro, aunque `/upgrade` es `PageGuard adminOnly`:
 *   un AGENTE/CONTADOR/VIEWER hacía clic y el guard lo devolvía a la portada
 *   sin decirle nada.
 * · «Invitar» lleva a `/configuracion/equipo`, detrás de `module: 'agentes'`.
 *   A quien no lo tiene lo expulsaba igual.
 *
 * Se mira el archivo y no el render: montar el layout entero pide una docena de
 * proveedores, y lo que hay que cuidar acá es una decisión de una línea. Es el
 * mismo método de `src/lib/nav/gates-del-panel.test.ts`.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect } from 'vitest'

const LAYOUT = join(process.cwd(), 'src/app/panel/inmobiliaria/layout.tsx')
const UPGRADE = join(process.cwd(), 'src/app/panel/inmobiliaria/upgrade/page.tsx')

const fuente = readFileSync(LAYOUT, 'utf8')

/** El valor de un prop del `<PlanSidebar>`, tal como está escrito. */
function prop(nombre: string): string | null {
  const m = fuente.match(new RegExp(`${nombre}=\\{?([^\\n]*)`))
  return m ? m[1].trim() : null
}

describe('las tarjetas del pie del sidebar', () => {
  it('🔴 «Upgrade» lleva a la pantalla de planes, no a la raíz de Configuración', () => {
    expect(fuente).toContain('upgradeHref="/panel/inmobiliaria/upgrade"')
    expect(fuente).not.toContain('upgradeHref="/panel/inmobiliaria/configuracion"')
  })

  it('🔴 «Upgrade» sólo al ADMIN: su destino es `PageGuard adminOnly`', () => {
    expect(readFileSync(UPGRADE, 'utf8')).toContain('adminOnly')
    const valor = prop('showUpgrade')
    expect(valor).toBeTruthy()
    // La condición del CTA nombra `isAdmin`: sin eso, el rol que no puede
    // abrirlo lo ve igual.
    expect(fuente).toMatch(/showUpgradeCta\s*=[^\n]*isAdmin/)
  })

  it('🔴 «Invitar» sólo a quien puede invitar, con el mismo gate que usa la pantalla de Equipo', () => {
    expect(fuente).toMatch(/puedeInvitarAlEquipo\s*=\s*isAdmin \|\| canAccess\('agentes', 'create'\)/)
    expect(prop('showInvite')).toContain('puedeInvitarAlEquipo')
    // Nunca incondicional otra vez.
    expect(fuente).not.toMatch(/^\s*showInvite\s*$/m)
  })

  it('el destino de «Invitar» es la sección Equipo de Configuración', () => {
    expect(fuente).toContain("router.push('/panel/inmobiliaria/configuracion/equipo')")
  })
})
