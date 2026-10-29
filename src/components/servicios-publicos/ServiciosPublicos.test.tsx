/**
 * Operación → Servicios públicos (Portofino, 22-10-2026): el tablero del mes y
 * el cajón donde se aprueba lo que subió el inquilino.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ params: new URLSearchParams('mes=2026-10'), replace: vi.fn(), canAccess: vi.fn(() => true) }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => h.params,
  useRouter: () => ({ replace: h.replace }),
  usePathname: () => '/panel/inmobiliaria/servicios-publicos',
}));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => ({ canAccess: h.canAccess }) }));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/agentes/OrbeDeAgente', () => ({ OrbeDeAgente: () => <span /> }));
vi.mock('@/lib/api/servicios-publicos.service', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/servicios-publicos.service')>()),
  serviciosPublicosApi: { tablero: vi.fn(), delContrato: vi.fn(), aprobar: vi.fn(), rechazar: vi.fn(), soporte: vi.fn(), revisarEntrada: vi.fn(), registrar: vi.fn(), pagarConLaGarantia: vi.fn() },
}));

import { serviciosPublicosApi, type FilaDelTablero, type FacturaDeServicio } from '@/lib/api/servicios-publicos.service';
import { toast } from '@/components/ui/toast';
import { ServiciosPublicos } from './ServiciosPublicos';

const api = serviciosPublicosApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

function factura(over: Partial<FacturaDeServicio> = {}): FacturaDeServicio {
  return {
    id: 'f1',
    contractId: 'c1',
    servicio: 'ENERGIA',
    nombreDelServicio: 'Energía',
    empresa: 'EPM',
    periodoDesde: '2026-09-16',
    periodoHasta: '2026-10-15',
    valorCop: 186_000,
    tipo: 'MENSUAL',
    pagadaPor: 'INQUILINO',
    estado: 'POR_REVISAR',
    tieneSoporte: true,
    soporteNombre: 'epm.pdf',
    subidaPor: 'INQUILINO',
    liquidacion: null,
    nota: null,
    motivoDeLaRevision: null,
    creadaAt: '2026-10-20T10:00:00.000Z',
    ...over,
  };
}

function fila(over: Partial<FilaDelTablero> = {}): FilaDelTablero {
  return {
    contractId: 'c1',
    contrato: '515',
    inquilino: 'Maria Isabel Bolivar',
    documentoDelInquilino: '43687485',
    inmueble: 'CL 131 CR 51',
    estadoDelMes: 'POR_REVISAR',
    porRevisar: 1,
    ajustesPorRevisar: 0,
    entradaRegistrada: false,
    ultimaFactura: factura(),
    ...over,
  };
}

function tablero(contratos: FilaDelTablero[]) {
  return { disponible: true, mes: '2026-10', resumen: { alDia: 0, porRevisar: 1, rechazadas: 0, sinFactura: 1, ajustesPorRevisar: 0 }, contratos };
}

let root: Root;
let container: HTMLDivElement;
const $ = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

beforeEach(() => {
  vi.clearAllMocks();
  h.params = new URLSearchParams('mes=2026-10');
  h.canAccess.mockReturnValue(true);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function montar() {
  await act(async () => root.render(<ServiciosPublicos />));
}

describe('Operación → Servicios públicos', () => {
  it('pide el mes de la URL y pinta cada contrato con su estado', async () => {
    api.tablero.mockResolvedValue(tablero([fila(), fila({ contractId: 'c2', contrato: '9', estadoDelMes: 'SIN_FACTURA', porRevisar: 0, ultimaFactura: null })]));
    await montar();
    expect(api.tablero).toHaveBeenCalledWith('2026-10');
    expect($('servicios-c1')!.textContent).toContain('Por revisar');
    expect($('servicios-c2')!.textContent).toContain('Sin factura');
    expect($('abrir-c1')!.textContent).toContain('Revisar (1)');
  });

  it('la cuenta de EPM del inmueble (Nico 29-10-2026): número y cuánto lleva sin el servicio', async () => {
    api.tablero.mockResolvedValue(
      tablero([
        fila({
          cuentas: [
            { empresa: 'EPM', numero: '13249728', codigoDelInmueble: '47591', vigenciaMeses: 12, conCobertura: false, cobertura: '12 meses sin servicio de EPM' },
          ],
        }),
        fila({ contractId: 'c2', contrato: '9' }),
      ]),
    );
    await montar();
    expect($('cuentas-c1')!.textContent).toContain('EPM · 13249728');
    expect($('cuentas-c1')!.textContent).toContain('12 meses sin servicio de EPM');
    expect($('cuentas-c2')).toBeNull();
  });

  it('filtra por estado del mes y busca por cédula', async () => {
    api.tablero.mockResolvedValue(tablero([fila(), fila({ contractId: 'c2', contrato: '9', documentoDelInquilino: '1046', estadoDelMes: 'SIN_FACTURA', porRevisar: 0 })]));
    await montar();
    await act(async () => $('estado-SIN_FACTURA')!.click());
    expect($('servicios-c1')).toBeNull();
    expect($('servicios-c2')).not.toBeNull();
  });

  it('🔴 el cajón aprueba la factura que subió el inquilino y vuelve a leer', async () => {
    api.tablero.mockResolvedValue(tablero([fila()]));
    api.delContrato.mockResolvedValue({
      disponible: true,
      contractId: 'c1',
      contrato: '515',
      inquilino: 'Maria',
      entrega: '2023-11-01',
      devolucion: '2027-04-30',
      entradaRegistrada: false,
      garantia: null,
      facturas: [factura()],
    });
    api.aprobar.mockResolvedValue(factura({ estado: 'AL_DIA' }));
    await montar();
    await act(async () => $('abrir-c1')!.click());
    await act(async () => {});
    expect($('factura-f1')!.textContent).toContain('la subió el inquilino');
    await act(async () => $('aprobar-f1')!.click());
    expect(api.aprobar).toHaveBeenCalledWith('f1');
    expect((toast as unknown as { success: ReturnType<typeof vi.fn> }).success).toHaveBeenCalledWith('La factura quedó al día.');
    expect(api.tablero).toHaveBeenCalledTimes(2);
  });

  it('🔴 cuenta por el corte: cada fila dice su consumo y el mes en que se facturó (Portofino 29-10-2026)', async () => {
    api.tablero.mockResolvedValue(
      tablero([fila({ ultimaFactura: factura({ corte: { desde: '2026-09-16', hasta: '2026-10-15', dias: 30 }, mesFacturado: '2026-11', mesFacturadoSegun: 'FACTURA' }) })]),
    );
    await montar();
    expect($('servicios-c1')!.textContent).toContain('Consumo del 16 sep al 15 oct · 30 días · facturada en noviembre');
    expect(document.body.textContent).toContain('Corte de octubre');
  });

  it('🔴 un contrato que no había empezado sale «Sin iniciar», no pide factura y se cuenta en el resumen', async () => {
    api.tablero.mockResolvedValue({
      ...tablero([fila(), fila({ contractId: 'c2', contrato: '9', estadoDelMes: 'SIN_INICIAR', porRevisar: 0, ultimaFactura: null, inicio: '2026-10-20' })]),
      resumen: { alDia: 0, porRevisar: 1, rechazadas: 0, sinFactura: 0, sinIniciar: 1, ajustesPorRevisar: 0 },
    });
    await montar();
    expect($('servicios-c2')!.textContent).toContain('Sin iniciar');
    expect($('servicios-c2')!.textContent).toContain('Empezó el 20 oct 2026: no se le pide factura');
    expect($('estado-SIN_INICIAR')!.textContent).toContain('1');
    expect($('sin-iniciar')!.textContent).toBe('1 contrato no había empezado en el corte de octubre: no se les pide factura.');
  });

  it('lo que trae la última factura: de entrada, del propietario y lo que Servi deja por decidir', async () => {
    api.tablero.mockResolvedValue(
      tablero([
        fila({
          inicio: '2026-09-20',
          ultimaFactura: factura({
            conceptosDelPropietario: [{ tipo: 'ACUERDO_DE_PAGO', concepto: 'Acuerdo', valorCop: 25_000 }],
            revisionDeServi: { veredicto: 'NO_CUADRA', motivos: ['No se ve el sello de pagado.'], propuestas: [{ proceso: 'p', clave: 'k', resumen: 'Rechazar', montoCop: null }] },
          }),
        }),
      ]),
    );
    await montar();
    expect($('cae-c1')!.textContent).toBe('Es de entrada: se parte por días.');
    expect($('del-propietario-c1')!.textContent).toBe('Trae $\u00a025.000 del propietario');
    expect($('servi-c1')!.textContent).toContain('Servi dice que no cuadra: se decide en la Bandeja del Piloto');
  });

  it('por inmueble: los contratos del mismo inmueble van juntos con su cuenta de EPM', async () => {
    h.params = new URLSearchParams('mes=2026-10&vista=inmueble');
    const cuentas = [{ empresa: 'EPM', numero: '13249728', codigoDelInmueble: null, vigenciaMeses: null, conCobertura: null, cobertura: null }];
    api.tablero.mockResolvedValue(
      tablero([fila({ cuentas }), fila({ contractId: 'c2', contrato: '9', inquilino: 'Pedro', cuentas }), fila({ contractId: 'c3', contrato: '7', inmueble: 'CR 43A 1-50' })]),
    );
    await montar();
    expect($('inmueble-cl 131 cr 51')!.textContent).toContain('2 contratos en este inmueble');
    expect($('inmueble-cl 131 cr 51')!.textContent).toContain('EPM · 13249728');
    expect($('servicios-c3')!.textContent).toContain('CR 43A 1-50');
  });

  it('busca por el número de la cuenta de servicios', async () => {
    const cuentas = [{ empresa: 'EPM', numero: '13249728', codigoDelInmueble: null, vigenciaMeses: null, conCobertura: null, cobertura: null }];
    api.tablero.mockResolvedValue(tablero([fila({ cuentas }), fila({ contractId: 'c2', contrato: '9' })]));
    await montar();
    const campo = document.querySelector('[data-testid="buscar-servicios"] input, input[data-testid="buscar-servicios"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
      setter.call(campo, '13249728');
      campo.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect($('servicios-c1')).not.toBeNull();
    expect($('servicios-c2')).toBeNull();
  });

  it('sin permiso de editar se ve, no se aprueba', async () => {
    h.canAccess.mockReturnValue(false);
    api.tablero.mockResolvedValue(tablero([fila()]));
    api.delContrato.mockResolvedValue({ disponible: true, contractId: 'c1', contrato: '515', inquilino: 'M', entrega: null, devolucion: null, entradaRegistrada: false, garantia: null, facturas: [factura()] });
    await montar();
    await act(async () => $('abrir-c1')!.click());
    await act(async () => {});
    expect($('aprobar-f1')).toBeNull();
    expect($('registrar-factura')).toBeNull();
  });
});
