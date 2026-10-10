'use client';

/**
 * Agendar y reprogramar una visita desde el panel del propietario
 * (`/panel/visitas`), con el sistema de errores (02-10-2026).
 *
 * Vivían dentro de `app/panel/(landlord)/visitas/page.tsx`. Salieron acá para
 * poder probarlos (una página de Next no exporta otra cosa que su default).
 *
 * Antes: el hook convertía cualquier fallo en `false` y el modal decía «Error
 * al agendar visita» (o se cerraba y lo decía un toast), sin decir si fue la
 * fecha, el horario, un 5xx o la red. Ahora:
 *  · la fecha se revisa ANTES de mandar, con las mismas reglas y frases que el
 *    back (`lib/visitas/limites-de-la-visita.ts`);
 *  · lo que el back rechaza por campo (`campos[]`) va a SU campo, que recibe
 *    el foco; sólo lo que no tiene campo va al toast, con la regla de oro;
 *  · si falla, el modal queda abierto con lo escrito.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Input, Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogSection,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { leerFallo } from '@/lib/errores/traductor-de-errores';
import { revisarFechaDeVisita } from '@/lib/visitas/limites-de-la-visita';
import { useI18n } from '@/lib/i18n';
import type { Visit } from '@/lib/types/visit';
import { ariaDelCampoDeDia, CampoDeDia } from '@/components/contabilidad/CampoDeDia';

export const SCHEDULE_HOURS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
];

/** Las notas de la visita: `@MaxLength(500)` en `CreateVisitDto`. */
const MAX_LARGO_NOTAS = 500;

/**
 * `POST /visits` es sólo para quien pide la visita (`@Roles(TENANT)`): el 403
 * del back dice «Esto es sólo para cuentas de inquilino…», que es cierto pero
 * no dice qué hacer; acá se dice con frase propia y honesta.
 */
export const MENSAJE_SIN_PERMISO_PARA_AGENDAR =
  'Desde aquí todavía no se pueden agendar visitas: hoy las pide el interesado desde la ficha del inmueble.';

export function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function manana(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function enfocar(id: string) {
  if (typeof document === 'undefined') return;
  document.getElementById(id)?.focus();
}

// ============================================================================
// Agendar
// ============================================================================

type CampoDeAgendar = 'fecha' | 'hora' | 'propiedad' | 'notas';
const CAMPOS_DE_AGENDAR: readonly CampoDeAgendar[] = ['fecha', 'hora', 'propiedad', 'notas'];
const ID_DE_AGENDAR: Record<CampoDeAgendar, string> = {
  fecha: 'agendar-fecha',
  hora: 'agendar-hora',
  propiedad: 'agendar-inmueble',
  notas: 'agendar-notas',
};

export function ScheduleModal({
  onClose,
  properties,
  onCreate,
}: {
  onClose: () => void;
  properties: { id: string; title: string }[];
  /** Crea la visita. Si falla, LANZA el error (el modal lo reparte). */
  onCreate: (propertyId: string, date: string, time: string, notes?: string) => Promise<void>;
}) {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [propiedad, setPropiedad] = useState('');
  const [notas, setNotas] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errores, setErrores] = useState<Partial<Record<CampoDeAgendar, string>>>({});
  const { t } = useI18n();

  const minDate = manana();
  const canSubmit = fecha.length > 0 && hora.length > 0 && propiedad.length > 0 && !submitting;

  const limpiar = (campo: CampoDeAgendar) =>
    setErrores((prev) => {
      if (prev[campo] === undefined) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });

  const handleConfirm = async () => {
    if (!canSubmit) return;
    const errorDeFecha = revisarFechaDeVisita(fecha);
    if (errorDeFecha) {
      setErrores({ fecha: errorDeFecha });
      enfocar(ID_DE_AGENDAR.fecha);
      return;
    }
    setSubmitting(true);
    try {
      await onCreate(propiedad, fecha, hora, notas || undefined);
    } catch (e) {
      const reparto = repartirErroresDelServidor<CampoDeAgendar>(e, {
        mapa: { date: 'fecha', startTime: 'hora', propertyId: 'propiedad', notes: 'notas', visitType: null },
        campos: CAMPOS_DE_AGENDAR,
        accion: 'agendar la visita',
        porDefecto: 'No pudimos agendar la visita. Prueba de nuevo en un momento.',
      });
      setErrores(reparto.porCampo);
      const primero = reparto.orden[0];
      if (primero) enfocar(ID_DE_AGENDAR[primero]);
      const sueltos = leerFallo(e).status === 403 ? [MENSAJE_SIN_PERMISO_PARA_AGENDAR] : reparto.sueltos;
      if (sueltos.length > 0) toast.error(sueltos.join(' · '));
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    toast.success(t('landlord.visits.scheduleSuccessToast'), {
      description: t('landlord.visits.scheduleSuccessDesc'),
    });
    onClose();
  };

  const conError = (campo: CampoDeAgendar) =>
    errores[campo]
      ? { 'aria-invalid': true as const, 'aria-describedby': `${ID_DE_AGENDAR[campo]}-error` }
      : {};

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <DialogContent size="sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t('landlord.visits.scheduleModalTitle')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={ID_DE_AGENDAR.fecha} className="text-sm font-medium text-fg block mb-2">
              {t('landlord.visits.scheduleDateLabel')}
            </label>
            <CampoDeDia
              {...ariaDelCampoDeDia(conError('fecha'))}
              id={ID_DE_AGENDAR.fecha}
              value={fecha}
              onChange={(v) => {
                setFecha(v);
                limpiar('fecha');
              }}
              min={minDate}
              className="rounded-lg"
            />
            <ErrorDelCampo id={`${ID_DE_AGENDAR.fecha}-error`} mensaje={errores.fecha} />
          </div>
          <div>
            <label htmlFor={ID_DE_AGENDAR.hora} className="text-sm font-medium text-fg block mb-2">
              {t('landlord.visits.scheduleTimeLabel')}
            </label>
            <Select
              value={hora}
              onValueChange={(v) => {
                setHora(v);
                limpiar('hora');
              }}
            >
              <SelectTrigger id={ID_DE_AGENDAR.hora} className="h-11 rounded-lg" {...conError('hora')}>
                <SelectValue placeholder={t('landlord.visits.scheduleTimeSelect')} />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_HOURS.map((h) => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ErrorDelCampo id={`${ID_DE_AGENDAR.hora}-error`} mensaje={errores.hora} />
          </div>
        </div>

        <div>
          <label htmlFor={ID_DE_AGENDAR.propiedad} className="text-sm font-medium text-fg block mb-2">
            {t('landlord.visits.schedulePropertyLabel')}
          </label>
          <Select
            value={propiedad}
            onValueChange={(v) => {
              setPropiedad(v);
              limpiar('propiedad');
            }}
          >
            <SelectTrigger id={ID_DE_AGENDAR.propiedad} className="h-11 rounded-lg" {...conError('propiedad')}>
              <SelectValue placeholder={t('landlord.visits.schedulePropertySelect')} />
            </SelectTrigger>
            <SelectContent>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ErrorDelCampo id={`${ID_DE_AGENDAR.propiedad}-error`} mensaje={errores.propiedad} />
        </div>

        <div>
          <label htmlFor={ID_DE_AGENDAR.notas} className="text-sm font-medium text-fg block mb-2">
            {t('landlord.visits.scheduleNotesLabel')}
          </label>
          <Textarea
            id={ID_DE_AGENDAR.notas}
            value={notas}
            maxLength={MAX_LARGO_NOTAS}
            onChange={(e) => {
              setNotas(e.target.value);
              limpiar('notas');
            }}
            placeholder={t('landlord.visits.scheduleNotesPlaceholder')}
            rows={3}
            className="rounded-lg resize-none"
            {...conError('notas')}
          />
          <ErrorDelCampo id={`${ID_DE_AGENDAR.notas}-error`} mensaje={errores.notas} />
        </div>

        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onClose}>
            {t('landlord.visits.scheduleCancel')}
          </Button>
          <Button
            variant="default"
            hideArrow
            onClick={handleConfirm}
            isLoading={submitting}
            disabled={!canSubmit}
          >
            {t('landlord.visits.scheduleConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Reprogramar
// ============================================================================

type CampoDeReprogramar = 'fecha' | 'hora';
const CAMPOS_DE_REPROGRAMAR: readonly CampoDeReprogramar[] = ['fecha', 'hora'];
const ID_DE_REPROGRAMAR: Record<CampoDeReprogramar, string> = {
  fecha: 'reprogramar-fecha',
  hora: 'reprogramar-hora',
};

export function RescheduleModal({
  visit,
  onConfirm,
  onClose,
}: {
  visit: Visit;
  /** Reprograma. Si falla, LANZA el error (el modal lo reparte y queda abierto). */
  onConfirm: (date: string, time: string) => Promise<void>;
  onClose: () => void;
}) {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<Partial<Record<CampoDeReprogramar, string>>>({});
  const { t, formatDate } = useI18n();

  const canSubmit = newDate.length > 0 && newTime.length > 0 && !enviando;
  const minDate = manana();

  const limpiar = (campo: CampoDeReprogramar) =>
    setErrores((prev) => {
      if (prev[campo] === undefined) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });

  const confirmar = async () => {
    if (!canSubmit) return;
    const errorDeFecha = revisarFechaDeVisita(newDate);
    if (errorDeFecha) {
      setErrores({ fecha: errorDeFecha });
      enfocar(ID_DE_REPROGRAMAR.fecha);
      return;
    }
    setEnviando(true);
    try {
      await onConfirm(newDate, newTime);
    } catch (e) {
      const reparto = repartirErroresDelServidor<CampoDeReprogramar>(e, {
        mapa: { newDate: 'fecha', newStartTime: 'hora', reason: null },
        campos: CAMPOS_DE_REPROGRAMAR,
        accion: 'reprogramar la visita',
        porDefecto: 'No pudimos reprogramar la visita. Prueba de nuevo en un momento.',
      });
      setErrores(reparto.porCampo);
      const primero = reparto.orden[0];
      if (primero) enfocar(ID_DE_REPROGRAMAR[primero]);
      if (reparto.sueltos.length > 0) toast.error(reparto.sueltos.join(' · '));
      setEnviando(false);
      return;
    }
    setEnviando(false);
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('landlord.visits.rescheduleModalTitle')}</DialogTitle>
          <DialogDescription>{t('landlord.visits.rescheduleExplanation')}</DialogDescription>
        </DialogHeader>

        <DialogSection>
          <p className="text-sm text-fg-muted">
            {t('landlord.visits.rescheduleOriginal')} <span className="font-medium text-fg">{visit.candidateName}</span>
          </p>
          <p className="text-sm text-fg-subtle mt-0.5">
            {t('landlord.visits.rescheduleOriginalDate', { date: formatDate(visit.requestedDate + 'T12:00:00'), time: formatTime(visit.requestedTime) })}
          </p>
        </DialogSection>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor={ID_DE_REPROGRAMAR.fecha} className="text-sm font-medium text-fg block mb-2">
              {t('landlord.visits.rescheduleNewDate')}
            </label>
            <CampoDeDia
              id={ID_DE_REPROGRAMAR.fecha}
              value={newDate}
              onChange={(v) => {
                setNewDate(v);
                limpiar('fecha');
              }}
              min={minDate}
              invalido={Boolean(errores.fecha)}
              describedBy={errores.fecha ? `${ID_DE_REPROGRAMAR.fecha}-error` : undefined}
              className="rounded-lg"
            />
            <ErrorDelCampo id={`${ID_DE_REPROGRAMAR.fecha}-error`} mensaje={errores.fecha} />
          </div>
          <div>
            <label htmlFor={ID_DE_REPROGRAMAR.hora} className="text-sm font-medium text-fg block mb-2">
              {t('landlord.visits.rescheduleNewTime')}
            </label>
            <Input
              id={ID_DE_REPROGRAMAR.hora}
              type="time"
              value={newTime}
              onChange={(e) => {
                setNewTime(e.target.value);
                limpiar('hora');
              }}
              className="rounded-lg"
              aria-invalid={errores.hora ? true : undefined}
              aria-describedby={errores.hora ? `${ID_DE_REPROGRAMAR.hora}-error` : undefined}
            />
            <ErrorDelCampo id={`${ID_DE_REPROGRAMAR.hora}-error`} mensaje={errores.hora} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onClose}>
            {t('landlord.visits.rescheduleBack')}
          </Button>
          <Button
            variant="default"
            hideArrow
            onClick={() => void confirmar()}
            isLoading={enviando}
            disabled={!canSubmit}
          >
            {t('landlord.visits.rescheduleConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
