'use client';

/**
 * La pestaña «Configuración» de la exógena (contrato del 19-09, §2).
 *
 * ── 🔴 Dos interruptores iguales, y uno ya se resolvió ─────────────────────
 *
 * `girosAPropietariosEn1001` está DECIDIDO (Nico, 18-09: sólo en el 1647) y
 * `saldo2815En1009` todavía ESPERA AL CONTADOR. Dibujados iguales, quien los
 * mira supone que las dos son preguntas abiertas y prende la que no debía —y
 * prender la primera manda al 1001 pagos que bajo mandato no deduce la
 * inmobiliaria—. Acá van separados en dos bloques con su distintivo, y el
 * texto de cada uno es el que manda el back (`decididoPorNico` /
 * `esperaAlContador`): no se inventa copy sobre una decisión tributaria.
 *
 * ── 🔴 El tope heredado se ve al lado del propio ───────────────────────────
 *
 * Quien escribe un tope tiene que poder ver QUÉ está pisando. Al lado del
 * campo está lo que Leasefy publicó para el año, con su resolución y su NIT de
 * agrupación; y un campo vacío dice «hereda», nunca «$0» — un tope de cero
 * agruparía a todos los terceros bajo el NIT 222222222 y los escondería del
 * formato.
 *
 * ── Sin la migración 70 se ven los valores por defecto y no se guarda ──────
 *
 * El back responde `disponible: false` con el nombre de la migración y 503 al
 * `PUT`. La pantalla lo dice y apaga el botón: un formulario que sólo produce
 * errores es peor que ninguno.
 */

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Hourglass } from '@phosphor-icons/react';

import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/money-input';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import { exogenaApi, type ConfiguracionDeExogena as Configuracion } from '@/lib/api/exogena.service';
import {
  borradorDe,
  cuerpoDeConfiguracion,
  estadoDelInterruptor,
  fraseDelTope,
  hayCambios,
  problemaDeLaConfiguracion,
  topeVigente,
  type BorradorDeConfiguracion,
} from '@/lib/contabilidad/configuracion-de-exogena';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { AccionConMotivo, FaltaLaMigracion, Nota } from '../piezas';
import { usePuedeEscribir } from '../use-puede-escribir';

/** Los dos interruptores, con su etiqueta. El orden importa: primero el resuelto. */
const INTERRUPTORES = [
  {
    clave: 'girosAPropietariosEn1001' as const,
    titulo: 'Los giros a propietarios también van en el 1001',
    apagado: 'Apagado: los giros salen sólo en el 1647.',
    prendido: 'Prendido: los giros salen en el 1647 y además en el 1001 como pago a tercero.',
  },
  {
    clave: 'saldo2815En1009' as const,
    titulo: 'El saldo de 2815 al 31 de diciembre también va en el 1009',
    apagado: 'Apagado: el saldo de 2815 sale sólo en el 1647.',
    prendido: 'Prendido: el mismo saldo sale en el 1647 y en el 1009.',
  },
];

export function ConfiguracionDeExogena({ anio }: { anio: number }) {
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [borrador, setBorrador] = useState<BorradorDeConfiguracion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [guardando, setGuardando] = useState(false);

  const escritura = usePuedeEscribir();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await exogenaApi.configuracion(anio);
      setConfig(r);
      setBorrador(borradorDe(r));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [anio]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = useCallback(async () => {
    if (!borrador) return;
    setGuardando(true);
    try {
      await exogenaApi.guardarConfiguracion(cuerpoDeConfiguracion(borrador));
      /*
       * El `PUT` devuelve la FILA, no el resumen: no trae el año de plataforma
       * ni los textos. Se vuelve a pedir el `GET` para que el tope heredado no
       * desaparezca de la pantalla apenas se guarda algo.
       */
      await cargar();
      toast.success('Configuración de exógena guardada.');
    } catch (e) {
      toast.error(mensajeDeContabilidad(e, 'No se pudo guardar la configuración.'));
    } finally {
      setGuardando(false);
    }
  }, [borrador, cargar]);

  if (cargando && !config) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Spinner size="lg" />
        <p className="text-sm text-fg-muted">Cargando la configuración…</p>
      </div>
    );
  }
  if (error || !config || !borrador) {
    return <FalloDeCarga error={error} queEs="la configuración de exógena" onReintentar={cargar} />;
  }

  const vigente = topeVigente(config);
  const anioPlataforma = config.delAnioDeLaPlataforma;
  const problema = problemaDeLaConfiguracion(borrador);
  const cambiado = hayCambios(config, borrador);

  const motivoDelBoton = !config.disponible
    ? 'Falta la migración que crea la tabla de configuración: por ahora rigen los valores por defecto.'
    : (escritura.motivo ?? (problema ?? 'No cambiaste nada todavía.'));

  return (
    <div className="space-y-6" data-testid="configuracion-de-exogena">
      {!config.disponible ? (
        <FaltaLaMigracion
          motivo={config.motivo}
          queSeEspera="guardar la configuración de exógena"
          mientrasTanto="Mientras tanto rigen los valores por defecto: los giros van sólo al 1647 y el saldo de 2815 queda fuera del 1009."
          testId="configuracion-sin-migracion"
        />
      ) : null}

      {/* ── Los dos interruptores ─────────────────────────────────────── */}
      <ul className="space-y-4">
        {INTERRUPTORES.map((i) => {
          const estado = estadoDelInterruptor(config, i.clave);
          const decidido = estado.estado === 'DECIDIDO';
          const prendido = borrador[i.clave];
          return (
            <li
              key={i.clave}
              className={`space-y-3 rounded-lg border p-4 ${
                decidido ? 'border-border bg-surface' : 'border-warning/40 bg-warning-soft'
              }`}
              data-testid={`interruptor-${i.clave}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {decidido ? (
                      <CheckCircle className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <Hourglass className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                    )}
                    <span
                      className="text-caption font-medium uppercase tracking-wide text-fg-muted"
                      data-testid={`estado-${i.clave}`}
                    >
                      {decidido ? 'Decidido' : 'Espera al contador'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-fg">{i.titulo}</p>
                  <p className="max-w-prose text-caption text-fg-muted">
                    {prendido ? i.prendido : i.apagado}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`switch-${i.clave}`} className="sr-only">
                    {i.titulo}
                  </Label>
                  <Switch
                    id={`switch-${i.clave}`}
                    checked={prendido}
                    disabled={!config.disponible || !escritura.puede || guardando}
                    onCheckedChange={(v) =>
                      setBorrador((b) => (b ? { ...b, [i.clave]: v } : b))
                    }
                    data-testid={`switch-${i.clave}`}
                  />
                </div>
              </div>

              {/* 🔴 El texto del back, entero. No se recorta ni se reescribe. */}
              {estado.explicacion ? (
                <p
                  className="max-w-prose text-caption text-fg-muted"
                  data-testid={`explicacion-${i.clave}`}
                >
                  {estado.explicacion}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* ── El tope de cuantías menores ───────────────────────────────── */}
      <section
        className="space-y-3 rounded-lg border border-border bg-surface p-4"
        data-testid="tope-de-cuantias-menores"
      >
        <div className="space-y-1">
          <p className="text-sm font-medium text-fg">Tope de cuantías menores</p>
          <p className="max-w-prose text-caption text-fg-muted">
            Debajo de este valor, los terceros se agrupan en una sola fila con el NIT de cuantías
            menores. Lo fija la resolución de la DIAN de cada año.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tope-propio">El tuyo (opcional)</Label>
            <MoneyInput
              id="tope-propio"
              value={borrador.tope}
              onChange={(crudo) => setBorrador((b) => (b ? { ...b, tope: crudo } : b))}
              disabled={!config.disponible || !escritura.puede || guardando}
              placeholder="Vacío = heredar"
              data-testid="tope-propio"
            />
            <p className="text-caption text-fg-muted" data-testid="frase-del-tope">
              {fraseDelTope(config, formatCurrency)}
            </p>
          </div>

          {/* 🔴 Lo heredado, al lado, para que se vea qué se está pisando. */}
          <div
            className="space-y-1 rounded-lg border border-border bg-surface-muted p-3 text-caption text-fg-muted"
            data-testid="del-anio-de-la-plataforma"
          >
            {anioPlataforma ? (
              <>
                <p className="font-medium text-fg">Lo que Leasefy publicó para {anioPlataforma.anio}</p>
                <p>
                  Tope:{' '}
                  {anioPlataforma.topeCuantiasMenoresCop === null
                    ? 'sin tope — no se agrupa nada'
                    : formatCurrency(anioPlataforma.topeCuantiasMenoresCop)}
                </p>
                <p>
                  NIT de agrupación:{' '}
                  {anioPlataforma.nitCuantiasMenores ?? 'no se cargó'}
                </p>
                <p>Resolución: {anioPlataforma.resolucion ?? 'no se cargó'}</p>
              </>
            ) : (
              <p>
                Leasefy todavía no publicó el año {anio}: no hay nada que heredar, y sin tope
                propio NO se agrupa nada en cuantías menores.
              </p>
            )}
          </div>
        </div>

        {vigente.origen === 'NINGUNO' ? (
          <Nota testId="sin-tope-vigente">
            <p>
              Hoy no se agrupa ningún tercero en cuantías menores. Es lo correcto mientras la
              resolución del año no fije un tope: agrupar con un tope inventado esconde terceros
              que había que declarar uno por uno.
            </p>
          </Nota>
        ) : null}
      </section>

      <AccionConMotivo
        puede={config.disponible && escritura.puede && cambiado && problema === null}
        motivo={motivoDelBoton}
        ocupado={guardando}
        textoOcupado="Guardando…"
        onClick={() => void guardar()}
        variant="default"
        testId="guardar-configuracion"
      >
        Guardar la configuración
      </AccionConMotivo>
    </div>
  );
}
