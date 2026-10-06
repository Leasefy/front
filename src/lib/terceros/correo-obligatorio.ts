/**
 * La política «correo obligatorio» de la inmobiliaria (17-09;
 * `exige_correo_del_tercero`, NULL = exigido), para «Nuevo inquilino» y el
 * formulario del propietario (QA-INQ I-18, QA-PROP PR-02).
 *
 * SEGUIMIENTO-FRONT (03-10-2026): el back la publica ya RESUELTA en
 * `GET /inmobiliaria/agency` (`exigeCorreoDelTercero`), que ven TODOS los roles.
 * Hasta hoy se leía sólo de `terceros-sin-correo` (Facturación, con
 * `cobros:view`): al asesor —que crea inquilinos y propietarios— no se le podía
 * decir que el correo era obligatorio y se enteraba al fallar. Quien tiene
 * `cobros:view` la sigue leyendo de donde siempre (la misma política, sin
 * cambiar lo que ya funcionaba); quien no, de la agencia.
 *
 * `null` = no se sabe (falló, o un back anterior sin el campo): el campo queda
 * opcional y decide el back (su `FALTA_CORREO_DEL_TERCERO` va bajo Correo).
 */

import { agencyApi } from '@/lib/api/inmobiliaria.service';
import { facturacionElectronicaService } from '@/lib/api/facturacion-electronica.service';

export async function leerCorreoObligatorio(
  tipo: 'INQUILINO' | 'PROPIETARIO',
  puedeLeerFacturacion: boolean,
): Promise<boolean | null> {
  if (puedeLeerFacturacion) {
    try {
      const r = await facturacionElectronicaService.tercerosSinCorreo(tipo);
      return r.exigido === true;
    } catch {
      return null;
    }
  }
  try {
    const agencia = (await Promise.resolve().then(() => agencyApi.getMyAgency())) as unknown as Record<
      string,
      unknown
    > | null;
    return agencia && typeof agencia.exigeCorreoDelTercero === 'boolean' ? agencia.exigeCorreoDelTercero : null;
  } catch {
    return null;
  }
}
