/**
 * `confirmar()` / `avisar()` — las que reemplazan a `window.confirm` / `alert`.
 *
 * Se monta de verdad: el primer pedido monta el anfitrión de Cadence en
 * `document.body` y el modal sale por ahí. Lo que se fija es lo que el
 * `confirm()` del navegador NO daba: la semántica de alerta, el tipo
 * (destructivo, error…), que «Cancelar» devuelva `false`, que el trabajo
 * adentro deje el botón cargando y el modal abierto si falla, y que dos
 * pedidos seguidos salgan uno a la vez.
 */

import { act } from 'react'
import { describe, it, expect, afterEach } from 'vitest'

import { confirmar, avisar } from './confirmar'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const esperar = (ms = 0) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })

const modal = () =>
  document.querySelector<HTMLElement>('[role="alertdialog"], [role="dialog"]')

const boton = (texto: string) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    (b) => b.textContent?.trim() === texto,
  )

/** Dispara un pedido adentro de `act`: el anfitrión se monta y pinta ahí. */
async function pedir(disparar: () => void) {
  await act(async () => {
    disparar()
    await new Promise((r) => setTimeout(r, 0))
  })
}

async function tocar(texto: string) {
  const b = boton(texto)
  if (!b) throw new Error(`No hay un botón «${texto}»`)
  await act(async () => {
    b.click()
  })
}

afterEach(async () => {
  // El anfitrión saca el pedido de la cola después de la salida animada.
  await esperar(300)
  expect(modal(), 'quedó un modal abierto entre pruebas').toBeNull()
})

describe('confirmar()', () => {
  it('una destructiva sale como alerta roja, con título y descripción enlazados', async () => {
    let respuesta: boolean | undefined
    await pedir(() => void confirmar({
      destructivo: true,
      titulo: '¿Eliminar a Laura Gómez del equipo?',
      descripcion: 'Pierde el acceso al panel ya mismo. Sus gestiones se conservan.',
      accion: 'Eliminar del equipo',
    }).then((r) => (respuesta = r)))

    const m = modal()
    expect(m?.getAttribute('role')).toBe('alertdialog')
    expect(m?.getAttribute('data-variant')).toBe('destructive')
    // El z del panel: por encima de los headers fijos.
    expect(m?.className).toContain('z-[300]')

    const titulo = document.getElementById(m?.getAttribute('aria-labelledby') ?? '')
    const descripcion = document.getElementById(m?.getAttribute('aria-describedby') ?? '')
    expect(titulo?.textContent).toBe('¿Eliminar a Laura Gómez del equipo?')
    expect(descripcion?.textContent).toContain('Pierde el acceso')

    // Sin ✕: de una alerta se sale por Cancelar o por la acción.
    expect(document.querySelector('[aria-label="Cerrar"]')).toBeNull()
    // El botón principal sale rojo solo, por la variante.
    expect(boton('Eliminar del equipo')?.className).toContain('bg-danger')

    await tocar('Eliminar del equipo')
    expect(respuesta).toBe(true)
  })

  it('«Cancelar» devuelve false y no corre el trabajo', async () => {
    let corrio = false
    let respuesta: boolean | undefined
    await pedir(() => void confirmar({
      titulo: '¿Enviar el reporte a Carlos Mejía?',
      descripcion: 'Queda marcado como enviado al propietario.',
      accion: 'Enviar',
      alConfirmar: () => {
        corrio = true
      },
    }).then((r) => (respuesta = r)))

    expect(modal()?.getAttribute('data-variant')).toBe('confirm')
    await tocar('Cancelar')
    await esperar()
    expect(respuesta).toBe(false)
    expect(corrio).toBe(false)
  })

  it('con el trabajo adentro: carga, sigue abierto si falla y cierra cuando sale bien', async () => {
    let intentos = 0
    let terminar: () => void = () => {}
    let respuesta: boolean | undefined
    await pedir(() => void confirmar({
      titulo: '¿Enviar los 42 recordatorios?',
      descripcion: 'Les llega por correo a los 42 inquilinos con cuota vencida.',
      accion: 'Enviar',
      alConfirmar: () => {
        intentos += 1
        if (intentos === 1) return Promise.reject(new Error('sin red'))
        return new Promise<void>((r) => {
          terminar = r
        })
      },
    }).then((r) => (respuesta = r)))

    // 1.º intento: falla → el modal sigue abierto para reintentar.
    await tocar('Enviar')
    await esperar()
    expect(modal()).not.toBeNull()
    expect(boton('Enviar')?.getAttribute('aria-busy')).toBeNull()
    expect(respuesta).toBeUndefined()

    // 2.º intento: mientras corre, el botón carga (sin apagarse) y Cancelar se bloquea.
    await tocar('Enviar')
    expect(boton('Enviar')?.getAttribute('aria-busy')).toBe('true')
    expect(boton('Cancelar')?.disabled).toBe(true)
    expect(modal()).not.toBeNull()

    await act(async () => {
      terminar()
    })
    await esperar()
    expect(respuesta).toBe(true)
  })

  it('sin descripción, el detalle del cuerpo es lo que describe la alerta', async () => {
    let respuesta: boolean | undefined
    await pedir(() => void confirmar({
      destructivo: true,
      titulo: '¿Botar la carga de inquilinos?',
      detalle: <p>Se pierden las 1.729 filas por revisar.</p>,
      accion: 'Botar la carga',
    }).then((r) => (respuesta = r)))

    const m = modal()
    const descripcion = document.getElementById(m?.getAttribute('aria-describedby') ?? '')
    expect(descripcion?.textContent).toBe('Se pierden las 1.729 filas por revisar.')

    await tocar('Cancelar')
    await esperar()
    expect(respuesta).toBe(false)
  })

  it('dos pedidos seguidos salen de a uno y en orden', async () => {
    const respuestas: string[] = []
    const pregunta = (n: string) => ({ titulo: n, descripcion: `La ${n.toLowerCase()} pregunta.`, accion: `Sí, el ${n.toLowerCase()}` })
    await pedir(() => void confirmar(pregunta('Primero')).then(() => respuestas.push('1')))
    await pedir(() => void confirmar(pregunta('Segundo')).then(() => respuestas.push('2')))

    expect(document.querySelectorAll('[role="alertdialog"]')).toHaveLength(1)
    expect(boton('Sí, el primero')).toBeDefined()
    expect(boton('Sí, el segundo')).toBeUndefined()

    await tocar('Sí, el primero')
    await esperar(300)
    expect(boton('Sí, el segundo')).toBeDefined()
    await tocar('Sí, el segundo')
    expect(respuestas).toEqual(['1', '2'])
  })
})

describe('avisar()', () => {
  it('un error dice qué pasó, qué hacer y trae la referencia para soporte', async () => {
    let cerrado = false
    await pedir(() => void avisar({
      tipo: 'error',
      titulo: 'No pudimos enviar el lote a Wompi',
      descripcion: 'Wompi no respondió. Vuelve a intentarlo en unos minutos.',
      referencia: 'WOMPI_NO_RESPONDIO · 7f3a-29c1',
    }).then(() => (cerrado = true)))

    const m = modal()
    expect(m?.getAttribute('role')).toBe('dialog')
    expect(m?.getAttribute('data-variant')).toBe('error')
    expect(m?.textContent).toContain('No pudimos enviar el lote a Wompi')
    expect(m?.textContent).toContain('WOMPI_NO_RESPONDIO · 7f3a-29c1')

    await tocar('Entendido')
    await esperar()
    expect(cerrado).toBe(true)
  })

  it('un éxito con «Listo» en vez de «Entendido»', async () => {
    let cerrado = false
    await pedir(() =>
      void avisar({ tipo: 'exito', titulo: 'Pago registrado', entendido: 'Listo' }).then(
        () => (cerrado = true),
      ),
    )

    expect(modal()?.getAttribute('data-variant')).toBe('success')
    expect(boton('Entendido')).toBeUndefined()
    await tocar('Listo')
    await esperar()
    expect(cerrado).toBe(true)
  })
})
