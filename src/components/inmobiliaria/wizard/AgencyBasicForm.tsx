'use client';

import { Building, Phone, Envelope, MapPin, IdentificationCard } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

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
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          <span className="flex items-center gap-1.5">
            <Building className="w-4 h-4 text-neutral-400" />
            Nombre de la agencia <span className="text-red-500">*</span>
          </span>
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Inmobiliaria Rodríguez & Asociados"
          className={cn(
            'w-full px-4 py-3 text-sm rounded-xl border bg-white',
            'placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all',
            !data.name ? 'border-neutral-200' : 'border-neutral-300'
          )}
        />
      </div>

      {/* NIT */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          <span className="flex items-center gap-1.5">
            <IdentificationCard className="w-4 h-4 text-neutral-400" />
            NIT / RUT <span className="text-neutral-400 font-normal">(opcional)</span>
          </span>
        </label>
        <input
          type="text"
          value={data.nit}
          onChange={(e) => onChange({ nit: e.target.value })}
          placeholder="900.123.456-7"
          className="w-full px-4 py-3 text-sm rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
        />
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-neutral-400" />
            Dirección <span className="text-neutral-400 font-normal">(opcional)</span>
          </span>
        </label>
        <input
          type="text"
          value={data.address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="Calle 123 # 45-67"
          className="w-full px-4 py-3 text-sm rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
        />
      </div>

      {/* City */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">Ciudad principal</label>
        <select
          value={data.city}
          onChange={(e) => onChange({ city: e.target.value })}
          className="w-full px-4 py-3 text-sm rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all appearance-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 1rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.5em 1.5em',
          }}
        >
          <option value="">Selecciona una ciudad</option>
          {CITIES.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          <span className="flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-neutral-400" />
            Teléfono de la agencia <span className="text-neutral-400 font-normal">(opcional)</span>
          </span>
        </label>
        <input
          type="tel"
          value={data.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="601 234 5678"
          className="w-full px-4 py-3 text-sm rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          <span className="flex items-center gap-1.5">
            <Envelope className="w-4 h-4 text-neutral-400" />
            Email de la agencia <span className="text-neutral-400 font-normal">(opcional)</span>
          </span>
        </label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="contacto@miinmobiliaria.com"
          className="w-full px-4 py-3 text-sm rounded-xl border border-neutral-200 bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
        />
      </div>
    </div>
  );
}
