'use client';

import { useState, useEffect, useRef } from 'react';
import { Bed, Bath, Maximize2, Car, Building, Calendar, Layers } from 'lucide-react';
import { usePublish } from '@/lib/context/PublishContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  icon: React.ReactNode;
  suffix?: string;
  step?: number;
}

function NumberInput({ label, value, onChange, min = 0, max = 99, icon, suffix, step = 1 }: NumberInputProps) {
  const [localValue, setLocalValue] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  // Sync from parent when not focused
  useEffect(() => {
    if (!isFocused) setLocalValue(String(value));
  }, [value, isFocused]);

  const commit = (raw: string) => {
    const num = parseInt(raw);
    if (isNaN(num) || raw === "") {
      setLocalValue(String(value));
    } else {
      const clamped = Math.min(max, Math.max(min, num));
      onChange(clamped);
      setLocalValue(String(clamped));
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {icon}
        {label}
      </Label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          className="w-10 h-10 rounded-sm border border-border flex items-center justify-center text-muted-foreground hover:border-border hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        >
          -
        </button>
        <div className="flex-1 relative">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={localValue}
            onFocus={(e) => {
              setIsFocused(true);
              e.target.select();
            }}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, "");
              setLocalValue(raw);
            }}
            onBlur={() => {
              setIsFocused(false);
              commit(localValue);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commit(localValue);
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="text-center"
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          className="w-10 h-10 rounded-sm border border-border flex items-center justify-center text-muted-foreground hover:border-border hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>
    </div>
  );
}

function YearPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const currentYear = new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  useEffect(() => {
    if (!isFocused && !open) setLocalValue(String(value));
  }, [value, isFocused, open]);

  // Scroll to selected year when grid opens
  useEffect(() => {
    if (open && gridRef.current) {
      const selected = gridRef.current.querySelector('[data-selected="true"]');
      if (selected) selected.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [open]);

  const commit = (raw: string) => {
    const num = parseInt(raw);
    if (isNaN(num) || raw === "") {
      setLocalValue(String(value));
    } else {
      const clamped = Math.min(currentYear, Math.max(1900, num));
      onChange(clamped);
      setLocalValue(String(clamped));
    }
  };

  // Generate years from current year down to 1900
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        Año de construcción
      </Label>
      <div className="relative max-w-[200px]">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localValue}
          onFocus={(e) => {
            setIsFocused(true);
            setOpen(true);
            e.target.select();
          }}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
            setLocalValue(raw);
          }}
          onBlur={() => {
            setIsFocused(false);
            // Delay to check if focus moved to the grid
            setTimeout(() => {
              if (!closingRef.current && gridRef.current && !gridRef.current.matches(":hover")) {
                setOpen(false);
                commit(localValue);
              }
              closingRef.current = false;
            }, 150);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit(localValue);
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="text-center"
        />

        {open && (
          <div
            ref={gridRef}
            onMouseDown={(e) => e.preventDefault()}
            className="absolute z-20 top-full mt-1 left-0 right-0 bg-card border border-border shadow-lg max-h-[240px] overflow-y-auto p-2"
          >
            <div className="grid grid-cols-4 gap-1">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  data-selected={year === value}
                  onClick={() => {
                    closingRef.current = true;
                    onChange(year);
                    setLocalValue(String(year));
                    setOpen(false);
                  }}
                  className={cn(
                    "py-1.5 text-[13px] font-medium transition-colors",
                    year === value
                      ? "bg-black text-white"
                      : "text-foreground/70 hover:bg-black/5"
                  )}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function StepDetails() {
  const { draft, updateDraft } = usePublish();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-1">
          Caracteristicas del inmueble
        </h3>
        <p className="text-sm text-muted-foreground">
          Describe las especificaciones de tu propiedad
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <NumberInput
          label="Habitaciones"
          value={draft.bedrooms}
          onChange={(value) => updateDraft({ bedrooms: value })}
          min={1}
          max={8}
          icon={<Bed className="w-4 h-4 text-muted-foreground" />}
        />

        <NumberInput
          label="Baños"
          value={draft.bathrooms}
          onChange={(value) => updateDraft({ bathrooms: value })}
          min={1}
          max={6}
          icon={<Bath className="w-4 h-4 text-muted-foreground" />}
        />

        <NumberInput
          label="Área"
          value={draft.area}
          onChange={(value) => updateDraft({ area: value })}
          min={15}
          max={500}
          icon={<Maximize2 className="w-4 h-4 text-muted-foreground" />}
          suffix="m²"
          step={5}
        />

        <NumberInput
          label="Parqueaderos"
          value={draft.parkingSpaces}
          onChange={(value) => updateDraft({ parkingSpaces: value })}
          min={0}
          max={4}
          icon={<Car className="w-4 h-4 text-muted-foreground" />}
        />

        <NumberInput
          label="Piso"
          value={draft.floor}
          onChange={(value) => updateDraft({ floor: value })}
          min={1}
          max={30}
          icon={<Building className="w-4 h-4 text-muted-foreground" />}
        />

        <NumberInput
          label="Estrato"
          value={draft.stratum}
          onChange={(value) => updateDraft({ stratum: value })}
          min={1}
          max={6}
          icon={<Layers className="w-4 h-4 text-muted-foreground" />}
        />
      </div>

      <div className="pt-4 border-t border-border">
        <YearPicker
          value={draft.yearBuilt}
          onChange={(value) => updateDraft({ yearBuilt: value })}
        />
      </div>
    </div>
  );
}
