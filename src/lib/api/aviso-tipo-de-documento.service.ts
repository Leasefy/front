/**
 * AVISO-TIPO-DOC (05-10-2026): el aviso de los propietarios cuyo documento frena
 * la factura por mandato.
 *
 *   GET /inmobiliaria/facturacion/aviso-tipo-de-documento
 *
 * Sólo administrador, o contador que edita propietarios (`QuienEntraAFacturacionGuard`
 * + `propietarios:edit` en el back). Lo que llega se lee con `leerAviso`: el
 * título, el detalle y la cifra del mes los escribe el back.
 */
import { apiClient } from './client'
import { leerAviso, type AvisoDeTipoDeDocumento } from '@/lib/propietarios/aviso-tipo-de-documento'

export const avisoTipoDeDocumentoApi = {
  delMes: async (): Promise<AvisoDeTipoDeDocumento | null> =>
    leerAviso(await apiClient.get<unknown>('/inmobiliaria/facturacion/aviso-tipo-de-documento')),
}
