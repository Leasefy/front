'use client';

/**
 * «¿Desde qué banco vas a dispersar?» — la pregunta que faltaba.
 *
 * Nico (22-09): «deberías de preguntar hacia qué banco van a dispersar para
 * poder que el texto plano sea específico para cada banco y no hayan errores
 * cuando lo vayan ellos a subir allá». El archivo de Bancolombia no lo acepta
 * Banco de Bogotá y al revés: el banco se elige al ARMAR el lote, queda con él,
 * y su archivo sale en ese formato.
 *
 * Tres cosas que la pantalla hace a propósito:
 *
 * · TODOS los bancos aparecen y todos se pueden elegir (Nico, 22-09: «el
 *   archivo plano para TODOS los bancos de Colombia»), AGRUPADOS por lo que
 *   reciben: «Archivo del banco — oficial», «— de tercero, sin verificar» o
 *   «Planilla para cargar a mano». La planilla es para los bancos que no
 *   publican cómo se arma su archivo: se dice sin rodeos, con el porqué, y se
 *   pide el instructivo del banco.
 * · Propone lo último que eligió la agencia (lo guarda el back con cada lote).
 * · Si la inmobiliaria ya registró la cuenta en Medios de pago, se ofrece con
 *   un clic: nadie tiene que escribir de memoria una cuenta que ya está.
 *
 * Nunca un formato adivinado: si el back no tiene la estructura del banco,
 * lo que sale es la planilla, y la pantalla lo dice antes de armar.
 */

import { useEffect, useMemo, useState } from 'react';
import { Banner } from '@leasefy/cadence';
import { ArrowSquareOut } from '@phosphor-icons/react';
import Link from 'next/link';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  lotesDeDispersionApi,
  type BancoDeOrigen,
  type BancosParaGirar,
  type OrigenPedido,
  type TipoDeCuentaDeOrigen,
} from '@/lib/api/lotes-de-dispersion.service';
import { cn } from '@/lib/utils';
import { hrefDeSeccion } from '@/app/panel/inmobiliaria/configuracion/secciones';

import { entregaDe, ETIQUETA_DE_LA_ENTREGA, ORDEN_DE_LA_ENTREGA } from './entrega-del-formato';

/** Lo que la pantalla de armar necesita saber para habilitar el botón. */
export interface EleccionDelBanco {
  /** `null` cuando no hay nada que mandar (sin elegir, o sin la migración). */
  origen: OrigenPedido | null;
  /** `true` = se puede armar con esto. */
  listo: boolean;
}

const TIPOS: Array<{ id: TipoDeCuentaDeOrigen; nombre: string }> = [
  { id: 'AHORROS', nombre: 'Ahorros' },
  { id: 'CORRIENTE', nombre: 'Corriente' },
];

/** Lo que se escribe a mano: dígitos, con guiones o espacios si los trae. */
export function cuentaEscritaValida(texto: string): boolean {
  const limpio = texto.trim();
  return /^[\d\s.-]+$/.test(limpio) && /\d/.test(limpio);
}

export function ElegirBancoDeOrigen({ onCambio }: { onCambio: (e: EleccionDelBanco) => void }) {
  const [datos, setDatos] = useState<BancosParaGirar | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banco, setBanco] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoDeCuentaDeOrigen>('AHORROS');
  const [numero, setNumero] = useState('');

  useEffect(() => {
    let vigente = true;
    lotesDeDispersionApi
      .bancos()
      .then((r) => {
        if (!vigente) return;
        setDatos(r);
        // Se propone lo último que eligió la agencia; si nunca eligió, la
        // primera cuenta registrada de un banco que conocemos.
        if (r.ultima) {
          setBanco(r.ultima.banco);
          setTipo(r.ultima.tipoDeCuenta);
          setNumero(r.ultima.numeroDeCuenta);
          return;
        }
        const registrada = r.cuentas.find((c) => c.banco);
        if (registrada?.banco) {
          setBanco(registrada.banco);
          if (registrada.tipoDeCuenta) setTipo(registrada.tipoDeCuenta);
          setNumero(registrada.numeroDeCuenta);
        }
      })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof Error && e.message ? e.message : 'No se pudo cargar la lista de bancos.');
      });
    return () => {
      vigente = false;
    };
  }, []);

  const elegido: BancoDeOrigen | null = useMemo(
    () => datos?.bancos.find((b) => b.id === banco) ?? null,
    [datos, banco],
  );
  const cuentasDelBanco = useMemo(
    () => (datos?.cuentas ?? []).filter((c) => c.banco === banco),
    [datos, banco],
  );

  const numeroValido = cuentaEscritaValida(numero);

  useEffect(() => {
    if (!datos) {
      onCambio({ origen: null, listo: false });
      return;
    }
    // Sin la migración el lote se arma como antes: no hay nada que preguntar.
    if (!datos.disponible) {
      onCambio({ origen: null, listo: true });
      return;
    }
    if (!elegido?.formato || !numeroValido) {
      onCambio({ origen: null, listo: false });
      return;
    }
    onCambio({
      origen: { banco: elegido.id, tipoDeCuenta: tipo, numeroDeCuenta: numero.trim() },
      listo: true,
    });
  }, [datos, elegido, tipo, numero, numeroValido, onCambio]);

  if (error) {
    return <Banner variant="danger">{error}</Banner>;
  }

  if (!datos) {
    return (
      <p className="flex items-center gap-2 text-sm text-fg-muted">
        <Spinner size="sm" variant="current" />
        Cargando los bancos…
      </p>
    );
  }

  if (!datos.disponible) {
    return (
      <Banner variant="info" title="Todavía no se pregunta desde qué banco giras">
        {datos.motivo}
      </Banner>
    );
  }

  const elegirBanco = (id: string) => {
    setBanco(id);
    // Al cambiar de banco, la cuenta escrita era de OTRO banco: se propone la
    // registrada de éste, o la última si era de éste, o se deja vacía.
    const ultima = datos.ultima?.banco === id ? datos.ultima : null;
    const registrada = datos.cuentas.find((c) => c.banco === id);
    setNumero(ultima?.numeroDeCuenta ?? registrada?.numeroDeCuenta ?? '');
    setTipo(ultima?.tipoDeCuenta ?? registrada?.tipoDeCuenta ?? 'AHORROS');
  };

  return (
    <section className="space-y-3" data-testid="elegir-banco-de-origen">
      <div className="space-y-1">
        <p className="text-sm font-medium text-fg">¿Desde qué banco vas a dispersar?</p>
        <p className="text-caption text-fg-muted">
          Cada banco dice qué recibes: su archivo, listo para subirlo a su portal, o una planilla para cargar a
          mano cuando el banco no publica cómo se arma su archivo.
        </p>
      </div>

      <div role="radiogroup" aria-label="Banco desde el que se gira" className="space-y-3">
        {ORDEN_DE_LA_ENTREGA.map((entrega) => {
          const delGrupo = datos.bancos.filter((b) => entregaDe(b) === entrega);
          if (delGrupo.length === 0) return null;
          return (
            <div key={entrega} className="space-y-1.5" data-testid={`grupo-${entrega}`}>
              <p className="text-caption text-fg-muted">{ETIQUETA_DE_LA_ENTREGA[entrega]}</p>
              <div className="flex flex-wrap gap-2">
                {delGrupo.map((b) => {
                  const activo = b.id === banco;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      role="radio"
                      aria-checked={activo}
                      data-testid={`banco-${b.id}`}
                      onClick={() => elegirBanco(b.id)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm transition-colors',
                        activo
                          ? 'border-primary bg-primary-soft text-fg'
                          : 'border-border text-fg hover:border-border-strong',
                        !b.formato && !activo && 'text-fg-muted',
                      )}
                    >
                      {b.nombre}
                      {!b.formato && <span className="ml-1.5 text-caption text-fg-muted">· no disponible todavía</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {elegido && !elegido.formato && (
        <div data-testid="banco-sin-formato">
          <Banner variant="warning" title={`Todavía no se puede girar desde ${elegido.nombre}`}>
            {elegido.porQueNo}
          </Banner>
        </div>
      )}

      {elegido?.formato && entregaDe(elegido) === 'PLANILLA' && (
        <div data-testid="banco-con-planilla">
          <Banner variant="info" title={`Para ${elegido.nombre} te damos una planilla para cargar a mano`}>
            {elegido.porQueNo} La planilla trae, por pago, el titular, su documento, el banco y su código, el tipo y
            el número de cuenta y el valor, para digitarlos en el portal o pegarlos en la plantilla que te dé tu
            banco. Si tu ejecutivo te da el instructivo del archivo plano, envíanoslo y generamos el archivo.
          </Banner>
        </div>
      )}

      {elegido?.formato && entregaDe(elegido) === 'ARCHIVO_DE_TERCERO' && elegido.fuente && (
        <div data-testid="banco-de-tercero">
          <Banner variant="warning" title="Formato de un tercero, sin verificar">
            Formato tomado de {elegido.fuente.documento}; sube primero un archivo de prueba al portal y revisa que
            lo valide sin errores antes de autorizar.
          </Banner>
        </div>
      )}

      {elegido?.formato && (
        <div className="space-y-3 rounded-md border border-border p-3" data-testid="cuenta-de-origen">
          {cuentasDelBanco.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-caption text-fg-muted">Tus cuentas de {elegido.nombre}:</span>
              {cuentasDelBanco.map((c) => (
                <button
                  key={c.medioDePagoId}
                  type="button"
                  onClick={() => {
                    setNumero(c.numeroDeCuenta);
                    if (c.tipoDeCuenta) setTipo(c.tipoDeCuenta);
                  }}
                  className="rounded-full border border-border px-2.5 py-1 text-caption text-fg hover:border-border-strong"
                >
                  {c.nombre} · <span className="font-mono">{c.numeroDeCuenta}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <span className="block text-caption text-fg-muted" id="tipo-de-cuenta-origen">
                Tipo de cuenta
              </span>
              <div role="radiogroup" aria-labelledby="tipo-de-cuenta-origen" className="flex gap-1">
                {TIPOS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={tipo === t.id}
                    onClick={() => setTipo(t.id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm',
                      tipo === t.id ? 'border-primary bg-primary-soft text-fg' : 'border-border text-fg-muted',
                    )}
                  >
                    {t.nombre}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="numero-de-cuenta-origen" className="text-caption text-fg-muted">
                Número de la cuenta de {elegido.nombre} desde la que sale la plata
              </Label>
              <Input
                id="numero-de-cuenta-origen"
                inputMode="numeric"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="h-10 w-56 font-mono"
                aria-invalid={numero !== '' && !numeroValido}
              />
            </div>
          </div>
          {numero !== '' && !numeroValido && (
            <p className="text-caption text-danger">El número de cuenta sólo lleva dígitos.</p>
          )}
          {cuentasDelBanco.length === 0 && (
            <p className="text-caption text-fg-muted">
              ¿La tienes registrada? Guárdala en{' '}
              <Link href={hrefDeSeccion('medios-de-pago')} className="text-primary underline-offset-4 hover:underline">
                Medios de pago
              </Link>{' '}
              y la próxima vez aparece aquí.
            </p>
          )}
          {elegido.fuente && entregaDe(elegido) === 'ARCHIVO_OFICIAL' && (
            <p className="text-caption text-fg-muted" data-testid="fuente-del-formato">
              Archivo «{elegido.nombreDelFormato}», armado campo por campo con{' '}
              <a
                href={elegido.fuente.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-primary underline-offset-4 hover:underline"
              >
                el instructivo oficial del banco
                <ArrowSquareOut className="h-3 w-3" aria-hidden="true" />
              </a>{' '}
              ({elegido.fuente.version}).
            </p>
          )}
        </div>
      )}
    </section>
  );
}
