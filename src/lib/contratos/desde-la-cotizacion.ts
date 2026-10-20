/**
 * COTIZ-17 (QA de los agentes 19-10-2026, Nico «Nuevo contrato prellenado»):
 * el aviso de «Nuevo contrato» cuando llega desde una cotización de
 * asegurabilidad. «Viene de la cotización de asegurabilidad de Ana: el
 * nombre, el canon y Mapfre como respaldo ya están puestos. Completa…».
 */

function enLista(cosas: readonly string[]): string {
  if (cosas.length <= 1) return cosas[0] ?? ''
  return `${cosas.slice(0, -1).join(', ')} y ${cosas[cosas.length - 1]}`
}

export function fraseDeLaCotizacion(d: { nombre: string | null; aseguradora: string | null }): string {
  const puestos = [d.nombre ? 'el nombre' : null, 'el canon', d.aseguradora ? `${d.aseguradora} como respaldo` : null].filter(
    (x): x is string => x !== null,
  )
  const verbo = puestos.length === 1 ? 'ya está puesto' : 'ya están puestos'
  return `Viene de la cotización de asegurabilidad${d.nombre ? ` de ${d.nombre}` : ''}: ${enLista(puestos)} ${verbo}. Completa el inmueble, la cédula y las fechas.`
}
