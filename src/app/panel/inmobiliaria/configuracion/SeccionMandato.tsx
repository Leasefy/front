'use client';

/**
 * Mandato y plata del propietario (reglas del 17-09), en la configuración de la
 * inmobiliaria:
 *
 *   · D1 — la modalidad POR DEFECTO de los mandatos (cada uno la puede pisar en
 *     la ficha del inmueble). Sin escoger, la liquidación de siempre.
 *   · Los cobros extra al PROPIETARIO al arrendar (colocación, póliza opcional,
 *     otro con nombre): se descuentan en su primera liquidación.
 *   · D4 — si la inmobiliaria es responsable de IVA, que decide si la comisión
 *     de administración lleva IVA (la tarifa se edita en Perfil).
 *
 * Cambiar la modalidad rige desde hoy: el back guarda la fecha y lo dice.
 */

import { useCallback, useEffect, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@leasefy/cadence';
import { Checkbox } from '@/components/ui/checkbox';
import { HandCoins, Percent, Plus, Receipt, Trash, WarningCircle } from '@phosphor-icons/react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { agencyApi } from '@/lib/api/inmobiliaria.service';
import {
  mandatoApi,
  type CobroAlArrendar,
  type ConfiguracionDelMandato,
  type Modalidad,
} from '@/lib/api/mandato.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { PESOS, QUE_ES_LA_MODALIDAD, diaLegible } from '@/lib/mandato/textos';
import { EsqueletoDeSeccion } from './piezas';

type Borrador = Omit<CobroAlArrendar, 'id'> & { id?: string; clave: string };

let secuencia = 0;
const nuevaClave = () => `cobro-${++secuencia}`;

export function SeccionMandato() {
  const [config, setConfig] = useState<ConfiguracionDelMandato | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setConfig(await mandatoApi.configuracion());
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <EstadoDeDatos
      cargando={cargando}
      error={error}
      vacio={!config}
      queEs="la configuración del mandato"
      onReintentar={cargar}
      esqueleto={<EsqueletoDeSeccion filas={4} />}
    >
      {config ? (
        <div className="space-y-6" data-testid="seccion-mandato">
          {!config.disponible && config.motivo ? (
            <div className="rounded-md bg-warning-soft px-4 py-3 text-sm text-warning flex gap-2">
              <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{config.motivo}</span>
            </div>
          ) : null}
          <ModalidadPorDefecto config={config} onGuardado={setConfig} />
          <CobrosAlArrendar config={config} onGuardado={setConfig} />
          <IvaDeLaComision config={config} onGuardado={cargar} />
        </div>
      ) : null}
    </EstadoDeDatos>
  );
}

function ModalidadPorDefecto({
  config,
  onGuardado,
}: {
  config: ConfiguracionDelMandato;
  onGuardado: (c: ConfiguracionDelMandato) => void;
}) {
  const [valor, setValor] = useState<Modalidad | ''>(config.modalidadDeMandato ?? '');
  const [guardando, setGuardando] = useState(false);
  const cambio = (valor || null) !== config.modalidadDeMandato;

  async function guardar() {
    setGuardando(true);
    try {
      const c = await mandatoApi.guardarConfiguracion({ modalidadDeMandato: valor || null });
      toast.success('Modalidad por defecto guardada.', {
        description: 'Rige desde hoy para los mandatos que no tengan una propia.',
      });
      onGuardado(c);
    } catch (e) {
      toast.error('No se pudo guardar.', { description: mensajeDelFallo(e, '') });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="space-y-4 p-5 rounded-lg bg-card border border-border">
      <div className="flex items-center gap-2">
        <HandCoins className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-base font-semibold text-foreground">Modalidad de los mandatos</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Con qué base se le gira al propietario. Cada mandato la puede cambiar en la ficha del inmueble; los que
        no tengan una propia usan ésta.
      </p>
      {/* Radios del sistema de diseño (21-09): el del navegador mide 13 px. */}
      <RadioGroup
        className="space-y-2"
        value={valor ?? ''}
        onValueChange={(nuevo) => setValor((nuevo || null) as typeof valor)}
      >
        {(
          [
            ['', 'Sin modalidad', 'La liquidación de siempre: la base la escoge quien genera los giros (lo causado, por defecto).'],
            ['GARANTIZADO', 'Garantizado', QUE_ES_LA_MODALIDAD.GARANTIZADO],
            ['SOBRE_RECAUDO', 'Sobre recaudo', QUE_ES_LA_MODALIDAD.SOBRE_RECAUDO],
          ] as const
        ).map(([v, nombre, ayuda]) => (
          <label
            key={v || 'ninguna'}
            className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-surface-hover"
          >
            <RadioGroupItem
              value={v ?? ''}
              disabled={!config.disponible}
              className="mt-1"
            />
            <span>
              <span className="block text-sm text-foreground">{nombre}</span>
              <span className="block text-xs text-muted-foreground">{ayuda}</span>
            </span>
          </label>
        ))}
      </RadioGroup>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {config.modalidadDeMandatoDesde
            ? `La actual rige desde el ${diaLegible(config.modalidadDeMandatoDesde)}.`
            : 'Intereses de mora: por defecto, garantizado → de la inmobiliaria; sobre recaudo → del propietario.'}
        </p>
        <Button size="sm" hideArrow onClick={guardar} disabled={!cambio || !config.disponible} isLoading={guardando}>
          Guardar
        </Button>
      </div>
    </section>
  );
}

function CobrosAlArrendar({
  config,
  onGuardado,
}: {
  config: ConfiguracionDelMandato;
  onGuardado: (c: ConfiguracionDelMandato) => void;
}) {
  const [filas, setFilas] = useState<Borrador[]>(() =>
    config.cobrosAlArrendar.map((c) => ({ ...c, clave: c.id })),
  );
  const [guardando, setGuardando] = useState(false);

  const cambiar = (clave: string, cambio: Partial<Borrador>) =>
    setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)));

  async function guardar() {
    setGuardando(true);
    try {
      const c = await mandatoApi.guardarConfiguracion({
        cobrosAlArrendar: filas.map(({ clave: _clave, ...f }) => ({
          ...f,
          nombre: f.nombre.trim(),
          valor: Number(f.valor),
        })),
      });
      toast.success('Cobros al arrendar guardados.');
      setFilas(c.cobrosAlArrendar.map((x) => ({ ...x, clave: x.id })));
      onGuardado(c);
    } catch (e) {
      toast.error('No se pudieron guardar los cobros.', { description: mensajeDelFallo(e, '') });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="space-y-4 p-5 rounded-lg bg-card border border-border" data-testid="cobros-al-arrendar-config">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-base font-semibold text-foreground">Cobros al propietario al arrendar</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          hideArrow
          disabled={!config.disponible}
          onClick={() =>
            setFilas((fs) => [
              ...fs,
              { clave: nuevaClave(), nombre: '', tipo: 'PORCENTAJE_PRIMER_CANON', valor: 0, opcional: false, activo: true },
            ])
          }
        >
          <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
          Agregar
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Además del % mensual: colocación, una póliza opcional o cualquier cobro con nombre. Se descuentan en la
        primera liquidación del propietario. Los obligatorios entran solos cuando se activa un contrato nuevo; los
        opcionales se escogen en la ficha del contrato.
      </p>

      {filas.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay cobros configurados.</p>
      ) : (
        <div className="space-y-3">
          {filas.map((f) => (
            <div key={f.clave} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_120px_auto_auto] gap-2 items-center">
              <Input
                aria-label="Nombre del cobro"
                placeholder="Comisión de colocación"
                value={f.nombre}
                onChange={(e) => cambiar(f.clave, { nombre: e.target.value })}
              />
              <select
                aria-label="Tipo de cobro"
                className="h-11 rounded-md border border-border bg-surface px-3 text-sm"
                value={f.tipo}
                onChange={(e) => cambiar(f.clave, { tipo: e.target.value as Borrador['tipo'] })}
              >
                <option value="PORCENTAJE_PRIMER_CANON">% del primer canon</option>
                <option value="VALOR_FIJO">Valor fijo</option>
              </select>
              <Input
                aria-label={f.tipo === 'VALOR_FIJO' ? 'Valor en pesos' : 'Porcentaje del primer canon'}
                inputMode="decimal"
                className="font-mono"
                value={f.valor ? String(f.valor) : ''}
                onChange={(e) => cambiar(f.clave, { valor: Number(e.target.value.replace(',', '.')) || 0 })}
              />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={f.opcional} onCheckedChange={(marcada: boolean) => cambiar(f.clave, { opcional: marcada })} />
                Opcional
              </label>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Quitar ${f.nombre || 'cobro'}`}
                onClick={() => setFilas((fs) => fs.filter((x) => x.clave !== f.clave))}
              >
                <Trash className="w-4 h-4" aria-hidden="true" />
              </Button>
              {f.tipo === 'VALOR_FIJO' && f.valor > 0 ? (
                <p className="sm:col-span-5 text-xs text-muted-foreground -mt-1">{PESOS.format(f.valor)}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <Button size="sm" hideArrow onClick={guardar} isLoading={guardando} disabled={!config.disponible}>
          Guardar cobros
        </Button>
      </div>
    </section>
  );
}

function IvaDeLaComision({
  config,
  onGuardado,
}: {
  config: ConfiguracionDelMandato;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const actual = config.ivaDeLaComision.responsableIva;

  async function guardar(valor: boolean | null) {
    setGuardando(true);
    try {
      await agencyApi.updateAgency({ responsableIva: valor });
      toast.success('Perfil de IVA guardado.', {
        description: 'Aplica a las cuotas que se generen o regeneren desde ahora.',
      });
      onGuardado();
    } catch (e) {
      toast.error('No se pudo guardar.', { description: mensajeDelFallo(e, '') });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="space-y-4 p-5 rounded-lg bg-card border border-border" data-testid="iva-de-la-comision">
      <div className="flex items-center gap-2">
        <Percent className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-base font-semibold text-foreground">IVA de la comisión de administración</h3>
      </div>
      <p className="text-sm text-foreground" data-testid="efecto-del-iva">
        {config.ivaDeLaComision.efecto}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="¿La inmobiliaria es responsable de IVA?">
        {(
          [
            [true, 'Responsable de IVA'],
            [false, 'No responsable'],
            [null, 'Sin definir'],
          ] as const
        ).map(([v, nombre]) => (
          <Button
            key={String(v)}
            size="sm"
            hideArrow
            variant={actual === v ? 'default' : 'outline'}
            disabled={guardando}
            onClick={() => actual !== v && guardar(v)}
          >
            {nombre}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        La tarifa ({config.ivaDeLaComision.ivaPorcentaje.toLocaleString('es-CO')} %) se edita en Perfil, en
        «Impuestos y retenciones». Confírmalo con tu contador.
      </p>
    </section>
  );
}
