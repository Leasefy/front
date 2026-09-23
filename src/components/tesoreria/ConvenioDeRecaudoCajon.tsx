'use client';

/**
 * El formulario del convenio de recaudo con el banco.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * Nico, 21-09-2026, sobre `pagos/recaudo-bancario`: «no se entiende nada qué
 * tiene que hacer el usuario ni qué ver».
 *
 * Tenía razón, y la causa era peor que un problema de redacción: la pantalla
 * eran cuatro párrafos de prosa, dos cajas de texto que decían casi lo mismo
 * («No hay convenios configurados todavía» y «Todavía no tienes ningún convenio
 * de recaudo activo. Configúralo…») y **ni un solo botón**. Mandaba a
 * configurar algo que no se podía configurar en ninguna parte del producto.
 *
 * 🔴 El back tenía las rutas desde siempre (`POST` y `PUT
 * /inmobiliaria/tesoreria/convenios`) y el cliente del front tenía
 * `crearConvenio` y `guardarConvenio` escritos — sin un solo llamador. Es el
 * mismo patrón que las plantillas de documento del 21-09: lo que parecía un
 * cable suelto era la mitad de una función.
 *
 * ── Las tres decisiones del formulario ──────────────────────────────────────
 *
 * 1. **Se arranca por un PRESET, no por 14 campos.** Nadie sabe de memoria en
 *    qué posición va la referencia; lo sabe el diseño de registro que le mandó
 *    el banco. El preset pone un formato típico completo y deja ajustar, y su
 *    advertencia dice EXACTAMENTE qué comparar contra ese papel.
 *
 * 2. **El formato lo valida el BACK.** Acá no se parsea nada: el back devuelve
 *    los problemas en palabras («la referencia y la fecha se pisan en la
 *    posición 25») y eso se muestra tal cual. Un validador propio sería una
 *    segunda definición del mismo formato, y el día que se separen la pantalla
 *    aceptaría algo que el archivo no puede leer.
 *
 * 3. **La vía de entrada se explica ANTES de elegirla.** Marcar una cuenta como
 *    `ARCHIVO` hace que su extracto bancario se rechace con un 409, y eso no se
 *    puede descubrir apretando un botón tres pantallas más allá.
 *
 * El ejemplo de referencia que devuelve el back al guardar se muestra al
 * terminar: es lo que permite comparar contra el volante del banco sin importar
 * un archivo de verdad.
 */

import { useCallback, useMemo, useState } from 'react';
import { Warning } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@leasefy/cadence';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertaAccionable } from '@/components/ui/alerta-accionable';
import { toast } from '@/components/ui/toast';
import { tesoreriaApi } from '@/lib/api/tesoreria.service';
import { motivoLegible } from '@/lib/api/dispersiones-errores';
import type {
  Convenio,
  ListaDeConvenios,
  MapaDeColumnas,
  TipoDeArchivoDeRecaudo,
  UbicacionDelCampo,
  ViaDeEntrada,
} from '@/lib/api/tesoreria.types';

/** Los tres campos que el archivo tiene que traer, y los dos opcionales. */
const CAMPOS = [
  { clave: 'referencia' as const, rotulo: 'Referencia', obligatorio: true },
  { clave: 'fecha' as const, rotulo: 'Fecha del pago', obligatorio: true },
  { clave: 'valor' as const, rotulo: 'Valor', obligatorio: true },
  { clave: 'secuencia' as const, rotulo: 'Secuencia', obligatorio: false },
  { clave: 'oficina' as const, rotulo: 'Oficina', obligatorio: false },
];

type ClaveDeCampo = (typeof CAMPOS)[number]['clave'];

/** El estado del formulario. Los números viven como texto: un input vacío no es 0. */
interface Borrador {
  banco: string;
  codigo: string;
  nombre: string;
  tipo: TipoDeArchivoDeRecaudo;
  separador: string;
  columnas: MapaDeColumnas;
  formatoDeFecha: string;
  decimales: number;
  lineasDeEncabezado: string;
  lineasDePie: string;
  marcaDeDetalle: string;
  marcaEn: string;
  referenciaLargo: string;
  referenciaPrefijo: string;
  referenciaDv: 'NINGUNO' | 'MODULO_10' | 'MODULO_11';
  cuentaBancaria: string;
  viaDeEntrada: ViaDeEntrada;
  activo: boolean;
}

function deLaFila(c: Convenio): Borrador {
  return {
    banco: c.banco,
    codigo: c.codigo,
    nombre: c.nombre,
    tipo: c.tipo,
    separador: c.separador ?? ';',
    columnas: c.columnas,
    formatoDeFecha: c.formatoDeFecha,
    decimales: c.decimales,
    lineasDeEncabezado: String(c.lineasDeEncabezado),
    lineasDePie: String(c.lineasDePie),
    marcaDeDetalle: c.marcaDeDetalle ?? '',
    marcaEn: c.marcaEn === null ? '' : String(c.marcaEn),
    referenciaLargo: c.referenciaLargo === null ? '' : String(c.referenciaLargo),
    referenciaPrefijo: c.referenciaPrefijo ?? '',
    referenciaDv: c.referenciaDv,
    cuentaBancaria: c.cuentaBancaria ?? '',
    viaDeEntrada: c.viaDeEntrada,
    activo: c.activo,
  };
}

function enBlanco(formatosDeFecha: string[]): Borrador {
  return {
    banco: '',
    codigo: '',
    nombre: '',
    tipo: 'ANCHO_FIJO',
    separador: ';',
    columnas: {},
    formatoDeFecha: formatosDeFecha[0] ?? 'YYYYMMDD',
    decimales: 2,
    lineasDeEncabezado: '0',
    lineasDePie: '0',
    marcaDeDetalle: '',
    marcaEn: '',
    referenciaLargo: '',
    referenciaPrefijo: '',
    referenciaDv: 'NINGUNO',
    cuentaBancaria: '',
    viaDeEntrada: 'ARCHIVO',
    activo: true,
  };
}

/** `''` → `undefined`: un campo vacío no se manda, no se manda como 0. */
function numero(texto: string): number | undefined {
  const n = Number(texto.trim());
  return texto.trim() === '' || Number.isNaN(n) ? undefined : n;
}

function esAnchoFijo(u: UbicacionDelCampo | undefined): u is { desde: number; largo: number } {
  return Boolean(u && 'desde' in u);
}

export interface ConvenioDeRecaudoCajonProps {
  /** `null` = cerrado. `'nuevo'` = crear. Un convenio = editarlo. */
  abierto: null | 'nuevo' | Convenio;
  catalogo: ListaDeConvenios;
  onCerrar: () => void;
  onGuardado: () => void;
}

export function ConvenioDeRecaudoCajon({
  abierto,
  catalogo,
  onCerrar,
  onGuardado,
}: ConvenioDeRecaudoCajonProps) {
  const editando = abierto !== null && abierto !== 'nuevo' ? abierto : null;
  const [borrador, setBorrador] = useState<Borrador>(() =>
    editando ? deLaFila(editando) : enBlanco(catalogo.formatosDeFecha),
  );
  const [preset, setPreset] = useState<string>('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<unknown>(null);
  /** La clave del cajón: reinicia el borrador cuando se abre con otro convenio. */
  const clave = editando?.id ?? 'nuevo';
  const [claveVista, setClaveVista] = useState(clave);
  if (claveVista !== clave) {
    setClaveVista(clave);
    setBorrador(editando ? deLaFila(editando) : enBlanco(catalogo.formatosDeFecha));
    setPreset('');
    setError(null);
  }

  const cambiar = useCallback(<K extends keyof Borrador>(campo: K, valor: Borrador[K]) => {
    setBorrador((b) => ({ ...b, [campo]: valor }));
  }, []);

  /** El preset pone un formato completo y típico; los datos del banco no los toca. */
  const aplicarPreset = useCallback(
    (clavePreset: string) => {
      setPreset(clavePreset);
      const p = catalogo.presets.find((x) => x.clave === clavePreset);
      if (!p) return;
      setBorrador((b) => ({
        ...b,
        tipo: p.formato.tipo,
        separador: p.formato.separador ?? b.separador,
        columnas: p.formato.columnas,
        formatoDeFecha: p.formato.formatoDeFecha,
        decimales: p.formato.decimales,
        lineasDeEncabezado: String(p.formato.lineasDeEncabezado),
        lineasDePie: String(p.formato.lineasDePie),
        marcaDeDetalle: p.formato.marcaDeDetalle ?? '',
        marcaEn: p.formato.marcaEn == null ? '' : String(p.formato.marcaEn),
      }));
    },
    [catalogo.presets],
  );

  const presetElegido = useMemo(
    () => catalogo.presets.find((p) => p.clave === preset) ?? null,
    [catalogo.presets, preset],
  );

  const ubicar = useCallback((campo: ClaveDeCampo, cual: 'desde' | 'largo' | 'indice', texto: string) => {
    setBorrador((b) => {
      const columnas: MapaDeColumnas = { ...b.columnas };
      const n = numero(texto);
      if (n === undefined) {
        // Borrar la posición de un campo opcional lo saca del mapa; borrar la de
        // uno obligatorio deja el hueco y el back lo dice con palabras.
        delete columnas[campo];
        return { ...b, columnas };
      }
      if (cual === 'indice') {
        columnas[campo] = { indice: n };
      } else {
        const actual = esAnchoFijo(columnas[campo])
          ? (columnas[campo] as { desde: number; largo: number })
          : { desde: 1, largo: 1 };
        columnas[campo] = { ...actual, [cual]: n };
      }
      return { ...b, columnas };
    });
  }, []);

  const guardar = useCallback(async () => {
    setGuardando(true);
    setError(null);
    try {
      const dto = {
        banco: borrador.banco.trim(),
        codigo: borrador.codigo.trim(),
        nombre: borrador.nombre.trim(),
        tipo: borrador.tipo,
        ...(borrador.tipo === 'DELIMITADO' ? { separador: borrador.separador } : {}),
        columnas: borrador.columnas,
        formatoDeFecha: borrador.formatoDeFecha,
        decimales: borrador.decimales,
        lineasDeEncabezado: numero(borrador.lineasDeEncabezado),
        lineasDePie: numero(borrador.lineasDePie),
        marcaDeDetalle: borrador.marcaDeDetalle.trim() || undefined,
        marcaEn: numero(borrador.marcaEn),
        referenciaLargo: numero(borrador.referenciaLargo),
        referenciaPrefijo: borrador.referenciaPrefijo.trim() || undefined,
        referenciaDv: borrador.referenciaDv,
        cuentaBancaria: borrador.cuentaBancaria.trim() || undefined,
        viaDeEntrada: borrador.viaDeEntrada,
        activo: borrador.activo,
      };
      const r = editando
        ? await tesoreriaApi.guardarConvenio(editando.id, dto)
        : await tesoreriaApi.crearConvenio(dto);
      /*
       * El ejemplo de referencia que devuelve el back va en el aviso: es lo que
       * permite comparar contra el volante del banco sin importar un archivo.
       */
      const ejemplo = (r as { ejemploDeReferencia?: string } | null)?.ejemploDeReferencia;
      toast.success(editando ? 'Convenio actualizado' : 'Convenio configurado', {
        description: ejemplo
          ? `El contrato 1850 pagaría con la referencia ${ejemplo}. Compárala con el volante del banco antes de imprimirla.`
          : undefined,
      });
      onGuardado();
      onCerrar();
    } catch (e) {
      // El motivo del back, tal cual: dice qué campo se pisa con cuál.
      setError(e);
    } finally {
      setGuardando(false);
    }
  }, [borrador, editando, onCerrar, onGuardado]);

  if (abierto === null) return null;

  const faltaLoMinimo =
    !borrador.banco.trim() || !borrador.codigo.trim() || !borrador.nombre.trim();

  return (
    <Cajon abierto onOpenChange={(a) => !a && onCerrar()} ancho="sm:max-w-2xl" data-testid="cajon-convenio">
      <CajonCabecera
        titulo={editando ? `Convenio con ${editando.banco}` : 'Configurar el convenio de recaudo'}
        descripcion="Los datos salen del diseño de registro que te entregó el banco al firmar el convenio. Ténlo al lado."
      />

      <CajonCuerpo className="space-y-8">
        {/* 1 · El banco */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-fg">El convenio</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="convenio-banco">Banco</Label>
              <Input
                id="convenio-banco"
                placeholder="Bancolombia"
                value={borrador.banco}
                onChange={(e) => cambiar('banco', e.target.value)}
                data-testid="convenio-banco"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="convenio-codigo">Código del convenio</Label>
              <Input
                id="convenio-codigo"
                placeholder="90210"
                value={borrador.codigo}
                onChange={(e) => cambiar('codigo', e.target.value)}
                data-testid="convenio-codigo"
              />
              <p className="text-caption text-fg-muted">
                El número que el banco le asignó. Está en el contrato del convenio.
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="convenio-nombre">Cómo lo vas a llamar acá</Label>
              <Input
                id="convenio-nombre"
                placeholder="Recaudo de arriendos"
                value={borrador.nombre}
                onChange={(e) => cambiar('nombre', e.target.value)}
                data-testid="convenio-nombre"
              />
            </div>
          </div>
        </section>

        {/* 2 · El formato, arrancando por un preset */}
        <section className="space-y-4 border-t border-border pt-6">
          <div>
            <h3 className="text-sm font-semibold text-fg">Cómo se lee el archivo</h3>
            <p className="mt-1 text-sm text-fg-muted">
              Empieza por un formato típico y ajusta lo que tu banco haga distinto. Ningún
              banco manda el mismo archivo.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Formato típico del que partir</Label>
            <RadioGroup
              value={preset}
              onValueChange={aplicarPreset}
              className="space-y-2"
              data-testid="convenio-presets"
            >
              {catalogo.presets.map((p) => (
                <div key={p.clave} className="flex items-start gap-2">
                  <RadioGroupItem value={p.clave} id={`preset-${p.clave}`} className="mt-0.5" />
                  <Label htmlFor={`preset-${p.clave}`} className="font-normal">
                    {p.nombre}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {/* 🔴 La advertencia del preset dice QUÉ comparar contra el papel del
                banco. Es lo único que evita importar 400 líneas corridas un
                carácter y creer que el banco mandó mal el archivo. */}
            {presetElegido ? (
              <p
                className="flex gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs text-fg"
                data-testid="advertencia-del-preset"
              >
                <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
                {presetElegido.advertencia}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="convenio-tipo">Tipo de archivo</Label>
              <Select
                value={borrador.tipo}
                onValueChange={(v) => cambiar('tipo', v as TipoDeArchivoDeRecaudo)}
              >
                <SelectTrigger id="convenio-tipo" data-testid="convenio-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {catalogo.tipos.map((t) => (
                    <SelectItem key={t.valor} value={t.valor}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {borrador.tipo === 'DELIMITADO' ? (
              <div className="space-y-1.5">
                <Label htmlFor="convenio-separador">Separador</Label>
                <Input
                  id="convenio-separador"
                  placeholder=";"
                  value={borrador.separador}
                  onChange={(e) => cambiar('separador', e.target.value)}
                  data-testid="convenio-separador"
                />
                <p className="text-caption text-fg-muted">
                  Escribe <span className="font-mono">\t</span> si es tabulador.
                </p>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="convenio-fecha">Cómo viene la fecha</Label>
              <Select
                value={borrador.formatoDeFecha}
                onValueChange={(v) => cambiar('formatoDeFecha', v)}
              >
                <SelectTrigger id="convenio-fecha" data-testid="convenio-formato-fecha">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {catalogo.formatosDeFecha.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="convenio-decimales">Cómo viene el valor</Label>
              <Select
                value={String(borrador.decimales)}
                onValueChange={(v) => cambiar('decimales', Number(v))}
              >
                <SelectTrigger id="convenio-decimales" data-testid="convenio-decimales">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">En pesos (1500000 = $1.500.000)</SelectItem>
                  <SelectItem value="2">En centavos (150000000 = $1.500.000)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dónde está cada campo. Ancho fijo pide desde y largo; delimitado,
              el número de columna. */}
          <div className="space-y-2">
            <Label>Dónde está cada campo</Label>
            <div className="space-y-2">
              {CAMPOS.map((campo) => {
                const u = borrador.columnas[campo.clave];
                return (
                  <div
                    key={campo.clave}
                    className="flex flex-wrap items-center gap-2 text-sm"
                    data-testid={`campo-${campo.clave}`}
                  >
                    <span className="w-32 shrink-0 text-fg">
                      {campo.rotulo}
                      {campo.obligatorio ? null : (
                        <span className="text-fg-muted"> (opcional)</span>
                      )}
                    </span>
                    {borrador.tipo === 'ANCHO_FIJO' ? (
                      <>
                        <Input
                          className="w-24"
                          inputMode="numeric"
                          placeholder="desde"
                          aria-label={`${campo.rotulo}: desde qué posición`}
                          value={esAnchoFijo(u) ? String(u.desde) : ''}
                          onChange={(e) => ubicar(campo.clave, 'desde', e.target.value)}
                        />
                        <Input
                          className="w-24"
                          inputMode="numeric"
                          placeholder="largo"
                          aria-label={`${campo.rotulo}: cuántos caracteres`}
                          value={esAnchoFijo(u) ? String(u.largo) : ''}
                          onChange={(e) => ubicar(campo.clave, 'largo', e.target.value)}
                        />
                      </>
                    ) : (
                      <Input
                        className="w-32"
                        inputMode="numeric"
                        placeholder="columna"
                        aria-label={`${campo.rotulo}: en qué columna`}
                        value={u && 'indice' in u ? String(u.indice) : ''}
                        onChange={(e) => ubicar(campo.clave, 'indice', e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-caption text-fg-muted">
              {borrador.tipo === 'ANCHO_FIJO'
                ? 'La primera posición de la línea es la 1.'
                : 'La primera columna es la 0.'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="convenio-encabezado">Líneas de encabezado</Label>
              <Input
                id="convenio-encabezado"
                inputMode="numeric"
                value={borrador.lineasDeEncabezado}
                onChange={(e) => cambiar('lineasDeEncabezado', e.target.value)}
                data-testid="convenio-encabezado"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="convenio-pie">Líneas de pie</Label>
              <Input
                id="convenio-pie"
                inputMode="numeric"
                value={borrador.lineasDePie}
                onChange={(e) => cambiar('lineasDePie', e.target.value)}
                data-testid="convenio-pie"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="convenio-marca">Marca de los registros de detalle</Label>
              <Input
                id="convenio-marca"
                placeholder="1"
                value={borrador.marcaDeDetalle}
                onChange={(e) => cambiar('marcaDeDetalle', e.target.value)}
                data-testid="convenio-marca"
              />
              <p className="text-caption text-fg-muted">
                Si el archivo mezcla tipos de registro, con qué se reconoce el de un pago.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="convenio-marca-en">Dónde está esa marca</Label>
              <Input
                id="convenio-marca-en"
                inputMode="numeric"
                value={borrador.marcaEn}
                onChange={(e) => cambiar('marcaEn', e.target.value)}
                data-testid="convenio-marca-en"
              />
            </div>
          </div>
        </section>

        {/* 3 · La referencia */}
        <section className="space-y-4 border-t border-border pt-6">
          <div>
            <h3 className="text-sm font-semibold text-fg">La referencia de pago</h3>
            <p className="mt-1 text-sm text-fg-muted">
              Es lo que se imprime en el recibo de cada contrato y lo que el banco devuelve
              en el archivo. Tiene que quedar idéntica a la del volante.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="convenio-prefijo">Prefijo</Label>
              <Input
                id="convenio-prefijo"
                placeholder="LSF"
                value={borrador.referenciaPrefijo}
                onChange={(e) => cambiar('referenciaPrefijo', e.target.value)}
                data-testid="convenio-prefijo"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="convenio-largo">Largo total</Label>
              <Input
                id="convenio-largo"
                inputMode="numeric"
                placeholder="10"
                value={borrador.referenciaLargo}
                onChange={(e) => cambiar('referenciaLargo', e.target.value)}
                data-testid="convenio-largo"
              />
              <p className="text-caption text-fg-muted">Se rellena con ceros a la izquierda.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="convenio-dv">Dígito de verificación</Label>
              <Select
                value={borrador.referenciaDv}
                onValueChange={(v) => cambiar('referenciaDv', v as Borrador['referenciaDv'])}
              >
                <SelectTrigger id="convenio-dv" data-testid="convenio-dv">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NINGUNO">Sin dígito</SelectItem>
                  <SelectItem value="MODULO_10">Módulo 10</SelectItem>
                  <SelectItem value="MODULO_11">Módulo 11</SelectItem>
                </SelectContent>
              </Select>
              {/* ⚠️ No es una preferencia: lo fija el banco en el contrato. */}
              <p className="text-caption text-fg-muted">
                Lo fija el banco en el contrato del convenio, no se elige.
              </p>
            </div>
          </div>
        </section>

        {/* 4 · La cuenta y por dónde entra la plata */}
        <section className="space-y-4 border-t border-border pt-6">
          <div>
            <h3 className="text-sm font-semibold text-fg">La cuenta que recauda</h3>
            <p className="mt-1 text-sm text-fg-muted">
              A qué cuenta le consigna el banco lo que recaudó.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="convenio-cuenta">Número de cuenta</Label>
            <Input
              id="convenio-cuenta"
              placeholder="00123456789"
              value={borrador.cuentaBancaria}
              onChange={(e) => cambiar('cuentaBancaria', e.target.value)}
              data-testid="convenio-cuenta"
            />
          </div>
          <div className="space-y-2">
            <Label>Por dónde entra la plata de esa cuenta</Label>
            <RadioGroup
              value={borrador.viaDeEntrada}
              onValueChange={(v) => cambiar('viaDeEntrada', v as ViaDeEntrada)}
              className="space-y-2"
              data-testid="convenio-via"
            >
              {catalogo.viasDeEntrada.map((v) => (
                <div key={v.valor} className="flex items-start gap-2">
                  <RadioGroupItem value={v.valor} id={`via-${v.valor}`} className="mt-0.5" />
                  <Label htmlFor={`via-${v.valor}`} className="font-normal">
                    {v.nombre}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {/* 🔴 Una cuenta tiene UN camino de entrada. Se dice acá, antes de
                elegir: marcarla como ARCHIVO hace que cargar su extracto
                responda 409, y eso no se puede descubrir apretando el botón
                tres pantallas más allá. */}
            <p className="text-caption text-fg-muted">
              Nunca por las dos: sería la misma plata vista dos veces y el mismo pago
              quedaría dos veces en la cola. Si eliges el archivo, el extracto de esa
              cuenta se va a rechazar.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <Label htmlFor="convenio-activo">Convenio activo</Label>
              <p className="text-caption text-fg-muted">
                Sólo los activos se pueden usar para importar un archivo.
              </p>
            </div>
            <Switch
              id="convenio-activo"
              checked={borrador.activo}
              onCheckedChange={(v: boolean) => cambiar('activo', v)}
              data-testid="convenio-activo"
            />
          </div>
        </section>

        {/* El motivo del back, tal cual: dice qué campo se pisa con cuál. */}
        {error != null ? (
          <AlertaAccionable
            severidad="danger"
            titulo="No se guardó el convenio"
            data-testid="convenio-error"
          >
            {motivoLegible(error) ?? 'Revisa los datos e inténtalo otra vez.'}
          </AlertaAccionable>
        ) : null}
      </CajonCuerpo>

      <CajonPie
        ayuda={
          faltaLoMinimo
            ? 'Falta el banco, el código del convenio o el nombre.'
            : 'Al guardar te mostramos cómo quedaría la referencia de un contrato, para compararla con el volante del banco.'
        }
      >
        <Button variant="ghost" hideArrow onClick={onCerrar}>
          Cancelar
        </Button>
        <Button
          hideArrow
          onClick={guardar}
          disabled={faltaLoMinimo || guardando}
          isLoading={guardando}
          data-testid="guardar-convenio"
        >
          {editando ? 'Guardar los cambios' : 'Configurar el convenio'}
        </Button>
      </CajonPie>
    </Cajon>
  );
}
