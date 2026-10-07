'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { CalendarPlus } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { useLenis } from '@/components/providers/SmoothScroll';
import { Button, Textarea } from '@/components/ui';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog';
import { DatePicker, Presence } from '@leasefy/cadence';
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { etiquetaDeInmueble } from '@/components/contratos/VincularInmueble';
import { aFechaIso, fechaLocal, hoyLocal } from '@/lib/fechas-locales';
import { useConsignaciones } from '@/lib/hooks/useInmobiliaria';
import { useEquipo, useMiUserId } from '@/lib/agenda/use-equipo';
import { loQueDiceUnSelector } from '@/lib/errores/lo-que-dice-un-selector';
import { ApiError } from '@/lib/api/client';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import {
  repartirErroresDelServidor,
  traeErroresPorCampo,
} from '@/lib/errores/errores-en-el-formulario';
import {
  CORREO_VALIDO,
  MAX_LARGO_CONTACTO_DE_LA_CITA,
  MAX_LARGO_CORREO_DE_LA_CITA,
  MAX_LARGO_NOTAS_DE_LA_CITA,
  MAX_LARGO_TELEFONO_DE_LA_CITA,
  MENSAJES_DE_LA_AGENDA,
} from '@/lib/agenda/limites-de-la-agenda';
import { agendaApi, type TipoDeVisita } from '@/lib/api/agenda.service';

/** Cada media hora, de 6:00 a 21:00: lo que se agenda de verdad. */
export const HORAS: string[] = Array.from({ length: 31 }, (_, i) => {
  const m = 6 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});

/**
 * Un inmueble arrendado no recibe visitas. «Arrendado» se decide igual que en
 * la lista de Inmuebles: por el contrato vigente (`arrendado`), y sólo si la
 * fila vino sin ese campo, por `availability`.
 */
export function estaArrendado(c: { arrendado?: boolean | null; availability?: string }): boolean {
  return c.arrendado ?? c.availability === 'rented';
}

/** Dónde se pinta el motivo de un rechazo: al lado del campo que lo causó. */
export type CampoDelRechazo =
  | 'inmueble'
  | 'contacto'
  | 'correo'
  | 'telefono'
  | 'fecha'
  | 'hora'
  | 'modalidad'
  | 'notas'
  | 'general';

/** En el orden en que se ven: el foco va al primero con error. */
const CAMPOS_DE_LA_CITA: readonly Exclude<CampoDelRechazo, 'general'>[] = [
  'inmueble',
  'contacto',
  'correo',
  'telefono',
  'fecha',
  'hora',
  'modalidad',
  'notas',
];

/** El nombre del campo en `CreateCitaDto` → dónde se pinta. */
const CAMPO_DEL_SERVIDOR: Partial<Record<string, Exclude<CampoDelRechazo, 'general'>>> = {
  propertyId: 'inmueble',
  contactName: 'contacto',
  contactEmail: 'correo',
  contactPhone: 'telefono',
  date: 'fecha',
  startTime: 'hora',
  endTime: 'hora',
  visitType: 'modalidad',
  notes: 'notas',
};

/**
 * Traduce el error del back a un lugar en el formulario.
 *
 * El back responde 409 con `code` (`agenda.service.ts#createCita`):
 * `HORARIO_OCUPADO` va al lado de la hora, `INMUEBLE_ARRENDADO` al lado del
 * inmueble, `MODALIDAD_NO_ACEPTADA` al lado del selector de modalidad.
 * Cualquier otro 4xx trae su propio motivo en castellano y va arriba del pie.
 * El texto sale del traductor (02-10-2026): «conexión» SÓLO si no hubo
 * respuesta, un 5xx dice que falló de nuestro lado con su referencia, y nunca
 * un volcado. Siempre DENTRO del modal, para no perder lo que ya se llenó.
 * `null` = no mostrar nada (401: el cliente ya está cerrando la sesión).
 */
export function rechazoDeCita(
  err: unknown,
  generico: string,
): { campo: CampoDelRechazo; mensaje: string } | null {
  const mensaje = mensajeParaLaPersona(err, { porDefecto: generico, accion: 'agendar la cita' });
  if (!(err instanceof ApiError)) return { campo: 'general', mensaje };
  if (err.status === 401) return null;
  const code = err.code ?? (typeof err.detalle?.code === 'string' ? err.detalle.code : undefined);
  if (err.status === 409 && code === 'HORARIO_OCUPADO') return { campo: 'hora', mensaje };
  if (err.status === 409 && code === 'INMUEBLE_ARRENDADO') return { campo: 'inmueble', mensaje };
  // A5: el inmueble no acepta esa modalidad. Va al lado del selector, que es
  // el campo que hay que cambiar, no en un aviso general arriba del pie.
  if (err.status === 409 && code === 'MODALIDAD_NO_ACEPTADA')
    return { campo: 'modalidad', mensaje };
  return { campo: 'general', mensaje };
}

/**
 * Todos los rechazos de una vez, por campo (02-10-2026). Un 400
 * `DATOS_INVALIDOS` trae `campos[]`: cada uno va bajo SU campo (las dos horas
 * van a la fila de las horas) y lo que no tiene dónde ir, arriba del pie. Sin
 * `campos`, lo de siempre: `rechazoDeCita`.
 */
export function rechazosDeCita(
  err: unknown,
  generico: string,
): Partial<Record<CampoDelRechazo, string>> | null {
  if (err instanceof ApiError && err.status === 401) return null;
  if (traeErroresPorCampo(err)) {
    const reparto = repartirErroresDelServidor(err, {
      mapa: CAMPO_DEL_SERVIDOR,
      campos: CAMPOS_DE_LA_CITA,
      porDefecto: generico,
      accion: 'agendar la cita',
    });
    return {
      ...reparto.porCampo,
      ...(reparto.sueltos.length ? { general: reparto.sueltos.join(' · ') } : {}),
    };
  }
  const uno = rechazoDeCita(err, generico);
  return uno ? { [uno.campo]: uno.mensaje } : null;
}

interface PedirCitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a visit is scheduled so the agenda can refetch. */
  onCreated: () => void;
  /** When set, the visit is scheduled for this property (selector is locked). */
  presetPropertyId?: string;
  presetPropertyTitle?: string;
}

export function PedirCitaModal({
  isOpen,
  onClose,
  onCreated,
  presetPropertyId,
  presetPropertyTitle,
}: PedirCitaModalProps) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.agenda.${s}`;
  const lenis = useLenis();

  const isPreset = !!presetPropertyId;

  // Only properties that carry a real propertyId can host a PropertyVisit.
  // TODOS los del portafolio, en un Combobox con buscador: una inmobiliaria
  // con doscientos inmuebles no encuentra el suyo bajando un Select (Nico,
  // 2026-09-03: «no aparecen todos y deja un buscador ahí»).
  // Los arrendados NO se ofrecen: el back los rechaza con 409, y ofrecerlos
  // era invitar a llenar el formulario entero para nada. Se cuentan aparte
  // para decir por qué un inmueble conocido no aparece en el buscador.
  const {
    consignaciones,
    isLoading: cargandoInmuebles,
    errorCrudo: errorDeInmuebles,
  } = useConsignaciones();
  const conInmueble = useMemo(() => consignaciones.filter((c) => c.propertyId), [consignaciones]);
  const opcionesInmueble = useMemo<ComboboxOption[]>(
    () =>
      conInmueble
        .filter((c) => !estaArrendado(c))
        .sort((a, b) => a.propertyTitle.localeCompare(b.propertyTitle))
        .map((c) => ({ value: c.propertyId, label: etiquetaDeInmueble(c) })),
    [conInmueble],
  );
  const arrendadosOcultos = conInmueble.length - opcionesInmueble.length;

  const [propertyId, setPropertyId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:30');
  const [visitType, setVisitType] = useState<TipoDeVisita>('IN_PERSON');
  /**
   * A5 — qué modalidades acepta ESTE inmueble.
   *
   * `null` = todavía no lo sabemos (no hay inmueble elegido, está cargando, o
   * la consulta falló): ahí se ofrecen las dos, que es lo que se hacía siempre.
   * Una lectura que no respondió no puede quitarle opciones a nadie.
   * `[]` = el inmueble no tiene modalidades configuradas: también se ofrecen
   * las dos (el back no bloquea ese caso) y se dice que conviene cargar sus
   * horarios. Una lista con contenido es la verdad: sólo esas se ofrecen.
   */
  const [modalidades, setModalidades] = useState<TipoDeVisita[] | null>(null);
  const [notes, setNotes] = useState('');
  /**
   * AG-06 (04-10-2026): la cita del panel nace CONFIRMADA, así que lleva su
   * asesor («ninguna se confirma sin asesor»). Por defecto, quien la agenda si
   * es asesor activo.
   */
  const { asesores } = useEquipo(!isOpen);
  const miUserId = useMiUserId();
  const [asesorUserId, setAsesorUserId] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    if (!asesorUserId && miUserId && asesores.some((a) => a.userId === miUserId)) {
      setAsesorUserId(miUserId);
    }
  }, [isOpen, asesores, miUserId, asesorUserId]);
  const [submitting, setSubmitting] = useState(false);
  /** Lo que rechazó el back, por campo. Cada campo borra el suyo al tocarse. */
  const [rechazos, setRechazos] = useState<Partial<Record<CampoDelRechazo, string>>>({});
  // El rechazo general sale con su animación: mientras se va, sigue diciendo lo que decía.
  const rechazoGeneral = useUltimoPresente(rechazos.general);
  const formulario = useRef<HTMLDivElement>(null);
  const quitarRechazo = (campo: CampoDelRechazo) =>
    setRechazos((r) => (r[campo] ? { ...r, [campo]: undefined } : r));
  // Guarda síncrona del doble clic: `submitting` pinta en el render siguiente,
  // y dos clics seguidos alcanzaban a mandar dos citas iguales.
  const enviando = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    lenis?.stop();
    return () => {
      lenis?.start();
    };
  }, [isOpen, lenis]);

  useEffect(() => {
    if (isOpen) {
      setPropertyId(presetPropertyId ?? '');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setDate('');
      setStartTime('10:00');
      setEndTime('10:30');
      setVisitType('IN_PERSON');
      setNotes('');
      setRechazos({});
    }
  }, [isOpen, presetPropertyId]);

  // Se consulta al elegir el inmueble, no al abrir: el combo cambia y cada
  // inmueble tiene su propia respuesta. Un fallo NO se muestra: dejaría un
  // error rojo sobre algo que la persona no pidió, y el back sigue teniendo la
  // última palabra si la modalidad no corresponde.
  useEffect(() => {
    if (!isOpen || !propertyId) {
      setModalidades(null);
      return;
    }
    let vigente = true;
    setModalidades(null);
    agendaApi
      .getDisponibilidad(propertyId)
      .then((d) => {
        if (vigente) setModalidades(d.visitTypes ?? []);
      })
      .catch(() => {
        if (vigente) setModalidades(null);
      });
    return () => {
      vigente = false;
    };
  }, [isOpen, propertyId]);

  /** Las que se ofrecen de verdad. Sin respuesta o sin configurar: las dos. */
  const modalidadesOfrecidas = useMemo<TipoDeVisita[]>(
    () =>
      modalidades && modalidades.length > 0 ? modalidades : ['IN_PERSON', 'VIRTUAL'],
    [modalidades],
  );

  // Si la elegida dejó de estar en la lista (se cambió de inmueble), se pasa a
  // la primera aceptada en vez de mandar una que el back va a rechazar.
  useEffect(() => {
    if (!modalidadesOfrecidas.includes(visitType)) {
      setVisitType(modalidadesOfrecidas[0]);
    }
  }, [modalidadesOfrecidas, visitType]);

  /*
   * El espejo del back (`lib/agenda/limites-de-la-agenda.ts`): lo que el DTO
   * rechazaría se dice acá, con su misma frase, antes de enviar. Los largos ya
   * los ataja el `maxLength` de cada campo; el correo hay que mirarlo.
   */
  const correoMalo =
    contactEmail.trim() !== '' &&
    (!CORREO_VALIDO.test(contactEmail.trim()) || contactEmail.trim().length > MAX_LARGO_CORREO_DE_LA_CITA);
  const errorDelCorreo =
    rechazos.correo ??
    (correoMalo
      ? contactEmail.trim().length > MAX_LARGO_CORREO_DE_LA_CITA
        ? MENSAJES_DE_LA_AGENDA.correoLargo
        : MENSAJES_DE_LA_AGENDA.correoInvalido
      : undefined);

  const canSubmit =
    !submitting &&
    propertyId !== '' &&
    // Sin la lista del equipo (no cargó) decide el back: quien la agenda.
    (asesores.length === 0 || asesorUserId !== '') &&
    contactName.trim() !== '' &&
    !correoMalo &&
    date !== '' &&
    startTime !== '' &&
    endTime !== '' &&
    endTime > startTime;

  const handleSubmit = async () => {
    if (!canSubmit || enviando.current) return;
    enviando.current = true;
    setSubmitting(true);
    setRechazos({});
    try {
      await agendaApi.createCita({
        propertyId,
        date,
        startTime,
        endTime,
        visitType,
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        asesorUserId: asesorUserId || undefined,
      });
      toast.success(t(k('citaSuccess')));
      onCreated();
      onClose();
    } catch (err) {
      // Con la sesión vencida el cliente ya está cerrando sesión: un «no se
      // pudo agendar» encima sería mentira (la cita no falló, la sesión sí).
      // Todo lo demás se dice DENTRO del modal, al lado del campo que lo causó:
      // un toast se va solo y deja al usuario adivinando qué cambiar.
      const porCampo = rechazosDeCita(err, t(k('citaError'))) ?? {};
      setRechazos(porCampo);
      const primero = CAMPOS_DE_LA_CITA.find((c) => porCampo[c]);
      if (primero) {
        formulario.current
          ?.querySelector<HTMLElement>(`[data-campo="${primero}"] :is(input, textarea, button, select)`)
          ?.focus();
      }
    } finally {
      enviando.current = false;
      setSubmitting(false);
    }
  };

  /** El error bajo el campo, con su entrada suave (el `FormError` de Cadence). */
  const avisoDe = (campo: Exclude<CampoDelRechazo, 'general'>, mensaje = rechazos[campo]) => (
    <ErrorDelCampo id={`cita-${campo}-error`} mensaje={mensaje} />
  );
  const ariaDe = (campo: Exclude<CampoDelRechazo, 'general'>, mensaje = rechazos[campo]) =>
    mensaje ? { 'aria-invalid': true as const, 'aria-describedby': `cita-${campo}-error` } : {};

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <ResponsiveDialogContent
        className="max-w-lg max-h-[90dvh] overflow-y-auto"
        data-lenis-prevent
        style={{ overscrollBehavior: 'contain' }}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t(k('citaTitle'))}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="space-y-4" ref={formulario}>
          {/* Property */}
          <div data-campo="inmueble">
            <label className="mb-1.5 block text-caption text-muted-foreground">
              {t(k('citaProperty'))} <span className="text-danger">*</span>
            </label>
            {isPreset ? (
              <div className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-fg">
                {presetPropertyTitle ?? presetPropertyId}
              </div>
            ) : (
              <Combobox
                value={propertyId || undefined}
                onChange={(v) => {
                  setPropertyId(v ?? '');
                  quitarRechazo('inmueble');
                }}
                options={opcionesInmueble}
                placeholder={loQueDiceUnSelector({
                  cargando: cargandoInmuebles,
                  error: errorDeInmuebles,
                  cuantos: opcionesInmueble.length,
                  queSon: 'los inmuebles',
                  pista: t(k('citaSelectProperty')),
                  // Los arrendados no reciben visitas y se filtran aparte; por
                  // eso el vacío no es «no tienes inmuebles».
                  cuandoNoHay: 'Ninguno de tus inmuebles recibe visitas ahora',
                })}
                searchPlaceholder="Escribe #código, título o dirección"
                contentClassName="z-[400]"
              />
            )}
            {avisoDe('inmueble')}
            {!isPreset && arrendadosOcultos > 0 ? (
              <p className="mt-1.5 text-caption text-fg-subtle" data-testid="cita-arrendados-ocultos">
                {arrendadosOcultos === 1
                  ? 'No aparece 1 inmueble arrendado: no recibe visitas.'
                  : `No aparecen ${arrendadosOcultos} inmuebles arrendados: no reciben visitas.`}
              </p>
            ) : null}
          </div>

          {/* Contact */}
          <div data-campo="contacto">
            <label htmlFor="cita-contacto" className="mb-1.5 block text-caption text-muted-foreground">
              {t(k('citaContact'))} <span className="text-danger">*</span>
            </label>
            <Input
              id="cita-contacto"
              aria-required="true"
              value={contactName}
              onChange={(e) => {
                setContactName(e.target.value);
                quitarRechazo('contacto');
              }}
              placeholder={t(k('citaContact'))}
              maxLength={MAX_LARGO_CONTACTO_DE_LA_CITA}
              {...ariaDe('contacto')}
            />
            {avisoDe('contacto')}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div data-campo="correo">
              <label htmlFor="cita-correo" className="mb-1.5 block text-caption text-muted-foreground">
                {t(k('citaEmail'))}
              </label>
              <Input
                id="cita-correo"
                type="email"
                value={contactEmail}
                onChange={(e) => {
                  setContactEmail(e.target.value);
                  quitarRechazo('correo');
                }}
                placeholder="correo@ejemplo.com"
                maxLength={MAX_LARGO_CORREO_DE_LA_CITA}
                {...ariaDe('correo', errorDelCorreo)}
              />
              {avisoDe('correo', errorDelCorreo)}
            </div>
            <div data-campo="telefono">
              <label htmlFor="cita-telefono" className="mb-1.5 block text-caption text-muted-foreground">
                {t(k('citaPhone'))}
              </label>
              <Input
                id="cita-telefono"
                value={contactPhone}
                onChange={(e) => {
                  setContactPhone(e.target.value);
                  quitarRechazo('telefono');
                }}
                placeholder="3001234567"
                maxLength={MAX_LARGO_TELEFONO_DE_LA_CITA}
                {...ariaDe('telefono')}
              />
              {avisoDe('telefono')}
            </div>
          </div>

          {/* Fecha en su fila; inicio y fin en la de abajo, como selects
              (Nico, 2026-09-03: «están súper pegados y se ven como inputs»). */}
          <div className="space-y-4">
            <div data-campo="fecha">
              <label htmlFor="cita-fecha" className="mb-1.5 block text-caption text-muted-foreground">
                {t(k('citaDate'))} <span className="text-danger">*</span>
              </label>
              <DatePicker
                id="cita-fecha"
                value={fechaLocal(date)}
                onChange={(d) => {
                  setDate(aFechaIso(d));
                  quitarRechazo('fecha');
                }}
                minDate={hoyLocal()}
                placeholder="Elige el día"
                className="w-full"
              />
              {avisoDe('fecha')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-campo="hora">
              <div>
                <label className="mb-1.5 block text-caption text-muted-foreground">
                  {t(k('citaStart'))} <span className="text-danger">*</span>
                </label>
                <Select
                  value={startTime}
                  onValueChange={(v) => {
                    setStartTime(v);
                    quitarRechazo('hora');
                  }}
                >
                  <SelectTrigger className="w-full" {...ariaDe('hora')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HORAS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-caption text-muted-foreground">
                  {t(k('citaEnd'))} <span className="text-danger">*</span>
                </label>
                <Select
                  value={endTime}
                  onValueChange={(v) => {
                    setEndTime(v);
                    quitarRechazo('hora');
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HORAS.filter((h) => h > startTime).map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {avisoDe('hora')}
          </div>

          {/* Type */}
          <div data-campo="modalidad">
            <label className="mb-1.5 block text-caption text-muted-foreground">
              {t(k('citaType'))}
            </label>
            <Select
              value={visitType}
              onValueChange={(v) => {
                setVisitType(v as TipoDeVisita);
                quitarRechazo('modalidad');
              }}
            >
              <SelectTrigger className="w-full" data-testid="cita-modalidad" {...ariaDe('modalidad')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modalidadesOfrecidas.includes('IN_PERSON') && (
                  <SelectItem value="IN_PERSON">{t(k('citaTypeInPerson'))}</SelectItem>
                )}
                {modalidadesOfrecidas.includes('VIRTUAL') && (
                  <SelectItem value="VIRTUAL">{t(k('citaTypeVirtual'))}</SelectItem>
                )}
              </SelectContent>
            </Select>
            {avisoDe('modalidad')}
            <Presence as="p" show={modalidades?.length === 0} distance="xs" className="mt-1.5 text-caption text-fg-muted">
                Este inmueble todavía no tiene horarios de visita cargados: se ofrecen las
                dos modalidades, pero conviene configurarlos en su ficha.
            </Presence>
          </div>

          {/* AG-06: quién la atiende. */}
          <div data-campo="asesor">
            <label className="mb-1.5 block text-caption text-muted-foreground">Asesor que la atiende</label>
            <Combobox
              data-testid="cita-asesor"
              value={asesorUserId || undefined}
              onChange={(v) => setAsesorUserId(v ?? '')}
              options={asesores.map((a) => ({ value: a.userId, label: a.nombre }))}
              placeholder={asesores.length ? 'Elige quién la atiende' : 'No hay asesores activos'}
              searchPlaceholder="Nombre"
              disabled={asesores.length === 0}
              contentClassName="z-[400]"
            />
            {!asesorUserId && (
              <p className="mt-1 text-caption text-muted-foreground">Ninguna visita se confirma sin asesor.</p>
            )}
          </div>

          {/* Notes */}
          <div data-campo="notas">
            <label htmlFor="cita-notas" className="mb-1.5 block text-caption text-muted-foreground">
              {t(k('citaNotes'))}
            </label>
            <Textarea
              id="cita-notas"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                quitarRechazo('notas');
              }}
              rows={3}
              maxLength={MAX_LARGO_NOTAS_DE_LA_CITA}
              placeholder={t(k('citaNotes'))}
              {...ariaDe('notas')}
            />
            {avisoDe('notas')}
          </div>
        </div>

        <Presence
          as="p"
          show={Boolean(rechazos.general)}
          role="alert"
          data-testid="cita-rechazo-general"
          className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {rechazoGeneral}
        </Presence>

        <ResponsiveDialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            {t('inmobiliaria.common.cancel')}
          </Button>
          <Button type="button" size="sm" hideArrow onClick={() => void handleSubmit()} disabled={!canSubmit}>
            <CalendarPlus className="w-4 h-4" />
            {t(k('citaSubmit'))}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
