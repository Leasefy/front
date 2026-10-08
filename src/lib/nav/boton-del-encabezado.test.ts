/**
 * boton-del-encabezado — las pantallas que se abren desde la barra de arriba
 * marcan el botón que las abre (08-10-2026: el barrido las dejó sin ninguna
 * marca).
 */

import { describe, expect, it } from 'vitest'

import { botonDelEncabezadoActivo } from './boton-del-encabezado'

const P = '/panel/inmobiliaria'

describe('botonDelEncabezadoActivo', () => {
  it('🔴 procesos, notificaciones y perfil marcan su botón', () => {
    expect(botonDelEncabezadoActivo(`${P}/procesos`)).toBe('procesos')
    expect(botonDelEncabezadoActivo(`${P}/notificaciones`)).toBe('notificaciones')
    expect(botonDelEncabezadoActivo(`${P}/perfil`)).toBe('cuenta')
  })

  it('configuración, con sus secciones, marca el avatar', () => {
    expect(botonDelEncabezadoActivo(`${P}/configuracion`)).toBe('cuenta')
    expect(botonDelEncabezadoActivo(`${P}/configuracion/equipo`)).toBe('cuenta')
  })

  it('las notificaciones DENTRO de configuración son de la cuenta, no de la campana', () => {
    expect(botonDelEncabezadoActivo(`${P}/configuracion/notificaciones`)).toBe('cuenta')
  })

  it('el propietario y el inquilino también', () => {
    expect(botonDelEncabezadoActivo('/panel/notificaciones')).toBe('notificaciones')
    expect(botonDelEncabezadoActivo('/inquilino/perfil')).toBe('cuenta')
  })

  it('ignora la query y respeta el borde del segmento', () => {
    expect(botonDelEncabezadoActivo(`${P}/procesos?tipo=facturas`)).toBe('procesos')
    expect(botonDelEncabezadoActivo(`${P}/procesosviejos`)).toBeNull()
  })

  it('en el resto del panel no marca ninguno', () => {
    expect(botonDelEncabezadoActivo(P)).toBeNull()
    expect(botonDelEncabezadoActivo(`${P}/pagos/cartera`)).toBeNull()
    expect(botonDelEncabezadoActivo(null)).toBeNull()
  })
})
