/**
 * armar-fila — construir lo que se manda al back a partir de una fila del
 * archivo y su mapeo de columnas.
 *
 * Separado de `MigrarContratos.tsx` por lo mismo que `leer-celdas.ts`: es
 * donde un dato ausente puede convertirse, en silencio, en un dato inventado.
 * `back/src/contracts/dto/migrar-contrato.dto.ts` valida con
 * `@IsOptional()` — que sólo salta `null`/`undefined`, NUNCA `''` — y con
 * `whitelist: true, forbidNonWhitelisted: true` en el pipe global
 * (`back/src/main.ts`). Un campo mandado como `''` en vez de ausente no se ve
 * como "no lo sé": choca contra `@IsDateString()`/`@IsEnum()` y tira TODO el
 * lote con 400, no sólo esa fila.
 *
 * Por eso cada campo opcional se manda `undefined` cuando no hay valor, y
 * NUNCA un default inventado (el 1 de pago, "vivienda", canon 0) — eso es
 * exactamente lo que el back necesita para poder marcar la fila con el
 * `faltante` correcto en vez de darla por buena con un dato que nadie puso.
 */

import type { CampoDeContrato, MapeoDeColumna } from './columnas-de-contrato'
import type { FilaAMigrar } from '@/lib/api/contracts.service'
import {
  comoEntero,
  comoFecha,
  comoPeriodicidad,
  comoUso,
  hayValor,
  textoOpcional,
  valorDe,
} from './leer-celdas'

export function armarFilaAMigrar(
  fila: Record<string, unknown>,
  mapeo: MapeoDeColumna[],
): FilaAMigrar {
  const v = (campo: CampoDeContrato) => valorDe(fila, mapeo, campo)

  const rawInicio = v('fechaInicio')
  const rawFin = v('fechaFin')
  const rawCanon = v('canon')
  const rawDeposito = v('deposito')
  const rawDia = v('diaDePago')
  const rawUso = v('uso')

  const dia = hayValor(rawDia) ? comoEntero(rawDia) : undefined

  return {
    // Estructuralmente obligatorios en el DTO — nunca se omiten, aunque
    // viajen vacíos (`migrar-contrato.dto.ts`: `direccion` e `inquilino` no
    // llevan `@IsOptional()`).
    direccion: String(v('direccionInmueble') ?? ''),
    inquilino: {
      nombre: String(v('inquilinoNombre') ?? ''),
      correo: String(v('inquilinoCorreo') ?? ''),
      telefono: textoOpcional(v('inquilinoTelefono')),
      documento: textoOpcional(v('inquilinoDocumento')),
    },
    startDate: hayValor(rawInicio) ? comoFecha(rawInicio) : undefined,
    endDate: hayValor(rawFin) ? comoFecha(rawFin) : undefined,
    monthlyRent: hayValor(rawCanon) ? comoEntero(rawCanon) : undefined,
    deposit: hayValor(rawDeposito) ? comoEntero(rawDeposito) : undefined,
    // X5: un día de pago ausente o fuera de [1,28] viaja ausente, nunca
    // fabricado como "el 1" — eso es lo que hacía que 1383 filas quedaran
    // fechadas al 1 de todos los meses sin que nadie lo pidiera.
    paymentDay: dia !== undefined && dia >= 1 && dia <= 28 ? dia : undefined,
    usoInmueble: hayValor(rawUso) ? comoUso(rawUso) : undefined,
    periodicidad: comoPeriodicidad(v('periodicidad')),
    comisionPorcentaje: v('comision') != null ? Number(v('comision')) || undefined : undefined,
  }
}
