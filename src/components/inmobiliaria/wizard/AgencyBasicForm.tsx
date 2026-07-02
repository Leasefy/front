'use client';

import { Building, Phone, Envelope, MapPin, IdentificationCard } from '@phosphor-icons/react';
import { Input } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CITIES = [
  'Bogotá',
  'Medellín',
  'Cali',
  'Barranquilla',
  'Cartagena',
  'Bucaramanga',
  'Pereira',
  'Santa Marta',
  'Otra ciudad',
];

export interface AgencyBasicFormData {
  name: string;
  nit: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}

interface AgencyBasicFormProps {
  data: AgencyBasicFormData;
  onChange: (updates: Partial<AgencyBasicFormData>) => void;
}

/**
 * AgencyBasicForm - Step 1 of AgencySetupWizard
 * Basic agency profile information (pre-filled from registration data)
 */
export function AgencyBasicForm({ data, onChange }: AgencyBasicFormProps) {
  return (
    <div className="space-y-5">
      {/* Agency Name */}
      <div>
        <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-1.5">
          <span className="flex items-center gap-1.5">
            <Building className="w-4 h-4 text-fg-subtle dark:text-fg-muted" />
            Nombre de la agencia <span className="text-danger">*</span>
          </span>
        </label>
        <Input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Inmobiliaria Rodríguez & Asociados"
          className="w-full"
        />
      </div>

      {/* NIT */}
      <div>
        <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-1.5">
          <span className="flex items-center gap-1.5">
            <IdentificationCard className="w-4 h-4 text-fg-subtle dark:text-fg-muted" />
            NIT / RUT <span className="text-fg-subtle dark:text-fg-muted font-normal">(opcional)</span>
          </span>
        </label>
        <Input
          type="text"
          value={data.nit}
          onChange={(e) => onChange({ nit: e.target.value })}
          placeholder="900.123.456-7"
          className="w-full"
        />
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-1.5">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-fg-subtle dark:text-fg-muted" />
            Dirección <span className="text-fg-subtle dark:text-fg-muted font-normal">(opcional)</span>
          </span>
        </label>
        <Input
          type="text"
          value={data.address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="Calle 123 # 45-67"
          className="w-full"
        />
      </div>

      {/* City */}
      <div>
        <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-1.5">Ciudad principal</label>
        <Select
          value={data.city || undefined}
          onValueChange={(value) => onChange({ city: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona una ciudad" />
          </SelectTrigger>
          <SelectContent>
            {CITIES.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-1.5">
          <span className="flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-fg-subtle dark:text-fg-muted" />
            Teléfono de la agencia <span className="text-fg-subtle dark:text-fg-muted font-normal">(opcional)</span>
          </span>
        </label>
        <Input
          type="tel"
          value={data.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="601 234 5678"
          className="w-full"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-fg dark:text-fg-subtle mb-1.5">
          <span className="flex items-center gap-1.5">
            <Envelope className="w-4 h-4 text-fg-subtle dark:text-fg-muted" />
            Email de la agencia <span className="text-fg-subtle dark:text-fg-muted font-normal">(opcional)</span>
          </span>
        </label>
        <Input
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="contacto@miinmobiliaria.com"
          className="w-full"
        />
      </div>
    </div>
  );
}
