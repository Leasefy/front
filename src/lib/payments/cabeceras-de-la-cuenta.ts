/**
 * «Cambiar de cuenta» en las rutas de pago del inquilino (servidor).
 *
 * El back decide el papel de la petición con `x-cuenta` / `x-inmobiliaria` y
 * exige el de inquilino en los pagos: quien además es de una inmobiliaria sólo
 * lo cumple si la ruta de Next las reenvía junto al JWT. Reenvía sólo las que
 * el navegador mandó; no inventa ninguna.
 */
export function cabecerasDeLaCuentaQueLlegan(req: Request): Record<string, string> {
  const salida: Record<string, string> = {}
  for (const nombre of ['x-cuenta', 'x-inmobiliaria']) {
    const valor = req.headers.get(nombre)
    if (valor) salida[nombre] = valor
  }
  return salida
}
