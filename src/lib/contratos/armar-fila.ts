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
  comoPorcentaje,
  comoUso,
  hayValor,
  MAX_COP_POR_MOVIMIENTO,
  textoOpcional,
  valorDe,
} from './leer-celdas'

/**
 * Plata de contrato: además de legible tiene que ser POSIBLE. Un canon
 * negativo no es un canon (y contra el `@Min(0)` del back tumba el lote
 * entero con 400, no la fila), y uno que supera el INT4 de Postgres tampoco.
 * Los dos casos vuelven ausentes → faltante visible de ESA fila.
 */
function plataDeContrato(v: unknown): number | undefined {
  if (!hayValor(v)) return undefined
  const n = comoEntero(v)
  if (n === undefined || n < 0 || n > MAX_COP_POR_MOVIMIENTO) return undefined
  return n
}

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
    monthlyRent: plataDeContrato(rawCanon),
    deposit: plataDeContrato(rawDeposito),
    // X5: un día de pago ausente o fuera de [1,28] viaja ausente, nunca
    // fabricado como "el 1" — eso es lo que hacía que 1383 filas quedaran
    // fechadas al 1 de todos los meses sin que nadie lo pidiera.
    paymentDay: dia !== undefined && dia >= 1 && dia <= 28 ? dia : undefined,
    usoInmueble: hayValor(rawUso) ? comoUso(rawUso) : undefined,
    periodicidad: comoPeriodicidad(v('periodicidad')),
    // «0» es una comisión real (0% existe); «10%» y «10,5» son humanos; 110
    // no es un porcentaje. `Number(v) || undefined` convertía el 0 en «no hay
    // dato» — el único caso en que un valor escrito desaparecía en silencio.
    comisionPorcentaje: comoPorcentaje(v('comision')),
    // El «#144» de Inmuebles: gana a la dirección en el back. Un código que
    // no es un entero positivo viaja ausente (un «A-12» del sistema viejo no
    // es nuestro consecutivo) — el back lo diría con 400 para TODO el lote.
    codigoInmueble: codigoDeInmueble(v('codigoInmueble')),
    ciudad: textoOpcional(v('ciudadInmueble'))?.slice(0, 50),
    ...propietarioDe(v),
  }
}

function codigoDeInmueble(raw: unknown): number | undefined {
  if (!hayValor(raw)) return undefined
  const texto = String(raw).trim().replace(/^#/, '')
  if (!/^\d+$/.test(texto)) return undefined
  const n = Number(texto)
  return Number.isSafeInteger(n) && n >= 1 ? n : undefined
}

/**
 * El propietario del archivo viaja en la fila (Nico, 2026-09-02: «que tome el
 * que viene desde la migración»). Sólo con documento: sin él no hay ficha que
 * resolver ni crear, y el nombre solo se presta a homónimos. En blanco no
 * viaja nada.
 */
function propietarioDe(
  v: (campo: CampoDeContrato) => unknown,
): Pick<FilaAMigrar, 'propietario'> {
  const documento = textoOpcional(v('propietarioDocumento'))
  if (!documento) return {}
  return {
    propietario: {
      documento,
      nombre: textoOpcional(v('propietarioNombre')),
      correo: textoOpcional(v('propietarioCorreo')),
      telefono: textoOpcional(v('propietarioTelefono')),
    },
  }
}
