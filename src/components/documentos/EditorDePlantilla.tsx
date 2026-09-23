'use client';

/**
 * Escribir una plantilla propia de la inmobiliaria.
 *
 * ── Por qué este editor tiene una advertencia y no un `<select>` ───────────
 *
 * Una plantilla es HTML legal con `{{variables}}`, y una variable mal escrita
 * NO falla: sale impresa con sus llaves en un documento que alguien firma, y
 * nadie revisa dos veces un contrato. Por eso:
 *
 *   · las variables se ofrecen como fichas que se INSERTAN con un clic, para
 *     que la mayoría nunca se escriba a mano;
 *   · y el contenido se revisa mientras se escribe: una `{{variable}}` que el
 *     sistema no sabe llenar se marca, con la más parecida al lado, y el botón
 *     de guardar se apaga DICIENDO por qué. Esa advertencia va puesta en la
 *     pantalla y no detrás de un botón: es un requisito que falta, no una
 *     explicación.
 *
 * El catálogo lo sirve el back (`GET /templates/variables`). No está escrito
 * acá: es la lista de lo que el sistema sabe llenar de verdad, y en dos repos
 * se separa a la primera variable nueva. El back vuelve a revisar al guardar —
 * esta revisión es para no hacer perder el viaje, no la autoridad.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon';
import {
  documentosLegalesApi,
  type CategoriaDeDocumento,
  type PlantillaDeLaAgencia,
  type VariableDePlantilla,
} from '@/lib/api/documentos.service';

const CATEGORIAS: { valor: CategoriaDeDocumento; etiqueta: string }[] = [
  { valor: 'CONTRATO', etiqueta: 'Contrato' },
  { valor: 'ACTA', etiqueta: 'Acta' },
  { valor: 'INVENTARIO', etiqueta: 'Inventario' },
  { valor: 'CARTA', etiqueta: 'Carta' },
  { valor: 'POLIZA', etiqueta: 'Póliza' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];

const GRUPO_LABEL: Record<string, string> = {
  inmobiliaria: 'De tu inmobiliaria',
  partes: 'Las partes',
  inmueble: 'El inmueble',
  contrato: 'El contrato',
};

/** El mismo patrón que usa el back para reemplazar. */
const PATRON = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function variablesDelContenido(contenido: string): string[] {
  const vistas = new Set<string>();
  for (const m of contenido.matchAll(PATRON)) vistas.add(m[1]);
  return [...vistas];
}

/** Distancia de edición, para sugerir la parecida. Igual que en el back. */
function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = guardado;
    }
  }
  return fila[b.length];
}

export function laMasParecida(nombre: string, catalogo: VariableDePlantilla[]): string | null {
  let mejor: { nombre: string; d: number } | null = null;
  for (const v of catalogo) {
    const d = distancia(nombre.toLowerCase(), v.nombre.toLowerCase());
    if (mejor === null || d < mejor.d) mejor = { nombre: v.nombre, d };
  }
  if (mejor && mejor.d <= Math.max(2, Math.floor(nombre.length / 3))) return mejor.nombre;
  return null;
}

interface Props {
  abierto: boolean;
  /** `null` para una plantilla nueva. */
  plantilla: PlantillaDeLaAgencia | null;
  onCerrar: () => void;
  onGuardado: () => void;
}

export function EditorDePlantilla({ abierto, plantilla, onCerrar, onGuardado }: Props) {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState<CategoriaDeDocumento>('CARTA');
  const [version, setVersion] = useState('1.0');
  const [contenido, setContenido] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [catalogo, setCatalogo] = useState<VariableDePlantilla[]>([]);
  const [fallaDelCatalogo, setFallaDelCatalogo] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  // Al abrir: los datos de la plantilla que se edita, o el borrador en blanco.
  useEffect(() => {
    if (!abierto) return;
    setNombre(plantilla?.name ?? '');
    setCategoria(plantilla?.category ?? 'CARTA');
    setVersion(plantilla?.version ?? '1.0');
    setContenido(plantilla?.content ?? '');
  }, [abierto, plantilla]);

  // El catálogo se pide una vez por apertura.
  useEffect(() => {
    if (!abierto) return;
    let vivo = true;
    setFallaDelCatalogo(false);
    documentosLegalesApi
      .variablesDePlantilla()
      .then((vs) => {
        if (vivo) setCatalogo(vs);
      })
      .catch(() => {
        if (vivo) setFallaDelCatalogo(true);
      });
    return () => {
      vivo = false;
    };
  }, [abierto]);

  const porGrupo = useMemo(() => {
    const mapa = new Map<string, VariableDePlantilla[]>();
    for (const v of catalogo) {
      const ya = mapa.get(v.grupo) ?? [];
      ya.push(v);
      mapa.set(v.grupo, ya);
    }
    return [...mapa.entries()];
  }, [catalogo]);

  const usadas = useMemo(() => variablesDelContenido(contenido), [contenido]);

  /*
   * 🔴 Con el catálogo caído NO se marca nada como desconocido: sin la lista no
   * se sabe, y pintar de rojo todas las variables de una plantilla que estaba
   * bien —o apagar el guardar— sería inventar un problema. El back revisa igual.
   */
  const desconocidas = useMemo(() => {
    if (catalogo.length === 0) return [];
    const nombres = new Set(catalogo.map((v) => v.nombre));
    return usadas.filter((n) => !nombres.has(n));
  }, [usadas, catalogo]);

  const sinNombre = nombre.trim() === '';
  const sinContenido = contenido.trim() === '';
  const sePuedeGuardar =
    !guardando && !sinNombre && !sinContenido && desconocidas.length === 0;

  /** Inserta `{{nombre}}` donde está el cursor, o al final. */
  const insertar = (nombreDeLaVariable: string) => {
    const ficha = `{{${nombreDeLaVariable}}}`;
    const area = areaRef.current;
    if (!area) {
      setContenido((c) => c + ficha);
      return;
    }
    const inicio = area.selectionStart ?? contenido.length;
    const fin = area.selectionEnd ?? contenido.length;
    const nuevo = contenido.slice(0, inicio) + ficha + contenido.slice(fin);
    setContenido(nuevo);
    // El cursor queda DESPUÉS de la ficha: si no, la siguiente inserción cae
    // adentro de la anterior y sale `{{arre{{canonValor}}ndatario}}`.
    requestAnimationFrame(() => {
      area.focus();
      const cursor = inicio + ficha.length;
      area.setSelectionRange(cursor, cursor);
    });
  };

  const guardar = async () => {
    if (!sePuedeGuardar) return;
    setGuardando(true);
    try {
      const cuerpo = {
        name: nombre.trim(),
        category: categoria,
        content: contenido,
        version: version.trim() || '1.0',
      };
      if (plantilla) {
        await documentosLegalesApi.editarPlantilla(plantilla.id, cuerpo);
        toast.success(`«${cuerpo.name}» quedó guardada.`);
      } else {
        await documentosLegalesApi.crearPlantilla(cuerpo);
        toast.success(`«${cuerpo.name}» quedó creada.`);
      }
      onGuardado();
      onCerrar();
    } catch (e: unknown) {
      // El mensaje del back tal cual: nombra la variable que no supo llenar, y
      // eso es lo único que sirve para arreglarla.
      toast.error('No se pudo guardar la plantilla', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Cajon abierto={abierto} onOpenChange={(o) => !o && onCerrar()} ancho="sm:max-w-4xl">
      <CajonCabecera
        titulo={plantilla ? `Editar «${plantilla.name}»` : 'Nueva plantilla'}
        descripcion="El texto se escribe una vez; las variables se reemplazan con los datos del contrato cada vez que generas el documento."
      />
      <CajonCuerpo className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="plantilla-nombre">Cómo se llama</Label>
            <Input
              id="plantilla-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={160}
              placeholder="Carta de bienvenida al inquilino"
              data-testid="plantilla-nombre"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plantilla-categoria">Categoría</Label>
            <Select
              value={categoria}
              onValueChange={(v) => setCategoria(v as CategoriaDeDocumento)}
            >
              <SelectTrigger id="plantilla-categoria" data-testid="plantilla-categoria">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c.valor} value={c.valor}>
                    {c.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plantilla-version">Versión</Label>
            <Input
              id="plantilla-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              maxLength={12}
              className="w-24"
            />
          </div>
        </div>

        {/* Las fichas: un clic las inserta donde está el cursor. */}
        <div className="space-y-2">
          <p className="text-body-sm font-medium text-fg">
            Datos que puedes insertar
          </p>
          {fallaDelCatalogo ? (
            <p className="text-caption text-warning" data-testid="catalogo-caido">
              No pudimos traer la lista de datos disponibles. Puedes escribir la plantilla
              igual: al guardar, el sistema revisa las variables y te dice si alguna no la
              sabe llenar.
            </p>
          ) : (
            <div className="space-y-2.5">
              {porGrupo.map(([grupo, vs]) => (
                <div key={grupo} className="space-y-1">
                  <p className="text-caption text-fg-subtle">
                    {GRUPO_LABEL[grupo] ?? grupo}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {vs.map((v) => (
                      <button
                        key={v.nombre}
                        type="button"
                        onClick={() => insertar(v.nombre)}
                        title={`{{${v.nombre}}}`}
                        className="rounded-md border border-border bg-surface px-2 py-1 text-caption text-fg-muted transition-colors hover:border-primary hover:text-primary"
                        data-testid={`insertar-${v.nombre}`}
                      >
                        {v.etiqueta}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="plantilla-contenido">El texto del documento</Label>
          <Textarea
            id="plantilla-contenido"
            ref={areaRef}
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            rows={14}
            className="font-mono text-caption"
            placeholder="<h1>Carta de bienvenida</h1>&#10;<p>{{arrendatarioNombre}}, bienvenido a {{inmuebleDireccion}}.</p>"
            data-testid="plantilla-contenido"
          />
          <p className="text-caption text-fg-subtle">
            Se admite HTML sencillo: títulos, párrafos, listas y tablas. Lo que escribas
            es el papel que se imprime.
          </p>
        </div>

        {/* 🔴 Lo que impide guardar, dicho acá y no escondido. */}
        {desconocidas.length > 0 && (
          <div
            className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-body-sm"
            data-testid="variables-desconocidas"
          >
            <p className="font-medium text-danger">
              {desconocidas.length === 1
                ? 'Hay una variable que el sistema no sabe llenar:'
                : `Hay ${desconocidas.length} variables que el sistema no sabe llenar:`}
            </p>
            <ul className="mt-1.5 space-y-1 text-fg">
              {desconocidas.map((n) => {
                const cerca = laMasParecida(n, catalogo);
                return (
                  <li key={n}>
                    <code className="font-mono">{`{{${n}}}`}</code>
                    {cerca ? (
                      <>
                        {' — ¿querías '}
                        <button
                          type="button"
                          className="font-mono text-primary underline"
                          onClick={() =>
                            setContenido((c) =>
                              c.replace(
                                new RegExp(`\\{\\{\\s*${n}\\s*\\}\\}`, 'g'),
                                `{{${cerca}}}`,
                              ),
                            )
                          }
                          data-testid={`corregir-${n}`}
                        >{`{{${cerca}}}`}</button>
                        ?
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-caption text-fg-muted">
              Saldría impresa con las llaves adentro en un documento que alguien firma, así
              que no se puede guardar así.
            </p>
          </div>
        )}

        {usadas.length > 0 && desconocidas.length === 0 && (
          <p className="text-caption text-fg-muted" data-testid="variables-ok">
            {usadas.length === 1
              ? 'Usa 1 dato del contrato. Se reemplaza al generar el documento.'
              : `Usa ${usadas.length} datos del contrato. Se reemplazan al generar el documento.`}
          </p>
        )}

        {/* Cómo se va a ver. Con las variables sin reemplazar, y dicho. */}
        {contenido.trim() !== '' && (
          <div className="space-y-1.5">
            <p className="text-body-sm font-medium text-fg">Cómo se va a ver</p>
            {/* `sandbox=""` y fondo blanco: es el PAPEL, no una superficie del
                panel, y el HTML lo escribe una persona — sin sandbox un
                `<script>` de una plantilla correría en el navegador de sus
                compañeros. */}
            <iframe
              title="Vista previa de la plantilla"
              srcDoc={contenido}
              className="h-64 w-full rounded-lg border border-border bg-white"
              sandbox=""
              data-testid="plantilla-previa"
            />
            <p className="text-caption text-fg-subtle">
              Las variables se ven con sus llaves porque todavía no hay contrato: al
              generar el documento se reemplazan por los datos reales.
            </p>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" hideArrow onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            hideArrow
            onClick={() => void guardar()}
            disabled={!sePuedeGuardar}
            title={
              sinNombre
                ? 'Ponle un nombre'
                : sinContenido
                  ? 'Escribe el texto del documento'
                  : desconocidas.length > 0
                    ? 'Corrige las variables que el sistema no sabe llenar'
                    : undefined
            }
            data-testid="plantilla-guardar"
          >
            {guardando ? 'Guardando…' : plantilla ? 'Guardar cambios' : 'Crear la plantilla'}
          </Button>
        </div>
      </CajonCuerpo>
    </Cajon>
  );
}

export default EditorDePlantilla;
