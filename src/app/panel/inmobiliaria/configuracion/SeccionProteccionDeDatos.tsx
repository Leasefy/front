'use client';

/**
 * 🔴 PROTECCIÓN DE DATOS: las solicitudes de habeas data de los titulares
 * (Ley 1581, 23-09-2026).
 *
 * Nico: la inmobiliaria registra la solicitud del titular (consulta,
 * rectificación, supresión, revocatoria); el sistema cuenta el plazo en días
 * hábiles con los festivos y avisa cuando se acerca; arma la exportación de
 * lo que la inmobiliaria sabe de esa persona y deja constancia de la
 * respuesta. La mayoría de los titulares no tiene cuenta: piden por correo,
 * carta o en la oficina.
 *
 * El molde:
 *   · el resumen es UNA FRASE, afuera de la tarjeta;
 *   · pestañas + tabla = UNA tarjeta, y las pestañas dicen que filtran;
 *   · la fila abre un cajón (detalle, exportación y respuesta) que no le pide
 *     al back nada que la fila no traiga, salvo la exportación, que se baja
 *     cuando alguien la pide;
 *   · la explicación larga (plazos de la ley) va detrás de «Para entender más».
 *
 * Supresión y revocatoria NO borran nada solas (decisión de Nico, 23-09): la
 * respuesta dice qué se decidió y qué se hizo.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import {
  habeasDataApi,
  type CanalDeLaSolicitud,
  type ListaDeSolicitudes,
  type NuevaSolicitud,
  type ResultadoDeLaSolicitud,
  type SolicitudDeHabeasData,
  type TipoDeDocumentoDelTitular,
  type TipoDeSolicitud,
} from '@/lib/api/habeas-data.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import {
  CANAL_EN_PALABRAS,
  ESTADO_DEL_PLAZO_EN_PALABRAS,
  TIPO_EN_PALABRAS,
  fraseDelResumen,
  nombreDelArchivoDelTitular,
  plazoEnPalabras,
} from '@/lib/habeas-data/en-palabras';
import { descargarBlob } from '@/lib/reportes/exportables';
import { EsqueletoDeSeccion } from './piezas';

type Pestana = 'abiertas' | 'respondidas' | 'todas';

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: 'abiertas', etiqueta: 'Abiertas' },
  { id: 'respondidas', etiqueta: 'Respondidas' },
  { id: 'todas', etiqueta: 'Todas' },
];

const TONO = {
  RESPONDIDA: 'secondary',
  EN_PLAZO: 'secondary',
  POR_VENCER: 'warning',
  VENCIDA: 'destructive',
} as const;

const TIPOS_DE_DOCUMENTO: TipoDeDocumentoDelTitular[] = ['CC', 'CE', 'TI', 'NIT', 'PASSPORT', 'PPT'];

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption text-fg-muted">{etiqueta}</dt>
      <dd className="text-sm text-fg">{children}</dd>
    </div>
  );
}

export function SeccionProteccionDeDatos() {
  const [lista, setLista] = useState<ListaDeSolicitudes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [pestana, setPestana] = useState<Pestana>('abiertas');
  const [abierta, setAbierta] = useState<SolicitudDeHabeasData | null>(null);
  const [registrando, setRegistrando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setLista(await habeasDataApi.listar());
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const filas = useMemo(() => {
    const todas = lista?.solicitudes ?? [];
    if (pestana === 'abiertas') return todas.filter((s) => s.estado === 'ABIERTA');
    if (pestana === 'respondidas') return todas.filter((s) => s.estado === 'RESPONDIDA');
    return todas;
  }, [lista, pestana]);

  if (!lista && (cargando || error)) {
    return (
      <EstadoDeDatos
        cargando={cargando}
        error={error}
        onReintentar={cargar}
        queEs="las solicitudes de protección de datos"
        principal
        esqueleto={<EsqueletoDeSeccion filas={6} />}
      >
        <span />
      </EstadoDeDatos>
    );
  }
  if (!lista) return null;

  const alGuardar = (s: SolicitudDeHabeasData) => {
    setLista((l) =>
      l ? { ...l, solicitudes: [s, ...l.solicitudes.filter((x) => x.id !== s.id)] } : l,
    );
    void cargar();
  };

  return (
    <div className="space-y-4" data-testid="proteccion-de-datos">
      {lista.disponible ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-fg" data-testid="frase-del-resumen">
            {fraseDelResumen(lista)}
          </p>
          <div className="flex items-center gap-2">
            <ParaEntenderMas etiqueta="Los plazos de la ley" titulo="Solicitudes de los titulares (Ley 1581)">
              <div className="space-y-3 text-sm text-fg">
                <p>
                  Toda persona cuyos datos guarda la inmobiliaria —propietarios, inquilinos,
                  postulantes, proveedores— puede consultarlos, pedir que se corrijan, pedir que se
                  borren o retirar la autorización que dio.
                </p>
                <p>
                  Una <strong>consulta</strong> se contesta en <span className="font-mono">10</span>{' '}
                  días hábiles; un <strong>reclamo</strong> (rectificación, supresión o revocatoria),
                  en <span className="font-mono">15</span>. Se cuentan desde el día siguiente a que
                  llegó la solicitud, sin sábados, domingos ni festivos.
                </p>
                <p>
                  Te avisamos cuando a una solicitud abierta le quedan{' '}
                  <span className="font-mono">3</span> días hábiles o menos.
                </p>
                <p>
                  Registrar la respuesta aquí no borra ni cambia datos: deja la constancia de qué se
                  decidió y qué se le dijo al titular. Lo que haya que corregir o suprimir se hace en
                  la ficha de cada uno.
                </p>
              </div>
            </ParaEntenderMas>
            <Button hideArrow onClick={() => setRegistrando(true)} data-testid="registrar-solicitud">
              Registrar una solicitud
            </Button>
          </div>
        </div>
      ) : (
        <p
          className="rounded-md border border-border bg-warning-soft px-3 py-2 text-sm text-fg"
          data-testid="habeas-data-sin-migrar"
          title={lista.migracion ?? undefined}
        >
          Las solicitudes de protección de datos todavía no se pueden registrar: falta un paso de la
          base de datos que nuestro equipo está habilitando.
        </p>
      )}

      <section className="overflow-x-clip rounded-lg border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <span className="text-sm text-fg-muted">Mostrar</span>
          <div role="tablist" aria-label="Filtrar solicitudes" className="flex gap-1">
            {PESTANAS.map((p) => (
              <Button
                key={p.id}
                role="tab"
                aria-selected={pestana === p.id}
                variant={pestana === p.id ? 'secondary' : 'ghost'}
                size="sm"
                hideArrow
                onClick={() => setPestana(p.id)}
                data-testid={`pestana-${p.id}`}
              >
                {p.etiqueta}
              </Button>
            ))}
          </div>
        </div>

        {filas.length === 0 ? (
          <p className="p-8 text-center text-sm text-fg-muted" data-testid="solicitudes-vacio">
            {pestana === 'abiertas'
              ? 'No hay solicitudes abiertas.'
              : pestana === 'respondidas'
                ? 'Todavía no hay solicitudes respondidas.'
                : 'Todavía no hay solicitudes registradas.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titular</TableHead>
                  <TableHead>Qué pide</TableHead>
                  <TableHead>Llegó</TableHead>
                  <TableHead>Plazo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((s) => (
                  <TableRow
                    key={s.id}
                    data-testid={`solicitud-${s.id}`}
                    tabIndex={0}
                    aria-label={`Abrir la solicitud de ${s.titular.nombre}`}
                    className="cursor-pointer focus-visible:bg-surface-muted"
                    onClick={() => setAbierta(s)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        setAbierta(s);
                      }
                    }}
                  >
                    <TableCell className="max-w-[14rem]">
                      <p className="truncate text-sm text-fg" title={s.titular.nombre}>
                        {s.titular.nombre}
                      </p>
                      <p className="font-mono text-caption text-fg-muted">
                        {s.titular.tipoDocumento} {s.titular.documento}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-fg">{TIPO_EN_PALABRAS[s.tipo]}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-sm text-fg-muted">
                      {s.recibidaEl}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={TONO[s.estadoDelPlazo]}>
                        {ESTADO_DEL_PLAZO_EN_PALABRAS[s.estadoDelPlazo]}
                      </Badge>
                      <p className="mt-1 text-caption text-fg-muted" data-testid={`plazo-${s.id}`}>
                        {plazoEnPalabras(s)} · vence el <span className="font-mono">{s.venceEl}</span>
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <CajonDeLaSolicitud
        solicitud={abierta}
        onCerrar={() => setAbierta(null)}
        onRespondida={(s) => {
          setAbierta(s);
          alGuardar(s);
        }}
      />
      <RegistrarSolicitud
        abierto={registrando}
        onCerrar={() => setRegistrando(false)}
        onRegistrada={(s) => {
          setRegistrando(false);
          setPestana('abiertas');
          alGuardar(s);
        }}
      />
    </div>
  );
}

// ── El cajón ────────────────────────────────────────────────────────────────

function CajonDeLaSolicitud({
  solicitud,
  onCerrar,
  onRespondida,
}: {
  solicitud: SolicitudDeHabeasData | null;
  onCerrar: () => void;
  onRespondida: (s: SolicitudDeHabeasData) => void;
}) {
  const s = solicitud;
  const [exportando, setExportando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDeLaSolicitud | ''>('');
  const [respuesta, setRespuesta] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setResultado('');
    setRespuesta('');
  }, [s?.id]);

  const exportar = async () => {
    if (!s) return;
    setExportando(true);
    try {
      const datos = await habeasDataApi.datosDelTitular(s.id);
      descargarBlob(
        new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }),
        nombreDelArchivoDelTitular(s.titular.documento),
      );
      toast.success(
        datos.encontrados === 0
          ? 'No encontramos datos con ese documento. El archivo lo dice.'
          : 'Descargamos lo que la inmobiliaria guarda de este titular.',
      );
    } catch (e) {
      toast.error(mensajeDelFallo(e, 'No se pudieron reunir los datos del titular.'));
    } finally {
      setExportando(false);
    }
  };

  const faltaParaResponder = !resultado
    ? 'Elige si la solicitud se atendió o se negó.'
    : respuesta.trim().length < 10
      ? 'Escribe lo que se le contestó al titular (al menos 10 caracteres).'
      : null;

  const responder = async () => {
    if (!s || faltaParaResponder || !resultado) return;
    setGuardando(true);
    try {
      const actualizada = await habeasDataApi.responder(s.id, {
        resultado,
        respuesta: respuesta.trim(),
      });
      toast.success('Quedó la constancia de la respuesta.');
      onRespondida(actualizada);
    } catch (e) {
      toast.error(mensajeDelFallo(e, 'No se pudo guardar la respuesta.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Cajon
      abierto={s !== null}
      onOpenChange={(a) => {
        if (!a) onCerrar();
      }}
      data-testid="cajon-de-la-solicitud"
    >
      {s ? (
        <>
          <CajonCabecera
            titulo={`${TIPO_EN_PALABRAS[s.tipo]} · ${s.titular.nombre}`}
            descripcion={`Llegó el ${s.recibidaEl} por ${CANAL_EN_PALABRAS[s.canal].toLowerCase()} · vence el ${s.venceEl}`}
          >
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={TONO[s.estadoDelPlazo]}>
                {ESTADO_DEL_PLAZO_EN_PALABRAS[s.estadoDelPlazo]}
              </Badge>
              <span className="text-caption text-fg-muted">{plazoEnPalabras(s)}</span>
            </div>
          </CajonCabecera>

          <CajonCuerpo className="space-y-6">
            <section className="space-y-2" aria-labelledby="hd-titular">
              <h3 id="hd-titular" className="text-sm font-medium text-fg">
                El titular
              </h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Dato etiqueta="Documento">
                  <span className="font-mono">
                    {s.titular.tipoDocumento} {s.titular.documento}
                  </span>
                </Dato>
                <Dato etiqueta="Correo">{s.titular.correo ?? '—'}</Dato>
                <Dato etiqueta="Teléfono">{s.titular.telefono ?? '—'}</Dato>
              </dl>
            </section>

            <section className="space-y-2" aria-labelledby="hd-pide">
              <h3 id="hd-pide" className="text-sm font-medium text-fg">
                Lo que pide
              </h3>
              <p className="whitespace-pre-wrap text-sm text-fg">{s.descripcion}</p>
            </section>

            <section className="space-y-2" aria-labelledby="hd-datos">
              <h3 id="hd-datos" className="text-sm font-medium text-fg">
                Sus datos en la inmobiliaria
              </h3>
              <p className="text-sm text-fg-muted">
                Todo lo que guardamos de esta persona, buscado por su documento: fichas de
                propietario, contratos, postulaciones y terceros. Queda en la bitácora que lo
                descargaste.
              </p>
              <Button
                variant="outline"
                size="sm"
                hideArrow
                onClick={() => void exportar()}
                isLoading={exportando}
                data-testid="exportar-datos-del-titular"
              >
                Descargar sus datos
              </Button>
            </section>

            {s.estado === 'RESPONDIDA' ? (
              <section className="space-y-2" aria-labelledby="hd-constancia" data-testid="constancia">
                <h3 id="hd-constancia" className="text-sm font-medium text-fg">
                  La respuesta
                </h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Dato etiqueta="Decisión">{s.resultado === 'ATENDIDA' ? 'Atendida' : 'Negada'}</Dato>
                  <Dato etiqueta="Quién y cuándo">
                    {s.respondidaPor ?? '—'}
                    {s.respondidaEl ? (
                      <span className="block font-mono text-caption text-fg-muted">
                        {s.respondidaEl.slice(0, 10)}
                      </span>
                    ) : null}
                  </Dato>
                </dl>
                <p className="whitespace-pre-wrap text-sm text-fg">{s.respuesta}</p>
              </section>
            ) : (
              <section className="space-y-3" aria-labelledby="hd-responder">
                <h3 id="hd-responder" className="text-sm font-medium text-fg">
                  Registrar la respuesta
                </h3>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-fg" id="hd-resultado">
                    Decisión
                  </p>
                  <div role="radiogroup" aria-labelledby="hd-resultado" className="flex gap-2">
                    {(['ATENDIDA', 'NEGADA'] as const).map((r) => (
                      <Button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={resultado === r}
                        variant={resultado === r ? 'secondary' : 'outline'}
                        size="sm"
                        hideArrow
                        onClick={() => setResultado(r)}
                        data-testid={`resultado-${r}`}
                      >
                        {r === 'ATENDIDA' ? 'Atendida' : 'Negada'}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hd-respuesta">Lo que se le contestó al titular</Label>
                  <Textarea
                    id="hd-respuesta"
                    rows={5}
                    value={respuesta}
                    onChange={(e) => setRespuesta(e.target.value)}
                    data-testid="respuesta-de-la-solicitud"
                  />
                </div>
              </section>
            )}
          </CajonCuerpo>

          {s.estado === 'ABIERTA' ? (
            <CajonPie ayuda={faltaParaResponder ?? 'La respuesta registrada no se puede cambiar después.'}>
              <Button
                hideArrow
                onClick={() => void responder()}
                disabled={faltaParaResponder !== null}
                isLoading={guardando}
                title={faltaParaResponder ?? undefined}
                data-testid="guardar-respuesta"
              >
                Guardar la respuesta
              </Button>
            </CajonPie>
          ) : null}
        </>
      ) : null}
    </Cajon>
  );
}

// ── Registrar ───────────────────────────────────────────────────────────────

const VACIA = {
  tipo: '' as TipoDeSolicitud | '',
  canal: '' as CanalDeLaSolicitud | '',
  titularNombre: '',
  titularTipoDocumento: 'CC' as TipoDeDocumentoDelTitular,
  titularDocumento: '',
  titularCorreo: '',
  titularTelefono: '',
  descripcion: '',
  recibidaEl: '',
};

function RegistrarSolicitud({
  abierto,
  onCerrar,
  onRegistrada,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onRegistrada: (s: SolicitudDeHabeasData) => void;
}) {
  const [f, setF] = useState(VACIA);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) setF(VACIA);
  }, [abierto]);

  const cambiar = (clave: keyof typeof VACIA) => (v: string) => setF((x) => ({ ...x, [clave]: v }));

  const falta = !f.tipo
    ? 'Elige qué pide el titular.'
    : !f.canal
      ? 'Elige por dónde llegó.'
      : f.titularNombre.trim().length < 3
        ? 'Escribe el nombre del titular.'
        : f.titularDocumento.trim().length < 3
          ? 'Escribe el documento del titular: con él se buscan sus datos.'
          : f.descripcion.trim().length < 5
            ? 'Escribe qué pide, con sus palabras.'
            : null;

  const guardar = async () => {
    if (falta || !f.tipo || !f.canal) return;
    setGuardando(true);
    try {
      const datos: NuevaSolicitud = {
        tipo: f.tipo,
        canal: f.canal,
        titularNombre: f.titularNombre.trim(),
        titularTipoDocumento: f.titularTipoDocumento,
        titularDocumento: f.titularDocumento.trim(),
        descripcion: f.descripcion.trim(),
        ...(f.titularCorreo.trim() ? { titularCorreo: f.titularCorreo.trim() } : {}),
        ...(f.titularTelefono.trim() ? { titularTelefono: f.titularTelefono.trim() } : {}),
        ...(f.recibidaEl ? { recibidaEl: f.recibidaEl } : {}),
      };
      const creada = await habeasDataApi.crear(datos);
      toast.success(`Registrada. Vence el ${creada.venceEl}.`);
      onRegistrada(creada);
    } catch (e) {
      toast.error(mensajeDelFallo(e, 'No se pudo registrar la solicitud.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-lg" data-testid="registrar-solicitud-dialogo">
        <DialogHeader>
          <DialogTitle>Registrar una solicitud de un titular</DialogTitle>
          <DialogDescription>
            El plazo corre desde el día en que llegó. Si llegó antes de hoy, pon esa fecha.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hd-tipo">Qué pide</Label>
              <Select value={f.tipo || undefined} onValueChange={cambiar('tipo')}>
                <SelectTrigger id="hd-tipo" data-testid="tipo-de-solicitud">
                  <SelectValue placeholder="Elige" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_EN_PALABRAS) as TipoDeSolicitud[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPO_EN_PALABRAS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hd-canal">Por dónde llegó</Label>
              <Select value={f.canal || undefined} onValueChange={cambiar('canal')}>
                <SelectTrigger id="hd-canal" data-testid="canal-de-solicitud">
                  <SelectValue placeholder="Elige" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CANAL_EN_PALABRAS) as CanalDeLaSolicitud[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CANAL_EN_PALABRAS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hd-nombre">Nombre del titular</Label>
            <Input
              id="hd-nombre"
              value={f.titularNombre}
              onChange={(e) => cambiar('titularNombre')(e.target.value)}
              data-testid="nombre-del-titular"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="hd-tipo-doc">Documento</Label>
              <Select
                value={f.titularTipoDocumento}
                onValueChange={(v) => setF((x) => ({ ...x, titularTipoDocumento: v as TipoDeDocumentoDelTitular }))}
              >
                <SelectTrigger id="hd-tipo-doc">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DE_DOCUMENTO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === 'PASSPORT' ? 'Pasaporte' : t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hd-documento">Número</Label>
              <Input
                id="hd-documento"
                className="font-mono"
                value={f.titularDocumento}
                onChange={(e) => cambiar('titularDocumento')(e.target.value)}
                data-testid="documento-del-titular"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hd-correo">Correo (opcional)</Label>
              <Input
                id="hd-correo"
                type="email"
                value={f.titularCorreo}
                onChange={(e) => cambiar('titularCorreo')(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hd-telefono">Teléfono (opcional)</Label>
              <Input
                id="hd-telefono"
                className="font-mono"
                value={f.titularTelefono}
                onChange={(e) => cambiar('titularTelefono')(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hd-recibida">Día en que llegó (vacío = hoy)</Label>
            <Input
              id="hd-recibida"
              type="date"
              className="font-mono"
              value={f.recibidaEl}
              onChange={(e) => cambiar('recibidaEl')(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hd-descripcion">Qué pide, con sus palabras</Label>
            <Textarea
              id="hd-descripcion"
              rows={4}
              value={f.descripcion}
              onChange={(e) => cambiar('descripcion')(e.target.value)}
              data-testid="descripcion-de-la-solicitud"
            />
          </div>
          {falta ? (
            <p className="text-sm text-fg-muted" data-testid="falta-para-registrar">
              {falta}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            hideArrow
            onClick={() => void guardar()}
            disabled={falta !== null}
            isLoading={guardando}
            data-testid="guardar-solicitud"
          >
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
