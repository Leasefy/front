/**
 * avaluos-ia — las dos pantallas que AFIRMABAN haber enviado algo.
 *
 * `/enviar` decía «Reporte enviado a Carlos · Se lo enviamos por WhatsApp»
 * y `/monitoreo` decía «Propuesta enviada a Carlos · Le pedimos aprobar el
 * nuevo canon». Los dos botones hacían lo mismo: `setSent(true)` /
 * `setAplicado(true)`. Ni un POST, ni una cola, ni un log. Un propietario que
 * nunca recibió nada y un asesor convencido de que ya lo mandó.
 *
 * El índice de la carpeta (`avaluos-ia/page.tsx`) ya redirige al módulo real
 * desde que se consolidó; estas dos quedaron vivas por URL directa. Ahora
 * hacen lo mismo.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// No relanza: en Next `redirect()` corta el render con una excepción, pero acá
// lo único que interesa es A DÓNDE manda.
const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));

vi.mock('next/navigation', () => ({ redirect: redirectMock }));

import EnviarReporteRetiradoPage from './enviar/page';
import MonitoreoRetiradoPage from './monitoreo/page';
import AvaluosIaLegacyRedirectPage from './page';

const DESTINO = '/panel/inmobiliaria/inmuebles/avaluos';

beforeEach(() => redirectMock.mockClear());

describe('avaluos-ia — rutas que afirmaban envíos que no ocurrían', () => {
  it('/enviar ya no sostiene «Reporte enviado»: redirige al módulo real', () => {
    EnviarReporteRetiradoPage();
    expect(redirectMock).toHaveBeenCalledWith(DESTINO);
  });

  it('/monitoreo ya no sostiene «Propuesta enviada»: redirige al módulo real', () => {
    MonitoreoRetiradoPage();
    expect(redirectMock).toHaveBeenCalledWith(DESTINO);
  });

  it('van al MISMO destino que el índice de la carpeta', () => {
    AvaluosIaLegacyRedirectPage();
    expect(redirectMock).toHaveBeenCalledWith(DESTINO);
  });
});
