'use client';

/**
 * Configuración → Conceptos (Nico, 13-10-2026, QA de la migración de
 * Portofino: «son los conceptos que a través del tiempo Portofino ha aplicado,
 * pero eso varía por cada inmobiliaria, hasta darles el nombre que quiera»).
 *
 * «Base de Leasefy + lo suyo»: la inmobiliaria arranca con los conceptos de
 * Leasefy, les pone el nombre que quiera, apaga los que no usa, crea los suyos
 * y trae los de su sistema anterior. A uno de Leasefy sólo se le cambia el
 * nombre: lo que la plataforma hace con él (impuestos, quién paga) es el mismo
 * para todas. Los impuestos no van en el nombre: salen del contrato.
 */

import { useMemo, useRef, useState } from 'react';
import { MagnifyingGlass, Plus, UploadSimple, PencilSimple, Check, X } from '@phosphor-icons/react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { useCatalogoDeConceptos } from '@/lib/conceptos/use-catalogo-de-conceptos';
import { filasDelArchivoDeConceptos } from '@/lib/conceptos/leer-archivo-de-conceptos';
import {
  conceptosApi,
  type ConceptoDelCatalogo,
  type ConceptoPropuesto,
  type PlanDeImportacionDeConceptos,
} from '@/lib/api/conceptos.service';
import type { Parte } from '@/lib/contratos/conceptos';
import type { BaseTributaria } from '@/lib/contratos/escenarios-tributarios';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

export const TIPOS: Record<BaseTributaria, string> = {
  ARRENDAMIENTO: 'Arrendamiento',
  COMISION: 'Comisión',
  SERVICIO_GRAVADO: 'Servicio con IVA',
  NO_GRAVADO: 'Sin impuestos',
};
export const PARTES: Record<Parte, string> = {
  INQUILINO: 'Inquilino',
  PROPIETARIO: 'Propietario',
  INMOBILIARIA: 'Inmobiliaria',
  TERCERO: 'Tercero',
};
const ORIGEN: Record<ConceptoDelCatalogo['origen'], string> = {
  LEASEFY: 'De Leasefy',
  MIGRACION: 'De tu sistema anterior',
  MANUAL: 'Tuyo',
};

const sinTildes = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function SeccionConceptos() {
  const { conceptos, disponible, cargando, deRespaldo, recargar } = useCatalogoDeConceptos();
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<{ clave: string; nombre: string } | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [plan, setPlan] = useState<PlanDeImportacionDeConceptos | null>(null);
  const [importando, setImportando] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);

  const visibles = useMemo(() => {
    const q = sinTildes(busqueda.trim());
    if (!q) return conceptos;
    return conceptos.filter((c) =>
      sinTildes([c.nombre, c.nombreDeLeasefy ?? '', ...c.nombresDelSistemaAnterior].join(' ')).includes(q),
    );
  }, [conceptos, busqueda]);
  const activos = conceptos.filter((c) => c.activo).length;
  const soloLectura = !disponible;

  async function cambiar(c: ConceptoDelCatalogo, cambios: { nombre?: string; activo?: boolean }) {
    setGuardando(c.clave);
    try {
      await conceptosApi.actualizar(c.clave, cambios);
      await recargar();
      setEditando(null);
    } catch (error) {
      toast.error('No se pudo guardar el concepto', { description: mensajeParaLaPersona(error) });
    } finally {
      setGuardando(null);
    }
  }

  async function leerArchivo(archivo: File) {
    try {
      const { parseSpreadsheetFile } = await import('@/components/inmobiliaria/import/lib/parseFile');
      const hoja = await parseSpreadsheetFile(archivo);
      const { filas, sinColumnaDeNombre } = filasDelArchivoDeConceptos(
        hoja.rows as Array<Record<string, unknown>>,
        hoja.headers,
      );
      if (sinColumnaDeNombre || filas.length === 0) {
        toast.error('No encontramos los conceptos en el archivo', {
          description: 'Necesitamos una columna «Nombre» (o «Concepto»). Las de % IVA y retenciones son opcionales.',
        });
        return;
      }
      setPlan(await conceptosApi.vistaPrevia(filas));
    } catch (error) {
      toast.error('No se pudo leer el archivo', { description: mensajeParaLaPersona(error) });
    } finally {
      if (archivoRef.current) archivoRef.current.value = '';
    }
  }

  async function aplicarPlan() {
    if (!plan) return;
    setImportando(true);
    try {
      const r = await conceptosApi.importar(plan.conceptos);
      setPlan(null);
      await recargar();
      toast.success('Conceptos importados', {
        description: `${r.nuevos} nuevos · ${r.renombrados} de Leasefy con tu nombre · ${r.apagados} apagados${r.actualizados ? ` · ${r.actualizados} actualizados` : ''}.`,
      });
    } catch (error) {
      toast.error('No se pudieron importar los conceptos', { description: mensajeParaLaPersona(error) });
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="seccion-conceptos">
      <div className="space-y-1">
        <h2 className="text-h4 text-fg">Conceptos</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Lo que cobras en tus contratos, con el nombre que tú le das. Arrancas con los de Leasefy:
          renómbralos, apaga los que no usas, crea los tuyos o tráelos de tu sistema anterior. Los
          impuestos no van en el nombre: los calcula el contrato según quién le paga a quién.
        </p>
      </div>

      {(soloLectura || deRespaldo) && !cargando && (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-fg" data-testid="conceptos-solo-lectura">
          {deRespaldo
            ? 'No pudimos traer tu catálogo: estás viendo el de Leasefy. Vuelve a intentar en un momento.'
            : 'Tu catálogo propio todavía no está activo: por ahora se usa el de Leasefy y no se puede cambiar.'}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Busca por nombre, también el de tu sistema anterior"
            className="pl-9"
            aria-label="Buscar concepto"
          />
        </div>
        <input
          ref={archivoRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void leerArchivo(f);
          }}
          data-testid="conceptos-archivo"
        />
        <Button variant="outline" disabled={soloLectura} onClick={() => archivoRef.current?.click()} data-testid="conceptos-importar">
          <UploadSimple className="mr-2 h-4 w-4" />
          Importar del sistema anterior
        </Button>
        <Button disabled={soloLectura} onClick={() => setNuevoAbierto(true)} data-testid="conceptos-nuevo">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo concepto
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
          {activos} activos de {conceptos.length}
        </div>
        <ul className="divide-y divide-border" data-testid="conceptos-lista">
          {visibles.map((c) => (
            <li key={c.clave} className="flex flex-wrap items-center gap-3 px-4 py-3" data-testid={`concepto-${c.clave}`}>
              <div className="min-w-[14rem] flex-1 space-y-0.5">
                {editando?.clave === c.clave ? (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={editando.nombre}
                      maxLength={200}
                      onChange={(e) => setEditando({ clave: c.clave, nombre: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editando.nombre.trim().length >= 2) void cambiar(c, { nombre: editando.nombre.trim() });
                        if (e.key === 'Escape') setEditando(null);
                      }}
                      aria-label={`Nuevo nombre de ${c.nombre}`}
                    />
                    <Button size="sm" disabled={guardando === c.clave || editando.nombre.trim().length < 2} onClick={() => void cambiar(c, { nombre: editando.nombre.trim() })} aria-label="Guardar nombre">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditando(null)} aria-label="Cancelar">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className={c.activo ? 'font-medium text-fg' : 'font-medium text-muted-foreground line-through'}>{c.nombre}</p>
                )}
                <p className="text-caption text-muted-foreground">
                  {TIPOS[c.base]} · paga {PARTES[c.paga].toLowerCase()}, recibe {PARTES[c.recibe].toLowerCase()}
                  {c.nombreDeLeasefy ? ` · en Leasefy: «${c.nombreDeLeasefy}»` : ''}
                  {c.nombresDelSistemaAnterior.length > 0
                    ? ` · ${c.nombresDelSistemaAnterior.length === 1 ? '1 nombre' : `${c.nombresDelSistemaAnterior.length} nombres`} de tu sistema anterior`
                    : ''}
                </p>
              </div>
              <Badge variant="outline">{ORIGEN[c.origen]}</Badge>
              {editando?.clave !== c.clave && (
                <Button size="sm" variant="ghost" disabled={soloLectura} onClick={() => setEditando({ clave: c.clave, nombre: c.nombre })}>
                  <PencilSimple className="mr-1 h-4 w-4" />
                  Renombrar
                </Button>
              )}
              <label className="flex items-center gap-2 text-sm text-fg">
                <Checkbox
                  checked={c.activo}
                  disabled={soloLectura || guardando === c.clave}
                  onCheckedChange={(v) => void cambiar(c, { activo: v === true })}
                  aria-label={`${c.activo ? 'Apagar' : 'Activar'} ${c.nombre}`}
                />
                Activo
              </label>
            </li>
          ))}
          {visibles.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted-foreground">Ningún concepto se llama así.</li>
          )}
        </ul>
      </Card>

      <NuevoConcepto abierto={nuevoAbierto} onCerrar={() => setNuevoAbierto(false)} onCreado={recargar} />

      <Dialog open={plan !== null} onOpenChange={(abierto) => !abierto && !importando && setPlan(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Tus conceptos del sistema anterior</DialogTitle>
          </DialogHeader>
          {plan && (
            <PlanEditable plan={plan} onCambio={setPlan} />
          )}
          <DialogFooter>
            <Button variant="outline" disabled={importando} onClick={() => setPlan(null)}>Volver</Button>
            <Button disabled={importando || !plan} onClick={() => void aplicarPlan()} data-testid="conceptos-aplicar">
              {importando ? 'Importando…' : `Importar ${plan?.conceptos.length ?? 0} conceptos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const ACCION: Record<ConceptoPropuesto['accion'], string> = {
  RENOMBRA_BASE: 'Uno de Leasefy, con tu nombre',
  IGUAL_A_LA_BASE: 'Ya está en Leasefy',
  NUEVO: 'Nuevo',
};

function PlanEditable({
  plan,
  onCambio,
}: {
  plan: PlanDeImportacionDeConceptos;
  onCambio: (p: PlanDeImportacionDeConceptos) => void;
}) {
  const cambiar = (i: number, cambios: Partial<ConceptoPropuesto>) =>
    onCambio({ ...plan, conceptos: plan.conceptos.map((c, j) => (j === i ? { ...c, ...cambios } : c)) });
  const r = plan.resumen;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground" data-testid="conceptos-resumen-del-plan">
        {r.filas} filas del archivo quedan en {r.conceptos} conceptos: {r.calzanConLaBase} ya están en Leasefy y{' '}
        {r.nuevos} son nuevos. {r.juntadas > 0 ? `${r.juntadas} filas se juntaron con otra porque sólo cambiaban por impuestos. ` : ''}
        {r.apagados > 0 ? `${r.apagados} entran apagados («NO UTILIZAR»). ` : ''}Puedes cambiar el nombre, el tipo y si queda activo antes de importar.
      </p>
      <div className="max-h-[55vh] overflow-y-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface text-left text-caption text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Quién paga → recibe</th>
              <th className="px-3 py-2">Activo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {plan.conceptos.map((c, i) => {
              const deLeasefy = c.accion !== 'NUEVO';
              return (
                <tr key={`${c.clave ?? 'nuevo'}-${i}`}>
                  <td className="px-3 py-2">
                    <Input value={c.nombre} maxLength={200} onChange={(e) => cambiar(i, { nombre: e.target.value })} aria-label="Nombre del concepto" />
                    <p className="mt-1 text-caption text-muted-foreground">
                      {ACCION[c.accion]}
                      {c.nombresDelSistemaAnterior.length > 1 ? ` · junta ${c.nombresDelSistemaAnterior.length} del archivo` : ''}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    {deLeasefy ? (
                      TIPOS[c.base]
                    ) : (
                      <Select value={c.base} onValueChange={(v) => cambiar(i, { base: v as BaseTributaria })}>
                        <SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(TIPOS).map(([k, t]) => (
                            <SelectItem key={k} value={k}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {PARTES[c.paga]} → {PARTES[c.recibe]}
                  </td>
                  <td className="px-3 py-2">
                    <Checkbox checked={c.activo} onCheckedChange={(v) => cambiar(i, { activo: v === true })} aria-label="Activo" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NuevoConcepto({
  abierto,
  onCerrar,
  onCreado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onCreado: () => Promise<void>;
}) {
  const [nombre, setNombre] = useState('');
  const [base, setBase] = useState<BaseTributaria>('NO_GRAVADO');
  const [paga, setPaga] = useState<Parte>('INQUILINO');
  const [recibe, setRecibe] = useState<Parte>('INMOBILIARIA');
  const [creando, setCreando] = useState(false);

  async function crear() {
    setCreando(true);
    try {
      await conceptosApi.crear({ nombre: nombre.trim(), base, paga, recibe });
      await onCreado();
      toast.success('Concepto creado', { description: nombre.trim() });
      setNombre('');
      onCerrar();
    } catch (error) {
      toast.error('No se pudo crear el concepto', { description: mensajeParaLaPersona(error) });
    } finally {
      setCreando(false);
    }
  }

  const selector = (valor: string, cambiar: (v: string) => void, opciones: Record<string, string>, etiqueta: string) => (
    <div className="space-y-1">
      <span className="text-caption text-muted-foreground">{etiqueta}</span>
      <Select value={valor} onValueChange={cambiar}>
        <SelectTrigger aria-label={etiqueta}><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.entries(opciones).map(([k, t]) => (
            <SelectItem key={k} value={k}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && !creando && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo concepto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="nombre-del-concepto" className="text-caption text-muted-foreground">Nombre</label>
            <Input id="nombre-del-concepto" value={nombre} maxLength={200} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Asesoría jurídica" />
          </div>
          {selector(base, (v) => setBase(v as BaseTributaria), TIPOS, 'Tipo (decide los impuestos)')}
          <div className="grid grid-cols-2 gap-3">
            {selector(paga, (v) => setPaga(v as Parte), PARTES, 'Lo paga')}
            {selector(recibe, (v) => setRecibe(v as Parte), PARTES, 'Lo recibe')}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={creando} onClick={onCerrar}>Volver</Button>
          <Button disabled={creando || nombre.trim().length < 2 || paga === recibe} onClick={() => void crear()} data-testid="conceptos-crear">
            {creando ? 'Creando…' : 'Crear concepto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
