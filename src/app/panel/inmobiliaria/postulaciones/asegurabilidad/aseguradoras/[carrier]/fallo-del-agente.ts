import { ApiError } from '@/lib/api/client'

/**
 * Los hooks del agente (`use-carrier-detail`, `use-carrier-sla`) guardan el
 * fallo como TEXTO: el status HTTP que respondió el agente («502») o el mensaje
 * del `fetch` que ni llegó («Failed to fetch»).
 *
 * `FalloDeCarga` decide qué decir por el status —un 404 no se reintenta, un
 * 502 sí—, así que se le devuelve un `ApiError`: con tres dígitos es un status;
 * sin ellos no hubo respuesta, que es un fallo de red (status 0).
 *
 * Antes la pantalla pintaba «…errorLoading: 502» con la clave i18n cruda
 * delante del número.
 */
export function falloDelAgente(error: string): ApiError {
  const texto = error.trim()
  const status = /^\d{3}$/.test(texto) ? Number(texto) : 0
  return new ApiError(status, texto)
}
