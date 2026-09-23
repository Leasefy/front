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
import { DatePicker } from '@leasefy/cadence';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { etiquetaDeInmueble } from '@/components/contratos/VincularInmueble';
import { aFechaIso, fechaLocal, hoyLocal } from '@/lib/fechas-locales';
import { useConsignaciones } from '@/lib/hooks/useInmobiliaria';
import { loQueDiceUnSelector } from '@/lib/errores/lo-que-dice-un-selector';
import { ApiError } from '@/lib/api/client';
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
export type CampoDelRechazo = 'inmueble' | 'hora' | 'modalidad' | 'general';

/**
 * Traduce el error del back a un lugar en el formulario.
 *
 * El back responde 409 con `code` (`agenda.service.ts#createCita`):
 * `HORARIO_OCUPADO` va al lado de la hora, `INMUEBLE_ARRENDADO` al lado del
 * inmueble, `MODALIDAD_NO_ACEPTADA` al lado del selector de modalidad.
 * Cualquier otro 400/409 trae su propio motivo en castellano y va
 * arriba del pie. Un 500 o un corte de red no explican nada: ahí va el texto
 * genérico, pero DENTRO del modal, para no perder lo que ya se llenó.
 * `null` = no mostrar nada (401: el cliente ya está cerrando la sesión).
 */
export function rechazoDeCita(
  err: unknown,
  generico: string,
): { campo: CampoDelRechazo; mensaje: string } | null {
  if (!(err instanceof ApiError)) return { campo: 'general', mensaje: generico };
  if (err.status === 401) return null;
  const code = err.code ?? (typeof err.detalle?.code === 'string' ? err.detalle.code : undefined);
  const explica = (err.status === 400 || err.status === 409) && !!err.message;
  const mensaje = explica ? err.message : generico;
  if (err.status === 409 && code === 'HORARIO_OCUPADO') return { campo: 'hora', mensaje };
  if (err.status === 409 && code === 'INMUEBLE_ARRENDADO') return { campo: 'inmueble', mensaje };
  // A5: el inmueble no acepta esa modalidad. Va al lado del selector, que es
  // el campo que hay que cambiar, no en un aviso general arriba del pie.
  if (err.status === 409 && code === 'MODALIDAD_NO_ACEPTADA')
    return { campo: 'modalidad', mensaje };
  return { campo: 'general', mensaje };
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
  const [submitting, setSubmitting] = useState(false);
  const [rechazo, setRechazo] = useState<{ campo: CampoDelRechazo; mensaje: string } | null>(null);
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
      setRechazo(null);
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

  const canSubmit =
    !submitting &&
    propertyId !== '' &&
    contactName.trim() !== '' &&
    date !== '' &&
    startTime !== '' &&
    endTime !== '' &&
    endTime > startTime;

  const handleSubmit = async () => {
    if (!canSubmit || enviando.current) return;
    enviando.current = true;
    setSubmitting(true);
    setRechazo(null);
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
      });
      toast.success(t(k('citaSuccess')));
      onCreated();
      onClose();
    } catch (err) {
      // Con la sesión vencida el cliente ya está cerrando sesión: un «no se
      // pudo agendar» encima sería mentira (la cita no falló, la sesión sí).
      // Todo lo demás se dice DENTRO del modal, al lado del campo que lo causó:
      // un toast se va solo y deja al usuario adivinando qué cambiar.
      setRechazo(rechazoDeCita(err, t(k('citaError'))));
    } finally {
      enviando.current = false;
      setSubmitting(false);
    }
  };

  const avisoDe = (campo: CampoDelRechazo) =>
    rechazo?.campo === campo ? (
      <p role="alert" data-testid={`cita-rechazo-${campo}`} className="mt-1.5 text-caption text-danger">
        {rechazo.mensaje}
      </p>
    ) : null;

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

        <div className="space-y-4">
          {/* Property */}
          <div>
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
                  if (rechazo?.campo === 'inmueble') setRechazo(null);
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
          <div>
            <label className="mb-1.5 block text-caption text-muted-foreground">
              {t(k('citaContact'))} <span className="text-danger">*</span>
            </label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder={t(k('citaContact'))}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-caption text-muted-foreground">
                {t(k('citaEmail'))}
              </label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-caption text-muted-foreground">
                {t(k('citaPhone'))}
              </label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="3001234567"
                maxLength={20}
              />
            </div>
          </div>

          {/* Fecha en su fila; inicio y fin en la de abajo, como selects
              (Nico, 2026-09-03: «están súper pegados y se ven como inputs»). */}
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-caption text-muted-foreground">
                {t(k('citaDate'))} <span className="text-danger">*</span>
              </label>
              <DatePicker
                value={fechaLocal(date)}
                onChange={(d) => setDate(aFechaIso(d))}
                minDate={hoyLocal()}
                placeholder="Elige el día"
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-caption text-muted-foreground">
                  {t(k('citaStart'))} <span className="text-danger">*</span>
                </label>
                <Select
                  value={startTime}
                  onValueChange={(v) => {
                    setStartTime(v);
                    if (rechazo?.campo === 'hora') setRechazo(null);
                  }}
                >
                  <SelectTrigger className="w-full" aria-invalid={rechazo?.campo === 'hora' || undefined}>
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
                <Select value={endTime} onValueChange={setEndTime}>
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
          <div>
            <label className="mb-1.5 block text-caption text-muted-foreground">
              {t(k('citaType'))}
            </label>
            <Select value={visitType} onValueChange={(v) => setVisitType(v as TipoDeVisita)}>
              <SelectTrigger className="w-full" data-testid="cita-modalidad">
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
            {modalidades?.length === 0 && (
              <p className="mt-1.5 text-caption text-fg-muted">
                Este inmueble todavía no tiene horarios de visita cargados: se ofrecen las
                dos modalidades, pero conviene configurarlos en su ficha.
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-caption text-muted-foreground">
              {t(k('citaNotes'))}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t(k('citaNotes'))}
            />
          </div>
        </div>

        {rechazo?.campo === 'general' ? (
          <p
            role="alert"
            data-testid="cita-rechazo-general"
            className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {rechazo.mensaje}
          </p>
        ) : null}

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
