'use client';

/**
 * Una fecha LEJANA que se ESCRIBE (la de nacimiento): DD / MM / AAAA con el
 * `DateField` de Cadence.
 *
 * Nico, 10-10-2026: «este no usa Cadence» — todos los `<input type="date">`
 * del navegador pasaron a los campos de la casa. Para un día cercano va
 * `CampoDeDia` (el calendario); para una fecha de nacimiento ese calendario
 * avanza de a un mes y serían cientos de clics, así que se escribe.
 *
 * El formulario sigue hablando en `AAAA-MM-DD`: mientras la fecha esté a
 * medias (o no exista, «31/02») se entrega `''`, y lo escrito se conserva en
 * el campo hasta que el padre mande OTRA fecha.
 */

import { useEffect, useRef, useState } from 'react';
import { DateField, type DateFieldValue } from '@leasefy/cadence';

const VACIA: DateFieldValue = { day: '', month: '', year: '' };

export function partesDeLaFecha(iso: string | null | undefined): DateFieldValue {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? { day: m[3], month: m[2], year: m[1] } : VACIA;
}

/** `AAAA-MM-DD` si las tres partes forman un día que existe; `''` si no. */
export function fechaDeLasPartes({ day, month, year }: DateFieldValue): string {
  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day)) return '';
  const a = Number(year);
  const m = Number(month);
  const d = Number(day);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return '';
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function CampoDeNacimiento({
  id,
  value,
  onChange,
  etiqueta,
  invalido = false,
  describedBy,
  disabled = false,
  className,
  testid,
}: {
  /** Va en el grupo: el `<label htmlFor>` de afuera lo nombra. */
  id: string;
  /** `AAAA-MM-DD`, o `''` sin fecha. */
  value: string;
  onChange: (valor: string) => void;
  /** El nombre del grupo para el lector de pantalla («Fecha de nacimiento»). */
  etiqueta: string;
  invalido?: boolean;
  describedBy?: string;
  disabled?: boolean;
  className?: string;
  testid?: string;
}) {
  const [partes, setPartes] = useState<DateFieldValue>(() => partesDeLaFecha(value));
  const loQueEntregue = useRef(value);

  useEffect(() => {
    // Sólo una fecha que NO salió de acá reemplaza lo escrito (si no, borrar un
    // dígito entregaría '' y vaciaría el campo entero).
    if (value !== loQueEntregue.current) {
      loQueEntregue.current = value;
      setPartes(partesDeLaFecha(value));
    }
  }, [value]);

  return (
    <div
      id={id}
      role="group"
      aria-label={etiqueta}
      aria-describedby={describedBy}
      data-invalid={invalido || undefined}
      data-testid={testid}
      data-value={value || undefined}
    >
      <DateField
        value={partes}
        onChange={(nuevas) => {
          setPartes(nuevas);
          const fecha = fechaDeLasPartes(nuevas);
          loQueEntregue.current = fecha;
          onChange(fecha);
        }}
        invalid={invalido}
        disabled={disabled}
        className={className}
      />
    </div>
  );
}
