/**
 * equipo-de-pagos — la pantalla «Agente de pagos» dice la verdad.
 *
 * Lo que se cuida:
 *   · el estado sale de lo que CONTESTÓ el micro, y «no contestó» nunca se
 *     lee como «apagado»;
 *   · cada paso de «Qué necesita para trabajar» sale de una lectura real;
 *   · el tablero que todavía no existe (404/503) es «falta», no un error;
 *   · el equipo no repite las pantallas que se mudaron: las enlaza, y cada
 *     enlace va a una ruta que existe y que no es la del propio equipo.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect } from 'vitest'

import type { GobiernoItem } from '@/lib/api/piloto'
import { modulosDelPanel, pestanasDelModulo } from '@/lib/nav/arquitectura-del-panel'
import {
  AGENTE_GOBERNADO,
  EQUIPO_DE_PAGOS,
  estadoDelEquipo,
  pasosParaQueTrabaje,
  type LecturaDelGobierno,
  type LecturaDelTablero,
} from './equipo-de-pagos'

const item = (disponibleGlobal: boolean, corre: boolean): GobiernoItem => ({
  agente: AGENTE_GOBERNADO,
  disponibleGlobal,
  corre,
  origen: 'heredado',
})

const listo = (i: GobiernoItem | null): LecturaDelGobierno => ({ estado: 'listo', item: i })
const noDisponible: LecturaDelTablero = { estado: 'no-disponible' }

describe('estadoDelEquipo', () => {
  it('con el interruptor general apagado: apagado, aunque la inmobiliaria lo herede', () => {
    expect(estadoDelEquipo(listo(item(false, false)))).toBe('apagado-en-leasefy')
  })

  it('encendido en el servidor y apagado para la inmobiliaria', () => {
    expect(estadoDelEquipo(listo(item(true, false)))).toBe('apagado-para-tu-inmobiliaria')
  })

  it('encendido de verdad sólo con las dos llaves', () => {
    expect(estadoDelEquipo(listo(item(true, true)))).toBe('encendido')
  })

  it('🔴 si el micro no contestó, o no lista al equipo, es «sin verificar» — nunca «apagado»', () => {
    expect(estadoDelEquipo({ estado: 'fallo' })).toBe('sin-verificar')
    expect(estadoDelEquipo(listo(null))).toBe('sin-verificar')
  })

  it('mientras pregunta, no afirma nada', () => {
    expect(estadoDelEquipo({ estado: 'cargando' })).toBe('cargando')
  })
})

describe('pasosParaQueTrabaje', () => {
  const estados = (g: LecturaDelGobierno, t: LecturaDelTablero) =>
    pasosParaQueTrabaje(g, t).map((p) => [p.id, p.estado])

  it('hoy (interruptor apagado, tablero sin publicar): falta Leasefy, lo de la inmobiliaria espera, falta el tablero', () => {
    expect(estados(listo(item(false, false)), noDisponible)).toEqual([
      ['leasefy', 'falta'],
      ['inmobiliaria', 'espera'],
      ['tablero', 'falta'],
    ])
  })

  it('encendido en el servidor pero no para la inmobiliaria: dice quién lo enciende y dónde', () => {
    const pasos = pasosParaQueTrabaje(listo(item(true, false)), noDisponible)
    expect(pasos.map((p) => p.estado)).toEqual(['hecho', 'falta', 'falta'])
    expect(pasos[1]!.detalle).toContain('Inicio')
    expect(pasos[1]!.detalle).toContain('Autonomía')
  })

  it('🔴 se prende sola: con las dos llaves y el tablero publicado, todo listo', () => {
    expect(pasosParaQueTrabaje(listo(item(true, true)), { estado: 'listo' }).map((p) => p.estado)).toEqual([
      'hecho',
      'hecho',
      'hecho',
    ])
  })

  it('🔴 una lectura que falló dice «sin verificar», nunca «falta»', () => {
    expect(estados({ estado: 'fallo' }, { estado: 'fallo', error: new Error('500') })).toEqual([
      ['leasefy', 'sin-verificar'],
      ['inmobiliaria', 'sin-verificar'],
      ['tablero', 'sin-verificar'],
    ])
  })

  it('un tablero que no existe (404) o está apagado (503) es «falta», no un error', () => {
    const tablero = pasosParaQueTrabaje(listo(item(false, false)), noDisponible)[2]!
    expect(tablero.estado).toBe('falta')
    expect(tablero.detalle).toContain('sola')
  })

  it('mientras pregunta, los tres pasos dicen que están consultando', () => {
    expect(pasosParaQueTrabaje({ estado: 'cargando' }, { estado: 'cargando' }).map((p) => p.estado)).toEqual([
      'cargando',
      'cargando',
      'cargando',
    ])
  })

  it('ningún texto nombra una variable de entorno: le habla a la inmobiliaria', () => {
    const textos = [
      ...pasosParaQueTrabaje(listo(item(false, false)), noDisponible),
      ...pasosParaQueTrabaje(listo(item(true, false)), noDisponible),
    ].map((p) => p.detalle)
    for (const t of textos) expect(t).not.toMatch(/_ENABLED|PAGOS_|\/api\//)
  })
})

describe('EQUIPO_DE_PAGOS', () => {
  const APP = join(process.cwd(), 'src/app/panel/inmobiliaria')
  const P = '/panel/inmobiliaria'

  it('son los seis del micro: Gabriela coordina y cinco especialistas', () => {
    expect(EQUIPO_DE_PAGOS.map((e) => e.id)).toEqual(['gabriela', 'laura', 'nicolas', 'valentina', 'samuel', 'sofia'])
  })

  it('quien no tiene pantalla propia lo dice, y quien la tiene no trae ese texto', () => {
    for (const e of EQUIPO_DE_PAGOS) {
      if (e.dondeSeVe === null) expect(e.sinPantalla, e.id).toBeTruthy()
      else expect(e.sinPantalla, e.id).toBeUndefined()
    }
  })

  it('🔴 cada enlace va a una pantalla que existe, con el MISMO gate que tiene en el menú', () => {
    const todas = modulosDelPanel().flatMap((m) => pestanasDelModulo(m))
    for (const e of EQUIPO_DE_PAGOS) {
      if (!e.dondeSeVe) continue
      const { href, module, roles } = e.dondeSeVe
      expect(existsSync(join(APP, href.replace(P, ''), 'page.tsx')), href).toBe(true)
      // La pantalla del menú de la que cuelga (la pestaña de Cartera o de
      // Cobranza hereda el gate de su sección).
      const duena = todas
        .filter((p) => href === p.href || href.startsWith(`${p.href}/`))
        .sort((a, b) => b.href.length - a.href.length)[0]
      expect(duena, href).toBeTruthy()
      expect(module, href).toBe(duena!.module)
      expect(roles ?? [], href).toEqual(duena!.roles ?? [])
    }
  })

  it('🔴 no repite lo que se mudó: enlaza a Cobranza y a Liquidaciones, nunca a su propia ruta', () => {
    const hrefs = EQUIPO_DE_PAGOS.flatMap((e) => (e.dondeSeVe ? [e.dondeSeVe.href] : []))
    for (const h of hrefs) expect(h.startsWith(`${P}/pagos/agente`), h).toBe(false)
    expect(hrefs).toContain(`${P}/pagos/cobranza/fallidos`)
    expect(hrefs).toContain(`${P}/pagos/cobranza/recordatorios`)
    expect(hrefs).toContain(`${P}/pagos/liquidaciones`)
  })
})
