/**
 * El saludo por el nombre, cuando hay un nombre de verdad.
 *
 * `user.name` cae al correo mientras la persona no haya completado su perfil —y
 * en la pantalla de elegir perfil eso es lo NORMAL, porque el nombre se pide
 * después—, así que partirlo por el espacio dejaba el correo entero de título:
 * «Hola, pruebasarrendador1902+qaonb0904@gmail.com», a tamaño de encabezado y
 * en dos renglones.
 */
export function saludo(nombre: string | null | undefined): string {
  const limpio = (nombre ?? '').trim()
  if (!limpio || limpio.includes('@')) return 'Bienvenido a Leasefy'
  return `Hola, ${limpio.split(/\s+/)[0]}`
}
