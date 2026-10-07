'use client';

/**
 * LA PLATA RECIBIDA QUE TODAVÍA NO SE PUEDE APLICAR.
 *
 * Nico (17-09): «Pago de la aseguradora que sobra sobre lo vencido: queda
 * PENDIENTE DE APLICAR (pasivo) y visible en el contrato, hasta que venzan más
 * cuotas o alguien lo devuelva.»
 *
 * ── Por qué esta pantalla existe ────────────────────────────────────────────
 *
 * Hasta el 17-09 ese pago se RECHAZABA: la aseguradora ya había consignado y el
 * sistema le decía a caja que no lo podía registrar. Ahora la plata entra y
 * queda acá, con nombre: de quién es la deuda que iba a pagar, quién la puso, y
 * cuánto se puede aplicar HOY contra deuda vencida.
 *
 * ── Lo que esta pantalla se niega a hacer ───────────────────────────────────
 *
 * 1. **Aplicar sola.** Aplicar emite un recibo de caja con consecutivo, a nombre
 *    del inquilino y con la aseguradora como pagador. «Una persona decide»
 *    (Nico). Lo que sí hace es DECIR cuánto se puede aplicar, para que nadie
 *    tenga que abrir la cartera y sumar a mano.
 * 2. **Ofrecer «aplicar» cuando no hay deuda vencida.** Ahí el botón no existe y
 *    el texto dice por qué, con el nombre de quien puso la plata.
 * 3. **Llamar «saldo a favor» a plata de un tercero.** Es un PASIVO: se le debe
 *    a quien la puso hasta que se aplique o se devuelva.
 */

import { useCallback, useEffect, useState } from 'react';
import { ArrowUUpLeft, CheckCircle, Hourglass } from '@phosphor-icons/react';
import { Stagger, StaggerItem } from '@leasefy/cadence';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinLaMigracion } from '@/components/finanzas/piezas';
import { SinDatos } from '@/components/estado/SinDatos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { tesoreriaApi } from '@/lib/api/tesoreria.service';
import type { ListaDeAplicables, PendienteAplicable } from '@/lib/api/tesoreria.types';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { errorDelMotivo, errorDelValorADevolver } from '@/lib/tesoreria/limites-de-tesoreria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

/** Los dos campos del diálogo de devolver, y el id de cada uno. */
type CampoDeLaDevolucion = 'valor' | 'motivo';
const ID_DEL_CAMPO: Record<CampoDeLaDevolucion, string> = {
  valor: 'valor-a-devolver',
  motivo: 'motivo-de-la-devolucion',
};

function enfocar(campo: CampoDeLaDevolucion | undefined) {
  if (campo) document.getElementById(ID_DEL_CAMPO[campo])?.focus();
}

export function PendientesDeAplicarPanel() {
  const [datos, setDatos] = useState<ListaDeAplicables | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<unknown>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [devolviendo, setDevolviendo] = useState<PendienteAplicable | null>(null);
  const [motivo, setMotivo] = useState('');
  const [valor, setValor] = useState('');
  const [errores, setErrores] = useState<Partial<Record<CampoDeLaDevolucion, string>>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      setDatos(await tesoreriaApi.pendientes());
    } catch (error) {
      setFallo(error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const aplicar = async (item: PendienteAplicable) => {
    setTrabajando(true);
    try {
      await tesoreriaApi.aplicarPendiente(item.pendiente.id, item.aplicableCop);
      toast.success(
        // «S.A.S.» no termina en «S.A.S..» (QA-PAGOS-95 r2).
        `${formatCurrency(item.aplicableCop)} aplicados a la deuda vencida de ${item.pendiente.nombre}`.replace(/\.?$/, '.'),
      );
      await cargar();
    } catch (error) {
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo aplicar.',
          accion: 'aplicar la plata pendiente',
        }),
      );
    } finally {
      setTrabajando(false);
    }
  };

  const devolver = async () => {
    if (!devolviendo) return;
    /*
     * 🔁 Espejo del tope del back (`limites-de-tesoreria.ts`), antes de mandar.
     * 🔴 Y un campo vacío ya no viaja como «devolver todo»: antes se mandaba
     * sin valor y el back devolvía el saldo entero sin que nadie lo dijera.
     */
    const delCliente: Partial<Record<CampoDeLaDevolucion, string>> = {};
    const eValor = errorDelValorADevolver(valor, devolviendo.pendiente.saldoCop);
    const eMotivo = errorDelMotivo(motivo);
    if (eValor) delCliente.valor = eValor;
    if (eMotivo) delCliente.motivo = eMotivo;
    if (delCliente.valor || delCliente.motivo) {
      setErrores(delCliente);
      enfocar(delCliente.valor ? 'valor' : 'motivo');
      return;
    }
    setErrores({});
    setTrabajando(true);
    try {
      const r = await tesoreriaApi.devolverPendiente(
        devolviendo.pendiente.id,
        motivo.trim(),
        Number(valor.trim()),
      );
      toast.success('Devolución registrada.');
      for (const aviso of r.avisos) toast.info(aviso);
      setDevolviendo(null);
      setMotivo('');
      setValor('');
      await cargar();
    } catch (error) {
      // Un 400 por campo va debajo de su campo; lo demás, al aviso.
      const reparto = repartirErroresDelServidor<CampoDeLaDevolucion>(error, {
        mapa: { valorCop: 'valor', motivo: 'motivo', fecha: null },
        campos: ['valor', 'motivo'],
        porDefecto: 'No se pudo registrar la devolución.',
        accion: 'registrar la devolución',
      });
      setErrores(reparto.porCampo);
      enfocar(reparto.orden[0]);
      if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '));
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="space-y-6">
      <EstadoDeDatos
        cargando={cargando}
        error={fallo}
        queEs="la plata pendiente de aplicar"
        onReintentar={cargar}
        vacio={datos?.disponible === true && datos.aplicables.length === 0}
        cuandoVacio={
          /* 🔴 El vacío NO repite el intro de la pantalla (Nico, 21-09: «no se
             entiende nada»). Decía casi palabra por palabra el mismo párrafo
             del encabezado, y sin pendientes ESO era la pantalla entera: el
             mismo texto dos veces.
             Un vacío tiene que decir tres cosas que el intro no dice: que está
             bien que esté vacío, qué haría aparecer algo acá, y que no hay nada
             que hacer. */
          <div
            className="rounded-lg border border-border bg-surface p-5"
            data-testid="sin-pendientes"
          >
            <SinDatos
              queSon="plata pendiente de aplicar"
              icono={Hourglass}
              titulo="No hay nada pendiente, y está bien"
              descripcion="Toda la plata que entró ya se aplicó o se devolvió. Acá va a aparecer una fila el día que una aseguradora pague más de lo que un inquilino tiene vencido."
            />
          </div>
        }
        conservarContenido
      >
        {datos && !datos.disponible ? (
          <SinLaMigracion
            motivo={datos.motivo}
            queSeEspera="registrar plata pendiente de aplicar"
            testId="pendientes-sin-migracion"
          />
        ) : null}

        {datos && datos.aplicables.length > 0 ? (
          <>
            {/* 🔴 El título era «Pendiente de aplicar», el MISMO de la página
                dos renglones arriba. Un bloque no se llama igual que la
                pantalla que lo contiene: acá lo que hace falta decir es
                cuántos son y cuánto se puede mover hoy. */}
            <p className="text-sm text-fg-muted" data-testid="cuanto-se-puede-aplicar">
              {datos.aplicables.length}{' '}
              {datos.aplicables.length === 1 ? 'entrada' : 'entradas'} esperando.{' '}
              {datos.totalAplicableCop
                ? `Hoy se podrían aplicar ${formatCurrency(datos.totalAplicableCop)} a deuda ya vencida.`
                : 'Ninguna tiene hoy deuda vencida contra la que aplicarse: hay que esperar que venzan más cuotas, o devolverla.'}
            </p>
            {/* Movimiento (ola 2, 03-10-2026): las entradas llegan escalonadas;
                la que se aplica o se devuelve SALE de la lista (`key` = el id). */}
            <Stagger as="ul" className="space-y-4" data-testid="pendientes" distance="xs">
              {datos.aplicables.map((item) => (
                <StaggerItem
                  as="li"
                  key={item.pendiente.id}
                  className="space-y-3 rounded-lg border border-border bg-surface p-5"
                  data-testid={`pendiente-${item.pendiente.id}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-mono text-lg tabular-nums text-fg">
                        {formatCurrency(item.pendiente.saldoCop)}
                      </p>
                      <p className="text-sm text-fg">{item.pendiente.nombre}</p>
                      <p className="text-xs text-fg-muted">
                        {item.pendiente.pagadorNombre
                          ? `La puso ${item.pendiente.pagadorNombre}`
                          : 'Sin pagador registrado'}
                        {item.pendiente.siniestroReferencia
                          ? ` · siniestro ${item.pendiente.siniestroReferencia}`
                          : ''}{' '}
                        · entró el {item.pendiente.fecha}
                      </p>
                    </div>
                    <Badge variant={item.aplicableCop > 0 ? 'success' : 'warning'}>
                      {item.aplicableCop > 0
                        ? `Aplicable: ${formatCurrency(item.aplicableCop)}`
                        : 'Sin deuda vencida'}
                    </Badge>
                  </div>

                  <p className="text-xs leading-relaxed text-fg-muted">{item.porQue}</p>

                  {item.pendiente.aplicadoCop > 0 || item.pendiente.devueltoCop > 0 ? (
                    <dl className="grid grid-cols-3 gap-2 text-xs text-fg-muted">
                      <div>
                        <dt className="text-fg">Llegó</dt>
                        <dd className="font-mono tabular-nums">
                          {formatCurrency(item.pendiente.valorCop)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-fg">Aplicado</dt>
                        <dd className="font-mono tabular-nums">
                          {formatCurrency(item.pendiente.aplicadoCop)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-fg">Devuelto</dt>
                        <dd className="font-mono tabular-nums">
                          {formatCurrency(item.pendiente.devueltoCop)}
                        </dd>
                      </div>
                    </dl>
                  ) : null}

                  {item.pendiente.movimientos.length > 0 ? (
                    <ul className="space-y-1 border-t border-border pt-2 text-xs text-fg-muted">
                      {item.pendiente.movimientos.map((m) => (
                        <li key={m.id}>
                          {m.fecha} · {m.tipo === 'APLICACION' ? 'Aplicado' : 'Devuelto'}{' '}
                          {formatCurrency(m.valorCop)}
                          {m.meses.length > 0 ? ` a ${m.meses.join(', ')}` : ''}
                          {m.motivo ? ` — ${m.motivo}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {item.aplicableCop > 0 ? (
                      <Button
                        onClick={() => void aplicar(item)}
                        disabled={trabajando}
                        data-testid={`aplicar-${item.pendiente.id}`}
                      >
                        <CheckCircle className="h-4 w-4" aria-hidden="true" />
                        Aplicar {formatCurrency(item.aplicableCop)}
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDevolviendo(item);
                        setMotivo('');
                        setValor(String(item.pendiente.saldoCop));
                        setErrores({});
                      }}
                      disabled={trabajando}
                      data-testid={`devolver-${item.pendiente.id}`}
                    >
                      <ArrowUUpLeft className="h-4 w-4" aria-hidden="true" />
                      Devolver
                    </Button>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </>
        ) : null}
      </EstadoDeDatos>

      <Dialog open={devolviendo !== null} onOpenChange={(v) => !v && setDevolviendo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver la plata</DialogTitle>
            <DialogDescription>
              Se registra que esta plata dejó de estar pendiente de aplicar. El EGRESO —la plata
              saliendo del banco— se hace por el lote de egresos con su comprobante: esto no la
              gira.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="valor-a-devolver">Cuánto</Label>
              <Input
                id="valor-a-devolver"
                type="number"
                min={1}
                max={devolviendo?.pendiente.saldoCop}
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value);
                  setErrores((previos) => ({ ...previos, valor: undefined }));
                }}
                aria-invalid={errores.valor ? true : undefined}
                aria-describedby={errores.valor ? 'valor-a-devolver-error' : undefined}
                data-testid="valor-a-devolver"
              />
              <ErrorDelCampo id="valor-a-devolver-error" mensaje={errores.valor} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="motivo-de-la-devolucion">Por qué</Label>
              <Textarea
                id="motivo-de-la-devolucion"
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  setErrores((previos) => ({ ...previos, motivo: undefined }));
                }}
                placeholder="La aseguradora reclamó el excedente del siniestro."
                maxLength={300}
                aria-invalid={errores.motivo ? true : undefined}
                aria-describedby={errores.motivo ? 'motivo-de-la-devolucion-error' : undefined}
                data-testid="motivo-de-la-devolucion"
              />
              <ErrorDelCampo id="motivo-de-la-devolucion-error" mensaje={errores.motivo} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              hideArrow
              onClick={() => setDevolviendo(null)}
              disabled={trabajando}
            >
              Volver
            </Button>
            <Button
              hideArrow
              onClick={() => void devolver()}
              disabled={trabajando || motivo.trim().length === 0}
              isLoading={trabajando}
              data-testid="confirmar-devolucion"
            >
              Registrar la devolución
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
