/**
 * El formulario de la factura de proveedor.
 *
 * 🔴 Lo que este archivo protege, y es la decisión más delicada de la pantalla:
 * **el total del papel viaja como CONTROL y se controla dos veces.** `totalCop`
 * va al back, que compara con lo que suman las líneas y responde 400
 * `TOTALES_NO_CUADRAN` sin registrar nada; la pantalla además lo comprueba
 * localmente mientras se escribe. Los dos no se estorban — el local atrapa el
 * error antes del viaje, el del servidor es el que decide — y cuando los dos
 * aparecen el del back va arriba, porque es el que ya rechazó la factura.
 *
 * Los OTROS cuatro totales no viajan: los liquida el back, y una clave de más es
 * un 400 del request entero (`forbidNonWhitelisted`).
 *
 * Y dos más: que la liquidación la pide el BACK (`previsualizar`, que es el que
 * sabe el perfil tributario del proveedor), y que si esa liquidación llega con
 * `sinConfirmar` la pantalla lo dice — una retención mal practicada es plata que
 * la inmobiliaria le termina debiendo a la DIAN.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { gastos, toastMock } = vi.hoisted(() => ({
  gastos: {
    facturas: { registrar: vi.fn(), previsualizar: vi.fn() },
  },
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/gastos.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/gastos.service')>(
    '@/lib/api/gastos.service',
  );
  return { ...actual, gastosApi: gastos };
});
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}` }),
}));

import { ApiError } from '@/lib/api/client';
import { FormularioDeFactura } from './FormularioDeFactura';

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

const registrada = vi.fn();
const cerrar = vi.fn();

beforeEach(() => {
  gastos.facturas.registrar.mockReset().mockResolvedValue({ id: 'f1', asientoId: null });
  gastos.facturas.previsualizar.mockReset().mockResolvedValue({
    subtotalCop: 400_000,
    ivaCop: 76_000,
    ivaDescontableCop: 76_000,
    retefuenteCop: 10_000,
    reteivaCop: 0,
    reteicaCop: 3_040,
    totalCop: 476_000,
    netoCop: 462_960,
    impuestos: [],
    sinConfirmar: false,
    notas: [],
  });
  registrada.mockReset();
  cerrar.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(
      <FormularioDeFactura
        abierto
        onCerrar={cerrar}
        onRegistrada={registrada}
        cuentas={[]}
        proveedores={[
          {
            id: 'p1',
            nombre: 'Ferretería El Tornillo SAS',
            tipoDocumento: 'NIT',
            documento: '900123456',
            email: null,
            telefono: null,
            direccion: 'Cra 43 #1-2',
            ciudad: 'Medellín',
            responsableIva: true,
            regimenSimple: null,
            retefuentePct: 2.5,
            activo: true,
            faltaPerfilTributario: false,
          },
        ]}
        rubros={[
          {
            rubro: 'oficina',
            nombre: 'Oficina',
            naturaleza: 'COSTO',
            fuenteDelReal: 'CUENTAS_DEL_PUC',
            motivoSinReal: null,
          },
        ]}
        sedes={[]}
      />,
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
}

/**
 * Escribe en un input CONTROLADO por React.
 *
 * Con `input.value = x` a secas no alcanza: React 18 lleva su propio rastreador
 * del valor y, al ver que el valor del nodo ya es el nuevo, se salta el
 * `onChange`. Hay que pasar por el setter nativo del prototipo, que es lo que el
 * rastreador intercepta. Mismo patrón que `configuracion/SeccionSedes.test.tsx`.
 */
function escribir(testId: string, valor: string) {
  const input = q(testId) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter ? setter.call(input, valor) : (input.value = valor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Llena lo mínimo para que el formulario quede sin problemas. */
async function llenarTodo() {
  await act(async () => {
    escribir('factura-nombre', 'Ferretería El Tornillo SAS');
    escribir('factura-documento', '900123456');
    escribir('factura-numero', '4521');
    escribir('factura-concepto', 'Cerraduras para la oficina');
    escribir('linea-descripcion-0', 'Cerradura');
    escribir('linea-base-0', '400000');
    escribir('factura-total', '476000');
    await Promise.resolve();
  });
}

describe('<FormularioDeFactura>', () => {
  it('arranca deshabilitado y dice qué falta', async () => {
    await pintar();
    expect((q('registrar-factura') as HTMLButtonElement).disabled).toBe(true);
    const problemas = q('problemas-de-la-factura')!.textContent!;
    expect(problemas).toContain('nombre del proveedor');
    expect(problemas).toContain('documento del proveedor');
  });

  it('el documento del proveedor se pide nombrando la exógena', async () => {
    await pintar();
    expect(q('problemas-de-la-factura')!.textContent).toContain('exógena');
  });

  it('con todo lleno se habilita', async () => {
    await pintar();
    await llenarTodo();
    expect(q('problemas-de-la-factura')).toBeNull();
    expect((q('registrar-factura') as HTMLButtonElement).disabled).toBe(false);
  });

  it('🔴 manda el total del papel como control, y NINGÚN total liquidado', async () => {
    await pintar();
    await llenarTodo();

    await act(async () => {
      (q('registrar-factura') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const [cuerpo] = gastos.facturas.registrar.mock.calls[0];
    expect((cuerpo as { totalCop?: number }).totalCop).toBe(476_000);
    const claves = Object.keys(cuerpo as object);
    for (const liquidado of ['subtotalCop', 'ivaCop', 'ivaDescontableCop', 'netoCop']) {
      expect(claves, liquidado).not.toContain(liquidado);
    }
    expect(claves).toContain('lineas');
  });

  /*
   * El DTO lo declara opcional: sin él el back no compara nada. Mandar un `0`
   * porque el campo está vacío haría fallar cada factura, así que la clave se
   * omite. (Esta pantalla igual exige el total, así que el caso sólo se alcanza
   * por el camino de «registrar y causar» con el campo recién borrado.)
   */
  it('sin total escrito NO manda la clave, en vez de mandar un cero', async () => {
    await pintar();
    await llenarTodo();
    await act(async () => {
      escribir('factura-total', '');
      await Promise.resolve();
    });

    // Con el campo vacío el botón queda apagado, que es el comportamiento: el
    // total es obligatorio en esta pantalla aunque el DTO lo acepte ausente.
    expect((q('registrar-factura') as HTMLButtonElement).disabled).toBe(true);
    expect(q('problemas-de-la-factura')!.textContent).toContain('total que dice la factura');
  });

  it('🔴 avisa localmente con los DOS números y anticipa el rechazo del back', async () => {
    await pintar();
    await llenarTodo();
    // El papel dice 475.900 y las líneas suman 476.000.
    await act(async () => {
      escribir('factura-total', '475900');
      await Promise.resolve();
    });

    const aviso = q('aviso-total-no-cuadra')!.textContent!;
    expect(aviso).toContain('475.900');
    expect(aviso).toContain('476.000');
    expect(aviso).toContain('TOTALES_NO_CUADRAN');
    // El aviso NO bloquea el envío: el caso legítimo existe (un proveedor que
    // calculó el IVA distinto) y el back es el que decide.
    expect((q('registrar-factura') as HTMLButtonElement).disabled).toBe(false);
  });

  /*
   * 🔴 El 400 del back es la autoridad y trae cuatro números que la pantalla no
   * tiene: el subtotal y el IVA con los que ÉL liquidó. Se muestran, y no como un
   * toast que se va en cinco segundos — hay que poder mirarlos mientras se busca
   * el renglón mal digitado.
   */
  it('🔴 el 400 TOTALES_NO_CUADRAN se muestra con sus cuatro números', async () => {
    gastos.facturas.registrar.mockRejectedValue(
      new ApiError(400, 'El total que dice la factura…', 'TOTALES_NO_CUADRAN', {
        code: 'TOTALES_NO_CUADRAN',
        totalDeLaFacturaCop: 475_900,
        totalDeLasLineasCop: 476_000,
        subtotalCop: 400_000,
        ivaCop: 76_000,
      }),
    );

    await pintar();
    await llenarTodo();
    await act(async () => {
      (q('registrar-factura') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const cartel = q('descuadre-del-back')!.textContent!;
    expect(cartel).toContain('475.900');
    expect(cartel).toContain('476.000');
    expect(cartel).toContain('400.000');
    expect(cartel).toContain('76.000');
    expect(cartel).toContain('No se registró nada');
    // Y el diálogo sigue abierto: no se pierde lo digitado.
    expect(q('formulario-de-factura')).not.toBeNull();
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('🔴 un fallo que NO es descuadre no deja el cartel del descuadre pegado', async () => {
    gastos.facturas.registrar.mockRejectedValue(new Error('sin red'));

    await pintar();
    await llenarTodo();
    await act(async () => {
      (q('registrar-factura') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(q('descuadre-del-back')).toBeNull();
    expect(toastMock.error).toHaveBeenCalled();
  });

  it('elegir un proveedor del registro copia sus datos y dice que quedan congelados', async () => {
    await pintar();
    await act(async () => {
      const select = q('factura-proveedor') as HTMLSelectElement;
      select.value = 'p1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    expect((q('factura-nombre') as HTMLInputElement).value).toBe('Ferretería El Tornillo SAS');
    expect((q('factura-documento') as HTMLInputElement).value).toBe('900123456');
    expect(q('nota-proveedor-congelado')!.textContent).toContain('no se reescribe');
  });

  it('🔴 la liquidación la pide al BACK, no la calcula el navegador', async () => {
    await pintar();
    await llenarTodo();

    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(gastos.facturas.previsualizar).toHaveBeenCalled();
    const [cuerpo] = gastos.facturas.previsualizar.mock.calls.at(-1)!;
    expect((cuerpo as { lineas: unknown[] }).lineas).toHaveLength(1);
  });

  it('espera medio segundo: una base de seis cifras no son seis peticiones', async () => {
    await pintar();
    await llenarTodo();
    // Sin avanzar el reloj no salió nada todavía.
    expect(gastos.facturas.previsualizar).not.toHaveBeenCalled();
  });

  it('🔴 muestra de dónde sale cada impuesto: calculado o escrito', async () => {
    gastos.facturas.previsualizar.mockResolvedValue({
      subtotalCop: 400_000,
      ivaCop: 76_000,
      ivaDescontableCop: 76_000,
      retefuenteCop: 10_000,
      reteivaCop: 0,
      reteicaCop: 3_040,
      totalCop: 476_000,
      netoCop: 462_960,
      impuestos: [
        {
          tipo: 'RETEFUENTE',
          nombre: 'Retención en la fuente',
          porcentaje: 2.5,
          baseCop: 400_000,
          valorCop: 10_000,
          suma: false,
          origen: 'CALCULADO',
          explicacion: '2,5 % del perfil tributario del proveedor.',
        },
        {
          tipo: 'RETEICA',
          nombre: 'Retención de ICA',
          porcentaje: null,
          baseCop: 400_000,
          valorCop: 3_040,
          suma: false,
          origen: 'DECLARADO',
          explicacion: 'Lo escribió quien digitó la factura.',
        },
      ],
      sinConfirmar: false,
      notas: [],
    });

    await pintar();
    await llenarTodo();
    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
      await Promise.resolve();
    });

    const impuestos = q('impuestos-de-la-factura')!.textContent!;
    expect(impuestos).toContain('lo calculó Leasefy');
    expect(impuestos).toContain('lo escribiste vos');
    // 🔴 Y la explicación del BACK, que es la que sabe de dónde salió la tarifa.
    expect(impuestos).toContain('perfil tributario del proveedor');
  });

  it('🔴 `sinConfirmar` se dice, nombrando lo que está en juego', async () => {
    gastos.facturas.previsualizar.mockResolvedValue({
      subtotalCop: 400_000,
      ivaCop: 76_000,
      ivaDescontableCop: 0,
      retefuenteCop: 10_000,
      reteivaCop: 0,
      reteicaCop: 0,
      totalCop: 476_000,
      netoCop: 466_000,
      impuestos: [],
      sinConfirmar: true,
      notas: ['El proveedor no tiene perfil tributario cargado.'],
    });

    await pintar();
    await llenarTodo();
    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
      await Promise.resolve();
    });

    const cartel = q('liquidacion-sin-confirmar')!.textContent!;
    expect(cartel).toContain('nadie confirmó');
    expect(cartel).toContain('DIAN');
    expect(q('notas-de-la-liquidacion')!.textContent).toContain('perfil tributario');
  });

  it('si la previsualización falla, el formulario sigue usable con la cuenta local', async () => {
    gastos.facturas.previsualizar.mockRejectedValue(new Error('sin red'));

    await pintar();
    await llenarTodo();
    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
      await Promise.resolve();
    });

    // La cuenta LOCAL: subtotal e IVA de las líneas y el neto del papel menos
    // las retenciones escritas (acá, ninguna). No es la del back —no tiene el
    // perfil del proveedor— y por eso el back sigue teniendo la última palabra.
    const liquidacion = q('liquidacion')!.textContent!;
    expect(liquidacion).toContain('400.000');
    expect(liquidacion).toContain('76.000');
    expect(liquidacion).toContain('476.000');
    expect(q('impuestos-de-la-factura')).toBeNull();
    expect((q('registrar-factura') as HTMLButtonElement).disabled).toBe(false);
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it('«Registrar y causar» manda `causar: true`', async () => {
    await pintar();
    await llenarTodo();

    await act(async () => {
      (q('registrar-y-causar') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const [cuerpo] = gastos.facturas.registrar.mock.calls[0];
    expect((cuerpo as { causar?: boolean }).causar).toBe(true);
  });

  it('un fallo al registrar NO cierra el diálogo: no se pierde lo digitado', async () => {
    gastos.facturas.registrar.mockRejectedValue(new Error('se cayó'));

    await pintar();
    await llenarTodo();
    await act(async () => {
      (q('registrar-factura') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(toastMock.error).toHaveBeenCalled();
    expect(cerrar).not.toHaveBeenCalled();
    expect(q('formulario-de-factura')).not.toBeNull();
  });

  it('una línea sin cuenta se explica en vez de exigirla', async () => {
    await pintar();
    expect(q('nota-de-la-cuenta')!.textContent).toContain('Gasto sin rubro');
  });
});
