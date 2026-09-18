'use client';

/**
 * El cuadre DIARIO de la plata de terceros.
 *
 * ── Por qué esta pantalla existe ────────────────────────────────────────────
 *
 * En la cuenta de recaudo casi nada es de la inmobiliaria: es plata de
 * propietarios que todavía no se giró, plata que el inquilino adelantó, plata
 * que dejó en garantía de servicios, y plata que llegó sin nombre. Que el banco
 * diga un número y la contabilidad diga otro es el defecto que arruina a una
 * inmobiliaria, y sólo se ve si alguien lo mira TODOS LOS DÍAS.
 *
 * Nico (17-09): «saldo de la cuenta de recaudo = recaudado y no girado +
 * anticipos del inquilino + garantías de servicios + partidas por identificar;
 * si no cuadra, se muestra la diferencia a explicar.»
 *
 * ── Lo que esta pantalla se niega a hacer ───────────────────────────────────
 *
 * 1. **Decir «cuadra en $0» cuando no hay extracto.** Sin extracto cargado el
 *    back manda `diferenciaCop: null`, y eso es «no se pudo cuadrar». Un cero
 *    ahí es una afirmación que nadie midió.
 * 2. **Pintar de rojo una diferencia a favor.** Que el banco tenga MÁS de lo
 *    que se le debe a terceros es lo normal: la comisión de la inmobiliaria
 *    sigue en esa cuenta hasta que la traslade. Lo que va en rojo es lo
 *    contrario, `faltaPlataDeTerceros`, que es plata de otra gente que no está.
 * 3. **Esconder las explicaciones detrás de un «ver más».** Son lo que
 *    convierte «no cuadra» en «ya sé por qué».
 * 4. **Calcular nada.** La identidad, la diferencia y las explicaciones las
 *    arma el back (`finanzas/cuadre/cuadre-de-terceros.ts`). Acá se pinta.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, WarningOctagon } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { Avisos, Cifra, CifraDeTexto, TituloDeBloque } from '@/components/finanzas/piezas';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { finanzasApi } from '@/lib/api/finanzas.service';
import type { CuadreDeTerceros as Respuesta } from '@/lib/api/finanzas.types';
import { formatCurrency } from '@/lib/types/inmobiliaria';

/** `YYYY-MM-DD` de hoy en Bogotá: la misma cuenta que hace el back. */
function hoyEnBogota(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function CuadreDeTercerosPanel() {
  const [fecha, setFecha] = useState(hoyEnBogota);
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      setDatos(await finanzasApi.cuadre(fecha));
    } catch (error) {
      setFallo(error);
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="space-y-6" data-testid="cuadre-de-terceros">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cuadre-fecha">Día</Label>
          <Input
            id="cuadre-fecha"
            type="date"
            value={fecha}
            max={hoyEnBogota()}
            onChange={(e) => setFecha(e.target.value)}
            className="w-44"
            data-testid="cuadre-fecha"
          />
        </div>
      </div>

      <EstadoDeDatos
        cargando={cargando && !datos}
        error={fallo}
        vacio={!cargando && !datos}
        onReintentar={cargar}
        queEs="el cuadre del día"
      >
        {datos ? <Cuadre datos={datos} /> : null}
      </EstadoDeDatos>
    </div>
  );
}

function Cuadre({ datos }: { datos: Respuesta }) {
  return (
    <div className="space-y-6">
      <Veredicto datos={datos} />

      <Avisos avisos={datos.avisos} testId="cuadre-avisos" />

      <section className="space-y-4">
        <TituloDeBloque
          titulo="La identidad, término por término"
          explicacion="Lo que el banco dice que hay, contra la suma de la plata que no es tuya. Los cuatro términos salen de fuentes distintas: si uno está mal, la diferencia lo delata."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Cifra
            id="recaudado-no-girado"
            etiqueta="Recaudado y no girado"
            valor={datos.recaudadoYNoGiradoCop}
            definicion={`Lo que entró de inquilinos (${formatCurrency(datos.detalle.recaudadoCop)}) menos lo que salió a propietarios (${formatCurrency(datos.detalle.giradoCop)}). Adentro está tu comisión, que es plata tuya.`}
          />
          <Cifra
            id="anticipos"
            etiqueta="Anticipos del inquilino"
            valor={datos.anticiposDelInquilinoCop}
            definicion="El saldo vivo de lo que los inquilinos adelantaron. Es de ellos hasta que se consume mes a mes."
          />
          <Cifra
            id="garantias"
            etiqueta="Garantías de servicios"
            valor={datos.garantiasDeServiciosCop}
            definicion={`El saldo vivo de ${datos.detalle.garantiasVivas} garantía(s). Es plata del inquilino hasta que se paga un servicio o se le devuelve.`}
          />
          <Cifra
            id="por-identificar"
            etiqueta="Partidas por identificar"
            valor={datos.partidasPorIdentificarCop}
            definicion={`${datos.partidasPorIdentificar} entrada(s) del extracto que nadie asignó. Se quedan en el pasivo hasta que se les ponga inquilino y cuota: no se pasan a ingresos ni se devuelven solas.`}
            tono={datos.partidasPorIdentificar > 0 ? 'warning' : undefined}
          />
        </div>
      </section>

      <section className="space-y-4">
        <TituloDeBloque
          titulo="Contra lo que dice el banco"
          explicacion="El saldo de la cuenta de recaudo sale del extracto cargado en Conciliación. Sin extracto no se puede cuadrar, y eso se dice — no se supone un cero."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Cifra
            id="saldo-banco"
            etiqueta="Saldo de la cuenta de recaudo"
            valor={datos.haySaldoDelBanco ? datos.saldoDeLaCuentaCop : null}
            definicion={`La suma de los ${datos.detalle.movimientosDelExtracto} movimiento(s) del extracto hasta el ${datos.fecha}.`}
            sinMedir="No hay extracto bancario cargado hasta esta fecha: cárgalo en Conciliación para poder cuadrar."
          />
          <Cifra
            id="plata-de-terceros"
            etiqueta="Plata de terceros"
            valor={datos.plataDeTercerosCop}
            definicion="La suma de los cuatro términos de arriba: lo que NO es de la inmobiliaria y tiene que estar en esa cuenta."
          />
          <Cifra
            id="diferencia"
            etiqueta="Diferencia a explicar"
            valor={datos.diferenciaCop}
            definicion={
              datos.diferenciaCop === 0
                ? 'Cuadra exacto.'
                : (datos.diferenciaCop ?? 0) > 0
                  ? 'En el banco hay MÁS de lo que se le debe a terceros. Suele ser tu comisión, todavía sin trasladar.'
                  : 'En el banco hay MENOS de lo que se le debe a terceros.'
            }
            sinMedir="No se pudo cuadrar: falta el extracto del banco."
            tono={datos.faltaPlataDeTerceros ? 'danger' : undefined}
          />
        </div>
        {datos.comisionRetenidaCop > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <CifraDeTexto
              id="comision-referencia"
              etiqueta="Tu comisión causada (referencia)"
              texto={formatCurrency(datos.comisionRetenidaCop)}
              definicion="NO entra en la identidad: es plata tuya. Está acá porque es la explicación más común de una diferencia a favor."
              pie={
                datos.comisionTrasladadaCop > 0 ? (
                  <span>
                    Ya trasladaste {formatCurrency(datos.comisionTrasladadaCop)} a tu cuenta
                    propia: esa parte salió del banco de recaudo.
                  </span>
                ) : null
              }
            />
            {/* 🔴 (18-09) El número que cierra el cuadre. Hasta hoy la pantalla
                decía «suele ser tu comisión» sin poder decir CUÁNTA seguía ahí;
                ahora lo dice, y el enlace lleva a proponerlo. */}
            <CifraDeTexto
              id="comision-en-la-cuenta"
              etiqueta="Comisión sin trasladar"
              texto={formatCurrency(datos.comisionEnLaCuentaCop)}
              definicion={
                datos.laDiferenciaEsLaComision
                  ? 'La diferencia de arriba es EXACTAMENTE esto. No es un descuadre: es plata tuya que sigue en la cuenta de recaudo. Aprueba el traslado y el cuadre da cero.'
                  : 'Lo que de tu comisión sigue en la cuenta de recaudo: causada menos trasladada.'
              }
              tono={datos.laDiferenciaEsLaComision ? 'success' : undefined}
              pie={
                datos.comisionEnLaCuentaCop > 0 ? (
                  <Link
                    href="/panel/inmobiliaria/pagos/traslados"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    data-testid="ir-a-traslados"
                  >
                    Proponer el traslado a tu cuenta propia
                  </Link>
                ) : null
              }
            />
          </div>
        ) : null}
      </section>

      {datos.explicaciones.length > 0 ? (
        <section className="space-y-3">
          <TituloDeBloque
            titulo="Qué puede explicar la diferencia"
            explicacion="En orden de probabilidad. La primera es la que hay que descartar antes de buscar más lejos."
          />
          <ul
            className="space-y-2 rounded-lg border border-border bg-surface p-5 text-sm leading-relaxed text-fg-muted"
            data-testid="cuadre-explicaciones"
          >
            {datos.explicaciones.map((e) => (
              <li key={e} className="flex gap-2">
                <span aria-hidden="true">·</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** El veredicto de arriba: lo primero que se lee. */
function Veredicto({ datos }: { datos: Respuesta }) {
  if (datos.faltaPlataDeTerceros) {
    return (
      <div
        className="flex gap-3 rounded-lg border border-danger/40 bg-danger-soft p-5 text-sm text-fg"
        data-testid="cuadre-veredicto"
        data-estado="falta"
        role="alert"
      >
        <WarningOctagon className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-medium">
            Falta plata de terceros: {formatCurrency(Math.abs(datos.diferenciaCop ?? 0))}
          </p>
          <p className="text-fg-muted">
            En la cuenta de recaudo hay menos de lo que se le debe a propietarios e inquilinos.
            Revísalo hoy: esa plata no es de la inmobiliaria.
          </p>
        </div>
      </div>
    );
  }

  if (!datos.haySaldoDelBanco) {
    return (
      <div
        className="flex gap-3 rounded-lg border border-warning/40 bg-warning-soft p-5 text-sm text-fg"
        data-testid="cuadre-veredicto"
        data-estado="sin-extracto"
        role="status"
      >
        <WarningOctagon className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-medium">No se pudo cuadrar</p>
          <p className="text-fg-muted">
            No hay extracto bancario cargado hasta el {datos.fecha}, así que el saldo de la cuenta
            de recaudo es desconocido. Cárgalo en Conciliación.
          </p>
        </div>
      </div>
    );
  }

  if (datos.cuadra) {
    return (
      <div
        className="flex gap-3 rounded-lg border border-success/40 bg-success-soft p-5 text-sm text-fg"
        data-testid="cuadre-veredicto"
        data-estado="cuadra"
        role="status"
      >
        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-medium">Cuadra exacto</p>
          <p className="text-fg-muted">
            El saldo de la cuenta de recaudo es igual a la plata de terceros al {datos.fecha}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex gap-3 rounded-lg border border-border bg-surface p-5 text-sm text-fg"
      data-testid="cuadre-veredicto"
      data-estado="a-favor"
      role="status"
    >
      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium">
          En el banco hay {formatCurrency(datos.diferenciaCop ?? 0)} de más
        </p>
        <p className="text-fg-muted">
          No falta plata de nadie. Lo normal es que sea tu comisión, que sigue en la cuenta de
          recaudo hasta que la traslades. Abajo están las otras explicaciones.
        </p>
      </div>
    </div>
  );
}
