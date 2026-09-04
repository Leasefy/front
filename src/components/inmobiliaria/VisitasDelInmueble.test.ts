import { describe, it, expect } from 'vitest'
import { franjasDe, resumenDeLaSemana } from './VisitasDelInmueble'
import { DEFAULT_AVAILABILITY_SCHEDULE, type AvailabilitySchedule } from '@/lib/types/property'

const vacio = (): AvailabilitySchedule =>
  JSON.parse(
    JSON.stringify({
      monday: { enabled: false, ranges: [] },
      tuesday: { enabled: false, ranges: [] },
      wednesday: { enabled: false, ranges: [] },
      thursday: { enabled: false, ranges: [] },
      friday: { enabled: false, ranges: [] },
      saturday: { enabled: false, ranges: [] },
      sunday: { enabled: false, ranges: [] },
    }),
  )

describe('franjasDe', () => {
  it('sin horarios no hay visitas: ese es el interruptor', () => {
    expect(franjasDe(null)).toBe(0)
    expect(franjasDe(vacio())).toBe(0)
  })

  it('un día prendido pero sin franjas tampoco cuenta', () => {
    const s = vacio()
    s.monday.enabled = true
    expect(franjasDe(s)).toBe(0)
  })

  it('cuenta las franjas de los días prendidos', () => {
    const s = vacio()
    s.monday.enabled = true
    s.monday.ranges = [
      { start: '09:00', end: '12:00' },
      { start: '14:00', end: '17:00' },
    ]
    s.friday.enabled = true
    s.friday.ranges = [{ start: '09:00', end: '12:00' }]
    expect(franjasDe(s)).toBe(3)
  })

  it('un día apagado no aporta aunque tenga franjas guardadas', () => {
    const s = vacio()
    s.monday.ranges = [{ start: '09:00', end: '12:00' }]
    expect(franjasDe(s)).toBe(0)
  })

  it('la semana por defecto sí prende las visitas', () => {
    expect(franjasDe(DEFAULT_AVAILABILITY_SCHEDULE)).toBeGreaterThan(0)
  })
})

describe('resumenDeLaSemana', () => {
  it('sin horarios no dice nada', () => {
    expect(resumenDeLaSemana(null)).toBe('')
    expect(resumenDeLaSemana(vacio())).toBe('')
  })

  it('nombra los días en orden, empezando por el lunes', () => {
    const s = vacio()
    s.friday.enabled = true
    s.friday.ranges = [{ start: '09:00', end: '12:00' }]
    s.monday.enabled = true
    s.monday.ranges = [{ start: '09:00', end: '12:00' }]
    expect(resumenDeLaSemana(s)).toBe('Lun · Vie')
  })

  it('un día prendido sin franjas no se nombra', () => {
    const s = vacio()
    s.monday.enabled = true
    s.tuesday.enabled = true
    s.tuesday.ranges = [{ start: '09:00', end: '12:00' }]
    expect(resumenDeLaSemana(s)).toBe('Mar')
  })
})
